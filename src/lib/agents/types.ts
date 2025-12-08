export interface AgentConfig {
  name: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  features: {
    streaming: boolean;
    toolCalls: boolean;
    thinkingSteps: boolean;
  };
  initialState?: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
  timestamp: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "pending" | "running" | "complete" | "error";
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
}

