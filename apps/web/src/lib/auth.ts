import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Role = "owner" | "editor" | "viewer";
export const WS_COOKIE = "lc_ws";
/** The current-workspace cookie: it only selects among the user's own memberships, but never travels in the clear in production. */
export const WS_COOKIE_OPTS = { path: "/", httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 };

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getMemberships = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_members").select("role, workspace:workspaces(*)").order("created_at");
  return (data ?? []).map((m) => ({ role: m.role as Role, workspace: m.workspace as unknown as Workspace })).filter((m) => m.workspace);
});

/** The workspace the user is working in: cookie if valid, else the first membership. */
export const getCurrentWorkspace = cache(async () => {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;
  const cookieStore = await cookies();
  const wanted = cookieStore.get(WS_COOKIE)?.value;
  return memberships.find((m) => m.workspace.id === wanted) ?? memberships[0];
});

export async function requireWorkspace() {
  await requireUser();
  const current = await getCurrentWorkspace();
  if (!current) redirect("/app/onboarding");
  return current;
}

export function canEdit(role: Role) {
  return role === "owner" || role === "editor";
}

export const isAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin").maybeSingle();
  return data === true;
});

export async function requireAdmin() {
  await requireUser();
  if (!(await isAdmin())) redirect("/app");
}
