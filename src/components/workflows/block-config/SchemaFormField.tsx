import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export interface ParameterSchema {
  type?: string; // 'string', 'integer', 'number', 'boolean', 'array', 'object'
  description?: string;
  default?: any;
  enum?: string[]; // For select dropdowns
  minimum?: number;
  maximum?: number;
  required?: boolean;
  [key: string]: any; // Allow additional schema properties
}

export interface SchemaFormFieldProps {
  name: string;
  schema: ParameterSchema;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  compact?: boolean; // Use ultra-compact spacing
  className?: string;
  error?: string; // Validation error message
}

export function SchemaFormField({
  name,
  schema,
  value,
  onChange,
  required = false,
  compact = true,
  className,
  error,
}: SchemaFormFieldProps) {
  const [touched, setTouched] = useState(false);

  // Determine spacing based on compact mode
  const spacing = compact
    ? {
        container: 'space-y-1',
        labelText: 'text-xs',
        inputHeight: 'h-9',
        gap: 'gap-2',
      }
    : {
        container: 'space-y-2',
        labelText: 'text-sm',
        inputHeight: 'h-10',
        gap: 'gap-3',
      };

  // Show error only after field has been touched
  const showError = touched && error;

  const handleBlur = () => setTouched(true);

  const handleChange = useCallback(
    (newValue: any) => {
      onChange(newValue);
    },
    [onChange]
  );

  // Render appropriate input based on schema type
  const renderInput = () => {
    const type = schema.type || 'string';

    // Boolean checkbox
    if (type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={name}
            checked={!!value}
            onCheckedChange={(checked) => handleChange(checked)}
            onBlur={handleBlur}
          />
          <Label htmlFor={name} className="font-normal cursor-pointer">
            {name}
          </Label>
        </div>
      );
    }

    // Enum select dropdown
    if (schema.enum && schema.enum.length > 0) {
      return (
        <Select value={String(value || '')} onValueChange={handleChange}>
          <SelectTrigger
            className={cn(spacing.inputHeight, showError && 'border-destructive')}
          >
            <SelectValue placeholder={`Select ${name}`} />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Number/Integer input
    if (type === 'integer' || type === 'number') {
      return (
        <Input
          type="number"
          id={name}
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              handleChange('');
            } else {
              const num = type === 'integer' ? parseInt(val, 10) : parseFloat(val);
              handleChange(isNaN(num) ? val : num);
            }
          }}
          onBlur={handleBlur}
          placeholder={
            schema.default !== undefined ? String(schema.default) : undefined
          }
          min={schema.minimum}
          max={schema.maximum}
          className={cn(
            spacing.inputHeight,
            spacing.labelText,
            showError && 'border-destructive'
          )}
        />
      );
    }

    // Array textarea with JSON validation
    if (type === 'array') {
      return (
        <Textarea
          id={name}
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) {
                handleChange(parsed);
              } else {
                handleChange(e.target.value);
              }
            } catch {
              handleChange(e.target.value);
            }
          }}
          onBlur={handleBlur}
          placeholder={
            schema.default
              ? JSON.stringify(schema.default, null, 2)
              : '[\n  "value1",\n  "value2"\n]'
          }
          rows={3}
          className={cn(
            'max-h-[120px] resize-none',
            spacing.labelText,
            showError && 'border-destructive'
          )}
        />
      );
    }

    // Object textarea with JSON validation
    if (type === 'object') {
      return (
        <Textarea
          id={name}
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                handleChange(parsed);
              } else {
                handleChange(e.target.value);
              }
            } catch {
              handleChange(e.target.value);
            }
          }}
          onBlur={handleBlur}
          placeholder={
            schema.default
              ? JSON.stringify(schema.default, null, 2)
              : '{\n  "key": "value"\n}'
          }
          rows={3}
          className={cn(
            'max-h-[120px] resize-none',
            spacing.labelText,
            showError && 'border-destructive'
          )}
        />
      );
    }

    // Default: text input
    return (
      <Input
        type="text"
        id={name}
        value={value ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={
          schema.default !== undefined ? String(schema.default) : undefined
        }
        className={cn(
          spacing.inputHeight,
          spacing.labelText,
          showError && 'border-destructive'
        )}
      />
    );
  };

  // Don't render label for boolean (checkbox handles it)
  const shouldShowLabel = schema.type !== 'boolean';

  return (
    <div className={cn(spacing.container, className)}>
      {shouldShowLabel && (
        <div className="flex items-center gap-1.5">
          <Label htmlFor={name} className={cn(spacing.labelText, 'font-medium')}>
            {name}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {schema.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">{schema.description}</p>
                {schema.default !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: {JSON.stringify(schema.default)}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {renderInput()}

      {showError && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
