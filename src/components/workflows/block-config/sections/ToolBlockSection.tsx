import type { Dispatch, RefObject, SetStateAction } from 'react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

import { ResourcePicker } from '@/components/workflows/ResourcePicker';

import { AutocompleteContext } from '../hooks/useTemplateAutocomplete';
import { TemplateAutocompleteControls, ResourcePickerConfig, ToolMetadata } from '../types';
import { VariableAutocompleteDropdown } from '../widgets/VariableAutocompleteDropdown';

interface ToolBlockSectionProps {
  config: Record<string, any>;
  setConfig: Dispatch<SetStateAction<Record<string, any>>>;
  toolSchema?: ToolMetadata;
  templateAutocomplete: TemplateAutocompleteControls;
}

export function ToolBlockSection({
  config,
  setConfig,
  toolSchema,
  templateAutocomplete,
}: ToolBlockSectionProps) {
  const toolParams = config.params || {};
  const paramSchema = toolSchema?.parameters?.properties || {};
  const requiredParams = toolSchema?.parameters?.required || [];
  const toolProvider = config.provider || 'google';

  const {
    autocompleteContext,
    checkForAutocomplete,
    closeAutocomplete,
    filteredVariables,
    handleKeyDown,
    insertVariable,
    selectedIndex,
    showAutocomplete,
  } = templateAutocomplete;

  const updateParams = (updater: (prev: Record<string, any>) => Record<string, any>) => {
    setConfig(prev => ({
      ...prev,
      params: updater(prev.params || {}),
    }));
  };

  const handlePrimitiveChange = (paramName: string, nextValue: string | number | boolean) => {
    updateParams(prev => ({
      ...prev,
      [paramName]: nextValue,
    }));
  };

  const getAutocompleteContext = (
    inputId: string,
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string,
    onChange: (newValue: string) => void
  ): AutocompleteContext => ({
    inputId,
    ref: { current: element } as RefObject<HTMLInputElement | HTMLTextAreaElement>,
    value,
    onChange,
  });

  const renderParamField = (paramName: string, paramDef: any) => {
    const paramType = paramDef.type || 'string';
    const paramValue = toolParams[paramName];
    const isRequired = requiredParams.includes(paramName);
    const hasDefault = paramDef.default !== undefined;
    const resourcePicker = paramDef['x-resource-picker'] as ResourcePickerConfig | undefined;
    const defaultPlaceholder =
      paramDef.default === undefined
        ? ''
        : typeof paramDef.default === 'object'
          ? JSON.stringify(paramDef.default)
          : String(paramDef.default);

    const inputId = `param-${paramName}`;
    const showDropdown = showAutocomplete && autocompleteContext?.inputId === inputId;

    const setParamValue = (value: any) => {
      updateParams(prev => ({
        ...prev,
        [paramName]: value,
      }));
    };

    const setParamValueFromRaw = (
      raw: string,
      validator: (parsed: any) => boolean
    ) => {
      try {
        const parsed = JSON.parse(raw);
        if (validator(parsed)) {
          setParamValue(parsed);
          return;
        }
      } catch {
        // Ignore parse errors and fall back to raw string
      }
      setParamValue(raw);
    };

    return (
      <div key={paramName} className="grid grid-cols-2 gap-1 items-start">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-1">
            <Label htmlFor={inputId} className="text-xs font-medium">
              {paramName}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {paramDef.description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`About ${paramName} parameter`}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  {paramDef.description}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {hasDefault && (
            <p className="text-xs text-muted-foreground italic">
              Default:{' '}
              {typeof paramDef.default === 'object'
                ? JSON.stringify(paramDef.default)
                : String(paramDef.default)}
            </p>
          )}
        </div>

        <div className="space-y-1 relative">
          {resourcePicker ? (
            <ResourcePicker
              config={resourcePicker}
              provider={toolProvider}
              value={paramValue}
              onChange={value => {
                updateParams(prev => ({
                  ...prev,
                  [paramName]: value,
                }));
              }}
              placeholder={`Select ${paramName}...`}
              dependsOnValues={
                resourcePicker.depends_on
                  ? { [resourcePicker.depends_on]: toolParams[resourcePicker.depends_on] }
                  : undefined
              }
              className="text-xs"
            />
          ) : paramType === 'boolean' ? (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={inputId}
                checked={paramValue ?? paramDef.default ?? false}
                onChange={e => handlePrimitiveChange(paramName, e.target.checked)}
                className="rounded"
              />
              <Label htmlFor={inputId} className="text-xs font-normal">
                {paramName}
              </Label>
            </div>
          ) : paramType === 'integer' || paramType === 'number' ? (
            <Input
              id={inputId}
              type="number"
              value={paramValue ?? paramDef.default ?? ''}
              onChange={e => {
                const value =
                  paramType === 'integer' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0;
                handlePrimitiveChange(paramName, value);
              }}
              min={paramDef.minimum}
              max={paramDef.maximum}
              step={paramType === 'integer' ? 1 : 0.1}
              placeholder={hasDefault ? String(paramDef.default) : ''}
              className="text-xs"
            />
          ) : paramType === 'array' ? (
            <>
              <Textarea
                id={inputId}
                value={
                  Array.isArray(paramValue)
                    ? JSON.stringify(paramValue, null, 2)
                    : typeof paramValue === 'string'
                      ? paramValue
                      : paramDef.default
                        ? JSON.stringify(paramDef.default, null, 2)
                        : '[]'
                }
                onChange={e => {
                  const value = e.target.value;
                  setParamValueFromRaw(value, Array.isArray);
                  const context = getAutocompleteContext(
                    inputId,
                    e.target,
                    value,
                    newValue => setParamValueFromRaw(newValue, Array.isArray)
                  );
                  checkForAutocomplete(value, e.target.selectionStart || 0, context);
                }}
                onKeyDown={e => handleKeyDown(e, { allowShiftEnter: true })}
                onBlur={() => {
                  setTimeout(() => closeAutocomplete(), 200);
                }}
                placeholder={JSON.stringify(paramDef.default || [], null, 2)}
                className="font-mono text-xs"
                rows={4}
              />
              <VariableAutocompleteDropdown
                visible={showDropdown}
                variables={filteredVariables}
                selectedIndex={selectedIndex}
                onSelect={insertVariable}
              />
            </>
          ) : paramType === 'object' ? (
            <>
              <Textarea
                id={inputId}
                value={
                  typeof paramValue === 'object' && paramValue !== null
                    ? JSON.stringify(paramValue, null, 2)
                    : typeof paramValue === 'string'
                      ? paramValue
                      : paramDef.default
                        ? JSON.stringify(paramDef.default, null, 2)
                        : '{}'
                }
                onChange={e => {
                  const value = e.target.value;
                  setParamValueFromRaw(
                    value,
                    parsed => typeof parsed === 'object' && parsed !== null
                  );
                  const context = getAutocompleteContext(
                    inputId,
                    e.target,
                    value,
                    newValue =>
                      setParamValueFromRaw(
                        newValue,
                        parsed => typeof parsed === 'object' && parsed !== null
                      )
                  );
                  checkForAutocomplete(value, e.target.selectionStart || 0, context);
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  setTimeout(() => closeAutocomplete(), 200);
                }}
                placeholder={JSON.stringify(paramDef.default || {}, null, 2)}
                className="font-mono text-xs"
                rows={4}
              />
              <VariableAutocompleteDropdown
                visible={showDropdown}
                variables={filteredVariables}
                selectedIndex={selectedIndex}
                onSelect={insertVariable}
              />
            </>
          ) : paramDef.enum && Array.isArray(paramDef.enum) ? (
            <Select
              value={paramValue ?? paramDef.default ?? paramDef.enum[0]}
              onValueChange={value => handlePrimitiveChange(paramName, value)}
            >
              <SelectTrigger id={inputId} className="text-xs">
                <SelectValue placeholder={`Select ${paramName}...`} />
              </SelectTrigger>
              <SelectContent>
                {paramDef.enum.map((enumValue: string) => (
                  <SelectItem key={enumValue} value={enumValue}>
                    {enumValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <Input
                id={inputId}
                type="text"
                value={paramValue ?? paramDef.default ?? ''}
                onChange={e => {
                  const value = e.target.value;
                  handlePrimitiveChange(paramName, value);
                  const context = getAutocompleteContext(
                    inputId,
                    e.target,
                    value,
                    newValue => handlePrimitiveChange(paramName, newValue)
                  );
                  checkForAutocomplete(value, e.target.selectionStart || 0, context);
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  setTimeout(() => closeAutocomplete(), 200);
                }}
                placeholder={defaultPlaceholder}
                className="text-xs"
              />
              <VariableAutocompleteDropdown
                visible={showDropdown}
                variables={filteredVariables}
                selectedIndex={selectedIndex}
                onSelect={insertVariable}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  if (Object.keys(paramSchema).length === 0) {
    return (
      <div>
        <Label htmlFor="tool-params">Parameters (JSON)</Label>
        <Textarea
          id="tool-params"
          value={JSON.stringify(toolParams, null, 2)}
          onChange={e => {
            try {
              const params = JSON.parse(e.target.value);
              setConfig(prev => ({ ...prev, params }));
            } catch {
              // Keep existing behavior (ignore invalid JSON)
            }
          }}
          placeholder='{"max_results": 5}'
          className="font-mono text-xs"
          rows={4}
        />
      </div>
    );
  }

  return <div className="space-y-4">{Object.entries(paramSchema).map(([name, def]) => renderParamField(name, def))}</div>;
}

