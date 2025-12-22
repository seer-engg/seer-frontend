/**
 * Workflows Page
 * 
 * Main page for visual workflow builder.
 * Supports connecting to self-hosted backend via ?backend= URL parameter.
 */
import { useState, useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { WorkflowCanvas, WorkflowNodeData } from '@/components/workflows/WorkflowCanvas';
import { ToolPalette } from '@/components/workflows/ToolPalette';
import { BlockConfigPanel } from '@/components/workflows/BlockConfigPanel';
import { WorkflowChatAssistant } from '@/components/workflows/WorkflowChatAssistant';
import { ExecutionPanel } from '@/components/workflows/ExecutionPanel';
import { useWorkflowBuilder } from '@/hooks/useWorkflowBuilder';
import { Button } from '@/components/ui/button';
import { Play, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Workflows() {
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  
  const {
    workflows,
    createWorkflow,
    updateWorkflow,
    executeWorkflow,
    isCreating,
    isExecuting,
  } = useWorkflowBuilder();

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const handleBlockSelect = useCallback(
    (block: { type: string; label: string; config?: any }) => {
      const newNode: Node<WorkflowNodeData> = {
        id: `node-${Date.now()}`,
        type: block.type as any,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
        },
        data: {
          type: block.type as any,
          label: block.label,
          config: block.config || {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...updates } }
            : node
        )
      );
    },
    []
  );

  const handleWorkflowGenerated = useCallback(
    (generatedNodes: Node<WorkflowNodeData>[], generatedEdges: Edge[]) => {
      setNodes(generatedNodes);
      setEdges(generatedEdges);
    },
    []
  );

  const handleSave = useCallback(async () => {
    const graphData = { nodes, edges };
    
    try {
      if (selectedWorkflowId) {
        await updateWorkflow(selectedWorkflowId, {
          name: workflowName,
          graph_data: graphData,
        });
      } else {
        const workflow = await createWorkflow(workflowName, undefined, graphData);
        setSelectedWorkflowId(workflow.id);
      }
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  }, [nodes, edges, workflowName, selectedWorkflowId, createWorkflow, updateWorkflow]);

  const handleExecute = useCallback(async () => {
    if (!selectedWorkflowId) {
      alert('Please save the workflow first');
      return;
    }

    try {
      await executeWorkflow(selectedWorkflowId, {}, false);
      alert('Workflow execution started!');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      alert('Failed to execute workflow');
    }
  }, [selectedWorkflowId, executeWorkflow]);

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Tool Palette */}
      <div className="w-64 border-r">
        <ToolPalette onBlockSelect={handleBlockSelect} />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="max-w-xs"
              placeholder="Workflow name"
            />
            <Button onClick={handleSave} disabled={isCreating} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={handleExecute}
              disabled={!selectedWorkflowId || isExecuting}
              size="sm"
              variant="default"
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkflowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-border flex flex-col">
        {/* Top Panel - Chat Assistant or Block Config */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedNode ? (
            <BlockConfigPanel
              node={selectedNode}
              onUpdate={handleNodeUpdate}
            />
          ) : (
            <div className="p-4">
              <WorkflowChatAssistant
                onWorkflowGenerated={handleWorkflowGenerated}
              />
            </div>
          )}
        </div>

        {/* Bottom Panel - Execution History */}
        {selectedWorkflowId && (
          <div className="h-64 border-t">
            <ExecutionPanel workflowId={selectedWorkflowId} />
          </div>
        )}
      </div>
    </div>
  );
}

