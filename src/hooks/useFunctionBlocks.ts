import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { backendApiClient } from '@/lib/api-client';
import type { FunctionBlockSchema } from '@/components/workflows/types';

interface FunctionBlocksResponse {
  blocks: FunctionBlockSchema[];
}

export function useFunctionBlocks() {
  const queryResult = useQuery({
    queryKey: ['function-block-schemas'],
    queryFn: async () => {
      const response = await backendApiClient.request<FunctionBlocksResponse>(
        '/api/workflows/blocks/functions',
        { method: 'GET' }
      );
      return response.blocks;
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

