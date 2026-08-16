import { NextResponse } from "next/server";
import { getEntityPage } from "@lyvora/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Plain-language overview built from the entity's own links — no model call. */
function summarize(
  name: string,
  memories: Array<{ category: string; savedAt: Date }>,
): string | null {
  if (memories.length === 0) return null;

  const counts = new Map<string, number>();
  for (const memory of memories) {
    counts.set(memory.category, (counts.get(memory.category) ?? 0) + 1);
  }
  const [topCategory] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;

  const times = memories.map((memory) => memory.savedAt.getTime());
  const first = new Date(Math.min(...times));
  const last = new Date(Math.max(...times));
  const format = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const span =
    format(first) === format(last)
      ? `all from ${format(last)}`
      : `spanning ${format(first)} to ${format(last)}`;

  return `${name} appears in ${memories.length} ${
    memories.length === 1 ? "memory" : "memories"
  }, most often under ${topCategory} — ${span}.`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = await getEntityPage(user.id, entityId);
  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    entity: {
      id: page.entity.id,
      name: page.entity.name,
      kind: page.entity.kind,
      summary: summarize(page.entity.name, page.memories),
      memories: page.memories.slice(0, 12).map((memory) => ({
        id: memory.id,
        title: memory.title,
        tldr: memory.tldr,
        category: memory.category,
        savedAt: memory.savedAt.toISOString(),
      })),
    },
  });
}
