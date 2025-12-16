import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { Sidebar } from '@/components/layout/Sidebar';
import { AgentCard } from '@/components/agents/AgentCard';
import { NewProjectCard } from '@/components/agents/NewProjectCard';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { GitHubRepo, Template } from '@/types/workflow';
import { AgentSummary } from '@/types/agent';
import { agentsApi } from '@/lib/agents-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

interface DashboardProps {
  onStartProject: (
    type: 'github' | 'template', 
    data: GitHubRepo | Template,
    agent?: AgentSummary
  ) => void;
}

export function Dashboard({ onStartProject }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('agents');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: agents = [],
    isLoading: agentsLoading,
    isError: agentsError,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.listAgents(),
  });

  const handleNewProject = (type: 'github' | 'template', data: GitHubRepo | Template, agent?: AgentSummary) => {
    setIsModalOpen(false);
    // Refetch agents list in background
    queryClient.invalidateQueries({ queryKey: ['agents'] });
    // Pass the agent data (includes threadId) directly from the import response
    onStartProject(type, data, agent);
  };

  const handleAgentClick = (agent: AgentSummary) => {
    // Create a GitHubRepo-like object from the agent data
    const repoData: GitHubRepo = {
      id: String(agent.id),
      name: agent.name,
      fullName: agent.repoFullName ?? agent.name,
      description: agent.repoDescription ?? '',
      private: agent.repoPrivate ?? false,
    };
    
    onStartProject('github', repoData, agent);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* <Sidebar activeTab={activeTab} onTabChange={setActiveTab} /> */}
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center justify-between h-16 px-8">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Agents</h1>
              <p className="text-sm text-muted-foreground">Manage your AI agents</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'agents' && (
            <div className="space-y-6">
              {agentsLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, idx) => (
                    <Skeleton key={idx} className="h-48 w-full rounded-xl" />
                  ))}
                  <NewProjectCard onClick={() => setIsModalOpen(true)} />
                </div>
              )}

              {agentsError && (
                <Alert variant="destructive">
                  <AlertDescription className="flex items-center justify-between">
                    <span>Failed to load agents. Please try again.</span>
                    <Button variant="outline" size="sm" onClick={() => refetchAgents()}>
                      <RefreshCcw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!agentsLoading && !agentsError && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {agents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      onClick={() => handleAgentClick(agent)}
                    />
                  ))}
                  <NewProjectCard onClick={() => setIsModalOpen(true)} />
                </div>
              )}

              {!agentsLoading && !agentsError && agents.length === 0 && (
                <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-2xl">
                  <p className="text-sm">No agents yet. Start by importing a repository.</p>
                </div>
              )}
            </div>
          )}

          {activeTab !== 'agents' && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} view coming soon
            </div>
          )}
        </div>
      </main>

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleNewProject}
      />
    </div>
  );
}
