/**
 * Flatten Trace Items Utility
 * Extracts all trace items (messages, tool calls, inputs, etc.) into a flat array
 */

import { FlattenedTraceItem, FlattenedTraceItemType } from '@/types/trace';
import { extractAllTraceElements } from '@/components/trace/trace-element-utils';
import { normalizeMessage } from '@/components/trace/message-utils';

interface Checkpoint {
  checkpoint_id?: string;
  timestamp: string;
  checkpoint: Record<string, any>;
  config: Record<string, any>;
}

interface CurrentState {
  values?: Record<string, any>;
  next?: any;
}

/**
 * Extract inputs from an item (tool call arguments, message content, etc.)
 */
function extractInputs(item: unknown): unknown {
  if (!item || typeof item !== 'object') return undefined;
  
  const obj = item as Record<string, unknown>;
  
  // Tool call arguments
  if ('arguments' in obj) return obj.arguments;
  if ('input' in obj) return obj.input;
  if ('params' in obj) return obj.params;
  
  // Message content as input
  if ('content' in obj && obj.content) return obj.content;
  
  return undefined;
}

/**
 * Extract outputs from an item (tool results, message responses, etc.)
 */
function extractOutputs(item: unknown): unknown {
  if (!item || typeof item !== 'object') return undefined;
  
  const obj = item as Record<string, unknown>;
  
  // Tool result
  if ('result' in obj) return obj.result;
  if ('output' in obj) return obj.output;
  if ('response' in obj) return obj.response;
  
  return undefined;
}

/**
 * Extract token count if available
 */
function extractTokens(item: unknown): number | undefined {
  if (!item || typeof item !== 'object') return undefined;
  
  const obj = item as Record<string, unknown>;
  
  if ('tokens' in obj && typeof obj.tokens === 'number') return obj.tokens;
  if ('token_count' in obj && typeof obj.token_count === 'number') return obj.token_count;
  if ('usage' in obj && typeof obj.usage === 'object') {
    const usage = obj.usage as Record<string, unknown>;
    if ('total_tokens' in usage && typeof usage.total_tokens === 'number') {
      return usage.total_tokens;
    }
  }
  
  return undefined;
}

/**
 * Create metadata object from item, excluding common fields
 */
function createMetadata(item: unknown, commonFields: Set<string>): Record<string, unknown> {
  if (!item || typeof item !== 'object') return {};
  
  const obj = item as Record<string, unknown>;
  const metadata: Record<string, unknown> = {};
  
  Object.keys(obj).forEach(key => {
    if (!commonFields.has(key)) {
      metadata[key] = obj[key];
    }
  });
  
  return metadata;
}

/**
 * Generate a unique ID for an item
 */
function generateItemId(
  type: FlattenedTraceItemType,
  index: number,
  item: unknown,
  checkpointId?: string
): string {
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    if (obj.id && typeof obj.id === 'string') {
      return obj.id;
    }
  }
  
  const prefix = checkpointId ? checkpointId.substring(0, 8) : 'chk';
  return `${prefix}-${type}-${index}`;
}

/**
 * Flatten messages from a messages array
 */
function flattenMessages(
  messages: unknown[],
  checkpointId: string | undefined,
  checkpointIndex: number,
  timestamp: string
): FlattenedTraceItem[] {
  const items: FlattenedTraceItem[] = [];
  const commonFields = new Set(['id', 'type', 'content', 'timestamp', 'tool_calls', 'name', 'role', 'inputs', 'outputs', 'tokens']);
  
  messages.forEach((msg, index) => {
    const normalized = normalizeMessage(msg);
    const itemType: FlattenedTraceItemType = 
      normalized.type === 'assistant' ? 'ai' :
      normalized.type === 'human' ? 'human' :
      normalized.type === 'tool' ? 'tool' :
      normalized.type === 'system' ? 'system' :
      'unknown';
    
    const id = generateItemId(itemType, index, msg, checkpointId);
    
    const flattened: FlattenedTraceItem = {
      id,
      type: itemType,
      checkpoint_id: checkpointId,
      checkpoint_index: checkpointIndex,
      timestamp,
      content: normalized.content,
      inputs: extractInputs(msg),
      outputs: extractOutputs(msg),
      tokens: extractTokens(msg),
      metadata: createMetadata(msg, commonFields),
    };
    
    items.push(flattened);
    
    // If message has tool_calls, create separate items for each tool call
    if (normalized.tool_calls && Array.isArray(normalized.tool_calls)) {
      normalized.tool_calls.forEach((toolCall, tcIndex) => {
        const toolCallId = generateItemId('tool', tcIndex, toolCall, checkpointId);
        const toolCallItem: FlattenedTraceItem = {
          id: toolCallId,
          type: 'tool',
          checkpoint_id: checkpointId,
          checkpoint_index: checkpointIndex,
          timestamp,
          content: toolCall.name,
          inputs: typeof toolCall.arguments === 'object' ? toolCall.arguments : { arguments: toolCall.arguments },
          outputs: undefined,
          tokens: undefined,
          metadata: {
            tool_call_id: toolCall.id,
            parent_message_id: id,
            ...createMetadata(toolCall, commonFields),
          },
        };
        items.push(toolCallItem);
      });
    }
  });
  
  return items;
}

/**
 * Flatten trace elements (search, thinking, human input, tool calls)
 */
function flattenTraceElements(
  elements: Array<{ type: string; content: unknown; metadata?: Record<string, unknown> }>,
  elementType: FlattenedTraceItemType,
  checkpointId: string | undefined,
  checkpointIndex: number,
  timestamp: string
): FlattenedTraceItem[] {
  const items: FlattenedTraceItem[] = [];
  const commonFields = new Set(['id', 'type', 'content', 'timestamp', 'tool_calls', 'name', 'role', 'inputs', 'outputs', 'tokens']);
  
  elements.forEach((element, index) => {
    const id = generateItemId(elementType, index, element.content, checkpointId);
    
    const flattened: FlattenedTraceItem = {
      id,
      type: elementType,
      checkpoint_id: checkpointId,
      checkpoint_index: checkpointIndex,
      timestamp,
      content: element.content,
      inputs: extractInputs(element.content),
      outputs: extractOutputs(element.content),
      tokens: extractTokens(element.content),
      metadata: {
        ...element.metadata,
        ...createMetadata(element.content, commonFields),
      },
    };
    
    items.push(flattened);
  });
  
  return items;
}

/**
 * Flatten all trace items from checkpoints and current state
 */
export function flattenTraceItems(
  checkpoints: Checkpoint[],
  currentState?: CurrentState
): FlattenedTraceItem[] {
  const allItems: FlattenedTraceItem[] = [];
  
  // Process each checkpoint
  checkpoints.forEach((checkpoint, checkpointIndex) => {
    const checkpointId = checkpoint.checkpoint_id;
    const timestamp = checkpoint.timestamp || '';
    const channelValues = checkpoint.checkpoint?.channel_values || {};
    const messages = Array.isArray(channelValues.messages) ? channelValues.messages : [];
    
    // Extract trace elements
    const elements = extractAllTraceElements(checkpoint.checkpoint || {});
    
    // Flatten messages
    const messageItems = flattenMessages(messages, checkpointId, checkpointIndex, timestamp);
    allItems.push(...messageItems);
    
    // Flatten human inputs
    const humanInputItems = flattenTraceElements(
      elements.humanInput,
      'input',
      checkpointId,
      checkpointIndex,
      timestamp
    );
    allItems.push(...humanInputItems);
    
    // Flatten search queries
    const searchItems = flattenTraceElements(
      elements.search,
      'search',
      checkpointId,
      checkpointIndex,
      timestamp
    );
    allItems.push(...searchItems);
    
    // Flatten thinking steps
    const thinkingItems = flattenTraceElements(
      elements.thinking,
      'thinking',
      checkpointId,
      checkpointIndex,
      timestamp
    );
    allItems.push(...thinkingItems);
    
    // Flatten tool calls (standalone, not from messages)
    const toolCallItems = flattenTraceElements(
      elements.toolCalls,
      'tool',
      checkpointId,
      checkpointIndex,
      timestamp
    );
    allItems.push(...toolCallItems);
  });
  
  // Process current state if available
  if (currentState?.values) {
    const stateTimestamp = new Date().toISOString();
    const channelValues = currentState.values;
    const messages = Array.isArray(channelValues.messages) ? channelValues.messages : [];
    
    // Extract trace elements from current state
    const stateData = { channel_values: channelValues, ...channelValues };
    const elements = extractAllTraceElements(stateData);
    
    // Flatten messages from current state
    const messageItems = flattenMessages(messages, undefined, -1, stateTimestamp);
    allItems.push(...messageItems);
    
    // Flatten other elements from current state
    const humanInputItems = flattenTraceElements(
      elements.humanInput,
      'input',
      undefined,
      -1,
      stateTimestamp
    );
    allItems.push(...humanInputItems);
    
    const searchItems = flattenTraceElements(
      elements.search,
      'search',
      undefined,
      -1,
      stateTimestamp
    );
    allItems.push(...searchItems);
    
    const thinkingItems = flattenTraceElements(
      elements.thinking,
      'thinking',
      undefined,
      -1,
      stateTimestamp
    );
    allItems.push(...thinkingItems);
    
    const toolCallItems = flattenTraceElements(
      elements.toolCalls,
      'tool',
      undefined,
      -1,
      stateTimestamp
    );
    allItems.push(...toolCallItems);
  }
  
  // Sort by timestamp and checkpoint index to maintain chronological order
  allItems.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
    }
    
    const indexA = a.checkpoint_index ?? 0;
    const indexB = b.checkpoint_index ?? 0;
    if (indexA !== indexB) return indexA - indexB;
    
    return 0;
  });
  
  return allItems;
}

