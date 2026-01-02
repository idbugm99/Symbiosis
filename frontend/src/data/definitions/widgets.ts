// Symbiosis - Static Widgets Data
// Widgets are multi-cell displays with live content

/**
 * Available Widgets
 * Widgets display information and are controlled by their parent apps
 *
 * New Properties:
 * - launchesApp: App ID to open when widget is activated
 * - launchTrigger: 'click' | 'doubleClick' | 'longPress' | 'button'
 * - instanceSettingsOverride: Override default app display settings for this widget
 */
export const availableWidgets = [
  // ============================================================
  // EQUIPMENT CATEGORY
  // ============================================================
  {
    id: 'equipment-search',
    name: 'Equipment',
    icon: '🔬',
    type: 'widget',
    category: 'equipment',
    size: '3x2',
    cols: 3,
    rows: 2,
    description: 'Search and view equipment',
    hasLiveContent: true,
    controlledBy: 'equipment-app',
    headerDisplay: 'never',
    launchesApp: 'equipment-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'fullscreen-no-nav',
      animation: 'slide-right',
      dock: false,
      menuBar: true
    },
    component: 'EquipmentWidget'
  },

  // ============================================================
  // CHEMICALS CATEGORY
  // ============================================================
  {
    id: 'cas-quick-view',
    name: 'CAS Quick View',
    icon: '🧪',
    type: 'widget',
    category: 'chemicals',
    size: '2×1',
    cols: 2,
    rows: 1,
    description: 'Recently viewed chemical entries',
    hasLiveContent: true,
    controlledBy: 'chemicals-app',
    // Header display configuration
    headerDisplay: 'hover',  // Hover to reveal - maximizes content space
    // Launch settings
    launchesApp: 'chemicals-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'popup',
      dimensions: { width: 900, height: 700 },
      position: 'center',
      animation: 'expand-from-widget',
      showCloseButton: true,
      showMinimizeButton: true
    }
  },
  {
    id: 'favorites',
    name: 'Favorites',
    icon: '⭐',
    type: 'widget',
    category: 'chemicals',
    size: '2×1',
    cols: 2,
    rows: 1,
    description: 'Your bookmarked chemicals',
    hasLiveContent: true,
    controlledBy: 'chemicals-app',
    // Header display configuration
    headerDisplay: 'hover',  // Always show - important to see title
    // Launch settings
    launchesApp: 'chemicals-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'fullscreen-no-nav',
      animation: 'slide-right',
      dock: false,
      menuBar: true
    }
  },
  {
    id: 'inventory-alerts',
    name: 'Inventory Alerts',
    icon: '📊',
    type: 'widget',
    category: 'chemicals',
    size: '2×2',
    cols: 2,
    rows: 2,
    description: 'Low stock and expiration warnings',
    hasLiveContent: true,
    controlledBy: 'chemicals-app',
    // Header display configuration
    headerDisplay: 'always',  //  - clean dashboard look
    // Launch settings
    launchesApp: 'chemicals-app',
    launchTrigger: 'click', // Click for quick access to alerts
    instanceSettingsOverride: {
      displayMode: 'popup',
      dimensions: { width: 800, height: 600 },
      position: 'center',
      animation: 'fade'
    }
  },

  // ============================================================
  // EQUIPMENT CATEGORY
  // ============================================================
  {
    id: 'calibration-schedule',
    name: 'Calibration Schedule',
    icon: '📅',
    type: 'widget',
    category: 'equipment',
    size: '2×1',
    cols: 2,
    rows: 1,
    description: 'Upcoming maintenance dates',
    hasLiveContent: true,
    controlledBy: 'equipment-app',
    // Header display configuration
    headerDisplay: 'hover',  // Hover reveals header
    // Launch settings
    launchesApp: 'equipment-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'popup',
      dimensions: { width: 1000, height: 700 },
      position: 'center',
      animation: 'expand-from-widget'
    }
  },
  {
    id: 'status-monitor',
    name: 'Status Monitor',
    icon: '📡',
    type: 'widget',
    category: 'equipment',
    size: '2×2',
    cols: 2,
    rows: 2,
    description: 'Real-time equipment status',
    hasLiveContent: true,
    controlledBy: 'equipment-app',
    // Header display configuration
    headerDisplay: 'hover',  // Hover reveals header
    // Launch settings
    launchesApp: 'equipment-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'fullscreen-no-nav',
      animation: 'slide-right',
      dock: true,
      menuBar: true
    }
  },

  // ============================================================
  // GENETICS CATEGORY
  // ============================================================
  {
    id: 'panel-viewer',
    name: 'Panel Viewer',
    icon: '🧬',
    type: 'widget',
    category: 'genetics',
    size: '4×2',
    cols: 4,
    rows: 2,
    description: 'Cell panel analysis dashboard',
    hasLiveContent: true,
    controlledBy: 'genetics-app',
    // Header display configuration
    headerDisplay: 'hover',  // Hover reveals header
    // Launch settings
    launchesApp: 'genetics-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'fullscreen',
      animation: 'fade',
      dock: false,
      menuBar: false
    }
  },
  {
    id: 'marker-list',
    name: 'Marker List',
    icon: '🎯',
    type: 'widget',
    category: 'genetics',
    size: '2×1',
    cols: 2,
    rows: 1,
    description: 'Genetic markers reference',
    hasLiveContent: true,
    controlledBy: 'genetics-app',
    // Header display configuration
    headerDisplay: 'hover',  // Hover to access controls
    // Launch settings
    launchesApp: 'genetics-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'popup',
      dimensions: { width: 700, height: 600 },
      position: 'center',
      animation: 'expand-from-widget'
    }
  },

  // ============================================================
  // VENDOR TOOLS CATEGORY
  // ============================================================
  {
    id: 'reorder-alerts',
    name: 'Reorder Alerts',
    icon: '🔔',
    type: 'widget',
    category: 'vendors',
    size: '2×1',
    cols: 2,
    rows: 1,
    description: 'Items needing restock',
    hasLiveContent: true,
    controlledBy: 'vendors-app',
    // Header display configuration
    headerDisplay: 'hover',  // Hover reveals header
    // Launch settings
    launchesApp: 'vendors-app',
    launchTrigger: 'click',
    instanceSettingsOverride: {
      displayMode: 'popup',
      dimensions: { width: 800, height: 600 },
      position: 'center',
      animation: 'slide-right'
    }
  },
  {
    id: 'vendor-catalog',
    name: 'Vendor Catalog',
    icon: '📖',
    type: 'widget',
    category: 'vendors',
    size: '2×2',
    cols: 2,
    rows: 2,
    description: 'Browse supplier products',
    hasLiveContent: true,
    controlledBy: 'vendors-app',
    // Header display configuration
    headerDisplay: 'hover',  // Maximize catalog space
    // Launch settings
    launchesApp: 'vendors-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'fullscreen-no-nav',
      animation: 'slide-left',
      dock: true
    }
  },

  // ============================================================
  // AI ASSISTANT CATEGORY
  // ============================================================
  {
    id: 'literature-summary',
    name: 'Literature Summary',
    icon: '📚',
    type: 'widget',
    category: 'ai',
    size: '2×2',
    cols: 2,
    rows: 2,
    description: 'AI-powered article finder',
    hasLiveContent: true,
    controlledBy: 'ai-assistant-app',
    // Header display configuration
    headerDisplay: 'hover',  // Hover reveals header
    // Launch settings
    launchesApp: 'ai-assistant-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'fullscreen-no-nav',
      animation: 'fade',
      dock: false
    }
  },
  {
    id: 'sop-generator',
    name: 'SOP Generator',
    icon: '📝',
    type: 'widget',
    category: 'ai',
    size: '2×1',
    cols: 2,
    rows: 1,
    description: 'Generate standard procedures',
    hasLiveContent: true,
    controlledBy: 'ai-assistant-app',
    // Header display configuration
    headerDisplay: 'always',  // Show generator name
    // Launch settings
    launchesApp: 'ai-assistant-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'popup',
      dimensions: { width: 900, height: 700 },
      position: 'center',
      animation: 'expand-from-widget'
    }
  },

  // ============================================================
  // RESEARCH NOTES CATEGORY
  // ============================================================
  {
    id: 'quick-note',
    name: 'Quick Note',
    icon: '✏️',
    type: 'widget',
    category: 'notes',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Fast note taking widget',
    hasLiveContent: true,
    controlledBy: 'notebook-app',
    // Header display configuration
    headerDisplay: 'never',  // 1×1 minimal - no header
    // Launch settings - opens full notebook app
    launchesApp: 'notebook-app',
    launchTrigger: 'double-click',
    instanceSettingsOverride: {
      displayMode: 'fullscreen-no-nav',
      animation: 'expand-from-widget'
    }
  },
  {
    id: 'notebook-overview',
    name: 'Notebook Overview',
    icon: '📖',
    type: 'widget',
    category: 'notes',
    size: '2×2',
    cols: 2,
    rows: 2,
    description: 'Recent experiments and notes',
    hasLiveContent: true,
    controlledBy: 'notebook-app',
    // Header display configuration
    headerDisplay: 'hover',  // Hover for controls
    // Launch settings
    launchesApp: 'notebook-app',
    launchTrigger: 'doubleClick',
    instanceSettingsOverride: {
      displayMode: 'fullscreen-no-nav',
      animation: 'slide-right',
      dock: true
    }
  }
];
