# Widget Registry Architecture

## Overview

The **Widget Registry** is a centralized system for managing widget and app definitions, components, and instances throughout the Symbiosis desktop environment. It provides a clean separation between widget metadata (definitions), implementations (components), and runtime instances.

## Benefits

### 1. Code Splitting & Lazy Loading
Load widget code on-demand instead of bundling everything upfront:
```typescript
// Register a dynamic loader
registry.registerLoader('calendar', () => import('./widgets/calendar.js'));

// Component loads automatically when needed
const instance = await registry.createInstance('calendar', { ... });
```

**Impact**: Faster initial load times, reduced bundle size.

### 2. Plugin System Foundation
Third-party developers can register custom widgets without modifying core code:
```typescript
// Plugin developer's code
export function registerPlugin(registry) {
  registry.registerDefinition('my-custom-widget', {
    id: 'my-custom-widget',
    name: 'Custom Widget',
    // ... metadata
  });

  registry.registerLoader('my-custom-widget', () =>
    import('./my-custom-widget.js')
  );
}
```

**Impact**: Extensibility, community widgets, marketplace potential.

### 3. Hot Module Replacement (HMR)
Update widget components without page reload during development:
```typescript
// In development mode
if (import.meta.hot) {
  import.meta.hot.accept('./widgets/clock.js', (newModule) => {
    registry.registerComponent('clock', newModule.default);
    // Re-render affected instances
  });
}
```

**Impact**: Faster development workflow.

### 4. Type Safety & Validation
Strict validation at registration time prevents runtime errors:
```typescript
// Validates required fields, dimensions, types
registry.registerDefinition('widget-id', definition);
// Throws detailed error if invalid
```

**Impact**: Catch errors early, better developer experience.

### 5. Centralized Management
Single source of truth for all widget-related data:
- Query available widgets by type/category
- Get statistics and analytics
- Export/import widget catalogs
- Track widget instances

**Impact**: Simplified maintenance, easier debugging.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                      WidgetRegistry                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐ │
│  │  Definitions  │  │  Components   │  │    Loaders     │ │
│  │    (Meta)     │  │     (Code)    │  │   (Dynamic)    │ │
│  └───────────────┘  └───────────────┘  └────────────────┘ │
│          │                  │                    │          │
│          └──────────────────┴────────────────────┘          │
│                             │                               │
│                      ┌──────▼────────┐                      │
│                      │   Instances   │                      │
│                      │   (Runtime)   │                      │
│                      └───────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │    EventBus    │
                    │  (Lifecycle)   │
                    └────────────────┘
```

### Data Flow

1. **Registration Phase** (App Startup)
   ```typescript
   // 1. Register metadata
   registry.registerDefinition('clock', clockDefinition);

   // 2. Register implementation (immediate or lazy)
   registry.registerComponent('clock', ClockComponent);
   // OR
   registry.registerLoader('clock', () => import('./widgets/clock.js'));
   ```

2. **Instance Creation** (User Action)
   ```typescript
   // 3. User adds widget to workspace
   const instance = await registry.createInstance('clock', {
     id: generateId(),
     cell: 15,
     config: {}
   });

   // 4. Component loads (if not cached)
   // 5. Instance created and stored
   // 6. Event emitted for rendering
   ```

3. **Instance Lifecycle**
   ```typescript
   // Get instance
   const instance = registry.getInstance('instance-123');

   // Remove instance
   registry.removeInstance('instance-123');
   // Emits 'registry:instance-removed' event
   ```

## Usage Guide

### Basic Registration

```typescript
import { WidgetRegistry } from './managers/widget-registry';
import { EventBus } from './managers/event-bus';

// 1. Create registry
const eventBus = new EventBus();
const registry = new WidgetRegistry({ eventBus });

// 2. Register widget definition
registry.registerDefinition('clock', {
  id: 'clock',
  name: 'Clock',
  icon: 'fa-clock',
  type: 'widget',
  cols: 2,
  rows: 1,
  category: 'productivity'
});

// 3. Register component (static loading)
import { ClockWidget } from './widgets/clock';
registry.registerComponent('clock', ClockWidget);

// OR register loader (dynamic loading)
registry.registerLoader('clock', () => import('./widgets/clock.js'));

// 4. Create instance
const instance = await registry.createInstance('clock', {
  id: 'clock-instance-1',
  cell: 5,
  config: { timezone: 'UTC' }
});
```

### Bulk Registration

```typescript
// Import all widget definitions
import { availableWidgets } from './data/available-widgets';

// Register all definitions at once
const result = registry.registerDefinitions(availableWidgets, true);
console.log(`Registered ${result.registered} widgets`);
console.log(`Errors: ${result.errors.length}`);
```

### Querying Widgets

```typescript
// Get all widgets
const allWidgets = registry.getDefinitions();

// Filter by type
const widgets = registry.getDefinitions({ type: 'widget' });
const apps = registry.getDefinitions({ type: 'app' });

// Filter by category
const productivity = registry.getDefinitions({ category: 'productivity' });

// Get statistics
const stats = registry.getStats();
// {
//   definitions: 42,
//   components: 38,
//   loaders: 4,
//   instances: 15,
//   categories: 6,
//   types: { widgets: 35, apps: 7 }
// }

// Get all categories
const categories = registry.getCategories();
// ['data', 'productivity', 'social', 'utilities', ...]
```

### Event Handling

```typescript
// Listen for registry events
eventBus.on('registry:definition-registered', ({ id, definition }) => {
  console.log(`Widget registered: ${definition.name}`);
});

eventBus.on('registry:component-registered', ({ id }) => {
  console.log(`Component loaded: ${id}`);
});

eventBus.on('registry:instance-removed', ({ instanceId }) => {
  console.log(`Instance removed: ${instanceId}`);
  // Clean up UI, save state, etc.
});
```

### Component Structure

Widget components should follow this pattern:

```typescript
export class MyWidget {
  definition: WidgetDefinition;
  instance: WidgetInstance;
  element: HTMLElement;

  constructor({ definition, instance }) {
    this.definition = definition;
    this.instance = instance;
    this.init();
  }

  init() {
    // Initialize widget
    this.render();
    this.attachEventListeners();
  }

  render() {
    // Create DOM elements
    this.element = document.createElement('div');
    this.element.className = 'widget';
    // ...
  }

  attachEventListeners() {
    // Add event listeners
  }

  destroy() {
    // Cleanup
  }
}
```

## Integration with Existing System

### Current Architecture

The existing system uses:
- `availableWidgets` array for metadata
- Direct component imports in `widget-ui-controller.ts`
- Manual instance tracking in `workspace-manager.ts`

### Migration Strategy

#### Phase 1: Create Registry (✅ Complete)
- [x] Implement WidgetRegistry class
- [x] Add comprehensive tests
- [x] Document architecture

#### Phase 2: Integrate with Desktop Initializer
```typescript
// src/orchestrators/desktop-initializer.ts

import { createWidgetRegistry } from '../managers/widget-registry';
import { availableWidgets } from '../data/available-widgets';

export async function initializeDesktop() {
  // 1. Create registry
  const registry = createWidgetRegistry({ eventBus });

  // 2. Register all widget definitions
  const result = registry.registerDefinitions(availableWidgets, true);
  console.log(`Registered ${result.registered} widgets`);

  // 3. Register static components
  // (For now, keep static imports)
  // TODO: Convert to dynamic loading in Phase 3

  // 4. Pass registry to managers
  const widgetManager = new WidgetManager({ registry, eventBus });
  const workspaceManager = new WorkspaceManager({ registry, eventBus });

  return { registry, widgetManager, workspaceManager };
}
```

#### Phase 3: Update Widget UI Controller
```typescript
// src/managers/widget-ui-controller.ts

export class WidgetUIController {
  registry: WidgetRegistry;

  constructor({ registry, dom, eventBus }) {
    this.registry = registry;
    // ...
  }

  async renderWidget(widgetInstance) {
    // Get widget definition from registry
    const definition = this.registry.getDefinition(widgetInstance.widgetDefId);
    if (!definition) {
      throw new Error(`Widget definition not found: ${widgetInstance.widgetDefId}`);
    }

    // Rest of rendering logic...
  }
}
```

#### Phase 4: Update Workspace Manager
```typescript
// src/managers/workspace-manager.ts

export class WorkspaceManager {
  registry: WidgetRegistry;

  constructor({ registry, eventBus }) {
    this.registry = registry;
    // ...
  }

  async addWidgetToWorkspace(widgetDefId, cell) {
    // Create instance through registry
    const instance = await this.registry.createInstance(widgetDefId, {
      id: generateId(),
      cell,
      config: {}
    });

    // Add to workspace
    this.currentWorkspace.widgets.push(instance);

    // Emit event
    this.eventBus.emit('widget:added', instance);
  }

  removeWidgetFromWorkspace(instanceId) {
    // Remove from workspace
    const index = this.currentWorkspace.widgets.findIndex(w => w.id === instanceId);
    if (index !== -1) {
      this.currentWorkspace.widgets.splice(index, 1);
    }

    // Remove from registry
    this.registry.removeInstance(instanceId);

    // Emit event
    this.eventBus.emit('widget:removed', { instanceId });
  }
}
```

#### Phase 5: Dynamic Loading (Future)
```typescript
// Convert static imports to dynamic loaders

// BEFORE:
import { ClockWidget } from './widgets/clock';
registry.registerComponent('clock', ClockWidget);

// AFTER:
registry.registerLoader('clock', () => import('./widgets/clock.js'));

// Component loads automatically when first needed
const instance = await registry.createInstance('clock', { ... });
```

### Breaking Changes

None! The registry is designed to work alongside the existing system:
- Existing `availableWidgets` array continues to work
- Existing managers continue to function
- Migration can be gradual

## Future Enhancements

### 1. Widget Marketplace

Enable users to browse and install community widgets:

```typescript
// Marketplace integration
class WidgetMarketplace {
  async installWidget(packageName) {
    // 1. Download widget package
    const widgetPackage = await this.downloadPackage(packageName);

    // 2. Validate widget
    if (!this.validateWidget(widgetPackage)) {
      throw new Error('Invalid widget package');
    }

    // 3. Register widget
    registry.registerDefinition(widgetPackage.id, widgetPackage.definition);
    registry.registerLoader(widgetPackage.id, widgetPackage.loader);

    // 4. Save to user's installed widgets
    await this.saveInstalledWidget(widgetPackage);
  }
}
```

### 2. Widget Permissions System

Control what widgets can access:

```typescript
interface WidgetDefinition {
  // ... existing fields
  permissions?: {
    network?: boolean;
    storage?: boolean;
    notifications?: boolean;
    location?: boolean;
  };
}

// Permission check during registration
registry.registerDefinition('weather', {
  id: 'weather',
  name: 'Weather Widget',
  permissions: {
    network: true,  // Needs to fetch weather data
    location: true  // Needs user location
  }
});
```

### 3. Widget Versioning

Support multiple versions of widgets:

```typescript
interface WidgetDefinition {
  // ... existing fields
  version: string;
  minSystemVersion?: string;
  compatibleVersions?: string[];
}

// Version checking
registry.registerDefinition('clock', {
  id: 'clock',
  name: 'Clock',
  version: '2.0.0',
  minSystemVersion: '1.5.0'
});
```

### 4. Widget Dependencies

Allow widgets to depend on other widgets:

```typescript
interface WidgetDefinition {
  // ... existing fields
  dependencies?: {
    required?: string[];
    optional?: string[];
  };
}

// Dependency resolution
registry.registerDefinition('dashboard', {
  id: 'dashboard',
  name: 'Dashboard',
  dependencies: {
    required: ['clock', 'weather', 'calendar']
  }
});

// Auto-install dependencies
await registry.createInstance('dashboard', { ... });
// Ensures 'clock', 'weather', 'calendar' are available
```

### 5. Widget Templates

Reusable widget templates:

```typescript
// Define template
registry.registerTemplate('card-widget', {
  baseStyles: { /* ... */ },
  baseStructure: { /* ... */ },
  defaultConfig: { /* ... */ }
});

// Use template
registry.registerDefinition('quote-widget', {
  id: 'quote-widget',
  name: 'Quote of the Day',
  template: 'card-widget',
  // Template styles automatically applied
});
```

### 6. Widget Analytics

Track widget usage and performance:

```typescript
// Analytics integration
class WidgetAnalytics {
  trackWidgetAdded(widgetDefId) {
    // Record widget installation
  }

  trackWidgetRemoved(widgetDefId, reason) {
    // Record widget uninstallation and reason
  }

  trackWidgetPerformance(widgetDefId, metrics) {
    // Record load time, memory usage, etc.
  }
}

// Auto-tracking through registry events
eventBus.on('registry:instance-created', ({ widgetDefId }) => {
  analytics.trackWidgetAdded(widgetDefId);
});
```

## Testing

The WidgetRegistry has comprehensive test coverage (73 tests, all passing):

- ✅ Constructor and initialization
- ✅ Definition registration (single and bulk)
- ✅ Component registration
- ✅ Dynamic loader registration
- ✅ Instance creation and lifecycle
- ✅ Querying and filtering
- ✅ Statistics and categories
- ✅ Export/import functionality
- ✅ Error handling
- ✅ Event emission
- ✅ Integration scenarios

Run tests:
```bash
npm test -- widget-registry.test.ts
```

## Performance Considerations

### Memory Management

```typescript
// Clean up instances when removed
eventBus.on('widget:removed', ({ instanceId }) => {
  const instance = registry.getInstance(instanceId);
  if (instance && instance.destroy) {
    instance.destroy(); // Widget cleanup
  }
  registry.removeInstance(instanceId); // Registry cleanup
});
```

### Lazy Loading Best Practices

```typescript
// Register loaders for large widgets
if (definition.size === 'large' || definition.complexity === 'high') {
  registry.registerLoader(definition.id, () =>
    import(`./widgets/${definition.id}.js`)
  );
} else {
  // Small widgets can be loaded upfront
  registry.registerComponent(definition.id, component);
}
```

### Caching Strategy

The registry automatically caches:
- ✅ Loaded components (once loaded, stays in memory)
- ✅ Widget instances (by instance ID)
- ✅ Definition queries (uses Map for O(1) lookups)

## API Reference

### WidgetRegistry

#### Constructor
```typescript
new WidgetRegistry(options?: { eventBus?: EventBus })
```

#### Registration Methods
- `registerDefinition(id, definition)` - Register widget metadata
- `registerDefinitions(definitions, skipErrors?)` - Bulk registration
- `registerComponent(id, ComponentClass)` - Register component class
- `registerLoader(id, loader)` - Register dynamic loader

#### Query Methods
- `getDefinition(id)` - Get widget definition
- `getDefinitions(filters?)` - Get all definitions (with optional filters)
- `hasDefinition(id)` - Check if definition exists
- `hasComponent(id)` - Check if component exists
- `hasLoader(id)` - Check if loader exists
- `getComponent(id)` - Get component (loads if needed)

#### Instance Methods
- `createInstance(widgetDefId, instanceData)` - Create widget instance
- `getInstance(instanceId)` - Get instance by ID
- `removeInstance(instanceId)` - Remove instance

#### Utility Methods
- `getStats()` - Get registry statistics
- `getCategories()` - Get unique categories
- `exportDefinitions()` - Export all definitions
- `importDefinitions(definitions, replace?)` - Import definitions
- `unregisterDefinition(id)` - Unregister widget (dangerous)
- `clear()` - Clear all registrations (dangerous)

## Conclusion

The Widget Registry provides a solid foundation for:
- ✅ Better code organization
- ✅ Performance optimization (code splitting)
- ✅ Extensibility (plugin system)
- ✅ Developer experience (validation, debugging)
- ✅ Future growth (marketplace, permissions, versioning)

The architecture is production-ready and can be adopted gradually without breaking existing functionality.
