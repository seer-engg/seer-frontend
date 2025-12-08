import { EvalAgentChat } from "@/components/seer/EvalAgentChat";
import { Sparkles } from "lucide-react";
import { AgentConfig } from "@/lib/agents/types";

// TODO: Replace with actual deployed URL
const EVAL_AGENT_URL = import.meta.env.VITE_EVAL_AGENT_URL || "http://localhost:8000";

const evalAgentConfig: AgentConfig = {
  name: "Eval Agent",
  url: EVAL_AGENT_URL,
  icon: Sparkles,
  description: "Generate test plans and align agent specifications",
  features: {
    streaming: true,
    toolCalls: true,
    thinkingSteps: true,
  },
  initialState: {
    // Eval agent doesn't need initial state like Supervisor's todos
  },
};

export default function EvalAgent() {
  return (
    <div className="h-screen flex flex-col">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-seer to-indigo-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Eval Agent</h1>
            <p className="text-sm text-muted-foreground">Generate test plans with user alignment</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <EvalAgentChat config={evalAgentConfig} />
      </div>
    </div>
  );
}

