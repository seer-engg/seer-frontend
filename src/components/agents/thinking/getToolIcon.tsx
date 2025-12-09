import {
  Search,
  Calculator,
  FileText,
  CheckCircle,
  Key,
  Wrench,
} from "lucide-react";

export function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("search")) return Search;
  if (name.includes("calc")) return Calculator;
  if (name.includes("file") || name.includes("doc")) return FileText;
  if (name.includes("think")) return FileText;
  if (name.includes("todo")) return CheckCircle;
  if (name.includes("user_input") || name.includes("request")) return Key;
  return Wrench;
}

