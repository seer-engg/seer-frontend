/**
 * AgentTraceViewer - Message thread view for agent conversation traces
 * 
 * Displays messages in a chat-like format with AI reasoning and tool calls
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { JsonViewer } from '@textea/json-viewer';
import { extractRelevantContent } from '@/utils/json-viewer-utils';
import { format } from 'date-fns';
import { User, Bot, Code, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AgentMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string | null;
  suggested_edits?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface AgentTraceViewerProps {
  threadId: string;
  workflowId?: string | null;
  workflowName?: string | null;
  createdAt: string;
  updatedAt: string;
  title?: string | null;
  messages: AgentMessage[];
}

export function AgentTraceViewer({
  threadId,
  workflowId,
  workflowName,
  createdAt,
  updatedAt,
  title,
  messages,
}: AgentTraceViewerProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-lg font-semibold text-left">
              {title || `Thread: ${threadId.slice(0, 8)}...`}
            </h2>
            {workflowName && (
              <p className="text-sm text-muted-foreground text-left">
                Workflow: {workflowName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground text-left">
            <div>
              Created: {format(new Date(createdAt), 'MMM d, yyyy h:mm a')}
            </div>
            <div>
              Updated: {format(new Date(updatedAt), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Messages */}
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-left border rounded-md">
            No messages in this thread
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-4',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                </div>
              )}
              <Card
                className={cn(
                  'flex-1 max-w-3xl',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                )}
              >
                <CardContent className="p-4 space-y-3 text-left">
                  {/* Message Header */}
                  <div className="flex items-center gap-2 flex-wrap text-left">
                    {message.role === 'user' ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">You</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <span className="text-sm font-medium">Assistant</span>
                      </div>
                    )}
                    <span className="text-xs opacity-70">
                      {format(new Date(message.created_at), 'h:mm a')}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div
                    className={cn(
                      'text-sm whitespace-pre-wrap text-left',
                      message.role === 'user' ? 'text-primary-foreground' : ''
                    )}
                  >
                    {message.content || <span className="text-muted-foreground italic">No content</span>}
                  </div>

                  {/* AI Thinking/Reasoning */}
                  {message.role === 'assistant' && message.thinking && (
                    <div className="mt-3 pt-3 border-t">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="thinking" className="border-0">
                          <AccordionTrigger className="py-2 hover:no-underline text-sm">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="font-medium">AI Reasoning</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="rounded-md border bg-amber-50 dark:bg-amber-950/20 p-3 mt-2">
                              <pre className="text-xs whitespace-pre-wrap font-mono text-amber-900 dark:text-amber-100">
                                {message.thinking}
                              </pre>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}

                  {/* Suggested Edits */}
                  {message.role === 'assistant' && message.suggested_edits && (
                    <div className="mt-3 pt-3 border-t">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="edits" className="border-0">
                          <AccordionTrigger className="py-2 hover:no-underline text-sm">
                            <div className="flex items-center gap-2">
                              <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="font-medium">Suggested Edits</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="rounded-md border bg-card overflow-auto max-h-[400px] mt-2">
                              <div className="p-2 text-left [&>*]:text-left">
                                <JsonViewer
                                  value={extractRelevantContent(message.suggested_edits)}
                                  theme="light"
                                  displayDataTypes={false}
                                  displayObjectSize={false}
                                  style={{
                                    fontSize: '0.75rem',
                                  }}
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}

                  {/* Metadata */}
                  {message.metadata && Object.keys(message.metadata).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="metadata" className="border-0">
                          <AccordionTrigger className="py-2 hover:no-underline text-sm">
                            <div className="flex items-center gap-2">
                              <Code className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-muted-foreground">Metadata</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="rounded-md border bg-card overflow-auto max-h-[400px] mt-2">
                              <div className="p-2 text-left [&>*]:text-left">
                                <JsonViewer
                                  value={extractRelevantContent(message.metadata)}
                                  theme="light"
                                  displayDataTypes={false}
                                  displayObjectSize={false}
                                  style={{
                                    fontSize: '0.75rem',
                                  }}
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </CardContent>
              </Card>
              {message.role === 'user' && (
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

