import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileJson, AlertCircle } from 'lucide-react';

interface WorkflowImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, options: ImportOptions) => Promise<void>;
}

interface ImportOptions {
  name?: string;
  importTriggers: boolean;
}

type WorkflowExportPreview = {
  version?: string;
  workflow: { name: string; description?: string; spec: { nodes?: unknown[] } };
  triggers?: unknown[];
  metadata?: { exported_at?: string };
};

function validateWorkflowFile(file: File): string | null {
  if (!file.name.endsWith('.json') && !file.name.endsWith('.seer.json')) {
    return 'Please select a valid JSON file';
  }
  return null;
}

async function parseWorkflowFile(file: File): Promise<WorkflowExportPreview> {
  const text = await file.text();
  const json = JSON.parse(text);

  if (!json.version || !json.workflow || !json.workflow.spec) {
    throw new Error('Invalid workflow export format');
  }

  return json;
}

interface FileUploadAreaProps {
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function FileUploadArea({ file, onChange }: FileUploadAreaProps) {
  return (
    <div>
      <Label htmlFor="file-upload">Select Workflow File</Label>
      <div className="mt-2">
        <label
          htmlFor="file-upload"
          className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
        >
          {file ? (
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to select a .seer.json file</span>
            </div>
          )}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".json,.seer.json"
          onChange={onChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

interface WorkflowPreviewProps {
  preview: WorkflowExportPreview;
  workflowName: string;
  importTriggers: boolean;
  onNameChange: (name: string) => void;
  onImportTriggersChange: (checked: boolean) => void;
}

function WorkflowPreview({
  preview,
  workflowName,
  importTriggers,
  onNameChange,
  onImportTriggersChange,
}: WorkflowPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2">
        <h4 className="text-sm font-semibold">Preview</h4>
        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Name:</span> {preview.workflow.name}
          </p>
          {preview.workflow.description && (
            <p>
              <span className="text-muted-foreground">Description:</span> {preview.workflow.description}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Nodes:</span> {preview.workflow.spec.nodes?.length || 0}
          </p>
          <p>
            <span className="text-muted-foreground">Triggers:</span> {preview.triggers?.length || 0}
          </p>
          {preview.metadata?.exported_at && (
            <p className="text-xs text-muted-foreground">
              Exported: {new Date(preview.metadata.exported_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="workflow-name">Workflow Name (optional)</Label>
        <Input
          id="workflow-name"
          value={workflowName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={preview.workflow.name}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leave empty to use original name. Conflicts will be auto-renamed.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="import-triggers"
          checked={importTriggers}
          onCheckedChange={(checked) => onImportTriggersChange(checked === true)}
        />
        <label
          htmlFor="import-triggers"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Import triggers ({preview.triggers?.length || 0})
        </label>
      </div>

      {preview.triggers?.length > 0 && importTriggers && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Imported triggers will be disabled. You'll need to configure OAuth connections and enable them manually.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function WorkflowImportDialog({ open, onOpenChange, onImport }: WorkflowImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [importTriggers, setImportTriggers] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WorkflowExportPreview | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateWorkflowFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    setError(null);

    try {
      const parsedPreview = await parseWorkflowFile(selectedFile);
      setPreview(parsedPreview);
      setWorkflowName(parsedPreview.workflow.name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON file');
      setFile(null);
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    setIsImporting(true);
    setError(null);

    try {
      await onImport(file, { name: workflowName || undefined, importTriggers });
      setFile(null);
      setPreview(null);
      setWorkflowName('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import workflow');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FileUploadArea file={file} onChange={handleFileChange} />

          {preview && (
            <WorkflowPreview
              preview={preview}
              workflowName={workflowName}
              importTriggers={importTriggers}
              onNameChange={setWorkflowName}
              onImportTriggersChange={setImportTriggers}
            />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || !preview || isImporting}>
              {isImporting ? 'Importing...' : 'Import Workflow'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
