import Link from "next/link";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { recordMemoryView, relatedMemories } from "@lyvora/core";
import { Chip, MaterialIcon, cn } from "@lyvora/ui";
import { CompactMemoryCard } from "@/components/memory/compact-memory-card";
import { MemoryActions } from "@/components/memory/memory-actions";
import { MemoryAskBar } from "@/components/memory/memory-ask-bar";
import {
  PayloadRenderer,
  payloadHighlights,
} from "@/components/memory/payload-renderer";
import { EyebrowLabel } from "@/components/layout/section-heading";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryStyle } from "@/lib/categories";
import { formatAbsoluteDate, sourceHint } from "@/lib/format";

function relationLabel(relation: string): string {
  switch (relation) {
    case "about_same":
      return "About the same";
    case "similar":
      return "Similar";
    case "duplicate":
      return "Duplicate";
    default:
      return relation.replace(/_/g, " ");
  }
}

export default async function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: memory } = await supabase
    .from("memories")
    .select(
      "id, title, tldr, summary, category, tags, key_points, structured, source_url, source_type, site_name, author, content_type, hero_image_url, storage_path, raw_text, saved_at, duplicate_of",
    )
    .eq("id", id)
    .maybeSingle();

  if (!memory) {
    notFound();
  }

  // Persist after the response so the view count is reliable in serverless.
  after(() => {
    void recordMemoryView(user.id, id).catch(() => undefined);
  });

  const style = getCategoryStyle(memory.category);
  const highlights = payloadHighlights(memory.structured);
  const externalUrl =
    memory.source_url && !memory.source_url.startsWith("lyvora://")
      ? memory.source_url
      : null;
  const hint = sourceHint({
    siteName: memory.site_name,
    sourceUrl: memory.source_url,
    sourceType: memory.source_type,
  });
  const snippet = memory.raw_text?.trim().slice(0, 480) ?? null;

  let duplicateTitle: string | null = null;
  if (memory.duplicate_of) {
    const { data: original } = await supabase
      .from("memories")
      .select("id, title")
      .eq("id", memory.duplicate_of)
      .maybeSingle();
    duplicateTitle = original?.title ?? "another memory";
  }

  const related = await relatedMemories(user.id, id);

  return (
    <div className="flex w-full flex-col pb-40">
      <div className="mx-auto w-full max-w-page px-md py-xl md:px-lg">
        <Link
          href="/home"
          className="mb-lg inline-flex items-center gap-xs rounded-lg text-label-md text-on-surface-variant transition-colors outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <MaterialIcon name="arrow_back" size={18} />
          Back to home
        </Link>

        {memory.duplicate_of && (
          <p className="mb-lg rounded-xl bg-surface-container px-md py-sm text-body-md text-on-surface-variant">
            Merged duplicate of{" "}
            <Link
              href={`/memory/${memory.duplicate_of}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {duplicateTitle}
            </Link>
          </p>
        )}

        <div className="flex flex-col gap-xl lg:flex-row">
          <article className="min-w-0 flex-1">
            <header className="relative mb-2xl flex flex-col items-start gap-md">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 -left-lg w-1 rounded-r-full max-md:hidden",
                  style.stripe,
                )}
              />

              <div className="flex flex-wrap items-center gap-sm">
                <Chip icon={style.icon} tone="neutral" className="bg-surface-variant">
                  {memory.category}
                </Chip>
                {externalUrl ? (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-xs rounded-lg text-label-md text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <MaterialIcon name="open_in_new" size={16} />
                    {hint ?? "Open original"}
                  </a>
                ) : (
                  hint && (
                    <span className="text-label-md capitalize text-on-surface-variant">
                      {hint}
                    </span>
                  )
                )}
                {memory.storage_path && (
                  <a
                    href={`/api/memory/${memory.id}/original`}
                    className="flex items-center gap-xs rounded-lg text-label-md text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <MaterialIcon name="download" size={16} />
                    Original file
                  </a>
                )}
              </div>

              <h1 className="text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg lg:text-display-lg">
                {memory.title}
              </h1>

              {(highlights.length > 0 || memory.saved_at) && (
                <div className="mt-sm flex flex-wrap items-center gap-lg">
                  {highlights.map((item) => (
                    <div key={item.label} className="flex flex-col">
                      <EyebrowLabel>{item.label}</EyebrowLabel>
                      <span className="text-body-lg font-medium capitalize text-on-surface">
                        {item.value}
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-col">
                    <EyebrowLabel>Saved</EyebrowLabel>
                    <span className="text-body-lg font-medium text-on-surface">
                      {formatAbsoluteDate(memory.saved_at)}
                    </span>
                  </div>
                </div>
              )}
            </header>

            {memory.hero_image_url && (
              <div
                role="img"
                aria-label={memory.title}
                className="mb-2xl h-[240px] w-full overflow-hidden rounded-xl bg-surface-container bg-cover bg-center shadow-md sm:h-[400px]"
                style={{ backgroundImage: `url('${memory.hero_image_url}')` }}
              />
            )}

            {(memory.summary || memory.tldr) && (
              <section className="mb-xl rounded-xl bg-surface-container-lowest p-lg shadow-sm">
                <div className="mb-md flex items-center gap-sm">
                  <MaterialIcon name="auto_awesome" className="text-primary" />
                  <h2 className="text-headline-md text-on-surface">AI Synthesis</h2>
                </div>
                <div className="space-y-md text-body-lg text-on-surface-variant">
                  {String(memory.summary ?? memory.tldr ?? "")
                    .split(/\n{2,}/)
                    .filter((paragraph: string) => paragraph.trim())
                    .map((paragraph: string, index: number) => (
                      <p key={index} className="whitespace-pre-wrap">
                        {paragraph.trim()}
                      </p>
                    ))}
                </div>
              </section>
            )}

            {Array.isArray(memory.key_points) && memory.key_points.length > 0 && (
              <section className="mb-xl rounded-xl bg-surface-container-low p-md">
                <h3 className="mb-md text-label-md uppercase tracking-widest text-on-surface-variant">
                  Key Points
                </h3>
                <ul className="space-y-sm">
                  {(memory.key_points as string[]).map((point) => (
                    <li key={point} className="flex items-start gap-sm">
                      <MaterialIcon
                        name="check_circle"
                        size={18}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      <span className="text-body-md text-on-surface">{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <PayloadRenderer value={memory.structured} />

            {Array.isArray(memory.tags) && memory.tags.length > 0 && (
              <section className="mb-xl rounded-xl bg-surface-container-low p-md">
                <h3 className="mb-md text-label-md uppercase tracking-widest text-on-surface-variant">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-sm">
                  {(memory.tags as string[]).map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?q=${encodeURIComponent(tag)}`}
                      className="rounded-lg bg-surface-container-highest px-sm py-xs text-body-md text-on-surface transition-colors outline-none hover:bg-secondary-container hover:text-on-secondary-container focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      #{tag.replace(/^#/, "")}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {snippet && (
              <section className="my-xl border-l-4 border-outline-variant py-sm pl-md">
                <h3 className="mb-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                  Original Source Snippet
                </h3>
                <blockquote className="text-body-md italic text-on-surface/80">
                  &ldquo;{snippet}
                  {memory.raw_text && memory.raw_text.length > 480 ? "…" : ""}&rdquo;
                </blockquote>
              </section>
            )}
          </article>

          <aside className="flex w-full shrink-0 flex-col gap-lg lg:w-80">
            <MemoryActions memoryId={memory.id} title={memory.title} />

            {related.length > 0 && (
              <div>
                <h2 className="mb-md text-headline-md text-on-surface">
                  Related Memories
                </h2>
                <div className="flex flex-col gap-sm">
                  {related.map((item) => (
                    <CompactMemoryCard
                      key={item.id}
                      variant="related"
                      memory={{
                        id: item.id,
                        title: item.title,
                        tldr: item.tldr ?? relationLabel(item.relation),
                        category: item.category,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <MemoryAskBar title={memory.title} />
    </div>
  );
}
