import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToolCard } from "@/components/seer/ToolCard";
import { mockTools } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function ToolHub() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filteredTools = mockTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleInstall = (toolId: string) => {
    const tool = mockTools.find((t) => t.id === toolId);
    toast({
      title: "Tool Installed",
      description: `${tool?.name} has been added. Rebuilding graph...`,
    });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Tool Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add capabilities to your agents
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="pl-10"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onInstall={handleInstall} />
          ))}
        </div>
      </div>
    </div>
  );
}
