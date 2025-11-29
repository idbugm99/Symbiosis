/**
 * WorkspaceManager
 * Handles workspace switching, creation, renaming, and UI updates
 */

import { StorageManager } from './storage-manager.js';

export class WorkspaceManager {
  constructor(options = {}) {
    this.storageManager = options.storageManager || new StorageManager();

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

    // Setup button event listeners (needs to be called after DOM is ready)
    setTimeout(() => this.setupWorkspaceButtons(), 0);
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
   * Create a new workspace (auto-named "New workspace")
   */
  createNewWorkspace() {
    // Generate new workspace ID
    const newId = `workspace-${Date.now()}`;

    const newWorkspace = {
      id: newId,
      name: 'New workspace',
      widgets: [],
      lastModified: new Date().toISOString()
    };

    this.workspaces.push(newWorkspace);
    this.saveAllWorkspaces();

    // Switch to new workspace
    this.switchWorkspace(newId);

    console.log('Created new workspace: New workspace');
  }

  /**
   * Start inline editing of workspace name
   */
  startInlineRename() {
    const nameElement = document.getElementById('workspace-name');
    if (!nameElement) return;

    const currentWorkspace = this.getCurrentWorkspace();
    const currentName = currentWorkspace.name;

    // Replace text with input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'workspace-name-input';
    input.value = currentName;
    input.id = 'workspace-name-input';

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
        currentWorkspace.lastModified = new Date().toISOString();
        this.saveAllWorkspaces();
        console.log('Renamed workspace to:', newName);
      }
      this.updateWorkspaceUI();
    };

    // Cancel on Escape
    const handleCancel = () => {
      this.updateWorkspaceUI();
    };

    // Keyboard handlers
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });

    // Save on blur (click outside)
    input.addEventListener('blur', handleSave);
  }

  /**
   * Rename a workspace (DEPRECATED - using inline editing now)
   */
  renameWorkspace(workspaceId) {
    this.startInlineRename();
  }

  /**
   * Delete current workspace
   * Validates that workspace is empty and not the last one
   */
  deleteCurrentWorkspace() {
    const currentWorkspace = this.getCurrentWorkspace();

    // Can't delete last workspace
    if (this.workspaces.length === 1) {
      alert('Cannot delete the last workspace. You must have at least one workspace.');
      return false;
    }

    // Check if workspace has widgets
    const widgets = this.getWidgets();
    if (widgets && widgets.length > 0) {
      alert(`Cannot delete workspace with widgets.\n\nThis workspace contains ${widgets.length} widget(s).\nPlease move or delete the widgets first.`);
      return false;
    }

    // Confirm deletion
    if (!confirm(`Delete workspace "${currentWorkspace.name}"?\n\nThis action cannot be undone.`)) {
      return false;
    }

    // Remove workspace
    this.workspaces = this.workspaces.filter(w => w.id !== this.currentWorkspaceId);
    this.saveAllWorkspaces();

    // Switch to first remaining workspace
    this.switchWorkspace(this.workspaces[0].id);

    console.log('Deleted workspace:', currentWorkspace.name);
    return true;
  }

  /**
   * Toggle workspace dropdown menu (DEPRECATED - keeping for compatibility)
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

    // Check if we're currently in edit mode (input exists)
    const inputElement = document.getElementById('workspace-name-input');
    if (inputElement) {
      // Replace input with the name element
      const nameElement = document.createElement('div');
      nameElement.className = 'workspace-name';
      nameElement.id = 'workspace-name';
      nameElement.innerHTML = `${currentWorkspace.name}<div class="workspace-name-tooltip">Click and hold to rename workspace.</div>`;
      inputElement.replaceWith(nameElement);
    } else {
      // Normal update of existing name element
      const nameElement = document.getElementById('workspace-name');
      if (nameElement) {
        // Preserve the tooltip element
        const tooltip = nameElement.querySelector('.workspace-name-tooltip');
        if (tooltip) {
          nameElement.innerHTML = `${currentWorkspace.name}<div class="workspace-name-tooltip">Click and hold to rename workspace.</div>`;
        } else {
          nameElement.innerHTML = `${currentWorkspace.name}<div class="workspace-name-tooltip">Click and hold to rename workspace.</div>`;
        }
      }
    }

    this.renderWorkspaceDots();
    this.setupWorkspaceNameLongPress();
  }

  /**
   * Render workspace dots with click handlers and tooltips
   */
  renderWorkspaceDots() {
    const container = document.getElementById('workspace-dots');
    if (!container) return;

    container.innerHTML = '';

    this.workspaces.forEach((workspace, index) => {
      const dot = document.createElement('div');
      dot.className = 'workspace-dot';
      dot.dataset.workspaceName = workspace.name;
      dot.dataset.workspaceId = workspace.id;

      if (workspace.id === this.currentWorkspaceId) {
        dot.classList.add('active');
      }

      // Create tooltip element
      const tooltip = document.createElement('div');
      tooltip.className = 'workspace-dot-tooltip';
      const shortcutKey = index + 1;
      tooltip.textContent = `${workspace.name} (Ctrl+${shortcutKey})`;
      dot.appendChild(tooltip);

      // Tooltip hover with 2-second delay
      let tooltipTimer = null;

      dot.addEventListener('mouseenter', () => {
        tooltipTimer = setTimeout(() => {
          dot.classList.add('show-tooltip');
        }, 2000);
      });

      dot.addEventListener('mouseleave', () => {
        if (tooltipTimer) {
          clearTimeout(tooltipTimer);
          tooltipTimer = null;
        }
        dot.classList.remove('show-tooltip');
      });

      // Click to switch workspace
      dot.addEventListener('click', (e) => {
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
    const nameElement = document.getElementById('workspace-name');
    if (!nameElement) return;

    let pressTimer = null;
    let tooltipTimer = null;

    // Remove old listeners by cloning
    const newElement = nameElement.cloneNode(true);
    nameElement.replaceWith(newElement);
    const newNameElement = document.getElementById('workspace-name');

    const handlePressStart = (e) => {
      e.preventDefault();

      // Start long-press timer (500ms)
      pressTimer = setTimeout(() => {
        newNameElement.classList.add('long-press-active');
        this.startInlineRename();
      }, 500);
    };

    const handlePressEnd = (e) => {
      // Clear timer if released before 500ms
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      newNameElement.classList.remove('long-press-active');
    };

    // Tooltip hover handlers (2 second delay)
    const handleMouseEnter = () => {
      console.log('🖱️ Mouse entered workspace name - tooltip will show in 2s');
      // Show tooltip after 2 seconds
      tooltipTimer = setTimeout(() => {
        console.log('✅ Showing tooltip');
        newNameElement.classList.add('show-tooltip');
      }, 2000);
    };

    const handleMouseLeave = () => {
      console.log('🖱️ Mouse left workspace name - hiding tooltip');
      // Clear tooltip timer and hide tooltip
      if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
      }
      newNameElement.classList.remove('show-tooltip');
    };

    // Add new listeners
    newNameElement.addEventListener('mousedown', handlePressStart);
    newNameElement.addEventListener('mouseup', handlePressEnd);
    newNameElement.addEventListener('mouseleave', handlePressEnd);
    newNameElement.addEventListener('touchstart', handlePressStart);
    newNameElement.addEventListener('touchend', handlePressEnd);

    // Add tooltip hover listeners
    newNameElement.addEventListener('mouseenter', handleMouseEnter);
    newNameElement.addEventListener('mouseleave', handleMouseLeave);
  }

  /**
   * Setup event listeners for workspace buttons
   */
  setupWorkspaceButtons() {
    // Add workspace button
    const addBtn = document.getElementById('workspace-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.createNewWorkspace();
      });
    }

    // Delete workspace button
    const deleteBtn = document.getElementById('workspace-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteCurrentWorkspace();
      });
    }
  }
}
