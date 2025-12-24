/**
 * Trace Element Utilities
 * Functions to extract different types of trace elements from checkpoint data
 */

export type TraceElementType = 
  | 'search' 
  | 'tool_call' 
  | 'thinking' 
  | 'human_input' 
  | 'message'
  | 'other';

export interface TraceElement {
  type: TraceElementType;
  content: unknown;
  metadata?: Record<string, unknown>;
  label?: string;
}

/**
 * Extract search queries from checkpoint data
 * Looks for fields like: search, query, search_query, text_search, etc.
 */
export function extractSearchQueries(data: Record<string, unknown>): TraceElement[] {
  const elements: TraceElement[] = [];
  
  // Common search field names
  const searchFields = ['search', 'query', 'search_query', 'text_search', 'searchText', 'searchQuery'];
  
  function traverse(obj: unknown, path: string[] = []): void {
    if (!obj || typeof obj !== 'object') return;
    
    const record = obj as Record<string, unknown>;
    
    // Check for search fields
    for (const field of searchFields) {
      if (field in record && record[field] !== undefined && record[field] !== null) {
        const value = record[field];
        if (typeof value === 'string' && value.trim().length > 0) {
          elements.push({
            type: 'search',
            content: value,
            metadata: { field, path: path.join('.') },
            label: `Search: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`,
          });
        } else if (typeof value === 'object') {
          elements.push({
            type: 'search',
            content: value,
            metadata: { field, path: path.join('.') },
            label: `Search Query`,
          });
        }
      }
    }
    
    // Recursively traverse nested objects
    for (const [key, value] of Object.entries(record)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, [...path, key]);
      }
    }
  }
  
  traverse(data);
  return elements;
}

/**
 * Extract tool calls from checkpoint data (not just from messages)
 * Looks for tool_calls, tool_invocations, tools, etc.
 */
export function extractToolCalls(data: Record<string, unknown>): TraceElement[] {
  const elements: TraceElement[] = [];
  
  function traverse(obj: unknown, path: string[] = []): void {
    if (!obj || typeof obj !== 'object') return;
    
    const record = obj as Record<string, unknown>;
    
    // Check for tool_calls array
    if ('tool_calls' in record && Array.isArray(record.tool_calls)) {
      const toolCalls = record.tool_calls as unknown[];
      for (const toolCall of toolCalls) {
        if (toolCall && typeof toolCall === 'object') {
          const tc = toolCall as Record<string, unknown>;
          elements.push({
            type: 'tool_call',
            content: toolCall,
            metadata: { path: path.join('.') },
            label: typeof tc.name === 'string' ? tc.name : 'Tool Call',
          });
        }
      }
    }
    
    // Check for tool_invocations
    if ('tool_invocations' in record && Array.isArray(record.tool_invocations)) {
      const invocations = record.tool_invocations as unknown[];
      for (const invocation of invocations) {
        if (invocation && typeof invocation === 'object') {
          elements.push({
            type: 'tool_call',
            content: invocation,
            metadata: { path: path.join('.') },
            label: 'Tool Invocation',
          });
        }
      }
    }
    
    // Check for tools array
    if ('tools' in record && Array.isArray(record.tools)) {
      const tools = record.tools as unknown[];
      for (const tool of tools) {
        if (tool && typeof tool === 'object') {
          const t = tool as Record<string, unknown>;
          elements.push({
            type: 'tool_call',
            content: tool,
            metadata: { path: path.join('.') },
            label: typeof t.name === 'string' ? t.name : 'Tool',
          });
        }
      }
    }
    
    // Recursively traverse nested objects (but skip messages to avoid duplicates)
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'messages' && value && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, [...path, key]);
      } else if (key !== 'messages' && Array.isArray(value)) {
        // Check arrays for tool-like objects
        for (const item of value) {
          if (item && typeof item === 'object') {
            const itemRecord = item as Record<string, unknown>;
            if ('name' in itemRecord && ('arguments' in itemRecord || 'input' in itemRecord)) {
              elements.push({
                type: 'tool_call',
                content: item,
                metadata: { path: [...path, key].join('.') },
                label: typeof itemRecord.name === 'string' ? itemRecord.name : 'Tool Call',
              });
            }
          }
        }
      }
    }
  }
  
  traverse(data);
  return elements;
}

/**
 * Extract thinking/internal thoughts from checkpoint data
 * Looks for: thinking, reasoning, internal_thoughts, thoughts, etc.
 */
export function extractThinking(data: Record<string, unknown>): TraceElement[] {
  const elements: TraceElement[] = [];
  
  const thinkingFields = [
    'thinking', 
    'reasoning', 
    'internal_thoughts', 
    'thoughts',
    'internal_reasoning',
    'chain_of_thought',
    'cot',
  ];
  
  function traverse(obj: unknown, path: string[] = []): void {
    if (!obj || typeof obj !== 'object') return;
    
    const record = obj as Record<string, unknown>;
    
    // Check for thinking fields
    for (const field of thinkingFields) {
      if (field in record && record[field] !== undefined && record[field] !== null) {
        const value = record[field];
        if (typeof value === 'string' && value.trim().length > 0) {
          elements.push({
            type: 'thinking',
            content: value,
            metadata: { field, path: path.join('.') },
            label: 'Thinking',
          });
        } else if (Array.isArray(value)) {
          // Array of thoughts
          for (const thought of value) {
            if (typeof thought === 'string' && thought.trim().length > 0) {
              elements.push({
                type: 'thinking',
                content: thought,
                metadata: { field, path: path.join('.') },
                label: 'Thinking',
              });
            }
          }
        } else if (typeof value === 'object') {
          elements.push({
            type: 'thinking',
            content: value,
            metadata: { field, path: path.join('.') },
            label: 'Thinking',
          });
        }
      }
    }
    
    // Recursively traverse nested objects
    for (const [key, value] of Object.entries(record)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, [...path, key]);
      }
    }
  }
  
  traverse(data);
  return elements;
}

/**
 * Extract human/user input from checkpoint data
 * Looks for: input, user_input, human_input, user_query, etc.
 */
export function extractHumanInput(data: Record<string, unknown>): TraceElement[] {
  const elements: TraceElement[] = [];
  
  const inputFields = [
    'input',
    'user_input',
    'human_input',
    'user_query',
    'query',
    'prompt',
    'user_prompt',
  ];
  
  function traverse(obj: unknown, path: string[] = []): void {
    if (!obj || typeof obj !== 'object') return;
    
    const record = obj as Record<string, unknown>;
    
    // Check for input fields (but prioritize non-search contexts)
    for (const field of inputFields) {
      if (field in record && record[field] !== undefined && record[field] !== null) {
        // Skip if this looks like a search query (already handled)
        if (path.includes('search') || path.includes('query')) {
          continue;
        }
        
        const value = record[field];
        if (typeof value === 'string' && value.trim().length > 0) {
          elements.push({
            type: 'human_input',
            content: value,
            metadata: { field, path: path.join('.') },
            label: 'User Input',
          });
        } else if (typeof value === 'object') {
          elements.push({
            type: 'human_input',
            content: value,
            metadata: { field, path: path.join('.') },
            label: 'User Input',
          });
        }
      }
    }
    
    // Recursively traverse nested objects
    for (const [key, value] of Object.entries(record)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, [...path, key]);
      }
    }
  }
  
  traverse(data);
  return elements;
}

/**
 * Extract all trace elements from checkpoint data
 */
export function extractAllTraceElements(
  checkpoint: Record<string, unknown>
): {
  search: TraceElement[];
  toolCalls: TraceElement[];
  thinking: TraceElement[];
  humanInput: TraceElement[];
} {
  const channelValues = (checkpoint.channel_values as Record<string, unknown>) || {};
  const checkpointData = checkpoint;
  
  // Extract from channel_values and checkpoint root
  const allData = { ...channelValues, ...checkpointData };
  
  return {
    search: extractSearchQueries(allData),
    toolCalls: extractToolCalls(allData),
    thinking: extractThinking(allData),
    humanInput: extractHumanInput(allData),
  };
}

