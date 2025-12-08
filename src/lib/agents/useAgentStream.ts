import { useState, useCallback } from "react";

export interface ThinkingStep {
  type: "tool_call" | "tool_result" | "thinking";
  toolName: string;
  data: unknown;
  status: "pending" | "running" | "complete" | "error";
  timestamp: Date;
}

export interface ThinkingStream {
  toolName: string;
  content: string;
  isComplete: boolean;
}

export interface AgentStreamConfig {
  url: string;
  initialState?: Record<string, unknown>;
}

export function useAgentStream(config: AgentStreamConfig) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);

  const streamMessage = useCallback(
    async (
      input: string,
      threadId: string,
      onContent: (content: string, isDone: boolean) => void,
      onThinkingStep?: (step: ThinkingStep) => void,
      onError?: (error: string) => void,
      onThinkingStream?: (content: string) => void
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);
      setThinkingSteps([]);

      try {
        const response = await fetch(`${config.url}/agent/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              messages: [
                {
                  type: "human",
                  content: input,
                },
              ],
              ...config.initialState,
            },
            config: {
              configurable: {
                thread_id: threadId,
              },
            },
            // Request custom stream mode for thinking tool streaming
            stream_mode: ["custom", "updates"],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let currentContent = "";
        let streamEnded = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            streamEnded = true;
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || line.startsWith(":")) continue;

            if (line.startsWith("event: ")) {
              continue;
            }

            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                streamEnded = true;
                continue;
              }

              try {
                const data = JSON.parse(jsonStr);
                
                // Debug logging - log full event structure to understand LangServe format
                console.log("[AgentStream Event Full]", JSON.stringify(data, null, 2));

                // LangServe sends state updates in format: { "node_name": { "messages": [...] } }
                // OR direct: { "messages": [...] }
                // We need to check both formats
                
                let messagesArray: any[] | null = null;
                
                // Check for direct messages array
                if (data.messages && Array.isArray(data.messages)) {
                  messagesArray = data.messages;
                } 
                // Check for node-keyed format: { "node_name": { "messages": [...] } }
                else {
                  // Iterate through keys to find node updates with messages
                  for (const key in data) {
                    if (data[key] && typeof data[key] === "object" && data[key].messages && Array.isArray(data[key].messages)) {
                      messagesArray = data[key].messages;
                      break; // Use first found messages array
                    }
                  }
                }
                
                // Extract content from messages array if found
                if (messagesArray) {
                  const lastAI = [...messagesArray].reverse().find(
                    (m: any) => m.type === "ai" || m.role === "assistant" || m.type === "assistant"
                  );
                  if (lastAI?.content) {
                    const content = typeof lastAI.content === "string"
                      ? lastAI.content
                      : Array.isArray(lastAI.content)
                      ? lastAI.content.find((c: any) => c.type === "text")?.text || ""
                      : "";
                    if (content && content !== currentContent) {
                      currentContent = content;
                      onContent(currentContent, false);
                    }
                  }
                }

                // Extract event type from various possible locations
                const eventType = data.event || data.type || (data.data && data.data.event);
                const eventData = data.data || data;
                const eventName = data.name || eventData?.name;

                // Handle node execution events
                if (eventType === "on_chain_start" || (data.run_id && !eventType)) {
                  console.log(`[Node Start] ${eventName || "unknown"}`);
                  // Could track node execution if needed
                } else if (eventType === "on_chain_end" || (data.run_id && eventData?.output)) {
                  console.log(`[Node End] ${eventName || "unknown"}`);
                  // Extract state updates and final content
                  const output = eventData?.output || data.output || data;
                  if (output) {
                    // Try to extract messages from output
                    if (output.messages && Array.isArray(output.messages)) {
                      const lastAI = [...output.messages].reverse().find(
                        (m: any) => m.type === "ai" || m.role === "assistant" || m.type === "assistant"
                      );
                      if (lastAI?.content) {
                        const content = typeof lastAI.content === "string" 
                          ? lastAI.content 
                          : Array.isArray(lastAI.content)
                          ? lastAI.content.find((c: any) => c.type === "text")?.text || ""
                          : "";
                        if (content && content !== currentContent) {
                          currentContent = content;
                          onContent(currentContent, false);
                        }
                      }
                    }
                    // Also try direct content extraction
                    const content = extractFinalContent(output);
                    if (content && content !== currentContent) {
                      currentContent = content;
                      onContent(currentContent, false);
                    }
                  }
                }
                // Handle tool events
                else if (eventType === "on_tool_start") {
                  const toolName = eventName || data.name || eventData?.name || "tool";
                  const step: ThinkingStep = {
                    type: "tool_call",
                    toolName: toolName,
                    data: eventData?.input || data.input || {},
                    status: "running",
                    timestamp: new Date(),
                  };
                  setThinkingSteps((prev) => [...prev, step]);
                  onThinkingStep?.(step);
                } else if (eventType === "on_tool_end") {
                  const toolName = eventName || data.name || eventData?.name || "tool";
                  const toolOutput = eventData?.output || data.output || eventData || data;
                  const step: ThinkingStep = {
                    type: toolName === "think" ? "thinking" : "tool_result",
                    toolName: toolName,
                    data: toolOutput,
                    status: "complete",
                    timestamp: new Date(),
                  };
                  setThinkingSteps((prev) => {
                    const updated = [...prev];
                    // For think tool, mark existing thinking step as complete
                    if (toolName === "think") {
                      const thinkingIndex = updated.findLastIndex(
                        (s) => s.toolName === "think" && s.status === "running"
                      );
                      if (thinkingIndex >= 0) {
                        updated[thinkingIndex] = {
                          ...updated[thinkingIndex],
                          status: "complete",
                          data: typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput),
                        };
                        return updated;
                      }
                    }
                    // For other tools, update or add
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].toolName === step.toolName) {
                      updated[lastIndex] = step;
                    } else {
                      updated.push(step);
                    }
                    return updated;
                  });
                  onThinkingStep?.(step);
                  
                  // Also try to extract content from tool result if it's a message
                  const content = extractFinalContent({ output: toolOutput });
                  if (content && content !== currentContent) {
                    currentContent = content;
                    onContent(currentContent, false);
                  }
                }
                // Handle LLM streaming events
                else if (eventType === "on_chat_model_stream" || data.chunk) {
                  const chunk = data.chunk?.content || data.chunk?.text || eventData?.chunk?.content || eventData?.chunk?.text || eventData?.content || "";
                  if (chunk) {
                    currentContent += chunk;
                    onContent(currentContent, false);
                  }
                }
                // Handle custom events (for thinking tool streaming)
                else if (eventType === "custom" || (typeof data === "string" && data.startsWith("💭"))) {
                  const customData = typeof data === "string" ? data : (eventData || data.data);
                  // Check if it's a thinking stream (string content)
                  if (customData && typeof customData === "string") {
                    // Emit thinking stream event
                    onThinkingStream?.(customData);
                    
                    // Also add as a thinking step for UI display
                    const thinkingStep: ThinkingStep = {
                      type: "thinking",
                      toolName: "think",
                      data: customData,
                      status: "running",
                      timestamp: new Date(),
                    };
                    setThinkingSteps((prev) => {
                      // Check if there's already a thinking step for this tool
                      const existingIndex = prev.findLastIndex(
                        (s) => s.toolName === "think" && s.status === "running"
                      );
                      if (existingIndex >= 0) {
                        // Update existing thinking step
                        const updated = [...prev];
                        updated[existingIndex] = {
                          ...updated[existingIndex],
                          data: (updated[existingIndex].data as string) + customData,
                        };
                        return updated;
                      } else {
                        // Add new thinking step
                        return [...prev, thinkingStep];
                      }
                    });
                    onThinkingStep?.(thinkingStep);
                  }
                }
                // Handle final content from any event (fallback)
                // Only if we haven't already processed messages above
                else if (!messagesArray) {
                  const content = extractFinalContent(data);
                  if (content && content !== currentContent) {
                    currentContent = content;
                    onContent(currentContent, false);
                  }
                }
              } catch (e) {
                console.warn("[AgentStream Parse Error]", e, "Raw:", jsonStr);
              }
            }
          }
        }

        // Ensure final content is sent
        if (currentContent.trim()) {
          onContent(currentContent, true);
        } else if (streamEnded) {
          // Stream ended but no content - mark as done anyway
          onContent(currentContent || "", true);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Connection failed";
        setError(errorMessage);
        onError?.(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [config]
  );

  return {
    streamMessage,
    isLoading,
    error,
    thinkingSteps,
    clearThinkingSteps: () => setThinkingSteps([]),
  };
}

// Extract final content from various LangServe response formats
function extractFinalContent(data: Record<string, unknown>): string {
  if (typeof data.content === "string" && data.content.trim()) {
    return data.content;
  }

  if (data.messages && Array.isArray(data.messages)) {
    const lastAI = [...data.messages].reverse().find(
      (m: { type?: string; role?: string }) => m.type === "ai" || m.role === "assistant"
    );
    if (lastAI) {
      const content = (lastAI as { content?: unknown }).content;
      if (typeof content === "string" && content.trim()) {
        return content;
      }
      if (typeof content === "object" && content !== null) {
        const nestedContent = extractFinalContent(content as Record<string, unknown>);
        if (nestedContent) {
          return nestedContent;
        }
      }
    }
  }

  if (data.output) {
    if (typeof data.output === "string") {
      return data.output;
    }
    const output = data.output as Record<string, unknown>;
    if (typeof output.content === "string") {
      return output.content;
    }
    if (output.messages && Array.isArray(output.messages)) {
      const lastMsg = [...output.messages].reverse().find(
        (m: { type?: string; role?: string }) => m.type === "ai" || m.role === "assistant"
      );
      if (lastMsg && typeof (lastMsg as { content?: unknown }).content === "string") {
        return (lastMsg as { content: string }).content;
      }
    }
  }

  return "";
}

