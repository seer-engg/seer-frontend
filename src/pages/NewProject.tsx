import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, GitBranch, Settings2, Zap, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const NewProject = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [repository, setRepository] = useState("");
  const [enableCodex, setEnableCodex] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionStep, setProvisionStep] = useState(0);

  const provisionSteps = ["Allocating Node...", "Starting LangGraph Runtime...", "Agents Listening on Ports 8002/8003"];

  const handleProvision = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please provide your OpenAI API key to continue.",
        variant: "destructive",
      });
      return;
    }

    setProvisioning(true);
    
    for (let i = 0; i < provisionSteps.length; i++) {
      setProvisionStep(i);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    toast({
      title: "Agents Provisioned Successfully",
      description: "Your AI agents are now ready for evaluation tasks.",
    });

    setTimeout(() => navigate("/dashboard"), 1000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">New Project</h1>
          <p className="text-muted-foreground">Set up your AI evaluation environment</p>
        </div>

        {!provisioning ? (
          <>
            {step === 1 && (
              <Card className="border border-border/50 bg-card shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <GitBranch className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Step 1: Source</CardTitle>
                      <CardDescription>Connect your repository</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="repo">GitHub Repository URL</Label>
                    <Input
                      id="repo"
                      placeholder="https://github.com/username/repo"
                      value={repository}
                      onChange={(e) => setRepository(e.target.value)}
                      className="bg-muted/50 border-border/50"
                    />
                  </div>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!repository}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                  >
                    Continue
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="border border-border/50 bg-card shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center">
                      <Settings2 className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <CardTitle>Step 2: Agent Configuration</CardTitle>
                      <CardDescription>Configure your AI agents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Eval Agent</p>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            Enabled
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Port 8002 • Deep evaluation mode</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
                      <div className="space-y-1">
                        <p className="font-medium">Coding Agent (Codex)</p>
                        <p className="text-sm text-muted-foreground">Port 8003 • Code generation handoff</p>
                      </div>
                      <Switch checked={enableCodex} onCheckedChange={setEnableCodex} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">
                      OpenAI API Key <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="bg-muted/50 border-border/50 font-mono"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!apiKey} className="flex-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="border border-border/50 bg-card shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <CardTitle>Step 3: Provision</CardTitle>
                      <CardDescription>Deploy your agents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 p-6 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Repository: {repository}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">Agents: Eval Agent{enableCodex && " + Codex"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <span className="font-medium">API Key: Configured</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleProvision} className="flex-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                      <Zap className="mr-2 h-4 w-4" />
                      Deploy Agents
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="border border-border/50 bg-card shadow-lg">
            <CardContent className="py-12">
              <div className="space-y-8 max-w-md mx-auto">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse">
                    <Zap className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold">Provisioning Agents</h3>
                  <p className="text-muted-foreground">{provisionSteps[provisionStep]}</p>
                </div>
                <Progress value={(provisionStep + 1) * 33.33} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NewProject;
