import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { SupabaseManualFormState } from './types';

export interface SupabaseManualTabProps {
  manualForm: SupabaseManualFormState;
  setManualForm: React.Dispatch<React.SetStateAction<SupabaseManualFormState>>;
  manualError: string | null;
  manualSubmitting: boolean;
  manualFormIsValid: boolean;
  handleFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function SupabaseManualTab({
  manualForm,
  setManualForm,
  manualError,
  manualSubmitting,
  manualFormIsValid,
  handleFormSubmit,
}: SupabaseManualTabProps) {
  return (
    <form className="space-y-4" onSubmit={handleFormSubmit}>
      <div className="space-y-2">
        <Label htmlFor="manual-project-ref">Project reference</Label>
        <Input
          id="manual-project-ref"
          placeholder="e.g. abcdefg"
          value={manualForm.projectRef}
          onChange={(e) =>
            setManualForm(prev => ({ ...prev, projectRef: e.target.value }))
          }
          required
        />
        <p className="text-xs text-muted-foreground">
          Use the project ref from your Supabase dashboard (slug before .supabase.co).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="manual-project-name">Display name (optional)</Label>
        <Input
          id="manual-project-name"
          placeholder="My Supabase project"
          value={manualForm.projectName}
          onChange={(e) =>
            setManualForm(prev => ({ ...prev, projectName: e.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="manual-service-role">Service role key</Label>
        <Textarea
          id="manual-service-role"
          placeholder="Paste your service role key"
          value={manualForm.serviceRoleKey}
          onChange={(e) =>
            setManualForm(prev => ({ ...prev, serviceRoleKey: e.target.value }))
          }
          rows={3}
          required
        />
        <p className="text-xs text-muted-foreground">
          Required. You can rotate this in Supabase at any time.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="manual-anon-key">Anon/public key (optional)</Label>
        <Textarea
          id="manual-anon-key"
          placeholder="Paste your anon/public key"
          value={manualForm.anonKey}
          onChange={(e) =>
            setManualForm(prev => ({ ...prev, anonKey: e.target.value }))
          }
          rows={2}
        />
      </div>
      {manualError && (
        <p className="text-xs text-destructive">{manualError}</p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={!manualFormIsValid || manualSubmitting}
      >
        {manualSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Save secrets'
        )}
      </Button>
    </form>
  );
}
