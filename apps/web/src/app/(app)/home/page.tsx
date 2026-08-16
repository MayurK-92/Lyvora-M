import { listRediscovery } from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CaptureFeed } from "@/components/capture/capture-feed";
import type { MemoryCardData } from "@/components/memory/memory-card";
import { requireUser } from "@/lib/auth/session";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ shareError?: string; captureId?: string }>;
}) {
  const { shareError } = await searchParams;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("memories")
    .select(
      "id, title, tldr, category, tags, source_url, site_name, saved_at, status",
    )
    .eq("is_archived", false)
    .order("saved_at", { ascending: false })
    .limit(6);

  const initialMemories: MemoryCardData[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    tldr: row.tldr,
    category: row.category,
    tags: row.tags ?? [],
    sourceUrl: row.source_url,
    siteName: row.site_name,
    savedAt: row.saved_at,
    status: row.status,
  }));

  const rediscovery = await listRediscovery(user.id, 8);

  return (
    <CaptureFeed
      initialMemories={initialMemories}
      shareError={shareError ?? null}
      rediscovery={rediscovery.map((item) => ({
        id: item.id,
        title: item.title,
        tldr: item.tldr,
        category: item.category,
        tags: item.tags,
        savedAt:
          item.savedAt instanceof Date
            ? item.savedAt.toISOString()
            : String(item.savedAt),
        reason: item.reason,
      }))}
    />
  );
}
