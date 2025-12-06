import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Key, CheckCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SandboxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: 'sandbox' | 'custom') => void;
}

export function SandboxModal({ open, onOpenChange, onSelect }: SandboxModalProps) {
  const [selected, setSelected] = useState<'sandbox' | 'custom'>('sandbox');
  const [provisioning, setProvisioning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (provisioning) {
      const logSequence = [
        "> Provisioning E2B Container...",
        "> Injecting Seer_Asana_Dev_Account...",
        "> Configuring GitHub OAuth token...",
        "> Warming up sandbox environment...",
        "> Ready.",
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < logSequence.length) {
          setLogs((prev) => [...prev, logSequence[i]]);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onSelect(selected);
            onOpenChange(false);
            setProvisioning(false);
            setLogs([]);
          }, 500);
        }
      }, 600);

      return () => clearInterval(interval);
    }
  }, [provisioning, selected, onSelect, onOpenChange]);

  const handleConfirm = () => {
    if (selected === 'sandbox') {
      setProvisioning(true);
    } else {
      onSelect(selected);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Execution Environment</DialogTitle>
          <DialogDescription>
            Select how you want to run your tests
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <RadioGroup
            value={selected}
            onValueChange={(v) => setSelected(v as 'sandbox' | 'custom')}
            className="space-y-3"
          >
            {/* Custom Credentials */}
            <div
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                selected === 'custom'
                  ? "border-primary bg-secondary/50"
                  : "border-border hover:border-muted-foreground"
              )}
              onClick={() => setSelected('custom')}
            >
              <RadioGroupItem value="custom" id="custom" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="custom" className="font-medium cursor-pointer">
                    Connect Custom Credentials
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Use your own API keys for production testing
                </p>
              </div>
            </div>

            {/* Seer Sandbox */}
            <div
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                selected === 'sandbox'
                  ? "border-seer bg-seer/5 glow-seer"
                  : "border-border hover:border-muted-foreground"
              )}
              onClick={() => setSelected('sandbox')}
            >
              <RadioGroupItem value="sandbox" id="sandbox" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-seer" />
                  <Label htmlFor="sandbox" className="font-medium cursor-pointer">
                    Use Seer Sandbox (Safe Mode)
                  </Label>
                  <Badge variant="secondary" className="text-xs bg-seer/20 text-seer">
                    Recommended
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Pre-configured "Dirty Sandbox" with test accounts
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Terminal Logs */}
          {provisioning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-terminal rounded-lg p-3 font-mono text-xs space-y-1"
            >
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "text-terminal-foreground",
                    log.includes("Ready") && "text-success"
                  )}
                >
                  {log}
                </motion.div>
              ))}
              {logs.length < 5 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="animate-pulse">Working...</span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={provisioning}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={provisioning}>
            {provisioning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Provisioning...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
