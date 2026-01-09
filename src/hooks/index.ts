/**
 * Hooks Index
 *
 * Exports all custom hooks for the application.
 */

// Phase 2: Wrapper hooks removed, types moved to stores
// Integration tools - only export helper hook with business logic
export { useToolIntegration } from './useToolIntegration';

// Re-export types from stores for convenience
export type { ToolMetadata, ToolIntegrationStatus } from '@/stores/toolsStore';
export type { WorkflowListItem, WorkflowModel } from '@/stores/workflowStore';


// UI hooks
export { useToast } from './use-toast';
export { useMobile } from './use-mobile';
export { useMediaQuery } from './useMediaQuery';
export { useQueryState } from './useQueryState';
export {useConnectionValidation} from './useConnectionValidation';
export {useCanvasDragDrop} from './useCanvasDragDrop';

