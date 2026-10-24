"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMemberships, requireUser, type Role } from "@/lib/auth";
import type { ActionResult } from "./settings";

const MEMBERS_PATH = "/app/settings/members";
const RoleSchema = z.enum(["owner", "editor", "viewer"]);

async function requireOwner(workspaceId: string): Promise<ActionResult | null> {
  await requireUser();
  const memberships = await getMemberships();
  const role: Role | undefined = memberships.find((m) => m.workspace.id === workspaceId)?.role;
  if (role !== "owner") return { ok: false, error: "Only an owner can manage members" };
  return null;
}

async function ownerCount(workspaceId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("workspace_members").select("user_id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("role", "owner");
  return count ?? 0;
}

export async function inviteMember(workspaceId: string, email: string, role: string): Promise<ActionResult> {
  const denied = await requireOwner(workspaceId);
  if (denied) return denied;
  const user = await requireUser();

  const parsed = z.object({ email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")), role: RoleSchema }).safeParse({ email, role });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invite" };

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("workspace_invites")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("email", parsed.data.email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (pending && pending.length > 0) return { ok: false, error: "That email already has a pending invite. Copy its link below or revoke it first." };

  const { error } = await supabase.from("workspace_invites").insert({ workspace_id: workspaceId, email: parsed.data.email, role: parsed.data.role, invited_by: user.id });
  if (error) return { ok: false, error: error.message };

  // TODO(resend): send the invite email here (link: `${NEXT_PUBLIC_SITE_URL}/invite/<token>`) once transactional email lands (plan 2.11).
  revalidatePath(MEMBERS_PATH);
  return { ok: true };
}

export async function revokeInvite(workspaceId: string, inviteId: string): Promise<ActionResult> {
  const denied = await requireOwner(workspaceId);
  if (denied) return denied;
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invites").delete().eq("id", inviteId).eq("workspace_id", workspaceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(MEMBERS_PATH);
  return { ok: true };
}

export async function changeMemberRole(workspaceId: string, userId: string, role: string): Promise<ActionResult> {
  const denied = await requireOwner(workspaceId);
  if (denied) return denied;
  const parsed = RoleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "Unknown role" };

  const supabase = await createClient();
  const { data: current } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  if (!current) return { ok: false, error: "Member not found" };
  if (current.role === "owner" && parsed.data !== "owner" && (await ownerCount(workspaceId)) <= 1) {
    return { ok: false, error: "A workspace needs at least one owner. Make someone else an owner first." };
  }

  const { error } = await supabase.from("workspace_members").update({ role: parsed.data }).eq("workspace_id", workspaceId).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(MEMBERS_PATH);
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function removeMember(workspaceId: string, userId: string): Promise<ActionResult> {
  const denied = await requireOwner(workspaceId);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: current } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  if (!current) return { ok: false, error: "Member not found" };
  if (current.role === "owner" && (await ownerCount(workspaceId)) <= 1) {
    return { ok: false, error: "A workspace needs at least one owner. Make someone else an owner first." };
  }

  const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(MEMBERS_PATH);
  revalidatePath("/app", "layout");
  return { ok: true };
}
