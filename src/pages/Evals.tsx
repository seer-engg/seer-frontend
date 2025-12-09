import { AgentChatContainer, AgentChatHeroProps } from "@/features/agent-chat/AgentChatContainer";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const EVALS_URL = import.meta.env.PROD
  ? "https://seer-production.up.railway.app"
  : "http://localhost:8002";

const EVAL_ASSISTANT_ID =
  (import.meta.env.VITE_EVAL_AGENT_ID as string | undefined) || "eval_agent";

const evalSuggestions = [
  "Evaluate a GitHub PR agent that syncs PRs to Asana",
  "Test an email agent that summarizes Gmail threads",
  "Create test plan for a Slack bot that manages tasks",
  "Evaluate a calendar agent that schedules meetings",
];

function EvalsHero({ heroVisible, sendSuggestion }: AgentChatHeroProps) {
  if (!heroVisible) return null;

  return (
    <div className="border-b border-border bg-gradient-to-b from-background/60 to-transparent">
      <div className="mx-auto w-full max-w-4xl px-6 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-seer/20 to-indigo-500/20">
            <Sparkles className="h-8 w-8 text-seer" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Evals</h2>
            <p className="text-muted-foreground">
              Describe your agent and I&apos;ll generate a test plan with alignment questions to ensure we&apos;re on the same page.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {evalSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                onClick={() => sendSuggestion(suggestion)}
                className="rounded-lg border border-border/60 bg-secondary/50 px-4 py-3 text-left text-sm transition hover:border-seer/50 hover:bg-secondary"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function Evals() {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          <AgentChatContainer
            apiUrl={EVALS_URL}
            assistantId={EVAL_ASSISTANT_ID}
            renderHero={(props) => <EvalsHero {...props} />}
          />
        </div>
      </div>
    </div>
  );
}

