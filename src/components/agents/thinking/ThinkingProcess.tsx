import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThinkingPhase, ThinkingStep } from "@/lib/agents/langgraphClient";
import { getToolIcon } from "./getToolIcon";
import { formatToolOutput } from "./formatToolOutput";

export function ThinkingProcess({
  phases,
}: {
  phases: ThinkingPhase[];
}) {
  if (phases.length === 0) return null;
  
  return (
    <div className="mb-3 space-y-2">
      {phases.map((phase) => (
        <ThinkingPhaseComponent key={phase.id} phase={phase} />
      ))}
    </div>
  );
}

function ThinkingPhaseComponent({ phase }: { phase: ThinkingPhase }) {
  const [isOpen, setIsOpen] = useState(!phase.isActive); // Open completed phases, closed active ones

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors w-full text-left group">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                phase.isActive ? "bg-seer/20" : "bg-success/20"
              )}
            >
              {phase.isActive ? (
                <Loader2 className="h-3 w-3 text-seer animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3 text-success" />
              )}
            </div>
            <span className="text-sm font-medium text-foreground">
              {phase.isActive ? "Thinking..." : "Processing"}
            </span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2 pl-4 border-l-2 border-border ml-3">
            <AnimatePresence>
              {phase.steps.map((step, index) => {
                const ToolIcon = getToolIcon(step.toolName);
                return (
                  <motion.div
                    key={`${phase.id}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-2 py-2 px-3 rounded-md bg-background/50"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center mt-0.5",
                        step.status === "running" && "bg-seer/20",
                        step.status === "complete" && "bg-success/20",
                        step.status === "error" && "bg-destructive/20",
                        step.status === "pending" && "bg-muted"
                      )}
                    >
                      {step.status === "running" ? (
                        <Loader2 className="h-3 w-3 text-seer animate-spin" />
                      ) : step.status === "complete" ? (
                        <CheckCircle className="h-3 w-3 text-success" />
                      ) : (
                        <ToolIcon className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ToolIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-seer">
                          {step.type === "thinking" ? "💭 thinking" : step.toolName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {step.type === "thinking" 
                            ? "reasoning" 
                            : step.type === "tool_call" 
                            ? "called" 
                            : "returned"}
                        </span>
                      </div>
                      {/* SIMPLIFIED: Only show scratchpad for think tool, just tool name for others */}
                      {step.toolName === "think" && (step.type === "tool_result" || step.type === "thinking") && step.data && (
                        <div className="mt-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded overflow-x-auto">
                          <div className="whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {formatToolOutput(step.toolName, step.data)}
                          </div>
                        </div>
                      )}
                      {/* For non-think tools, don't show data - just the tool name is enough */}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

