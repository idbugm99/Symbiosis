// Symbiosis - Static Widgets Data
// Widgets are multi-cell displays with live content

/**
 * Available Widgets
 * Widgets display information and are controlled by their parent apps
 */
export const availableWidgets = [
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
    controlledBy: 'chemicals-app'
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
    controlledBy: 'chemicals-app'
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
    controlledBy: 'chemicals-app'
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
    controlledBy: 'equipment-app'
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
    controlledBy: 'equipment-app'
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
    controlledBy: 'genetics-app'
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
    controlledBy: 'genetics-app'
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
    controlledBy: 'vendors-app'
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
    controlledBy: 'vendors-app'
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
    controlledBy: 'ai-assistant-app'
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
    controlledBy: 'ai-assistant-app'
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
    controlledBy: 'notebook-app'
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
    controlledBy: 'notebook-app'
  }
];
