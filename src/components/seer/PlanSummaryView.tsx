import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Target, Zap, Link as LinkIcon } from "lucide-react";

interface AgentSpec {
  agent_name: string;
  primary_goal: string;
  key_capabilities: string[];
  required_integrations: string[];
  test_scenarios: Array<{
    intent_id: string;
    description: string;
    expected_behavior: string;
    validation_criteria: string[];
    complexity: "simple" | "moderate" | "complex";
  }>;
  assumptions: string[];
  confidence_score: number;
}

interface PlanSummaryViewProps {
  agentSpec: AgentSpec;
}

export function PlanSummaryView({ agentSpec }: PlanSummaryViewProps) {
  const confidenceColor =
    agentSpec.confidence_score >= 0.8
      ? "text-success"
      : agentSpec.confidence_score >= 0.6
      ? "text-warning"
      : "text-destructive";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Agent Specification
            </CardTitle>
            <Badge variant="outline" className={confidenceColor}>
              {Math.round(agentSpec.confidence_score * 100)}% Confidence
            </Badge>
          </div>
          <CardDescription>{agentSpec.agent_name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Primary Goal</h4>
            <p className="text-sm text-muted-foreground">{agentSpec.primary_goal}</p>
          </div>

          {agentSpec.key_capabilities.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Key Capabilities
              </h4>
              <div className="flex flex-wrap gap-2">
                {agentSpec.key_capabilities.map((capability, idx) => (
                  <Badge key={idx} variant="secondary">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {agentSpec.required_integrations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Required Integrations
              </h4>
              <div className="flex flex-wrap gap-2">
                {agentSpec.required_integrations.map((integration, idx) => (
                  <Badge key={idx} variant="outline">
                    {integration}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {agentSpec.assumptions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Assumptions
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {agentSpec.assumptions.map((assumption, idx) => (
                  <li key={idx}>{assumption}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {agentSpec.test_scenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Scenarios</CardTitle>
            <CardDescription>{agentSpec.test_scenarios.length} test scenarios planned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agentSpec.test_scenarios.map((scenario, idx) => (
                <div key={scenario.intent_id} className="border-l-2 border-seer pl-4 py-2">
                  <div className="flex items-start justify-between mb-1">
                    <h5 className="text-sm font-medium">Scenario {idx + 1}</h5>
                    <Badge
                      variant={
                        scenario.complexity === "simple"
                          ? "secondary"
                          : scenario.complexity === "moderate"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {scenario.complexity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Expected:</strong> {scenario.expected_behavior}
                  </p>
                  {scenario.validation_criteria.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold mb-1">Validation Criteria:</p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                        {scenario.validation_criteria.slice(0, 3).map((criterion, cIdx) => (
                          <li key={cIdx}>{criterion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

