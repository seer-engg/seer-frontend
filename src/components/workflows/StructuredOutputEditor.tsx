/**
 * Structured Output Editor Component
 *
 * Simple table-based editor for defining LLM structured output schemas.
 * Includes AI-powered automatic generation of schema titles and descriptions.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import { useSchemaMetadataGenerator } from '@/hooks/useSchemaMetadataGenerator';

interface FieldDefinition {
  name: string;
  type: string;
  description?: string;
}

interface StructuredOutputEditorProps {
  value?: any; // JSON schema object
  onChange: (schema: any) => void;
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

const DEFAULT_SCHEMA = {
  type: 'object',
  properties: {},
};

const createEmptyField = (): FieldDefinition => ({
  name: '',
  type: 'any',
  description: '',
});

// Convert JSON schema to field definitions
function schemaToFields(schema: any): FieldDefinition[] {
  if (!schema || !schema.properties) {
    return [];
  }
  
  return Object.entries(schema.properties).map(([name, prop]: [string, any]) => ({
    name,
    type: jsonSchemaTypeToPydanticType(prop.type || 'any'),
    description: prop.description || '',
  }));
}

// Convert field definitions to JSON schema
function fieldsToSchema(
  fields: FieldDefinition[],
  options?: { title?: string; description?: string },
): any {
  const properties: Record<string, any> = {};
  
  fields.forEach((field) => {
    if (field.name.trim()) {
      const propDef: Record<string, any> = {
        type: pydanticTypeToJsonSchemaType(field.type),
      };
      // Include description if provided
      if (field.description && field.description.trim()) {
        propDef.description = field.description.trim();
      }
      properties[field.name.trim()] = propDef;
    }
  });
  
  const schema: Record<string, any> = {
    type: 'object',
    properties,
  };
  
  if (options?.title && options.title.trim()) {
    schema.title = options.title.trim();
  }
  
  if (options?.description && options.description.trim()) {
    schema.description = options.description.trim();
  }
  
  return schema;
}

export function StructuredOutputEditor({ value, onChange }: StructuredOutputEditorProps) {
  const [fields, setFields] = useState<FieldDefinition[]>([createEmptyField()]);
  const [schemaTitle, setSchemaTitle] = useState('');
  const [schemaDescription, setSchemaDescription] = useState('');
  const lastEmittedSchemaRef = useRef<string>('');

  const syncSchema = useCallback(
    (nextFields: FieldDefinition[], nextTitle: string, nextDescription: string) => {
      const schema = fieldsToSchema(nextFields, {
        title: nextTitle,
        description: nextDescription,
      });
      const serialized = JSON.stringify(schema);
      onChange(schema);
      lastEmittedSchemaRef.current = serialized;
    },
    [onChange],
  );

  // Schema metadata generation
  const {
    isGenerating,
    isAiGenerated,
    regenerate,
  } = useSchemaMetadataGenerator({
    jsonSchema: fieldsToSchema(fields),
    autoGenerate: true,
    debounceMs: 1500,
    onGenerated: (metadata) => {
      setSchemaTitle(metadata.title);
      setSchemaDescription(metadata.description);
      syncSchema(fields, metadata.title, metadata.description);
    },
  });

  useEffect(() => {
    const hasValue = value && Object.keys(value).length > 0;
    const serializedValue = hasValue ? JSON.stringify(value) : '';

    if (hasValue) {
      if (serializedValue === lastEmittedSchemaRef.current) {
        return;
      }
      const parsedFields = schemaToFields(value);
      setFields(parsedFields.length > 0 ? parsedFields : [createEmptyField()]);
      setSchemaTitle(typeof value.title === 'string' ? value.title : '');
      setSchemaDescription(typeof value.description === 'string' ? value.description : '');
      lastEmittedSchemaRef.current = serializedValue;
      return;
    }

    const defaultSerialized = JSON.stringify(DEFAULT_SCHEMA);
    if (lastEmittedSchemaRef.current === defaultSerialized) {
      return;
    }

    setFields([createEmptyField()]);
    setSchemaTitle('');
    setSchemaDescription('');
    onChange(DEFAULT_SCHEMA);
    lastEmittedSchemaRef.current = defaultSerialized;
  }, [value, onChange]);

  const handleFieldChange = useCallback(
    (updater: (prev: FieldDefinition[]) => FieldDefinition[]) => {
      setFields(prevFields => {
        const nextFields = updater(prevFields);
        syncSchema(nextFields, schemaTitle, schemaDescription);
        return nextFields.length > 0 ? nextFields : [createEmptyField()];
      });
    },
    [schemaTitle, schemaDescription, syncSchema],
  );

  const handleTitleChange = (value: string) => {
    setSchemaTitle(value);
    syncSchema(fields, value, schemaDescription);
  };

  const handleDescriptionChange = (value: string) => {
    setSchemaDescription(value);
    syncSchema(fields, schemaTitle, value);
  };

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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="schema-title">Schema Title</Label>
            {isAiGenerated && (
              <div className="flex items-center gap-1">
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[9px] bg-seer/10 text-seer dark:text-seer border-seer/20"
                >
                  <Sparkles className="w-3 h-3 mr-0.5" />
                  AI
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={regenerate}
                  disabled={isGenerating}
                  title="Regenerate with AI"
                >
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}
          </div>
          <Input
            id="schema-title"
            placeholder="TwoPeople"
            value={schemaTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="h-9"
            disabled={isGenerating}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="schema-description">Schema Description</Label>
            {isGenerating && (
              <span className="text-xs text-muted-foreground">Generating...</span>
            )}
          </div>
          <Textarea
            id="schema-description"
            placeholder="Describe what this structured output should contain..."
            value={schemaDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={2}
            className="min-h-[72px]"
            disabled={isGenerating}
          />
        </div>
      </div>

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
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                      placeholder="field_name"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={field.type}
                      onValueChange={(value) => updateField(index, { type: value })}
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
                      onChange={(e) => updateField(index, { description: e.target.value })}
                      placeholder="Describe this field..."
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
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

