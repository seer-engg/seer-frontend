/**
 * HumanInputRenderer - Displays human/user input with distinct styling
 */
import { User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageContent } from './MessageContent';
import type { TraceElement } from './trace-element-utils';

interface HumanInputRendererProps {
  element: TraceElement;
  className?: string;
}

export function HumanInputRenderer({
  element,
  className,
}: HumanInputRendererProps) {
  const content = element.content;
  const isString = typeof content === 'string';
  
  // Extract input type from metadata
  const inputType = element.metadata?.field || 'input';

  return (
    <Card className={cn('overflow-hidden bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800', className)}>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 text-green-600 dark:text-green-400">
            <User className="h-4 w-4" />
          </div>
          <Badge variant="outline" className="text-xs font-medium bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700">
            {element.label || 'User Input'}
          </Badge>
          {inputType && inputType !== 'input' && (
            <span className="text-xs text-muted-foreground font-mono">
              {inputType}
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

