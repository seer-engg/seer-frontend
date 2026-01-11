import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToolsStore } from '@/stores/toolsStore';
import { useWorkflowSave } from '@/hooks/useWorkflowSave';
import type { IntegrationType } from '@/lib/integrations/client';
import { INTEGRATION_META } from './IntegrationStatusPanel';

/**
 * Compact inline status badge for a single integration
 */
export function IntegrationBadge({
  type,
  toolNames,
  showConnect = true,
  className
}: {
  type: IntegrationType;
  toolNames?: string[];
  showConnect?: boolean;
  className?: string;
}) {
  const isIntegrationConnected = useToolsStore((state) => state.isIntegrationConnected);
  const connectIntegration = useToolsStore((state) => state.connectIntegration);
  const isLoading = useToolsStore((state) => state.toolsLoading);
  const isConnected = isIntegrationConnected(type);
  const meta = INTEGRATION_META[type];
  const { saveWorkflow, hasWorkflow } = useWorkflowSave();

  if (!meta) return null;

  const handleConnect = async () => {
    if (!toolNames || toolNames.length === 0) {
      console.error(`[IntegrationBadge] Cannot connect ${type} without explicit tool names. Pass toolNames prop.`);
      return;
    }

    if (hasWorkflow) {
      await saveWorkflow();
    }
    const redirectUrl = await connectIntegration(type, { toolNames });
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  if (isLoading) {
    return (
      <Badge variant="secondary" className={cn('animate-pulse', className)}>
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        {meta.displayName}
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          className
        )}
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {meta.displayName}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 cursor-pointer hover:bg-amber-500/20',
        className
      )}
      onClick={showConnect ? handleConnect : undefined}
    >
      <AlertTriangle className="w-3 h-3 mr-1" />
      {meta.displayName}
      {showConnect && <ExternalLink className="w-3 h-3 ml-1" />}
    </Badge>
  );
}
