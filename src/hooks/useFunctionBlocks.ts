import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { backendApiClient } from '@/lib/api-client';
import type { FunctionBlockSchema } from '@/components/workflows/types';

interface NodeFieldDescriptor {
  name: string;
  kind: string;
  required?: boolean;
}

interface NodeTypeDescriptor {
  type: string;
  title: string;
  fields: NodeFieldDescriptor[];
}

interface NodeTypeResponse {
  node_types: NodeTypeDescriptor[];
}

export function useFunctionBlocks() {
  const queryResult = useQuery({
    queryKey: ['function-block-schemas'],
    queryFn: async () => {
      const response = await backendApiClient.request<NodeTypeResponse>(
        '/api/v1/builder/node-types',
        { method: 'GET' },
      );
      return response.node_types.map<FunctionBlockSchema>((nodeType) => ({
        type: nodeType.type as FunctionBlockSchema['type'],
        label: nodeType.title,
        category: 'Core',
        description: `${nodeType.title} block`,
        defaults: {},
        config_schema: {
          type: 'object',
          properties: nodeType.fields.reduce<Record<string, unknown>>((acc, field) => {
            acc[field.name] = { type: 'string', description: field.kind };
            return acc;
          }, {}),
        },
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const blocksByType = useMemo(() => {
    const map = new Map<string, FunctionBlockSchema>();
    (queryResult.data || []).forEach((block) => {
      map.set(block.type, block);
    });
    return map;
  }, [queryResult.data]);

  return {
    ...queryResult,
    blocks: queryResult.data ?? [],
    blocksByType,
  };
}

