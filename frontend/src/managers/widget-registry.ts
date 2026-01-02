/**
 * WidgetRegistry
 * Central registry for widget and app definitions, components, and lifecycle management
 *
 * Responsibilities:
 * - Store widget/app definitions (metadata)
 * - Store widget/app component classes (implementations)
 * - Create widget/app instances
 * - Validate registrations
 * - Support dynamic loading (code splitting)
 * - Enable plugin system for third-party widgets
 *
 * Benefits:
 * - Code splitting: Load widget code on-demand
 * - Plugin system: Third-party widgets can be registered
 * - Hot-reloading: Update widget components without page reload
 * - Centralized management: Single source of truth
 * - Type safety: Validation at registration time
 *
 * Usage:
 * ```typescript
 * const registry = new WidgetRegistry();
 *
 * // Register widget definition
 * registry.registerDefinition('my-widget', {
 *   id: 'my-widget',
 *   name: 'My Widget',
 *   icon: '📊',
 *   type: 'widget',
 *   cols: 2,
 *   rows: 2,
 *   category: 'data'
 * });
 *
 * // Register widget component (optional - for dynamic widgets)
 * registry.registerComponent('my-widget', MyWidgetComponent);
 *
 * // Create instance
 * const instance = registry.createInstance('my-widget', {
 *   id: 'instance-123',
 *   cell: 5,
 *   config: {}
 * });
 * ```
 */

import { strictValidateWidgetDefinition } from '../utils/validators.js';
import type { WidgetDefinition, WidgetInstance, WidgetRegistryOptions, EventBus, AppModule } from '../types/index.js';
import { WidgetType } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WidgetRegistry');

export class WidgetRegistry {
  // Properties
  private definitions: Map<string, WidgetDefinition>;
  private components: Map<string, any>;
  private appModules: Map<string, AppModule>; // Store app lifecycle hooks
  private instances: Map<string, WidgetInstance>;
  private loaders: Map<string, () => Promise<any>>;
  private eventBus: EventBus | null;

  constructor(options: WidgetRegistryOptions = {}) {
    this.definitions = new Map();
    this.components = new Map();
    this.appModules = new Map(); // For app lifecycle hooks
    this.instances = new Map();
    this.loaders = new Map(); // For dynamic loading
    this.eventBus = options.eventBus || null;

    logger.info('Initialized');
  }

  /**
   * Register a widget definition
   * @param {string} id - Widget ID
   * @param {WidgetDefinition} definition - Widget definition
   * @throws {Error} If validation fails or ID already registered
   */
  registerDefinition(id: string, definition: WidgetDefinition): void {
    // Validate definition
    try {
      strictValidateWidgetDefinition(definition);
    } catch (error: any) {
      throw new Error(`Cannot register widget "${id}": ${error.message}`);
    }

    // Check for duplicate registration
    if (this.definitions.has(id)) {
      throw new Error(`Widget definition "${id}" is already registered`);
    }

    // Ensure definition ID matches parameter
    if (definition.id !== id) {
      throw new Error(`Widget definition ID mismatch: expected "${id}", got "${definition.id}"`);
    }

    this.definitions.set(id, definition);
    logger.info(`Registered definition "${id}"`);

    // Emit event if eventBus available
    if (this.eventBus) {
      this.eventBus.emit('registry:definition-registered', { id, definition });
    }
  }

  /**
   * Register multiple widget definitions at once
   * @param {WidgetDefinition[]} definitions - Array of widget definitions
   * @param {boolean} skipErrors - If true, skip invalid definitions instead of throwing
   * @returns {Object} Result with registered count and errors
   */
  registerDefinitions(definitions: WidgetDefinition[], skipErrors = false): { registered: number; errors: string[] } {
    const errors: string[] = [];
    let registered = 0;

    definitions.forEach((definition, index) => {
      try {
        this.registerDefinition(definition.id, definition);
        registered++;
      } catch (error: any) {
        const errorMsg = `Definition ${index} (${definition?.id || 'unknown'}): ${error.message}`;
        errors.push(errorMsg);

        if (!skipErrors) {
          throw new Error(errorMsg);
        } else {
          logger.error(`[WidgetRegistry] ${errorMsg}`);
        }
      }
    });

    return { registered, errors };
  }

  /**
   * Register a widget component class
   * @param {string} id - Widget ID
   * @param {any} ComponentClass - Widget component class or factory function
   * @throws {Error} If definition not registered
   */
  registerComponent(id: string, ComponentClass: any): void {
    if (!this.definitions.has(id)) {
      throw new Error(`Cannot register component "${id}": definition not found. Register definition first.`);
    }

    if (typeof ComponentClass !== 'function') {
      throw new Error(`Component for "${id}" must be a class or function`);
    }

    this.components.set(id, ComponentClass);
    logger.info(`Registered component "${id}"`);

    // Emit event if eventBus available
    if (this.eventBus) {
      this.eventBus.emit('registry:component-registered', { id });
    }
  }

  /**
   * Register a dynamic loader for lazy loading widget components
   * @param {string} id - Widget ID
   * @param {Function} loader - Async function that returns component
   * @example
   * registry.registerLoader('my-widget', () => import('./widgets/my-widget.js'));
   */
  registerLoader(id: string, loader: () => Promise<any>): void {
    if (!this.definitions.has(id)) {
      throw new Error(`Cannot register loader "${id}": definition not found. Register definition first.`);
    }

    if (typeof loader !== 'function') {
      throw new Error(`Loader for "${id}" must be a function`);
    }

    this.loaders.set(id, loader);
    logger.info(`Registered loader "${id}"`);
  }

  /**
   * Get widget definition by ID
   * @param {string} id - Widget ID
   * @returns {WidgetDefinition|null} Widget definition or null
   */
  getDefinition(id: string): WidgetDefinition | null {
    return this.definitions.get(id) || null;
  }

  /**
   * Get all widget definitions
   * @param {Object} filters - Optional filters
   * @returns {WidgetDefinition[]} Array of definitions
   */
  getDefinitions(filters: { type?: string; category?: string; size?: string } = {}): WidgetDefinition[] {
    let definitions = Array.from(this.definitions.values());

    // Filter by type
    if (filters.type) {
      definitions = definitions.filter(d => d.type === filters.type);
    }

    // Filter by category
    if (filters.category) {
      definitions = definitions.filter(d => d.category === filters.category);
    }

    // Filter by size
    if (filters.size) {
      definitions = definitions.filter(d => d.size === filters.size);
    }

    return definitions;
  }

  /**
   * Check if widget definition is registered
   * @param {string} id - Widget ID
   * @returns {boolean} True if registered
   */
  hasDefinition(id: string): boolean {
    return this.definitions.has(id);
  }

  /**
   * Check if widget component is registered
   * @param {string} id - Widget ID
   * @returns {boolean} True if registered
   */
  hasComponent(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * Check if widget loader is registered
   * @param {string} id - Widget ID
   * @returns {boolean} True if registered
   */
  hasLoader(id: string): boolean {
    return this.loaders.has(id);
  }

  /**
   * Get widget component (load dynamically if needed)
   * @param {string} id - Widget ID
   * @returns {Promise<any>} Component class
   */
  async getComponent(id: string): Promise<any> {
    // Return if already loaded
    if (this.components.has(id)) {
      return this.components.get(id);
    }

    // Try to load dynamically
    if (this.loaders.has(id)) {
      const loader = this.loaders.get(id)!;
      logger.info(`Loading component "${id}" dynamically...`);

      try {
        const module = await loader();
        const ComponentClass = module.default || module;

        // Cache the loaded component
        this.components.set(id, ComponentClass);
        logger.info(`Component "${id}" loaded successfully`);

        return ComponentClass;
      } catch (error: any) {
        throw new Error(`Failed to load component "${id}": ${error.message}`);
      }
    }

    throw new Error(`Component "${id}" not found. Register component or loader first.`);
  }

  /**
   * Register an app module with lifecycle hooks
   * @param {string} id - App ID
   * @param {AppModule} appModule - App module with lifecycle hooks
   * @throws {Error} If definition not registered or not an app
   */
  registerAppModule(id: string, appModule: AppModule): void {
    const definition = this.getDefinition(id);
    if (!definition) {
      throw new Error(`Cannot register app module "${id}": definition not found. Register definition first.`);
    }

    if (definition.type !== WidgetType.APP) {
      throw new Error(`Cannot register app module "${id}": definition type is "${definition.type}", expected "app"`);
    }

    if (typeof appModule !== 'object' || appModule === null) {
      throw new Error(`App module for "${id}" must be an object with lifecycle hooks`);
    }

    this.appModules.set(id, appModule);
    logger.info(`Registered app module "${id}" with lifecycle hooks`);
  }

  /**
   * Register an app loader (for dynamic imports with lifecycle hooks)
   * @param {string} id - App ID
   * @param {Function} loader - Async function that returns app module
   * @example
   * registry.registerAppLoader('my-app', () => import('./apps/my-app.js'));
   */
  registerAppLoader(id: string, loader: () => Promise<any>): void {
    // Use the same loaders Map - we'll check if it's an app when loading
    this.registerLoader(id, loader);
  }

  /**
   * Get app module (load dynamically if needed)
   * @param {string} id - App ID
   * @returns {Promise<AppModule|null>} App module with lifecycle hooks, or null if not found
   */
  async getAppModule(id: string): Promise<AppModule | null> {
    // Return if already loaded
    if (this.appModules.has(id)) {
      return this.appModules.get(id)!;
    }

    // Try to load dynamically
    if (this.loaders.has(id)) {
      const loader = this.loaders.get(id)!;
      logger.info(`Loading app module "${id}" dynamically...`);

      try {
        const module = await loader();
        const appModule = module.default || module;

        // Validate it's an app module (has at least one lifecycle hook)
        if (typeof appModule === 'object' && appModule !== null) {
          // Cache the loaded app module
          this.appModules.set(id, appModule);
          logger.info(`App module "${id}" loaded successfully`);
          return appModule;
        } else {
          logger.warn(`Loaded module "${id}" is not a valid app module`);
          return null;
        }
      } catch (error: any) {
        logger.error(`Failed to load app module "${id}": ${error.message}`);
        return null;
      }
    }

    // No app module registered - this is OK, app can work without lifecycle hooks
    logger.info(`No app module registered for "${id}"`);
    return null;
  }

  /**
   * Check if app has lifecycle hooks registered
   * @param {string} id - App ID
   * @returns {boolean} True if app module is registered
   */
  hasAppModule(id: string): boolean {
    return this.appModules.has(id);
  }

  /**
   * Create widget instance
   * @param {string} widgetDefId - Widget definition ID
   * @param {Object} instanceData - Instance data (id, cell, config, etc.)
   * @returns {Promise<any>} Widget instance
   */
  async createInstance(widgetDefId: string, instanceData: any): Promise<any> {
    const definition = this.getDefinition(widgetDefId);
    if (!definition) {
      throw new Error(`Cannot create instance: widget definition "${widgetDefId}" not found`);
    }

    // Get component (load if needed)
    let ComponentClass = null;
    try {
      ComponentClass = await this.getComponent(widgetDefId);
    } catch (error) {
      // Component not registered - this is OK for static widgets
      logger.info(`No component registered for "${widgetDefId}" (using static rendering)`);
    }

    // Create instance data
    const instance = {
      ...instanceData,
      widgetDefId,
      // Enrich with definition data
      name: definition.name,
      icon: definition.icon,
      type: definition.type,
      cols: definition.cols,
      rows: definition.rows,
      category: definition.category
    };

    // Store instance reference
    if (instance.id) {
      this.instances.set(instance.id, instance);
    }

    // If component class exists, instantiate it
    if (ComponentClass) {
      return new ComponentClass({
        definition,
        instance
      });
    }

    // Otherwise return instance data (for static rendering)
    return instance;
  }

  /**
   * Get widget instance by ID
   * @param {string} instanceId - Instance ID
   * @returns {WidgetInstance|null} Instance or null
   */
  getInstance(instanceId: string): WidgetInstance | null {
    return this.instances.get(instanceId) || null;
  }

  /**
   * Remove widget instance
   * @param {string} instanceId - Instance ID
   */
  removeInstance(instanceId: string): void {
    this.instances.delete(instanceId);
    logger.info(`Removed instance "${instanceId}"`);

    if (this.eventBus) {
      this.eventBus.emit('registry:instance-removed', { instanceId });
    }
  }

  /**
   * Unregister widget definition (dangerous - only for testing/hot-reload)
   * @param {string} id - Widget ID
   */
  unregisterDefinition(id: string): void {
    this.definitions.delete(id);
    this.components.delete(id);
    this.loaders.delete(id);
    logger.info(`Unregistered "${id}"`);

    if (this.eventBus) {
      this.eventBus.emit('registry:definition-unregistered', { id });
    }
  }

  /**
   * Clear all registrations (dangerous - only for testing)
   */
  clear(): void {
    this.definitions.clear();
    this.components.clear();
    this.loaders.clear();
    this.instances.clear();
    logger.info('Cleared all registrations');
  }

  /**
   * Get registry statistics
   * @returns {Object} Statistics
   */
  getStats(): { definitions: number; components: number; loaders: number; instances: number; categories: number; types: { widgets: number; apps: number } } {
    return {
      definitions: this.definitions.size,
      components: this.components.size,
      loaders: this.loaders.size,
      instances: this.instances.size,
      categories: this.getCategories().length,
      types: {
        widgets: this.getDefinitions({ type: 'widget' }).length,
        apps: this.getDefinitions({ type: 'app' }).length
      }
    };
  }

  /**
   * Get all unique categories
   * @returns {string[]} Array of category names
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.definitions.forEach(def => {
      if (def.category) {
        categories.add(def.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Export all definitions (for serialization)
   * @returns {WidgetDefinition[]} Array of definitions
   */
  exportDefinitions(): WidgetDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Import definitions (for deserialization)
   * @param {WidgetDefinition[]} definitions - Array of definitions
   * @param {boolean} replace - If true, clear existing definitions first
   */
  importDefinitions(definitions: WidgetDefinition[], replace = false): void {
    if (replace) {
      this.definitions.clear();
    }

    const result = this.registerDefinitions(definitions, true);
    logger.info(`Imported ${result.registered} definitions (${result.errors.length} errors)`);
  }
}

/**
 * Create a new WidgetRegistry instance
 * @param {Object} options - Registry options
 * @returns {WidgetRegistry} Registry instance
 */
export function createWidgetRegistry(options: any = {}): WidgetRegistry {
  return new WidgetRegistry(options);
}
