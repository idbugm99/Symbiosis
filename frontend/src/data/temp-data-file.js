/**
 * Temporary Data File
 * This simulates a database structure for development
 * Manual edits can be made here and will load on page refresh
 * Updated: 2025-11-29 from memory export
 */

export default {
  // User data
  user: {
    id: 'user-1',
    name: 'Sample User',
    email: 'test@example.com',
    avatar: null,
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z'
  },

  // Workspaces (multiple workspaces with sample widgets)
  workspaces: [
    {
      id: 'workspace-1',
      userId: 'user-1',
      name: 'Home 1',
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T10:00:00.000Z',
      widgets: [
        {
          id: 'instance-1764372681190',
          userId: 'user-1',
          workspaceId: 'workspace-1',
          widgetDefId: 'favorites',
          type: 'widget',
          name: 'Favorites',
          icon: '⭐',
          size: '2×1',
          cols: 2,
          rows: 1,
          cell: 1,
          occupiedCells: [1, 2],
          config: {},
          createdAt: '2025-11-28T23:31:21.190Z',
          updatedAt: '2025-11-28T23:31:21.190Z'
        },
        {
          id: 'instance-1764373064527',
          userId: 'user-1',
          workspaceId: 'workspace-1',
          widgetDefId: 'panel-viewer',
          type: 'widget',
          name: 'Panel Viewer',
          icon: '🧬',
          size: '4×2',
          cols: 4,
          rows: 2,
          cell: 9,
          occupiedCells: [9, 10, 11, 12, 15, 16, 17, 18],
          config: {},
          createdAt: '2025-11-28T23:37:44.527Z',
          updatedAt: '2025-11-28T23:37:44.527Z'
        },
        {
          id: 'instance-1764373572177',
          userId: 'user-1',
          workspaceId: 'workspace-1',
          widgetDefId: 'chemicals-app',
          type: 'app',
          name: 'Chemicals',
          icon: '🧪',
          size: '1×1',
          cols: 1,
          rows: 1,
          cell: 3,
          occupiedCells: [3],
          config: {},
          createdAt: '2025-11-28T23:46:12.177Z',
          updatedAt: '2025-11-28T23:46:12.177Z'
        }
      ],
      lastModified: '2025-11-29T04:40:39.953Z'
    },
    {
      id: 'workspace-1764373580705',
      name: 'Lab 2',
      widgets: [
        {
          id: 'instance-1764373619559',
          userId: 'user-1',
          workspaceId: 'workspace-1764373580705',
          widgetDefId: 'cas-quick-view',
          type: 'widget',
          name: 'CAS Quick View',
          icon: '🧪',
          size: '2×1',
          cols: 2,
          rows: 1,
          cell: 2,
          occupiedCells: [2, 3],
          config: {},
          createdAt: '2025-11-28T23:46:59.559Z',
          updatedAt: '2025-11-28T23:46:59.559Z'
        }
      ],
      lastModified: '2025-11-29T04:40:42.262Z'
    },
    {
      id: 'workspace-1764373582429',
      name: 'Lab 3',
      widgets: [
        {
          id: 'instance-1764373609745',
          userId: 'user-1',
          workspaceId: 'workspace-1764373582429',
          widgetDefId: 'inventory-alerts',
          type: 'widget',
          name: 'Inventory Alerts',
          icon: '📊',
          size: '2×2',
          cols: 2,
          rows: 2,
          cell: 1,
          occupiedCells: [1, 2, 7, 8],
          config: {},
          createdAt: '2025-11-28T23:46:49.745Z',
          updatedAt: '2025-11-28T23:46:49.745Z'
        },
        {
          id: 'instance-1764387082609',
          userId: 'user-1',
          workspaceId: 'workspace-1764373582429',
          widgetDefId: 'inventory-alerts',
          type: 'widget',
          name: 'Inventory Alerts',
          icon: '📊',
          size: '2×2',
          cols: 2,
          rows: 2,
          cell: 3,
          occupiedCells: [3, 4, 9, 10],
          config: {},
          createdAt: '2025-11-29T03:31:22.609Z',
          updatedAt: '2025-11-29T03:31:22.609Z'
        }
      ],
      lastModified: '2025-11-29T04:40:41.963Z'
    }
  ],

  // Widget Instances (sample widgets for demo)
  widgetInstances: [
    {
      id: 'instance-1764372681190',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      widgetDefId: 'favorites',
      type: 'widget',
      name: 'Favorites',
      icon: '⭐',
      size: '2×1',
      cols: 2,
      rows: 1,
      cell: 1,
      occupiedCells: [1, 2],
      config: {},
      createdAt: '2025-11-28T23:31:21.190Z',
      updatedAt: '2025-11-28T23:31:21.190Z'
    },
    {
      id: 'instance-1764373064527',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      widgetDefId: 'panel-viewer',
      type: 'widget',
      name: 'Panel Viewer',
      icon: '🧬',
      size: '4×2',
      cols: 4,
      rows: 2,
      cell: 9,
      occupiedCells: [9, 10, 11, 12, 15, 16, 17, 18],
      config: {},
      createdAt: '2025-11-28T23:37:44.527Z',
      updatedAt: '2025-11-28T23:37:44.527Z'
    },
    {
      id: 'instance-1764373572177',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      widgetDefId: 'chemicals-app',
      type: 'app',
      name: 'Chemicals',
      icon: '🧪',
      size: '1×1',
      cols: 1,
      rows: 1,
      cell: 3,
      occupiedCells: [3],
      config: {},
      createdAt: '2025-11-28T23:46:12.177Z',
      updatedAt: '2025-11-28T23:46:12.177Z'
    },
    {
      id: 'instance-1764373609745',
      userId: 'user-1',
      workspaceId: 'workspace-1764373582429',
      widgetDefId: 'inventory-alerts',
      type: 'widget',
      name: 'Inventory Alerts',
      icon: '📊',
      size: '2×2',
      cols: 2,
      rows: 2,
      cell: 1,
      occupiedCells: [1, 2, 7, 8],
      config: {},
      createdAt: '2025-11-28T23:46:49.745Z',
      updatedAt: '2025-11-28T23:46:49.745Z'
    },
    {
      id: 'instance-1764373619559',
      userId: 'user-1',
      workspaceId: 'workspace-1764373580705',
      widgetDefId: 'cas-quick-view',
      type: 'widget',
      name: 'CAS Quick View',
      icon: '🧪',
      size: '2×1',
      cols: 2,
      rows: 1,
      cell: 2,
      occupiedCells: [2, 3],
      config: {},
      createdAt: '2025-11-28T23:46:59.559Z',
      updatedAt: '2025-11-28T23:46:59.559Z'
    },
    {
      id: 'instance-1764387082609',
      userId: 'user-1',
      workspaceId: 'workspace-1764373582429',
      widgetDefId: 'inventory-alerts',
      type: 'widget',
      name: 'Inventory Alerts',
      icon: '📊',
      size: '2×2',
      cols: 2,
      rows: 2,
      cell: 3,
      occupiedCells: [3, 4, 9, 10],
      config: {},
      createdAt: '2025-11-29T03:31:22.609Z',
      updatedAt: '2025-11-29T03:31:22.609Z'
    }
  ],

  // Current active workspace ID
  currentWorkspaceId: 'workspace-1',

  // Metadata
  version: '1.0.0',
  lastSaved: '2025-11-29T04:40:42.263Z'
};
