import { useCallback, useMemo, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

export interface AutocompleteContext {
  inputId: string;
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

interface HandleKeyDownOptions {
  allowShiftEnter?: boolean;
}

export const useTemplateAutocomplete = (availableVariables: string[]) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [partialVariable, setPartialVariable] = useState('');
  const [autocompleteContext, setAutocompleteContext] = useState<AutocompleteContext | null>(null);

  const filteredVariables = useMemo(() => {
    if (!partialVariable) return availableVariables;
    return availableVariables.filter(variable =>
      variable.toLowerCase().startsWith(partialVariable.toLowerCase())
    );
  }, [availableVariables, partialVariable]);

  const closeAutocomplete = useCallback(() => {
    setShowAutocomplete(false);
    setPartialVariable('');
    setAutocompleteContext(null);
  }, []);

  const checkForAutocomplete = useCallback(
    (value: string, cursorPosition: number, context?: AutocompleteContext) => {
      const textBeforeCursor = value.substring(0, cursorPosition);
      const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');

      if (lastOpenBrace !== -1) {
        const textAfterOpen = textBeforeCursor.substring(lastOpenBrace + 2);
        const hasClosing = textAfterOpen.includes('}}');

        if (!hasClosing) {
          const partial = textAfterOpen.trim();
          setPartialVariable(partial);
          setShowAutocomplete(true);
          setSelectedIndex(0);
          if (context) {
            setAutocompleteContext({ ...context, value });
          }
          return;
        }
      }

      setShowAutocomplete(false);
      setPartialVariable('');
      if (!context) {
        setAutocompleteContext(null);
      }
    },
    []
  );

  const insertVariable = useCallback(
    (variable: string, fallbackContext?: AutocompleteContext) => {
      const context = autocompleteContext || fallbackContext;
      if (!context) return;

      const { ref, value, onChange } = context;
      const input = ref.current;
      if (!input) return;

      const cursorPos = input.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPos);
      const textAfterCursor = value.substring(cursorPos);

      const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
      if (lastOpenBrace === -1) return;

      const beforeBrace = value.substring(0, lastOpenBrace);
      const newValue = `${beforeBrace}{{${variable}}}${textAfterCursor}`;

      onChange(newValue);
      setShowAutocomplete(false);
      setPartialVariable('');
      setAutocompleteContext(null);

      setTimeout(() => {
        const newCursorPos = lastOpenBrace + variable.length + 4;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();
      }, 0);
    },
    [autocompleteContext]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, options: HandleKeyDownOptions = {}) => {
      if (!showAutocomplete || filteredVariables.length === 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredVariables.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (!options.allowShiftEnter && e.shiftKey) {
          return;
        }
        e.preventDefault();
        const variable = filteredVariables[selectedIndex];
        if (variable) {
          insertVariable(variable);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAutocomplete();
      }
    },
    [closeAutocomplete, filteredVariables, insertVariable, selectedIndex, showAutocomplete]
  );

  return {
    autocompleteContext,
    checkForAutocomplete,
    closeAutocomplete,
    filteredVariables,
    handleKeyDown,
    insertVariable,
    selectedIndex,
    setAutocompleteContext,
    setSelectedIndex,
    showAutocomplete,
  };
};

