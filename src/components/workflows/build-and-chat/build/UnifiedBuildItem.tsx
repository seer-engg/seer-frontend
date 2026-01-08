import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToolLogoUrl } from '@/lib/logo-utils';

import type { UnifiedItem } from '../types';

interface UnifiedBuildItemProps {
  item: UnifiedItem;
  onItemClick?: (item: UnifiedItem) => void;
}

function ActionIcon({ toolName }: { toolName: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getToolLogoUrl(toolName, 32);

  if (!logoUrl || imgError) {
    return <Wrench className="w-4 h-4 text-muted-foreground" />;
  }

  return (
    <img
      src={logoUrl}
      alt={`${toolName} logo`}
      className="w-4 h-4 object-contain"
      onError={() => setImgError(true)}
    />
  );
}

function getDragData(item: UnifiedItem) {
  if (item.type === 'block') {
    return { type: 'block', blockType: item.blockType, label: item.label };
  }
  if (item.type === 'trigger') {
    return { type: 'trigger', triggerKey: item.triggerKey, title: item.label };
  }
  if (item.type === 'action' && item.tool) {
    return {
      type: 'tool',
      tool: {
        name: item.tool.name,
        slug: item.tool.slug,
        provider: item.tool.provider,
        integration_type: item.tool.integration_type,
        output_schema: item.tool.output_schema,
      },
    };
  }
  return null;
}

function SimpleCard({ item, onDragStart, onClick }: {
  item: UnifiedItem;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      className="relative cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 flex-shrink-0">
            {item.type === 'action' && item.tool ? (
              <ActionIcon toolName={item.tool.name} />
            ) : (
              item.icon
            )}
          </div>
          <p className="text-sm font-medium truncate">{item.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, badge }: { status?: string; badge: string }) {
  const badgeClass = status === 'ready'
    ? 'border-emerald-500/30 text-emerald-600'
    : status === 'action-required'
      ? 'border-amber-500/40 text-amber-600'
      : '';

  return (
    <Badge variant="outline" className={cn('text-[10px] flex-shrink-0', badgeClass)}>
      {badge}
    </Badge>
  );
}

function TriggerActions({ item }: { item: UnifiedItem }) {
  if (!item.secondaryActionLabel && !item.disabledReason) {
    return null;
  }

  return (
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
  );
}

function TriggerCard({ item, onDragStart, onClick, onKeyDown }: {
  item: UnifiedItem;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <Card
      draggable={!item.disabled}
      onDragStart={onDragStart}
      role="button"
      tabIndex={item.disabled ? -1 : 0}
      aria-disabled={item.disabled}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'relative cursor-grab active:cursor-grabbing hover:bg-accent transition-colors',
        item.disabled && 'opacity-80 grayscale-[20%] cursor-not-allowed'
      )}
    >
      <CardContent className="flex flex-col gap-1.5 p-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 flex-shrink-0">{item.icon}</div>
            <p className="text-sm font-medium truncate">{item.label}</p>
          </div>
          {item.badge && <StatusBadge status={item.status} badge={item.badge} />}
        </div>
        <TriggerActions item={item} />
      </CardContent>
    </Card>
  );
}

export function UnifiedBuildItem({ item, onItemClick }: UnifiedBuildItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    if (item.type === 'trigger' && item.disabled) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    const data = getDragData(item);
    if (data) {
      e.dataTransfer.setData('application/reactflow', JSON.stringify(data));
    }
  };

  const handleClick = () => {
    if (item.type === 'trigger' && (item.disabled || item.isPrimaryActionLoading)) {
      return;
    }
    onItemClick?.(item);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const cardContent = item.type === 'block' || item.type === 'action'
    ? <SimpleCard item={item} onDragStart={handleDragStart} onClick={handleClick} />
    : <TriggerCard item={item} onDragStart={handleDragStart} onClick={handleClick} onKeyDown={handleKeyDown} />;

  if (item.description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent className={item.type === 'trigger' ? 'max-w-xs text-sm' : ''}>
          <p>{item.description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}
