import { useState } from 'react';
// import { Sidebar } from '@/components/layout/Sidebar';
import { AgentCard } from '@/components/agents/AgentCard';
import { NewProjectCard } from '@/components/agents/NewProjectCard';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { Project, GitHubRepo, Template } from '@/types/workflow';

interface DashboardProps {
  onStartProject: (type: 'github' | 'template', data: GitHubRepo | Template) => void;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Email Classifier Bot',
    createdAt: new Date('2024-01-10'),
    status: 'active',
  },
];

export function Dashboard({ onStartProject }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('agents');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNewProject = (type: 'github' | 'template', data: GitHubRepo | Template) => {
    setIsModalOpen(false);
    onStartProject(type, data);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* <Sidebar activeTab={activeTab} onTabChange={setActiveTab} /> */}
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center justify-between h-16 px-8">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Agents This is a Mock UI..</h1>
              <p className="text-sm text-muted-foreground">Manage your AI agents</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {activeTab === 'agents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {mockProjects.map((project) => (
                <AgentCard
                  key={project.id}
                  project={project}
                  onClick={() => {}}
                />
              ))}
              <NewProjectCard onClick={() => setIsModalOpen(true)} />
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
