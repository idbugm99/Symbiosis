/**
 * MenuBarCustomizer
 * UI for customizing menu bar plugins
 *
 * Features:
 * - Enable/disable plugins
 * - Reorder plugins (drag or buttons)
 * - Change plugin positions (left/center/right)
 * - Modify plugin settings
 * - Save to user preferences
 * - Reset to defaults
 */

export class MenuBarCustomizer {
  // Properties
  manager: any;
  config: any;
  modal: any;
  hasChanges: any;

  constructor(menuBarManager) {
    this.manager = menuBarManager;
    this.config = JSON.parse(JSON.stringify(this.manager.config)); // Deep clone
    this.modal = null;
    this.hasChanges = false;
  }

  /**
   * Open customizer modal
   */
  open() {
    console.log('MenuBarCustomizer: Opening customizer');

    // Create modal
    this.modal = this.createModal();
    document.body.appendChild(this.modal);

    // Animate in
    requestAnimationFrame(() => {
      this.modal.style.opacity = '1';
      this.modal.querySelector('.customizer-panel').style.transform = 'translateX(0)';
    });
  }

  /**
   * Close customizer modal
   */
  close() {
    if (this.hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }

    // Animate out
    this.modal.style.opacity = '0';
    this.modal.querySelector('.customizer-panel').style.transform = 'translateX(100%)';

    setTimeout(() => {
      if (this.modal && this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
    }, 300);

    console.log('MenuBarCustomizer: Closed');
  }

  /**
   * Create modal structure
   */
  createModal() {
    const modal = document.createElement('div');
    modal.className = 'menubar-customizer-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    // Customizer panel (sidebar)
    const panel = this.createPanel();
    modal.appendChild(panel);

    return modal;
  }

  /**
   * Create customizer panel
   */
  createPanel() {
    const panel = document.createElement('div');
    panel.className = 'customizer-panel';
    panel.style.cssText = `
      width: 480px;
      max-width: 90vw;
      height: 100vh;
      background-color: #ffffff;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    // Header
    const header = this.createHeader();
    panel.appendChild(header);

    // Content
    const content = this.createContent();
    panel.appendChild(content);

    // Footer
    const footer = this.createFooter();
    panel.appendChild(footer);

    return panel;
  }

  /**
   * Create header
   */
  createHeader() {
    const header = document.createElement('div');
    header.className = 'customizer-header';
    header.style.cssText = `
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Customize Menu Bar';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    `;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: #6b7280;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background-color 0.2s ease;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = '#f3f4f6';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = 'transparent';
    });
    closeBtn.onclick = () => this.close();
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * Create content area
   */
  createContent() {
    const content = document.createElement('div');
    content.className = 'customizer-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    `;

    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Configure which plugins appear in your menu bar and customize their settings.';
    instructions.style.cssText = `
      margin: 0 0 24px 0;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    `;
    content.appendChild(instructions);

    // Plugin sections (by position)
    const positions = ['left', 'center', 'right'];
    positions.forEach(position => {
      const section = this.createPositionSection(position);
      content.appendChild(section);
    });

    return content;
  }

  /**
   * Create section for a position (left/center/right)
   */
  createPositionSection(position) {
    const section = document.createElement('div');
    section.className = `position-section position-${position}`;
    section.style.cssText = `
      margin-bottom: 32px;
    `;

    // Section header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    `;

    const icon = document.createElement('span');
    icon.textContent = position === 'left' ? '⬅️' : position === 'right' ? '➡️' : '↔️';
    icon.style.fontSize = '16px';
    header.appendChild(icon);

    const title = document.createElement('h3');
    title.textContent = position.charAt(0).toUpperCase() + position.slice(1);
    title.style.cssText = `
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      text-transform: capitalize;
    `;
    header.appendChild(title);

    section.appendChild(header);

    // Plugin list for this position
    const pluginList = this.createPluginList(position);
    section.appendChild(pluginList);

    return section;
  }

  /**
   * Create plugin list for a position
   */
  createPluginList(position) {
    const list = document.createElement('div');
    list.className = 'plugin-list';
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    // Get plugins for this position
    const plugins = this.config.availablePlugins
      .filter(p => this.config.layout[position].includes(p.id))
      .sort((a, b) => {
        const aIndex = this.config.layout[position].indexOf(a.id);
        const bIndex = this.config.layout[position].indexOf(b.id);
        return aIndex - bIndex;
      });

    // Create plugin cards
    plugins.forEach((plugin, index) => {
      const card = this.createPluginCard(plugin, position, index);
      list.appendChild(card);
    });

    // Empty state
    if (plugins.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No plugins in this section';
      empty.style.cssText = `
        padding: 16px;
        text-align: center;
        color: #9ca3af;
        font-size: 13px;
        background-color: #f9fafb;
        border-radius: 6px;
        border: 1px dashed #d1d5db;
      `;
      list.appendChild(empty);
    }

    return list;
  }

  /**
   * Create plugin card
   */
  createPluginCard(plugin, position, index) {
    const card = document.createElement('div');
    card.className = 'plugin-card';
    card.dataset.pluginId = plugin.id;
    card.style.cssText = `
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      transition: all 0.2s ease;
    `;

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    // Drag handle
    const dragHandle = document.createElement('div');
    dragHandle.textContent = '⋮⋮';
    dragHandle.style.cssText = `
      cursor: grab;
      color: #9ca3af;
      font-size: 16px;
      user-select: none;
    `;
    headerRow.appendChild(dragHandle);

    // Enable/disable toggle
    const toggle = this.createToggle(plugin);
    headerRow.appendChild(toggle);

    // Plugin info
    const info = document.createElement('div');
    info.style.cssText = `
      flex: 1;
    `;

    const name = document.createElement('div');
    name.textContent = plugin.name;
    name.style.cssText = `
      font-weight: 600;
      font-size: 14px;
      color: #111827;
    `;
    info.appendChild(name);

    const id = document.createElement('div');
    id.textContent = plugin.id;
    id.style.cssText = `
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    `;
    info.appendChild(id);

    headerRow.appendChild(info);

    // Position selector
    const positionSelect = this.createPositionSelect(plugin, position);
    headerRow.appendChild(positionSelect);

    card.appendChild(headerRow);

    return card;
  }

  /**
   * Create enable/disable toggle
   */
  createToggle(plugin) {
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = `
      position: relative;
      width: 44px;
      height: 24px;
    `;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = plugin.enabled;
    toggle.id = `toggle-${plugin.id}`;
    toggle.style.cssText = `
      width: 100%;
      height: 100%;
      cursor: pointer;
      opacity: 0;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
    `;

    const slider = document.createElement('div');
    slider.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: ${plugin.enabled ? '#2563eb' : '#d1d5db'};
      border-radius: 12px;
      transition: background-color 0.2s ease;
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      position: absolute;
      top: 2px;
      left: ${plugin.enabled ? '22px' : '2px'};
      width: 20px;
      height: 20px;
      background-color: #ffffff;
      border-radius: 50%;
      transition: left 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `;
    slider.appendChild(knob);

    toggle.addEventListener('change', () => {
      plugin.enabled = toggle.checked;
      slider.style.backgroundColor = toggle.checked ? '#2563eb' : '#d1d5db';
      knob.style.left = toggle.checked ? '22px' : '2px';
      this.hasChanges = true;
    });

    toggleContainer.appendChild(toggle);
    toggleContainer.appendChild(slider);

    return toggleContainer;
  }

  /**
   * Create position selector dropdown
   */
  createPositionSelect(plugin, currentPosition) {
    const select = document.createElement('select');
    select.style.cssText = `
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 13px;
      color: #374151;
      background-color: #ffffff;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s ease;
    `;

    const positions = [
      { value: 'left', label: '⬅️ Left' },
      { value: 'center', label: '↔️ Center' },
      { value: 'right', label: '➡️ Right' }
    ];

    positions.forEach(pos => {
      const option = document.createElement('option');
      option.value = pos.value;
      option.textContent = pos.label;
      option.selected = pos.value === currentPosition;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      const newPosition = select.value;
      if (newPosition !== currentPosition) {
        this.movePluginToPosition(plugin.id, currentPosition, newPosition);
        this.hasChanges = true;
        this.refreshContent();
      }
    });

    select.addEventListener('focus', () => {
      select.style.borderColor = '#2563eb';
    });

    select.addEventListener('blur', () => {
      select.style.borderColor = '#d1d5db';
    });

    return select;
  }

  /**
   * Move plugin to a different position
   */
  movePluginToPosition(pluginId, fromPosition, toPosition) {
    // Remove from old position
    const fromIndex = this.config.layout[fromPosition].indexOf(pluginId);
    if (fromIndex !== -1) {
      this.config.layout[fromPosition].splice(fromIndex, 1);
    }

    // Add to new position
    this.config.layout[toPosition].push(pluginId);

    // Update plugin config
    const plugin = this.config.availablePlugins.find(p => p.id === pluginId);
    if (plugin) {
      plugin.position = toPosition;
    }

    console.log(`Moved plugin ${pluginId} from ${fromPosition} to ${toPosition}`);
  }

  /**
   * Refresh content area
   */
  refreshContent() {
    const content = this.modal.querySelector('.customizer-content');
    const oldSections = content.querySelectorAll('.position-section');
    oldSections.forEach(section => section.remove());

    const positions = ['left', 'center', 'right'];
    positions.forEach(position => {
      const section = this.createPositionSection(position);
      content.appendChild(section);
    });
  }

  /**
   * Create footer with action buttons
   */
  createFooter() {
    const footer = document.createElement('div');
    footer.className = 'customizer-footer';
    footer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    `;

    // Reset button
    const resetBtn = this.createButton('Reset to Defaults', 'secondary', () => {
      if (confirm('Reset all menu bar settings to defaults?')) {
        this.resetToDefaults();
      }
    });
    footer.appendChild(resetBtn);

    // Action buttons (Cancel & Save)
    const actionButtons = document.createElement('div');
    actionButtons.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    const cancelBtn = this.createButton('Cancel', 'secondary', () => {
      this.close();
    });
    actionButtons.appendChild(cancelBtn);

    const saveBtn = this.createButton('Save Changes', 'primary', () => {
      this.saveChanges();
    });
    actionButtons.appendChild(saveBtn);

    footer.appendChild(actionButtons);

    return footer;
  }

  /**
   * Create button
   */
  createButton(text, variant, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = onClick;

    const isPrimary = variant === 'primary';
    button.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: ${isPrimary ? 'none' : '1px solid #d1d5db'};
      background-color: ${isPrimary ? '#2563eb' : '#ffffff'};
      color: ${isPrimary ? '#ffffff' : '#374151'};
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = isPrimary ? '#1d4ed8' : '#f9fafb';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = isPrimary ? '#2563eb' : '#ffffff';
    });

    return button;
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults() {
    // Reload default config
    import('../data/config/menubar-config.js').then(module => {
      this.config = module.getDefaultMenuBarConfig();
      this.hasChanges = true;
      this.refreshContent();
      console.log('MenuBarCustomizer: Reset to defaults');
    });
  }

  /**
   * Save changes
   */
  async saveChanges() {
    console.log('MenuBarCustomizer: Saving changes', this.config);

    try {
      // TODO: Get current user ID from auth system
      const userId = 'user-123'; // Placeholder

      // Save to API
      const response = await fetch(`/api/user/${userId}/menubar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.config)
      });

      if (!response.ok) {
        throw new Error('Failed to save menu bar configuration');
      }

      console.log('✅ Menu bar configuration saved');

      // Reload menu bar with new config
      await this.manager.reload(this.config);

      this.hasChanges = false;
      this.close();

      // Show success message
      this.showSuccessMessage();
    } catch (error) {
      console.error('Error saving menu bar configuration:', error);
      alert('Failed to save menu bar configuration. Please try again.');
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage() {
    const message = document.createElement('div');
    message.textContent = '✓ Menu bar updated successfully';
    message.style.cssText = `
      position: fixed;
      top: 80px;
      right: 24px;
      padding: 12px 20px;
      background-color: #10b981;
      color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      font-weight: 500;
      z-index: 10001;
      animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.style.opacity = '0';
      message.style.transform = 'translateX(20px)';
      message.style.transition = 'all 0.3s ease';

      setTimeout(() => {
        message.remove();
      }, 300);
    }, 3000);
  }
}
