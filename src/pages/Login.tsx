import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Mail } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    // Mock login - store demo user
    setTimeout(() => {
      localStorage.setItem("seer-user", JSON.stringify({ id: "demo-user-id", name: "Demo User", email: "demo@seer.dev" }));
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-border bg-card">
        <CardHeader className="space-y-3 text-center">
          <div className="w-16 h-16 mx-auto rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-primary-foreground">S</span>
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">
            Sign in to Seer Cloud
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Multi-agent AI evaluation system for developers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full h-12 text-base font-medium bg-card hover:bg-muted border border-border/50 text-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            onClick={handleLogin}
            disabled={isLoading}
          >
            <Github className="mr-2 h-5 w-5" />
            {isLoading ? "Signing in..." : "Continue with GitHub"}
          </Button>
          <Button
            className="w-full h-12 text-base font-medium bg-card hover:bg-muted border border-border/50 text-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            onClick={handleLogin}
            disabled={isLoading}
          >
            <Mail className="mr-2 h-5 w-5" />
            {isLoading ? "Signing in..." : "Continue with Email"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
