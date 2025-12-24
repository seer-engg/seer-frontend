/**
 * ToolCallView - Displays tool calls with structured formatting
 * Similar to Langfuse's ToolCallInvocationsView
 */
import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JsonViewer } from '@textea/json-viewer';
import type { ToolCall } from './message-utils';

interface ToolCallViewProps {
  toolCalls: ToolCall[];
  toolCallNumbers?: number[];
  className?: string;
  isAssistantMessage?: boolean;
}

export function ToolCallView({
  toolCalls,
  toolCallNumbers,
  className,
  isAssistantMessage = false,
}: ToolCallViewProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {toolCalls.map((toolCall, index) => {
        const invocationNumber = toolCallNumbers?.[index];
        
        // Parse arguments if they're a JSON string
        let parsedArguments = toolCall.arguments;
        if (typeof toolCall.arguments === 'string') {
          try {
            parsedArguments = JSON.parse(toolCall.arguments);
          } catch {
            // Keep as string if parsing fails
            parsedArguments = toolCall.arguments;
          }
        }

        return (
          <div
            key={`${toolCall.id || toolCall.name}-${index}`}
            className={cn(
              'w-full border rounded-md px-3 py-2 transition-colors',
              isAssistantMessage 
                ? 'bg-accent/50 border-accent hover:bg-accent/60' 
                : 'bg-muted/30 hover:bg-muted/40',
            )}
          >
            {/* Card header */}
            <div className="flex w-full items-center justify-between gap-2 py-1">
              {/* Left: Tool icon + number + name */}
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-mono text-xs font-medium text-foreground">
                  {invocationNumber !== undefined && (
                    <span className="mr-1 text-muted-foreground">{invocationNumber}.</span>
                  )}
                  {toolCall.name}
                </span>
              </div>

              {/* Right: Call ID if available */}
              {toolCall.id && (
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                  {toolCall.id}
                </span>
              )}
            </div>

            {/* Arguments view */}
            <div className="py-2">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                Arguments
              </div>
              <div className="rounded border bg-background/50 p-2 overflow-auto">
                <JsonViewer
                  value={parsedArguments}
                  rootName="arguments"
                  theme="auto"
                  displayDataTypes={false}
                  displayObjectSize={false}
                  style={{
                    fontSize: '0.75rem',
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

