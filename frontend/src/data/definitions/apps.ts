// Symbiosis - Static Apps Data
// Apps are 1×1 clickable icons that open full applications

/**
 * Available Apps
 * Apps can be placed in the dock or on the desktop
 *
 * New Properties:
 * - displayMode: 'fullscreen' | 'fullscreen-no-nav' | 'fullscreen-no-dock' | 'popup' | 'modal' | 'embedded'
 * - animation: 'fade' | 'slide-right' | 'slide-left' | 'expand-from-widget'
 * - multiInstance: boolean - Allow multiple instances of this app
 * - showCloseButton: boolean
 * - showMinimizeButton: boolean
 * - dock: boolean - Show/hide dock when app is open
 * - menuBar: boolean - Show/hide menu bar when app is open
 * - sideNav: boolean - Show/hide side nav when app is open
 * - component: string - React/Vue component name (future use)
 * - apiEndpoint: string - Backend API endpoint for this app
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
    // Header display configuration
    headerDisplay: 'never',  // Pure launcher - no header
    // Default instance settings (when launched from dock/menu)
    displayMode: 'popup',
    dimensions: { width: 1000, height: 700 },
    position: 'center',
    animation: 'fade',
    multiInstance: false,
    showCloseButton: true,
    showMinimizeButton: true,
    dock: false,
    menuBar: true,
    sideNav: false,
    // Backend integration
    apiEndpoint: '/api/chemicals',
    component: 'ChemicalsApp'
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
    // Header display configuration
    headerDisplay: 'never',  // Show header on hover
    // Default instance settings
    displayMode: 'fullscreen-no-nav',
    animation: 'slide-left',
    multiInstance: false,
    showCloseButton: true,
    showMinimizeButton: true,
    dock: true,
    menuBar: true,
    sideNav: false,
    // Backend integration
    apiEndpoint: '/api/equipment',
    component: 'EquipmentApp'
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
    // Header display configuration
    headerDisplay: 'never',  // Always show header
    // Default instance settings
    displayMode: 'popup',
    dimensions: { width: 900, height: 700 },
    position: 'center',
    animation: 'fade',
    multiInstance: true, // Allow multiple lists open
    showCloseButton: true,
    showMinimizeButton: true,
    // Backend integration
    apiEndpoint: '/api/equipment',
    component: 'EquipmentListApp'
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
    // Header display configuration
    headerDisplay: 'never',  // No header - clean launcher
    // Default instance settings
    displayMode: 'fullscreen',
    animation: 'fade',
    multiInstance: false,
    showCloseButton: true,
    showMinimizeButton: true,
    dock: false,
    menuBar: false,
    sideNav: false,
    // Backend integration
    apiEndpoint: '/api/genetics',
    component: 'GeneticsApp'
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
    // Header display configuration
    headerDisplay: 'never',  // Never to reveal header
    // Default instance settings
    displayMode: 'fullscreen-no-nav',
    animation: 'slide-right',
    multiInstance: false,
    showCloseButton: true,
    showMinimizeButton: true,
    dock: true,
    menuBar: true,
    sideNav: false,
    // Backend integration
    apiEndpoint: '/api/vendors',
    component: 'VendorsApp'
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
    // Header display configuration
    headerDisplay: 'never',  // Never visible header
    // Default instance settings
    displayMode: 'popup',
    dimensions: { width: 1000, height: 800 },
    position: 'center',
    animation: 'fade',
    multiInstance: true, // Allow multiple AI chat windows
    showCloseButton: true,
    showMinimizeButton: true,
    // Backend integration
    apiEndpoint: '/api/ai',
    component: 'AIAssistantApp'
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
    // Header display configuration
    headerDisplay: 'never',  // Clean icon-only launcher
    // Default instance settings
    displayMode: 'popup',
    dimensions: { width: 800, height: 600 },
    position: 'center',
    animation: 'expand-from-widget',
    multiInstance: true,
    showCloseButton: true,
    showMinimizeButton: true,
    // Backend integration
    apiEndpoint: '/api/ai/explain',
    component: 'ExplainModeApp'
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
    // Header display configuration
    headerDisplay: 'never',  // No header on hover
    // Default instance settings
    displayMode: 'fullscreen-no-nav',
    animation: 'slide-right',
    multiInstance: false,
    showCloseButton: true,
    showMinimizeButton: true,
    dock: true,
    menuBar: true,
    sideNav: true, // Show navigation for notes
    // Backend integration
    apiEndpoint: '/api/notebook',
    component: 'NotebookApp'
  }
];
