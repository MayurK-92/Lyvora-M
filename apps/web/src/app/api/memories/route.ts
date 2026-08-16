import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lightweight memory cards for chat citation hydration. */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => UUID_RE.test(id))
    .slice(0, 20);

  if (!ids.length) {
    return NextResponse.json({ memories: [] });
  }

  const { data, error } = await supabase
    .from("memories")
    .select(
      "id, title, tldr, category, tags, source_url, site_name, saved_at, status",
    )
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    memories: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      tldr: row.tldr,
      category: row.category,
      tags: row.tags ?? [],
      sourceUrl: row.source_url,
      siteName: row.site_name,
      savedAt: row.saved_at,
      status: row.status,
    })),
  });
}
