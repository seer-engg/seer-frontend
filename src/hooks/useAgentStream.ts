import { useStream } from '@langchain/langgraph-sdk/react';
import { type Message } from '@langchain/langgraph-sdk';
import { createClient } from '@/providers/client';
import { getBackendBaseUrl } from '@/lib/api-client';

const AGENT_SPEC_ASSISTANT_ID = 'eval_agent';

/**
 * Gets the agent API URL dynamically based on backend query parameter or env var
 */
const getAgentUrl = (): string => {
  return `${getBackendBaseUrl()}/api/agents`;
};

// State type for the agent spec workflow
export type AgentStreamState = {
  messages: Message[];
  progress?: string[];
};

function isProgressCustomEvent(event: unknown): event is { progress: string } {
  if (typeof event !== 'object' || event === null) return false;
  const rec = event as Record<string, unknown>;
  return typeof rec.progress === 'string';
}

export function useAgentStream(threadId: string | null) {
  // Get agent URL dynamically to support backend query parameter
  const agentUrl = getAgentUrl();
  const client = createClient(agentUrl, undefined);
  const stream = useStream<
    AgentStreamState,
    {
      UpdateType: {
        messages?: Message[] | Message | string;
        progress?: string[] | string;
        step?: string;
      };
      CustomEventType: { progress: string };
    }
  >({
    client,
    assistantId: AGENT_SPEC_ASSISTANT_ID,
    threadId: threadId,
    onCustomEvent: (event, options) => {
      // Handle progress events from the agent
      if (isProgressCustomEvent(event)) {
        options.mutate((prev) => {
          const next = [...(prev.progress ?? []), event.progress];
          const capped = next.length > 200 ? next.slice(-200) : next;
          return { ...prev, progress: capped };
        });
      }
    },
    onError: (error: unknown) => {
      // Log merge errors but don't crash - these occur when tool messages
      // have undefined properties that can't be merged
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Cannot merge two undefined')) {
        console.warn('Tool message merge warning (non-fatal):', errorMessage);
        return; // Don't propagate this error
      }
      console.error('Stream error:', error);
    },
  });

  const submitSpec = (userInput: string, step?: string) => {
    const newMessage: Message = {
      type: 'human',
      content: userInput,
    };

    stream.submit(
      { messages: [newMessage], step },
      {
        streamMode: ['values','messages-tuple', 'custom'],
        optimisticValues: (prev) => ({
          ...prev,
          messages: [...(prev.messages ?? []), newMessage],
        }),
      }
    );
  };

  const submitStep = (step: string) => {
    // Clear progress before starting new step
    stream.submit(
      { step },
      {
        streamMode: ['values', 'messages-tuple', 'custom'],
        optimisticValues: (prev) => ({
          ...prev,
          progress: [],
        }),
      }
    );
  };

  return {
    messages: stream.messages ?? [],
    progress: (() => {
      const values = stream.values as AgentStreamState | undefined;
      return values?.progress ?? [];
    })(),
    isStreaming: stream.isLoading,
    error: stream.error ? (stream.error as Error).message : null,
    submitSpec,
    submitStep,
    stop: stream.stop,
  };
}
