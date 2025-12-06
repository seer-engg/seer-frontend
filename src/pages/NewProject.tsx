import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/seer/ChatInterface";
import { ArtifactPanel } from "@/components/seer/ArtifactPanel";
import { SandboxModal } from "@/components/seer/SandboxModal";
import { mockAgentSpec, type Message } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

const agentResponses = [
  {
    trigger: "",
    response: "Welcome to Seer. I'm here to help you build a reliable agent.\n\nWhat are we building today? (e.g., 'A PR Reviewer', 'A Support Bot', 'A Data Pipeline')",
  },
  {
    trigger: "pr",
    response: "Got it — a PR workflow agent. I'll need to understand the integration points.\n\nWhich tools should this agent connect to?\n• GitHub (for PR data)\n• Asana / Linear / Jira (for task tracking)\n• Slack (for notifications)\n\nJust describe your workflow, and I'll figure out the rest.",
  },
  {
    trigger: "asana",
    response: "Perfect. I'll configure:\n\n• `github_get_pr` — Fetch PR details\n• `github_post_comment` — Post comments on PRs\n• `asana_get_task` — Lookup linked tasks\n• `asana_update_task` — Update task status\n\nShould I use the standard Linear-style workflow? (PR opened → Task moves to 'In Review' → PR merged → Task moves to 'Done')",
  },
  {
    trigger: "yes",
    response: "Excellent. I've generated an Agent Spec and Test Plan for you.\n\nReview the spec in the panel on the right. It includes 5 test scenarios that cover the happy path and edge cases.\n\nClick **Confirm & Build** when you're ready to proceed.",
    showSpec: true,
  },
];

export default function NewProject() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content: agentResponses[0].response,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [responseIndex, setResponseIndex] = useState(1);
  const [showArtifact, setShowArtifact] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [artifact, setArtifact] = useState<any>(null);

  const handleSend = useCallback(async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate agent thinking
    await new Promise((r) => setTimeout(r, 1500));

    // Get next response
    const nextResponse = agentResponses[Math.min(responseIndex, agentResponses.length - 1)];
    
    const agentMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "agent",
      content: nextResponse.response,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, agentMessage]);
    setIsLoading(false);
    setResponseIndex((prev) => prev + 1);

    // Show spec artifact if applicable
    if (nextResponse.showSpec) {
      setTimeout(() => {
        setArtifact({
          type: "spec",
          title: "Agent Spec",
          content: mockAgentSpec,
        });
        setShowArtifact(true);
      }, 500);
    }
  }, [responseIndex]);

  const handleArtifactAction = (action: string) => {
    if (action === "confirm") {
      setShowArtifact(false);
      setShowSandbox(true);
    }
  };

  const handleSandboxSelect = (type: "sandbox" | "custom") => {
    toast({
      title: "Environment Ready",
      description: type === "sandbox" 
        ? "Seer Sandbox provisioned. Starting test run..."
        : "Custom credentials configured.",
    });
    
    // Navigate to live run
    setTimeout(() => {
      navigate("/run/demo");
    }, 500);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center gap-4 px-4 border-b border-border shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="h-4 w-px bg-border" />
        <h1 className="font-medium">New Project</h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <motion.div
          className="flex-1 flex flex-col"
          animate={{ width: showArtifact ? "calc(100% - 480px)" : "100%" }}
          transition={{ duration: 0.3 }}
        >
          <ChatInterface
            messages={messages}
            onSend={handleSend}
            isLoading={isLoading}
            placeholder="Describe what you want to build..."
          />
        </motion.div>

        {/* Artifact Panel */}
        <ArtifactPanel
          isOpen={showArtifact}
          onClose={() => setShowArtifact(false)}
          artifact={artifact}
          onAction={handleArtifactAction}
        />
      </div>

      {/* Sandbox Modal */}
      <SandboxModal
        open={showSandbox}
        onOpenChange={setShowSandbox}
        onSelect={handleSandboxSelect}
      />
    </div>
  );
}
