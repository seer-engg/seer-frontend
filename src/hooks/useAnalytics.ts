/**
 * Custom hook for analytics tracking throughout the app
 */
import { posthog } from '@/lib/posthog'

export const useAnalytics = () => {
  const trackWorkflowCreated = (workflowId: string, workflowName: string) => {
    if (!posthog.__loaded) return

    posthog.capture('workflow_created', {
      workflow_id: workflowId,
      workflow_name: workflowName,
    })
  }

  const trackWorkflowExecuted = (workflowId: string, status: string, durationMs: number) => {
    if (!posthog.__loaded) return

    posthog.capture('workflow_executed', {
      workflow_id: workflowId,
      status,
      duration_ms: durationMs,
    })
  }

  const trackAgentRun = (agentType: string, threadId: string, status: string) => {
    if (!posthog.__loaded) return

    posthog.capture('agent_run', {
      agent_type: agentType,
      thread_id: threadId,
      status,
    })
  }

  const trackIntegrationConnected = (integration: string) => {
    if (!posthog.__loaded) return

    posthog.capture('integration_connected', {
      integration,
    })
  }

  const trackFeatureUsed = (feature: string, metadata?: Record<string, unknown>) => {
    if (!posthog.__loaded) return

    posthog.capture('feature_used', {
      feature,
      ...metadata,
    })
  }

  return {
    trackWorkflowCreated,
    trackWorkflowExecuted,
    trackAgentRun,
    trackIntegrationConnected,
    trackFeatureUsed,
  }
}
