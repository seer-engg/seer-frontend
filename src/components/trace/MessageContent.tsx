/**
 * MessageContent - Renders message content with markdown support and JSON toggle
 */
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { JsonViewer } from '@textea/json-viewer';
import { Button } from '@/components/ui/button';
import { Copy, Code, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { extractRelevantContent } from '@/utils/json-viewer-utils';

interface MessageContentProps {
  content: string | unknown;
  className?: string;
  defaultView?: 'markdown' | 'json';
}

export function MessageContent({
  content,
  className,
  defaultView = 'markdown',
}: MessageContentProps) {
  const [viewMode, setViewMode] = useState<'markdown' | 'json'>(defaultView);

  // Handle empty content
  if (content === undefined || content === null || content === '') {
    return null;
  }

  const isString = typeof content === 'string';
  const isObject = typeof content === 'object' && content !== null;

  // For string content, try to detect if it's JSON
  let parsedContent: unknown = content;
  let isJsonString = false;
  if (isString && (content.trim().startsWith('{') || content.trim().startsWith('['))) {
    try {
      parsedContent = JSON.parse(content);
      isJsonString = typeof parsedContent === 'object';
    } catch {
      // Not valid JSON, treat as markdown
      parsedContent = content;
    }
  }

  // Determine if we should show JSON view toggle
  const showJsonToggle = isObject || isJsonString;

  const handleCopy = async () => {
    const textToCopy = typeof content === 'string' 
      ? content 
      : JSON.stringify(content, null, 2);
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const shouldShowMarkdown = viewMode === 'markdown' && isString && !isJsonString;
  const shouldShowJson = viewMode === 'json' || isObject || isJsonString;

  return (
    <div className={cn('relative', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          {showJsonToggle && (
            <>
              <Button
                variant={viewMode === 'markdown' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode('markdown')}
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Markdown
              </Button>
              <Button
                variant={viewMode === 'json' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode('json')}
              >
                <Code className="h-3.5 w-3.5 mr-1" />
                JSON
              </Button>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="rounded-md border bg-muted/30 overflow-hidden">
        {shouldShowMarkdown && (
          <div className="p-3 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content as string}
            </ReactMarkdown>
          </div>
        )}

        {shouldShowJson && (
          <div className="p-2 text-left [&>*]:text-left">
            <JsonViewer
              value={extractRelevantContent(parsedContent)}
              theme="auto"
              displayDataTypes={false}
              displayObjectSize={false}
              style={{
                fontSize: '0.75rem',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

