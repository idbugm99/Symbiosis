/**
 * Menu Bar Plugin Configuration
 * Static configuration for menu bar plugins
 *
 * This file defines all available menu bar plugins and their default layout.
 *
 * FUTURE: When user admin plugin is built, this config will be loaded from API
 * based on user preferences stored in database. For now, it's static.
 */

/**
 * Available Menu Bar Plugins
 *
 * Plugin Schema:
 * - id: Unique identifier (string)
 * - name: Display name (string)
 * - version: Semantic version (string)
 * - position: 'left' | 'center' | 'right'
 * - order: Sort order within position (number, lower = earlier)
 * - enabled: Show/hide plugin (boolean)
 * - hideInMobile: Hide on mobile devices (boolean) - For future sites
 * - requiredRoles: Array of roles that can see this plugin (['guest', 'user', 'admin'])
 * - settings: Plugin-specific configuration object
 */
export const menubarConfig = {
  // Available plugins (plugin registry)
  availablePlugins: [
    // Logo Plugin
    {
      id: 'logo',
      name: 'Logo',
      version: '1.0.0',
      position: 'left',
      order: 10,
      enabled: true,
      hideInMobile: false,
      requiredRoles: ['guest', 'user', 'admin'],
      settings: {
        showIcon: true,        // Show microscope icon
        showText: true,        // Show "Symbiosis" text
        link: '/',             // Click destination
        iconClass: 'logo-icon' // CSS class for icon
      }
    },

    // Workspace Switcher Plugin
    {
      id: 'workspace-switcher',
      name: 'Workspace Switcher',
      version: '1.0.0',
      position: 'left',
      order: 20,
      enabled: true,
      hideInMobile: true,  // Hide on mobile (for future sites)
      requiredRoles: ['user', 'admin'],
      settings: {
        showLabels: false,     // Show workspace names on hover
        maxVisible: 9,         // Max workspaces to show (1-9)
        allowAdd: true,        // Show "+" button to add workspace
        style: 'dots'          // 'dots' | 'pills' | 'tabs'
      }
    },

    // Workspace Title Plugin
    {
      id: 'workspace-title',
      name: 'Workspace Title',
      version: '1.0.0',
      position: 'center',
      order: 30,
      enabled: true,
      hideInMobile: true,
      requiredRoles: ['user', 'admin'],
      settings: {
        editable: true,        // Click to rename workspace
        showIcon: false,       // Show workspace icon
        maxLength: 50,         // Max characters for title
        style: 'large'         // 'small' | 'medium' | 'large'
      }
    },

    // Search Plugin
    {
      id: 'search',
      name: 'Search',
      version: '1.0.0',
      position: 'right',
      order: 10,
      enabled: true,
      hideInMobile: false,
      requiredRoles: ['user', 'admin'],
      settings: {
        placeholder: 'Search Symbiosis...',
        scope: 'all',          // 'all' | 'workspace' | 'apps' | 'widgets'
        hotkey: 'Ctrl+K',      // Keyboard shortcut
        showIcon: true,        // Show magnifying glass icon
        expandOnClick: true    // Expand to search box on click
      }
    },

    // Notifications Plugin
    {
      id: 'notifications',
      name: 'Notifications',
      version: '1.0.0',
      position: 'right',
      order: 20,
      enabled: true,
      hideInMobile: true,
      requiredRoles: ['user', 'admin'],
      settings: {
        sound: true,           // Play sound on new notification
        badge: true,           // Show count badge
        maxDisplay: 5,         // Max notifications in dropdown
        autoMarkRead: true,    // Mark as read when opened
        showIcon: true         // Show bell icon
      }
    },

    // User Menu Plugin
    {
      id: 'user-menu',
      name: 'User Menu',
      version: '1.0.0',
      position: 'right',
      order: 30,
      enabled: true,
      hideInMobile: false,
      requiredRoles: ['user', 'admin'],
      settings: {
        showName: true,        // Show user name
        showAvatar: true,      // Show user avatar
        showRole: false,       // Show user role badge
        avatarStyle: 'circle', // 'circle' | 'square' | 'rounded'
        dropdownPosition: 'bottom-right'  // Dropdown position
      }
    }

    // FUTURE: Additional plugins can be added here
    // Example: Help plugin, Settings plugin, Admin Tools plugin, etc.
  ],

  // Default layout (what shows by default for new users)
  defaultLayout: {
    left: ['logo', 'workspace-switcher'],
    center: ['workspace-title'],
    right: ['search', 'notifications', 'user-menu']
  },

  // Global menu bar settings
  globalSettings: {
    height: 60,              // Menu bar height in pixels
    backgroundColor: '#ffffff',
    textColor: '#333333',
    hoverColor: '#f0f0f0',
    activeColor: '#2563eb',
    spacing: 16,             // Spacing between plugins (pixels)
    padding: 12,             // Left/right padding (pixels)
    zIndex: 1000             // Z-index for menu bar
  }

  // //FUTURE: API endpoints (commented out - implement when backend ready)
  // api: {
  //   getUserConfig: '/api/user/{userId}/menubar',      // GET user's menu bar config
  //   saveUserConfig: '/api/user/{userId}/menubar',     // POST save user's config
  //   getNotifications: '/api/notifications',           // GET notifications
  //   markNotificationRead: '/api/notifications/{id}',  // PUT mark as read
  //   getUserProfile: '/api/user/profile'               // GET user profile
  // }
};

/**
 * Get default menu bar configuration
 * @returns {Object} Default menu bar config
 */
export function getDefaultMenuBarConfig() {
  return {
    availablePlugins: menubarConfig.availablePlugins,
    layout: menubarConfig.defaultLayout,
    settings: menubarConfig.globalSettings
  };
}

/**
 * Get plugin by ID
 * @param {string} pluginId - Plugin ID
 * @returns {Object|null} Plugin config or null if not found
 */
export function getPluginConfig(pluginId) {
  return menubarConfig.availablePlugins.find(p => p.id === pluginId) || null;
}

/**
 * Get plugins for specific position
 * @param {string} position - 'left' | 'center' | 'right'
 * @returns {Array} Array of plugin configs
 */
export function getPluginsForPosition(position) {
  return menubarConfig.availablePlugins
    .filter(p => p.position === position && p.enabled)
    .sort((a, b) => a.order - b.order);
}

// //FUTURE: Load user-specific configuration from API
// export async function getUserMenuBarConfig(userId) {
//   try {
//     const response = await fetch(`/api/user/${userId}/menubar`);
//     if (!response.ok) {
//       console.warn('Failed to load user menu bar config, using defaults');
//       return getDefaultMenuBarConfig();
//     }
//     return await response.json();
//   } catch (error) {
//     console.error('Error loading user menu bar config:', error);
//     return getDefaultMenuBarConfig();
//   }
// }

// //FUTURE: Save user-specific configuration to API
// export async function saveUserMenuBarConfig(userId, config) {
//   try {
//     const response = await fetch(`/api/user/${userId}/menubar`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(config)
//     });
//
//     if (!response.ok) {
//       throw new Error('Failed to save menu bar config');
//     }
//
//     return await response.json();
//   } catch (error) {
//     console.error('Error saving menu bar config:', error);
//     throw error;
//   }
// }
