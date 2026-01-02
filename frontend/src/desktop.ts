// Symbiosis Desktop Manager (Refactored)
// Uses orchestrators for initialization, dock management, and memory management

// Import from phoenix-core
import {
  DesktopInitializer,
  DesktopDockOrchestrator,
  DesktopMemoryManager
} from 'phoenix-core';

// Import Symbiosis-specific data
import {
  availableApps,
  gridConfig,
  calculateOccupiedCells,
  getWidgetById
} from './data/widgets-static.js';

// Import logger from phoenix-core
import { createLogger } from 'phoenix-core';

const logger = createLogger('DesktopManager');

class DesktopManager {
  // Orchestrators
  initializer: any;
  dockOrchestrator: any;
  memoryManager: any;

  // Core managers
  eventBus: any;
  errorBoundary: any;
  perfMonitor: any;
  storageManager: any;

  // Feature managers
  widgetManager: any;
  widgetUIController: any;
  appUIController: any;
  workspaceManager: any;
  hotkeyManager: any;
  dockManager: any;
  menuBarManager: any;
  drawerManager: any;

  constructor() {
    // Initialize orchestrators
    this.initializer = new DesktopInitializer(this);

    // Initialize all managers via orchestrator
    const managers = this.initializer.initializeManagers();

    if (!managers) {
      logger.error('Failed to initialize managers');
      return;
    }

    // Store manager references
    this.eventBus = managers.eventBus;
    this.errorBoundary = managers.errorBoundary;
    this.perfMonitor = managers.perfMonitor;
    this.storageManager = managers.storageManager;
    this.widgetManager = managers.widgetManager;
    this.widgetUIController = managers.widgetUIController;
    this.appUIController = managers.appUIController;
    this.workspaceManager = managers.workspaceManager;
    this.hotkeyManager = managers.hotkeyManager;
    this.dockManager = managers.dockManager;
    this.menuBarManager = managers.menuBarManager;
    this.drawerManager = managers.drawerManager;

    // Make managers available globally BEFORE menu bar plugins initialize
    // Plugins need access to window.workspaceManager during their init()
    this.setupGlobalDebugAccess();

    // Initialize dock orchestrator
    this.dockOrchestrator = new DesktopDockOrchestrator(this.storageManager);

    // Initialize memory manager
    this.memoryManager = new DesktopMemoryManager(this.storageManager);

    // Setup event listeners via orchestrator
    this.initializer.setupEventListeners(managers);

    // Start main initialization
    this.init();
  }

  /**
   * Main initialization method
   */
  async init() {
    this.perfMonitor.startTimer('desktop-init');
    logger.info('Symbiosis Desktop initializing...');

    // Load user data and update UI
    this.perfMonitor.startTimer('load-user-data');
    this.loadUserData();
    this.perfMonitor.endTimer('load-user-data');

    // Load and render menu bar plugins
    this.perfMonitor.startTimer('load-menubar');
    await this.loadMenuBarConfig();
    this.perfMonitor.endTimer('load-menubar');

    // Load widgets from current workspace
    this.perfMonitor.startTimer('load-widgets');
    this.loadWidgets();
    this.perfMonitor.endTimer('load-widgets');

    // Hide welcome message if widgets exist
    if (this.widgetManager.widgets.length > 0) {
      this.hideWelcome();
    }

    // Initialize workspace UI
    this.workspaceManager.updateWorkspaceUI();

    // Initialize dock magnification (via orchestrator)
    this.dockOrchestrator.initialize();

    // Setup global memory management functions (via orchestrator)
    this.memoryManager.setupGlobalFunctions();

    const initTime = this.perfMonitor.endTimer('desktop-init');
    logger.info(`Desktop ready! (${initTime.toFixed(0)}ms)`);
  }

  /**
   * Setup global access to managers for debugging
   */
  setupGlobalDebugAccess() {
    window.desktopManager = this;
    window.workspaceManager = this.workspaceManager;
    window.hotkeyManager = this.hotkeyManager;
    window.storageManager = this.storageManager;
    window.menuBarManager = this.menuBarManager;

    logger.info('Desktop manager available as window.desktopManager');
    logger.info('Workspace manager available as window.workspaceManager');
    logger.info('Hotkey manager available as window.hotkeyManager');
    logger.info('Storage manager available as window.storageManager');
    logger.info('Menu bar manager available as window.menuBarManager');
  }

  /**
   * Load menu bar configuration (user-specific or default)
   */
  async loadMenuBarConfig() {
    const user = this.storageManager.getUser();

    // STATIC MODE: Skip API calls and use static config
    // TODO: When backend is ready, set STATIC_MODE = false
    const STATIC_MODE = true;

    if (STATIC_MODE) {
      // Static mode - always use default config from static file
      logger.info('📦 Static mode: Using default menu bar config');
      await this.menuBarManager.loadConfig();
      return;
    }

    // API MODE: Try to load user-specific config from backend
    if (user && user.id) {
      // User is logged in - try to load their custom config
      logger.info(`Loading menu bar config for user ${user.id}`);
      try {
        await this.menuBarManager.loadUserConfig(user.id);
      } catch (error) {
        logger.warn('Failed to load user menu bar config, using defaults:', error);
        await this.menuBarManager.loadConfig();
      }
    } else {
      // No user logged in - use default config
      logger.info('No user logged in, using default menu bar config');
      await this.menuBarManager.loadConfig();
    }
  }

  /**
   * Load user data and update UI
   */
  loadUserData() {
    const user = this.storageManager.getUser();
    if (user) {
      const userNameElement = document.getElementById('user-name');
      const userAvatarElement = document.getElementById('user-avatar');

      if (userNameElement) {
        userNameElement.textContent = user.name;
      }

      if (userAvatarElement) {
        // Use first letter of name for avatar
        userAvatarElement.textContent = user.name.charAt(0).toUpperCase();
      }

      // TEMPORARY DEV FEATURE: Update dropdown menu
      const dropdownName = document.getElementById('user-dropdown-name');
      const dropdownAvatar = document.getElementById('user-dropdown-avatar');

      if (dropdownName) {
        dropdownName.textContent = user.name;
      }

      if (dropdownAvatar) {
        dropdownAvatar.textContent = user.name.charAt(0).toUpperCase();
      }

      logger.info('User loaded:', user.name);
    }
  }

  /**
   * Load widgets for current workspace
   */
  loadWidgets() {
    this.errorBoundary.wrap(() => {
      const currentWorkspace = this.workspaceManager.getCurrentWorkspace();

      // IMPORTANT: Always set current workspace ID, even if no widgets yet
      this.widgetManager.setCurrentWorkspace(currentWorkspace.id);

      // Load widget instances from storage for current workspace
      const instances = this.storageManager.getWidgetInstancesForWorkspace(currentWorkspace.id);

      if (instances && instances.length > 0) {
        this.widgetManager.setWidgets(instances);

        instances.forEach(widget => {
          this.renderWidget(widget);
        });

        logger.info('Loaded', instances.length, 'widgets from localStorage');
      }
    }, 'load-widgets', {
      fallback: () => {
        logger.warn('Failed to load widgets, showing welcome message');
        this.showWelcome();
      }
    });
  }

  /**
   * Render a widget (delegates to WidgetUIController)
   */
  renderWidget(widget) {
    // Get widget definition from static data
    const widgetDefinition = getWidgetById(widget.widgetDefId || widget.appId);
    if (!widgetDefinition) {
      logger.error('Widget definition not found:', widget.widgetDefId || widget.appId);
      return;
    }

    // Delegate to WidgetUIController for rendering
    this.widgetUIController.renderWidget(widget, widgetDefinition);
  }

  /**
   * Add widget to desktop (click-to-add from drawer)
   */
  addWidgetToDesktop(widgetId) {
    const widgetDef = getWidgetById(widgetId);
    if (!widgetDef) {
      logger.error('Widget not found:', widgetId);
      return;
    }

    // Find available position using WidgetManager
    const cellNumber = this.widgetManager.findAvailableCell(widgetDef.cols, widgetDef.rows);

    if (cellNumber === null) {
      alert(`No space available for ${widgetDef.name} (${widgetDef.size})`);
      return;
    }

    logger.info(`Placing ${widgetDef.name} at cell ${cellNumber}`);

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
    this.drawerManager.close();
  }

  /**
   * Open app from dock click
   * @param {Object} app - Dock app object { id, name, icon, type }
   */
  async openAppFromDock(app) {
    logger.info('Opening app from dock:', app);

    // Map dock app IDs to actual app definition IDs
    const dockToAppIdMap = {
      'search': 'chemicals-app',      // Map search to chemicals for now
      'ideas': 'ai-assistant-app',    // Map ideas to AI assistant
      'inventory': 'equipment-app',   // Map inventory to equipment
      'experiments': 'genetics-app',  // Map experiments to genetics
      'equipment': 'equipment-app',   // Map equipment to equipment-app
      'settings': 'notebook-app',      // Map settings to notebook for now
      'notebook': 'notebook-app'
    };

    // Get the actual app ID (use mapping if exists, otherwise use the dock app.id directly)
    const actualAppId = dockToAppIdMap[app.id] || app.id;

    // Find app definition from availableApps
    const appDefinition = availableApps.find(a => a.id === actualAppId);

    if (!appDefinition) {
      logger.error(`App definition not found for: ${app.id} (mapped to: ${actualAppId})`);
      alert(`App not found: ${app.name}\n\nDock ID: ${app.id}\nLooking for app: ${actualAppId}`);
      return;
    }

    logger.info(`✅ Launching app: ${actualAppId} (from dock item: ${app.id})`);

    // Launch app using AppUIController with app's default settings
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

    await this.appUIController.openApp(app.id, instanceSettings);
  }

  /**
   * Legacy method - kept for compatibility
   */
  openApp(appName) {
    logger.info('Opening app (legacy):', appName);
    // Redirect to new method
    this.openAppFromDock({ id: appName, name: appName, icon: '📱', type: 'system' });
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    const welcome = document.getElementById('welcome-message');
    if (welcome) {
      welcome.style.display = 'block';
    }
  }

  /**
   * Hide welcome message
   */
  hideWelcome() {
    const welcome = document.getElementById('welcome-message');
    if (welcome) {
      welcome.style.display = 'none';
    }
  }

  /**
   * Clear workspace (for testing)
   */
  clearWorkspace() {
    if (confirm('Clear all widgets and reset workspace?')) {
      this.widgetManager.clearGrid();

      document.querySelectorAll<HTMLElement>('.widget-cell').forEach(cell => {
        const cellNumber = cell.dataset.cell;
        cell.classList.add('empty');
        cell.innerHTML = `<span style="color: #2563eb; font-weight: 600;">${cellNumber}</span>`;
      });

      this.workspaceManager.saveWorkspace();
      this.showWelcome();

      logger.info('Workspace cleared');
    }
  }

  /**
   * Memory Management Methods (delegated to DesktopMemoryManager)
   */
  saveMemory() {
    this.memoryManager.saveMemory();
  }

  loadMemory() {
    this.memoryManager.loadMemory();
  }

  clearMemory() {
    this.memoryManager.clearMemory();
  }
}

// Initialize desktop when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.desktopManager = new DesktopManager();
});
