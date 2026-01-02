/**
 * CleanupManager
 * Centralized utility for tracking and executing cleanup functions
 *
 * Responsibilities:
 * - Store cleanup functions (event listeners, timers, observers, etc.)
 * - Execute all cleanup functions when needed
 * - Support grouped cleanup (cleanup specific groups)
 * - Automatic error handling during cleanup
 *
 * Usage:
 * ```typescript
 * const cleanup = new CleanupManager();
 *
 * // Add cleanup functions
 * cleanup.add(() => console.log('cleanup 1'));
 * cleanup.add(() => console.log('cleanup 2'));
 *
 * // Add multiple at once
 * cleanup.addMultiple(fn1, fn2, fn3);
 *
 * // Cleanup everything
 * cleanup.cleanup();
 * ```
 */

export class CleanupManager {
  // Properties
  cleanups: Array<() => void>;
  groups: Map<string, Array<() => void>>;

  constructor() {
    this.cleanups = [];
    this.groups = new Map();
  }

  /**
   * Add a cleanup function to be called later
   * @param cleanupFn - Function to call during cleanup
   * @returns The cleanup function (for chaining)
   */
  add(cleanupFn: () => void): () => void {
    if (typeof cleanupFn !== 'function') {
      console.warn('CleanupManager: Attempted to add non-function cleanup', cleanupFn);
      return cleanupFn;
    }

    this.cleanups.push(cleanupFn);
    return cleanupFn;
  }

  /**
   * Add multiple cleanup functions at once
   * @param cleanupFns - Functions to call during cleanup
   */
  addMultiple(...cleanupFns: Array<() => void>): void {
    cleanupFns.forEach(fn => this.add(fn));
  }

  /**
   * Add a cleanup function to a named group
   * Useful for cleaning up specific features without affecting others
   * @param group - Group name
   * @param cleanupFn - Function to call during cleanup
   */
  addToGroup(group: string, cleanupFn: () => void): () => void {
    if (typeof cleanupFn !== 'function') {
      console.warn('CleanupManager: Attempted to add non-function cleanup to group', group, cleanupFn);
      return cleanupFn;
    }

    if (!this.groups.has(group)) {
      this.groups.set(group, []);
    }

    this.groups.get(group)!.push(cleanupFn);
    return cleanupFn;
  }

  /**
   * Execute all cleanup functions and clear the list
   * Errors during cleanup are caught and logged to prevent cascade failures
   */
  cleanup(): void {
    const errors: Error[] = [];

    // Execute all general cleanups
    this.cleanups.forEach((cleanupFn, index) => {
      try {
        cleanupFn();
      } catch (error) {
        console.error(`CleanupManager: Error in cleanup function ${index}:`, error);
        errors.push(error as Error);
      }
    });

    // Clear cleanup array
    this.cleanups = [];

    // Execute all grouped cleanups
    this.groups.forEach((cleanupFns, groupName) => {
      cleanupFns.forEach((cleanupFn, index) => {
        try {
          cleanupFn();
        } catch (error) {
          console.error(`CleanupManager: Error in group "${groupName}" cleanup ${index}:`, error);
          errors.push(error as Error);
        }
      });
    });

    // Clear all groups
    this.groups.clear();

    // If there were errors, log summary
    if (errors.length > 0) {
      console.warn(`CleanupManager: Completed cleanup with ${errors.length} error(s)`);
    }
  }

  /**
   * Execute cleanup functions for a specific group
   * @param group - Group name to cleanup
   */
  cleanupGroup(group: string): void {
    if (!this.groups.has(group)) {
      return;
    }

    const cleanupFns = this.groups.get(group)!;
    const errors: Error[] = [];

    cleanupFns.forEach((cleanupFn, index) => {
      try {
        cleanupFn();
      } catch (error) {
        console.error(`CleanupManager: Error in group "${group}" cleanup ${index}:`, error);
        errors.push(error as Error);
      }
    });

    // Remove the group
    this.groups.delete(group);

    if (errors.length > 0) {
      console.warn(`CleanupManager: Completed group "${group}" cleanup with ${errors.length} error(s)`);
    }
  }

  /**
   * Remove a specific cleanup function
   * @param cleanupFn - Function to remove
   * @returns True if found and removed
   */
  remove(cleanupFn: () => void): boolean {
    const index = this.cleanups.indexOf(cleanupFn);
    if (index > -1) {
      this.cleanups.splice(index, 1);
      return true;
    }

    // Check groups
    for (const [groupName, cleanupFns] of this.groups.entries()) {
      const groupIndex = cleanupFns.indexOf(cleanupFn);
      if (groupIndex > -1) {
        cleanupFns.splice(groupIndex, 1);
        if (cleanupFns.length === 0) {
          this.groups.delete(groupName);
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Clear all cleanup functions without executing them
   * Use with caution - can cause memory leaks if cleanups manage resources
   */
  clear(): void {
    this.cleanups = [];
    this.groups.clear();
  }

  /**
   * Get count of registered cleanup functions
   * @returns Total count including all groups
   */
  count(): number {
    let total = this.cleanups.length;
    this.groups.forEach(group => {
      total += group.length;
    });
    return total;
  }

  /**
   * Get count of cleanup functions in a specific group
   * @param group - Group name
   * @returns Count of functions in group
   */
  countGroup(group: string): number {
    return this.groups.get(group)?.length || 0;
  }

  /**
   * Check if there are any cleanup functions registered
   * @returns True if any cleanup functions exist
   */
  hasCleanups(): boolean {
    return this.cleanups.length > 0 || this.groups.size > 0;
  }

  /**
   * Check if a specific group exists
   * @param group - Group name
   * @returns True if group exists
   */
  hasGroup(group: string): boolean {
    return this.groups.has(group);
  }
}

/**
 * Create a new CleanupManager instance
 * Convenience function for quick instantiation
 */
export function createCleanupManager(): CleanupManager {
  return new CleanupManager();
}
