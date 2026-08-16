import { getKnowledgeGraph } from "@lyvora/core";
import { GraphExplorer } from "@/components/graph/graph-explorer";
import { requireUser } from "@/lib/auth/session";

export default async function GraphPage() {
  const user = await requireUser();
  const { nodes, edges } = await getKnowledgeGraph(user.id);

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden">
      <GraphExplorer nodes={nodes} edges={edges} />
    </div>
  );
}
