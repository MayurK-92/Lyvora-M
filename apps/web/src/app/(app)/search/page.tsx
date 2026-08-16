import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SearchPanel } from "@/components/search/search-panel";
import type { MemoryCardData } from "@/components/memory/memory-card";

const BROWSE_COLUMNS =
  "id, title, tldr, category, tags, source_url, site_name, hero_image_url, saved_at, status";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: pinned } = await supabase
    .from("memories")
    .select(BROWSE_COLUMNS)
    .eq("is_archived", false)
    .eq("is_pinned", true)
    .order("saved_at", { ascending: false })
    .limit(12);

  const { data: recent } = await supabase
    .from("memories")
    .select(BROWSE_COLUMNS)
    .eq("is_archived", false)
    .order("saved_at", { ascending: false })
    .limit(24);

  const seen = new Set<string>();
  const initialBrowse: MemoryCardData[] = [...(pinned ?? []), ...(recent ?? [])]
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      tldr: row.tldr,
      category: row.category,
      tags: row.tags ?? [],
      sourceUrl: row.source_url,
      siteName: row.site_name,
      heroImageUrl: row.hero_image_url,
      savedAt: row.saved_at,
      status: row.status,
    }));

  return <SearchPanel initialBrowse={initialBrowse} initialQuery={q ?? ""} />;
}
