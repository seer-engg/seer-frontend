/**
 * MessageRenderer - Main component for rendering structured messages
 * Handles different message types, content rendering, and tool call display
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { User, Bot, Settings, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeMessage, hasRenderableContent, getMessageTitle, type NormalizedMessage } from './message-utils';
import { MessageContent } from './MessageContent';
import { ToolCallView } from './ToolCallView';

interface MessageRendererProps {
  message: unknown;
  index?: number;
  className?: string;
  defaultExpanded?: boolean;
}

export function MessageRenderer({
  message,
  index,
  className,
  defaultExpanded = true,
}: MessageRendererProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const normalizedMessage = normalizeMessage(message);

  if (!hasRenderableContent(normalizedMessage)) {
    return null;
  }

  const messageType = normalizedMessage.type;
  const title = getMessageTitle(normalizedMessage);
  const hasToolCalls = normalizedMessage.tool_calls && normalizedMessage.tool_calls.length > 0;
  const hasContent = normalizedMessage.content !== undefined && 
                     normalizedMessage.content !== null && 
                     normalizedMessage.content !== '';

  // Get icon and color based on message type
  const getMessageIcon = () => {
    switch (messageType) {
      case 'human':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'tool':
        return <Wrench className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getMessageBadgeVariant = (): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (messageType) {
      case 'human':
        return 'default';
      case 'assistant':
        return 'secondary';
      case 'system':
        return 'outline';
      case 'tool':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getMessageBgColor = () => {
    switch (messageType) {
      case 'human':
        return 'bg-primary/5';
      case 'assistant':
        return 'bg-secondary/30';
      case 'system':
        return 'bg-muted/50';
      case 'tool':
        return 'bg-accent/20';
      default:
        return 'bg-muted/30';
    }
  };

  const shouldBeCollapsible = hasContent && (hasToolCalls || (typeof normalizedMessage.content === 'string' && normalizedMessage.content.length > 200));

  return (
    <Card className={cn('overflow-hidden transition-all hover:shadow-md', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger
          className={cn(
            'w-full flex items-center justify-between p-3 gap-3 transition-colors',
            getMessageBgColor(),
            shouldBeCollapsible && 'cursor-pointer hover:opacity-80',
            !shouldBeCollapsible && 'cursor-default'
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-shrink-0 text-muted-foreground">
              {getMessageIcon()}
            </div>
            <Badge variant={getMessageBadgeVariant()} className="text-xs font-medium">
              {title}
            </Badge>
            {normalizedMessage.role && normalizedMessage.role !== title.toLowerCase() && (
              <span className="text-xs text-muted-foreground font-mono truncate">
                {normalizedMessage.role}
              </span>
            )}
            {hasToolCalls && (
              <Badge variant="outline" className="text-xs">
                {normalizedMessage.tool_calls?.length} tool{normalizedMessage.tool_calls && normalizedMessage.tool_calls.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {shouldBeCollapsible && (
            <div className="flex-shrink-0 transition-transform">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="transition-all">
          <div className="p-3 space-y-3 border-t bg-background">
            {/* Message Content */}
            {hasContent && (
              <div>
                <MessageContent
                  content={normalizedMessage.content}
                  defaultView={typeof normalizedMessage.content === 'string' ? 'markdown' : 'json'}
                />
              </div>
            )}

            {/* Tool Calls */}
            {hasToolCalls && normalizedMessage.tool_calls && (
              <div>
                <ToolCallView
                  toolCalls={normalizedMessage.tool_calls}
                  toolCallNumbers={normalizedMessage.tool_calls.map((_, idx) => idx + 1)}
                  isAssistantMessage={messageType === 'assistant'}
                />
              </div>
            )}

            {/* Additional metadata */}
            {normalizedMessage.id && (
              <div className="text-xs text-muted-foreground font-mono pt-2 border-t">
                ID: {normalizedMessage.id}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

