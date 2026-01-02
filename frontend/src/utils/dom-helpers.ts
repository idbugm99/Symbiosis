/**
 * DOM Helpers
 * Centralized DOM access and manipulation utilities
 *
 * Benefits:
 * - Testable: Can inject mock DOM in tests
 * - Cached queries: Performance optimization
 * - Consistent API: One place to change DOM strategy
 * - Helper methods: Common patterns extracted
 */

export class DOMHelper {
  // Properties
  cache: any;
  cacheEnabled: any;

  constructor() {
    this.cache = new Map();
    this.cacheEnabled = true;
  }

  /**
   * Get element by ID with optional caching
   * @param {string} id - Element ID
   * @param {boolean} useCache - Whether to use cache (default: true)
   * @returns {HTMLElement|null}
   */
  getElementById(id, useCache = true) {
    if (this.cacheEnabled && useCache && this.cache.has(id)) {
      return this.cache.get(id);
    }

    const element = document.getElementById(id);

    if (this.cacheEnabled && useCache && element) {
      this.cache.set(id, element);
    }

    return element;
  }

  /**
   * Query selector
   * @param {string} selector - CSS selector
   * @returns {HTMLElement|null}
   */
  querySelector(selector) {
    return document.querySelector(selector);
  }

  /**
   * Query all matching elements
   * @param {string} selector - CSS selector
   * @returns {NodeList}
   */
  querySelectorAll(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Create element with class and attributes
   * @param {string} tag - HTML tag name
   * @param {string} className - CSS class name(s)
   * @param {Object} attrs - Attributes object
   * @returns {HTMLElement}
   */
  createElement(tag, className = '', attrs = {}) {
    const el = document.createElement(tag);
    if (className) el.className = className;

    Object.entries(attrs).forEach(([key, val]) => {
      if (key === 'dataset') {
        // Handle dataset specially
        Object.entries(val).forEach(([dataKey, dataVal]) => {
          el.dataset[dataKey] = dataVal;
        });
      } else if (key === 'style' && typeof val === 'object') {
        // Handle style object
        Object.assign(el.style, val);
      } else {
        el.setAttribute(key, val);
      }
    });

    return el;
  }

  /**
   * Create button with text and handler
   * @param {string} text - Button text
   * @param {string} className - CSS class name
   * @param {Function} onClick - Click handler
   * @param {Object} attrs - Additional attributes
   * @returns {HTMLButtonElement}
   */
  createButton(text, className = '', onClick = null, attrs = {}) {
    const btn = this.createElement('button', className, attrs);
    btn.textContent = text;
    if (onClick) {
      btn.addEventListener('click', onClick);
    }
    return btn;
  }

  /**
   * Create icon element
   * @param {string} icon - Icon text (emoji or unicode)
   * @param {string} className - CSS class name
   * @returns {HTMLElement}
   */
  createIcon(icon, className = 'icon') {
    const iconEl = this.createElement('div', className);
    iconEl.textContent = icon;
    return iconEl;
  }

  /**
   * Create text element
   * @param {string} text - Text content
   * @param {string} tag - HTML tag (default: 'span')
   * @param {string} className - CSS class name
   * @returns {HTMLElement}
   */
  createText(text: string, tag: string = 'span', className: string = ''):  HTMLElement {
    const el = this.createElement(tag, className);
    el.textContent = text;
    return el;
  }

  /**
   * Create widget header (common pattern)
   * @param {string} icon - Widget icon
   * @param {string} title - Widget title
   * @param {Array} controls - Array of control button configs
   * @returns {HTMLElement}
   */
  createWidgetHeader(icon, title, controls = []) {
    const header = this.createElement('div', 'widget-header');

    // Icon
    const iconEl = this.createIcon(icon, 'widget-icon');
    header.appendChild(iconEl);

    // Title
    const titleEl = this.createText(title, 'div', 'widget-title');
    header.appendChild(titleEl);

    // Controls container
    if (controls.length > 0) {
      const controlsContainer = this.createElement('div', 'widget-controls');
      controls.forEach(control => {
        const btn = this.createButton(
          control.text,
          control.className || 'widget-control-btn',
          control.onClick,
          control.attrs || {}
        );
        controlsContainer.appendChild(btn);
      });
      header.appendChild(controlsContainer);
    }

    return header;
  }

  /**
   * Create container with children
   * @param {string} tag - HTML tag
   * @param {string} className - CSS class
   * @param {Array<HTMLElement>} children - Child elements
   * @returns {HTMLElement}
   */
  createContainer(tag, className, children = []) {
    const container = this.createElement(tag, className);
    children.forEach(child => {
      if (child) container.appendChild(child);
    });
    return container;
  }

  /**
   * Append multiple children to parent
   * @param {HTMLElement} parent - Parent element
   * @param {Array<HTMLElement>} children - Child elements
   */
  appendChildren(parent, children) {
    children.forEach(child => {
      if (child) parent.appendChild(child);
    });
  }

  /**
   * Remove element from DOM
   * @param {HTMLElement} element - Element to remove
   */
  removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Clear all children from element
   * @param {HTMLElement} element - Parent element
   */
  clearChildren(element) {
    if (element) {
      element.innerHTML = '';
    }
  }

  /**
   * Toggle class on element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name
   * @param {boolean} force - Force add/remove
   */
  toggleClass(element, className, force = undefined) {
    if (element) {
      element.classList.toggle(className, force);
    }
  }

  /**
   * Add event listener with automatic cleanup tracking
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {boolean|Object} options - Event options
   * @returns {Function} Cleanup function
   */
  addEventListener(element, event, handler, options = false) {
    if (element) {
      element.addEventListener(event, handler, options);
    }
    return () => {
      if (element) {
        element.removeEventListener(event, handler, options);
      }
    };
  }

  /**
   * Invalidate cache for specific ID
   * @param {string} id - Element ID to invalidate
   */
  invalidateCache(id) {
    this.cache.delete(id);
  }

  /**
   * Clear entire cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Disable caching (useful for testing)
   */
  disableCache() {
    this.cacheEnabled = false;
    this.clearCache();
  }

  /**
   * Enable caching
   */
  enableCache() {
    this.cacheEnabled = true;
  }

  /**
   * Get cache size (for debugging)
   * @returns {number}
   */
  getCacheSize() {
    return this.cache.size;
  }
}

/**
 * Singleton instance for global use
 */
export const domHelper = new DOMHelper();

/**
 * Factory function to create new instance (for testing)
 * @returns {DOMHelper}
 */
export function createDOMHelper() {
  return new DOMHelper();
}
