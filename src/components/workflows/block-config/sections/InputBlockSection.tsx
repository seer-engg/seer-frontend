import type { Dispatch, SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INPUT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

interface InputBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
}

export function InputBlockSection({ config, setConfig }: InputBlockSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="variable-name">Variable Name</Label>
        <Input
          id="variable-name"
          value={config.variable_name || ''}
          onChange={e => setConfig(prev => ({ ...prev, variable_name: e.target.value }))}
          placeholder="e.g., user_input"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use this name to reference this input in system prompts via {'{{'}variable_name{'}}'} syntax
        </p>
      </div>

      <div>
        <Label htmlFor="input-type">Input Type</Label>
        <Select
          value={config.type || INPUT_TYPES[0].value}
          onValueChange={value => setConfig(prev => ({ ...prev, type: value }))}
        >
          <SelectTrigger id="input-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INPUT_TYPES.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="input-required"
          checked={config.required !== false}
          onChange={e => setConfig(prev => ({ ...prev, required: e.target.checked }))}
          className="rounded border-gray-300"
        />
        <Label htmlFor="input-required" className="text-sm font-normal cursor-pointer">
          Required
        </Label>
      </div>
    </div>
  );
}

