import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Key, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UsageGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsageGateModal({ open, onOpenChange }: UsageGateModalProps) {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate("/settings");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Free Queries Exhausted
          </DialogTitle>
          <DialogDescription>
            You've used all 3 free sample queries. Add your OpenAI API key to continue using Seer agents.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-seer mt-0.5" />
              <div>
                <p className="text-sm font-medium">Add your API Key</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Go to Settings → API Keys to add your OpenAI API key for unlimited queries.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleGoToSettings}>
              <Key className="h-4 w-4 mr-2" />
              Go to Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
