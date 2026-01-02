/**
 * Workspace Switcher Plugin
 * Displays workspace dots/pills for quick workspace switching
 */

import { MenuBarPluginBase } from './plugin-base.js';
import type { MenuBarPluginConfig } from '../../types/index.js';

export class WorkspaceSwitcherPlugin extends MenuBarPluginBase {
  // Properties
  private workspaceManager: any; // WorkspaceManager (avoiding circular dependency)
  private lastWorkspaceCount: number;
  private lastActiveId: string | null;
  private pollInterval: NodeJS.Timeout | null;

  constructor(config: MenuBarPluginConfig, manager: any, dependencies: Record<string, any>) {
    super(config, manager, dependencies);

    // Get workspace manager from injected dependencies (no more window.* access!)
    this.workspaceManager = dependencies.workspaceManager;
    this.pollInterval = null;
    this.lastWorkspaceCount = 0;
    this.lastActiveId = null;

    if (!this.workspaceManager) {
      console.warn('WorkspaceSwitcherPlugin: WorkspaceManager not provided in dependencies');
    }
  }

  init(): void {
    super.init();

    // Listen for workspace changes (check every 500ms for changes)
    this.lastWorkspaceCount = this.getWorkspaces().length;
    this.lastActiveId = this.workspaceManager?.currentWorkspaceId;

    this.pollInterval = setInterval(() => {
      const currentCount = this.getWorkspaces().length;
      const currentActiveId = this.workspaceManager?.currentWorkspaceId;

      if (currentCount !== this.lastWorkspaceCount || currentActiveId !== this.lastActiveId) {
        this.lastWorkspaceCount = currentCount;
        this.lastActiveId = currentActiveId;
        this.refresh();
      }
    }, 500);
  }

  render(): HTMLElement {
    // Use existing workspace-controls CSS class
    const container = document.createElement('div');
    container.className = 'workspace-controls';
    container.setAttribute('aria-label', 'Workspace Controls');

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'workspace-btn workspace-delete-btn';
    deleteBtn.id = 'workspace-delete-btn';
    deleteBtn.title = 'Delete workspace';
    deleteBtn.textContent = '−';
    deleteBtn.addEventListener('click', () => this.handleDeleteWorkspace());
    container.appendChild(deleteBtn);

    // Workspace dots container
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'workspace-dots';
    dotsContainer.id = 'workspace-dots';

    // Get workspaces and render dots
    const workspaces = this.getWorkspaces();
    workspaces.forEach((workspace, index) => {
      if (index < this.settings.maxVisible) {
        const dot = this.createWorkspaceDot(workspace, index + 1);
        dotsContainer.appendChild(dot);
      }
    });

    container.appendChild(dotsContainer);

    // Add button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'workspace-btn workspace-add-btn';
    addBtn.id = 'workspace-add-btn';
    addBtn.title = 'Add workspace';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => this.handleAddWorkspace());
    container.appendChild(addBtn);

    return container;
  }

  /**
   * Create a workspace dot
   * @param {Object} workspace - Workspace object
   * @param {number} index - Workspace index (1-based)
   * @returns {HTMLElement} Workspace dot element
   */
  createWorkspaceDot(workspace, index) {
    // Create dot button (uses existing CSS)
    const dot = document.createElement('button');
    dot.type = 'button'; // Prevent form submission
    dot.className = 'workspace-dot';
    dot.dataset.workspaceId = workspace.id;
    dot.dataset.workspaceIndex = index;

    // Force size constraints (backup for dynamically created elements)
    // This ensures dots stay small even when dynamically refreshed
    dot.style.width = '10px';
    dot.style.height = '10px';
    dot.style.minWidth = '10px';
    dot.style.minHeight = '10px';
    dot.style.padding = '0';
    dot.style.fontSize = '0';
    dot.style.lineHeight = '0';

    // Check if this is the active workspace
    const isActive = this.workspaceManager && workspace.id === this.workspaceManager.currentWorkspaceId;
    if (isActive) {
      dot.classList.add('active');
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'workspace-dot-tooltip';
    tooltip.textContent = `${workspace.name} (Ctrl+${index})`;
    dot.appendChild(tooltip);

    // Click handler
    dot.addEventListener('click', () => {
      this.switchWorkspace(workspace.id);
    });

    // Show tooltip on hover (with delay)
    let tooltipTimeout;
    dot.addEventListener('mouseenter', () => {
      tooltipTimeout = setTimeout(() => {
        dot.classList.add('show-tooltip');
      }, 800); // 800ms delay
    });

    dot.addEventListener('mouseleave', () => {
      clearTimeout(tooltipTimeout);
      dot.classList.remove('show-tooltip');
    });

    return dot;
  }

  /**
   * Create "Add Workspace" button
   * @returns {HTMLElement} Add button element
   */
  createAddButton() {
    const addButton = document.createElement('button');
    addButton.className = 'workspace-add-btn';
    addButton.textContent = '+';
    addButton.title = 'Add Workspace';

    // Styling
    addButton.style.width = '24px';
    addButton.style.height = '24px';
    addButton.style.borderRadius = '50%';
    addButton.style.border = '2px dashed #d1d5db';
    addButton.style.backgroundColor = 'transparent';
    addButton.style.color = '#9ca3af';
    addButton.style.fontSize = '16px';
    addButton.style.fontWeight = '600';
    addButton.style.cursor = 'pointer';
    addButton.style.transition = 'all 0.2s ease';
    addButton.style.display = 'flex';
    addButton.style.alignItems = 'center';
    addButton.style.justifyContent = 'center';

    // Click handler
    addButton.onclick = () => {
      this.addWorkspace();
    };

    // Hover effect
    addButton.addEventListener('mouseenter', () => {
      addButton.style.borderColor = '#2563eb';
      addButton.style.color = '#2563eb';
      addButton.style.transform = 'scale(1.1)';
    });

    addButton.addEventListener('mouseleave', () => {
      addButton.style.borderColor = '#d1d5db';
      addButton.style.color = '#9ca3af';
      addButton.style.transform = 'scale(1)';
    });

    return addButton;
  }

  /**
   * Get workspaces from workspace manager
   * @returns {Array} Array of workspace objects
   */
  getWorkspaces() {
    if (this.workspaceManager && this.workspaceManager.workspaces) {
      return this.workspaceManager.workspaces;
    }

    // Fallback: return empty array
    return [];
  }

  /**
   * Switch to workspace
   * @param {string} workspaceId - Workspace ID
   */
  switchWorkspace(workspaceId) {
    console.log('WorkspaceSwitcherPlugin: Switching to workspace', workspaceId);

    if (this.workspaceManager) {
      this.workspaceManager.switchWorkspace(workspaceId);

      // Re-render to update active state
      this.refresh();

      // //FUTURE: Emit event
      // this.emit('workspace-changed', { workspaceId });
    }
  }

  /**
   * Handle add workspace button click
   */
  handleAddWorkspace() {
    if (this.workspaceManager) {
      this.workspaceManager.createNewWorkspace();
      // Let the polling mechanism handle the refresh
      // This avoids race conditions with workspace switching
    }
  }

  /**
   * Handle delete workspace button click
   */
  handleDeleteWorkspace() {
    if (this.workspaceManager) {
      this.workspaceManager.deleteCurrentWorkspace();
      // Let the polling mechanism handle the refresh
      // This avoids race conditions with workspace switching
    }
  }

  /**
   * Add new workspace (deprecated - use handleAddWorkspace)
   */
  addWorkspace() {
    console.log('WorkspaceSwitcherPlugin: Adding new workspace');

    // Prompt for workspace name
    const name = prompt('Enter workspace name:');

    if (name && this.workspaceManager) {
      const newWorkspace = this.workspaceManager.createWorkspace(name);

      // Re-render to show new workspace
      this.refresh();

      // Switch to new workspace
      this.switchWorkspace(newWorkspace.id);

      // //FUTURE: Emit event
      // this.emit('workspace-added', { workspace: newWorkspace });
    }
  }

  /**
   * Refresh the plugin (re-render)
   */
  refresh() {
    if (this.element) {
      const newElement = this.render();
      this.element.replaceWith(newElement);
      this.element = newElement;
    }
  }

  /**
   * Update plugin when workspace changes
   * @param {Object} data - Update data
   */
  update(data: any): void {
    if (data.workspaceChanged) {
      this.refresh();
    }
  }

  /**
   * Destroy plugin and clean up resources
   * Override to clean up interval
   */
  destroy() {
    // Clear polling interval to prevent memory leaks
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Call parent destroy to clean up DOM
    super.destroy();
  }
}
