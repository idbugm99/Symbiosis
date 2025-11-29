/**
 * DockManager - Manages the dock using the 'dockbar.js' web component.
 * This version focuses on correctly implementing the component for animations.
 * Reordering via SortableJS has been removed due to library conflicts.
 */
export class DockManager {
  constructor(options = {}) {
    this.storageManager = options.storageManager;
    this.dockApps = this.loadDockApps();
    this.onAppClick = options.onAppClick || (() => {});
    this.init();
  }

  init() {
    // BUG FIX: The ID in desktop.html is 'dock-wrapper', not 'dock-container'.
    this.dockElement = document.getElementById('dock-wrapper');

    if (!this.dockElement) {
      console.error('Dock container #dock-wrapper not found');
      return;
    }

    // Wait for the <dock-wrapper> web component to be defined by the external script
    customElements.whenDefined('dock-wrapper').then(() => {
      console.log('✅ Dockbar web component is loaded and ready.');
      this.renderDock();
      this.setupDropZone();
    }).catch(err => {
      console.error('❌ Failed to load dockbar web component:', err);
    });
  }

  loadDockApps() {
    const stored = localStorage.getItem('symbiosis-dock-apps');
    if (stored) {
      return JSON.parse(stored);
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

  saveDockApps() {
    localStorage.setItem('symbiosis-dock-apps', JSON.stringify(this.dockApps));
    console.log('Dock apps saved:', this.dockApps);
  }

  renderDock() {
    this.dockElement.innerHTML = ''; // Clear previous content

    this.dockApps.forEach(app => {
      // The dockbar library uses a <hr> for the divider
      if (app.type === 'divider') {
        const divider = document.createElement('hr');
        this.dockElement.appendChild(divider);
        return;
      }

      const dockItem = this.createAppElement(app);
      this.dockElement.appendChild(dockItem);
    });
  }

  createAppElement(app) {
    const dockItem = document.createElement('dock-item');

    // The library expects a single, direct child element to animate.
    // We'll use a simple <a> tag which is good practice for clickable items.
    const linkElement = document.createElement('a');
    linkElement.className = 'dock-app-link'; // Add a class for styling
    linkElement.href = '#'; // Prevent page navigation
    linkElement.title = app.name;
    linkElement.innerHTML = app.icon; // Just the icon

    linkElement.addEventListener('click', (e) => {
      e.preventDefault();
      this.onAppClick(app);
    });

    dockItem.appendChild(linkElement);
    return dockItem;
  }

  setupDropZone() {
    this.dockElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.dockElement.classList.add('dock-drag-over');
    });

    this.dockElement.addEventListener('dragleave', () => {
      this.dockElement.classList.remove('dock-drag-over');
    });

    this.dockElement.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dockElement.classList.remove('dock-drag-over');
      try {
        const widgetData = JSON.parse(e.dataTransfer.getData('application/json'));
        if (widgetData.cols === 1 && widgetData.rows === 1 && widgetData.type === 'app') {
          this.addApp(widgetData);
        } else {
          alert('Only 1×1 apps can be added to the dock.');
        }
      } catch (error) {
        console.error('Error parsing dropped widget:', error);
      }
    });
  }

  addApp(widgetData) {
    if (this.dockApps.find(app => app.id === widgetData.id)) {
      alert(`${widgetData.name} is already in the dock.`);
      return;
    }

    const dividerIndex = this.dockApps.findIndex(app => app.type === 'divider');
    const dockApp = {
      id: widgetData.id,
      name: widgetData.name,
      icon: widgetData.icon,
      type: 'widget'
    };

    if (dividerIndex !== -1) {
      this.dockApps.splice(dividerIndex, 0, dockApp);
    } else {
      this.dockApps.push(dockApp);
    }

    this.saveDockApps();
    this.renderDock(); // Re-render the entire dock
    console.log(`Added ${widgetData.name} to dock`);
  }

  removeApp(appId) {
    // For future use: a way to remove apps, perhaps a context menu
    this.dockApps = this.dockApps.filter(a => a.id !== appId);
    this.saveDockApps();
    this.renderDock();
    console.log(`Removed app ${appId}`);
  }
}
