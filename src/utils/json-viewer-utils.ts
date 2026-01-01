/**
 * Extracts meaningful content from nested JSON structures
 * Removes unnecessary wrappers like root.llm.summary, root.llm.content, etc.
 */

/**
 * Checks if a value is a plain object (not array, null, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Checks if an object has only metadata/unhelpful keys
 */
function isMetadataOnly(obj: Record<string, unknown>): boolean {
  const metadataKeys = ['id', 'type', 'response_metadata', 'additional_kwargs'];
  const keys = Object.keys(obj);
  return keys.length > 0 && keys.every(key => metadataKeys.includes(key));
}

/**
 * Extracts meaningful content from nested JSON structures
 * 
 * Examples:
 * - {root: {llm: {summary: [...]}}} → extracts summary array
 * - {root: {llm: {content: "..."}}} → extracts content
 * - {messages: [...]} → returns as-is (already meaningful)
 * - {root: {llm: {id, type, summary: []}}} → extracts summary if present, otherwise content
 */
export function extractRelevantContent(data: unknown): unknown {
  // Handle null/undefined/primitives
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  // Arrays are already flat, return as-is
  if (Array.isArray(data)) {
    return data;
  }

  if (!isPlainObject(data)) {
    return data;
  }

  const keys = Object.keys(data);
  
  // Empty object
  if (keys.length === 0) {
    return data;
  }

  // Single key at root - check if we should extract it
  if (keys.length === 1) {
    const [key] = keys;
    const value = data[key];
    
    // If root has a single key and value is object/array, check if we should extract
    if (isPlainObject(value) || Array.isArray(value)) {
      // Common wrapper patterns: root, data, result, content, output
      const wrapperKeys = ['root', 'data', 'result', 'content', 'output', 'input'];
      if (wrapperKeys.includes(key)) {
        // Recursively extract from the nested value
        return extractRelevantContent(value);
      }
    }
  }

  // Check for root.llm pattern
  if (data.root && isPlainObject(data.root)) {
    const rootValue = data.root;
    
    // Check for llm key
    if (rootValue.llm && isPlainObject(rootValue.llm)) {
      const llmValue = rootValue.llm;
      
      // Priority: summary > content > full llm object
      if (Array.isArray(llmValue.summary) && llmValue.summary.length > 0) {
        return llmValue.summary;
      }
      
      if (llmValue.content !== undefined) {
        return llmValue.content;
      }
      
      // If llm only has metadata (id, type, empty summary), try to extract something meaningful
      if (isMetadataOnly(llmValue)) {
        // Return the llm object itself if it's just metadata
        return llmValue;
      }
      
      // Otherwise return the llm object (it has meaningful content)
      return llmValue;
    }
    
    // If root has other meaningful keys, extract from root
    if (Object.keys(rootValue).length > 0) {
      return extractRelevantContent(rootValue);
    }
  }

  // Check for other common wrapper patterns
  const wrapperPatterns = ['data', 'result', 'response', 'payload'];
  for (const pattern of wrapperPatterns) {
    if (data[pattern] !== undefined) {
      const wrappedValue = data[pattern];
      // If wrapped value is object/array and current object is mostly metadata, extract
      if ((isPlainObject(wrappedValue) || Array.isArray(wrappedValue)) && isMetadataOnly(data)) {
        return extractRelevantContent(wrappedValue);
      }
    }
  }

  // No extraction needed - data is already meaningful
  return data;
}

