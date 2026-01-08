import { BUILT_IN_BLOCKS } from '../constants';
import type { BuiltInBlock, Tool } from '../types';
import { type TriggerListOption } from './TriggerSection';
import { UnifiedBuildPanel } from './UnifiedBuildPanel';

interface BuildPanelProps {
  tools: Tool[];
  isLoadingTools: boolean;
  onBlockSelect?: (block: { type: string; label: string; config?: any }) => void;
  blocks?: BuiltInBlock[];
  selectedWorkflowId?: string | null;
  triggerOptions?: TriggerListOption[];
  isLoadingTriggers?: boolean;
  triggerInfoMessage?: string;
}

export function BuildPanel(props: BuildPanelProps) {
  return <UnifiedBuildPanel {...props} />;
}

