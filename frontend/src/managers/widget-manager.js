/**
 * WidgetManager
 * Handles widget CRUD operations and grid management
 */

import {
  gridConfig,
  getCenterCells,
  calculateOccupiedCells,
  canWidgetFitAt,
  getWidgetById
} from '../data/widgets-static.js';

export class WidgetManager {
  constructor(options = {}) {
    this.widgets = [];

    // Callbacks
    this.onWidgetAdded = options.onWidgetAdded || (() => {});
    this.onWidgetRemoved = options.onWidgetRemoved || (() => {});
    this.onWidgetsChanged = options.onWidgetsChanged || (() => {});
    this.setupLongPressDrag = options.setupLongPressDrag || (() => {});
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
   * Add a new widget
   * @param {Object} widgetData - Widget definition
   * @param {number} cellNumber - Cell number to place widget
   * @returns {Object|null} Created widget or null if failed
   */
  addWidget(widgetData, cellNumber) {
    console.log('Adding widget:', widgetData, 'to cell:', cellNumber);

    const widget = {
      id: `widget-${Date.now()}`,
      appId: widgetData.id,
      type: widgetData.type,
      name: widgetData.name,
      icon: widgetData.icon,
      size: widgetData.size,
      cols: widgetData.cols,
      rows: widgetData.rows,
      cell: cellNumber,
      occupiedCells: calculateOccupiedCells(cellNumber, widgetData.cols, widgetData.rows),
      config: {}
    };

    this.widgets.push(widget);
    this.onWidgetAdded(widget);
    this.onWidgetsChanged();

    return widget;
  }

  /**
   * Render a widget to the grid
   * @param {Object} widget - Widget object
   */
  renderWidget(widget) {
    const startCell = widget.cell;
    const occupiedCells = widget.occupiedCells || calculateOccupiedCells(startCell, widget.cols, widget.rows);

    // Get the first cell (top-left)
    const firstCell = document.querySelector(`[data-cell="${startCell}"]`);
    if (!firstCell) {
      console.error('Cell not found:', startCell);
      return;
    }

    // Mark all occupied cells as non-empty
    occupiedCells.forEach(cellNum => {
      const cell = document.querySelector(`[data-cell="${cellNum}"]`);
      if (cell) {
        cell.classList.remove('empty');
        if (cellNum !== startCell) {
          cell.classList.add('occupied-span');
          cell.innerHTML = '';
        }
      }
    });

    // Render widget in the first cell
    const typeIcon = widget.type === 'app' ? '📱' : '📊';

    firstCell.innerHTML = `
      <div class="widget" data-widget-id="${widget.id}" data-cols="${widget.cols}" data-rows="${widget.rows}">
        <div class="widget-header">
          <span class="widget-icon">${widget.icon}</span>
          <span class="widget-title">${widget.name}</span>
          <span class="widget-type-icon">${typeIcon}</span>
          <button class="widget-menu-btn" onclick="desktopManager.showWidgetMenu('${widget.id}')">⋯</button>
        </div>
        <div class="widget-body">
          <div class="widget-placeholder">
            <p>Widget content will load here</p>
            <p style="font-size: 0.75rem; color: #9ca3af; margin-top: 8px;">
              ${widget.appId} (${widget.size})
            </p>
          </div>
        </div>
      </div>
    `;

    // Apply multi-cell spanning styles
    const widgetElement = firstCell.querySelector('.widget');
    if (widgetElement && (widget.cols > 1 || widget.rows > 1)) {
      const width = widget.cols * gridConfig.cellSize + (widget.cols - 1) * gridConfig.gap;
      const height = widget.rows * gridConfig.cellSize + (widget.rows - 1) * gridConfig.gap;

      widgetElement.style.width = `${width}px`;
      widgetElement.style.height = `${height}px`;
      widgetElement.style.position = 'absolute';
      widgetElement.style.left = '0';
      widgetElement.style.top = '0';
      widgetElement.style.zIndex = '10';
      widgetElement.style.margin = '0';
    }

    // Setup drag functionality
    this.setupLongPressDrag(widgetElement, widget);
  }

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
