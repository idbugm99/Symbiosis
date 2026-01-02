/**
 * EventBus
 * Pub/sub pattern for decoupling manager-to-manager communication
 *
 * Benefits:
 * - Loose coupling: Managers don't need direct references to each other
 * - Easy testing: Can test managers in isolation
 * - Clear intent: Event names document what's happening
 * - Flexible: Easy to add new listeners without changing emitters
 *
 * Usage:
 * ```javascript
 * // Subscribe to events
 * eventBus.on('widget:added', (widget) => {
 *   console.log('Widget added:', widget);
 * });
 *
 * // Emit events
 * eventBus.emit('widget:added', widget);
 *
 * // Unsubscribe
 * eventBus.off('widget:added', handler);
 * ```
 */

import { createLogger } from '../utils/logger.js';
import type { EventCallback, EventLogEntry, EventBusOptions } from '../types/index.js';

const logger = createLogger('EventBus');

export class EventBus {
  // Properties
  private listeners: Map<string, EventCallback[]>;
  private eventLog: EventLogEntry[];
  private debug: boolean;
  private strictMode: boolean;
  private validEvents: Set<string>;

  constructor(options: EventBusOptions = {}) {
    this.listeners = new Map();
    this.eventLog = [];
    this.debug = false;

    // NEW: Strict mode for event name validation
    this.strictMode = options.strictMode !== undefined ? options.strictMode : false;

    // NEW: Build valid events set from EventNames
    this.validEvents = new Set();
    if (typeof EventNames !== 'undefined') {
      Object.values(EventNames).forEach(eventName => {
        this.validEvents.add(eventName);
      });
    }

    logger.info('Initialized' + (this.strictMode ? ' (strict mode enabled)' : ''));
  }

  /**
   * Validate event name in strict mode
   * @param {string} eventName - Event name to validate
   * @throws {Error} If strict mode enabled and event name invalid
   */
  validateEventName(eventName: string): void {
    if (!this.strictMode) {
      return;
    }

    if (this.validEvents.size === 0) {
      logger.warn('[EventBus] Strict mode enabled but no valid events registered. Import EventNames properly.');
      return;
    }

    if (!this.validEvents.has(eventName)) {
      const similar = this.findSimilarEventName(eventName);
      const suggestion = similar ? ` Did you mean "${similar}"?` : '';
      throw new Error(`[EventBus] Unknown event: "${eventName}".${suggestion} Valid events: ${Array.from(this.validEvents).slice(0, 5).join(', ')}...`);
    }
  }

  /**
   * Find similar event name for typo suggestions
   * @param {string} input - Input event name
   * @returns {string|null} Similar event name or null
   */
  findSimilarEventName(input: string): string | null {
    const validNames = Array.from(this.validEvents);

    // Simple similarity check based on edit distance
    let bestMatch = null;
    let bestScore = Infinity;

    for (const validName of validNames) {
      const distance = this.levenshteinDistance(input, validName);
      if (distance < bestScore && distance <= 3) {
        bestScore = distance;
        bestMatch = validName;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (e.g., 'widget:added')
   * @param {Function} handler - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event: string, handler: EventCallback): () => void {
    this.validateEventName(event);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)!.push(handler);

    if (this.debug) {
      logger.debug(`Subscribed to '${event}'`);
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Handler to remove
   */
  off(event: string, handler: EventCallback): void {
    this.validateEventName(event);

    if (!this.listeners.has(event)) {
      return;
    }

    const handlers = this.listeners.get(event);
    const index = handlers.indexOf(handler);

    if (index !== -1) {
      handlers.splice(index, 1);

      if (this.debug) {
        logger.debug(`Unsubscribed from '${event}'`);
      }
    }

    // Clean up empty listener arrays
    if (handlers.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event: string, data?: unknown): void {
    this.validateEventName(event);

    if (this.debug) {
      logger.debug(`Emitting '${event}'`, data);
      this.eventLog.push({ event, data, timestamp: new Date().toISOString() });
    }

    if (!this.listeners.has(event)) {
      return;
    }

    const handlers = this.listeners.get(event);

    // Call handlers in order, catch errors to prevent one handler from breaking others
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        logger.error(`Error in handler for '${event}':`, error);
      }
    });
  }

  /**
   * Subscribe to event once (auto-unsubscribe after first call)
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event: string, handler: EventCallback): () => void {
    this.validateEventName(event);

    const onceHandler: EventCallback = (data) => {
      handler(data);
      this.off(event, onceHandler);
    };

    return this.on(event, onceHandler);
  }

  /**
   * Clear all listeners for an event (or all events if no event specified)
   * @param {string} [event] - Event name (optional)
   */
  clear(event?: string): void {
    if (event) {
      this.validateEventName(event);
      this.listeners.delete(event);
      if (this.debug) {
        logger.debug(`Cleared all listeners for '${event}'`);
      }
    } else {
      this.listeners.clear();
      if (this.debug) {
        logger.debug('Cleared all listeners');
      }
    }
  }

  /**
   * Get list of active event listeners (for debugging)
   * @returns {Object} Map of event names to listener counts
   */
  getListeners(): Record<string, number> {
    const result: Record<string, number> = {};
    this.listeners.forEach((handlers, event) => {
      result[event] = handlers.length;
    });
    return result;
  }

  /**
   * Get event log (if debug mode enabled)
   * @returns {Array} Array of emitted events
   */
  getEventLog(): EventLogEntry[] {
    return this.eventLog;
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
    if (enabled) {
      logger.info('Debug mode enabled');
    }
  }
}
/**
 * Event Names (for reference and IDE autocomplete)
 *
 * Workspace Events:
 * - workspace:switched - Workspace changed
 * - workspace:created - New workspace created
 * - workspace:deleted - Workspace deleted
 * - workspace:renamed - Workspace renamed
 * - workspace:saved - Workspace saved to storage
 *
 * Widget Events:
 * - widget:added - Widget added to workspace
 * - widget:removed - Widget removed from workspace
 * - widget:moved - Widget position changed
 * - widget:updated - Widget config/data updated
 * - widget:clicked - Widget single-clicked
 * - widget:double-clicked - Widget double-clicked
 * - widget:long-pressed - Widget long-pressed (wiggle mode trigger)
 * - widgets:changed - Any widget change (general event)
 * - widgets:wiggle-mode-entered - Entered wiggle mode for widgets
 * - widgets:wiggle-mode-exited - Exited wiggle mode for widgets
 *
 * Registry Events:
 * - registry:definition-registered - Widget definition registered in registry
 * - registry:component-registered - Widget component registered in registry
 * - registry:instance-removed - Widget instance removed from registry
 * - registry:definition-unregistered - Widget definition unregistered from registry
 *
 * Dock Events:
 * - dock:app-clicked - Dock app clicked (launch requested)
 * - dock:widget-added - Widget added to dock
 *
 * App Events:
 * - app:opened - App/widget opened in UI
 * - app:closed - App/widget closed in UI
 * - app:focused - App/widget focused/brought to front
 *
 * UI Events:
 * - welcome:show - Show welcome screen
 * - welcome:hide - Hide welcome screen
 * - grid:cleared - Grid cleared
 *
 * Storage Events:
 * - storage:saved - Data saved to storage
 * - storage:loaded - Data loaded from storage
 * - storage:error - Storage operation error
 *
 * Error Events:
 * - error:occurred - Error caught by error boundary
 */
export const EventNames = {
  // Workspace events
  WORKSPACE_SWITCHED: 'workspace:switched',
  WORKSPACE_CREATED: 'workspace:created',
  WORKSPACE_DELETED: 'workspace:deleted',
  WORKSPACE_RENAMED: 'workspace:renamed',
  WORKSPACE_SAVED: 'workspace:saved',
  WORKSPACE_SAVE_REQUESTED: 'workspace:save-requested',

  // Widget events
  WIDGET_ADDED: 'widget:added',
  WIDGET_REMOVED: 'widget:removed',
  WIDGET_MOVED: 'widget:moved',
  WIDGET_UPDATED: 'widget:updated',
  WIDGET_CLICKED: 'widget:clicked',
  WIDGET_DOUBLE_CLICKED: 'widget:double-clicked',
  WIDGET_LONG_PRESSED: 'widget:long-pressed',
  WIDGETS_CHANGED: 'widgets:changed',
  WIDGETS_WIGGLE_MODE_ENTERED: 'widgets:wiggle-mode-entered',
  WIDGETS_WIGGLE_MODE_EXITED: 'widgets:wiggle-mode-exited',

  // Registry events
  REGISTRY_DEFINITION_REGISTERED: 'registry:definition-registered',
  REGISTRY_COMPONENT_REGISTERED: 'registry:component-registered',
  REGISTRY_INSTANCE_REMOVED: 'registry:instance-removed',
  REGISTRY_DEFINITION_UNREGISTERED: 'registry:definition-unregistered',

  // Dock events
  DOCK_APP_CLICKED: 'dock:app-clicked',
  DOCK_WIDGET_ADDED: 'dock:widget-added',

  // App events
  APP_OPENED: 'app:opened',
  APP_CLOSED: 'app:closed',
  APP_FOCUSED: 'app:focused',

  // UI events
  WELCOME_SHOW: 'welcome:show',
  WELCOME_HIDE: 'welcome:hide',
  GRID_CLEARED: 'grid:cleared',
  DRAWER_OPENED: 'drawer:opened',
  DRAWER_CLOSED: 'drawer:closed',
  DRAWER_TAB_CHANGED: 'drawer:tab-changed',
  DRAWER_DRAG_START: 'drawer:drag-start',
  DRAWER_DRAG_END: 'drawer:drag-end',

  // Storage events
  STORAGE_SAVED: 'storage:saved',
  STORAGE_LOADED: 'storage:loaded',
  STORAGE_ERROR: 'storage:error',

  // Error events
  ERROR_OCCURRED: 'error:occurred'
};
