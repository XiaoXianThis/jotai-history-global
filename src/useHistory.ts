/**
 * useHistory Hook
 * 
 * React hook for managing the history system (undo/redo)
 */

import { useAtom } from 'jotai';
import { useCallback } from 'react';
import type { HistoryActions, Diff, ValueDiff } from './types';
import { 
  historyStackAtom,
  historyStore,
  isHistoryOperationInProgressAtom,
  startGroupOperation,
  endGroupOperation,
  getAtomById
} from './historyManager';
import { applyDiff, reverseDiff } from './diffUtils';

/**
 * Hook to access and control the global history system
 * 
 * @returns Actions and state for history management
 */
export function useHistory(): HistoryActions {
  const [historyStack, setHistoryStack] = useAtom(historyStackAtom);
  const [isHistoryOperation, setIsHistoryOperation] = useAtom(isHistoryOperationInProgressAtom);
  
  /**
   * Performs an undo operation
   */
  const undo = useCallback(() => {
    setHistoryStack((currentStack) => {
      if (currentStack.past.length === 0) return currentStack;
      
      // Get the most recent history entry
      const lastEntry = currentStack.past[currentStack.past.length - 1];
      const newPast = currentStack.past.slice(0, -1);
      
      // Find the atom by ID - O(1) lookup with Map
      const atomWithId = getAtomById(lastEntry.id);
      if (!atomWithId) return currentStack;
      
      // Mark that we're in an undo operation to prevent recording this change in history
      setIsHistoryOperation(true);
      
      try {
        // Get the current value
        const currentValue = historyStore.get(atomWithId);
        
        // Apply the reverse of the diff or use stored full value
        let previousValue;
        
        if (lastEntry.fullValue !== undefined) {
          // Use the stored full value directly if available
          previousValue = lastEntry.fullValue;
        } else {
          // Apply reversed diff to restore previous state
          try {
            // Type guard to ensure the diff is of type Diff
            if (typeof lastEntry.diff === 'object' && 
                lastEntry.diff !== null &&
                'type' in lastEntry.diff) {
              const reversedDiff = reverseDiff(lastEntry.diff as Diff);
              previousValue = applyDiff(currentValue, reversedDiff);
            } else {
              throw new Error('Invalid diff format');
            }
          } catch (error) {
            console.error('Error applying diff during undo:', error);
            // Fallback to using diff directly if it's a value diff
            if (typeof lastEntry.diff === 'object' && 
                lastEntry.diff !== null && 
                'type' in lastEntry.diff && 
                lastEntry.diff.type === 'value' &&
                'before' in lastEntry.diff) {
              previousValue = (lastEntry.diff as ValueDiff).before;
            } else {
              console.error('Cannot undo - unable to apply diff and no fullValue available');
              return currentStack;
            }
          }
        }
        
        // Restore the previous value
        historyStore.set(atomWithId, previousValue);
        
        // Update the history stacks
        return {
          past: newPast,
          future: [
            ...currentStack.future,
            { 
              id: lastEntry.id, 
              diff: lastEntry.diff,
              fullValue: lastEntry.fullValue,  // Keep the fullValue if it exists
              timestamp: Date.now() 
            }
          ]
        };
      } finally {
        // Reset the flag
        setIsHistoryOperation(false);
      }
    });
  }, [setHistoryStack, setIsHistoryOperation]);
  
  /**
   * Performs a redo operation
   */
  const redo = useCallback(() => {
    setHistoryStack((currentStack) => {
      if (currentStack.future.length === 0) return currentStack;
      
      // Get the next future entry
      const nextEntry = currentStack.future[currentStack.future.length - 1];
      const newFuture = currentStack.future.slice(0, -1);
      
      // Find the atom by ID - O(1) lookup
      const atomWithId = getAtomById(nextEntry.id);
      if (!atomWithId) return currentStack;
      
      // Mark that we're in a redo operation
      setIsHistoryOperation(true);
      
      try {
        // Get the current value
        const currentValue = historyStore.get(atomWithId);
        
        // Apply the diff or use stored full value
        let nextValue;
        
        if (nextEntry.fullValue !== undefined) {
          // Use the stored full value directly if available
          nextValue = nextEntry.fullValue;
        } else {
          // Apply diff to restore next state
          try {
            // Type guard to ensure the diff is of type Diff
            if (typeof nextEntry.diff === 'object' && 
                nextEntry.diff !== null &&
                'type' in nextEntry.diff) {
              nextValue = applyDiff(currentValue, nextEntry.diff as Diff);
            } else {
              throw new Error('Invalid diff format');
            }
          } catch (error) {
            console.error('Error applying diff during redo:', error);
            // Fallback to using diff directly if it's a value diff
            if (typeof nextEntry.diff === 'object' && 
                nextEntry.diff !== null && 
                'type' in nextEntry.diff && 
                nextEntry.diff.type === 'value' &&
                'after' in nextEntry.diff) {
              nextValue = (nextEntry.diff as ValueDiff).after;
            } else {
              console.error('Cannot redo - unable to apply diff and no fullValue available');
              return currentStack;
            }
          }
        }
        
        // Apply the future value
        historyStore.set(atomWithId, nextValue);
        
        // Update the history stacks
        return {
          past: [
            ...currentStack.past,
            { 
              id: nextEntry.id, 
              diff: nextEntry.diff,
              fullValue: nextEntry.fullValue, // Keep the fullValue if it exists
              timestamp: Date.now() 
            }
          ],
          future: newFuture
        };
      } finally {
        // Reset the flag
        setIsHistoryOperation(false);
      }
    });
  }, [setHistoryStack, setIsHistoryOperation]);
  
  /**
   * Clears the history stacks
   */
  const clear = useCallback(() => {
    setHistoryStack({ past: [], future: [] });
  }, [setHistoryStack]);
  
  /**
   * Groups multiple operations into a single history entry
   */
  const groupOperations = useCallback((callback: () => void) => {
    startGroupOperation();
    try {
      callback();
    } finally {
      endGroupOperation();
    }
  }, []);
  
  return {
    undo,
    redo,
    canUndo: historyStack.past.length > 0,
    canRedo: historyStack.future.length > 0,
    clear,
    groupOperations,
  };
} 