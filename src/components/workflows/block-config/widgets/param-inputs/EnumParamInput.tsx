import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface EnumParamInputProps {
  paramName: string;
  value: unknown;
  onChange: (value: string) => void;
  options: unknown[];
  title?: string;
}

export function EnumParamInput({
  paramName,
  value,
  onChange,
  options,
  title,
}: EnumParamInputProps) {
  const inputId = `param-${paramName}`;
  const stringOptions = options.map(String);

  return (
    <Select
      value={String(value ?? '')}
      onValueChange={onChange}
    >
      <SelectTrigger id={inputId} className="text-xs" title={title}>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {stringOptions.map(option => (
          <SelectItem key={option} value={option} className="text-xs">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
