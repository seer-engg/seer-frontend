import { EvalsChat } from "@/components/seer/EvalsChat";
import { AgentConfig } from "@/lib/agents/types";
import { Sparkles } from "lucide-react";

// Use production URL in deployed environment, localhost for local dev
// Evals agent runs on port 8002 (as per run.py)
const EVALS_URL = import.meta.env.PROD 
  ? "https://seer-production.up.railway.app" 
  : "http://localhost:8002";

const evalsConfig: AgentConfig = {
  name: "Evals",
  url: EVALS_URL,
  icon: Sparkles,
  description: "Generate test plans and align agent specifications",
  features: {
    streaming: true,
    toolCalls: true,
    thinkingSteps: true,
  },
  initialState: {
    // Evals doesn't need initial state like Supervisor's todos
  },
};

export default function Evals() {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          <EvalsChat config={evalsConfig} />
        </div>
      </div>
    </div>
  );
}

