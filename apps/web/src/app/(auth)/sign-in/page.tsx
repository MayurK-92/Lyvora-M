import { MagicLinkForm } from "./magic-link-form";
import { GoogleSignInButton } from "./google-sign-in-button";

const ERROR_MESSAGES: Record<string, string> = {
  google_unavailable: "Google sign-in isn't configured yet. Use email instead.",
  auth_callback_failed: "That link expired or was already used. Request a new one.",
};

function safeNext(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/home";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: nextParam } = await searchParams;
  const next = safeNext(nextParam);

  return (
    <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest px-lg py-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:px-xl">
      <header className="mb-xl">
        <h1 className="text-headline-md text-on-surface">Sign in</h1>
        <p className="mt-xs max-w-[32ch] text-body-md leading-relaxed text-on-surface-variant">
          We&apos;ll email you a link. No password needed.
        </p>
      </header>

      {error && ERROR_MESSAGES[error] && (
        <p
          role="alert"
          className="mb-lg rounded-xl border border-error/30 bg-error-container px-md py-sm text-body-md text-on-error-container"
        >
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="flex flex-col gap-lg">
        <MagicLinkForm next={next} />

        <div className="flex items-center gap-md" aria-hidden="true">
          <div className="h-px flex-1 bg-outline-variant/60" />
          <span className="text-label-sm font-normal text-on-surface-variant">or</span>
          <div className="h-px flex-1 bg-outline-variant/60" />
        </div>

        <GoogleSignInButton next={next} />
      </div>

      <p className="mt-xl text-center text-label-sm font-normal leading-relaxed text-on-surface-variant">
        By continuing, you agree to let Lyvora turn what you save into your personal
        knowledge base.
      </p>
    </div>
  );
}
