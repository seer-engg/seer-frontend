import { EvalsChat } from "@/components/seer/EvalsChat";
import { GithubRepoConnect } from "@/components/seer/GithubRepoConnect";
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
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-seer to-indigo-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Evals</h1>
            <p className="text-sm text-muted-foreground">Generate test plans with user alignment</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <GithubRepoConnect />
        <div className="flex-1 overflow-hidden">
          <EvalsChat config={evalsConfig} />
        </div>
      </div>
    </div>
  );
}

