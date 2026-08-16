import { Avatar, MaterialIcon } from "@lyvora/ui";
import { SignOutButton } from "@/components/nav/sign-out-button";
import { CaptureHelpers } from "@/components/settings/capture-helpers";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeading } from "@/components/layout/section-heading";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { avatarUrlOf, displayNameOf } from "@/lib/user";

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  const email = user?.email ?? "";
  const name = displayNameOf(user?.user_metadata, email);

  return (
    <PageContainer className="max-w-3xl space-y-2xl">
      <header>
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
          Settings
        </h1>
        <p className="mt-xs text-body-lg text-on-surface-variant">
          Capture helpers and account.
        </p>
      </header>

      <section>
        <SectionHeading icon="touch_app" title="Capture helpers" />
        <p className="mb-lg text-body-md text-on-surface-variant">
          Save from other browser tabs while signed in.
        </p>
        <CaptureHelpers />
      </section>

      <section>
        <SectionHeading icon="person" title="Account" />
        <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
          <div className="flex items-center gap-md border-b border-outline-variant/30 px-md py-md">
            <Avatar src={avatarUrlOf(user?.user_metadata)} name={name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-label-md text-on-surface">{name}</p>
              <p className="truncate text-label-sm font-normal text-on-surface-variant">
                {email}
              </p>
            </div>
          </div>
          <div className="px-xs py-xs">
            <SignOutButton />
          </div>
        </div>
      </section>

      <section>
        <SectionHeading icon="auto_awesome" title="How Lyvora works" />
        <ul className="grid grid-cols-1 gap-md sm:grid-cols-3">
          {[
            {
              icon: "sync" as const,
              title: "Capture",
              body: "Links, notes, PDFs and images all enter the same pipeline.",
            },
            {
              icon: "psychology" as const,
              title: "Understand",
              body: "Each save is summarised, categorised and linked to entities.",
            },
            {
              icon: "hub" as const,
              title: "Connect",
              body: "Related memories form a graph you can search and chat with.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="rounded-2xl bg-surface-container-low p-md"
            >
              <span className="mb-sm flex size-9 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                <MaterialIcon name={item.icon} size={20} />
              </span>
              <h3 className="text-label-md text-on-surface">{item.title}</h3>
              <p className="mt-xs text-body-md text-on-surface-variant">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
