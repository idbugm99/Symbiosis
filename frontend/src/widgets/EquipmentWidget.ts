/**
 * Equipment Widget - 4x2 Compact Design
 * Row 1: Search + Pinned Searches
 * Row 2: Recently Viewed Cards
 */

import { searchEquipment } from '../data/equipment/queries';
import type { equipment as EquipmentType } from '../data/equipment/equipment';
import type { WidgetInstance } from '../types/index.js';

type Equipment = typeof EquipmentType[0];

interface RecentItem {
  equipment: Equipment;
  viewedAt: Date;
}

export class EquipmentWidget {
  private container: HTMLElement;
  private widgetInstance: WidgetInstance;
  private updateConfigCallback: (config: Record<string, any>) => void;
  private searchInput: HTMLInputElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private currentResults: Equipment[] = [];
  private recentItems: RecentItem[] = [];
  private pinnedSearches = ['Incubators', 'Pipettors', 'Centrifuges', 'Autoclaves'];

  constructor(
    container: HTMLElement,
    widgetInstance: WidgetInstance,
    updateConfigCallback: (config: Record<string, any>) => void
  ) {
    this.container = container;
    this.widgetInstance = widgetInstance;
    this.updateConfigCallback = updateConfigCallback;
    this.loadRecentItems();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Load recent items from widget instance config (instance-specific)
   */
  private loadRecentItems(): void {
    try {
      // Load from widget instance config (each widget has its own recently viewed list)
      const recentlyViewed = this.widgetInstance.config?.recentlyViewed || [];
      this.recentItems = recentlyViewed.map((item: any) => ({
        equipment: item.equipment,
        viewedAt: new Date(item.viewedAt)
      }));
      console.log(`[EquipmentWidget ${this.widgetInstance.id}] Loaded ${this.recentItems.length} recent items from instance config`);
    } catch (e) {
      console.error('Failed to load recent items:', e);
      this.recentItems = [];
    }
  }

  /**
   * Save recent items to widget instance config (instance-specific)
   */
  private saveRecentItems(): void {
    try {
      const data = this.recentItems.slice(0, 2).map(item => ({
        equipment: item.equipment,
        viewedAt: item.viewedAt.toISOString()
      }));

      // Update widget instance config (persisted per widget instance)
      this.updateConfigCallback({
        ...this.widgetInstance.config,
        recentlyViewed: data
      });

      console.log(`[EquipmentWidget ${this.widgetInstance.id}] Saved ${data.length} recent items to instance config`);
    } catch (e) {
      console.error('Failed to save recent items:', e);
    }
  }

  /**
   * Add to recent items
   */
  private addToRecent(equipment: Equipment): void {
    // Remove if already exists
    this.recentItems = this.recentItems.filter(
      item => item.equipment.equipment_id !== equipment.equipment_id
    );

    // Add to front
    this.recentItems.unshift({
      equipment,
      viewedAt: new Date()
    });

    // Keep only last 2 (widget limitation)
    this.recentItems = this.recentItems.slice(0, 2);

    this.saveRecentItems();
    this.renderRecentItems();
  }

  /**
   * Render the widget content
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="equipment-widget-4x2">
        <!-- Header Row -->
        <div class="equipment-header">
          <div class="equipment-title">Equipment</div>
          <button class="equipment-view-all-btn">View All →</button>
        </div>

        <!-- Search Box -->
        <div class="equipment-search">
          <div class="equipment-search-icon">🔍</div>
          <input
            type="text"
            class="equipment-search-input"
            placeholder="Search equipment..."
            autocomplete="off"
          />
        </div>

        <!-- Pinned Searches -->
        <div class="equipment-pinned">
          <span class="equipment-pinned-icon">📌</span>
          ${this.pinnedSearches.map(search => `
            <button class="equipment-pinned-tag" data-search="${search}">${search}</button>
          `).join('')}
        </div>

        <!-- Results Dropdown (hidden by default) -->
        <div class="equipment-results" style="display: none;">
          <!-- Results will be rendered here -->
        </div>

        <!-- Recently Viewed Section -->
        <div class="equipment-recent">
          <div class="equipment-recent-header">Recently Viewed</div>
          <div class="equipment-recent-grid">
            <!-- Recent items will be rendered here -->
          </div>
        </div>
      </div>
    `;

    // Cache references
    this.searchInput = this.container.querySelector('.equipment-search-input');
    this.resultsContainer = this.container.querySelector('.equipment-results');

    // Render recent items
    this.renderRecentItems();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Search input
    this.container.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('equipment-search-input')) {
        const query = (target as HTMLInputElement).value.trim();
        this.handleSearch(query);
      }
    });

    // View All button
    const viewAllBtn = this.container.querySelector('.equipment-view-all-btn');
    viewAllBtn?.addEventListener('click', () => {
      this.openEquipmentApp();
    });

    // Pinned search tags
    this.container.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('equipment-pinned-tag')) {
        const search = target.dataset.search || '';
        this.handlePinnedSearch(search);
      }
    });
  }

  /**
   * Handle search input
   */
  private handleSearch(query: string): void {
    if (!this.resultsContainer) return;

    if (query.length === 0) {
      this.resultsContainer.style.display = 'none';
      this.currentResults = [];
      return;
    }

    this.currentResults = searchEquipment(query).slice(0, 10);
    this.renderSearchResults();
    this.resultsContainer.style.display = 'block';
  }

  /**
   * Handle pinned search click
   */
  private handlePinnedSearch(search: string): void {
    if (this.searchInput) {
      this.searchInput.value = search;
      this.handleSearch(search);
      this.searchInput.focus();
    }
  }

  /**
   * Render search results dropdown
   */
  private renderSearchResults(): void {
    if (!this.resultsContainer) return;

    if (this.currentResults.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="equipment-no-results">No equipment found</div>
      `;
      return;
    }

    this.resultsContainer.innerHTML = this.currentResults.map(eq => `
      <div class="equipment-result-item" data-equipment-id="${eq.equipment_id}">
        <div class="equipment-result-name">${eq.equipment_name || 'Unknown'}</div>
        <div class="equipment-result-id">${eq.internal_id || 'N/A'}</div>
      </div>
    `).join('');

    // Add click handlers
    this.resultsContainer.querySelectorAll('.equipment-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const equipmentId = item.getAttribute('data-equipment-id');
        const equipment = this.currentResults.find(eq => eq.equipment_id === equipmentId);
        if (equipment) {
          this.addToRecent(equipment);
          this.showDetailCard(equipment);
          // Clear search
          if (this.searchInput) this.searchInput.value = '';
          if (this.resultsContainer) this.resultsContainer.style.display = 'none';
        }
      });
    });
  }

  /**
   * Render recent items
   */
  private renderRecentItems(): void {
    const container = this.container.querySelector('.equipment-recent-grid');
    if (!container) return;

    if (this.recentItems.length === 0) {
      container.innerHTML = `
        <div class="equipment-recent-empty">No recent equipment viewed</div>
      `;
      return;
    }

    // Show top 2 recent items (2 cards wide to match Figma)
    container.innerHTML = this.recentItems.slice(0, 2).map(item => {
      const eq = item.equipment;
      const timeAgo = this.getTimeAgo(item.viewedAt);
      const status = this.getEquipmentStatus(eq);
      
      // Format ID: show both internal_id and serial_number if available
      const idParts = [];
      if (eq.internal_id) idParts.push(eq.internal_id);
      if (eq.serial_number) idParts.push(eq.serial_number);
      const formattedId = idParts.length > 0 ? idParts.join(' | ') : 'N/A';

      return `
        <div class="equipment-recent-card" data-equipment-id="${eq.equipment_id}">
          <div class="equipment-card-icon">${this.getEquipmentIcon(eq.equipment_name || '')}</div>
          <div class="equipment-card-name">${eq.equipment_name || 'Unknown'}</div>
          <div class="equipment-card-id">${formattedId}</div>
          <div class="equipment-card-info-box">
            <div class="equipment-card-status">
              <span class="equipment-status-badge ${status.class}">${status.icon} ${status.text}</span>
            </div>
            <div class="equipment-card-location-row">
              <span class="equipment-location-icon">📍</span>
              <span class="equipment-card-location">${eq.location || 'Unknown'}</span>
            </div>
          </div>
          <div class="equipment-card-time">Last viewed: ${timeAgo}</div>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.equipment-recent-card').forEach(card => {
      card.addEventListener('click', () => {
        const equipmentId = card.getAttribute('data-equipment-id');
        const item = this.recentItems.find(i => i.equipment.equipment_id === equipmentId);
        if (item) {
          this.showDetailCard(item.equipment);
        }
      });
    });
  }

  /**
   * Get equipment icon based on name
   */
  private getEquipmentIcon(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('incubator')) return '🧪';
    if (lowerName.includes('pipet')) return '💉';
    if (lowerName.includes('centrifuge')) return '🔬';
    if (lowerName.includes('autoclave')) return '🔥';
    if (lowerName.includes('microscope')) return '🔬';
    if (lowerName.includes('freezer') || lowerName.includes('fridge')) return '❄️';
    return '📦';
  }

  /**
   * Get equipment status (mock for now)
   * All cards use the same status styling to match Figma design
   */
  private getEquipmentStatus(equipment: Equipment): { icon: string; text: string; class: string } {
    // Always return ready status with consistent styling
    return { icon: '✓', text: 'Ready for Use (Derived)', class: 'status-ready' };
  }

  /**
   * Get time ago string
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
  }

  /**
   * Show equipment detail card (using existing popup)
   */
  private showDetailCard(equipment: Equipment): void {
    // Mock status data
    const statusInfo = this.getMockStatusInfo(equipment);

    // Create detail card popup - compact Figma design
    const card = document.createElement('div');
    card.className = 'equipment-detail-card';
    card.innerHTML = `
      <div class="equipment-detail-header">
        <div class="equipment-detail-actions">
          <button class="equipment-detail-btn btn-expand">Expand</button>
          <button class="equipment-detail-btn btn-copy">Copy identifiers</button>
        </div>
        <button class="equipment-close-btn">×</button>

        <h3 class="equipment-detail-title">${equipment.equipment_name || 'Unknown Equipment'}</h3>

        <div class="equipment-detail-status-row">
          <span class="equipment-status-badge status-commissioned">✓ In Commission</span>
          <span class="equipment-status-divider">•</span>
          <span class="equipment-status-date">As of 17Apr2019</span>
        </div>

        <div class="equipment-detail-divider"></div>
      </div>

      <div class="equipment-detail-content">
        <div class="equipment-detail-fields">
          <div class="equipment-detail-field-group">
            <label class="equipment-field-label">Model Number</label>
            <div class="equipment-field-value-box">${equipment.model_number || 'N/A'}</div>
          </div>
          <div class="equipment-detail-field-group">
            <label class="equipment-field-label">Serial Number</label>
            <div class="equipment-field-value-box">${equipment.serial_number || 'N/A'}</div>
          </div>
        </div>

        <div class="equipment-detail-divider"></div>

        <div class="equipment-detail-info-list">
          <div class="equipment-info-row">
            <span class="equipment-info-icon">📍</span>
            <span class="equipment-info-label">Lab Location</span>
            <span class="equipment-info-value">${equipment.location || 'Unknown'} • Updated ${statusInfo.locationUpdate}</span>
            <button class="equipment-info-chevron">›</button>
          </div>

          <div class="equipment-info-row">
            <span class="equipment-info-icon">🔧</span>
            <span class="equipment-info-label">Maintenance History</span>
            <span class="equipment-info-badge ${statusInfo.maintenanceClass}">${statusInfo.maintenanceText}</span>
            <button class="equipment-info-chevron">›</button>
          </div>

          <div class="equipment-info-row">
            <span class="equipment-info-icon">📊</span>
            <span class="equipment-info-label">Calibration History</span>
            <span class="equipment-info-badge ${statusInfo.calibrationClass}">${statusInfo.calibrationText}</span>
            <button class="equipment-info-chevron">›</button>
          </div>

          <div class="equipment-info-row">
            <span class="equipment-info-icon">📋</span>
            <span class="equipment-info-label">Associated SOPs</span>
            <span class="equipment-info-value">${statusInfo.sopsText}</span>
            <button class="equipment-info-chevron">›</button>
          </div>
        </div>

        <div class="equipment-detail-footer">
          Last Verified ${statusInfo.lastVerified} • System Derived
        </div>
      </div>
    `;

    // Add to body
    document.body.appendChild(card);

    // Setup button handlers
    const expandBtn = card.querySelector('.btn-expand');
    const copyBtn = card.querySelector('.btn-copy');
    const closeBtn = card.querySelector('.equipment-close-btn');

    expandBtn?.addEventListener('click', () => {
      this.openEquipmentApp(equipment);
      card.remove();
    });

    copyBtn?.addEventListener('click', () => {
      this.copyEquipmentInfo(equipment);
    });

    closeBtn?.addEventListener('click', () => {
      card.remove();
    });

    // Click outside to close
    setTimeout(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (!card.contains(e.target as Node)) {
          card.remove();
          document.removeEventListener('click', handleOutsideClick);
        }
      };
      document.addEventListener('click', handleOutsideClick);
    }, 100);
  }

  /**
   * Get mock status information
   */
  private getMockStatusInfo(equipment: Equipment): any {
    const hash = equipment.equipment_id.split('-')[1] || '00001';
    const num = parseInt(hash, 10);

    return {
      statusText: '✓ In Commission',
      statusClass: 'status-commissioned',
      locationUpdate: '03Dec2029',
      maintenanceText: num % 3 === 0 ? '✓ Ready! - Up to date' : 'Due Soon - Schedule maintenance',
      maintenanceClass: num % 3 === 0 ? 'status-success' : 'status-warning',
      calibrationText: num % 2 === 0 ? '⚠ Warning - Expires in 1 day' : 'Valid until ' + new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      calibrationClass: num % 2 === 0 ? 'status-warning' : 'status-success',
      sopsText: `Referenced in ${num % 7 + 1} SOPs`,
      lastVerified: '13Feb2024'
    };
  }

  /**
   * Copy equipment info to clipboard
   */
  private copyEquipmentInfo(equipment: Equipment): void {
    const info = `
Equipment: ${equipment.equipment_name}
Model: ${equipment.model_number || 'N/A'}
Serial: ${equipment.serial_number || 'N/A'}
Internal ID: ${equipment.internal_id || 'N/A'}
Location: ${equipment.location || 'N/A'}
    `.trim();

    navigator.clipboard.writeText(info).then(() => {
      console.log('Copied to clipboard!');
    });
  }

  /**
   * Open full Equipment app
   */
  private openEquipmentApp(equipment?: Equipment): void {
    const event = new CustomEvent('open-equipment-app', {
      detail: { equipmentId: equipment?.equipment_id }
    });
    window.dispatchEvent(event);
    console.log('Opening Equipment app', equipment ? `for: ${equipment.equipment_name}` : '');
  }

  /**
   * Refresh widget data
   */
  public refresh(): void {
    this.loadRecentItems();
    this.renderRecentItems();
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.container.innerHTML = '';
  }
}
