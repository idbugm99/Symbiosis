/**
 * ErrorBoundary
 * Provides error handling and recovery for application components
 *
 * @class
 * @description Catches errors in critical operations, logs with context,
 * prevents cascading failures, and provides fallback UI. Similar to React
 * error boundaries but for vanilla JavaScript.
 *
 * @example
 * const errorBoundary = new ErrorBoundary({
 *   onError: (error, context) => console.error(error, context)
 * });
 *
 * // Wrap risky operations
 * errorBoundary.wrap(() => {
 *   loadWidgets();
 * }, 'load-widgets');
 *
 * // Wrap async operations
 * await errorBoundary.wrapAsync(async () => {
 *   await fetchData();
 * }, 'fetch-data');
 */

import { createLogger } from '../utils/logger.js';
import type { ErrorBoundaryOptions } from '../types/index.js';

const logger = createLogger('ErrorBoundary');

export class ErrorBoundary {
  // Properties
  private onError: ((error: Error, context: any) => void) | null;
  private logErrors: boolean;
  private showUI: boolean;
  private maxErrors: number;
  private captureGlobalErrors: boolean;
  private errors: any[];
  private errorsByContext: Map<string, any[]>;
  private recoverableErrors: any[];
  private fatalErrors: any[];
  private disabled: boolean;
  private totalErrors: number;

  /**
   * Create an ErrorBoundary instance
   * @constructor
   * @param {Object} options - Configuration options
   * @param {Function} options.onError - Error callback (error, context) => void
   * @param {boolean} options.logErrors - Log errors to console (default: true)
   * @param {boolean} options.showUI - Show error UI to user (default: true)
   * @param {number} options.maxErrors - Max errors before disabling (default: 50)
   * @param {boolean} options.captureGlobalErrors - Capture window.onerror (default: true)
   */
  constructor(options: ErrorBoundaryOptions = {}) {
    this.onError = options.onError || null;
    this.logErrors = options.logErrors !== undefined ? options.logErrors : true;
    this.showUI = options.showUI !== undefined ? options.showUI : true;
    this.maxErrors = options.maxErrors || 50;
    this.captureGlobalErrors = options.captureGlobalErrors !== undefined ? options.captureGlobalErrors : true;

    // Error storage
    this.errors = []; // All captured errors
    this.errorsByContext = new Map(); // Errors grouped by context
    this.recoverableErrors = []; // Errors that were recovered from
    this.fatalErrors = []; // Errors that caused component failures

    // State
    this.disabled = false;
    this.totalErrors = 0;

    // Setup global error handling
    if (this.captureGlobalErrors) {
      this.setupGlobalErrorHandlers();
    }

    logger.info('Initialized');
  }

  /**
   * Setup global error handlers
   * @private
   */
  setupGlobalErrorHandlers(): void {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        context: 'global-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString()
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        context: 'unhandled-rejection',
        promise: event.promise,
        timestamp: new Date().toISOString()
      });
    });

    logger.info('Global error handlers installed');
  }

  /**
   * Wrap a synchronous function with error handling
   * @param {Function} fn - Function to wrap
   * @param {string} context - Context/name for error reporting
   * @param {Object} options - Additional options
   * @param {Function} options.fallback - Fallback function if error occurs
   * @param {boolean} options.rethrow - Re-throw error after handling (default: false)
   * @returns {*} Return value of fn or fallback
   * @example
   * const result = errorBoundary.wrap(() => {
   *   return riskyOperation();
   * }, 'risky-operation', {
   *   fallback: () => defaultValue,
   *   rethrow: false
   * });
   */
  wrap(fn: () => any, context: string = 'unknown', options: any = {}): any {
    if (this.disabled) {
      logger.warn('Disabled, not wrapping function');
      return options.fallback ? options.fallback() : null;
    }

    try {
      return fn();
    } catch (error) {
      this.handleError(error, { context, timestamp: new Date().toISOString() });

      if (options.fallback) {
        try {
          return options.fallback();
        } catch (fallbackError) {
          logger.error('Fallback function failed', fallbackError);
        }
      }

      if (options.rethrow) {
        throw error;
      }

      return null;
    }
  }

  /**
   * Wrap an asynchronous function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Context/name for error reporting
   * @param {Object} options - Additional options
   * @param {Function} options.fallback - Fallback function if error occurs
   * @param {boolean} options.rethrow - Re-throw error after handling (default: false)
   * @returns {Promise<*>} Return value of fn or fallback
   * @example
   * const result = await errorBoundary.wrapAsync(async () => {
   *   return await fetchData();
   * }, 'fetch-data');
   */
  async wrapAsync(fn: () => Promise<any>, context: string = 'unknown', options: any = {}): Promise<any> {
    if (this.disabled) {
      logger.warn('Disabled, not wrapping async function');
      return options.fallback ? await options.fallback() : null;
    }

    try {
      return await fn();
    } catch (error) {
      this.handleError(error, { context, timestamp: new Date().toISOString() });

      if (options.fallback) {
        try {
          return await options.fallback();
        } catch (fallbackError) {
          logger.error('Fallback function failed', fallbackError);
        }
      }

      if (options.rethrow) {
        throw error;
      }

      return null;
    }
  }

  /**
   * Wrap a component/manager initialization with error handling
   * @param {Function} fn - Initialization function
   * @param {string} componentName - Name of component
   * @param {HTMLElement} fallbackContainer - Container to show error UI in
   * @returns {*} Return value of fn or null
   * @example
   * const manager = errorBoundary.wrapComponent(() => {
   *   return new WidgetManager({ ... });
   * }, 'WidgetManager', document.getElementById('widget-grid'));
   */
  wrapComponent(fn: () => any, componentName: string, fallbackContainer: HTMLElement | null = null): any {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, {
        context: `component-init:${componentName}`,
        componentName,
        fatal: true,
        timestamp: new Date().toISOString()
      });

      this.fatalErrors.push({
        componentName,
        error,
        timestamp: new Date().toISOString()
      });

      // Show error UI if container provided
      if (fallbackContainer && this.showUI) {
        this.renderErrorUI(fallbackContainer, componentName, error);
      }

      return null;
    }
  }

  /**
   * Handle an error (internal method)
   * @private
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  handleError(error: any, context: any = {}): void {
    this.totalErrors++;

    // Check if we've exceeded max errors
    if (this.totalErrors >= this.maxErrors) {
      logger.error(`Maximum errors (${this.maxErrors}) reached, disabling`);
      this.disabled = true;
      return;
    }

    // Create error entry
    const errorEntry = {
      error,
      message: error.message || String(error),
      stack: error.stack,
      context,
      timestamp: context.timestamp || new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // Store error
    this.errors.push(errorEntry);

    // Group by context
    const contextKey = context.context || 'unknown';
    if (!this.errorsByContext.has(contextKey)) {
      this.errorsByContext.set(contextKey, []);
    }
    this.errorsByContext.get(contextKey).push(errorEntry);

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors.shift();
    }

    // Log error
    if (this.logErrors) {
      logger.error(`🚨 Error: ${context.context || 'unknown'}`, { error, context, stack: error.stack });
    }

    // Call error callback
    if (this.onError) {
      try {
        this.onError(error, context);
      } catch (callbackError) {
        logger.error('Error in onError callback', callbackError);
      }
    }

    // Check for recoverable vs fatal errors
    if (context.fatal) {
      this.fatalErrors.push(errorEntry);
    } else {
      this.recoverableErrors.push(errorEntry);
    }
  }

  /**
   * Render error UI in a container
   * @private
   * @param {HTMLElement} container - Container element
   * @param {string} componentName - Name of failed component
   * @param {Error} error - Error object
   */
  renderErrorUI(container: HTMLElement, componentName: string, error: Error): void {
    container.innerHTML = `
      <div class="error-boundary-ui" style="
        padding: 20px;
        background: #fee;
        border: 2px solid #f88;
        border-radius: 8px;
        margin: 20px;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <h3 style="margin: 0 0 10px 0; color: #c00;">
          ⚠️ ${componentName} Failed to Load
        </h3>
        <p style="margin: 0 0 10px 0; color: #666;">
          An error occurred while loading this component.
        </p>
        <details style="margin: 10px 0;">
          <summary style="cursor: pointer; color: #666;">
            Show error details
          </summary>
          <pre style="
            background: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
            margin: 10px 0;
          ">${error.stack || error.message}</pre>
        </details>
        <button onclick="location.reload()" style="
          padding: 8px 16px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">
          Reload Page
        </button>
      </div>
    `;
  }

  /**
   * Get error report
   * @returns {Object} Error report
   * @example
   * const report = errorBoundary.getErrorReport();
   * console.table(report.summary);
   */
  getErrorReport(): any {
    // Calculate error frequency by context
    const errorFrequency = {};
    for (const [context, errors] of this.errorsByContext.entries()) {
      errorFrequency[context] = errors.length;
    }

    return {
      summary: {
        totalErrors: this.totalErrors,
        recoverableErrors: this.recoverableErrors.length,
        fatalErrors: this.fatalErrors.length,
        uniqueContexts: this.errorsByContext.size,
        disabled: this.disabled
      },
      errorFrequency,
      recentErrors: this.errors.slice(-10), // Last 10 errors
      fatalErrors: this.fatalErrors.slice(-10), // Last 10 fatal errors
      mostCommonError: this.getMostCommonError(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get most common error
   * @private
   * @returns {Object|null} Most common error info
   */
  getMostCommonError(): any | null {
    if (this.errorsByContext.size === 0) {
      return null;
    }

    let maxCount = 0;
    let maxContext = null;

    for (const [context, errors] of this.errorsByContext.entries()) {
      if (errors.length > maxCount) {
        maxCount = errors.length;
        maxContext = context;
      }
    }

    return {
      context: maxContext,
      count: maxCount,
      message: this.errorsByContext.get(maxContext)[0].message
    };
  }

  /**
   * Get error handling recommendations
   * @private
   * @returns {string[]} Recommendations
   */
  getRecommendations(): string[] {
    const recommendations = [];

    if (this.fatalErrors.length > 0) {
      recommendations.push(`Found ${this.fatalErrors.length} fatal errors. Check component initialization logic.`);
    }

    if (this.disabled) {
      recommendations.push(`ErrorBoundary is disabled due to too many errors (>${this.maxErrors}). Page reload required.`);
    }

    const mostCommon = this.getMostCommonError();
    if (mostCommon && mostCommon.count > 5) {
      recommendations.push(`"${mostCommon.context}" is failing repeatedly (${mostCommon.count} times). Investigation needed.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('No critical issues detected.');
    }

    return recommendations;
  }

  /**
   * Log error report to console
   * @returns {void}
   */
  logErrorReport(): void {
    const report = this.getErrorReport();

    logger.info('🚨 Error Boundary Report', { summary: report.summary });

    if (Object.keys(report.errorFrequency).length > 0) {
      logger.info('📊 Error Frequency by Context', report.errorFrequency);
    }

    if (report.recentErrors.length > 0) {
      logger.warn('⚠️ Recent Errors (Last 10)');
      report.recentErrors.forEach(err => {
        logger.warn(`[${err.context.context}] ${err.message}`);
      });
    }

    if (report.fatalErrors.length > 0) {
      logger.error('💀 Fatal Errors (Last 10)');
      report.fatalErrors.forEach(err => {
        logger.error(err);
      });
    }

    if (report.mostCommonError) {
      logger.warn('🔥 Most Common Error', report.mostCommonError);
    }

    if (report.recommendations.length > 0) {
      logger.info('💡 Recommendations');
      report.recommendations.forEach(rec => logger.info(`• ${rec}`));
    }
  }

  /**
   * Reset all errors
   * @returns {void}
   */
  reset(): void {
    this.errors = [];
    this.errorsByContext.clear();
    this.recoverableErrors = [];
    this.fatalErrors = [];
    this.totalErrors = 0;
    this.disabled = false;

    logger.info('Errors reset');
  }

  /**
   * Enable error boundary
   * @returns {void}
   */
  enable(): void {
    this.disabled = false;
    logger.info('Enabled');
  }

  /**
   * Disable error boundary
   * @returns {void}
   */
  disable(): void {
    this.disabled = true;
    logger.info('Disabled');
  }

  /**
   * Get all errors for a specific context
   * @param {string} context - Context name
   * @returns {Array} Errors for context
   */
  getErrorsForContext(context: string): any[] {
    return this.errorsByContext.get(context) || [];
  }

  /**
   * Check if a specific context has errors
   * @param {string} context - Context name
   * @returns {boolean} True if context has errors
   */
  hasErrorsInContext(context: string): boolean {
    const errors = this.errorsByContext.get(context);
    return errors && errors.length > 0;
  }

  /**
   * Destroy error boundary and clean up
   * @returns {void}
   */
  destroy(): void {
    this.reset();
    // Note: Can't remove global error handlers as they might affect other code
    logger.info('Destroyed');
  }
}
