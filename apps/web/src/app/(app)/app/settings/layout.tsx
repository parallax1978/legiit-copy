import { PageHeader } from "@/components/app/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title="Settings" description="Your profile, this workspace, who is in it, and what it costs." className="mb-4" />
      <SettingsNav />
      {children}
    </div>
  );
}
