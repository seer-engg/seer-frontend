import type { CanvasStore } from './canvasStore';
import type { ChatStore } from './chatStore';
import type { IntegrationStore } from './integrationStore';
import type { UIStore } from './uiStore';
import type { WorkflowStore } from './workflowStore';

export interface RootStore {
  canvas: CanvasStore;
  ui: UIStore;
  workflow: WorkflowStore;
  integration: IntegrationStore;
  chat: ChatStore;
}


