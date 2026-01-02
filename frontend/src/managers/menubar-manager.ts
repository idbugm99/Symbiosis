/**
 * MenuBarManager
 * Orchestrates menu bar plugins
 *
 * Responsibilities:
 * - Load plugin configuration (from static config or API)
 * - Register/unregister plugins
 * - Render menu bar with correct layout
 * - Handle plugin lifecycle (init, update, destroy)
 * - Manage plugin communication (future)
 */

import { domHelper } from '../utils/dom-helpers.js';
import { safeJSONParse } from '../utils/validators.js';
import { createLogger } from '../utils/logger.ts';
import { getDefaultMenuBarConfig } from '../data/config/menubar-config.js';
import type { MenuBarManagerOptions, MenuBarConfig, DOMHelper } from '../types/index.js';

const logger = createLogger('MenuBarManager');

export class MenuBarManager {
  // Properties
  private dom: DOMHelper;
  private container: HTMLElement | null;
  private userRole: string;
  private plugins: Map<string, any>; // Map<pluginId, pluginInstance>
  private pluginClasses: Map<string, any>; // Map<pluginId, pluginClass>
  private leftContainer: HTMLElement | null;
  private centerContainer: HTMLElement | null;
  private rightContainer: HTMLElement | null;
  private config: MenuBarConfig | null;
  private dependencies: Record<string, any>;

  constructor(options: MenuBarManagerOptions = {}) {
    this.dom = options.domHelper || domHelper;
    this.container = options.container || this.dom.getElementById('top-bar');
    this.userRole = options.userRole || 'user'; // 'guest', 'user', 'admin'

    // Plugin registry
    this.plugins = new Map(); // Map<pluginId, pluginInstance>
    this.pluginClasses = new Map(); // Map<pluginId, pluginClass>

    // Layout containers
    this.leftContainer = null;
    this.centerContainer = null;
    this.rightContainer = null;

    // Configuration
    this.config = null;

    // Dependencies to inject into plugins (no more window.* access!)
    this.dependencies = options.dependencies || {};

    // //FUTURE: Event system for plugin communication
    // this.events = new Map(); // Map<event, Set<{handler, pluginId}>>

    logger.info('Initialized');
  }

  /**
   * Register a plugin class
   * Must be called BEFORE loadConfig() for each plugin
   * @param {string} pluginId - Plugin ID
   * @param {Class} pluginClass - Plugin class (extends MenuBarPluginBase)
   */
  registerPluginClass(pluginId: string, pluginClass: any): void {
    this.pluginClasses.set(pluginId, pluginClass);
    logger.info(`Registered plugin class "${pluginId}"`);
  }

  /**
   * Load configuration and initialize plugins
   * @param {Object} config - Optional config override (defaults to static config)
   */
  async loadConfig(config: MenuBarConfig | null = null): Promise<void> {
    // Load config (static for now, API in future)
    this.config = config || getDefaultMenuBarConfig();

    logger.info('Loading config', this.config);

    // Create layout containers
    this.createLayoutContainers();

    // Initialize plugins based on layout
    await this.initializePlugins();

    // Render menu bar
    this.render();

    logger.info('✅ All plugins loaded and rendered');
  }

  /**
   * Create layout containers (left, center, right)
   */
  createLayoutContainers(): void {
    // Clear existing content
    this.dom.clearChildren(this.container);

    // Create left container (using existing topbar CSS classes)
    this.leftContainer = this.dom.createElement('div', 'topbar-left');
    this.container.appendChild(this.leftContainer);

    // Create center container (using existing topbar CSS classes)
    this.centerContainer = this.dom.createElement('div', 'topbar-center');
    this.container.appendChild(this.centerContainer);

    // Create right container (using existing topbar CSS classes)
    this.rightContainer = this.dom.createElement('div', 'topbar-right');
    this.container.appendChild(this.rightContainer);
  }

  /**
   * Initialize plugins based on layout configuration
   */
  async initializePlugins(): Promise<void> {
    const layout = this.config.layout;

    // Initialize left plugins
    for (const pluginId of layout.left) {
      await this.initializePlugin(pluginId);
    }

    // Initialize center plugins
    for (const pluginId of layout.center) {
      await this.initializePlugin(pluginId);
    }

    // Initialize right plugins
    for (const pluginId of layout.right) {
      await this.initializePlugin(pluginId);
    }
  }

  /**
   * Initialize a single plugin
   * @param {string} pluginId - Plugin ID
   */
  async initializePlugin(pluginId: string): Promise<void> {
    // Get plugin config
    const pluginConfig = this.config.availablePlugins.find(p => p.id === pluginId);

    if (!pluginConfig) {
      logger.warn(`Plugin config not found for "${pluginId}"`);
      return;
    }

    // Check if plugin is enabled
    if (!pluginConfig.enabled) {
      logger.info(`Plugin "${pluginId}" is disabled, skipping`);
      return;
    }

    // Check if user has required role
    if (!pluginConfig.requiredRoles.includes(this.userRole)) {
      logger.info(`User role "${this.userRole}" cannot access plugin "${pluginId}", skipping`);
      return;
    }

    // Get plugin class
    const PluginClass = this.pluginClasses.get(pluginId);

    if (!PluginClass) {
      logger.error(`Plugin class not registered for "${pluginId}"`);
      logger.error(`  → Did you forget to call registerPluginClass('${pluginId}', ${pluginId}Plugin)?`);
      return;
    }

    // Create plugin instance with injected dependencies
    const pluginInstance = new PluginClass(pluginConfig, this, this.dependencies);

    // Initialize plugin
    pluginInstance.init();

    // Store plugin
    this.plugins.set(pluginId, pluginInstance);

    logger.info(`Plugin "${pluginId}" initialized`);
  }

  /**
   * Render all plugins
   */
  render(): void {
    const layout = this.config.layout;

    // Render left plugins
    layout.left.forEach(pluginId => {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        this.leftContainer.appendChild(plugin.getElement());
      }
    });

    // Render center plugins
    layout.center.forEach(pluginId => {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        this.centerContainer.appendChild(plugin.getElement());
      }
    });

    // Render right plugins
    layout.right.forEach(pluginId => {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        this.rightContainer.appendChild(plugin.getElement());
      }
    });

    logger.info('All plugins rendered');
  }

  /**
   * Get plugin instance by ID
   * @param {string} pluginId - Plugin ID
   * @returns {Object|null} Plugin instance or null
   */
  getPlugin(pluginId: string): any | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Update a plugin with new data
   * @param {string} pluginId - Plugin ID
   * @param {*} data - New data
   */
  updatePlugin(pluginId: string, data: any): void {
    const plugin = this.getPlugin(pluginId);
    if (plugin) {
      plugin.update(data);
    } else {
      logger.warn(`Cannot update plugin "${pluginId}" - not found`);
    }
  }

  /**
   * Show a plugin
   * @param {string} pluginId - Plugin ID
   */
  showPlugin(pluginId: string): void {
    const plugin = this.getPlugin(pluginId);
    if (plugin) {
      plugin.show();
    }
  }

  /**
   * Hide a plugin
   * @param {string} pluginId - Plugin ID
   */
  hidePlugin(pluginId: string): void {
    const plugin = this.getPlugin(pluginId);
    if (plugin) {
      plugin.hide();
    }
  }

  /**
   * Unregister and destroy a plugin
   * @param {string} pluginId - Plugin ID
   */
  unregisterPlugin(pluginId: string): void {
    const plugin = this.getPlugin(pluginId);
    if (plugin) {
      plugin.destroy();
      this.plugins.delete(pluginId);
      logger.info(`Plugin "${pluginId}" unregistered`);
    }
  }

  /**
   * Reload menu bar with new configuration
   * @param {Object} newConfig - New configuration
   */
  async reload(newConfig: MenuBarConfig | null = null): Promise<void> {
    logger.info('Reloading...');

    // Destroy all existing plugins
    for (const [pluginId, plugin] of this.plugins) {
      plugin.destroy();
    }
    this.plugins.clear();

    // Load new config
    await this.loadConfig(newConfig);

    logger.info('✅ Reloaded');
  }

  /**
   * Destroy all plugins and clean up
   */
  destroy(): void {
    logger.info('Destroying...');

    // Destroy all plugins
    for (const [pluginId, plugin] of this.plugins) {
      plugin.destroy();
    }

    this.plugins.clear();
    this.pluginClasses.clear();

    // Clear containers
    if (this.container) {
      this.dom.clearChildren(this.container);
    }

    logger.info('Destroyed');
  }

  // //FUTURE: Plugin communication system
  // /**
  //  * Emit event to all listening plugins
  //  * @param {string} event - Event name
  //  * @param {*} data - Event data
  //  * @param {string} sourcePluginId - ID of plugin emitting event
  //  */
  // emit(event, data, sourcePluginId) {
  //   const handlers = this.events.get(event);
  //   if (!handlers) return;
  //
  //   logger.info(`Event "${event}" emitted by ${sourcePluginId}`, data);
  //
  //   handlers.forEach(({ handler, pluginId }) => {
  //     // Don't emit to self
  //     if (pluginId !== sourcePluginId) {
  //       try {
  //         handler(data, sourcePluginId);
  //       } catch (error) {
  //         logger.error(`Error in event handler for "${event}" in plugin "${pluginId}":`, error);
  //       }
  //     }
  //   });
  // }
  //
  // /**
  //  * Register event listener
  //  * @param {string} event - Event name
  //  * @param {Function} handler - Event handler
  //  * @param {string} pluginId - ID of plugin registering handler
  //  */
  // on(event, handler, pluginId) {
  //   if (!this.events.has(event)) {
  //     this.events.set(event, new Set());
  //   }
  //
  //   this.events.get(event).add({ handler, pluginId });
  //   logger.info(`Plugin "${pluginId}" registered listener for event "${event}"`);
  // }
  //
  // /**
  //  * Unregister event listener
  //  * @param {string} event - Event name
  //  * @param {Function} handler - Event handler
  //  * @param {string} pluginId - ID of plugin unregistering handler
  //  */
  // off(event, handler, pluginId) {
  //   const handlers = this.events.get(event);
  //   if (!handlers) return;
  //
  //   handlers.forEach(h => {
  //     if (h.handler === handler && h.pluginId === pluginId) {
  //       handlers.delete(h);
  //     }
  //   });
  //
  //   logger.info(`Plugin "${pluginId}" unregistered listener for event "${event}"`);
  // }

  /**
   * Load user-specific configuration from API
   * @param {string} userId - User ID
   */
  async loadUserConfig(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/user/${userId}/menubar`);
      if (!response.ok) {
        logger.warn('Failed to load user menu bar config, using defaults');
        return getDefaultMenuBarConfig();
      }
      const userConfig = await response.json();
      await this.loadConfig(userConfig);
    } catch (error) {
      logger.error('Error loading user menu bar config:', error);
      await this.loadConfig(); // Fall back to defaults
    }
  }

  /**
   * Save user-specific configuration to API
   * @param {string} userId - User ID
   * @param {Object} config - Menu bar configuration
   */
  async saveUserConfig(userId: string, config: MenuBarConfig): Promise<any> {
    try {
      const response = await fetch(`/api/user/${userId}/menubar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to save menu bar config');
      }

      logger.info('✅ User menu bar config saved');
      return await response.json();
    } catch (error) {
      logger.error('Error saving user menu bar config:', error);
      throw error;
    }
  }
}
