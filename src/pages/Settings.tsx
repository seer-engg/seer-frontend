import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Key, Building, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem("seer-user") || "{}");
  
  const [orgName, setOrgName] = useState("Demo Organization");
  const [userName, setUserName] = useState(user.name || "Demo User");
  const [userEmail, setUserEmail] = useState(user.email || "demo@seer.dev");
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and organization preferences</p>
        </div>

        {/* Organization Settings */}
        <Card className="border border-border/50 bg-card shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Manage your organization settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="bg-muted/50 border-border/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card className="border border-border/50 bg-card shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Name</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-muted/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="bg-muted/50 border-border/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="border border-border/50 bg-card shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage your external service API keys</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai">OpenAI API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="openai"
                  type={showOpenAI ? "text" : "password"}
                  value="sk-••••••••••••••••••••••••••••"
                  className="bg-muted/50 border-border/50 font-mono"
                  readOnly
                />
                <Button
                  variant="outline"
                  onClick={() => setShowOpenAI(!showOpenAI)}
                  className="border-border/50"
                >
                  {showOpenAI ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anthropic">Anthropic API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="anthropic"
                  type={showAnthropic ? "text" : "password"}
                  value="sk-••••••••••••••••••••••••••••"
                  className="bg-muted/50 border-border/50 font-mono"
                  readOnly
                />
                <Button
                  variant="outline"
                  onClick={() => setShowAnthropic(!showAnthropic)}
                  className="border-border/50"
                >
                  {showAnthropic ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-primary to-secondary text-primary-foreground"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
