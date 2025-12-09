/**
 * Helper to extract content from object
 */
function extractContent(obj: Record<string, unknown>): string | null {
  if (typeof obj.content === "string" && obj.content.trim()) {
    return obj.content;
  }
  if (typeof obj.output === "string" && obj.output.trim()) {
    return obj.output;
  }
  if (typeof obj.result === "string" && obj.result.trim()) {
    return obj.result;
  }
  if (typeof obj.text === "string" && obj.text.trim()) {
    return obj.text;
  }
  return null;
}

/**
 * Format tool output to be human-readable instead of raw JSON
 * SIMPLIFIED: Only show scratchpad for think tool, just tool name for others
 */
export function formatToolOutput(toolName: string, data: unknown): string {
  const name = toolName.toLowerCase();
  
  // For think tool, extract and show scratchpad
  if (name === "think" || name.includes("think")) {
    if (typeof data === "string") {
      // Extract thought from formatted string like "Thought: <content>"
      const thoughtMatch = data.match(/Thought:\s*(.+?)(?:\nLast tool:|$)/s);
      if (thoughtMatch) {
        return thoughtMatch[1].trim();
      }
      // Also try without "Last tool:" separator
      const thoughtMatch2 = data.match(/Thought:\s*(.+)/s);
      if (thoughtMatch2) {
        return thoughtMatch2[1].trim();
      }
      // Check if it looks like thinking content
      if (data.toLowerCase().includes("scratchpad") || 
          data.toLowerCase().includes("reasoning") ||
          data.toLowerCase().includes("planning") ||
          data.toLowerCase().includes("analyze")) {
        return data;
      }
      // Check for "Current TODOS:" pattern
      const todosMatch = data.match(/Current TODOS:\s*(.+?)(?:\n|$)/s);
      if (todosMatch) {
        return `Current TODOS: ${todosMatch[1].trim()}`;
      }
      return data;
    }
    // Handle object data for think tool
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      const extractedContent = extractContent(obj);
      if (extractedContent) {
        return formatToolOutput("think", extractedContent);
      }
      // Check for scratchpad field
      if (typeof obj.scratchpad === "string" && obj.scratchpad.trim()) {
        return obj.scratchpad;
      }
    }
  }
  
  // For non-think tools, return empty string (we only show tool name, not output)
  return "";
}

