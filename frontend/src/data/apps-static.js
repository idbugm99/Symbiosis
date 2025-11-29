// Symbiosis - Static Apps Data
// Apps are 1×1 clickable icons that open full applications

/**
 * Available Apps
 * Apps can be placed in the dock or on the desktop
 */
export const availableApps = [
  // ============================================================
  // CHEMICALS CATEGORY
  // ============================================================
  {
    id: 'chemicals-app',
    name: 'Chemicals',
    icon: '🧪',
    type: 'app',
    category: 'chemicals',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open chemicals database',
    opensPage: '/pages/chemicals.html'
  },

  // ============================================================
  // EQUIPMENT CATEGORY
  // ============================================================
  {
    id: 'equipment-app',
    name: 'Equipment',
    icon: '🔬',
    type: 'app',
    category: 'equipment',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open equipment manager',
    opensPage: '/pages/equipment.html'
  },
  {
    id: 'equipment-list',
    name: 'Equipment List',
    icon: '📋',
    type: 'app',
    category: 'equipment',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Quick access to all equipment',
    opensPage: '/pages/equipment.html'
  },

  // ============================================================
  // GENETICS CATEGORY
  // ============================================================
  {
    id: 'genetics-app',
    name: 'Genetics',
    icon: '🧬',
    type: 'app',
    category: 'genetics',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open genetics module',
    opensPage: '/pages/genetics.html'
  },

  // ============================================================
  // VENDOR TOOLS CATEGORY
  // ============================================================
  {
    id: 'vendors-app',
    name: 'Vendors',
    icon: '📦',
    type: 'app',
    category: 'vendors',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open vendor manager',
    opensPage: '/pages/vendors.html'
  },

  // ============================================================
  // AI ASSISTANT CATEGORY
  // ============================================================
  {
    id: 'ai-assistant-app',
    name: 'AI Assistant',
    icon: '🤖',
    type: 'app',
    category: 'ai',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open AI assistant',
    opensPage: '/pages/ai-assistant.html'
  },
  {
    id: 'explain-mode',
    name: 'Explain This',
    icon: '💡',
    type: 'app',
    category: 'ai',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Educational mode for students',
    opensPage: '/pages/explain.html'
  },

  // ============================================================
  // RESEARCH NOTES CATEGORY
  // ============================================================
  {
    id: 'notebook-app',
    name: 'Notebook',
    icon: '📓',
    type: 'app',
    category: 'notes',
    size: '1×1',
    cols: 1,
    rows: 1,
    description: 'Open research notebook',
    opensPage: '/pages/notebook.html'
  }
];
