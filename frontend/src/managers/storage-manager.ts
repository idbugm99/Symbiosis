/**
 * StorageManager
 * Handles data storage for Symbiosis (database-ready structure)
 * Uses localStorage for persistence, falls back to temp-data-file.js for initial data
 *
 * @class
 * @description Single point of abstraction for data persistence. When migrating to database,
 * only this file needs to change - all other code remains unchanged.
 *
 * @example
 * const storage = new StorageManager();
 * const workspaces = storage.loadWorkspaces();
 * storage.saveWorkspaces(updatedWorkspaces);
 */

import tempDataFile from '../data/runtime/temp-data-file.js';
import { safeJSONParse } from '../utils/validators.js';
import { createLogger } from '../utils/logger.js';
import type {
  User,
  Workspace,
  WidgetInstance,
  WidgetDefinition,
  StorageData
} from '../types/index.js';

const logger = createLogger('StorageManager');

export class StorageManager {
  // Properties
  private storageKey: string;
  data: StorageData;

  /**
   * Create a StorageManager instance
   * @constructor
   * @description Loads data from localStorage or initializes from temp-data-file.js
   */
  constructor() {
    this.storageKey = 'symbiosis-data';

    // Try to load from localStorage first
    const savedData = localStorage.getItem(this.storageKey);

    if (savedData) {
      // Parse stored data with validation
      const parsedData = safeJSONParse(savedData, null);

      if (parsedData && typeof parsedData === 'object') {
        this.data = parsedData;
        logger.info('Loaded data from localStorage', this.data);
      } else {
        // If stored data is corrupted, fall back to initial data
        logger.warn('Corrupted localStorage data, loading initial data');
        this.data = safeJSONParse(JSON.stringify(tempDataFile), tempDataFile);
        this.persist();
      }
    } else {
      // Load data from file into memory (first time only)
      // Use safe parse with deep clone to avoid mutations
      this.data = safeJSONParse(JSON.stringify(tempDataFile), tempDataFile);
      logger.info('Loaded initial data from temp-data-file.js', this.data);
      this.persist(); // Save to localStorage immediately
    }
  }

  /**
   * Persist current data to localStorage
   * @description Saves the entire data object to localStorage as JSON
   */
  persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    logger.info('Data persisted to localStorage');
  }

  /**
   * Get user data
   * @returns User object with id, name, email, avatar, timestamps
   * @example
   * const user = storage.getUser();
   * logger.info(user.name); // "Sample User"
   */
  getUser(): User {
    return this.data.user;
  }

  /**
   * Load all workspaces
   * @returns {Array|null} Array of workspace objects or null if empty
   * @description Returns workspace metadata (no widget data - that's in widgetInstances)
   */
  loadWorkspaces() {
    return this.data.workspaces.length > 0 ? this.data.workspaces : null;
  }

  /**
   * Save all workspaces
   * @param {Array} workspaces - Array of workspace objects
   * @returns {void}
   * @description Saves workspace metadata (widgets stored separately)
   */
  saveWorkspaces(workspaces) {
    this.data.workspaces = workspaces;
    this.data.lastSaved = new Date().toISOString();
    this.persist();
    logger.info('Workspaces saved', workspaces);
  }

  /**
   * Load current workspace ID
   * @returns {string|null} Workspace ID or null
   * @description Gets the ID of the currently active workspace
   */
  loadCurrentWorkspaceId() {
    return this.data.currentWorkspaceId;
  }

  /**
   * Save current workspace ID
   * @param {string} workspaceId - Workspace ID
   * @returns {void}
   * @description Sets the currently active workspace
   */
  saveCurrentWorkspaceId(workspaceId) {
    this.data.currentWorkspaceId = workspaceId;
    this.data.lastSaved = new Date().toISOString();
    this.persist();
    logger.info('Current workspace ID saved', workspaceId);
  }

  /**
   * Get widget definitions (catalog/blueprints)
   * @returns {Array} Array of widget definition objects
   * @description Returns the widget catalog imported from widgets-static.js
   * @example
   * const definitions = storage.getWidgetDefinitions();
   * const favoritesDef = definitions.find(d => d.id === 'favorites');
   */
  getWidgetDefinitions() {
    return this.data.widgetDefinitions || [];
  }

  /**
   * Get widget definition by ID
   * @param {string} widgetDefId - Widget definition ID
   * @returns {Object|null} Widget definition or null if not found
   * @description Looks up a single widget definition from the catalog
   * @example
   * const def = storage.getWidgetDefinition('favorites');
   * logger.info(def.name); // "Favorites"
   */
  getWidgetDefinition(widgetDefId) {
    const definitions = this.getWidgetDefinitions();
    return definitions.find(def => def.id === widgetDefId) || null;
  }

  /**
   * Get all widget instances
   * @returns {Array} Array of widget instance objects (bare instances, not enriched)
   * @description Returns raw instance data without definition data
   */
  getWidgetInstances() {
    return this.data.widgetInstances;
  }

  /**
   * Save widget instances
   * @param {Array} instances - Array of widget instance objects
   * @returns {void}
   * @description Saves widget instances to storage (should be bare instances, not enriched)
   */
  saveWidgetInstances(instances) {
    this.data.widgetInstances = instances;
    this.data.lastSaved = new Date().toISOString();
    this.persist();
    logger.info('Widget instances saved to localStorage', instances);
  }

  /**
   * Get widget instances for a specific workspace
   * @param {string} workspaceId - Workspace ID
   * @param {boolean} enriched - If true, merges instance with definition data (default: true)
   * @returns {Array} Array of widget instances (enriched or bare)
   * @description Primary method for loading workspace widgets. Defaults to enriched for convenience.
   * @example
   * // Get enriched instances (with name, icon, etc.)
   * const widgets = storage.getWidgetInstancesForWorkspace('workspace-1');
   *
   * // Get bare instances (only id, cell, config, etc.)
   * const bare = storage.getWidgetInstancesForWorkspace('workspace-1', false);
   */
  getWidgetInstancesForWorkspace(workspaceId, enriched = true) {
    const instances = this.data.widgetInstances.filter(instance => instance.workspaceId === workspaceId);

    if (!enriched) {
      return instances;
    }

    // Enrich instances with definition data
    return instances.map(instance => this.enrichWidgetInstance(instance));
  }

  /**
   * Enrich a widget instance with its definition data
   * @param {Object} instance - Widget instance (bare)
   * @returns {Object} Enriched widget instance (instance + definition merged)
   * @description Merges widget definition (blueprint) with instance (placement/config).
   * Instance properties override definition properties.
   * @example
   * const bare = { id: 'instance-123', widgetDefId: 'favorites', cell: 1 };
   * const enriched = storage.enrichWidgetInstance(bare);
   * // enriched now has: name, icon, type, cols, rows (from def) + id, cell (from instance)
   */
  enrichWidgetInstance(instance) {
    const definition = this.getWidgetDefinition(instance.widgetDefId);

    if (!definition) {
      logger.warn(`Widget definition not found for: ${instance.widgetDefId}`);
      return instance;
    }

    // Merge definition + instance (instance overrides definition)
    return {
      ...definition,      // Definition data (name, icon, type, cols, rows, etc.)
      ...instance,        // Instance data (id, userId, workspaceId, cell, config)
      // Preserve widgetDefId for clarity
      widgetDefId: instance.widgetDefId
    };
  }

  /**
   * Strip definition data from enriched widget (for saving to database)
   * @param {Object} enrichedWidget - Enriched widget instance
   * @returns {Object} Bare instance (only instance-specific data)
   * @description Removes definition fields before persisting. Ensures we don't duplicate
   * definition data in storage (DRY principle).
   * @example
   * const enriched = { id: 'x', widgetDefId: 'favorites', name: 'Favorites', cell: 1, ... };
   * const bare = storage.stripDefinitionData(enriched);
   * // bare = { id: 'x', widgetDefId: 'favorites', cell: 1, config: {}, ... }
   */
  stripDefinitionData(enrichedWidget) {
    // Only keep instance-specific fields
    return {
      id: enrichedWidget.id,
      userId: enrichedWidget.userId,
      workspaceId: enrichedWidget.workspaceId,
      widgetDefId: enrichedWidget.widgetDefId,
      cell: enrichedWidget.cell,
      occupiedCells: enrichedWidget.occupiedCells,
      config: enrichedWidget.config || {},
      createdAt: enrichedWidget.createdAt,
      updatedAt: enrichedWidget.updatedAt
    };
  }

  // ============================================================================
  // DOCK STORAGE METHODS
  // ============================================================================

  /**
   * Load dock apps from localStorage
   * @returns {Array|null} Dock apps array or null if not found
   * @description Loads dock configuration from 'symbiosis-dock-apps' key
   */
  loadDockApps() {
    const stored = localStorage.getItem('symbiosis-dock-apps');
    return safeJSONParse(stored, null);
  }

  /**
   * Save dock apps to localStorage
   * @param {Array} apps - Array of dock app objects
   * @returns {void}
   * @description Saves dock apps and automatically syncs dock order
   */
  saveDockApps(apps) {
    localStorage.setItem('symbiosis-dock-apps', JSON.stringify(apps));

    // Also update dock order to keep in sync
    const dockOrder = apps
      .filter(app => app.type !== 'divider')
      .map(app => app.id);
    this.saveDockOrder(dockOrder);

    logger.info('Dock apps saved');
  }

  /**
   * Load dock order from localStorage
   * @returns {Array|null} Dock order array or null if not found
   * @description Loads dock item order from 'symbiosis-dock-order' key
   */
  loadDockOrder() {
    const stored = localStorage.getItem('symbiosis-dock-order');
    return safeJSONParse(stored, null);
  }

  /**
   * Save dock order to localStorage
   * @param {Array} order - Array of dock app IDs in order
   * @returns {void}
   * @description Saves the order of dock items
   */
  saveDockOrder(order) {
    localStorage.setItem('symbiosis-dock-order', JSON.stringify(order));
  }

  /**
   * Clear all dock data
   * @returns {void}
   * @description Removes both dock apps and dock order from localStorage
   */
  clearDockData() {
    localStorage.removeItem('symbiosis-dock-apps');
    localStorage.removeItem('symbiosis-dock-order');
    logger.info('Dock data cleared');
  }

  // ============================================================================
  // DATA EXPORT/IMPORT
  // ============================================================================

  /**
   * Export current data state (for manual save to file)
   * @returns {string} JSON string of current data
   * @description Exports all data including dock configuration for backup/debugging.
   * Useful for copying current state to temp-data-file.js.
   * @example
   * const json = storage.exportData();
   * logger.info(json); // Copy to temp-data-file.js
   */
  exportData() {
    // Include dock configuration if it exists
    const dockOrder = this.loadDockOrder();

    const exportData = {
      ...this.data,
      dockOrder
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get full data object (for debugging)
   * @returns {Object} Current data state
   * @description Direct access to internal data object. Use sparingly - prefer specific getters.
   */
  getData() {
    return this.data;
  }

  /**
   * Clear all data (reset to empty)
   * @returns {void}
   * @description Removes all workspaces and widgets. User data remains. Use with caution!
   */
  clearAll() {
    this.data.workspaces = [];
    this.data.widgetInstances = [];
    this.data.currentWorkspaceId = null;
    this.persist();
    logger.info('All data cleared');
  }

  /**
   * Reset to initial state (clear localStorage and reload from temp-data-file)
   * @returns {void}
   * @description Completely resets to temp-data-file.js state. Useful for development/testing.
   * @example
   * // Reset to clean state
   * storage.resetToInitial();
   * location.reload(); // Refresh page to see changes
   */
  resetToInitial() {
    localStorage.removeItem(this.storageKey);
    this.clearDockData();
    // Use safe parse with deep clone to reset to initial state
    this.data = safeJSONParse(JSON.stringify(tempDataFile), tempDataFile);
    this.persist();
    logger.info('Reset to initial state from temp-data-file.js');
  }
}
