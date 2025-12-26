import type { Dispatch, SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ForLoopBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
}

export function ForLoopBlockSection({ config, setConfig }: ForLoopBlockSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="array-var">Array Variable Name</Label>
        <Input
          id="array-var"
          value={config.array_var || ''}
          onChange={e => setConfig(prev => ({ ...prev, array_var: e.target.value }))}
          placeholder="e.g., emails"
        />
      </div>
      <div>
        <Label htmlFor="item-var">Item Variable Name</Label>
        <Input
          id="item-var"
          value={config.item_var || 'item'}
          onChange={e => setConfig(prev => ({ ...prev, item_var: e.target.value }))}
          placeholder="e.g., email"
        />
      </div>
    </div>
  );
}

