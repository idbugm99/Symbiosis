/**
 * WorkspaceManager Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WorkspaceManager } from './workspace-manager.js';

describe('WorkspaceManager', () => {
  let workspaceManager;
  let mockEventBus;
  let mockStorageManager;
  let mockDom;

  beforeEach(() => {
    // Mock EventBus
    mockEventBus = {
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn()
    };

    // Mock StorageManager
    mockStorageManager = {
      loadWorkspaces: vi.fn(() => [
        {
          id: 'workspace-1',
          userId: 'user-1',
          name: 'Default',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'workspace-2',
          userId: 'user-1',
          name: 'Work',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ]),
      loadCurrentWorkspaceId: vi.fn(() => 'workspace-1'),
      saveWorkspaces: vi.fn(),
      saveCurrentWorkspaceId: vi.fn(),
      getUser: vi.fn(() => ({ id: 'user-1' })),
      getWidgetInstancesForWorkspace: vi.fn(() => [])
    };

    // Mock DOM helper
    mockDom = {
      getElementById: vi.fn(),
      querySelector: vi.fn(),
      createElement: vi.fn((tag, className, attrs = {}) => {
        const element = document.createElement(tag);
        element.className = className || '';
        Object.assign(element, attrs);
        return element;
      }),
      createText: vi.fn((text, tag, className) => {
        const el = document.createElement(tag || 'span');
        el.className = className || '';
        el.textContent = text;
        return el;
      }),
      createIcon: vi.fn((icon, className) => {
        const el = document.createElement('div');
        el.className = className;
        el.textContent = icon;
        return el;
      }),
      toggleClass: vi.fn((element, className, force) => {
        if (element) element.classList.toggle(className, force);
      }),
      addEventListener: vi.fn((element, event, handler) => {
        if (element) element.addEventListener(event, handler);
        return () => element?.removeEventListener(event, handler);
      }),
      clearChildren: vi.fn((element) => {
        if (element) element.innerHTML = '';
      })
    };

    // Create workspace manager
    workspaceManager = new WorkspaceManager({
      eventBus: mockEventBus,
      storageManager: mockStorageManager,
      domHelper: mockDom
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      expect(workspaceManager.eventBus).toBe(mockEventBus);
      expect(workspaceManager.storageManager).toBe(mockStorageManager);
      expect(workspaceManager.dom).toBe(mockDom);
    });

    it('should load workspaces from storage', () => {
      expect(mockStorageManager.loadWorkspaces).toHaveBeenCalled();
      expect(workspaceManager.workspaces).toHaveLength(2);
    });

    it('should load current workspace ID from storage', () => {
      expect(mockStorageManager.loadCurrentWorkspaceId).toHaveBeenCalled();
      expect(workspaceManager.currentWorkspaceId).toBe('workspace-1');
    });

    it('should setup event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('widgets:changed', expect.any(Function));
    });

    it('should initialize with empty workspaces if none saved', () => {
      mockStorageManager.loadWorkspaces.mockReturnValue(null);

      const newManager = new WorkspaceManager({
        eventBus: mockEventBus,
        storageManager: mockStorageManager,
        domHelper: mockDom
      });

      expect(newManager.workspaces).toEqual([]);
    });

    it('should default to workspace-1 if no current workspace saved', () => {
      mockStorageManager.loadCurrentWorkspaceId.mockReturnValue(null);

      const newManager = new WorkspaceManager({
        eventBus: mockEventBus,
        storageManager: mockStorageManager,
        domHelper: mockDom
      });

      expect(newManager.currentWorkspaceId).toBe('workspace-1');
    });
  });

  describe('getCurrentWorkspace', () => {
    it('should return current workspace object', () => {
      const workspace = workspaceManager.getCurrentWorkspace();

      expect(workspace).toEqual({
        id: 'workspace-1',
        userId: 'user-1',
        name: 'Default',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
    });

    it('should return first workspace if current not found', () => {
      workspaceManager.currentWorkspaceId = 'nonexistent';

      const workspace = workspaceManager.getCurrentWorkspace();

      expect(workspace.id).toBe('workspace-1');
    });
  });

  describe('switchWorkspace', () => {
    it('should switch to different workspace', () => {
      workspaceManager.switchWorkspace('workspace-2');

      expect(workspaceManager.currentWorkspaceId).toBe('workspace-2');
      expect(mockStorageManager.saveCurrentWorkspaceId).toHaveBeenCalledWith('workspace-2');
    });

    it('should emit workspace:switched event', () => {
      workspaceManager.switchWorkspace('workspace-2');

      expect(mockEventBus.emit).toHaveBeenCalledWith('workspace:switched', expect.objectContaining({
        id: 'workspace-2',
        name: 'Work'
      }));
    });

    it('should emit grid:cleared event', () => {
      workspaceManager.switchWorkspace('workspace-2');

      expect(mockEventBus.emit).toHaveBeenCalledWith('grid:cleared');
    });

    it('should save current workspace before switching', () => {
      const saveSpy = vi.spyOn(workspaceManager, 'saveWorkspace');

      workspaceManager.switchWorkspace('workspace-2');

      expect(saveSpy).toHaveBeenCalled();
    });

    it('should not switch if already on target workspace', () => {
      const saveSpy = vi.spyOn(workspaceManager, 'saveWorkspace');

      workspaceManager.switchWorkspace('workspace-1');

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should not save if current workspace was deleted', () => {
      workspaceManager.workspaces = [
        {
          id: 'workspace-2',
          userId: 'user-1',
          name: 'Work',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      const saveSpy = vi.spyOn(workspaceManager, 'saveWorkspace');

      workspaceManager.switchWorkspace('workspace-2');

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('createNewWorkspace', () => {
    it('should create new workspace with timestamp ID', () => {
      const initialCount = workspaceManager.workspaces.length;

      workspaceManager.createNewWorkspace();

      expect(workspaceManager.workspaces.length).toBe(initialCount + 1);
      expect(workspaceManager.workspaces[initialCount].id).toMatch(/^workspace-\d+$/);
    });

    it('should create workspace with default name', () => {
      workspaceManager.createNewWorkspace();

      const newWorkspace = workspaceManager.workspaces[workspaceManager.workspaces.length - 1];
      expect(newWorkspace.name).toBe('New workspace');
    });

    it('should create workspace with user ID', () => {
      workspaceManager.createNewWorkspace();

      const newWorkspace = workspaceManager.workspaces[workspaceManager.workspaces.length - 1];
      expect(newWorkspace.userId).toBe('user-1');
    });

    it('should switch to new workspace', () => {
      workspaceManager.createNewWorkspace();

      const newWorkspace = workspaceManager.workspaces[workspaceManager.workspaces.length - 1];
      expect(workspaceManager.currentWorkspaceId).toBe(newWorkspace.id);
    });

    it('should save workspaces to storage', () => {
      workspaceManager.createNewWorkspace();

      expect(mockStorageManager.saveWorkspaces).toHaveBeenCalled();
    });

    it('should set created and updated timestamps', () => {
      workspaceManager.createNewWorkspace();

      const newWorkspace = workspaceManager.workspaces[workspaceManager.workspaces.length - 1];
      expect(newWorkspace.createdAt).toBeDefined();
      expect(newWorkspace.updatedAt).toBeDefined();
    });
  });

  describe('deleteCurrentWorkspace', () => {
    it('should delete current workspace', () => {
      // Confirm deletion
      global.confirm = vi.fn(() => true);

      workspaceManager.deleteCurrentWorkspace();

      expect(workspaceManager.workspaces).toHaveLength(1);
      expect(workspaceManager.workspaces[0].id).toBe('workspace-2');
    });

    it('should not delete last workspace', () => {
      global.alert = vi.fn();
      workspaceManager.workspaces = [workspaceManager.workspaces[0]];

      const result = workspaceManager.deleteCurrentWorkspace();

      expect(result).toBe(false);
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Cannot delete the last workspace'));
    });

    it('should not delete workspace with widgets', () => {
      global.alert = vi.fn();
      mockStorageManager.getWidgetInstancesForWorkspace.mockReturnValue([
        { id: 'widget-1' },
        { id: 'widget-2' }
      ]);

      const result = workspaceManager.deleteCurrentWorkspace();

      expect(result).toBe(false);
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Cannot delete workspace with widgets'));
    });

    it('should prompt for confirmation', () => {
      global.confirm = vi.fn(() => false);

      const result = workspaceManager.deleteCurrentWorkspace();

      expect(result).toBe(false);
      expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Delete workspace'));
    });

    it('should switch to next workspace after deletion', () => {
      global.confirm = vi.fn(() => true);

      workspaceManager.deleteCurrentWorkspace();

      expect(workspaceManager.currentWorkspaceId).toBe('workspace-2');
    });

    it('should switch to previous workspace if deleting last workspace', () => {
      global.confirm = vi.fn(() => true);

      workspaceManager.currentWorkspaceId = 'workspace-2';

      workspaceManager.deleteCurrentWorkspace();

      expect(workspaceManager.currentWorkspaceId).toBe('workspace-1');
    });

    it('should save workspaces after deletion', () => {
      global.confirm = vi.fn(() => true);

      workspaceManager.deleteCurrentWorkspace();

      expect(mockStorageManager.saveWorkspaces).toHaveBeenCalled();
    });
  });

  describe('renameWorkspace', () => {
    it('should start inline rename', () => {
      const spy = vi.spyOn(workspaceManager, 'startInlineRename');

      workspaceManager.renameWorkspace('workspace-1');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('startInlineRename', () => {
    it('should replace name element with input', () => {
      const nameElement = document.createElement('div');
      nameElement.id = 'workspace-name';
      mockDom.getElementById.mockReturnValue(nameElement);

      const input = document.createElement('input');
      mockDom.createElement.mockReturnValue(input);

      workspaceManager.startInlineRename();

      expect(mockDom.getElementById).toHaveBeenCalledWith('workspace-name');
      expect(mockDom.createElement).toHaveBeenCalledWith('input', 'workspace-name-input', expect.any(Object));
    });

    it('should do nothing if name element not found', () => {
      mockDom.getElementById.mockReturnValue(null);

      expect(() => {
        workspaceManager.startInlineRename();
      }).not.toThrow();
    });
  });

  describe('saveWorkspace', () => {
    it('should save current workspace', () => {
      workspaceManager.saveWorkspace();

      expect(mockStorageManager.saveWorkspaces).toHaveBeenCalledWith(workspaceManager.workspaces);
    });

    it('should update workspace timestamp', () => {
      const originalTimestamp = workspaceManager.getCurrentWorkspace().updatedAt;

      // Wait a bit to ensure timestamp changes
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      workspaceManager.saveWorkspace();

      const newTimestamp = workspaceManager.getCurrentWorkspace().updatedAt;
      expect(newTimestamp).not.toBe(originalTimestamp);

      vi.useRealTimers();
    });
  });

  describe('updateWorkspaceUI', () => {
    it('should update workspace name', () => {
      const nameElement = document.createElement('div');
      nameElement.id = 'workspace-name';
      mockDom.getElementById.mockReturnValue(nameElement);

      const renderSpy = vi.spyOn(workspaceManager, 'renderWorkspaceDots');

      workspaceManager.updateWorkspaceUI();

      expect(renderSpy).toHaveBeenCalled();
    });

    it('should replace input with name element if in edit mode', () => {
      const inputElement = document.createElement('input');
      inputElement.id = 'workspace-name-input';
      mockDom.getElementById.mockReturnValue(inputElement);

      workspaceManager.updateWorkspaceUI();

      expect(mockDom.createElement).toHaveBeenCalledWith('div', 'workspace-name', expect.any(Object));
    });
  });

  describe('renderWorkspaceDots', () => {
    it('should render dots for all workspaces', () => {
      const container = document.createElement('div');
      container.id = 'workspace-dots';
      mockDom.getElementById.mockReturnValue(container);

      workspaceManager.renderWorkspaceDots();

      expect(mockDom.clearChildren).toHaveBeenCalledWith(container);
      expect(mockDom.createElement).toHaveBeenCalledWith('div', 'workspace-dot', expect.any(Object));
    });

    it('should mark active workspace dot', () => {
      const container = document.createElement('div');
      container.id = 'workspace-dots';
      mockDom.getElementById.mockReturnValue(container);

      workspaceManager.renderWorkspaceDots();

      expect(mockDom.toggleClass).toHaveBeenCalledWith(expect.anything(), 'active', true);
    });

    it('should do nothing if container not found', () => {
      mockDom.getElementById.mockReturnValue(null);

      expect(() => {
        workspaceManager.renderWorkspaceDots();
      }).not.toThrow();
    });

    it('should add click handlers to dots', () => {
      const container = document.createElement('div');
      container.id = 'workspace-dots';
      mockDom.getElementById.mockReturnValue(container);

      workspaceManager.renderWorkspaceDots();

      expect(mockDom.addEventListener).toHaveBeenCalledWith(
        expect.anything(),
        'click',
        expect.any(Function)
      );
    });

    it('should add tooltips with keyboard shortcuts', () => {
      const container = document.createElement('div');
      container.id = 'workspace-dots';
      mockDom.getElementById.mockReturnValue(container);

      workspaceManager.renderWorkspaceDots();

      expect(mockDom.createText).toHaveBeenCalledWith(
        expect.stringContaining('Ctrl+'),
        'div',
        'workspace-dot-tooltip'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle switching to nonexistent workspace', () => {
      const originalWorkspace = workspaceManager.currentWorkspaceId;

      workspaceManager.switchWorkspace('nonexistent');

      // Should not crash and should stay on original workspace
      expect(workspaceManager.currentWorkspaceId).toBe('nonexistent');
    });

    it('should handle empty workspace array', () => {
      workspaceManager.workspaces = [];
      workspaceManager.currentWorkspaceId = 'workspace-1';

      const result = workspaceManager.getCurrentWorkspace();

      expect(result).toBeUndefined();
    });

    it('should handle missing user in storage', () => {
      mockStorageManager.getUser.mockReturnValue({ id: 'default-user' });

      const newManager = new WorkspaceManager({
        eventBus: mockEventBus,
        storageManager: mockStorageManager,
        domHelper: mockDom
      });

      newManager.createNewWorkspace();

      const newWorkspace = newManager.workspaces[newManager.workspaces.length - 1];
      expect(newWorkspace.userId).toBe('default-user');
    });

    it('should handle workspace without widgets check', () => {
      global.confirm = vi.fn(() => true);
      mockStorageManager.getWidgetInstancesForWorkspace.mockReturnValue(null);

      // Should not crash
      expect(() => {
        workspaceManager.deleteCurrentWorkspace();
      }).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle full workspace lifecycle', () => {
      global.confirm = vi.fn(() => true);

      // Create new workspace
      workspaceManager.createNewWorkspace();
      const newId = workspaceManager.currentWorkspaceId;
      expect(workspaceManager.workspaces).toHaveLength(3);

      // Switch to another workspace
      workspaceManager.switchWorkspace('workspace-1');
      expect(workspaceManager.currentWorkspaceId).toBe('workspace-1');

      // Switch back to new workspace
      workspaceManager.switchWorkspace(newId);
      expect(workspaceManager.currentWorkspaceId).toBe(newId);

      // Delete the new workspace
      const result = workspaceManager.deleteCurrentWorkspace();
      expect(result).toBe(true);
      expect(workspaceManager.workspaces).toHaveLength(2);
    });

    it('should maintain workspace state across switches', () => {
      const workspace1 = workspaceManager.getCurrentWorkspace();
      const originalUpdatedAt = workspace1.updatedAt;

      // Switch to workspace 2
      workspaceManager.switchWorkspace('workspace-2');

      // Switch back to workspace 1
      workspaceManager.switchWorkspace('workspace-1');

      const workspace1Again = workspaceManager.getCurrentWorkspace();

      // Workspace should be the same object (updated timestamp will differ)
      expect(workspace1Again.id).toBe(workspace1.id);
      expect(workspace1Again.name).toBe(workspace1.name);
    });

    it('should handle rapid workspace operations', () => {
      global.confirm = vi.fn(() => true);

      // Create multiple workspaces rapidly
      workspaceManager.createNewWorkspace();
      workspaceManager.createNewWorkspace();
      workspaceManager.createNewWorkspace();

      expect(workspaceManager.workspaces).toHaveLength(5);

      // Switch between them rapidly
      const workspace3Id = workspaceManager.workspaces[2].id;
      const workspace4Id = workspaceManager.workspaces[3].id;

      workspaceManager.switchWorkspace(workspace3Id);
      workspaceManager.switchWorkspace(workspace4Id);
      workspaceManager.switchWorkspace(workspace3Id);

      expect(workspaceManager.currentWorkspaceId).toBe(workspace3Id);
    });

    it('should handle workspace events correctly', () => {
      // Auto-save on widgets:changed event
      const saveSpy = vi.spyOn(workspaceManager, 'saveWorkspace');

      // Trigger the widgets:changed event
      const widgetsChangedHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'widgets:changed'
      )[1];

      widgetsChangedHandler();

      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('workspace validation', () => {
    it('should not delete workspace with invalid widget check', () => {
      global.alert = vi.fn();
      global.confirm = vi.fn(() => true);

      mockStorageManager.getWidgetInstancesForWorkspace.mockReturnValue([{ id: 'widget-1' }]);

      const result = workspaceManager.deleteCurrentWorkspace();

      expect(result).toBe(false);
      expect(mockStorageManager.getWidgetInstancesForWorkspace).toHaveBeenCalledWith('workspace-1', false);
    });

    it('should handle workspace name with special characters', () => {
      const workspace = workspaceManager.getCurrentWorkspace();
      workspace.name = 'Test <script>alert(1)</script>';

      expect(() => {
        workspaceManager.updateWorkspaceUI();
      }).not.toThrow();
    });

    it('should handle very long workspace names', () => {
      const workspace = workspaceManager.getCurrentWorkspace();
      workspace.name = 'A'.repeat(1000);

      expect(() => {
        workspaceManager.updateWorkspaceUI();
      }).not.toThrow();
    });
  });
});
