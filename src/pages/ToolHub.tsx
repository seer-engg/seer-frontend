import { useState } from "react";
import { Search, Github, FolderOpen, CheckSquare2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { INTEGRATION_CONFIGS } from "@/lib/composio/integrations";

const SUPPORTED_INTEGRATIONS = [
  {
    id: "github",
    name: "GitHub",
    description: "Manage repositories, pull requests, issues, and code reviews",
    icon: Github,
    category: "Development",
    status: "available" as const,
  },
  {
    id: "googledrive",
    name: "Google Drive",
    description: "Access and manage files, folders, and documents",
    icon: FolderOpen,
    category: "Storage",
    status: "available" as const,
  },
  {
    id: "asana",
    name: "Asana",
    description: "Manage tasks, projects, and team workflows",
    icon: CheckSquare2,
    category: "Project Management",
    status: "available" as const,
  },
];

const SANDBOX_INTEGRATIONS = [
  "Twitter", "Slack", "Discord", "Notion", "Linear", "Jira", "Trello",
  "Airtable", "Zapier", "Stripe", "Shopify", "HubSpot", "Salesforce",
  "Gmail", "Outlook", "Calendly", "Zoom", "Microsoft Teams"
];

export default function ToolHub() {
  const [search, setSearch] = useState("");

  const filteredIntegrations = SUPPORTED_INTEGRATIONS.filter(
    (integration) =>
      integration.name.toLowerCase().includes(search.toLowerCase()) ||
      integration.description.toLowerCase().includes(search.toLowerCase()) ||
      integration.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Tool Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect integrations to extend your agent capabilities
          </p>
        </div>

        {/* Sandbox Info Alert */}
        <Alert className="border-seer/20 bg-seer/5">
          <Info className="h-4 w-4 text-seer" />
          <AlertTitle className="text-seer">Sandbox Mode Available</AlertTitle>
          <AlertDescription className="text-sm mt-1">
            Seer supports sandboxed testing for <strong>15+ integration systems</strong> including{" "}
            {SANDBOX_INTEGRATIONS.slice(0, 8).join(", ")}, and more. Use sandbox mode to explore
            integrations without connecting your accounts. Available in Orchestrator and Evals.
          </AlertDescription>
        </Alert>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="pl-10"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Available Integrations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map((integration) => {
              const config = INTEGRATION_CONFIGS[integration.id as keyof typeof INTEGRATION_CONFIGS];
              const Icon = integration.icon;
              
              return (
                <Card key={integration.id} className="hover:border-seer/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-seer/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-seer" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {integration.category}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Available
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Use this integration in <strong>Orchestrator</strong> or <strong>Evals</strong> by
                        selecting it from the integrations dropdown.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {filteredIntegrations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No integrations found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
