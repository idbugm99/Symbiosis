/**
 * User Menu Plugin
 * Displays user avatar and dropdown menu
 */

import { MenuBarPluginBase } from './plugin-base.js';
import { createLogger } from '../../utils/logger.js';
import type { MenuBarPluginConfig, User } from '../../types/index.js';

const logger = createLogger('UserMenuPlugin');

export class UserMenuPlugin extends MenuBarPluginBase {
  // Properties
  private dropdownOpen: boolean;
  private user: User | null;

  constructor(config: MenuBarPluginConfig, manager: any, dependencies: Record<string, any>) {
    super(config, manager, dependencies);

    this.dropdownOpen = false;
    this.user = null; // User data (loaded from API or storage)
  }

  init(): void {
    super.init();

    // Load user data
    this.loadUserData();
  }

  render(): HTMLElement {
    // Use existing topbar-user CSS class
    const container = document.createElement('div');
    container.className = 'topbar-user';
    container.id = 'topbar-user';
    container.addEventListener('click', () => this.toggleDropdown());

    // User avatar
    const avatar = document.createElement('div');
    avatar.className = 'topbar-user-avatar';
    avatar.id = 'user-avatar';
    avatar.textContent = this.getUserInitial();
    container.appendChild(avatar);

    // User name
    if (this.settings.showName && this.user) {
      const name = document.createElement('span');
      name.className = 'topbar-user-name';
      name.id = 'user-name';
      name.textContent = this.user.name || 'User';
      container.appendChild(name);
    }

    // TODO: Add dropdown menu structure (user-dropdown-menu)
    // The existing HTML has a dropdown menu with user info and actions
    // For now, we'll let the toggleDropdown() method handle creating it

    return container;
  }

  /**
   * Get user initial for avatar
   * @returns {string} User initial
   */
  getUserInitial() {
    if (this.user && this.user.name) {
      return this.getInitials(this.user.name);
    }
    return 'U';
  }

  /**
   * Create user avatar
   * @returns {HTMLElement} Avatar element
   */
  createAvatar() {
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';

    // Avatar styling
    const size = 32;
    avatar.style.width = `${size}px`;
    avatar.style.height = `${size}px`;
    avatar.style.borderRadius = this.getAvatarBorderRadius();
    avatar.style.backgroundColor = '#2563eb';
    avatar.style.color = '#ffffff';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '14px';
    avatar.style.fontWeight = '600';

    // Use initials if no avatar image
    if (this.user && this.user.avatarUrl) {
      avatar.style.backgroundImage = `url(${this.user.avatarUrl})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
    } else if (this.user && this.user.name) {
      avatar.textContent = this.getInitials(this.user.name);
    } else {
      avatar.textContent = 'U';
    }

    return avatar;
  }

  /**
   * Get avatar border radius based on style
   * @returns {string} Border radius CSS value
   */
  getAvatarBorderRadius() {
    const styles = {
      'circle': '50%',
      'square': '0',
      'rounded': '6px'
    };

    return styles[this.settings.avatarStyle] || styles['circle'];
  }

  /**
   * Get initials from name
   * @param {string} name - User name
   * @returns {string} Initials (max 2 letters)
   */
  getInitials(name) {
    const parts = name.trim().split(' ');

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Get color for role badge
   * @param {string} role - User role
   * @returns {string} Color hex code
   */
  getRoleColor(role) {
    const colors = {
      'admin': '#ef4444',
      'moderator': '#f59e0b',
      'user': '#3b82f6',
      'guest': '#6b7280'
    };

    return colors[role] || colors['user'];
  }

  /**
   * Toggle user menu dropdown
   */
  toggleDropdown() {
    if (this.dropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Open user menu dropdown
   */
  openDropdown() {
    logger.info('Opening dropdown');

    this.dropdownOpen = true;
    this.element.style.backgroundColor = 'rgba(243, 244, 246, 0.8)';

    // Create dropdown
    const dropdown = this.createDropdown();

    // Position dropdown
    dropdown.style.position = 'absolute';
    dropdown.style.top = 'calc(100% + 8px)';
    dropdown.style.right = '0';
    dropdown.style.minWidth = '220px';
    dropdown.style.backgroundColor = '#ffffff';
    dropdown.style.border = '1px solid #e5e7eb';
    dropdown.style.borderRadius = '8px';
    dropdown.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
    dropdown.style.zIndex = '2000';

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
   * Close user menu dropdown
   */
  closeDropdown() {
    const dropdown = this.element.querySelector('.user-menu-dropdown');
    if (dropdown) {
      dropdown.remove();
    }

    this.dropdownOpen = false;
    this.element.style.backgroundColor = 'transparent';

    logger.info('Dropdown closed');
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
    dropdown.className = 'user-menu-dropdown';

    // User info section
    if (this.user) {
      const userInfo = document.createElement('div');
      userInfo.style.padding = '12px 16px';
      userInfo.style.borderBottom = '1px solid #e5e7eb';

      const userName = document.createElement('div');
      userName.style.fontWeight = '600';
      userName.style.fontSize = '14px';
      userName.textContent = this.user.name;
      userInfo.appendChild(userName);

      const userEmail = document.createElement('div');
      userEmail.style.fontSize = '13px';
      userEmail.style.color = '#6b7280';
      userEmail.style.marginTop = '2px';
      userEmail.textContent = this.user.email;
      userInfo.appendChild(userEmail);

      dropdown.appendChild(userInfo);
    }

    // Menu items
    const menuItems = this.getMenuItems();

    menuItems.forEach(item => {
      const menuItem = this.createMenuItem(item);
      dropdown.appendChild(menuItem);
    });

    return dropdown;
  }

  /**
   * Create menu item
   * @param {Object} item - Menu item config
   * @returns {HTMLElement} Menu item element
   */
  createMenuItem(item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'user-menu-item';
    menuItem.style.padding = '10px 16px';
    menuItem.style.fontSize = '14px';
    menuItem.style.cursor = 'pointer';
    menuItem.style.transition = 'background-color 0.2s ease';
    menuItem.style.display = 'flex';
    menuItem.style.alignItems = 'center';
    menuItem.style.gap = '8px';

    // Icon
    if (item.icon) {
      const icon = document.createElement('span');
      icon.textContent = item.icon;
      icon.style.fontSize = '16px';
      menuItem.appendChild(icon);
    }

    // Label
    const label = document.createElement('span');
    label.textContent = item.label;
    menuItem.appendChild(label);

    // Hover effect
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = '#f9fafb';
    });

    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent';
    });

    // Click handler
    menuItem.onclick = () => {
      logger.info('Menu item clicked', item.action);
      item.onClick();
      this.closeDropdown();
    };

    // Separator
    if (item.separator) {
      menuItem.style.borderBottom = '1px solid #e5e7eb';
    }

    return menuItem;
  }

  /**
   * Get menu items
   * @returns {Array} Array of menu item configs
   */
  getMenuItems() {
    return [
      {
        icon: '👤',
        label: 'Profile',
        action: 'profile',
        onClick: () => {
          logger.info('Navigate to profile');
          // TODO: Navigate to profile page
        }
      },
      {
        icon: '⚙️',
        label: 'Settings',
        action: 'settings',
        onClick: () => {
          logger.info('Navigate to settings');
          // TODO: Navigate to settings page
        }
      },
      {
        icon: '🎨',
        label: 'Customize Menu Bar',
        action: 'customize-menubar',
        separator: true,
        onClick: () => {
          logger.info('Open menu bar customizer');
          this.openMenuBarCustomizer();
        }
      },
      {
        icon: '🚪',
        label: 'Logout',
        action: 'logout',
        onClick: () => {
          logger.info('Logout user');
          // TODO: Implement logout
          if (confirm('Are you sure you want to logout?')) {
            window.location.href = '/logout';
          }
        }
      }
    ];
  }

  /**
   * Open menu bar customizer modal
   */
  openMenuBarCustomizer() {
    // Dynamically import and open the customizer
    import('../../managers/menubar-customizer.ts').then(module => {
      const customizer = new module.MenuBarCustomizer(this.manager);
      customizer.open();
    }).catch(error => {
      logger.error('Failed to load MenuBarCustomizer:', error);
    });
  }

  /**
   * Load user data
   * For now, uses mock data - will be replaced with API call
   */
  loadUserData() {
    // TODO: Fetch from API
    // For now, use mock data
    this.user = {
      name: 'Sample User',
      email: 'user@symbiosis.com',
      role: 'user',
      avatarUrl: null  // No avatar image, will show initials
    };

    logger.info('User data loaded', this.user);
  }

  /**
   * Update user data
   * @param {Object} data - New user data
   */
  update(data: any): void {
    if (data.user) {
      this.user = { ...this.user, ...data.user };

      // Re-render to update user info
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
