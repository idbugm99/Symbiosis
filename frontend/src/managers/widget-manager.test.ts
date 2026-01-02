/**
 * WidgetManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WidgetManager } from './widget-manager.js';
import { EventBus } from './event-bus.js';
import { StorageManager } from './storage-manager.js';

// Mock dependencies
vi.mock('../data/runtime/temp-data-file.js', () => ({
  default: {
    widgetDefinitions: [
      {
        id: 'test-widget-1x1',
        name: 'Test Small',
        type: 'widget',
        cols: 1,
        rows: 1
      },
      {
        id: 'test-widget-2x2',
        name: 'Test Large',
        type: 'widget',
        cols: 2,
        rows: 2
      }
    ],
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    workspaces: [
      { id: 'workspace-1', userId: 'user-1', name: 'Test Workspace' }
    ],
    widgetInstances: [],
    currentWorkspaceId: 'workspace-1',
    version: '1.0.0',
    lastSaved: '2025-01-01T00:00:00.000Z'
  }
}));

describe('WidgetManager', () => {
  let widgetManager;
  let storage;
  let eventBus;

  beforeEach(() => {
    localStorage.clear();
    storage = new StorageManager();
    eventBus = new EventBus();
    widgetManager = new WidgetManager({
      storage,
      eventBus,
      currentWorkspaceId: 'workspace-1'
    });
  });

  describe('constructor', () => {
    it('should initialize with empty widgets array', () => {
      expect(widgetManager.widgets).toEqual([]);
    });

    it('should store references to dependencies', () => {
      expect(widgetManager.storage).toBe(storage);
      expect(widgetManager.eventBus).toBe(eventBus);
      expect(widgetManager.currentWorkspaceId).toBe('workspace-1');
    });
  });

  describe('loadWidgets', () => {
    it('should load widgets from storage for current workspace', () => {
      // Add test data to storage
      storage.saveWidgetInstances([
        {
          id: 'instance-1',
          userId: 'user-1',
          workspaceId: 'workspace-1',
          widgetDefId: 'test-widget-1x1',
          cell: 1,
          occupiedCells: [1],
          config: {},
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      ]);

      widgetManager.loadWidgets();

      expect(widgetManager.widgets).toHaveLength(1);
      expect(widgetManager.widgets[0].id).toBe('instance-1');
      expect(widgetManager.widgets[0].name).toBe('Test Small'); // Enriched
    });

    it('should emit widgets:loaded event', () => {
      const handler = vi.fn();
      eventBus.on('widgets:loaded', handler);

      widgetManager.loadWidgets();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ widgets: [] });
    });
  });

  describe('addWidget', () => {
    it('should add new widget instance', () => {
      const widgetDef = {
        id: 'test-widget-1x1',
        name: 'Test Small',
        type: 'widget',
        cols: 1,
        rows: 1
      };

      const result = widgetManager.addWidget(widgetDef, 5);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.widgetDefId).toBe('test-widget-1x1');
      expect(result.cell).toBe(5);
      expect(widgetManager.widgets).toHaveLength(1);
    });

    it('should generate unique instance ID', () => {
      const widgetDef = {
        id: 'test-widget-1x1',
        name: 'Test Small',
        cols: 1,
        rows: 1
      };

      const widget1 = widgetManager.addWidget(widgetDef, 1);
      const widget2 = widgetManager.addWidget(widgetDef, 2);

      expect(widget1.id).not.toBe(widget2.id);
    });

    it('should calculate occupied cells correctly', () => {
      const widgetDef = {
        id: 'test-widget-2x2',
        cols: 2,
        rows: 2
      };

      const widget = widgetManager.addWidget(widgetDef, 1);

      // Cell 1, cols=2, rows=2 → cells: 1, 2, 7, 8
      expect(widget.occupiedCells).toEqual([1, 2, 7, 8]);
    });

    it('should emit widget:added and widgets:changed events', () => {
      const addedHandler = vi.fn();
      const changedHandler = vi.fn();

      eventBus.on('widget:added', addedHandler);
      eventBus.on('widgets:changed', changedHandler);

      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      const widget = widgetManager.addWidget(widgetDef, 1);

      expect(addedHandler).toHaveBeenCalledWith(widget);
      expect(changedHandler).toHaveBeenCalledWith({ widgets: [widget] });
    });

    it('should persist to storage', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      widgetManager.addWidget(widgetDef, 1);

      const instances = storage.getWidgetInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].widgetDefId).toBe('test-widget-1x1');
    });
  });

  describe('removeWidget', () => {
    it('should remove widget by ID', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      const widget = widgetManager.addWidget(widgetDef, 1);

      widgetManager.removeWidget(widget.id);

      expect(widgetManager.widgets).toHaveLength(0);
    });

    it('should emit widget:removed and widgets:changed events', () => {
      const removedHandler = vi.fn();
      const changedHandler = vi.fn();

      eventBus.on('widget:removed', removedHandler);
      eventBus.on('widgets:changed', changedHandler);

      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      const widget = widgetManager.addWidget(widgetDef, 1);

      vi.clearAllMocks();
      widgetManager.removeWidget(widget.id);

      expect(removedHandler).toHaveBeenCalledWith({ widgetId: widget.id });
      expect(changedHandler).toHaveBeenCalledOnce();
    });

    it('should persist removal to storage', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      const widget = widgetManager.addWidget(widgetDef, 1);

      widgetManager.removeWidget(widget.id);

      const instances = storage.getWidgetInstances();
      expect(instances).toHaveLength(0);
    });
  });

  describe('updateWidget', () => {
    it('should update widget configuration', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      const widget = widgetManager.addWidget(widgetDef, 1);

      const updates = { config: { color: 'blue' } };
      widgetManager.updateWidget(widget.id, updates);

      const updated = widgetManager.getWidget(widget.id);
      expect(updated.config.color).toBe('blue');
    });

    it('should emit widget:updated and widgets:changed events', () => {
      const updatedHandler = vi.fn();
      const changedHandler = vi.fn();

      eventBus.on('widget:updated', updatedHandler);
      eventBus.on('widgets:changed', changedHandler);

      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      const widget = widgetManager.addWidget(widgetDef, 1);

      vi.clearAllMocks();
      const updates = { config: { test: true } };
      widgetManager.updateWidget(widget.id, updates);

      expect(updatedHandler).toHaveBeenCalled();
      expect(changedHandler).toHaveBeenCalled();
    });

    it('should persist update to storage', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      const widget = widgetManager.addWidget(widgetDef, 1);

      widgetManager.updateWidget(widget.id, { config: { setting: 'value' } });

      const instances = storage.getWidgetInstances();
      expect(instances[0].config.setting).toBe('value');
    });
  });

  describe('getWidget', () => {
    it('should return widget by ID', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      const widget = widgetManager.addWidget(widgetDef, 1);

      const found = widgetManager.getWidget(widget.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(widget.id);
    });

    it('should return null when widget not found', () => {
      const found = widgetManager.getWidget('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('getWidgets', () => {
    it('should return all widgets', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      widgetManager.addWidget(widgetDef, 1);
      widgetManager.addWidget(widgetDef, 2);

      const widgets = widgetManager.getWidgets();
      expect(widgets).toHaveLength(2);
    });
  });

  describe('isCellOccupied', () => {
    it('should return false for empty cell', () => {
      expect(widgetManager.isCellOccupied(1)).toBe(false);
    });

    it('should return true for occupied cell', () => {
      const widgetDef = { id: 'test-widget-2x2', cols: 2, rows: 2 };
      widgetManager.addWidget(widgetDef, 1); // Occupies cells 1, 2, 7, 8

      expect(widgetManager.isCellOccupied(1)).toBe(true);
      expect(widgetManager.isCellOccupied(2)).toBe(true);
      expect(widgetManager.isCellOccupied(7)).toBe(true);
      expect(widgetManager.isCellOccupied(8)).toBe(true);
      expect(widgetManager.isCellOccupied(3)).toBe(false);
    });
  });

  describe('canPlaceWidget', () => {
    it('should return true when placement is valid', () => {
      expect(widgetManager.canPlaceWidget(1, 1, 1)).toBe(true);
    });

    it('should return false when cells are occupied', () => {
      const widgetDef = { id: 'test-widget-2x2', cols: 2, rows: 2 };
      widgetManager.addWidget(widgetDef, 1); // Occupies cells 1, 2, 7, 8

      expect(widgetManager.canPlaceWidget(1, 1, 1)).toBe(false);
      expect(widgetManager.canPlaceWidget(2, 1, 1)).toBe(false);
    });
  });

  describe('findAvailableCell', () => {
    it('should find first available cell for 1x1 widget', () => {
      const cell = widgetManager.findAvailableCell(1, 1);
      expect(cell).toBe(1);
    });

    it('should skip occupied cells', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      widgetManager.addWidget(widgetDef, 1);
      widgetManager.addWidget(widgetDef, 2);

      const cell = widgetManager.findAvailableCell(1, 1);
      expect(cell).toBe(3);
    });

    it('should return null when no space available', () => {
      // Fill entire grid
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      for (let i = 1; i <= 30; i++) {
        widgetManager.addWidget(widgetDef, i);
      }

      const cell = widgetManager.findAvailableCell(1, 1);
      expect(cell).toBeNull();
    });
  });

  describe('calculateOccupiedCells', () => {
    it('should calculate cells for 1x1 widget', () => {
      const cells = widgetManager.calculateOccupiedCells(1, 1, 1);
      expect(cells).toEqual([1]);
    });

    it('should calculate cells for 2x2 widget', () => {
      const cells = widgetManager.calculateOccupiedCells(1, 2, 2);
      // Cell 1: [1, 2, 7, 8]
      expect(cells).toEqual([1, 2, 7, 8]);
    });

    it('should calculate cells for 3x2 widget', () => {
      const cells = widgetManager.calculateOccupiedCells(1, 3, 2);
      // Cell 1: [1, 2, 3, 7, 8, 9]
      expect(cells).toEqual([1, 2, 3, 7, 8, 9]);
    });
  });

  describe('clearWorkspace', () => {
    it('should remove all widgets', () => {
      const widgetDef = { id: 'test-widget-1x1', cols: 1, rows: 1 };
      widgetManager.addWidget(widgetDef, 1);
      widgetManager.addWidget(widgetDef, 2);

      widgetManager.clearWorkspace();

      expect(widgetManager.widgets).toEqual([]);
    });

    it('should emit grid:cleared event', () => {
      const handler = vi.fn();
      eventBus.on('grid:cleared', handler);

      widgetManager.clearWorkspace();

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('switchWorkspace', () => {
    it('should load widgets for new workspace', () => {
      // Add widgets to workspace-1
      storage.saveWidgetInstances([
        {
          id: 'instance-1',
          userId: 'user-1',
          workspaceId: 'workspace-1',
          widgetDefId: 'test-widget-1x1',
          cell: 1,
          occupiedCells: [1],
          config: {}
        }
      ]);

      widgetManager.loadWidgets();
      expect(widgetManager.widgets).toHaveLength(1);

      // Switch to workspace-2 (empty)
      widgetManager.switchWorkspace('workspace-2');
      expect(widgetManager.currentWorkspaceId).toBe('workspace-2');
      expect(widgetManager.widgets).toEqual([]);
    });
  });
});
