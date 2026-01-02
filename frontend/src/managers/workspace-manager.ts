/**
 * WorkspaceManager
 * Handles workspace switching, creation, renaming, deletion, and UI updates
 *
 * @class
 * @description Manages workspace lifecycle and switching. Uses EventBus for decoupled
 * communication. Handles workspace dots UI, name editing, and validation.
 *
 * @example
 * const workspaceManager = new WorkspaceManager({
 *   eventBus: myEventBus,
 *   storageManager: myStorageManager
 * });
 *
 * // Listen for workspace switches
 * eventBus.on('workspace:switched', (workspace) => {
 *   console.log('Switched to:', workspace.name);
 * });
 */

import { StorageManager } from './storage-manager.js';
import { domHelper } from '../utils/dom-helpers.js';
import { createLogger } from '../utils/logger.js';
import type {
  Workspace,
  WorkspaceManagerOptions,
  EventBus,
  DOMHelper,
  WidgetRegistry
} from '../types/index.js';

const logger = createLogger('WorkspaceManager');

export class WorkspaceManager {
  // Properties
  private storageManager: StorageManager;
  private eventBus: EventBus | null;
  private dom: DOMHelper;
  workspaces: Workspace[];
  currentWorkspaceId: string;
  private dropdownOpen: boolean = false;
  private widgetRegistry: WidgetRegistry | null;

  /**
   * Create a WorkspaceManager instance
   * @constructor
   * @param options - Configuration options
   * @param options.eventBus - EventBus instance for event communication
   * @param options.storageManager - StorageManager instance for persistence
   * @param options.widgetRegistry - WidgetRegistry instance for widget management
   * @param options.domHelper - DOM helper utilities
   */
  constructor(options: WorkspaceManagerOptions) {
    this.storageManager = options.storageManager || new StorageManager();
    this.eventBus = options.eventBus || null;
    this.dom = options.domHelper || domHelper;
    this.widgetRegistry = options.widgetRegistry || null;

    // State
    this.workspaces = this.loadAllWorkspaces();
    this.currentWorkspaceId = this.loadCurrentWorkspaceId();

    // Setup event listeners
    if (this.eventBus) {
      this.setupEventListeners();
    }

    // Setup button event listeners (needs to be called after DOM is ready)
    setTimeout(() => this.setupWorkspaceButtons(), 0);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Auto-save workspace when widgets change
    this.eventBus.on('widgets:changed', () => {
      this.saveWorkspace();
    });
  }

  /**
   * Load all workspaces from storage (blank slate - no defaults)
   * @returns {Array} Array of workspace objects
   */
  loadAllWorkspaces() {
    const saved = this.storageManager.loadWorkspaces();

    if (saved) {
      return saved;
    }

    // Start with blank slate (no default workspaces)
    // User can create workspaces manually or edit temp-data-file.js
    return [];
  }

  /**
   * Load current workspace ID from storage
   * @returns {string} Workspace ID
   */
  loadCurrentWorkspaceId() {
    const saved = this.storageManager.loadCurrentWorkspaceId();
    return saved || 'workspace-1';
  }

  /**
   * Get current workspace object
   * @returns {Object} Current workspace
   */
  getCurrentWorkspace() {
    return this.workspaces.find(w => w.id === this.currentWorkspaceId) || this.workspaces[0];
  }

  /**
   * Save current workspace metadata (widgets stored separately in widgetInstances)
   */
  saveWorkspace() {
    const currentWorkspace = this.getCurrentWorkspace();
    currentWorkspace.updatedAt = new Date().toISOString();

    this.saveAllWorkspaces();

    logger.info('Workspace saved:', currentWorkspace.name);
  }

  /**
   * Save all workspaces to storage
   */
  saveAllWorkspaces() {
    this.storageManager.saveWorkspaces(this.workspaces);
    this.storageManager.saveCurrentWorkspaceId(this.currentWorkspaceId);
  }

  /**
   * Switch to a different workspace
   * @param {string} workspaceId - ID of workspace to switch to
   * @returns {void}
   * @description Saves current workspace, clears grid, emits events for loading new workspace
   * @fires workspace:switched
   * @fires grid:cleared
   */
  switchWorkspace(workspaceId) {
    if (workspaceId === this.currentWorkspaceId) {
      logger.info('Already on workspace:', workspaceId);
      return;
    }

    // Save current workspace before switching (only if it still exists)
    const currentWorkspaceStillExists = this.workspaces.find(w => w.id === this.currentWorkspaceId);
    if (currentWorkspaceStillExists) {
      this.saveWorkspace();
    } else {
      logger.info('Current workspace was deleted, skipping save');
    }

    // Switch to new workspace
    this.currentWorkspaceId = workspaceId;
    const newWorkspace = this.getCurrentWorkspace();

    // Emit events instead of direct calls
    if (this.eventBus) {
      this.eventBus.emit('grid:cleared');
      this.eventBus.emit('workspace:switched', newWorkspace);
    }

    // Update UI
    this.updateWorkspaceUI();

    // Save current workspace ID
    this.storageManager.saveCurrentWorkspaceId(this.currentWorkspaceId);

    logger.info('Switched to workspace:', newWorkspace.name);
  }

  /**
   * Create a new workspace (auto-named "New workspace")
   * @returns {void}
   * @description Creates workspace with timestamp ID, saves to storage, switches to it.
   * Note: Widgets stored separately in widgetInstances, not in workspace object.
   * @fires workspace:switched (via switchWorkspace)
   */
  createNewWorkspace() {
    // Generate new workspace ID
    const newId = `workspace-${Date.now()}`;

    // Get user from storage for userId
    const user = this.storageManager.getUser();

    const newWorkspace = {
      id: newId,
      userId: user.id,
      name: 'New workspace',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.workspaces.push(newWorkspace);
    this.saveAllWorkspaces();

    // Switch to new workspace
    this.switchWorkspace(newId);

    logger.info('Created new workspace: New workspace');
  }

  /**
   * Start inline editing of workspace name
   */
  startInlineRename() {
    const nameElement = this.dom.getElementById('workspace-name');
    if (!nameElement) return;

    const currentWorkspace = this.getCurrentWorkspace();
    const currentName = currentWorkspace.name;

    // Replace text with input
    const input = this.dom.createElement('input', 'workspace-name-input', {
      type: 'text',
      id: 'workspace-name-input'
    });
    input.value = currentName;

    // Replace element
    nameElement.replaceWith(input);

    // Focus and select all
    input.focus();
    input.select();

    // Save on Enter
    const handleSave = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        currentWorkspace.name = newName;
        currentWorkspace.updatedAt = new Date().toISOString();
        this.saveAllWorkspaces();
        logger.info('Renamed workspace to:', newName);
      }
      this.updateWorkspaceUI();
    };

    // Cancel on Escape
    const handleCancel = () => {
      this.updateWorkspaceUI();
    };

    // Keyboard handlers
    this.dom.addEventListener(input, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });

    // Save on blur (click outside)
    this.dom.addEventListener(input, 'blur', handleSave);
  }

  /**
   * Rename a workspace (DEPRECATED - using inline editing now)
   */
  renameWorkspace(workspaceId) {
    this.startInlineRename();
  }

  /**
   * Delete current workspace
   * @returns {boolean} True if deleted successfully, false if validation failed
   * @description Validates workspace is empty (no widgets) and not the last workspace.
   * Shows confirmation dialog. On success, switches to adjacent workspace.
   * @fires workspace:switched (via switchWorkspace)
   */
  deleteCurrentWorkspace() {
    const currentWorkspace = this.getCurrentWorkspace();

    // Can't delete last workspace
    if (this.workspaces.length === 1) {
      alert('Cannot delete the last workspace. You must have at least one workspace.');
      return false;
    }

    // Check if workspace has widgets (query from storage, no manager coupling)
    const widgets = this.storageManager.getWidgetInstancesForWorkspace(this.currentWorkspaceId, false);
    if (widgets && widgets.length > 0) {
      alert(`Cannot delete workspace with widgets.\n\nThis workspace contains ${widgets.length} widget(s).\nPlease move or delete the widgets first.`);
      return false;
    }

    // Confirm deletion
    if (!confirm(`Delete workspace "${currentWorkspace.name}"?\n\nThis action cannot be undone.`)) {
      return false;
    }

    // Find the current workspace index
    const currentIndex = this.workspaces.findIndex(w => w.id === this.currentWorkspaceId);

    // Remove workspace
    this.workspaces = this.workspaces.filter(w => w.id !== this.currentWorkspaceId);
    this.saveAllWorkspaces();

    // Switch to appropriate workspace:
    // - If we deleted the last workspace, switch to the new last workspace (previous one)
    // - Otherwise, switch to the workspace now at the same index (which was the next one)
    let targetIndex;
    if (currentIndex >= this.workspaces.length) {
      // Deleted the last workspace, go to new last workspace
      targetIndex = this.workspaces.length - 1;
    } else {
      // Switch to workspace at same index (was the next workspace)
      targetIndex = currentIndex;
    }

    this.switchWorkspace(this.workspaces[targetIndex].id);

    logger.info('Deleted workspace:', currentWorkspace.name, '- Switched to index', targetIndex);
    return true;
  }

  /**
   * Toggle workspace dropdown menu (DEPRECATED - keeping for compatibility)
   */
  toggleWorkspaceDropdown() {
    this.dropdownOpen = !this.dropdownOpen;

    const dropdown = this.dom.getElementById('workspace-dropdown');
    const menu = this.dom.getElementById('workspace-dropdown-menu');

    if (this.dropdownOpen) {
      this.dom.toggleClass(dropdown, 'dropdown-open', true);
      this.dom.toggleClass(menu, 'show', true);
      this.renderWorkspaceDots();

      // Close dropdown when clicking outside
      setTimeout(() => {
        this.dom.addEventListener(document, 'click', this.closeDropdownOnClickOutside.bind(this));
      }, 0);
    } else {
      this.dom.toggleClass(dropdown, 'dropdown-open', false);
      this.dom.toggleClass(menu, 'show', false);
      // Note: Cannot easily remove addEventListener without storing cleanup function
    }
  }

  /**
   * Close dropdown when clicking outside
   */
  closeDropdownOnClickOutside(e) {
    const dropdown = this.dom.getElementById('workspace-dropdown');
    const menu = this.dom.getElementById('workspace-dropdown-menu');

    if (!dropdown.contains(e.target) && !menu.contains(e.target)) {
      this.dropdownOpen = false;
      this.dom.toggleClass(dropdown, 'dropdown-open', false);
      this.dom.toggleClass(menu, 'show', false);
      // Note: Cannot easily remove addEventListener without storing cleanup function
    }
  }

  /**
   * Update all workspace UI elements
   */
  updateWorkspaceUI() {
    const currentWorkspace = this.getCurrentWorkspace();

    // NOTE: Workspace name is now managed by WorkspaceTitlePlugin via MenuBar system
    // Do NOT manipulate the workspace-name element here as it will conflict with the plugin

    // Check if we're currently in edit mode (input exists) - keep for backward compatibility
    const inputElement = this.dom.getElementById('workspace-name-input');
    if (inputElement) {
      // If edit mode is active, cancel it - the plugin will handle workspace name display
      const nameElement = this.dom.createElement('div', 'workspace-name', {
        id: 'workspace-name'
      });
      nameElement.innerHTML = `${currentWorkspace.name}<div class="workspace-name-tooltip">Click and hold to rename workspace.</div>`;
      inputElement.replaceWith(nameElement);

      // Trigger a refresh of the plugin to ensure it takes over
      if ((window as any).menuBarManager) {
        const plugin = (window as any).menuBarManager.getPlugin('workspace-title');
        if (plugin && typeof plugin.refresh === 'function') {
          plugin.refresh();
        }
      }
    }

    this.renderWorkspaceDots();
    // Do NOT call setupWorkspaceNameLongPress() - the plugin handles that now
  }

  /**
   * Render workspace dots with click handlers and tooltips
   */
  renderWorkspaceDots() {
    const container = this.dom.getElementById('workspace-dots');
    if (!container) return;

    this.dom.clearChildren(container);

    this.workspaces.forEach((workspace, index) => {
      const dot = this.dom.createElement('div', 'workspace-dot', {
        dataset: {
          workspaceName: workspace.name,
          workspaceId: workspace.id
        }
      });

      if (workspace.id === this.currentWorkspaceId) {
        this.dom.toggleClass(dot, 'active', true);
      }

      // Create tooltip element
      const shortcutKey = index + 1;
      const tooltip = this.dom.createText(
        `${workspace.name} (Ctrl+${shortcutKey})`,
        'div',
        'workspace-dot-tooltip'
      );
      dot.appendChild(tooltip);

      // Tooltip hover with 2-second delay
      let tooltipTimer = null;

      this.dom.addEventListener(dot, 'mouseenter', () => {
        tooltipTimer = setTimeout(() => {
          this.dom.toggleClass(dot, 'show-tooltip', true);
        }, 2000);
      });

      this.dom.addEventListener(dot, 'mouseleave', () => {
        if (tooltipTimer) {
          clearTimeout(tooltipTimer);
          tooltipTimer = null;
        }
        this.dom.toggleClass(dot, 'show-tooltip', false);
      });

      // Click to switch workspace
      this.dom.addEventListener(dot, 'click', (e) => {
        e.stopPropagation();
        this.switchWorkspace(workspace.id);
      });

      container.appendChild(dot);
    });
  }

  /**
   * Setup long-press handler for workspace name (rename)
   */
  setupWorkspaceNameLongPress() {
    const nameElement = this.dom.getElementById('workspace-name');
    if (!nameElement) return;

    let pressTimer = null;
    let tooltipTimer = null;

    // Remove old listeners by cloning
    const newElement = nameElement.cloneNode(true);
    nameElement.replaceWith(newElement);
    const newNameElement = this.dom.getElementById('workspace-name');

    const handlePressStart = (e) => {
      e.preventDefault();

      // Start long-press timer (500ms)
      pressTimer = setTimeout(() => {
        this.dom.toggleClass(newNameElement, 'long-press-active', true);
        this.startInlineRename();
      }, 500);
    };

    const handlePressEnd = (e) => {
      // Clear timer if released before 500ms
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      this.dom.toggleClass(newNameElement, 'long-press-active', false);
    };

    // Tooltip hover handlers (2 second delay)
    const handleMouseEnter = () => {
      logger.info('🖱️ Mouse entered workspace name - tooltip will show in 2s');
      // Show tooltip after 2 seconds
      tooltipTimer = setTimeout(() => {
        logger.info('✅ Showing tooltip');
        this.dom.toggleClass(newNameElement, 'show-tooltip', true);
      }, 2000);
    };

    const handleMouseLeave = () => {
      logger.info('🖱️ Mouse left workspace name - hiding tooltip');
      // Clear tooltip timer and hide tooltip
      if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
      }
      this.dom.toggleClass(newNameElement, 'show-tooltip', false);
    };

    // Add new listeners
    this.dom.addEventListener(newNameElement, 'mousedown', handlePressStart);
    this.dom.addEventListener(newNameElement, 'mouseup', handlePressEnd);
    this.dom.addEventListener(newNameElement, 'mouseleave', handlePressEnd);
    this.dom.addEventListener(newNameElement, 'touchstart', handlePressStart);
    this.dom.addEventListener(newNameElement, 'touchend', handlePressEnd);

    // Add tooltip hover listeners
    this.dom.addEventListener(newNameElement, 'mouseenter', handleMouseEnter);
    this.dom.addEventListener(newNameElement, 'mouseleave', handleMouseLeave);
  }

  /**
   * Setup event listeners for workspace buttons
   * NOTE: Buttons are created by workspace-switcher-plugin.js which also attaches
   * the click handlers. This method is no longer needed but kept for backward compatibility.
   */
  setupWorkspaceButtons() {
    // REMOVED: Duplicate event listeners
    // The workspace-switcher-plugin.js already attaches click handlers when creating the buttons:
    // - Line 55: deleteBtn.addEventListener('click', () => this.handleDeleteWorkspace())
    // - Line 81: addBtn.addEventListener('click', () => this.handleAddWorkspace())
    //
    // Adding listeners here caused double-execution bugs (e.g., creating two workspaces on single click)

    logger.info('WorkspaceManager: setupWorkspaceButtons() called (handlers managed by plugin)');
  }
}
