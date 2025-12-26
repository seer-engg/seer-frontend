interface VariableAutocompleteDropdownProps {
  visible: boolean;
  variables: string[];
  selectedIndex: number;
  onSelect: (variable: string) => void;
  className?: string;
  emptyMessage?: string;
}

export function VariableAutocompleteDropdown({
  visible,
  variables,
  selectedIndex,
  onSelect,
  className = '',
  emptyMessage = 'No variables found',
}: VariableAutocompleteDropdownProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={`absolute z-50 mt-1 w-64 rounded-md border bg-popover shadow-md max-h-60 overflow-auto ${className}`}
    >
      <div className="p-1">
        {variables.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          variables.map((variable, index) => (
            <div
              key={variable}
              onClick={() => onSelect(variable)}
              className={`px-2 py-1.5 text-sm cursor-pointer rounded-sm hover:bg-accent ${
                index === selectedIndex ? 'bg-accent' : ''
              }`}
            >
              {variable}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

