import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileJson, Sparkles, AlertTriangle, CheckCircle, Zap, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArtifactPanel } from "@/components/seer/ArtifactPanel";
import { mockCodeDiff } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const sampleTrace = `{
  "run_id": "run_abc123",
  "steps": [
    {"id": 1, "action": "github_get_pr", "args": {"pr_id": 123}, "result": "success"},
    {"id": 2, "action": "parse_description", "result": "success"},
    {"id": 3, "action": "extract_asana_link", "result": "found: task_45"},
    {"id": 4, "action": "asana_get_task", "args": {"id": 45}, "result": "success"},
    {"id": 5, "action": "asana_update_task", "args": {"ticket_id": 45}, "result": "error", "error": "invalid_argument"}
  ],
  "final_status": "failed"
}`;

export default function TraceAnalyzer() {
  const [traceInput, setTraceInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [insight, setInsight] = useState<any>(null);
  const [showArtifact, setShowArtifact] = useState(false);
  const [artifact, setArtifact] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handlePaste = () => {
    setTraceInput(sampleTrace);
  };

  const handleAnalyze = async () => {
    if (!traceInput.trim()) return;

    setAnalyzing(true);
    
    // Simulate analysis
    await new Promise((r) => setTimeout(r, 2000));

    setInsight({
      status: "failed",
      failedStep: 5,
      summary: "Agent hallucinated tool argument `ticket_id` instead of `task_gid`.",
      rootCause: "Schema mismatch in `asana_update_task` — the Asana API expects `task_gid` but agent used `ticket_id`.",
      suggestion: "Update the tool schema to use correct parameter names.",
    });

    setAnalyzing(false);
  };

  const handleGenerateFix = () => {
    setArtifact({
      type: "code-diff",
      title: "Suggested Fix",
      content: mockCodeDiff,
    });
    setShowArtifact(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleTrace);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex overflow-hidden">
      <motion.div
        className="flex-1 overflow-y-auto scrollbar-thin"
        animate={{ width: showArtifact ? "calc(100% - 480px)" : "100%" }}
      >
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold">Trace Analyzer</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Paste a trace dump to get instant insights and fixes
            </p>
          </div>

          {/* Input Area */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Trace Input</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Sample
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePaste}>
                    Paste Sample
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={traceInput}
                onChange={(e) => setTraceInput(e.target.value)}
                placeholder="Paste your JSON trace here..."
                className="min-h-[200px] font-mono text-xs bg-terminal text-terminal-foreground"
              />
              <Button
                onClick={handleAnalyze}
                disabled={!traceInput.trim() || analyzing}
                className="w-full gap-2"
              >
                {analyzing ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Trace
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Insight Card */}
          <AnimatePresence>
            {insight && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className={cn(
                  "border-2",
                  insight.status === "failed" ? "border-bug/30" : "border-success/30"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {insight.status === "failed" ? (
                          <AlertTriangle className="h-5 w-5 text-bug" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-success" />
                        )}
                        <CardTitle className="text-base">
                          Status: {insight.status === "failed" ? `Failed (Step ${insight.failedStep})` : "Passed"}
                        </CardTitle>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          insight.status === "failed" ? "bg-bug/20 text-bug" : "bg-success/20 text-success"
                        )}
                      >
                        {insight.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</p>
                      <p className="text-sm">{insight.summary}</p>
                    </div>

                    {/* Root Cause */}
                    {insight.rootCause && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Root Cause</p>
                        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                          <p className="text-sm font-mono">{insight.rootCause}</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {insight.status === "failed" && (
                      <Button 
                        className="w-full gap-2 bg-seer hover:bg-seer/90" 
                        onClick={handleGenerateFix}
                      >
                        <Zap className="h-4 w-4" />
                        Generate Fix
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Artifact Panel */}
      <ArtifactPanel
        isOpen={showArtifact}
        onClose={() => setShowArtifact(false)}
        artifact={artifact}
        onAction={(action) => {
          if (action === "merge") {
            setShowArtifact(false);
            setInsight((prev: any) => ({ ...prev, status: "fixed" }));
          }
        }}
      />
    </div>
  );
}
