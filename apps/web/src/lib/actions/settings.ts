"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { WS_COOKIE, WS_COOKIE_OPTS, getMemberships, requireUser, type Role } from "@/lib/auth";
import type { MemoryItem } from "@/lib/data/dashboard";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function roleIn(workspaceId: string): Promise<Role | null> {
  const memberships = await getMemberships();
  return memberships.find((m) => m.workspace.id === workspaceId)?.role ?? null;
}

/* ---------------- profile ---------------- */

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.string().trim().max(120, "Name is too long (120 characters max)").safeParse(formData.get("full_name") ?? "");
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  const fullName = parsed.data || null;

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  // the shell reads the name from auth metadata; keep it in sync
  await supabase.auth.updateUser({ data: { full_name: fullName } });
  revalidatePath("/app", "layout");
  return { ok: true };
}

/* ---------------- workspace ---------------- */

export async function renameWorkspace(workspaceId: string, name: string): Promise<ActionResult> {
  await requireUser();
  if ((await roleIn(workspaceId)) !== "owner") return { ok: false, error: "Only an owner can rename the workspace" };
  const parsed = z.string().trim().min(1, "Give the workspace a name").max(80, "Name is too long (80 characters max)").safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };

  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").update({ name: parsed.data }).eq("id", workspaceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app", "layout");
  return { ok: true };
}

const MemoryItemSchema = z.object({
  text: z.string().trim().min(1).max(500),
  source: z.enum(["user", "learned"]).default("user"),
  created_at: z.string().default(""),
});

export async function updateInstructionMemory(workspaceId: string, items: MemoryItem[]): Promise<ActionResult> {
  await requireUser();
  if ((await roleIn(workspaceId)) !== "owner") return { ok: false, error: "Only an owner can edit instruction memory" };
  const parsed = z.array(MemoryItemSchema).max(100, "Keep the list under 100 items").safeParse(items);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid list" };

  const now = new Date().toISOString();
  const value = parsed.data.map((i) => ({ text: i.text, source: i.source, created_at: i.created_at || now }));
  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").update({ instruction_memory: value }).eq("id", workspaceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/workspace");
  return { ok: true };
}

export async function deleteWorkspace(workspaceId: string, confirmName: string): Promise<ActionResult> {
  await requireUser();
  const memberships = await getMemberships();
  const target = memberships.find((m) => m.workspace.id === workspaceId);
  if (!target) return { ok: false, error: "Workspace not found" };
  if (target.role !== "owner") return { ok: false, error: "Only an owner can delete the workspace" };
  if (confirmName.trim() !== target.workspace.name) return { ok: false, error: "The name you typed does not match" };
  const remaining = memberships.filter((m) => m.workspace.id !== workspaceId);
  if (remaining.length === 0) return { ok: false, error: "You need at least one workspace. Create another one first, then delete this one." };

  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
  if (error) return { ok: false, error: error.message };

  const cookieStore = await cookies();
  cookieStore.set(WS_COOKIE, remaining[0].workspace.id, WS_COOKIE_OPTS);
  revalidatePath("/app", "layout");
  redirect("/app?deleted=1");
}
