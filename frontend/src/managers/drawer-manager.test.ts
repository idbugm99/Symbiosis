/**
 * DrawerManager Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DrawerManager } from './drawer-manager.js';

describe('DrawerManager', () => {
  let drawerManager;
  let mockEventBus;
  let mockDom;
  let mockWidgetDefinitions;

  beforeEach(() => {
    // Mock EventBus
    mockEventBus = {
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn()
    };

    // Mock widget definitions
    mockWidgetDefinitions = [
      {
        id: 'widget-1',
        name: 'Chemical Tracker',
        icon: '🧪',
        type: 'widget',
        cols: 2,
        rows: 2,
        size: '2x2',
        category: 'chemicals',
        description: 'Track chemicals'
      },
      {
        id: 'widget-2',
        name: 'Equipment Monitor',
        icon: '🔬',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1',
        category: 'equipment',
        description: 'Monitor equipment'
      },
      {
        id: 'app-1',
        name: 'AI Assistant',
        icon: '🤖',
        type: 'app',
        cols: 1,
        rows: 1,
        size: '1x1',
        category: 'ai',
        description: 'AI help'
      }
    ];

    // Mock DOM elements
    const createMockElement = (id) => {
      const el = document.createElement('div');
      el.id = id;
      return el;
    };

    // Mock DOM helper
    mockDom = {
      getElementById: vi.fn((id) => {
        const elements = {
          'widget-drawer': createMockElement('widget-drawer'),
          'drawer-overlay': createMockElement('drawer-overlay'),
          'toggle-drawer-btn': createMockElement('toggle-drawer-btn'),
          'close-drawer-btn': createMockElement('close-drawer-btn'),
          'tab-widgets': createMockElement('tab-widgets'),
          'tab-apps': createMockElement('tab-apps'),
          'widgets-content': createMockElement('widgets-content'),
          'apps-content': createMockElement('apps-content')
        };
        return elements[id] || null;
      }),
      querySelector: vi.fn(),
      createElement: vi.fn((tag, className, attrs = {}) => {
        const element = document.createElement(tag);
        element.className = className || '';
        if (attrs.draggable !== undefined) element.draggable = attrs.draggable;
        if (attrs.dataset) {
          Object.entries(attrs.dataset).forEach(([key, value]) => {
            element.dataset[key] = value;
          });
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

    // Create drawer manager
    drawerManager = new DrawerManager({
      eventBus: mockEventBus,
      widgetDefinitions: mockWidgetDefinitions,
      domHelper: mockDom
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      expect(drawerManager.eventBus).toBe(mockEventBus);
      expect(drawerManager.widgetDefinitions).toBe(mockWidgetDefinitions);
      expect(drawerManager.dom).toBe(mockDom);
    });

    it('should initialize state', () => {
      expect(drawerManager.isOpen).toBe(false);
      expect(drawerManager.currentTab).toBe('widgets');
      expect(drawerManager.currentDragWidget).toBeNull();
    });

    it('should setup event listeners', () => {
      expect(mockDom.addEventListener).toHaveBeenCalled();
    });

    it('should populate drawer on initialization', () => {
      expect(mockDom.clearChildren).toHaveBeenCalled();
    });

    it('should handle empty widget definitions', () => {
      const emptyDrawer = new DrawerManager({
        eventBus: mockEventBus,
        widgetDefinitions: [],
        domHelper: mockDom
      });

      expect(emptyDrawer.widgetDefinitions).toEqual([]);
    });
  });

  describe('open', () => {
    it('should open drawer', () => {
      drawerManager.open();

      expect(drawerManager.isOpen).toBe(true);
      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'open',
        true
      );
    });

    it('should make overlay visible', () => {
      drawerManager.open();

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'visible',
        true
      );
    });

    it('should emit drawer:opened event', () => {
      drawerManager.open();

      expect(mockEventBus.emit).toHaveBeenCalledWith('drawer:opened');
    });

    it('should handle missing drawer element', () => {
      mockDom.getElementById.mockReturnValue(null);

      expect(() => {
        drawerManager.open();
      }).not.toThrow();
    });
  });

  describe('close', () => {
    it('should close drawer', () => {
      drawerManager.open();
      drawerManager.close();

      expect(drawerManager.isOpen).toBe(false);
      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'open',
        false
      );
    });

    it('should hide overlay', () => {
      drawerManager.open();
      drawerManager.close();

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'visible',
        false
      );
    });

    it('should emit drawer:closed event', () => {
      drawerManager.open();
      mockEventBus.emit.mockClear();
      drawerManager.close();

      expect(mockEventBus.emit).toHaveBeenCalledWith('drawer:closed');
    });
  });

  describe('toggle', () => {
    it('should open drawer if closed', () => {
      const openSpy = vi.spyOn(drawerManager, 'open');

      drawerManager.toggle();

      expect(openSpy).toHaveBeenCalled();
    });

    it('should close drawer if open', () => {
      const closeSpy = vi.spyOn(drawerManager, 'close');

      drawerManager.open();
      drawerManager.toggle();

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('switchTab', () => {
    it('should switch to widgets tab', () => {
      drawerManager.currentTab = 'apps';

      drawerManager.switchTab('widgets');

      expect(drawerManager.currentTab).toBe('widgets');
    });

    it('should switch to apps tab', () => {
      drawerManager.switchTab('apps');

      expect(drawerManager.currentTab).toBe('apps');
    });

    it('should update tab button classes', () => {
      drawerManager.switchTab('apps');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        expect.anything(),
        'active',
        expect.any(Boolean)
      );
    });

    it('should update content visibility', () => {
      drawerManager.switchTab('apps');

      expect(mockDom.toggleClass).toHaveBeenCalled();
    });

    it('should emit drawer:tab-changed event', () => {
      drawerManager.switchTab('apps');

      expect(mockEventBus.emit).toHaveBeenCalledWith('drawer:tab-changed', 'apps');
    });

    it('should reject invalid tab names', () => {
      drawerManager.switchTab('invalid');

      expect(drawerManager.currentTab).toBe('widgets'); // Should stay on current
    });
  });

  describe('populate', () => {
    it('should populate widgets and apps', () => {
      drawerManager.populate();

      expect(mockDom.clearChildren).toHaveBeenCalled();
    });

    it('should separate widgets from apps', () => {
      const populateSpy = vi.spyOn(drawerManager, 'populateItems');

      drawerManager.populate();

      expect(populateSpy).toHaveBeenCalled();
    });

    it('should handle empty definitions', () => {
      drawerManager.widgetDefinitions = [];

      expect(() => {
        drawerManager.populate();
      }).not.toThrow();
    });

    it('should filter invalid definitions', () => {
      drawerManager.widgetDefinitions = [
        { id: 'valid', name: 'Valid', icon: '✓', type: 'widget', cols: 1, rows: 1 },
        { id: 'invalid', name: 'Invalid' }, // Missing required fields
        { id: 'valid2', name: 'Valid 2', icon: '✓', type: 'app', cols: 1, rows: 1 }
      ];

      expect(() => {
        drawerManager.populate();
      }).not.toThrow();
    });
  });

  describe('createDrawerItem', () => {
    it('should create drawer item element', () => {
      const item = mockWidgetDefinitions[0];

      const element = drawerManager.createDrawerItem(item);

      expect(element.classList.contains('widget-card')).toBe(true);
      expect(element.dataset.widgetId).toBe('widget-1');
      expect(element.dataset.widgetType).toBe('widget');
    });

    it('should make item draggable', () => {
      const item = mockWidgetDefinitions[0];

      const element = drawerManager.createDrawerItem(item);

      expect(element.draggable).toBe(true);
    });

    it('should add drag event listeners', () => {
      const item = mockWidgetDefinitions[0];

      drawerManager.createDrawerItem(item);

      expect(mockDom.addEventListener).toHaveBeenCalledWith(
        expect.anything(),
        'dragstart',
        expect.any(Function)
      );

      expect(mockDom.addEventListener).toHaveBeenCalledWith(
        expect.anything(),
        'dragend',
        expect.any(Function)
      );
    });

    it('should add click handler for adding widget', () => {
      const item = mockWidgetDefinitions[0];

      drawerManager.createDrawerItem(item);

      expect(mockDom.addEventListener).toHaveBeenCalledWith(
        expect.anything(),
        'click',
        expect.any(Function)
      );
    });

    it('should include description if provided', () => {
      const item = mockWidgetDefinitions[0];

      const element = drawerManager.createDrawerItem(item);

      expect(mockDom.createText).toHaveBeenCalledWith(
        'Track chemicals',
        'div',
        'widget-card-description'
      );
    });

    it('should include size badge', () => {
      const item = mockWidgetDefinitions[0];

      const element = drawerManager.createDrawerItem(item);

      expect(mockDom.createText).toHaveBeenCalledWith(
        '2x2',
        'div',
        expect.stringContaining('badge')
      );
    });
  });

  describe('handleDragStart', () => {
    it('should set current drag widget', () => {
      const item = mockWidgetDefinitions[0];
      const mockEvent = {
        target: document.createElement('div'),
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn()
        }
      };

      drawerManager.handleDragStart(mockEvent, item);

      expect(drawerManager.currentDragWidget).toBe(item);
    });

    it('should set data transfer', () => {
      const item = mockWidgetDefinitions[0];
      const mockEvent = {
        target: document.createElement('div'),
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn()
        }
      };

      drawerManager.handleDragStart(mockEvent, item);

      expect(mockEvent.dataTransfer.effectAllowed).toBe('copy');
      expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        JSON.stringify(item)
      );
    });

    it('should add dragging class', () => {
      const item = mockWidgetDefinitions[0];
      const mockEvent = {
        target: document.createElement('div'),
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn()
        }
      };

      drawerManager.handleDragStart(mockEvent, item);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        mockEvent.target,
        'dragging',
        true
      );
    });

    it('should emit drawer:drag-start event', () => {
      const item = mockWidgetDefinitions[0];
      const mockEvent = {
        target: document.createElement('div'),
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn()
        }
      };

      drawerManager.handleDragStart(mockEvent, item);

      expect(mockEventBus.emit).toHaveBeenCalledWith('drawer:drag-start', item);
    });
  });

  describe('handleDragEnd', () => {
    it('should clear current drag widget', () => {
      const mockEvent = {
        target: document.createElement('div')
      };

      drawerManager.currentDragWidget = mockWidgetDefinitions[0];

      drawerManager.handleDragEnd(mockEvent);

      expect(drawerManager.currentDragWidget).toBeNull();
    });

    it('should remove dragging class', () => {
      const mockEvent = {
        target: document.createElement('div')
      };

      drawerManager.handleDragEnd(mockEvent);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(
        mockEvent.target,
        'dragging',
        false
      );
    });

    it('should emit drawer:drag-end event', () => {
      const mockEvent = {
        target: document.createElement('div')
      };

      drawerManager.handleDragEnd(mockEvent);

      expect(mockEventBus.emit).toHaveBeenCalledWith('drawer:drag-end');
    });
  });

  describe('getCurrentDragWidget', () => {
    it('should return current drag widget', () => {
      drawerManager.currentDragWidget = mockWidgetDefinitions[0];

      const result = drawerManager.getCurrentDragWidget();

      expect(result).toBe(mockWidgetDefinitions[0]);
    });

    it('should return null if no drag in progress', () => {
      const result = drawerManager.getCurrentDragWidget();

      expect(result).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should refresh with new definitions', () => {
      const newDefinitions = [
        {
          id: 'widget-3',
          name: 'New Widget',
          icon: '📦',
          type: 'widget',
          cols: 1,
          rows: 1,
          size: '1x1',
          category: 'other'
        }
      ];

      drawerManager.refresh(newDefinitions);

      expect(drawerManager.widgetDefinitions).toBe(newDefinitions);
    });

    it('should repopulate drawer', () => {
      const populateSpy = vi.spyOn(drawerManager, 'populate');

      drawerManager.refresh(mockWidgetDefinitions);

      expect(populateSpy).toHaveBeenCalled();
    });

    it('should refresh without changing definitions', () => {
      const originalDefs = drawerManager.widgetDefinitions;
      const populateSpy = vi.spyOn(drawerManager, 'populate');

      drawerManager.refresh();

      expect(drawerManager.widgetDefinitions).toBe(originalDefs);
      expect(populateSpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should cleanup event listeners', () => {
      const initialCleanupCount = drawerManager.cleanupHandlers.length;

      expect(initialCleanupCount).toBeGreaterThan(0);

      drawerManager.destroy();

      expect(drawerManager.cleanupHandlers.length).toBe(0);
    });

    it('should reset state', () => {
      drawerManager.isOpen = true;
      drawerManager.currentDragWidget = mockWidgetDefinitions[0];

      drawerManager.destroy();

      expect(drawerManager.isOpen).toBe(false);
      expect(drawerManager.currentDragWidget).toBeNull();
    });
  });

  describe('formatCategoryName', () => {
    it('should format known categories', () => {
      expect(drawerManager.formatCategoryName('chemicals')).toBe('🧪 Chemicals');
      expect(drawerManager.formatCategoryName('equipment')).toBe('🔬 Equipment');
      expect(drawerManager.formatCategoryName('genetics')).toBe('🧬 Genetics');
      expect(drawerManager.formatCategoryName('ai')).toBe('🤖 AI Assistant');
    });

    it('should capitalize unknown categories', () => {
      expect(drawerManager.formatCategoryName('custom')).toBe('Custom');
    });
  });

  describe('edge cases', () => {
    it('should handle widget without category', () => {
      const widgetWithoutCategory = {
        id: 'widget-no-cat',
        name: 'No Category',
        icon: '📦',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1'
      };

      drawerManager.widgetDefinitions = [widgetWithoutCategory];

      expect(() => {
        drawerManager.populate();
      }).not.toThrow();
    });

    it('should handle widget without description', () => {
      const widgetWithoutDesc = {
        id: 'widget-no-desc',
        name: 'No Description',
        icon: '📦',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1',
        category: 'other'
      };

      expect(() => {
        drawerManager.createDrawerItem(widgetWithoutDesc);
      }).not.toThrow();
    });

    it('should handle missing DOM elements gracefully', () => {
      mockDom.getElementById.mockReturnValue(null);

      expect(() => {
        drawerManager.open();
        drawerManager.close();
        drawerManager.renderWorkspaceDots?.();
      }).not.toThrow();
    });

    it('should handle ESC key when drawer open', () => {
      drawerManager.open();

      const keydownHandler = mockDom.addEventListener.mock.calls.find(
        call => call[1] === 'keydown'
      );

      expect(keydownHandler).toBeDefined();

      const mockEvent = { key: 'Escape' };
      keydownHandler[2](mockEvent);

      expect(drawerManager.isOpen).toBe(false);
    });

    it('should not close on ESC when drawer already closed', () => {
      const keydownHandler = mockDom.addEventListener.mock.calls.find(
        call => call[1] === 'keydown'
      );

      const mockEvent = { key: 'Escape' };
      keydownHandler[2](mockEvent);

      expect(drawerManager.isOpen).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle full drawer workflow', () => {
      // Open drawer
      drawerManager.open();
      expect(drawerManager.isOpen).toBe(true);

      // Switch to apps tab
      drawerManager.switchTab('apps');
      expect(drawerManager.currentTab).toBe('apps');

      // Start dragging widget
      const item = mockWidgetDefinitions[0];
      const mockEvent = {
        target: document.createElement('div'),
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn()
        }
      };

      drawerManager.handleDragStart(mockEvent, item);
      expect(drawerManager.getCurrentDragWidget()).toBe(item);

      // End drag
      drawerManager.handleDragEnd(mockEvent);
      expect(drawerManager.getCurrentDragWidget()).toBeNull();

      // Close drawer
      drawerManager.close();
      expect(drawerManager.isOpen).toBe(false);
    });

    it('should handle click-to-add workflow', () => {
      const item = mockWidgetDefinitions[0];
      const element = drawerManager.createDrawerItem(item);

      // Find click handler
      const clickHandler = mockDom.addEventListener.mock.calls.find(
        call => call[1] === 'click'
      );

      expect(clickHandler).toBeDefined();

      // Simulate click
      drawerManager.isOpen = true;
      clickHandler[2]();

      // Should emit widget:added event
      expect(mockEventBus.emit).toHaveBeenCalledWith('widget:added', item);

      // Should close drawer
      expect(drawerManager.isOpen).toBe(false);
    });

    it('should handle category grouping', () => {
      drawerManager.widgetDefinitions = [
        { id: 'w1', name: 'W1', icon: '1', type: 'widget', cols: 1, rows: 1, category: 'chemicals' },
        { id: 'w2', name: 'W2', icon: '2', type: 'widget', cols: 1, rows: 1, category: 'chemicals' },
        { id: 'w3', name: 'W3', icon: '3', type: 'widget', cols: 1, rows: 1, category: 'equipment' }
      ];

      const populateSpy = vi.spyOn(drawerManager, 'createCategorySection');

      drawerManager.populate();

      // Should create multiple category sections
      expect(populateSpy).toHaveBeenCalled();
    });

    it('should handle rapid tab switching', () => {
      drawerManager.switchTab('apps');
      drawerManager.switchTab('widgets');
      drawerManager.switchTab('apps');
      drawerManager.switchTab('widgets');

      expect(drawerManager.currentTab).toBe('widgets');
      expect(mockEventBus.emit).toHaveBeenCalledWith('drawer:tab-changed', 'widgets');
    });

    it('should handle refresh during drag operation', () => {
      const item = mockWidgetDefinitions[0];
      drawerManager.currentDragWidget = item;

      const newDefinitions = [...mockWidgetDefinitions];
      drawerManager.refresh(newDefinitions);

      // Drag widget should not be cleared by refresh
      expect(drawerManager.currentDragWidget).toBe(item);
    });
  });

  describe('event handling', () => {
    it('should handle button clicks', () => {
      const toggleButton = mockDom.getElementById('toggle-drawer-btn');
      const closeButton = mockDom.getElementById('close-drawer-btn');

      expect(toggleButton).toBeDefined();
      expect(closeButton).toBeDefined();
    });

    it('should handle overlay clicks', () => {
      const overlayClickHandler = mockDom.addEventListener.mock.calls.find(
        call => call[0]?.id === 'drawer-overlay' && call[1] === 'click'
      );

      expect(overlayClickHandler).toBeDefined();
    });

    it('should handle tab button clicks', () => {
      const widgetsTabHandler = mockDom.addEventListener.mock.calls.find(
        call => call[0]?.id === 'tab-widgets' && call[1] === 'click'
      );

      const appsTabHandler = mockDom.addEventListener.mock.calls.find(
        call => call[0]?.id === 'tab-apps' && call[1] === 'click'
      );

      expect(widgetsTabHandler).toBeDefined();
      expect(appsTabHandler).toBeDefined();
    });
  });
});
