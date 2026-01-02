/**
 * DesktopInitializer
 * Handles manager initialization and event listener setup
 *
 * @class
 * @description Separates initialization concerns from main DesktopManager.
 * Responsible for creating all manager instances and wiring up EventBus listeners.
 */

import { availableWidgets, gridConfig } from '../data/widgets-static.js';
import { EventBus, EventNames } from '../managers/event-bus.js';
import { StorageManager } from '../managers/storage-manager.js';
import { WorkspaceManager } from '../managers/workspace-manager.js';
import { WidgetManager } from '../managers/widget-manager.js';
import { WidgetUIController } from '../managers/widget-ui-controller.js';
import { AppUIController } from '../managers/app-ui-controller.js';
import { HotkeyManager } from '../managers/hotkey-manager.js';
import { DockManager } from '../managers/dock-manager.js';
import { MenuBarManager } from '../managers/menubar-manager.js';
import { DrawerManager } from '../managers/drawer-manager.js';
import { PerformanceMonitor } from '../managers/performance-monitor.js';
import { ErrorBoundary } from '../managers/error-boundary.js';
import { validateWidgetArray } from '../utils/validators.js';
import { createWidgetRegistry } from '../managers/widget-registry.js';

import { createLogger } from '../utils/logger.js';

// Menu bar plugins
import { LogoPlugin } from '../plugins/menubar/logo-plugin.js';
import { WorkspaceSwitcherPlugin } from '../plugins/menubar/workspace-switcher-plugin.js';
import { WorkspaceTitlePlugin } from '../plugins/menubar/workspace-title-plugin.js';
import { SearchPlugin } from '../plugins/menubar/search-plugin.js';
import { NotificationsPlugin } from '../plugins/menubar/notifications-plugin.js';
import { UserMenuPlugin } from '../plugins/menubar/user-menu-plugin.js';

const logger = createLogger('DesktopInitializer');

export class DesktopInitializer {
  // Properties
  private desktop: any; // DesktopManager (avoiding circular dependency)

  constructor(desktopManager: any) {
    this.desktop = desktopManager;
  }

  /**
   * Initialize all managers and infrastructure
   * @returns {Object} Object containing all initialized managers
   */
  initializeManagers(): any {
    const managers: any = {};

    // Initialize EventBus first (for decoupled manager communication)
    // Enable strict mode in development to catch typos and invalid events early
    const isDevelopment = import.meta.env.DEV;
    managers.eventBus = new EventBus({ strictMode: isDevelopment });
    // managers.eventBus.setDebug(true); // Uncomment for debugging

    // Initialize Error Boundary (catches and handles errors gracefully)
    managers.errorBoundary = new ErrorBoundary({
      logErrors: true,
      showUI: true,
      onError: (error, context) => {
        // Log error to analytics/monitoring service here if needed
        logger.error('Application Error:', error, context);
      }
    });

    // Make available globally for debugging
    (window as any).errorBoundary = managers.errorBoundary;

    // Initialize Performance Monitor (enabled in dev mode by default)
    managers.perfMonitor = new PerformanceMonitor({
      enabled: true,
      slowThreshold: 100,
      autoReport: true // Auto-reports performance metrics every 60s
    });

    // Make available globally for debugging
    (window as any).perfMonitor = managers.perfMonitor;

    // Initialize WidgetRegistry (central widget/app management)
    managers.widgetRegistry = createWidgetRegistry({ eventBus: managers.eventBus });

    // Validate and register all widget definitions
    const validatedWidgets = validateWidgetArray(availableWidgets, false);
    const registrationResult = managers.widgetRegistry.registerDefinitions(validatedWidgets, true);
    logger.info(`✅ WidgetRegistry: Registered ${registrationResult.registered}/${availableWidgets.length} widgets`);

    if (registrationResult.errors.length > 0) {
      logger.warn(`⚠️ WidgetRegistry: ${registrationResult.errors.length} widget(s) failed validation`);
      registrationResult.errors.forEach(error => logger.error(`  - ${error}`));
    }

    // Register app loaders for dynamic imports
    managers.widgetRegistry.registerAppLoader('equipment-app', () => import('../apps/equipment-app-module.js'));
    logger.info('✅ Registered app loaders');

    // Make available globally for debugging
    (window as any).widgetRegistry = managers.widgetRegistry;

    // Initialize Storage Manager (wrapped in error boundary)
    managers.storageManager = managers.errorBoundary.wrapComponent(
      () => new StorageManager(),
      'StorageManager',
      document.getElementById('widget-grid')
    );

    if (!managers.storageManager) {
      logger.error('Failed to initialize StorageManager');
      return null;
    }

    // Initialize WidgetManager with EventBus and WidgetRegistry
    managers.widgetManager = new WidgetManager({
      eventBus: managers.eventBus,
      storageManager: managers.storageManager,
      widgetRegistry: managers.widgetRegistry
    });

    // Initialize WidgetUIController with EventBus and WidgetRegistry
    managers.widgetUIController = new WidgetUIController({
      widgetManager: managers.widgetManager,
      gridContainer: document.getElementById('widget-grid'),
      eventBus: managers.eventBus,
      widgetRegistry: managers.widgetRegistry
    });

    // Initialize HotkeyManager first (needed by AppUIController)
    managers.hotkeyManager = new HotkeyManager();

    // Initialize AppUIController with EventBus, HotkeyManager, and WidgetRegistry
    managers.appUIController = new AppUIController({
      containerElement: document.body,
      eventBus: managers.eventBus,
      hotkeyManager: managers.hotkeyManager,
      widgetRegistry: managers.widgetRegistry
    });

    // Connect AppUIController to WidgetUIController
    managers.widgetUIController.appUIController = managers.appUIController;

    // Initialize WorkspaceManager with EventBus and WidgetRegistry
    managers.workspaceManager = new WorkspaceManager({
      eventBus: managers.eventBus,
      storageManager: managers.storageManager,
      widgetRegistry: managers.widgetRegistry
    });

    // Set AppUIController as focus provider (enables app vs workspace routing)
    managers.hotkeyManager.setFocusProvider(managers.appUIController);

    // Register workspace-level hotkeys
    this.registerWorkspaceHotkeys(managers);

    // Initialize DockManager with EventBus
    managers.dockManager = new DockManager({
      storageManager: managers.storageManager,
      eventBus: managers.eventBus
    });

    // Initialize MenuBarManager (plugin-based menu bar)
    // Create dependency container for plugins (eliminates need for window.* access)
    const menuBarDependencies = {
      workspaceManager: managers.workspaceManager,
      hotkeyManager: managers.hotkeyManager,
      storageManager: managers.storageManager,
      eventBus: managers.eventBus,
      widgetRegistry: managers.widgetRegistry
    };

    managers.menuBarManager = new MenuBarManager({
      container: document.getElementById('top-bar'),
      userRole: 'user', // TODO: Get from actual user session
      dependencies: menuBarDependencies
    });

    // Register all menu bar plugin classes
    managers.menuBarManager.registerPluginClass('logo', LogoPlugin);
    managers.menuBarManager.registerPluginClass('workspace-switcher', WorkspaceSwitcherPlugin);
    managers.menuBarManager.registerPluginClass('workspace-title', WorkspaceTitlePlugin);
    managers.menuBarManager.registerPluginClass('search', SearchPlugin);
    managers.menuBarManager.registerPluginClass('notifications', NotificationsPlugin);
    managers.menuBarManager.registerPluginClass('user-menu', UserMenuPlugin);

    // Initialize DrawerManager with EventBus and validatedWidgets from registry
    managers.drawerManager = new DrawerManager({
      eventBus: managers.eventBus,
      widgetDefinitions: validatedWidgets
    });

    // Setup global wrapper functions for HTML onclick handlers (backward compatibility)
    (window as any).openWidgetDrawer = () => managers.drawerManager.open();
    (window as any).closeWidgetDrawer = () => managers.drawerManager.close();

    // Setup grid drop handlers for drag-and-drop from drawer
    this.setupGridDropHandlers(managers);

    return managers;
  }

  /**
   * Setup drag-and-drop handlers for grid cells
   * Allows dragging widgets from drawer directly to specific grid cells
   */
  setupGridDropHandlers(managers: any): void {
    const gridCells = document.querySelectorAll('.widget-cell');

    gridCells.forEach(cell => {
      // Allow drop
      cell.addEventListener('dragover', (e: any) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        // Add visual feedback
        if (!cell.classList.contains('occupied')) {
          cell.classList.add('drop-target');
        }
      });

      // Remove visual feedback when leaving
      cell.addEventListener('dragleave', (e: any) => {
        cell.classList.remove('drop-target');
      });

      // Handle drop
      cell.addEventListener('drop', (e: any) => {
        e.preventDefault();
        cell.classList.remove('drop-target');

        // Get widget data from drag event
        const widgetData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const cellNumber = parseInt((cell as any).dataset.cell);

        // Check if widget can fit at this position
        if (managers.widgetManager.canPlaceWidget(cellNumber, widgetData.cols, widgetData.rows)) {
          managers.widgetManager.addWidget(widgetData, cellNumber);
          managers.drawerManager.close();
        } else {
          alert(`Cannot place ${widgetData.name} here - not enough space or cells occupied`);
        }
      });
    });

    logger.info('✅ Grid drop handlers installed for drag-and-drop');
  }

  /**
   * Setup event listeners (replaces callback hell)
   * Each manager emits events, DesktopManager orchestrates responses
   */
  setupEventListeners(managers: any): void {
    const desktop = this.desktop;

    // Performance Monitoring: Track all events
    // Create a wrapper for eventBus.emit to auto-track events
    const originalEmit = managers.eventBus.emit.bind(managers.eventBus);
    managers.eventBus.emit = (eventName, data) => {
      managers.perfMonitor.trackEvent(eventName);
      return originalEmit(eventName, data);
    };

    // Widget Events
    managers.eventBus.on(EventNames.WIDGET_ADDED, (widget) => {
      // IMPORTANT: Only handle widget DEFINITIONS from drawer, not INSTANCES
      // Widget instances have an id like "instance-123456" and a widgetDefId
      // Widget definitions from drawer have a regular id like "clock", "weather", etc.
      const isInstance = widget.id && widget.id.startsWith('instance-');
      const hasInstanceFields = widget.widgetDefId && widget.userId;

      if (isInstance || hasInstanceFields) {
        // This is already a widget instance (just created by widgetManager.addWidget)
        // Just render it, don't add it again!
        logger.info('Widget instance created, rendering:', widget.id);
        desktop.renderWidget(widget);
        desktop.hideWelcome();
        return;
      }

      // This is a widget DEFINITION from the drawer - create an instance
      logger.info('Adding widget from drawer:', widget.id);
      const cell = managers.widgetManager.findAvailableCell(widget.cols, widget.rows);
      if (cell) {
        // This will emit widget:added again with the INSTANCE, which will be caught above
        managers.widgetManager.addWidget(widget, cell);
        desktop.hideWelcome();
      } else {
        alert(`No space available for ${widget.name} (${widget.size})`);
      }
    });

    managers.eventBus.on(EventNames.WIDGET_REMOVED, (widgetId) => {
      // Widget deletion is handled by WidgetManager
      logger.info('Widget deleted:', widgetId);
      if (managers.widgetManager.widgets.length === 0) {
        desktop.showWelcome();
      }
    });

    managers.eventBus.on(EventNames.WIDGET_MOVED, (data) => {
      // Re-render widget after it's moved
      desktop.renderWidget(data.widget);
    });

    // Workspace Events
    managers.eventBus.on(EventNames.WORKSPACE_SWITCHED, (workspace) => {
      managers.perfMonitor.startTimer('workspace-switch');

      // Clear grid and load widgets for new workspace
      managers.widgetManager.clearGrid();
      managers.widgetManager.setCurrentWorkspace(workspace.id);
      const instances = managers.storageManager.getWidgetInstancesForWorkspace(workspace.id);
      managers.widgetManager.setWidgets(instances || []);

      // Render widgets and show/hide welcome
      if (instances && instances.length > 0) {
        instances.forEach(widget => desktop.renderWidget(widget));
        desktop.hideWelcome();
      } else {
        desktop.showWelcome();
      }

      const switchTime = managers.perfMonitor.endTimer('workspace-switch');
      logger.info(`Switched to workspace "${workspace.name}" (${switchTime.toFixed(0)}ms)`);
    });

    // Dock Events
    managers.eventBus.on(EventNames.DOCK_APP_CLICKED, (app) => {
      // Handle dock app click - open app
      desktop.openAppFromDock(app);
    });

    managers.eventBus.on(EventNames.DOCK_WIDGET_ADDED, (widget) => {
      // Add widget to dock (from wiggle mode)
      if (managers.dockManager) {
        managers.dockManager.addApp({
          id: widget.widgetDefId || widget.id,
          name: widget.name,
          icon: widget.icon,
          type: 'app',
          cols: 1,
          rows: 1
        });
      }
    });

    // App Events
    managers.eventBus.on(EventNames.APP_OPENED, ({ instanceId, appId }) => {
      logger.info(`App opened: ${appId} (${instanceId})`);
    });

    managers.eventBus.on(EventNames.APP_CLOSED, ({ instanceId, appId }) => {
      logger.info(`App closed: ${appId} (${instanceId})`);
    });

    managers.eventBus.on(EventNames.APP_FOCUSED, ({ instanceId, appId }) => {
      logger.info(`App focused: ${instanceId}`);
    });

    // UI Events
    managers.eventBus.on(EventNames.WELCOME_SHOW, () => {
      desktop.showWelcome();
    });

    managers.eventBus.on(EventNames.WELCOME_HIDE, () => {
      desktop.hideWelcome();
    });

    managers.eventBus.on(EventNames.GRID_CLEARED, () => {
      managers.widgetManager.clearGrid();
    });
  }

  /**
   * Register workspace-level hotkeys
   * These are active when no app has focus
   */
  registerWorkspaceHotkeys(managers: any): void {
    const desktop = this.desktop;

    // Workspace switching: Ctrl+1 through Ctrl+9
    for (let i = 1; i <= 9; i++) {
      managers.hotkeyManager.registerWorkspaceHotkey(
        `Ctrl+${i}`,
        () => {
          const workspaces = managers.workspaceManager.workspaces;
          if (i <= workspaces.length) {
            const workspace = workspaces[i - 1];
            managers.workspaceManager.switchWorkspace(workspace.id);
            logger.info(`Switched to workspace ${i}: ${workspace.name}`);
          }
        },
        `Switch to workspace ${i}`
      );
    }

    // Open widget drawer: Ctrl+N
    managers.hotkeyManager.registerWorkspaceHotkey(
      'Ctrl+N',
      () => {
        managers.drawerManager.open();
      },
      'Open widget drawer'
    );

    // Close app (ESC) - when app has focus, this will be handled by app-specific hotkey
    // But we register it here as fallback
    managers.hotkeyManager.registerWorkspaceHotkey(
      'Escape',
      () => {
        // If any app is open, close it
        if (managers.appUIController.activeAppInstanceId) {
          managers.appUIController.closeApp(managers.appUIController.activeAppInstanceId);
        }
      },
      'Close active app'
    );

    logger.info('✅ Workspace hotkeys registered (Ctrl+1-9, Ctrl+N, ESC)');
  }
}
