import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Clock, TrendingUp, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReliabilityChart } from "@/components/seer/ReliabilityChart";
import { mockProjects, mockAgentSpec } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const project = mockProjects.find(p => p.id === id) || mockProjects[0];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-muted-foreground text-sm">{project.description}</p>
          </div>
          <Button onClick={() => navigate("/run/demo")} className="gap-2">
            <Play className="h-4 w-4" />
            Run Tests
          </Button>
        </div>

        {/* Overview Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Reliability Score - Large */}
          <Card className="md:col-span-1 flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-4">Reliability Score</p>
            <ReliabilityChart score={project.reliabilityScore} size="lg" />
            <div className="mt-4 flex items-center gap-2">
              {project.reliabilityScore >= 80 ? (
                <Badge className="bg-success/20 text-success">Healthy</Badge>
              ) : project.reliabilityScore >= 60 ? (
                <Badge className="bg-warning/20 text-warning">Needs Attention</Badge>
              ) : (
                <Badge className="bg-bug/20 text-bug">Critical</Badge>
              )}
            </div>
          </Card>

          {/* Stats */}
          <div className="md:col-span-2 grid gap-4 grid-cols-2 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{project.runs.filter(r => r.status === 'passed').length}</p>
                    <p className="text-xs text-muted-foreground">Passed Runs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-bug/20 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-bug" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{project.runs.filter(r => r.status === 'failed').length}</p>
                    <p className="text-xs text-muted-foreground">Failed Runs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-seer/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-seer" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">2m 15s</p>
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2 md:col-span-3">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium">Flakiness Detected</p>
                      <p className="text-xs text-muted-foreground">Asana Sync module fails 20% of time</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="runs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="runs">Test Runs</TabsTrigger>
            <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
            <TabsTrigger value="tools">Connected Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recent Test Runs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {project.runs.map((run, i) => (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => navigate("/run/demo")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        run.status === 'passed' ? "bg-success" : run.status === 'failed' ? "bg-bug" : "bg-warning animate-pulse"
                      )} />
                      <div>
                        <p className="text-sm font-medium">Run #{run.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {run.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">{run.scenariosPassed}/{run.totalScenarios} passed</p>
                        <p className="text-xs text-muted-foreground">{run.duration}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          run.status === 'passed' && "bg-success/20 text-success",
                          run.status === 'failed' && "bg-bug/20 text-bug",
                          run.status === 'running' && "bg-warning/20 text-warning"
                        )}
                      >
                        {run.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Test Scenarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockAgentSpec.testPlan.map((scenario, i) => (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-mono">
                        {scenario.id}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{scenario.name}</p>
                        <p className="text-xs text-muted-foreground">{scenario.expectation}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {scenario.status}
                    </Badge>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Connected Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {project.tools.map((tool) => (
                    <div
                      key={tool}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className="w-8 h-8 rounded-lg bg-seer/20 flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-seer" />
                      </div>
                      <span className="font-medium text-sm">{tool}</span>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => navigate("/tools")}>
                    + Add Tool
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
