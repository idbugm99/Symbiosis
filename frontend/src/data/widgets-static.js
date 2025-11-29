// Symbiosis - Combined Data (imports from separate app and widget files)

import { availableApps } from './apps-static.js';
import { availableWidgets as widgetsOnly } from './widgets-only-static.js';

/**
 * Export separated apps and widgets
 */
export { availableApps, widgetsOnly as availableWidgetsOnly };

/**
 * Combined list for backward compatibility
 * (This combines both apps and widgets into one array)
 */
export const availableWidgets = [
  ...availableApps,
  ...widgetsOnly
].sort((a, b) => {
  // Sort by category first, then by name
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  return a.name.localeCompare(b.name);
});

// Old inline array removed - now imported from:
//   - apps-static.js (for apps)
//   - widgets-only-static.js (for widgets)

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
