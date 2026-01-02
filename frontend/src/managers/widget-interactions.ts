/**
 * WidgetInteractions
 * Handles widget drag & drop, click detection, and user interactions
 *
 * Responsibilities:
 * - Long-press detection for wiggle mode entry
 * - Drag and drop with grid snapping
 * - Click vs double-click detection
 * - Touch and mouse event handling
 *
 * Does NOT handle:
 * - Widget data/CRUD (WidgetManager)
 * - Wiggle mode state (WidgetWiggleMode)
 * - Widget rendering (WidgetUIController)
 *
 * Refactored to use centralized utilities for:
 * - DOM access (domHelper)
 */

import { gridConfig, calculateOccupiedCells } from '../data/widgets-static.js';
import { domHelper } from '../utils/dom-helpers.js';
import { CleanupManager } from '../utils/cleanup-manager.js';
import { createLogger } from '../utils/logger.js';
import type {
  WidgetInstance,
  WidgetDefinition,
  WidgetInteractionsOptions,
  EventBus,
  DOMHelper
} from '../types/index.js';

const logger = createLogger('WidgetInteractions');

export class WidgetInteractions {
  // Properties
  private widgetManager: any; // WidgetManager (avoiding circular dependency)
  private wiggleModeController: any; // WidgetWiggleMode (avoiding circular dependency)
  private eventBus: EventBus | null;
  private dom: DOMHelper;
  private gridContainer: HTMLElement | null;
  private longPressDelay: number;
  private doubleClickDelay: number;
  private isDragging: boolean;
  private draggedWidget: WidgetInstance | null;
  private draggedWidgetElement: HTMLElement | null;
  private dragOffset: { x: number; y: number };
  private originalParent: HTMLElement | null;
  private cleanup: CleanupManager;

  constructor(options: WidgetInteractionsOptions = {}) {
    this.widgetManager = options.widgetManager;
    this.wiggleModeController = options.wiggleModeController;
    this.eventBus = options.eventBus;
    this.dom = options.domHelper || domHelper;
    this.gridContainer = options.gridContainer || this.dom.getElementById('widget-grid');

    // Interaction settings
    this.longPressDelay = options.longPressDelay || 500; // ms
    this.doubleClickDelay = options.doubleClickDelay || 300; // ms

    // Drag state
    this.isDragging = false;
    this.draggedWidget = null;
    this.draggedWidgetElement = null;
    this.dragOffset = { x: 0, y: 0 };
    this.originalParent = null;

    // Event cleanup functions
    this.cleanup = new CleanupManager();

    logger.info('Initialized');
  }

  /**
   * Setup interaction handlers for a widget element
   * @param {HTMLElement} widgetElement - Widget DOM element
   * @param {Object} widget - Widget data
   * @param {Object} widgetDefinition - Widget definition from widgets-static.js
   */
  setupInteractions(widgetElement: HTMLElement, widget: WidgetInstance, widgetDefinition: WidgetDefinition): void {
    // Setup drag and long-press
    this.setupLongPressDrag(widgetElement, widget, widgetDefinition);

    // Setup click/double-click (separate from drag)
    this.setupClickDetection(widgetElement, widget, widgetDefinition);
  }

  /**
   * Setup click and double-click detection
   * @param {HTMLElement} widgetElement - Widget DOM element
   * @param {Object} widget - Widget data
   * @param {Object} widgetDefinition - Widget definition
   */
  setupClickDetection(widgetElement: HTMLElement, widget: WidgetInstance, widgetDefinition: WidgetDefinition): void {
    let clickTimer = null;
    let clickCount = 0;

    const cleanup = this.dom.addEventListener(widgetElement, 'click', (e) => {
      // Ignore clicks on control buttons and interactive form elements
      if (e.target.closest('.widget-control-btn') ||
          e.target.closest('.widget-delete-btn') ||
          e.target.closest('.widget-menu-btn') ||
          e.target.closest('input') ||
          e.target.closest('textarea') ||
          e.target.closest('select') ||
          e.target.closest('button')) {
        return;
      }

      // Don't process clicks while dragging
      if (this.isDragging) return;

      clickCount++;

      if (clickCount === 1) {
        // Fire immediately on first click (no delay)
        this.handleClick(widget, widgetDefinition, e);

        // Reset click count after double-click window
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, this.doubleClickDelay);
      } else if (clickCount === 2) {
        // Double click also fires (multiInstance rules prevent duplicates)
        clearTimeout(clickTimer);
        this.handleDoubleClick(widget, widgetDefinition, e);
        clickCount = 0;
      }
    });

    this.cleanup.add(cleanup);
  }

  /**
   * Handle single click
   * @param {Object} widget - Widget data
   * @param {Object} widgetDefinition - Widget definition
   * @param {Event} event - Click event
   */
  handleClick(widget: WidgetInstance, widgetDefinition: WidgetDefinition, event: Event): void {
    // Don't handle clicks when in wiggle mode (prevent app launches after long-press)
    if (this.wiggleModeController && this.wiggleModeController.isWiggleMode()) {
      logger.info('Click ignored - in wiggle mode');
      return;
    }

    logger.info('Widget clicked:', widget.id);

    // Emit event instead of callback
    if (this.eventBus) {
      this.eventBus.emit('widget:clicked', { widget, widgetDefinition, event });
    }
  }

  /**
   * Handle double click
   * @param {Object} widget - Widget data
   * @param {Object} widgetDefinition - Widget definition
   * @param {Event} event - Click event
   */
  handleDoubleClick(widget: WidgetInstance, widgetDefinition: WidgetDefinition, event: Event): void {
    // Don't handle double-clicks when in wiggle mode
    if (this.wiggleModeController && this.wiggleModeController.isWiggleMode()) {
      logger.info('Double-click ignored - in wiggle mode');
      return;
    }

    logger.info('Widget double-clicked:', widget.id);

    // Emit event instead of callback
    if (this.eventBus) {
      this.eventBus.emit('widget:double-clicked', { widget, widgetDefinition, event });
    }
  }

  /**
   * Setup long-press detection and drag functionality
   * @param {HTMLElement} widgetElement - Widget DOM element
   * @param {Object} widget - Widget data
   * @param {Object} widgetDefinition - Widget definition
   */
  setupLongPressDrag(widgetElement: HTMLElement, widget: WidgetInstance, widgetDefinition: WidgetDefinition): void {
    if (!widgetElement) return;

    let pressTimer = null;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;
    let isPressing = false; // Track if mouse/touch is currently pressed

    const handlePressStart = (e) => {
      // Don't trigger on control buttons, delete button, or interactive form elements
      if (e.target.closest('.widget-menu-btn') ||
          e.target.closest('.widget-delete-btn') ||
          e.target.closest('.widget-control-btn') ||
          e.target.closest('input') ||
          e.target.closest('textarea') ||
          e.target.closest('select') ||
          e.target.closest('button')) {
        return;
      }

      // If already dragging, ignore new press
      if (this.isDragging) {
        return;
      }

      const touch = e.type === 'touchstart' ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      hasMoved = false;
      isPressing = true; // Mark that mouse/touch is pressed

      // Check if in wiggle mode
      const inWiggleMode = this.wiggleModeController && this.wiggleModeController.isWiggleMode();

      // If in wiggle mode, don't enter wiggle mode again - just allow immediate drag
      if (inWiggleMode) {
        e.preventDefault();
        return;
      }

      // Not in wiggle mode: normal long-press behavior
      e.preventDefault();

      // Check if this widget should launch app on long press instead of wiggling
      if (widgetDefinition.launchTrigger === 'longPress' && widgetDefinition.launchesApp) {
        // Start timer to launch app
        pressTimer = setTimeout(() => {
          if (!hasMoved) {
            // Emit event instead of callback
            if (this.eventBus) {
              this.eventBus.emit('widget:long-pressed', { widget, widgetDefinition, event: e });
            }
          }
        }, this.longPressDelay);
      } else {
        // Start long-press timer (500ms) → Enter wiggle mode
        pressTimer = setTimeout(() => {
          // Only enter wiggle mode if user hasn't moved
          if (!hasMoved && this.wiggleModeController) {
            this.wiggleModeController.enterWiggleMode();
          }
        }, this.longPressDelay);
      }

      // Add press visual feedback
      widgetElement.style.transform = 'scale(0.98)';
    };

    const handlePressEnd = (e) => {
      // Clear timer if released before 500ms
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }

      // Remove press visual feedback (but keep wiggle animation if in wiggle mode)
      if (!this.isDragging) {
        widgetElement.style.transform = '';
      }

      hasMoved = false;
      isPressing = false; // Mark that mouse/touch is released
    };

    const handlePressMove = (e) => {
      const touch = e.type === 'touchmove' ? e.touches[0] : e;
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);

      // Track if user has moved
      if (dx > 5 || dy > 5) {
        hasMoved = true;
      }

      // If moved too much during initial press, cancel long-press timer
      if ((dx > 10 || dy > 10) && pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
        widgetElement.style.transform = '';
      }

      // If in wiggle mode and moving (and button is pressed), start drag
      const inWiggleMode = this.wiggleModeController && this.wiggleModeController.isWiggleMode();
      if (inWiggleMode && isPressing && hasMoved && !this.isDragging) {
        this.startWidgetDrag(widgetElement, widget, touch.clientX, touch.clientY);
      }
    };

    // Mouse events
    const mouseDownCleanup = this.dom.addEventListener(widgetElement, 'mousedown', handlePressStart);
    const mouseUpCleanup = this.dom.addEventListener(widgetElement, 'mouseup', handlePressEnd);
    const mouseLeaveCleanup = this.dom.addEventListener(widgetElement, 'mouseleave', handlePressEnd);
    const mouseMoveCleanup = this.dom.addEventListener(widgetElement, 'mousemove', handlePressMove);

    // Touch events
    const touchStartCleanup = this.dom.addEventListener(widgetElement, 'touchstart', handlePressStart, { passive: false });
    const touchEndCleanup = this.dom.addEventListener(widgetElement, 'touchend', handlePressEnd);
    const touchCancelCleanup = this.dom.addEventListener(widgetElement, 'touchcancel', handlePressEnd);
    const touchMoveCleanup = this.dom.addEventListener(widgetElement, 'touchmove', handlePressMove, { passive: false });

    // Store cleanup functions
    this.cleanup.addMultiple(
      mouseDownCleanup,
      mouseUpCleanup,
      mouseLeaveCleanup,
      mouseMoveCleanup,
      touchStartCleanup,
      touchEndCleanup,
      touchCancelCleanup,
      touchMoveCleanup
    );
  }

  /**
   * Start dragging a widget
   * @param {HTMLElement} widgetElement - Widget DOM element
   * @param {Object} widget - Widget data
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position
   */
  startWidgetDrag(widgetElement: HTMLElement, widget: WidgetInstance, startX: number, startY: number): void {
    logger.info('Starting drag for widget:', widget.name, 'cols:', widget.cols, 'rows:', widget.rows);

    this.isDragging = true;
    this.draggedWidget = widget;
    this.draggedWidgetElement = widgetElement;

    // Get widget's current position and size BEFORE any style changes
    const rect = widgetElement.getBoundingClientRect();

    this.dragOffset = {
      x: startX - rect.left,
      y: startY - rect.top
    };

    // Calculate and preserve multi-cell dimensions
    const width = widget.cols * gridConfig.cellSize + (widget.cols - 1) * gridConfig.gap;
    const height = widget.rows * gridConfig.cellSize + (widget.rows - 1) * gridConfig.gap;

    // CRITICAL: Set dimensions FIRST before changing position
    widgetElement.style.setProperty('width', `${width}px`, 'important');
    widgetElement.style.setProperty('height', `${height}px`, 'important');
    widgetElement.style.setProperty('min-width', `${width}px`, 'important');
    widgetElement.style.setProperty('min-height', `${height}px`, 'important');
    widgetElement.style.setProperty('max-width', `${width}px`, 'important');
    widgetElement.style.setProperty('max-height', `${height}px`, 'important');
    widgetElement.style.setProperty('box-sizing', 'border-box', 'important');

    // Store the original parent
    this.originalParent = widgetElement.parentElement;

    // Move widget to body so it's not affected by parent cell positioning
    const body = this.dom.querySelector('body');
    body.appendChild(widgetElement);

    // Add dragging class for visual feedback
    this.dom.toggleClass(widgetElement, 'widget-dragging', true);
    widgetElement.style.cursor = 'grabbing';
    widgetElement.style.zIndex = '1000';
    widgetElement.style.opacity = '0.9';

    // CRITICAL: Reset ALL positioning to prevent centering
    widgetElement.style.position = 'fixed';
    widgetElement.style.left = `${rect.left}px`;
    widgetElement.style.top = `${rect.top}px`;
    widgetElement.style.right = 'auto';
    widgetElement.style.bottom = 'auto';
    widgetElement.style.margin = '0';
    widgetElement.style.padding = '0';
    widgetElement.style.transform = 'none';
    widgetElement.style.transformOrigin = 'top left';
    widgetElement.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';

    // Make all empty grid cells visible during drag
    this.showGridDuringDrag();

    // Setup move and end handlers
    const handleDragMove = (e) => this.handleWidgetDragMove(e, widgetElement);
    const handleDragEnd = (e) => this.handleWidgetDragEnd(e, widgetElement);

    const docBody = this.dom.querySelector('body');

    // Store cleanup functions for drag event listeners in a separate group
    this.cleanup.addToGroup('drag', this.dom.addEventListener(docBody, 'mousemove', handleDragMove));
    this.cleanup.addToGroup('drag', this.dom.addEventListener(docBody, 'mouseup', handleDragEnd));
    this.cleanup.addToGroup('drag', this.dom.addEventListener(docBody, 'touchmove', handleDragMove, { passive: false }));
    this.cleanup.addToGroup('drag', this.dom.addEventListener(docBody, 'touchend', handleDragEnd));
  }

  /**
   * Show grid cells during drag
   */
  showGridDuringDrag(): void {
    const cells = this.dom.querySelectorAll('.widget-cell');
    cells.forEach(cell => {
      this.dom.toggleClass(cell, 'grid-visible', true);
    });
  }

  /**
   * Hide grid cells after drag
   */
  hideGridAfterDrag(): void {
    const cells = this.dom.querySelectorAll('.widget-cell');
    cells.forEach(cell => {
      this.dom.toggleClass(cell, 'grid-visible', false);
    });
  }

  /**
   * Handle widget drag movement
   * @param {Event} e - Mouse/touch move event
   * @param {HTMLElement} widgetElement - Widget being dragged
   */
  handleWidgetDragMove(e: MouseEvent | TouchEvent, widgetElement: HTMLElement): void {
    if (!this.isDragging) return;

    e.preventDefault();
    const touch = e.type === 'touchmove' ? e.touches[0] : e;

    // Snap to grid and show preview
    this.highlightDropZoneWithPreview(touch.clientX, touch.clientY, widgetElement);
  }

  /**
   * Highlight drop zone and position widget at snap location
   * @param {number} x - Cursor X position
   * @param {number} y - Cursor Y position
   * @param {HTMLElement} widgetElement - Widget being dragged
   */
  highlightDropZoneWithPreview(x: number, y: number, widgetElement: HTMLElement): void {
    if (!this.draggedWidget) return;

    // Calculate widget dimensions
    const width = this.draggedWidget.cols * gridConfig.cellSize + (this.draggedWidget.cols - 1) * gridConfig.gap;
    const height = this.draggedWidget.rows * gridConfig.cellSize + (this.draggedWidget.rows - 1) * gridConfig.gap;

    // Calculate where the widget's TOP-LEFT corner should be based on cursor and drag offset
    const widgetLeft = x - this.dragOffset.x;
    const widgetTop = y - this.dragOffset.y;

    // Find which cell the TOP-LEFT corner of the widget is over
    const topLeftCell = this.findCellAtPosition(widgetLeft, widgetTop);
    if (!topLeftCell) return;

    const targetCellNumber = parseInt(topLeftCell.dataset.cell);

    // Calculate the snapped position
    const snappedCell = this.snapToTopLeftCorner(
      targetCellNumber,
      this.draggedWidget.cols,
      this.draggedWidget.rows
    );

    if (snappedCell === null) return;

    // Highlight the cells
    this.highlightDropZone(widgetLeft, widgetTop);

    // Get the snapped cell element
    const snappedCellElement = this.dom.querySelector(`[data-cell="${snappedCell}"]`);
    if (!snappedCellElement) return;

    // Get the position of the snapped cell
    const snappedRect = snappedCellElement.getBoundingClientRect();

    // Position widget at snapped location
    widgetElement.style.setProperty('position', 'fixed', 'important');
    widgetElement.style.setProperty('left', `${snappedRect.left}px`, 'important');
    widgetElement.style.setProperty('top', `${snappedRect.top}px`, 'important');
    widgetElement.style.setProperty('right', 'auto', 'important');
    widgetElement.style.setProperty('bottom', 'auto', 'important');
    widgetElement.style.setProperty('width', `${width}px`, 'important');
    widgetElement.style.setProperty('height', `${height}px`, 'important');
    widgetElement.style.setProperty('min-width', `${width}px`, 'important');
    widgetElement.style.setProperty('min-height', `${height}px`, 'important');
    widgetElement.style.setProperty('max-width', `${width}px`, 'important');
    widgetElement.style.setProperty('max-height', `${height}px`, 'important');
    widgetElement.style.setProperty('margin', '0', 'important');
    widgetElement.style.setProperty('transform', 'none', 'important');
    widgetElement.style.setProperty('transform-origin', 'top left', 'important');
    widgetElement.style.setProperty('box-sizing', 'border-box', 'important');

    widgetElement.style.outline = '3px solid rgba(37, 99, 235, 0.6)';
    widgetElement.style.outlineOffset = '4px';
  }

  /**
   * Handle widget drag end
   * @param {Event} e - Mouse/touch end event
   * @param {HTMLElement} widgetElement - Widget being dragged
   */
  handleWidgetDragEnd(e: MouseEvent | TouchEvent, widgetElement: HTMLElement): void {
    if (!this.isDragging) return;

    console.log('Ending drag');

    // Remove event listeners using cleanup functions
    this.cleanup.cleanupGroup('drag');

    // Find drop position using the widget's TOP-LEFT corner (accounting for drag offset)
    const touch = e.type === 'touchend' ? e.changedTouches[0] : e;
    const widgetLeft = touch.clientX - this.dragOffset.x;
    const widgetTop = touch.clientY - this.dragOffset.y;
    const targetCell = this.findCellAtPosition(widgetLeft, widgetTop);

    // Store original widget data for restoration if move fails
    const originalCell = this.draggedWidget ? this.draggedWidget.cell : null;
    let moveSucceeded = false;

    if (targetCell) {
      const targetCellNumber = parseInt(targetCell.dataset.cell);
      console.log('Dropping at cell:', targetCellNumber);

      // Notify that widget should be moved
      if (this.widgetManager && this.draggedWidget) {
        try {
          this.widgetManager.updateWidgetPosition(this.draggedWidget, targetCellNumber);
          moveSucceeded = true;

          // Emit event instead of callback
          if (this.eventBus) {
            this.eventBus.emit('widget:moved', { widget: this.draggedWidget, targetCell: targetCellNumber });
          }
        } catch (error) {
          console.error('Failed to move widget:', error);
          moveSucceeded = false;
        }
      }
    } else {
      console.log('No valid drop target found');
    }

    // If move failed or no target, restore widget to original position
    if (!moveSucceeded && this.draggedWidget && originalCell !== null) {
      console.log('Restoring widget to original position:', originalCell);
      // The widget manager will re-render it at the original position
      if (this.eventBus) {
        this.eventBus.emit('widget:added', this.draggedWidget);
      }
    }

    // Remove the dragged widget from document.body
    const body = this.dom.querySelector('body');
    if (widgetElement && widgetElement.parentElement === body) {
      this.dom.removeElement(widgetElement);
    }

    // Reset drag state
    this.isDragging = false;
    this.draggedWidget = null;
    this.draggedWidgetElement = null;

    // Clear highlighted drop zones
    const hoverCells = this.dom.querySelectorAll('.widget-cell.hover');
    hoverCells.forEach(cell => {
      this.dom.toggleClass(cell, 'hover', false);
    });

    // Hide grid after drag
    this.hideGridAfterDrag();
  }

  /**
   * Highlight drop zone cells
   * @param {number} x - Widget top-left X position
   * @param {number} y - Widget top-left Y position
   */
  highlightDropZone(x: number, y: number): void {
    // Remove previous highlights
    const hoverCells = this.dom.querySelectorAll('.widget-cell.hover');
    hoverCells.forEach(cell => {
      this.dom.toggleClass(cell, 'hover', false);
    });

    if (!this.draggedWidget) return;

    // Find cell at the widget's top-left corner
    const targetCell = this.findCellAtPosition(x, y);
    if (!targetCell) return;

    const targetCellNumber = parseInt(targetCell.dataset.cell);
    const snappedCell = this.snapToTopLeftCorner(
      targetCellNumber,
      this.draggedWidget.cols,
      this.draggedWidget.rows
    );

    if (snappedCell === null) return;

    // Highlight all cells that the widget will occupy
    const cellsToHighlight = calculateOccupiedCells(
      snappedCell,
      this.draggedWidget.cols,
      this.draggedWidget.rows
    );

    cellsToHighlight.forEach(cellNum => {
      const cell = this.dom.querySelector(`[data-cell="${cellNum}"]`);
      if (cell) {
        this.dom.toggleClass(cell, 'hover', true);
      }
    });
  }

  /**
   * Find cell at cursor position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {HTMLElement|null} Cell element
   */
  findCellAtPosition(x: number, y: number): Element | null {
    const cells = this.dom.querySelectorAll('.widget-cell');
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return cell;
      }
    }
    return null;
  }

  /**
   * Snap to top-left corner of grid for multi-cell widgets
   * @param {number} cellNumber - Target cell number (1-based)
   * @param {number} cols - Widget columns
   * @param {number} rows - Widget rows
   * @returns {number|null} Snapped cell number (1-based)
   */
  snapToTopLeftCorner(cellNumber: number, cols: number, rows: number): number | null {
    // For 1×1 widgets, no snapping needed
    if (cols === 1 && rows === 1) {
      return cellNumber;
    }

    // Calculate the row and column of the target cell (convert 1-based to 0-based)
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
      return null; // Widget doesn't fit
    }

    // Convert back to 1-based cell number
    return snappedRow * gridConfig.columns + snappedCol + 1;
  }

  /**
   * Cleanup all event listeners
   */
  destroy(): void {
    this.cleanup.cleanup();
    logger.info('Cleanup completed');
  }
}

export default WidgetInteractions;
