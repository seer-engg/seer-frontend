import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Console = () => {
  const { toast } = useToast();
  const [task, setTask] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<"idle" | "plan" | "execute" | "assert" | "reflect">("idle");

  const executionSteps = ["plan", "execute", "assert", "reflect"];
  const mockLogs = [
    "[Eval Agent] ▶️  Starting container environment...",
    "[Eval Agent] 📦 Installing dependencies...",
    "[Eval Agent] 🧪 Running test suite...",
    "[Codex] 🔄 Analyzing test failures...",
    "[Codex] ✍️  Generating code improvements...",
    "[Eval Agent] 🔍 Validating changes...",
    "[Codex] 📝 Creating pull request...",
    "[Eval Agent] ✅ Test pass rate: 92%",
    "[Eval Agent] 💾 Storing reflection in memory...",
  ];

  useEffect(() => {
    if (isRunning) {
      const stepInterval = setInterval(() => {
        const currentStepIndex = executionSteps.indexOf(currentStep);
        if (currentStepIndex < executionSteps.length - 1) {
          setCurrentStep(executionSteps[currentStepIndex + 1] as typeof currentStep);
        } else {
          setCurrentStep("plan");
          setAttempt((prev) => prev + 1);
        }
      }, 2000);

      const logInterval = setInterval(() => {
        if (logs.length < mockLogs.length) {
          setLogs((prev) => [...prev, mockLogs[prev.length]]);
        }
      }, 1500);

      return () => {
        clearInterval(stepInterval);
        clearInterval(logInterval);
      };
    }
  }, [isRunning, currentStep, logs.length]);

  const handleStart = () => {
    if (!task.trim()) {
      toast({
        title: "Task Required",
        description: "Please describe the evaluation task before starting.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setAttempt(1);
    setLogs([]);
    setCurrentStep("plan");
    toast({
      title: "Eval Loop Started",
      description: "Agents are now working on your task...",
    });
  };

  const handleStop = () => {
    setIsRunning(false);
    setCurrentStep("idle");
    toast({
      title: "Eval Loop Stopped",
      description: "Execution halted by user.",
    });
  };

  const getStepColor = (step: string) => {
    if (currentStep === step) return "bg-primary text-primary-foreground shadow-lg shadow-primary/20";
    if (executionSteps.indexOf(currentStep) > executionSteps.indexOf(step))
      return "bg-success/20 text-success border border-success/30";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Seer Console</h1>
            <p className="text-muted-foreground">Deep evaluation with iterative improvement</p>
          </div>
          {isRunning && (
            <Badge className="bg-success/10 text-success border-success/20 px-4 py-2 text-base">
              <Activity className="h-4 w-4 mr-2 animate-pulse" />
              Running Attempt #{attempt}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card className="border border-border/50 bg-card shadow-lg h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Play className="h-4 w-4 text-primary" />
                </div>
                New Evaluation Task
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe the coding task or test case you want to evaluate..."
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="min-h-[200px] bg-muted/50 border-border/50 font-mono text-sm resize-none"
                disabled={isRunning}
              />
              {!isRunning ? (
                <Button
                  onClick={handleStart}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                  disabled={!task.trim()}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Eval Loop
                </Button>
              ) : (
                <Button onClick={handleStop} variant="destructive" className="w-full">
                  <Square className="mr-2 h-4 w-4" />
                  Stop Execution
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Execution Panel */}
          <Card className="border border-border/50 bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-secondary" />
                </div>
                Live Execution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Graph Visualization */}
              <div className="flex items-center justify-between gap-4">
                {executionSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <Badge className={`${getStepColor(step)} px-4 py-2 transition-all duration-300`}>
                      {step}
                    </Badge>
                    {index < executionSteps.length - 1 && (
                      <div
                        className={`w-8 h-0.5 ${
                          executionSteps.indexOf(currentStep) > index ? "bg-success" : "bg-border"
                        } transition-colors duration-300`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Terminal Logs */}
              <div className="bg-terminal rounded-lg border border-border/50 p-4 h-[400px] overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">Waiting for execution to start...</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => (
                      <div key={index} className="text-terminal-foreground animate-in fade-in duration-300">
                        {log}
                      </div>
                    ))}
                    {isRunning && (
                      <div className="flex items-center gap-2 text-primary animate-pulse">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        Processing...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Console;
