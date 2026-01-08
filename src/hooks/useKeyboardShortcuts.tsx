import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

export interface ShortcutDefinition {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  handler: () => void;
  category: string;
  description: string;
  scope?: 'global' | 'dialog';
  enabled?: boolean;
}

interface ShortcutWithId extends ShortcutDefinition {
  id: string;
}

interface KeyboardShortcutContextValue {
  shortcuts: ShortcutWithId[];
  registerShortcut: (shortcut: ShortcutDefinition) => string;
  unregisterShortcut: (id: string) => void;
}

const KeyboardShortcutContext = createContext<KeyboardShortcutContextValue | null>(null);

let shortcutIdCounter = 0;
const generateId = () => `shortcut-${++shortcutIdCounter}`;

export function KeyboardShortcutProvider({ children }: { children: React.ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Map<string, ShortcutWithId>>(new Map());

  const registerShortcut = useCallback((shortcut: ShortcutDefinition) => {
    const id = generateId();
    const shortcutWithId: ShortcutWithId = { ...shortcut, id };
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.set(id, shortcutWithId);
      return next;
    });
    return id;
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, [contenteditable="true"]')) {
        return;
      }

      // Find matching shortcut
      for (const [, shortcut] of shortcuts) {
        if (shortcut.enabled === false) continue;

        const key = event.key.toLowerCase();
        const shortcutKey = shortcut.key.toLowerCase();

        // Check if key matches
        if (key !== shortcutKey) continue;

        // Check modifiers
        const ctrlPressed = event.ctrlKey || event.metaKey;
        const shiftPressed = event.shiftKey;
        const altPressed = event.altKey;

        const needsCtrl = shortcut.modifiers?.ctrl || shortcut.modifiers?.meta;
        const needsShift = shortcut.modifiers?.shift;
        const needsAlt = shortcut.modifiers?.alt;

        const modifiersMatch =
          (!needsCtrl || ctrlPressed) &&
          (!needsShift || shiftPressed) &&
          (!needsAlt || altPressed) &&
          // Ensure extra modifiers aren't pressed when not needed
          (needsCtrl || !ctrlPressed) &&
          (needsShift || !shiftPressed) &&
          (needsAlt || !altPressed);

        if (modifiersMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const value = useMemo(
    () => ({
      shortcuts: Array.from(shortcuts.values()),
      registerShortcut,
      unregisterShortcut,
    }),
    [shortcuts, registerShortcut, unregisterShortcut]
  );

  return (
    <KeyboardShortcutContext.Provider value={value}>
      {children}
    </KeyboardShortcutContext.Provider>
  );
}

export function useKeyboardShortcut(definition: ShortcutDefinition) {
  const context = useContext(KeyboardShortcutContext);

  if (!context) {
    throw new Error('useKeyboardShortcut must be used within KeyboardShortcutProvider');
  }

  useEffect(() => {
    const id = context.registerShortcut(definition);
    return () => context.unregisterShortcut(id);
  }, [
    definition.key,
    definition.enabled,
    definition.handler,
    definition.modifiers?.ctrl,
    definition.modifiers?.meta,
    definition.modifiers?.shift,
    definition.modifiers?.alt,
    context,
  ]);
}

export function useShortcuts() {
  const context = useContext(KeyboardShortcutContext);
  if (!context) return [];
  return context.shortcuts;
}
