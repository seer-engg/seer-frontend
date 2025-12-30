import React from 'react';
import { ArrowRight, Code, FunctionSquare, GitBranch, Repeat, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { BuiltInBlock } from './types';

const BLOCK_ICON_COMPONENTS: Record<string, LucideIcon> = {
  llm: Sparkles,
  code: Code,
  if_else: GitBranch,
  for_loop: Repeat,
  input: ArrowRight,
  variable: FunctionSquare,
};

export function getBlockIconForType(blockType: string): React.ReactNode {
  const Icon = BLOCK_ICON_COMPONENTS[blockType] ?? Sparkles;
  return <Icon className="w-4 h-4" />;
}

export const BUILT_IN_BLOCKS: BuiltInBlock[] = [
  {
    type: 'llm',
    label: 'LLM',
    description: 'Invoke LLM with system prompt',
    icon: getBlockIconForType('llm'),
  },
  {
    type: 'if_else',
    label: 'If/Else',
    description: 'Conditional logic',
    icon: getBlockIconForType('if_else'),
  },
  {
    type: 'for_loop',
    label: 'For Loop',
    description: 'Iterate over array',
    icon: getBlockIconForType('for_loop'),
  },
  {
    type: 'input',
    label: 'Input',
    description: 'Workflow entry point',
    icon: getBlockIconForType('input'),
  },
];

