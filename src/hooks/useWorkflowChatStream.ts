import { useStream } from '@langchain/langgraph-sdk/react';
import { type Message } from '@langchain/langgraph-sdk';
import { createClient } from '@/providers/client';
import { getBackendBaseUrl } from '@/lib/api-client';

// State type for the workflow chat stream
export type WorkflowChatStreamState = {
  messages: Message[];
  progress?: string[];
};

function isProgressCustomEvent(event: unknown): event is { progress: string } {
  if (typeof event !== 'object' || event === null) return false;
  const rec = event as Record<string, unknown>;
  return typeof rec.progress === 'string';
}

export function useWorkflowChatStream(
  workflowId: number,
  threadId: string | null,
  workflowState: { nodes: any[]; edges: any[] }
) {
  // Use the streaming endpoint
  const apiUrl = `${getBackendBaseUrl()}/api/workflows/${workflowId}/chat`;
  const client = createClient(apiUrl, undefined);
  
  const stream = useStream<
    WorkflowChatStreamState,
    {
      UpdateType: {
        messages?: Message[] | Message | string;
        progress?: string[] | string;
      };
      CustomEventType: { progress: string };
    }
  >({
    client,
    assistantId: `workflow-chat-${workflowId}`,
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
      console.error('Workflow chat stream error:', error);
    },
  });

  const submitMessage = (message: string, model: string, sessionId?: number) => {
    const newMessage: Message = {
      type: 'human',
      content: typeof message === 'string' ? message : JSON.stringify(message),
    };

    // Submit with workflow context
    stream.submit(
      {
        messages: [newMessage],
        model,
        workflow_state: workflowState,
      },
      {
        streamMode: ['values', 'messages-tuple', 'custom'],
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
      const values = stream.values as WorkflowChatStreamState | undefined;
      return values?.progress ?? [];
    })(),
    isLoading: stream.isLoading,
    error: stream.error ? (stream.error as Error).message : null,
    submitMessage,
    stop: stream.stop,
    threadId: stream.threadId,
  };
}

