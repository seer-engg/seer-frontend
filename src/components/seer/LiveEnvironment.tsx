import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  name: string;
  highlighted?: boolean;
}

interface Column {
  id: string;
  name: string;
  tasks: Task[];
}

interface LiveEnvironmentProps {
  columns: Column[];
  activeTaskId?: string;
  moveTask?: { taskId: string; fromColumn: string; toColumn: string };
}

export function LiveEnvironment({ columns: initialColumns, moveTask }: LiveEnvironmentProps) {
  const [columns, setColumns] = useState(initialColumns);

  useEffect(() => {
    if (moveTask) {
      setColumns((prev) => {
        const newColumns = prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== moveTask.taskId),
        }));

        const targetColumn = newColumns.find((c) => c.id === moveTask.toColumn);
        const taskToMove = initialColumns
          .flatMap((c) => c.tasks)
          .find((t) => t.id === moveTask.taskId);

        if (targetColumn && taskToMove) {
          targetColumn.tasks.push({ ...taskToMove, highlighted: true });
        }

        return newColumns;
      });
    }
  }, [moveTask, initialColumns]);

  return (
    <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium">Live Environment: Asana Board</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">seer_sandbox_dev</span>
      </div>

      {/* Board */}
      <div className="p-4 h-[calc(100%-52px)] overflow-x-auto">
        <div className="flex gap-4 h-full">
          {columns.map((column) => (
            <div
              key={column.id}
              className="w-56 shrink-0 bg-secondary/30 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{column.name}</span>
                <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  {column.tasks.length}
                </span>
              </div>

              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {column.tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        "bg-card border rounded-lg p-3 cursor-pointer transition-all",
                        task.highlighted
                          ? "border-success shadow-md glow-success"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <p className="text-sm">{task.name}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
