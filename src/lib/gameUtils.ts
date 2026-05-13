/**
 * @file src/lib/gameUtils.ts
 * @description Re-exports game rules from the shared directory.
 */
export * from '../../shared/logic/gameRules';

/**
 * Generates a unique ID for system messages to prevent React key collisions.
 */
export function getSystemMessageId(prefix: string = 'sys'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
