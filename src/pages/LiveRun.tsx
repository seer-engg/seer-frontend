import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatInterface, VerificationCard } from "@/components/seer/ChatInterface";
import { LiveEnvironment } from "@/components/seer/LiveEnvironment";
import { ArtifactPanel } from "@/components/seer/ArtifactPanel";
import { mockAsanaBoard, mockVerification, mockCodeDiff, type Message } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const runSteps = [
  { type: "thinking", content: "Starting Test Scenario 1: PR with linked Asana task..." },
  { type: "action", content: "Calling github_get_pr(#123)..." },
  { type: "result", content: "Found PR #123: 'Fix login validation'. Author: @devuser" },
  { type: "thinking", content: "Searching for Asana link in PR description..." },
  { type: "result", content: "Found Asana task reference: #45 'Fix login bug'" },
  { type: "action", content: "Calling asana_get_task(45)..." },
  { type: "result", content: "Task #45 found. Current status: 'In Progress'" },
  { type: "thinking", content: "PR is open and task exists. Moving task to 'In Review'..." },
  { type: "action", content: "Calling asana_update_task(45, status='In Review')..." },
  { type: "success", content: "✓ Task #45 moved to 'In Review'" },
  { type: "verify", content: "Verifying state change with Seer Evals..." },
  { type: "verification-result", content: "", isVerification: true },
];

export default function LiveRun() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [moveTask, setMoveTask] = useState<any>(null);
  const [showArtifact, setShowArtifact] = useState(false);
  const [artifact, setArtifact] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<"running" | "passed" | "failed">("running");

  useEffect(() => {
    if (!isRunning || stepIndex >= runSteps.length) return;

    const timer = setTimeout(() => {
      const step = runSteps[stepIndex];
      
      // Handle verification result with embedded component
      if ((step as any).isVerification) {
        const verificationMessage: Message = {
          id: stepIndex.toString(),
          role: 'system',
          content: '',
          timestamp: new Date(),
          component: (
            <VerificationCard
              agentClaim={mockVerification.agentClaim}
              verificationResult={`❌ ${mockVerification.seerResult.actualState}`}
              passed={mockVerification.seerResult.verified}
            />
          ),
        };
        setMessages((prev) => [...prev, verificationMessage]);
        setStepIndex((prev) => prev + 1);
        setTestStatus("failed");
        setIsRunning(false);
        return;
      }

      const newMessage: Message = {
        id: stepIndex.toString(),
        role: step.type === "thinking" ? "agent" : "system",
        content: step.content,
        timestamp: new Date(),
        thinking: step.type === "thinking",
      };

      setMessages((prev) => [...prev, newMessage]);
      setStepIndex((prev) => prev + 1);

      // Trigger board animation on task move
      if (step.content.includes("moved to 'In Review'")) {
        setMoveTask({
          taskId: "2",
          fromColumn: "in-progress",
          toColumn: "review",
        });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [stepIndex, isRunning]);

  const handleShowFix = () => {
    setArtifact({
      type: "code-diff",
      title: "Suggested Fix",
      content: mockCodeDiff,
    });
  };

  const handleArtifactAction = (action: string) => {
    if (action === "merge") {
      toast({
        title: "Fix Applied",
        description: "Code merged. Retrying test scenario...",
      });
      setShowArtifact(false);
      setTestStatus("passed");
    } else if (action === "reject") {
      setShowArtifact(false);
    }
  };

  const handleRestart = () => {
    setMessages([]);
    setStepIndex(0);
    setIsRunning(true);
    setMoveTask(null);
    setShowArtifact(false);
    setTestStatus("running");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tool-orchestrator")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="font-medium">Live Run: GitHub PR Agent</h1>
          <Badge
            variant="secondary"
            className={cn(
              testStatus === "running" && "bg-seer/20 text-seer",
              testStatus === "passed" && "bg-success/20 text-success",
              testStatus === "failed" && "bg-bug/20 text-bug"
            )}
          >
            {testStatus === "running" && "Running..."}
            {testStatus === "passed" && "Passed"}
            {testStatus === "failed" && "Failed"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRunning(!isRunning)}
            disabled={stepIndex >= runSteps.length}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
          {testStatus === "failed" && (
            <Button size="sm" className="bg-seer hover:bg-seer/90" onClick={handleShowFix}>
              Generate Fix
            </Button>
          )}
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Agent Monologue */}
        <motion.div
          className="flex-1 flex flex-col border-r border-border"
          animate={{ width: showArtifact ? "35%" : "50%" }}
        >
          <div className="px-4 py-2 border-b border-border bg-secondary/30">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Agent Execution
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              messages={messages}
              onSend={() => {}}
              isLoading={isRunning && stepIndex < runSteps.length}
              placeholder="Agent is running..."
            />
          </div>
        </motion.div>

        {/* Right: Live Environment */}
        <motion.div
          className="flex-1 flex flex-col"
          animate={{ width: showArtifact ? "35%" : "50%" }}
        >
          <div className="px-4 py-2 border-b border-border bg-secondary/30">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Live Environment
            </span>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            <LiveEnvironment columns={mockAsanaBoard.columns} moveTask={moveTask} />
          </div>
        </motion.div>

        {/* Artifact Panel */}
        <ArtifactPanel
          isOpen={showArtifact}
          onClose={() => setShowArtifact(false)}
          artifact={artifact}
          onAction={handleArtifactAction}
        />
      </div>
    </div>
  );
}
