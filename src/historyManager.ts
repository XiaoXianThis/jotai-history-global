/**
 * History Manager
 * 
 * Manages a global history stack for tracking state changes across atoms
 */

import { atom } from 'jotai';
import { createStore } from 'jotai/vanilla';
import type { AtomWithHistory, HistoryEntry, HistoryStack } from './types';
import { createDiff } from './diffUtils';

// Default history limit per atom
const DEFAULT_HISTORY_LIMIT = 50;

// Create a global store for history
export const historyStore = createStore();

// Global history stack atom
export const historyStackAtom = atom<HistoryStack>({
  past: [],
  future: []
});

// Flag to track if we're currently in the middle of an undo/redo operation
// This prevents recording history during undo/redo operations
export const isHistoryOperationInProgressAtom = atom<boolean>(false);

// Current group operation tracking
export const currentGroupOperationAtom = atom<HistoryEntry[] | null>(null);
export const isGroupOperationInProgressAtom = atom<boolean>(false);

// Registry to keep track of all atoms with history - using Map for O(1) lookups
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const atomRegistry = new Map<string, AtomWithHistory<any>>();

/**
 * Register an atom with the history system
 * @param atom - The atom to register
 */
export function registerHistoryAtom<Value>(atom: AtomWithHistory<Value>): void {
  atomRegistry.set(atom.id, atom);
}

/**
 * Unregister an atom from the history system
 * @param atom - The atom to unregister
 */
export function unregisterHistoryAtom<Value>(atom: AtomWithHistory<Value>): void {
  atomRegistry.delete(atom.id);
}

/**
 * Find an atom by ID in the registry - O(1) lookup with Map
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAtomById(id: string): AtomWithHistory<any> | undefined {
  return atomRegistry.get(id);
}

// Helper to generate unique IDs for atoms if not provided
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Push an entry to the history stack
export const pushToHistory = (
  id: string,
  prevValue: unknown,
  nextValue: unknown,
  options?: { 
    historyLimit?: number;
    useFullValueInstead?: boolean;
    customDiff?: (prev: unknown, next: unknown) => unknown;
  }
): void => {
  const historyLimit = options?.historyLimit || DEFAULT_HISTORY_LIMIT;

  // Compute diff or use full value
  let entryData: { diff: unknown; fullValue?: unknown };
  
  if (options?.useFullValueInstead) {
    // Store the full previous value instead of a diff
    entryData = { 
      diff: prevValue,  // Use prevValue as the diff for simplicity
      fullValue: prevValue // Also store the full value
    };
  } else if (options?.customDiff) {
    // Use custom diff function if provided
    const customDiff = options.customDiff(prevValue, nextValue);
    entryData = { diff: customDiff };
  } else {
    // Use built-in diff calculation
    const diff = createDiff(prevValue, nextValue);
    
    if (diff === null) {
      // No changes detected, don't record history
      return;
    }
    
    entryData = { diff };
    
    // For complex diffs, store the full value as a fallback
    const isComplexDiff = 
      (diff.type === 'object' && Object.keys(diff.changed).length > 10) ||
      (diff.type === 'array' && diff.items.length > 20);
      
    if (isComplexDiff) {
      entryData.fullValue = prevValue;
    }
  }
  
  const entry: HistoryEntry = {
    id,
    diff: entryData.diff,
    timestamp: Date.now()
  };
  
  if (entryData.fullValue !== undefined) {
    entry.fullValue = entryData.fullValue;
  }

  // Add to group operation if one is in progress
  const isGroupOperation = historyStore.get(currentGroupOperationAtom);
  if (isGroupOperation) {
    historyStore.set(currentGroupOperationAtom, [
      ...(historyStore.get(currentGroupOperationAtom) || []), 
      entry
    ]);
    return;
  }

  const currentStack = historyStore.get(historyStackAtom);
  
  // Add to history, respecting the limit
  const newPast = [...currentStack.past, entry];
  if (newPast.length > historyLimit) {
    newPast.shift(); // Remove oldest entry if limit reached
  }
  
  // Clear future when a new change occurs
  historyStore.set(historyStackAtom, {
    past: newPast,
    future: [] // Clear redo stack when new changes occur
  });
};

// Start a group operation
export const startGroupOperation = (): void => {
  historyStore.set(isGroupOperationInProgressAtom, true);
  historyStore.set(currentGroupOperationAtom, []);
};

// End a group operation and commit it to history
export const endGroupOperation = (): void => {
  const groupEntries = historyStore.get(currentGroupOperationAtom);
  if (groupEntries && groupEntries.length > 0) {
    const currentStack = historyStore.get(historyStackAtom);
    
    historyStore.set(historyStackAtom, {
      past: [...currentStack.past, ...groupEntries],
      future: []
    });
  }
  
  historyStore.set(isGroupOperationInProgressAtom, false);
  historyStore.set(currentGroupOperationAtom, null);
}; 