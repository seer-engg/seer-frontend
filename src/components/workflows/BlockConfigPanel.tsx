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
import { WorkflowNodeData, BlockType } from './types';
import { Code, HelpCircle, Save } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { Checkbox } from '@/components/ui/checkbox';
import { StructuredOutputEditor } from './StructuredOutputEditor';
import { toast } from '@/components/ui/sonner';
import { ResourcePicker } from './ResourcePicker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ResourcePickerConfig {
  resource_type: string;
  display_field?: string;
  value_field?: string;
  search_enabled?: boolean;
  hierarchy?: boolean;
  filter?: Record<string, any>;
  depends_on?: string;
}

interface ToolMetadata {
  name: string;
  description: string;
  parameters?: {
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface BlockConfigPanelProps {
  node: Node<WorkflowNodeData> | null;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  allNodes?: Node<WorkflowNodeData>[]; // All nodes in workflow for reference dropdown
  autoSave?: boolean; // Enable auto-save on unmount (default: true for backward compatibility)
  variant?: 'panel' | 'inline';
  liveUpdate?: boolean;
  liveUpdateDelayMs?: number;
}

const sanitizeAlias = (value?: string | null): string | null => {
  if (!value) return null;
  const alias = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  if (!alias) return null;
  return /^\d/.test(alias) ? `_${alias}` : alias;
};

const getNodeAlias = (node?: Node<WorkflowNodeData> | null): string => {
  if (!node) return '';
  const data = node.data || {};
  const config = data.config || {};
  const candidates: Array<string | undefined> = [
    data.label,
    (config.tool_name as string) || (config.toolName as string),
    config.variable_name as string,
    node.id,
  ];
  for (const candidate of candidates) {
    const alias = sanitizeAlias(candidate);
    if (alias) {
      return alias;
    }
  }
  return '';
};

export function BlockConfigPanel({
  node,
  onUpdate,
  allNodes = [],
  autoSave = true,
  variant = 'panel',
  liveUpdate = false,
  liveUpdateDelayMs = 350,
}: BlockConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [pythonCode, setPythonCode] = useState('');
  const [oauthScope, setOAuthScope] = useState<string | undefined>();
  const [inputRefs, setInputRefs] = useState<Record<string, string>>({});
  const [useStructuredOutput, setUseStructuredOutput] = useState(false);
  
  // Autocomplete state for template variables (shared across all templating inputs)
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [partialVariable, setPartialVariable] = useState('');
  const [autocompleteContext, setAutocompleteContext] = useState<{
    inputId: string;
    ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
    value: string;
    onChange: (value: string) => void;
  } | null>(null);
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const lastSyncedNodeStateRef = useRef<{ nodeId: string | null; signature: string }>({
    nodeId: null,
    signature: '',
  });
  
  // Use refs to track latest values for auto-save on unmount
  const configRef = useRef(config);
  const inputRefsRef = useRef(inputRefs);
  const pythonCodeRef = useRef(pythonCode);
  const oauthScopeRef = useRef(oauthScope);
  const isSavingRef = useRef(false); // Track if save is in progress to prevent concurrent saves
  const originalNodeRef = useRef(node); // Track original node to detect changes
  const liveUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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

  // Extract available variables from ALL blocks (automatically discover outputs)
  const availableVariables = useMemo(() => {
    if (!allNodes) return [];
    
    const variables: string[] = [];
    
    // 1. Add input block variable names (existing behavior + fields array support)
    allNodes
      .filter(n => n.data.type === 'input')
      .forEach(inputNode => {
        const blockAlias = getNodeAlias(inputNode);
        const config = inputNode.data.config || {};
        
        // Handle variable_name (legacy)
        if (config.variable_name) {
          variables.push(config.variable_name);
          variables.push(`${blockAlias}.${config.variable_name}`);
        }
        
        // Handle fields array (new format)
        if (Array.isArray(config.fields)) {
          config.fields.forEach((field: any) => {
            // Support both 'id' and 'name' fields (id is preferred)
            const fieldName = field.id || field.name;
            if (fieldName) {
              // Add as {{alias.fieldName}} format
              variables.push(`${blockAlias}.${fieldName}`);
              // Also add as simple field name if it's unique
              variables.push(fieldName);
            }
          });
        }
      });
    
    // 2. Automatically extract outputs from ALL blocks
    // For each block, we need to infer what outputs it might have
    // Since we don't have execution results, we'll use block type conventions
    allNodes.forEach(block => {
      if (block.id === node?.id) return; // Skip current block
      
      const blockAlias = getNodeAlias(block);
      if (!blockAlias) {
        return;
      }
      
      // For tool blocks, we can't know outputs without execution, but we can add common ones
      if (block.data.type === 'tool') {
        // Add generic output handle
        variables.push(`${blockAlias}.output`);
      } else if (block.data.type === 'llm') {
        variables.push(`${blockAlias}.output`);
        
        // If LLM block has structured output schema, add each field as a variable
        const llmConfig = block.data.config || {};
        const outputSchema = llmConfig.output_schema;
        if (outputSchema && typeof outputSchema === 'object' && outputSchema.properties) {
          // Add each property from the structured output schema
          Object.keys(outputSchema.properties).forEach((fieldName: string) => {
            // Add with block alias prefix (e.g., {{llm.summary}})
            variables.push(`${blockAlias}.${fieldName}`);
          });
          // Also add structured_output reference
          variables.push(`${blockAlias}.structured_output`);
        }
      } else if (block.data.type === 'code') {
        variables.push(`${blockAlias}.output`);
      } else if (block.data.type === 'input') {
        // Input blocks already handled above, but also add output handle
        const config = block.data.config || {};
        if (config.variable_name || (Array.isArray(config.fields) && config.fields.length > 0)) {
          variables.push(`${blockAlias}.output`);
        }
      } else if (block.data.type === 'if_else') {
        variables.push(`${blockAlias}.output`);
        variables.push(`${blockAlias}.condition_result`);
        variables.push(`${blockAlias}.route`);
      } else if (block.data.type === 'for_loop') {
        variables.push(`${blockAlias}.output`);
        variables.push(`${blockAlias}.items`);
        variables.push(`${blockAlias}.count`);
      }
    });
    
    // Remove duplicates while preserving order
    return Array.from(new Set(variables));
  }, [allNodes, node]);

  useEffect(() => {
    if (!node) {
      return;
    }

    const nodeConfig = node.data.config || {};
    const signature = JSON.stringify({
      config: nodeConfig,
      python_code: node.data.python_code || '',
      oauth_scope: node.data.oauth_scope,
      input_refs: node.data.config?.input_refs || {},
    });

    if (
      lastSyncedNodeStateRef.current.nodeId === node.id &&
      lastSyncedNodeStateRef.current.signature === signature
    ) {
      return;
    }

    lastSyncedNodeStateRef.current = {
      nodeId: node.id,
      signature,
    };

    setConfig(nodeConfig);
    setPythonCode(node.data.python_code || '');
    setOAuthScope(node.data.oauth_scope);
    setInputRefs(node.data.config?.input_refs || {});
    setUseStructuredOutput(!!nodeConfig.output_schema);
    originalNodeRef.current = node; // Update original node reference
  }, [node]);

  useEffect(() => {
    if (!liveUpdate || !node) {
      return;
    }

    const nodeConfig = node.data.config || {};
    const nodeInputRefs = node.data.config?.input_refs || {};

    const hasChanges =
      JSON.stringify(config) !== JSON.stringify(nodeConfig) ||
      pythonCode !== (node.data.python_code || '') ||
      oauthScope !== node.data.oauth_scope ||
      JSON.stringify(inputRefs) !== JSON.stringify(nodeInputRefs);

    if (!hasChanges) {
      return;
    }

    if (liveUpdateTimeoutRef.current) {
      clearTimeout(liveUpdateTimeoutRef.current);
    }

    liveUpdateTimeoutRef.current = setTimeout(() => {
      const originalConfig = node.data.config || {};
      onUpdate(node.id, {
        config: {
          ...originalConfig,
          ...config,
          input_refs: inputRefs,
          output_schema: config.output_schema,
        },
        python_code: pythonCode,
        oauth_scope: oauthScope,
      });
      liveUpdateTimeoutRef.current = null;
    }, liveUpdateDelayMs);

    return () => {
      if (liveUpdateTimeoutRef.current) {
        clearTimeout(liveUpdateTimeoutRef.current);
        liveUpdateTimeoutRef.current = null;
      }
    };
  }, [
    config,
    inputRefs,
    liveUpdate,
    liveUpdateDelayMs,
    node,
    oauthScope,
    onUpdate,
    pythonCode,
  ]);

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

  // Check for autocomplete trigger (generic version)
  const checkForAutocomplete = (
    value: string, 
    cursorPosition: number,
    context?: {
      inputId: string;
      ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
      value: string;
      onChange: (value: string) => void;
    }
  ) => {
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
        if (context) {
          setAutocompleteContext({ ...context, value });
        }
        return;
      }
    }
    
    setShowAutocomplete(false);
    setPartialVariable('');
    if (!context) {
      setAutocompleteContext(null);
    }
  };

  // Insert selected variable into textarea/input (generic version)
  const insertVariable = (variable: string) => {
    if (!autocompleteContext) {
      // Fallback to system prompt for backward compatibility
      const currentValue = config.system_prompt || '';
      const textarea = systemPromptRef.current;
      if (!textarea) return;
      
      const cursorPos = textarea.selectionStart || 0;
      const textBeforeCursor = currentValue.substring(0, cursorPos);
      const textAfterCursor = currentValue.substring(cursorPos);
      
      const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
      
      if (lastOpenBrace !== -1) {
        const beforeBrace = currentValue.substring(0, lastOpenBrace);
        const newValue = `${beforeBrace}{{${variable}}}${textAfterCursor}`;
        
        setConfig({ ...config, system_prompt: newValue });
        setShowAutocomplete(false);
        setPartialVariable('');
        
        setTimeout(() => {
          const newCursorPos = lastOpenBrace + variable.length + 4;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
      return;
    }
    
    // Use autocomplete context
    const { ref, value, onChange } = autocompleteContext;
    const input = ref.current;
    if (!input) return;
    
    const cursorPos = (input.selectionStart || 0);
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
    
    if (lastOpenBrace !== -1) {
      const beforeBrace = value.substring(0, lastOpenBrace);
      const newValue = `${beforeBrace}{{${variable}}}${textAfterCursor}`;
      
      onChange(newValue);
      setShowAutocomplete(false);
      setPartialVariable('');
      setAutocompleteContext(null);
      
      setTimeout(() => {
        const newCursorPos = lastOpenBrace + variable.length + 4;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();
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
        const toolProvider = config.provider || 'google'; // Default to google if not specified
        
        return (
          <div className="space-y-4">
            {/* Render individual parameters based on schema */}
            {Object.keys(paramSchema).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(paramSchema).map(([paramName, paramDef]: [string, any]) => {
                  const paramType = paramDef.type || 'string';
                  const paramValue = toolParams[paramName];
                  const isRequired = requiredParams.includes(paramName);
                  const hasDefault = paramDef.default !== undefined;
                  // Check for resource picker configuration
                  const resourcePicker = paramDef['x-resource-picker'] as ResourcePickerConfig | undefined;
                  const defaultPlaceholder =
                    paramDef.default === undefined
                      ? ''
                      : typeof paramDef.default === 'object'
                        ? JSON.stringify(paramDef.default)
                        : String(paramDef.default);
                  
                  return (
                    <div key={paramName} className="grid grid-cols-2 gap-1 items-start">
                      {/* Left side: Parameter name + description */}
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`param-${paramName}`} className="text-xs font-medium">
                            {paramName}
                            {isRequired && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {paramDef.description && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  aria-label={`About ${paramName} parameter`}
                                >
                                  <HelpCircle className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                                {paramDef.description}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {hasDefault && (
                          <p className="text-xs text-muted-foreground italic">
                            Default: {typeof paramDef.default === 'object' 
                              ? JSON.stringify(paramDef.default) 
                              : String(paramDef.default)}
                          </p>
                        )}
                      </div>
                      
                      {/* Right side: Input field */}
                      <div className="space-y-1">
                      
                      {/* Resource Picker for parameters with x-resource-picker */}
                      {resourcePicker ? (
                        <ResourcePicker
                          config={resourcePicker}
                          provider={toolProvider}
                          value={paramValue}
                          onChange={(value, displayName) => {
                            setConfig({
                              ...config,
                              params: { ...toolParams, [paramName]: value },
                            });
                          }}
                          placeholder={`Select ${paramName}...`}
                          dependsOnValues={resourcePicker.depends_on ? {
                            [resourcePicker.depends_on]: toolParams[resourcePicker.depends_on],
                          } : undefined}
                          className="text-xs"
                        />
                      ) : paramType === 'boolean' ? (
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
                            {paramName}
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
                        <div className="relative">
                          <Textarea
                            id={`param-${paramName}`}
                            value={
                              // Handle array, string (template vars or intermediate typing), or default
                              Array.isArray(paramValue) 
                                ? JSON.stringify(paramValue, null, 2)
                                : typeof paramValue === 'string'
                                  ? paramValue
                                  : paramDef.default 
                                    ? JSON.stringify(paramDef.default, null, 2)
                                    : '[]'
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              // Check for autocomplete trigger
                              const paramRef = { current: e.target };
                              checkForAutocomplete(value, e.target.selectionStart || 0, {
                                inputId: `param-${paramName}`,
                                ref: paramRef,
                                value,
                                onChange: (newValue) => {
                                  try {
                                    const parsed = JSON.parse(newValue);
                                    if (Array.isArray(parsed)) {
                                      setConfig({
                                        ...config,
                                        params: { ...toolParams, [paramName]: parsed },
                                      });
                                    }
                                  } catch {
                                    // Invalid JSON, keep as string (might be template variable or intermediate typing)
                                    setConfig({
                                      ...config,
                                      params: { ...toolParams, [paramName]: newValue },
                                    });
                                  }
                                },
                              });
                              // Try to parse JSON, fallback to storing raw value
                              try {
                                const parsed = JSON.parse(value);
                                if (Array.isArray(parsed)) {
                                  setConfig({
                                    ...config,
                                    params: { ...toolParams, [paramName]: parsed },
                                  });
                                } else {
                                  // Not an array, keep as string
                                  setConfig({
                                    ...config,
                                    params: { ...toolParams, [paramName]: value },
                                  });
                                }
                              } catch {
                                // Invalid JSON - store as raw string (supports template variables and intermediate editing)
                                setConfig({
                                  ...config,
                                  params: { ...toolParams, [paramName]: value },
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              // Handle keyboard navigation for autocomplete
                              if (showAutocomplete && filteredVariables.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setSelectedIndex(prev => Math.min(prev + 1, filteredVariables.length - 1));
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setSelectedIndex(prev => Math.max(prev - 1, 0));
                                } else if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (filteredVariables[selectedIndex]) {
                                    insertVariable(filteredVariables[selectedIndex]);
                                  }
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setShowAutocomplete(false);
                                  setPartialVariable('');
                                  setAutocompleteContext(null);
                                }
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => setShowAutocomplete(false), 200);
                            }}
                            placeholder={JSON.stringify(paramDef.default || [], null, 2)}
                            className="font-mono text-xs"
                            rows={4}
                          />
                          {showAutocomplete && filteredVariables.length > 0 && autocompleteContext?.inputId === `param-${paramName}` && (
                            <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                              <div className="p-1">
                                {filteredVariables.map((variable, index) => (
                                  <div
                                    key={variable}
                                    onClick={() => insertVariable(variable)}
                                    className={`px-2 py-1.5 text-sm cursor-pointer rounded-sm hover:bg-accent ${
                                      index === selectedIndex ? 'bg-accent' : ''
                                    }`}
                                  >
                                    {variable}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : paramType === 'object' ? (
                        <div className="relative">
                          <Textarea
                            id={`param-${paramName}`}
                            value={
                              // Handle object, string (template vars or intermediate typing), or default
                              typeof paramValue === 'object' && paramValue !== null
                                ? JSON.stringify(paramValue, null, 2)
                                : typeof paramValue === 'string'
                                  ? paramValue
                                  : paramDef.default
                                    ? JSON.stringify(paramDef.default, null, 2)
                                    : '{}'
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              // Check for autocomplete trigger
                              const paramRef = { current: e.target };
                              checkForAutocomplete(value, e.target.selectionStart || 0, {
                                inputId: `param-${paramName}`,
                                ref: paramRef,
                                value,
                                onChange: (newValue) => {
                                  try {
                                    const parsed = JSON.parse(newValue);
                                    if (typeof parsed === 'object' && parsed !== null) {
                                      setConfig({
                                        ...config,
                                        params: { ...toolParams, [paramName]: parsed },
                                      });
                                    }
                                  } catch {
                                    // Invalid JSON, keep as string (might be template variable or intermediate typing)
                                    setConfig({
                                      ...config,
                                      params: { ...toolParams, [paramName]: newValue },
                                    });
                                  }
                                },
                              });
                              // Try to parse JSON, fallback to storing raw value
                              try {
                                const parsed = JSON.parse(value);
                                if (typeof parsed === 'object' && parsed !== null) {
                                  setConfig({
                                    ...config,
                                    params: { ...toolParams, [paramName]: parsed },
                                  });
                                } else {
                                  // Not an object, keep as string
                                  setConfig({
                                    ...config,
                                    params: { ...toolParams, [paramName]: value },
                                  });
                                }
                              } catch {
                                // Invalid JSON - store as raw string (supports template variables and intermediate editing)
                                setConfig({
                                  ...config,
                                  params: { ...toolParams, [paramName]: value },
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              // Handle keyboard navigation for autocomplete
                              if (showAutocomplete && filteredVariables.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setSelectedIndex(prev => Math.min(prev + 1, filteredVariables.length - 1));
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setSelectedIndex(prev => Math.max(prev - 1, 0));
                                } else if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (filteredVariables[selectedIndex]) {
                                    insertVariable(filteredVariables[selectedIndex]);
                                  }
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setShowAutocomplete(false);
                                  setPartialVariable('');
                                  setAutocompleteContext(null);
                                }
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => setShowAutocomplete(false), 200);
                            }}
                            placeholder={JSON.stringify(paramDef.default || {}, null, 2)}
                            className="font-mono text-xs"
                            rows={4}
                          />
                          {showAutocomplete && filteredVariables.length > 0 && autocompleteContext?.inputId === `param-${paramName}` && (
                            <div className="absolute z-50 mt-1 w-64 rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                              <div className="p-1">
                                {filteredVariables.map((variable, index) => (
                                  <div
                                    key={variable}
                                    onClick={() => insertVariable(variable)}
                                    className={`px-2 py-1.5 text-sm cursor-pointer rounded-sm hover:bg-accent ${
                                      index === selectedIndex ? 'bg-accent' : ''
                                    }`}
                                  >
                                    {variable}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : paramDef.enum && Array.isArray(paramDef.enum) ? (
                        // Enum type - render as dropdown/select
                        <Select
                          value={paramValue ?? paramDef.default ?? paramDef.enum[0]}
                          onValueChange={(value) =>
                            setConfig({
                              ...config,
                              params: { ...toolParams, [paramName]: value },
                            })
                          }
                        >
                          <SelectTrigger id={`param-${paramName}`} className="text-xs">
                            <SelectValue placeholder={`Select ${paramName}...`} />
                          </SelectTrigger>
                          <SelectContent>
                            {paramDef.enum.map((enumValue: string) => (
                              <SelectItem key={enumValue} value={enumValue}>
                                {enumValue}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="relative">
                          <Input
                            id={`param-${paramName}`}
                            type="text"
                            value={paramValue ?? paramDef.default ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setConfig({
                                ...config,
                                params: { ...toolParams, [paramName]: value },
                              });
                              // Check for autocomplete trigger
                              const paramRef = { current: e.target };
                              checkForAutocomplete(value, e.target.selectionStart || 0, {
                                inputId: `param-${paramName}`,
                                ref: paramRef,
                                value,
                                onChange: (newValue) => {
                                  setConfig({
                                    ...config,
                                    params: { ...toolParams, [paramName]: newValue },
                                  });
                                },
                              });
                            }}
                            onKeyDown={(e) => {
                              // Handle keyboard navigation for autocomplete
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
                                  setAutocompleteContext(null);
                                }
                              }
                            }}
                            onBlur={() => {
                              // Close autocomplete when input loses focus (with delay to allow click)
                              setTimeout(() => setShowAutocomplete(false), 200);
                            }}
                            placeholder={defaultPlaceholder}
                            className="text-xs"
                          />
                          {showAutocomplete && filteredVariables.length > 0 && autocompleteContext?.inputId === `param-${paramName}` && (
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
                      )}
                      </div>
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
                  <SelectItem value="gpt-5-nano">GPT-5 Nano</SelectItem>

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

  const shouldShowSaveButton = !autoSave && !liveUpdate;
  const saveButton = shouldShowSaveButton ? (
    <Button onClick={handleSave} className="w-full" size="sm">
      <Save className="w-4 h-4 mr-2" />
      Save Configuration
    </Button>
  ) : null;

  if (variant === 'inline') {
    return (
      <div className="space-y-4">
        {renderConfigFields()}
        {saveButton}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {renderConfigFields()}
        {saveButton}
      </CardContent>
    </Card>
  );
}
