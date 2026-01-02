/**
 * ExecutionActions - Action buttons for workflow execution details
 *
 * Provides retry and export functionality for workflow runs
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw, Download, Loader2 } from 'lucide-react';
import { backendApiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ExecutionActionsProps {
  workflowId: string;
  runId: string;
  workflowName?: string;
  inputs?: Record<string, any> | null;
  historyData?: any;
  className?: string;
}

export function ExecutionActions({
  workflowId,
  runId,
  workflowName = 'workflow',
  inputs,
  historyData,
  className,
}: ExecutionActionsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!inputs) {
      toast({
        title: 'Cannot retry',
        description: 'No input data available for this execution',
        variant: 'destructive',
      });
      return;
    }

    setIsRetrying(true);
    try {
      const response = await backendApiClient.request<{ run_id: string }>(
        `/api/v1/workflows/${workflowId}/runs`,
        {
          method: 'POST',
          body: JSON.stringify({ inputs }),
        }
      );

      toast({
        title: 'Workflow re-run started',
        description: `New run ID: ${response.run_id}`,
      });

      // Navigate to the new run
      navigate(`/workflows/${workflowId}/traces/${response.run_id}`);
    } catch (error) {
      console.error('Failed to retry workflow:', error);
      toast({
        title: 'Failed to retry',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleExport = () => {
    if (!historyData) {
      toast({
        title: 'Cannot export',
        description: 'No execution data available',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create export data
      const exportData = {
        run_id: runId,
        workflow_id: workflowId,
        workflow_name: workflowName,
        exported_at: new Date().toISOString(),
        ...historyData,
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const sanitizedName = workflowName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${sanitizedName}-${runId}-${timestamp}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: 'Execution data downloaded',
      });
    } catch (error) {
      console.error('Failed to export:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying || !inputs}
          title={!inputs ? 'No input data available' : 'Re-run this workflow with the same inputs'}
        >
          {isRetrying ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RotateCw className="w-4 h-4 mr-2" />
          )}
          Retry
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!historyData}
          title="Export execution data as JSON"
        >
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>
    </div>
  );
}
