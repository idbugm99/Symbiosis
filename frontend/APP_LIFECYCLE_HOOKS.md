# App Lifecycle Hooks Guide

## Overview

Lifecycle hooks allow apps to respond to important events in their lifetime: mounting, unmounting, resizing, focus changes, and more. This enables apps to:

- **Initialize resources** when opened (fetch data, start timers, setup listeners)
- **Clean up resources** when closed (prevent memory leaks)
- **Respond to UI changes** (resize, focus, blur)
- **Manage state** throughout the app's lifecycle

## Available Lifecycle Hooks

### 1. `onMount(container, settings, context)`

**Called:** When app window is created and mounted to DOM
**Purpose:** Initialize your app, render UI, start timers, fetch initial data

**Parameters:**
- `container: HTMLElement` - The app's content container (render your app here)
- `settings: AppInstanceSettings` - Instance settings (displayMode, dimensions, etc.)
- `context: AppLifecycleContext` - App context with utilities:
  - `instanceId: string` - Unique instance ID
  - `appId: string` - App definition ID
  - `eventBus: EventBus | null` - Event bus for communication
  - `closeApp(): void` - Function to programmatically close the app
  - `updateSettings(newSettings): void` - Function to update app settings

**Example:**
```typescript
async onMount(container, settings, context) {
  // Render UI
  container.innerHTML = '<div>My App Content</div>';

  // Fetch initial data
  const data = await fetch('/api/data').then(r => r.json());

  // Start timer
  this.timer = setInterval(() => {
    updateUI();
  }, 1000);

  // Listen to events
  context.eventBus?.on('data:updated', handleDataUpdate);
}
```

### 2. `onUnmount()`

**Called:** Before app window is destroyed
**Purpose:** Clean up resources to prevent memory leaks

**CRITICAL:** Always implement this hook if you:
- Created timers/intervals (`setInterval`, `setTimeout`)
- Added event listeners
- Started network requests
- Opened WebSocket connections
- Created observers (MutationObserver, IntersectionObserver, etc.)

**Example:**
```typescript
async onUnmount() {
  // Clear timers
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }

  // Cancel requests
  this.abortController?.abort();

  // Remove listeners
  context.eventBus?.off('data:updated', handleDataUpdate);

  // Close connections
  this.websocket?.close();
}
```

### 3. `onResize(dimensions)`

**Called:** When app window is resized
**Purpose:** Respond to dimension changes, adjust layout

**Parameters:**
- `dimensions: { width: number; height: number }` - New window dimensions

**Example:**
```typescript
onResize(dimensions) {
  // Adjust layout for small screens
  if (dimensions.width < 600) {
    container.classList.add('mobile-layout');
  } else {
    container.classList.remove('mobile-layout');
  }

  // Re-render chart with new size
  chart.resize(dimensions.width, dimensions.height);
}
```

### 4. `onFocus()`

**Called:** When app window gains focus (brought to front)
**Purpose:** Resume activities, refresh data

**Example:**
```typescript
onFocus() {
  // Resume animations
  this.animation?.play();

  // Refresh data
  this.refreshData();

  // Resume polling
  this.startPolling();
}
```

### 5. `onBlur()`

**Called:** When app window loses focus (another window brought to front)
**Purpose:** Pause activities, save state

**Example:**
```typescript
onBlur() {
  // Pause animations
  this.animation?.pause();

  // Stop polling
  this.stopPolling();

  // Save current state
  this.saveState();
}
```

## App Structure

Apps should export an object or class implementing the lifecycle hooks:

### Object-based App (Recommended for simple apps)

```typescript
import type { AppModule } from '../types/index.js';

const MyApp: AppModule = {
  onMount(container, settings, context) {
    // Initialize app
  },

  onUnmount() {
    // Clean up
  },

  onResize(dimensions) {
    // Handle resize
  }
};

export default MyApp;
```

### Class-based App (Recommended for complex apps)

```typescript
import type { AppModule, AppLifecycleContext } from '../types/index.js';

class MyApp implements AppModule {
  private timer: number | null = null;
  private data: any = null;

  async onMount(container: HTMLElement, settings, context: AppLifecycleContext) {
    this.render(container);
    this.timer = window.setInterval(() => this.update(), 1000);
  }

  async onUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private render(container: HTMLElement) {
    container.innerHTML = '<div>My App</div>';
  }

  private update() {
    // Update UI
  }
}

export default new MyApp();
```

## Registering Apps with Lifecycle Hooks

### Option 1: Register App Module Directly

```typescript
import MyApp from './apps/my-app.js';

// Register definition first
widgetRegistry.registerDefinition('my-app', {
  id: 'my-app',
  name: 'My App',
  type: 'app',
  icon: '📱',
  cols: 2,
  rows: 2,
  category: 'productivity'
});

// Register app module with lifecycle hooks
widgetRegistry.registerAppModule('my-app', MyApp);
```

### Option 2: Register App Loader (Dynamic Import)

```typescript
// Register definition
widgetRegistry.registerDefinition('my-app', {
  id: 'my-app',
  name: 'My App',
  type: 'app',
  icon: '📱',
  cols: 2,
  rows: 2,
  category: 'productivity'
});

// Register loader for dynamic import (code splitting)
widgetRegistry.registerAppLoader('my-app', () => import('./apps/my-app.js'));
```

## Opening Apps

Apps are opened through the AppUIController, which now supports lifecycle hooks:

```typescript
// Open app (now async to load app module)
const instanceId = await appUIController.openApp('my-app', {
  displayMode: 'popup',
  dimensions: { width: 800, height: 600 }
});
```

## Best Practices

### 1. **Always Clean Up**
```typescript
// ❌ BAD - Memory leak
onMount(container) {
  setInterval(() => updateUI(), 1000);  // Never cleaned up!
}

// ✅ GOOD - Properly cleaned up
let timer: number | null = null;

onMount(container) {
  timer = window.setInterval(() => updateUI(), 1000);
}

onUnmount() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
```

### 2. **Handle Errors Gracefully**
```typescript
async onMount(container, settings, context) {
  try {
    const data = await fetchData();
    renderData(container, data);
  } catch (error) {
    renderError(container, error.message);
  }
}
```

### 3. **Use Context Utilities**
```typescript
onMount(container, settings, context) {
  // Close app programmatically
  button.addEventListener('click', () => {
    context.closeApp();
  });

  // Update settings dynamically
  toggleButton.addEventListener('click', () => {
    const newMode = settings.displayMode === 'fullscreen' ? 'popup' : 'fullscreen';
    context.updateSettings({ displayMode: newMode });
  });

  // Listen to events
  context.eventBus?.on('data:updated', (data) => {
    updateDisplay(data);
  });
}
```

### 4. **Optimize Resize Handler**
```typescript
// ❌ BAD - Called on every pixel change
onResize(dimensions) {
  expensiveOperation();
}

// ✅ GOOD - Debounced
let resizeTimeout: number | null = null;

onResize(dimensions) {
  if (resizeTimeout) clearTimeout(resizeTimeout);

  resizeTimeout = window.setTimeout(() => {
    expensiveOperation();
  }, 150);
}
```

### 5. **Save State Before Unmount**
```typescript
onUnmount() {
  // Save current state to localStorage
  const state = {
    scrollPosition: container.scrollTop,
    selectedTab: this.currentTab,
    formData: this.getFormData()
  };

  localStorage.setItem(`app-state-${appId}`, JSON.stringify(state));

  // Clean up resources
  clearInterval(this.timer);
}

onMount(container, settings, context) {
  // Restore previous state
  const savedState = localStorage.getItem(`app-state-${context.appId}`);
  if (savedState) {
    const state = JSON.parse(savedState);
    container.scrollTop = state.scrollPosition;
    this.currentTab = state.selectedTab;
    this.restoreFormData(state.formData);
  }
}
```

## Common Patterns

### Timer Management
```typescript
let timer: number | null = null;

onMount(container) {
  timer = window.setInterval(() => {
    // Update logic
  }, 1000);
}

onUnmount() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
```

### Fetch Data on Mount
```typescript
async onMount(container, settings, context) {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    renderData(container, data);
  } catch (error) {
    renderError(container, 'Failed to load data');
  }
}
```

### WebSocket Connection
```typescript
let ws: WebSocket | null = null;

onMount(container, settings, context) {
  ws = new WebSocket('wss://api.example.com');

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

onUnmount() {
  if (ws) {
    ws.close();
    ws = null;
  }
}
```

### Responsive Layout
```typescript
onMount(container, settings, context) {
  updateLayout(settings.dimensions || { width: 800, height: 600 });
}

onResize(dimensions) {
  updateLayout(dimensions);
}

function updateLayout(dimensions: { width: number; height: number }) {
  const isMobile = dimensions.width < 768;
  container.classList.toggle('mobile', isMobile);
  container.classList.toggle('desktop', !isMobile);
}
```

## Example: Complete App

See `src/apps/example-app.ts` for a complete working example demonstrating all lifecycle hooks.

## Troubleshooting

### Hook Not Called?

**Problem:** onMount hook not being called

**Solutions:**
1. Check app is registered: `widgetRegistry.registerAppModule('my-app', MyApp)`
2. Check export: App must be default export: `export default MyApp`
3. Check AppUIController has widgetRegistry: Pass it in constructor
4. Check console for errors during app loading

### Memory Leaks?

**Problem:** App continues consuming resources after closing

**Solutions:**
1. Implement `onUnmount` hook
2. Clear all timers/intervals
3. Remove all event listeners
4. Cancel pending requests (use AbortController)
5. Close WebSocket connections
6. Disconnect observers

### Type Errors?

**Problem:** TypeScript errors with lifecycle hooks

**Solutions:**
1. Import types: `import type { AppModule } from '../types/index.js'`
2. Use type annotation: `const MyApp: AppModule = { ... }`
3. Check parameter types match interface
4. Ensure return types are correct (void or Promise<void>)

## Migration Guide

If you have existing apps without lifecycle hooks, they will continue to work (hooks are optional). To add lifecycle hooks:

1. **Convert to module structure:**
   ```typescript
   // Before
   function renderApp(container) {
     container.innerHTML = '...';
   }

   // After
   export default {
     onMount(container, settings, context) {
       container.innerHTML = '...';
     }
   };
   ```

2. **Add cleanup:**
   ```typescript
   onUnmount() {
     // Clear timers
     // Remove listeners
     // Cancel requests
   }
   ```

3. **Register with registry:**
   ```typescript
   widgetRegistry.registerAppModule('my-app', MyApp);
   ```

## See Also

- `src/types/index.ts` - Type definitions for lifecycle hooks
- `src/apps/example-app.ts` - Complete example app
- `src/managers/app-ui-controller.ts` - Implementation of lifecycle hook system
- `src/managers/widget-registry.ts` - App registration system
