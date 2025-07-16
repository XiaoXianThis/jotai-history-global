/**
 * atomWithHistory
 * 
 * Creates a Jotai atom that tracks its history for undo/redo operations
 */

import { atom } from 'jotai';
import type { AtomWithHistory, AtomWithHistoryOptions } from './types';
import { 
  generateId, 
  historyStore,
  isHistoryOperationInProgressAtom, 
  pushToHistory,
  registerHistoryAtom
} from './historyManager';

/**
 * Creates an atom with history tracking
 * 
 * @param initialValue - The initial value of the atom
 * @param options - Configuration options
 * @returns An atom that tracks its history
 */
export function atomWithHistory<Value>(
  initialValue: Value,
  options: AtomWithHistoryOptions<Value> = {}
): AtomWithHistory<Value> {
  // Generate a unique ID for this atom if not provided
  const id = options.id || generateId();
  const historyLimit = options.historyLimit;
  const shouldTrack = options.shouldTrack || ((prev, next) => prev !== next);
  
  // Handle custom diff function with type casting for compatibility
  const customDiff = options.customDiff ? 
    ((prev: unknown, next: unknown) => 
      options.customDiff!(prev as Value, next as Value)
    ) : undefined;
    
  const useFullValueInstead = options.useFullValueInstead;
  
  // Create the base atom
  const baseAtom = atom(initialValue);
  
  // Create a writable atom that tracks history
  const anAtom = atom(
    // Getter
    (get) => get(baseAtom),
    
    // Setter
    (get, set, update: Value) => {
      // Get current value before update
      const prevValue = get(baseAtom);
      const nextValue = update;
      
      // Skip if the value hasn't changed according to the tracking function
      if (!shouldTrack(prevValue, nextValue)) {
        return;
      }
      
      // Skip recording history if we're in the middle of an undo/redo operation
      const isHistoryOperation = get(isHistoryOperationInProgressAtom);
      if (!isHistoryOperation) {
        // Record the previous value in history using diff
        pushToHistory(id, prevValue, nextValue, { 
          historyLimit,
          customDiff, 
          useFullValueInstead
        });
      }
      
      // Update the value
      set(baseAtom, update);
    }
  ) as AtomWithHistory<Value>;
  
  // Attach the ID to the atom
  anAtom.id = id;
  
  // Register the atom with the history system
  registerHistoryAtom(anAtom);
  
  return anAtom;
}

/**
 * Function to read an atom's value from the history store directly
 */
export function getAtomValue<Value>(atom: AtomWithHistory<Value>): Value {
  return historyStore.get(atom);
}

/**
 * Function to set an atom's value in the history store directly
 */
export function setAtomValue<Value>(atom: AtomWithHistory<Value>, value: Value): void {
  historyStore.set(atom, value);
} 