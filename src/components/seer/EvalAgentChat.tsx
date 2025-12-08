import { useState, useEffect } from "react";
import { AgentChat } from "@/components/agents/AgentChat";
import { PlanSummaryView } from "./PlanSummaryView";
import { AlignmentQuestionnaire } from "./AlignmentQuestionnaire";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { AgentConfig } from "@/lib/agents/types";
import { useAgentStream } from "@/lib/agents/useAgentStream";

interface EvalAgentChatProps {
  config: AgentConfig;
}

export function EvalAgentChat({ config }: EvalAgentChatProps) {
  const [agentSpec, setAgentSpec] = useState<any>(null);
  const [alignmentQuestions, setAlignmentQuestions] = useState<any[]>([]);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [threadId] = useState(() => crypto.randomUUID());

  // Parse messages to extract agent spec and alignment questions
  useEffect(() => {
    // This would be called when messages are received
    // For now, we'll parse from the latest message content
  }, []);

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
          emptyState={
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-seer/20 to-indigo-500/20 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-seer" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Eval Agent</h2>
              <p className="text-muted-foreground max-w-md">
                Describe your agent and I'll generate a test plan with alignment questions to ensure we're on the same
                page.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}

