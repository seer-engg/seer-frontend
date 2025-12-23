/**
 * Block Configuration Panel
 * 
 * Right sidebar panel for configuring selected block.
 * Supports editing parameters, Python code, and OAuth scopes.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Node } from '@xyflow/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderType } from './OAuthScopeSelector';
import { WorkflowNodeData, BlockType } from './WorkflowCanvas';
import { Code, Save } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { Checkbox } from '@/components/ui/checkbox';
import { StructuredOutputEditor } from './StructuredOutputEditor';
import { toast } from '@/components/ui/sonner';

interface ToolMetadata {
  name: string;
  description: string;
  parameters?: {
    properties?: Record<string, any>;
  };
}

interface BlockConfigPanelProps {
  node: Node<WorkflowNodeData> | null;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  allNodes?: Node<WorkflowNodeData>[]; // All nodes in workflow for reference dropdown
  autoSave?: boolean; // Enable auto-save on unmount (default: true for backward compatibility)
}

export function BlockConfigPanel({ node, onUpdate, allNodes = [], autoSave = true }: BlockConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [pythonCode, setPythonCode] = useState('');
  const [oauthScope, setOAuthScope] = useState<string | undefined>();
  const [inputRefs, setInputRefs] = useState<Record<string, string>>({});
  const [useStructuredOutput, setUseStructuredOutput] = useState(false);
  
  // Autocomplete state for template variables
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [partialVariable, setPartialVariable] = useState('');
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  
  // Use refs to track latest values for auto-save on unmount
  const configRef = useRef(config);
  const inputRefsRef = useRef(inputRefs);
  const pythonCodeRef = useRef(pythonCode);
  const oauthScopeRef = useRef(oauthScope);
  const isSavingRef = useRef(false); // Track if save is in progress to prevent concurrent saves
  const originalNodeRef = useRef(node); // Track original node to detect changes
  
  // Update refs when state changes
  useEffect(() => {
    configRef.current = config;
    inputRefsRef.current = inputRefs;
    pythonCodeRef.current = pythonCode;
    oauthScopeRef.current = oauthScope;
  }, [config, inputRefs, pythonCode, oauthScope]);

  const toolName = config.tool_name || config.toolName || '';

  // Fetch tool schema for tool blocks to determine input handles
  const { data: toolSchema } = useQuery<ToolMetadata | undefined>({
    queryKey: ['tool-schema', toolName],
    queryFn: async () => {
      if (!toolName || node?.data.type !== 'tool') return undefined;
      const response = await backendApiClient.request<{ tools: ToolMetadata[] }>(
        '/api/tools',
        { method: 'GET' }
      );
      return response.tools.find(t => t.name === toolName);
    },
    enabled: !!toolName && node?.data.type === 'tool',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Determine input handles based on block type
  const inputHandles = useMemo(() => {
    if (!node) return [];
    
    const blockType = node.data.type;
    
    switch (blockType) {
      case 'input':
        // Input blocks are entry points, no inputs
        return [];
      
      case 'tool':
        // For tool blocks, derive from tool schema
        if (toolSchema?.parameters?.properties) {
          return Object.keys(toolSchema.parameters.properties);
        }
        // Fallback to single input handle
        return ['input'];
      
      case 'code':
      case 'llm':
      case 'if_else':
      case 'for_loop':
      case 'variable':
        // These blocks typically have a single input
        return ['input'];
      
      default:
        return [];
    }
  }, [node, toolSchema]);

  // Get available blocks (all nodes except current node)
  const availableBlocks = useMemo(() => {
    if (!node) return [];
    return allNodes.filter(n => n.id !== node.id);
  }, [node, allNodes]);

  // Extract available variables from input blocks
  const availableVariables = useMemo(() => {
    if (!allNodes) return [];
    
    return allNodes
      .filter(node => node.data.type === 'input')
      .map(node => node.data.config?.variable_name)
      .filter(Boolean) as string[];
  }, [allNodes]);

  useEffect(() => {
    if (node) {
      setConfig(node.data.config || {});
      setPythonCode(node.data.python_code || '');
      setOAuthScope(node.data.oauth_scope);
      setInputRefs(node.data.config?.input_refs || {});
      setUseStructuredOutput(!!node.data.config?.output_schema);
      originalNodeRef.current = node; // Update original node reference
    }
  }, [node]);

  // Auto-save config changes when component unmounts (modal closes)
  // Only runs if autoSave is enabled (default true for backward compatibility)
  useEffect(() => {
    if (!autoSave) return; // Skip auto-save if disabled
    
    return () => {
      // Auto-save when component unmounts (modal closes)
      // Use refs to get latest values
      if (node && !isSavingRef.current) {
        const originalNode = originalNodeRef.current;
        if (!originalNode) return;
        
        // Check if data actually changed before saving
        const hasChanges = 
          JSON.stringify(configRef.current) !== JSON.stringify(originalNode.data.config || {}) ||
          pythonCodeRef.current !== (originalNode.data.python_code || '') ||
          oauthScopeRef.current !== originalNode.data.oauth_scope ||
          JSON.stringify(inputRefsRef.current) !== JSON.stringify(originalNode.data.config?.input_refs || {});
        
        if (hasChanges) {
          isSavingRef.current = true;
          // Start with original node config to preserve all fields, then merge current changes
          const originalConfig = originalNode.data.config || {};
          onUpdate(originalNode.id, {
            config: {
              ...originalConfig,
              ...configRef.current,
              input_refs: inputRefsRef.current,
              output_schema: configRef.current.output_schema,
            },
            python_code: pythonCodeRef.current,
            oauth_scope: oauthScopeRef.current,
          });
          // Reset flag after a delay to allow save to complete
          setTimeout(() => {
            isSavingRef.current = false;
          }, 1000);
        }
      }
    };
  }, [node, onUpdate, autoSave]); // Include autoSave in dependencies

  // Filter variables based on partial input
  const filteredVariables = useMemo(() => {
    if (!partialVariable) return availableVariables;
    
    return availableVariables.filter(variable =>
      variable.toLowerCase().startsWith(partialVariable.toLowerCase())
    );
  }, [availableVariables, partialVariable]);

  // Check for autocomplete trigger
  const checkForAutocomplete = (value: string, cursorPosition: number) => {
    // Find the last {{ before cursor
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
    
    if (lastOpenBrace !== -1) {
      // Check if there's a closing }} after the {{
      const textAfterOpen = textBeforeCursor.substring(lastOpenBrace + 2);
      const hasClosing = textAfterOpen.includes('}}');
      
      if (!hasClosing) {
        // Extract partial variable name
        const partial = textAfterOpen.trim();
        setPartialVariable(partial);
        setShowAutocomplete(true);
        setSelectedIndex(0);
        return;
      }
    }
    
    setShowAutocomplete(false);
    setPartialVariable('');
  };

  // Insert selected variable into textarea
  const insertVariable = (variable: string) => {
    const currentValue = config.system_prompt || '';
    const textarea = systemPromptRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = currentValue.substring(0, cursorPos);
    const textAfterCursor = currentValue.substring(cursorPos);
    
    // Find the last {{ before cursor
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
    
    if (lastOpenBrace !== -1) {
      // Replace from {{ to cursor with {{variable}}
      const beforeBrace = currentValue.substring(0, lastOpenBrace);
      const newValue = `${beforeBrace}{{${variable}}}${textAfterCursor}`;
      
      setConfig({ ...config, system_prompt: newValue });
      setShowAutocomplete(false);
      setPartialVariable('');
      
      // Set cursor position after }}
      setTimeout(() => {
        const newCursorPos = lastOpenBrace + variable.length + 4; // {{variable}}
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  };

  // Handle keyboard navigation for autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete && filteredVariables.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredVariables.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredVariables[selectedIndex]) {
          insertVariable(filteredVariables[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        setPartialVariable('');
      }
    }
  };

  if (!node) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a block to configure
      </div>
    );
  }

  const handleSave = () => {
    if (node) {
      // Start with original node config to preserve all fields, then merge current changes
      const originalConfig = node.data.config || {};
      onUpdate(node.id, {
        config: {
          ...originalConfig,
          ...config,
          input_refs: inputRefs,
          output_schema: config.output_schema, // Explicitly include output_schema
        },
        python_code: pythonCode,
        oauth_scope: oauthScope,
      });
      toast.success('Configuration saved', {
        description: 'Block configuration has been saved successfully',
        duration: 2000,
      });
    }
  };

  const renderConfigFields = () => {
    const blockType = node.data.type;

    switch (blockType) {
      case 'tool':
        const toolParams = config.params || {};
        const paramSchema = toolSchema?.parameters?.properties || {};
        const requiredParams = toolSchema?.parameters?.required || [];
        
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
                placeholder="e.g., gmail_read_emails"
              />
            </div>
            
            {/* Render individual parameters based on schema */}
            {Object.keys(paramSchema).length > 0 ? (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Parameters</Label>
                {Object.entries(paramSchema).map(([paramName, paramDef]: [string, any]) => {
                  const paramType = paramDef.type || 'string';
                  const paramValue = toolParams[paramName];
                  const isRequired = requiredParams.includes(paramName);
                  const hasDefault = paramDef.default !== undefined;
                  
                  return (
                    <div key={paramName} className="space-y-1">
                      <Label htmlFor={`param-${paramName}`} className="text-xs">
                        {paramName}
                        {isRequired && <span className="text-destructive ml-1">*</span>}
                        {paramDef.description && (
                          <span className="text-muted-foreground font-normal ml-2">
                            ({paramDef.description})
                          </span>
                        )}
                      </Label>
                      
                      {paramType === 'boolean' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`param-${paramName}`}
                            checked={paramValue ?? paramDef.default ?? false}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                params: { ...toolParams, [paramName]: e.target.checked },
                              })
                            }
                            className="rounded"
                          />
                          <Label htmlFor={`param-${paramName}`} className="text-xs font-normal">
                            {paramDef.description || paramName}
                          </Label>
                        </div>
                      ) : paramType === 'integer' || paramType === 'number' ? (
                        <Input
                          id={`param-${paramName}`}
                          type="number"
                          value={paramValue ?? paramDef.default ?? ''}
                          onChange={(e) => {
                            const value = paramType === 'integer' 
                              ? parseInt(e.target.value) || 0
                              : parseFloat(e.target.value) || 0;
                            setConfig({
                              ...config,
                              params: { ...toolParams, [paramName]: value },
                            });
                          }}
                          min={paramDef.minimum}
                          max={paramDef.maximum}
                          step={paramType === 'integer' ? 1 : 0.1}
                          placeholder={hasDefault ? String(paramDef.default) : ''}
                          className="text-xs"
                        />
                      ) : paramType === 'array' ? (
                        <Textarea
                          id={`param-${paramName}`}
                          value={Array.isArray(paramValue) 
                            ? JSON.stringify(paramValue, null, 2)
                            : paramDef.default 
                              ? JSON.stringify(paramDef.default, null, 2)
                              : '[]'}
                          onChange={(e) => {
                            try {
                              const value = JSON.parse(e.target.value);
                              if (Array.isArray(value)) {
                                setConfig({
                                  ...config,
                                  params: { ...toolParams, [paramName]: value },
                                });
                              }
                            } catch {
                              // Invalid JSON, keep as is
                            }
                          }}
                          placeholder={JSON.stringify(paramDef.default || [], null, 2)}
                          className="font-mono text-xs"
                          rows={3}
                        />
                      ) : paramType === 'object' ? (
                        <Textarea
                          id={`param-${paramName}`}
                          value={typeof paramValue === 'object' && paramValue !== null
                            ? JSON.stringify(paramValue, null, 2)
                            : paramDef.default
                              ? JSON.stringify(paramDef.default, null, 2)
                              : '{}'}
                          onChange={(e) => {
                            try {
                              const value = JSON.parse(e.target.value);
                              if (typeof value === 'object' && value !== null) {
                                setConfig({
                                  ...config,
                                  params: { ...toolParams, [paramName]: value },
                                });
                              }
                            } catch {
                              // Invalid JSON, keep as is
                            }
                          }}
                          placeholder={JSON.stringify(paramDef.default || {}, null, 2)}
                          className="font-mono text-xs"
                          rows={4}
                        />
                      ) : (
                        <Input
                          id={`param-${paramName}`}
                          type="text"
                          value={paramValue ?? paramDef.default ?? ''}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              params: { ...toolParams, [paramName]: e.target.value },
                            })
                          }
                          placeholder={paramDef.default || paramDef.description || ''}
                          className="text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <Label htmlFor="tool-params">Parameters (JSON)</Label>
                <Textarea
                  id="tool-params"
                  value={JSON.stringify(toolParams, null, 2)}
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
            )}
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
            <div className="relative">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                ref={systemPromptRef}
                id="system-prompt"
                value={config.system_prompt || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setConfig({ ...config, system_prompt: value });
                  // Check if {{ was just typed
                  checkForAutocomplete(value, e.target.selectionStart);
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Close autocomplete when textarea loses focus (with delay to allow click)
                  setTimeout(() => setShowAutocomplete(false), 200);
                }}
                placeholder="You are a helpful assistant..."
                rows={6}
                className="max-h-[200px] overflow-y-auto"
              />
              {showAutocomplete && filteredVariables.length > 0 && (
                <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                  <div className="p-1">
                    {filteredVariables.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No variables found</div>
                    ) : (
                      filteredVariables.map((variable, index) => (
                        <div
                          key={variable}
                          onClick={() => insertVariable(variable)}
                          className={`px-2 py-1.5 text-sm cursor-pointer rounded-sm hover:bg-accent ${
                            index === selectedIndex ? 'bg-accent' : ''
                          }`}
                        >
                          {variable}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="structured-output"
                checked={useStructuredOutput}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setUseStructuredOutput(isChecked);
                  if (!isChecked) {
                    // Remove output_schema when unchecked
                    const newConfig = { ...config };
                    delete newConfig.output_schema;
                    setConfig(newConfig);
                  } else {
                    // Set default empty schema when checked
                    setConfig({
                      ...config,
                      output_schema: config.output_schema || {
                        type: "object",
                        properties: {},
                      },
                    });
                  }
                }}
              />
              <Label
                htmlFor="structured-output"
                className="text-sm font-normal cursor-pointer"
              >
                Structured Output (JSON Schema)
              </Label>
            </div>
            {useStructuredOutput && (
              <div>
                <StructuredOutputEditor
                  value={config.output_schema}
                  onChange={(schema) => {
                    setConfig({ ...config, output_schema: schema });
                  }}
                />
              </div>
            )}
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

      case 'input':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="variable-name">Variable Name</Label>
              <Input
                id="variable-name"
                value={config.variable_name || ''}
                onChange={(e) =>
                  setConfig({ ...config, variable_name: e.target.value })
                }
                placeholder="e.g., user_input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use this name to reference this input in system prompts via {'{{'}variable_name{'}}'} syntax
              </p>
            </div>
            <div>
              <Label htmlFor="input-type">Input Type</Label>
              <Select
                value={config.type || 'text'}
                onValueChange={(value) =>
                  setConfig({ ...config, type: value })
                }
              >
                <SelectTrigger id="input-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="input-required"
                checked={config.required !== false}
                onChange={(e) =>
                  setConfig({ ...config, required: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="input-required" className="text-sm font-normal cursor-pointer">
                Required
              </Label>
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
    <div className="p-4">
      <Card>
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

