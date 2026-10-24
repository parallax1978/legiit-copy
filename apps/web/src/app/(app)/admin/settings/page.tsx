import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/admin/stat-tile";
import { SettingField } from "@/components/admin/settings-forms";
import { AdminsManager } from "@/components/admin/admins-manager";
import { getSettings, listAdmins } from "@/lib/data/admin";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Admin settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, admins, user] = await Promise.all([getSettings(), listAdmins(), requireUser()]);
  return (
    <>
      <PageHeader title="Settings" description="App settings live in app.settings (read and written through admin_get_setting / admin_set_setting). Model keys stay in Edge Function secrets and are never stored here." />

      <Section title="Pipeline" description="What the dispatcher (pg_cron → pg_net) and the Edge Functions need to find each other.">
        <div className="grid gap-3 lg:grid-cols-2">
          <SettingField
            keyName="functions_url"
            label="Functions URL"
            value={settings.functions_url}
            hint={
              <>
                Base URL of the Edge Functions, e.g. <code>https://&lt;project&gt;.supabase.co/functions/v1</code>. The dispatcher POSTs each queued step to <code>{"{functions_url}/run-step"}</code>; without it nothing runs.
              </>
            }
          />
          <SettingField keyName="eval_workspace_id" label="Eval workspace" value={settings.eval_workspace_id} hint="UUID of the internal workspace eval runs generate into. Eval outputs never land in a customer workspace." />
          <SettingField
            keyName="pipeline_shared_secret"
            label="Pipeline shared secret"
            value={settings.pipeline_shared_secret}
            secret
            hint={
              <>
                Write-only. run-step authenticates every dispatcher call with the <code>x-pipeline-secret</code> header and rejects any request whose value does not match. The dispatcher prefers the Vault secret named <code>pipeline_shared_secret</code> and falls back to this setting; rotate both together and set the same value in the run-step function secrets.
              </>
            }
          />
        </div>
      </Section>

      <Section title="App admins" description="Members of app_admins see this area and bypass workspace RLS through app.is_admin(). Add by the email on the user's profile.">
        <AdminsManager admins={admins} currentUserId={user.id} />
      </Section>
    </>
  );
}
