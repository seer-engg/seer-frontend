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

  const getModifierState = (event: KeyboardEvent) => ({
    ctrl: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
  });

  const getRequiredModifiers = (modifiers?: KeyboardShortcut['modifiers']) => ({
    ctrl: Boolean(modifiers?.ctrl || modifiers?.meta),
    shift: Boolean(modifiers?.shift),
    alt: Boolean(modifiers?.alt),
  });

  const checkModifiers = useCallback((
    event: KeyboardEvent,
    requiredModifiers?: KeyboardShortcut['modifiers']
  ): boolean => {
    const pressed = getModifierState(event);
    const needed = getRequiredModifiers(requiredModifiers);

    // All required modifiers must be pressed
    if (needed.ctrl && !pressed.ctrl) return false;
    if (needed.shift && !pressed.shift) return false;
    if (needed.alt && !pressed.alt) return false;

    // No extra modifiers should be pressed
    if (!needed.ctrl && pressed.ctrl) return false;
    if (!needed.shift && pressed.shift) return false;
    if (!needed.alt && pressed.alt) return false;

    return true;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, [contenteditable="true"]')) {
        return;
      }

      for (const [, shortcut] of shortcuts) {
        if (shortcut.enabled === false) continue;

        const key = event.key.toLowerCase();
        const shortcutKey = shortcut.key.toLowerCase();

        if (key !== shortcutKey) continue;

        if (checkModifiers(event, shortcut.modifiers)) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, checkModifiers]);

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

// eslint-disable-next-line react-refresh/only-export-components
export function useKeyboardShortcut(definition: ShortcutDefinition) {
  const context = useContext(KeyboardShortcutContext);

  if (!context) {
    throw new Error('useKeyboardShortcut must be used within KeyboardShortcutProvider');
  }

  useEffect(() => {
    const id = context.registerShortcut(definition);
    return () => context.unregisterShortcut(id);
  }, [definition, context]);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShortcuts() {
  const context = useContext(KeyboardShortcutContext);
  if (!context) return [];
  return context.shortcuts;
}
