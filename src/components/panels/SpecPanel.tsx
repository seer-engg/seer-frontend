import { useMemo, useState } from 'react';
import { SpecResponse } from '@/types/workflow';
import { Send, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SpecPanelProps {
  spec: SpecResponse | null;
  statusMessage?: {
    type: 'info' | 'error';
    message: string;
  } | null;
  onFeedback: (feedback: string) => void;
}

const hasSpecContent = (spec: SpecResponse | null) => {
  if (!spec) return false;
  return Boolean(
    spec.langgraph_agent_id?.trim() ||
      spec.mcp_services?.length ||
      spec.functional_requirements?.length,
  );
};

export function SpecPanel({ spec, statusMessage, onFeedback }: SpecPanelProps) {
  const [feedback, setFeedback] = useState('');
  const showSpecData = useMemo(() => hasSpecContent(spec), [spec]);

  const handleSubmit = () => {
    if (feedback.trim()) {
      onFeedback(feedback);
      setFeedback('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <FileText className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Current Spec</span>
      </div>

      {/* Specs list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showSpecData && spec ? (
          <>
            <div className="p-4 rounded-lg border border-border bg-muted/40">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">LangGraph Agent ID</p>
              <p className="text-base font-semibold text-foreground mt-1">
                {spec.langgraph_agent_id || 'Not provided'}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">MCP Services</p>
                  <p className="text-xs text-muted-foreground">Capabilities required for this workflow</p>
                </div>
                {spec.mcp_services?.length ? (
                  <span className="text-xs text-muted-foreground">{spec.mcp_services.length} services</span>
                ) : null}
              </div>
              {spec.mcp_services?.length ? (
                <div className="flex flex-wrap gap-2">
                  {spec.mcp_services.map((service) => (
                    <Badge key={service} variant="outline" className="bg-background/60">
                      {service}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No MCP services specified.</p>
              )}
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Functional Requirements</p>
                <p className="text-xs text-muted-foreground">What the agent must accomplish</p>
              </div>
              {spec.functional_requirements?.length ? (
                <ol className="space-y-3">
                  {spec.functional_requirements.map((requirement, index) => (
                    <li
                      key={`${requirement}-${index}`}
                      className="flex gap-3 rounded-md border border-border/60 bg-background/80 p-3"
                    >
                      <span className="text-xs font-semibold text-muted-foreground mt-0.5">
                        {index + 1}.
                      </span>
                      <span className="text-sm text-foreground">{requirement}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground italic">No functional requirements provided.</p>
              )}
            </div>
          </>
        ) : (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center border border-dashed border-border rounded-lg p-6 text-muted-foreground">
            <AlertCircle
              className={`w-6 h-6 mb-3 ${
                statusMessage?.type === 'error' ? 'text-destructive' : 'text-muted-foreground'
              }`}
            />
            <p className="text-sm font-medium text-foreground">
              {statusMessage?.message ?? 'No specification data available yet.'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Spec details will appear here once generated.
            </p>
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Provide feedback on the spec</p>
        <div className="flex gap-2">
          <Input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Type your feedback..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <Button size="icon" onClick={handleSubmit}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
