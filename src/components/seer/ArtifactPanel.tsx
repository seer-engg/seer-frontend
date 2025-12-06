import { motion, AnimatePresence } from "framer-motion";
import { X, FileCode, FileText, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ArtifactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: {
    type: 'spec' | 'code-diff' | 'trace' | 'verification' | 'test-run';
    title: string;
    content: any;
  } | null;
  onAction?: (action: string) => void;
}

export function ArtifactPanel({ isOpen, onClose, artifact, onAction }: ArtifactPanelProps) {
  if (!artifact) return null;

  const renderContent = () => {
    switch (artifact.type) {
      case 'spec':
        return <SpecView spec={artifact.content} onConfirm={() => onAction?.('confirm')} />;
      case 'code-diff':
        return <CodeDiffView diff={artifact.content} onAction={onAction} />;
      case 'trace':
        return <TraceView trace={artifact.content} onAction={onAction} />;
      case 'verification':
        return <VerificationView data={artifact.content} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 480, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full bg-card border-l border-border flex flex-col overflow-hidden shrink-0"
        >
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {artifact.type === 'spec' && <FileText className="h-4 w-4 text-seer" />}
              {artifact.type === 'code-diff' && <FileCode className="h-4 w-4 text-success" />}
              {artifact.type === 'trace' && <AlertTriangle className="h-4 w-4 text-warning" />}
              {artifact.type === 'verification' && <CheckCircle className="h-4 w-4 text-success" />}
              <span className="font-medium text-sm">{artifact.title}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {renderContent()}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SpecView({ spec, onConfirm }: { spec: any; onConfirm: () => void }) {
  return (
    <div className="space-y-6">
      {/* Goal */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Goal</h3>
        <p className="text-sm">{spec.goal}</p>
      </div>

      {/* Tools */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Required Tools</h3>
        <div className="flex flex-wrap gap-2">
          {spec.tools.map((tool: any, i: number) => (
            <Badge key={i} variant="secondary" className="font-mono text-xs">
              {tool.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Test Plan */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generated Test Plan</h3>
        <div className="space-y-2">
          {spec.testPlan.map((scenario: any, i: number) => (
            <div key={scenario.id} className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{scenario.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expectation: {scenario.expectation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <Button className="w-full gap-2" onClick={onConfirm}>
        <Zap className="h-4 w-4" />
        Confirm & Build
      </Button>
    </div>
  );
}

function CodeDiffView({ diff, onAction }: { diff: any; onAction?: (action: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileCode className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">{diff.filename}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden font-mono text-xs">
        {/* Old code */}
        <div className="bg-bug/10 border-b border-border">
          <div className="px-3 py-1.5 bg-bug/20 text-bug text-xs font-medium">
            − Removed
          </div>
          <pre className="p-3 overflow-x-auto text-bug/80">
            <code>{diff.oldCode}</code>
          </pre>
        </div>

        {/* New code */}
        <div className="bg-success/10">
          <div className="px-3 py-1.5 bg-success/20 text-success text-xs font-medium">
            + Added
          </div>
          <pre className="p-3 overflow-x-auto text-success/80">
            <code>{diff.newCode}</code>
          </pre>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onAction?.('reject')}>
          Reject Fix
        </Button>
        <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => onAction?.('merge')}>
          Merge & Retry
        </Button>
      </div>
    </div>
  );
}

function TraceView({ trace, onAction }: { trace: any; onAction?: (action: string) => void }) {
  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className={cn(
        "p-4 rounded-lg border",
        trace.status === 'failed' ? "bg-bug/10 border-bug/30" : "bg-success/10 border-success/30"
      )}>
        <div className="flex items-center gap-2">
          {trace.status === 'failed' ? (
            <AlertTriangle className="h-5 w-5 text-bug" />
          ) : (
            <CheckCircle className="h-5 w-5 text-success" />
          )}
          <span className={cn(
            "font-medium",
            trace.status === 'failed' ? "text-bug" : "text-success"
          )}>
            Status: {trace.status === 'failed' ? `Failed (Step ${trace.failedStep})` : 'Passed'}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</h3>
        <p className="text-sm">{trace.summary}</p>
      </div>

      {/* Root Cause */}
      {trace.rootCause && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Root Cause</h3>
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-sm font-mono">{trace.rootCause}</p>
          </div>
        </div>
      )}

      {/* Action */}
      {trace.status === 'failed' && (
        <Button className="w-full gap-2 bg-seer hover:bg-seer/90" onClick={() => onAction?.('fix')}>
          <Zap className="h-4 w-4" />
          Generate Fix
        </Button>
      )}
    </div>
  );
}

function VerificationView({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      {/* Agent Claim */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Output</h3>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <p className="text-sm">{data.agentClaim}</p>
        </div>
      </div>

      {/* Seer Verification */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seer Eval Agent</h3>
        <div className={cn(
          "p-4 rounded-lg border",
          data.seerResult.verified ? "bg-success/10 border-success/30" : "bg-bug/10 border-bug/30"
        )}>
          <div className="flex items-start gap-2">
            {data.seerResult.verified ? (
              <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
            ) : (
              <X className="h-5 w-5 text-bug shrink-0 mt-0.5" />
            )}
            <div>
              <p className={cn(
                "font-medium text-sm",
                data.seerResult.verified ? "text-success" : "text-bug"
              )}>
                {data.seerResult.verified ? "✓ Verified" : "✗ Verification Failed"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {data.seerResult.actualState}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Response */}
      {data.seerResult.apiResponse && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actual API Response</h3>
          <pre className="p-3 rounded-lg bg-terminal text-terminal-foreground text-xs font-mono overflow-x-auto">
            {JSON.stringify(data.seerResult.apiResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
