import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Loader2, ExternalLink, Mail, FileText, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const steps = [
  "Authenticating (Seer Sandbox)",
  "Fetching Gmail",
  "Processing emails",
  "Writing Doc",
  "Finalizing",
];

export default function Rube() {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [complete, setComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setRunning(true);
    setComplete(false);
    setCurrentStep(0);

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 800));
      setCurrentStep(i + 1);
    }

    await new Promise((r) => setTimeout(r, 500));
    setRunning(false);
    setComplete(true);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-seer to-indigo-500 mb-4">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-semibold">Rube</h1>
          <p className="text-muted-foreground">Quick tasks, instant results</p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Summarize my last 5 Gmails to a Doc..."
              className="h-14 text-lg px-6 pr-24 bg-secondary/50 border-2 focus:border-seer"
              disabled={running}
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              disabled={!input.trim() || running}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run"}
            </Button>
          </div>
        </form>

        {/* Progress */}
        {running && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-seer to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between text-sm">
              {steps.map((step, i) => (
                <span
                  key={step}
                  className={cn(
                    "transition-colors",
                    i < currentStep
                      ? "text-success"
                      : i === currentStep
                      ? "text-seer animate-pulse"
                      : "text-muted-foreground"
                  )}
                >
                  {i < currentStep ? "✓" : i === currentStep ? "●" : "○"}
                </span>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {steps[Math.min(currentStep, steps.length - 1)]}...
            </p>
          </motion.div>
        )}

        {/* Result */}
        {complete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Gmail Summary Document</p>
                    <p className="text-sm text-muted-foreground">Created just now • 5 emails summarized</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open Doc
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
