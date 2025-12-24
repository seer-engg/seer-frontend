/**
 * GitHub MCP Tool-to-Scope Mapping
 * 
 * CRITICAL: This mapping is part of Seer's core differentiation.
 * Frontend (closed-source) controls granular OAuth scopes per tool.
 * 
 * Maps GitHub MCP tool names to required OAuth scopes.
 * Backend trusts the scopes requested by frontend.
 */

// Map GitHub MCP tool names to required OAuth scopes
export const GITHUB_TOOL_SCOPES: Record<string, string[]> = {
  // Read-only PR tools
  "pull_request_read:get": ["repo"], // For private repos, public_repo for public
  "pull_request_read:get_comments": ["repo"],
  "pull_request_read:get_reviews": ["repo"],
  "pull_request_read:get_status": ["repo"],
  "pull_request_read:get_files": ["repo"],
  "pull_request_read:get_diff": ["repo"],
  "pull_request_read:get_sub_issues": ["repo"],
  "list_pull_requests": ["repo"],
  "search_pull_requests": ["repo"],
  
  // Write PR tools (not needed for POC but included for completeness)
  "create_pull_request": ["repo"],
  "update_pull_request": ["repo"],
  "merge_pull_request": ["repo"],
  "pull_request_review_write": ["repo"],
  "update_pull_request_branch": ["repo"],
  "add_comment_to_pending_review": ["repo"],
  "request_copilot_review": ["repo"],
  
  // Issue tools
  "issue_read:get": ["repo"],
  "issue_read:get_comments": ["repo"],
  "issue_read:get_sub_issues": ["repo"],
  "create_issue": ["repo"],
  "update_issue": ["repo"],
  "add_issue_comment": ["repo"],
  "close_issue": ["repo"],
  "reopen_issue": ["repo"],
  
  // Repository tools
  "get_repository": ["repo"],
  "list_repositories": ["repo"],
  "search_repositories": ["repo"],
  "get_repository_contents": ["repo"],
  "get_repository_file": ["repo"],
  
  // Branch tools
  "create_branch": ["repo"],
  "get_branch": ["repo"],
  "list_branches": ["repo"],
  
  // Commit tools
  "get_commit": ["repo"],
  "list_commits": ["repo"],
  "create_commit": ["repo"],
  
  // Default fallback
  "default": ["repo"], // Conservative default
};

/**
 * Get required scopes for a GitHub MCP tool.
 * 
 * @param toolName - GitHub MCP tool name
 * @returns Array of required OAuth scopes
 */
export function getGitHubToolScopes(toolName: string): string[] {
  return GITHUB_TOOL_SCOPES[toolName] || GITHUB_TOOL_SCOPES.default;
}

