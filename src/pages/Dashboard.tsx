import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, GitBranch, Activity, Clock } from "lucide-react";

interface Project {
  id: string;
  name: string;
  repository: string;
  status: "active" | "provisioning" | "stopped";
  lastActivity: string;
  agents: string[];
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "payment-service",
    repository: "github.com/demo/payment-service",
    status: "active",
    lastActivity: "2 hours ago",
    agents: ["Evals", "Codex"],
  },
  {
    id: "2",
    name: "auth-api",
    repository: "github.com/demo/auth-api",
    status: "active",
    lastActivity: "5 hours ago",
    agents: ["Evals"],
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>(mockProjects);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "provisioning":
        return "bg-warning/10 text-warning border-warning/20";
      case "stopped":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground">Manage your AI evaluation projects</p>
          </div>
          <Button
            className="bg-primary text-primary-foreground font-medium shadow-lg hover:opacity-90 transition-all duration-300"
            onClick={() => navigate("/projects/new")}
          >
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <GitBranch className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Get started by creating your first project and provisioning AI agents for evaluation.
              </p>
              <Button
                className="bg-primary text-primary-foreground hover:opacity-90"
                onClick={() => navigate("/projects/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="border border-border bg-card hover:border-foreground/20 transition-all duration-300 hover:shadow-lg cursor-pointer"
                onClick={() => navigate("/console")}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <Badge className={getStatusColor(project.status)} variant="outline">
                      <Activity className="h-3 w-3 mr-1" />
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center text-sm">
                    <GitBranch className="h-3 w-3 mr-1" />
                    {project.repository}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    {project.lastActivity}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.agents.map((agent) => (
                      <Badge key={agent} variant="secondary" className="text-xs">
                        {agent}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
