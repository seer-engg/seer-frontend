/**
 * Workflows Page
 * 
 * Main page for visual workflow builder.
 * Supports connecting to self-hosted backend via ?backend= URL parameter.
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Node, ReactFlowProvider } from '@xyflow/react';
import { WorkflowCanvas } from '@/components/workflows/WorkflowCanvas';
import { WorkflowNodeConfigDialog } from '@/components/workflows/WorkflowNodeConfigDialog';
import { WorkflowNodeData, WorkflowEdge, FunctionBlockSchema, TriggerDraftMeta } from '@/components/workflows/types';
import type { WorkflowProposalPreview } from '@/components/workflows/build-and-chat/types';
import type { TriggerListOption } from '@/components/workflows/build-and-chat/build/TriggerSection';
import type { TriggerSubscriptionUpdateRequest } from '@/types/triggers';
import type { InputDef } from '@/types/workflow-spec';
import { BuildAndChatPanel } from '@/components/workflows/BuildAndChatPanel';
import { FloatingWorkflowsPanel } from '@/components/workflows/FloatingWorkflowsPanel';
import { WorkflowLifecycleBar } from '@/components/workflows/WorkflowLifecycleBar';
import { useWorkflowBuilder, WorkflowListItem, WorkflowModel } from '@/hooks/useWorkflowBuilder';
import { useWorkflowVersions } from '@/hooks/useWorkflowVersions';
import { useWorkflowTriggers } from '@/hooks/useWorkflowTriggers';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import { useFunctionBlocks } from '@/hooks/useFunctionBlocks';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useBackendHealth } from '@/lib/backend-health';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from '@/components/ui/sonner';
import { backendApiClient, BackendAPIError } from '@/lib/api-client';
import { BUILT_IN_BLOCKS, getBlockIconForType } from '@/components/workflows/build-and-chat/constants';
import { useIntegrationTools } from '@/hooks/useIntegrationTools';
import {
  WEBHOOK_TRIGGER_KEY,
  GMAIL_TRIGGER_KEY,
  CRON_TRIGGER_KEY,
  GMAIL_TOOL_FALLBACK_NAMES,
  SUPABASE_TRIGGER_KEY,
  SUPABASE_TOOL_FALLBACK_NAMES,
} from '@/components/workflows/triggers/constants';
import {
  buildBindingsPayload,
  buildDefaultBindingState,
  makeDefaultGmailConfig,
  makeDefaultSupabaseConfig,
} from '@/components/workflows/triggers/utils';
import type { BindingState } from '@/components/workflows/triggers/utils';

const isBranchValue = (value: unknown): value is 'true' | 'false' =>
  value === 'true' || value === 'false';

const normalizeEdge = (edge: any): WorkflowEdge => {
  const legacyBranch = edge?.data?.branch ?? edge?.branch;
  const legacyHandle = edge?.targetHandle || edge?.data?.targetHandle;
  const branchCandidate = legacyBranch ?? legacyHandle;
  const branch = isBranchValue(branchCandidate) ? branchCandidate : undefined;

  let normalizedData = edge?.data ? { ...edge.data } : undefined;
  if (branch) {
    normalizedData = { ...(normalizedData || {}), branch };
  }
  if (normalizedData && Object.keys(normalizedData).length === 0) {
    normalizedData = undefined;
  }

  const { sourceHandle: _sourceHandle, targetHandle: _targetHandle, ...rest } = edge || {};

  return {
    ...rest,
    data: normalizedData,
  } as WorkflowEdge;
};

const normalizeEdges = (rawEdges?: any[]): WorkflowEdge[] => {
  if (!Array.isArray(rawEdges)) {
    return [];
  }
  return rawEdges.map((edge) => normalizeEdge(edge));
};

const DEFAULT_LLM_USER_PROMPT = 'Enter your prompt here';

const parseProviderConnectionId = (raw?: string | null): number | null => {
  if (!raw) {
    return null;
  }
  const segments = raw.split(':');
  const numeric = Number(segments[segments.length - 1]);
  return Number.isNaN(numeric) ? null : numeric;
};

const normalizeNodes = (
  rawNodes?: any[],
  functionBlockMap?: Map<string, FunctionBlockSchema>,
): Node<WorkflowNodeData>[] => {
  if (!Array.isArray(rawNodes)) {
    return [];
  }
  return rawNodes
    .filter((node) => {
      const nodeType = (node?.data?.type ?? node?.type) as string | undefined;
      return nodeType !== 'input';
    })
    .map((node) => {
    const data = node?.data ?? {};
    const position = node?.position ?? { x: 0, y: 0 };
    const resolvedType = (node?.type || data?.type || 'tool') as WorkflowNodeData['type'];
    const configWithDefaults = withDefaultBlockConfig(
      resolvedType,
      data?.config ?? {},
      functionBlockMap,
    );

    return {
      ...node,
      type: resolvedType,
      position,
      data: {
        ...data,
        type: data?.type || resolvedType,
        label: data?.label ?? node?.id ?? '',
        config: configWithDefaults,
      },
    } as Node<WorkflowNodeData>;
  });
};

function withDefaultBlockConfig(
  blockType: string,
  config: Record<string, any> = {},
  functionBlockMap?: Map<string, FunctionBlockSchema>,
): Record<string, any> {
  const schemaDefaults = functionBlockMap?.get(blockType)?.defaults;
  const defaults: Record<string, any> = schemaDefaults ?? (() => {
    switch (blockType) {
      case 'llm':
        return {
          system_prompt: '',
          user_prompt: DEFAULT_LLM_USER_PROMPT,
          model: 'gpt-5-mini',
          temperature: 0.2,
        };
      case 'if_else':
        return {
          condition: '',
        };
      case 'for_loop':
        return {
          array_mode: 'variable',
          array_variable: 'items',
          array_literal: [],
          item_var: 'item',
        };
      default:
        return {};
    }
  })();

  return {
    ...defaults,
    ...config,
  };
}

export default function Workflows() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workflowId: urlWorkflowId } = useParams<{ workflowId?: string }>();
  const buildChatSupported = true;
  const {
    refresh: refreshIntegrationTools,
    tools: integrationTools,
    isIntegrationConnected,
    getConnectionId,
    connectIntegration,
  } = useIntegrationTools();
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadedWorkflow, setLoadedWorkflow] = useState<WorkflowModel | null>(null);
  const [draftTriggers, setDraftTriggers] = useState<TriggerDraftMeta[]>([]);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isConnectingSupabase, setIsConnectingSupabase] = useState(false);
  const [proposalPreview, setProposalPreview] = useState<WorkflowProposalPreview | null>(null);
  const [lastRunVersionId, setLastRunVersionId] = useState<number | null>(null);
  const resetSavedDataRef = useRef<(() => void) | null>(null);
  const editingNode = useMemo(
    () => nodes.find((node) => node.id === editingNodeId) ?? null,
    [nodes, editingNodeId],
  );
  
  const {
    workflows,
    isLoading: isLoadingWorkflows,
    createWorkflow,
    updateWorkflowMetadata,
    saveWorkflowDraft,
    deleteWorkflow,
    executeWorkflow,
    publishWorkflow,
    getWorkflow,
    restoreWorkflowVersion,
    isCreating,
    isExecuting,
    isDeleting,
    isSavingDraft,
    isPublishing,
    isRestoringVersion,
  } = useWorkflowBuilder();

  const {
    versions: workflowVersions,
    isLoading: isLoadingWorkflowVersions,
    invalidate: invalidateWorkflowVersions,
  } = useWorkflowVersions(selectedWorkflowId);
  const {
    blocks: functionBlockSchemas,
    blocksByType: functionBlocksMap,
  } = useFunctionBlocks();
  const {
    triggers: triggerCatalog,
    subscriptions: triggerSubscriptions,
    isLoadingTriggers,
    isLoadingSubscriptions,
    createSubscription,
    updateSubscription,
    toggleSubscription,
    deleteSubscription,
  } = useWorkflowTriggers(selectedWorkflowId);

  const availableBlocks = useMemo(() => {
    // Always include built-in blocks (LLM, If/Else, For Loop)
    const builtInBlocksMap = new Map(BUILT_IN_BLOCKS.map(block => [block.type, block]));
    
    // Merge with function blocks from backend, but don't override built-in blocks
    const mergedBlocks = [...BUILT_IN_BLOCKS];
    
    if (functionBlockSchemas.length > 0) {
      functionBlockSchemas.forEach((schema) => {
        // Only add if it's not already a built-in block
        if (!builtInBlocksMap.has(schema.type)) {
          mergedBlocks.push({
            type: schema.type,
            label: schema.label,
            description: schema.description,
            icon: getBlockIconForType(schema.type),
          });
        }
      });
    }
    
    return mergedBlocks;
  }, [functionBlockSchemas]);

  const workflowInputsDef = useMemo(() => loadedWorkflow?.spec?.inputs ?? {}, [loadedWorkflow?.spec?.inputs]);
  const handleWorkflowInputsChange = useCallback(
    async (nextInputs: Record<string, InputDef>) => {
      if (!selectedWorkflowId || !loadedWorkflow) {
        toast.error('Save the workflow before editing inputs');
        return;
      }
      try {
        await backendApiClient.request(`/api/v1/workflows/${selectedWorkflowId}/draft`, {
          method: 'PATCH',
          body: {
            base_revision: loadedWorkflow.draft_revision,
            spec: {
              ...loadedWorkflow.spec,
              inputs: nextInputs,
            },
          },
        });
        const refreshed = await getWorkflow(selectedWorkflowId);
        setLoadedWorkflow(refreshed);
        setNodes(normalizeNodes(refreshed.graph.nodes, functionBlocksMap));
        setEdges(normalizeEdges(refreshed.graph.edges));
      } catch (error) {
        console.error('Failed to update workflow inputs', error);
        toast.error('Unable to update workflow inputs');
        throw error;
      }
    },
    [selectedWorkflowId, loadedWorkflow, getWorkflow, functionBlocksMap, setNodes, setEdges],
  );
  const gmailToolNames = useMemo(() => {
    const normalized = Array.isArray(integrationTools) ? integrationTools : [];
    const names = normalized
      .filter((tool) => {
        const integration = tool.integration_type?.toLowerCase();
        if (integration) {
          return integration === 'gmail';
        }
        return tool.name.toLowerCase().includes('gmail');
      })
      .map((tool) => tool.name);
    return names.length > 0 ? names : GMAIL_TOOL_FALLBACK_NAMES;
  }, [integrationTools]);
  const supabaseToolNames = useMemo(() => {
    const normalized = Array.isArray(integrationTools) ? integrationTools : [];
    const names = normalized
      .filter((tool) => {
        const integration = tool.integration_type?.toLowerCase();
        if (integration) {
          return integration === 'supabase';
        }
        return tool.name.toLowerCase().includes('supabase');
      })
      .map((tool) => tool.name);
    return names.length > 0 ? names : SUPABASE_TOOL_FALLBACK_NAMES;
  }, [integrationTools]);
  const gmailConnectionIdRaw = getConnectionId('gmail');
  const gmailConnectionId = useMemo(
    () => parseProviderConnectionId(gmailConnectionIdRaw),
    [gmailConnectionIdRaw],
  );
  const gmailIntegrationReady = isIntegrationConnected('gmail') && typeof gmailConnectionId === 'number';
  const supabaseIntegrationReady = isIntegrationConnected('supabase');
  const handleConnectGmail = useCallback(async () => {
    setIsConnectingGmail(true);
    try {
      const redirectUrl = await connectIntegration('gmail', { toolNames: gmailToolNames });
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      toast.error('Unable to start Gmail connection');
    } catch (error) {
      console.error('Failed to connect Gmail', error);
      toast.error('Unable to start Gmail connection', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsConnectingGmail(false);
    }
  }, [connectIntegration, gmailToolNames]);
  const handleConnectSupabase = useCallback(async () => {
    setIsConnectingSupabase(true);
    try {
      const redirectUrl = await connectIntegration('supabase', { toolNames: supabaseToolNames });
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      toast.error('Unable to start Supabase connection');
    } catch (error) {
      console.error('Failed to connect Supabase', error);
      toast.error('Unable to start Supabase connection', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsConnectingSupabase(false);
    }
  }, [connectIntegration, supabaseToolNames]);

  const handleBlockSelect = useCallback(
    (block: { type: string; label: string; config?: any }) => {
      // Set default config based on block type
      const defaultConfig = withDefaultBlockConfig(block.type, block.config, functionBlocksMap);
      
      const newNode: Node<WorkflowNodeData> = {
        id: `node-${Date.now()}`,
        type: block.type as any,
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 400 + 100,
        },
        data: {
          type: block.type as any,
          label: block.label,
          config: defaultConfig,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [functionBlocksMap],
  );

  const handleNodeDrop = useCallback(
    (block: { type: string; label: string; config?: any }, position: { x: number; y: number }) => {
      // Set default config based on block type
      const defaultConfig = withDefaultBlockConfig(block.type, block.config, functionBlocksMap);
      
      const newNode: Node<WorkflowNodeData> = {
        id: `node-${Date.now()}`,
        type: block.type as any,
        position,
        data: {
          type: block.type as any,
          label: block.label,
          config: defaultConfig,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [functionBlocksMap],
  );

  const handleNodeConfigUpdate = useCallback(
    (nodeId: string, updates: Partial<WorkflowNodeData>) => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }

          const mergedData: WorkflowNodeData = {
            ...node.data,
            ...updates,
          };

          if (updates.config) {
            const mergedConfig = {
              ...(node.data?.config || {}),
              ...updates.config,
            };

            if ('fields' in updates.config) {
              mergedConfig.fields = updates.config.fields;
            }

            mergedData.config = mergedConfig;
          }

          return {
            ...node,
            data: mergedData,
          };
        }),
      );
    },
    [setNodes],
  );

  const handleAddTriggerDraft = useCallback(
    (triggerKey: string) => {
      const descriptor = triggerCatalog.find((trigger) => trigger.key === triggerKey);
      if (!descriptor) {
        toast.error('Trigger metadata unavailable');
        return;
      }
      const draft: TriggerDraftMeta = {
        id: `trigger-draft-${Date.now()}`,
        triggerKey,
        initialBindings: buildDefaultBindingState(workflowInputsDef),
        initialGmailConfig: triggerKey === GMAIL_TRIGGER_KEY ? makeDefaultGmailConfig() : undefined,
        initialSupabaseConfig: triggerKey === SUPABASE_TRIGGER_KEY ? makeDefaultSupabaseConfig() : undefined,
      };
      setDraftTriggers((prev) => [...prev, draft]);
    },
    [triggerCatalog, workflowInputsDef],
  );

  const handleDiscardTriggerDraft = useCallback((draftId: string) => {
    setDraftTriggers((prev) => prev.filter((draft) => draft.id !== draftId));
  }, []);

  const handleSaveTriggerDraft = useCallback(
    async (
      draftId: string,
      payload: { triggerKey: string; bindings: BindingState; providerConfig?: Record<string, any> },
    ) => {
      if (!selectedWorkflowId) {
        throw new Error('Save the workflow before saving triggers');
      }
      const descriptor = triggerCatalog.find((trigger) => trigger.key === payload.triggerKey);
      if (!descriptor) {
        throw new Error('Trigger metadata unavailable');
      }
      if (payload.triggerKey === GMAIL_TRIGGER_KEY) {
        if (!gmailIntegrationReady || !gmailConnectionId) {
          throw new Error('Connect Gmail before saving this trigger');
        }
      }
      if (payload.triggerKey === SUPABASE_TRIGGER_KEY) {
        if (!supabaseIntegrationReady) {
          throw new Error('Connect Supabase before saving this trigger');
        }
      }
      try {
        await createSubscription({
          workflow_id: selectedWorkflowId,
          trigger_key: payload.triggerKey,
          bindings: buildBindingsPayload(payload.bindings),
          ...(payload.providerConfig ? { provider_config: payload.providerConfig } : {}),
          ...(payload.triggerKey === GMAIL_TRIGGER_KEY
            ? { provider_connection_id: gmailConnectionId ?? undefined }
            : {}),
          enabled: true,
        });
        setDraftTriggers((prev) => prev.filter((draft) => draft.id !== draftId));
      } catch (error) {
        console.error('Failed to save trigger draft', error);
        throw error;
      }
    },
    [
      selectedWorkflowId,
      triggerCatalog,
      gmailIntegrationReady,
      gmailConnectionId,
      supabaseIntegrationReady,
      createSubscription,
    ],
  );

  const handleDraftConflict = useCallback(async () => {
    if (!selectedWorkflowId) {
      return;
    }
    try {
      const latest = await getWorkflow(selectedWorkflowId);
      setLoadedWorkflow(latest);
      setNodes(normalizeNodes(latest.graph.nodes, functionBlocksMap));
      setEdges(normalizeEdges(latest.graph.edges));
      setLastRunVersionId(null);
      resetSavedDataRef.current?.();
      invalidateWorkflowVersions();
      toast.error('Draft conflict detected', {
        description: 'Reloaded the latest draft from the server. Please retry your change.',
      });
    } catch (error) {
      console.error('Failed to refresh workflow after conflict:', error);
      toast.error('Draft conflict detected', {
        description: 'Reload failed. Please refresh the page to continue.',
      });
    }
  }, [selectedWorkflowId, getWorkflow, functionBlocksMap, invalidateWorkflowVersions]);

  const handleSave = useCallback(async () => {
    const graphData = { nodes, edges };

    try {
      if (selectedWorkflowId) {
        if (!loadedWorkflow) {
          toast.error('Workflow is still loading. Please try again in a moment.');
          return;
        }
        const baseRevision = loadedWorkflow.draft_revision;
        if (typeof baseRevision !== 'number') {
          toast.error('Missing draft revision for this workflow.');
          return;
        }
        const updated = await saveWorkflowDraft(selectedWorkflowId, {
          graph: graphData,
          baseRevision,
        });
        setLoadedWorkflow(updated);
        if (updated.draft_revision !== baseRevision) {
          setLastRunVersionId(null);
        }
        toast.success('Draft saved successfully!');
      } else {
        const workflow = await createWorkflow(workflowName || 'Untitled', undefined, graphData);
        setSelectedWorkflowId(workflow.workflow_id);
        setLoadedWorkflow(workflow);
        setWorkflowName(workflow.name);
        setLastRunVersionId(null);
        toast.success('Workflow created and saved!');
      }
    } catch (error) {
      if (error instanceof BackendAPIError && error.status === 409) {
        await handleDraftConflict();
        return;
      }
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    }
  }, [
    nodes,
    edges,
    workflowName,
    selectedWorkflowId,
    createWorkflow,
    saveWorkflowDraft,
    loadedWorkflow,
    handleDraftConflict,
  ]);

  // Autosave callback - only saves if workflow already exists
  const autosaveCallback = useCallback(
    async (data: { nodes: Node<WorkflowNodeData>[]; edges: WorkflowEdge[] }) => {
      if (!selectedWorkflowId || !loadedWorkflow) {
        return; // Don't autosave unsaved workflows or unloaded drafts
      }

      const baseRevision = loadedWorkflow.draft_revision;
      if (typeof baseRevision !== 'number') {
        return;
      }

      setAutosaveStatus('saving');
      try {
        const updated = await saveWorkflowDraft(selectedWorkflowId, {
          graph: { nodes: data.nodes, edges: data.edges },
          baseRevision,
        });
        setLoadedWorkflow(updated);
        if (updated.draft_revision !== baseRevision) {
          setLastRunVersionId(null);
        }
        setAutosaveStatus('saved');
        // Reset status after 2 seconds
        setTimeout(() => setAutosaveStatus('idle'), 2000);
      } catch (error) {
        if (error instanceof BackendAPIError && error.status === 409) {
          await handleDraftConflict();
        } else {
          console.error('Autosave failed:', error);
        }
        setAutosaveStatus('error');
        throw error;
      }
    },
    [selectedWorkflowId, loadedWorkflow, saveWorkflowDraft, handleDraftConflict],
  );

  // Setup autosave hook
  const { triggerSave, resetSavedData } = useDebouncedAutosave({
    data: { nodes, edges },
    onSave: autosaveCallback,
    options: {
      delay: 1000,
      enabled: !!selectedWorkflowId && !isLoadingWorkflow,
    },
  });

  useEffect(() => {
    resetSavedDataRef.current = resetSavedData;
  }, [resetSavedData]);

  // Trigger autosave when nodes or edges change
  useEffect(() => {
    if (selectedWorkflowId && !isLoadingWorkflow) {
      triggerSave();
    }
  }, [nodes, edges, selectedWorkflowId, triggerSave, isLoadingWorkflow]);

  // Handle autosave errors
  useEffect(() => {
    if (autosaveStatus === 'error') {
      toast.error('Autosave failed', {
        description: 'Your changes may not have been saved. Please save manually.',
        duration: 5000,
      });
    }
  }, [autosaveStatus]);

  const previewGraph = useMemo(() => {
    if (!proposalPreview) {
      return null;
    }
    const previewNodes = normalizeNodes(proposalPreview.graph.nodes ?? [], functionBlocksMap);
    const previewEdges = normalizeEdges(proposalPreview.graph.edges ?? []);
    return { nodes: previewNodes, edges: previewEdges };
  }, [proposalPreview, functionBlocksMap]);

  const isPreviewActive = Boolean(previewGraph);
  const triggerHandlers = useMemo(
    () => ({
      update: (subscriptionId: number, payload: TriggerSubscriptionUpdateRequest) =>
        updateSubscription(subscriptionId, payload).then(() => undefined),
      toggle: (subscriptionId: number, enabled: boolean) =>
        toggleSubscription({ subscriptionId, enabled }).then(() => undefined),
      delete: (subscriptionId: number) => deleteSubscription(subscriptionId).then(() => undefined),
      saveDraft: handleSaveTriggerDraft,
      discardDraft: handleDiscardTriggerDraft,
      updateWorkflowInputs: (inputs: Record<string, InputDef>) => handleWorkflowInputsChange(inputs),
    }),
    [
      updateSubscription,
      toggleSubscription,
      deleteSubscription,
      handleSaveTriggerDraft,
      handleDiscardTriggerDraft,
      handleWorkflowInputsChange,
    ],
  );

  const triggerNodes = useMemo(() => {
    const entries = [
      ...triggerSubscriptions.map((subscription) => ({ kind: 'subscription' as const, subscription })),
      ...draftTriggers.map((draft) => ({ kind: 'draft' as const, draft })),
    ];
    return entries.map((entry, index) => {
      const triggerKey =
        entry.kind === 'subscription' ? entry.subscription.trigger_key : entry.draft.triggerKey;
      const descriptor = triggerCatalog.find((trigger) => trigger.key === triggerKey);
      const id =
        entry.kind === 'subscription'
          ? `trigger-${entry.subscription.subscription_id}`
          : entry.draft.id;
      return {
        id,
        type: 'trigger',
        position: {
          x: -360,
          y: index * 220 + 40,
        },
        data: {
          type: 'trigger',
          label: descriptor?.title ?? triggerKey,
          triggerMeta: {
            subscription: entry.kind === 'subscription' ? entry.subscription : undefined,
            descriptor,
            workflowInputs: workflowInputsDef,
            handlers: triggerHandlers,
            integration: (() => {
              const integrationMeta: NonNullable<WorkflowNodeData['triggerMeta']>['integration'] = {};
              if (triggerKey === GMAIL_TRIGGER_KEY) {
                integrationMeta.gmail = {
                  ready: gmailIntegrationReady,
                  connectionId: gmailConnectionId,
                  onConnect: gmailIntegrationReady ? undefined : handleConnectGmail,
                  isConnecting: isConnectingGmail,
                };
              }
              if (triggerKey === SUPABASE_TRIGGER_KEY) {
                integrationMeta.supabase = {
                  ready: supabaseIntegrationReady,
                  onConnect: supabaseIntegrationReady ? undefined : handleConnectSupabase,
                  isConnecting: isConnectingSupabase,
                };
              }
              return Object.keys(integrationMeta).length ? integrationMeta : undefined;
            })(),
            draft: entry.kind === 'draft' ? entry.draft : undefined,
          },
        },
        // draggable: false,
      } as Node<WorkflowNodeData>;
    });
  }, [
    triggerSubscriptions,
    draftTriggers,
    triggerCatalog,
    workflowInputsDef,
    triggerHandlers,
    gmailIntegrationReady,
    gmailConnectionId,
    handleConnectGmail,
    isConnectingGmail,
    supabaseIntegrationReady,
    handleConnectSupabase,
    isConnectingSupabase,
  ]);

  const baseCanvasNodes = useMemo(
    () => previewGraph?.nodes ?? nodes,
    [previewGraph?.nodes, nodes]
  );
  const canvasNodes = useMemo(
    () => [...baseCanvasNodes, ...triggerNodes],
    [baseCanvasNodes, triggerNodes],
  );
  const canvasEdges = previewGraph?.edges ?? edges;
  const handleCanvasNodesChange = useCallback(
    (updatedNodes: Node<WorkflowNodeData>[]) => {
      const workflowNodesOnly = updatedNodes.filter((node) => node.type !== 'trigger');

      setNodes(prevNodes => {
        // Only update if nodes actually changed
        if (prevNodes.length === workflowNodesOnly.length) {
          const hasChanges = prevNodes.some((prevNode, idx) => {
            const newNode = workflowNodesOnly[idx];
            return prevNode.id !== newNode?.id ||
                   prevNode.position !== newNode?.position ||
                   prevNode.data !== newNode?.data;
          });
          if (!hasChanges) {
            return prevNodes; // Prevent unnecessary state update
          }
        }
        return workflowNodesOnly;
      });
    },
    [], // Remove setNodes from deps - it's stable
  );

  const handleCanvasNodeDoubleClick = useCallback(
    (node: Node<WorkflowNodeData>) => {
      if (node.type === 'trigger') {
        return;
      }
      setEditingNodeId(node.id);
      setIsConfigDialogOpen(true);
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId],
  );

  const handleConfigDialogOpenChange = useCallback((open: boolean) => {
    setIsConfigDialogOpen(open);
    if (!open) {
      setEditingNodeId(null);
    }
  }, []);

  useEffect(() => {
    if (isPreviewActive) {
      setSelectedNodeId(null);
    }
  }, [isPreviewActive]);

  useEffect(() => {
    setDraftTriggers([]);
  }, [selectedWorkflowId]);

  useEffect(() => {
    if (!editingNodeId) {
      return;
    }
    const exists = nodes.some((node) => node.id === editingNodeId);
    if (!exists) {
      setEditingNodeId(null);
      setIsConfigDialogOpen(false);
    }
  }, [editingNodeId, nodes]);

  const inputFields = useMemo(() => {
    const resolveHtmlInputType = (inputType: InputDef['type']): string => {
      if (inputType === 'number' || inputType === 'integer') {
        return 'number';
      }
      return 'text';
    };
    return Object.entries(workflowInputsDef).map(([name, def]) => ({
      id: name,
      label: def.description || name,
      type: resolveHtmlInputType(def.type),
      required: def.required !== false,
      variableName: name,
    }));
  }, [workflowInputsDef]);

  const triggerOptions = useMemo<TriggerListOption[]>(() => {
    const options: TriggerListOption[] = [];

    const webhookTrigger = triggerCatalog.find((trigger) => trigger.key === WEBHOOK_TRIGGER_KEY);
    if (webhookTrigger) {
      options.push({
        key: WEBHOOK_TRIGGER_KEY,
        title: webhookTrigger.title ?? 'Generic Webhook',
        description:
          webhookTrigger.description ?? 'Accept HTTP POST requests from any service.',
        disabled: false,
        onPrimaryAction: () => handleAddTriggerDraft(WEBHOOK_TRIGGER_KEY),
        actionLabel: 'Add to canvas',
        badge: 'Webhook',
        status: 'ready',
      });
    }

    const gmailTrigger = triggerCatalog.find((trigger) => trigger.key === GMAIL_TRIGGER_KEY);
    if (gmailTrigger) {
      let disabledReason: string | undefined;
      let disabled = false;
      let secondaryActionLabel: string | undefined;
      let onSecondaryAction: (() => void) | undefined;
      if (!gmailIntegrationReady) {
        disabledReason = 'Connect Gmail to continue';
        disabled = true;
        secondaryActionLabel = 'Connect Gmail';
        onSecondaryAction = handleConnectGmail;
      }

      options.push({
        key: GMAIL_TRIGGER_KEY,
        title: gmailTrigger.title ?? 'Gmail – New Email',
        description:
          gmailTrigger.description ?? 'Poll a Gmail inbox for newly received emails.',
        disabled,
        disabledReason,
        onPrimaryAction: () => handleAddTriggerDraft(GMAIL_TRIGGER_KEY),
        actionLabel: 'Add to canvas',
        badge: gmailIntegrationReady ? 'Connected' : 'Action required',
        status: gmailIntegrationReady ? 'ready' : 'action-required',
        secondaryActionLabel,
        onSecondaryAction,
        isSecondaryActionLoading: secondaryActionLabel ? isConnectingGmail : false,
      });
    }

    const cronTrigger = triggerCatalog.find((trigger) => trigger.key === CRON_TRIGGER_KEY);
    if (cronTrigger) {
      options.push({
        key: CRON_TRIGGER_KEY,
        title: cronTrigger.title ?? 'Cron Schedule',
        description: cronTrigger.description ?? 'Schedule workflows with cron expressions',
        disabled: false,
        onPrimaryAction: () => handleAddTriggerDraft(CRON_TRIGGER_KEY),
        actionLabel: 'Add to canvas',
        badge: 'Scheduler',
        status: 'ready',
      });
    }

    const supabaseTrigger = triggerCatalog.find((trigger) => trigger.key === SUPABASE_TRIGGER_KEY);
    if (supabaseTrigger) {
      const supabaseDisabled = !supabaseIntegrationReady;
      options.push({
        key: SUPABASE_TRIGGER_KEY,
        title: supabaseTrigger.title ?? 'Supabase – Database Changes',
        description:
          supabaseTrigger.description ??
          'Receive real-time webhooks when rows in your Supabase tables change.',
        disabled: supabaseDisabled,
        disabledReason: supabaseDisabled ? 'Connect Supabase to continue' : undefined,
        onPrimaryAction: () => handleAddTriggerDraft(SUPABASE_TRIGGER_KEY),
        actionLabel: 'Add to canvas',
        badge: 'Supabase',
        status: supabaseDisabled ? 'action-required' : 'ready',
        secondaryActionLabel: supabaseDisabled ? 'Connect Supabase' : undefined,
        onSecondaryAction: supabaseDisabled ? handleConnectSupabase : undefined,
        isSecondaryActionLoading: supabaseDisabled ? isConnectingSupabase : false,
      });
    }

    return options;
  }, [
    triggerCatalog,
    handleAddTriggerDraft,
    gmailIntegrationReady,
    handleConnectGmail,
    isConnectingGmail,
    supabaseIntegrationReady,
    handleConnectSupabase,
    isConnectingSupabase,
  ]);
  const triggerInfoMessage = undefined;

  const lifecycleStatus = useMemo(() => {
    if (!loadedWorkflow) {
      return null;
    }
    return {
      draftRevision: loadedWorkflow.draft_revision,
      latestVersion: loadedWorkflow.latest_version ?? null,
      publishedVersion: loadedWorkflow.published_version ?? null,
      lastTestedVersionId: lastRunVersionId,
    };
  }, [loadedWorkflow, lastRunVersionId]);

  const canRun = Boolean(selectedWorkflowId);
  const runDisabledReason = canRun ? undefined : 'Save the workflow before testing';
  const canPublish = Boolean(selectedWorkflowId && lastRunVersionId);
  // every workflow can be published 
  //todo: add more checks if needed
  // const canPublish = Boolean(selectedWorkflowId);
  const publishDisabledReason = !selectedWorkflowId
    ? 'Save the workflow before publishing'
    : !lastRunVersionId
      ? 'Run a test to create a publishable version'
      : undefined;

  const runWorkflowTest = useCallback(
    async (inputs?: Record<string, any>) => {
      if (!selectedWorkflowId) {
        toast.error('Please save the workflow first');
        return;
      }
      try {
        const response = await executeWorkflow(selectedWorkflowId, inputs ?? {});
        setLastRunVersionId(response.workflow_version_id ?? null);
        invalidateWorkflowVersions();
        toast.success('Test run started', {
          description: `Run ID ${response.run_id}`,
        });
      } catch (error) {
        console.error('Failed to execute workflow:', error);
        toast.error('Failed to start test run');
        throw error;
      }
    },
    [selectedWorkflowId, executeWorkflow, invalidateWorkflowVersions],
  );

  const handleExecute = useCallback(() => {
    if (!selectedWorkflowId) {
      toast.error('Please save the workflow first');
      return;
    }

    if (inputFields.length > 0) {
      setInputData({});
      setShowInputDialog(true);
      return;
    }

    runWorkflowTest();
  }, [selectedWorkflowId, inputFields, runWorkflowTest]);

  const handleExecuteWithInput = useCallback(async () => {
    if (!selectedWorkflowId) {
      toast.error('Please save the workflow first');
      return;
    }

    const transformedInputData: Record<string, any> = {};
    inputFields.forEach((field) => {
      const value = inputData[field.id];
      transformedInputData[field.variableName] = value;
    });

    try {
      await runWorkflowTest(transformedInputData);
      setShowInputDialog(false);
      setInputData({});
    } catch {
      // runWorkflowTest handles toasts/logging
    }
  }, [selectedWorkflowId, inputFields, inputData, runWorkflowTest]);

  const handlePublish = useCallback(async () => {
    if (!selectedWorkflowId) {
      toast.error('Please save the workflow before publishing');
      return;
    }
    if (!lastRunVersionId) {
      toast.error('Run a test to create a publishable version');
      return;
    }
    try {
      const updated = await publishWorkflow(selectedWorkflowId, lastRunVersionId);
      setLoadedWorkflow(updated);
      setLastRunVersionId(null);
      invalidateWorkflowVersions();
      toast.success('Workflow published');
    } catch (error) {
      console.error('Failed to publish workflow:', error);
      toast.error('Failed to publish workflow');
    }
  }, [selectedWorkflowId, lastRunVersionId, publishWorkflow, invalidateWorkflowVersions]);

  const handleLoadWorkflow = useCallback(
    async (workflow: WorkflowListItem) => {
      // Navigate to the workflow URL - the useEffect will handle loading
      navigate(`/workflows/${workflow.workflow_id}`, { replace: true });
    },
    [navigate],
  );

  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }
    try {
      await deleteWorkflow(workflowId);
      // Navigate to /workflows if the deleted workflow was selected
      if (selectedWorkflowId === workflowId) {
        navigate('/workflows', { replace: true });
        setLastRunVersionId(null);
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow');
    }
  }, [deleteWorkflow, selectedWorkflowId, navigate]);

  const handleRenameWorkflow = useCallback(async (workflowId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error('Workflow name cannot be empty');
      return;
    }
    try {
      await updateWorkflowMetadata(workflowId, { name: newName.trim() });
      // Update local workflow name if it's the currently selected workflow
      if (selectedWorkflowId === workflowId) {
        setWorkflowName(newName.trim());
        setLoadedWorkflow((prev) =>
          prev ? { ...prev, name: newName.trim() } : prev,
        );
      }
      toast.success('Workflow renamed successfully');
    } catch (error) {
      console.error('Failed to rename workflow:', error);
      toast.error('Failed to rename workflow');
      throw error; // Re-throw to allow ToolPalette to handle it
    }
  }, [updateWorkflowMetadata, selectedWorkflowId]);

  const handleNewWorkflow = useCallback(async () => {
    try {
      const workflow = await createWorkflow('Untitled', undefined, { nodes: [], edges: [] });
      // Navigate to the new workflow's URL - the useEffect will handle loading
      navigate(`/workflows/${workflow.workflow_id}`, { replace: true });
      // Workflow will appear in list automatically via React Query cache invalidation
    } catch (error) {
      console.error('Failed to create new workflow:', error);
      toast.error('Failed to create new workflow');
    }
  }, [createWorkflow, navigate]);

  const handleWorkflowGraphSync = useCallback(
    (graph?: { nodes?: Node<WorkflowNodeData>[]; edges?: WorkflowEdge[] }) => {
      if (!graph) return;
      setNodes(normalizeNodes(graph.nodes, functionBlocksMap));
      setEdges(normalizeEdges(graph.edges));
      setProposalPreview(null);
      setLastRunVersionId(null);
    },
    [functionBlocksMap],
  );

  const handleRestoreVersion = useCallback(
    async (versionId: number) => {
      if (!selectedWorkflowId) {
        toast.error('Select a workflow before restoring a version');
        return;
      }
      if (!loadedWorkflow) {
        toast.error('Workflow is still loading. Please try again in a moment.');
        return;
      }
      try {
        const restored = await restoreWorkflowVersion(selectedWorkflowId, {
          versionId,
          baseRevision: loadedWorkflow.draft_revision,
        });
        setLoadedWorkflow(restored);
        setNodes(normalizeNodes(restored.graph.nodes, functionBlocksMap));
        setEdges(normalizeEdges(restored.graph.edges));
        setLastRunVersionId(null);
        resetSavedDataRef.current?.();
        toast.success('Version restored', {
          description: `Draft now matches version ${versionId}`,
        });
      } catch (error) {
        console.error('Failed to restore workflow version:', error);
        if (error instanceof BackendAPIError && error.status === 409) {
          await handleDraftConflict();
          return;
        }
        toast.error('Failed to restore version', {
          description: error instanceof BackendAPIError ? error.message : undefined,
        });
      }
    },
    [
      selectedWorkflowId,
      loadedWorkflow,
      restoreWorkflowVersion,
      functionBlocksMap,
      handleDraftConflict,
    ],
  );

  const handleProposalPreviewChange = useCallback((preview: WorkflowProposalPreview | null) => {
    setProposalPreview(preview);
  }, []);

  const [buildChatCollapsed, setBuildChatCollapsed] = useState(() => {
    const saved = localStorage.getItem('buildChatPanelCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleBuildChatCollapseChange = useCallback((collapsed: boolean) => {
    setBuildChatCollapsed(collapsed);
    localStorage.setItem('buildChatPanelCollapsed', JSON.stringify(collapsed));
  }, []);


  // Check backend health
  const { isHealthy } = useBackendHealth(10000); // Check every 10 seconds

  // Show toast notifications for backend status changes
  useEffect(() => {
    if (isHealthy === true) {
      toast.success('Backend Connected', {
        description: 'Successfully connected to backend server',
        duration: 3000,
      });
    } else if (isHealthy === false) {
      toast.error('Backend Disconnected', {
        description: 'Unable to connect to backend server',
        duration: 5000,
      });
    }
  }, [isHealthy]);

  // Handle OAuth connection redirect - refresh integration status when connected
  useEffect(() => {
    const connectedParam = searchParams.get('connected');
    if (connectedParam) {
      // Refresh integration tools status to reflect new connection
      refreshIntegrationTools();
      
      // Show success toast
      toast.success('Integration Connected', {
        description: `Successfully connected to ${connectedParam}`,
        duration: 3000,
      });
      
      // Remove query parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('connected');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, refreshIntegrationTools, setSearchParams]);

  // Sync URL param with state - load workflow when URL changes
  useEffect(() => {
    // If URL has workflowId but loaded workflow doesn't match, load the workflow
    if (urlWorkflowId && urlWorkflowId !== loadedWorkflow?.workflow_id) {
      const loadWorkflowFromUrl = async () => {
        setIsLoadingWorkflow(true);
        try {
          const fullWorkflow = await getWorkflow(urlWorkflowId);
          setSelectedWorkflowId(fullWorkflow.workflow_id);
          setWorkflowName(fullWorkflow.name);
          setLoadedWorkflow(fullWorkflow);
          setNodes(normalizeNodes(fullWorkflow.graph.nodes, functionBlocksMap));
          setEdges(normalizeEdges(fullWorkflow.graph.edges));
          setProposalPreview(null);
          setLastRunVersionId(null);
          resetSavedDataRef.current?.();
        } catch (error) {
          console.error('Failed to load workflow from URL:', error);
          toast.error('Failed to load workflow', {
            description: 'The workflow may not exist or you may not have access to it.',
          });
          // Redirect to /workflows if workflow doesn't exist
          navigate('/workflows', { replace: true });
        } finally {
          setTimeout(() => setIsLoadingWorkflow(false), 100);
        }
      };
      loadWorkflowFromUrl();
    } else if (!urlWorkflowId && loadedWorkflow) {
      // If URL doesn't have workflowId but we have a loaded workflow, clear the selection
      setSelectedWorkflowId(null);
      setWorkflowName('My Workflow');
      setNodes([]);
      setEdges([]);
      setLoadedWorkflow(null);
      setProposalPreview(null);
      setLastRunVersionId(null);
      resetSavedDataRef.current?.();
    }
  }, [urlWorkflowId, loadedWorkflow, getWorkflow, functionBlocksMap, navigate]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* Main Canvas Area */}
        <ResizablePanel defaultSize={75} minSize={50} className="flex flex-col">
          {/* Canvas */}
          <ReactFlowProvider>
            <div className="flex-1 relative overflow-hidden">
              <WorkflowCanvas
              key={selectedWorkflowId ?? 'new'}
              initialNodes={canvasNodes}
              initialEdges={canvasEdges}
              onNodesChange={isPreviewActive ? undefined : handleCanvasNodesChange}
              onEdgesChange={isPreviewActive ? undefined : setEdges}
              onNodeSelect={isPreviewActive ? undefined : setSelectedNodeId}
              onNodeDoubleClick={isPreviewActive ? undefined : handleCanvasNodeDoubleClick}
              onNodeDrop={isPreviewActive ? undefined : handleNodeDrop}
              selectedNodeId={isPreviewActive ? null : selectedNodeId}
              readOnly={isPreviewActive}
            />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-none">
              <div className="pointer-events-auto">
                <WorkflowLifecycleBar
                  lifecycleStatus={lifecycleStatus}
                  onRunClick={handleExecute}
                  onPublishClick={handlePublish}
                  isExecuting={isExecuting}
                  isPublishing={isPublishing}
                isRestoringVersion={isRestoringVersion}
                  canRun={canRun}
                  canPublish={canPublish}
                  publishDisabledReason={publishDisabledReason}
                  runDisabledReason={runDisabledReason}
                versionOptions={workflowVersions}
                isVersionsLoading={isLoadingWorkflowVersions}
                onVersionRestore={handleRestoreVersion}
                versionRestoreDisabledReason={
                  selectedWorkflowId ? undefined : 'Save the workflow before restoring versions'
                }
                />
              </div>
              {proposalPreview && (
                <div className="pointer-events-auto">
                  <div className="bg-sky-900/90 text-white px-4 py-2 rounded-full shadow-lg max-w-xl text-center">
                    <p className="text-sm font-medium">Previewing workflow proposal</p>
                    <p className="text-xs text-slate-100 line-clamp-2">
                      {proposalPreview.proposal.summary}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Floating Workflows Panel */}
            <FloatingWorkflowsPanel
              workflows={workflows}
              isLoadingWorkflows={isLoadingWorkflows}
              selectedWorkflowId={selectedWorkflowId}
              onLoadWorkflow={handleLoadWorkflow}
              onDeleteWorkflow={handleDeleteWorkflow}
              onRenameWorkflow={handleRenameWorkflow}
              onNewWorkflow={handleNewWorkflow}
            />
            
            </div>
          </ReactFlowProvider>
        </ResizablePanel>
        
        {/* Build & Chat Panel - Always render with collapsible behavior */}
        {buildChatSupported && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel 
              key={buildChatCollapsed ? 'collapsed' : 'expanded'}
              defaultSize={buildChatCollapsed ? 3 : 25} 
              minSize={3}
              maxSize={50}
              collapsible
              className="border-l"
            >
              <BuildAndChatPanel
                onBlockSelect={handleBlockSelect}
                workflowId={selectedWorkflowId}
                nodes={nodes}
                edges={edges}
                onWorkflowGraphSync={handleWorkflowGraphSync}
                onProposalPreviewChange={handleProposalPreviewChange}
                activePreviewProposalId={proposalPreview?.proposal.id ?? null}
                collapsed={buildChatCollapsed}
                onCollapseChange={handleBuildChatCollapseChange}
                functionBlocks={availableBlocks}
                triggerOptions={triggerOptions}
                isLoadingTriggers={isLoadingTriggers || isLoadingSubscriptions}
                triggerInfoMessage={triggerInfoMessage}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <WorkflowNodeConfigDialog
        open={isConfigDialogOpen}
        node={editingNode}
        allNodes={nodes}
        allEdges={edges}
        onOpenChange={handleConfigDialogOpenChange}
        onUpdate={handleNodeConfigUpdate}
        workflowInputs={workflowInputsDef}
      />

      {/* Input Dialog */}
      <AlertDialog open={showInputDialog} onOpenChange={setShowInputDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workflow Input</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide input values for this workflow
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {inputFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  type={field.type}
                  value={inputData[field.id] || ''}
                  onChange={(e) => setInputData({ ...inputData, [field.id]: e.target.value })}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecuteWithInput}>
              Run Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

