/**
 * DrawerManager
 * Manages the widget/app drawer UI component
 *
 * @class
 * @description Handles drawer state, item population, drag-and-drop interactions,
 * and tab switching. Emits events when users want to add widgets to the grid.
 *
 * @example
 * const drawerManager = new DrawerManager({
 *   eventBus: myEventBus,
 *   widgetDefinitions: availableWidgets,
 *   onAddWidget: (widgetData) => widgetManager.addWidget(widgetData, cellNum)
 * });
 *
 * drawerManager.toggle(); // Open/close drawer
 */

import { domHelper } from '../utils/dom-helpers.js';
import { isValidWidgetDefinition } from '../utils/validators.js';
import { CleanupManager } from '../utils/cleanup-manager.js';
import { EventNames } from './event-bus.js';
import { createLogger } from '../utils/logger.js';
import type {
  WidgetDefinition,
  DrawerManagerOptions,
  EventBus,
  DOMHelper
} from '../types/index.js';
import { WidgetType } from '../types/index.js';

const logger = createLogger('DrawerManager');

export class DrawerManager {
  // Properties
  private eventBus: EventBus | null;
  private widgetDefinitions: WidgetDefinition[];
  private dom: DOMHelper;
  private isOpen: boolean;
  private currentTab: 'widgets' | 'apps';
  private currentDragWidget: WidgetDefinition | null;
  private drawer: HTMLElement | null;
  private overlay: HTMLElement | null;
  private toggleBtn: HTMLElement | null;
  private closeBtn: HTMLElement | null;
  private widgetsTab: HTMLElement | null;
  private appsTab: HTMLElement | null;
  private widgetsContent: HTMLElement | null;
  private appsContent: HTMLElement | null;
  private cleanup: CleanupManager;

  /**
   * Create a DrawerManager instance
   * @constructor
   * @param {Object} options - Configuration options
   * @param {EventBus} options.eventBus - EventBus for event communication
   * @param {Array} options.widgetDefinitions - Available widgets/apps catalog
   * @param {Function} options.onAddWidget - Callback when widget is added to grid
   * @param {DOMHelper} options.domHelper - DOM helper instance (optional, for testing)
   */
  constructor(options: DrawerManagerOptions = {}) {
    this.eventBus = options.eventBus || null;
    this.widgetDefinitions = options.widgetDefinitions || [];
    this.dom = options.domHelper || domHelper;

    // State
    this.isOpen = false;
    this.currentTab = 'widgets'; // 'widgets' | 'apps'
    this.currentDragWidget = null;

    // DOM elements
    this.drawer = this.dom.getElementById('widget-drawer');
    this.overlay = this.dom.getElementById('drawer-overlay');
    this.toggleBtn = this.dom.getElementById('toggle-drawer-btn');
    this.closeBtn = this.dom.getElementById('close-drawer-btn');
    this.widgetsTab = this.dom.getElementById('tab-widgets');
    this.appsTab = this.dom.getElementById('tab-apps');
    this.widgetsContent = this.dom.getElementById('widgets-content');
    this.appsContent = this.dom.getElementById('apps-content');

    // Event cleanup handlers
    this.cleanup = new CleanupManager();

    // Initialize
    this.setupEventListeners();
    this.populate();
  }

  /**
   * Setup drawer event listeners
   * @private
   */
  setupEventListeners(): void {
    // Toggle button
    if (this.toggleBtn) {
      this.cleanup.add(this.dom.addEventListener(this.toggleBtn, 'click', () => this.toggle()));
    }

    // Close button
    if (this.closeBtn) {
      this.cleanup.add(this.dom.addEventListener(this.closeBtn, 'click', () => this.close()));
    }

    // Overlay click to close
    if (this.overlay) {
      this.cleanup.add(this.dom.addEventListener(this.overlay, 'click', () => this.close()));
    }

    // Tab switching
    if (this.widgetsTab) {
      this.cleanup.add(this.dom.addEventListener(this.widgetsTab, 'click', () => this.switchTab('widgets')));
    }

    if (this.appsTab) {
      this.cleanup.add(this.dom.addEventListener(this.appsTab, 'click', () => this.switchTab('apps')));
    }

    // Keyboard shortcut (Escape to close)
    const keydownHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    this.cleanup.add(this.dom.addEventListener(document, 'keydown', keydownHandler));
  }

  /**
   * Populate drawer with widgets and apps
   * @public
   */
  populate(): void {
    if (!this.widgetDefinitions || this.widgetDefinitions.length === 0) {
      logger.warn('No widget definitions provided');
      return;
    }

    // Filter and validate widget definitions
    const validDefinitions = this.widgetDefinitions.filter(item => {
      if (!isValidWidgetDefinition(item)) {
        logger.warn('Invalid widget definition:', item);
        return false;
      }
      return true;
    });

    // Separate widgets and apps
    const widgets = validDefinitions.filter(item => item.type === WidgetType.WIDGET);
    const apps = validDefinitions.filter(item => item.type === WidgetType.APP);

    // Populate widgets tab
    if (this.widgetsContent) {
      this.dom.clearChildren(this.widgetsContent);
      this.populateItems(widgets, this.widgetsContent);
    }

    // Populate apps tab
    if (this.appsContent) {
      this.dom.clearChildren(this.appsContent);
      this.populateItems(apps, this.appsContent);
    }

    logger.info(`Populated ${widgets.length} widgets, ${apps.length} apps`);
  }

  /**
   * Populate drawer section with items
   * @private
   * @param {Array} items - Widget or app definitions
   * @param {HTMLElement} container - Container element
   */
  populateItems(items: WidgetDefinition[], container: HTMLElement): void {
    // Group by category
    const categories: Record<string, WidgetDefinition[]> = {};
    items.forEach(item => {
      const category = item.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });

    // Render categories
    Object.keys(categories).sort().forEach(category => {
      const categorySection = this.createCategorySection(category, categories[category]);
      container.appendChild(categorySection);
    });
  }

  /**
   * Create category section
   * @private
   * @param {string} category - Category name
   * @param {Array} items - Items in category
   * @returns {HTMLElement} Category section element
   */
  createCategorySection(category: string, items: WidgetDefinition[]): HTMLElement {
    const section = this.dom.createElement('div', 'widget-category');

    // Category header
    const header = this.dom.createText(this.formatCategoryName(category), 'h3', 'category-title');
    section.appendChild(header);

    // Items grid
    const grid = this.dom.createElement('div', 'widget-list');

    items.forEach(item => {
      const itemElement = this.createDrawerItem(item);
      grid.appendChild(itemElement);
    });

    section.appendChild(grid);
    return section;
  }

  /**
   * Create drawer item element
   * @private
   * @param {Object} item - Widget or app definition
   * @returns {HTMLElement} Drawer item element
   */
  createDrawerItem(item: WidgetDefinition): HTMLElement {
    const itemDiv = this.dom.createElement('div', 'widget-card', {
      draggable: true,
      dataset: {
        widgetId: item.id,
        widgetType: item.type
      }
    });

    // Card header with icon and size badge
    const header = this.dom.createElement('div', 'widget-card-header');

    // Icon
    const icon = this.dom.createIcon(item.icon || '📦', 'widget-card-icon');
    header.appendChild(icon);

    // Size badge (positioned absolute in header)
    if (item.size) {
      const sizeBadge = this.dom.createText(item.size, 'div', 'widget-type-badge');
      header.appendChild(sizeBadge);
    }

    itemDiv.appendChild(header);

    // Name
    const name = this.dom.createText(item.name, 'div', 'widget-card-name');
    itemDiv.appendChild(name);

    // Description (optional)
    if (item.description) {
      const description = this.dom.createText(item.description, 'div', 'widget-card-description');
      itemDiv.appendChild(description);
    }

    // Footer with size
    const footer = this.dom.createElement('div', 'widget-card-footer');
    if (item.size) {
      const sizeLabel = this.dom.createText(item.size, 'div', 'widget-card-size');
      footer.appendChild(sizeLabel);
    }
    itemDiv.appendChild(footer);

    // Drag event listeners
    this.dom.addEventListener(itemDiv, 'dragstart', (e) => this.handleDragStart(e, item));
    this.dom.addEventListener(itemDiv, 'dragend', (e) => this.handleDragEnd(e));

    // Click to add (alternative to drag-and-drop)
    this.dom.addEventListener(itemDiv, 'click', () => {
      // Emit event instead of callback
      if (this.eventBus) {
        this.eventBus.emit(EventNames.WIDGET_ADDED, item);
      }
      this.close();
    });

    return itemDiv;
  }

  /**
   * Handle drag start
   * @private
   * @param {DragEvent} e - Drag event
   * @param {Object} widgetData - Widget definition
   */
  handleDragStart(e: DragEvent, widgetData: WidgetDefinition): void {
    this.currentDragWidget = widgetData;
    e.dataTransfer!.effectAllowed = 'copy';
    e.dataTransfer!.setData('text/plain', JSON.stringify(widgetData));

    // Add dragging class for visual feedback
    this.dom.toggleClass(e.target as Element, 'dragging', true);

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit(EventNames.DRAWER_DRAG_START, widgetData);
    }

    logger.info('Drawer: Started dragging', widgetData.name);
  }

  /**
   * Handle drag end
   * @private
   * @param {DragEvent} e - Drag event
   */
  handleDragEnd(e: DragEvent): void {
    this.dom.toggleClass(e.target as Element, 'dragging', false);
    this.currentDragWidget = null;

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit(EventNames.DRAWER_DRAG_END);
    }
  }

  /**
   * Format category name for display
   * @private
   * @param {string} category - Category slug
   * @returns {string} Formatted category name
   */
  formatCategoryName(category: string): string {
    const categoryNames = {
      chemicals: '🧪 Chemicals',
      equipment: '🔬 Equipment',
      genetics: '🧬 Genetics',
      vendors: '📦 Vendor Tools',
      ai: '🤖 AI Assistant',
      notes: '📓 Research Notes',
      other: '📁 Other'
    };

    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Toggle drawer open/closed
   * @public
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open drawer
   * @public
   * @fires drawer:opened
   */
  open(): void {
    if (!this.drawer || !this.overlay) return;

    this.isOpen = true;
    this.dom.toggleClass(this.drawer, 'open', true);
    this.dom.toggleClass(this.overlay, 'visible', true);

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit(EventNames.DRAWER_OPENED);
    }

    logger.info('Drawer opened');
  }

  /**
   * Close drawer
   * @public
   * @fires drawer:closed
   */
  close(): void {
    if (!this.drawer || !this.overlay) return;

    this.isOpen = false;
    this.dom.toggleClass(this.drawer, 'open', false);
    this.dom.toggleClass(this.overlay, 'visible', false);

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit(EventNames.DRAWER_CLOSED);
    }

    logger.info('Drawer closed');
  }

  /**
   * Switch between widgets and apps tabs
   * @public
   * @param {string} tab - Tab name ('widgets' or 'apps')
   * @fires drawer:tab-changed
   */
  switchTab(tab: 'widgets' | 'apps'): void {
    if (tab !== 'widgets' && tab !== 'apps') {
      logger.warn(`Invalid tab: ${tab}`);
      return;
    }

    this.currentTab = tab;

    // Update tab buttons
    if (this.widgetsTab && this.appsTab) {
      this.dom.toggleClass(this.widgetsTab, 'active', tab === 'widgets');
      this.dom.toggleClass(this.appsTab, 'active', tab === 'apps');
    }

    // Update content visibility
    if (this.widgetsContent && this.appsContent) {
      this.dom.toggleClass(this.widgetsContent, 'active', tab === 'widgets');
      this.dom.toggleClass(this.appsContent, 'active', tab === 'apps');
    }

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit(EventNames.DRAWER_TAB_CHANGED, tab);
    }

    logger.info(`Switched to ${tab} tab`);
  }

  /**
   * Get current dragging widget
   * @public
   * @returns {Object|null} Current drag widget or null
   */
  getCurrentDragWidget(): WidgetDefinition | null {
    return this.currentDragWidget;
  }

  /**
   * Refresh drawer contents
   * @public
   * @param {Array} newDefinitions - Updated widget definitions
   */
  refresh(newDefinitions?: WidgetDefinition[]): void {
    if (newDefinitions) {
      this.widgetDefinitions = newDefinitions;
    }
    this.populate();
  }

  /**
   * Destroy drawer manager (cleanup)
   * @public
   */
  destroy(): void {
    // Call all cleanup handlers to remove event listeners
    this.cleanup.cleanup();

    this.isOpen = false;
    this.currentDragWidget = null;
    logger.info('Destroyed');
  }
}
