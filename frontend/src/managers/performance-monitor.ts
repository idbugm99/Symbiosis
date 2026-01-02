/**
 * PerformanceMonitor
 * Tracks and reports application performance metrics
 *
 * @class
 * @description Monitors operation timings, memory usage, event frequency,
 * and provides performance warnings. Designed for development and debugging.
 *
 * @example
 * const perfMonitor = new PerformanceMonitor({ enabled: true });
 *
 * // Track operation timing
 * perfMonitor.startTimer('widget-load');
 * loadWidgets();
 * perfMonitor.endTimer('widget-load');
 *
 * // Get performance report
 * const report = perfMonitor.getReport();
 * console.table(report.timings);
 */

import { createLogger } from '../utils/logger.js';
import type { PerformanceMonitorOptions } from '../types/index.js';

const logger = createLogger('PerformanceMonitor');

export class PerformanceMonitor {
  // Properties
  private enabled: boolean;
  private slowThreshold: number;
  private memoryCheckInterval: number;
  private autoReport: boolean;
  private autoReportInterval: number;
  private timers: Map<string, number>;
  private timings: Map<string, number[]>;
  private eventCounts: Map<string, number>;
  private slowOperations: any[];
  private memorySnapshots: any[];
  private errors: Error[];
  private totalOperations: number;
  private totalEvents: number;
  private memoryInterval: NodeJS.Timeout | null;
  private reportInterval: NodeJS.Timeout | null;

  /**
   * Create a PerformanceMonitor instance
   * @constructor
   * @param {Object} options - Configuration options
   * @param {boolean} options.enabled - Enable/disable monitoring (default: true in dev)
   * @param {number} options.slowThreshold - Threshold in ms for slow operations (default: 100)
   * @param {number} options.memoryCheckInterval - Interval for memory checks in ms (default: 30000)
   * @param {boolean} options.autoReport - Auto-log report every N seconds (default: false)
   * @param {number} options.autoReportInterval - Auto-report interval in ms (default: 60000)
   */
  constructor(options: PerformanceMonitorOptions = {}) {
    this.enabled = options.enabled !== undefined ? options.enabled : (import.meta.env.DEV || false);
    this.slowThreshold = options.slowThreshold || 100; // ms
    this.memoryCheckInterval = options.memoryCheckInterval || 30000; // 30 seconds
    this.autoReport = options.autoReport || false;
    this.autoReportInterval = options.autoReportInterval || 60000; // 1 minute

    // Metrics storage
    this.timers = new Map(); // Active timers
    this.timings = new Map(); // Completed operation timings
    this.eventCounts = new Map(); // Event emission counts
    this.slowOperations = []; // Operations exceeding threshold
    this.memorySnapshots = []; // Memory usage snapshots
    this.errors = []; // Performance-related errors

    // Counters
    this.totalOperations = 0;
    this.totalEvents = 0;

    // Start monitoring
    if (this.enabled) {
      this.startMonitoring();
    }

    logger.info(`${this.enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Start performance monitoring
   * @private
   */
  startMonitoring() {
    // Memory monitoring
    if (performance.memory) {
      this.memoryInterval = setInterval(() => {
        this.captureMemorySnapshot();
      }, this.memoryCheckInterval);
    }

    // Auto-reporting
    if (this.autoReport) {
      this.reportInterval = setInterval(() => {
        this.logReport();
      }, this.autoReportInterval);
    }

    // Listen for page visibility changes (pause monitoring when hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        logger.info('Paused (page hidden)');
      } else {
        logger.info('Resumed (page visible)');
      }
    });
  }

  /**
   * Start timing an operation
   * @param {string} operationName - Name of the operation
   * @param {Object} metadata - Optional metadata for the operation
   * @returns {void}
   * @example
   * perfMonitor.startTimer('load-workspace');
   */
  startTimer(operationName, metadata = {}) {
    if (!this.enabled) return;

    this.timers.set(operationName, {
      startTime: performance.now(),
      startMark: `${operationName}-start`,
      metadata
    });

    // Use Performance API marks
    try {
      performance.mark(`${operationName}-start`);
    } catch (error) {
      // Ignore if Performance API not fully supported
    }
  }

  /**
   * End timing an operation
   * @param {string} operationName - Name of the operation
   * @returns {number|null} Duration in milliseconds or null if not started
   * @fires performance:slow-operation - When operation exceeds threshold
   * @example
   * const duration = perfMonitor.endTimer('load-workspace');
   * logger.info(`Workspace loaded in ${duration}ms`);
   */
  endTimer(operationName) {
    if (!this.enabled) return null;

    const timer = this.timers.get(operationName);
    if (!timer) {
      logger.warn(`Timer "${operationName}" was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;

    // Store timing
    if (!this.timings.has(operationName)) {
      this.timings.set(operationName, []);
    }
    this.timings.get(operationName).push({
      duration,
      timestamp: new Date().toISOString(),
      metadata: timer.metadata
    });

    this.totalOperations++;

    // Check for slow operations
    if (duration > this.slowThreshold) {
      const slowOp = {
        name: operationName,
        duration,
        timestamp: new Date().toISOString(),
        metadata: timer.metadata
      };
      this.slowOperations.push(slowOp);
      logger.warn(`⚠️ Slow operation: "${operationName}" took ${duration.toFixed(2)}ms (threshold: ${this.slowThreshold}ms)`, timer.metadata);
    }

    // Use Performance API measures
    try {
      performance.mark(`${operationName}-end`);
      performance.measure(operationName, `${operationName}-start`, `${operationName}-end`);
    } catch (error) {
      // Ignore if Performance API not fully supported
    }

    // Clean up timer
    this.timers.delete(operationName);

    return duration;
  }

  /**
   * Track an event emission
   * @param {string} eventName - Name of the event
   * @returns {void}
   * @example
   * perfMonitor.trackEvent('widget:added');
   */
  trackEvent(eventName: string): void {
    if (!this.enabled) return;

    if (!this.eventCounts.has(eventName)) {
      this.eventCounts.set(eventName, 0);
    }
    this.eventCounts.set(eventName, this.eventCounts.get(eventName) + 1);
    this.totalEvents++;
  }

  /**
   * Capture memory usage snapshot
   * @private
   * @returns {Object|null} Memory snapshot or null if unavailable
   */
  captureMemorySnapshot(): void {
    if (!performance.memory) {
      return null;
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedPercent: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }

    // Warn if memory usage is high
    if (snapshot.usedPercent > 80) {
      logger.warn(`⚠️ High memory usage: ${snapshot.usedPercent.toFixed(1)}% (${(snapshot.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB)`);
    }

    return snapshot;
  }

  /**
   * Get performance statistics for an operation
   * @param {string} operationName - Name of the operation
   * @returns {Object|null} Statistics object or null if no data
   * @example
   * const stats = perfMonitor.getOperationStats('load-workspace');
   * logger.info(`Average: ${stats.average}ms, Max: ${stats.max}ms`);
   */
  getOperationStats(operationName) {
    const timings = this.timings.get(operationName);
    if (!timings || timings.length === 0) {
      return null;
    }

    const durations = timings.map(t => t.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const average = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const median = this.calculateMedian(durations);

    return {
      count: durations.length,
      average: Number(average.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      median: Number(median.toFixed(2)),
      total: Number(sum.toFixed(2))
    };
  }

  /**
   * Calculate median from array of numbers
   * @private
   * @param {number[]} arr - Array of numbers
   * @returns {number} Median value
   */
  calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Get comprehensive performance report
   * @returns {Object} Performance report with timings, events, memory
   * @example
   * const report = perfMonitor.getReport();
   * console.table(report.timings);
   */
  getReport(): any {
    const report = {
      summary: {
        totalOperations: this.totalOperations,
        totalEvents: this.totalEvents,
        slowOperations: this.slowOperations.length,
        monitoringEnabled: this.enabled
      },
      timings: {},
      events: {},
      slowOperations: this.slowOperations.slice(-10), // Last 10 slow ops
      memory: this.getMemorySummary(),
      recommendations: this.getRecommendations()
    };

    // Collect timing stats
    for (const [name, timings] of this.timings.entries()) {
      report.timings[name] = this.getOperationStats(name);
    }

    // Collect event counts
    for (const [name, count] of this.eventCounts.entries()) {
      report.events[name] = count;
    }

    return report;
  }

  /**
   * Get memory usage summary
   * @returns {Object|null} Memory summary or null if unavailable
   */
  getMemorySummary() {
    if (this.memorySnapshots.length === 0) {
      return null;
    }

    const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
    const usedMB = latest.usedJSHeapSize / 1024 / 1024;
    const totalMB = latest.totalJSHeapSize / 1024 / 1024;
    const limitMB = latest.jsHeapSizeLimit / 1024 / 1024;

    return {
      current: {
        used: `${usedMB.toFixed(1)}MB`,
        total: `${totalMB.toFixed(1)}MB`,
        limit: `${limitMB.toFixed(1)}MB`,
        usedPercent: `${latest.usedPercent.toFixed(1)}%`
      },
      snapshotCount: this.memorySnapshots.length
    };
  }

  /**
   * Get performance recommendations
   * @returns {string[]} Array of recommendation strings
   */
  getRecommendations() {
    const recommendations = [];

    // Check for slow operations
    if (this.slowOperations.length > 10) {
      recommendations.push(`Found ${this.slowOperations.length} slow operations. Consider optimizing or increasing slowThreshold.`);
    }

    // Check for high event frequency
    const highFreqEvents = Array.from(this.eventCounts.entries())
      .filter(([name, count]) => count > 1000)
      .map(([name]) => name);

    if (highFreqEvents.length > 0) {
      recommendations.push(`High event frequency detected: ${highFreqEvents.join(', ')}. Consider debouncing or batching.`);
    }

    // Check memory usage
    if (this.memorySnapshots.length > 0) {
      const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
      if (latest.usedPercent > 70) {
        recommendations.push(`Memory usage is ${latest.usedPercent.toFixed(1)}%. Consider clearing caches or reducing data retention.`);
      }
    }

    return recommendations.length > 0 ? recommendations : ['No issues detected. Performance looks good!'];
  }

  /**
   * Log performance report to console
   * @returns {void}
   * @example
   * perfMonitor.logReport();
   */
  logReport(): void {
    if (!this.enabled) {
      logger.info('Monitoring is disabled');
      return;
    }

    const report = this.getReport();

    logger.info('📊 Performance Report', report);
  }

  /**
   * Reset all metrics
   * @returns {void}
   * @example
   * perfMonitor.reset();
   */
  reset(): void {
    this.timers.clear();
    this.timings.clear();
    this.eventCounts.clear();
    this.slowOperations = [];
    this.memorySnapshots = [];
    this.errors = [];
    this.totalOperations = 0;
    this.totalEvents = 0;

    logger.info('Metrics reset');
  }

  /**
   * Enable monitoring
   * @returns {void}
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.startMonitoring();
    logger.info('Enabled');
  }

  /**
   * Disable monitoring
   * @returns {void}
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    // Clear intervals
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

    logger.info('Disabled');
  }

  /**
   * Destroy monitor and clean up
   * @returns {void}
   */
  destroy(): void {
    this.disable();
    this.reset();
    logger.info('Destroyed');
  }
}
