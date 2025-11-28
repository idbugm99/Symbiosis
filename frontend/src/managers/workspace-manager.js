/**
 * WorkspaceManager
 * Handles workspace switching, creation, renaming, and UI updates
 */

import { StorageManager } from './storage-manager.js';

export class WorkspaceManager {
  constructor(options = {}) {
    this.storageManager = new StorageManager();

    // Callbacks for integrating with other managers
    this.onWorkspaceSwitch = options.onWorkspaceSwitch || (() => {});
    this.getWidgets = options.getWidgets || (() => []);
    this.clearGrid = options.clearGrid || (() => {});
    this.renderWidget = options.renderWidget || (() => {});
    this.showWelcome = options.showWelcome || (() => {});
    this.hideWelcome = options.hideWelcome || (() => {});

    // State
    this.workspaces = this.loadAllWorkspaces();
    this.currentWorkspaceId = this.loadCurrentWorkspaceId();
    this.dropdownOpen = false;
  }

  /**
   * Load all workspaces from storage or create defaults
   * @returns {Array} Array of workspace objects
   */
  loadAllWorkspaces() {
    const saved = this.storageManager.loadWorkspaces();

    if (saved) {
      return saved;
    }

    // Default workspaces if none exist
    return [
      { id: 'workspace-1', name: 'Default', widgets: [], lastModified: new Date().toISOString() },
      { id: 'workspace-2', name: 'Lab Work', widgets: [], lastModified: new Date().toISOString() },
      { id: 'workspace-3', name: 'Research', widgets: [], lastModified: new Date().toISOString() }
    ];
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
   * Save current workspace with current widgets
   */
  saveWorkspace() {
    const currentWorkspace = this.getCurrentWorkspace();
    currentWorkspace.widgets = this.getWidgets();
    currentWorkspace.lastModified = new Date().toISOString();

    this.saveAllWorkspaces();

    console.log('Workspace saved:', currentWorkspace.name);
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
   */
  switchWorkspace(workspaceId) {
    if (workspaceId === this.currentWorkspaceId) {
      console.log('Already on workspace:', workspaceId);
      return;
    }

    // Save current workspace before switching
    this.saveWorkspace();

    // Switch to new workspace
    this.currentWorkspaceId = workspaceId;
    const newWorkspace = this.getCurrentWorkspace();

    // Clear current widgets from grid
    this.clearGrid();

    // Load new workspace widgets
    if (newWorkspace.widgets && newWorkspace.widgets.length > 0) {
      newWorkspace.widgets.forEach(widget => {
        this.renderWidget(widget);
      });
      this.hideWelcome();
    } else {
      this.showWelcome();
    }

    // Update UI
    this.updateWorkspaceUI();

    // Save current workspace ID
    this.storageManager.saveCurrentWorkspaceId(this.currentWorkspaceId);

    // Notify other managers
    this.onWorkspaceSwitch(newWorkspace);

    console.log('Switched to workspace:', newWorkspace.name);
  }

  /**
   * Create a new workspace
   */
  createNewWorkspace() {
    const name = prompt('Enter workspace name:');

    if (!name || name.trim() === '') {
      return;
    }

    // Generate new workspace ID
    const newId = `workspace-${Date.now()}`;

    const newWorkspace = {
      id: newId,
      name: name.trim(),
      widgets: [],
      lastModified: new Date().toISOString()
    };

    this.workspaces.push(newWorkspace);
    this.saveAllWorkspaces();

    // Switch to new workspace
    this.switchWorkspace(newId);

    console.log('Created new workspace:', name);
  }

  /**
   * Rename a workspace
   * @param {string} workspaceId - ID of workspace to rename
   */
  renameWorkspace(workspaceId) {
    const workspace = this.workspaces.find(w => w.id === workspaceId);
    if (!workspace) {
      console.error('Workspace not found:', workspaceId);
      return;
    }

    const newName = prompt('Enter new workspace name:', workspace.name);

    if (!newName || newName.trim() === '' || newName.trim() === workspace.name) {
      return;
    }

    // Update workspace name
    workspace.name = newName.trim();
    workspace.lastModified = new Date().toISOString();

    // Save changes
    this.saveAllWorkspaces();

    // Update UI
    this.updateWorkspaceUI();

    console.log('Renamed workspace to:', newName);
  }

  /**
   * Toggle workspace dropdown menu
   */
  toggleWorkspaceDropdown() {
    this.dropdownOpen = !this.dropdownOpen;

    const dropdown = document.getElementById('workspace-dropdown');
    const menu = document.getElementById('workspace-dropdown-menu');

    if (this.dropdownOpen) {
      dropdown.classList.add('dropdown-open');
      menu.classList.add('show');
      this.renderWorkspaceDropdown();

      // Close dropdown when clicking outside
      setTimeout(() => {
        document.addEventListener('click', this.closeDropdownOnClickOutside.bind(this));
      }, 0);
    } else {
      dropdown.classList.remove('dropdown-open');
      menu.classList.remove('show');
      document.removeEventListener('click', this.closeDropdownOnClickOutside.bind(this));
    }
  }

  /**
   * Close dropdown when clicking outside
   */
  closeDropdownOnClickOutside(e) {
    const dropdown = document.getElementById('workspace-dropdown');
    const menu = document.getElementById('workspace-dropdown-menu');

    if (!dropdown.contains(e.target) && !menu.contains(e.target)) {
      this.dropdownOpen = false;
      dropdown.classList.remove('dropdown-open');
      menu.classList.remove('show');
      document.removeEventListener('click', this.closeDropdownOnClickOutside.bind(this));
    }
  }

  /**
   * Update all workspace UI elements
   */
  updateWorkspaceUI() {
    const currentWorkspace = this.getCurrentWorkspace();
    document.getElementById('current-workspace-name').textContent = currentWorkspace.name;
    this.renderWorkspaceIndicators();
    this.renderWorkspaceDropdown();
  }

  /**
   * Render workspace indicator dots
   */
  renderWorkspaceIndicators() {
    const container = document.getElementById('workspace-indicators');
    if (!container) return;

    container.innerHTML = '';

    this.workspaces.forEach(workspace => {
      const dot = document.createElement('div');
      dot.className = 'workspace-indicator';
      dot.dataset.workspaceName = workspace.name;
      dot.dataset.workspaceId = workspace.id;

      if (workspace.id === this.currentWorkspaceId) {
        dot.classList.add('active');
      }

      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchWorkspace(workspace.id);
        if (this.dropdownOpen) {
          this.toggleWorkspaceDropdown();
        }
      });

      container.appendChild(dot);
    });
  }

  /**
   * Render workspace dropdown menu
   */
  renderWorkspaceDropdown() {
    const container = document.getElementById('workspace-menu-list');
    if (!container) return;

    container.innerHTML = '';

    this.workspaces.forEach(workspace => {
      const item = document.createElement('div');
      item.className = 'workspace-menu-item';

      if (workspace.id === this.currentWorkspaceId) {
        item.classList.add('active');
      }

      // Create name container with checkmark for active workspace
      const nameContainer = document.createElement('div');
      nameContainer.className = 'workspace-menu-item-name';
      nameContainer.textContent = workspace.name;

      // Create edit icon
      const editIcon = document.createElement('span');
      editIcon.className = 'workspace-menu-item-edit';
      editIcon.textContent = '✏️';
      editIcon.title = 'Rename workspace';

      // Edit icon click handler (prevent workspace switch)
      editIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.renameWorkspace(workspace.id);
      });

      // Workspace item click handler (switch workspace)
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchWorkspace(workspace.id);
        this.toggleWorkspaceDropdown();
      });

      item.appendChild(nameContainer);
      item.appendChild(editIcon);
      container.appendChild(item);
    });
  }
}
