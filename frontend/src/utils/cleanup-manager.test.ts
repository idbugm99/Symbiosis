/**
 * CleanupManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CleanupManager, createCleanupManager } from './cleanup-manager.js';

describe('CleanupManager', () => {
  let manager: CleanupManager;

  beforeEach(() => {
    manager = new CleanupManager();
  });

  describe('constructor', () => {
    it('should initialize with empty cleanup array', () => {
      expect(manager.cleanups).toEqual([]);
    });

    it('should initialize with empty groups map', () => {
      expect(manager.groups.size).toBe(0);
    });
  });

  describe('add', () => {
    it('should add cleanup function', () => {
      const cleanupFn = vi.fn();
      manager.add(cleanupFn);

      expect(manager.cleanups).toContain(cleanupFn);
      expect(manager.count()).toBe(1);
    });

    it('should return the cleanup function', () => {
      const cleanupFn = vi.fn();
      const returned = manager.add(cleanupFn);

      expect(returned).toBe(cleanupFn);
    });

    it('should add multiple cleanup functions', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      manager.add(fn1);
      manager.add(fn2);
      manager.add(fn3);

      expect(manager.count()).toBe(3);
    });

    it('should warn when adding non-function', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      manager.add(null as any);
      manager.add(undefined as any);
      manager.add('string' as any);

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });
  });

  describe('addMultiple', () => {
    it('should add multiple functions at once', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      manager.addMultiple(fn1, fn2, fn3);

      expect(manager.count()).toBe(3);
      expect(manager.cleanups).toContain(fn1);
      expect(manager.cleanups).toContain(fn2);
      expect(manager.cleanups).toContain(fn3);
    });

    it('should handle empty call', () => {
      manager.addMultiple();
      expect(manager.count()).toBe(0);
    });
  });

  describe('addToGroup', () => {
    it('should add cleanup function to named group', () => {
      const cleanupFn = vi.fn();
      manager.addToGroup('test-group', cleanupFn);

      expect(manager.hasGroup('test-group')).toBe(true);
      expect(manager.countGroup('test-group')).toBe(1);
    });

    it('should create group if it does not exist', () => {
      const cleanupFn = vi.fn();
      manager.addToGroup('new-group', cleanupFn);

      expect(manager.groups.has('new-group')).toBe(true);
    });

    it('should add multiple functions to same group', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      manager.addToGroup('test-group', fn1);
      manager.addToGroup('test-group', fn2);

      expect(manager.countGroup('test-group')).toBe(2);
    });

    it('should support multiple groups', () => {
      manager.addToGroup('group1', vi.fn());
      manager.addToGroup('group2', vi.fn());
      manager.addToGroup('group3', vi.fn());

      expect(manager.groups.size).toBe(3);
    });

    it('should return the cleanup function', () => {
      const cleanupFn = vi.fn();
      const returned = manager.addToGroup('test-group', cleanupFn);

      expect(returned).toBe(cleanupFn);
    });
  });

  describe('cleanup', () => {
    it('should execute all cleanup functions', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      manager.add(fn1);
      manager.add(fn2);
      manager.add(fn3);

      manager.cleanup();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).toHaveBeenCalledOnce();
    });

    it('should clear cleanup array after execution', () => {
      manager.add(vi.fn());
      manager.add(vi.fn());

      expect(manager.count()).toBe(2);

      manager.cleanup();

      expect(manager.count()).toBe(0);
      expect(manager.cleanups).toEqual([]);
    });

    it('should execute grouped cleanup functions', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      manager.addToGroup('group1', fn1);
      manager.addToGroup('group2', fn2);

      manager.cleanup();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
    });

    it('should clear all groups after execution', () => {
      manager.addToGroup('group1', vi.fn());
      manager.addToGroup('group2', vi.fn());

      expect(manager.groups.size).toBe(2);

      manager.cleanup();

      expect(manager.groups.size).toBe(0);
    });

    it('should catch and log errors without stopping', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const fn1 = vi.fn(() => { throw new Error('Error 1'); });
      const fn2 = vi.fn();
      const fn3 = vi.fn(() => { throw new Error('Error 3'); });

      manager.add(fn1);
      manager.add(fn2);
      manager.add(fn3);

      expect(() => manager.cleanup()).not.toThrow();

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).toHaveBeenCalledOnce();
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it('should log warning summary when errors occur', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.add(() => { throw new Error('Error'); });
      manager.cleanup();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed cleanup with 1 error(s)')
      );

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanupGroup', () => {
    it('should execute cleanup functions for specific group', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      manager.addToGroup('group1', fn1);
      manager.addToGroup('group2', fn2);

      manager.cleanupGroup('group1');

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).not.toHaveBeenCalled();
    });

    it('should remove group after cleanup', () => {
      manager.addToGroup('test-group', vi.fn());

      expect(manager.hasGroup('test-group')).toBe(true);

      manager.cleanupGroup('test-group');

      expect(manager.hasGroup('test-group')).toBe(false);
    });

    it('should not affect other groups', () => {
      manager.addToGroup('group1', vi.fn());
      manager.addToGroup('group2', vi.fn());
      manager.addToGroup('group3', vi.fn());

      manager.cleanupGroup('group2');

      expect(manager.hasGroup('group1')).toBe(true);
      expect(manager.hasGroup('group2')).toBe(false);
      expect(manager.hasGroup('group3')).toBe(true);
    });

    it('should handle non-existent group gracefully', () => {
      expect(() => manager.cleanupGroup('nonexistent')).not.toThrow();
    });

    it('should catch and log errors in group cleanup', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.addToGroup('test-group', () => { throw new Error('Error'); });

      expect(() => manager.cleanupGroup('test-group')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('should remove specific cleanup function', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      manager.add(fn1);
      manager.add(fn2);

      const removed = manager.remove(fn1);

      expect(removed).toBe(true);
      expect(manager.count()).toBe(1);
      expect(manager.cleanups).not.toContain(fn1);
      expect(manager.cleanups).toContain(fn2);
    });

    it('should remove function from group', () => {
      const fn = vi.fn();

      manager.addToGroup('test-group', fn);
      const removed = manager.remove(fn);

      expect(removed).toBe(true);
      expect(manager.countGroup('test-group')).toBe(0);
    });

    it('should delete empty groups after removal', () => {
      const fn = vi.fn();

      manager.addToGroup('test-group', fn);
      manager.remove(fn);

      expect(manager.hasGroup('test-group')).toBe(false);
    });

    it('should return false when function not found', () => {
      const fn = vi.fn();
      const removed = manager.remove(fn);

      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all cleanups without executing', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      manager.add(fn1);
      manager.add(fn2);

      manager.clear();

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
      expect(manager.count()).toBe(0);
    });

    it('should clear all groups without executing', () => {
      const fn = vi.fn();

      manager.addToGroup('group1', fn);
      manager.addToGroup('group2', fn);

      manager.clear();

      expect(fn).not.toHaveBeenCalled();
      expect(manager.groups.size).toBe(0);
    });
  });

  describe('count', () => {
    it('should return total count of cleanup functions', () => {
      manager.add(vi.fn());
      manager.add(vi.fn());
      manager.addToGroup('group1', vi.fn());

      expect(manager.count()).toBe(3);
    });

    it('should return 0 when no cleanups', () => {
      expect(manager.count()).toBe(0);
    });
  });

  describe('countGroup', () => {
    it('should return count for specific group', () => {
      manager.addToGroup('test-group', vi.fn());
      manager.addToGroup('test-group', vi.fn());

      expect(manager.countGroup('test-group')).toBe(2);
    });

    it('should return 0 for non-existent group', () => {
      expect(manager.countGroup('nonexistent')).toBe(0);
    });
  });

  describe('hasCleanups', () => {
    it('should return true when cleanups exist', () => {
      manager.add(vi.fn());
      expect(manager.hasCleanups()).toBe(true);
    });

    it('should return true when groups exist', () => {
      manager.addToGroup('test-group', vi.fn());
      expect(manager.hasCleanups()).toBe(true);
    });

    it('should return false when no cleanups', () => {
      expect(manager.hasCleanups()).toBe(false);
    });
  });

  describe('hasGroup', () => {
    it('should return true when group exists', () => {
      manager.addToGroup('test-group', vi.fn());
      expect(manager.hasGroup('test-group')).toBe(true);
    });

    it('should return false when group does not exist', () => {
      expect(manager.hasGroup('nonexistent')).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex cleanup workflow', () => {
      const results: string[] = [];

      // Setup various cleanups
      manager.add(() => results.push('cleanup-1'));
      manager.add(() => results.push('cleanup-2'));
      manager.addToGroup('feature-a', () => results.push('feature-a-1'));
      manager.addToGroup('feature-a', () => results.push('feature-a-2'));
      manager.addToGroup('feature-b', () => results.push('feature-b-1'));

      // Cleanup specific feature
      manager.cleanupGroup('feature-a');

      expect(results).toEqual(['feature-a-1', 'feature-a-2']);
      expect(manager.hasGroup('feature-a')).toBe(false);
      expect(manager.hasGroup('feature-b')).toBe(true);

      // Cleanup everything else
      results.length = 0;
      manager.cleanup();

      expect(results).toEqual(['cleanup-1', 'cleanup-2', 'feature-b-1']);
      expect(manager.count()).toBe(0);
    });

    it('should handle event listener cleanup pattern', () => {
      const element = { removeEventListener: vi.fn() };
      const handler = vi.fn();

      // Simulate adding event listener and tracking cleanup
      const cleanup = () => element.removeEventListener('click', handler);
      manager.add(cleanup);

      // Cleanup
      manager.cleanup();

      expect(element.removeEventListener).toHaveBeenCalledWith('click', handler);
    });

    it('should handle timer cleanup pattern', () => {
      const timerId = 123;
      vi.spyOn(global, 'clearTimeout');

      manager.add(() => clearTimeout(timerId));
      manager.cleanup();

      expect(clearTimeout).toHaveBeenCalledWith(timerId);
    });
  });
});

describe('createCleanupManager', () => {
  it('should create new CleanupManager instance', () => {
    const manager = createCleanupManager();

    expect(manager).toBeInstanceOf(CleanupManager);
    expect(manager.count()).toBe(0);
  });

  it('should create independent instances', () => {
    const manager1 = createCleanupManager();
    const manager2 = createCleanupManager();

    manager1.add(vi.fn());

    expect(manager1.count()).toBe(1);
    expect(manager2.count()).toBe(0);
  });
});
