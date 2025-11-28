// Symbiosis Desktop Manager
import {
  availableWidgets,
  workspaces,
  gridConfig,
  getCenterCells,
  calculateOccupiedCells,
  canWidgetFitAt,
  getWidgetById,
  categoryInfo
} from './data/widgets-static.js';

import { StorageManager } from './managers/storage-manager.js';
import { WorkspaceManager } from './managers/workspace-manager.js';
import { WidgetManager } from './managers/widget-manager.js';
import { HotkeyManager } from './managers/hotkey-manager.js';

class DesktopManager {
  constructor() {
    this.drawerOpen = false;
    this.currentDragWidget = null;

    // Long-press drag state
    this.longPressTimer = null;
    this.isDragging = false;
    this.draggedWidget = null;
    this.draggedWidgetElement = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };

    // Initialize managers
    this.initializeManagers();

    this.init();
  }

  initializeManagers() {
    // Initialize WidgetManager with callbacks
    this.widgetManager = new WidgetManager({
      onWidgetAdded: (widget) => {
        this.renderWidget(widget);
        this.workspaceManager.saveWorkspace();
        this.hideWelcome();
      },
      onWidgetRemoved: (widgetId) => {
        this.workspaceManager.saveWorkspace();
        if (this.widgetManager.widgets.length === 0) {
          this.showWelcome();
        }
      },
      onWidgetsChanged: () => {
        this.workspaceManager.saveWorkspace();
      },
      setupLongPressDrag: (widgetElement, widget) => {
        this.setupLongPressDrag(widgetElement, widget);
      }
    });

    // Initialize WorkspaceManager with callbacks
    this.workspaceManager = new WorkspaceManager({
      onWorkspaceSwitch: (workspace) => {
        // Update widget manager with new workspace widgets
        this.widgetManager.setWidgets(workspace.widgets || []);
      },
      getWidgets: () => this.widgetManager.getWidgets(),
      clearGrid: () => this.widgetManager.clearGrid(),
      renderWidget: (widget) => this.renderWidget(widget),
      showWelcome: () => this.showWelcome(),
      hideWelcome: () => this.hideWelcome()
    });

    // Initialize HotkeyManager with references to other managers
    this.hotkeyManager = new HotkeyManager({
      workspaceManager: this.workspaceManager,
      widgetManager: this.widgetManager
    });
  }

  init() {
    console.log('Symbiosis Desktop initializing...');

    // Populate widget drawer from static data
    this.populateWidgetDrawer();

    // Setup event listeners
    this.setupWidgetDrawer();
    this.setupDockApps();
    this.setupTopBar();

    // Load widgets from current workspace
    this.loadWidgets();

    // Hide welcome message if widgets exist
    if (this.widgetManager.widgets.length > 0) {
      this.hideWelcome();
    }

    // Initialize workspace UI
    this.workspaceManager.updateWorkspaceUI();

    console.log('Desktop ready!');
  }

  // Populate Widget Drawer from Static Data
  populateWidgetDrawer() {
    const drawerContent = document.getElementById('drawer-content');
    if (!drawerContent) return;

    // Group widgets by category
    const categories = {};
    availableWidgets.forEach(widget => {
      if (!categories[widget.category]) {
        categories[widget.category] = [];
      }
      categories[widget.category].push(widget);
    });

    // Build HTML for each category
    let html = '';
    Object.keys(categories).forEach(categoryKey => {
      const category = categoryInfo[categoryKey];
      const widgets = categories[categoryKey];

      html += `
        <div class="widget-category">
          <h3 class="category-title">
            ${category.icon} ${category.name}
          </h3>
          <div class="widget-list">
      `;

      widgets.forEach(widget => {
        const typeIcon = widget.type === 'app' ? '📱' : '📊';
        html += `
          <div class="widget-card" data-widget-id="${widget.id}">
            <div class="widget-card-header">
              <div class="widget-card-icon">${widget.icon}</div>
              <span class="widget-type-badge">${typeIcon}</span>
            </div>
            <div class="widget-card-name">${widget.name}</div>
            <div class="widget-card-description">${widget.description}</div>
            <div class="widget-card-footer">
              <span class="widget-card-size">${widget.size}</span>
              <button class="widget-add-btn" onclick="desktopManager.addWidgetToDesktop('${widget.id}')">
                + Add
              </button>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    drawerContent.innerHTML = html;
  }

  // Widget Drawer Management
  setupWidgetDrawer() {
    const drawer = document.getElementById('widget-drawer');
    const overlay = document.getElementById('drawer-overlay');

    // Make drawer functions global
    window.openWidgetDrawer = () => this.openDrawer();
    window.closeWidgetDrawer = () => this.closeDrawer();
  }

  openDrawer() {
    const drawer = document.getElementById('widget-drawer');
    const overlay = document.getElementById('drawer-overlay');

    drawer.classList.add('open');
    overlay.classList.add('visible');
    this.drawerOpen = true;

    document.body.style.overflow = 'hidden';
  }

  closeDrawer() {
    const drawer = document.getElementById('widget-drawer');
    const overlay = document.getElementById('drawer-overlay');

    drawer.classList.remove('open');
    overlay.classList.remove('visible');
    this.drawerOpen = false;

    document.body.style.overflow = '';
  }

  // Add Widget to Desktop (Click-to-Add)
  addWidgetToDesktop(widgetId) {
    const widgetDef = getWidgetById(widgetId);
    if (!widgetDef) {
      console.error('Widget not found:', widgetId);
      return;
    }

    // Find available position using WidgetManager
    const cellNumber = this.widgetManager.findAvailableCell(widgetDef.cols, widgetDef.rows);

    if (cellNumber === null) {
      alert(`No space available for ${widgetDef.name} (${widgetDef.size})`);
      return;
    }

    console.log(`Placing ${widgetDef.name} at cell ${cellNumber}`);

    // Create widget data
    const widgetData = {
      id: widgetDef.id,
      name: widgetDef.name,
      icon: widgetDef.icon,
      size: widgetDef.size,
      type: widgetDef.type,
      cols: widgetDef.cols,
      rows: widgetDef.rows
    };

    // Add widget using WidgetManager
    this.widgetManager.addWidget(widgetData, cellNumber);
    this.closeDrawer();
  }

  // Render widget wrapper (for drag-drop integration)
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
          cell.classList.add('occupied-span'); // Mark as part of multi-cell widget
          cell.innerHTML = ''; // Clear spanned cells
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

    // Apply multi-cell spanning styles dynamically
    const widgetElement = firstCell.querySelector('.widget');
    if (widgetElement && (widget.cols > 1 || widget.rows > 1)) {
      // Calculate widget dimensions based on grid
      const width = widget.cols * gridConfig.cellSize + (widget.cols - 1) * gridConfig.gap;
      const height = widget.rows * gridConfig.cellSize + (widget.rows - 1) * gridConfig.gap;

      // CRITICAL: Position widget at top-left of first cell, not centered
      // The cell has flexbox centering which would center the widget otherwise
      widgetElement.style.width = `${width}px`;
      widgetElement.style.height = `${height}px`;
      widgetElement.style.position = 'absolute';
      widgetElement.style.left = '0';
      widgetElement.style.top = '0';
      widgetElement.style.zIndex = '10';
      widgetElement.style.margin = '0';
    }

    // Add widget styles if not already present
    if (!document.getElementById('widget-styles')) {
      this.addWidgetStyles();
    }

    // Setup long-press drag functionality for this widget
    this.setupLongPressDrag(widgetElement, widget);
  }

  // Long-Press Drag-to-Move Functionality
  setupLongPressDrag(widgetElement, widget) {
    if (!widgetElement) return;

    let pressTimer = null;
    let startX = 0;
    let startY = 0;

    const handlePressStart = (e) => {
      // Don't trigger on menu button clicks
      if (e.target.classList.contains('widget-menu-btn')) {
        return;
      }

      e.preventDefault();

      const touch = e.type === 'touchstart' ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;

      // Start long-press timer (500ms)
      pressTimer = setTimeout(() => {
        this.startWidgetDrag(widgetElement, widget, touch.clientX, touch.clientY);
      }, 500);

      // Add press visual feedback
      widgetElement.style.transform = 'scale(0.98)';
    };

    const handlePressEnd = (e) => {
      // Clear timer if released before 500ms
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }

      // Remove press visual feedback
      if (!this.isDragging) {
        widgetElement.style.transform = '';
      }
    };

    const handlePressMove = (e) => {
      // If moved too much during press, cancel long-press
      const touch = e.type === 'touchmove' ? e.touches[0] : e;
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);

      if ((dx > 10 || dy > 10) && pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
        widgetElement.style.transform = '';
      }
    };

    // Mouse events
    widgetElement.addEventListener('mousedown', handlePressStart);
    widgetElement.addEventListener('mouseup', handlePressEnd);
    widgetElement.addEventListener('mouseleave', handlePressEnd);
    widgetElement.addEventListener('mousemove', handlePressMove);

    // Touch events
    widgetElement.addEventListener('touchstart', handlePressStart, { passive: false });
    widgetElement.addEventListener('touchend', handlePressEnd);
    widgetElement.addEventListener('touchcancel', handlePressEnd);
    widgetElement.addEventListener('touchmove', handlePressMove, { passive: false });
  }

  startWidgetDrag(widgetElement, widget, startX, startY) {
    console.log('Starting drag for widget:', widget.name, 'cols:', widget.cols, 'rows:', widget.rows);

    this.isDragging = true;
    this.draggedWidget = widget;
    this.draggedWidgetElement = widgetElement;

    // Get widget's current position and size BEFORE any style changes
    const rect = widgetElement.getBoundingClientRect();
    console.log('Widget rect before drag:', rect.width, 'x', rect.height);

    this.dragOffset = {
      x: startX - rect.left,
      y: startY - rect.top
    };

    // Calculate and preserve multi-cell dimensions
    const width = widget.cols * gridConfig.cellSize + (widget.cols - 1) * gridConfig.gap;
    const height = widget.rows * gridConfig.cellSize + (widget.rows - 1) * gridConfig.gap;

    console.log('Calculated dimensions:', width, 'x', height);

    // CRITICAL: Set dimensions FIRST before changing position
    // Use setProperty with important flag to override CSS width/height: 100%
    widgetElement.style.setProperty('width', `${width}px`, 'important');
    widgetElement.style.setProperty('height', `${height}px`, 'important');
    widgetElement.style.setProperty('min-width', `${width}px`, 'important');
    widgetElement.style.setProperty('min-height', `${height}px`, 'important');
    widgetElement.style.setProperty('max-width', `${width}px`, 'important');
    widgetElement.style.setProperty('max-height', `${height}px`, 'important');
    widgetElement.style.setProperty('box-sizing', 'border-box', 'important');

    // Store the original parent so we can put it back later
    this.originalParent = widgetElement.parentElement;

    // CRITICAL: Move widget to body so it's not affected by parent cell positioning
    document.body.appendChild(widgetElement);

    // Add dragging class for visual feedback
    widgetElement.classList.add('widget-dragging');
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

    // Remove transform during drag - it causes centering issues
    // widgetElement.style.transform = 'scale(1.05) rotate(3deg)';
    widgetElement.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.3)';

    // Make all empty grid cells visible during drag
    this.showGridDuringDrag();

    // Setup move and end handlers
    const handleDragMove = (e) => this.handleWidgetDragMove(e, widgetElement);
    const handleDragEnd = (e) => this.handleWidgetDragEnd(e, widgetElement, handleDragMove, handleDragEnd);

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  }

  showGridDuringDrag() {
    // Show all grid cells during drag
    document.querySelectorAll('.widget-cell').forEach(cell => {
      cell.classList.add('grid-visible');
    });
  }

  hideGridAfterDrag() {
    // Hide grid cells after drag
    document.querySelectorAll('.widget-cell').forEach(cell => {
      cell.classList.remove('grid-visible');
    });
  }

  handleWidgetDragMove(e, widgetElement) {
    if (!this.isDragging) return;

    e.preventDefault();
    const touch = e.type === 'touchmove' ? e.touches[0] : e;

    // Don't follow cursor - snap to grid instead
    // The highlightDropZoneWithPreview will position the widget at the snapped grid location
    widgetElement.style.position = 'fixed';

    // Highlight potential drop zones with snap preview
    this.highlightDropZoneWithPreview(touch.clientX, touch.clientY, widgetElement);
  }

  highlightDropZoneWithPreview(x, y, widgetElement) {
    if (!this.draggedWidget) return;

    const targetCell = this.findCellAtPosition(x, y);
    if (!targetCell) return;

    const targetCellNumber = parseInt(targetCell.dataset.cell);

    // Calculate the snapped position for where the widget WILL BE PLACED
    // This determines the top-left cell of the widget's final position
    const snappedCell = this.snapToTopLeftCorner(
      targetCellNumber,
      this.draggedWidget.cols,
      this.draggedWidget.rows
    );

    if (snappedCell === null) return;

    // Highlight the cells based on the snapped position
    this.highlightDropZone(x, y);

    // Get the snapped cell element (the top-left corner where the widget will start)
    const snappedCellElement = document.querySelector(`[data-cell="${snappedCell}"]`);
    if (!snappedCellElement) return;

    // Get the position of the snapped cell using getBoundingClientRect
    const snappedRect = snappedCellElement.getBoundingClientRect();

    // CRITICAL: Re-apply dimensions to ensure multi-cell widgets maintain their size
    const width = this.draggedWidget.cols * gridConfig.cellSize + (this.draggedWidget.cols - 1) * gridConfig.gap;
    const height = this.draggedWidget.rows * gridConfig.cellSize + (this.draggedWidget.rows - 1) * gridConfig.gap;

    console.log('Snapped cell element:', snappedCellElement, 'Rect:', snappedRect);
    console.log('Widget dimensions during drag:', width, 'x', height, 'for', this.draggedWidget.cols, 'x', this.draggedWidget.rows, 'widget');

    // CRITICAL FIX: Use the cell's actual screen position
    // getBoundingClientRect gives us the correct viewport coordinates
    // Position widget at EXACT top-left corner of snapped cell (no centering)
    // AND ensure it maintains its multi-cell dimensions (override CSS width/height: 100%)
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

    console.log('Cursor on cell:', targetCellNumber, '→ Widget snapped to cell:', snappedCell, 'at position:', snappedRect.left, snappedRect.top);
  }

  handleWidgetDragEnd(e, widgetElement, moveHandler, endHandler) {
    if (!this.isDragging) return;

    console.log('Ending drag');

    // Remove event listeners
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', endHandler);
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', endHandler);

    // Find drop position
    const touch = e.type === 'touchend' ? e.changedTouches[0] : e;
    const targetCell = this.findCellAtPosition(touch.clientX, touch.clientY);

    if (targetCell) {
      const targetCellNumber = parseInt(targetCell.dataset.cell);
      console.log('Dropping at cell:', targetCellNumber);

      // Move widget to new position
      this.moveWidget(this.draggedWidget, targetCellNumber);
    }

    // CRITICAL: Remove the dragged widget from document.body
    // (moveWidget creates a new widget element in the grid, so we need to remove the old one)
    if (widgetElement && widgetElement.parentElement === document.body) {
      document.body.removeChild(widgetElement);
    }

    // Reset drag state
    this.isDragging = false;
    this.draggedWidget = null;
    this.draggedWidgetElement = null;

    // Reset visual state - clear ALL positioning styles
    widgetElement.classList.remove('widget-dragging');
    widgetElement.style.cursor = '';
    widgetElement.style.position = '';
    widgetElement.style.left = '';
    widgetElement.style.top = '';
    widgetElement.style.right = '';
    widgetElement.style.bottom = '';
    widgetElement.style.zIndex = '';
    widgetElement.style.opacity = '';
    widgetElement.style.transform = '';
    widgetElement.style.transformOrigin = '';
    widgetElement.style.boxShadow = '';
    widgetElement.style.outline = '';
    widgetElement.style.outlineOffset = '';
    widgetElement.style.margin = '';
    widgetElement.style.width = '';
    widgetElement.style.height = '';
    widgetElement.style.minWidth = '';
    widgetElement.style.minHeight = '';
    widgetElement.style.maxWidth = '';
    widgetElement.style.maxHeight = '';

    // Clear highlighted drop zones
    document.querySelectorAll('.widget-cell.hover').forEach(cell => {
      cell.classList.remove('hover');
    });

    // Hide grid after drag
    this.hideGridAfterDrag();
  }

  highlightDropZone(x, y) {
    // Remove previous highlights
    document.querySelectorAll('.widget-cell.hover').forEach(cell => {
      cell.classList.remove('hover');
    });

    if (!this.draggedWidget) return;

    const targetCell = this.findCellAtPosition(x, y);
    if (!targetCell) return;

    const targetCellNumber = parseInt(targetCell.dataset.cell);

    // Calculate snapped position for multi-cell widgets
    const snappedCell = this.snapToTopLeftCorner(
      targetCellNumber,
      this.draggedWidget.cols,
      this.draggedWidget.rows
    );

    if (snappedCell === null) return;

    // Check if the position is valid
    if (!canWidgetFitAt(snappedCell, this.draggedWidget.cols, this.draggedWidget.rows)) {
      return;
    }

    // Get all cells that would be occupied
    const requiredCells = calculateOccupiedCells(
      snappedCell,
      this.draggedWidget.cols,
      this.draggedWidget.rows
    );

    // Check if any required cells are occupied by other widgets
    const occupiedCells = new Set();
    this.widgetManager.widgets.forEach(w => {
      if (w.id !== this.draggedWidget.id) {
        const cells = calculateOccupiedCells(w.cell, w.cols, w.rows);
        cells.forEach(cell => occupiedCells.add(cell));
      }
    });

    const canPlace = requiredCells.every(c => !occupiedCells.has(c));

    if (canPlace) {
      // Highlight all cells that will be occupied
      requiredCells.forEach(cellNum => {
        const cell = document.querySelector(`[data-cell="${cellNum}"]`);
        if (cell) {
          cell.classList.add('hover');
        }
      });
    }
  }

  findCellAtPosition(x, y) {
    if (!this.draggedWidgetElement) {
      // Fallback to the old method if not dragging, for safety.
      const cells = document.querySelectorAll('.widget-cell');
      for (const cell of cells) {
        const rect = cell.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return cell;
        }
      }
      return null;
    }

    let elementUnderCursor = null;
    try {
      this.draggedWidgetElement.style.pointerEvents = 'none';
      elementUnderCursor = document.elementFromPoint(x, y);
    } finally {
      this.draggedWidgetElement.style.pointerEvents = '';
    }

    if (!elementUnderCursor) {
      return null;
    }

    return elementUnderCursor.closest('.widget-cell');
  }

  moveWidget(widget, newCellNumber) {
    // For multi-cell widgets, snap to the top-left corner of the drop zone
    // This ensures proper alignment with the grid
    const snappedCell = this.snapToTopLeftCorner(newCellNumber, widget.cols, widget.rows);

    if (snappedCell === null) {
      console.log('Cannot snap widget to valid position');
      return;
    }

    // Check if new position is valid
    if (!canWidgetFitAt(snappedCell, widget.cols, widget.rows)) {
      console.log('Widget does not fit at new position');
      return;
    }

    // Check if cells are available (excluding current widget's cells)
    const occupiedCells = new Set();
    this.widgetManager.widgets.forEach(w => {
      if (w.id !== widget.id) {
        const cells = calculateOccupiedCells(w.cell, w.cols, w.rows);
        cells.forEach(cell => occupiedCells.add(cell));
      }
    });

    const requiredCells = calculateOccupiedCells(snappedCell, widget.cols, widget.rows);
    const isAvailable = requiredCells.every(c => !occupiedCells.has(c));

    // STEP 1: Clear the dragged widget's old position FIRST
    // This frees up cells that conflicting widgets might be able to use
    const oldOccupiedCells = widget.occupiedCells || calculateOccupiedCells(widget.cell, widget.cols, widget.rows);
    oldOccupiedCells.forEach(cellNum => {
      const cell = document.querySelector(`[data-cell="${cellNum}"]`);
      if (cell) {
        cell.classList.add('empty');
        cell.classList.remove('occupied-span');
        cell.innerHTML = '';
      }
    });

    // STEP 2: Handle conflicts if cells are occupied
    if (!isAvailable) {
      console.log('Cells occupied by other widgets - attempting to push them aside');

      // Find which widgets are in the way
      const conflictingWidgets = [];
      this.widgetManager.widgets.forEach(w => {
        if (w.id !== widget.id) {
          const wCells = calculateOccupiedCells(w.cell, w.cols, w.rows);
          const hasConflict = requiredCells.some(c => wCells.includes(c));
          if (hasConflict) {
            conflictingWidgets.push(w);
          }
        }
      });

      console.log('Conflicting widgets:', conflictingWidgets.map(w => w.name));

      // Try to find new positions for conflicting widgets
      // Now the dragged widget's old cells are available
      // But we need to reserve the target cells for the dragged widget
      const widgetMoves = [];

      // Add the dragged widget's target position to pending moves so it's reserved
      const draggedWidgetTargetMove = {
        widget: widget,
        newCell: snappedCell
      };

      for (const conflictWidget of conflictingWidgets) {
        const newPosition = this.findNearestAvailableSpace(
          conflictWidget,
          widget.id,
          [draggedWidgetTargetMove, ...widgetMoves]  // Include target position in reserved cells
        );

        if (newPosition === null) {
          // Can't find space for conflicting widget - restore dragged widget and abort
          console.error(`No space found for ${conflictWidget.name}, aborting move`);

          // Restore dragged widget to original position
          // Note: widget.cell still has the original value since we haven't changed it yet
          widget.occupiedCells = oldOccupiedCells;
          this.renderWidget(widget);
          this.workspaceManager.saveWorkspace();

          alert(`Cannot move ${widget.name} here - no space available to relocate ${conflictWidget.name}`);
          return;
        }

        widgetMoves.push({
          widget: conflictWidget,
          newCell: newPosition
        });
      }

      // STEP 3: Execute all moves for conflicting widgets
      console.log('Executing widget relocations:', widgetMoves);
      widgetMoves.forEach(move => {
        // Clear the widget's old position
        const oldCells = move.widget.occupiedCells || calculateOccupiedCells(move.widget.cell, move.widget.cols, move.widget.rows);
        oldCells.forEach(cellNum => {
          const cell = document.querySelector(`[data-cell="${cellNum}"]`);
          if (cell) {
            cell.classList.add('empty');
            cell.classList.remove('occupied-span');
            cell.innerHTML = '';
          }
        });

        // Update widget position
        move.widget.cell = move.newCell;
        move.widget.occupiedCells = calculateOccupiedCells(move.newCell, move.widget.cols, move.widget.rows);
      });

      // STEP 4: Re-render all pushed widgets
      widgetMoves.forEach(move => {
        this.renderWidget(move.widget);
      });
    }

    // STEP 5: Update and render the main widget at its new position
    widget.cell = snappedCell;
    widget.occupiedCells = requiredCells;
    this.renderWidget(widget);

    // STEP 6: Save workspace once at the end
    this.workspaceManager.saveWorkspace();

    console.log('Widget moved to cell:', snappedCell);
  }

  /**
   * Find the nearest available space for a widget that needs to be pushed aside
   * @param {Object} widget - The widget that needs to be relocated
   * @param {string} excludeWidgetId - ID of the widget being moved (to exclude from collision detection)
   * @param {Array} pendingMoves - Array of moves already planned (to avoid conflicts)
   * @returns {number|null} - Cell number for new position, or null if no space found
   */
  findNearestAvailableSpace(widget, excludeWidgetId, pendingMoves = []) {
    const widgetSize = widget.cols * widget.rows;
    const currentCell = widget.cell;
    const currentRow = Math.floor((currentCell - 1) / gridConfig.columns);
    const currentCol = (currentCell - 1) % gridConfig.columns;

    // Build a set of all occupied cells (including pending moves)
    const occupiedCells = new Set();
    this.widgetManager.widgets.forEach(w => {
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
    // Try cells in order of distance from original position
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
        console.log(`Found space for ${widget.name} at cell ${cell} (distance: ${candidate.distance})`);
        return cell;
      }
    }

    // No space found
    console.log(`No available space found for ${widget.name}`);
    return null;
  }

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

  addWidgetStyles() {
    const style = document.createElement('style');
    style.id = 'widget-styles';
    style.textContent = `
      .widget {
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.2s;
      }

      .widget:hover {
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      .widget-header {
        padding: 12px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.5);
      }

      .widget-icon {
        font-size: 1.25rem;
      }

      .widget-title {
        flex: 1;
        font-weight: 600;
        font-size: 0.875rem;
        color: #111827;
      }

      .widget-menu-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        color: #6b7280;
        padding: 4px 8px;
        border-radius: 6px;
        transition: background 0.2s;
      }

      .widget-menu-btn:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .widget-body {
        flex: 1;
        padding: 12px;
        overflow: auto;
      }

      .widget-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #9ca3af;
        font-size: 0.875rem;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  showWidgetMenu(widgetId) {
    const widget = this.widgetManager.getWidgetById(widgetId);
    if (!widget) return;

    // Simple context menu (to be enhanced)
    const actions = ['Move', 'Resize', 'Configure', 'Remove'];
    const action = prompt(`Widget Menu:\n${actions.join('\n')}\n\nEnter action:`);

    if (action && action.toLowerCase() === 'remove') {
      this.widgetManager.removeWidget(widgetId);
    }
  }

  // Dock Apps
  setupDockApps() {
    const apps = document.querySelectorAll('.dock-app');

    apps.forEach(app => {
      app.addEventListener('click', () => {
        const appName = app.dataset.app;
        this.openApp(appName);
      });
    });
  }

  openApp(appName) {
    console.log('Opening app:', appName);

    // Navigate to app page
    const appRoutes = {
      search: '/pages/search.html',
      notebook: '/pages/notebook.html',
      equipment: '/pages/equipment.html',
      chemicals: '/pages/chemicals.html',
      vendors: '/pages/vendors.html',
      tasks: '/pages/tasks.html',
      settings: '/pages/settings.html'
    };

    if (appRoutes[appName]) {
      alert(`Opening ${appName} app...\n\nPage: ${appRoutes[appName]}\n\n(Pages to be created)`);
    }
  }

  // Top Bar
  setupTopBar() {
    const searchInput = document.querySelector('.topbar-search input');
    const userMenu = document.querySelector('.topbar-user');

    // Workspace dropdown is now handled via onclick in HTML

    searchInput.addEventListener('focus', () => {
      console.log('Search activated');
    });

    userMenu.addEventListener('click', () => {
      alert('User menu\n\nOptions:\n- Profile\n- Preferences\n- Sign out\n\n(To be implemented)');
    });
  }

  loadWidgets() {
    const currentWorkspace = this.workspaceManager.getCurrentWorkspace();
    if (currentWorkspace.widgets && currentWorkspace.widgets.length > 0) {
      this.widgetManager.setWidgets(currentWorkspace.widgets);

      currentWorkspace.widgets.forEach(widget => {
        this.renderWidget(widget);
      });

      console.log('Loaded', currentWorkspace.widgets.length, 'widgets');
    }
  }

  // Welcome Message
  hideWelcome() {
    const welcome = document.getElementById('welcome-message');
    if (welcome) {
      welcome.style.display = 'none';
    }
  }

  showWelcome() {
    const welcome = document.getElementById('welcome-message');
    if (welcome) {
      welcome.style.display = 'block';
    }
  }

  // Clear workspace (for testing)
  clearWorkspace() {
    if (confirm('Clear all widgets and reset workspace?')) {
      this.widgetManager.clearGrid();

      document.querySelectorAll('.widget-cell').forEach(cell => {
        const cellNumber = cell.dataset.cell;
        cell.classList.add('empty');
        cell.innerHTML = `<span style="color: #2563eb; font-weight: 600;">${cellNumber}</span>`;
      });

      this.workspaceManager.saveWorkspace();
      this.showWelcome();

      console.log('Workspace cleared');
    }
  }
}

// Initialize desktop when DOM is ready
let desktopManager;

document.addEventListener('DOMContentLoaded', () => {
  desktopManager = new DesktopManager();

  // Make available globally for debugging
  window.desktopManager = desktopManager;
  window.workspaceManager = desktopManager.workspaceManager;

  console.log('Desktop manager available as window.desktopManager');
  console.log('Workspace manager available as window.workspaceManager');
  console.log('Try: desktopManager.clearWorkspace()');
});
