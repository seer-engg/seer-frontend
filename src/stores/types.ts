import type { CanvasStore } from './canvasStore';
import type { ChatStore } from './chatStore';
import type { ToolsStore } from './toolsStore';
import type { TriggersStore } from './triggersStore';
import type { UIStore } from './uiStore';
import type { WorkflowStore } from './workflowStore';

export interface RootStore {
  canvas: CanvasStore;
  ui: UIStore;
  workflow: WorkflowStore;
  tools: ToolsStore;
  triggers: TriggersStore;
  chat: ChatStore;
}


