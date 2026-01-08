import { useState, useCallback, useEffect, useRef } from 'react';
import { generateSchemaMetadata } from '@/lib/api-client';

interface UseSchemaMetadataGeneratorOptions {
  jsonSchema: Record<string, any> | null;
  autoGenerate?: boolean;
  debounceMs?: number;
  onGenerated?: (metadata: { title: string; description: string }) => void;
}

interface SchemaMetadataState {
  title: string;
  description: string;
  isGenerating: boolean;
  error: string | null;
  isAiGenerated: boolean;
}

export function useSchemaMetadataGenerator({
  jsonSchema,
  autoGenerate = true,
  debounceMs = 1500,
  onGenerated,
}: UseSchemaMetadataGeneratorOptions) {
  const [state, setState] = useState<SchemaMetadataState>({
    title: '',
    description: '',
    isGenerating: false,
    error: null,
    isAiGenerated: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSchemaRef = useRef<string>('');

  const generate = useCallback(async (schema: Record<string, any>) => {
    if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
      setState(prev => ({ ...prev, isGenerating: false, isAiGenerated: false }));
      return;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const result = await generateSchemaMetadata({ jsonSchema: schema });

      setState({
        title: result.title,
        description: result.description,
        isGenerating: false,
        error: null,
        isAiGenerated: true,
      });

      onGenerated?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
        isAiGenerated: false,
      }));
    }
  }, [onGenerated]);

  const regenerate = useCallback(() => {
    if (jsonSchema) {
      generate(jsonSchema);
    }
  }, [jsonSchema, generate]);

  // Auto-generate on schema changes (debounced)
  useEffect(() => {
    if (!autoGenerate || !jsonSchema) return;

    const schemaKey = JSON.stringify(jsonSchema);
    if (schemaKey === lastSchemaRef.current) return;
    lastSchemaRef.current = schemaKey;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      generate(jsonSchema);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [jsonSchema, autoGenerate, debounceMs, generate]);

  return {
    ...state,
    regenerate,
  };
}
