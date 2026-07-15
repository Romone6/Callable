import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";
import { CustomRoleManager } from "@/components/app-shell/custom-role-manager";
import { SettingsForm } from "@/components/app-shell/settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <Breadcrumbs current="Settings" />
      <PageHeader label="Settings" title="Workspace settings" description="Unimplemented settings remain explicitly labeled as unavailable." />
      <SettingsForm />
      <CustomRoleManager />
      <Card>
        <h3 className="text-lg font-semibold">Availability status</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--muted-text)]">
          <li>Role and permission templates: Available (custom role create + assign)</li>
          <li>External SaaS credential vaulting: Unavailable</li>
          <li>Workspace branding overrides: Coming soon</li>
        </ul>
      </Card>
    </>
  );
}
