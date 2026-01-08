import { Checkbox } from '@/components/ui/checkbox';

export interface BooleanParamInputProps {
  paramName: string;
  value: unknown;
  onChange: (value: boolean) => void;
  title?: string;
}

export function BooleanParamInput({
  paramName,
  value,
  onChange,
  title,
}: BooleanParamInputProps) {
  const inputId = `param-${paramName}`;
  const checked = Boolean(value);

  return (
    <Checkbox
      id={inputId}
      checked={checked}
      onCheckedChange={checked => onChange(checked === true)}
      title={title}
    />
  );
}
