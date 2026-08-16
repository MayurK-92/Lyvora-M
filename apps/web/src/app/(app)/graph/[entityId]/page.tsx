import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntityPage } from "@lyvora/core";
import { Chip, MaterialIcon } from "@lyvora/ui";
import { MemoryCard } from "@/components/memory/memory-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionHeading } from "@/components/layout/section-heading";
import { requireUser } from "@/lib/auth/session";

export default async function EntityHubPage({
  params,
}: {
  params: Promise<{ entityId: string }>;
}) {
  const { entityId } = await params;
  const user = await requireUser();
  const page = await getEntityPage(user.id, entityId);
  if (!page) notFound();

  const { entity, memories } = page;

  return (
    <PageContainer className="max-w-4xl">
      <Link
        href="/graph"
        className="mb-lg inline-flex items-center gap-xs rounded-lg text-label-md text-on-surface-variant transition-colors outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <MaterialIcon name="arrow_back" size={18} />
        Back to graph
      </Link>

      <header className="mb-2xl overflow-hidden rounded-2xl bg-surface-container-low p-lg">
        <Chip size="sm" tone="secondaryContainer" icon="hub" className="mb-sm capitalize">
          {entity.kind.replace(/_/g, " ")}
        </Chip>
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface sm:text-headline-lg">
          {entity.name}
        </h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          {entity.mentionCount} linked{" "}
          {entity.mentionCount === 1 ? "memory" : "memories"}
        </p>
      </header>

      {memories.length === 0 ? (
        <EmptyState
          icon="hub"
          message="No linked memories for this entity."
          actionLabel="Back to graph"
          actionHref="/graph"
        />
      ) : (
        <section>
          <SectionHeading icon="memory" title="Connected memories" />
          <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
            {memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={{
                  id: memory.id,
                  title: memory.title,
                  tldr: memory.tldr,
                  category: memory.category,
                  tags: memory.tags ?? [],
                  savedAt: memory.savedAt?.toISOString?.() ?? String(memory.savedAt),
                }}
              />
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
