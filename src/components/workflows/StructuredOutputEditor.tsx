/**
 * Structured Output Editor Component
 *
 * Simple table-based editor for defining LLM structured output schemas.
 * Backend automatically generates schema title and description from field definitions.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';

interface FieldDefinition {
  name: string;
  type: string;
  description?: string;
}

interface JsonSchema {
  type: string;
  properties: Record<string, {
    type: string;
    description?: string;
  }>;
  title?: string;
  description?: string;
}

interface StructuredOutputEditorProps {
  value?: JsonSchema;
  onChange: (schema: JsonSchema) => void;
}

const PYDANTIC_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'str', label: 'String' },
  { value: 'int', label: 'Integer' },
  { value: 'float', label: 'Float' },
  { value: 'bool', label: 'Boolean' },
  { value: 'list', label: 'List' },
  { value: 'dict', label: 'Dictionary' },
];

// Convert Pydantic type to JSON Schema type
function pydanticTypeToJsonSchemaType(pydanticType: string): string {
  const typeMap: Record<string, string> = {
    'str': 'string',
    'int': 'integer',
    'float': 'number',
    'bool': 'boolean',
    'list': 'array',
    'dict': 'object',
    'any': 'string', // Default to string for Any
  };
  return typeMap[pydanticType] || 'string';
}

// Convert JSON Schema type to Pydantic type
function jsonSchemaTypeToPydanticType(jsonType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'str',
    'integer': 'int',
    'number': 'float',
    'boolean': 'bool',
    'array': 'list',
    'object': 'dict',
  };
  return typeMap[jsonType] || 'any';
}

const DEFAULT_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {},
};

const createEmptyField = (): FieldDefinition => ({
  name: '',
  type: 'any',
  description: '',
});

// Convert JSON schema to field definitions
function schemaToFields(schema: JsonSchema | undefined): FieldDefinition[] {
  if (!schema || !schema.properties) {
    return [];
  }

  return Object.entries(schema.properties).map(([name, prop]) => ({
    name,
    type: jsonSchemaTypeToPydanticType(prop.type || 'any'),
    description: prop.description || '',
  }));
}

// Convert field definitions to JSON schema
function fieldsToSchema(fields: FieldDefinition[]): JsonSchema {
  const properties: Record<string, { type: string; description?: string }> = {};

  fields.forEach((field) => {
    if (field.name.trim()) {
      const propDef: { type: string; description?: string } = {
        type: pydanticTypeToJsonSchemaType(field.type),
      };
      // Include description if provided
      if (field.description && field.description.trim()) {
        propDef.description = field.description.trim();
      }
      properties[field.name.trim()] = propDef;
    }
  });

  return {
    type: 'object',
    properties,
  };
}

interface FieldRowProps {
  field: FieldDefinition;
  index: number;
  onUpdate: (index: number, updates: Partial<FieldDefinition>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function FieldRow({ field, index, onUpdate, onRemove, canRemove }: FieldRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Input
          value={field.name}
          onChange={(e) => onUpdate(index, { name: e.target.value })}
          placeholder="field_name"
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Select
          value={field.type}
          onValueChange={(value) => onUpdate(index, { type: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PYDANTIC_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={field.description || ''}
          onChange={(e) => onUpdate(index, { description: e.target.value })}
          placeholder="Describe this field..."
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// eslint-disable-next-line max-lines-per-function
export function StructuredOutputEditor({ value, onChange }: StructuredOutputEditorProps) {
  const [fields, setFields] = useState<FieldDefinition[]>([createEmptyField()]);
  const lastEmittedSchemaRef = useRef<string>('');

  const syncSchema = useCallback(
    (nextFields: FieldDefinition[]) => {
      const schema = fieldsToSchema(nextFields);
      const serialized = JSON.stringify(schema);
      onChange(schema);
      lastEmittedSchemaRef.current = serialized;
    },
    [onChange],
  );

  useEffect(() => {
    const hasValue = value && Object.keys(value).length > 0;
    const serializedValue = hasValue ? JSON.stringify(value) : '';

    if (hasValue) {
      if (serializedValue === lastEmittedSchemaRef.current) {
        return;
      }
      const parsedFields = schemaToFields(value);
      setFields(parsedFields.length > 0 ? parsedFields : [createEmptyField()]);
      lastEmittedSchemaRef.current = serializedValue;
      return;
    }

    const defaultSerialized = JSON.stringify(DEFAULT_SCHEMA);
    if (lastEmittedSchemaRef.current === defaultSerialized) {
      return;
    }

    setFields([createEmptyField()]);
    onChange(DEFAULT_SCHEMA);
    lastEmittedSchemaRef.current = defaultSerialized;
  }, [value, onChange]);

  const handleFieldChange = useCallback(
    (updater: (prev: FieldDefinition[]) => FieldDefinition[]) => {
      setFields(prevFields => {
        const nextFields = updater(prevFields);
        syncSchema(nextFields);
        return nextFields.length > 0 ? nextFields : [createEmptyField()];
      });
    },
    [syncSchema],
  );

  const addField = () => {
    handleFieldChange(prev => [...prev, createEmptyField()]);
  };

  const removeField = (index: number) => {
    handleFieldChange(prev => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    handleFieldChange(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Output Fields</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Field
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">Field Name</TableHead>
              <TableHead className="w-[20%]">Type</TableHead>
              <TableHead className="w-[40%]">Description</TableHead>
              <TableHead className="w-[15%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                  No fields. Click "Add Field" to get started.
                </TableCell>
              </TableRow>
            ) : (
              fields.map((field, index) => (
                <FieldRow
                  key={index}
                  field={field}
                  index={index}
                  onUpdate={updateField}
                  onRemove={removeField}
                  canRemove={fields.length > 1}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Define the structure of the LLM output. Each field will be validated according to its type.
        Adding descriptions helps guide the LLM on what content to generate for each field.
      </p>
    </div>
  );
}
