/**
 * Workflow Chat Assistant Component
 * 
 * Intelligent AI assistant for editing workflows via chat.
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Send, Bot, User, Check, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MessageSquare, Plus, Clock, FileText } from 'lucide-react';
import { backendApiClient, BackendAPIError } from '@/lib/api-client';
import { Node } from '@xyflow/react';
import { WorkflowNodeData, WorkflowEdge } from './types';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface WorkflowEdit {
  operation: string;
  block_id?: string;
  block_type?: string;
  config?: Record<string, any>;
  position?: { x: number; y: number };
  source_id?: string;
  target_id?: string;
  branch?: 'true' | 'false';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedEdits?: WorkflowEdit[];
  thinking?: string[];
  timestamp: Date;
  model?: string; // Model used for this message
  interruptRequired?: boolean;
  interruptData?: Record<string, any>;
}

interface ChatSession {
  id: number;
  workflow_id: number;
  user_id?: string;
  thread_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

interface ModelInfo {
  id: string;
  provider: 'openai' | 'anthropic';
  name: string;
  available: boolean;
}

interface WorkflowChatAssistantProps {
  workflowId: number | null;
  nodes: Node<WorkflowNodeData>[];
  edges: WorkflowEdge[];
  onApplyEdits?: (edits: WorkflowEdit[]) => void;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function WorkflowChatAssistant({
  workflowId,
  nodes,
  edges,
  onApplyEdits,
  collapsed: externalCollapsed,
  onCollapseChange,
}: WorkflowChatAssistantProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    const saved = localStorage.getItem('workflowChatCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  
  const setCollapsed = (value: boolean) => {
    if (externalCollapsed === undefined) {
      setInternalCollapsed(value);
      localStorage.setItem('workflowChatCollapsed', JSON.stringify(value));
    }
    onCollapseChange?.(value);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(new Set());
  const [sessionPopoverOpen, setSessionPopoverOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch available models
  const { data: models = [], isLoading: isLoadingModels } = useQuery<ModelInfo[]>({
    queryKey: ['available-models'],
    queryFn: async () => {
      const response = await backendApiClient.request<ModelInfo[]>('/api/models', {
        method: 'GET',
      });
      return response;
    },
  });

  // Set default model when models are loaded
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      // Prefer GPT-5.2 or GPT-5-mini, fallback to first available
      const preferredModel = models.find(m => m.id === 'gpt-5.2' || m.id === 'gpt-5-mini') || models[0];
      setSelectedModel(preferredModel.id);
    }
  }, [models, selectedModel]);

  // Fetch chat sessions with pagination
  const {
    data: sessionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    error,
  } = useInfiniteQuery<ChatSession[]>({
    queryKey: ['chat-sessions', workflowId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!workflowId) return [];
      const response = await backendApiClient.request<ChatSession[]>(
        `/api/workflows/${workflowId}/chat/sessions?offset=${pageParam}&limit=50`,
        { method: 'GET' }
      );
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      // If last page has fewer than 50 items, we've reached the end
      if (lastPage.length < 50) {
        return undefined;
      }
      // Otherwise, return the next offset
      return lastPageParam + 50;
    },
    enabled: !!workflowId,
  });

  // Flatten pages array to get all sessions
  const sessions = sessionsData?.pages.flatMap(page => page) ?? [];

  // Log errors for debugging
  useEffect(() => {
    if (isError && error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, [isError, error]);

  // Load session messages when session changes
  const { data: sessionMessages } = useQuery<ChatMessage[]>({
    queryKey: ['chat-session-messages', currentSessionId],
    queryFn: async () => {
      if (!workflowId || !currentSessionId) return [];
      const response = await backendApiClient.request<{
        id: number;
        messages: Array<{
          id: number;
          role: string;
          content: string;
          thinking?: string;
          suggested_edits?: WorkflowEdit[];
          created_at: string;
        }>;
      }>(`/api/workflows/${workflowId}/chat/sessions/${currentSessionId}`, {
        method: 'GET',
      });
      return response.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        thinking: msg.thinking ? msg.thinking.split('\n') : undefined,
        suggestedEdits: msg.suggested_edits,
        timestamp: new Date(msg.created_at),
      }));
    },
    enabled: !!currentSessionId && !!workflowId,
  });

  // Update messages when session messages load
  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !workflowId || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      model: selectedModel,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageContent = input.trim();
    setInput('');
    setIsLoading(true);

    // Add timeout to prevent indefinite hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      const response = await backendApiClient.request<{
        response: string;
        suggested_edits: WorkflowEdit[];
        session_id?: number;
        thread_id?: string;
        thinking?: string[];
        interrupt_required?: boolean;
        interrupt_data?: Record<string, any>;
      }>(`/api/workflows/${workflowId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: messageContent,
          model: selectedModel,
          session_id: currentSessionId || undefined,
          thread_id: currentThreadId || undefined,
          resume_thread: true,
          workflow_state: {
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              data: n.data,
              position: n.position,
            })),
            edges: edges.map((e) => {
              const branch = e.data?.branch;
              return {
                id: e.id,
                source: e.source,
                target: e.target,
                ...(branch ? { data: { branch } } : {}),
              };
            }),
          },
        }),
        signal: controller.signal, // Add abort signal
      });
      
      clearTimeout(timeoutId);

      // Update session/thread IDs if returned
      if (response.session_id && response.session_id !== currentSessionId) {
        setCurrentSessionId(response.session_id);
      }
      if (response.thread_id && response.thread_id !== currentThreadId) {
        setCurrentThreadId(response.thread_id);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        suggestedEdits: response.suggested_edits || [],
        thinking: response.thinking,
        interruptRequired: response.interrupt_required,
        interruptData: response.interrupt_data,
        timestamp: new Date(),
        model: selectedModel,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Refresh sessions list
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', workflowId] });
    } catch (error) {
      clearTimeout(timeoutId);
      
      console.error('Failed to send chat message:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        status: error instanceof BackendAPIError ? error.status : undefined,
        response: error instanceof BackendAPIError ? error.response : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      
      const isTimeout = 
        (error instanceof Error && error.name === 'AbortError') ||
        (error instanceof BackendAPIError && error.status === 504);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: isTimeout
          ? 'Request timed out. Please try again with a shorter message.'
          : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = async () => {
    if (!workflowId) return;
    try {
      const response = await backendApiClient.request<ChatSession>(
        `/api/workflows/${workflowId}/chat/sessions`,
        {
          method: 'POST',
          body: JSON.stringify({ title: null }),
        }
      );
      setCurrentSessionId(response.id);
      setCurrentThreadId(response.thread_id);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', workflowId] });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSelectSession = (sessionId: number) => {
    setCurrentSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentThreadId(session.thread_id);
    }
    setSessionPopoverOpen(false);
  };

  const toggleThinking = (messageIndex: number) => {
    setExpandedThinking((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
  };

  const handleApplyEdits = (edits: WorkflowEdit[]) => {
    if (onApplyEdits) {
      onApplyEdits(edits);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filter out system prompt content from messages
  const filterSystemPrompt = (content: string): string => {
    // Remove long system descriptions
    const systemPromptPattern = /I help you build, inspect, edit.*?Concretely I can:/s;
    let filtered = content.replace(systemPromptPattern, '').trim();
    
    // Remove any remaining system prompt patterns
    filtered = filtered.replace(/What I can do \(high level\).*?$/s, '').trim();
    filtered = filtered.replace(/Your capabilities:.*?$/s, '').trim();
    
    return filtered;
  };

  if (!workflowId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Save a workflow to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background w-full">
      {/* Header */}
      <div className="border-b p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="h-6 w-6"
              title="Collapse chat"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-sm font-semibold">Workflow Assistant</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              title="New session"
              onClick={handleNewSession}
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Popover open={sessionPopoverOpen} onOpenChange={setSessionPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Select session">
                  <Clock className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-2">
                  <div className="text-xs font-medium px-2 py-1.5 text-muted-foreground">
                    Select Session
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {isPending ? (
                      <div className="text-xs text-muted-foreground px-2 py-1.5">
                        Loading sessions...
                      </div>
                    ) : isError ? (
                      <div className="text-xs text-destructive px-2 py-1.5">
                        Error loading sessions
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="text-xs text-muted-foreground px-2 py-1.5">
                        No sessions available
                      </div>
                    ) : (
                      <>
                        {sessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => {
                              handleSelectSession(session.id);
                            }}
                            className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent ${
                              currentSessionId === session.id ? 'bg-accent' : ''
                            }`}
                          >
                            {session.title || `Session ${session.id}`}
                          </button>
                        ))}
                        {hasNextPage && (
                          <button
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                            className="w-full text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isFetchingNextPage ? 'Loading...' : 'Load More'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Start a conversation about your workflow</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const filteredContent = filterSystemPrompt(message.content);
              if (!filteredContent && message.role === 'assistant') return null;
              
              return (
                <div
                  key={index}
                  className="flex gap-3 justify-start"
                >
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground mt-1">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 max-w-[85%]">
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap text-left">{filteredContent || message.content}</p>
                      {message.thinking && message.thinking.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <button
                            onClick={() => toggleThinking(index)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {expandedThinking.has(index) ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                            <span>Thinking ({message.thinking.length} steps)</span>
                          </button>
                          {expandedThinking.has(index) && (
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground bg-background/50 p-2 rounded text-left">
                              {message.thinking.map((step, idx) => (
                                <div key={idx} className="font-mono">
                                  {step}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {message.interruptRequired && (
                        <div className="mt-3 pt-3 border-t border-yellow-500/50 bg-yellow-500/10 p-3 rounded">
                          {message.interruptData?.type === 'clarification' ? (
                            // Clarification question UI
                            <ClarificationQuestion
                              question={message.interruptData.question || 'I need more information to help you.'}
                              context={message.interruptData.context}
                              workflowId={workflowId}
                              threadId={currentThreadId}
                              onResume={() => {
                                // Remove interrupt flag after resuming
                                setMessages((prev) =>
                                  prev.map((msg, idx) =>
                                    idx === index
                                      ? { ...msg, interruptRequired: false, interruptData: undefined }
                                      : msg
                                  )
                                );
                              }}
                            />
                          ) : (
                            // Default interrupt UI (for tool approvals, etc.)
                            <>
                              <p className="text-xs font-medium mb-2 text-yellow-700 dark:text-yellow-400">
                                Human input required
                              </p>
                              <p className="text-xs text-muted-foreground mb-3">
                                {message.interruptData?.message || 'Please approve, edit, or reject this action.'}
                              </p>
                              <div className="flex gap-2">
                                <Button size="sm" variant="default" className="text-xs">
                                  <Check className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                  Edit
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs">
                                  <X className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {message.suggestedEdits && message.suggestedEdits.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-medium mb-2">Suggested edits:</p>
                          <div className="space-y-2">
                            {message.suggestedEdits.map((edit, editIndex) => (
                              <div
                                key={editIndex}
                                className="text-xs bg-background/50 p-2 rounded"
                              >
                                <span className="font-medium">{edit.operation}</span>
                                {edit.block_type && (
                                  <span className="text-muted-foreground">
                                    {' '}
                                    ({edit.block_type})
                                  </span>
                                )}
                              </div>
                            ))}
                            <Button
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => handleApplyEdits(message.suggestedEdits!)}
                            >
                              <Check className="w-3 h-3 mr-2" />
                              Apply Edits
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-muted-foreground mt-1">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 max-w-[85%]">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="space-y-2">
          {/* Model Selector */}
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
            disabled={isLoadingModels || isLoading}
          >
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select model"} />
            </SelectTrigger>
            <SelectContent>
              {models
                .filter((m) => m.available)
                .map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {model.provider === 'openai' ? 'OpenAI' : 'Anthropic'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {/* Textarea Input */}
          <div className="relative flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about your workflow..."
              disabled={isLoading}
              className="min-h-[52px] max-h-[200px] resize-none pr-12 flex-1"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Clarification Question Component
function ClarificationQuestion({
  question,
  context,
  workflowId,
  threadId,
  onResume,
}: {
  question: string;
  context?: string;
  workflowId: number | null;
  threadId: string | null;
  onResume: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim() || !workflowId || !threadId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await backendApiClient.request(
        `/api/workflows/${workflowId}/chat/resume`,
        {
          method: 'POST',
          body: JSON.stringify({
            thread_id: threadId,
            command: {
              resume: {
                answer: answer.trim(),
              },
            },
          }),
        }
      );

      // Add user's answer as a message
      // Note: The backend will handle the actual resume and return the agent's response
      onResume();
    } catch (error) {
      console.error('Failed to submit clarification answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium mb-1 text-blue-700 dark:text-blue-400">
          Question
        </p>
        <p className="text-sm text-foreground">{question}</p>
        {context && (
          <p className="text-xs text-muted-foreground mt-1">{context}</p>
        )}
      </div>
      <div className="space-y-2">
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={isSubmitting}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!answer.trim() || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      </div>
    </div>
  );
}
