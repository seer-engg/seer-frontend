import type { Dispatch, SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ForLoopBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
}

export function ForLoopBlockSection({ config, setConfig }: ForLoopBlockSectionProps) {
  const arrayMode: 'variable' | 'literal' =
    (config.array_mode as 'variable' | 'literal') ||
    (Array.isArray(config.array_literal) && config.array_literal.length > 0 ? 'literal' : 'variable');
  const arrayVariable = config.array_variable || config.array_var || 'items';
  const literalValue = Array.isArray(config.array_literal) ? config.array_literal.join('\n') : '';

  return (
    <div className="space-y-4">
      <div>
        <Label>Array Source</Label>
        <Select
          value={arrayMode}
          onValueChange={(value: 'variable' | 'literal') =>
            setConfig(prev => ({ ...prev, array_mode: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose array source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="variable">Variable reference</SelectItem>
            <SelectItem value="literal">Manual list</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {arrayMode === 'variable' ? (
        <div>
          <Label htmlFor="array-var">Variable name</Label>
          <Input
            id="array-var"
            value={arrayVariable}
            onChange={e =>
              setConfig(prev => ({ ...prev, array_variable: e.target.value, array_var: undefined }))
            }
            placeholder="e.g., emails or blockAlias.output"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Provide the variable or alias (no {'{{ }}'}) that resolves to an array.
          </p>
        </div>
      ) : (
        <div>
          <Label htmlFor="array-literal">Manual items</Label>
          <Textarea
            id="array-literal"
            value={literalValue}
            onChange={e => {
              const items = e.target.value
                .split('\n')
                .map(item => item.trim())
                .filter(Boolean);
              setConfig(prev => ({ ...prev, array_literal: items }));
            }}
            placeholder={'One item per line\nItem 2\nItem 3'}
            rows={4}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Each non-empty line becomes an item in the loop.
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="item-var">Item variable name</Label>
        <Input
          id="item-var"
          value={config.item_var || 'item'}
          onChange={e => setConfig(prev => ({ ...prev, item_var: e.target.value }))}
          placeholder="e.g., email"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Downstream blocks can reference <code>{`{{${config.item_var || 'item'}}}`}</code> or the
          block alias.
        </p>
      </div>

      <div className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Loop routing</p>
        <p className="mt-1">
          Use the <span className="font-medium text-foreground">Loop</span> handle to connect blocks
          that should run for every item. Once the array is exhausted, the workflow continues through
          the <span className="font-medium text-foreground">Exit</span> handle exactly once.
        </p>
      </div>
    </div>
  );
}

