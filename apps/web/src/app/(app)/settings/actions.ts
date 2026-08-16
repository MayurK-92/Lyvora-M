"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CAPTURES_BUCKET,
  createServiceSupabaseClient,
  generateWeeklyReport,
} from "@lyvora/core";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTimezone } from "@/lib/timezones";

export async function updateDisplayNameAction(formData: FormData) {
  const raw = String(formData.get("displayName") ?? "").trim();
  if (raw.length > 80) {
    throw new Error("Name must be 80 characters or fewer.");
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: raw.length > 0 ? raw : null })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function updateTimezoneAction(formData: FormData) {
  const timezone = String(formData.get("timezone") ?? "");
  if (!isTimezone(timezone)) {
    return;
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ timezone })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");

  try {
    await generateWeeklyReport(user.id);
  } catch (error) {
    console.error("timezone save: weekly report refresh failed", error);
  }

  revalidatePath("/report");
}

async function deleteUserUploads(userId: string) {
  const admin = createServiceSupabaseClient();
  for (;;) {
    const { data, error } = await admin.storage
      .from(CAPTURES_BUCKET)
      .list(userId, { limit: 1000 });
    if (error) {
      throw new Error(error.message);
    }
    const paths = (data ?? [])
      .map((entry) => entry.name)
      .filter(Boolean)
      .map((name) => `${userId}/${name}`);
    if (!paths.length) break;
    const { error: removeError } = await admin.storage
      .from(CAPTURES_BUCKET)
      .remove(paths);
    if (removeError) {
      throw new Error(removeError.message);
    }
    if ((data?.length ?? 0) < 1000) break;
  }
}

export async function deleteAccountAction(formData: FormData) {
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (confirm !== "delete") {
    throw new Error("Type DELETE to confirm.");
  }

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  await deleteUserUploads(user.id);

  const admin = createServiceSupabaseClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    throw new Error(error.message);
  }

  await supabase.auth.signOut();
  redirect("/");
}
