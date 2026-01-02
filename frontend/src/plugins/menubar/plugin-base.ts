import { createLogger } from '../../utils/logger.js';
import type { MenuBarPluginConfig } from '../../types/index.js';

const logger = createLogger('MenuBarPluginBase');

export class MenuBarPluginBase {
  // Properties
  protected id: string;
  protected name: string;
  protected version: string;
  protected position: 'left' | 'center' | 'right';
  protected order: number;
  protected enabled: boolean;
  protected hideInMobile: boolean;
  protected requiredRoles: string[];
  protected settings: Record<string, any>;
  protected manager: any; // MenuBarManager (avoiding circular dependency)
  protected dependencies: Record<string, any>;
  protected element: HTMLElement | null;
  protected initialized: boolean;
  protected visible: boolean;

  constructor(config: MenuBarPluginConfig, manager: any, dependencies: Record<string, any> = {}) {
    // Plugin configuration
    this.id = config.id;
    this.name = config.name;
    this.version = config.version;
    this.position = config.position;
    this.order = config.order;
    this.enabled = config.enabled;
    this.hideInMobile = config.hideInMobile;
    this.requiredRoles = config.requiredRoles;
    this.settings = config.settings;

    // Reference to MenuBarManager
    this.manager = manager;

    // Injected dependencies (no more window.* access needed!)
    this.dependencies = dependencies;

    // DOM element (created by render())
    this.element = null;

    // Plugin state
    this.initialized = false;
    this.visible = true;

    logger.info(`Plugin created: ${this.id} v${this.version}`);
  }

  /**
   * Initialize plugin
   * Called when plugin is registered
   * Override this method to setup event listeners, load data, etc.
   */
  init(): void {
    if (this.initialized) {
      logger.warn(`Plugin ${this.id} already initialized`);
      return;
    }

    this.initialized = true;
    logger.info(`Plugin initialized: ${this.id}`);
  }

  /**
   * Render plugin DOM element
   * MUST be implemented by child class
   * @returns {HTMLElement} Plugin DOM element
   */
  render(): HTMLElement {
    throw new Error(`Plugin ${this.id} must implement render() method`);
  }

  /**
   * Update plugin with new data
   * Override this method to handle data updates
   * @param {*} data - New data
   */
  update(data: any): void {
    logger.info(`Plugin ${this.id} received update:`, data);
  }

  /**
   * Show plugin
   */
  show(): void {
    if (this.element) {
      this.element.style.display = '';
      this.visible = true;
    }
  }

  /**
   * Hide plugin
   */
  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
      this.visible = false;
    }
  }

  /**
   * Destroy plugin
   * Called when plugin is unregistered
   * Override this method to cleanup event listeners, etc.
   */
  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.initialized = false;

    logger.info(`Plugin destroyed: ${this.id}`);
  }

  /**
   * Get plugin element
   * Creates element if not yet rendered
   * @returns {HTMLElement} Plugin DOM element
   */
  getElement(): HTMLElement {
    if (!this.element) {
      this.element = this.render();
      this.element.dataset.pluginId = this.id;
      this.element.classList.add('menubar-plugin', `menubar-plugin-${this.id}`);
    }
    return this.element;
  }

  /**
   * Check if user has required role to see this plugin
   * @param {string} userRole - User's role
   * @returns {boolean} True if user can see plugin
   */
  hasRequiredRole(userRole: string): boolean {
    return this.requiredRoles.includes(userRole);
  }

  // //FUTURE: Plugin communication system
  // // Emit event to other plugins
  // emit(event, data) {
  //   if (this.manager) {
  //     this.manager.emit(event, data, this.id);
  //   }
  // }
  //
  // // Listen for events from other plugins
  // on(event, handler) {
  //   if (this.manager) {
  //     this.manager.on(event, handler, this.id);
  //   }
  // }
  //
  // // Remove event listener
  // off(event, handler) {
  //   if (this.manager) {
  //     this.manager.off(event, handler, this.id);
  //   }
  // }

  /**
   * Create a standard plugin container
   * Helper method for consistent plugin styling
   * @param {Object} options - Container options
   * @returns {HTMLElement} Container element
   */
  createContainer(options: any = {}): HTMLElement {
    const container = document.createElement('div');
    container.className = 'menubar-plugin-container';

    // Apply options
    if (options.className) {
      container.classList.add(options.className);
    }

    if (options.title) {
      container.title = options.title;
    }

    if (options.ariaLabel) {
      container.setAttribute('aria-label', options.ariaLabel);
    }

    if (options.onClick) {
      container.style.cursor = 'pointer';
      container.onclick = options.onClick.bind(this);
    }

    return container;
  }

  /**
   * Create a standard icon element
   * Helper method for consistent icon styling
   * @param {string} icon - Icon text (emoji or HTML)
   * @param {Object} options - Icon options
   * @returns {HTMLElement} Icon element
   */
  createIcon(icon: string, options: any = {}): HTMLElement {
    const iconEl = document.createElement('span');
    iconEl.className = 'menubar-plugin-icon';
    iconEl.innerHTML = icon;

    if (options.size) {
      iconEl.style.fontSize = options.size;
    }

    return iconEl;
  }

  /**
   * Create a standard text element
   * Helper method for consistent text styling
   * @param {string} text - Text content
   * @param {Object} options - Text options
   * @returns {HTMLElement} Text element
   */
  createText(text: string, options: any = {}): HTMLElement {
    const textEl = document.createElement('span');
    textEl.className = 'menubar-plugin-text';
    textEl.textContent = text;

    if (options.size) {
      textEl.style.fontSize = options.size;
    }

    if (options.weight) {
      textEl.style.fontWeight = options.weight;
    }

    return textEl;
  }

  /**
   * Create a badge element (for notifications, counts, etc.)
   * Helper method for consistent badge styling
   * @param {string|number} value - Badge content
   * @param {Object} options - Badge options
   * @returns {HTMLElement} Badge element
   */
  createBadge(value: string | number, options: any = {}): HTMLElement {
    const badge = document.createElement('span');
    badge.className = 'menubar-plugin-badge';
    badge.textContent = value;

    if (options.color) {
      badge.style.backgroundColor = options.color;
    }

    if (options.position) {
      badge.dataset.position = options.position; // 'top-right', 'top-left', etc.
    }

    return badge;
  }
}
