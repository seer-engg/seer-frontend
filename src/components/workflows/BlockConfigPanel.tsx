/**
 * Block Configuration Panel
 * 
 * Right sidebar panel for configuring selected block.
 * Supports editing parameters and OAuth scopes.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  IfElseBlockSection,
  ForLoopBlockSection,
  InputBlockSection,
  ToolMetadata,
} from './block-config';
import { WorkflowEdge, WorkflowNodeData } from './types';
import { backendApiClient } from '@/lib/api-client';

interface BlockConfigPanelProps {
  node: Node<WorkflowNodeData> | null;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  allNodes?: Node<WorkflowNodeData>[]; // All nodes in workflow for reference dropdown
  allEdges?: WorkflowEdge[];
  autoSave?: boolean; // Enable auto-save on unmount (default: true for backward compatibility)
  variant?: 'panel' | 'inline';
  liveUpdate?: boolean;
  liveUpdateDelayMs?: number;
}

export function BlockConfigPanel({
  node,
  onUpdate,
  allNodes = [],
  allEdges = [],
  autoSave = true,
  variant = 'panel',
  liveUpdate = false,
  liveUpdateDelayMs = 350,
}: BlockConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [oauthScope, setOAuthScope] = useState<string | undefined>();
  const [inputRefs, setInputRefs] = useState<Record<string, string>>({});
  const [useStructuredOutput, setUseStructuredOutput] = useState(false);
  const [structuredOutputSchema, setStructuredOutputSchema] = useState<Record<string, any> | undefined>();
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);
  const lastSyncedNodeStateRef = useRef<{ nodeId: string | null; signature: string }>({
    nodeId: null,
    signature: '',
  });
  
  // Use refs to track latest values for auto-save on unmount
  const configRef = useRef(config);
  const inputRefsRef = useRef(inputRefs);
  const oauthScopeRef = useRef(oauthScope);
  const isSavingRef = useRef(false); // Track if save is in progress to prevent concurrent saves
  const originalNodeRef = useRef(node); // Track original node to detect changes
  const liveUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Update refs when state changes
  useEffect(() => {
    configRef.current = config;
    inputRefsRef.current = inputRefs;
    oauthScopeRef.current = oauthScope;
  }, [config, inputRefs, oauthScope]);

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
    () => collectAvailableVariables(allNodes, allEdges, node),
    [allNodes, allEdges, node]
  );
  const templateAutocomplete = useTemplateAutocomplete(availableVariables);

  useEffect(() => {
    if (!node) {
      return;
    }

    const nodeConfig = node.data.config || {};
    const signature = JSON.stringify({
      config: nodeConfig,
      oauth_scope: node.data.oauth_scope,
      input_refs: node.data.config?.input_refs || {},
      // Include fields in signature to ensure sync when fields change
      fields: nodeConfig.fields,
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
    setOAuthScope(node.data.oauth_scope);
    setInputRefs(node.data.config?.input_refs || {});
    setUseStructuredOutput(!!nodeConfig.output_schema);
    setStructuredOutputSchema(nodeConfig.output_schema);
    originalNodeRef.current = node; // Update original node reference
  }, [node]);

  const handleStructuredOutputSchemaChange = useCallback(
    (schema?: Record<string, any>) => {
      setStructuredOutputSchema(schema);
      setConfig(prev => {
        if (schema) {
          return { ...prev, output_schema: schema };
        }
        const next = { ...prev };
        delete next.output_schema;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!liveUpdate || !node) {
      return;
    }

    const nodeConfig = node.data.config || {};
    const nodeInputRefs = node.data.config?.input_refs || {};

    // Use refs to get latest values for comparison and saving
    const currentConfig = configRef.current;
    const currentInputRefs = inputRefsRef.current;
    const currentOauthScope = oauthScopeRef.current;

    // Check for changes including fields array
    const configChanged = JSON.stringify(currentConfig) !== JSON.stringify(nodeConfig);
    const fieldsChanged = JSON.stringify(currentConfig.fields) !== JSON.stringify(nodeConfig.fields);
    const hasChanges =
      configChanged ||
      fieldsChanged ||
      currentOauthScope !== node.data.oauth_scope ||
      JSON.stringify(currentInputRefs) !== JSON.stringify(nodeInputRefs);

    if (!hasChanges) {
      return;
    }

    if (liveUpdateTimeoutRef.current) {
      clearTimeout(liveUpdateTimeoutRef.current);
    }

    liveUpdateTimeoutRef.current = setTimeout(() => {
      // Use refs to get latest values when timeout fires
      const latestConfig = configRef.current;
      const latestInputRefs = inputRefsRef.current;
      const latestOauthScope = oauthScopeRef.current;
      
      const originalConfig = node.data.config || {};
      
      // Build merged config, always preserving fields if present in latestConfig
      const mergedConfig: Record<string, any> = {
        ...originalConfig,
        ...latestConfig,
        input_refs: latestInputRefs,
        output_schema: latestConfig.output_schema,
      };
      
      // Always include fields array if it exists in latestConfig (even if empty)
      if ('fields' in latestConfig) {
        mergedConfig.fields = latestConfig.fields;
      }
      
      const updatePayload: Partial<WorkflowNodeData> = {
        config: mergedConfig,
        oauth_scope: latestOauthScope,
      };
      
      onUpdate(node.id, updatePayload);
      liveUpdateTimeoutRef.current = null;
    }, liveUpdateDelayMs);

    return () => {
      if (liveUpdateTimeoutRef.current) {
        clearTimeout(liveUpdateTimeoutRef.current);
        liveUpdateTimeoutRef.current = null;
      }
    };
  }, [
    config, // Include config to trigger effect when it changes
    inputRefs,
    oauthScope,
    liveUpdate,
    liveUpdateDelayMs,
    node,
    onUpdate,
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
          oauthScopeRef.current !== originalNode.data.oauth_scope ||
          JSON.stringify(inputRefsRef.current) !== JSON.stringify(originalNode.data.config?.input_refs || {});
        
        if (hasChanges) {
          isSavingRef.current = true;
          const originalConfig = originalNode.data.config || {};
          
          // Build merged config, always preserving fields if present
          const mergedConfig: Record<string, any> = {
            ...originalConfig,
            ...configRef.current,
            input_refs: inputRefsRef.current,
            output_schema: configRef.current.output_schema,
          };
          
          // Always include fields array if it exists in current config (even if empty)
          if ('fields' in configRef.current) {
            mergedConfig.fields = configRef.current.fields;
          }
          
          onUpdate(originalNode.id, {
            config: mergedConfig,
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
      const originalConfig = node.data.config || {};
      
      // Build merged config, always preserving fields if present
      const mergedConfig: Record<string, any> = {
        ...originalConfig,
        ...config,
        input_refs: inputRefs,
        output_schema: config.output_schema,
      };
      
      // Always include fields array if it exists in config (even if empty)
      if ('fields' in config) {
        mergedConfig.fields = config.fields;
      }
      
      onUpdate(node.id, {
        config: mergedConfig,
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

    if (node.data.type === 'code') {
      return (
        <div className="text-sm text-muted-foreground">
          Code blocks are temporarily disabled while we migrate to the new workflow engine.
        </div>
      );
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
      case 'llm':
        return (
          <LlmBlockSection
            config={config}
            setConfig={setConfig}
            useStructuredOutput={useStructuredOutput}
            setUseStructuredOutput={setUseStructuredOutput}
            structuredOutputSchema={structuredOutputSchema}
            onStructuredOutputSchemaChange={handleStructuredOutputSchemaChange}
            systemPromptRef={systemPromptRef}
            userPromptRef={userPromptRef}
            templateAutocomplete={templateAutocomplete}
          />
        );
      case 'if_else':
        return (
          <IfElseBlockSection
            config={config}
            setConfig={setConfig}
            templateAutocomplete={templateAutocomplete}
          />
        );
      case 'for_loop':
        return (
          <ForLoopBlockSection
            config={config}
            setConfig={setConfig}
            templateAutocomplete={templateAutocomplete}
          />
        );
      case 'input':
        return <InputBlockSection config={config} setConfig={setConfig} />;
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
      <div className="space-y-4 w-fit">
        {renderBlockSection()}
        {saveButton}
      </div>
    );
  }

  return (
    <Card className="w-fit">
      <CardContent className="p-6 space-y-4 w-fit">
        {renderBlockSection()}
        {saveButton}
      </CardContent>
    </Card>
  );
}
