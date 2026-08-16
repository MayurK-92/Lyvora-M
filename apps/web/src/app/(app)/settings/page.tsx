import { Avatar } from "@lyvora/ui";
import { SignOutButton } from "@/components/nav/sign-out-button";
import { CaptureHelpers } from "@/components/settings/capture-helpers";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { DisplayNameForm } from "@/components/settings/display-name-form";
import { ExportDataButton } from "@/components/settings/export-data-button";
import { TimezoneForm } from "@/components/settings/timezone-form";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeading } from "@/components/layout/section-heading";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { avatarUrlOf, resolveDisplayName } from "@/lib/user";

export default async function SettingsPage() {
  const user = await requireUser();
  const email = user.email ?? "";
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = resolveDisplayName(profile?.display_name, user.user_metadata, email);
  const weeklyEmailOn = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM,
  );

  return (
    <PageContainer className="max-w-3xl space-y-2xl">
      <header>
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
          Settings
        </h1>
        <p className="mt-xs text-body-lg text-on-surface-variant">
          Account, install, and your data.
        </p>
      </header>

      <section>
        <SectionHeading icon="person" title="Account" />
        <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
          <div className="flex items-center gap-md border-b border-outline-variant/30 px-md py-md">
            <Avatar src={avatarUrlOf(user.user_metadata)} name={name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-label-md text-on-surface">{name}</p>
              <p className="truncate text-label-sm font-normal text-on-surface-variant">
                {email}
              </p>
            </div>
          </div>
          <div className="space-y-lg border-b border-outline-variant/30 px-md py-md">
            <DisplayNameForm initialName={profile?.display_name?.trim() ? profile.display_name : name} />
            <div>
              <TimezoneForm initialTimezone={profile?.timezone ?? "UTC"} />
              <p className="mt-xs text-label-sm font-normal text-on-surface-variant">
                Saving rebuilds this week&apos;s digest. Monday email goes out at
                8:00 in this timezone
                {weeklyEmailOn
                  ? "."
                  : " once Resend is configured on the server."}
              </p>
            </div>
          </div>
          <div className="px-xs py-xs">
            <SignOutButton />
          </div>
        </div>
      </section>

      <section>
        <SectionHeading icon="touch_app" title="Install the app" />
        <p className="mb-lg text-body-md text-on-surface-variant">
          Install Lyvora on your phone or desktop, then share links into it.
        </p>
        <CaptureHelpers />
      </section>

      <section>
        <SectionHeading icon="folder" title="Your data" />
        <p className="mb-lg text-body-md text-on-surface-variant">
          Download a JSON copy of your memories, or permanently delete everything.
        </p>
        <div className="flex flex-wrap items-center gap-sm">
          <ExportDataButton />
          <DeleteAccountDialog />
        </div>
      </section>
    </PageContainer>
  );
}
