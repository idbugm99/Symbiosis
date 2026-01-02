# Performance Monitoring

The PerformanceMonitor tracks application performance metrics including operation timings, memory usage, and event frequency.

## Overview

The PerformanceMonitor is automatically enabled in development mode and tracks:
- ⏱️ **Operation Timings** - How long operations take to complete
- 📡 **Event Frequency** - How often events are emitted
- 💾 **Memory Usage** - JavaScript heap size and usage trends
- ⚠️ **Slow Operations** - Operations exceeding threshold (default: 100ms)

## Usage

### Accessing the Monitor

The performance monitor is available globally in the browser console:

```javascript
// View current performance report
perfMonitor.logReport();

// Get raw report data
const report = perfMonitor.getReport();
console.table(report.timings);

// Get specific operation stats
const stats = perfMonitor.getOperationStats('desktop-init');
console.log(`Average: ${stats.average}ms`);

// Reset all metrics
perfMonitor.reset();
```

### Automatic Tracking

The following operations are automatically tracked:

#### Desktop Initialization
- `desktop-init` - Total desktop initialization time
- `load-user-data` - User data loading
- `load-menubar` - Menu bar plugin loading
- `load-widgets` - Widget loading for current workspace

#### Workspace Operations
- `workspace-switch` - Time to switch between workspaces

#### Events
All EventBus events are automatically tracked. View event counts:
```javascript
const report = perfMonitor.getReport();
console.table(report.events);
```

### Manual Tracking

Track custom operations in your code:

```javascript
// Start timing
perfMonitor.startTimer('my-operation', { customData: 'value' });

// ... do work ...

// End timing (returns duration in ms)
const duration = perfMonitor.endTimer('my-operation');
console.log(`Operation took ${duration}ms`);
```

## Configuration

The PerformanceMonitor is configured in `desktop.js`:

```javascript
this.perfMonitor = new PerformanceMonitor({
  enabled: true,                // Enable/disable monitoring
  slowThreshold: 100,           // Threshold for slow operations (ms)
  memoryCheckInterval: 30000,   // Memory snapshot interval (ms)
  autoReport: false,            // Auto-log reports every N seconds
  autoReportInterval: 60000     // Auto-report interval (ms)
});
```

### Production Mode

In production, the monitor is disabled by default:
```javascript
enabled: import.meta.env.DEV || false
```

To enable in production:
```javascript
this.perfMonitor = new PerformanceMonitor({ enabled: true });
```

## Performance Report

### Viewing Reports

```javascript
// Log formatted report to console
perfMonitor.logReport();
```

Example output:
```
📊 Performance Report
  Summary: { totalOperations: 42, totalEvents: 156, slowOperations: 3 }

  ⏱️ Operation Timings
  ┌─────────────────────┬───────┬─────────┬───────┬────────┬────────┐
  │ Operation           │ Count │ Average │ Min   │ Max    │ Median │
  ├─────────────────────┼───────┼─────────┼───────┼────────┼────────┤
  │ desktop-init        │ 1     │ 245.12  │ 245.12│ 245.12 │ 245.12 │
  │ load-widgets        │ 5     │ 45.67   │ 32.10 │ 78.45  │ 42.33  │
  │ workspace-switch    │ 8     │ 156.23  │ 89.12 │ 234.56 │ 142.11 │
  └─────────────────────┴───────┴─────────┴───────┴────────┴────────┘

  📡 Event Counts
  ┌────────────────────┬───────┐
  │ Event              │ Count │
  ├────────────────────┼───────┤
  │ widget:added       │ 12    │
  │ workspace:switched │ 8     │
  │ widgets:loaded     │ 5     │
  └────────────────────┴───────┘

  ⚠️ Slow Operations (Last 10)
  │ workspace-switch took 234.56ms (threshold: 100ms)
  │ load-widgets took 178.45ms (threshold: 100ms)

  💾 Memory Usage
  │ Used: 45.2MB / 256.0MB (17.7%)

  💡 Recommendations
  │ • No issues detected. Performance looks good!
```

### Programmatic Access

```javascript
const report = perfMonitor.getReport();

// Summary statistics
console.log(report.summary);
// { totalOperations: 42, totalEvents: 156, slowOperations: 3 }

// Operation timings
console.table(report.timings);

// Event counts
console.log(report.events);
// { 'widget:added': 12, 'workspace:switched': 8 }

// Slow operations
console.log(report.slowOperations);
// [{ name: 'workspace-switch', duration: 234.56, timestamp: '...' }]

// Memory summary
console.log(report.memory);
// { current: { used: '45.2MB', total: '256.0MB', ... } }

// Recommendations
console.log(report.recommendations);
// ['No issues detected. Performance looks good!']
```

## Memory Monitoring

Memory snapshots are captured every 30 seconds (configurable):

```javascript
// Get latest memory snapshot
const report = perfMonitor.getReport();
console.log(report.memory);

// Manually capture snapshot
perfMonitor.captureMemorySnapshot();
```

**Note:** Memory monitoring requires Chrome/Chromium-based browsers (uses `performance.memory` API).

## Performance Optimization

### Identifying Slow Operations

1. Check slow operations in report:
```javascript
const report = perfMonitor.getReport();
console.log(report.slowOperations);
```

2. Investigate operations with high average/max times:
```javascript
const stats = perfMonitor.getOperationStats('my-operation');
if (stats.average > 100) {
  console.warn(`${name} is slow: ${stats.average}ms average`);
}
```

### Identifying High-Frequency Events

High event frequency can cause performance issues:

```javascript
const report = perfMonitor.getReport();
Object.entries(report.events)
  .filter(([name, count]) => count > 1000)
  .forEach(([name, count]) => {
    console.warn(`High event frequency: ${name} (${count} times)`);
  });
```

**Solution:** Consider debouncing or batching high-frequency events.

### Memory Leaks

Monitor memory usage trends:

```javascript
// Check if memory is consistently increasing
const snapshots = perfMonitor.memorySnapshots;
const first = snapshots[0];
const last = snapshots[snapshots.length - 1];

const growth = last.usedJSHeapSize - first.usedJSHeapSize;
console.log(`Memory growth: ${(growth / 1024 / 1024).toFixed(1)}MB`);
```

## Browser DevTools Integration

The PerformanceMonitor uses the native Performance API, so you can also view metrics in Chrome DevTools:

1. Open DevTools (F12)
2. Go to **Performance** tab
3. Look for marks/measures matching your operation names:
   - `desktop-init-start`, `desktop-init-end`
   - `load-widgets-start`, `load-widgets-end`
   - etc.

## Best Practices

1. **Track Critical Paths** - Focus on operations that impact user experience:
   - Initial page load
   - Workspace switching
   - Widget rendering
   - API calls

2. **Set Appropriate Thresholds** - Adjust `slowThreshold` based on expected performance:
   - Fast operations: 50ms
   - Medium operations: 100ms
   - Slow operations: 500ms

3. **Monitor in Real Usage** - Enable `autoReport` during development:
   ```javascript
   autoReport: true,
   autoReportInterval: 60000 // Log every 60 seconds
   ```

4. **Clean Up Timers** - Always call `endTimer()` for every `startTimer()`:
   ```javascript
   try {
     perfMonitor.startTimer('operation');
     // ... work ...
   } finally {
     perfMonitor.endTimer('operation');
   }
   ```

5. **Disable in Production** - Performance monitoring has overhead:
   ```javascript
   enabled: import.meta.env.DEV // Only in dev mode
   ```

## Troubleshooting

### "Timer was not started" Warning

**Cause:** Called `endTimer()` without calling `startTimer()` first.

**Solution:** Ensure `startTimer()` is always called before `endTimer()`.

### High Memory Usage

**Symptoms:** `usedPercent > 80%` warnings

**Solutions:**
1. Clear old metrics: `perfMonitor.reset()`
2. Reduce snapshot retention (modify `captureMemorySnapshot()`)
3. Check for memory leaks in application code

### Performance Overhead

**Symptoms:** Monitoring itself slowing down application

**Solutions:**
1. Increase `slowThreshold` to reduce noise
2. Disable `autoReport`
3. Track fewer operations
4. Disable monitoring: `perfMonitor.disable()`

## API Reference

See JSDoc comments in `performance-monitor.js` for complete API documentation:
- `startTimer(operationName, metadata)` - Start timing
- `endTimer(operationName)` - End timing
- `trackEvent(eventName)` - Track event emission
- `getOperationStats(operationName)` - Get stats
- `getReport()` - Get full report
- `logReport()` - Log formatted report
- `reset()` - Clear all metrics
- `enable()` / `disable()` - Toggle monitoring

## Future Enhancements

Planned features:
- [ ] Export reports as JSON/CSV
- [ ] Performance budgets with alerts
- [ ] Percentile calculations (p50, p95, p99)
- [ ] Network request tracking
- [ ] React component render time tracking
- [ ] Automatic performance regression detection
