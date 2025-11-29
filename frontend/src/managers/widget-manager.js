/**
 * WidgetManager
 * Handles widget CRUD operations and grid management
 * Works with widget instances (database-ready structure)
 */

import {
  gridConfig,
  getCenterCells,
  calculateOccupiedCells,
  canWidgetFitAt
} from '../data/widgets-static.js';

export class WidgetManager {
  constructor(options = {}) {
    this.widgets = [];
    this.currentWorkspaceId = null;
    this.storageManager = options.storageManager;

    // Callbacks
    this.onWidgetAdded = options.onWidgetAdded || (() => {});
    this.onWidgetRemoved = options.onWidgetRemoved || (() => {});
    this.onWidgetsChanged = options.onWidgetsChanged || (() => {});
    this.setupLongPressDrag = options.setupLongPressDrag || (() => {});
  }

  /**
   * Set current workspace ID
   * @param {string} workspaceId - Workspace ID
   */
  setCurrentWorkspace(workspaceId) {
    this.currentWorkspaceId = workspaceId;
  }

  /**
   * Get all widgets
   * @returns {Array} Array of widget objects
   */
  getWidgets() {
    return this.widgets;
  }

  /**
   * Set widgets (used when loading workspace)
   * @param {Array} widgets - Array of widget objects
   */
  setWidgets(widgets) {
    this.widgets = widgets || [];
  }

  /**
   * Find best available cell for widget
   * @param {number} cols - Widget columns
   * @param {number} rows - Widget rows
   * @returns {number|null} Cell number or null if no space
   */
  findAvailableCell(cols, rows) {
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
   * @param {Object} widgetData - Widget definition
   * @param {number} cellNumber - Cell number to place widget
   * @returns {Object|null} Created widget instance or null if failed
   */
  addWidget(widgetData, cellNumber) {
    console.log('Adding widget instance:', widgetData, 'to cell:', cellNumber);

    if (!this.currentWorkspaceId) {
      console.error('Cannot add widget: no current workspace');
      return null;
    }

    if (!this.storageManager) {
      console.error('Cannot add widget: no storage manager');
      return null;
    }

    const user = this.storageManager.getUser();

    // Create widget instance with proper foreign keys (database-ready)
    const widgetInstance = {
      id: `instance-${Date.now()}`,
      userId: user.id,
      workspaceId: this.currentWorkspaceId,
      widgetDefId: widgetData.id,
      type: widgetData.type,
      name: widgetData.name,
      icon: widgetData.icon,
      size: widgetData.size,
      cols: widgetData.cols,
      rows: widgetData.rows,
      cell: cellNumber,
      occupiedCells: calculateOccupiedCells(cellNumber, widgetData.cols, widgetData.rows),
      config: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.widgets.push(widgetInstance);

    // Save to storage manager (simulates database insert)
    const allInstances = this.storageManager.getWidgetInstances();
    allInstances.push(widgetInstance);
    this.storageManager.saveWidgetInstances(allInstances);

    this.onWidgetAdded(widgetInstance);
    this.onWidgetsChanged();

    return widgetInstance;
  }

  /**
   * Note: Widget rendering is handled by DesktopManager via callbacks
   * This keeps rendering logic centralized with drag-drop and UI concerns
   */

  /**
   * Remove a widget
   * @param {string} widgetId - Widget ID
   */
  removeWidget(widgetId) {
    const widget = this.widgets.find(w => w.id === widgetId);
    if (!widget) {
      console.error('Widget not found:', widgetId);
      return;
    }

    console.log('Removing widget:', widgetId);

    // Reset all occupied cells
    const occupiedCells = widget.occupiedCells || calculateOccupiedCells(widget.cell, widget.cols, widget.rows);
    occupiedCells.forEach(cellNum => {
      const cell = document.querySelector(`[data-cell="${cellNum}"]`);
      if (cell) {
        cell.classList.add('empty');
        cell.classList.remove('occupied-span');
        cell.innerHTML = '';
      }
    });

    // Remove from widgets array
    this.widgets = this.widgets.filter(w => w.id !== widgetId);

    // Save to storage manager
    const allInstances = this.storageManager.getWidgetInstances();
    const updatedInstances = allInstances.filter(w => w.id !== widgetId);
    this.storageManager.saveWidgetInstances(updatedInstances);

    this.onWidgetRemoved(widgetId);
    this.onWidgetsChanged();
  }

  /**
   * Clear all widgets from grid
   */
  clearGrid() {
    this.widgets.forEach(widget => {
      const occupiedCells = widget.occupiedCells || calculateOccupiedCells(widget.cell, widget.cols, widget.rows);
      occupiedCells.forEach(cellNum => {
        const cell = document.querySelector(`[data-cell="${cellNum}"]`);
        if (cell) {
          cell.classList.add('empty');
          cell.classList.remove('occupied-span');
          cell.innerHTML = '';
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
    // Clear old position
    const oldOccupiedCells = widget.occupiedCells || calculateOccupiedCells(widget.cell, widget.cols, widget.rows);
    oldOccupiedCells.forEach(cellNum => {
      const cell = document.querySelector(`[data-cell="${cellNum}"]`);
      if (cell) {
        cell.classList.add('empty');
        cell.classList.remove('occupied-span');
        cell.innerHTML = '';
      }
    });

    // Update widget
    widget.cell = newCell;
    widget.occupiedCells = calculateOccupiedCells(newCell, widget.cols, widget.rows);
    widget.updatedAt = new Date().toISOString();

    // Save to storage manager
    const allInstances = this.storageManager.getWidgetInstances();
    const index = allInstances.findIndex(w => w.id === widget.id);
    if (index !== -1) {
      allInstances[index] = widget;
      this.storageManager.saveWidgetInstances(allInstances);
    }

    // Re-render
    this.renderWidget(widget);
    this.onWidgetsChanged();
  }

  /**
   * Get widget by ID
   * @param {string} widgetId - Widget ID
   * @returns {Object|null} Widget object or null
   */
  getWidgetById(widgetId) {
    return this.widgets.find(w => w.id === widgetId) || null;
  }
}
