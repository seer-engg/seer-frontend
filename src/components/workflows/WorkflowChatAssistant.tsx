/**
 * Workflow Chat Assistant Component
 * 
 * Intelligent AI assistant for editing workflows via chat.
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Send, Bot, User, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { Node, Edge } from '@xyflow/react';
import { WorkflowNodeData } from './WorkflowCanvas';

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
  timestamp: Date;
  model?: string; // Model used for this message
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
  edges: Edge[];
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    setInput('');
    setIsLoading(true);

    try {
      const response = await backendApiClient.request<{
        response: string;
        suggested_edits: WorkflowEdit[];
      }>(`/api/workflows/${workflowId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage.content,
          model: selectedModel,
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
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        suggestedEdits: response.suggested_edits || [],
        timestamp: new Date(),
        model: selectedModel,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyEdits = (edits: WorkflowEdit[]) => {
    if (onApplyEdits) {
      onApplyEdits(edits);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      <div className="border-b p-4 flex-shrink-0 space-y-3">
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
          <div>
            <h3 className="text-sm font-semibold">Workflow Assistant</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ask questions or request workflow edits
            </p>
          </div>
        </div>
        {/* Model Selector */}
        <div className="space-y-1.5">
          <Label htmlFor="model-selector" className="text-xs text-muted-foreground">
            Model
          </Label>
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
            disabled={isLoadingModels || isLoading}
          >
            <SelectTrigger id="model-selector" className="h-8 text-xs">
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
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.model && (
                    <p className="text-xs opacity-70 mb-1">
                      {models.find(m => m.id === message.model)?.name || message.model}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your workflow..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
