import { useEffect, useMemo } from 'react';
import { useToolsStore } from '@/stores';
import type { Tool } from '@/components/workflows/buildtypes';
import type { JsonObject } from '@/types/workflow-spec';

export function useWorkflowTools() {
  const rawTools = useToolsStore((state) => state.tools);
  const toolsLoading = useToolsStore((state) => state.toolsLoading);
  const toolsLoaded = useToolsStore((state) => state.toolsLoaded);
  const refreshIntegrationTools = useToolsStore((state) => state.refreshIntegrationTools);

  useEffect(() => {
    if (!toolsLoaded && !toolsLoading) {
      void refreshIntegrationTools();
    }
  }, [toolsLoaded, toolsLoading, refreshIntegrationTools]);

  const tools: Tool[] = useMemo(
    () =>
      rawTools.map((t) => ({
        name: t.name,
        description: t.description,
        provider: t.provider ?? undefined,
        integration_type: (t.integration_type as string | undefined) ?? undefined,
        output_schema: (t.output_schema as JsonObject | null) ?? null,
      })),
    [rawTools],
  );

  const isLoadingTools = toolsLoading || !toolsLoaded;

  return { tools, isLoadingTools };
}
