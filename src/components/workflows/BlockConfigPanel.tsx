/**
 * Block Configuration Panel
 * 
 * Right sidebar panel for configuring selected block.
 * Supports editing parameters, Python code, and OAuth scopes.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Node } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

import {
  collectAvailableVariables,
  useTemplateAutocomplete,
  ToolBlockSection,
  LlmBlockSection,
  CodeBlockSection,
  IfElseBlockSection,
  ForLoopBlockSection,
  InputBlockSection,
  DefaultBlockSection,
  ToolMetadata,
} from './block-config';
import { WorkflowNodeData } from './types';
import { backendApiClient } from '@/lib/api-client';

interface BlockConfigPanelProps {
  node: Node<WorkflowNodeData> | null;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  allNodes?: Node<WorkflowNodeData>[]; // All nodes in workflow for reference dropdown
  autoSave?: boolean; // Enable auto-save on unmount (default: true for backward compatibility)
  variant?: 'panel' | 'inline';
  liveUpdate?: boolean;
  liveUpdateDelayMs?: number;
}

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
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);
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

  const availableVariables = useMemo(
    () => collectAvailableVariables(allNodes, node),
    [allNodes, node]
  );
  const templateAutocomplete = useTemplateAutocomplete(availableVariables);

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

  const renderBlockSection = () => {
    if (!node) {
      return null;
    }

    switch (node.data.type) {
      case 'tool':
        return (
          <ToolBlockSection
            config={config}
            setConfig={setConfig}
            toolSchema={toolSchema}
            templateAutocomplete={templateAutocomplete}
          />
        );
      case 'code':
        return <CodeBlockSection pythonCode={pythonCode} setPythonCode={setPythonCode} />;
      case 'llm':
        return (
          <LlmBlockSection
            config={config}
            setConfig={setConfig}
            useStructuredOutput={useStructuredOutput}
            setUseStructuredOutput={setUseStructuredOutput}
            systemPromptRef={systemPromptRef}
            userPromptRef={userPromptRef}
            templateAutocomplete={templateAutocomplete}
          />
        );
      case 'if_else':
        return <IfElseBlockSection config={config} setConfig={setConfig} />;
      case 'for_loop':
        return <ForLoopBlockSection config={config} setConfig={setConfig} />;
      case 'input':
        return <InputBlockSection config={config} setConfig={setConfig} />;
      default:
        return <DefaultBlockSection />;
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
        {renderBlockSection()}
        {saveButton}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {renderBlockSection()}
        {saveButton}
      </CardContent>
    </Card>
  );
}
