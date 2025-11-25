import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Search } from "lucide-react";

interface Memory {
  id: string;
  agentName: string;
  dataset: string;
  hypothesis: string;
  score: number;
  createdAt: string;
}

const mockMemories: Memory[] = [
  {
    id: "1",
    agentName: "Eval Agent",
    dataset: "payment-service-tests",
    hypothesis: "Tests fail when concurrency > 10 due to race condition in transaction handler",
    score: 85,
    createdAt: "2024-01-15 14:30:00",
  },
  {
    id: "2",
    agentName: "Eval Agent",
    dataset: "auth-api-integration",
    hypothesis: "Token refresh logic needs exponential backoff for reliability",
    score: 92,
    createdAt: "2024-01-15 12:15:00",
  },
  {
    id: "3",
    agentName: "Codex",
    dataset: "payment-service-tests",
    hypothesis: "Adding mutex lock improves test stability by 40%",
    score: 78,
    createdAt: "2024-01-15 10:45:00",
  },
  {
    id: "4",
    agentName: "Eval Agent",
    dataset: "user-service-load",
    hypothesis: "Database connection pool exhaustion occurs at 500+ concurrent users",
    score: 88,
    createdAt: "2024-01-14 16:20:00",
  },
  {
    id: "5",
    agentName: "Codex",
    dataset: "auth-api-integration",
    hypothesis: "JWT validation cache reduces latency by 65%",
    score: 95,
    createdAt: "2024-01-14 14:10:00",
  },
];

const Memories = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [memories] = useState<Memory[]>(mockMemories);

  const filteredMemories = memories.filter(
    (memory) =>
      memory.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.dataset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.hypothesis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-success/10 text-success border-success/20";
    if (score >= 75) return "bg-primary/10 text-primary border-primary/20";
    return "bg-warning/10 text-warning border-warning/20";
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Memories</h1>
          <p className="text-muted-foreground">Long-term reflections and learnings from AI agents</p>
        </div>

        <Card className="border border-border/50 bg-card shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Database className="h-4 w-4 text-primary" />
                </div>
                Reflection Store
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border/50"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Agent</TableHead>
                    <TableHead className="font-semibold">Dataset</TableHead>
                    <TableHead className="font-semibold w-[40%]">Hypothesis</TableHead>
                    <TableHead className="font-semibold text-center">Score</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMemories.map((memory) => (
                    <TableRow key={memory.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
                          {memory.agentName}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {memory.dataset}
                      </TableCell>
                      <TableCell className="text-sm">{memory.hypothesis}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getScoreColor(memory.score)} variant="outline">
                          {memory.score}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {memory.createdAt}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filteredMemories.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No memories found matching your search.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Memories;
