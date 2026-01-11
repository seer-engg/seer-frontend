import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { backendApiClient } from '@/lib/api-client';
import { useChatStore } from '@/stores';
import type { ModelInfo } from '@/components/workflows/buildtypes';

export function useAvailableModels() {
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);

  const { data: models = [], isLoading: isLoadingModels } = useQuery<ModelInfo[]>({
    queryKey: ['available-models'],
    queryFn: async () => {
      const response = await backendApiClient.request<ModelInfo[]>('/api/models', {
        method: 'GET',
      });
      return response;
    },
  });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const preferredModel = models.find((m) => m.id === 'gpt-5.2' || m.id === 'gpt-5-mini') || models[0];
      setSelectedModel(preferredModel.id);
    }
  }, [models, selectedModel, setSelectedModel]);

  return { models, isLoadingModels };
}
