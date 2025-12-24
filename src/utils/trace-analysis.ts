/**
 * Trace Analysis Utility
 * Analyzes trace structures to identify common fields and patterns
 * This helps determine which columns to include in the flattened table view
 */

import { backendApiClient } from '@/lib/api-client';

interface TraceDetail {
  thread_id: string;
  checkpoints: Array<{
    checkpoint_id?: string;
    timestamp: string;
    checkpoint: Record<string, any>;
    config: Record<string, any>;
  }>;
  current_state?: {
    values?: Record<string, any>;
    next?: any;
  };
  metadata?: Record<string, any>;
}

interface FieldFrequency {
  field: string;
  count: number;
  types: Set<string>;
  examples: any[];
}

/**
 * Analyze a single checkpoint to extract field patterns
 */
function analyzeCheckpoint(checkpoint: Record<string, any>, fieldStats: Map<string, FieldFrequency>): void {
  const channelValues = checkpoint.channel_values || {};
  const messages = Array.isArray(channelValues.messages) ? channelValues.messages : [];
  
  // Analyze messages
  messages.forEach((msg: any) => {
    if (msg && typeof msg === 'object') {
      Object.keys(msg).forEach(key => {
        if (!fieldStats.has(key)) {
          fieldStats.set(key, {
            field: key,
            count: 0,
            types: new Set(),
            examples: [],
          });
        }
        const stat = fieldStats.get(key)!;
        stat.count++;
        stat.types.add(typeof msg[key]);
        if (stat.examples.length < 3) {
          stat.examples.push(msg[key]);
        }
      });
    }
  });
  
  // Analyze channel_values
  Object.keys(channelValues).forEach(key => {
    if (key !== 'messages') {
      if (!fieldStats.has(key)) {
        fieldStats.set(key, {
          field: key,
          count: 0,
          types: new Set(),
          examples: [],
        });
      }
      const stat = fieldStats.get(key)!;
      stat.count++;
      stat.types.add(typeof channelValues[key]);
      if (stat.examples.length < 3) {
        stat.examples.push(channelValues[key]);
      }
    }
  });
}

/**
 * Sample traces from backend and analyze common fields
 */
export async function analyzeTracePatterns(sampleSize: number = 10): Promise<Map<string, FieldFrequency>> {
  const fieldStats = new Map<string, FieldFrequency>();
  
  try {
    // Fetch traces list
    const tracesResponse = await backendApiClient.request<{
      traces: Array<{ thread_id: string }>;
      total: number;
    }>('/api/traces?limit=50');
    
    const traces = tracesResponse.traces || [];
    const samplesToAnalyze = traces.slice(0, Math.min(sampleSize, traces.length));
    
    // Analyze each trace
    for (const trace of samplesToAnalyze) {
      try {
        const traceDetail = await backendApiClient.request<TraceDetail>(
          `/api/traces/${encodeURIComponent(trace.thread_id)}`
        );
        
        // Analyze checkpoints
        traceDetail.checkpoints.forEach(checkpoint => {
          analyzeCheckpoint(checkpoint.checkpoint || {}, fieldStats);
        });
        
        // Analyze current state
        if (traceDetail.current_state?.values) {
          analyzeCheckpoint({ channel_values: traceDetail.current_state.values }, fieldStats);
        }
      } catch (error) {
        console.warn(`Failed to analyze trace ${trace.thread_id}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch traces for analysis:', error);
  }
  
  return fieldStats;
}

/**
 * Get common fields that should be displayed as columns
 * Based on frequency and importance
 */
export function getCommonColumns(fieldStats: Map<string, FieldFrequency>): string[] {
  const commonFields = [
    'id',
    'type',
    'content',
    'timestamp',
    'tool_calls',
    'name',
    'role',
    'inputs',
    'outputs',
    'tokens',
  ];
  
  // Return fields that exist in the stats, ordered by importance
  return commonFields.filter(field => fieldStats.has(field));
}

