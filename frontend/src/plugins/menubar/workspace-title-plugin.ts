/**
 * Workspace Title Plugin
 * Displays current workspace name (editable)
 */

import { MenuBarPluginBase } from './plugin-base.js';
import { createLogger } from '../../utils/logger.js';
import type { MenuBarPluginConfig } from '../../types/index.js';

const logger = createLogger('WorkspaceTitlePlugin');

export class WorkspaceTitlePlugin extends MenuBarPluginBase {
  // Properties
  private workspaceManager: any; // WorkspaceManager (avoiding circular dependency)

  constructor(config: MenuBarPluginConfig, manager: any, dependencies: Record<string, any>) {
    super(config, manager, dependencies);

    // Get workspace manager from injected dependencies (no more window.* access!)
    this.workspaceManager = dependencies.workspaceManager;
  }

  init(): void {
    super.init();

    const currentWorkspace = this.getCurrentWorkspace();
    logger.info('init:', {
      workspaceManager: !!this.workspaceManager,
      eventBus: !!this.workspaceManager?.eventBus,
      currentWorkspaceId: this.workspaceManager?.currentWorkspaceId,
      currentWorkspaceName: currentWorkspace?.name,
      workspaceObject: currentWorkspace
    });

    if (!this.workspaceManager) {
      logger.warn('WorkspaceManager not available');
      return;
    }

    // Listen for workspace changes via EventBus
    if (this.workspaceManager.eventBus) {
      this.workspaceManager.eventBus.on('workspace:switched', (workspace) => {
        logger.info('🔄 Received workspace:switched event', {
          workspaceId: workspace?.id,
          workspaceName: workspace?.name,
          fullWorkspace: workspace
        });
        this.refresh();
      });

      this.workspaceManager.eventBus.on('workspace:renamed', (data) => {
        logger.info('✏️ Received workspace:renamed event', {
          workspaceId: data?.workspaceId,
          newName: data?.newName,
          oldName: data?.oldName,
          fullData: data
        });
        this.refresh();
      });

      logger.info('✅ Subscribed to workspace events');
    } else {
      logger.error('EventBus not available on WorkspaceManager');
    }
  }

  render(): HTMLElement {
    // Use existing workspace-name CSS class
    const container = document.createElement('div');
    container.className = 'workspace-name';
    container.id = 'workspace-name';

    // Get current workspace
    const workspace = this.getCurrentWorkspace();

    logger.info('🎨 render() called', {
      hasWorkspace: !!workspace,
      workspaceId: workspace?.id,
      workspaceName: workspace?.name,
      currentWorkspaceId: this.workspaceManager?.currentWorkspaceId
    });

    if (!workspace) {
      container.textContent = 'Default';
      return container;
    }

    // Set workspace name
    container.textContent = workspace.name || 'Default';

    // Make editable if enabled (using long-press like the original)
    if (this.settings.editable) {
      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'workspace-name-tooltip';
      tooltip.textContent = 'Click and hold to rename workspace.';
      container.appendChild(tooltip);

      // Long-press to edit (matching existing behavior)
      let longPressTimer;
      container.addEventListener('mousedown', () => {
        longPressTimer = setTimeout(() => {
          container.classList.add('long-press-active');
          this.enableEditing(container, workspace);
        }, 500); // 500ms long press
      });

      container.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
        container.classList.remove('long-press-active');
      });

      container.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer);
        container.classList.remove('long-press-active');
      });
    }

    return container;
  }

  /**
   * Get font size from style setting
   * @returns {string} Font size CSS value
   */
  getSizeFromStyle() {
    const sizes = {
      'small': '14px',
      'medium': '16px',
      'large': '18px'
    };

    return sizes[this.settings.style] || sizes['large'];
  }

  /**
   * Get current workspace from workspace manager
   * @returns {Object|null} Current workspace object or null
   */
  getCurrentWorkspace() {
    if (this.workspaceManager && this.workspaceManager.currentWorkspaceId) {
      return this.workspaceManager.workspaces.find(
        w => w.id === this.workspaceManager.currentWorkspaceId
      );
    }

    return null;
  }

  /**
   * Enable editing mode for workspace title
   * @param {HTMLElement} titleElement - Title text element
   * @param {Object} workspace - Workspace object
   */
  enableEditing(titleElement, workspace) {
    const currentName = workspace.name;

    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = this.settings.maxLength || 50;
    input.style.border = '1px solid #2563eb';
    input.style.borderRadius = '4px';
    input.style.padding = '4px 8px';
    input.style.fontSize = this.getSizeFromStyle();
    input.style.fontWeight = '600';
    input.style.outline = 'none';
    input.style.backgroundColor = '#ffffff';
    input.style.width = '200px';

    // Replace title text with input
    titleElement.replaceWith(input);

    // Focus and select
    input.focus();
    input.select();

    // Save on Enter or blur
    const saveEdit = () => {
      const newName = input.value.trim();

      if (newName && newName !== currentName) {
        this.renameWorkspace(workspace.id, newName);
      }

      // Re-render to show updated title
      this.refresh();
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.refresh(); // Cancel edit
      }
    });

    // Stop propagation to prevent container click
    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Rename workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} newName - New workspace name
   */
  renameWorkspace(workspaceId, newName) {
    logger.info(`Renaming workspace ${workspaceId} to "${newName}"`);

    if (this.workspaceManager) {
      // Find workspace and update name
      const workspace = this.workspaceManager.workspaces.find(w => w.id === workspaceId);

      if (workspace) {
        workspace.name = newName;

        // Save to storage
        this.workspaceManager.saveWorkspace();

        logger.info('✅ Workspace renamed');

        // //FUTURE: Emit event
        // this.emit('workspace-renamed', { workspaceId, newName });
      }
    }
  }

  /**
   * Refresh the plugin (re-render)
   */
  refresh() {
    logger.info('🔄 refresh() called', {
      hasElement: !!this.element,
      currentWorkspace: this.getCurrentWorkspace()
    });

    if (this.element) {
      const newElement = this.render();

      // Preserve MenuBarManager classes and attributes
      newElement.dataset.pluginId = this.id;
      newElement.classList.add('menubar-plugin', `menubar-plugin-${this.id}`);

      // Replace in DOM
      this.element.replaceWith(newElement);
      this.element = newElement;

      logger.info('✅ Refreshed with workspace', this.getCurrentWorkspace()?.name);
    } else {
      logger.warn('⚠️ refresh() called but no element exists');
    }
  }

  /**
   * Update plugin when workspace changes
   * @param {Object} data - Update data
   */
  update(data: any): void {
    logger.info('📥 update() called', {
      data: data,
      willRefresh: !!(data.workspaceChanged || data.workspaceRenamed)
    });

    if (data.workspaceChanged || data.workspaceRenamed) {
      this.refresh();
    }
  }
}
