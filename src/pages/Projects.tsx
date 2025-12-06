import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReliabilityChart } from "@/components/seer/ReliabilityChart";
import { mockProjects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function Projects() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage and monitor your agent reliability
            </p>
          </div>
          <Button onClick={() => navigate("/projects/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {mockProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card 
                className="hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.description}
                      </p>
                    </div>
                    <ReliabilityChart score={project.reliabilityScore} size="sm" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {project.tools.map((tool) => (
                      <Badge key={tool} variant="secondary" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>

                  {/* Recent Runs */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Recent Runs</p>
                    {project.runs.slice(0, 3).map((run) => (
                      <div key={run.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            run.status === 'passed' ? "bg-success" : run.status === 'failed' ? "bg-bug" : "bg-warning animate-pulse"
                          )} />
                          <span className="text-muted-foreground">{run.duration}</span>
                        </div>
                        <span className="text-xs">
                          {run.scenariosPassed}/{run.totalScenarios} passed
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Insights */}
                  {project.reliabilityScore < 80 && (
                    <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <p className="text-xs text-warning">
                          Flakiness detected in Asana Sync module (fails 20% of time)
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
