import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug } from "lucide-react";

export function IntegrationSelector() {
  return (
    <Card className="bg-muted/30 border-dashed border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Integrations</CardTitle>
      </CardHeader>
      <CardContent className="py-8 flex flex-col items-center gap-2 text-sm text-muted-foreground text-center">
        <Plug className="h-6 w-6 text-muted-foreground" />
        <p>Integration management is coming soon.</p>
      </CardContent>
    </Card>
  );
}

