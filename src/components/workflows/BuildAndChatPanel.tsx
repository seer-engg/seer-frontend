/**
 * Build & Chat Panel Component
 * 
 * Combined panel with Build section (blocks/tools) and Chat section.
 * Split view layout with resizable divider.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { 
  Search, 
  Code, 
  Sparkles, 
  GitBranch, 
  Repeat, 
  ArrowRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Clock, 
  FileText,
  Send,
  Bot,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { backendApiClient, BackendAPIError } from '@/lib/api-client';
import { Node, Edge } from '@xyflow/react';
import { WorkflowNodeData } from './WorkflowCanvas';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface Tool {
  name: string;
  description: string;
  toolkit?: string;
  slug?: string;
  provider?: string;
  integration_type?: string;
}

interface BuiltInBlock {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const BUILT_IN_BLOCKS: BuiltInBlock[] = [
  {
    type: 'llm',
    label: 'LLM',
    description: 'Invoke LLM with system prompt',
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    type: 'code',
    label: 'Code',
    description: 'Execute Python code',
    icon: <Code className="w-4 h-4" />,
  },
  {
    type: 'if_else',
    label: 'If/Else',
    description: 'Conditional logic',
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    type: 'for_loop',
    label: 'For Loop',
    description: 'Iterate over array',
    icon: <Repeat className="w-4 h-4" />,
  },
  {
    type: 'input',
    label: 'Input',
    description: 'Workflow entry point',
    icon: <ArrowRight className="w-4 h-4" />,
  },
];

interface WorkflowEdit {
  operation: string;
  block_id?: string;
  block_type?: string;
  config?: Record<string, any>;
  position?: { x: number; y: number };
  source_id?: string;
  target_id?: string;
  source_handle?: string;
  target_handle?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedEdits?: WorkflowEdit[];
  thinking?: string[];
  timestamp: Date;
  model?: string;
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

interface BuildAndChatPanelProps {
  onBlockSelect?: (block: { type: string; label: string; config?: any }) => void;
  workflowId: number | null;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  onApplyEdits?: (edits: WorkflowEdit[]) => void;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function BuildAndChatPanel({
  onBlockSelect,
  workflowId,
  nodes,
  edges,
  onApplyEdits,
  collapsed: externalCollapsed,
  onCollapseChange,
}: BuildAndChatPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    const saved = localStorage.getItem('buildChatPanelCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const setCollapsed = (value: boolean) => {
    if (externalCollapsed === undefined) {
      setInternalCollapsed(value);
      localStorage.setItem('buildChatPanelCollapsed', JSON.stringify(value));
    }
    onCollapseChange?.(value);
  };

  // Build section state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Chat section state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(new Set());
  const [sessionPopoverOpen, setSessionPopoverOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Fetch tools
  const { data: toolsData, isLoading: isLoadingTools } = useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const response = await backendApiClient.request<{ tools: Tool[] }>('/api/tools', {
        method: 'GET',
      });
      return response;
    },
  });

  const tools = toolsData?.tools || [];

  // Group tools by provider
  const toolsByProvider = tools.reduce((acc, tool) => {
    const provider = tool.provider || 'other';
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const providers = Object.keys(toolsByProvider);

  // Filter tools by search query and selected provider
  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = !selectedProvider || tool.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const filteredBlocks = BUILT_IN_BLOCKS.filter(
    (block) =>
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBlockClick = (block: BuiltInBlock | Tool, isTool: boolean) => {
    if (onBlockSelect) {
      if (isTool) {
        const tool = block as Tool;
        onBlockSelect({
          type: 'tool',
          label: tool.name,
          config: {
            tool_name: tool.slug || tool.name,
            provider: tool.provider,
            integration_type: tool.integration_type,
            params: {},
          },
        });
      } else {
        const builtInBlock = block as BuiltInBlock;
        onBlockSelect({
          type: builtInBlock.type,
          label: builtInBlock.label,
        });
      }
    }
  };

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

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.max(80, Math.min(scrollHeight, 300))}px`;
    }
  }, [input]);

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

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
            edges: edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
            })),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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

  const filterSystemPrompt = (content: string): string => {
    const systemPromptPattern = /I help you build, inspect, edit.*?Concretely I can:/s;
    let filtered = content.replace(systemPromptPattern, '').trim();
    filtered = filtered.replace(/What I can do \(high level\).*?$/s, '').trim();
    filtered = filtered.replace(/Your capabilities:.*?$/s, '').trim();
    return filtered;
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full flex flex-col items-start py-2 px-2 border-l">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          title="Expand Build & Chat"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border-l w-full">
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Build Section */}
        <ResizablePanel defaultSize={50} minSize={0} collapsible>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Blocks */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-left">Blocks</h3>
                <div className="grid grid-cols-2 gap-2">
                  {filteredBlocks.map((block) => (
                    <Tooltip key={block.type}>
                      <TooltipTrigger asChild>
                        <Card
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleBlockClick(block, false)}
                        >
                          <CardContent className="p-2">
                            <div className="flex items-center gap-2">
                              {block.icon}
                              <p className="text-sm font-medium">{block.label}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{block.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* Integration Tools */}
              {isLoadingTools ? (
                <div className="text-sm text-muted-foreground">Loading tools...</div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-left">Tools</h3>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {Object.entries(toolsByProvider).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(toolsByProvider).map(([provider, providerTools]) => {
                        const filteredProviderTools = providerTools.filter((tool) => {
                          const matchesSearch =
                            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesProvider = !selectedProvider || tool.provider === selectedProvider;
                          return matchesSearch && matchesProvider;
                        });

                        if (filteredProviderTools.length === 0) return null;

                        return (
                          <div key={provider}>
                            <h4 className="text-xs font-semibold mb-2 capitalize text-muted-foreground text-left">
                              {provider}
                            </h4>
                            <Table>
                              <TableBody>
                                {filteredProviderTools.map((tool) => (
                                  <Tooltip key={tool.slug || tool.name}>
                                    <TooltipTrigger asChild>
                                      <TableRow
                                        className="cursor-pointer"
                                        onClick={() => handleBlockClick(tool, true)}
                                      >
                                        <TableCell className="p-2 text-left">
                                          <p className="text-sm font-medium">{tool.name}</p>
                                        </TableCell>
                                      </TableRow>
                                    </TooltipTrigger>
                                    {tool.description && (
                                      <TooltipContent>
                                        <p>{tool.description}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })}
                      {filteredTools.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No tools found
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No tools available
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Chat Section */}
        <ResizablePanel defaultSize={50} minSize={0} collapsible>
          {!workflowId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">Save a workflow to start chatting</p>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-background">
              {/* Chat Header */}
              <div className="p-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Chat</h3>
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
              <ScrollArea className="flex-1 p-4">
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
                        <div key={index} className="flex gap-3 justify-start">
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
                              <p className="text-sm whitespace-pre-wrap text-left">
                                {filteredContent || message.content}
                              </p>
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
                                            {' '}({edit.block_type})
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
              <div className="p-4 flex-shrink-0 flex flex-col gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about your workflow..."
                  disabled={isLoading}
                  className="min-h-[80px] resize-none w-full bg-white overflow-hidden"
                  style={{ maxHeight: '300px' }}
                />
                <div className="flex items-center justify-end gap-2">
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    disabled={isLoadingModels || isLoading}
                  >
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue placeholder={isLoadingModels ? "Loading..." : "Select model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {models
                        .filter((m) => m.available)
                        .map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

