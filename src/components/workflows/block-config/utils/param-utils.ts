/**
 * Utility functions for parameter input handling
 */

/**
 * Parse numeric input value based on type
 */
export function parseNumericInput(
  value: string,
  type: 'integer' | 'number'
): number | string {
  if (!value) return '';
  const parsed = type === 'integer' ? parseInt(value, 10) : parseFloat(value);
  return isNaN(parsed) ? value : parsed;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Safe JSON stringify
 */
export function safeJSONStringify(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
