import { describe, expect, it } from 'vitest';

import type { WorkflowSpec } from '@/types/workflow-spec';
import { workflowSpecToGraph } from '../workflow-graph';

describe('workflowSpecToGraph', () => {
  it('preserves node inputs provided via in_', () => {
    const spec: WorkflowSpec = {
      version: '1',
      inputs: {
        q: { type: 'string', required: false },
        label_ids: { type: 'array', required: false },
        max_emails: { type: 'integer', required: false },
        include_body: { type: 'boolean', required: false },
      },
      nodes: [
        {
          id: 'read_last_emails',
          type: 'tool',
          tool: 'gmail_read_emails',
          in_: {
            q: '${inputs.q}',
            label_ids: '${inputs.label_ids}',
            max_results: '${inputs.max_emails}',
            include_body: '${inputs.include_body}',
          },
          out: 'emails',
        },
        {
          id: 'summarize_emails',
          type: 'llm',
          model: 'gpt-5-mini',
          prompt: 'Summarize emails:\n${emails}',
          in_: {
            emails: '${emails}',
          },
          output: { mode: 'text' },
          out: 'email_summaries',
        },
      ],
      output: '${email_summaries}',
    };

    const graph = workflowSpecToGraph(spec);

    const toolNode = graph.nodes.find(node => node.id === 'read_last_emails');
    const llmNode = graph.nodes.find(node => node.id === 'summarize_emails');

    expect(toolNode?.data?.config?.params?.max_results).toBe('{{inputs.max_emails}}');
    expect(toolNode?.data?.config?.params?.q).toBe('{{inputs.q}}');
    expect(llmNode?.data?.config?.input_refs?.emails).toBe('{{emails}}');
  });
});

