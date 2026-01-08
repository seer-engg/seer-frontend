import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

import { useIntegrationStore } from '@/stores/integrationStore';

export function useFunctionBlocks() {
  const {
    functionBlocks,
    functionBlocksByType,
    functionBlocksLoading,
    functionBlocksError,
    functionBlocksLoaded,
    loadFunctionBlocks,
  } = useIntegrationStore(
    useShallow((state) => ({
      functionBlocks: state.functionBlocks,
      functionBlocksByType: state.functionBlocksByType,
      functionBlocksLoading: state.functionBlocksLoading,
      functionBlocksError: state.functionBlocksError,
      functionBlocksLoaded: state.functionBlocksLoaded,
      loadFunctionBlocks: state.loadFunctionBlocks,
    })),
  );

  useEffect(() => {
    if (!functionBlocksLoaded && !functionBlocksLoading) {
      void loadFunctionBlocks().catch(() => undefined);
    }
  }, [functionBlocksLoaded, functionBlocksLoading, loadFunctionBlocks]);

  return {
    blocks: functionBlocks,
    blocksByType: functionBlocksByType,
    data: functionBlocks,
    isLoading: functionBlocksLoading,
    isFetching: functionBlocksLoading,
    error: functionBlocksError,
    refetch: loadFunctionBlocks,
  };
}
