/**
 * StorageManager
 * Handles data storage for Symbiosis (database-ready structure)
 * Uses localStorage for persistence, falls back to temp-data-file.js for initial data
 */

import tempDataFile from '../data/temp-data-file.js';

export class StorageManager {
  constructor() {
    this.storageKey = 'symbiosis-data';

    // Try to load from localStorage first
    const savedData = localStorage.getItem(this.storageKey);

    if (savedData) {
      this.data = JSON.parse(savedData);
      console.log('StorageManager: Loaded data from localStorage', this.data);
    } else {
      // Load data from file into memory (first time only)
      this.data = JSON.parse(JSON.stringify(tempDataFile)); // Deep clone to avoid mutations
      console.log('StorageManager: Loaded initial data from temp-data-file.js', this.data);
      this.persist(); // Save to localStorage immediately
    }
  }

  /**
   * Persist current data to localStorage
   */
  persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    console.log('StorageManager: Data persisted to localStorage');
  }

  /**
   * Get user data
   * @returns {Object} User object
   */
  getUser() {
    return this.data.user;
  }

  /**
   * Load all workspaces
   * @returns {Array} Array of workspace objects
   */
  loadWorkspaces() {
    return this.data.workspaces.length > 0 ? this.data.workspaces : null;
  }

  /**
   * Save all workspaces
   * @param {Array} workspaces - Array of workspace objects
   */
  saveWorkspaces(workspaces) {
    this.data.workspaces = workspaces;
    this.data.lastSaved = new Date().toISOString();
    this.persist();
    console.log('StorageManager: Workspaces saved', workspaces);
  }

  /**
   * Load current workspace ID
   * @returns {string|null} Workspace ID or null
   */
  loadCurrentWorkspaceId() {
    return this.data.currentWorkspaceId;
  }

  /**
   * Save current workspace ID
   * @param {string} workspaceId - Workspace ID
   */
  saveCurrentWorkspaceId(workspaceId) {
    this.data.currentWorkspaceId = workspaceId;
    this.data.lastSaved = new Date().toISOString();
    this.persist();
    console.log('StorageManager: Current workspace ID saved', workspaceId);
  }

  /**
   * Get all widget instances
   * @returns {Array} Array of widget instance objects
   */
  getWidgetInstances() {
    return this.data.widgetInstances;
  }

  /**
   * Save widget instances
   * @param {Array} instances - Array of widget instance objects
   */
  saveWidgetInstances(instances) {
    this.data.widgetInstances = instances;
    this.data.lastSaved = new Date().toISOString();
    this.persist();
    console.log('StorageManager: Widget instances saved to localStorage', instances);
  }

  /**
   * Get widget instances for a specific workspace
   * @param {string} workspaceId - Workspace ID
   * @returns {Array} Array of widget instances
   */
  getWidgetInstancesForWorkspace(workspaceId) {
    return this.data.widgetInstances.filter(instance => instance.workspaceId === workspaceId);
  }

  /**
   * Export current data state (for manual save to file)
   * Includes dock configuration from separate localStorage key
   * @returns {string} JSON string of current data
   */
  exportData() {
    // Include dock configuration if it exists
    const dockOrder = localStorage.getItem('symbiosis-dock-order');
    const exportData = {
      ...this.data,
      dockOrder: dockOrder ? JSON.parse(dockOrder) : null
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get full data object (for debugging)
   * @returns {Object} Current data state
   */
  getData() {
    return this.data;
  }

  /**
   * Clear all data (reset to empty)
   */
  clearAll() {
    this.data.workspaces = [];
    this.data.widgetInstances = [];
    this.data.currentWorkspaceId = null;
    this.persist();
    console.log('StorageManager: All data cleared');
  }

  /**
   * Reset to initial state (clear localStorage and reload from temp-data-file)
   */
  resetToInitial() {
    localStorage.removeItem(this.storageKey);
    this.data = JSON.parse(JSON.stringify(tempDataFile));
    this.persist();
    console.log('StorageManager: Reset to initial state from temp-data-file.js');
  }
}
