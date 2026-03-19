import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  MarkerType,
  Panel,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { MessageSquare, HelpCircle, GitBranch, PhoneForwarded, PhoneOff, Wrench, ShieldAlert, Plus } from "lucide-react";
import { FlowNodeConfig } from "./flow-nodes/FlowNodeConfig";
import { MessageNode } from "./flow-nodes/MessageNode";
import { QuestionNode } from "./flow-nodes/QuestionNode";
import { ConditionNode } from "./flow-nodes/ConditionNode";
import { ToolNode } from "./flow-nodes/ToolNode";
import { TransferNode } from "./flow-nodes/TransferNode";
import { EndNode } from "./flow-nodes/EndNode";
import { ObjectionNode } from "./flow-nodes/ObjectionNode";

export interface FlowData {
  nodes: Node[];
  edges: Edge[];
}

interface FlowBuilderProps {
  initialFlow: FlowData | null;
  onChange: (flow: FlowData) => void;
}

const nodeTypes = {
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
  tool: ToolNode,
  transfer: TransferNode,
  end: EndNode,
  objection: ObjectionNode,
};

const defaultNodes: Node[] = [
  {
    id: "start",
    type: "message",
    position: { x: 250, y: 50 },
    data: { label: "Greeting", text: "Hi [Name], this is [Agent] from [Company]..." },
  },
];

const nodeTemplates: { type: string; label: string; icon: React.ElementType; data: Record<string, unknown> }[] = [
  { type: "message", label: "Message", icon: MessageSquare, data: { label: "Message", text: "" } },
  { type: "question", label: "Question", icon: HelpCircle, data: { label: "Question", text: "", branches: [{ label: "Yes", id: "yes" }, { label: "No", id: "no" }] } },
  { type: "condition", label: "Condition", icon: GitBranch, data: { label: "Condition", conditionType: "interest_level", branches: [{ label: "High", id: "high" }, { label: "Low", id: "low" }] } },
  { type: "tool", label: "Tool", icon: Wrench, data: { label: "Use Tool", toolAction: "book_appointment" } },
  { type: "transfer", label: "Transfer", icon: PhoneForwarded, data: { label: "Transfer", announcement: "Let me connect you with a specialist." } },
  { type: "end", label: "End Call", icon: PhoneOff, data: { label: "End Call", closingMessage: "Thank you for your time. Have a great day!" } },
  { type: "objection", label: "Objection", icon: ShieldAlert, data: { label: "Objection Handler", objection: "", response: "" } },
];

const defaultEdgeOptions = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
  style: { strokeWidth: 2 },
};

export function FlowBuilder({ initialFlow, onChange }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow?.nodes || defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge({ ...params, ...defaultEdgeOptions }, edges);
      setEdges(newEdges);
      onChange({ nodes, edges: newEdges });
    },
    [edges, nodes, onChange, setEdges]
  );

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // We'll sync via onNodeDragStop instead to avoid excessive updates
    },
    [onNodesChange]
  );

  const handleNodeDragStop = useCallback(() => {
    // Use setTimeout to get updated nodes after state settles
    setTimeout(() => {
      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          onChange({ nodes: currentNodes, edges: currentEdges });
          return currentEdges;
        });
        return currentNodes;
      });
    }, 0);
  }, [onChange, setNodes, setEdges]);

  const addNode = useCallback(
    (template: (typeof nodeTemplates)[0]) => {
      const newId = `node_${Date.now()}`;
      const newNode: Node = {
        id: newId,
        type: template.type,
        position: { x: 250 + Math.random() * 100, y: 200 + nodes.length * 80 },
        data: { ...template.data },
      };
      const updated = [...nodes, newNode];
      setNodes(updated);
      onChange({ nodes: updated, edges });
    },
    [nodes, edges, onChange, setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) => {
        const updated = nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
        onChange({ nodes: updated, edges });
        return updated;
      });
      setSelectedNode((prev) => (prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev));
    },
    [edges, onChange, setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const updated = nds.filter((n) => n.id !== nodeId);
        setEdges((eds) => {
          const updatedEdges = eds.filter((e) => e.source !== nodeId && e.target !== nodeId);
          onChange({ nodes: updated, edges: updatedEdges });
          return updatedEdges;
        });
        return updated;
      });
      setSelectedNode(null);
    },
    [onChange, setNodes, setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="flex h-[600px] border border-border rounded-lg overflow-hidden bg-background">
      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          className="bg-muted/30"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-30" />
          <Controls className="!bg-background !border-border !shadow-md" />
          <Panel position="top-left" className="flex flex-wrap gap-1">
            {nodeTemplates.map((t) => (
              <Button key={t.type} variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => addNode(t)}>
                <t.icon className="h-3 w-3" />
                {t.label}
              </Button>
            ))}
          </Panel>
        </ReactFlow>
      </div>

      {/* Config panel */}
      {selectedNode && (
        <div className="w-72 border-l border-border overflow-y-auto p-4 bg-background">
          <FlowNodeConfig
            node={selectedNode}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onDelete={() => deleteNode(selectedNode.id)}
            allNodes={nodes}
          />
        </div>
      )}
    </div>
  );
}
