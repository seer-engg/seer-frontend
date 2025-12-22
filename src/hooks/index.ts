/**
 * Hooks Index
 * 
 * Exports all custom hooks for the application.
 */

// Integration tools
export { 
  useIntegrationTools, 
  useToolIntegration,
  type ToolMetadata,
  type ToolIntegrationStatus,
} from './useIntegrationTools';

// Workflow
export { useWorkflowBuilder, type Workflow, type WorkflowExecution } from './useWorkflowBuilder';
export { useWorkflow } from './useWorkflow';

// User/Auth
export { useDefaultUser, DEFAULT_USER, type DefaultUserInfo } from './useDefaultUser';

// UI hooks
export { useToast } from './use-toast';
export { useMobile } from './use-mobile';
export { useMediaQuery } from './useMediaQuery';
export { useQueryState } from './useQueryState';
export { useUsageGate } from './useUsageGate';
export { useFileUpload } from './use-file-upload';
export { useAgentStream } from './useAgentStream';

