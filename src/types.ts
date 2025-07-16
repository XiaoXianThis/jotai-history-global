/**
 * Types for history management system
 */

import type { Atom, WritableAtom } from 'jotai';

// Interface for history entries (updated for diff-based storage)
export interface HistoryEntry {
  id: string; // ID of the atom that was changed
  diff: unknown; // Diff of the change instead of the full value
  timestamp: number; // When the change occurred
  fullValue?: unknown; // Optional full value for complex cases where diff can't be applied
}

// Interface for history stack
export interface HistoryStack {
  past: HistoryEntry[]; // Previous states
  future: HistoryEntry[]; // States that were undone (for redo)
}

// Interface for the atom with history
export interface AtomWithHistory<Value> extends WritableAtom<Value, [Value], void> {
  id: string; // Unique identifier for the atom
}

// Type for group operations
export interface GroupHistoryOperation {
  type: 'group';
  operations: HistoryEntry[];
}

// Custom atom config
export interface AtomWithHistoryOptions<Value> {
  id?: string; // Optional custom ID
  historyLimit?: number; // Maximum number of history entries to keep per atom
  shouldTrack?: (prev: Value, next: Value) => boolean; // Function to determine if a change should be tracked
  customDiff?: (prev: Value, next: Value) => unknown; // Custom diff function
  customPatch?: (value: Value, diff: unknown) => Value; // Custom patch function
  useFullValueInstead?: boolean; // Force using full value instead of diff
}

// Hook return type
export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
  groupOperations: (callback: () => void) => void;
}

// Diff representation
export interface ObjectDiff {
  type: 'object';
  changed: Record<string, unknown>; // Changed properties
  added: Record<string, unknown>; // Added properties
  deleted: string[]; // Deleted properties
}

export interface ArrayDiff {
  type: 'array';
  items: Array<{ index: number, value?: unknown, removed?: boolean, added?: boolean }>;
}

export interface ValueDiff {
  type: 'value';
  before: unknown;
  after: unknown;
}

export type Diff = ObjectDiff | ArrayDiff | ValueDiff; 