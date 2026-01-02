/**
 * WidgetUIController
 * Handles widget UI rendering and state management
 *
 * Responsibilities:
 * - Render widget containers and chrome
 * - Manage widget content and visual states
 * - Coordinate with WidgetInteractions and WidgetWiggleMode
 * - Trigger app launches based on widget configuration
 *
 * Separation of Concerns:
 * - WidgetManager: CRUD operations, data management, positioning
 * - WidgetInteractions: Drag/drop, click detection, touch events
 * - WidgetWiggleMode: Wiggle mode state and delete functionality
 * - WidgetUIController (this file): UI rendering, content, state management
 */

import { WidgetInteractions } from './widget-interactions.js';
import { WidgetWiggleMode } from './widget-wiggle-mode.js';
import { gridConfig, calculateOccupiedCells } from '../data/widgets-static.js';
import { domHelper } from '../utils/dom-helpers.js';
import { createLogger } from '../utils/logger.js';
import type {
  WidgetInstance,
  WidgetDefinition,
  WidgetUIControllerOptions,
  EventBus,
  DOMHelper,
  WidgetRegistry
} from '../types/index.js';
import { WidgetType, HeaderDisplay } from '../types/index.js';

const logger = createLogger('WidgetUIController');

export class WidgetUIController {
  // Properties
  private appUIController: any; // AppUIController (avoiding circular dependency)
  private widgetManager: any; // WidgetManager (avoiding circular dependency)
  private eventBus: EventBus | null;
  private dom: DOMHelper;
  private gridContainer: HTMLElement | null;
  private widgetStates: Map<string, string>;
  private wiggleMode: WidgetWiggleMode;
  private interactions: WidgetInteractions;
  private widgetRegistry: WidgetRegistry | null;

  constructor(options: WidgetUIControllerOptions = {}) {
    this.appUIController = options.appUIController; // Reference to AppUIController
    this.widgetManager = options.widgetManager; // Reference to WidgetManager
    this.eventBus = options.eventBus || null;
    this.dom = options.domHelper || domHelper;
    this.gridContainer = options.gridContainer || this.dom.getElementById('widget-grid');
    this.widgetRegistry = options.widgetRegistry || null; // Reference to WidgetRegistry

    // State tracking
    this.widgetStates = new Map(); // Track loading, error, etc.

    // Initialize sub-controllers with EventBus
    this.wiggleMode = new WidgetWiggleMode({
      widgetManager: this.widgetManager,
      gridContainer: this.gridContainer,
      domHelper: this.dom,
      eventBus: this.eventBus
    });

    this.interactions = new WidgetInteractions({
      widgetManager: this.widgetManager,
      wiggleModeController: this.wiggleMode,
      gridContainer: this.gridContainer,
      domHelper: this.dom,
      eventBus: this.eventBus
    });

    // Setup EventBus listeners for widget interactions
    this.setupEventListeners();

    logger.info('Initialized');
  }

  /**
   * Setup EventBus listeners for widget interactions
   */
  setupEventListeners(): void {
    if (!this.eventBus) return;

    // Handle widget clicks
    this.eventBus.on('widget:clicked', ({ widget, widgetDefinition, event }) => {
      this.handleWidgetClick(widget, widgetDefinition, event);
    });

    // Handle widget double-clicks
    this.eventBus.on('widget:double-clicked', ({ widget, widgetDefinition, event }) => {
      this.handleWidgetDoubleClick(widget, widgetDefinition, event);
    });

    // Handle widget long-press
    this.eventBus.on('widget:long-pressed', ({ widget, widgetDefinition, event }) => {
      this.handleWidgetLongPress(widget, widgetDefinition, event);
    });
  }

  /**
   * Render widget into grid cell
   * @param {Object} widgetInstance - Widget instance data
   * @param {Object} widgetDefinition - Widget definition (optional, looked up from registry if not provided)
   * @returns {HTMLElement} Rendered widget element
   */
  renderWidget(widgetInstance: WidgetInstance, widgetDefinition: WidgetDefinition | null = null): HTMLElement | null {
    // Look up definition from registry if not provided
    if (!widgetDefinition && this.widgetRegistry) {
      const widgetDefId = widgetInstance.widgetDefId || widgetInstance.id;
      widgetDefinition = this.widgetRegistry.getDefinition(widgetDefId);

      if (!widgetDefinition) {
        logger.error(`Widget definition not found for "${widgetDefId}"`);
        return null;
      }
    }

    logger.info(`Rendering widget ${widgetInstance.id}`, widgetInstance);

    // CRITICAL FIX: Remove any existing widget with the same ID to prevent duplication
    const existingWidget = this.dom.querySelector(`[data-widget-id="${widgetInstance.id}"]`);
    if (existingWidget) {
      logger.info(`Removing existing widget ${widgetInstance.id} before re-rendering`);

      // Get the cells that were occupied by the old widget
      const oldParentCell = existingWidget.closest('.widget-cell');
      if (oldParentCell) {
        const oldCellNumber = parseInt(oldParentCell.dataset.cell);
        const oldOccupiedCells = calculateOccupiedCells(oldCellNumber, widgetInstance.cols, widgetInstance.rows);

        // Mark old cells as empty
        oldOccupiedCells.forEach(cellNum => {
          const cell = this.dom.querySelector(`[data-cell="${cellNum}"]`);
          if (cell) {
            this.dom.toggleClass(cell, 'empty', true);
            this.dom.toggleClass(cell, 'occupied-span', false);
            this.dom.clearChildren(cell);
          }
        });
      }

      // Remove the widget element
      this.dom.removeElement(existingWidget);
    }

    const startCell = widgetInstance.cell;
    const occupiedCells = widgetInstance.occupiedCells ||
                          calculateOccupiedCells(startCell, widgetInstance.cols, widgetInstance.rows);

    // Get the first cell (top-left)
    const firstCell = this.dom.querySelector(`[data-cell="${startCell}"]`);
    if (!firstCell) {
      logger.error(`Cell ${startCell} not found`);
      return null;
    }

    // Mark all occupied cells as non-empty
    occupiedCells.forEach(cellNum => {
      const cell = this.dom.querySelector(`[data-cell="${cellNum}"]`);
      if (cell) {
        this.dom.toggleClass(cell, 'empty', false);
        if (cellNum !== startCell) {
          this.dom.toggleClass(cell, 'occupied-span', true); // Mark as part of multi-cell widget
          this.dom.clearChildren(cell); // Clear spanned cells
        }
      }
    });

    // Create widget container
    const widgetElement = this.createWidgetElement(widgetInstance, widgetDefinition);

    // Add to first cell
    firstCell.appendChild(widgetElement);

    // Apply multi-cell spanning styles dynamically
    if (widgetInstance.cols > 1 || widgetInstance.rows > 1) {
      // Calculate widget dimensions based on grid
      const width = widgetInstance.cols * gridConfig.cellSize + (widgetInstance.cols - 1) * gridConfig.gap;
      const height = widgetInstance.rows * gridConfig.cellSize + (widgetInstance.rows - 1) * gridConfig.gap;

      // CRITICAL: Position widget at top-left of first cell, not centered
      widgetElement.style.width = `${width}px`;
      widgetElement.style.height = `${height}px`;
      widgetElement.style.position = 'absolute';
      widgetElement.style.left = '0';
      widgetElement.style.top = '0';
      widgetElement.style.zIndex = '10';
      widgetElement.style.margin = '0';
    }

    // Setup interactions via WidgetInteractions controller
    this.interactions.setupInteractions(widgetElement, widgetInstance, widgetDefinition);

    // Initialize state
    this.setWidgetState(widgetInstance.id, 'active');

    return widgetElement;
  }

  /**
   * Create widget DOM element
   * @param {Object} widgetInstance - Widget instance data
   * @param {Object} widgetDefinition - Widget definition
   * @returns {HTMLElement} Widget element
   */
  createWidgetElement(widgetInstance: WidgetInstance, widgetDefinition: WidgetDefinition): HTMLElement {
    const cols = widgetInstance.cols;
    const rows = widgetInstance.rows;

    // Check for explicit headerDisplay configuration
    const headerDisplay = widgetDefinition.headerDisplay || 'auto';

    // Handle explicit header display modes
    if (headerDisplay !== 'auto') {
      if (headerDisplay === HeaderDisplay.NEVER) {
        // Treat as launcher (no header)
        if (cols === 1 && rows === 1) {
          return widgetInstance.type === WidgetType.APP || widgetDefinition.launchesApp
            ? this.createLauncherWidget(widgetInstance, widgetDefinition)
            : this.createMinimalWidget(widgetInstance, widgetDefinition);
        }
        // Larger widgets with no header - use full widget with content only
        return this.createFullWidget(widgetInstance, widgetDefinition, 'never');
      }

      if (headerDisplay === HeaderDisplay.HOVER) {
        // Force hover mode for all sizes
        return this.createFullWidget(widgetInstance, widgetDefinition, 'hover');
      }

      if (headerDisplay === HeaderDisplay.ALWAYS) {
        // Force always-visible header for all sizes
        return this.createFullWidget(widgetInstance, widgetDefinition, 'always');
      }
    }

    // Auto mode: Size-based logic (default behavior)
    // 1×1: Minimal display
    if (cols === 1 && rows === 1) {
      // App launcher (icon only)
      if (widgetInstance.type === WidgetType.APP || widgetDefinition.launchesApp) {
        return this.createLauncherWidget(widgetInstance, widgetDefinition);
      }
      // Minimal data widget (icon + value)
      return this.createMinimalWidget(widgetInstance, widgetDefinition);
    }

    // N×1: Full widget with hover-only header
    if (rows === 1) {
      return this.createFullWidget(widgetInstance, widgetDefinition, 'hover');
    }

    // N×2+: Full widget with always-visible header
    return this.createFullWidget(widgetInstance, widgetDefinition, 'always');
  }

  /**
   * Create widget header (title, icon, controls)
   * @param {Object} widgetInstance - Widget instance
   * @param {Object} widgetDefinition - Widget definition
   * @returns {HTMLElement} Header element
   */
  createWidgetHeader(widgetInstance: WidgetInstance, widgetDefinition: WidgetDefinition): HTMLElement {
    const header = this.dom.createElement('div', 'widget-header');

    // Icon
    const icon = this.dom.createIcon(
      widgetInstance.icon || widgetDefinition.icon || '📦',
      'widget-icon'
    );
    header.appendChild(icon);

    // Title
    const title = this.dom.createText(
      widgetInstance.name || widgetDefinition.name,
      'div',
      'widget-title'
    );
    header.appendChild(title);

    // Controls
    const controls = this.dom.createElement('div', 'widget-controls');

    // Refresh button (if widget has live content)
    if (widgetDefinition.hasLiveContent) {
      const refreshBtn = this.dom.createButton(
        '↻',
        'widget-control-btn refresh-btn',
        (e) => {
          e.stopPropagation();
          this.refreshWidget(widgetInstance.id);
        }
      );
      controls.appendChild(refreshBtn);
    }

    // Settings button
    const settingsBtn = this.dom.createButton(
        '⚙',
        'widget-control-btn settings-btn',
        (e) => {
          e.stopPropagation();
          this.openWidgetSettings(widgetInstance.id);
        }
      );
      controls.appendChild(settingsBtn);
  
      header.appendChild(controls);
  
      return header;
    }
  
    /**
     * Create widget footer (controls, actions)
     * @param {Object} widgetInstance - Widget instance
     * @param {Object} widgetDefinition - Widget definition
     * @returns {HTMLElement} Footer element
     */
    createWidgetFooter(widgetInstance, widgetDefinition) {
      const footer = this.dom.createElement('div', 'widget-footer');
  
      // Add custom controls based on widget type
      // TODO: Implement widget-specific controls
  
      return footer;
    }
  
    /**
     * Create 1×1 launcher widget (icon only, for apps)
     * @param {Object} widgetInstance - Widget instance
     * @param {Object} widgetDefinition - Widget definition
     * @returns {HTMLElement} Widget element
     */
    createLauncherWidget(widgetInstance, widgetDefinition) {
      const widget = this.dom.createElement('div', 'widget widget-launcher', {
        id: widgetInstance.id,
        dataset: {
          widgetId: widgetInstance.id,
          widgetDefId: widgetInstance.widgetDefId,
          type: widgetInstance.type,
          cols: widgetInstance.cols,
          rows: widgetInstance.rows,
          launchesApp: widgetDefinition.launchesApp || widgetInstance.appId,
          launchTrigger: widgetDefinition.launchTrigger || 'doubleClick'
        },
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      });
  
      // Apply size classes
      this.dom.toggleClass(widget, `widget-${widgetInstance.size}`, true);
      this.dom.toggleClass(widget, `cols-${widgetInstance.cols}`, true);
      this.dom.toggleClass(widget, `rows-${widgetInstance.rows}`, true);
      this.dom.toggleClass(widget, 'launchable', true);
  
      // Icon only - large, centered
      const icon = this.dom.createIcon(
        widgetInstance.icon || widgetDefinition.icon || '📦',
        'widget-launcher-icon'
      );
      icon.style.fontSize = '3rem';
      widget.appendChild(icon);
  
      return widget;
    }
  
    /**
     * Create 1×1 minimal widget (icon + data value)
     * @param {Object} widgetInstance - Widget instance
     * @param {Object} widgetDefinition - Widget definition
     * @returns {HTMLElement} Widget element
     */
    createMinimalWidget(widgetInstance, widgetDefinition) {
      const widget = this.dom.createElement('div', 'widget widget-minimal', {
        id: widgetInstance.id,
        dataset: {
          widgetId: widgetInstance.id,
          widgetDefId: widgetInstance.widgetDefId,
          type: widgetInstance.type,
          cols: widgetInstance.cols,
          rows: widgetInstance.rows
        },
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem'
        }
      });
  
      // Apply size classes
      this.dom.toggleClass(widget, `widget-${widgetInstance.size}`, true);
      this.dom.toggleClass(widget, `cols-${widgetInstance.cols}`, true);
      this.dom.toggleClass(widget, `rows-${widgetInstance.rows}`, true);
  
      // Icon
      const icon = this.dom.createIcon(
        widgetInstance.icon || widgetDefinition.icon || '📊',
        'widget-minimal-icon'
      );
      icon.style.fontSize = '1.5rem';
  
      // Data value
      const value = this.dom.createText('--', 'div', 'widget-minimal-value'); // Placeholder
      value.id = `${widgetInstance.id}-content`;
      value.style.fontSize = '1.25rem';
      value.style.fontWeight = 'bold';
  
      this.dom.appendChildren(widget, [icon, value]);
  
      return widget;
    }
  
    /**
     * Create full widget with header and content
     * @param {Object} widgetInstance - Widget instance
     * @param {Object} widgetDefinition - Widget definition
     * @param {string} headerMode - 'always', 'hover', or 'never'
     * @returns {HTMLElement} Widget element
     */
    createFullWidget(widgetInstance, widgetDefinition, headerMode = 'always') {
      const widget = this.dom.createElement('div', 'widget', {
        id: widgetInstance.id,
        dataset: {
          widgetId: widgetInstance.id,
          widgetDefId: widgetInstance.widgetDefId,
          type: widgetInstance.type,
          cols: widgetInstance.cols,
          rows: widgetInstance.rows
        }
      });
  
      // Apply size classes
      this.dom.toggleClass(widget, `widget-${widgetInstance.size}`, true);
      this.dom.toggleClass(widget, `cols-${widgetInstance.cols}`, true);
      this.dom.toggleClass(widget, `rows-${widgetInstance.rows}`, true);
  
      // Header mode class
      if (headerMode === HeaderDisplay.HOVER) {
        this.dom.toggleClass(widget, 'header-hover', true);
      } else if (headerMode === HeaderDisplay.NEVER) {
        this.dom.toggleClass(widget, 'header-never', true);
      }
  
      // Launchable indicator
      if (widgetDefinition.launchesApp) {
        this.dom.toggleClass(widget, 'launchable', true);
        widget.dataset.launchesApp = widgetDefinition.launchesApp;
        widget.dataset.launchTrigger = widgetDefinition.launchTrigger || 'doubleClick';
      }
  
      // Widget header (skip if headerMode is 'never')
      let header = null;
      if (headerMode !== 'never') {
        header = this.createWidgetHeader(widgetInstance, widgetDefinition);
        widget.appendChild(header);
      }
  
      // Widget content area
      const content = this.dom.createElement('div', 'widget-content', {
        id: `${widgetInstance.id}-content`
      });

      // Load widget component if specified
      if (widgetDefinition.component) {
        this.loadWidgetComponent(widgetDefinition.component, content, widgetInstance, widgetDefinition);
      } else {
        // Add placeholder message - no apps connected yet
        content.innerHTML = `<div class="widget-placeholder">No connected applications to widget ${widgetInstance.id}</div>`;
      }

      widget.appendChild(content);
  
      // Widget footer (optional - for controls)
      if (widgetDefinition.hasControls) {
        const footer = this.createWidgetFooter(widgetInstance, widgetDefinition);
        widget.appendChild(footer);
      }
  
      // Setup hover behavior for hover mode widgets
      if (headerMode === HeaderDisplay.HOVER && header) {
        this.setupHoverHeader(widget, header);
      }
  
      return widget;
    }
  
    /**
     * Setup hover-to-reveal header behavior
     * @param {HTMLElement} widget - Widget element
     * @param {HTMLElement} header - Header element
     */
    setupHoverHeader(widget, header) {
      let hoverTimer = null;
  
      // Hide header initially
      Object.assign(header.style, {
        opacity: '0',
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '20',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)'
      });
  
      this.dom.addEventListener(widget, 'mouseenter', () => {
        hoverTimer = setTimeout(() => {
          header.style.opacity = '1';
          header.style.pointerEvents = 'auto';
        }, 500);
      });
  
      this.dom.addEventListener(widget, 'mouseleave', () => {
        clearTimeout(hoverTimer);
        header.style.opacity = '0';
        header.style.pointerEvents = 'none';
      });
    }
  
    /**
     * Handle widget click
     * @param {Object} widgetInstance - Widget instance
     * @param {Object} widgetDefinition - Widget definition
     * @param {Event} event - Click event
     */
    handleWidgetClick(widgetInstance: WidgetInstance, widgetDefinition: WidgetDefinition, event: Event): void {
      logger.info(`Widget clicked: ${widgetInstance.id}`);
  
      // Only app icons (1×1 launchers) open on single click
      if (widgetDefinition.type === WidgetType.APP) {
        logger.info(`Launching app ${widgetDefinition.id}`);
        this.launchApp(widgetDefinition);
        return;
      }
  
      // Functional widgets require double-click (don't launch on single click)
      logger.info(`Widget requires double-click to launch app`);
    }
  
    /**
     * Handle widget double-click
     * @param {Object} widgetInstance - Widget instance
     * @param {Object} widgetDefinition - Widget definition
     * @param {Event} event - Click event
     */
    handleWidgetDoubleClick(widgetInstance: WidgetInstance, widgetDefinition: WidgetDefinition, event: Event): void {
      logger.info(`Widget double-clicked: ${widgetInstance.id}`);
  
      // If it's an app (1×1 launcher), launch itself
      if (widgetDefinition.type === WidgetType.APP) {
        logger.info(`Launching app ${widgetDefinition.id}`);
        this.launchApp(widgetDefinition);
        return;
      }
  
      // If it's a widget with an associated app, launch that app
      if (widgetDefinition.launchesApp) {
        this.launchAppFromWidget(widgetInstance, widgetDefinition);
      }
    }
  
    /**
     * Launch app directly (for app-type widgets)
     * @param {Object} appDefinition - App definition
     */
    async launchApp(appDefinition: WidgetDefinition): Promise<void> {
      if (!this.appUIController) {
        logger.error('Cannot launch app - AppUIController not available');
        return;
      }

      logger.info(`Launching app ${appDefinition.id} directly`);

      // Get app's default settings
      const instanceSettings = {
        displayMode: appDefinition.displayMode,
        animation: appDefinition.animation,
        multiInstance: appDefinition.multiInstance,
        showCloseButton: appDefinition.showCloseButton,
        showMinimizeButton: appDefinition.showMinimizeButton,
        dock: appDefinition.dock,
        menuBar: appDefinition.menuBar,
        sideNav: appDefinition.sideNav,
        dimensions: appDefinition.dimensions,
        position: appDefinition.position
      };

      // Launch the app (now async)
      await this.appUIController.openApp(appDefinition.id, instanceSettings);
    }
  
    /**
     * Handle widget long press
     * @param {Object} widgetInstance - Widget instance
     * @param {Object} widgetDefinition - Widget definition
     * @param {Event} event - Press event
     */
    handleWidgetLongPress(widgetInstance: WidgetInstance, widgetDefinition: WidgetDefinition, event: Event): void {
      logger.info(`Widget long-pressed: ${widgetInstance.id}`);
  
      // Check if widget should launch app on long press
      if (widgetDefinition.launchTrigger === 'longPress' && widgetDefinition.launchesApp) {
        this.launchAppFromWidget(widgetInstance, widgetDefinition);
      }
    }
  
    /**
     * Launch app from widget
     * @param {Object} widgetInstance - Widget instance
     * @param {Object} widgetDefinition - Widget definition
     */
    async launchAppFromWidget(widgetInstance: WidgetInstance, widgetDefinition: WidgetDefinition): Promise<void> {
      if (!this.appUIController) {
        logger.error('Cannot launch app - AppUIController not available');
        return;
      }

      const appId = widgetDefinition.launchesApp;
      if (!appId) {
        logger.error('Widget does not specify launchesApp');
        return;
      }

      logger.info(`Launching app ${appId} from widget ${widgetInstance.id}`);

      // Get widget element for animation source
      const widgetElement = this.dom.getElementById(widgetInstance.id);

      // Get instance settings override from widget definition
      const instanceSettings = widgetDefinition.instanceSettingsOverride || {};

      // Open app (now async)
      await this.appUIController.openApp(appId, instanceSettings, widgetElement);
    }
  
    /**
     * Set widget state (active, loading, error, etc.)
     * @param {string} widgetId - Widget ID
     * @param {string} state - State name
     */
    setWidgetState(widgetId: string, state: string): void {
      const widgetElement = this.dom.getElementById(widgetId);
      if (!widgetElement) return;
  
      // Remove all state classes
      this.dom.toggleClass(widgetElement, 'active', false);
      this.dom.toggleClass(widgetElement, 'loading', false);
      this.dom.toggleClass(widgetElement, 'error', false);
      this.dom.toggleClass(widgetElement, 'inactive', false);
  
      // Add new state class
      this.dom.toggleClass(widgetElement, state, true);
  
      // Store state
      this.widgetStates.set(widgetId, state);
  
      logger.info(`Widget ${widgetId} state changed to '${state}'`);
    }
  
    /**
     * Update widget content
     * @param {string} widgetId - Widget ID
     * @param {string|HTMLElement} content - Content to display
     */
    updateWidgetContent(widgetId: string, content: string | HTMLElement): void {
      const contentElement = this.dom.getElementById(`${widgetId}-content`);
      if (!contentElement) {
        logger.error(`Content element not found for widget ${widgetId}`);
        return;
      }
  
      if (typeof content === 'string') {
        contentElement.innerHTML = content;
      } else {
        this.dom.clearChildren(contentElement);
        contentElement.appendChild(content);
      }
  
      this.setWidgetState(widgetId, 'active');
    }
  
    /**
     * Show loading state
     * @param {string} widgetId - Widget ID
     */
    showLoading(widgetId: string): void {
      this.setWidgetState(widgetId, 'loading');
      this.updateWidgetContent(widgetId, '<div class="widget-loading">Loading...</div>');
    }

    /**
     * Show error state
     * @param {string} widgetId - Widget ID
     * @param {string} message - Error message
     */
    showError(widgetId: string, message: string): void {
      this.setWidgetState(widgetId, 'error');
      this.updateWidgetContent(widgetId, `<div class="widget-error">${message}</div>`);
    }

    /**
     * Refresh widget data
     * @param {string} widgetId - Widget ID
     */
    async refreshWidget(widgetId: string): Promise<void> {
      logger.info(`Refreshing widget ${widgetId}`);
      this.showLoading(widgetId);
  
      // TODO: Call widget's data refresh method
      // This will be implemented when widget data loading is built
  
      setTimeout(() => {
        this.setWidgetState(widgetId, 'active');
      }, 500);
    }
  
    /**
   * Open widget settings
   * @param {string} widgetId - Widget ID
   */
  openWidgetSettings(widgetId: string): void {
    logger.info(`Opening settings for widget ${widgetId}`);
    // TODO: Implement settings modal/panel
  }

  /**
   * Remove widget from UI
   * @param {string} widgetId - Widget ID
   */
  removeWidget(widgetId: string): void {
    const widgetElement = this.dom.getElementById(widgetId);
    if (!widgetElement) return;

    // Animate out
    this.dom.toggleClass(widgetElement, 'removing', true);

    setTimeout(() => {
      this.dom.removeElement(widgetElement);
      this.widgetStates.delete(widgetId);
    }, 300);
  }

  /**
   * Get widget state
   * @param {string} widgetId - Widget ID
   * @returns {string} Current state
   */
  getWidgetState(widgetId: string): string {
    return this.widgetStates.get(widgetId) || 'inactive';
  }

  /**
   * Load widget component dynamically
   * @param {string} componentName - Name of the widget component
   * @param {HTMLElement} container - Container element for the widget
   * @param {Object} widgetInstance - Widget instance data
   * @param {Object} widgetDefinition - Widget definition
   */
  async loadWidgetComponent(
    componentName: string,
    container: HTMLElement,
    widgetInstance: WidgetInstance,
    widgetDefinition: WidgetDefinition
  ): Promise<void> {
    try {
      logger.info(`Loading widget component: ${componentName}`);

      // Dynamic import of widget component
      let ComponentClass;

      switch (componentName) {
        case 'EquipmentWidget':
          const { EquipmentWidget } = await import('../widgets/EquipmentWidget.js');
          ComponentClass = EquipmentWidget;
          break;

        // Add more widget components here as needed
        // case 'ChemicalsWidget':
        //   const { ChemicalsWidget } = await import('../widgets/ChemicalsWidget.js');
        //   ComponentClass = ChemicalsWidget;
        //   break;

        default:
          logger.error(`Unknown widget component: ${componentName}`);
          container.innerHTML = `<div class="widget-error">Widget component "${componentName}" not found</div>`;
          return;
      }

      // Instantiate the widget component
      if (ComponentClass) {
        // Create update config callback that persists changes to storage
        const updateConfigCallback = (newConfig: Record<string, any>) => {
          if (this.widgetManager) {
            this.widgetManager.updateWidget(widgetInstance.id, { config: newConfig });
            logger.info(`Widget ${widgetInstance.id} config updated:`, newConfig);
          }
        };

        // Pass widget instance and update callback to widget constructor
        const widgetComponent = new ComponentClass(container, widgetInstance, updateConfigCallback);

        // Store reference for refresh/cleanup
        if (!container.dataset.widgetComponent) {
          container.dataset.widgetComponent = componentName;
          (container as any).__widgetComponentInstance = widgetComponent;
        }

        logger.info(`Widget component ${componentName} loaded successfully for instance ${widgetInstance.id}`);
      }
    } catch (error) {
      logger.error(`Failed to load widget component ${componentName}:`, error);
      container.innerHTML = `<div class="widget-error">Failed to load widget: ${error.message}</div>`;
    }
  }
}

export default WidgetUIController;
