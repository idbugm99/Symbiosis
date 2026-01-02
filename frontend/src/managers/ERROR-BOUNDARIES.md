# Error Boundaries

Error boundaries catch errors in critical operations, prevent cascading failures, and provide graceful degradation. Similar to React error boundaries but for vanilla JavaScript.

## Overview

The ErrorBoundary system provides:
- 🛡️ **Error Catching** - Wrap risky operations in try-catch
- 🎯 **Context Tracking** - Group errors by operation/component
- 🔄 **Graceful Fallbacks** - Provide fallback behavior when errors occur
- 📊 **Error Reporting** - Aggregate and analyze error patterns
- 🚨 **Global Handlers** - Catch unhandled errors and promise rejections

## Usage

### Accessing the Error Boundary

The error boundary is available globally in the browser console:

```javascript
// View error report
errorBoundary.logErrorReport();

// Get raw report data
const report = errorBoundary.getErrorReport();
console.table(report.summary);

// Check errors for specific context
const widgetErrors = errorBoundary.getErrorsForContext('load-widgets');
console.log(widgetErrors);

// Reset all errors
errorBoundary.reset();
```

### Automatic Error Handling

The following operations are automatically protected:

#### Component Initialization
- `StorageManager` - Wrapped with fallback UI
- Other managers - Can be wrapped similarly

#### Critical Operations
- `load-widgets` - Widget loading with fallback to welcome message
- All global errors - Captured via `window.onerror`
- Unhandled promise rejections - Captured automatically

### Wrapping Synchronous Operations

```javascript
// Basic wrapping
const result = errorBoundary.wrap(() => {
  return riskyOperation();
}, 'operation-name');

// With fallback
const result = errorBoundary.wrap(() => {
  return riskyOperation();
}, 'operation-name', {
  fallback: () => {
    return defaultValue;
  }
});

// With rethrow (catch, log, then rethrow)
try {
  const result = errorBoundary.wrap(() => {
    return riskyOperation();
  }, 'operation-name', {
    rethrow: true
  });
} catch (error) {
  // Handle error after logging
}
```

### Wrapping Asynchronous Operations

```javascript
// Basic async wrapping
const result = await errorBoundary.wrapAsync(async () => {
  return await fetchData();
}, 'fetch-operation');

// With fallback
const result = await errorBoundary.wrapAsync(async () => {
  return await fetchData();
}, 'fetch-operation', {
  fallback: async () => {
    return await loadCachedData();
  }
});
```

### Wrapping Component Initialization

```javascript
// Wrap manager/component initialization
const manager = errorBoundary.wrapComponent(() => {
  return new MyManager({ ... });
}, 'MyManager', document.getElementById('container'));

// Check if initialization succeeded
if (!manager) {
  console.error('MyManager failed to initialize');
  // Handle failure (error UI already shown)
}
```

## Error Report

### Viewing Reports

```javascript
// Log formatted report to console
errorBoundary.logErrorReport();
```

Example output:
```
🚨 Error Boundary Report
  Summary: {
    totalErrors: 15,
    recoverableErrors: 12,
    fatalErrors: 3,
    uniqueContexts: 5,
    disabled: false
  }

  📊 Error Frequency by Context
  ┌─────────────────┬───────┐
  │ Context         │ Count │
  ├─────────────────┼───────┤
  │ load-widgets    │ 5     │
  │ fetch-data      │ 4     │
  │ render-widget   │ 3     │
  │ global-error    │ 2     │
  │ component-init  │ 1     │
  └─────────────────┴───────┘

  ⚠️ Recent Errors (Last 10)
  │ [load-widgets] Cannot read property 'map' of undefined
  │ [fetch-data] Failed to fetch
  │ [render-widget] Element not found

  💀 Fatal Errors (Last 10)
  │ Component: WidgetManager
  │ Error: Cannot access 'storage' before initialization
  │ Timestamp: 2025-01-15T10:30:45.123Z

  🔥 Most Common Error
  │ Context: load-widgets
  │ Count: 5
  │ Message: Cannot read property 'map' of undefined

  💡 Recommendations
  │ • Found 3 fatal errors. Check component initialization logic.
  │ • "load-widgets" is failing repeatedly (5 times). Investigation needed.
```

### Programmatic Access

```javascript
const report = errorBoundary.getErrorReport();

// Summary statistics
console.log(report.summary);
// {
//   totalErrors: 15,
//   recoverableErrors: 12,
//   fatalErrors: 3,
//   uniqueContexts: 5,
//   disabled: false
// }

// Error frequency by context
console.table(report.errorFrequency);
// { 'load-widgets': 5, 'fetch-data': 4, ... }

// Recent errors
console.log(report.recentErrors);
// [{ error, message, context, timestamp, ... }]

// Fatal errors (caused component failures)
console.log(report.fatalErrors);

// Most common error
console.log(report.mostCommonError);
// { context: 'load-widgets', count: 5, message: '...' }

// Recommendations
console.log(report.recommendations);
// ['Found 3 fatal errors...', 'Investigation needed...']
```

## Error Context

### Checking Specific Contexts

```javascript
// Check if context has errors
if (errorBoundary.hasErrorsInContext('load-widgets')) {
  console.warn('Widget loading has been failing');
}

// Get all errors for context
const errors = errorBoundary.getErrorsForContext('load-widgets');
errors.forEach(err => {
  console.log(err.message, err.timestamp);
});
```

### Context Naming Convention

Use descriptive, hierarchical context names:
- `component-init:WidgetManager` - Component initialization
- `load-widgets` - Widget loading operation
- `fetch-data:user` - Data fetching for specific resource
- `render-widget:favorites` - Rendering specific widget
- `global-error` - Uncaught global errors
- `unhandled-rejection` - Unhandled promise rejections

## Error UI

### Automatic Error Display

When a component fails to initialize, an error UI is automatically shown:

```
┌───────────────────────────────────────┐
│ ⚠️ WidgetManager Failed to Load       │
│                                       │
│ An error occurred while loading      │
│ this component.                       │
│                                       │
│ ▸ Show error details                 │
│                                       │
│ [ Reload Page ]                       │
└───────────────────────────────────────┘
```

### Customizing Error UI

The error UI is rendered by `renderErrorUI()`. To customize:

1. Create custom error template
2. Override `renderErrorUI()` method
3. Or provide custom fallback in `wrapComponent()`

Example custom fallback:
```javascript
const manager = errorBoundary.wrapComponent(() => {
  return new MyManager();
}, 'MyManager', null); // null = don't show default UI

if (!manager) {
  // Show custom error UI
  showCustomErrorMessage('MyManager');
}
```

## Safety Features

### Maximum Error Limit

The error boundary disables itself after `maxErrors` (default: 50) to prevent:
- Infinite error loops
- Performance degradation
- Memory leaks from error storage

```javascript
const report = errorBoundary.getErrorReport();
if (report.summary.disabled) {
  console.error('ErrorBoundary disabled due to too many errors');
  // Reload page or take corrective action
}
```

### Error Storage Limits

- **Total errors**: Last 100 errors kept
- **Per-context errors**: All errors grouped by context
- **Fatal errors**: All fatal errors retained

Prevents memory bloat while maintaining error history for debugging.

## Best Practices

### 1. Wrap Critical Paths

Always wrap operations that could fail and impact user experience:

```javascript
// ✅ Good - wrapped with fallback
errorBoundary.wrap(() => {
  loadUserSettings();
}, 'load-settings', {
  fallback: () => useDefaultSettings()
});

// ❌ Bad - no error handling
loadUserSettings();
```

### 2. Provide Meaningful Fallbacks

```javascript
// ✅ Good - useful fallback
const data = await errorBoundary.wrapAsync(async () => {
  return await fetchFromAPI();
}, 'fetch-api', {
  fallback: async () => {
    // Load from cache or show partial data
    return await loadFromCache();
  }
});

// ❌ Bad - no fallback (returns null)
const data = await errorBoundary.wrapAsync(async () => {
  return await fetchFromAPI();
}, 'fetch-api');
```

### 3. Use Descriptive Context Names

```javascript
// ✅ Good - clear, hierarchical
errorBoundary.wrap(() => {
  saveWidgetConfig(widgetId, config);
}, `save-config:widget-${widgetId}`);

// ❌ Bad - vague context
errorBoundary.wrap(() => {
  saveWidgetConfig(widgetId, config);
}, 'save');
```

### 4. Check for Repeated Errors

```javascript
const errors = errorBoundary.getErrorsForContext('my-operation');
if (errors.length > 5) {
  console.error('Operation failing repeatedly, disabling feature');
  disableFeature();
}
```

### 5. Monitor Fatal Errors

```javascript
const report = errorBoundary.getErrorReport();
if (report.summary.fatalErrors > 0) {
  // Alert user or take corrective action
  showCriticalErrorNotification();
}
```

## Integration with Analytics

Send error reports to analytics service:

```javascript
const errorBoundary = new ErrorBoundary({
  onError: (error, context) => {
    // Send to analytics service
    analytics.trackError({
      message: error.message,
      stack: error.stack,
      context: context.context,
      timestamp: context.timestamp,
      userAgent: navigator.userAgent
    });
  }
});
```

## Debugging

### Enable Verbose Logging

```javascript
// Errors are logged by default
// To see more detail, check the error stack

const report = errorBoundary.getErrorReport();
report.recentErrors.forEach(err => {
  console.group(`Error: ${err.context.context}`);
  console.error('Error:', err.error);
  console.log('Stack:', err.stack);
  console.log('Context:', err.context);
  console.groupEnd();
});
```

### Test Error Handling

```javascript
// Manually trigger error to test handling
errorBoundary.wrap(() => {
  throw new Error('Test error');
}, 'test-operation', {
  fallback: () => {
    console.log('Fallback executed successfully');
  }
});

// Check error was logged
console.log(errorBoundary.hasErrorsInContext('test-operation')); // true
```

## Production Considerations

### Error Reporting

In production, send errors to monitoring service:
- Sentry
- Rollbar
- LogRocket
- Custom error tracking API

### UI for End Users

Show user-friendly error messages, not technical details:

```javascript
// Development: Show technical details
if (import.meta.env.DEV) {
  showTechnicalError(error);
} else {
  // Production: Show friendly message
  showGenericErrorMessage();
}
```

### Privacy

Strip sensitive data from errors before reporting:
- User credentials
- API keys
- Personal information
- Internal URLs/paths

## API Reference

See JSDoc comments in `error-boundary.js` for complete API documentation:

### Core Methods
- `wrap(fn, context, options)` - Wrap sync function
- `wrapAsync(fn, context, options)` - Wrap async function
- `wrapComponent(fn, componentName, container)` - Wrap component init

### Reporting
- `getErrorReport()` - Get error report object
- `logErrorReport()` - Log formatted report
- `getErrorsForContext(context)` - Get errors for context
- `hasErrorsInContext(context)` - Check if context has errors

### Management
- `reset()` - Clear all errors
- `enable()` / `disable()` - Toggle error boundary
- `destroy()` - Clean up

## Future Enhancements

Planned features:
- [ ] Error recovery strategies (retry, fallback chain)
- [ ] Error deduplication (same error repeated)
- [ ] Error severity levels (warning, error, fatal)
- [ ] Error grouping by similarity
- [ ] Automatic issue creation in bug tracker
- [ ] Performance impact tracking for errors
