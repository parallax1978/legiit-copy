"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { WS_COOKIE, WS_COOKIE_OPTS as COOKIE_OPTS, requireUser } from "@/lib/auth";
import { safeInternalPath } from "@/lib/safe-path";
import type { ActionResult } from "./settings";

export async function switchWorkspace(workspaceId: string, next = "/app") {
  await requireUser();
  const cookieStore = await cookies();
  cookieStore.set(WS_COOKIE, workspaceId, COOKIE_OPTS);
  redirect(safeInternalPath(next));
}

/**
 * Creates a workspace and makes it current. The creator becomes owner via the on_workspace_created trigger.
 * Form fields: `name`, optional `return_to` (where to send validation errors; defaults to onboarding).
 */
export async function createWorkspace(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const returnTo = safeInternalPath(String(formData.get("return_to") ?? ""), "/app/onboarding");
  if (!name) redirect(`${returnTo}?error=name`);
  const supabase = await createClient();
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.from("workspaces").insert({ name, slug, created_by: user.id }).select("id").single();
  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  const cookieStore = await cookies();
  cookieStore.set(WS_COOKIE, data.id, COOKIE_OPTS);
  revalidatePath("/app", "layout");
  redirect("/app");
}

/**
 * Accepts an invite for the signed-in user and switches to that workspace.
 * New users have their pending invites accepted by the auth trigger already, so an "already accepted"
 * invite whose workspace the user belongs to is treated as success.
 */
export async function acceptInvite(token: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const cookieStore = await cookies();

  const { data: workspaceId, error } = await supabase.rpc("accept_invite", { invite_token: token });
  if (!error && workspaceId) {
    cookieStore.set(WS_COOKIE, workspaceId, COOKIE_OPTS);
    revalidatePath("/app", "layout");
    redirect("/app?joined=1");
  }

  // fall back: the trigger may have accepted it on sign-up; check membership
  const { data: invite } = await supabase.from("workspace_invites").select("workspace_id, accepted_at, email").eq("token", token).maybeSingle();
  if (invite) {
    const { data: member } = await supabase.from("workspace_members").select("workspace_id").eq("workspace_id", invite.workspace_id).eq("user_id", user.id).maybeSingle();
    if (member) {
      cookieStore.set(WS_COOKIE, invite.workspace_id, COOKIE_OPTS);
      revalidatePath("/app", "layout");
      redirect("/app?joined=1");
    }
    if (invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
      return { ok: false, error: `This invite was sent to ${invite.email}. Sign in with that address to accept it.` };
    }
  }
  const message = error?.message ?? "";
  if (message.includes("different email")) return { ok: false, error: "This invite was sent to a different email address. Sign in with the invited address to accept it." };
  return { ok: false, error: "This invite link is invalid, expired, or was already used. Ask the workspace owner for a new one." };
}
