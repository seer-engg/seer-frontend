import type { Dispatch, SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface IfElseBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
}

export function IfElseBlockSection({ config, setConfig }: IfElseBlockSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="condition">Condition Expression</Label>
        <Input
          id="condition"
          value={config.condition || ''}
          onChange={e => setConfig(prev => ({ ...prev, condition: e.target.value }))}
          placeholder="e.g., len(emails) > 0"
          className="font-mono"
        />
      </div>
    </div>
  );
}

