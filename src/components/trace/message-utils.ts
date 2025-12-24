/**
 * Message utilities for parsing and normalizing message structures
 * Handles different message formats and extracts metadata
 */

export type MessageType = 'human' | 'assistant' | 'system' | 'tool' | 'unknown';

export interface NormalizedMessage {
  id?: string;
  type: MessageType;
  role?: string;
  content?: string | unknown;
  tool_calls?: ToolCall[];
  name?: string;
  [key: string]: unknown; // Allow additional fields
}

export interface ToolCall {
  id?: string;
  name: string;
  arguments: string | Record<string, unknown>;
  type?: string;
}

/**
 * Check if message contains thinking/internal thoughts
 */
export function hasThinking(message: Record<string, unknown>): boolean {
  const thinkingFields = ['thinking', 'reasoning', 'internal_thoughts', 'thoughts', 'internal_reasoning', 'chain_of_thought', 'cot'];
  
  for (const field of thinkingFields) {
    if (field in message && message[field] !== undefined && message[field] !== null) {
      return true;
    }
  }
  
  // Check content for thinking indicators
  if (message.content && typeof message.content === 'string') {
    const content = message.content.toLowerCase();
    if (content.includes('thinking:') || content.includes('reasoning:') || content.startsWith('thought:')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if message contains search-related content
 */
export function hasSearch(message: Record<string, unknown>): boolean {
  const searchFields = ['search', 'query', 'search_query', 'text_search'];
  
  for (const field of searchFields) {
    if (field in message && message[field] !== undefined && message[field] !== null) {
      return true;
    }
  }
  
  // Check name/type for search indicators
  if (message.name && typeof message.name === 'string') {
    const name = message.name.toLowerCase();
    if (name.includes('search') || name.includes('query')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect message type from message object
 */
export function detectMessageType(message: Record<string, unknown>): MessageType {
  // Check explicit type field
  if (message.type && typeof message.type === 'string') {
    const type = message.type.toLowerCase();
    if (['human', 'assistant', 'system', 'tool'].includes(type)) {
      return type as MessageType;
    }
  }

  // Check role field
  if (message.role && typeof message.role === 'string') {
    const role = message.role.toLowerCase();
    if (role === 'user' || role === 'human') return 'human';
    if (role === 'assistant' || role === 'ai' || role === 'model') return 'assistant';
    if (role === 'system') return 'system';
    if (role === 'tool') return 'tool';
  }

  // Check for tool_calls to infer assistant
  if (message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    return 'assistant';
  }

  // Check name field for tool
  if (message.name && typeof message.name === 'string') {
    const name = message.name.toLowerCase();
    if (name.includes('tool') || name.includes('function')) {
      return 'tool';
    }
  }

  return 'unknown';
}

/**
 * Parse tool calls from message
 * Handles both standard tool_calls array and nested formats
 * Recursively searches through nested structures
 */
export function parseToolCalls(message: Record<string, unknown>): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  const seen = new Set<string>(); // Track seen tool calls to avoid duplicates

  function extractToolCall(toolCall: unknown, path: string[] = []): void {
    if (!toolCall || typeof toolCall !== 'object') return;
    
    const tc = toolCall as Record<string, unknown>;
    const id = typeof tc.id === 'string' ? tc.id : `${path.join('.')}`;
    
    // Avoid duplicates
    if (seen.has(id)) return;
    seen.add(id);
    
    // Check if this looks like a tool call
    if ('name' in tc && (tc.arguments !== undefined || tc.input !== undefined || tc.params !== undefined)) {
      toolCalls.push({
        id: typeof tc.id === 'string' ? tc.id : undefined,
        name: typeof tc.name === 'string' ? tc.name : 'unknown',
        arguments: tc.arguments || tc.input || tc.params || {},
        type: typeof tc.type === 'string' ? tc.type : undefined,
      });
    }
  }

  // Check for tool_calls field (standard location)
  if (message.tool_calls && Array.isArray(message.tool_calls)) {
    for (const toolCall of message.tool_calls) {
      extractToolCall(toolCall);
    }
  }

  // Check for nested json.tool_calls
  if (message.json && typeof message.json === 'object' && message.json !== null) {
    const json = message.json as Record<string, unknown>;
    if (json.tool_calls && Array.isArray(json.tool_calls)) {
      for (const toolCall of json.tool_calls) {
        extractToolCall(toolCall);
      }
    }
  }

  // Check for tool_invocations
  if (message.tool_invocations && Array.isArray(message.tool_invocations)) {
    for (const invocation of message.tool_invocations) {
      extractToolCall(invocation);
    }
  }

  // Recursively search nested objects (but limit depth)
  function searchNested(obj: unknown, depth: number = 0, maxDepth: number = 3): void {
    if (depth > maxDepth || !obj || typeof obj !== 'object') return;
    
    const record = obj as Record<string, unknown>;
    
    // Skip messages array to avoid infinite recursion
    if (Array.isArray(record) || record.messages) return;
    
    // Check for tool-like structures
    for (const [key, value] of Object.entries(record)) {
      if (key === 'tool_calls' || key === 'tool_invocations' || key === 'tools') {
        if (Array.isArray(value)) {
          for (const item of value) {
            extractToolCall(item, [key]);
          }
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively search nested objects
        searchNested(value, depth + 1, maxDepth);
      }
    }
  }

  // Search nested structures (but skip already processed top-level fields)
  searchNested(message, 0, 2);

  return toolCalls;
}

/**
 * Normalize message structure to a consistent format
 */
export function normalizeMessage(message: unknown): NormalizedMessage {
  if (!message || typeof message !== 'object') {
    return {
      type: 'unknown',
      content: String(message),
    };
  }

  const msg = message as Record<string, unknown>;
  const type = detectMessageType(msg);
  const toolCalls = parseToolCalls(msg);

  // Extract content
  let content: string | unknown = msg.content;
  
  // If content is an object, try to stringify it
  if (content !== undefined && typeof content !== 'string') {
    // Keep as object for structured rendering
    content = content;
  }

  return {
    id: typeof msg.id === 'string' ? msg.id : undefined,
    type,
    role: typeof msg.role === 'string' ? msg.role : undefined,
    content,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    name: typeof msg.name === 'string' ? msg.name : undefined,
    ...msg, // Preserve additional fields
  };
}

/**
 * Check if message has renderable content
 */
export function hasRenderableContent(message: NormalizedMessage): boolean {
  if (message.content !== undefined && message.content !== null && message.content !== '') {
    return true;
  }
  if (message.tool_calls && message.tool_calls.length > 0) {
    return true;
  }
  return false;
}

/**
 * Get display title for a message
 */
export function getMessageTitle(message: NormalizedMessage): string {
  if (message.name) return message.name;
  if (message.role) return message.role.charAt(0).toUpperCase() + message.role.slice(1);
  if (message.type !== 'unknown') {
    return message.type.charAt(0).toUpperCase() + message.type.slice(1);
  }
  return 'Message';
}

