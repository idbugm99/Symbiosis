/**
 * Widget and App Definitions Index
 * Central export point for all widget/app catalog data
 *
 * @module definitions
 * @description Exports combined widget/app catalog and individual collections
 */

import { availableApps } from './apps.js';
import { availableWidgets as widgetsOnly } from './widgets.js';

/**
 * Export separated collections
 */
export { availableApps, widgetsOnly as availableWidgetsOnly };

/**
 * Combined list of all widgets and apps
 * @type {Array}
 * @description Sorted by category, then by name
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
