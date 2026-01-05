/**
 * Tool Selector Component
 * 
 * Displays available integration tools with their connection status.
 * Used for selecting tools when adding a tool block to the workflow.
 */
import { useMemo, useState } from 'react';
import { useIntegrationTools, ToolIntegrationStatus } from '@/hooks/useIntegrationTools';
import { IntegrationType } from '@/lib/integrations/client';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Wrench,
  Mail,
  FolderOpen,
  Github,
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface ToolSelectorProps {
  value?: string;
  onSelect: (toolName: string, tool: ToolIntegrationStatus) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Get icon for integration type
 */
function getIntegrationIcon(integrationType: IntegrationType | null, className?: string) {
  const iconClass = cn('w-4 h-4', className);
  const key = integrationType?.toLowerCase() ?? '';
  switch (key) {
    case 'gmail':
      return <Mail className={iconClass} />;
    case 'googledrive':
    case 'google_drive':
      return <FolderOpen className={iconClass} />;
    case 'googlesheets':
    case 'google_sheets':
      return <FolderOpen className={iconClass} />;
    case 'github':
    case 'pull_request':
      return <Github className={iconClass} />;
    case 'sandbox':
      return <Sparkles className={iconClass} />;
    case 'supabase':
      return <Database className={iconClass} />;
    default:
      return <Wrench className={iconClass} />;
  }
}

/**
 * Get display name for integration type
 */
function getIntegrationDisplayName(integrationType: IntegrationType | null): string {
  const key = integrationType?.toLowerCase() ?? '';
  switch (key) {
    case 'gmail':
      return 'Gmail';
    case 'googledrive':
    case 'google_drive':
      return 'Google Drive';
    case 'googlesheets':
    case 'google_sheets':
      return 'Google Sheets';
    case 'pull_request':
      return 'GitHub Pull Requests';
    case 'github':
      return 'GitHub';
    case 'asana':
      return 'Asana';
    case 'sandbox':
      return 'Sandbox';
    case 'supabase':
      return 'Supabase';
    default:
      return 'General';
  }
}

/**
 * Format tool name for display
 */
function formatToolName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ToolSelector({
  value,
  onSelect,
  placeholder = 'Select a tool...',
  disabled = false,
  className,
}: ToolSelectorProps) {
  const [open, setOpen] = useState(false);
  const { toolsWithStatus, isLoading, connectIntegration } = useIntegrationTools();

  // Group tools by integration type
  const groupedTools = useMemo(() => {
    const groups = new Map<string, ToolIntegrationStatus[]>();
    
    for (const tool of toolsWithStatus) {
      const key = tool.integrationType || 'general';
      const group = groups.get(key) || [];
      group.push(tool);
      groups.set(key, group);
    }
    
    // Sort groups: connected first, then alphabetically
    const sortedEntries = Array.from(groups.entries()).sort(([keyA, toolsA], [keyB, toolsB]) => {
      const connectedA = toolsA.some(t => t.isConnected);
      const connectedB = toolsB.some(t => t.isConnected);
      if (connectedA !== connectedB) return connectedB ? 1 : -1;
      return keyA.localeCompare(keyB);
    });
    
    return new Map(sortedEntries);
  }, [toolsWithStatus]);

  // Find selected tool
  const selectedTool = useMemo(() => {
    return toolsWithStatus.find(t => t.tool.name === value);
  }, [toolsWithStatus, value]);

  // Handle tool selection
  const handleSelect = (tool: ToolIntegrationStatus) => {
    onSelect(tool.tool.name, tool);
    setOpen(false);
  };

  // Handle connect click
  const handleConnect = async (e: React.MouseEvent, integrationType: IntegrationType) => {
    e.stopPropagation();
    // Find tool names for this integration type
    const toolsForType = toolsWithStatus.filter(t => t.integrationType === integrationType);
    
    if (toolsForType.length === 0) {
      console.error(`[ToolSelector] No tools found for integration type ${integrationType}. Cannot connect without specific tool names.`);
      return;
    }
    
    const toolNames = toolsForType.map(t => t.tool.name);
    const redirectUrl = await connectIntegration(integrationType, { toolNames });
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading tools...
            </span>
          ) : selectedTool ? (
            <span className="flex items-center gap-2 truncate">
              {getIntegrationIcon(selectedTool.integrationType)}
              <span className="truncate">{formatToolName(selectedTool.tool.name)}</span>
              {selectedTool.isConnected ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              ) : selectedTool.integrationType && (
                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              )}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tools..." />
          <CommandList>
            <CommandEmpty>No tools found.</CommandEmpty>
            <ScrollArea className="max-h-[300px]">
              {Array.from(groupedTools.entries()).map(([key, tools], groupIndex) => (
                <div key={key}>
                  {groupIndex > 0 && <CommandSeparator />}
                  <CommandGroup 
                    heading={
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getIntegrationIcon(key as IntegrationType | null, 'w-3 h-3 opacity-50')}
                          {getIntegrationDisplayName(key as IntegrationType | null)}
                        </span>
                        {key !== 'general' && !tools.some(t => t.isConnected) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-2 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            onClick={(e) => handleConnect(e, key as IntegrationType)}
                          >
                            Connect
                            <ExternalLink className="w-2.5 h-2.5 ml-1" />
                          </Button>
                        )}
                      </div>
                    }
                  >
                    {tools.map((tool) => (
                      <CommandItem
                        key={tool.tool.name}
                        value={tool.tool.name}
                        onSelect={() => handleSelect(tool)}
                        className="flex items-start gap-3 py-2.5 cursor-pointer"
                      >
                        <div className={cn(
                          'mt-0.5 w-6 h-6 rounded flex items-center justify-center flex-shrink-0',
                          tool.isConnected ? 'bg-primary/10' : 'bg-muted'
                        )}>
                          {getIntegrationIcon(
                            tool.integrationType,
                            cn(tool.isConnected ? 'text-primary' : 'text-muted-foreground')
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {formatToolName(tool.tool.name)}
                            </span>
                            {tool.isConnected ? (
                              <Badge 
                                variant="secondary" 
                                className="h-4 px-1 text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              >
                                Ready
                              </Badge>
                            ) : tool.integrationType && (
                              <Badge 
                                variant="secondary" 
                                className="h-4 px-1 text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                              >
                                Needs Auth
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {tool.tool.description}
                          </p>
                        </div>
                        {value === tool.tool.name && (
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              ))}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Simple inline tool status indicator
 */
export function ToolStatusIndicator({ 
  toolName,
  showLabel = true,
  className 
}: { 
  toolName: string;
  showLabel?: boolean;
  className?: string;
}) {
  const { toolsWithStatus, isLoading } = useIntegrationTools();
  
  const tool = useMemo(() => {
    return toolsWithStatus.find(t => t.tool.name === toolName);
  }, [toolsWithStatus, toolName]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        {showLabel && <span className="text-xs text-muted-foreground">Loading...</span>}
      </div>
    );
  }

  if (!tool) {
    return null;
  }

  if (!tool.integrationType) {
    return null; // No OAuth required
  }

  if (tool.isConnected) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        {showLabel && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {getIntegrationDisplayName(tool.integrationType)} connected
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <AlertTriangle className="w-3 h-3 text-amber-500" />
      {showLabel && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          {getIntegrationDisplayName(tool.integrationType)} not connected
        </span>
      )}
    </div>
  );
}

