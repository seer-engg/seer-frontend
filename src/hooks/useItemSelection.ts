import { useCallback } from 'react';
import type { UnifiedItem } from '@/components/workflows/buildtypes';

export function useItemSelection(
  onBlockSelect?: (block: { type: string; label: string; config?: Record<string, unknown> }) => void
) {
  return useCallback(
    (item: UnifiedItem) => {
      if (item.type === 'block') {
        onBlockSelect?.({ type: item.blockType, label: item.label });
      } else if (item.type === 'action') {
        onBlockSelect?.({
          type: 'tool',
          label: item.tool.name,
          config: {
            tool_name: item.tool.slug || item.tool.name,
            provider: item.tool.provider,
            integration_type: item.tool.integration_type,
            ...(item.tool.output_schema ? { output_schema: item.tool.output_schema } : {}),
            params: {},
          },
        });
      } else if (item.type === 'trigger') {
        onBlockSelect?.({
          type: 'trigger',
          label: item.label,
          config: { triggerKey: item.triggerKey },
        });
      }
    },
    [onBlockSelect]
  );
}
