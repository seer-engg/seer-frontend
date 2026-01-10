import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EnumSelectFieldProps } from './types';

export function EnumSelectField({ id, value, onChange, enumOptions, placeholder, showError }: EnumSelectFieldProps) {
  return (
    <Select value={String(value ?? '')} onValueChange={onChange}>
      <SelectTrigger id={id} className={cn('text-xs', showError && 'border-destructive')}>
        <SelectValue placeholder={placeholder || 'Select...'} />
      </SelectTrigger>
      <SelectContent>
        {enumOptions.map(opt => (
          <SelectItem key={opt} value={opt} className="text-xs">
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
