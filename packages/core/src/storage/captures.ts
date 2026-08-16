import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CAPTURES_BUCKET = "captures";

let serviceClient: SupabaseClient | undefined;

/**
 * Service-role Supabase client for Storage reads in pipeline workers.
 * Never import from user-facing request code that renders to a browser.
 */
export function createServiceSupabaseClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Storage workers",
    );
  }
  serviceClient ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

/** Ensure path is under `{userId}/` before any Storage operation. */
export function assertUserUploadPath(userId: string, path: string): void {
  if (!path.startsWith(`${userId}/`) || path.includes("..")) {
    throw new Error("Invalid upload path for user");
  }
}

export async function downloadCaptureObject(
  userId: string,
  path: string,
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  assertUserUploadPath(userId, path);
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.storage
    .from(CAPTURES_BUCKET)
    .download(path);
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to download capture object");
  }
  const buffer = new Uint8Array(await data.arrayBuffer());
  return { bytes: buffer, contentType: data.type || null };
}

export async function createSignedDownloadUrl(
  userId: string,
  path: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  assertUserUploadPath(userId, path);
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.storage
    .from(CAPTURES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to sign download URL");
  }
  return data.signedUrl;
}
