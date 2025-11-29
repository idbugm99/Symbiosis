/**
 * HotkeyManager
 * Centralized keyboard shortcut handling for Symbiosis
 * Manages context-aware shortcuts (desktop vs widget-focused)
 */

export class HotkeyManager {
  constructor(options = {}) {
    // References to other managers
    this.workspaceManager = options.workspaceManager || null;
    this.widgetManager = options.widgetManager || null;
    this.desktopManager = options.desktopManager || null;

    // Hotkey context management
    this.currentContext = 'desktop'; // 'desktop', 'widget-focused', 'drawer-open'
    this.contexts = {
      desktop: true,      // Desktop shortcuts active by default
      widgetFocused: false,
      drawerOpen: false
    };

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
    console.log('  Desktop Context:');
    console.log('    Ctrl+1-9: Switch to workspace 1-9');
    console.log('    Ctrl+N: Add new widget');
    console.log('  Widget Context: (when widget is focused)');
    console.log('    TBD: Widget-specific shortcuts');
  }

  /**
   * Set the current hotkey context
   * @param {string} context - Context name ('desktop', 'widget-focused', 'drawer-open')
   */
  setContext(context) {
    this.currentContext = context;
    console.log(`Hotkey context: ${context}`);
  }

  /**
   * Check if desktop shortcuts should be active
   * @returns {boolean}
   */
  isDesktopContext() {
    return this.currentContext === 'desktop';
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyPress(e) {
    // Only handle desktop shortcuts in desktop context
    if (!this.isDesktopContext()) {
      return;
    }

    // Desktop Context Shortcuts
    // Ctrl/Cmd + Number keys (workspace switching)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const num = parseInt(e.key);

      // Workspace switching: Ctrl+1-9
      if (!isNaN(num) && num >= 1 && num <= 9) {
        e.preventDefault();
        this.switchToWorkspace(num);
        return;
      }

      // New widget: Ctrl+N
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.openWidgetDrawer();
        return;
      }
    }

    // Note: Widget-specific shortcuts will be handled separately
    // when a widget has focus (different context)
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

  /**
   * Open the widget drawer to add a new widget
   */
  openWidgetDrawer() {
    if (!this.desktopManager) {
      console.error('DesktopManager not available');
      return;
    }

    // Call the drawer opening method on desktop manager
    if (typeof this.desktopManager.openDrawer === 'function') {
      this.desktopManager.openDrawer();
      console.log('Hotkey: Opened widget drawer');
    } else if (typeof window.openWidgetDrawer === 'function') {
      // Fallback to global function if it exists
      window.openWidgetDrawer();
      console.log('Hotkey: Opened widget drawer (fallback)');
    } else {
      console.error('Cannot find widget drawer open function');
    }
  }

  // Future hotkey methods can be added here:
  // - closeCurrentWidget()
  // - saveWorkspace()
  // - toggleWidgetDrawer()
  // etc.
}
