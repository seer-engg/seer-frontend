import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, LayoutTemplate, Loader2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GitHubRepo, Template } from '@/types/workflow';
import { AgentSummary } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { IntegrationConnect } from '@/components/seer/integrations/IntegrationConnect';
import { GithubRepoSelector, type GithubRepo as GithubRepoSelection } from '@/components/seer/integrations/GithubRepoSelector';
import { agentsApi } from '@/lib/agents-api';
import { useToast } from '@/components/ui/use-toast';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (type: 'github' | 'template', data: GitHubRepo | Template, agent?: AgentSummary) => void;
}

const templates: Template[] = [
  { id: '1', name: 'GitHub Integration', description: 'Connect to GitHub webhooks and APIs', icon: '🔗', category: 'Integration' },
  { id: '2', name: 'Slack Bot', description: 'Build conversational Slack bots', icon: '💬', category: 'Messaging' },
  { id: '3', name: 'Data Pipeline', description: 'ETL and data processing agents', icon: '📊', category: 'Data' },
  { id: '4', name: 'Email Automation', description: 'Automated email responses', icon: '📧', category: 'Automation' },
  { id: '5', name: 'API Gateway', description: 'Multi-service API orchestration', icon: '🌐', category: 'Integration' },
  { id: '6', name: 'Task Manager', description: 'Project management integration', icon: '✅', category: 'Productivity' },
];

type Step = 'choose' | 'github-auth' | 'github-select' | 'template-select';

export function NewProjectModal({ isOpen, onClose, onComplete }: NewProjectModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (connectionId && step === 'github-auth') {
      setStep('github-select');
    }
  }, [connectionId, step]);

  useEffect(() => {
    if (!connectionId) {
      setSelectedRepo(null);
    }
  }, [connectionId]);

  const handleRepoResolved = (repo: GithubRepoSelection) => {
    const idValue = String(repo.id ?? repo.full_name ?? repo.name);
    const fallbackName = repo.full_name ?? repo.name ?? 'repository';
    setSelectedRepo({
      id: idValue,
      name: repo.name ?? fallbackName,
      fullName: fallbackName,
      description: repo.description ?? '',
      private: Boolean(repo.private),
      htmlUrl: repo.html_url ?? undefined,
      defaultBranch: repo.default_branch ?? undefined,
      owner: repo.owner?.login,
    });
  };

  const handleImportRepository = async () => {
    if (!selectedRepo || !connectionId) {
      return;
    }

    setIsImporting(true);
    try {
      const agent = await agentsApi.importFromGithub({
        connectionId,
        repoId: String(selectedRepo.id),
        repoFullName: selectedRepo.fullName ?? selectedRepo.name,
        repoDescription: selectedRepo.description,
        repoPrivate: selectedRepo.private,
        repoDefaultBranch: selectedRepo.defaultBranch,
        repoHtmlUrl: selectedRepo.htmlUrl,
        name: selectedRepo.fullName ?? selectedRepo.name,
      });
      toast({
        title: 'Repository imported',
        description: `${selectedRepo.fullName ?? selectedRepo.name} is now available in your dashboard.`,
      });
      // Pass the agent with threadId to the parent
      onComplete('github', selectedRepo, agent);
      resetAndClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Failed to import repository',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    onComplete('template', template);
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep('choose');
    setSelectedRepo(null);
    setConnectedAccountId(null);
    setIsImporting(false);
    onClose();
  };

  const renderGithubConnectionCard = () => (
    <IntegrationConnect
      type="github"
      onConnected={(accountId) => setConnectionId(accountId ?? null)}
    >
      {({ status, connectionId: activeConnectionId, isLoading, onAuthorize, onRefresh, onCancel }) => {
        const isConnected = status === 'connected' && Boolean(activeConnectionId);
        return (
          <div className="space-y-3 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">GitHub Authorization</p>
                <p className="text-xs text-muted-foreground">Connect GitHub to import repositories.</p>
              </div>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full capitalize',
                  status === 'connected' && 'bg-emerald-500/10 text-emerald-600',
                  status === 'pending' && 'bg-blue-500/10 text-blue-600',
                  status === 'needs-auth' && 'bg-yellow-500/10 text-yellow-600',
                  status === 'error' && 'bg-destructive/10 text-destructive',
                  status === 'unknown' && 'bg-muted text-muted-foreground',
                )}
              >
                {status.replace('-', ' ')}
              </span>
            </div>

            {status === 'needs-auth' && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onAuthorize();
                }}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Authorize GitHub
                  </>
                )}
              </Button>
            )}

            {status === 'pending' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh();
                  }}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                    setConnectedAccountId(null);
                    setStep('github-auth');
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Authorization failed. Try again.</span>
              </div>
            )}

            {isConnected && (
              <div className="text-xs text-muted-foreground">
                Connected account: {activeConnectionId}
              </div>
            )}
          </div>
        );
      }}
    </IntegrationConnect>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={resetAndClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {step === 'choose' && 'Create New Agent'}
                {step === 'github-auth' && 'Connect GitHub'}
                {step === 'github-select' && 'Select Repository'}
                {step === 'template-select' && 'Choose Template'}
              </h2>
              <button
                onClick={resetAndClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 'choose' && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep('github-auth')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-all"
                  >
                    <div className="w-14 h-14 rounded-xl bg-foreground flex items-center justify-center">
                      <Github className="w-7 h-7 text-background" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">Import Existing</p>
                      <p className="text-sm text-muted-foreground mt-1">Import from GitHub</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setStep('template-select')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-all"
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                      <LayoutTemplate className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">Base Template</p>
                      <p className="text-sm text-muted-foreground mt-1">Start from scratch</p>
                    </div>
                  </button>
                </div>
              )}

              {step === 'github-auth' && (
                <div className="space-y-4">
                  {renderGithubConnectionCard()}
                  <p className="text-xs text-muted-foreground text-center">
                    Once connected, you&apos;ll be able to choose a repository to import.
                  </p>
                </div>
              )}

              {step === 'github-select' && (
                <div className="space-y-4">
                  {renderGithubConnectionCard()}
                  {connectionId ? (
                    <>
                      <GithubRepoSelector
                        connectionId={connectionId}
                        onRepoResolved={handleRepoResolved}
                      />
                      {selectedRepo && (
                        <div className="text-xs text-muted-foreground border border-border rounded-lg p-3">
                          <p className="font-medium text-foreground">{selectedRepo.fullName}</p>
                          {selectedRepo.description && (
                            <p className="mt-1">{selectedRepo.description}</p>
                          )}
                        </div>
                      )}
                      <Button
                        onClick={handleImportRepository}
                        disabled={!selectedRepo || isImporting}
                        className="w-full mt-2"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          'Import Repository'
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        GitHub account disconnected.{' '}
                        <button
                          className="underline"
                          onClick={() => setStep('github-auth')}
                        >
                          Re-authorize.
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {step === 'template-select' && (
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-all text-left"
                    >
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <p className="font-medium text-foreground text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {template.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Back button for nested steps */}
            {step !== 'choose' && (
              <div className="px-6 pb-6">
                <button
                  onClick={() => setStep('choose')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to options
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
