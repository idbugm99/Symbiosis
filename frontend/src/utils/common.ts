/**
 * Common Utilities
 * General-purpose utility functions used across the application
 *
 * Categories:
 * - Function utilities (debounce, throttle)
 * - Object utilities (deepMerge, deepClone)
 * - String utilities (capitalize, truncate)
 * - Number utilities (clamp, randomInt)
 * - Array utilities (unique, groupBy)
 * - ID generation
 */

// ============================================================================
// FUNCTION UTILITIES
// ============================================================================

/**
 * Debounce function calls
 * Delays execution until after wait time has elapsed since last call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * Limits execution to once per limit period
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between calls
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoize function results
 * Caches results based on arguments
 * @param {Function} func - Function to memoize
 * @returns {Function} Memoized function
 */
export function memoize(func) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Create a once-callable function
 * @param {Function} func - Function to call once
 * @returns {Function} Once-callable function
 */
export function once(func) {
  let called = false;
  let result;
  return function(...args) {
    if (!called) {
      called = true;
      result = func.apply(this, args);
    }
    return result;
  };
}

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

/**
 * Deep merge objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

/**
 * Deep clone object or array
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (obj instanceof Object) {
    const clonedObj = {};
    Object.keys(obj).forEach(key => {
      clonedObj[key] = deepClone(obj[key]);
    });
    return clonedObj;
  }
}

/**
 * Check if value is an object (not array, not null)
 * @param {*} item - Value to check
 * @returns {boolean}
 */
export function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean}
 */
export function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * Pick specific keys from object
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to pick
 * @returns {Object}
 */
export function pick(obj, keys) {
  const result = {};
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omit specific keys from object
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to omit
 * @returns {Object}
 */
export function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to length
 * @param {string} str - String to truncate
 * @param {number} length - Max length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string}
 */
export function truncate(str, length, suffix = '...') {
  if (!str || str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Convert string to kebab-case
 * @param {string} str - String to convert
 * @returns {string}
 */
export function kebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to camelCase
 * @param {string} str - String to convert
 * @returns {string}
 */
export function camelCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

/**
 * Generate slug from string
 * @param {string} str - String to slugify
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// ============================================================================
// NUMBER UTILITIES
// ============================================================================

/**
 * Clamp number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Round number to decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Decimal places
 * @returns {number}
 */
export function round(value, decimals = 0) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Check if number is in range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean}
 */
export function inRange(value, min, max) {
  return value >= min && value <= max;
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Get unique values from array
 * @param {Array} arr - Input array
 * @returns {Array}
 */
export function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Group array items by key
 * @param {Array} arr - Input array
 * @param {string|Function} key - Key or function to group by
 * @returns {Object}
 */
export function groupBy(arr, key) {
  return arr.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

/**
 * Chunk array into smaller arrays
 * @param {Array} arr - Input array
 * @param {number} size - Chunk size
 * @returns {Array<Array>}
 */
export function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten nested array
 * @param {Array} arr - Input array
 * @param {number} depth - Depth to flatten (default: Infinity)
 * @returns {Array}
 */
export function flatten(arr, depth = Infinity) {
  return arr.flat(depth);
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 * @param {Array} arr - Array to shuffle
 * @returns {Array} New shuffled array
 */
export function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate unique ID with prefix
 * @param {string} prefix - ID prefix (default: 'id')
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate UUID v4
 * @returns {string}
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate short ID (8 characters)
 * @returns {string}
 */
export function generateShortId() {
  return Math.random().toString(36).substr(2, 8);
}

// ============================================================================
// DATE/TIME UTILITIES
// ============================================================================

/**
 * Format date to ISO string
 * @param {Date} date - Date object
 * @returns {string}
 */
export function formatISO(date = new Date()) {
  return date.toISOString();
}

/**
 * Parse ISO date string
 * @param {string} str - ISO date string
 * @returns {Date}
 */
export function parseISO(str) {
  return new Date(str);
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date|string} date - Date to compare
 * @returns {string}
 */
export function getRelativeTime(date) {
  const now = new Date();
  const past = typeof date === 'string' ? parseISO(date) : date;
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

// ============================================================================
// PROMISE UTILITIES
// ============================================================================

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Max retry attempts
 * @param {number} delay - Initial delay in ms
 * @returns {Promise}
 */
export async function retry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }
  throw lastError;
}

/**
 * Timeout promise
 * @param {Promise} promise - Promise to timeout
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise}
 */
export function timeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}
