import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { UnifiedItem } from '../types';
import { CategoryBadge } from './CategoryBadge';

interface UnifiedBuildItemProps {
  item: UnifiedItem;
  onItemClick?: (item: UnifiedItem) => void;
}

export function UnifiedBuildItem({ item, onItemClick }: UnifiedBuildItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';

    if (item.type === 'block') {
      e.dataTransfer.setData(
        'application/reactflow',
        JSON.stringify({
          type: 'block',
          blockType: item.blockType,
          label: item.label,
        })
      );
    } else if (item.type === 'trigger') {
      if (item.disabled) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData(
        'application/reactflow',
        JSON.stringify({
          type: 'trigger',
          triggerKey: item.triggerKey,
          title: item.label,
        })
      );
    } else if (item.type === 'action') {
      e.dataTransfer.setData(
        'application/reactflow',
        JSON.stringify({
          type: 'tool',
          tool: {
            name: item.tool.name,
            slug: item.tool.slug,
            provider: item.tool.provider,
            integration_type: item.tool.integration_type,
            output_schema: item.tool.output_schema,
          },
        })
      );
    }
  };

  const handleClick = () => {
    if (item.type === 'trigger') {
      if (item.disabled || item.isPrimaryActionLoading) {
        return;
      }
      item.onPrimaryAction?.();
    } else {
      onItemClick?.(item);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  // Render block or action (simple card)
  if (item.type === 'block' || item.type === 'action') {
    const cardContent = (
      <Card
        draggable
        onDragStart={handleDragStart}
        className="relative cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
        onClick={handleClick}
      >
        <CategoryBadge type={item.type} />
        <CardContent className="p-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 flex-shrink-0">{item.icon}</div>
            <p className="text-sm font-medium truncate">{item.label}</p>
          </div>
        </CardContent>
      </Card>
    );

    if (item.description) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent>
            <p>{item.description}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return cardContent;
  }

  // Render trigger (full-width card with action buttons)
  const cardContent = (
    <Card
      draggable={!item.disabled}
      onDragStart={handleDragStart}
      role="button"
      tabIndex={item.disabled ? -1 : 0}
      aria-disabled={item.disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative border border-border/70 bg-background transition-colors',
        item.disabled
          ? 'opacity-80 grayscale-[20%] cursor-not-allowed'
          : 'cursor-grab active:cursor-grabbing hover:border-primary/50'
      )}
    >
      <CategoryBadge type="trigger" />
      <CardContent className="flex flex-col gap-1.5 p-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 flex-shrink-0">{item.icon}</div>
            <p className="text-sm font-medium truncate">{item.label}</p>
          </div>
          {item.badge && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] flex-shrink-0',
                item.status === 'ready'
                  ? 'border-emerald-500/30 text-emerald-600'
                  : item.status === 'action-required'
                    ? 'border-amber-500/40 text-amber-600'
                    : null
              )}
            >
              {item.badge}
            </Badge>
          )}
        </div>
        {(item.secondaryActionLabel || item.disabledReason) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {item.secondaryActionLabel && item.onSecondaryAction && (
              <Button
                size="sm"
                variant="outline"
                disabled={item.isSecondaryActionLoading}
                onClick={(event) => {
                  event.stopPropagation();
                  item.onSecondaryAction?.();
                }}
              >
                {item.secondaryActionLabel}
              </Button>
            )}
            {item.disabledReason && (
              <span className="text-xs text-muted-foreground">{item.disabledReason}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (item.description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">{item.description}</TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}
