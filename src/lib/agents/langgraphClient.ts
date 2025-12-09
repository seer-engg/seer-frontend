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
  runId?: string; // Unique identifier for this tool invocation
}

export interface ThinkingPhase {
  id: string;
  steps: ThinkingStep[];
  isActive: boolean;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Extract thinking steps directly from LangGraph SDK stream events
 * This is the correct approach when using streamMode: "events"
 */
export function extractThinkingStepsFromEvents(
  event: StreamEvent,
  previousSteps: ThinkingStep[] = []
): ThinkingStep[] {
  const steps = [...previousSteps];
  const eventData = event.data as Record<string, unknown> | null;
  
  if (!eventData) return steps;
  
  // Handle events stream mode
  if (event.event === "events" && typeof eventData === "object" && eventData !== null) {
    const eventType = eventData.event as string;
    const data = eventData.data as Record<string, unknown> | undefined;
    const metadata = (eventData.metadata as Record<string, unknown>) || {};
    
    // Helper to extract tool name from various event formats
    const extractToolName = (data: Record<string, unknown> | undefined): string => {
      if (!data) return "unknown_tool";
      
      // Try different field names (LangGraph SDK uses 'name' field)
      const name = (data.name as string) || 
                   (data.tool_name as string) ||
                   (data.tool as string) ||
                   (data.function as string);
      
      if (name && typeof name === "string" && name.trim()) {
        const trimmedName = name.trim().toLowerCase();
        // Normalize "think" tool name variations
        if (trimmedName === "think" || trimmedName.includes("think")) {
          return "think";
        }
        return trimmedName;
      }
      
      // Check input for thinking-like content (on_tool_start has input, on_tool_end has output)
      const input = data.input as Record<string, unknown> | undefined;
      if (input && typeof input === "object") {
        // Check if input contains scratchpad field (think tool signature)
        if ("scratchpad" in input || "last_tool_call" in input) {
          return "think";
        }
        // Check if input is a string containing thinking keywords
        if (typeof input === "string" && (input.includes("scratchpad") || input.includes("Thought:"))) {
          return "think";
        }
      }
      
      // Check output contains thinking-like content (for on_tool_end events)
      const output = data.output || data.result || data.content;
      if (output && typeof output === "string") {
        if (output.includes("Thought:") || output.includes("scratchpad") || output.includes("Last tool:")) {
          return "think";
        }
      }
      
      // Last resort: if we have no name but have input/output, check if it looks like think tool
      if (input || output) {
        const combined = JSON.stringify({ input, output }).toLowerCase();
        if (combined.includes("scratchpad") || combined.includes("thought:") || combined.includes("last tool")) {
          return "think";
        }
      }
      
      return "unknown_tool";
    };
    
    // Helper to extract tool output content
    const extractToolOutput = (data: Record<string, unknown> | undefined): unknown => {
      if (!data) return {};
      
      // Try different output field names
      let content = data.output || data.result || data.content || data.data || {};
      
      // Parse thinking tool output to extract just the scratchpad
      if (typeof content === "string" && (content.includes("Thought:") || content.includes("scratchpad"))) {
        // The think tool returns formatted text like "Thought: <scratchpad>\nLast tool: <last_tool>"
        // Extract the scratchpad part
        const thoughtMatch = content.match(/Thought:\s*(.+?)(?:\n|$)/s);
        if (thoughtMatch) {
          return thoughtMatch[1].trim();
        }
      }
      
      return content;
    };
    
    // Handle on_tool_start event - tool call initiated
    if (eventType === "on_tool_start") {
      let toolName = extractToolName(data);
      const toolInput = data?.input || {};
      
      // DEBUG: If we got unknown_tool, check if input has think tool signature
      if (toolName === "unknown_tool" && toolInput && typeof toolInput === "object") {
        const inputObj = toolInput as Record<string, unknown>;
        // Think tool has scratchpad and/or last_tool_call fields
        if ("scratchpad" in inputObj || "last_tool_call" in inputObj) {
          toolName = "think";
        }
      }
      
      // Extract run_id from metadata if available (uniquely identifies this tool invocation)
      const runId = (metadata.run_id as string) || (data?.run_id as string) || undefined;
      
      // Always add a new step for each tool start (even if same tool is already running)
      // This allows tracking multiple sequential calls to the same tool (e.g., multiple think() calls)
      steps.push({
        type: toolName === "think" ? "thinking" : "tool_call",
        toolName,
        data: toolInput,
        status: "running",
        timestamp: new Date(),
        runId,
      });
    }
    
    // Handle on_tool_end event - tool call completed
    if (eventType === "on_tool_end") {
      let toolName = extractToolName(data);
      const toolOutput = extractToolOutput(data);
      
      // DEBUG: If we got unknown_tool, check if output has think tool signature
      if (toolName === "unknown_tool") {
        // Think tool output contains "Thought:" or "scratchpad" or "Last tool:"
        if (typeof toolOutput === "string") {
          const outputStr = toolOutput.toLowerCase();
          if (outputStr.includes("thought:") || outputStr.includes("scratchpad") || outputStr.includes("last tool:")) {
            toolName = "think";
          }
        }
        // Also check the raw data output field
        const rawOutput = data?.output as string | undefined;
        if (rawOutput && typeof rawOutput === "string") {
          const rawOutputStr = rawOutput.toLowerCase();
          if (rawOutputStr.includes("thought:") || rawOutputStr.includes("scratchpad") || rawOutputStr.includes("last tool:")) {
            toolName = "think";
          }
        }
      }
      
      // Extract run_id from metadata if available
      const runId = (metadata.run_id as string) || (data?.run_id as string) || undefined;
      
      // Find the matching step: prefer run_id match, fallback to most recent running step of same tool
      let existingIndex = -1;
      if (runId) {
        // Try to match by run_id first (most accurate)
        existingIndex = steps.findIndex(
          (s) => s.toolName === toolName && s.runId === runId && s.status === "running"
        );
      }
      
      // Fallback: find most recent running step of same tool (for events without run_id)
      if (existingIndex === -1) {
        // Find all running steps of this tool, get the most recent one
        const runningSteps = steps
          .map((s, idx) => ({ step: s, idx }))
          .filter(({ step }) => step.toolName === toolName && step.status === "running")
          .sort((a, b) => b.step.timestamp.getTime() - a.step.timestamp.getTime());
        
        if (runningSteps.length > 0) {
          existingIndex = runningSteps[0].idx;
        }
      }
      
      if (existingIndex >= 0) {
        steps[existingIndex] = {
          ...steps[existingIndex],
          type: toolName === "think" ? "thinking" : "tool_result",
          data: toolOutput || {},
          status: "complete",
          runId: runId || steps[existingIndex].runId, // Preserve or set run_id
        };
      } else {
        // Tool ended but we didn't see it start - add it anyway
        steps.push({
          type: toolName === "think" ? "thinking" : "tool_result",
          toolName,
          data: toolOutput || {},
          status: "complete",
          timestamp: new Date(),
          runId,
        });
      }
    }
    
    // Handle tool_call_chunks in on_chat_model_stream
    if (eventType === "on_chat_model_stream" && data) {
      const chunk = data.chunk as Record<string, unknown> | undefined;
      if (chunk && typeof chunk === "object" && "tool_call_chunks" in chunk) {
        const toolCallChunks = (chunk as { tool_call_chunks?: Array<{ name?: string; args?: unknown; id?: string }> }).tool_call_chunks;
        if (Array.isArray(toolCallChunks) && toolCallChunks.length > 0) {
          for (const toolCallChunk of toolCallChunks) {
            const toolName = toolCallChunk.name || "unknown_tool";
            // Check if we already have this tool call
            const existingIndex = steps.findIndex(
              (s) => s.toolName === toolName && s.status === "running"
            );
            if (existingIndex === -1) {
              steps.push({
                type: toolName === "think" ? "thinking" : "tool_call",
                toolName,
                data: toolCallChunk.args || {},
                status: "running",
                timestamp: new Date(),
              });
            }
          }
        }
      }
    }
  }
  
  return steps;
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

