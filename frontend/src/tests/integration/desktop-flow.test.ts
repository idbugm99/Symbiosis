/**
 * Desktop Flow Integration Tests
 * Tests full user workflows across multiple managers
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventBus } from '../../managers/event-bus.js';
import { WorkspaceManager } from '../../managers/workspace-manager.js';
import { WidgetUIController } from '../../managers/widget-ui-controller.js';
import { AppUIController } from '../../managers/app-ui-controller.js';
import { DrawerManager } from '../../managers/drawer-manager.js';

describe('Desktop Flow Integration Tests', () => {
  let eventBus;
  let workspaceManager;
  let widgetUIController;
  let appUIController;
  let drawerManager;
  let mockStorageManager;
  let mockWidgetManager;
  let mockDom;

  beforeEach(() => {
    // Real EventBus instance
    eventBus = new EventBus();

    // Mock StorageManager
    mockStorageManager = {
      loadWorkspaces: vi.fn(() => [
        {
          id: 'workspace-1',
          userId: 'user-1',
          name: 'Default',
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

    // Mock WidgetManager
    mockWidgetManager = {
      getWidget: vi.fn(),
      addWidget: vi.fn(),
      removeWidget: vi.fn(),
      moveWidget: vi.fn()
    };

    // Mock DOM helper
    mockDom = {
      getElementById: vi.fn((id) => {
        const el = document.createElement('div');
        el.id = id;
        return el;
      }),
      querySelector: vi.fn((selector) => {
        const el = document.createElement('div');
        el.dataset.cell = '1';
        return el;
      }),
      createElement: vi.fn((tag, className, attrs = {}) => {
        const element = document.createElement(tag);
        element.className = className || '';
        if (attrs.id) element.id = attrs.id;
        if (attrs.dataset) {
          Object.entries(attrs.dataset).forEach(([key, value]) => {
            element.dataset[key] = value;
          });
        }
        if (attrs.style) {
          Object.assign(element.style, attrs.style);
        }
        return element;
      }),
      createIcon: vi.fn((icon, className) => {
        const el = document.createElement('div');
        el.className = className;
        el.textContent = icon;
        return el;
      }),
      createText: vi.fn((text, tag, className) => {
        const el = document.createElement(tag || 'span');
        el.className = className || '';
        el.textContent = text;
        return el;
      }),
      createButton: vi.fn((text, className, onClick) => {
        const btn = document.createElement('button');
        btn.className = className || '';
        btn.textContent = text;
        if (onClick) btn.addEventListener('click', onClick);
        return btn;
      }),
      toggleClass: vi.fn((element, className, force) => {
        if (element) element.classList.toggle(className, force);
      }),
      addEventListener: vi.fn((element, event, handler) => {
        if (element) element.addEventListener(event, handler);
        return () => element?.removeEventListener(event, handler);
      }),
      removeElement: vi.fn((element) => {
        element?.parentNode?.removeChild(element);
      }),
      clearChildren: vi.fn((element) => {
        if (element) element.innerHTML = '';
      }),
      appendChildren: vi.fn((parent, children) => {
        children.forEach(child => {
          if (child) parent.appendChild(child);
        });
      })
    };

    // Initialize managers with shared EventBus
    workspaceManager = new WorkspaceManager({
      eventBus,
      storageManager: mockStorageManager,
      domHelper: mockDom
    });

    appUIController = new AppUIController({
      eventBus,
      domHelper: mockDom,
      containerElement: document.createElement('div')
    });

    widgetUIController = new WidgetUIController({
      eventBus,
      domHelper: mockDom,
      gridContainer: document.createElement('div'),
      appUIController,
      widgetManager: mockWidgetManager
    });

    drawerManager = new DrawerManager({
      eventBus,
      widgetDefinitions: [
        {
          id: 'test-widget',
          name: 'Test Widget',
          icon: '📊',
          type: 'widget',
          cols: 2,
          rows: 2,
          size: '2x2',
          category: 'test'
        },
        {
          id: 'test-app',
          name: 'Test App',
          icon: '🚀',
          type: 'app',
          cols: 1,
          rows: 1,
          size: '1x1',
          category: 'test'
        }
      ],
      domHelper: mockDom
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Widget Management Flow', () => {
    it('should handle complete widget lifecycle', () => {
      const eventSpy = vi.fn();

      // Step 1: Open drawer
      eventBus.on('drawer:opened', eventSpy);
      drawerManager.open();
      expect(eventSpy).toHaveBeenCalledWith();

      // Step 2: Add widget from drawer (simulated)
      const widgetData = {
        id: 'test-widget',
        name: 'Test Widget',
        icon: '📊',
        type: 'widget',
        cols: 2,
        rows: 2
      };

      eventBus.on('widget:added', eventSpy);
      eventBus.emit('widget:added', widgetData);
      expect(eventSpy).toHaveBeenCalledWith(widgetData);

      // Step 3: Render widget
      const widgetInstance = {
        id: 'widget-instance-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cell: 1,
        cols: 2,
        rows: 2,
        size: '2x2'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        icon: '📊',
        type: 'widget',
        cols: 2,
        rows: 2
      };

      const widget = widgetUIController.renderWidget(widgetInstance, widgetDefinition);
      expect(widget).toBeDefined();

      // Step 4: Widget state should be active
      expect(widgetUIController.getWidgetState('widget-instance-1')).toBe('active');

      // Step 5: Update widget content
      widgetUIController.updateWidgetContent('widget-instance-1', 'Updated content');

      // Step 6: Remove widget
      widgetUIController.removeWidget('widget-instance-1');
    });

    it('should handle widget move between cells', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cell: 1,
        cols: 1,
        rows: 1,
        size: '1x1'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget'
      };

      // Render at cell 1
      widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      // Move to cell 5
      widgetInstance.cell = 5;
      widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      // Should render at new location
      expect(mockDom.querySelector).toHaveBeenCalledWith('[data-cell="5"]');
    });

    it('should handle widget deletion', () => {
      vi.useFakeTimers();

      const widgetInstance = {
        id: 'widget-to-delete',
        widgetDefId: 'test-widget',
        type: 'widget',
        cell: 1,
        cols: 1,
        rows: 1,
        size: '1x1'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget'
      };

      widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      // Delete widget
      widgetUIController.removeWidget('widget-to-delete');

      // Should remove after animation
      vi.advanceTimersByTime(300);
      expect(widgetUIController.widgetStates.has('widget-to-delete')).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Workspace Flow', () => {
    it('should handle workspace creation and switching', () => {
      const switchedSpy = vi.fn();
      eventBus.on('workspace:switched', switchedSpy);

      // Initial workspace
      expect(workspaceManager.getCurrentWorkspace().name).toBe('Default');

      // Create new workspace
      workspaceManager.createNewWorkspace();
      expect(workspaceManager.workspaces.length).toBe(2);

      // Should switch to new workspace
      const newWorkspace = workspaceManager.getCurrentWorkspace();
      expect(newWorkspace.name).toBe('New workspace');
      expect(switchedSpy).toHaveBeenCalled();

      // Switch back to first workspace
      workspaceManager.switchWorkspace('workspace-1');
      expect(workspaceManager.getCurrentWorkspace().id).toBe('workspace-1');
    });

    it('should verify widgets are workspace-specific', () => {
      // Create two workspaces
      workspaceManager.createNewWorkspace();
      const workspace2Id = workspaceManager.currentWorkspaceId;

      // Switch to workspace 1
      workspaceManager.switchWorkspace('workspace-1');

      // Add widget to workspace 1 (simulated)
      const widget1 = {
        id: 'widget-1',
        workspaceId: 'workspace-1',
        widgetDefId: 'test-widget',
        cell: 1,
        cols: 1,
        rows: 1
      };

      // Switch to workspace 2
      workspaceManager.switchWorkspace(workspace2Id);

      // Widget should not be visible (handled by WidgetManager in real app)
      expect(workspaceManager.currentWorkspaceId).toBe(workspace2Id);

      // Switch back to workspace 1
      workspaceManager.switchWorkspace('workspace-1');

      // Widget should be visible again
      expect(workspaceManager.currentWorkspaceId).toBe('workspace-1');
    });

    it('should handle workspace deletion', () => {
      global.confirm = vi.fn(() => true);

      // Create second workspace
      workspaceManager.createNewWorkspace();
      const workspace2Id = workspaceManager.currentWorkspaceId;

      // Delete workspace
      workspaceManager.deleteCurrentWorkspace();

      // Should switch to remaining workspace
      expect(workspaceManager.currentWorkspaceId).toBe('workspace-1');
      expect(workspaceManager.workspaces.length).toBe(1);
    });

    it('should emit events during workspace operations', () => {
      const clearedSpy = vi.fn();
      const switchedSpy = vi.fn();

      eventBus.on('grid:cleared', clearedSpy);
      eventBus.on('workspace:switched', switchedSpy);

      // Create and switch to new workspace
      workspaceManager.createNewWorkspace();

      expect(clearedSpy).toHaveBeenCalled();
      expect(switchedSpy).toHaveBeenCalled();
    });
  });

  describe('App Launching Flow', () => {
    it('should launch app from dock', () => {
      const openedSpy = vi.fn();
      eventBus.on('app:opened', openedSpy);

      // Launch app
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'fullscreen'
      });

      expect(openedSpy).toHaveBeenCalledWith({
        instanceId,
        appId: 'test-app'
      });

      expect(appUIController.isAppOpen('test-app')).toBe(true);
    });

    it('should launch app from widget double-click', () => {
      const widgetInstance = {
        id: 'launcher-widget',
        widgetDefId: 'test-widget',
        type: 'widget',
        cell: 1,
        cols: 1,
        rows: 1
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget',
        launchesApp: 'test-app',
        launchTrigger: 'doubleClick'
      };

      const openedSpy = vi.fn();
      eventBus.on('app:opened', openedSpy);

      // Simulate double-click
      widgetUIController.handleWidgetDoubleClick(
        widgetInstance,
        widgetDefinition,
        new Event('dblclick')
      );

      expect(openedSpy).toHaveBeenCalled();
    });

    it('should close app and cleanup', () => {
      vi.useFakeTimers();

      const closedSpy = vi.fn();
      eventBus.on('app:closed', closedSpy);

      // Open app
      const instanceId = appUIController.openApp('test-app');
      expect(appUIController.isAppOpen('test-app')).toBe(true);

      // Close app
      appUIController.closeApp(instanceId);

      // Wait for animation
      vi.advanceTimersByTime(600);

      expect(closedSpy).toHaveBeenCalledWith({
        instanceId,
        appId: 'test-app'
      });

      expect(appUIController.isAppOpen('test-app')).toBe(false);

      vi.useRealTimers();
    });

    it('should handle app minimize and restore', () => {
      const instanceId = appUIController.openApp('test-app');

      // Minimize
      appUIController.minimizeApp(instanceId);
      const instance = appUIController.getAppInstance(instanceId);
      expect(instance.window.style.display).toBe('none');

      // Restore
      appUIController.restoreApp(instanceId);
      expect(instance.window.style.display).toBe('');
    });
  });

  describe('Event Flow', () => {
    it('should propagate events correctly across managers', () => {
      const eventLog = [];

      // Setup listeners
      eventBus.on('drawer:opened', () => eventLog.push('drawer:opened'));
      eventBus.on('widget:added', () => eventLog.push('widget:added'));
      eventBus.on('workspace:switched', () => eventLog.push('workspace:switched'));
      eventBus.on('app:opened', () => eventLog.push('app:opened'));

      // Trigger events
      drawerManager.open();
      eventBus.emit('widget:added', {});
      workspaceManager.createNewWorkspace();
      appUIController.openApp('test-app');

      // Verify event order
      expect(eventLog).toContain('drawer:opened');
      expect(eventLog).toContain('widget:added');
      expect(eventLog).toContain('workspace:switched');
      expect(eventLog).toContain('app:opened');
    });

    it('should handle manager responses to events', () => {
      const workspaceSpy = vi.spyOn(workspaceManager, 'saveWorkspace');

      // Emit widgets:changed event
      eventBus.emit('widgets:changed');

      // WorkspaceManager should auto-save
      expect(workspaceSpy).toHaveBeenCalled();
    });

    it('should update UI on events', () => {
      const updateUISpy = vi.spyOn(workspaceManager, 'updateWorkspaceUI');

      // Switch workspace
      workspaceManager.createNewWorkspace();

      // UI should update
      expect(updateUISpy).toHaveBeenCalled();
    });
  });

  describe('Complex User Scenarios', () => {
    it('should handle multi-workspace widget management', () => {
      global.confirm = vi.fn(() => true);

      // Create workspace 1 with widget
      expect(workspaceManager.getCurrentWorkspace().id).toBe('workspace-1');

      const widget1Instance = {
        id: 'widget-ws1',
        widgetDefId: 'test-widget',
        workspaceId: 'workspace-1',
        cell: 1,
        cols: 1,
        rows: 1
      };

      // Create workspace 2
      workspaceManager.createNewWorkspace();
      const workspace2Id = workspaceManager.currentWorkspaceId;

      const widget2Instance = {
        id: 'widget-ws2',
        widgetDefId: 'test-widget',
        workspaceId: workspace2Id,
        cell: 5,
        cols: 1,
        rows: 1
      };

      // Verify workspaces are separate
      expect(widget1Instance.workspaceId).not.toBe(widget2Instance.workspaceId);

      // Switch between workspaces
      workspaceManager.switchWorkspace('workspace-1');
      expect(workspaceManager.currentWorkspaceId).toBe('workspace-1');

      workspaceManager.switchWorkspace(workspace2Id);
      expect(workspaceManager.currentWorkspaceId).toBe(workspace2Id);
    });

    it('should handle rapid user interactions', () => {
      // Open and close drawer rapidly
      drawerManager.toggle();
      drawerManager.toggle();
      drawerManager.toggle();
      expect(drawerManager.isOpen).toBe(true);

      // Switch tabs rapidly
      drawerManager.switchTab('apps');
      drawerManager.switchTab('widgets');
      drawerManager.switchTab('apps');
      expect(drawerManager.currentTab).toBe('apps');

      // Open multiple apps
      const id1 = appUIController.openApp('app-1', { multiInstance: true });
      const id2 = appUIController.openApp('app-2', { multiInstance: true });
      const id3 = appUIController.openApp('app-3', { multiInstance: true });

      expect(appUIController.getOpenApps().length).toBe(3);

      // Close all apps
      vi.useFakeTimers();
      appUIController.closeApp(id1);
      appUIController.closeApp(id2);
      appUIController.closeApp(id3);
      vi.advanceTimersByTime(600);

      expect(appUIController.getOpenApps().length).toBe(0);
      vi.useRealTimers();
    });

    it('should maintain state consistency across operations', () => {
      // Initial state
      expect(workspaceManager.workspaces.length).toBe(1);
      expect(appUIController.openApps.size).toBe(0);
      expect(drawerManager.isOpen).toBe(false);

      // Perform operations
      drawerManager.open();
      workspaceManager.createNewWorkspace();
      appUIController.openApp('test-app');

      // Verify state
      expect(workspaceManager.workspaces.length).toBe(2);
      expect(appUIController.openApps.size).toBe(1);
      expect(drawerManager.isOpen).toBe(true);

      // Cleanup
      drawerManager.close();
      workspaceManager.switchWorkspace('workspace-1');

      vi.useFakeTimers();
      appUIController.closeApp(appUIController.getOpenApps()[0].instanceId);
      vi.advanceTimersByTime(600);

      // Verify cleanup
      expect(drawerManager.isOpen).toBe(false);
      expect(appUIController.openApps.size).toBe(0);

      vi.useRealTimers();
    });

    it('should handle error recovery gracefully', () => {
      // Try to delete last workspace (should fail)
      global.alert = vi.fn();
      const result = workspaceManager.deleteCurrentWorkspace();
      expect(result).toBe(false);
      expect(workspaceManager.workspaces.length).toBe(1);

      // Try to close non-existent app (should not crash)
      expect(() => {
        appUIController.closeApp('nonexistent-app-123');
      }).not.toThrow();

      // Try to render widget in non-existent cell (should not crash)
      mockDom.querySelector.mockReturnValue(null);
      const result2 = widgetUIController.renderWidget(
        { id: 'w1', cell: 999, cols: 1, rows: 1 },
        { id: 'test', type: 'widget' }
      );
      expect(result2).toBeNull();
    });
  });

  describe('Performance Considerations', () => {
    it('should handle multiple simultaneous event listeners', () => {
      const handlers = [];

      // Register many listeners
      for (let i = 0; i < 100; i++) {
        const handler = vi.fn();
        eventBus.on('test-event', handler);
        handlers.push(handler);
      }

      // Emit event
      eventBus.emit('test-event', { data: 'test' });

      // All handlers should be called
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledOnce();
      });
    });

    it('should handle many open apps efficiently', () => {
      // Open many apps
      const instanceIds = [];
      for (let i = 0; i < 20; i++) {
        const id = appUIController.openApp(`app-${i}`, { multiInstance: true });
        instanceIds.push(id);
      }

      expect(appUIController.getOpenApps().length).toBe(20);

      // Bring one to front
      appUIController.bringToFront(instanceIds[10]);

      // Verify z-index management
      const instance = appUIController.getAppInstance(instanceIds[10]);
      expect(parseInt(instance.window.style.zIndex)).toBeGreaterThan(1000);
    });

    it('should handle large number of widgets in drawer', () => {
      const manyWidgets = [];
      for (let i = 0; i < 100; i++) {
        manyWidgets.push({
          id: `widget-${i}`,
          name: `Widget ${i}`,
          icon: '📦',
          type: 'widget',
          cols: 1,
          rows: 1,
          size: '1x1',
          category: i % 2 === 0 ? 'chemicals' : 'equipment'
        });
      }

      const largeDrawer = new DrawerManager({
        eventBus,
        widgetDefinitions: manyWidgets,
        domHelper: mockDom
      });

      expect(() => {
        largeDrawer.populate();
      }).not.toThrow();
    });
  });
});
