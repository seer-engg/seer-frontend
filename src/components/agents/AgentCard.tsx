import { cn } from '@/lib/utils';
import { AgentSummary } from '@/types/agent';
import { Bot, MoreHorizontal } from 'lucide-react';

interface AgentCardProps {
  agent: AgentSummary;
  onClick: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-primary/10 text-primary',
    complete: 'bg-green-500/10 text-green-600',
    error: 'bg-destructive/10 text-destructive',
  };

  const createdDate =
    agent.createdAt instanceof Date ? agent.createdAt : new Date(agent.createdAt);

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
      
      <h3 className="font-semibold text-foreground mb-1">{agent.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Created {createdDate.toLocaleDateString()}
      </p>
      {agent.repoFullName && (
        <p className="text-xs text-muted-foreground mb-3 truncate">
          {agent.repoFullName}
        </p>
      )}
      
      <span className={cn(
        'inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize',
        statusColors[agent.status] ?? statusColors.draft
      )}>
        {agent.status}
      </span>
    </button>
  );
}
