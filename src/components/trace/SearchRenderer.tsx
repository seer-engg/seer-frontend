/**
 * SearchRenderer - Displays search queries prominently with icons and highlighting
 */
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageContent } from './MessageContent';
import type { TraceElement } from './trace-element-utils';

interface SearchRendererProps {
  element: TraceElement;
  className?: string;
}

export function SearchRenderer({
  element,
  className,
}: SearchRendererProps) {
  const content = element.content;
  const isString = typeof content === 'string';
  
  // Extract search query text for display
  const searchText = isString ? content : 
    (typeof content === 'object' && content !== null && 'query' in content)
      ? String((content as Record<string, unknown>).query)
      : 'Search Query';

  return (
    <Card className={cn('overflow-hidden bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800', className)}>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
            <Search className="h-4 w-4" />
          </div>
          <Badge variant="outline" className="text-xs font-medium bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700">
            Search Query
          </Badge>
          {element.label && element.label !== 'Search Query' && (
            <span className="text-xs text-muted-foreground truncate">
              {element.label}
            </span>
          )}
        </div>
        
        <div className="pl-6">
          <MessageContent
            content={content}
            defaultView={isString ? 'markdown' : 'json'}
          />
        </div>
        
        {element.metadata && Object.keys(element.metadata).length > 0 && (
          <div className="text-xs text-muted-foreground font-mono pt-2 border-t pl-6">
            {element.metadata.path && `Path: ${element.metadata.path}`}
            {element.metadata.field && ` • Field: ${element.metadata.field}`}
          </div>
        )}
      </div>
    </Card>
  );
}

