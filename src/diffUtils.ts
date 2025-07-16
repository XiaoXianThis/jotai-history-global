/**
 * Diff utilities for computing and applying differences between values
 */

import type { Diff, ObjectDiff, ArrayDiff, ValueDiff } from './types';

/**
 * Creates a deep diff between two values
 * @param oldValue - The old value
 * @param newValue - The new value
 * @returns The difference or null if no differences
 */
export function createDiff(oldValue: unknown, newValue: unknown): Diff | null {
  // Handle identity
  if (oldValue === newValue) return null;

  // Handle primitive types or when one side is null/undefined
  if (!oldValue || !newValue || 
      typeof oldValue !== 'object' || 
      typeof newValue !== 'object' || 
      Array.isArray(oldValue) !== Array.isArray(newValue)) {
    return {
      type: 'value',
      before: oldValue,
      after: newValue
    } as ValueDiff;
  }
  
  // Handle arrays
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    return createArrayDiff(oldValue, newValue);
  }
  
  // Handle objects
  return createObjectDiff(
    oldValue as Record<string, unknown>, 
    newValue as Record<string, unknown>
  );
}

/**
 * Creates a diff between two objects
 */
function createObjectDiff(
  oldObj: Record<string, unknown>, 
  newObj: Record<string, unknown>
): ObjectDiff | null {
  const changed: Record<string, unknown> = {};
  const added: Record<string, unknown> = {};
  const deleted: string[] = [];
  
  // Check for changed or deleted properties
  for (const key in oldObj) {
    if (!(key in newObj)) {
      deleted.push(key);
    } else if (newObj[key] !== oldObj[key]) {
      const childDiff = createDiff(oldObj[key], newObj[key]);
      if (childDiff) {
        changed[key] = childDiff;
      }
    }
  }
  
  // Check for added properties
  for (const key in newObj) {
    if (!(key in oldObj)) {
      added[key] = newObj[key];
    }
  }
  
  // Return null if no changes
  if (Object.keys(changed).length === 0 && 
      Object.keys(added).length === 0 && 
      deleted.length === 0) {
    return null;
  }
  
  return {
    type: 'object',
    changed,
    added,
    deleted
  };
}

/**
 * Creates a diff between two arrays
 */
function createArrayDiff(oldArray: unknown[], newArray: unknown[]): ArrayDiff | null {
  const items: ArrayDiff['items'] = [];
  const maxLen = Math.max(oldArray.length, newArray.length);
  let hasChanges = false;
  
  for (let i = 0; i < maxLen; i++) {
    if (i >= oldArray.length) {
      // Added item
      items.push({ index: i, value: newArray[i], added: true });
      hasChanges = true;
    } else if (i >= newArray.length) {
      // Removed item
      items.push({ index: i, value: oldArray[i], removed: true });
      hasChanges = true;
    } else if (oldArray[i] !== newArray[i]) {
      // Changed item
      items.push({ 
        index: i, 
        value: newArray[i]
      });
      hasChanges = true;
    }
  }
  
  return hasChanges ? { type: 'array', items } : null;
}

/**
 * Applies a diff to a value to get the new value
 * @param value - The current value
 * @param diff - The diff to apply
 * @returns The new value
 */
export function applyDiff<T>(value: T, diff: Diff): T {
  // Handle primitive values
  if (diff.type === 'value') {
    return diff.after as T;
  }
  
  // Handle arrays
  if (diff.type === 'array' && Array.isArray(value)) {
    return applyArrayDiff(value as unknown[], diff) as unknown as T;
  }
  
  // Handle objects
  if (diff.type === 'object' && value !== null && typeof value === 'object') {
    return applyObjectDiff(value as Record<string, unknown>, diff) as unknown as T;
  }
  
  // Fallback if diff can't be applied
  console.warn('Unable to apply diff, returning original value', { value, diff });
  return value;
}

/**
 * Applies an object diff
 */
function applyObjectDiff(
  obj: Record<string, unknown>,
  diff: ObjectDiff
): Record<string, unknown> {
  const result = { ...obj };
  
  // Apply changes
  for (const [key, childDiff] of Object.entries(diff.changed)) {
    if (key in result) {
      result[key] = applyDiff(result[key], childDiff as Diff);
    }
  }
  
  // Add new properties
  for (const [key, value] of Object.entries(diff.added)) {
    result[key] = value;
  }
  
  // Delete properties
  for (const key of diff.deleted) {
    delete result[key];
  }
  
  return result;
}

/**
 * Applies an array diff
 */
function applyArrayDiff(arr: unknown[], diff: ArrayDiff): unknown[] {
  // Create a copy of the array
  const result = [...arr];
  
  // Process removals first (from highest index to lowest)
  const removals = diff.items
    .filter(item => item.removed)
    .sort((a, b) => b.index - a.index);
    
  for (const item of removals) {
    result.splice(item.index, 1);
  }
  
  // Process additions and changes
  for (const item of diff.items) {
    if (item.added) {
      // Insert at specified index
      result.splice(item.index, 0, item.value);
    } else if (!item.removed && item.value !== undefined) {
      // Replace value at index
      result[item.index] = item.value;
    }
  }
  
  return result;
}

/**
 * Reverses a diff so it can be applied to undo a change
 */
export function reverseDiff(diff: Diff): Diff {
  if (diff.type === 'value') {
    return {
      type: 'value',
      before: diff.after,
      after: diff.before
    };
  }
  
  if (diff.type === 'array') {
    return {
      type: 'array',
      items: diff.items.map(item => ({
        index: item.index,
        value: item.value,
        added: item.removed,
        removed: item.added
      }))
    };
  }
  
  if (diff.type === 'object') {
    return {
      type: 'object',
      added: diff.deleted.reduce((obj, key) => {
        // We can't know the original values of deleted properties
        obj[key] = undefined as unknown;
        return obj;
      }, {} as Record<string, unknown>),
      deleted: Object.keys(diff.added),
      changed: Object.entries(diff.changed).reduce((obj, [key, childDiff]) => {
        obj[key] = reverseDiff(childDiff as Diff);
        return obj;
      }, {} as Record<string, unknown>)
    };
  }
  
  throw new Error('Unknown diff type');
} 