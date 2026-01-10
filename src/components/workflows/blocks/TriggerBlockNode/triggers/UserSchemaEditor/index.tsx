/**
 * User Schema Editor for webhook/form triggers.
 * Provides both simple (field-based) and advanced (JSON Schema) editing modes.
 */

import { useState, useCallback, useEffect } from 'react';
import { Code2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JsonObject } from '@/types/workflow-spec';
import type { UserSchemaEditorProps, SchemaEditorMode, SchemaField } from './types';
import { SimpleSchemaEditor } from './SimpleSchemaEditor';
import { AdvancedSchemaEditor } from './AdvancedSchemaEditor';
import { fieldsToJsonSchema, jsonSchemaToFields, createEmptySchema } from './utils';

export function UserSchemaEditor({
  schema,
  onChange,
  mode: externalMode,
  onModeChange,
}: UserSchemaEditorProps) {
  const [internalMode, setInternalMode] = useState<SchemaEditorMode>('simple');
  const mode = externalMode ?? internalMode;

  const [fields, setFields] = useState<SchemaField[]>(() => jsonSchemaToFields(schema));

  // Sync fields when schema changes externally
  useEffect(() => {
    setFields(jsonSchemaToFields(schema));
  }, [schema]);

  const handleModeChange = useCallback(
    (newMode: SchemaEditorMode) => {
      if (onModeChange) {
        onModeChange(newMode);
      } else {
        setInternalMode(newMode);
      }

      // When switching from simple to advanced, sync the schema
      if (newMode === 'advanced' && mode === 'simple') {
        onChange(fieldsToJsonSchema(fields));
      }

      // When switching from advanced to simple, sync the fields
      if (newMode === 'simple' && mode === 'advanced') {
        setFields(jsonSchemaToFields(schema));
      }
    },
    [onModeChange, mode, fields, onChange, schema],
  );

  const handleFieldsChange = useCallback(
    (newFields: SchemaField[]) => {
      setFields(newFields);
      onChange(fieldsToJsonSchema(newFields));
    },
    [onChange],
  );

  const handleSchemaChange = useCallback(
    (newSchema: JsonObject) => {
      onChange(newSchema);
      // Don't sync fields here - let the useEffect handle it
    },
    [onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Data Schema
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted">
          <Button
            variant={mode === 'simple' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleModeChange('simple')}
            className="h-7 px-2 text-xs"
          >
            <List className="h-3.5 w-3.5 mr-1" />
            Simple
          </Button>
          <Button
            variant={mode === 'advanced' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleModeChange('advanced')}
            className="h-7 px-2 text-xs"
          >
            <Code2 className="h-3.5 w-3.5 mr-1" />
            Advanced
          </Button>
        </div>
      </div>

      {mode === 'simple' ? (
        <SimpleSchemaEditor
          fields={fields}
          onFieldsChange={handleFieldsChange}
        />
      ) : (
        <AdvancedSchemaEditor
          schema={schema}
          onSchemaChange={handleSchemaChange}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Define the structure of data your webhook/form will receive. These fields will be available as workflow inputs.
      </p>
    </div>
  );
}

export { createEmptySchema } from './utils';
export type { SchemaEditorMode, SchemaField } from './types';
