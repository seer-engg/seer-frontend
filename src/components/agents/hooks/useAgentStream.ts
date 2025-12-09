import { useState, useCallback } from "react";
import { streamAgent, ThinkingStep, ThinkingPhase, extractThinkingStepsFromEvents, createThread } from "@/lib/agents/langgraphClient";
import { AgentConfig } from "@/lib/agents/types";

interface UseAgentStreamResult {
  currentContent: string;
  thinkingPhases: ThinkingPhase[];
  isLoading: boolean;
  error: string | null;
  streamToAgent: (userContent: string, assistantMessageId: string, onContentUpdate: (content: string) => void, onPhasesUpdate: (phases: ThinkingPhase[]) => void) => Promise<void>;
}

export function useAgentStream(config: AgentConfig, threadId: string | null, setThreadId: (id: string) => void): UseAgentStreamResult {
  const [currentContent, setCurrentContent] = useState("");
  const [thinkingPhases, setThinkingPhases] = useState<ThinkingPhase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAgentId = useCallback((): string => {
    if (config.url.includes("8002") || config.url.includes("eval")) {
      return "eval_agent";
    }
    if (config.url.includes("8000") || config.url.includes("supervisor")) {
      return "supervisor";
    }
    return "supervisor";
  }, [config.url]);

  const streamToAgent = useCallback(async (
    userContent: string,
    assistantMessageId: string,
    onContentUpdate: (content: string) => void,
    onPhasesUpdate: (phases: ThinkingPhase[]) => void
  ) => {
    setIsLoading(true);
    setError(null);
    setCurrentContent("");
    setThinkingPhases([]);

    let currentPhases: ThinkingPhase[] = [];
    let thinkingPhaseId: string | null = null;
    let thinkingPhaseSteps: ThinkingStep[] = [];
    const activeToolCalls = new Set<string>();

    const finalizeThinkingPhase = () => {
      if (thinkingPhaseId && thinkingPhaseSteps.length > 0) {
        currentPhases = currentPhases.map(phase => 
          phase.id === thinkingPhaseId 
            ? { ...phase, isActive: false, completedAt: new Date(), steps: [...thinkingPhaseSteps] }
            : phase
        );
      }
    };

    const getOrCreateThinkingPhase = (): ThinkingPhase => {
      if (!thinkingPhaseId || !currentPhases.find(p => p.id === thinkingPhaseId)) {
        thinkingPhaseId = crypto.randomUUID();
        const newPhase: ThinkingPhase = {
          id: thinkingPhaseId,
          steps: [],
          isActive: true,
          startedAt: new Date(),
        };
        currentPhases = [...currentPhases, newPhase];
        return newPhase;
      }
      return currentPhases.find(p => p.id === thinkingPhaseId)!;
    };

    try {
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await createThread(config.url);
        setThreadId(currentThreadId);
      }

      const agentId = getAgentId();
      let currentContent = "";
      let hasReceivedContent = false;
        if (!thinkingPhaseId || !currentPhases.find(p => p.id === thinkingPhaseId)) {
          thinkingPhaseId = crypto.randomUUID();
          const newPhase: ThinkingPhase = {
            id: thinkingPhaseId,
            steps: [],
            isActive: true,
            startedAt: new Date(),
          };
          currentPhases = [...currentPhases, newPhase];
          return newPhase;
        }
        return currentPhases.find(p => p.id === thinkingPhaseId)!;
      };

      for await (const event of streamAgent(
        config.url,
        agentId,
        userContent,
        currentThreadId,
        config.initialState
      )) {
        const eventData = event.data as Record<string, unknown> | null;

        const previousSteps = [...thinkingPhaseSteps];
        const newSteps = extractThinkingStepsFromEvents(event, previousSteps);

        // Track active tool calls
        if (event.event === "events" && eventData) {
          const eventType = eventData.event as string;
          const data = eventData.data as Record<string, unknown> | undefined;

          if (eventType === "on_tool_start" && data) {
            const toolName = (data.name as string) || "unknown_tool";
            activeToolCalls.add(toolName);
          } else if (eventType === "on_tool_end" && data) {
            const toolName = (data.name as string) || "unknown_tool";
            activeToolCalls.delete(toolName);
          }
        }

        const allToolSteps = newSteps;

        // Merge tool steps
        if (allToolSteps.length > 0) {
          const getStepKey = (step: ThinkingStep): string => {
            if (step.runId) {
              return `${step.toolName}:${step.runId}`;
            }
            return `${step.toolName}:${step.timestamp.getTime()}`;
          };

          const existingStepsMap = new Map<string, ThinkingStep>();
          thinkingPhaseSteps.forEach(step => {
            const key = getStepKey(step);
            existingStepsMap.set(key, step);
          });

          allToolSteps.forEach(newStep => {
            const key = getStepKey(newStep);
            const existingStep = existingStepsMap.get(key);

            if (existingStep) {
              existingStepsMap.set(key, {
                ...existingStep,
                ...newStep,
                timestamp: newStep.timestamp || existingStep.timestamp,
              });
            } else {
              existingStepsMap.set(key, newStep);
            }
          });

          thinkingPhaseSteps = Array.from(existingStepsMap.values()).sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          );

          const thinkingPhase = getOrCreateThinkingPhase();
          currentPhases = currentPhases.map(phase =>
            phase.id === thinkingPhase.id
              ? { ...phase, steps: [...thinkingPhaseSteps], isActive: allToolSteps.some(s => s.status === "running") }
              : phase
          );

          onPhasesUpdate([...currentPhases]);
        }

        // Handle content extraction
        if (event.event === "events" && eventData) {
          const eventType = eventData.event as string;

          if (eventType === "on_chat_model_stream") {
            const data = eventData.data as Record<string, unknown> | undefined;
            const chunk = data?.chunk as Record<string, unknown> | undefined;

            if (chunk && typeof chunk === "object") {
              if ("tool_call_chunks" in chunk && chunk.tool_call_chunks) {
                continue;
              }

              if (activeToolCalls.size > 0) {
                continue;
              }

              if ("content" in chunk) {
                const contentChunk = chunk.content as string;
                if (contentChunk && typeof contentChunk === "string" && contentChunk.trim()) {
                  if (!currentContent.includes(contentChunk)) {
                    currentContent += contentChunk;
                    hasReceivedContent = true;
                    setCurrentContent(currentContent);
                    onContentUpdate(currentContent);
                  }
                }
              }
            }
          }

          if (eventType === "on_chain_end") {
            const data = eventData.data as Record<string, unknown> | undefined;
            const output = data?.output as Record<string, unknown> | undefined;
            if (output && typeof output === "object" && "messages" in output) {
              const messages = output.messages as Array<Record<string, unknown>> | undefined;
              if (Array.isArray(messages) && messages.length > 0) {
                for (let i = messages.length - 1; i >= 0; i--) {
                  const msg = messages[i];
                  const msgType = msg.type as string | undefined;
                  const role = msg.role as string | undefined;

                  if ((msgType === "ai" || role === "assistant") && "content" in msg) {
                    if ("tool_calls" in msg && msg.tool_calls) {
                      continue;
                    }

                    const finalContent = msg.content as string;
                    if (finalContent && typeof finalContent === "string" && finalContent.trim()) {
                      if (finalContent.length > currentContent.length || !hasReceivedContent) {
                        currentContent = finalContent;
                        hasReceivedContent = true;
                        setCurrentContent(currentContent);
                        onContentUpdate(currentContent);
                      }
                      break;
                    }
                  }
                }
              }
            }
          }
        } else if (event.event === "end") {
          // Try to extract final content from end event
          if (eventData && typeof eventData === "object") {
            const endEventData = eventData.data as Record<string, unknown> | undefined;
            if (endEventData) {
              const output = endEventData.output as Record<string, unknown> | undefined;
              if (output && typeof output === "object" && "messages" in output) {
                const messages = output.messages as Array<Record<string, unknown>> | undefined;
                if (Array.isArray(messages) && messages.length > 0) {
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && "content" in lastMessage && typeof lastMessage.content === "string") {
                    const endEventContent = lastMessage.content;
                    if (endEventContent.length > currentContent.length) {
                      currentContent = endEventContent;
                    }
                  }
                }
              }
            }
          }

          if (thinkingPhaseId && thinkingPhaseSteps.length > 0) {
            finalizeThinkingPhase();
            onPhasesUpdate([...currentPhases]);
          }

          setCurrentContent(currentContent);
          onContentUpdate(currentContent);
          setIsLoading(false);
          break;
        } else if (event.event === "error") {
          const errorData = event.data as { message?: string } | string;
          const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || "Unknown error";
          setError(errorMessage);

          if (thinkingPhaseId && thinkingPhaseSteps.length > 0) {
            finalizeThinkingPhase();
            onPhasesUpdate([...currentPhases]);
          }

          setIsLoading(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setIsLoading(false);

      if (thinkingPhaseId && thinkingPhaseSteps.length > 0) {
        finalizeThinkingPhase();
        onPhasesUpdate([...currentPhases]);
      }
    }
  }, [config, threadId, setThreadId, getAgentId]);

  return {
    currentContent,
    thinkingPhases,
    isLoading,
    error,
    streamToAgent,
  };
}

