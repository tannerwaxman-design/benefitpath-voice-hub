/**
 * Converts a visual flow (nodes + edges) into the conversation_stages
 * JSON format that the prompt compiler already understands.
 */
import type { Node, Edge } from "@xyflow/react";

interface ConversationStage {
  name: string;
  script: string;
  questions: string[];
  order: number;
}

interface ObjectionEntry {
  objection: string;
  response: string;
}

export interface CompiledFlow {
  conversation_stages: ConversationStage[];
  objection_handling: ObjectionEntry[];
  closing_script: string | null;
  transfer_announcement: string | null;
}

export function flowToStages(nodes: Node[], edges: Edge[]): CompiledFlow {
  // Build adjacency map
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    const list = childrenOf.get(edge.source) || [];
    list.push(edge.target);
    childrenOf.set(edge.source, list);
  }

  // Find roots (nodes with no incoming edges)
  const hasIncoming = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !hasIncoming.has(n.id));
  const startNode = roots[0] || nodes[0];
  if (!startNode) return { conversation_stages: [], objection_handling: [], closing_script: null, transfer_announcement: null };

  // BFS traversal to get ordered stages
  const visited = new Set<string>();
  const queue: string[] = [startNode.id];
  const orderedNodes: Node[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodes.find((n) => n.id === id);
    if (node) orderedNodes.push(node);
    const children = childrenOf.get(id) || [];
    for (const child of children) {
      if (!visited.has(child)) queue.push(child);
    }
  }

  // Also include disconnected nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) orderedNodes.push(node);
  }

  const stages: ConversationStage[] = [];
  const objections: ObjectionEntry[] = [];
  let closingScript: string | null = null;
  let transferAnnouncement: string | null = null;

  let order = 0;
  for (const node of orderedNodes) {
    const d = node.data as Record<string, unknown>;

    switch (node.type) {
      case "message":
        stages.push({
          name: String(d.label || "Message"),
          script: String(d.text || ""),
          questions: [],
          order: order++,
        });
        break;

      case "question": {
        const branches = (d.branches as { label: string }[]) || [];
        stages.push({
          name: String(d.label || "Question"),
          script: String(d.text || ""),
          questions: branches.map((b) => b.label),
          order: order++,
        });
        break;
      }

      case "condition":
        stages.push({
          name: String(d.label || "Condition"),
          script: `Evaluate ${String(d.conditionType || "condition")} and branch accordingly.`,
          questions: [],
          order: order++,
        });
        break;

      case "tool":
        stages.push({
          name: String(d.label || "Tool"),
          script: `Use tool: ${String(d.toolAction || "action")}`,
          questions: [],
          order: order++,
        });
        break;

      case "objection":
        if (d.objection && d.response) {
          objections.push({
            objection: String(d.objection),
            response: String(d.response),
          });
        }
        break;

      case "transfer":
        transferAnnouncement = String(d.announcement || "");
        break;

      case "end":
        closingScript = String(d.closingMessage || "");
        break;
    }
  }

  return { conversation_stages: stages, objection_handling: objections, closing_script: closingScript, transfer_announcement: transferAnnouncement };
}
