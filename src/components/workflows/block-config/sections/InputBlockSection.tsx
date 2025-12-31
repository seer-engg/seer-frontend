import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Trash2,
  Plus,
  AlertCircle,
  Asterisk,
  Eye,
  Info,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

const INPUT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

interface InputField {
  name: string; // Variable name (internal)
  displayLabel?: string; // Human-readable label
  description?: string; // Help text
  type: 'text' | 'number' | 'email' | 'url';
  required: boolean;
  placeholder?: string;
}

interface FieldValidation {
  isValid: boolean;
  error?: string;
}

interface InputBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
}

// Convert display label to variable name
const displayLabelToVariableName = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '') || 'field';
};

// Validate field name format (valid variable name: letters, numbers, underscore, no spaces)
const validateFieldName = (name: string, allFields: InputField[], currentIndex: number): FieldValidation => {
  if (!name.trim()) {
    return { isValid: false, error: 'Variable name is required' };
  }
  
  // Check for valid variable name format
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return { isValid: false, error: 'Use letters, numbers, and underscores only' };
  }
  
  // Check for duplicates
  const duplicateIndex = allFields.findIndex((f, i) => i !== currentIndex && f.name === name);
  if (duplicateIndex !== -1) {
    return { isValid: false, error: 'Duplicate variable name' };
  }
  
  return { isValid: true };
};

// Generate next available field name
const generateFieldName = (fields: InputField[]): string => {
  let counter = 1;
  let name = `field_${counter}`;
  while (fields.some(f => f.name === name)) {
    counter++;
    name = `field_${counter}`;
  }
  return name;
};

// Generate display label from variable name
const generateDisplayLabel = (varName: string): string => {
  return varName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function InputBlockSection({ config, setConfig }: InputBlockSectionProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const displayLabelRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  // Track if we've synced from config to avoid overwriting user edits
  const hasSyncedFromConfigRef = useRef(false);
  
  // Initialize fields from config, with fallback for legacy single-field format
  const [fields, setFields] = useState<InputField[]>(() => {
    if (Array.isArray(config.fields)) {
      if (config.fields.length > 0) {
        // Check if fields have any actual data (non-empty name values)
        const hasValidFields = config.fields.some((f: any) => f.name && f.name.trim() !== '');
        if (hasValidFields) {
          hasSyncedFromConfigRef.current = true;
          return config.fields.map((f: any) => ({
            name: f.name || '',
            displayLabel: f.displayLabel || (f.name ? generateDisplayLabel(f.name) : ''),
            description: f.description || '',
            type: f.type || 'text',
            required: f.required !== false,
            placeholder: f.placeholder || '',
          }));
        }
      }
    }
    // Legacy format: single variable_name
    if (config.variable_name) {
      const varName = config.variable_name;
      hasSyncedFromConfigRef.current = true;
      return [
        {
          name: varName,
          displayLabel: generateDisplayLabel(varName),
          description: '',
          type: config.type || 'text',
          required: config.required !== false,
          placeholder: '',
        },
      ];
    }
    // Default: empty array - let useEffect handle sync when config.fields arrives
    // This prevents empty fields from being synced to config before real fields arrive
    return [];
  });

  // Sync fields state when config.fields changes (e.g., when workflow loads)
  // This handles the case where config loads asynchronously after component mount
  useEffect(() => {
    // If config.fields exists and has data, sync it
    if (Array.isArray(config.fields)) {
      if (config.fields.length > 0) {
        // Check if fields have any actual data (non-empty name values)
        const hasValidFields = config.fields.some((f: any) => f.name && f.name.trim() !== '');
        
        if (hasValidFields) {
          // Always sync if we have valid fields, regardless of previous state
          const newFields = config.fields.map((f: any) => ({
            name: f.name || '',
            displayLabel: f.displayLabel || (f.name ? generateDisplayLabel(f.name) : ''),
            description: f.description || '',
            type: f.type || 'text',
            required: f.required !== false,
            placeholder: f.placeholder || '',
          }));
          
          setFields(prevFields => {
            // Compare more comprehensively - check all field properties
            const prevStr = JSON.stringify(prevFields);
            const newStr = JSON.stringify(newFields);
            if (prevStr !== newStr) {
              hasSyncedFromConfigRef.current = true;
              return newFields;
            }
            return prevFields;
          });
        }
      } else if (!hasSyncedFromConfigRef.current) {
        // Don't set empty fields - keep current state (which should be [])
      }
    } else if (config.variable_name) {
      // Handle legacy format when config loads
      const varName = config.variable_name;
      
      setFields(prevFields => {
        // Only update if current fields are empty/default or we haven't synced yet
        if (!hasSyncedFromConfigRef.current || (prevFields.length === 1 && !prevFields[0].name)) {
          hasSyncedFromConfigRef.current = true;
          return [
            {
              name: varName,
              displayLabel: generateDisplayLabel(varName),
              description: '',
              type: config.type || 'text',
              required: config.required !== false,
              placeholder: '',
            },
          ];
        }
        return prevFields;
      });
    }
  }, [config]);

  // Sync fields to config whenever fields change
  // This MUST happen synchronously to ensure config has fields when liveUpdate saves
  useEffect(() => {
    // Ensure fields is always an array
    if (!Array.isArray(fields)) {
      return;
    }
    
    // CRITICAL: Don't sync empty fields to config if we haven't synced FROM config yet
    // This prevents empty fields from overwriting good data during initialization
    if (fields.length === 0 && !hasSyncedFromConfigRef.current) {
      return;
    }
    
    // Don't sync if all fields have empty names and we haven't synced from config yet
    const hasValidFields = fields.some(f => f.name && f.name.trim() !== '');
    if (!hasValidFields && !hasSyncedFromConfigRef.current) {
      return;
    }
    
    const fieldsToSync = fields.map(f => ({
      name: f.name,
      displayLabel: f.displayLabel,
      description: f.description,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
    }));
    
    setConfig(prev => {
      const newConfig = {
        ...prev,
        fields: fieldsToSync,
        // Remove legacy fields
        variable_name: undefined,
        type: undefined,
        required: undefined,
      };
      return newConfig;
    });
  }, [fields, setConfig]);

  // Update input refs array when fields change
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, fields.length);
    displayLabelRefs.current = displayLabelRefs.current.slice(0, fields.length);
  }, [fields.length]);

  const addField = useCallback(() => {
    const newFieldName = generateFieldName(fields);
    const newDisplayLabel = generateDisplayLabel(newFieldName);
    setFields(prev => {
      const newField: InputField = { 
        name: newFieldName, 
        displayLabel: newDisplayLabel,
        description: '',
        type: 'text' as const, 
        required: true,
        placeholder: '',
      };
      return [...prev, newField];
    });
    // Focus the display label input after state update
    setTimeout(() => {
      const newIndex = fields.length;
      const input = displayLabelRefs.current[newIndex];
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }, [fields.length]);

  const removeField = useCallback((index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
    // Focus previous field or next field if available
    setTimeout(() => {
      const targetIndex = Math.min(index, inputRefs.current.length - 2);
      const input = inputRefs.current[targetIndex];
      if (input) {
        input.focus();
      }
    }, 0);
  }, [expandedIndex]);


  const copyVariableName = useCallback(async (variableName: string) => {
    try {
      await navigator.clipboard.writeText(variableName);
      toast.success('Variable name copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy variable name');
    }
  }, []);

  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    setFields(prev => {
      const newFields = [...prev];
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      return newFields;
    });
    
    // Update expanded index if needed
    if (expandedIndex === index) {
      setExpandedIndex(newIndex);
    } else if (expandedIndex === newIndex) {
      setExpandedIndex(index);
    }
  }, [fields.length, expandedIndex]);

  const updateField = useCallback((index: number, updates: Partial<InputField>) => {
    setFields(prev => prev.map((field, i) => (i === index ? { ...field, ...updates } : field)));
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If field is empty, add new field
      if (!fields[index].name.trim()) {
        addField();
      } else if (index === fields.length - 1) {
        // If on last field, add new field
        addField();
      } else {
        // Otherwise, focus next display label field
        const nextInput = displayLabelRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Remove field if empty and not the only field
      if (!fields[index].name.trim() && fields.length > 1) {
        e.preventDefault();
        removeField(index);
      }
    } else if (e.key === 'Tab' && !e.shiftKey && index === fields.length - 1 && fields[index].name.trim()) {
      // If tabbing from last field with content, add new field
      e.preventDefault();
      addField();
    }
  }, [fields, addField, removeField]);

  const handleInputFocus = useCallback((index: number, e: React.FocusEvent<HTMLInputElement>) => {
    // Auto-select if field is empty or has placeholder-like value
    if (!fields[index].name.trim() || fields[index].name.startsWith('field_')) {
      setTimeout(() => {
        e.target.select();
      }, 0);
    }
  }, [fields]);

  const handleDisplayLabelChange = useCallback((index: number, displayLabel: string) => {
    const varName = displayLabelToVariableName(displayLabel || generateFieldName(fields));
    updateField(index, { 
      displayLabel,
      name: varName,
    });
  }, [fields, updateField]);

  const handleDisplayLabelKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === fields.length - 1) {
        // If on last field, add new field
        addField();
      } else {
        // Otherwise, focus next display label field
        const nextInput = displayLabelRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    } else if (e.key === 'Tab' && !e.shiftKey && index === fields.length - 1) {
      // If tabbing from last field, add new field
      e.preventDefault();
      addField();
    }
  }, [fields, addField]);

  // Handle Cmd/Ctrl+Enter to add field
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        addField();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [addField]);

  const validFields = fields.filter(f => f.name.trim() && validateFieldName(f.name, fields, fields.indexOf(f)).isValid);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const copyAllVariableNames = useCallback(async () => {
    const variableNames = validFields.map(f => f.name).join(', ');
    try {
      await navigator.clipboard.writeText(variableNames);
      toast.success('All variable names copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy variable names');
    }
  }, [validFields]);

  // Check if field is fully configured
  const isFieldComplete = (field: InputField): boolean => {
    return !!(field.name.trim() && field.displayLabel?.trim() && validateFieldName(field.name, fields, fields.indexOf(field)).isValid);
  };

  // Check if variable name is auto-generated (matches pattern from displayLabel)
  const isAutoGenerated = (field: InputField): boolean => {
    if (!field.displayLabel?.trim()) return false;
    const expectedVarName = displayLabelToVariableName(field.displayLabel);
    return field.name === expectedVarName;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 w-fit">
        {fields.length > 0 ? (
          <div className="space-y-2 w-fit">
            {/* Fields Table */}
            <div className="border rounded-lg w-fit overflow-visible [&>div]:!w-fit">
                <Table className="table-auto w-fit">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] text-xs"></TableHead>
                      <TableHead className="min-w-[200px] text-xs">Label</TableHead>
                      <TableHead className="w-[120px] text-xs">Type</TableHead>
                      <TableHead className="w-[100px] text-xs">Required</TableHead>
                      <TableHead className="w-fit text-xs">Variable</TableHead>
                      <TableHead className="w-[50px] text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const validation = validateFieldName(field.name, fields, index);
                      const isEmpty = !field.name.trim();
                      const showError = !isEmpty && !validation.isValid;
                      const displayLabel = field.displayLabel || '';
                      const hasDisplayLabel = !!displayLabel.trim();
                      const isExpanded = expandedIndex === index;
                      const isComplete = isFieldComplete(field);
                      const isAutoGen = isAutoGenerated(field);

                      return (
                        <React.Fragment key={index}>
                          <TableRow
                            className={cn(
                              "group cursor-pointer transition-colors",
                              isExpanded && "bg-muted/50",
                              showError && "bg-destructive/5",
                              isEmpty && field.required && "bg-amber-500/5",
                              !hasDisplayLabel && "bg-amber-500/5 border-l-2 border-l-amber-500"
                            )}
                            onClick={() => toggleExpand(index)}
                          >
                            {/* Order Controls */}
                            <TableCell className="py-2 text-xs">
                              <div className="flex flex-col items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => moveField(index, 'up')}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => moveField(index, 'down')}
                                  disabled={index === fields.length - 1}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>

                            {/* Display Label */}
                            <TableCell className="py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Input
                                  ref={(el) => {
                                    displayLabelRefs.current[index] = el;
                                  }}
                                  value={displayLabel}
                                  onChange={e => handleDisplayLabelChange(index, e.target.value)}
                                  onKeyDown={(e) => handleDisplayLabelKeyDown(index, e)}
                                  placeholder="Enter field label..."
                                  className={cn(
                                    "h-8 text-sm flex-1",
                                    showError && "border-destructive focus-visible:ring-destructive",
                                    !hasDisplayLabel && "border-amber-500/50"
                                  )}
                                />
                                {isComplete && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Field is fully configured</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {!hasDisplayLabel && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Display label is required</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>

                            {/* Type */}
                            <TableCell className="py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={field.type}
                                onValueChange={value =>
                                  updateField(index, { type: value as InputField['type'] })
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {INPUT_TYPES.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Required */}
                            <TableCell className="py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`field-required-${index}`}
                                  checked={field.required}
                                  onCheckedChange={(checked) =>
                                    updateField(index, { required: checked === true })
                                  }
                                  className="h-4 w-4"
                                />
                                {field.required && <Asterisk className="w-3 h-3 text-amber-500" />}
                              </div>
                            </TableCell>

                            {/* Variable Name */}
                            <TableCell className="py-2 px-2 text-xs whitespace-nowrap w-fit" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "font-mono text-xs cursor-pointer hover:bg-muted px-2 py-1 whitespace-nowrap",
                                          showError && "border-destructive text-destructive",
                                          isAutoGen && "border-primary/50"
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyVariableName(field.name);
                                        }}
                                      >
                                        {field.name || 'field'}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      {showError 
                                        ? validation.error 
                                        : isAutoGen
                                        ? `Auto-generated. Use {{${field.name}}} in prompts`
                                        : `Use {{${field.name}}} in prompts`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyVariableName(field.name);
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                {showError && (
                                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                                )}
                              </div>
                            </TableCell>

                            {/* Expand/Collapse & Delete */}
                            <TableCell className="py-2 text-xs" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 shrink-0"
                                  onClick={() => toggleExpand(index)}
                                  title={isExpanded ? 'Collapse details' : 'Expand details'}
                                >
                                  <ChevronRight className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90")} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removeField(index)}
                                  disabled={fields.length === 1}
                                  title="Delete field"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={6} className="p-4 text-xs">
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                  {/* Variable Name (Editable) */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                      Variable Name
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="w-3 h-3 inline ml-1 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Used in prompts as {'{{'}variable_name{'}}'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </Label>
                                    <div className="relative">
                                      <Input
                                        ref={(el) => {
                                          inputRefs.current[index] = el;
                                        }}
                                        value={field.name}
                                        onChange={e => updateField(index, { name: e.target.value })}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onFocus={(e) => handleInputFocus(index, e)}
                                        placeholder={generateFieldName(fields)}
                                        className={cn(
                                          "h-8 text-xs font-mono",
                                          showError && "border-destructive focus-visible:ring-destructive"
                                        )}
                                      />
                                      {showError && (
                                        <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-destructive" />
                                      )}
                                    </div>
                                    {showError && validation.error && (
                                      <p className="text-xs text-destructive mt-1">{validation.error}</p>
                                    )}
                                  </div>

                                  {/* Description */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                      Description (Optional)
                                    </Label>
                                    <Textarea
                                      value={field.description || ''}
                                      onChange={e => updateField(index, { description: e.target.value })}
                                      placeholder="Help text shown to users when filling this field"
                                      className="min-h-[60px] text-xs resize-none"
                                      rows={2}
                                    />
                                  </div>

                                  {/* Placeholder */}
                                  <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                      Placeholder (Optional)
                                    </Label>
                                    <Input
                                      value={field.placeholder || ''}
                                      onChange={e => updateField(index, { placeholder: e.target.value })}
                                      placeholder="e.g., Enter your email address"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <div className="max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">No input fields defined</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Input fields are shown to users when they trigger this workflow. Define fields to collect user data.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addField}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Your First Field
              </Button>
              <div className="pt-4 border-t space-y-2 text-left">
                <p className="text-xs font-medium text-muted-foreground">Example fields:</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    <span>User Email (email type, required)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    <span>Message (text type, optional)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    <span>Priority Level (number type, required)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Form
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
            className="h-8 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </Button>
        </div>

        {/* Preview Modal Dialog */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Preview: Input Form</DialogTitle>
              <DialogDescription>
                This is how users will see the form when triggering this workflow
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {validFields.length > 0 ? (
                validFields.map((field, index) => {
                  const displayLabel = field.displayLabel?.trim();
                  const hasDisplayLabel = !!displayLabel;
                  const previewLabel = displayLabel || 'Unnamed Field';
                  const isUnnamed = !hasDisplayLabel;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`preview-${index}`} className="flex items-center gap-1">
                        {previewLabel}
                        {isUnnamed && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="w-3 h-3 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Display label is required</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {field.required && <Asterisk className="w-3 h-3 text-amber-500" />}
                      </Label>
                      {field.description && (
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      )}
                      <Input
                        id={`preview-${index}`}
                        type={field.type}
                        placeholder={field.placeholder || `Enter ${previewLabel.toLowerCase()}`}
                        disabled
                        required={field.required}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-md">
                  Add and configure fields to see preview
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
              >
                Close
              </Button>
              {validFields.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyAllVariableNames}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy All Variables
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
