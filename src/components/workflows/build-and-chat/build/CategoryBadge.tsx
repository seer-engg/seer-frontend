import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { ItemType } from '../types';

interface CategoryBadgeProps {
  type: ItemType;
}

const categoryStyles: Record<ItemType, string> = {
  block: 'bg-primary/10 text-primary dark:text-primary border-primary/20',
  trigger: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  action: 'bg-seer/10 text-seer dark:text-seer border-seer/20',
};

const categoryLabels: Record<ItemType, string> = {
  block: 'Block',
  trigger: 'Trigger',
  action: 'Action',
};

export function CategoryBadge({ type }: CategoryBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'h-3.5 px-1 text-[8px] absolute top-0.5 right-0.5',
        categoryStyles[type]
      )}
    >
      {categoryLabels[type]}
    </Badge>
  );
}
