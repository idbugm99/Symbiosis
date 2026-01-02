/**
 * HotkeyManager - Centralized keyboard shortcut management
 *
 * Handles focus-aware hotkey routing between workspace and apps.
 * Prevents conflicts by routing hotkeys based on active context.
 *
 * Priority order:
 * 1. Active app hotkeys (highest priority)
 * 2. Workspace hotkeys (only when no app active)
 * 3. Browser defaults (only if not registered)
 *
 * Usage:
 *   // Workspace hotkeys (desktop.js)
 *   hotkeyManager.registerWorkspaceHotkey('Ctrl+1', () => switchWorkspace(1), 'Switch to workspace 1');
 *
 *   // App hotkeys (in app code)
 *   hotkeyManager.registerAppHotkey(instanceId, 'Ctrl+S', () => saveDoc(), 'Save document');
 */

import { domHelper } from '../utils/dom-helpers.js';
import { CleanupManager } from '../utils/cleanup-manager.js';
import { createLogger } from '../utils/logger.js';
import type { DOMHelper } from '../types/index.js';

const logger = createLogger('HotkeyManager');

interface HotkeyRegistration {
  handler: () => void;
  description: string;
}

interface FocusProvider {
  activeAppInstanceId: string | null;
}

export class HotkeyManager {
  // Properties
  private dom: DOMHelper;
  private workspaceHotkeys: Map<string, HotkeyRegistration>;
  private appHotkeys: Map<string, Map<string, HotkeyRegistration>>;
  private focusProvider: FocusProvider | null;
  private cleanup: CleanupManager;

  constructor(options: { domHelper?: DOMHelper } = {}) {
    this.dom = options.domHelper || domHelper;

    // Storage for registered hotkeys
    this.workspaceHotkeys = new Map();  // Map<combo, {handler, description}>
    this.appHotkeys = new Map();        // Map<appInstanceId, Map<combo, {handler, description}>>

    // Focus provider (AppUIController) to check active app
    this.focusProvider = null;

    // Cleanup functions
    this.cleanup = new CleanupManager();

    // Global listener setup
    this.setupGlobalListener();

    logger.info('Initialized');
  }

  /**
   * Set the focus provider (AppUIController)
   * This allows HotkeyManager to check which app has focus
   */
  setFocusProvider(focusProvider: FocusProvider): void {
    this.focusProvider = focusProvider;
    logger.info('Focus provider registered');
  }

  /**
   * Register a workspace-level hotkey
   * Active only when no app has focus
   */
  registerWorkspaceHotkey(combo: string, handler: () => void, description: string = ''): void {
    const normalizedCombo = this.normalizeCombo(combo);

    if (this.workspaceHotkeys.has(normalizedCombo)) {
      logger.warn(`Workspace hotkey "${normalizedCombo}" already registered - overwriting`);
    }

    this.workspaceHotkeys.set(normalizedCombo, { handler, description });
    logger.info(`Registered workspace hotkey "${normalizedCombo}"${description ? ` - ${description}` : ''}`);
  }

  /**
   * Unregister a workspace hotkey
   */
  unregisterWorkspaceHotkey(combo: string): void {
    const normalizedCombo = this.normalizeCombo(combo);
    const removed = this.workspaceHotkeys.delete(normalizedCombo);

    if (removed) {
      logger.info(`Unregistered workspace hotkey "${normalizedCombo}"`);
    }

    return removed;
  }

  /**
   * Register an app-specific hotkey
   * Active only when this app instance has focus
   */
  registerAppHotkey(appInstanceId, combo, handler, description = '') {
    const normalizedCombo = this.normalizeCombo(combo);

    // Create app hotkey map if doesn't exist
    if (!this.appHotkeys.has(appInstanceId)) {
      this.appHotkeys.set(appInstanceId, new Map());
    }

    const appHotkeyMap = this.appHotkeys.get(appInstanceId);

    if (appHotkeyMap.has(normalizedCombo)) {
      logger.warn(`App hotkey "${normalizedCombo}" already registered for ${appInstanceId} - overwriting`);
    }

    appHotkeyMap.set(normalizedCombo, { handler, description });
    logger.info(`Registered app hotkey "${normalizedCombo}" for ${appInstanceId}${description ? ` - ${description}` : ''}`);
  }

  /**
   * Unregister all hotkeys for an app instance
   * Called automatically when app closes
   */
  unregisterAppHotkeys(appInstanceId) {
    const removed = this.appHotkeys.delete(appInstanceId);

    if (removed) {
      logger.info(`Unregistered all hotkeys for ${appInstanceId}`);
    }

    return removed;
  }

  /**
   * Setup global keyboard listener
   * Routes events to appropriate handler based on focus
   */
  setupGlobalListener() {
    const keydownHandler = (e) => {
      // Get the key combination from event
      const combo = this.getComboFromEvent(e);

      if (!combo) return;  // Ignore if no valid combo

      // PRIORITY 1: Active app hotkeys (if app has focus)
      if (this.focusProvider && this.focusProvider.activeAppInstanceId) {
        const activeAppId = this.focusProvider.activeAppInstanceId;
        const appHotkeyMap = this.appHotkeys.get(activeAppId);

        if (appHotkeyMap && appHotkeyMap.has(combo)) {
          const { handler, description } = appHotkeyMap.get(combo);

          // Prevent default and stop propagation
          e.preventDefault();
          e.stopPropagation();

          logger.info(`Executing app hotkey "${combo}" for ${activeAppId}${description ? ` (${description})` : ''}`);

          // Execute handler
          try {
            handler(e);
          } catch (error) {
            logger.error(`Error executing app hotkey "${combo}":`, error);
          }

          return;  // Don't check workspace hotkeys
        }
      }

      // PRIORITY 2: Workspace hotkeys (only if no app active OR app didn't handle it)
      if (!this.focusProvider || !this.focusProvider.activeAppInstanceId) {
        if (this.workspaceHotkeys.has(combo)) {
          const { handler, description } = this.workspaceHotkeys.get(combo);

          // Prevent default
          e.preventDefault();

          logger.info(`Executing workspace hotkey "${combo}"${description ? ` (${description})` : ''}`);

          // Execute handler
          try {
            handler(e);
          } catch (error) {
            logger.error(`Error executing workspace hotkey "${combo}":`, error);
          }

          return;
        }
      }

      // PRIORITY 3: Browser defaults (no preventDefault, let it through)
      // This happens automatically if we don't handle the event above
    };

    this.cleanup.add(this.dom.addEventListener(document, 'keydown', keydownHandler));
  }

  /**
   * Get key combination string from keyboard event
   * Returns normalized combo like "Ctrl+Shift+S" or "Escape" or "F1"
   */
  getComboFromEvent(event) {
    const parts = [];

    // Modifiers (order matters for consistency)
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');  // Cmd on Mac

    // Main key
    let key = event.key;

    // Normalize key names
    if (key === ' ') key = 'Space';
    if (key === 'Escape') key = 'Escape';
    if (key === 'Enter') key = 'Enter';
    if (key === 'Tab') key = 'Tab';

    // Convert lowercase letters to uppercase for consistency
    if (key.length === 1) {
      key = key.toUpperCase();
    }

    // Don't register modifier-only presses
    if (!key || key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
      return null;
    }

    parts.push(key);

    return parts.join('+');
  }

  /**
   * Normalize combo string for consistent storage
   * Converts "ctrl+s" to "Ctrl+S", "escape" to "Escape", etc.
   */
  normalizeCombo(combo) {
    const parts = combo.split('+').map(part => part.trim());
    const normalized = [];

    // Normalize each part
    for (const part of parts) {
      const lower = part.toLowerCase();

      // Modifiers
      if (lower === 'ctrl' || lower === 'control') normalized.push('Ctrl');
      else if (lower === 'alt') normalized.push('Alt');
      else if (lower === 'shift') normalized.push('Shift');
      else if (lower === 'meta' || lower === 'cmd' || lower === 'command') normalized.push('Meta');
      // Special keys
      else if (lower === 'escape' || lower === 'esc') normalized.push('Escape');
      else if (lower === 'enter' || lower === 'return') normalized.push('Enter');
      else if (lower === 'space') normalized.push('Space');
      else if (lower === 'tab') normalized.push('Tab');
      else if (lower === 'backspace') normalized.push('Backspace');
      else if (lower === 'delete' || lower === 'del') normalized.push('Delete');
      // Function keys
      else if (lower.match(/^f\d+$/)) normalized.push(lower.toUpperCase());
      // Arrow keys
      else if (lower === 'arrowup' || lower === 'up') normalized.push('ArrowUp');
      else if (lower === 'arrowdown' || lower === 'down') normalized.push('ArrowDown');
      else if (lower === 'arrowleft' || lower === 'left') normalized.push('ArrowLeft');
      else if (lower === 'arrowright' || lower === 'right') normalized.push('ArrowRight');
      // Regular keys (letters, numbers, symbols)
      else normalized.push(part.toUpperCase());
    }

    // Return in standard order: Ctrl+Alt+Shift+Meta+Key
    const modifiers = [];
    const keys = [];

    for (const part of normalized) {
      if (['Ctrl', 'Alt', 'Shift', 'Meta'].includes(part)) {
        modifiers.push(part);
      } else {
        keys.push(part);
      }
    }

    // Sort modifiers in standard order
    const order = { 'Ctrl': 0, 'Alt': 1, 'Shift': 2, 'Meta': 3 };
    modifiers.sort((a, b) => order[a] - order[b]);

    return [...modifiers, ...keys].join('+');
  }

  /**
   * Get all registered hotkeys for debugging
   */
  getActiveHotkeys() {
    const result = {
      workspace: [],
      apps: {}
    };

    // Workspace hotkeys
    for (const [combo, { description }] of this.workspaceHotkeys.entries()) {
      result.workspace.push({ combo, description });
    }

    // App hotkeys
    for (const [appId, hotkeyMap] of this.appHotkeys.entries()) {
      result.apps[appId] = [];
      for (const [combo, { description }] of hotkeyMap.entries()) {
        result.apps[appId].push({ combo, description });
      }
    }

    return result;
  }

  /**
   * Check if a combo is already registered
   * Returns: { registered: boolean, context: 'workspace' | appInstanceId | null }
   */
  isComboRegistered(combo) {
    const normalizedCombo = this.normalizeCombo(combo);

    // Check workspace
    if (this.workspaceHotkeys.has(normalizedCombo)) {
      return { registered: true, context: 'workspace' };
    }

    // Check active app (if any)
    if (this.focusProvider && this.focusProvider.activeAppInstanceId) {
      const activeAppId = this.focusProvider.activeAppInstanceId;
      const appHotkeyMap = this.appHotkeys.get(activeAppId);

      if (appHotkeyMap && appHotkeyMap.has(normalizedCombo)) {
        return { registered: true, context: activeAppId };
      }
    }

    return { registered: false, context: null };
  }

  /**
   * Debug: Log all registered hotkeys
   */
  logAllHotkeys() {
    logger.info('=== HotkeyManager: All Registered Hotkeys ===');

    logger.info('\nWorkspace Hotkeys:');
    if (this.workspaceHotkeys.size === 0) {
      logger.info('  (none)');
    } else {
      for (const [combo, { description }] of this.workspaceHotkeys.entries()) {
        logger.info(`  ${combo}${description ? ` - ${description}` : ''}`);
      }
    }

    logger.info('\nApp Hotkeys:');
    if (this.appHotkeys.size === 0) {
      logger.info('  (none)');
    } else {
      for (const [appId, hotkeyMap] of this.appHotkeys.entries()) {
        logger.info(`  ${appId}:`);
        for (const [combo, { description }] of hotkeyMap.entries()) {
          logger.info(`    ${combo}${description ? ` - ${description}` : ''}`);
        }
      }
    }

    logger.info('\n===========================================');
  }

  /**
   * Cleanup all event listeners and resources
   * Called when HotkeyManager is being destroyed
   */
  destroy() {
    // Run all cleanup functions
    this.cleanup.cleanup();

    // Clear all hotkey maps
    this.workspaceHotkeys.clear();
    this.appHotkeys.clear();

    // Clear focus provider reference
    this.focusProvider = null;

    logger.info('Destroyed');
  }
}
