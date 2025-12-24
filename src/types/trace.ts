/**
 * Type definitions for trace-related data structures
 */

export type FlattenedTraceItemType = 
  | 'human' 
  | 'ai' 
  | 'assistant'
  | 'tool' 
  | 'thinking' 
  | 'search' 
  | 'input'
  | 'system'
  | 'unknown';

export interface FlattenedTraceItem {
  id: string;
  type: FlattenedTraceItemType;
  checkpoint_id?: string;
  checkpoint_index?: number;
  timestamp?: string;
  content?: string | unknown;
  inputs?: unknown;
  outputs?: unknown;
  tokens?: number;
  metadata: Record<string, unknown>;
  // Additional fields that might be present
  [key: string]: unknown;
}

