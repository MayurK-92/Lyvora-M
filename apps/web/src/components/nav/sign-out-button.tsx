import { MaterialIcon } from "@lyvora/ui";
import { signOutAction } from "@/app/(auth)/actions";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction} className={className}>
      <button
        type="submit"
        role="menuitem"
        className="flex w-full items-center gap-sm rounded-lg px-md py-sm text-left text-label-md text-on-surface-variant transition-colors outline-none hover:bg-surface-container-high hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <MaterialIcon name="logout" size={18} />
        Sign out
      </button>
    </form>
  );
}
