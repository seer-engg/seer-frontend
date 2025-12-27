import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type VariableInputType = 'string' | 'number' | 'array';

const INPUT_TYPE_OPTIONS: { label: string; value: VariableInputType }[] = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Array', value: 'array' },
];

interface VariableBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
}

const toArrayEditorString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') {
          return item;
        }
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .join('\n');
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

const parseArrayEditorValue = (value: string): unknown[] => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // fall through to newline parsing
  }

  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    });
};

export function VariableBlockSection({ config, setConfig }: VariableBlockSectionProps) {
  const inputType = (config.input_type as VariableInputType) || 'string';
  const [arrayEditorValue, setArrayEditorValue] = useState(() => toArrayEditorString(config.input));

  useEffect(() => {
    if (inputType === 'array') {
      const nextValue = toArrayEditorString(config.input);
      setArrayEditorValue(prev => (prev === nextValue ? prev : nextValue));
    }
  }, [config.input, inputType]);

  const numberDisplayValue = useMemo(() => {
    if (typeof config.input === 'number') {
      return String(config.input);
    }
    if (typeof config.input === 'string') {
      return config.input;
    }
    return '';
  }, [config.input]);

  const handleInputTypeChange = (value: VariableInputType) => {
    setConfig(prev => {
      let nextInput: unknown = prev.input;
      if (value === 'array' && !Array.isArray(nextInput)) {
        nextInput = [];
      } else if (value === 'number' && typeof nextInput !== 'number' && typeof nextInput !== 'string') {
        nextInput = '';
      } else if (value === 'string' && typeof nextInput !== 'string') {
        nextInput = '';
      }
      return {
        ...prev,
        input_type: value,
        input: nextInput,
      };
    });
  };

  const renderValueInput = () => {
    if (inputType === 'number') {
      return (
        <div className="space-y-2">
          <Label htmlFor="variable-number">Number value</Label>
          <Input
            id="variable-number"
            type="text"
            inputMode="decimal"
            value={numberDisplayValue}
            onChange={event =>
              setConfig(prev => ({
                ...prev,
                input: event.target.value,
              }))
            }
            placeholder="e.g., 42"
          />
          <p className="text-xs text-muted-foreground">
            Numbers can reference variables using {'{{my_var}}'}; they will be converted at runtime.
          </p>
        </div>
      );
    }

    if (inputType === 'array') {
      return (
        <div className="space-y-2">
          <Label htmlFor="variable-array">Array value</Label>
          <Textarea
            id="variable-array"
            value={arrayEditorValue}
            onChange={event => {
              const value = event.target.value;
              setArrayEditorValue(value);
              setConfig(prev => ({
                ...prev,
                input: parseArrayEditorValue(value),
              }));
            }}
            rows={6}
            placeholder={`["item 1", "item 2"]`}
          />
          <p className="text-xs text-muted-foreground">
            Provide a JSON array (preferred) or one value per line. Template references are supported per item.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor="variable-string">String value</Label>
        <Textarea
          id="variable-string"
          value={typeof config.input === 'string' ? config.input : ''}
          onChange={event =>
            setConfig(prev => ({
              ...prev,
              input: event.target.value,
            }))
          }
          rows={4}
          placeholder="Enter text or {{template_variables}}"
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="variable-input-type">Input Type</Label>
        <Select value={inputType} onValueChange={value => handleInputTypeChange(value as VariableInputType)}>
          <SelectTrigger id="variable-input-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INPUT_TYPE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {renderValueInput()}
    </div>
  );
}

