/**
 * Global Type Declarations for Symbiosis Desktop
 * Extends built-in types and declares global objects
 */

// Extend Window interface for global manager access
declare global {
  interface Window {
    // ======================================================================
    // CORE MANAGERS (Deprecated: Use dependency injection instead)
    // ======================================================================
    // These are exposed globally for debugging/console access only.
    // Production code should receive these via constructor injection.
    // Plugins now receive dependencies via MenuBarManager.dependencies.
    // See: orchestrators/desktop-initializer.ts for proper DI pattern.

    desktopManager: any;
    workspaceManager: any;
    hotkeyManager: any;
    storageManager: any;
    menuBarManager: any;

    // ======================================================================
    // DEBUG UTILITIES (Keep for development/debugging)
    // ======================================================================
    // These are intentionally exposed for console debugging and monitoring

    errorBoundary: any;        // Error handling and recovery
    perfMonitor: any;          // Performance monitoring
    widgetRegistry: any;       // Widget/app registry

    // ======================================================================
    // MEMORY MANAGEMENT UTILITIES
    // ======================================================================
    // Global functions for data export/import (development feature)

    saveMemory: () => void;
    loadMemory: () => void;
    clearMemory: () => void;
    exportData: () => string;

    // Drawer helpers (legacy - consider removing)
    openWidgetDrawer?: () => void;
    closeWidgetDrawer?: () => void;
  }

  // Extend Performance interface for memory API (Chrome-specific)
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// Make this a module to avoid polluting global scope
export {};
