import { useState } from "react";
import { motion } from "framer-motion";
import {
  Github,
  CheckSquare,
  MessageCircle,
  FileText,
  Layers,
  Mail,
  FileEdit,
  File,
  Clipboard,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tool } from "@/lib/mock-data";

const iconMap: Record<string, React.ComponentType<any>> = {
  Github,
  CheckSquare,
  MessageCircle,
  FileText,
  Layers,
  Mail,
  FileEdit,
  File,
  Clipboard,
};

interface ToolCardProps {
  tool: Tool;
  onInstall: (toolId: string) => void;
}

export function ToolCard({ tool, onInstall }: ToolCardProps) {
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(tool.installed);

  const Icon = iconMap[tool.icon] || FileText;

  const handleInstall = async () => {
    setInstalling(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setInstalling(false);
    setInstalled(true);
    onInstall(tool.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all",
        installed && "border-success/30"
      )}>
        {installed && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-success/20 text-success text-xs">
              Installed
            </Badge>
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              installed ? "bg-success/10" : "bg-secondary"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                installed ? "text-success" : "text-muted-foreground"
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm">{tool.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
              <Badge variant="outline" className="text-[10px] mt-2">
                {tool.category}
              </Badge>
            </div>
          </div>

          {!installed && (
            <Button
              size="sm"
              className="w-full mt-4"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Installing...
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Tool
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
