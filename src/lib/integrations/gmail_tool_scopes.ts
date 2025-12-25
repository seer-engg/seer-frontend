/**
 * Gmail Tool-to-Scope Mapping
 * 
 * CRITICAL: This mapping is part of Seer's core differentiation.
 * Frontend (closed-source) controls granular OAuth scopes per tool.
 * 
 * Maps Gmail tool names to required OAuth scopes.
 * Backend trusts the scopes requested by frontend.
 */

// Map Gmail tool names to required OAuth scopes
export const GMAIL_TOOL_SCOPES: Record<string, string[]> = {
  // Read-only tools
  "gmail_read_emails": ["https://www.googleapis.com/auth/gmail.readonly"],
  "gmail_get_message": ["https://www.googleapis.com/auth/gmail.readonly"],
  "gmail_list_threads": ["https://www.googleapis.com/auth/gmail.readonly"],
  "gmail_get_thread": ["https://www.googleapis.com/auth/gmail.readonly"],
  "gmail_list_drafts": ["https://www.googleapis.com/auth/gmail.readonly"],
  "gmail_get_draft": ["https://www.googleapis.com/auth/gmail.readonly"],
  "gmail_list_labels": ["https://www.googleapis.com/auth/gmail.readonly"],
  "gmail_get_attachment": ["https://www.googleapis.com/auth/gmail.readonly"],
  
  // Send email tool
  "gmail_send_email": ["https://www.googleapis.com/auth/gmail.send"],
  
  // Compose tools (drafts)
  "gmail_create_draft": ["https://www.googleapis.com/auth/gmail.compose"],
  "gmail_send_draft": ["https://www.googleapis.com/auth/gmail.compose"],
  
  // Modify tools
  "gmail_modify_message_labels": ["https://www.googleapis.com/auth/gmail.modify"],
  "gmail_trash_message": ["https://www.googleapis.com/auth/gmail.modify"],
  "gmail_delete_message": ["https://www.googleapis.com/auth/gmail.modify"],
  "gmail_delete_draft": ["https://www.googleapis.com/auth/gmail.modify"],
  
  // Label management tools
  "gmail_create_label": ["https://www.googleapis.com/auth/gmail.labels"],
  "gmail_delete_label": ["https://www.googleapis.com/auth/gmail.labels"],
  
  // Default fallback (readonly is safest)
  "default": ["https://www.googleapis.com/auth/gmail.readonly"],
};

/**
 * Get required scopes for a Gmail tool.
 * 
 * @param toolName - Gmail tool name
 * @returns Array of required OAuth scopes
 */
export function getGmailToolScopes(toolName: string): string[] {
  return GMAIL_TOOL_SCOPES[toolName] || GMAIL_TOOL_SCOPES.default;
}

