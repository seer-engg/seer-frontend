import { memo, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { BaseBlockNode } from './BaseBlockNode';
import { NodeProps } from '@xyflow/react';
import { WorkflowNodeData } from '../WorkflowCanvas';

export const LLMBlockNode = memo(function LLMBlockNode(
  props: NodeProps<WorkflowNodeData>
) {
  // Dynamically generate output handles based on structured output schema
  const outputHandles = useMemo(() => {
    const handles = ['output']; // Always have the default output
    
    const outputSchema = props.data?.config?.output_schema;
    if (outputSchema && typeof outputSchema === 'object' && outputSchema.properties) {
      // Add handles for each structured output field
      const fieldNames = Object.keys(outputSchema.properties);
      fieldNames.forEach((fieldName) => {
        if (!handles.includes(fieldName)) {
          handles.push(fieldName);
        }
      });
    }
    
    return handles;
  }, [props.data?.config?.output_schema]);

  return (
    <BaseBlockNode
      {...props}
      icon={<Sparkles className="w-4 h-4 text-purple-500" />}
      color="purple"
      handles={{
        inputs: ['input'],
        outputs: outputHandles,
      }}
    />
  );
});

