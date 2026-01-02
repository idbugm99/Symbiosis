/**
 * DockManager - Manages the dock using the 'dockbar.js' web component.
 * This version focuses on correctly implementing the component for animations.
 * Reordering via SortableJS has been removed due to library conflicts.
 *
 * Refactored to use centralized utilities for:
 * - DOM access (domHelper)
 * - Validation (validators)
 * - Safe JSON parsing
 */

import { domHelper } from '../utils/dom-helpers.js';
import { validateDragData } from '../utils/validators.js';
import { createLogger } from '../utils/logger.js';
import type {
  DockApp,
  DockManagerOptions,
  StorageManager,
  EventBus,
  DOMHelper
} from '../types/index.js';
import { WidgetType, DockAppType } from '../types/index.js';

const logger = createLogger('DockManager');

export class DockManager {
  // Properties
  private storageManager: StorageManager;
  private eventBus: EventBus | null;
  private dom: DOMHelper;
  private dockApps: DockApp[];
  private editMode: boolean;
  private longPressTimer: number | null;
  private dockElement: HTMLElement | null;

  constructor(options: DockManagerOptions = {}) {
    this.storageManager = options.storageManager!;
    this.eventBus = options.eventBus || null;
    this.dom = options.domHelper || domHelper;
    this.dockApps = this.loadDockApps();

    // Edit mode state
    this.editMode = false;
    this.longPressTimer = null;

    this.init();
  }

  init(): void {
    // Find dock container element using DOM helper
    this.dockElement = this.dom.getElementById('desktop-dock');

    if (!this.dockElement) {
      logger.error('Dock container #desktop-dock not found');
      return;
    }

    logger.info('✅ Dock element found, setting up...');
    this.renderDock();
    this.setupDropZone();
    this.setupDockClickHandlers();
    this.setupExitEditModeListener();
  }

  loadDockApps(): DockApp[] {
    // Load from StorageManager with fallback to default apps
    const stored = this.storageManager.loadDockApps();

    if (stored) {
      return stored;
    }

    // Default dock apps
    return [
      { id: 'search', name: 'Search', icon: '🔍', type: 'system' },
      { id: 'notebook', name: 'Notebook', icon: '📓', type: 'system' },
      { id: 'equipment', name: 'Equipment', icon: '🔬', type: 'system' },
      { type: 'divider' },
      { id: 'settings', name: 'Settings', icon: '⚙️', type: 'system' }
    ];
  }

  saveDockApps(): void {
    // Save through StorageManager (automatically syncs dock order)
    this.storageManager.saveDockApps(this.dockApps);
    logger.info('Dock apps saved:', this.dockApps);
  }

  renderDock(): void {
    // Clear dock using DOM helper
    this.dom.clearChildren(this.dockElement!);

    this.dockApps.forEach(app => {
      // The dockbar library uses a <hr> for the divider
      if (app.type === DockAppType.DIVIDER) {
        const divider = this.dom.createElement('hr');
        this.dockElement!.appendChild(divider);
        return;
      }

      const dockItem = this.createAppElement(app);
      this.dockElement!.appendChild(dockItem);
    });
  }

  createAppElement(app: DockApp): HTMLElement {
    // Create dock item using DOM helper
    const dockItem = this.dom.createElement('div', 'dock-item', {
      dataset: {
        app: app.id,
        appName: app.name
      }
    });

    // Create icon
    const icon = this.dom.createIcon(app.icon, 'dock-icon');

    // Create tooltip
    const tooltip = this.dom.createText(app.name, 'div', 'dock-item-tooltip');

    // Append children
    this.dom.appendChildren(dockItem, [icon, tooltip]);

    // Long-press handlers for edit mode (2 second hold)
    this.dom.addEventListener(icon, 'mousedown', () => {
      if (!this.editMode) {
        this.longPressTimer = setTimeout(() => {
          this.enterEditMode();
        }, 2000); // 2 seconds
      }
    });

    this.dom.addEventListener(icon, 'mouseup', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });

    this.dom.addEventListener(icon, 'mouseleave', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });

    // Touch events for mobile
    this.dom.addEventListener(icon, 'touchstart', () => {
      if (!this.editMode) {
        this.longPressTimer = setTimeout(() => {
          this.enterEditMode();
        }, 2000);
      }
    });

    this.dom.addEventListener(icon, 'touchend', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });

    // Add click handler with proper cleanup tracking
    this.dom.addEventListener(dockItem, 'click', (e) => {
      e.preventDefault();

      // Don't open apps when in edit mode (prevents app launch after long-press)
      if (this.editMode) {
        logger.info('Click ignored - in edit mode');
        return;
      }

      // Emit event instead of calling callback
      if (this.eventBus) {
        this.eventBus.emit('dock:app-clicked', app);
      }
    });

    return dockItem;
  }

  /**
   * Setup click handlers for existing dock items in HTML
   */
  setupDockClickHandlers(): void {
    const dockItems = this.dom.querySelectorAll('.dock-item');

    dockItems.forEach(item => {
      const appId = item.dataset.app;
      const appName = item.dataset.appName;

      if (!appId) return;

      this.dom.addEventListener(item, 'click', (e) => {
        e.preventDefault();

        // Don't open apps when in edit mode (prevents app launch after long-press)
        if (this.editMode) {
          logger.info('Click ignored - in edit mode');
          return;
        }

        logger.info(`Dock item clicked: ${appId}`);

        // Create app object for event
        const iconElement = this.dom.querySelector('.dock-icon');
        const app = {
          id: appId,
          name: appName || appId,
          icon: iconElement?.textContent || '📱',
          type: 'system'
        };

        // Emit event instead of calling callback
        if (this.eventBus) {
          this.eventBus.emit('dock:app-clicked', app);
        }
      });
    });

    logger.info(`✅ Set up click handlers for ${dockItems.length} dock items`);
  }

  setupDropZone(): void {
    this.dom.addEventListener(this.dockElement!, 'dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.dom.toggleClass(this.dockElement!, 'dock-drag-over', true);
    });

    this.dom.addEventListener(this.dockElement!, 'dragleave', () => {
      this.dom.toggleClass(this.dockElement!, 'dock-drag-over', false);
    });

    this.dom.addEventListener(this.dockElement!, 'drop', (e) => {
      e.preventDefault();
      this.dom.toggleClass(this.dockElement!, 'dock-drag-over', false);

      // Use validator to validate and parse drag data
      const widgetData = validateDragData(e.dataTransfer.getData('text/plain'));

      if (!widgetData) {
        logger.info('Invalid drag data');
        return;
      }

      // Only allow 1×1 apps to be added to dock
      if (widgetData.cols === 1 && widgetData.rows === 1 && widgetData.type === WidgetType.APP) {
        this.addApp(widgetData);
      } else {
        alert('Only 1×1 apps can be added to the dock.');
      }
    });
  }

  addApp(widgetData: any): void {
    // Check for duplicates
    if (this.dockApps.find(app => app.id === widgetData.id)) {
      alert(`${widgetData.name} is already in the dock.`);
      return;
    }

    // Find divider position to insert before it
    const dividerIndex = this.dockApps.findIndex(app => app.type === DockAppType.DIVIDER);

    const dockApp = {
      id: widgetData.id,
      name: widgetData.name,
      icon: widgetData.icon,
      type: 'widget'
    };

    // Insert before divider or at end
    if (dividerIndex !== -1) {
      this.dockApps.splice(dividerIndex, 0, dockApp);
    } else {
      this.dockApps.push(dockApp);
    }

    this.saveDockApps();
    this.renderDock();
    this.setupDockClickHandlers(); // Re-setup click handlers after render
    logger.info(`Added ${widgetData.name} to dock`);
  }

  removeApp(appId: string): void {
    // For future use: a way to remove apps, perhaps a context menu
    this.dockApps = this.dockApps.filter(a => a.id !== appId);
    this.saveDockApps();
    this.renderDock();
    this.setupDockClickHandlers(); // Re-setup click handlers after render
    logger.info(`Removed app ${appId}`);
  }

  /**
   * Enter edit mode (wiggle mode) for the dock
   */
  enterEditMode(): void {
    this.editMode = true;
    this.dom.toggleClass(this.dockElement!, 'dock-edit-mode', true);

    // Add delete buttons to non-permanent dock items
    const dockItems = this.dom.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
      const appId = item.dataset.app;
      const isPermanent = item.dataset.permanent === 'true';

      // Only add delete buttons to non-permanent items
      if (!isPermanent && !item.querySelector('.dock-remove-btn')) {
        const removeBtn = this.dom.createElement('div', 'dock-remove-btn');
        removeBtn.innerHTML = '×';

        this.dom.addEventListener(removeBtn, 'click', (e) => {
          e.stopPropagation();
          this.handleRemoveApp(appId, item);
        });

        item.appendChild(removeBtn);
      }
    });

    logger.info('Entered edit mode (wiggle mode)');
  }

  /**
   * Exit edit mode (wiggle mode) for the dock
   */
  exitEditMode(): void {
    this.editMode = false;
    this.dom.toggleClass(this.dockElement!, 'dock-edit-mode', false);

    // Remove all delete buttons
    const removeButtons = this.dockElement!.querySelectorAll('.dock-remove-btn');
    removeButtons.forEach(btn => this.dom.removeElement(btn));

    logger.info('Exited edit mode');
  }

  /**
   * Handle removing an app from the dock with confirmation
   * @param {string} appId - App ID to remove
   * @param {HTMLElement} item - DOM element of the dock item
   */
  handleRemoveApp(appId: string, item: HTMLElement): void {
    if (confirm('Remove this app from the dock?')) {
      // Add removal animation
      this.dom.toggleClass(item, 'dock-item-removing', true);

      setTimeout(() => {
        this.removeApp(appId);
        this.exitEditMode();
      }, 300);
    }
  }

  /**
   * Setup listener to exit edit mode when clicking outside the dock
   */
  setupExitEditModeListener(): void {
    this.dom.addEventListener(document, 'click', (e) => {
      if (this.editMode && !this.dockElement!.contains(e.target as Node)) {
        this.exitEditMode();
      }
    });
  }

  /**
   * Cleanup method for removing event listeners
   */
  destroy(): void {
    // Event listeners added with dom.addEventListener are tracked
    // and can be cleaned up if needed in the future
    this.dockApps = [];
    logger.info('Destroyed');
  }
}
