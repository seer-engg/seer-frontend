/**
 * LangGraph SDK Client for streaming agent interactions
 * Replaces LangServe SSE implementation with native LangGraph SDK
 */
import { Client } from "@langchain/langgraph-sdk";

// Configuration - can be overridden via environment variables
// Default ports: supervisor=8000, eval_agent=8002, codex=8003 (as per run.py)
const DEFAULT_LANGGRAPH_API_URL = import.meta.env.VITE_LANGGRAPH_API_URL || "http://localhost:8000";
const EVAL_AGENT_ID = "eval_agent";
const SUPERVISOR_AGENT_ID = "supervisor";
const CODEX_AGENT_ID = "codex";

// Create a client instance for a specific URL
export function createLangGraphClient(apiUrl: string): Client {
  return new Client({ apiUrl });
}

// Default client (for backward compatibility)
export const langgraphClient = createLangGraphClient(DEFAULT_LANGGRAPH_API_URL);

export interface StreamEvent {
  event: string;
  data: unknown;
}

export interface ThinkingStep {
  type: "tool_call" | "tool_result" | "thinking";
  toolName: string;
  data: unknown;
  status: "pending" | "running" | "complete" | "error";
  timestamp: Date;
}

/**
 * Generic function to stream messages to any LangGraph agent
 */
export async function* streamAgent(
  apiUrl: string,
  agentId: string,
  input: string,
  threadId: string,
  initialState?: Record<string, unknown>
): AsyncGenerator<StreamEvent, void, unknown> {
  const client = createLangGraphClient(apiUrl);
  
  const inputData = {
    messages: [
      {
        role: "user" as const,
        content: input,
      },
    ],
    ...initialState,
  };

  const stream = client.runs.stream(
    threadId,
    agentId,
    {
      input: inputData,
      streamMode: "events" as const, // Use "events" to get real-time streaming content
    }
  );

  for await (const chunk of stream) {
    yield {
      event: chunk.event || "data",
      data: chunk.data,
    };
  }
}

/**
 * Stream a message to the eval agent using LangGraph SDK
 */
export async function* streamEvalAgent(
  input: string,
  threadId: string,
  initialState?: Record<string, unknown>
): AsyncGenerator<StreamEvent, void, unknown> {
  const apiUrl = import.meta.env.VITE_EVAL_AGENT_URL || "http://localhost:8002";
  yield* streamAgent(apiUrl, EVAL_AGENT_ID, input, threadId, {
    todos: [],
    tool_call_counts: { _total: 0 },
    ...initialState,
  });
}

/**
 * Stream a message to the codex agent using LangGraph SDK
 */
export async function* streamCodexAgent(
  input: string,
  threadId: string,
  initialState?: Record<string, unknown>
): AsyncGenerator<StreamEvent, void, unknown> {
  const inputData = {
    messages: [
      {
        role: "user" as const,
        content: input,
      },
    ],
    ...initialState,
  };

  const stream = langgraphClient.runs.stream(
    threadId,
    CODEX_AGENT_ID,
    {
      input: inputData,
      streamMode: "updates" as const,
    }
  );

  for await (const chunk of stream) {
    yield {
      event: chunk.event || "data",
      data: chunk.data,
    };
  }
}

/**
 * Create a new thread for conversation persistence
 */
export async function createThread(apiUrl?: string): Promise<string> {
  const client = apiUrl ? createLangGraphClient(apiUrl) : langgraphClient;
  const thread = await client.threads.create();
  return thread.thread_id;
}

/**
 * Flatten nested node updates and merge into cumulative state
 * Handles structures like {nodeName: {messages: [...]}} or {nodeName: {state: {...}}}
 * Merges updates into existing cumulative state, avoiding duplicate messages
 */
export function flattenNodeUpdates(
  cumulativeState: Record<string, unknown>,
  update: Record<string, unknown>
): Record<string, unknown> {
  let newState = { ...cumulativeState };

  for (const key in update) {
    if (Object.prototype.hasOwnProperty.call(update, key)) {
      const value = update[key];
      if (key === "messages" && Array.isArray(value)) {
        // Merge messages by ID to avoid duplicates
        const existingMessages = (newState.messages || []) as any[];
        const newMessages = value as any[];
        const mergedMessages = [...existingMessages];

        for (const newMessage of newMessages) {
          const existingIndex = mergedMessages.findIndex(m => m.id === newMessage.id);
          if (existingIndex !== -1) {
            // Update existing message
            mergedMessages[existingIndex] = { ...mergedMessages[existingIndex], ...newMessage };
          } else {
            // Add new message
            mergedMessages.push(newMessage);
          }
        }
        newState.messages = mergedMessages;
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // If it's a nested object (like a node update), merge its contents
        newState[key] = { ...(newState[key] as Record<string, unknown> || {}), ...value };
        // Also check for messages within nested objects
        if ((value as Record<string, unknown>).messages && Array.isArray((value as Record<string, unknown>).messages)) {
          const existingMessages = (newState.messages || []) as any[];
          const newMessages = (value as Record<string, unknown>).messages as any[];
          const mergedMessages = [...existingMessages];

          for (const newMessage of newMessages) {
            const existingIndex = mergedMessages.findIndex(m => m.id === newMessage.id);
            if (existingIndex !== -1) {
              mergedMessages[existingIndex] = { ...mergedMessages[existingIndex], ...newMessage };
            } else {
              mergedMessages.push(newMessage);
            }
          }
          newState.messages = mergedMessages;
        }
      } else {
        newState[key] = value;
      }
    }
  }
  return newState;
}

/**
 * Extract content from LangGraph state updates
 * Handles both flat state and nested node updates
 */
export function extractContentFromState(state: Record<string, unknown>): string {
  // Check if this is a nested node update structure (e.g., {nodeName: {messages: [...]}})
  const hasNodeStructure = Object.keys(state).some(key => {
    const value = state[key];
    return value && typeof value === "object" && !Array.isArray(value) && 
           (value as Record<string, unknown>).messages !== undefined;
  });
  
  let stateToCheck = state;
  if (hasNodeStructure) {
    // Flatten nested node updates (using empty object as base since we're just flattening, not merging)
    stateToCheck = flattenNodeUpdates({}, state);
  }
  
  // Check for messages array
  if (stateToCheck.messages && Array.isArray(stateToCheck.messages)) {
    const lastAI = [...stateToCheck.messages].reverse().find(
      (m: { type?: string; role?: string; _getType?: () => string }) => {
        const type = m.type || m.role || m._getType?.();
        return type === "ai" || type === "assistant";
      }
    );
    if (lastAI) {
      const content = (lastAI as { content?: unknown }).content;
      if (typeof content === "string" && content.trim()) {
        return content;
      }
      // Handle array content (multimodal)
      if (Array.isArray(content)) {
        const textContent = content.find((c: { type?: string }) => c.type === "text");
        if (textContent?.text) {
          return textContent.text;
        }
      }
    }
  }

  // Check for direct content field
  if (typeof stateToCheck.content === "string" && stateToCheck.content.trim()) {
    return stateToCheck.content;
  }

  return "";
}

/**
 * Extract thinking steps from LangGraph state updates
 * Handles tool calls and thinking tool output
 * Supports both flat state and nested node updates
 */
export function extractThinkingSteps(
  state: Record<string, unknown>,
  previousSteps: ThinkingStep[] = []
): ThinkingStep[] {
  const steps: ThinkingStep[] = [...previousSteps];

  // Check if this is a nested node update structure
  const hasNodeStructure = Object.keys(state).some(key => {
    const value = state[key];
    return value && typeof value === "object" && !Array.isArray(value) && 
           (value as Record<string, unknown>).messages !== undefined;
  });
  
  let stateToCheck = state;
  if (hasNodeStructure) {
    // Flatten nested node updates (using empty object as base since we're just flattening, not merging)
    stateToCheck = flattenNodeUpdates({}, state);
  }

  // Check for tool calls in messages
  if (stateToCheck.messages && Array.isArray(stateToCheck.messages)) {
    for (const message of stateToCheck.messages) {
      // Check for tool calls
      if ((message as { tool_calls?: unknown[] }).tool_calls) {
        const toolCalls = (message as { tool_calls: Array<{ name?: string; args?: unknown }> }).tool_calls;
        for (const toolCall of toolCalls) {
          const toolName = toolCall.name || "unknown_tool";
          // Check if we already have a running step for this tool
          const existingIndex = steps.findIndex(
            (s) => s.toolName === toolName && s.status === "running"
          );
          if (existingIndex === -1) {
            steps.push({
              type: toolName === "think" ? "thinking" : "tool_call",
              toolName,
              data: toolCall.args || {},
              status: "running",
              timestamp: new Date(),
            });
          }
        }
      }

      // Check for tool results (ToolMessage)
      const msgType = (message as { type?: string; _getType?: () => string }).type ||
        (message as { _getType?: () => string })._getType?.();
      if (msgType === "tool" || msgType === "tool_use") {
        const toolResult = message as { name?: string; content?: unknown };
        const toolName = toolResult.name || "unknown_tool";
        let content = toolResult.content;
        
        // For think tool, extract scratchpad content from the return value
        if (toolName === "think" && typeof content === "string") {
          // The think tool returns formatted text like "Thought: <scratchpad>\nLast tool: <last_tool>"
          // Extract the scratchpad part
          const thoughtMatch = content.match(/Thought:\s*(.+?)(?:\n|$)/s);
          if (thoughtMatch) {
            content = thoughtMatch[1].trim();
          }
        }
        
        // Update existing step or create new one
        const existingIndex = steps.findIndex(
          (s) => s.toolName === toolName && s.status === "running"
        );
        if (existingIndex >= 0) {
          steps[existingIndex] = {
            ...steps[existingIndex],
            type: toolName === "think" ? "thinking" : "tool_result",
            data: content || {},
            status: "complete",
          };
        } else {
          steps.push({
            type: toolName === "think" ? "thinking" : "tool_result",
            toolName,
            data: content || {},
            status: "complete",
            timestamp: new Date(),
          });
        }
      }
    }
  }

  // Check for thinking output in state (if thinking tool stores output directly)
  if (stateToCheck.thinking && typeof stateToCheck.thinking === "string") {
    const existingThinkingIndex = steps.findIndex(
      (s) => s.toolName === "think" && s.status === "running"
    );
    if (existingThinkingIndex >= 0) {
      steps[existingThinkingIndex] = {
        ...steps[existingThinkingIndex],
        data: stateToCheck.thinking,
        status: "complete",
      };
    } else {
      steps.push({
        type: "thinking",
        toolName: "think",
        data: stateToCheck.thinking,
        status: "complete",
        timestamp: new Date(),
      });
    }
  }

  return steps;
}

