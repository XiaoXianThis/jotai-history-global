/**
 * Global History System for Jotai with Optimized Diff-based Storage
 * 
 * Provides a system for tracking changes to atoms and enabling undo/redo functionality
 * across the entire application using efficient diff-based storage and O(1) atom lookups.
 */

export { atomWithHistory, getAtomValue, setAtomValue } from './atomWithHistory';
export { useHistory } from './useHistory';
export { historyStore, registerHistoryAtom, unregisterHistoryAtom } from './historyManager';
export { createDiff, applyDiff, reverseDiff } from './diffUtils';
export type { 
  AtomWithHistory, 
  AtomWithHistoryOptions, 
  HistoryActions, 
  HistoryEntry, 
  HistoryStack,
  Diff,
  ObjectDiff,
  ArrayDiff,
  ValueDiff
} from './types'; 