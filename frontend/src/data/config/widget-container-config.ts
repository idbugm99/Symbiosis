/**
 * Widget Container Configuration
 *
 * Defines how widget containers behave based on size.
 * Size (grid dimensions) is the source of truth for layout.
 * Behavior flags control rendering, not names.
 *
 * Separation of concerns:
 * - grid (w, h) → layout math
 * - form_factor → human-readable label + default bundle
 * - behavior flags → actual rendering/interaction control
 */

/**
 * Behavior Flag Schema
 * All possible flags and their allowed values
 */
export const BEHAVIOR_SCHEMA = {
  // Header/Chrome
  chrome: ['none', 'minimal', 'titlebar', 'full'],
  headerDisplay: ['never', 'hover', 'always'],

  // Scrolling
  scroll: ['none', 'vertical', 'horizontal', 'both', 'auto'],

  // Density/Spacing
  density: ['compact', 'normal', 'comfortable', 'spacious'],

  // Interaction
  interaction: ['none', 'click-through', 'selectable', 'draggable', 'editable'],

  // Content overflow
  overflow: ['hidden', 'ellipsis', 'wrap', 'scroll'],

  // Padding
  padding: ['none', 'xs', 'sm', 'md', 'lg'],

  // Border radius
  radius: ['none', 'sm', 'md', 'lg', 'full']
};

/**
 * Form Factor Definitions
 * Maps size → default behavior bundle
 */
export const FORM_FACTORS = {
  // 1×1 - Small square tile (apps or widgets)
  'tile': {
    sizes: ['1x1'],
    label: 'Tile',
    description: 'Small square for app launchers or compact widgets (clock, gauge, quick-note)',
    defaults: {
      chrome: 'minimal',
      headerDisplay: 'never',
      scroll: 'none',
      density: 'compact',
      interaction: 'selectable',  // Neutral - apps/widgets override as needed
      overflow: 'hidden',
      padding: 'sm',
      radius: 'md'
    }
  },

  // 2×1 - Horizontal strip
  'strip': {
    sizes: ['2x1'],
    label: 'Strip',
    description: 'Horizontal bar for compact lists or quick info',
    defaults: {
      chrome: 'titlebar',
      headerDisplay: 'hover',
      scroll: 'horizontal',
      density: 'compact',
      interaction: 'selectable',
      overflow: 'scroll',
      padding: 'sm',
      radius: 'md'
    }
  },

  // 2×2 - Square card
  'card': {
    sizes: ['2x2'],
    label: 'Card',
    description: 'Square module for balanced content display',
    defaults: {
      chrome: 'titlebar',
      headerDisplay: 'always',
      scroll: 'auto',
      density: 'normal',
      interaction: 'selectable',
      overflow: 'scroll',
      padding: 'md',
      radius: 'md'
    }
  },

  // 4×2 - Wide panel
  'panel': {
    sizes: ['4x2', '3x2'],
    label: 'Panel',
    description: 'Wide dashboard for complex visualizations',
    defaults: {
      chrome: 'full',
      headerDisplay: 'always',
      scroll: 'both',
      density: 'comfortable',
      interaction: 'selectable',
      overflow: 'scroll',
      padding: 'lg',
      radius: 'md'
    }
  }
};

/**
 * Size-to-Form-Factor Lookup Table
 * Quick lookup: size string → form factor key
 */
export const SIZE_TO_FORM_FACTOR = {
  '1x1': 'tile',
  '2x1': 'strip',
  '2x2': 'card',
  '3x2': 'panel',
  '4x2': 'panel'
};

/**
 * Get default behavior for a given size
 * @param {string} size - Size string (e.g., '2x1')
 * @returns {Object} Default behavior configuration
 */
export function getDefaultsForSize(size) {
  const formFactorKey = SIZE_TO_FORM_FACTOR[size];
  if (!formFactorKey) {
    console.warn(`No form factor defined for size: ${size}`);
    return FORM_FACTORS['card'].defaults; // Fallback
  }

  const formFactor = FORM_FACTORS[formFactorKey];
  return {
    form_factor: formFactorKey,
    form_factor_label: formFactor.label,
    ...formFactor.defaults
  };
}

/**
 * Merge widget-specific overrides with size defaults
 * @param {string} size - Size string (e.g., '2x1')
 * @param {Object} overrides - Widget-specific behavior overrides
 * @returns {Object} Final behavior configuration
 */
export function getContainerConfig(size, overrides = {}) {
  const defaults = getDefaultsForSize(size);

  return {
    // Grid dimensions (source of truth for layout)
    size,
    grid: parseSize(size),

    // Merged behavior (defaults + overrides)
    ...defaults,
    ...overrides
  };
}

/**
 * Parse size string into grid dimensions
 * @param {string} size - Size string (e.g., '2x1')
 * @returns {Object} Grid dimensions { w, h }
 */
export function parseSize(size) {
  const [w, h] = size.split('x').map(Number);
  return { w, h };
}

/**
 * Validate behavior config against schema
 * @param {Object} config - Behavior configuration
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateBehaviorConfig(config) {
  const errors = [];

  for (const [key, value] of Object.entries(config)) {
    if (BEHAVIOR_SCHEMA[key]) {
      if (!BEHAVIOR_SCHEMA[key].includes(value)) {
        errors.push(`Invalid value for ${key}: ${value}. Allowed: ${BEHAVIOR_SCHEMA[key].join(', ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Example Usage:
 *
 * // Get defaults for a 2x1 widget
 * const config = getDefaultsForSize('2x1');
 * // Returns: { form_factor: 'strip', chrome: 'titlebar', scroll: 'horizontal', ... }
 *
 * // Get config with overrides
 * const customConfig = getContainerConfig('2x1', {
 *   headerDisplay: 'always',
 *   scroll: 'none'
 * });
 *
 * // In widget definition:
 * {
 *   id: 'quick-note',
 *   size: '1x1',
 *   containerBehavior: {
 *     interaction: 'editable',  // Override default 'click-through'
 *     headerDisplay: 'never'
 *   }
 * }
 *
 * // In controller:
 * const widget = getWidgetById('quick-note');
 * const containerConfig = getContainerConfig(widget.size, widget.containerBehavior);
 * // Now use containerConfig.chrome, containerConfig.scroll, etc. for rendering
 */
