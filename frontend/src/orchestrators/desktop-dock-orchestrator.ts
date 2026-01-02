import Sortable from 'sortablejs';
import { createLogger } from '../utils/logger.js';
import type { StorageManager } from '../types/index.js';

const logger = createLogger('DesktopDockOrchestrator');

export class DesktopDockOrchestrator {
  // Properties
  private storageManager: StorageManager;
  private BASE_SIZE: number;
  private MAX_SCALE: number;
  private INFLUENCE_RANGE: number;
  private EXPANDED_PADDING: number;
  private editMode: boolean;
  private longPressTimer: NodeJS.Timeout | null;
  private sortable: Sortable | null;
  private dock: HTMLElement | null;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;

    // Dock configuration
    this.BASE_SIZE = 64;
    this.MAX_SCALE = 1.4;
    this.INFLUENCE_RANGE = 120;
    this.EXPANDED_PADDING = 22;

    // State
    this.editMode = false;
    this.longPressTimer = null;
    this.sortable = null;
    this.dock = null;
  }

  /**
   * Initialize dock magnification and edit mode
   */
  initialize(): void {
    this.dock = document.getElementById('desktop-dock');
    if (!this.dock) {
      logger.warn('Dock element not found');
      return;
    }

    this.initSortable();
    this.setupLongPressDetection();
    this.setupClickOutsideHandler();
    this.setupMagnificationEffect();
    this.restoreDockOrder();

    logger.info('✅ Dock magnification and edit mode initialized');
  }

  /**
   * Initialize SortableJS for drag-and-drop reordering
   */
  initSortable(): void {
    if (this.sortable) {
      this.sortable.destroy();
    }

    this.sortable = Sortable.create(this.dock, {
      animation: 200,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      ghostClass: 'dock-item-ghost',
      dragClass: 'dock-item-dragging',
      disabled: true, // Start disabled, enable in edit mode

      onEnd: (evt) => {
        if (evt.oldIndex !== evt.newIndex) {
          this.saveDockOrder();
        }
      }
    });
  }

  /**
   * Enter edit mode (show remove buttons, enable sorting)
   */
  enterEditMode(): void {
    this.editMode = true;
    this.dock.classList.add('dock-edit-mode');

    // Reset all transforms from magnification
    this.dock.querySelectorAll('.dock-item').forEach((item) => {
      item.style.transform = '';
      item.style.width = `${this.BASE_SIZE}px`;
      item.style.height = `${this.BASE_SIZE}px`;
    });

    // Reset dock padding
    this.dock.style.paddingTop = '16px';
    this.dock.style.paddingBottom = '16px';

    // Enable sortable
    if (this.sortable) {
      this.sortable.option('disabled', false);
    }

    // Add remove buttons to non-permanent items only
    this.dock.querySelectorAll('.dock-item').forEach(item => {
      const isPermanent = item.dataset.permanent === 'true';

      if (!isPermanent && !item.querySelector('.dock-remove-btn')) {
        const removeBtn = document.createElement('div');
        removeBtn.className = 'dock-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeApp(item);
        });
        item.appendChild(removeBtn);
      }
    });

    logger.info('Dock edit mode: ENABLED');
  }

  /**
   * Exit edit mode (hide remove buttons, disable sorting)
   */
  exitEditMode(): void {
    this.editMode = false;
    this.dock.classList.remove('dock-edit-mode');

    // Disable sortable
    if (this.sortable) {
      this.sortable.option('disabled', true);
    }

    // Remove all remove buttons
    this.dock.querySelectorAll('.dock-remove-btn').forEach(btn => btn.remove());

    logger.info('Dock edit mode: DISABLED');
  }

  /**
   * Remove an app from dock with confirmation
   */
  removeApp(item: HTMLElement): void {
    if (confirm('Remove this app from the dock?')) {
      item.classList.add('dock-item-removing');
      setTimeout(() => {
        item.remove();
        this.saveDockOrder();
        this.exitEditMode();
      }, 300);
    }
  }

  /**
   * Save dock order to localStorage (via StorageManager)
   */
  saveDockOrder(): void {
    const order = Array.from(this.dock.querySelectorAll('.dock-item')).map((item: any) =>
      item.dataset.app
    );
    this.storageManager.saveDockOrder(order);
  }

  /**
   * Setup long-press detection for all dock items
   */
  setupLongPressDetection(): void {
    this.dock.querySelectorAll('.dock-item').forEach(item => {
      this.setupLongPressForItem(item);
    });
  }

  /**
   * Setup long-press detection for a single dock item
   */
  setupLongPressForItem(dockItem: HTMLElement): void {
    if (dockItem.dataset.permanent === 'true') return;

    const icon = dockItem.querySelector('.dock-icon');
    if (!icon) return;

    icon.addEventListener('mousedown', () => {
      if (!this.editMode) {
        this.longPressTimer = setTimeout(() => {
          this.enterEditMode();
        }, 2000); // 2 seconds
      }
    });

    icon.addEventListener('mouseup', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });

    icon.addEventListener('mouseleave', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });
  }

  /**
   * Setup click outside handler to exit edit mode
   */
  setupClickOutsideHandler(): void {
    document.addEventListener('click', (e) => {
      if (this.editMode && !this.dock.contains(e.target)) {
        this.exitEditMode();
      }
    });
  }

  /**
   * Setup dock magnification effect
   */
  setupMagnificationEffect(): void {
    // Expand padding on mouse enter
    this.dock.addEventListener('mouseenter', () => {
      if (!this.editMode) {
        this.dock.style.paddingTop = `${this.EXPANDED_PADDING}px`;
        this.dock.style.paddingBottom = `${this.EXPANDED_PADDING}px`;
      }
    });

    // Magnify items based on cursor distance
    this.dock.addEventListener('mousemove', (e) => {
      if (this.editMode) return; // Disable magnification in edit mode

      const mouseX = e.clientX;
      const dockItems = Array.from(this.dock.querySelectorAll('.dock-item'));

      dockItems.forEach((item: any) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterX = itemRect.left + itemRect.width / 2;
        const distance = Math.abs(mouseX - itemCenterX);

        let scale = 1;
        if (distance < this.INFLUENCE_RANGE) {
          const normalizedDistance = distance / this.INFLUENCE_RANGE;
          scale = 1 + (this.MAX_SCALE - 1) * (1 - normalizedDistance);
        }

        item.style.transform = `scale(${scale})`;
        item.style.width = `${this.BASE_SIZE}px`;
        item.style.height = `${this.BASE_SIZE * scale}px`;
      });
    });

    // Reset magnification on mouse leave
    this.dock.addEventListener('mouseleave', () => {
      this.dock.style.paddingTop = '16px';
      this.dock.style.paddingBottom = '16px';

      this.dock.querySelectorAll('.dock-item').forEach((item) => {
        item.style.transform = 'scale(1)';
        item.style.width = `${this.BASE_SIZE}px`;
        item.style.height = `${this.BASE_SIZE}px`;
      });
    });
  }

  /**
   * Restore dock order from localStorage (via StorageManager)
   */
  restoreDockOrder(): void {
    const savedOrder = this.storageManager.loadDockOrder();
    if (!savedOrder) return;

    try {
      const dockItems = Array.from(this.dock.querySelectorAll('.dock-item'));

      // Create a map of current items by app ID
      const itemMap: any = {};
      dockItems.forEach((item: any) => {
        const appId = item.dataset.app;
        if (appId) {
          itemMap[appId] = item;
        }
      });

      // Reorder items according to saved order
      savedOrder.forEach(appId => {
        if (itemMap[appId]) {
          this.dock.appendChild(itemMap[appId]);
        }
      });

      logger.info('✅ Dock order restored from localStorage');
    } catch (error) {
      logger.error('Failed to restore dock order:', error);
    }
  }

  /**
   * Update long-press detection for dynamically added dock items
   * Call this when new items are added to the dock
   */
  refreshDockItems(): void {
    this.setupLongPressDetection();
  }
}
