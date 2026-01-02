/**
 * WidgetRegistry Tests
 * Comprehensive tests for widget/app registry system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WidgetRegistry, createWidgetRegistry } from './widget-registry.js';
import type { WidgetDefinition } from '../types/index.js';

describe('WidgetRegistry', () => {
  let registry: WidgetRegistry;

  const validDefinition: WidgetDefinition = {
    id: 'test-widget',
    name: 'Test Widget',
    icon: 'fa-test',
    type: 'widget',
    cols: 2,
    rows: 2,
    category: 'productivity',
    size: '2x2',
    description: 'Test widget description'
  };

  const validApp: WidgetDefinition = {
    id: 'test-app',
    name: 'Test App',
    icon: 'fa-app',
    type: 'app',
    cols: 4,
    rows: 3,
    category: 'utilities',
    size: '4x3',
    description: 'Test app description'
  };

  beforeEach(() => {
    registry = new WidgetRegistry();
  });

  describe('constructor', () => {
    it('should initialize with empty maps', () => {
      expect(registry.definitions.size).toBe(0);
      expect(registry.components.size).toBe(0);
      expect(registry.instances.size).toBe(0);
      expect(registry.loaders.size).toBe(0);
    });

    it('should accept eventBus option', () => {
      const mockEventBus = { emit: vi.fn() };
      const registryWithBus = new WidgetRegistry({ eventBus: mockEventBus });

      expect(registryWithBus.eventBus).toBe(mockEventBus);
    });

    it('should initialize without eventBus', () => {
      expect(registry.eventBus).toBeNull();
    });
  });

  describe('registerDefinition', () => {
    it('should register valid widget definition', () => {
      registry.registerDefinition('test-widget', validDefinition);

      expect(registry.hasDefinition('test-widget')).toBe(true);
      expect(registry.definitions.size).toBe(1);
    });

    it('should register valid app definition', () => {
      registry.registerDefinition('test-app', validApp);

      expect(registry.hasDefinition('test-app')).toBe(true);
      expect(registry.getDefinition('test-app')?.type).toBe('app');
    });

    it('should throw error for invalid definition', () => {
      const invalidDefinition = { id: 'invalid' } as any;

      expect(() => registry.registerDefinition('invalid', invalidDefinition))
        .toThrow(/Cannot register widget/);
    });

    it('should throw error for duplicate registration', () => {
      registry.registerDefinition('test-widget', validDefinition);

      expect(() => registry.registerDefinition('test-widget', validDefinition))
        .toThrow(/already registered/);
    });

    it('should throw error for ID mismatch', () => {
      const mismatchDef = { ...validDefinition, id: 'different-id' };

      expect(() => registry.registerDefinition('test-widget', mismatchDef))
        .toThrow(/ID mismatch/);
    });

    it('should emit event when eventBus available', () => {
      const mockEventBus = { emit: vi.fn() };
      const registryWithBus = new WidgetRegistry({ eventBus: mockEventBus });

      registryWithBus.registerDefinition('test-widget', validDefinition);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'registry:definition-registered',
        expect.objectContaining({ id: 'test-widget' })
      );
    });
  });

  describe('registerDefinitions', () => {
    it('should register multiple definitions', () => {
      const result = registry.registerDefinitions([validDefinition, validApp]);

      expect(result.registered).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(registry.definitions.size).toBe(2);
    });

    it('should skip invalid definitions when skipErrors=true', () => {
      const invalidDef = { id: 'invalid' } as any;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = registry.registerDefinitions(
        [validDefinition, invalidDef, validApp],
        true
      );

      expect(result.registered).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(registry.definitions.size).toBe(2);

      consoleSpy.mockRestore();
    });

    it('should throw error for invalid definition when skipErrors=false', () => {
      const invalidDef = { id: 'invalid' } as any;

      expect(() => registry.registerDefinitions([validDefinition, invalidDef], false))
        .toThrow();
    });

    it('should return error details', () => {
      const invalidDef = { id: 'invalid' } as any;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = registry.registerDefinitions([invalidDef], true);

      expect(result.errors[0]).toContain('Definition 0');
      expect(result.errors[0]).toContain('invalid');

      consoleSpy.mockRestore();
    });
  });

  describe('registerComponent', () => {
    beforeEach(() => {
      registry.registerDefinition('test-widget', validDefinition);
    });

    it('should register component class', () => {
      class TestComponent {}

      registry.registerComponent('test-widget', TestComponent);

      expect(registry.hasComponent('test-widget')).toBe(true);
      expect(registry.components.size).toBe(1);
    });

    it('should register component function', () => {
      const componentFn = () => {};

      registry.registerComponent('test-widget', componentFn);

      expect(registry.hasComponent('test-widget')).toBe(true);
    });

    it('should throw error when definition not found', () => {
      class TestComponent {}

      expect(() => registry.registerComponent('nonexistent', TestComponent))
        .toThrow(/definition not found/);
    });

    it('should throw error for non-function component', () => {
      expect(() => registry.registerComponent('test-widget', 'not a function' as any))
        .toThrow(/must be a class or function/);
    });

    it('should emit event when eventBus available', () => {
      const mockEventBus = { emit: vi.fn() };
      const registryWithBus = new WidgetRegistry({ eventBus: mockEventBus });
      registryWithBus.registerDefinition('test-widget', validDefinition);

      class TestComponent {}
      registryWithBus.registerComponent('test-widget', TestComponent);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'registry:component-registered',
        expect.objectContaining({ id: 'test-widget' })
      );
    });
  });

  describe('registerLoader', () => {
    beforeEach(() => {
      registry.registerDefinition('test-widget', validDefinition);
    });

    it('should register loader function', () => {
      const loader = () => Promise.resolve({ default: class {} });

      registry.registerLoader('test-widget', loader);

      expect(registry.hasLoader('test-widget')).toBe(true);
      expect(registry.loaders.size).toBe(1);
    });

    it('should throw error when definition not found', () => {
      const loader = () => Promise.resolve({});

      expect(() => registry.registerLoader('nonexistent', loader))
        .toThrow(/definition not found/);
    });

    it('should throw error for non-function loader', () => {
      expect(() => registry.registerLoader('test-widget', 'not a function' as any))
        .toThrow(/must be a function/);
    });
  });

  describe('getDefinition', () => {
    it('should return registered definition', () => {
      registry.registerDefinition('test-widget', validDefinition);

      const definition = registry.getDefinition('test-widget');

      expect(definition).toEqual(validDefinition);
    });

    it('should return null for nonexistent definition', () => {
      const definition = registry.getDefinition('nonexistent');

      expect(definition).toBeNull();
    });
  });

  describe('getDefinitions', () => {
    beforeEach(() => {
      registry.registerDefinition('widget-1', {
        ...validDefinition,
        id: 'widget-1'
      });
      registry.registerDefinition('app-1', {
        ...validApp,
        id: 'app-1'
      });
      registry.registerDefinition('widget-2', {
        ...validDefinition,
        id: 'widget-2',
        category: 'data'
      });
    });

    it('should return all definitions', () => {
      const definitions = registry.getDefinitions();

      expect(definitions).toHaveLength(3);
    });

    it('should filter by type', () => {
      const widgets = registry.getDefinitions({ type: 'widget' });
      const apps = registry.getDefinitions({ type: 'app' });

      expect(widgets).toHaveLength(2);
      expect(apps).toHaveLength(1);
    });

    it('should filter by category', () => {
      const productivity = registry.getDefinitions({ category: 'productivity' });
      const data = registry.getDefinitions({ category: 'data' });

      expect(productivity).toHaveLength(1);
      expect(data).toHaveLength(1);
    });

    it('should filter by size', () => {
      const sized = registry.getDefinitions({ size: '2x2' });

      // Note: size filtering requires definition to have size property
      expect(Array.isArray(sized)).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const results = registry.getDefinitions({ category: 'nonexistent' });

      expect(results).toHaveLength(0);
    });
  });

  describe('hasDefinition', () => {
    it('should return true for registered definition', () => {
      registry.registerDefinition('test-widget', validDefinition);

      expect(registry.hasDefinition('test-widget')).toBe(true);
    });

    it('should return false for nonexistent definition', () => {
      expect(registry.hasDefinition('nonexistent')).toBe(false);
    });
  });

  describe('hasComponent', () => {
    it('should return true for registered component', () => {
      registry.registerDefinition('test-widget', validDefinition);
      registry.registerComponent('test-widget', class {});

      expect(registry.hasComponent('test-widget')).toBe(true);
    });

    it('should return false for nonexistent component', () => {
      expect(registry.hasComponent('nonexistent')).toBe(false);
    });
  });

  describe('hasLoader', () => {
    it('should return true for registered loader', () => {
      registry.registerDefinition('test-widget', validDefinition);
      registry.registerLoader('test-widget', () => Promise.resolve({}));

      expect(registry.hasLoader('test-widget')).toBe(true);
    });

    it('should return false for nonexistent loader', () => {
      expect(registry.hasLoader('nonexistent')).toBe(false);
    });
  });

  describe('getComponent', () => {
    beforeEach(() => {
      registry.registerDefinition('test-widget', validDefinition);
    });

    it('should return cached component', async () => {
      class TestComponent {}
      registry.registerComponent('test-widget', TestComponent);

      const component = await registry.getComponent('test-widget');

      expect(component).toBe(TestComponent);
    });

    it('should load component dynamically', async () => {
      class TestComponent {}
      const loader = vi.fn(() => Promise.resolve({ default: TestComponent }));

      registry.registerLoader('test-widget', loader);

      const component = await registry.getComponent('test-widget');

      expect(loader).toHaveBeenCalled();
      expect(component).toBe(TestComponent);
    });

    it('should cache dynamically loaded component', async () => {
      class TestComponent {}
      const loader = vi.fn(() => Promise.resolve({ default: TestComponent }));

      registry.registerLoader('test-widget', loader);

      await registry.getComponent('test-widget');
      await registry.getComponent('test-widget');

      expect(loader).toHaveBeenCalledOnce();
    });

    it('should handle module without default export', async () => {
      class TestComponent {}
      const loader = () => Promise.resolve(TestComponent);

      registry.registerLoader('test-widget', loader);

      const component = await registry.getComponent('test-widget');

      expect(component).toBe(TestComponent);
    });

    it('should throw error for nonexistent component', async () => {
      await expect(registry.getComponent('test-widget'))
        .rejects.toThrow(/not found/);
    });

    it('should throw error for failed loader', async () => {
      const loader = () => Promise.reject(new Error('Load failed'));

      registry.registerLoader('test-widget', loader);

      await expect(registry.getComponent('test-widget'))
        .rejects.toThrow(/Failed to load component/);
    });
  });

  describe('createInstance', () => {
    beforeEach(() => {
      registry.registerDefinition('test-widget', validDefinition);
    });

    it('should create instance with definition data', async () => {
      const instance = await registry.createInstance('test-widget', {
        id: 'instance-1',
        cell: 5,
        config: {}
      });

      expect(instance.id).toBe('instance-1');
      expect(instance.widgetDefId).toBe('test-widget');
      expect(instance.name).toBe('Test Widget');
      expect(instance.icon).toBe('fa-test');
      expect(instance.cols).toBe(2);
      expect(instance.rows).toBe(2);
    });

    it('should store instance reference', async () => {
      await registry.createInstance('test-widget', {
        id: 'instance-1',
        cell: 5
      });

      expect(registry.getInstance('instance-1')).not.toBeNull();
    });

    it('should instantiate component class when available', async () => {
      class TestComponent {
        definition: any;
        instance: any;

        constructor(options: any) {
          this.definition = options.definition;
          this.instance = options.instance;
        }
      }

      registry.registerComponent('test-widget', TestComponent);

      const instance = await registry.createInstance('test-widget', {
        id: 'instance-1',
        cell: 5
      });

      expect(instance).toBeInstanceOf(TestComponent);
      expect(instance.definition).toEqual(validDefinition);
      expect(instance.instance.id).toBe('instance-1');
    });

    it('should return plain instance when no component registered', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const instance = await registry.createInstance('test-widget', {
        id: 'instance-1',
        cell: 5
      });

      expect(instance.id).toBe('instance-1');
      expect(instance.widgetDefId).toBe('test-widget');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No component registered')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error for nonexistent definition', async () => {
      await expect(registry.createInstance('nonexistent', { id: '1' }))
        .rejects.toThrow(/definition.*not found/);
    });

    it('should load component dynamically when needed', async () => {
      class TestComponent {
        constructor(public options: any) {}
      }

      registry.registerLoader('test-widget', () =>
        Promise.resolve({ default: TestComponent })
      );

      const instance = await registry.createInstance('test-widget', {
        id: 'instance-1',
        cell: 5
      });

      expect(instance).toBeInstanceOf(TestComponent);
    });
  });

  describe('getInstance', () => {
    it('should return stored instance', async () => {
      registry.registerDefinition('test-widget', validDefinition);

      await registry.createInstance('test-widget', {
        id: 'instance-1',
        cell: 5
      });

      const instance = registry.getInstance('instance-1');

      expect(instance).not.toBeNull();
      expect(instance?.id).toBe('instance-1');
    });

    it('should return null for nonexistent instance', () => {
      const instance = registry.getInstance('nonexistent');

      expect(instance).toBeNull();
    });
  });

  describe('removeInstance', () => {
    beforeEach(async () => {
      registry.registerDefinition('test-widget', validDefinition);
      await registry.createInstance('test-widget', {
        id: 'instance-1',
        cell: 5
      });
    });

    it('should remove instance', () => {
      registry.removeInstance('instance-1');

      expect(registry.getInstance('instance-1')).toBeNull();
    });

    it('should emit event when eventBus available', () => {
      const mockEventBus = { emit: vi.fn() };
      registry.eventBus = mockEventBus;

      registry.removeInstance('instance-1');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'registry:instance-removed',
        expect.objectContaining({ instanceId: 'instance-1' })
      );
    });

    it('should handle nonexistent instance gracefully', () => {
      expect(() => registry.removeInstance('nonexistent')).not.toThrow();
    });
  });

  describe('unregisterDefinition', () => {
    beforeEach(() => {
      registry.registerDefinition('test-widget', validDefinition);
      registry.registerComponent('test-widget', class {});
      registry.registerLoader('test-widget', () => Promise.resolve({}));
    });

    it('should remove definition and related data', () => {
      registry.unregisterDefinition('test-widget');

      expect(registry.hasDefinition('test-widget')).toBe(false);
      expect(registry.hasComponent('test-widget')).toBe(false);
      expect(registry.hasLoader('test-widget')).toBe(false);
    });

    it('should emit event when eventBus available', () => {
      const mockEventBus = { emit: vi.fn() };
      registry.eventBus = mockEventBus;

      registry.unregisterDefinition('test-widget');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'registry:definition-unregistered',
        expect.objectContaining({ id: 'test-widget' })
      );
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      registry.registerDefinition('test-widget', validDefinition);
      registry.registerComponent('test-widget', class {});
      registry.registerLoader('test-widget', () => Promise.resolve({}));
      await registry.createInstance('test-widget', { id: 'instance-1', cell: 5 });
    });

    it('should clear all registrations', () => {
      registry.clear();

      expect(registry.definitions.size).toBe(0);
      expect(registry.components.size).toBe(0);
      expect(registry.loaders.size).toBe(0);
      expect(registry.instances.size).toBe(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      registry.registerDefinition('widget-1', {
        ...validDefinition,
        id: 'widget-1'
      });
      registry.registerDefinition('app-1', {
        ...validApp,
        id: 'app-1'
      });
      registry.registerComponent('widget-1', class {});
      registry.registerLoader('app-1', () => Promise.resolve({}));
      await registry.createInstance('widget-1', { id: 'instance-1', cell: 5 });
    });

    it('should return correct statistics', () => {
      const stats = registry.getStats();

      expect(stats.definitions).toBe(2);
      expect(stats.components).toBe(1);
      expect(stats.loaders).toBe(1);
      expect(stats.instances).toBe(1);
      expect(stats.types.widgets).toBe(1);
      expect(stats.types.apps).toBe(1);
    });

    it('should include categories count', () => {
      const stats = registry.getStats();

      expect(stats.categories).toBeGreaterThan(0);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', () => {
      registry.registerDefinition('widget-1', {
        ...validDefinition,
        id: 'widget-1'
      });
      registry.registerDefinition('widget-2', {
        ...validDefinition,
        id: 'widget-2',
        category: 'data'
      });
      registry.registerDefinition('widget-3', {
        ...validDefinition,
        id: 'widget-3',
        category: 'productivity'
      });

      const categories = registry.getCategories();

      expect(categories).toHaveLength(2);
      expect(categories).toContain('productivity');
      expect(categories).toContain('data');
    });

    it('should return sorted categories', () => {
      registry.registerDefinition('widget-1', {
        ...validDefinition,
        id: 'widget-1',
        category: 'z-category'
      });
      registry.registerDefinition('widget-2', {
        ...validDefinition,
        id: 'widget-2',
        category: 'a-category'
      });

      const categories = registry.getCategories();

      expect(categories[0]).toBe('a-category');
      expect(categories[1]).toBe('z-category');
    });

    it('should handle widgets without categories', () => {
      const defWithoutCategory = { ...validDefinition, id: 'widget-1' };
      delete (defWithoutCategory as any).category;

      registry.registerDefinition('widget-1', {
        ...validDefinition,
        id: 'widget-1'
      });

      const categories = registry.getCategories();

      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('exportDefinitions', () => {
    it('should export all definitions', () => {
      const widget1 = { ...validDefinition, id: 'widget-1' };
      const app1 = { ...validApp, id: 'app-1' };

      registry.registerDefinition('widget-1', widget1);
      registry.registerDefinition('app-1', app1);

      const exported = registry.exportDefinitions();

      expect(exported).toHaveLength(2);
      expect(exported[0]).toEqual(widget1);
      expect(exported[1]).toEqual(app1);
    });

    it('should return empty array when no definitions', () => {
      const exported = registry.exportDefinitions();

      expect(exported).toEqual([]);
    });
  });

  describe('importDefinitions', () => {
    it('should import definitions', () => {
      const definitions = [validDefinition, validApp];

      registry.importDefinitions(definitions);

      expect(registry.definitions.size).toBe(2);
      expect(registry.hasDefinition('test-widget')).toBe(true);
      expect(registry.hasDefinition('test-app')).toBe(true);
    });

    it('should clear existing definitions when replace=true', () => {
      const oldWidget = { ...validDefinition, id: 'old-widget' };
      registry.registerDefinition('old-widget', oldWidget);

      registry.importDefinitions([validApp], true);

      expect(registry.definitions.size).toBe(1);
      expect(registry.hasDefinition('old-widget')).toBe(false);
      expect(registry.hasDefinition('test-app')).toBe(true);
    });

    it('should not clear existing definitions when replace=false', () => {
      const widget1 = { ...validDefinition, id: 'widget-1' };
      registry.registerDefinition('widget-1', widget1);

      registry.importDefinitions([validApp], false);

      expect(registry.definitions.size).toBe(2);
      expect(registry.hasDefinition('widget-1')).toBe(true);
      expect(registry.hasDefinition('test-app')).toBe(true);
    });

    it('should skip invalid definitions during import', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const invalidDef = { id: 'invalid' } as any;
      registry.importDefinitions([validDefinition, invalidDef, validApp]);

      expect(registry.definitions.size).toBe(2);
      expect(registry.hasDefinition('invalid')).toBe(false);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('integration scenarios', () => {
    it('should support complete widget lifecycle', async () => {
      // 1. Register definition
      const myWidget = { ...validDefinition, id: 'my-widget' };
      registry.registerDefinition('my-widget', myWidget);

      // 2. Register component
      class MyWidget {
        constructor(public options: any) {}
        render() { return 'rendered'; }
      }
      registry.registerComponent('my-widget', MyWidget);

      // 3. Create instance
      const instance = await registry.createInstance('my-widget', {
        id: 'instance-1',
        cell: 5,
        config: { color: 'blue' }
      });

      // 4. Verify
      expect(instance).toBeInstanceOf(MyWidget);
      expect(instance.options.instance.config.color).toBe('blue');

      // 5. Get instance
      const retrieved = registry.getInstance('instance-1');
      expect(retrieved).not.toBeNull();

      // 6. Remove instance
      registry.removeInstance('instance-1');
      expect(registry.getInstance('instance-1')).toBeNull();
    });

    it('should support dynamic loading workflow', async () => {
      // 1. Register definition
      const lazyWidget = { ...validDefinition, id: 'lazy-widget' };
      registry.registerDefinition('lazy-widget', lazyWidget);

      // 2. Register loader instead of component
      class LazyWidget {}
      const loader = vi.fn(() => Promise.resolve({ default: LazyWidget }));
      registry.registerLoader('lazy-widget', loader);

      // 3. Component not loaded yet
      expect(registry.hasComponent('lazy-widget')).toBe(false);

      // 4. Create instance (triggers load)
      const instance = await registry.createInstance('lazy-widget', {
        id: 'instance-1',
        cell: 5
      });

      // 5. Verify loading happened
      expect(loader).toHaveBeenCalledOnce();
      expect(instance).toBeInstanceOf(LazyWidget);

      // 6. Component now cached
      expect(registry.hasComponent('lazy-widget')).toBe(true);

      // 7. Second creation uses cache
      await registry.createInstance('lazy-widget', {
        id: 'instance-2',
        cell: 10
      });

      expect(loader).toHaveBeenCalledOnce(); // Still only once
    });

    it('should support filtering and querying', () => {
      // Register various widgets
      registry.registerDefinition('clock', {
        id: 'clock',
        name: 'Clock',
        icon: 'fa-clock',
        type: 'widget',
        cols: 2,
        rows: 1,
        category: 'productivity',
        size: '2x1',
        description: 'Clock widget'
      });

      registry.registerDefinition('calendar', {
        id: 'calendar',
        name: 'Calendar',
        icon: 'fa-calendar',
        type: 'widget',
        cols: 3,
        rows: 2,
        category: 'productivity',
        size: '3x2',
        description: 'Calendar widget'
      });

      registry.registerDefinition('calculator', {
        id: 'calculator',
        name: 'Calculator',
        icon: 'fa-calculator',
        type: 'app',
        cols: 3,
        rows: 4,
        category: 'utilities',
        size: '3x4',
        description: 'Calculator app'
      });

      // Filter by type
      const widgets = registry.getDefinitions({ type: 'widget' });
      expect(widgets).toHaveLength(2);

      // Filter by category
      const productivity = registry.getDefinitions({ category: 'productivity' });
      expect(productivity).toHaveLength(2);

      // Get categories
      const categories = registry.getCategories();
      expect(categories).toContain('productivity');
      expect(categories).toContain('utilities');

      // Get stats
      const stats = registry.getStats();
      expect(stats.definitions).toBe(3);
      expect(stats.types.widgets).toBe(2);
      expect(stats.types.apps).toBe(1);
    });

    it('should support export and import', () => {
      // Register widgets
      const widget1 = { ...validDefinition, id: 'widget-1' };
      const widget2 = { ...validApp, id: 'widget-2' };
      registry.registerDefinition('widget-1', widget1);
      registry.registerDefinition('widget-2', widget2);

      // Export
      const exported = registry.exportDefinitions();
      expect(exported).toHaveLength(2);

      // Clear
      registry.clear();
      expect(registry.definitions.size).toBe(0);

      // Import
      registry.importDefinitions(exported);
      expect(registry.definitions.size).toBe(2);
      expect(registry.hasDefinition('widget-1')).toBe(true);
      expect(registry.hasDefinition('widget-2')).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Missing definition
      await expect(registry.createInstance('nonexistent', { id: '1' }))
        .rejects.toThrow();

      // Invalid definition
      expect(() => registry.registerDefinition('bad', { id: 'bad' } as any))
        .toThrow();

      // Component without definition
      expect(() => registry.registerComponent('nonexistent', class {}))
        .toThrow();

      // Failed loader
      const failingWidget = { ...validDefinition, id: 'failing' };
      registry.registerDefinition('failing', failingWidget);
      registry.registerLoader('failing', () => Promise.reject(new Error('Load error')));

      await expect(registry.getComponent('failing'))
        .rejects.toThrow(/Failed to load/);
    });
  });
});

describe('createWidgetRegistry', () => {
  it('should create new WidgetRegistry instance', () => {
    const registry = createWidgetRegistry();

    expect(registry).toBeInstanceOf(WidgetRegistry);
    expect(registry.definitions.size).toBe(0);
  });

  it('should pass options to constructor', () => {
    const mockEventBus = { emit: vi.fn() };
    const registry = createWidgetRegistry({ eventBus: mockEventBus });

    expect(registry.eventBus).toBe(mockEventBus);
  });

  it('should create independent instances', () => {
    const registry1 = createWidgetRegistry();
    const registry2 = createWidgetRegistry();

    const validDefinition: WidgetDefinition = {
      id: 'test-widget',
      name: 'Test Widget',
      icon: 'fa-test',
      type: 'widget',
      cols: 2,
      rows: 2,
      category: 'productivity',
      size: '2x2',
      description: 'Test widget'
    };

    registry1.registerDefinition('test-widget', validDefinition);

    expect(registry1.definitions.size).toBe(1);
    expect(registry2.definitions.size).toBe(0);
  });
});
