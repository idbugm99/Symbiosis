/**
 * Validation Utilities
 * Data validation functions for consistent validation across the application
 *
 * Categories:
 * - Widget validation
 * - Grid validation
 * - Data type validation
 * - JSON validation
 * - User input validation
 */

// ============================================================================
// WIDGET VALIDATION
// ============================================================================

/**
 * Validate widget definition structure
 * @param {Object} widget - Widget definition object
 * @returns {boolean}
 */
export function isValidWidgetDefinition(widget) {
  if (!widget || typeof widget !== 'object') {
    return false;
  }

  // Required fields
  const hasRequiredFields =
    typeof widget.id === 'string' &&
    typeof widget.name === 'string' &&
    typeof widget.icon === 'string' &&
    typeof widget.type === 'string' &&
    Number.isInteger(widget.cols) &&
    Number.isInteger(widget.rows);

  if (!hasRequiredFields) {
    return false;
  }

  // Validate type enum
  const validTypes = ['app', 'widget'];
  if (!validTypes.includes(widget.type)) {
    return false;
  }

  // Validate size constraints
  if (widget.cols < 1 || widget.cols > 4 || widget.rows < 1 || widget.rows > 4) {
    return false;
  }

  return true;
}

/**
 * Validate widget instance
 * @param {Object} instance - Widget instance object
 * @returns {boolean}
 */
export function isValidWidgetInstance(instance) {
  if (!instance || typeof instance !== 'object') {
    return false;
  }

  const hasRequiredFields =
    typeof instance.id === 'string' &&
    typeof instance.widgetDefId === 'string' &&
    typeof instance.workspaceId === 'string' &&
    Number.isInteger(instance.cell) &&
    Number.isInteger(instance.cols) &&
    Number.isInteger(instance.rows);

  return hasRequiredFields;
}

/**
 * Validate widget configuration object
 * @param {Object} config - Widget config
 * @returns {boolean}
 */
export function isValidWidgetConfig(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // Config can be empty object
  if (Object.keys(config).length === 0) {
    return true;
  }

  // If it has properties, validate known config keys
  const validKeys = [
    'displayMode',
    'animation',
    'multiInstance',
    'dock',
    'menuBar',
    'sideNav',
    'showCloseButton',
    'showMinimizeButton'
  ];

  const hasInvalidKeys = Object.keys(config).some(key => !validKeys.includes(key));

  return !hasInvalidKeys;
}

// ============================================================================
// GRID VALIDATION
// ============================================================================

/**
 * Validate grid position
 * @param {number} cell - Cell number
 * @param {number} cols - Widget columns
 * @param {number} rows - Widget rows
 * @param {Object} gridConfig - Grid configuration
 * @returns {boolean}
 */
export function isValidGridPosition(cell, cols, rows, gridConfig) {
  if (!Number.isInteger(cell) || cell < 1 || cell > gridConfig.totalCells) {
    return false;
  }

  // Check if widget fits within grid bounds
  const cellRow = Math.floor((cell - 1) / gridConfig.columns);
  const cellCol = (cell - 1) % gridConfig.columns;

  const fitsHorizontally = cellCol + cols <= gridConfig.columns;
  const fitsVertically = cellRow + rows <= gridConfig.rows;

  return fitsHorizontally && fitsVertically;
}

/**
 * Validate grid configuration
 * @param {Object} gridConfig - Grid config object
 * @returns {boolean}
 */
export function isValidGridConfig(gridConfig) {
  if (!gridConfig || typeof gridConfig !== 'object') {
    return false;
  }

  const hasRequiredFields =
    Number.isInteger(gridConfig.columns) &&
    Number.isInteger(gridConfig.rows) &&
    Number.isInteger(gridConfig.totalCells) &&
    Number.isInteger(gridConfig.cellSize) &&
    Number.isInteger(gridConfig.gap);

  if (!hasRequiredFields) {
    return false;
  }

  // Validate totalCells matches columns * rows
  if (gridConfig.totalCells !== gridConfig.columns * gridConfig.rows) {
    return false;
  }

  // Validate positive values
  if (gridConfig.columns < 1 || gridConfig.rows < 1 ||
      gridConfig.cellSize < 1 || gridConfig.gap < 0) {
    return false;
  }

  return true;
}

/**
 * Validate cell number is within grid bounds
 * @param {number} cell - Cell number
 * @param {Object} gridConfig - Grid configuration
 * @returns {boolean}
 */
export function isValidCellNumber(cell, gridConfig) {
  return Number.isInteger(cell) &&
         cell >= 1 &&
         cell <= gridConfig.totalCells;
}

// ============================================================================
// WORKSPACE VALIDATION
// ============================================================================

/**
 * Validate workspace object
 * @param {Object} workspace - Workspace object
 * @returns {boolean}
 */
export function isValidWorkspace(workspace) {
  if (!workspace || typeof workspace !== 'object') {
    return false;
  }

  const hasRequiredFields =
    typeof workspace.id === 'string' &&
    typeof workspace.name === 'string' &&
    typeof workspace.userId === 'string';

  return hasRequiredFields;
}

/**
 * Validate workspace ID format
 * @param {string} id - Workspace ID
 * @returns {boolean}
 */
export function isValidWorkspaceId(id) {
  return typeof id === 'string' &&
         id.length > 0 &&
         id.startsWith('workspace-');
}

// ============================================================================
// JSON VALIDATION
// ============================================================================

/**
 * Validate JSON string
 * @param {string} str - String to validate
 * @returns {boolean}
 */
export function isValidJSON(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }

  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate JSON string is an object (not array, not null)
 * @param {string} str - String to validate
 * @returns {boolean}
 */
export function isJSONObject(str) {
  if (!isValidJSON(str)) {
    return false;
  }

  const trimmed = str.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

/**
 * Validate JSON string is an array
 * @param {string} str - String to validate
 * @returns {boolean}
 */
export function isJSONArray(str) {
  if (!isValidJSON(str)) {
    return false;
  }

  const trimmed = str.trim();
  return trimmed.startsWith('[') && trimmed.endsWith(']');
}

/**
 * Safely parse JSON with fallback
 * @param {string} str - JSON string
 * @param {*} fallback - Fallback value if parse fails
 * @returns {*}
 */
export function safeJSONParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ============================================================================
// DATA TYPE VALIDATION
// ============================================================================

/**
 * Check if value is a string
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isString(value) {
  return typeof value === 'string';
}

/**
 * Check if value is a non-empty string
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a number
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is an integer
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isInteger(value) {
  return Number.isInteger(value);
}

/**
 * Check if value is a positive integer
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Check if value is a boolean
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isBoolean(value) {
  return typeof value === 'boolean';
}

/**
 * Check if value is an object (not array, not null)
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if value is an array
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isArray(value) {
  return Array.isArray(value);
}

/**
 * Check if value is a non-empty array
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is a function
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isFunction(value) {
  return typeof value === 'function';
}

/**
 * Check if value is null or undefined
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isNullOrUndefined(value) {
  return value === null || value === undefined;
}

/**
 * Check if value exists (not null, not undefined)
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function exists(value) {
  return value !== null && value !== undefined;
}

// ============================================================================
// USER INPUT VALIDATION
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!isString(email)) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL string
 * @returns {boolean}
 */
export function isValidURL(url) {
  if (!isString(url)) {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate hex color format
 * @param {string} color - Color string
 * @returns {boolean}
 */
export function isValidHexColor(color) {
  if (!isString(color)) {
    return false;
  }

  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * Validate date string
 * @param {string} dateStr - Date string
 * @returns {boolean}
 */
export function isValidDate(dateStr) {
  if (!isString(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate ISO date string
 * @param {string} dateStr - ISO date string
 * @returns {boolean}
 */
export function isValidISODate(dateStr) {
  if (!isString(dateStr)) {
    return false;
  }

  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoRegex.test(dateStr);
}

/**
 * Validate string length
 * @param {string} str - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean}
 */
export function isValidLength(str, min, max) {
  if (!isString(str)) {
    return false;
  }

  const length = str.length;
  return length >= min && length <= max;
}

/**
 * Validate number range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean}
 */
export function isInRange(value, min, max) {
  if (!isNumber(value)) {
    return false;
  }

  return value >= min && value <= max;
}

// ============================================================================
// DISPLAY MODE VALIDATION
// ============================================================================

/**
 * Validate display mode enum
 * @param {string} mode - Display mode
 * @returns {boolean}
 */
export function isValidDisplayMode(mode) {
  const validModes = [
    'fullscreen',
    'fullscreen-no-nav',
    'popup',
    'modal',
    'sidebar',
    'split',
    'floating'
  ];

  return validModes.includes(mode);
}

/**
 * Validate animation type enum
 * @param {string} animation - Animation type
 * @returns {boolean}
 */
export function isValidAnimation(animation) {
  const validAnimations = [
    'none',
    'fade',
    'slide-up',
    'slide-down',
    'slide-left',
    'slide-right',
    'zoom',
    'scale'
  ];

  return validAnimations.includes(animation);
}

// ============================================================================
// COMPOSITE VALIDATORS
// ============================================================================

/**
 * Validate drag data for widget/app
 * @param {string} rawData - Raw drag data
 * @returns {Object|null} Parsed and validated widget data, or null if invalid
 */
export function validateDragData(rawData) {
  // Check if data exists and looks like JSON
  if (!rawData || !rawData.trim().startsWith('{')) {
    return null;
  }

  // Try to parse JSON
  let data;
  try {
    data = JSON.parse(rawData);
  } catch {
    return null;
  }

  // Validate it has required properties
  if (!data.id || !data.name || !data.icon) {
    return null;
  }

  // Validate it has size information
  if (!Number.isInteger(data.cols) || !Number.isInteger(data.rows)) {
    return null;
  }

  return data;
}

/**
 * Validate complete widget state
 * @param {Object} widget - Widget object
 * @param {Object} gridConfig - Grid configuration
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateWidgetState(widget, gridConfig) {
  const errors = [];

  if (!isValidWidgetInstance(widget)) {
    errors.push('Invalid widget instance structure');
  }

  if (!isValidGridPosition(widget.cell, widget.cols, widget.rows, gridConfig)) {
    errors.push('Widget position exceeds grid bounds');
  }

  if (widget.config && !isValidWidgetConfig(widget.config)) {
    errors.push('Invalid widget configuration');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate widget definition and configuration
 * @param {Object} definition - Widget definition
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateWidgetDefinition(definition) {
  const errors = [];

  if (!isValidWidgetDefinition(definition)) {
    errors.push('Invalid widget definition structure');
  }

  if (definition.displayMode && !isValidDisplayMode(definition.displayMode)) {
    errors.push('Invalid display mode');
  }

  if (definition.animation && !isValidAnimation(definition.animation)) {
    errors.push('Invalid animation type');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// STRICT VALIDATION (THROWS ERRORS)
// ============================================================================

/**
 * Strictly validate widget definition (throws on invalid)
 * Use this during initialization to catch configuration errors early
 * @param {Object} widget - Widget definition
 * @throws {Error} If validation fails
 * @returns {boolean} True if valid
 */
export function strictValidateWidgetDefinition(widget) {
  if (!widget || typeof widget !== 'object' || Array.isArray(widget)) {
    throw new Error('Widget definition must be an object');
  }

  // Check required fields
  const required = ['id', 'name', 'icon', 'type', 'cols', 'rows', 'category'];
  const missing = required.filter(field => !(field in widget));

  if (missing.length > 0) {
    throw new Error(`Widget "${widget.id || 'unknown'}" missing required fields: ${missing.join(', ')}`);
  }

  // Validate type
  if (widget.type !== 'widget' && widget.type !== 'app') {
    throw new Error(`Widget "${widget.id}" has invalid type: "${widget.type}". Must be "widget" or "app"`);
  }

  // Validate dimensions (updated to match gridConfig: 6 cols × 5 rows)
  if (widget.cols < 1 || widget.cols > 6) {
    throw new Error(`Widget "${widget.id}" has invalid cols: ${widget.cols}. Must be 1-6`);
  }

  if (widget.rows < 1 || widget.rows > 5) {
    throw new Error(`Widget "${widget.id}" has invalid rows: ${widget.rows}. Must be 1-5`);
  }

  // Validate string fields are non-empty
  if (typeof widget.id !== 'string' || widget.id.trim() === '') {
    throw new Error(`Widget has invalid or empty id`);
  }

  if (typeof widget.name !== 'string' || widget.name.trim() === '') {
    throw new Error(`Widget "${widget.id}" has invalid or empty name`);
  }

  if (typeof widget.icon !== 'string' || widget.icon.trim() === '') {
    throw new Error(`Widget "${widget.id}" has invalid or empty icon`);
  }

  if (typeof widget.category !== 'string' || widget.category.trim() === '') {
    throw new Error(`Widget "${widget.id}" has invalid or empty category`);
  }

  return true;
}

/**
 * Validate array of widget definitions and filter out invalid ones
 * @param {Array} widgets - Array of widget definitions
 * @param {boolean} throwOnInvalid - If true, throw on first invalid widget
 * @returns {Array} Valid widget definitions
 */
export function validateWidgetArray(widgets, throwOnInvalid = false) {
  if (!Array.isArray(widgets)) {
    throw new Error('Widget definitions must be an array');
  }

  const validWidgets = [];
  const errors = [];

  widgets.forEach((widget, index) => {
    try {
      strictValidateWidgetDefinition(widget);
      validWidgets.push(widget);
    } catch (error) {
      const errorMsg = `Widget at index ${index}: ${error.message}`;
      errors.push(errorMsg);

      if (throwOnInvalid) {
        throw new Error(errorMsg);
      } else {
        console.error(`[Validation] ${errorMsg}`);
      }
    }
  });

  if (errors.length > 0 && !throwOnInvalid) {
    console.warn(`[Validation] ${errors.length} invalid widget(s) filtered out of ${widgets.length}`);
  }

  return validWidgets;
}
