import { useCallback } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import type { WorkflowNodeData } from '../components/workflows/types';

type SetNodes = (
  nodes:
    | Node<WorkflowNodeData>[]
    | ((nodes: Node<WorkflowNodeData>[]) => Node<WorkflowNodeData>[]),
) => void;

interface UseCanvasDragDropParams {
  readOnly?: boolean;
  setNodes: SetNodes;
  onNodeDrop?: (
    blockData: { type: string; label: string; config?: any },
    position: { x: number; y: number },
  ) => void;
}

export function useCanvasDragDrop({ readOnly = false, setNodes, onNodeDrop }: UseCanvasDragDropParams) {
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (readOnly) return;

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      try {
        const dragData = JSON.parse(data);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        if (dragData.type === 'block') {
          if (onNodeDrop) {
            onNodeDrop(
              {
                type: dragData.blockType,
                label: dragData.label,
              },
              position,
            );
          } else {
            const newNode: Node<WorkflowNodeData> = {
              id: `node-${Date.now()}`,
              type: dragData.blockType,
              position,
              data: {
                type: dragData.blockType,
                label: dragData.label,
                config: {},
              },
            };
            setNodes((nds) => [...nds, newNode]);
          }
        } else if (dragData.type === 'tool') {
          const tool = dragData.tool;
          if (onNodeDrop) {
            onNodeDrop(
              {
                type: 'tool',
                label: tool.name,
                config: {
                  tool_name: tool.slug || tool.name,
                  provider: tool.provider,
                  integration_type: tool.integration_type,
                  ...(tool.output_schema ? { output_schema: tool.output_schema } : {}),
                  params: {},
                },
              },
              position,
            );
          } else {
            const newNode: Node<WorkflowNodeData> = {
              id: `node-${Date.now()}`,
              type: 'tool',
              position,
              data: {
                type: 'tool',
                label: tool.name,
                config: {
                  tool_name: tool.slug || tool.name,
                  provider: tool.provider,
                  integration_type: tool.integration_type,
                  ...(tool.output_schema ? { output_schema: tool.output_schema } : {}),
                  params: {},
                },
              },
            };
            setNodes((nds) => [...nds, newNode]);
          }
        } else if (dragData.type === 'trigger') {
          // Handle triggers like blocks - add via parent for full metadata
          // eslint-disable-next-line no-console
          console.log('[WorkflowCanvas] Trigger dropped:', dragData.triggerKey);
          if (onNodeDrop) {
            onNodeDrop(
              {
                type: 'trigger',
                label: dragData.title || dragData.triggerKey,
                config: {
                  triggerKey: dragData.triggerKey,
                },
              },
              position,
            );
          } else {
            // eslint-disable-next-line no-console
            console.log(
              '[WorkflowCanvas] Trigger dropped without onNodeDrop handler, ignoring',
            );
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error processing drop:', error);
      }
    },
    [readOnly, screenToFlowPosition, setNodes, onNodeDrop],
  );

  return { onDragOver, onDrop } as const;
}
