import { useMemo, createElement } from 'react';
import type { UnifiedItem, BuiltInBlock, Tool } from '@/components/workflows/buildtypes';
import type { TriggerListOption } from '@/components/workflows/build/TriggerSection';
import { TRIGGER_ICON_BY_KEY } from '@/components/workflows/triggers/constants';
import { getIntegrationTypeIcon } from '@/components/workflows/utils';

/**
 * Transform all data sources (blocks, triggers, tools) into unified items
 */
export function useUnifiedItems(
  blocks: BuiltInBlock[],
  triggerOptions: TriggerListOption[],
  tools: Tool[]
): UnifiedItem[] {
  return useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    // Add blocks
    blocks.forEach((block) => {
      items.push({
        id: `block-${block.type}`,
        type: 'block',
        label: block.label,
        description: block.description,
        icon: block.icon,
        blockType: block.type,
        builtInBlock: block,
        searchTerms: `${block.label} ${block.description}`.toLowerCase(),
      });
    });

    // Add triggers
    triggerOptions.forEach((trigger) => {
      const Icon = TRIGGER_ICON_BY_KEY[trigger.key];
      items.push({
        id: `trigger-${trigger.key}`,
        type: 'trigger',
        label: trigger.title,
        description: trigger.description || undefined,
        icon: Icon
          ? createElement(Icon, { className: 'w-4 h-4' })
          : createElement('span', { className: 'text-xs font-semibold' }, 'T'),
        triggerKey: trigger.key,
        status: trigger.status,
        badge: trigger.badge,
        actionLabel: trigger.actionLabel,
        secondaryActionLabel: trigger.secondaryActionLabel,
        disabled: trigger.disabled,
        disabledReason: trigger.disabledReason,
        onPrimaryAction: trigger.onPrimaryAction,
        onSecondaryAction: trigger.onSecondaryAction,
        isPrimaryActionLoading: trigger.isPrimaryActionLoading,
        isSecondaryActionLoading: trigger.isSecondaryActionLoading,
        searchTerms: `${trigger.title} ${trigger.description || ''}`.toLowerCase(),
      });
    });

    // Add actions (renamed from tools)
    tools.forEach((tool) => {
      const integrationType = tool.integration_type || 'other';
      items.push({
        id: `action-${tool.slug || tool.name}`,
        type: 'action',
        label: tool.name,
        description: tool.description,
        icon: getIntegrationTypeIcon(integrationType),
        tool,
        integrationType,
        searchTerms: `${tool.name} ${tool.description || ''}`.toLowerCase(),
      });
    });

    return items;
  }, [blocks, triggerOptions, tools]);
}
