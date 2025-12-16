import { useStream } from '@langchain/langgraph-sdk/react';
import { type Message } from '@langchain/langgraph-sdk';
import { createClient } from '@/providers/client';
const AGENT_URL = import.meta.env.VITE_BACKEND_API_URL + '/api/agents';

const AGENT_SPEC_ASSISTANT_ID = 'eval_agent';

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
  const client = createClient(AGENT_URL, undefined);
  const stream = useStream<
    AgentStreamState,
    {
      UpdateType: {
        messages?: Message[] | Message | string;
        progress?: string[] | string;
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
  });

  const submitSpec = (userInput: string) => {
    const newMessage: Message = {
      type: 'human',
      content: userInput,
    };

    stream.submit(
      { messages: [newMessage] },
      {
        streamMode: ['values'],
        optimisticValues: (prev) => ({
          ...prev,
          messages: [...(prev.messages ?? []), newMessage],
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
    stop: stream.stop,
  };
}
