/**
 * HotkeyManager
 * Centralized keyboard shortcut handling for Symbiosis
 */

export class HotkeyManager {
  constructor(options = {}) {
    // References to other managers
    this.workspaceManager = options.workspaceManager || null;
    this.widgetManager = options.widgetManager || null;

    // Setup keyboard event listeners
    this.setupKeyboardShortcuts();
  }

  /**
   * Setup all keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      this.handleKeyPress(e);
    });

    console.log('Keyboard shortcuts enabled:');
    console.log('  Ctrl+1-9: Switch to workspace 1-9');
    // Add more shortcut documentation here as features are added
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyPress(e) {
    // Ctrl/Cmd + Number keys (workspace switching)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const num = parseInt(e.key);

      // Check if it's a number key 1-9
      if (!isNaN(num) && num >= 1 && num <= 9) {
        e.preventDefault();
        this.switchToWorkspace(num);
        return;
      }
    }

    // Add more keyboard shortcuts here as needed
    // Example:
    // - Ctrl+N: New widget
    // - Ctrl+W: Close widget
    // - Ctrl+S: Save workspace
    // - Escape: Close menus/drawers
  }

  /**
   * Switch to workspace by index
   * @param {number} index - Workspace index (1-based)
   */
  switchToWorkspace(index) {
    if (!this.workspaceManager) {
      console.error('WorkspaceManager not available');
      return;
    }

    if (index < 1 || index > this.workspaceManager.workspaces.length) {
      console.log(`Workspace ${index} does not exist`);
      return;
    }

    const workspace = this.workspaceManager.workspaces[index - 1];
    if (workspace) {
      this.workspaceManager.switchWorkspace(workspace.id);
      console.log(`Hotkey: Switched to workspace ${index}: ${workspace.name}`);
    }
  }

  // Future hotkey methods can be added here:
  // - createNewWidget()
  // - closeCurrentWidget()
  // - saveWorkspace()
  // - toggleWidgetDrawer()
  // etc.
}
