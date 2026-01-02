/**
 * WidgetWiggleMode
 * Handles iOS-style wiggle mode for widget deletion and rearrangement
 *
 * Responsibilities:
 * - Enter/exit wiggle mode
 * - Apply wiggle animation to widgets
 * - Create and manage delete buttons
 * - Handle widget deletion with confirmation
 * - Manage exit handlers (ESC key, click outside)
 *
 * Does NOT handle:
 * - Widget dragging (WidgetInteractions)
 * - Widget data/CRUD (WidgetManager)
 * - Long-press detection (WidgetInteractions)
 */

import { domHelper } from '../utils/dom-helpers.js';
import { createLogger } from '../utils/logger.js';
import type {
  WidgetWiggleModeOptions,
  EventBus,
  DOMHelper
} from '../types/index.js';
import { WidgetType } from '../types/index.js';

const logger = createLogger('WidgetWiggleMode');

export class WidgetWiggleMode {
  // Properties
  private widgetManager: any; // WidgetManager (avoiding circular dependency)
  private eventBus: EventBus | null;
  private dom: DOMHelper;
  private gridContainer: HTMLElement | null;
  private wiggleMode: boolean;
  private wiggleWidgets: Set<string>;
  private wiggleModeClickCleanup: (() => void) | null;
  private wiggleModeKeyCleanup: (() => void) | null;

  constructor(options: WidgetWiggleModeOptions = {}) {
    this.widgetManager = options.widgetManager;
    this.eventBus = options.eventBus;
    this.dom = options.domHelper || domHelper;
    this.gridContainer = options.gridContainer || this.dom.getElementById('widget-grid');

    // State tracking
    this.wiggleMode = false; // Global wiggle mode state
    this.wiggleWidgets = new Set(); // Widgets currently in wiggle mode

    // Exit handlers cleanup functions
    this.wiggleModeClickCleanup = null;
    this.wiggleModeKeyCleanup = null;

    logger.info('Initialized');
  }

  /**
   * Enter wiggle mode for widgets
   * @param {boolean} allWidgets - Apply to all widgets (default: true)
   */
  enterWiggleMode(allWidgets: boolean = true): void {
    logger.info('Entering wiggle mode');
    this.wiggleMode = true;

    if (allWidgets) {
      // Apply wiggle mode to all widgets in the grid
      const allWidgetElements = this.dom.querySelectorAll('.widget');
      allWidgetElements.forEach(widgetElement => {
        // Get widget ID from data attribute
        const widgetId = widgetElement.dataset.widgetId || widgetElement.getAttribute('data-widget-id');
        if (widgetId) {
          this.wiggleWidgets.add(widgetId);
          this.applyWiggleState(widgetElement, true);
        }
      });
    }

    // Reset cursor to default (remove grab cursor)
    const body = this.dom.querySelector('body');
    if (body) {
      body.style.cursor = 'default';
    }

    // Add global click handler to exit wiggle mode
    this.setupWiggleModeExitHandlers();

    // Emit event instead of calling callback
    if (this.eventBus) {
      this.eventBus.emit('widgets:wiggle-mode-entered');
    }
  }

  /**
   * Exit wiggle mode for all widgets
   */
  exitWiggleMode(): void {
    logger.info('Exiting wiggle mode');

    this.wiggleMode = false;

    // Remove wiggle state from all widgets
    this.wiggleWidgets.forEach(widgetId => {
      const widgetElement = this.dom.querySelector(`[data-widget-id="${widgetId}"]`);
      if (widgetElement) {
        this.applyWiggleState(widgetElement, false);
      }
    });

    this.wiggleWidgets.clear();

    // Restore cursor
    const body = this.dom.querySelector('body');
    if (body) {
      body.style.cursor = '';
    }

    // Remove global exit handlers
    this.removeWiggleModeExitHandlers();

    // Emit event instead of calling callback
    if (this.eventBus) {
      this.eventBus.emit('widgets:wiggle-mode-exited');
    }
  }

  /**
   * Apply or remove wiggle state to a widget
   * @param {HTMLElement} widgetElement - Widget DOM element
   * @param {boolean} wiggle - True to wiggle, false to stop
   */
  applyWiggleState(widgetElement: Element, wiggle: boolean): void {
    if (wiggle) {
      this.dom.toggleClass(widgetElement, 'wiggling', true);

      // Reset cursor to default (remove grab cursor)
      widgetElement.style.cursor = 'default';

      // Add delete button if not already present
      if (!widgetElement.querySelector('.widget-delete-btn')) {
        const widgetId = widgetElement.dataset.widgetId || widgetElement.getAttribute('data-widget-id');
        const deleteBtn = this.createDeleteButton(widgetId);
        widgetElement.appendChild(deleteBtn);
      }

      // Add "add to dock" button ONLY for 1×1 app icon launchers (not functional widgets)
      const isAppLauncher = (widgetElement.dataset.type === WidgetType.APP ||
                            widgetElement.classList.contains('widget-launcher')) &&
                           !widgetElement.querySelector('.widget-header'); // No header = app launcher

      if (isAppLauncher && !widgetElement.querySelector('.widget-dock-btn')) {
        const widgetId = widgetElement.dataset.widgetId || widgetElement.getAttribute('data-widget-id');
        const dockBtn = this.createAddToDockButton(widgetId);
        widgetElement.appendChild(dockBtn);
      }
    } else {
      this.dom.toggleClass(widgetElement, 'wiggling', false);

      // Restore cursor to grab
      widgetElement.style.cursor = 'grab';

      // Remove delete button
      const deleteBtn = widgetElement.querySelector('.widget-delete-btn');
      if (deleteBtn) {
        this.dom.removeElement(deleteBtn);
      }

      // Remove dock button
      const dockBtn = widgetElement.querySelector('.widget-dock-btn');
      if (dockBtn) {
        this.dom.removeElement(dockBtn);
      }
    }
  }

  /**
   * Create delete button for widget
   * @param {string} widgetId - Widget ID
   * @returns {HTMLElement} Delete button element
   */
  createDeleteButton(widgetId: string): HTMLElement {
    const deleteBtn = this.dom.createElement('button', 'widget-delete-btn', {
      title: 'Delete widget'
    });
    deleteBtn.innerHTML = '×';

    // Use capture phase to ensure this runs before other handlers
    deleteBtn.addEventListener('click', (e) => {
      logger.info('Delete button clicked for:', widgetId);
      e.stopPropagation();
      e.preventDefault();
      this.confirmDeleteWidget(widgetId);
    }, true); // Use capture phase

    return deleteBtn;
  }

  /**
   * Create add to dock button for widget
   * @param {string} widgetId - Widget ID
   * @returns {HTMLElement} Add to dock button element
   */
  createAddToDockButton(widgetId: string): HTMLElement {
    const dockBtn = this.dom.createElement('button', 'widget-dock-btn', {
      title: 'Add to dock',
      'data-tooltip': 'Add to dock'
    });
    dockBtn.innerHTML = '+';

    // Use capture phase to ensure this runs before other handlers
    dockBtn.addEventListener('click', (e) => {
      logger.info('Add to dock button clicked for:', widgetId);
      e.stopPropagation();
      e.preventDefault();
      this.addWidgetToDock(widgetId);
    }, true); // Use capture phase

    return dockBtn;
  }

  /**
   * Add widget to dock
   * @param {string} widgetId - Widget ID
   */
  addWidgetToDock(widgetId: string): void {
    logger.info('Adding widget to dock:', widgetId);

    // Find widget element
    const widgetElement = this.dom.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!widgetElement) {
      logger.warn('Widget element not found for ID:', widgetId);
      return;
    }

    // Get widget data from manager
    const widget = this.widgetManager.getWidgetById(widgetId);
    if (!widget) {
      logger.warn('Widget data not found for ID:', widgetId);
      return;
    }

    // Exit wiggle mode
    this.exitWiggleMode();

    // Emit event (DockManager will listen and handle the actual adding)
    if (this.eventBus) {
      this.eventBus.emit('dock:widget-added', widget);
    }

    logger.info('Widget added to dock:', widget.name);
  }

  /**
   * Confirm and delete widget
   * @param {string} widgetId - Widget ID
   */
  confirmDeleteWidget(widgetId: string): void {
    logger.info('confirmDeleteWidget called for:', widgetId);

    // Find widget by data-widget-id attribute
    const widgetElement = this.dom.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!widgetElement) {
      logger.warn('Widget element not found for ID:', widgetId);
      return;
    }

    const widgetName = widgetElement.querySelector('.widget-name')?.textContent ||
                       widgetElement.querySelector('h3')?.textContent ||
                       widgetElement.querySelector('.widget-title')?.textContent ||
                       'this widget';

    logger.info('Showing confirm dialog for:', widgetName);

    if (confirm(`Delete ${widgetName}?`)) {
      logger.info('User confirmed deletion, deleting widget:', widgetId);

      // Exit wiggle mode first
      this.exitWiggleMode();

      // Remove from wiggle tracking
      this.wiggleWidgets.delete(widgetId);

      // Remove from widget manager (handles data and UI cleanup)
      if (this.widgetManager && this.widgetManager.removeWidget) {
        this.widgetManager.removeWidget(widgetId);
      }

      // Emit event instead of callback
      if (this.eventBus) {
        this.eventBus.emit('widget:removed', widgetId);
      }
    } else {
      logger.info('User cancelled deletion');
    }
  }

  /**
   * Setup global handlers to exit wiggle mode
   */
  setupWiggleModeExitHandlers(): void {
    // Click outside widgets to exit
    const wiggleModeClickHandler = (e: MouseEvent): void => {
      logger.info('Click detected, target:', e.target.className);

      // Don't exit if clicking on delete button (let it handle deletion)
      if (e.target.closest('.widget-delete-btn')) {
        logger.info('Click on delete button - not exiting wiggle mode');
        return;
      }

      // Don't exit if clicking on dock button (let it handle adding to dock)
      if (e.target.closest('.widget-dock-btn')) {
        logger.info('Click on dock button - not exiting wiggle mode');
        return;
      }

      // Don't exit if clicking on a widget (allow dragging)
      if (e.target.closest('.widget')) {
        logger.info('Click on widget - not exiting wiggle mode');
        return;
      }

      // Click was outside all widgets - exit wiggle mode
      logger.info('Click outside widgets - exiting wiggle mode');
      this.exitWiggleMode();
    };

    // ESC key to exit
    const wiggleModeKeyHandler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        logger.info('ESC pressed - exiting wiggle mode');
        this.exitWiggleMode();
      }
    };

    // Add listeners with a small delay to avoid immediate triggering
    // Use capture phase for click to run before widget handlers
    setTimeout(() => {
      this.wiggleModeClickCleanup = this.dom.addEventListener(
        document,
        'click',
        wiggleModeClickHandler,
        true
      );
      this.wiggleModeKeyCleanup = this.dom.addEventListener(
        document,
        'keydown',
        wiggleModeKeyHandler
      );
      logger.info('Wiggle mode exit handlers installed');
    }, 200);
  }

  /**
   * Remove wiggle mode exit handlers
   */
  removeWiggleModeExitHandlers(): void {
    if (this.wiggleModeClickCleanup) {
      this.wiggleModeClickCleanup();
      this.wiggleModeClickCleanup = null;
    }

    if (this.wiggleModeKeyCleanup) {
      this.wiggleModeKeyCleanup();
      this.wiggleModeKeyCleanup = null;
    }

    logger.info('Wiggle mode exit handlers removed');
  }

  /**
   * Check if wiggle mode is active
   * @returns {boolean} True if in wiggle mode
   */
  isWiggleMode(): boolean {
    return this.wiggleMode;
  }

  /**
   * Check if a specific widget is wiggling
   * @param {string} widgetId - Widget ID
   * @returns {boolean} True if widget is wiggling
   */
  isWidgetWiggling(widgetId: string): boolean {
    return this.wiggleWidgets.has(widgetId);
  }
}

export default WidgetWiggleMode;
