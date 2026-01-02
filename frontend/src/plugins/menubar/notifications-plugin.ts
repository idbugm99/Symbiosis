/**
 * Notifications Plugin
 * Displays notification bell with badge count
 */

import { MenuBarPluginBase } from './plugin-base.js';
import type { MenuBarPluginConfig } from '../../types/index.js';

export class NotificationsPlugin extends MenuBarPluginBase {
  // Properties
  private notificationCount: number;
  private dropdownOpen: boolean;

  constructor(config: MenuBarPluginConfig, manager: any, dependencies: Record<string, any>) {
    super(config, manager, dependencies);

    this.notificationCount = 1; // Default count (for demo)
    this.dropdownOpen = false;
  }

  render(): HTMLElement {
    // Use existing topbar-icon-btn CSS class
    const container = document.createElement('div');
    container.className = 'topbar-icon-btn';
    if (this.notificationCount > 0) {
      container.classList.add('has-notification');
    }
    container.title = 'Notifications';
    container.setAttribute('aria-label', 'Notifications');
    container.addEventListener('click', () => this.toggleDropdown());

    // Bell icon
    container.textContent = '🔔';

    return container;
  }

  /**
   * Toggle notifications dropdown
   */
  toggleDropdown() {
    if (this.dropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Open notifications dropdown
   */
  openDropdown() {
    console.log('NotificationsPlugin: Opening dropdown');

    this.dropdownOpen = true;
    this.element.style.backgroundColor = 'rgba(243, 244, 246, 0.8)';

    // Create dropdown
    const dropdown = this.createDropdown();

    // Position dropdown
    dropdown.style.position = 'absolute';
    dropdown.style.top = 'calc(100% + 8px)';
    dropdown.style.right = '0';
    dropdown.style.width = '320px';
    dropdown.style.maxHeight = '400px';
    dropdown.style.backgroundColor = '#ffffff';
    dropdown.style.border = '1px solid #e5e7eb';
    dropdown.style.borderRadius = '8px';
    dropdown.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
    dropdown.style.zIndex = '2000';
    dropdown.style.overflow = 'auto';

    // Add dropdown to container
    this.element.style.position = 'relative';
    this.element.appendChild(dropdown);

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', this.handleClickOutside.bind(this), { once: true });
    }, 0);

    // //FUTURE: Emit event
    // this.emit('dropdown-opened', { pluginId: this.id });
  }

  /**
   * Close notifications dropdown
   */
  closeDropdown() {
    const dropdown = this.element.querySelector('.notifications-dropdown');
    if (dropdown) {
      dropdown.remove();
    }

    this.dropdownOpen = false;
    this.element.style.backgroundColor = 'transparent';

    console.log('NotificationsPlugin: Dropdown closed');
  }

  /**
   * Handle click outside dropdown
   * @param {Event} e - Click event
   */
  handleClickOutside(e) {
    if (!this.element.contains(e.target)) {
      this.closeDropdown();
    }
  }

  /**
   * Create dropdown content
   * @returns {HTMLElement} Dropdown element
   */
  createDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'notifications-dropdown';

    // Header
    const header = document.createElement('div');
    header.style.padding = '12px 16px';
    header.style.borderBottom = '1px solid #e5e7eb';
    header.style.fontWeight = '600';
    header.style.fontSize = '14px';
    header.textContent = 'Notifications';
    dropdown.appendChild(header);

    // Notifications list
    const notifications = this.getNotifications();

    if (notifications.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '32px 16px';
      empty.style.textAlign = 'center';
      empty.style.color = '#9ca3af';
      empty.textContent = 'No notifications';
      dropdown.appendChild(empty);
    } else {
      notifications.slice(0, this.settings.maxDisplay).forEach(notification => {
        const item = this.createNotificationItem(notification);
        dropdown.appendChild(item);
      });
    }

    // Footer (View All)
    if (notifications.length > this.settings.maxDisplay) {
      const footer = document.createElement('div');
      footer.style.padding = '12px 16px';
      footer.style.borderTop = '1px solid #e5e7eb';
      footer.style.textAlign = 'center';
      footer.style.fontSize = '14px';
      footer.style.color = '#2563eb';
      footer.style.cursor = 'pointer';
      footer.textContent = 'View All';
      footer.onclick = () => {
        console.log('NotificationsPlugin: View all notifications');
        // TODO: Navigate to notifications page
      };
      dropdown.appendChild(footer);
    }

    return dropdown;
  }

  /**
   * Create notification item
   * @param {Object} notification - Notification object
   * @returns {HTMLElement} Notification item element
   */
  createNotificationItem(notification) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.style.padding = '12px 16px';
    item.style.borderBottom = '1px solid #f3f4f6';
    item.style.cursor = 'pointer';
    item.style.transition = 'background-color 0.2s ease';

    // Icon + content
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.gap = '12px';

    // Icon
    const icon = document.createElement('span');
    icon.textContent = notification.icon || '📢';
    icon.style.fontSize = '20px';
    content.appendChild(icon);

    // Text
    const text = document.createElement('div');
    text.style.flex = '1';

    const title = document.createElement('div');
    title.style.fontSize = '14px';
    title.style.fontWeight = '500';
    title.textContent = notification.title;
    text.appendChild(title);

    const message = document.createElement('div');
    message.style.fontSize = '13px';
    message.style.color = '#6b7280';
    message.style.marginTop = '4px';
    message.textContent = notification.message;
    text.appendChild(message);

    const time = document.createElement('div');
    time.style.fontSize = '12px';
    time.style.color = '#9ca3af';
    time.style.marginTop = '4px';
    time.textContent = notification.time;
    text.appendChild(time);

    content.appendChild(text);
    item.appendChild(content);

    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f9fafb';
    });

    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });

    // Click handler
    item.onclick = () => {
      console.log('NotificationsPlugin: Notification clicked', notification);
      // TODO: Handle notification click
    };

    return item;
  }

  /**
   * Get notifications (mock data for now)
   * @returns {Array} Array of notification objects
   */
  getNotifications() {
    // TODO: Fetch from API
    return [
      {
        id: 1,
        icon: '✅',
        title: 'Analysis Complete',
        message: 'Your compound analysis has finished processing',
        time: '5 minutes ago',
        read: false
      }
    ];
  }

  /**
   * Update notification count
   * @param {Object} data - Update data
   */
  update(data: any): void {
    if (data.count !== undefined) {
      this.notificationCount = data.count;

      // Re-render to update badge
      this.refresh();
    }
  }

  /**
   * Refresh the plugin (re-render)
   */
  refresh() {
    if (this.element) {
      const newElement = this.render();
      this.element.replaceWith(newElement);
      this.element = newElement;
    }
  }
}
