/**
 * Structured Output Editor Component
 * 
 * Dual-mode editor for LLM structured output:
 * - Simple mode: Table-based form for non-technical users
 * - Advanced mode: JSON editor for technical users
 */
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Code } from 'lucide-react';

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
function fieldsToSchema(fields: FieldDefinition[]): any {
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
  
  return {
    type: 'object',
    properties,
  };
}

export function StructuredOutputEditor({ value, onChange }: StructuredOutputEditorProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [jsonValue, setJsonValue] = useState('');

  // Initialize fields from value
  useEffect(() => {
    if (value && Object.keys(value).length > 0) {
      const parsedFields = schemaToFields(value);
      if (parsedFields.length > 0) {
        setFields(parsedFields);
      } else {
        setFields([{ name: '', type: 'any', description: '' }]);
      }
      setJsonValue(JSON.stringify(value, null, 2));
    } else {
      setFields([{ name: '', type: 'any', description: '' }]);
      const defaultSchema = { type: 'object', properties: {} };
      setJsonValue(JSON.stringify(defaultSchema, null, 2));
      onChange(defaultSchema);
    }
  }, []);

  // Update JSON when fields change (simple mode)
  useEffect(() => {
    if (mode === 'simple' && fields.length > 0) {
      const schema = fieldsToSchema(fields);
      setJsonValue(JSON.stringify(schema, null, 2));
      onChange(schema);
    }
  }, [fields, mode, onChange]);

  // Update fields when JSON changes (advanced mode)
  const handleJsonChange = (json: string) => {
    setJsonValue(json);
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'object' && parsed.properties) {
        const parsedFields = schemaToFields(parsed);
        if (parsedFields.length > 0) {
          setFields(parsedFields);
        }
        onChange(parsed);
      }
    } catch {
      // Invalid JSON, don't update
    }
  };

  const addField = () => {
    setFields([...fields, { name: '', type: 'any', description: '' }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'simple' | 'advanced')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">Simple</TabsTrigger>
          <TabsTrigger value="advanced">Advanced (JSON)</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-4">
          <div className="space-y-2">
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
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="json-schema" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              JSON Schema
            </Label>
            <Textarea
              id="json-schema"
              value={jsonValue}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder='{"type": "object", "properties": {"result": {"type": "string"}}}'
              className="font-mono text-xs"
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              Edit the JSON schema directly. Changes will be reflected in Simple mode.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

