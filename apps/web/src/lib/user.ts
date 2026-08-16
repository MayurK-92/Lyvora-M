/** Supabase stores IdP profile fields under `user_metadata` with provider-specific keys. */
export function avatarUrlOf(metadata: Record<string, unknown> | undefined): string | null {
  const candidate = metadata?.avatar_url ?? metadata?.picture;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

export function displayNameOf(
  metadata: Record<string, unknown> | undefined,
  fallback: string,
): string {
  const candidate = metadata?.full_name ?? metadata?.name ?? metadata?.user_name;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback;
}
