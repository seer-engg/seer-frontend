import { useState } from 'react';
import { Dashboard } from '@/components/agents/Dashboard';
import { WorkflowEditor } from '@/components/agents/WorkflowEditor';
import { GitHubRepo, Template } from '@/types/workflow';

type View = 'dashboard' | 'editor';

interface ProjectData {
  type: 'github' | 'template';
  name: string;
}

const Index = () => {
  const [view, setView] = useState<View>('dashboard');
  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  const handleStartProject = (type: 'github' | 'template', data: GitHubRepo | Template) => {
    const name = type === 'github' 
      ? (data as GitHubRepo).name 
      : (data as Template).name;
    
    setProjectData({ type, name });
    setView('editor');
  };

  const handleBack = () => {
    setView('dashboard');
    setProjectData(null);
  };

  if (view === 'editor' && projectData) {
    return (
      <WorkflowEditor
        projectName={projectData.name}
        onBack={handleBack}
      />
    );
  }

  return <Dashboard onStartProject={handleStartProject} />;
};

export default Index;
