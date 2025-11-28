/**
 * StorageManager
 * Handles all localStorage operations for Symbiosis
 */

const STORAGE_KEYS = {
  WORKSPACES: 'symbiosis-workspaces',
  CURRENT_WORKSPACE: 'symbiosis-current-workspace'
};

export class StorageManager {
  /**
   * Load all workspaces from localStorage
   * @returns {Array} Array of workspace objects
   */
  loadWorkspaces() {
    const saved = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load workspaces:', e);
      }
    }
    return null;
  }

  /**
   * Save all workspaces to localStorage
   * @param {Array} workspaces - Array of workspace objects
   */
  saveWorkspaces(workspaces) {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces));
    } catch (e) {
      console.error('Failed to save workspaces:', e);
    }
  }

  /**
   * Load current workspace ID from localStorage
   * @returns {string|null} Workspace ID or null
   */
  loadCurrentWorkspaceId() {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load current workspace ID:', e);
      }
    }
    return null;
  }

  /**
   * Save current workspace ID to localStorage
   * @param {string} workspaceId - Workspace ID
   */
  saveCurrentWorkspaceId(workspaceId) {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, JSON.stringify(workspaceId));
    } catch (e) {
      console.error('Failed to save current workspace ID:', e);
    }
  }

  /**
   * Clear all Symbiosis data from localStorage
   */
  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.WORKSPACES);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_WORKSPACE);
  }
}
