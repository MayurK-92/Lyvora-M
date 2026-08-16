import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("memories")
    .select(
      "id, title, tldr, summary, category, tags, key_points, structured, source_url, source_type, site_name, author, content_type, saved_at, updated_at, is_pinned, is_archived",
    )
    .order("saved_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    email: user.email ?? null,
    memoryCount: data?.length ?? 0,
    memories: data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lyvora-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
