import { cn } from '@/lib/utils';
import { Project } from '@/types/workflow';
import { Bot, MoreHorizontal } from 'lucide-react';

interface AgentCardProps {
  project: Project;
  onClick: () => void;
}

export function AgentCard({ project, onClick }: AgentCardProps) {
  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-primary/10 text-primary',
    complete: 'bg-green-500/10 text-green-600',
  };

  return (
    <button
      onClick={onClick}
      className="group bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <button 
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      
      <h3 className="font-semibold text-foreground mb-1">{project.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Created {project.createdAt.toLocaleDateString()}
      </p>
      
      <span className={cn(
        'inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize',
        statusColors[project.status]
      )}>
        {project.status}
      </span>
    </button>
  );
}
