/**
 * ThinkingRenderer - Displays thinking/internal thoughts with special styling
 */
import { useState } from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageContent } from './MessageContent';
import type { TraceElement } from './trace-element-utils';

interface ThinkingRendererProps {
  element: TraceElement;
  className?: string;
  defaultExpanded?: boolean;
}

export function ThinkingRenderer({
  element,
  className,
  defaultExpanded = true,
}: ThinkingRendererProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const content = element.content;
  const isString = typeof content === 'string';
  const isLong = isString && content.length > 200;
  const shouldBeCollapsible = isLong;

  return (
    <Card className={cn('overflow-hidden bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger
          className={cn(
            'w-full flex items-center justify-between p-3 gap-3 transition-colors hover:bg-purple-100/50 dark:hover:bg-purple-900/20',
            shouldBeCollapsible && 'cursor-pointer',
            !shouldBeCollapsible && 'cursor-default'
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-shrink-0 text-purple-600 dark:text-purple-400">
              <Brain className="h-4 w-4" />
            </div>
            <Badge variant="outline" className="text-xs font-medium bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700">
              Thinking
            </Badge>
            {element.label && element.label !== 'Thinking' && (
              <span className="text-xs text-muted-foreground truncate">
                {element.label}
              </span>
            )}
            {isString && !isExpanded && (
              <span className="text-xs text-muted-foreground truncate">
                {content.substring(0, 100)}...
              </span>
            )}
          </div>
          {shouldBeCollapsible && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="transition-all">
          <div className="p-3 space-y-2 border-t border-purple-200 dark:border-purple-800 bg-background">
            <MessageContent
              content={content}
              defaultView={isString ? 'markdown' : 'json'}
            />
            {element.metadata && Object.keys(element.metadata).length > 0 && (
              <div className="text-xs text-muted-foreground font-mono pt-2 border-t">
                {element.metadata.path && `Path: ${element.metadata.path}`}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

