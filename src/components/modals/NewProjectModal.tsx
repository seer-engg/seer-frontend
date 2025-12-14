import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, LayoutTemplate, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GitHubRepo, Template } from '@/types/workflow';
import { Button } from '@/components/ui/button';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (type: 'github' | 'template', data: GitHubRepo | Template) => void;
}

const mockRepos: GitHubRepo[] = [
  { id: '1', name: 'trading-agent', fullName: 'dan/trading-agent', description: 'Automated trading bot', private: false },
  { id: '2', name: 'github-asana-sync', fullName: 'dan/github-asana-sync', description: 'GitHub to Asana sync tool', private: true },
  { id: '3', name: 'slack-bot', fullName: 'dan/slack-bot', description: 'Custom Slack automation', private: false },
];

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
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  const handleGitHubAuth = async () => {
    setIsAuthorizing(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsAuthorizing(false);
    setStep('github-select');
  };

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
  };

  const handleConfirmRepo = () => {
    if (selectedRepo) {
      onComplete('github', selectedRepo);
      resetAndClose();
    }
  };

  const handleTemplateSelect = (template: Template) => {
    onComplete('template', template);
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep('choose');
    setSelectedRepo(null);
    onClose();
  };

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
                      <p className="font-medium text-foreground">Export Existing</p>
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
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mx-auto mb-4">
                    <Github className="w-8 h-8 text-background" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Authorize GitHub</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your GitHub account to import repositories
                  </p>
                  <Button
                    onClick={handleGitHubAuth}
                    disabled={isAuthorizing}
                    className="w-full"
                  >
                    {isAuthorizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Authorizing...
                      </>
                    ) : (
                      'Authorize GitHub'
                    )}
                  </Button>
                </div>
              )}

              {step === 'github-select' && (
                <div className="space-y-3">
                  {mockRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleRepoSelect(repo)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                        selectedRepo?.id === repo.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Github className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{repo.fullName}</p>
                        <p className="text-sm text-muted-foreground truncate">{repo.description}</p>
                      </div>
                      {selectedRepo?.id === repo.id && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                  
                  <Button
                    onClick={handleConfirmRepo}
                    disabled={!selectedRepo}
                    className="w-full mt-4"
                  >
                    Import Repository
                  </Button>
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
