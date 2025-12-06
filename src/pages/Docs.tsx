import { BookOpen, ExternalLink, FileText, Video, MessageCircle, Github } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const resources = [
  {
    title: "Getting Started",
    description: "Learn the basics of Seer and build your first reliable agent",
    icon: FileText,
    href: "#",
  },
  {
    title: "API Reference",
    description: "Complete reference for Seer's APIs and tool schemas",
    icon: BookOpen,
    href: "#",
  },
  {
    title: "Video Tutorials",
    description: "Watch step-by-step guides on common workflows",
    icon: Video,
    href: "#",
  },
  {
    title: "Community",
    description: "Join the Discord to connect with other developers",
    icon: MessageCircle,
    href: "#",
  },
  {
    title: "GitHub",
    description: "View examples and contribute to Seer",
    icon: Github,
    href: "#",
  },
];

export default function Docs() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Documentation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Learn how to build reliable AI agents with Seer
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {resources.map((resource) => (
            <Card key={resource.title} className="hover:border-muted-foreground/50 transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <resource.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{resource.title}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {resource.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-3 w-3" />
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 font-mono text-sm">
              <div className="p-4 rounded-lg bg-terminal text-terminal-foreground">
                <p className="text-muted-foreground mb-2"># Install Seer CLI</p>
                <p>npm install -g @seer/cli</p>
              </div>
              <div className="p-4 rounded-lg bg-terminal text-terminal-foreground">
                <p className="text-muted-foreground mb-2"># Initialize a new project</p>
                <p>seer init my-agent</p>
              </div>
              <div className="p-4 rounded-lg bg-terminal text-terminal-foreground">
                <p className="text-muted-foreground mb-2"># Run tests</p>
                <p>seer test --watch</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
