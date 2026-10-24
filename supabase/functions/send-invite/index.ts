// Sends a workspace invite email through Resend. Invoked by the web app (owner only, RLS-checked).
import { z } from "zod";
import { corsHeaders, handleError, HttpError, json, requireUser, serviceClient } from "../_shared/supabase.ts";

const Body = z.object({ invite_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user, client } = await requireUser(req);
    const { invite_id } = Body.parse(await req.json());
    // RLS: only members can read; only owners manage invites, so a non-owner gets no row
    const { data: inv, error } = await client.from("workspace_invites").select("id, email, role, token, workspace_id, workspaces(name)").eq("id", invite_id).maybeSingle();
    if (error || !inv) throw new HttpError(404, "invite not found");
    const { data: role } = await client.rpc("workspace_role", { ws: inv.workspace_id });
    if (role !== "owner") throw new HttpError(403, "owners only");

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
    const from = Deno.env.get("INVITE_FROM_EMAIL") ?? "Legiit Copy <no-reply@legiitcopy.com>";
    const link = `${siteUrl}/invite/${inv.token}`;
    // deno-lint-ignore no-explicit-any
    const wsName = (inv as any).workspaces?.name ?? "a workspace";
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set; invite link:", link);
      return json({ ok: true, sent: false, link });
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [inv.email],
        subject: `${user.email} invited you to ${wsName} on Legiit Copy`,
        text: `${user.email} invited you to join "${wsName}" on Legiit Copy as ${inv.role}.\n\nAccept the invite: ${link}\n\nIf you did not expect this, ignore this email.`,
      }),
    });
    if (!res.ok) throw new HttpError(502, `resend error ${res.status}: ${await res.text()}`);
    const svc = serviceClient();
    await svc.from("audit_log").insert({ actor_id: user.id, workspace_id: inv.workspace_id, action: "invite_sent", target_type: "workspace_invite", target_id: inv.id, meta: { email: inv.email } });
    return json({ ok: true, sent: true });
  } catch (e) {
    return handleError(e);
  }
});
