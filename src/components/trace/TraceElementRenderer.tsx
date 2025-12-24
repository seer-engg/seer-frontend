/**
 * TraceElementRenderer - Main orchestrator component that routes to appropriate renderers
 */
import { ThinkingRenderer } from './ThinkingRenderer';
import { SearchRenderer } from './SearchRenderer';
import { HumanInputRenderer } from './HumanInputRenderer';
import { ToolCallView } from './ToolCallView';
import { MessageRenderer } from './MessageRenderer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TraceElement } from './trace-element-utils';
import { parseToolCalls } from './message-utils';

interface TraceElementRendererProps {
  element: TraceElement;
  className?: string;
  defaultExpanded?: boolean;
}

export function TraceElementRenderer({
  element,
  className,
  defaultExpanded = true,
}: TraceElementRendererProps) {
  switch (element.type) {
    case 'thinking':
      return (
        <ThinkingRenderer
          element={element}
          className={className}
          defaultExpanded={defaultExpanded}
        />
      );

    case 'search':
      return (
        <SearchRenderer
          element={element}
          className={className}
        />
      );

    case 'human_input':
      return (
        <HumanInputRenderer
          element={element}
          className={className}
        />
      );

    case 'tool_call':
      // Convert TraceElement to tool call format
      const toolCallContent = element.content as Record<string, unknown>;
      const toolCalls = parseToolCalls(toolCallContent);
      
      if (toolCalls.length > 0) {
        return (
          <Card className={cn('overflow-hidden', className)}>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {element.label || 'Tool Call'}
                </Badge>
                {element.metadata?.path && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {element.metadata.path}
                  </span>
                )}
              </div>
              <ToolCallView
                toolCalls={toolCalls}
                isAssistantMessage={false}
              />
            </div>
          </Card>
        );
      }
      
      // Fallback: render as structured content
      return (
        <Card className={cn('overflow-hidden', className)}>
          <div className="p-3 space-y-2">
            <Badge variant="outline" className="text-xs font-medium">
              {element.label || 'Tool Call'}
            </Badge>
            <div className="pl-2">
              <MessageRenderer
                message={element.content}
                defaultExpanded={defaultExpanded}
              />
            </div>
          </div>
        </Card>
      );

    case 'message':
      return (
        <MessageRenderer
          message={element.content}
          className={className}
          defaultExpanded={defaultExpanded}
        />
      );

    case 'other':
    default:
      // Fallback renderer for unknown types
      return (
        <Card className={cn('overflow-hidden', className)}>
          <div className="p-3 space-y-2">
            <Badge variant="outline" className="text-xs font-medium">
              {element.label || 'Element'}
            </Badge>
            <div className="pl-2">
              <MessageRenderer
                message={element.content}
                defaultExpanded={defaultExpanded}
              />
            </div>
            {element.metadata && Object.keys(element.metadata).length > 0 && (
              <div className="text-xs text-muted-foreground font-mono pt-2 border-t">
                {element.metadata.path && `Path: ${element.metadata.path}`}
              </div>
            )}
          </div>
        </Card>
      );
  }
}

