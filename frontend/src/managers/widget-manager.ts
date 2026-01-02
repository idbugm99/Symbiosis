/**
 * WidgetManager
 * Handles widget CRUD operations and grid management
 * Works with widget instances (database-ready structure)
 *
 * @class
 * @description Manages widget lifecycle: add, remove, move, position calculation.
 * Uses EventBus for decoupled communication. Stores enriched widgets in memory,
 * bare instances in storage.
 *
 * @example
 * const widgetManager = new WidgetManager({
 *   eventBus: myEventBus,
 *   storageManager: myStorageManager
 * });
 *
 * // Add widget
 * const widget = widgetManager.addWidget(widgetData, cellNumber);
 *
 * // Listen for events
 * eventBus.on('widget:added', (widget) => console.log('Added:', widget));
 *
 * Refactored to use centralized utilities for:
 * - DOM access (domHelper)
 * - Safe JSON parsing (validators)
 */

import {
  gridConfig,
  getCenterCells,
  calculateOccupiedCells,
  canWidgetFitAt
} from '../data/widgets-static.js';
import { domHelper } from '../utils/dom-helpers.js';
import { safeJSONParse } from '../utils/validators.js';
import { EventNames } from './event-bus.js';
import { createLogger } from '../utils/logger.js';
import type {
  WidgetInstance,
  WidgetDefinition,
  WidgetManagerOptions,
  StorageManager,
  EventBus,
  DOMHelper,
  WidgetRegistry
} from '../types/index.js';

const logger = createLogger('WidgetManager');

export class WidgetManager {
  // Properties
  private widgets: WidgetInstance[] = [];
  private currentWorkspaceId: string | null = null;
  private storageManager: StorageManager;
  private eventBus: EventBus | null;
  private dom: DOMHelper;
  private widgetRegistry: WidgetRegistry | null;

  /**
   * Create a WidgetManager instance
   * @constructor
   * @param options - Configuration options
   * @param options.eventBus - EventBus instance for event communication
   * @param options.storageManager - StorageManager instance for persistence
   * @param options.domHelper - DOMHelper instance for DOM operations
   * @param options.widgetRegistry - WidgetRegistry instance for widget management
   */
  constructor(options: WidgetManagerOptions) {
    this.storageManager = options.storageManager!;
    this.eventBus = options.eventBus || null;
    this.dom = options.domHelper || domHelper;
    this.widgetRegistry = options.widgetRegistry || null;

    // Setup event listeners
    if (this.eventBus) {
      this.setupEventListeners();
    }
  }

  /**
   * Setup event listeners for widget-related events
   */
  setupEventListeners() {
    // Listen for widgets:changed to auto-save workspace
    this.eventBus.on(EventNames.WIDGETS_CHANGED, () => {
      this.eventBus.emit(EventNames.WORKSPACE_SAVE_REQUESTED);
    });
  }

  /**
   * Set current workspace ID
   * @param workspaceId - Workspace ID
   * @description Sets the active workspace context for widget operations
   */
  setCurrentWorkspace(workspaceId: string): void {
    this.currentWorkspaceId = workspaceId;
  }

  /**
   * Get all widgets in current workspace
   * @returns Array of enriched widget objects
   * @description Returns in-memory widgets (enriched with definition data)
   */
  getWidgets(): WidgetInstance[] {
    return this.widgets;
  }

  /**
   * Set widgets (used when loading workspace)
   * @param widgets - Array of enriched widget objects
   * @description Replaces current widget set. Called when switching workspaces.
   */
  setWidgets(widgets: WidgetInstance[] | null): void {
    this.widgets = widgets || [];
  }

  /**
   * Find best available cell for widget
   * @param cols - Widget columns
   * @param rows - Widget rows
   * @returns Cell number (1-30) or null if no space
   * @description Smart placement algorithm: tries center cells first, then scans grid
   * @example
   * const cell = widgetManager.findAvailableCell(2, 1); // Find spot for 2×1 widget
   */
  findAvailableCell(cols: number, rows: number): number | null {
    // Get all currently occupied cells
    const occupiedCells = new Set();
    this.widgets.forEach(widget => {
      const cells = calculateOccupiedCells(widget.cell, widget.cols, widget.rows);
      cells.forEach(cell => occupiedCells.add(cell));
    });

    // Try center cells first
    const centerCells = getCenterCells();
    for (const cell of centerCells) {
      if (canWidgetFitAt(cell, cols, rows)) {
        const requiredCells = calculateOccupiedCells(cell, cols, rows);
        const isAvailable = requiredCells.every(c => !occupiedCells.has(c));
        if (isAvailable) {
          return cell;
        }
      }
    }

    // Fall back to any available cell
    for (let cell = 1; cell <= gridConfig.totalCells; cell++) {
      if (canWidgetFitAt(cell, cols, rows)) {
        const requiredCells = calculateOccupiedCells(cell, cols, rows);
        const isAvailable = requiredCells.every(c => !occupiedCells.has(c));
        if (isAvailable) {
          return cell;
        }
      }
    }

    return null;
  }

  /**
   * Add a new widget instance
   * @param {Object} widgetData - Widget definition from catalog
   * @param {number} cellNumber - Cell number to place widget (1-30)
   * @returns {Object|null} Created enriched widget instance or null if failed
   * @description Creates new widget instance, saves to storage, emits events.
   * Stores bare instance in storage, enriched instance in memory.
   * @fires widget:added
   * @fires widgets:changed
   * @example
   * const widgetDef = getWidgetById('favorites');
   * const widget = widgetManager.addWidget(widgetDef, 5);
   */
  addWidget(widgetData, cellNumber) {
    logger.info('Adding widget instance:', widgetData, 'to cell:', cellNumber);

    if (!this.currentWorkspaceId) {
      logger.error('Cannot add widget: no current workspace');
      return null;
    }

    if (!this.storageManager) {
      logger.error('Cannot add widget: no storage manager');
      return null;
    }

    const user = this.storageManager.getUser();

    // Create widget instance with only instance-specific data (database-ready)
    // Definition data (type, name, icon, size, cols, rows) comes from widgetDefinitions table
    const widgetInstance = {
      id: `instance-${Date.now()}`,
      userId: user.id,
      workspaceId: this.currentWorkspaceId,
      widgetDefId: widgetData.id,  // Foreign key to widgetDefinitions
      cell: cellNumber,
      occupiedCells: calculateOccupiedCells(cellNumber, widgetData.cols, widgetData.rows),
      config: {},  // Instance-specific config overrides
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Enrich instance with definition data for in-memory use
    const enrichedInstance = this.storageManager.enrichWidgetInstance(widgetInstance);
    this.widgets.push(enrichedInstance);

    // Save bare instance to storage (without definition data)
    const allInstances = this.storageManager.getWidgetInstances();
    allInstances.push(widgetInstance);
    this.storageManager.saveWidgetInstances(allInstances);

    // Emit events instead of callbacks
    if (this.eventBus) {
      this.eventBus.emit(EventNames.WIDGET_ADDED, enrichedInstance);
      this.eventBus.emit(EventNames.WIDGETS_CHANGED);
    }

    return enrichedInstance;
  }

  /**
   * Note: Widget rendering is handled by DesktopManager via callbacks
   * This keeps rendering logic centralized with drag-drop and UI concerns
   */

  /**
   * Update widget instance configuration
   * @param {string} widgetId - Widget instance ID
   * @param {Object} updates - Properties to update (e.g., { config: {...} })
   * @returns {Object|null} Updated widget instance
   * @description Updates widget properties and persists to storage
   * @fires widget:updated
   * @fires widgets:changed
   */
  updateWidget(widgetId, updates) {
    const widgetIndex = this.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) {
      logger.error('Widget not found:', widgetId);
      return null;
    }

    logger.info('Updating widget:', widgetId, updates);

    // Update in-memory widget
    const widget = this.widgets[widgetIndex];
    Object.assign(widget, updates);
    widget.updatedAt = new Date().toISOString();

    // Update in storage (bare instance only, no enriched data)
    const allInstances = this.storageManager.getWidgetInstances();
    const instanceIndex = allInstances.findIndex(w => w.id === widgetId);
    if (instanceIndex !== -1) {
      // Only update instance-specific properties (not enriched definition data)
      const bareUpdates = {
        ...updates,
        updatedAt: widget.updatedAt
      };
      // Remove any enriched properties that shouldn't be in storage
      delete bareUpdates.name;
      delete bareUpdates.icon;
      delete bareUpdates.type;
      delete bareUpdates.category;
      delete bareUpdates.size;
      delete bareUpdates.description;

      Object.assign(allInstances[instanceIndex], bareUpdates);
      this.storageManager.saveWidgetInstances(allInstances);
    }

    // Emit events
    if (this.eventBus) {
      this.eventBus.emit(EventNames.WIDGET_UPDATED, widget);
      this.eventBus.emit(EventNames.WIDGETS_CHANGED);
    }

    return widget;
  }

  /**
   * Remove a widget instance
   * @param {string} widgetId - Widget instance ID
   * @returns {void}
   * @description Removes widget from grid and storage, cleans up DOM, emits events
   * @fires widget:removed
   * @fires widgets:changed
   */
  removeWidget(widgetId) {
    const widget = this.widgets.find(w => w.id === widgetId);
    if (!widget) {
      logger.error('Widget not found:', widgetId);
      return;
    }

    logger.info('Removing widget:', widgetId);

    // Reset all occupied cells
    const occupiedCells = widget.occupiedCells || calculateOccupiedCells(widget.cell, widget.cols, widget.rows);
    occupiedCells.forEach(cellNum => {
      const cell = this.dom.querySelector(`[data-cell="${cellNum}"]`);
      if (cell) {
        this.dom.toggleClass(cell, 'empty', true);
        this.dom.toggleClass(cell, 'occupied-span', false);
        this.dom.clearChildren(cell);
      }
    });

    // Remove from widgets array
    this.widgets = this.widgets.filter(w => w.id !== widgetId);

    // Save to storage manager
    const allInstances = this.storageManager.getWidgetInstances();
    const updatedInstances = allInstances.filter(w => w.id !== widgetId);
    this.storageManager.saveWidgetInstances(updatedInstances);

    // Emit events instead of callbacks
    if (this.eventBus) {
      this.eventBus.emit(EventNames.WIDGET_REMOVED, widgetId);
      this.eventBus.emit(EventNames.WIDGETS_CHANGED);
    }
  }

  /**
   * Clear all widgets from grid
   */
  clearGrid() {
    this.widgets.forEach(widget => {
      const occupiedCells = widget.occupiedCells || calculateOccupiedCells(widget.cell, widget.cols, widget.rows);
      occupiedCells.forEach(cellNum => {
        const cell = this.dom.querySelector(`[data-cell="${cellNum}"]`);
        if (cell) {
          this.dom.toggleClass(cell, 'empty', true);
          this.dom.toggleClass(cell, 'occupied-span', false);
          this.dom.clearChildren(cell);
        }
      });
    });

    this.widgets = [];
  }

  /**
   * Update widget position
   * @param {Object} widget - Widget object
   * @param {number} newCell - New cell number
   */
  updateWidgetPosition(widget, newCell) {
    // For multi-cell widgets, snap to the top-left corner
    const snappedCell = this.snapToTopLeftCorner(newCell, widget.cols, widget.rows);

    if (snappedCell === null) {
      logger.error('Cannot snap widget to valid position');
      throw new Error('Cannot snap widget to valid position');
    }

    // Check if new position is valid
    if (!canWidgetFitAt(snappedCell, widget.cols, widget.rows)) {
      logger.error('Widget does not fit at new position');
      throw new Error('Widget does not fit at new position');
    }

    // STEP 1: Clear the dragged widget's old position FIRST
    const oldOccupiedCells = widget.occupiedCells || calculateOccupiedCells(widget.cell, widget.cols, widget.rows);
    oldOccupiedCells.forEach(cellNum => {
      const cell = this.dom.querySelector(`[data-cell="${cellNum}"]`);
      if (cell) {
        this.dom.toggleClass(cell, 'empty', true);
        this.dom.toggleClass(cell, 'occupied-span', false);
        this.dom.clearChildren(cell);
      }
    });

    // STEP 2: Check for collisions with other widgets
    const occupiedCells = new Set();
    this.widgets.forEach(w => {
      if (w.id !== widget.id) {
        const cells = calculateOccupiedCells(w.cell, w.cols, w.rows);
        cells.forEach(cell => occupiedCells.add(cell));
      }
    });

    const requiredCells = calculateOccupiedCells(snappedCell, widget.cols, widget.rows);
    const isAvailable = requiredCells.every(c => !occupiedCells.has(c));

    // STEP 3: Handle conflicts if cells are occupied
    if (!isAvailable) {
      logger.info('Cells occupied by other widgets - pushing them aside');

      // Find which widgets are in the way
      const conflictingWidgets = [];
      this.widgets.forEach(w => {
        if (w.id !== widget.id) {
          const wCells = calculateOccupiedCells(w.cell, w.cols, w.rows);
          const hasConflict = requiredCells.some(c => wCells.includes(c));
          if (hasConflict) {
            conflictingWidgets.push(w);
          }
        }
      });

      logger.info('Conflicting widgets:', conflictingWidgets.map(w => w.name));

      // Try to find new positions for conflicting widgets
      const widgetMoves = [];

      // Reserve the target position for the dragged widget
      const draggedWidgetTargetMove = {
        widget: widget,
        newCell: snappedCell
      };

      for (const conflictWidget of conflictingWidgets) {
        const newPosition = this.findNearestAvailableSpace(
          conflictWidget,
          widget.id,
          [draggedWidgetTargetMove, ...widgetMoves]
        );

        if (newPosition === null) {
          // Can't find space - restore dragged widget and abort
          logger.error(`No space found for ${conflictWidget.name}, aborting move`);

          // Restore dragged widget to original position
          widget.occupiedCells = oldOccupiedCells;
          // Re-emit widget:added to trigger re-render
          if (this.eventBus) {
            this.eventBus.emit(EventNames.WIDGET_ADDED, widget);
          }

          const errorMsg = `Cannot move ${widget.name} here - no space available to relocate ${conflictWidget.name}`;
          alert(errorMsg);
          throw new Error(errorMsg);
        }

        widgetMoves.push({
          widget: conflictWidget,
          newCell: newPosition
        });
      }

      // STEP 4: Execute all moves for conflicting widgets
      logger.info('Executing widget relocations:', widgetMoves);
      widgetMoves.forEach(move => {
        // Clear the widget's old position
        const oldCells = move.widget.occupiedCells || calculateOccupiedCells(move.widget.cell, move.widget.cols, move.widget.rows);
        oldCells.forEach(cellNum => {
          const cell = this.dom.querySelector(`[data-cell="${cellNum}"]`);
          if (cell) {
            this.dom.toggleClass(cell, 'empty', true);
            this.dom.toggleClass(cell, 'occupied-span', false);
            this.dom.clearChildren(cell);
          }
        });

        // Update widget data
        move.widget.cell = move.newCell;
        move.widget.occupiedCells = calculateOccupiedCells(move.newCell, move.widget.cols, move.widget.rows);
        move.widget.updatedAt = new Date().toISOString();

        // Update in storage (strip definition data before saving)
        const allInstances = this.storageManager.getWidgetInstances();
        const index = allInstances.findIndex(w => w.id === move.widget.id);
        if (index !== -1) {
          allInstances[index] = this.storageManager.stripDefinitionData(move.widget);
          this.storageManager.saveWidgetInstances(allInstances);
        }

        // Re-render the pushed widget via event
        if (this.eventBus) {
          this.eventBus.emit(EventNames.WIDGET_ADDED, move.widget);
        }
      });
    }

    // STEP 5: Update and render the main widget at its new position
    widget.cell = snappedCell;
    widget.occupiedCells = requiredCells;
    widget.updatedAt = new Date().toISOString();

    // Save to storage manager (strip definition data before saving)
    const allInstances = this.storageManager.getWidgetInstances();
    const index = allInstances.findIndex(w => w.id === widget.id);
    if (index !== -1) {
      allInstances[index] = this.storageManager.stripDefinitionData(widget);
      this.storageManager.saveWidgetInstances(allInstances);
    }

    // Emit event instead of callback
    if (this.eventBus) {
      this.eventBus.emit(EventNames.WIDGET_MOVED, { widget, newCell: snappedCell });
      this.eventBus.emit(EventNames.WIDGETS_CHANGED);
    }

    logger.info('Widget moved to cell:', snappedCell);
  }

  /**
   * Get widget by ID
   * @param {string} widgetId - Widget ID
   * @returns {Object|null} Widget object or null
   */
  getWidgetById(widgetId) {
    return this.widgets.find(w => w.id === widgetId) || null;
  }

  /**
   * Snap cell number to top-left corner for multi-cell widgets
   * @param {number} cellNumber - Target cell number
   * @param {number} cols - Widget columns
   * @param {number} rows - Widget rows
   * @returns {number|null} Snapped cell number or null
   */
  snapToTopLeftCorner(cellNumber, cols, rows) {
    // For 1×1 widgets, no snapping needed
    if (cols === 1 && rows === 1) {
      return cellNumber;
    }

    // Calculate the row and column of the target cell
    const targetRow = Math.floor((cellNumber - 1) / gridConfig.columns);
    const targetCol = (cellNumber - 1) % gridConfig.columns;

    // Ensure the widget fits within grid bounds
    let snappedCol = targetCol;
    let snappedRow = targetRow;

    // Adjust if widget would overflow right edge
    if (snappedCol + cols > gridConfig.columns) {
      snappedCol = gridConfig.columns - cols;
    }

    // Adjust if widget would overflow bottom edge
    if (snappedRow + rows > gridConfig.rows) {
      snappedRow = gridConfig.rows - rows;
    }

    // Prevent negative positions
    if (snappedCol < 0 || snappedRow < 0) {
      return null;
    }

    // Convert back to cell number
    return snappedRow * gridConfig.columns + snappedCol + 1;
  }

  /**
   * Find nearest available space for a widget
   * @param {Object} widget - Widget to find space for
   * @param {string} excludeWidgetId - Widget ID to exclude from collision check
   * @param {Array} pendingMoves - Array of pending moves to consider
   * @returns {number|null} Cell number or null
   */
  findNearestAvailableSpace(widget, excludeWidgetId, pendingMoves = []) {
    const currentCell = widget.cell;
    const currentRow = Math.floor((currentCell - 1) / gridConfig.columns);
    const currentCol = (currentCell - 1) % gridConfig.columns;

    // Build a set of all occupied cells (including pending moves)
    const occupiedCells = new Set();
    this.widgets.forEach(w => {
      if (w.id !== excludeWidgetId && w.id !== widget.id) {
        const cells = calculateOccupiedCells(w.cell, w.cols, w.rows);
        cells.forEach(c => occupiedCells.add(c));
      }
    });

    // Add pending move destinations to occupied set
    pendingMoves.forEach(move => {
      const cells = calculateOccupiedCells(move.newCell, move.widget.cols, move.widget.rows);
      cells.forEach(c => occupiedCells.add(c));
    });

    // Search in expanding circles from current position
    const candidates = [];
    for (let cell = 1; cell <= gridConfig.totalCells; cell++) {
      const row = Math.floor((cell - 1) / gridConfig.columns);
      const col = (cell - 1) % gridConfig.columns;

      // Calculate distance from original position
      const distance = Math.abs(row - currentRow) + Math.abs(col - currentCol);

      candidates.push({ cell, distance });
    }

    // Sort by distance (nearest first)
    candidates.sort((a, b) => a.distance - b.distance);

    // Try each candidate position
    for (const candidate of candidates) {
      const cell = candidate.cell;

      // Check if widget fits at this position
      if (!canWidgetFitAt(cell, widget.cols, widget.rows)) {
        continue;
      }

      // Check if all required cells are available
      const requiredCells = calculateOccupiedCells(cell, widget.cols, widget.rows);
      const isAvailable = requiredCells.every(c => !occupiedCells.has(c));

      if (isAvailable) {
        logger.info(`Found space for ${widget.name} at cell ${cell} (distance: ${candidate.distance})`);
        return cell;
      }
    }

    // No space found
    logger.info(`No available space found for ${widget.name}`);
    return null;
  }
}
