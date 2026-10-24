"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { WS_COOKIE, requireUser } from "@/lib/auth";

export async function switchWorkspace(workspaceId: string, next = "/app") {
  await requireUser();
  const cookieStore = await cookies();
  cookieStore.set(WS_COOKIE, workspaceId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  redirect(next);
}

export async function createWorkspace(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/app/onboarding?error=name");
  const supabase = await createClient();
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.from("workspaces").insert({ name, slug, created_by: user.id }).select("id").single();
  if (error) redirect(`/app/onboarding?error=${encodeURIComponent(error.message)}`);
  const cookieStore = await cookies();
  cookieStore.set(WS_COOKIE, data.id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/app");
  redirect("/app");
}
