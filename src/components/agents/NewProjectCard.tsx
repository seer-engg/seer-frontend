import { Plus } from 'lucide-react';

interface NewProjectCardProps {
  onClick: () => void;
}

export function NewProjectCard({ onClick }: NewProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-card border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center min-h-[180px] hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 group"
    >
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        Start New
      </span>
    </button>
  );
}
