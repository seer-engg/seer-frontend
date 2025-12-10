import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Message } from "@langchain/langgraph-sdk";
import { ArtifactProvider } from "@/components/thread/artifact";
import { Thread } from "@/components/thread";
import { useQueryState } from "@/hooks/useQueryState";
import { StreamProvider } from "@/providers/Stream";
import { ThreadProvider } from "@/providers/Thread";
import { useStreamContext } from "@/providers/Stream";
import { ensureToolCallsHaveResponses } from "@/lib/ensure-tool-responses";
import { useArtifactContext } from "@/components/thread/artifact";
import { IntegrationSelector } from "@/components/seer/integrations/IntegrationSelector";
import {
  IntegrationProvider,
  useIntegrationContext,
} from "@/contexts/IntegrationContext";

export interface AgentChatHeroProps {
  heroVisible: boolean;
  dismissHero: () => void;
  sendSuggestion: (suggestion: string) => void;
}

export interface AgentChatContainerProps {
  apiUrl: string;
  assistantId: string;
  apiKey?: string;
  renderHero?: (props: AgentChatHeroProps) => React.ReactNode;
}

export function AgentChatContainer({
  apiUrl,
  assistantId,
  apiKey,
  renderHero,
}: AgentChatContainerProps) {
  const [, setApiUrlParam] = useQueryState("apiUrl");
  const [, setAssistantIdParam] = useQueryState("assistantId");

  useLayoutEffect(() => {
    if (!apiUrl) return;
    setApiUrlParam((current) => {
      if (current === apiUrl) {
        return current;
      }
      return apiUrl;
    });
  }, [apiUrl, setApiUrlParam]);

  useLayoutEffect(() => {
    if (!assistantId) return;
    setAssistantIdParam((current) => {
      if (current === assistantId) {
        return current;
      }
      return assistantId;
    });
  }, [assistantId, setAssistantIdParam]);

  useEffect(() => {
    if (!apiKey || typeof window === "undefined") return;
    const existing = window.localStorage.getItem("lg:chat:apiKey");
    if (existing !== apiKey) {
      window.localStorage.setItem("lg:chat:apiKey", apiKey);
    }
  }, [apiKey]);

  return (
    <IntegrationProvider>
      <ThreadProvider>
        <StreamProvider
          defaultApiUrl={apiUrl}
          defaultAssistantId={assistantId}
        >
          <ArtifactProvider>
            <AgentChatContent renderHero={renderHero} />
          </ArtifactProvider>
        </StreamProvider>
      </ThreadProvider>
    </IntegrationProvider>
  );
}

function AgentChatContent({
  renderHero,
}: {
  renderHero?: (props: AgentChatHeroProps) => React.ReactNode;
}) {
  const stream = useStreamContext();
  const [artifactContext] = useArtifactContext();
  const heroEnabled = typeof renderHero === "function";
  const [heroVisible, setHeroVisible] = useState(heroEnabled);
  const { selection: integrationSelection } = useIntegrationContext();

  useEffect(() => {
    if (!heroEnabled) return;
    if (stream.messages.length > 0) {
      setHeroVisible(false);
    }
  }, [heroEnabled, stream.messages.length]);

  const dismissHero = useCallback(() => setHeroVisible(false), []);

  const sendSuggestion = useCallback(
    (suggestion: string) => {
      const text = suggestion.trim();
      if (!text) return;

      const toolMessages = ensureToolCallsHaveResponses(stream.messages);
      const newHumanMessage: Message = {
        id: uuidv4(),
        type: "human",
        content: [{ type: "text", text }],
      };

      const contextBase =
        artifactContext && Object.keys(artifactContext).length > 0
          ? artifactContext
          : undefined;
      const context = {
        ...contextBase,
        integrations: integrationSelection,
      };

      stream.submit(
        {
          messages: [...toolMessages, newHumanMessage],
          context,
        },
        {
          onDisconnect: "continue",
          streamMode: ["values"],
          streamSubgraphs: true,
          streamResumable: true,
          optimisticValues: (prev) => ({
            ...prev,
            context,
            messages: [
              ...(prev.messages ?? []),
              ...toolMessages,
              newHumanMessage,
            ],
          }),
        },
      );

      setHeroVisible(false);
    },
    [artifactContext, stream, integrationSelection],
  );

  const heroNode = useMemo(() => {
    if (!renderHero) return null;
    return renderHero({ heroVisible, dismissHero, sendSuggestion });
  }, [renderHero, heroVisible, dismissHero, sendSuggestion]);

  return (
    <div className="relative h-full">
      <div className="pointer-events-auto absolute right-4 top-4 z-40">
        <IntegrationSelector />
      </div>
      {heroNode}
      <Thread />
    </div>
  );
}

