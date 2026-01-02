/**
 * WidgetUIController Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WidgetUIController } from './widget-ui-controller.js';
import { gridConfig } from '../data/widgets-static.js';

describe('WidgetUIController', () => {
  let widgetUIController;
  let mockEventBus;
  let mockDom;
  let mockAppUIController;
  let mockWidgetManager;
  let mockGridContainer;

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
      querySelectorAll: vi.fn(),
      createElement: vi.fn((tag, className, attrs = {}) => {
        const element = document.createElement(tag);
        element.className = className || '';
        Object.assign(element, attrs);
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
      createButton: vi.fn((text, className, onClick, attrs = {}) => {
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

    // Mock grid container
    mockGridContainer = document.createElement('div');
    mockGridContainer.id = 'widget-grid';

    // Mock AppUIController
    mockAppUIController = {
      openApp: vi.fn()
    };

    // Mock WidgetManager
    mockWidgetManager = {
      getWidget: vi.fn()
    };

    // Create controller
    widgetUIController = new WidgetUIController({
      eventBus: mockEventBus,
      domHelper: mockDom,
      gridContainer: mockGridContainer,
      appUIController: mockAppUIController,
      widgetManager: mockWidgetManager
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      expect(widgetUIController.eventBus).toBe(mockEventBus);
      expect(widgetUIController.dom).toBe(mockDom);
      expect(widgetUIController.appUIController).toBe(mockAppUIController);
      expect(widgetUIController.widgetManager).toBe(mockWidgetManager);
    });

    it('should initialize widget states map', () => {
      expect(widgetUIController.widgetStates).toBeInstanceOf(Map);
      expect(widgetUIController.widgetStates.size).toBe(0);
    });

    it('should setup event listeners', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('widget:clicked', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('widget:double-clicked', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('widget:long-pressed', expect.any(Function));
    });

    it('should initialize wiggle mode controller', () => {
      expect(widgetUIController.wiggleMode).toBeDefined();
    });

    it('should initialize interactions controller', () => {
      expect(widgetUIController.interactions).toBeDefined();
    });
  });

  describe('renderWidget', () => {
    let widgetInstance;
    let widgetDefinition;
    let mockCell;

    beforeEach(() => {
      widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cell: 1,
        cols: 1,
        rows: 1,
        size: '1x1',
        icon: '📊',
        name: 'Test Widget'
      };

      widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        icon: '📊',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1'
      };

      mockCell = document.createElement('div');
      mockCell.className = 'widget-cell empty';
      mockCell.dataset.cell = '1';

      mockDom.querySelector.mockReturnValue(mockCell);
    });

    it('should render widget in correct cell', () => {
      const result = widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      expect(result).toBeDefined();
      expect(mockDom.querySelector).toHaveBeenCalledWith('[data-cell="1"]');
    });

    it('should remove existing widget before re-rendering', () => {
      const existingWidget = document.createElement('div');
      existingWidget.dataset.widgetId = 'widget-1';
      mockCell.appendChild(existingWidget);

      mockDom.querySelector.mockImplementation((selector) => {
        if (selector === '[data-widget-id="widget-1"]') return existingWidget;
        if (selector === '[data-cell="1"]') return mockCell;
        return null;
      });

      widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      expect(mockDom.removeElement).toHaveBeenCalledWith(existingWidget);
    });

    it('should mark cells as occupied', () => {
      widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(mockCell, 'empty', false);
    });

    it('should render multi-cell widget with correct dimensions', () => {
      widgetInstance.cols = 2;
      widgetInstance.rows = 2;
      widgetInstance.size = '2x2';

      const widget = widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      expect(widget.style.width).toBe(`${2 * gridConfig.cellSize + gridConfig.gap}px`);
      expect(widget.style.height).toBe(`${2 * gridConfig.cellSize + gridConfig.gap}px`);
      expect(widget.style.position).toBe('absolute');
    });

    it('should set widget state to active', () => {
      widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      expect(widgetUIController.widgetStates.get('widget-1')).toBe('active');
    });

    it('should return null if cell not found', () => {
      mockDom.querySelector.mockReturnValue(null);

      const result = widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      expect(result).toBeNull();
    });
  });

  describe('createWidgetElement', () => {
    it('should create launcher widget for 1x1 app', () => {
      const widgetInstance = {
        id: 'app-1',
        widgetDefId: 'test-app',
        type: 'app',
        cols: 1,
        rows: 1,
        size: '1x1',
        icon: '🚀'
      };

      const widgetDefinition = {
        id: 'test-app',
        name: 'Test App',
        icon: '🚀',
        type: 'app',
        cols: 1,
        rows: 1,
        launchesApp: true
      };

      const spy = vi.spyOn(widgetUIController, 'createLauncherWidget');
      widgetUIController.createWidgetElement(widgetInstance, widgetDefinition);

      expect(spy).toHaveBeenCalledWith(widgetInstance, widgetDefinition);
    });

    it('should create minimal widget for 1x1 widget', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget',
        cols: 1,
        rows: 1
      };

      const spy = vi.spyOn(widgetUIController, 'createMinimalWidget');
      widgetUIController.createWidgetElement(widgetInstance, widgetDefinition);

      expect(spy).toHaveBeenCalledWith(widgetInstance, widgetDefinition);
    });

    it('should create full widget with hover header for Nx1 widget', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 2,
        rows: 1,
        size: '2x1'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget',
        cols: 2,
        rows: 1
      };

      const spy = vi.spyOn(widgetUIController, 'createFullWidget');
      widgetUIController.createWidgetElement(widgetInstance, widgetDefinition);

      expect(spy).toHaveBeenCalledWith(widgetInstance, widgetDefinition, 'hover');
    });

    it('should create full widget with always-visible header for Nx2+ widget', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 2,
        rows: 2,
        size: '2x2'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget',
        cols: 2,
        rows: 2
      };

      const spy = vi.spyOn(widgetUIController, 'createFullWidget');
      widgetUIController.createWidgetElement(widgetInstance, widgetDefinition);

      expect(spy).toHaveBeenCalledWith(widgetInstance, widgetDefinition, 'always');
    });

    it('should respect explicit headerDisplay never mode', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 2,
        rows: 2,
        size: '2x2'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget',
        cols: 2,
        rows: 2,
        headerDisplay: 'never'
      };

      const spy = vi.spyOn(widgetUIController, 'createFullWidget');
      widgetUIController.createWidgetElement(widgetInstance, widgetDefinition);

      expect(spy).toHaveBeenCalledWith(widgetInstance, widgetDefinition, 'never');
    });

    it('should respect explicit headerDisplay hover mode', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget',
        cols: 1,
        rows: 1,
        headerDisplay: 'hover'
      };

      const spy = vi.spyOn(widgetUIController, 'createFullWidget');
      widgetUIController.createWidgetElement(widgetInstance, widgetDefinition);

      expect(spy).toHaveBeenCalledWith(widgetInstance, widgetDefinition, 'hover');
    });

    it('should respect explicit headerDisplay always mode', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget',
        cols: 1,
        rows: 1,
        headerDisplay: 'always'
      };

      const spy = vi.spyOn(widgetUIController, 'createFullWidget');
      widgetUIController.createWidgetElement(widgetInstance, widgetDefinition);

      expect(spy).toHaveBeenCalledWith(widgetInstance, widgetDefinition, 'always');
    });
  });

  describe('createLauncherWidget', () => {
    it('should create launcher widget with icon only', () => {
      const widgetInstance = {
        id: 'app-1',
        widgetDefId: 'test-app',
        type: 'app',
        cols: 1,
        rows: 1,
        size: '1x1',
        icon: '🚀'
      };

      const widgetDefinition = {
        id: 'test-app',
        name: 'Test App',
        icon: '🚀',
        type: 'app',
        cols: 1,
        rows: 1,
        launchesApp: true
      };

      const widget = widgetUIController.createLauncherWidget(widgetInstance, widgetDefinition);

      expect(widget.classList.contains('widget-launcher')).toBe(true);
      expect(widget.dataset.widgetId).toBe('app-1');
      expect(widget.dataset.launchesApp).toBe('true');
    });

    it('should apply size classes', () => {
      const widgetInstance = {
        id: 'app-1',
        widgetDefId: 'test-app',
        type: 'app',
        cols: 1,
        rows: 1,
        size: '1x1',
        icon: '🚀'
      };

      const widgetDefinition = {
        id: 'test-app',
        name: 'Test App',
        icon: '🚀',
        type: 'app'
      };

      widgetUIController.createLauncherWidget(widgetInstance, widgetDefinition);

      expect(mockDom.toggleClass).toHaveBeenCalledWith(expect.anything(), 'widget-1x1', true);
      expect(mockDom.toggleClass).toHaveBeenCalledWith(expect.anything(), 'cols-1', true);
      expect(mockDom.toggleClass).toHaveBeenCalledWith(expect.anything(), 'rows-1', true);
      expect(mockDom.toggleClass).toHaveBeenCalledWith(expect.anything(), 'launchable', true);
    });
  });

  describe('createMinimalWidget', () => {
    it('should create minimal widget with icon and value', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1',
        icon: '📊'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        icon: '📊',
        type: 'widget'
      };

      const widget = widgetUIController.createMinimalWidget(widgetInstance, widgetDefinition);

      expect(widget.classList.contains('widget-minimal')).toBe(true);
      expect(widget.dataset.widgetId).toBe('widget-1');
    });
  });

  describe('createFullWidget', () => {
    it('should create full widget with header and content', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 2,
        rows: 2,
        size: '2x2',
        name: 'Test Widget'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        icon: '📊',
        type: 'widget'
      };

      const widget = widgetUIController.createFullWidget(widgetInstance, widgetDefinition, 'always');

      expect(widget.dataset.widgetId).toBe('widget-1');
      expect(widget.classList.contains('widget')).toBe(true);
    });

    it('should skip header when headerMode is never', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 2,
        rows: 2,
        size: '2x2'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget'
      };

      const spy = vi.spyOn(widgetUIController, 'createWidgetHeader');
      widgetUIController.createFullWidget(widgetInstance, widgetDefinition, 'never');

      expect(spy).not.toHaveBeenCalled();
    });

    it('should apply header-hover class for hover mode', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 2,
        rows: 1,
        size: '2x1'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget'
      };

      widgetUIController.createFullWidget(widgetInstance, widgetDefinition, 'hover');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(expect.anything(), 'header-hover', true);
    });

    it('should mark launchable widgets', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 2,
        rows: 2,
        size: '2x2'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget',
        launchesApp: 'some-app'
      };

      const widget = widgetUIController.createFullWidget(widgetInstance, widgetDefinition, 'always');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(widget, 'launchable', true);
      expect(widget.dataset.launchesApp).toBe('some-app');
    });
  });

  describe('setWidgetState', () => {
    it('should set widget state to active', () => {
      const mockWidget = document.createElement('div');
      mockWidget.id = 'widget-1';
      mockDom.getElementById.mockReturnValue(mockWidget);

      widgetUIController.setWidgetState('widget-1', 'active');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(mockWidget, 'active', true);
      expect(widgetUIController.widgetStates.get('widget-1')).toBe('active');
    });

    it('should set widget state to loading', () => {
      const mockWidget = document.createElement('div');
      mockWidget.id = 'widget-1';
      mockDom.getElementById.mockReturnValue(mockWidget);

      widgetUIController.setWidgetState('widget-1', 'loading');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(mockWidget, 'loading', true);
      expect(widgetUIController.widgetStates.get('widget-1')).toBe('loading');
    });

    it('should set widget state to error', () => {
      const mockWidget = document.createElement('div');
      mockWidget.id = 'widget-1';
      mockDom.getElementById.mockReturnValue(mockWidget);

      widgetUIController.setWidgetState('widget-1', 'error');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(mockWidget, 'error', true);
      expect(widgetUIController.widgetStates.get('widget-1')).toBe('error');
    });

    it('should remove previous state classes', () => {
      const mockWidget = document.createElement('div');
      mockWidget.id = 'widget-1';
      mockDom.getElementById.mockReturnValue(mockWidget);

      widgetUIController.setWidgetState('widget-1', 'loading');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(mockWidget, 'active', false);
      expect(mockDom.toggleClass).toHaveBeenCalledWith(mockWidget, 'error', false);
      expect(mockDom.toggleClass).toHaveBeenCalledWith(mockWidget, 'inactive', false);
    });

    it('should do nothing if widget element not found', () => {
      mockDom.getElementById.mockReturnValue(null);

      expect(() => {
        widgetUIController.setWidgetState('nonexistent', 'active');
      }).not.toThrow();
    });
  });

  describe('updateWidgetContent', () => {
    it('should update content with string', () => {
      const mockContent = document.createElement('div');
      mockContent.id = 'widget-1-content';
      mockDom.getElementById.mockReturnValue(mockContent);

      widgetUIController.updateWidgetContent('widget-1', '<p>Hello</p>');

      expect(mockContent.innerHTML).toBe('<p>Hello</p>');
    });

    it('should update content with element', () => {
      const mockContent = document.createElement('div');
      mockContent.id = 'widget-1-content';
      mockDom.getElementById.mockReturnValue(mockContent);

      const newContent = document.createElement('p');
      newContent.textContent = 'Hello';

      widgetUIController.updateWidgetContent('widget-1', newContent);

      expect(mockDom.clearChildren).toHaveBeenCalledWith(mockContent);
    });

    it('should set widget state to active after update', () => {
      const mockContent = document.createElement('div');
      mockDom.getElementById.mockReturnValue(mockContent);

      const spy = vi.spyOn(widgetUIController, 'setWidgetState');
      widgetUIController.updateWidgetContent('widget-1', 'content');

      expect(spy).toHaveBeenCalledWith('widget-1', 'active');
    });
  });

  describe('showLoading', () => {
    it('should show loading state', () => {
      const setStateSpy = vi.spyOn(widgetUIController, 'setWidgetState');
      const updateContentSpy = vi.spyOn(widgetUIController, 'updateWidgetContent');

      widgetUIController.showLoading('widget-1');

      expect(setStateSpy).toHaveBeenCalledWith('widget-1', 'loading');
      expect(updateContentSpy).toHaveBeenCalledWith('widget-1', '<div class="widget-loading">Loading...</div>');
    });
  });

  describe('showError', () => {
    it('should show error state with message', () => {
      const setStateSpy = vi.spyOn(widgetUIController, 'setWidgetState');
      const updateContentSpy = vi.spyOn(widgetUIController, 'updateWidgetContent');

      widgetUIController.showError('widget-1', 'Failed to load');

      expect(setStateSpy).toHaveBeenCalledWith('widget-1', 'error');
      expect(updateContentSpy).toHaveBeenCalledWith('widget-1', '<div class="widget-error">Failed to load</div>');
    });
  });

  describe('removeWidget', () => {
    it('should remove widget from DOM after animation', () => {
      vi.useFakeTimers();

      const mockWidget = document.createElement('div');
      mockWidget.id = 'widget-1';
      mockDom.getElementById.mockReturnValue(mockWidget);

      widgetUIController.widgetStates.set('widget-1', 'active');

      widgetUIController.removeWidget('widget-1');

      expect(mockDom.toggleClass).toHaveBeenCalledWith(mockWidget, 'removing', true);

      vi.advanceTimersByTime(300);

      expect(mockDom.removeElement).toHaveBeenCalledWith(mockWidget);
      expect(widgetUIController.widgetStates.has('widget-1')).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('getWidgetState', () => {
    it('should return widget state', () => {
      widgetUIController.widgetStates.set('widget-1', 'loading');

      expect(widgetUIController.getWidgetState('widget-1')).toBe('loading');
    });

    it('should return inactive for non-existent widget', () => {
      expect(widgetUIController.getWidgetState('nonexistent')).toBe('inactive');
    });
  });

  describe('handleWidgetClick', () => {
    it('should launch app for app-type widget', () => {
      const widgetInstance = { id: 'app-1' };
      const widgetDefinition = {
        id: 'test-app',
        type: 'app',
        displayMode: 'fullscreen'
      };

      const launchSpy = vi.spyOn(widgetUIController, 'launchApp');

      widgetUIController.handleWidgetClick(widgetInstance, widgetDefinition, new Event('click'));

      expect(launchSpy).toHaveBeenCalledWith(widgetDefinition);
    });

    it('should not launch app for non-app widget on single click', () => {
      const widgetInstance = { id: 'widget-1' };
      const widgetDefinition = {
        id: 'test-widget',
        type: 'widget'
      };

      const launchSpy = vi.spyOn(widgetUIController, 'launchApp');

      widgetUIController.handleWidgetClick(widgetInstance, widgetDefinition, new Event('click'));

      expect(launchSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleWidgetDoubleClick', () => {
    it('should launch app for app-type widget', () => {
      const widgetInstance = { id: 'app-1' };
      const widgetDefinition = {
        id: 'test-app',
        type: 'app',
        displayMode: 'fullscreen'
      };

      const launchSpy = vi.spyOn(widgetUIController, 'launchApp');

      widgetUIController.handleWidgetDoubleClick(widgetInstance, widgetDefinition, new Event('dblclick'));

      expect(launchSpy).toHaveBeenCalledWith(widgetDefinition);
    });

    it('should launch app from widget with launchesApp property', () => {
      const widgetInstance = { id: 'widget-1' };
      const widgetDefinition = {
        id: 'test-widget',
        type: 'widget',
        launchesApp: 'some-app'
      };

      const launchSpy = vi.spyOn(widgetUIController, 'launchAppFromWidget');

      widgetUIController.handleWidgetDoubleClick(widgetInstance, widgetDefinition, new Event('dblclick'));

      expect(launchSpy).toHaveBeenCalledWith(widgetInstance, widgetDefinition);
    });
  });

  describe('handleWidgetLongPress', () => {
    it('should launch app on long press if configured', () => {
      const widgetInstance = { id: 'widget-1' };
      const widgetDefinition = {
        id: 'test-widget',
        type: 'widget',
        launchesApp: 'some-app',
        launchTrigger: 'longPress'
      };

      const launchSpy = vi.spyOn(widgetUIController, 'launchAppFromWidget');

      widgetUIController.handleWidgetLongPress(widgetInstance, widgetDefinition, new Event('longpress'));

      expect(launchSpy).toHaveBeenCalledWith(widgetInstance, widgetDefinition);
    });

    it('should not launch app if launchTrigger is not longPress', () => {
      const widgetInstance = { id: 'widget-1' };
      const widgetDefinition = {
        id: 'test-widget',
        type: 'widget',
        launchesApp: 'some-app',
        launchTrigger: 'doubleClick'
      };

      const launchSpy = vi.spyOn(widgetUIController, 'launchAppFromWidget');

      widgetUIController.handleWidgetLongPress(widgetInstance, widgetDefinition, new Event('longpress'));

      expect(launchSpy).not.toHaveBeenCalled();
    });
  });

  describe('launchApp', () => {
    it('should launch app with default settings', () => {
      const appDefinition = {
        id: 'test-app',
        displayMode: 'fullscreen',
        animation: 'fade'
      };

      widgetUIController.launchApp(appDefinition);

      expect(mockAppUIController.openApp).toHaveBeenCalledWith('test-app', expect.objectContaining({
        displayMode: 'fullscreen',
        animation: 'fade'
      }));
    });

    it('should not crash if AppUIController not available', () => {
      widgetUIController.appUIController = null;

      expect(() => {
        widgetUIController.launchApp({ id: 'test-app' });
      }).not.toThrow();
    });
  });

  describe('launchAppFromWidget', () => {
    it('should launch app with widget element', () => {
      const widgetInstance = { id: 'widget-1' };
      const widgetDefinition = {
        id: 'test-widget',
        launchesApp: 'some-app',
        instanceSettingsOverride: { displayMode: 'popup' }
      };

      const mockWidget = document.createElement('div');
      mockDom.getElementById.mockReturnValue(mockWidget);

      widgetUIController.launchAppFromWidget(widgetInstance, widgetDefinition);

      expect(mockAppUIController.openApp).toHaveBeenCalledWith(
        'some-app',
        { displayMode: 'popup' },
        mockWidget
      );
    });

    it('should not crash if AppUIController not available', () => {
      widgetUIController.appUIController = null;

      expect(() => {
        widgetUIController.launchAppFromWidget(
          { id: 'widget-1' },
          { id: 'test-widget', launchesApp: 'some-app' }
        );
      }).not.toThrow();
    });

    it('should not crash if launchesApp not specified', () => {
      expect(() => {
        widgetUIController.launchAppFromWidget(
          { id: 'widget-1' },
          { id: 'test-widget' }
        );
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle missing cell gracefully', () => {
      const widgetInstance = { id: 'widget-1', cell: 999, cols: 1, rows: 1 };
      const widgetDefinition = { id: 'test-widget', type: 'widget' };

      mockDom.querySelector.mockReturnValue(null);

      const result = widgetUIController.renderWidget(widgetInstance, widgetDefinition);

      expect(result).toBeNull();
    });

    it('should handle widget without icon', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cols: 1,
        rows: 1,
        size: '1x1'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget'
      };

      expect(() => {
        widgetUIController.createMinimalWidget(widgetInstance, widgetDefinition);
      }).not.toThrow();
    });

    it('should handle multi-cell widget at grid boundary', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cell: 29,
        cols: 2,
        rows: 2,
        size: '2x2'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'widget'
      };

      const mockCell = document.createElement('div');
      mockCell.dataset.cell = '29';
      mockDom.querySelector.mockReturnValue(mockCell);

      expect(() => {
        widgetUIController.renderWidget(widgetInstance, widgetDefinition);
      }).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle full widget lifecycle', () => {
      const widgetInstance = {
        id: 'widget-1',
        widgetDefId: 'test-widget',
        type: 'widget',
        cell: 1,
        cols: 2,
        rows: 2,
        size: '2x2',
        name: 'Test Widget'
      };

      const widgetDefinition = {
        id: 'test-widget',
        name: 'Test Widget',
        icon: '📊',
        type: 'widget'
      };

      const mockCell = document.createElement('div');
      mockCell.dataset.cell = '1';
      mockDom.querySelector.mockReturnValue(mockCell);

      // Render widget
      const widget = widgetUIController.renderWidget(widgetInstance, widgetDefinition);
      expect(widget).toBeDefined();
      expect(widgetUIController.widgetStates.get('widget-1')).toBe('active');

      // Update content
      mockDom.getElementById.mockReturnValue(document.createElement('div'));
      widgetUIController.updateWidgetContent('widget-1', 'New content');

      // Show loading
      widgetUIController.showLoading('widget-1');
      expect(widgetUIController.widgetStates.get('widget-1')).toBe('loading');

      // Show error
      widgetUIController.showError('widget-1', 'Error message');
      expect(widgetUIController.widgetStates.get('widget-1')).toBe('error');
    });
  });
});
