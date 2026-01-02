/**
 * StorageManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from './storage-manager.js';

// Mock the temp-data-file import
vi.mock('../data/runtime/temp-data-file.js', () => ({
  default: {
    widgetDefinitions: [
      { id: 'test-widget', name: 'Test Widget', type: 'widget' },
      { id: 'test-app', name: 'Test App', type: 'app' }
    ],
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com'
    },
    workspaces: [
      {
        id: 'workspace-1',
        userId: 'user-1',
        name: 'Test Workspace',
        createdAt: '2025-01-01T00:00:00.000Z'
      }
    ],
    widgetInstances: [
      {
        id: 'instance-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        widgetDefId: 'test-widget',
        cell: 1,
        occupiedCells: [1, 2],
        config: {},
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      }
    ],
    currentWorkspaceId: 'workspace-1',
    version: '1.0.0',
    lastSaved: '2025-01-01T00:00:00.000Z'
  }
}));

describe('StorageManager', () => {
  let storage;

  beforeEach(() => {
    localStorage.clear();
    storage = new StorageManager();
  });

  describe('constructor', () => {
    it('should initialize with temp data file when localStorage is empty', () => {
      const data = storage.getData();
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-1');
      expect(data.workspaces).toHaveLength(1);
      expect(data.widgetInstances).toHaveLength(1);
    });

    it('should load from localStorage when data exists', () => {
      const customData = {
        user: { id: 'user-2', name: 'Custom User' },
        workspaces: [],
        widgetInstances: [],
        currentWorkspaceId: null
      };
      localStorage.setItem('symbiosis-data', JSON.stringify(customData));

      const newStorage = new StorageManager();
      const data = newStorage.getData();
      expect(data.user.id).toBe('user-2');
      expect(data.user.name).toBe('Custom User');
    });
  });

  describe('getUser', () => {
    it('should return user object', () => {
      const user = storage.getUser();
      expect(user).toBeDefined();
      expect(user.id).toBe('user-1');
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('loadWorkspaces', () => {
    it('should return array of workspaces', () => {
      const workspaces = storage.loadWorkspaces();
      expect(workspaces).toBeInstanceOf(Array);
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].id).toBe('workspace-1');
    });

    it('should return null when no workspaces exist', () => {
      storage.data.workspaces = [];
      const workspaces = storage.loadWorkspaces();
      expect(workspaces).toBeNull();
    });
  });

  describe('saveWorkspaces', () => {
    it('should save workspaces and persist to localStorage', () => {
      const newWorkspaces = [
        { id: 'workspace-2', name: 'New Workspace', userId: 'user-1' }
      ];

      storage.saveWorkspaces(newWorkspaces);

      expect(storage.data.workspaces).toEqual(newWorkspaces);
      expect(storage.data.lastSaved).toBeDefined();
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('loadCurrentWorkspaceId', () => {
    it('should return current workspace ID', () => {
      const id = storage.loadCurrentWorkspaceId();
      expect(id).toBe('workspace-1');
    });
  });

  describe('saveCurrentWorkspaceId', () => {
    it('should save current workspace ID and persist', () => {
      storage.saveCurrentWorkspaceId('workspace-2');
      expect(storage.data.currentWorkspaceId).toBe('workspace-2');
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getWidgetDefinitions', () => {
    it('should return array of widget definitions', () => {
      const definitions = storage.getWidgetDefinitions();
      expect(definitions).toBeInstanceOf(Array);
      expect(definitions).toHaveLength(2);
      expect(definitions[0].id).toBe('test-widget');
    });
  });

  describe('getWidgetDefinition', () => {
    it('should return widget definition by ID', () => {
      const def = storage.getWidgetDefinition('test-widget');
      expect(def).toBeDefined();
      expect(def.id).toBe('test-widget');
      expect(def.name).toBe('Test Widget');
    });

    it('should return null when definition not found', () => {
      const def = storage.getWidgetDefinition('nonexistent');
      expect(def).toBeNull();
    });
  });

  describe('getWidgetInstances', () => {
    it('should return all widget instances', () => {
      const instances = storage.getWidgetInstances();
      expect(instances).toBeInstanceOf(Array);
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe('instance-1');
    });
  });

  describe('saveWidgetInstances', () => {
    it('should save widget instances and persist', () => {
      const newInstances = [
        {
          id: 'instance-2',
          userId: 'user-1',
          workspaceId: 'workspace-1',
          widgetDefId: 'test-app',
          cell: 3,
          occupiedCells: [3],
          config: {}
        }
      ];

      storage.saveWidgetInstances(newInstances);

      expect(storage.data.widgetInstances).toEqual(newInstances);
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getWidgetInstancesForWorkspace', () => {
    it('should return enriched instances for workspace by default', () => {
      const instances = storage.getWidgetInstancesForWorkspace('workspace-1');
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe('instance-1');
      expect(instances[0].name).toBe('Test Widget'); // Enriched with definition
      expect(instances[0].widgetDefId).toBe('test-widget');
    });

    it('should return bare instances when enriched=false', () => {
      const instances = storage.getWidgetInstancesForWorkspace('workspace-1', false);
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe('instance-1');
      expect(instances[0].name).toBeUndefined(); // Not enriched
    });

    it('should return empty array for workspace with no instances', () => {
      const instances = storage.getWidgetInstancesForWorkspace('workspace-999');
      expect(instances).toEqual([]);
    });
  });

  describe('enrichWidgetInstance', () => {
    it('should merge instance with definition', () => {
      const bareInstance = {
        id: 'instance-1',
        widgetDefId: 'test-widget',
        cell: 1,
        config: {}
      };

      const enriched = storage.enrichWidgetInstance(bareInstance);

      expect(enriched.id).toBe('instance-1');
      expect(enriched.widgetDefId).toBe('test-widget');
      expect(enriched.name).toBe('Test Widget'); // From definition
      expect(enriched.cell).toBe(1); // From instance
    });

    it('should return instance unchanged when definition not found', () => {
      const bareInstance = {
        id: 'instance-1',
        widgetDefId: 'nonexistent',
        cell: 1
      };

      const enriched = storage.enrichWidgetInstance(bareInstance);
      expect(enriched).toEqual(bareInstance);
    });
  });

  describe('stripDefinitionData', () => {
    it('should remove definition fields from enriched widget', () => {
      const enriched = {
        id: 'instance-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        widgetDefId: 'test-widget',
        name: 'Test Widget', // From definition - should be stripped
        type: 'widget', // From definition - should be stripped
        cell: 1,
        occupiedCells: [1, 2],
        config: {},
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      };

      const bare = storage.stripDefinitionData(enriched);

      expect(bare.id).toBe('instance-1');
      expect(bare.widgetDefId).toBe('test-widget');
      expect(bare.cell).toBe(1);
      expect(bare.name).toBeUndefined();
      expect(bare.type).toBeUndefined();
    });
  });

  describe('clearAll', () => {
    it('should clear workspaces and instances but keep user', () => {
      storage.clearAll();

      expect(storage.data.workspaces).toEqual([]);
      expect(storage.data.widgetInstances).toEqual([]);
      expect(storage.data.currentWorkspaceId).toBeNull();
      expect(storage.data.user).toBeDefined(); // User remains
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('resetToInitial', () => {
    it('should reset to temp-data-file state', () => {
      // Modify data
      storage.data.workspaces = [];
      storage.data.currentWorkspaceId = null;

      // Reset
      storage.resetToInitial();

      // Should be back to initial state
      expect(storage.data.workspaces).toHaveLength(1);
      expect(storage.data.currentWorkspaceId).toBe('workspace-1');
      expect(localStorage.removeItem).toHaveBeenCalledWith('symbiosis-data');
    });
  });
});
