import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
  const fullName = profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? "";
  const email = user.email ?? profile?.email ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Who you are across every workspace you belong to.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm fullName={fullName} email={email} />
      </CardContent>
    </Card>
  );
}
