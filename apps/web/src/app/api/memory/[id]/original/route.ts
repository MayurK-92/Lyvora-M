import { NextResponse } from "next/server";
import { CAPTURES_BUCKET } from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: memory } = await supabase
    .from("memories")
    .select("id, storage_path, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!memory?.storage_path) {
    return NextResponse.json({ error: "No original file" }, { status: 404 });
  }

  if (!memory.storage_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from(CAPTURES_BUCKET)
    .createSignedUrl(memory.storage_path, 60 * 30);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Could not sign URL" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
