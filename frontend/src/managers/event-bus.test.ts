/**
 * EventBus Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from './event-bus.js';

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on', () => {
    it('should register event handler', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);

      expect(eventBus.listeners.has('test-event')).toBe(true);
      expect(eventBus.listeners.get('test-event').length).toBe(1);
    });

    it('should register multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      expect(eventBus.listeners.get('test-event').length).toBe(2);
    });
  });

  describe('off', () => {
    it('should remove event handler', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      eventBus.off('test-event', handler);

      expect(eventBus.listeners.has('test-event')).toBe(false);
    });

    it('should remove specific handler without affecting others', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.off('test-event', handler1);

      expect(eventBus.listeners.get('test-event').length).toBe(1);
    });

    it('should do nothing when event does not exist', () => {
      const handler = vi.fn();
      expect(() => eventBus.off('nonexistent', handler)).not.toThrow();
    });

    it('should do nothing when handler not registered', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      expect(() => eventBus.off('test-event', handler2)).not.toThrow();
      expect(eventBus.listeners.get('test-event').length).toBe(1);
    });
  });

  describe('emit', () => {
    it('should call registered handler with data', () => {
      const handler = vi.fn();
      const data = { value: 42 };

      eventBus.on('test-event', handler);
      eventBus.emit('test-event', data);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should call multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const data = { value: 42 };

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.emit('test-event', data);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler1).toHaveBeenCalledWith(data);
      expect(handler2).toHaveBeenCalledWith(data);
    });

    it('should do nothing when event has no handlers', () => {
      expect(() => eventBus.emit('nonexistent', {})).not.toThrow();
    });

    it('should catch and log handler errors without stopping other handlers', () => {
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      expect(() => eventBus.emit('test-event', {})).not.toThrow();
      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('once', () => {
    it('should register handler that runs only once', () => {
      const handler = vi.fn();

      eventBus.once('test-event', handler);
      eventBus.emit('test-event', { value: 1 });
      eventBus.emit('test-event', { value: 2 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ value: 1 });
    });

    it('should auto-remove handler after first call', () => {
      const handler = vi.fn();

      eventBus.once('test-event', handler);
      eventBus.emit('test-event', {});

      expect(eventBus.listeners.has('test-event')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all handlers for specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.on('other-event', handler1);

      eventBus.clear('test-event');

      expect(eventBus.listeners.has('test-event')).toBe(false);
      expect(eventBus.listeners.has('other-event')).toBe(true);
    });

    it('should do nothing when event does not exist', () => {
      expect(() => eventBus.clear('nonexistent')).not.toThrow();
    });

    it('should remove all events when no event specified', () => {
      const handler = vi.fn();

      eventBus.on('event-1', handler);
      eventBus.on('event-2', handler);
      eventBus.on('event-3', handler);

      expect(eventBus.listeners.size).toBe(3);

      eventBus.clear();

      expect(eventBus.listeners.size).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex event flow', () => {
      const results = [];

      // Setup handlers
      eventBus.on('data:loaded', (data) => {
        results.push(`loaded: ${data.value}`);
        eventBus.emit('data:processed', { value: data.value * 2 });
      });

      eventBus.on('data:processed', (data) => {
        results.push(`processed: ${data.value}`);
        eventBus.emit('data:complete', { value: data.value + 10 });
      });

      eventBus.once('data:complete', (data) => {
        results.push(`complete: ${data.value}`);
      });

      // Trigger event chain
      eventBus.emit('data:loaded', { value: 5 });

      expect(results).toEqual([
        'loaded: 5',
        'processed: 10',
        'complete: 20'
      ]);

      // Verify once handler was removed
      eventBus.emit('data:complete', { value: 999 });
      expect(results).toHaveLength(3); // No new entries
    });
  });

  describe('Strict Mode', () => {
    let strictEventBus;

    beforeEach(() => {
      strictEventBus = new EventBus({ strictMode: true });
    });

    describe('Initialization', () => {
      it('should initialize with strict mode enabled', () => {
        expect(strictEventBus.strictMode).toBe(true);
      });

      it('should initialize with valid events from EventNames', () => {
        expect(strictEventBus.validEvents.size).toBeGreaterThan(0);
      });

      it('should initialize without strict mode by default', () => {
        const normalBus = new EventBus();
        expect(normalBus.strictMode).toBe(false);
      });

      it('should log initialization message in strict mode', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        new EventBus({ strictMode: true });
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('strict mode enabled')
        );
        consoleSpy.mockRestore();
      });
    });

    describe('Valid event names', () => {
      it('should allow valid event from EventNames', () => {
        const handler = vi.fn();
        expect(() => strictEventBus.on('widget:added', handler)).not.toThrow();
      });

      it('should allow all EventNames values', () => {
        const handler = vi.fn();
        const validEvents = [
          'widget:added',
          'widget:removed',
          'workspace:switched',
          'app:opened',
          'dock:app-clicked'
        ];

        validEvents.forEach(event => {
          expect(() => strictEventBus.on(event, handler)).not.toThrow();
        });
      });

      it('should emit valid events without errors', () => {
        expect(() => strictEventBus.emit('widget:added', {})).not.toThrow();
      });
    });

    describe('Invalid event names', () => {
      it('should throw error for invalid event name on on()', () => {
        const handler = vi.fn();
        expect(() => strictEventBus.on('invalid-event', handler))
          .toThrow(/Unknown event: "invalid-event"/);
      });

      it('should throw error for invalid event name on emit()', () => {
        expect(() => strictEventBus.emit('invalid-event', {}))
          .toThrow(/Unknown event: "invalid-event"/);
      });

      it('should throw error for invalid event name on off()', () => {
        const handler = vi.fn();
        expect(() => strictEventBus.off('invalid-event', handler))
          .toThrow(/Unknown event: "invalid-event"/);
      });

      it('should throw error for invalid event name on once()', () => {
        const handler = vi.fn();
        expect(() => strictEventBus.once('invalid-event', handler))
          .toThrow(/Unknown event: "invalid-event"/);
      });

      it('should throw error for invalid event name on clear()', () => {
        expect(() => strictEventBus.clear('invalid-event'))
          .toThrow(/Unknown event: "invalid-event"/);
      });

      it('should throw error for typo in event name', () => {
        const handler = vi.fn();
        expect(() => strictEventBus.on('widget:add', handler))
          .toThrow(/Unknown event: "widget:add"/);
      });
    });

    describe('Error messages and suggestions', () => {
      it('should suggest similar event name for typos', () => {
        const handler = vi.fn();
        try {
          strictEventBus.on('widget:add', handler);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Did you mean "widget:added"?');
        }
      });

      it('should suggest similar event for workspace typo', () => {
        const handler = vi.fn();
        try {
          strictEventBus.on('workspace:switch', handler);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Did you mean "workspace:switched"?');
        }
      });

      it('should list valid events in error message', () => {
        const handler = vi.fn();
        try {
          strictEventBus.on('completely-wrong', handler);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Valid events:');
          expect(error.message).toMatch(/widget:added|workspace:switched/);
        }
      });

      it('should not suggest when no similar event found', () => {
        const handler = vi.fn();
        try {
          strictEventBus.on('xyz123', handler);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).not.toContain('Did you mean');
        }
      });

      it('should include event name in error message', () => {
        const handler = vi.fn();
        try {
          strictEventBus.on('bad-event-name', handler);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('bad-event-name');
        }
      });
    });

    describe('Levenshtein distance suggestions', () => {
      it('should suggest event with 1 character difference', () => {
        const handler = vi.fn();
        try {
          strictEventBus.on('widget:adde', handler);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('widget:added');
        }
      });

      it('should suggest event with transposed characters', () => {
        const handler = vi.fn();
        try {
          strictEventBus.on('wiget:added', handler);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('widget:added');
        }
      });

      it('should not suggest event with more than 3 character difference', () => {
        const handler = vi.fn();
        try {
          strictEventBus.on('completely-different', handler);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).not.toContain('Did you mean');
        }
      });
    });

    describe('Non-strict mode behavior', () => {
      let normalBus;

      beforeEach(() => {
        normalBus = new EventBus({ strictMode: false });
      });

      it('should allow any event name in non-strict mode', () => {
        const handler = vi.fn();
        expect(() => normalBus.on('any-random-event', handler)).not.toThrow();
        expect(() => normalBus.emit('any-random-event', {})).not.toThrow();
      });

      it('should not validate event names in non-strict mode', () => {
        const handler = vi.fn();
        expect(() => normalBus.on('totally-invalid', handler)).not.toThrow();
        expect(() => normalBus.emit('totally-invalid', {})).not.toThrow();
      });

      it('should work with custom event names in non-strict mode', () => {
        const handler = vi.fn();
        normalBus.on('my:custom:event', handler);
        normalBus.emit('my:custom:event', { data: 'test' });
        expect(handler).toHaveBeenCalledWith({ data: 'test' });
      });
    });

    describe('Edge cases', () => {
      it('should handle empty validEvents set gracefully', () => {
        const emptyBus = new EventBus({ strictMode: true });
        emptyBus.validEvents.clear();

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const handler = vi.fn();

        expect(() => emptyBus.on('any-event', handler)).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('no valid events registered')
        );

        consoleSpy.mockRestore();
      });

      it('should handle case-sensitive event names', () => {
        const handler = vi.fn();
        strictEventBus.on('widget:added', handler);
        expect(() => strictEventBus.on('Widget:Added', handler))
          .toThrow(/Unknown event/);
      });

      it('should handle event names with special characters', () => {
        const handler = vi.fn();
        expect(() => strictEventBus.on('widget:added', handler)).not.toThrow();
      });
    });

    describe('Integration with existing functionality', () => {
      it('should still allow off() after on() in strict mode', () => {
        const handler = vi.fn();
        strictEventBus.on('widget:added', handler);
        expect(() => strictEventBus.off('widget:added', handler)).not.toThrow();
      });

      it('should still allow once() in strict mode', () => {
        const handler = vi.fn();
        strictEventBus.once('widget:added', handler);
        strictEventBus.emit('widget:added', {});
        expect(handler).toHaveBeenCalledOnce();
      });

      it('should still allow clear() in strict mode', () => {
        const handler = vi.fn();
        strictEventBus.on('widget:added', handler);
        expect(() => strictEventBus.clear('widget:added')).not.toThrow();
      });

      it('should not validate when clearing all events', () => {
        const handler = vi.fn();
        strictEventBus.on('widget:added', handler);
        expect(() => strictEventBus.clear()).not.toThrow();
      });
    });
  });
});
