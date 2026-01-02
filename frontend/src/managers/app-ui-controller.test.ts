/**
 * AppUIController Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppUIController } from './app-ui-controller.js';

describe('AppUIController', () => {
  let appUIController;
  let mockEventBus;
  let mockDom;
  let mockContainer;

  beforeEach(() => {
    // Mock EventBus
    mockEventBus = {
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn()
    };

    // Mock DOM helper
    mockDom = {
      getElementById: vi.fn(),
      querySelector: vi.fn(),
      createElement: vi.fn((tag, className, attrs = {}) => {
        const element = document.createElement(tag);
        element.className = className || '';
        if (attrs.id) element.id = attrs.id;
        if (attrs.dataset) {
          Object.entries(attrs.dataset).forEach(([key, value]) => {
            element.dataset[key] = value;
          });
        }
        return element;
      }),
      createButton: vi.fn((text, className, onClick, attrs = {}) => {
        const btn = document.createElement('button');
        btn.className = className || '';
        btn.textContent = text;
        if (onClick) btn.addEventListener('click', onClick);
        if (attrs.title) btn.title = attrs.title;
        return btn;
      }),
      createText: vi.fn((text, tag, className) => {
        const el = document.createElement(tag || 'span');
        el.className = className || '';
        el.textContent = text;
        return el;
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
      })
    };

    // Mock container
    mockContainer = document.createElement('div');
    mockContainer.id = 'app-container';

    // Create controller
    appUIController = new AppUIController({
      eventBus: mockEventBus,
      domHelper: mockDom,
      containerElement: mockContainer
    });

    // Clear global hotkeyManager mock
    global.hotkeyManager = {
      registerAppHotkey: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete global.hotkeyManager;
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      expect(appUIController.eventBus).toBe(mockEventBus);
      expect(appUIController.dom).toBe(mockDom);
      expect(appUIController.containerElement).toBe(mockContainer);
    });

    it('should initialize open apps map', () => {
      expect(appUIController.openApps).toBeInstanceOf(Map);
      expect(appUIController.openApps.size).toBe(0);
    });

    it('should initialize z-index counter', () => {
      expect(appUIController.zIndexCounter).toBe(1000);
    });

    it('should initialize active app instance ID as null', () => {
      expect(appUIController.activeAppInstanceId).toBeNull();
    });
  });

  describe('openApp', () => {
    it('should open app with fullscreen display mode', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'fullscreen'
      });

      expect(instanceId).toMatch(/^test-app-\d+$/);
      expect(appUIController.openApps.has(instanceId)).toBe(true);
    });

    it('should create unique instance IDs', () => {
      const id1 = appUIController.openApp('test-app');
      const id2 = appUIController.openApp('test-app');

      expect(id1).not.toBe(id2);
    });

    it('should close existing instances if multiInstance is false', () => {
      const id1 = appUIController.openApp('test-app', { multiInstance: false });
      const id2 = appUIController.openApp('test-app', { multiInstance: false });

      expect(appUIController.openApps.has(id1)).toBe(false);
      expect(appUIController.openApps.has(id2)).toBe(true);
    });

    it('should allow multiple instances if multiInstance is true', () => {
      const id1 = appUIController.openApp('test-app', { multiInstance: true });
      const id2 = appUIController.openApp('test-app', { multiInstance: true });

      expect(appUIController.openApps.has(id1)).toBe(true);
      expect(appUIController.openApps.has(id2)).toBe(true);
    });

    it('should merge default settings', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'popup',
        showCloseButton: false
      });

      const instance = appUIController.openApps.get(instanceId);
      expect(instance.settings.displayMode).toBe('popup');
      expect(instance.settings.showCloseButton).toBe(false);
      expect(instance.settings.animation).toBe('fade'); // default
    });

    it('should emit app:opened event', () => {
      const instanceId = appUIController.openApp('test-app');

      expect(mockEventBus.emit).toHaveBeenCalledWith('app:opened', {
        instanceId,
        appId: 'test-app'
      });
    });

    it('should register default ESC hotkey', () => {
      appUIController.openApp('test-app');

      expect(global.hotkeyManager.registerAppHotkey).toHaveBeenCalledWith(
        expect.stringMatching(/^test-app-\d+$/),
        'Escape',
        expect.any(Function),
        'Close app'
      );
    });

    it('should bring app to front', () => {
      const id1 = appUIController.openApp('app-1');
      const id2 = appUIController.openApp('app-2');

      const instance2 = appUIController.openApps.get(id2);
      expect(parseInt(instance2.window.style.zIndex)).toBeGreaterThan(1000);
    });
  });

  describe('createAppWindow', () => {
    it('should create app window with correct structure', () => {
      const settings = {
        displayMode: 'fullscreen',
        showCloseButton: true
      };

      const window = appUIController.createAppWindow('app-1', 'test-app', settings, null);

      expect(window.id).toBe('app-1');
      expect(window.dataset.appId).toBe('test-app');
      expect(window.dataset.displayMode).toBe('fullscreen');
    });

    it('should add window chrome for popup mode', () => {
      const settings = {
        displayMode: 'popup',
        showCloseButton: true
      };

      const createChromeSpy = vi.spyOn(appUIController, 'createWindowChrome');
      appUIController.createAppWindow('app-1', 'test-app', settings, null);

      expect(createChromeSpy).toHaveBeenCalled();
    });

    it('should add window chrome for modal mode', () => {
      const settings = {
        displayMode: 'modal',
        showCloseButton: true
      };

      const createChromeSpy = vi.spyOn(appUIController, 'createWindowChrome');
      appUIController.createAppWindow('app-1', 'test-app', settings, null);

      expect(createChromeSpy).toHaveBeenCalled();
    });

    it('should add floating close button for fullscreen mode', () => {
      const settings = {
        displayMode: 'fullscreen'
      };

      const createButtonSpy = vi.spyOn(appUIController, 'createFloatingCloseButton');
      appUIController.createAppWindow('app-1', 'test-app', settings, null);

      expect(createButtonSpy).toHaveBeenCalled();
    });

    it('should create content container', () => {
      const settings = { displayMode: 'fullscreen' };

      appUIController.createAppWindow('app-1', 'test-app', settings, null);

      expect(mockDom.createElement).toHaveBeenCalledWith('div', 'app-content', {
        id: 'app-1-content'
      });
    });
  });

  describe('closeApp', () => {
    it('should close app instance', () => {
      vi.useFakeTimers();

      const instanceId = appUIController.openApp('test-app');
      appUIController.closeApp(instanceId);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'closing',
        true
      );

      vi.advanceTimersByTime(600);

      expect(appUIController.openApps.has(instanceId)).toBe(false);

      vi.useRealTimers();
    });

    it('should emit app:closed event', () => {
      vi.useFakeTimers();

      const instanceId = appUIController.openApp('test-app');
      mockEventBus.emit.mockClear(); // Clear previous calls

      appUIController.closeApp(instanceId);

      vi.advanceTimersByTime(600);

      expect(mockEventBus.emit).toHaveBeenCalledWith('app:closed', {
        instanceId,
        appId: 'test-app'
      });

      vi.useRealTimers();
    });

    it('should restore global UI after closing', () => {
      vi.useFakeTimers();

      const restoreSpy = vi.spyOn(appUIController, 'restoreGlobalUI');
      const instanceId = appUIController.openApp('test-app');

      appUIController.closeApp(instanceId);

      vi.advanceTimersByTime(600);

      expect(restoreSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should clear active app if closing active app', () => {
      const instanceId = appUIController.openApp('test-app');
      appUIController.activeAppInstanceId = instanceId;

      appUIController.closeApp(instanceId);

      expect(appUIController.activeAppInstanceId).toBeNull();
    });

    it('should handle closing non-existent app gracefully', () => {
      expect(() => {
        appUIController.closeApp('nonexistent');
      }).not.toThrow();
    });

    it('should not double-close an app', () => {
      vi.useFakeTimers();

      const instanceId = appUIController.openApp('test-app');

      appUIController.closeApp(instanceId);
      appUIController.closeApp(instanceId); // Second close

      vi.advanceTimersByTime(600);

      // Should only emit once
      const closedEvents = mockEventBus.emit.mock.calls.filter(
        call => call[0] === 'app:closed'
      );
      expect(closedEvents.length).toBe(1);

      vi.useRealTimers();
    });

    it('should clean up orphaned DOM elements', () => {
      const orphanedElement = document.createElement('div');
      orphanedElement.id = 'orphaned-app-1';
      mockDom.getElementById.mockReturnValue(orphanedElement);

      appUIController.closeApp('orphaned-app-1');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(orphanedElement, 'closing', true);
    });
  });

  describe('minimizeApp', () => {
    it('should minimize app', () => {
      const instanceId = appUIController.openApp('test-app');

      appUIController.minimizeApp(instanceId);

      const instance = appUIController.openApps.get(instanceId);
      expect(instance.window.style.display).toBe('none');
    });

    it('should add minimized class', () => {
      const instanceId = appUIController.openApp('test-app');

      appUIController.minimizeApp(instanceId);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'minimized',
        true
      );
    });

    it('should handle minimizing non-existent app', () => {
      expect(() => {
        appUIController.minimizeApp('nonexistent');
      }).not.toThrow();
    });
  });

  describe('restoreApp', () => {
    it('should restore minimized app', () => {
      const instanceId = appUIController.openApp('test-app');

      appUIController.minimizeApp(instanceId);
      appUIController.restoreApp(instanceId);

      const instance = appUIController.openApps.get(instanceId);
      expect(instance.window.style.display).toBe('');
    });

    it('should remove minimized class', () => {
      const instanceId = appUIController.openApp('test-app');

      appUIController.minimizeApp(instanceId);
      appUIController.restoreApp(instanceId);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'minimized',
        false
      );
    });

    it('should bring app to front on restore', () => {
      const bringToFrontSpy = vi.spyOn(appUIController, 'bringToFront');
      const instanceId = appUIController.openApp('test-app');

      appUIController.minimizeApp(instanceId);
      appUIController.restoreApp(instanceId);

      expect(bringToFrontSpy).toHaveBeenCalledWith(instanceId);
    });
  });

  describe('bringToFront', () => {
    it('should increase z-index', () => {
      const instanceId = appUIController.openApp('test-app');
      const initialZIndex = appUIController.zIndexCounter;

      appUIController.bringToFront(instanceId);

      const instance = appUIController.openApps.get(instanceId);
      expect(parseInt(instance.window.style.zIndex)).toBeGreaterThan(initialZIndex);
    });

    it('should mark app as active', () => {
      const instanceId = appUIController.openApp('test-app');

      appUIController.bringToFront(instanceId);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'active',
        true
      );
    });

    it('should remove active class from other apps', () => {
      const id1 = appUIController.openApp('app-1');
      const id2 = appUIController.openApp('app-2');

      appUIController.bringToFront(id1);

      const instance2 = appUIController.openApps.get(id2);
      expect(mockDom.toggleClass).toHaveBeenCalledWith(instance2.window, 'active', false);
    });

    it('should emit app:focused event', () => {
      const instanceId = appUIController.openApp('test-app');
      mockEventBus.emit.mockClear();

      appUIController.bringToFront(instanceId);

      expect(mockEventBus.emit).toHaveBeenCalledWith('app:focused', {
        instanceId,
        appId: 'test-app'
      });
    });

    it('should track as active app', () => {
      const instanceId = appUIController.openApp('test-app');

      appUIController.bringToFront(instanceId);

      expect(appUIController.activeAppInstanceId).toBe(instanceId);
    });
  });

  describe('applyDisplayMode', () => {
    it('should apply fullscreen mode', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'fullscreen'
      });

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'fullscreen',
        true
      );
    });

    it('should apply fullscreen-no-nav mode', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'fullscreen-no-nav'
      });

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'fullscreen-no-nav',
        true
      );
    });

    it('should apply popup mode', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'popup'
      });

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'popup',
        true
      );
    });

    it('should apply modal mode', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'modal'
      });

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'modal',
        true
      );
    });

    it('should apply embedded mode', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'embedded'
      });

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'embedded',
        true
      );
    });

    it('should update global UI based on settings', () => {
      const updateGlobalUISpy = vi.spyOn(appUIController, 'updateGlobalUI');

      appUIController.openApp('test-app', {
        displayMode: 'fullscreen',
        dock: false
      });

      expect(updateGlobalUISpy).toHaveBeenCalled();
    });
  });

  describe('applyAnimation', () => {
    it('should apply fade animation', () => {
      vi.useFakeTimers();

      const window = document.createElement('div');
      appUIController.applyAnimation(window, 'fade', null);

      vi.advanceTimersByTime(10);

      expect(window.style.opacity).toBe('1');

      vi.useRealTimers();
    });

    it('should apply slide-right animation', () => {
      vi.useFakeTimers();

      const window = document.createElement('div');
      appUIController.applyAnimation(window, 'slide-right', null);

      vi.advanceTimersByTime(10);

      expect(window.style.transform).toBe('translateX(0)');

      vi.useRealTimers();
    });

    it('should apply slide-left animation', () => {
      vi.useFakeTimers();

      const window = document.createElement('div');
      appUIController.applyAnimation(window, 'slide-left', null);

      vi.advanceTimersByTime(10);

      expect(window.style.transform).toBe('translateX(0)');

      vi.useRealTimers();
    });

    it('should apply expand-from-widget animation', () => {
      vi.useFakeTimers();

      const window = document.createElement('div');
      const sourceWidget = document.createElement('div');

      // Mock getBoundingClientRect
      sourceWidget.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        x: 100,
        y: 100,
        bottom: 150,
        right: 150,
        toJSON: () => ({})
      } as DOMRect));

      appUIController.applyAnimation(window, 'expand-from-widget', sourceWidget);

      vi.advanceTimersByTime(10);

      expect(window.style.transform).toBe('scale(1)');

      vi.useRealTimers();
    });

    it('should remove animating class after animation', () => {
      vi.useFakeTimers();

      const window = document.createElement('div');
      appUIController.applyAnimation(window, 'fade', null);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(window, 'animating', true);

      vi.advanceTimersByTime(650);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(window, 'animating', false);

      vi.useRealTimers();
    });
  });

  describe('updateGlobalUI', () => {
    it('should hide dock if settings.dock is false', () => {
      const mockDock = document.createElement('div');
      mockDock.id = 'dock';
      mockDom.getElementById.mockReturnValue(mockDock);

      appUIController.updateGlobalUI({ dock: false });

      expect(mockDock.style.display).toBe('none');
    });

    it('should hide menu bar if settings.menuBar is false', () => {
      const mockMenuBar = document.createElement('div');
      mockMenuBar.id = 'menu-bar';
      mockDom.getElementById.mockReturnValue(mockMenuBar);

      appUIController.updateGlobalUI({ menuBar: false });

      expect(mockMenuBar.style.display).toBe('none');
    });

    it('should hide side nav if settings.sideNav is false', () => {
      const mockSideNav = document.createElement('div');
      mockSideNav.id = 'side-nav';
      mockDom.getElementById.mockReturnValue(mockSideNav);

      appUIController.updateGlobalUI({ sideNav: false });

      expect(mockSideNav.style.display).toBe('none');
    });
  });

  describe('restoreGlobalUI', () => {
    it('should restore dock if no apps require it hidden', () => {
      const mockDock = document.createElement('div');
      mockDock.id = 'dock';
      mockDom.getElementById.mockReturnValue(mockDock);

      appUIController.restoreGlobalUI();

      expect(mockDock.style.display).toBe('');
    });

    it('should keep dock hidden if other apps require it', () => {
      const mockDock = document.createElement('div');
      mockDock.id = 'dock';
      mockDom.getElementById.mockReturnValue(mockDock);

      appUIController.openApp('app-1', { dock: false });
      appUIController.openApp('app-2', { dock: false });

      appUIController.restoreGlobalUI();

      expect(mockDock.style.display).toBe('none');
    });
  });

  describe('getOpenApps', () => {
    it('should return array of open apps', () => {
      appUIController.openApp('app-1');
      appUIController.openApp('app-2');

      const openApps = appUIController.getOpenApps();

      expect(openApps).toHaveLength(2);
      expect(openApps[0].appId).toMatch(/app-/);
    });

    it('should return empty array if no apps open', () => {
      const openApps = appUIController.getOpenApps();

      expect(openApps).toEqual([]);
    });
  });

  describe('getAppInstance', () => {
    it('should return app instance by ID', () => {
      const instanceId = appUIController.openApp('test-app');

      const instance = appUIController.getAppInstance(instanceId);

      expect(instance).toBeDefined();
      expect(instance.appId).toBe('test-app');
    });

    it('should return null for non-existent instance', () => {
      const instance = appUIController.getAppInstance('nonexistent');

      expect(instance).toBeNull();
    });
  });

  describe('isAppOpen', () => {
    it('should return true if app has open instance', () => {
      appUIController.openApp('test-app');

      expect(appUIController.isAppOpen('test-app')).toBe(true);
    });

    it('should return false if app has no open instances', () => {
      expect(appUIController.isAppOpen('test-app')).toBe(false);
    });

    it('should return true if app has multiple instances', () => {
      appUIController.openApp('test-app', { multiInstance: true });
      appUIController.openApp('test-app', { multiInstance: true });

      expect(appUIController.isAppOpen('test-app')).toBe(true);
    });
  });

  describe('closeAppsByDefinitionId', () => {
    it('should close all instances of specific app', () => {
      vi.useFakeTimers();

      const id1 = appUIController.openApp('test-app', { multiInstance: true });
      const id2 = appUIController.openApp('test-app', { multiInstance: true });
      const id3 = appUIController.openApp('other-app', { multiInstance: true });

      appUIController.closeAppsByDefinitionId('test-app');

      vi.advanceTimersByTime(600);

      expect(appUIController.openApps.has(id1)).toBe(false);
      expect(appUIController.openApps.has(id2)).toBe(false);
      expect(appUIController.openApps.has(id3)).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('destroy', () => {
    it('should close all open apps', () => {
      vi.useFakeTimers();

      appUIController.openApp('app-1');
      appUIController.openApp('app-2');
      appUIController.openApp('app-3');

      appUIController.destroy();

      vi.advanceTimersByTime(600);

      expect(appUIController.openApps.size).toBe(0);

      vi.useRealTimers();
    });

    it('should clean up event listeners', () => {
      appUIController.openApp('app-1');
      appUIController.openApp('app-2');

      const initialCleanupCount = appUIController.cleanupFunctions.length;

      appUIController.destroy();

      expect(appUIController.cleanupFunctions.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle opening app without eventBus', () => {
      const controller = new AppUIController({
        containerElement: mockContainer,
        domHelper: mockDom
      });

      expect(() => {
        controller.openApp('test-app');
      }).not.toThrow();
    });

    it('should handle missing dimensions for popup', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'popup',
        position: 'center'
      });

      const instance = appUIController.openApps.get(instanceId);
      expect(instance.window.style.left).toBe('50%');
    });

    it('should handle custom position object', () => {
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'popup',
        position: { x: 100, y: 200 }
      });

      const instance = appUIController.openApps.get(instanceId);
      expect(instance.window.style.left).toBe('100px');
      expect(instance.window.style.top).toBe('200px');
    });

    it('should handle app without sourceWidget', () => {
      expect(() => {
        appUIController.openApp('test-app', {
          animation: 'expand-from-widget'
        }, null);
      }).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle full app lifecycle', () => {
      vi.useFakeTimers();

      // Open app
      const instanceId = appUIController.openApp('test-app', {
        displayMode: 'popup',
        showCloseButton: true
      });

      expect(appUIController.isAppOpen('test-app')).toBe(true);

      // Minimize app
      appUIController.minimizeApp(instanceId);
      const instance = appUIController.getAppInstance(instanceId);
      expect(instance.window.style.display).toBe('none');

      // Restore app
      appUIController.restoreApp(instanceId);
      expect(instance.window.style.display).toBe('');

      // Close app
      appUIController.closeApp(instanceId);
      vi.advanceTimersByTime(600);

      expect(appUIController.isAppOpen('test-app')).toBe(false);

      vi.useRealTimers();
    });

    it('should handle multiple apps with z-index management', () => {
      const id1 = appUIController.openApp('app-1');
      const id2 = appUIController.openApp('app-2');
      const id3 = appUIController.openApp('app-3');

      // Bring first app to front
      appUIController.bringToFront(id1);

      const instance1 = appUIController.getAppInstance(id1);
      const instance2 = appUIController.getAppInstance(id2);
      const instance3 = appUIController.getAppInstance(id3);

      expect(parseInt(instance1.window.style.zIndex)).toBeGreaterThan(parseInt(instance2.window.style.zIndex));
      expect(parseInt(instance1.window.style.zIndex)).toBeGreaterThan(parseInt(instance3.window.style.zIndex));
    });

    it('should handle global UI state across multiple apps', () => {
      const mockDock = document.createElement('div');
      mockDock.id = 'dock';
      mockDom.getElementById.mockReturnValue(mockDock);

      // Open app that hides dock
      const id1 = appUIController.openApp('app-1', { dock: false });
      expect(mockDock.style.display).toBe('none');

      // Open another app that also hides dock
      const id2 = appUIController.openApp('app-2', { dock: false });
      expect(mockDock.style.display).toBe('none');

      // Close first app - dock should stay hidden
      vi.useFakeTimers();
      appUIController.closeApp(id1);
      vi.advanceTimersByTime(600);
      expect(mockDock.style.display).toBe('none');

      // Close second app - dock should be restored
      appUIController.closeApp(id2);
      vi.advanceTimersByTime(600);
      expect(mockDock.style.display).toBe('');

      vi.useRealTimers();
    });
  });
});
