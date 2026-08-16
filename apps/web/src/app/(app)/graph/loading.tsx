import { Spinner } from "@lyvora/ui";

export default function GraphLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center gap-md bg-surface-container-low">
      <Spinner size={28} label="Building your knowledge graph" />
      <p className="text-body-md text-on-surface-variant">
        Building your knowledge graph…
      </p>
    </div>
  );
}
