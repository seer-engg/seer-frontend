import { useState, useEffect } from "react";
import { AgentChat } from "@/components/agents/AgentChat";
import { AgentConfig } from "@/lib/agents/types";
import { Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const SUPERVISOR_URL = import.meta.env.PROD 
  ? "https://seer-production.up.railway.app" 
  : "http://localhost:8000";

const supervisorConfig: AgentConfig = {
  name: "Orchestrator",
  url: SUPERVISOR_URL,
  icon: Zap,
  description: "LangGraph Agent • Ready",
  features: {
    streaming: true,
    toolCalls: true,
    thinkingSteps: true,
  },
  initialState: {
    todos: [],
    tool_call_counts: { _total: 0 },
  },
};

// Supervisor-specific empty state
function SupervisorEmptyState({ onSuggestionClick }: { onSuggestionClick: (suggestion: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        <div className="relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-seer via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-seer/20"
          >
            <Zap className="h-12 w-12 text-white" />
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg"
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
        </div>

        {/* Preloaded Questions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 space-y-3"
        >
          <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
            {[
              "Summarize my last 5 emails",
              "Find all open PRs on my repo",
              "Create a task in Asana",
              "Search for recent news on AI"
            ].map((suggestion, index) => (
              <motion.button
                key={suggestion}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                onClick={() => onSuggestionClick(suggestion)}
                className="text-left px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-seer/50 text-sm transition-all duration-200 hover:shadow-md"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ToolOrchestrator() {
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(null);

  // Auto-submit when a suggestion is clicked
  useEffect(() => {
    if (suggestionMessage && !autoSubmitMessage) {
      setAutoSubmitMessage(suggestionMessage);
      setSuggestionMessage(null);
    }
  }, [suggestionMessage, autoSubmitMessage]);

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestionMessage(suggestion);
  };

  return (
    <AgentChat
      config={supervisorConfig}
      enableUsageGate={true}
      placeholder="Ask me anything..."
      emptyState={<SupervisorEmptyState onSuggestionClick={handleSuggestionClick} />}
      autoSubmitText={autoSubmitMessage || undefined}
    />
  );
}

