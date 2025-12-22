/**
 * Block Configuration Panel
 * 
 * Right sidebar panel for configuring selected block.
 * Supports editing parameters, Python code, and OAuth scopes.
 */
import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OAuthScopeSelector, ProviderType } from './OAuthScopeSelector';
import { WorkflowNodeData, BlockType } from './WorkflowCanvas';
import { Code, Save } from 'lucide-react';

interface BlockConfigPanelProps {
  node: Node<WorkflowNodeData> | null;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
}

export function BlockConfigPanel({ node, onUpdate }: BlockConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [pythonCode, setPythonCode] = useState('');
  const [oauthScope, setOAuthScope] = useState<string | undefined>();

  useEffect(() => {
    if (node) {
      setConfig(node.data.config || {});
      setPythonCode(node.data.python_code || '');
      setOAuthScope(node.data.oauth_scope);
    }
  }, [node]);

  if (!node) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a block to configure
      </div>
    );
  }

  const handleSave = () => {
    if (node) {
      onUpdate(node.id, {
        config,
        python_code: pythonCode,
        oauth_scope: oauthScope,
      });
    }
  };

  const renderConfigFields = () => {
    const blockType = node.data.type;

    switch (blockType) {
      case 'tool':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tool-name">Tool Name</Label>
              <Input
                id="tool-name"
                value={config.tool_name || ''}
                onChange={(e) =>
                  setConfig({ ...config, tool_name: e.target.value })
                }
                placeholder="e.g., GMAIL_LIST_MESSAGES"
              />
            </div>
            <div>
              <Label htmlFor="tool-params">Parameters (JSON)</Label>
              <Textarea
                id="tool-params"
                value={JSON.stringify(config.params || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const params = JSON.parse(e.target.value);
                    setConfig({ ...config, params });
                  } catch {
                    // Invalid JSON, keep as is
                  }
                }}
                placeholder='{"max_results": 5}'
                className="font-mono text-xs"
                rows={4}
              />
            </div>
            <OAuthScopeSelector
              provider={getProviderFromTool(config.tool_name)}
              value={getScopeLevel(oauthScope)}
              onChange={setOAuthScope}
            />
          </div>
        );

      case 'code':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="python-code" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Python Code
              </Label>
              <Textarea
                id="python-code"
                value={pythonCode}
                onChange={(e) => setPythonCode(e.target.value)}
                placeholder="# Your Python code here&#10;result = input_data * 2"
                className="font-mono text-xs"
                rows={12}
              />
            </div>
          </div>
        );

      case 'llm':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={config.system_prompt || ''}
                onChange={(e) =>
                  setConfig({ ...config, system_prompt: e.target.value })
                }
                placeholder="You are a helpful assistant..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Select
                value={config.model || 'gpt-5-mini'}
                onValueChange={(value) =>
                  setConfig({ ...config, model: value })
                }
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                  <SelectItem value="gpt-5">GPT-5</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature || 0.2}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    temperature: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>
        );

      case 'if_else':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="condition">Condition Expression</Label>
              <Input
                id="condition"
                value={config.condition || ''}
                onChange={(e) =>
                  setConfig({ ...config, condition: e.target.value })
                }
                placeholder="e.g., len(emails) > 0"
                className="font-mono"
              />
            </div>
          </div>
        );

      case 'for_loop':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="array-var">Array Variable Name</Label>
              <Input
                id="array-var"
                value={config.array_var || ''}
                onChange={(e) =>
                  setConfig({ ...config, array_var: e.target.value })
                }
                placeholder="e.g., emails"
              />
            </div>
            <div>
              <Label htmlFor="item-var">Item Variable Name</Label>
              <Input
                id="item-var"
                value={config.item_var || 'item'}
                onChange={(e) =>
                  setConfig({ ...config, item_var: e.target.value })
                }
                placeholder="e.g., email"
              />
            </div>
          </div>
        );

      case 'variable':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="var-name">Variable Name</Label>
              <Input
                id="var-name"
                value={config.name || ''}
                onChange={(e) =>
                  setConfig({ ...config, name: e.target.value })
                }
                placeholder="e.g., email_count"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No configuration available for this block type.
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{node.data.label}</CardTitle>
          <CardDescription className="capitalize">
            {node.data.type.replace('_', ' ')} Block
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderConfigFields()}
          <Button onClick={handleSave} className="w-full" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function getProviderFromTool(toolName: string | undefined): ProviderType {
  if (!toolName) return 'gmail';
  const upper = toolName.toUpperCase();
  if (upper.startsWith('GMAIL')) return 'gmail';
  if (upper.startsWith('GITHUB')) return 'github';
  if (upper.startsWith('GOOGLEDRIVE')) return 'googledrive';
  return 'gmail';
}

function getScopeLevel(scope: string | undefined): 'readonly' | 'read' | 'write' | 'full' | 'admin' | undefined {
  if (!scope) return undefined;
  if (scope.includes('readonly') || scope.includes('read:')) return 'readonly';
  if (scope.includes('write:')) return 'write';
  if (scope.includes('admin:')) return 'admin';
  if (scope.includes('full') || !scope.includes('readonly')) return 'full';
  return undefined;
}

