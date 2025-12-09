import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AgentChat } from "@/components/agents/AgentChat";
import { PlanSummaryView } from "./PlanSummaryView";
import { AlignmentQuestionnaire } from "./AlignmentQuestionnaire";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { AgentConfig } from "@/lib/agents/types";

interface EvalsChatProps {
  config: AgentConfig;
}

// Component to handle empty state with suggestions
function EvalsEmptyState({ config, onSuggestionClick }: { config: AgentConfig; onSuggestionClick: (suggestion: string) => void }) {
  const emptyStateWithSuggestions = (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-seer/20 to-indigo-500/20 flex items-center justify-center mb-4 mx-auto">
          <Sparkles className="h-8 w-8 text-seer" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Evals</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Describe your agent and I'll generate a test plan with alignment questions to ensure we're on the same page.
        </p>
        
        {/* Suggestion Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
          {[
            "Evaluate a GitHub PR agent that syncs PRs to Asana",
            "Test an email agent that summarizes Gmail threads",
            "Create test plan for a Slack bot that manages tasks",
            "Evaluate a calendar agent that schedules meetings"
          ].map((suggestion, index) => (
            <motion.button
              key={suggestion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => onSuggestionClick(suggestion)}
              className="text-left px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-seer/50 text-sm transition-all duration-200 hover:shadow-md"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );

  // This component is only used for rendering the empty state
  // The actual AgentChat is rendered in the parent
  return <>{emptyStateWithSuggestions}</>;
}

export function EvalsChat({ config }: EvalsChatProps) {
  const [agentSpec, setAgentSpec] = useState<any>(null);
  const [alignmentQuestions, setAlignmentQuestions] = useState<any[]>([]);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [threadId] = useState(() => crypto.randomUUID());
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const [autoSubmitMessage, setAutoSubmitMessage] = useState<string | null>(null);

  // Parse messages to extract agent spec and alignment questions
  useEffect(() => {
    // This would be called when messages are received
    // For now, we'll parse from the latest message content
  }, []);

  // Auto-submit when a suggestion is clicked
  useEffect(() => {
    if (suggestionMessage && !autoSubmitMessage) {
      setAutoSubmitMessage(suggestionMessage);
      // Reset suggestionMessage to allow re-clicking
      setSuggestionMessage(null);
    }
  }, [suggestionMessage, autoSubmitMessage]);

  const handleAlignmentSubmit = async (answers: Record<string, string>) => {
    // Format answers as JSON for the agent
    const answerMessage = JSON.stringify({
      alignment_answers: answers,
    });

    // Send answers back to the agent
    // This would use the streamMessage function to send the answers
    setShowQuestionnaire(false);
  };

  const handleAlignmentSkip = () => {
    setShowQuestionnaire(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestionMessage(suggestion);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Plan Summary */}
      {agentSpec && (
        <div className="p-4 border-b border-border overflow-y-auto max-h-[40%]">
          <PlanSummaryView agentSpec={agentSpec} />
        </div>
      )}

      {/* Alignment Questionnaire */}
      {showQuestionnaire && alignmentQuestions.length > 0 && (
        <div className="p-4 border-b border-border overflow-y-auto max-h-[40%]">
          <AlignmentQuestionnaire
            questions={alignmentQuestions}
            onSubmit={handleAlignmentSubmit}
            onSkip={handleAlignmentSkip}
          />
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
          <AgentChat
            config={config}
            placeholder="Describe the agent you want to evaluate..."
          autoSubmitText={autoSubmitMessage || undefined}
          emptyState={!autoSubmitMessage ? <EvalsEmptyState config={config} onSuggestionClick={handleSuggestionClick} /> : undefined}
          />
      </div>
    </div>
  );
}

