// Symbiosis - Static Widget and Workspace Data

/**
 * Available Widgets and Apps
 *
 * Types:
 * - 'app': Single icon (1×1), clicks open full page
 * - 'widget': Multi-cell display with live content
 */
export const availableWidgets = [
  // ============================================================
  // CHEMICALS CATEGORY
  // ============================================================
  {
    id: 'chemicals-app',
    name: 'Chemicals',
    icon: '🧪',
    type: 'app',
    category: 'chemicals',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open chemicals database',
    opensPage: '/pages/chemicals.html'
  },
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
    hasLiveContent: true
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
    hasLiveContent: true
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
    hasLiveContent: true
  },

  // ============================================================
  // EQUIPMENT CATEGORY
  // ============================================================
  {
    id: 'equipment-app',
    name: 'Equipment',
    icon: '🔬',
    type: 'app',
    category: 'equipment',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open equipment manager',
    opensPage: '/pages/equipment.html'
  },
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
    hasLiveContent: true
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
    hasLiveContent: true
  },
  {
    id: 'equipment-list',
    name: 'Equipment List',
    icon: '📋',
    type: 'app',
    category: 'equipment',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Quick access to all equipment',
    opensPage: '/pages/equipment.html'
  },

  // ============================================================
  // GENETICS CATEGORY
  // ============================================================
  {
    id: 'genetics-app',
    name: 'Genetics',
    icon: '🧬',
    type: 'app',
    category: 'genetics',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open genetics module',
    opensPage: '/pages/genetics.html'
  },
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
    hasLiveContent: true
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
    hasLiveContent: true
  },

  // ============================================================
  // VENDOR TOOLS CATEGORY
  // ============================================================
  {
    id: 'vendors-app',
    name: 'Vendors',
    icon: '📦',
    type: 'app',
    category: 'vendors',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open vendor manager',
    opensPage: '/pages/vendors.html'
  },
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
    hasLiveContent: true
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
    hasLiveContent: true
  },

  // ============================================================
  // AI ASSISTANT CATEGORY
  // ============================================================
  {
    id: 'ai-assistant-app',
    name: 'AI Assistant',
    icon: '🤖',
    type: 'app',
    category: 'ai',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open AI assistant',
    opensPage: '/pages/ai-assistant.html'
  },
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
    hasLiveContent: true
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
    hasLiveContent: true
  },
  {
    id: 'explain-mode',
    name: 'Explain This',
    icon: '💡',
    type: 'app',
    category: 'ai',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Educational mode for students',
    opensPage: '/pages/explain.html'
  },

  // ============================================================
  // RESEARCH NOTES CATEGORY
  // ============================================================
  {
    id: 'notebook-app',
    name: 'Notebook',
    icon: '📓',
    type: 'app',
    category: 'notes',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open research notebook',
    opensPage: '/pages/notebook.html'
  },
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
    hasLiveContent: true
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
    hasLiveContent: true
  }
];

/**
 * Default Workspaces
 * Each workspace stores widget placements
 */
export const workspaces = [
  {
    id: 'workspace-1',
    name: 'Default',
    widgets: [
      // Example: Pre-placed widgets for testing
      // {
      //   appId: 'chemicals-app',
      //   startCell: 15, // Center-ish
      //   cols: 1,
      //   rows: 1,
      //   occupiedCells: [15]
      // }
    ]
  },
  {
    id: 'workspace-2',
    name: 'Lab Work',
    widgets: []
  },
  {
    id: 'workspace-3',
    name: 'Research',
    widgets: []
  }
];

/**
 * Grid Configuration
 */
export const gridConfig = {
  columns: 6,
  rows: 5,
  totalCells: 30,
  cellSize: 140,
  gap: 24
};

/**
 * Helper Functions
 */

/**
 * Get center cells for smart placement
 * Returns cells near the center of the grid
 */
export function getCenterCells() {
  // For 6×5 grid (30 cells):
  // Center area is roughly: 14, 15, 16, 17, 20, 21, 22, 23
  return [15, 16, 14, 17, 21, 22, 20, 23];
}

/**
 * Calculate which cells a widget occupies
 * @param {number} startCell - Top-left cell (1-based)
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 */
export function calculateOccupiedCells(startCell, cols, rows) {
  const cells = [];
  const startRow = Math.floor((startCell - 1) / gridConfig.columns);
  const startCol = (startCell - 1) % gridConfig.columns;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellRow = startRow + r;
      const cellCol = startCol + c;

      // Check bounds
      if (cellCol < gridConfig.columns && cellRow < gridConfig.rows) {
        const cellNumber = cellRow * gridConfig.columns + cellCol + 1;
        cells.push(cellNumber);
      }
    }
  }

  return cells;
}

/**
 * Check if widget fits at given position
 * @param {number} startCell - Starting cell position
 * @param {number} cols - Widget columns
 * @param {number} rows - Widget rows
 */
export function canWidgetFitAt(startCell, cols, rows) {
  const startRow = Math.floor((startCell - 1) / gridConfig.columns);
  const startCol = (startCell - 1) % gridConfig.columns;

  // Check if widget would overflow grid
  if (startCol + cols > gridConfig.columns) return false;
  if (startRow + rows > gridConfig.rows) return false;

  return true;
}

/**
 * Get widget definition by ID
 */
export function getWidgetById(id) {
  return availableWidgets.find(w => w.id === id);
}

/**
 * Get category display info
 */
export const categoryInfo = {
  chemicals: { name: 'Chemicals', icon: '🧪' },
  equipment: { name: 'Equipment', icon: '🔬' },
  genetics: { name: 'Genetics', icon: '🧬' },
  vendors: { name: 'Vendor Tools', icon: '📦' },
  ai: { name: 'AI Assistant', icon: '🤖' },
  notes: { name: 'Research Notes', icon: '📓' }
};
