import { AgentChatContainer, AgentChatHeroProps } from "@/features/agent-chat/AgentChatContainer";
import { motion } from "framer-motion";
import { Zap, Sparkles } from "lucide-react";

const SUPERVISOR_URL =
  (import.meta.env.VITE_SUPERVISOR_URL as string | undefined) ||
  "http://localhost:8000";

const SUPERVISOR_ASSISTANT_ID =
  (import.meta.env.VITE_SUPERVISOR_AGENT_ID as string | undefined) ||
  "supervisor";

const orchestratorSuggestions = [
  "Summarize my last 5 emails",
  "Find all open PRs on seer-engg/buggy-coder repo",
  "Create a task in Asana",
  "Search for recent news on twitter",
];

function OrchestratorHero({ heroVisible, sendSuggestion }: AgentChatHeroProps) {
  if (!heroVisible) return null;

  return (
    <div className="border-b border-border bg-gradient-to-b from-background/60 to-transparent">
      <div className="mx-auto w-full max-w-4xl px-6 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          <div className="relative mx-auto h-24 w-24">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex h-full w-full items-center justify-center rounded-3xl bg-gradient-to-br from-seer via-indigo-500 to-purple-600 shadow-2xl shadow-seer/20"
            >
              <Zap className="h-12 w-12 text-white" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg"
            >
              <Sparkles className="h-4 w-4 text-white" />
            </motion.div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {orchestratorSuggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  onClick={() => sendSuggestion(suggestion)}
                  className="text-left px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-seer/50 text-sm transition-all duration-200 hover:shadow-md"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ToolOrchestrator() {
  return (
    <div data-tour="orchestrator-page">
      <AgentChatContainer
        apiUrl={SUPERVISOR_URL}
        assistantId={SUPERVISOR_ASSISTANT_ID}
        renderHero={(props) => <OrchestratorHero {...props} />}
      />
    </div>
  );
}

