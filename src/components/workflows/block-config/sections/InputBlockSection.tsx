import { useState, type Dispatch, type SetStateAction } from 'react';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

interface FormFieldConfig {
  name: string;
  displayLabel: string;
  type: 'text' | 'email' | 'url' | 'number' | 'object';
  required: boolean;
  description?: string;
}

interface InputBlockSectionProps {
  config: { fields: FormFieldConfig[] };
  setConfig: Dispatch<SetStateAction<{ fields: FormFieldConfig[] }>>;
}

const FIELD_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
  { value: 'object', label: 'Object' },
] as const;

const getTypeColor = (type: FormFieldConfig['type']) => {
  switch (type) {
    case 'email':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'url':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'number':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'object':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
  }
};

export function InputBlockSection({ config, setConfig }: InputBlockSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<FormFieldConfig>({
    name: '',
    displayLabel: '',
    type: 'text',
    required: false,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fields = config.fields || [];

  const validateField = (field: FormFieldConfig, currentIndex: number | null = null): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!field.name) {
      newErrors.name = 'Field name is required';
    } else if (!FIELD_NAME_REGEX.test(field.name)) {
      newErrors.name = 'Must start with letter/underscore, contain only letters, numbers, underscores';
    } else {
      // Check for duplicate names
      const isDuplicate = fields.some((f, idx) => {
        if (currentIndex !== null && idx === currentIndex) return false;
        return f.name === field.name;
      });
      if (isDuplicate) {
        newErrors.name = 'Field name must be unique';
      }
    }

    // Validate display label
    if (!field.displayLabel) {
      newErrors.displayLabel = 'Display label is required';
    }

    return newErrors;
  };

  const handleStartAdd = () => {
    setDraft({
      name: '',
      displayLabel: '',
      type: 'text',
      required: false,
      description: '',
    });
    setErrors({});
    setIsAdding(true);
    setEditingIndex(null);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setDraft({
      name: '',
      displayLabel: '',
      type: 'text',
      required: false,
      description: '',
    });
    setErrors({});
  };

  const handleSaveAdd = () => {
    const validationErrors = validateField(draft);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, draft],
    }));
    setIsAdding(false);
    setDraft({
      name: '',
      displayLabel: '',
      type: 'text',
      required: false,
      description: '',
    });
    setErrors({});
    toast.success('Field added successfully');
  };

  const handleStartEdit = (index: number) => {
    setDraft({ ...fields[index] });
    setErrors({});
    setEditingIndex(index);
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setDraft({
      name: '',
      displayLabel: '',
      type: 'text',
      required: false,
      description: '',
    });
    setErrors({});
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const validationErrors = validateField(draft, editingIndex);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setConfig(prev => ({
      ...prev,
      fields: prev.fields.map((f, idx) => (idx === editingIndex ? draft : f)),
    }));
    setEditingIndex(null);
    setDraft({
      name: '',
      displayLabel: '',
      type: 'text',
      required: false,
      description: '',
    });
    setErrors({});
    toast.success('Field updated successfully');
  };

  const handleDelete = (index: number) => {
    const fieldName = fields[index].name;
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.filter((_, idx) => idx !== index),
    }));
    toast.success(`Field "${fieldName}" removed`);
  };

  const renderFieldForm = (isEdit: boolean) => {
    return (
      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="field-name">
              Field Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="field-name"
              value={draft.name}
              onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., email"
              className={cn('font-mono', errors.name && 'border-destructive')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            <p className="text-xs text-muted-foreground">
              Letters, numbers, underscores only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-display-label">
              Display Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="field-display-label"
              value={draft.displayLabel}
              onChange={(e) => setDraft(prev => ({ ...prev, displayLabel: e.target.value }))}
              placeholder="e.g., Email Address"
              className={errors.displayLabel ? 'border-destructive' : ''}
            />
            {errors.displayLabel && (
              <p className="text-xs text-destructive">{errors.displayLabel}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="field-type">Field Type</Label>
            <Select
              value={draft.type}
              onValueChange={(value) =>
                setDraft(prev => ({ ...prev, type: value as FormFieldConfig['type'] }))
              }
            >
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-required" className="flex items-center gap-2">
              Required Field
            </Label>
            <div className="flex items-center gap-2 h-10">
              <Switch
                id="field-required"
                checked={draft.required}
                onCheckedChange={(checked) => setDraft(prev => ({ ...prev, required: checked }))}
              />
              <span className="text-sm text-muted-foreground">
                {draft.required ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="field-description">Description (Optional)</Label>
          <Textarea
            id="field-description"
            value={draft.description || ''}
            onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Help text for this field"
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={isEdit ? handleSaveEdit : handleSaveAdd}
          >
            <Check className="mr-2 h-4 w-4" />
            {isEdit ? 'Save Changes' : 'Add Field'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={isEdit ? handleCancelEdit : handleCancelAdd}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 && !isAdding ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No fields defined yet. Add a field to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index}>
              {editingIndex === index ? (
                renderFieldForm(true)
              ) : (
                <div className="flex items-center gap-2 rounded-lg border bg-card p-3 transition hover:bg-accent/50">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{field.name}</span>
                      <Badge
                        variant="secondary"
                        className={cn('h-5 px-1.5 text-[10px]', getTypeColor(field.type))}
                      >
                        {field.type}
                      </Badge>
                      {field.required && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        >
                          Required
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {field.displayLabel}
                      {field.description && ` • ${field.description}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(index)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit field</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete field</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdding && renderFieldForm(false)}

      {!isAdding && editingIndex === null && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleStartAdd}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Field
        </Button>
      )}
    </div>
  );
}
