/**
 * AppUIController
 * Centralized controller for app window management
 *
 * Responsibilities:
 * - Create/destroy app windows
 * - Handle display modes (fullscreen, popup, modal, embedded)
 * - Control window chrome (title bar, borders, shadows)
 * - Manage global UI visibility (dock, nav, sidebar)
 * - Handle animations (slide, fade, expand-from-widget)
 * - Manage window stacking (z-index) and multi-instance rules
 *
 * Apps do NOT manage their own windows - they only render into
 * the container provided by this controller.
 */

import { domHelper } from '../utils/dom-helpers.js';
import { CleanupManager } from '../utils/cleanup-manager.js';
import { createLogger } from '../utils/logger.js';
import type {
  AppInstanceSettings,
  AppModule,
  AppLifecycleContext,
  EventBus,
  DOMHelper,
  WidgetRegistry
} from '../types/index.js';
import { DisplayMode } from '../types/index.js';

const logger = createLogger('AppUIController');

interface AppInstance {
  instanceId: string;
  appId: string;
  window: HTMLElement;
  settings: AppInstanceSettings;
  createdAt: string;
  appModule?: AppModule | null;
  resizeObserver?: ResizeObserver | null;
}

interface HotkeyManager {
  registerAppHotkey(instanceId: string, combo: string, callback: () => void, description: string): void;
  unregisterAppHotkeys(instanceId: string): void;
}

export class AppUIController {
  // Properties
  private openApps: Map<string, AppInstance> = new Map();
  private zIndexCounter: number = 1050;
  private containerElement: HTMLElement;
  activeAppInstanceId: string | null = null;
  private eventBus: EventBus | null;
  private hotkeyManager: HotkeyManager | null;
  private widgetRegistry: WidgetRegistry | null;
  private dom: DOMHelper;
  private cleanup: CleanupManager;

  constructor(options: {
    containerElement?: HTMLElement;
    eventBus?: EventBus;
    hotkeyManager?: HotkeyManager;
    widgetRegistry?: WidgetRegistry;
    domHelper?: DOMHelper;
  } = {}) {
    this.containerElement = options.containerElement || document.body;
    this.eventBus = options.eventBus || null;

    // Injected dependencies (no more window.* access!)
    this.hotkeyManager = options.hotkeyManager || null;
    this.widgetRegistry = options.widgetRegistry || null;

    // Inject DOM helper
    this.dom = options.domHelper || domHelper;

    // Cleanup tracking
    this.cleanup = new CleanupManager();

    // Note: Keyboard shortcuts are now handled by HotkeyManager
    // ESC key and app-specific hotkeys are registered via centralized HotkeyManager
    // This prevents conflicts between workspace and app hotkeys

    logger.info('Initialized');
  }

  /**
   * Open an app with specified instance settings
   * @param {string} appId - App definition ID
   * @param {Object} instanceSettings - Display settings for this instance
   * @param {Object} sourceWidget - Optional widget that triggered the launch
   * @returns {Promise<string>} Instance ID of opened app
   */
  async openApp(appId: string, instanceSettings: any = {}, sourceWidget = null): Promise<string> {
    logger.info(`Opening app ${appId}`, instanceSettings);

    // Generate unique instance ID
    const instanceId = `${appId}-${Date.now()}`;

    // Check multi-instance rules
    if (instanceSettings.multiInstance === false) {
      // Close existing instances of this app
      this.closeAppsByDefinitionId(appId);
    }

    // Merge default settings
    const settings: AppInstanceSettings = {
      displayMode: 'fullscreen', // Default
      animation: 'fade',
      showCloseButton: true,
      showMinimizeButton: true,
      dock: true,
      menuBar: true,
      sideNav: true,
      dimensions: undefined, // For popup/modal
      position: 'center', // For popup/modal
      ...instanceSettings
    };

    // Load app module (if registered)
    let appModule: AppModule | null = null;
    if (this.widgetRegistry) {
      try {
        appModule = await this.widgetRegistry.getAppModule(appId);
        if (appModule) {
          logger.info(`Loaded app module for ${appId} with lifecycle hooks`);
        }
      } catch (error: any) {
        logger.error(`Failed to load app module for ${appId}:`, error.message);
      }
    }

    // Create app window
    const appWindow = this.createAppWindow(instanceId, appId, settings, sourceWidget);

    // Get content container
    const contentContainer = this.dom.getElementById(`${instanceId}-content`);
    if (!contentContainer) {
      logger.error(`Content container not found for ${instanceId}`);
    }

    // Store instance
    this.openApps.set(instanceId, {
      instanceId,
      appId,
      settings,
      window: appWindow,
      createdAt: new Date().toISOString(),
      appModule,
      resizeObserver: null
    });

    // Apply display mode
    this.applyDisplayMode(instanceId, settings);

    // Setup draggable behavior (after instance is stored)
    if (settings.displayMode === DisplayMode.POPUP || settings.displayMode === DisplayMode.MODAL) {
      this.setupDraggable(instanceId);
    }

    // Apply animation
    this.applyAnimation(appWindow, settings.animation, sourceWidget);

    // Bring to front
    this.bringToFront(instanceId);

    // Register ESC key to close this app (automatic for all apps)
    this.registerDefaultHotkeys(instanceId);

    // Call onMount lifecycle hook
    if (appModule && appModule.onMount && contentContainer) {
      try {
        logger.info(`Calling onMount for app ${appId}`);

        // Create app context
        const context: AppLifecycleContext = {
          instanceId,
          appId,
          eventBus: this.eventBus,
          closeApp: () => this.closeApp(instanceId),
          updateSettings: (newSettings) => this.updateAppSettings(instanceId, newSettings)
        };

        await appModule.onMount(contentContainer, settings, context);
        logger.info(`onMount completed for app ${appId}`);
      } catch (error: any) {
        logger.error(`Error in onMount hook for ${appId}:`, error.message);
      }
    }

    // Setup resize observer for onResize hook
    if (appModule && appModule.onResize) {
      this.setupResizeObserver(instanceId);
    }

    // Emit event instead of callback
    if (this.eventBus) {
      this.eventBus.emit('app:opened', { instanceId, appId });
    }

    return instanceId;
  }

  /**
   * Register default hotkeys for an app instance
   * ESC key is automatically registered for all apps to close them
   * @param {string} instanceId - Instance ID
   */
  registerDefaultHotkeys(instanceId) {
    // ESC key - Close this app
    if (this.hotkeyManager) {
      this.hotkeyManager.registerAppHotkey(
        instanceId,
        'Escape',
        () => {
          logger.info(`ESC pressed - closing app ${instanceId}`);
          this.closeApp(instanceId);
        },
        'Close app'
      );
    }
  }

  /**
   * Create app window DOM structure
   * @param {string} instanceId - Instance ID
   * @param {string} appId - App definition ID
   * @param {Object} settings - Instance settings
   * @param {Object} sourceWidget - Source widget (for position calculation)
   * @returns {HTMLElement} App window element
   */
  createAppWindow(instanceId, appId, settings, sourceWidget) {
    logger.info(`Creating app window for ${instanceId}, displayMode: ${settings.displayMode}`);
    const window = this.dom.createElement('div', 'app-window', {
      id: instanceId,
      dataset: {
        appId: appId,
        displayMode: settings.displayMode
      }
    });

    // Window chrome (title bar, borders, etc.) for popup/modal
    logger.info(`Checking if should create chrome - displayMode: ${settings.displayMode}`);
    if (settings.displayMode === DisplayMode.POPUP || settings.displayMode === DisplayMode.MODAL) {
      logger.info(`Creating chrome for popup/modal window`);
      const chrome = this.createWindowChrome(instanceId, appId, settings);
      window.appendChild(chrome);
    } else {
      logger.info(`Creating floating close button for fullscreen window`);
      // For fullscreen modes, add floating close button
      const floatingCloseBtn = this.createFloatingCloseButton(instanceId);
      window.appendChild(floatingCloseBtn);
    }

    // App content container
    const contentContainer = this.dom.createElement('div', 'app-content', {
      id: `${instanceId}-content`
    });
    window.appendChild(contentContainer);

    // Add to DOM
    this.containerElement.appendChild(window);

    // Setup event listeners
    this.setupWindowEventListeners(window, instanceId);

    // Make resizable for popup/modal windows
    if (settings.displayMode === DisplayMode.POPUP || settings.displayMode === DisplayMode.MODAL) {
      this.makeResizable(window, instanceId);
    }

    return window;
  }

  /**
   * Create floating close button for fullscreen modes
   * @param {string} instanceId - Instance ID
   * @returns {HTMLElement} Close button element
   */
  createFloatingCloseButton(instanceId) {
    const closeBtn = this.dom.createButton('×', 'app-floating-close-btn',
      () => this.closeApp(instanceId),
      { title: 'Close (ESC)' }
    );
    return closeBtn;
  }

  /**
   * Create window chrome (title bar, buttons, borders)
   * @param {string} instanceId - Instance ID
   * @param {string} appId - App definition ID
   * @param {Object} settings - Instance settings
   * @returns {HTMLElement} Chrome element
   */
  createWindowChrome(instanceId, appId, settings) {
    logger.info(`Creating window chrome for ${instanceId}, displayMode: ${settings.displayMode}`);
    const chrome = this.dom.createElement('div', 'app-window-chrome');

    // Title bar
    const titleBar = this.dom.createElement('div', 'app-window-titlebar');
    logger.info(`Created titlebar element for ${instanceId}`, titleBar);

    // App title
    const title = this.dom.createText(appId, 'div', 'app-window-title'); // TODO: Get app name from definition
    titleBar.appendChild(title);

    // Window controls
    const controls = this.dom.createElement('div', 'app-window-controls');

    if (settings.showMinimizeButton) {
      const minimizeBtn = this.dom.createButton('−', 'app-window-btn minimize-btn',
        () => this.minimizeApp(instanceId)
      );
      controls.appendChild(minimizeBtn);
    }

    if (settings.showCloseButton) {
      const closeBtn = this.dom.createButton('×', 'app-window-btn close-btn',
        () => this.closeApp(instanceId)
      );
      controls.appendChild(closeBtn);
    }

    titleBar.appendChild(controls);
    chrome.appendChild(titleBar);

    return chrome;
  }

  /**
   * Setup draggable behavior for a window (called after window is fully created)
   * @param {string} instanceId - Instance ID
   */
  setupDraggable(instanceId) {
    const appInstance = this.openApps.get(instanceId);
    if (!appInstance) {
      logger.error(`Cannot setup draggable - instance not found: ${instanceId}`);
      return;
    }

    // Find the titlebar element
    const appWindow = appInstance.window;
    const titleBar = appWindow.querySelector('.app-window-titlebar');

    if (!titleBar) {
      logger.error(`Cannot setup draggable - titlebar not found for ${instanceId}`);
      return;
    }

    logger.info(`Setting up draggable for ${instanceId}`);
    this.makeDraggable(titleBar, appWindow, instanceId);
  }

  /**
   * Make window resizable
   * @param {HTMLElement} appWindow - Window element
   * @param {string} instanceId - Instance ID
   */
  makeResizable(appWindow, instanceId) {
    // Create resize handle
    const resizeHandle = this.dom.createElement('div', 'app-window-resize-handle');
    resizeHandle.innerHTML = '⋰'; // Diagonal arrows symbol
    appWindow.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    this.cleanup.addToGroup(instanceId, this.dom.addEventListener(resizeHandle, 'mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = appWindow.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;

      e.preventDefault();
      e.stopPropagation();
    }));

    this.cleanup.addToGroup(instanceId, this.dom.addEventListener(document, 'mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Calculate new dimensions
      let newWidth = startWidth + deltaX;
      let newHeight = startHeight + deltaY;

      // Apply min/max constraints (use global window)
      const minWidth = 400;
      const minHeight = 300;
      const maxWidth = globalThis.window.innerWidth * 0.9;
      const maxHeight = globalThis.window.innerHeight * 0.9;

      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

      appWindow.style.width = `${newWidth}px`;
      appWindow.style.height = `${newHeight}px`;
    }));

    this.cleanup.addToGroup(instanceId, this.dom.addEventListener(document, 'mouseup', () => {
      if (isResizing) {
        isResizing = false;
      }
    }));
  }

  /**
   * Apply display mode to app window
   * @param {string} instanceId - Instance ID
   * @param {Object} settings - Instance settings
   */
  applyDisplayMode(instanceId, settings) {
    const appInstance = this.openApps.get(instanceId);
    if (!appInstance) return;

    const { window } = appInstance;
    const { displayMode } = settings;

    // Remove all display mode classes
    ['fullscreen', 'fullscreen-no-nav', 'fullscreen-no-dock', 'popup', 'modal', 'embedded'].forEach(mode => {
      this.dom.toggleClass(window, mode, false);
    });

    // Apply new display mode class
    this.dom.toggleClass(window, displayMode, true);

    // Handle global UI visibility
    this.updateGlobalUI(settings);

    // Handle dimensions and position (for popup/modal)
    if (displayMode === DisplayMode.POPUP || displayMode === DisplayMode.MODAL) {
      this.applyWindowDimensions(window, settings);
    }

    logger.info(`Applied display mode '${displayMode}' to ${instanceId}`);
  }

  /**
   * Apply window dimensions and position
   * @param {HTMLElement} window - Window element
   * @param {Object} settings - Instance settings
   */
  applyWindowDimensions(window, settings) {
    const { dimensions, position } = settings;

    // Set dimensions
    if (dimensions) {
      window.style.width = `${dimensions.width}px`;
      window.style.height = `${dimensions.height}px`;
    }

    // Set position
    if (position === 'center') {
      // Get menubar height to calculate content area
      const menuBar = this.dom.getElementById('menu-bar');
      const menuBarHeight = menuBar ? menuBar.offsetHeight : 60;

      // Get viewport dimensions
      const viewportWidth = globalThis.window.innerWidth;
      const viewportHeight = globalThis.window.innerHeight;

      // Calculate center of content area (below menubar)
      const contentAreaHeight = viewportHeight - menuBarHeight;
      const centerX = viewportWidth / 2;
      const centerY = menuBarHeight + (contentAreaHeight / 2);

      // Position at center of content area
      window.style.left = `${centerX}px`;
      window.style.top = `${centerY}px`;
      window.style.transform = 'translate(-50%, -50%)';
    } else if (typeof position === 'object') {
      window.style.left = `${position.x}px`;
      window.style.top = `${position.y}px`;
    }
  }

  /**
   * Update global UI visibility based on app settings
   * @param {Object} settings - Instance settings
   */
  updateGlobalUI(settings) {
    const dock = this.dom.getElementById('desktop-dock');
    const menuBar = this.dom.getElementById('menu-bar');
    const sideNav = this.dom.getElementById('side-nav');

    logger.info(`updateGlobalUI - dock element found: ${!!dock}, displayMode: ${settings.displayMode}`);

    // For popup and modal windows, keep dock visible (floating above)
    // Only hide dock for fullscreen modes
    const isFullscreenMode = settings.displayMode === DisplayMode.FULLSCREEN ||
                            settings.displayMode === DisplayMode.FULLSCREEN_NO_NAV ||
                            settings.displayMode === DisplayMode.FULLSCREEN_NO_DOCK;

    if (settings.dock === false && dock && isFullscreenMode) {
      dock.style.display = 'none';
    }

    if (settings.menuBar === false && menuBar) {
      menuBar.style.display = 'none';
    }

    if (settings.sideNav === false && sideNav) {
      sideNav.style.display = 'none';
    }
  }

  /**
   * Restore global UI when app closes
   */
  restoreGlobalUI() {
    // Check if any open apps require UI to be hidden
    let hideDock = false;
    let hideMenuBar = false;
    let hideSideNav = false;

    this.openApps.forEach(app => {
      if (app.settings.dock === false) hideDock = true;
      if (app.settings.menuBar === false) hideMenuBar = true;
      if (app.settings.sideNav === false) hideSideNav = true;
    });

    // Restore UI elements if no apps require them hidden
    const dock = this.dom.getElementById('desktop-dock');
    const menuBar = this.dom.getElementById('menu-bar');
    const sideNav = this.dom.getElementById('side-nav');

    if (!hideDock && dock) dock.style.display = '';
    if (!hideMenuBar && menuBar) menuBar.style.display = '';
    if (!hideSideNav && sideNav) sideNav.style.display = '';
  }

  /**
   * Apply animation to app window
   * @param {HTMLElement} window - Window element
   * @param {string} animationType - Animation type
   * @param {Object} sourceWidget - Source widget (for expand-from-widget animation)
   */
  applyAnimation(window, animationType, sourceWidget) {
    this.dom.toggleClass(window, 'animating', true);

    // Get existing transform (for centering) to preserve it during animations
    const existingTransform = window.style.transform || '';
    const hasCenterTransform = existingTransform.includes('translate(-50%, -50%)');

    switch (animationType) {
      case 'fade':
        window.style.opacity = '0';
        setTimeout(() => {
          window.style.transition = 'opacity 0.6s ease';
          window.style.opacity = '1';
        }, 10);
        break;

      case 'slide-right':
        // Combine slide with centering transform if present
        if (hasCenterTransform) {
          window.style.transform = 'translate(-50%, -50%) translateX(-100%)';
          setTimeout(() => {
            window.style.transition = 'transform 0.6s ease';
            window.style.transform = 'translate(-50%, -50%) translateX(0)';
          }, 10);
        } else {
          window.style.transform = 'translateX(-100%)';
          setTimeout(() => {
            window.style.transition = 'transform 0.6s ease';
            window.style.transform = 'translateX(0)';
          }, 10);
        }
        break;

      case 'slide-left':
        // Combine slide with centering transform if present
        if (hasCenterTransform) {
          window.style.transform = 'translate(-50%, -50%) translateX(100%)';
          setTimeout(() => {
            window.style.transition = 'transform 0.6s ease';
            window.style.transform = 'translate(-50%, -50%) translateX(0)';
          }, 10);
        } else {
          window.style.transform = 'translateX(100%)';
          setTimeout(() => {
            window.style.transition = 'transform 0.6s ease';
            window.style.transform = 'translateX(0)';
          }, 10);
        }
        break;

      case 'expand-from-widget':
        if (sourceWidget) {
          const widgetRect = sourceWidget.getBoundingClientRect();
          window.style.transformOrigin = `${widgetRect.left + widgetRect.width / 2}px ${widgetRect.top + widgetRect.height / 2}px`;
          // Combine scale with centering transform if present
          if (hasCenterTransform) {
            window.style.transform = 'translate(-50%, -50%) scale(0)';
            setTimeout(() => {
              window.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
              window.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
          } else {
            window.style.transform = 'scale(0)';
            setTimeout(() => {
              window.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
              window.style.transform = 'scale(1)';
            }, 10);
          }
        }
        break;

      default:
        // No animation
        break;
    }

    // Remove animating class after animation completes
    setTimeout(() => {
      this.dom.toggleClass(window, 'animating', false);
    }, 650);
  }

  /**
   * Close app instance
   * @param {string} instanceId - Instance ID
   */
  async closeApp(instanceId: string): Promise<void> {
    const appInstance = this.openApps.get(instanceId);

    // If instance not found in Map, try to clean up DOM anyway
    if (!appInstance) {
      logger.warn(`Cannot close app - instance not found in Map: ${instanceId}`);

      // Try to find and remove DOM element anyway (orphaned window cleanup)
      const orphanedWindow = this.dom.getElementById(instanceId);
      if (orphanedWindow) {
        logger.info(`Found orphaned window, removing from DOM: ${instanceId}`);
        this.dom.toggleClass(orphanedWindow, 'closing', true);
        setTimeout(() => {
          this.dom.removeElement(orphanedWindow);
          logger.info(`Orphaned window removed: ${instanceId}`);
        }, 600);
      }

      // Clear from active tracking
      if (this.activeAppInstanceId === instanceId) {
        this.activeAppInstanceId = null;
      }

      return;
    }

    const { window, appModule, resizeObserver } = appInstance;

    // Check if already closing (prevent double-close)
    if (window.classList.contains('closing')) {
      logger.info(`App ${instanceId} is already closing, ignoring duplicate close`);
      return;
    }

    logger.info(`Closing app ${instanceId}`);

    // Call onUnmount lifecycle hook
    if (appModule && appModule.onUnmount) {
      try {
        logger.info(`Calling onUnmount for app ${appInstance.appId}`);
        await appModule.onUnmount();
        logger.info(`onUnmount completed for app ${appInstance.appId}`);
      } catch (error: any) {
        logger.error(`Error in onUnmount hook for ${appInstance.appId}:`, error.message);
      }
    }

    // Disconnect resize observer
    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    // Mark as closing
    this.dom.toggleClass(window, 'closing', true);

    // Clear active app if this is the active one
    if (this.activeAppInstanceId === instanceId) {
      this.activeAppInstanceId = null;
    }

    // Animate out
    setTimeout(() => {
      this.dom.removeElement(window);
      this.openApps.delete(instanceId);

      // Cleanup event listeners for this instance
      this.cleanup.cleanupGroup(instanceId);

      // Restore global UI if needed
      this.restoreGlobalUI();

      // Emit event instead of callback
      if (this.eventBus) {
        this.eventBus.emit('app:closed', { instanceId, appId: appInstance.appId });
      }
    }, 600);
  }

  /**
   * Close all instances of a specific app definition
   * @param {string} appId - App definition ID
   */
  closeAppsByDefinitionId(appId) {
    const instancesToClose = [];
    this.openApps.forEach((instance, instanceId) => {
      if (instance.appId === appId) {
        instancesToClose.push(instanceId);
      }
    });

    instancesToClose.forEach(instanceId => this.closeApp(instanceId));
  }

  /**
   * Minimize app (hide but keep in memory)
   * @param {string} instanceId - Instance ID
   */
  minimizeApp(instanceId) {
    const appInstance = this.openApps.get(instanceId);
    if (!appInstance) return;

    logger.info(`Minimizing app ${instanceId}`);
    this.dom.toggleClass(appInstance.window, 'minimized', true);
    appInstance.window.style.display = 'none';
  }

  /**
   * Restore minimized app
   * @param {string} instanceId - Instance ID
   */
  restoreApp(instanceId) {
    const appInstance = this.openApps.get(instanceId);
    if (!appInstance) return;

    logger.info(`Restoring app ${instanceId}`);
    this.dom.toggleClass(appInstance.window, 'minimized', false);
    appInstance.window.style.display = '';
    this.bringToFront(instanceId);
  }

  /**
   * Bring app to front (z-index management)
   * @param {string} instanceId - Instance ID
   */
  bringToFront(instanceId) {
    const appInstance = this.openApps.get(instanceId);
    if (!appInstance) return;

    this.zIndexCounter++;

    // Z-index logic:
    // - Apps with dock: true → below dock (1002) so dock floats above
    // - Apps with dock: false → can go above dock (dock is hidden or app should be above)
    // - Apps with dock: undefined/null → default behavior (popup/modal below, fullscreen can go above)
    const isPopupOrModal = appInstance.settings.displayMode === DisplayMode.POPUP ||
                          appInstance.settings.displayMode === DisplayMode.MODAL;

    let maxZIndex;
    
    // Check explicit dock setting first (allows popup/modal to go behind dock if dock: false)
    if (appInstance.settings.dock === true) {
      // Explicitly set to stay below dock
      maxZIndex = 1001;
    } else if (appInstance.settings.dock === false) {
      // Explicitly set to go above dock
      maxZIndex = this.zIndexCounter;
    } else {
      // No explicit dock setting - use default behavior
      if (isPopupOrModal) {
        // Popup/modal windows default to below dock (so dock floats above)
        maxZIndex = 1001;
      } else {
        // Fullscreen apps default to can go above
        maxZIndex = this.zIndexCounter;
      }
    }

    const finalZIndex = Math.min(this.zIndexCounter, maxZIndex);
    appInstance.window.style.zIndex = finalZIndex;

    logger.info(`Set z-index for ${instanceId}: ${finalZIndex} (displayMode: ${appInstance.settings.displayMode}, dock: ${appInstance.settings.dock}, maxZIndex: ${maxZIndex}, counter: ${this.zIndexCounter})`);

    // Verify z-index was actually set
    const computedZIndex = window.getComputedStyle(appInstance.window).zIndex;
    logger.info(`Computed z-index for ${instanceId}: ${computedZIndex}`);

    // Call onBlur for previously active app
    const previousActiveId = this.activeAppInstanceId;
    if (previousActiveId && previousActiveId !== instanceId) {
      const previousApp = this.openApps.get(previousActiveId);
      if (previousApp && previousApp.appModule && previousApp.appModule.onBlur) {
        try {
          logger.info(`Calling onBlur for app ${previousApp.appId}`);
          previousApp.appModule.onBlur();
        } catch (error: any) {
          logger.error(`Error in onBlur hook for ${previousApp.appId}:`, error.message);
        }
      }
    }

    // Remove active class from all windows
    this.openApps.forEach(instance => {
      this.dom.toggleClass(instance.window, 'active', false);
    });

    // Add active class to this window
    this.dom.toggleClass(appInstance.window, 'active', true);

    // Track as active app for ESC key handling
    this.activeAppInstanceId = instanceId;

    // Call onFocus for newly active app
    if (appInstance.appModule && appInstance.appModule.onFocus) {
      try {
        logger.info(`Calling onFocus for app ${appInstance.appId}`);
        appInstance.appModule.onFocus();
      } catch (error: any) {
        logger.error(`Error in onFocus hook for ${appInstance.appId}:`, error.message);
      }
    }

    // Emit event instead of callback
    if (this.eventBus) {
      this.eventBus.emit('app:focused', { instanceId, appId: appInstance.appId });
    }
  }

  /**
   * Setup window event listeners
   * @param {HTMLElement} window - Window element
   * @param {string} instanceId - Instance ID
   */
  setupWindowEventListeners(window, instanceId) {
    // Click to bring to front
    this.cleanup.addToGroup(instanceId, this.dom.addEventListener(window, 'mousedown', () => {
      this.bringToFront(instanceId);
    }));
  }

  /**
   * Make window draggable by title bar
   * @param {HTMLElement} titleBar - Title bar element
   * @param {HTMLElement} appWindow - App window element
   * @param {string} instanceId - Instance ID
   */
  makeDraggable(titleBar, appWindow, instanceId) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    // Set cursor to indicate draggability
    titleBar.style.cursor = 'grab';

    logger.info(`Making window ${instanceId} draggable via titlebar`);

    this.cleanup.addToGroup(instanceId, this.dom.addEventListener(titleBar, 'mousedown', (e) => {
      logger.info(`Titlebar mousedown for ${instanceId}`);
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = appWindow.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      titleBar.style.cursor = 'grabbing';
      e.preventDefault(); // Prevent text selection while dragging
    }));

    this.cleanup.addToGroup(instanceId, this.dom.addEventListener(document, 'mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Calculate new position
      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // Get window dimensions
      const windowRect = appWindow.getBoundingClientRect();
      const windowWidth = windowRect.width;
      const windowHeight = windowRect.height;

      // Get viewport dimensions (use global window)
      const viewportWidth = globalThis.window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight = globalThis.window.innerHeight || document.documentElement.clientHeight;

      // Get menubar height (typically 60px, but check actual element)
      const menuBar = this.dom.getElementById('menu-bar');
      const menuBarHeight = menuBar ? menuBar.offsetHeight : 60;

      // Get dock height and position (typically 80px at bottom)
      const dock = this.dom.getElementById('desktop-dock');
      const dockHeight = dock ? dock.offsetHeight + 16 : 96; // Add padding

      // Constrain to viewport boundaries
      // Left boundary: keep at least 50px of window visible
      const minLeft = -windowWidth + 50;
      const maxLeft = viewportWidth - 50;

      // Top boundary: don't go above menubar
      const minTop = menuBarHeight;
      const maxTop = viewportHeight - dockHeight - 40; // Keep title bar above dock

      // Apply constraints
      newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
      newTop = Math.max(minTop, Math.min(newTop, maxTop));

      appWindow.style.left = `${newLeft}px`;
      appWindow.style.top = `${newTop}px`;
      appWindow.style.transform = 'none'; // Remove centering transform
    }));

    this.cleanup.addToGroup(instanceId, this.dom.addEventListener(document, 'mouseup', () => {
      if (isDragging) {
        isDragging = false;
        titleBar.style.cursor = 'grab';
      }
    }));
  }

  /**
   * Get all open app instances
   * @returns {Array} Array of open app instances
   */
  getOpenApps() {
    return Array.from(this.openApps.values());
  }

  /**
   * Get app instance by ID
   * @param {string} instanceId - Instance ID
   * @returns {Object|null} App instance or null
   */
  getAppInstance(instanceId) {
    return this.openApps.get(instanceId) || null;
  }

  /**
   * Check if app is open
   * @param {string} appId - App definition ID
   * @returns {boolean} True if at least one instance is open
   */
  isAppOpen(appId: string): boolean {
    for (const instance of this.openApps.values()) {
      if (instance.appId === appId) return true;
    }
    return false;
  }

  /**
   * Setup ResizeObserver for onResize lifecycle hook
   * @param {string} instanceId - Instance ID
   */
  setupResizeObserver(instanceId: string): void {
    const appInstance = this.openApps.get(instanceId);
    if (!appInstance || !appInstance.appModule || !appInstance.appModule.onResize) {
      return;
    }

    const { window, appModule } = appInstance;

    // Create ResizeObserver to watch window dimensions
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // Call onResize hook with new dimensions
        if (appModule.onResize) {
          try {
            appModule.onResize({ width, height });
          } catch (error: any) {
            logger.error(`Error in onResize hook for ${appInstance.appId}:`, error.message);
          }
        }
      }
    });

    // Observe the app window
    resizeObserver.observe(window);

    // Store observer for cleanup
    appInstance.resizeObserver = resizeObserver;

    logger.info(`Setup ResizeObserver for app ${appInstance.appId}`);
  }

  /**
   * Update app instance settings dynamically
   * @param {string} instanceId - Instance ID
   * @param {Object} newSettings - New settings to merge
   */
  updateAppSettings(instanceId: string, newSettings: Partial<AppInstanceSettings>): void {
    const appInstance = this.openApps.get(instanceId);
    if (!appInstance) {
      logger.warn(`Cannot update settings - instance not found: ${instanceId}`);
      return;
    }

    // Merge new settings
    appInstance.settings = {
      ...appInstance.settings,
      ...newSettings
    };

    // Re-apply display mode if it changed
    if (newSettings.displayMode) {
      this.applyDisplayMode(instanceId, appInstance.settings);
    }

    // Re-apply dimensions if they changed
    if (newSettings.dimensions || newSettings.position) {
      this.applyWindowDimensions(appInstance.window, appInstance.settings);
    }

    logger.info(`Updated settings for app ${appInstance.appId}`, newSettings);
  }

  /**
   * Destroy controller and cleanup resources
   */
  destroy(): void {
    // Close all open apps
    const instanceIds = Array.from(this.openApps.keys());
    instanceIds.forEach(instanceId => this.closeApp(instanceId));

    // Clean up all event listeners
    this.cleanup.cleanup();

    logger.info('Destroyed');
  }
}

export default AppUIController;
