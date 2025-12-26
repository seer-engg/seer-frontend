import React from 'react';
import { ArrowRight, Code, GitBranch, Repeat, Sparkles } from 'lucide-react';

import type { BuiltInBlock } from './types';

export const BUILT_IN_BLOCKS: BuiltInBlock[] = [
  {
    type: 'llm',
    label: 'LLM',
    description: 'Invoke LLM with system prompt',
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    type: 'code',
    label: 'Code',
    description: 'Execute Python code',
    icon: <Code className="w-4 h-4" />,
  },
  {
    type: 'if_else',
    label: 'If/Else',
    description: 'Conditional logic',
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    type: 'for_loop',
    label: 'For Loop',
    description: 'Iterate over array',
    icon: <Repeat className="w-4 h-4" />,
  },
  {
    type: 'input',
    label: 'Input',
    description: 'Workflow entry point',
    icon: <ArrowRight className="w-4 h-4" />,
  },
];

