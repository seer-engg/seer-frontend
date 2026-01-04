import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { TRIGGER_ICON_BY_KEY } from '@/components/workflows/triggers/constants';

export interface TriggerListOption {
  key: string;
  title: string;
  description?: string | null;
  disabledReason?: string;
  badge?: string;
  status?: 'ready' | 'action-required';
  actionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  isPrimaryActionLoading?: boolean;
  isSecondaryActionLoading?: boolean;
}

interface TriggerSectionProps {
  options: TriggerListOption[];
  isLoading?: boolean;
  emptyState?: ReactNode;
}

export function TriggerSection({ options, isLoading = false, emptyState }: TriggerSectionProps) {
  if (isLoading) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-left">Triggers</h3>
          <span className="text-xs text-muted-foreground">Loading…</span>
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!options.length) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-left">Triggers</h3>
        </div>
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {emptyState || 'No triggers available for this workspace yet.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-left">Triggers</h3>
          <p className="text-xs text-muted-foreground">Define how this workflow starts.</p>
        </div>
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const Icon = TRIGGER_ICON_BY_KEY[option.key];
          const disabled = Boolean(option.disabledReason);

          return (
            <Card
              key={option.key}
              className={cn(
                'border border-border/70 bg-background',
                disabled && 'opacity-80 grayscale-[20%]',
              )}
            >
              <CardContent className="flex flex-col gap-3 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs font-semibold">T</span>}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{option.title}</p>
                      {option.description && (
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      )}
                    </div>
                  </div>
                  {option.badge && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        option.status === 'ready'
                          ? 'border-emerald-500/30 text-emerald-600'
                          : option.status === 'action-required'
                            ? 'border-amber-500/40 text-amber-600'
                            : null,
                      )}
                    >
                      {option.badge}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={disabled || option.isPrimaryActionLoading}
                    onClick={option.onPrimaryAction}
                  >
                    {option.isPrimaryActionLoading ? 'Adding…' : option.actionLabel ?? 'Add trigger'}
                  </Button>
                  {option.secondaryActionLabel && option.onSecondaryAction && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={option.isSecondaryActionLoading}
                      onClick={option.onSecondaryAction}
                    >
                      {option.secondaryActionLabel}
                    </Button>
                  )}
                  {option.disabledReason && (
                    <span className="text-xs text-muted-foreground">{option.disabledReason}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

