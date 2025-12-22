/**
 * Workflow Chat Assistant Component
 * 
 * Suggests workflows from natural language queries.
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Sparkles } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { WorkflowNodeData } from './WorkflowCanvas';

interface WorkflowChatAssistantProps {
  onWorkflowGenerated?: (nodes: Node<WorkflowNodeData>[], edges: Edge[]) => void;
}

export function WorkflowChatAssistant({
  onWorkflowGenerated,
}: WorkflowChatAssistantProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsGenerating(true);
    
    // Simple workflow suggestion logic
    // In production, this would call an LLM API
    const lowerQuery = query.toLowerCase();
    
    let suggestedNodes: Node<WorkflowNodeData>[] = [];
    let suggestedEdges: Edge[] = [];

    // Example: "summarize my last 5 emails"
    if (lowerQuery.includes('email') && (lowerQuery.includes('summarize') || lowerQuery.includes('summary'))) {
      const countMatch = lowerQuery.match(/(\d+)/);
      const count = countMatch ? parseInt(countMatch[1]) : 5;

      suggestedNodes = [
        {
          id: 'input-1',
          type: 'input',
          position: { x: 100, y: 200 },
          data: {
            type: 'input',
            label: 'Input',
          },
        },
        {
          id: 'gmail-1',
          type: 'tool',
          position: { x: 300, y: 200 },
          data: {
            type: 'tool',
            label: 'Gmail: List Messages',
            config: {
              tool_name: 'GMAIL_LIST_MESSAGES',
              params: { max_results: count },
            },
            oauth_scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          },
        },
        {
          id: 'llm-1',
          type: 'llm',
          position: { x: 500, y: 200 },
          data: {
            type: 'llm',
            label: 'Summarize Emails',
            config: {
              system_prompt: 'You are a helpful assistant that summarizes emails concisely.',
              model: 'gpt-5-mini',
              temperature: 0.2,
            },
          },
        },
        {
          id: 'output-1',
          type: 'output',
          position: { x: 700, y: 200 },
          data: {
            type: 'output',
            label: 'Output',
          },
        },
      ];

      suggestedEdges = [
        { id: 'e1', source: 'input-1', target: 'gmail-1' },
        { id: 'e2', source: 'gmail-1', target: 'llm-1' },
        { id: 'e3', source: 'llm-1', target: 'output-1' },
      ];
    }

    // Add more patterns as needed...

    setTimeout(() => {
      setIsGenerating(false);
      if (suggestedNodes.length > 0 && onWorkflowGenerated) {
        onWorkflowGenerated(suggestedNodes, suggestedEdges);
      } else {
        setSuggestions([
          'Try: "summarize my last 5 emails"',
          'Try: "get GitHub issues and create Asana tasks"',
          'Try: "process data with Python and send to LLM"',
        ]);
      }
    }, 1000);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Workflow Assistant
        </CardTitle>
        <CardDescription>
          Describe your workflow and I'll suggest a structure
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g., summarize my last 5 emails"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <Button onClick={handleSubmit} disabled={isGenerating}>
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>

        {isGenerating && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Generating workflow...
          </div>
        )}

        {suggestions.length > 0 && (
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              <p className="text-sm font-medium">Suggestions:</p>
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="text-sm p-2 bg-muted rounded cursor-pointer hover:bg-accent"
                  onClick={() => {
                    setQuery(suggestion.replace('Try: ', ''));
                    handleSubmit();
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

