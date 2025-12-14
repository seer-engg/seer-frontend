import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings2, Key, Building, User, Trash2, Eye, EyeOff, CheckCircle, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { restartOnboardingTour } from "@/components/OnboardingTour";
import { useUser } from "@clerk/clerk-react";
import { getApiKey } from "@/lib/api-key";

export default function Settings() {
  const { toast } = useToast();
  const { user, isLoaded } = useUser();
  
  const [orgName, setOrgName] = useState("Demo Organization");
  const [openaiKey, setOpenaiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    const existing = getApiKey();
    if (existing) {
      setHasExistingKey(true);
      setOpenaiKey("sk-••••••••••••••••••••••••");
    } else {
      setHasExistingKey(false);
      setOpenaiKey("");
    }
  }, [isLoaded, user?.id]);

  const handleSaveApiKey = async () => {
    if (!isLoaded || !user || !openaiKey.startsWith("sk-")) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid OpenAI API key starting with 'sk-'",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    let error: unknown = null;
    try {
      window.localStorage.setItem("lg:chat:apiKey", openaiKey);
    } catch (e) {
      error = e;
    }
    setIsSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save API key to this browser. Please try again.",
        variant: "destructive",
      });
    } else {
      setHasExistingKey(true);
      setOpenaiKey("sk-••••••••••••••••••••••••");
      setShowApiKey(false);
      toast({
        title: "API Key Saved",
        description: "Your OpenAI API key has been saved in this browser.",
      });
    }
  };

  const handleRemoveApiKey = async () => {
    if (!isLoaded || !user) return;

    setIsSaving(true);
    let error: unknown = null;
    try {
      window.localStorage.removeItem("lg:chat:apiKey");
    } catch (e) {
      error = e;
    }
    setIsSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove API key. Please try again.",
        variant: "destructive",
      });
    } else {
      setHasExistingKey(false);
      setOpenaiKey("");
      toast({
        title: "API Key Removed",
        description: "Your OpenAI API key has been removed.",
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin" data-tour="settings-page">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-seer/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-seer" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription>Your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={user?.fullName || ""}
                    disabled
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={user?.primaryEmailAddress?.emailAddress || ""}
                    disabled
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Profile information is managed through your OAuth provider.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Organization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Building className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Organization</CardTitle>
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
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Appearance</CardTitle>
                  <CardDescription>Customize your experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
                </div>
                <ThemeSwitcher />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Onboarding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-seer/10 flex items-center justify-center">
                  <PlayCircle className="h-5 w-5 text-seer" />
                </div>
                <div>
                  <CardTitle className="text-base">Onboarding</CardTitle>
                  <CardDescription>Take the guided tour again</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Take the guided tour again to refresh your memory about Seer's features and navigation.
                </p>
                <Button
                  onClick={() => {
                    restartOnboardingTour();
                    toast({
                      title: "Tour Restarted",
                      description: "The onboarding tour will begin shortly.",
                    });
                  }}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Restart Tour
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* API Keys */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Key className="h-5 w-5 text-success" />
                </div>
                <div>
                  <CardTitle className="text-base">API Keys</CardTitle>
                  <CardDescription>Manage external service credentials</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">OpenAI</p>
                      {hasExistingKey && (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasExistingKey ? "API key configured" : "Required for unlimited agent queries"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openaiKey">API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="openaiKey"
                        type={showApiKey ? "text" : "password"}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button 
                      onClick={handleSaveApiKey} 
                      disabled={isSaving || !openaiKey.startsWith("sk-")}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                  {hasExistingKey && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveApiKey}
                      className="text-bug hover:text-bug"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove API Key
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium">Anthropic</p>
                  <p className="text-xs text-muted-foreground">Not configured</p>
                </div>
                <Button variant="outline" size="sm" disabled>Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-bug/30">
            <CardHeader>
              <CardTitle className="text-base text-bug">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <div className="flex justify-end pb-6">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
