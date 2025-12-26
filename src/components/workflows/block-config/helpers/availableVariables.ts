import { Node } from '@xyflow/react';

import { WorkflowNodeData } from '@/components/workflows/types';

import { getNodeAlias } from './nodeAlias';

export const collectAvailableVariables = (
  allNodes: Node<WorkflowNodeData>[] = [],
  currentNode?: Node<WorkflowNodeData> | null
): string[] => {
  if (!allNodes) return [];

  const variables: string[] = [];

  allNodes
    .filter(node => node.data.type === 'input')
    .forEach(inputNode => {
      const blockAlias = getNodeAlias(inputNode);
      const config = inputNode.data.config || {};

      if (config.variable_name) {
        variables.push(config.variable_name);
        variables.push(`${blockAlias}.${config.variable_name}`);
      }

      if (Array.isArray(config.fields)) {
        config.fields.forEach((field: any) => {
          const fieldName = field.id || field.name;
          if (fieldName) {
            variables.push(`${blockAlias}.${fieldName}`);
            variables.push(fieldName);
          }
        });
      }
    });

  allNodes.forEach(block => {
    if (block.id === currentNode?.id) return;

    const blockAlias = getNodeAlias(block);
    if (!blockAlias) return;

    switch (block.data.type) {
      case 'tool':
        variables.push(`${blockAlias}.output`);
        break;
      case 'llm': {
        variables.push(`${blockAlias}.output`);
        const llmConfig = block.data.config || {};
        const outputSchema = llmConfig.output_schema;
        if (outputSchema && typeof outputSchema === 'object' && outputSchema.properties) {
          Object.keys(outputSchema.properties).forEach(fieldName => {
            variables.push(`${blockAlias}.${fieldName}`);
          });
          variables.push(`${blockAlias}.structured_output`);
        }
        break;
      }
      case 'code':
        variables.push(`${blockAlias}.output`);
        break;
      case 'input': {
        const config = block.data.config || {};
        if (config.variable_name || (Array.isArray(config.fields) && config.fields.length > 0)) {
          variables.push(`${blockAlias}.output`);
        }
        break;
      }
      case 'if_else':
        variables.push(`${blockAlias}.output`);
        variables.push(`${blockAlias}.condition_result`);
        variables.push(`${blockAlias}.route`);
        break;
      case 'for_loop':
        variables.push(`${blockAlias}.output`);
        variables.push(`${blockAlias}.items`);
        variables.push(`${blockAlias}.count`);
        {
          const loopConfig = block.data.config || {};
          if (loopConfig.item_var) {
            variables.push(loopConfig.item_var);
            variables.push(`${blockAlias}.${loopConfig.item_var}`);
          }
        }
        break;
      default:
        break;
    }
  });

  return Array.from(new Set(variables));
};

