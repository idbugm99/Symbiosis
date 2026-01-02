/**
 * Equipment Management Application
 * Full-screen equipment management with search, filter, CRUD operations
 */

import './EquipmentApp.css';
import { equipment as equipmentData } from '../data/equipment/equipment';
import { getEquipmentLocations, getEquipmentStatuses, businessUnits } from '../data/company/structure';
import { canAddEquipment, canEditEquipment } from '../data/user/current-user';
import { getServiceRecordsByEquipment, serviceRecords, type ServiceRecord } from '../data/equipment/service-records';
import type { equipment as EquipmentType } from '../data/equipment/equipment';

type Equipment = typeof EquipmentType[0];

export class EquipmentApp {
  private container: HTMLElement;
  private equipment: Equipment[] = [...equipmentData];
  private filteredEquipment: Equipment[] = [];
  private searchQuery: string = '';
  private activeFilters = {
    status: '',
    location: '',
    businessUnit: ''
  };
  private pinnedSearches = ['Incubators', 'Pipettors', 'Centrifuges', 'Autoclaves'];
  private currentView: 'list' | 'detail' | 'add' | 'edit' | 'service-add' | 'service-edit' | 'label' = 'list';
  private currentEquipment: Equipment | null = null;
  private currentServiceRecord: ServiceRecord | null = null;
  private selectedEquipmentId: string | null = null; // For split-panel selection

  constructor(container: HTMLElement) {
    this.container = container;
    this.filteredEquipment = [...this.equipment];
    this.render();
    this.setupEventListeners();
  }

  /**
   * Main render method - Modal with split panel layout
   */
  private render(): void {
    this.container.innerHTML = `
      <!-- Modal Backdrop -->
      <div class="equipment-modal-backdrop"></div>

      <!-- Modal Container -->
      <div class="equipment-modal">
        <!-- Modal Header -->
        <div class="equipment-modal-header">
          <div class="equipment-modal-title">
            <span class="equipment-modal-icon">🔬</span>
            <span>Equipment</span>
            <span class="equipment-modal-count">${this.equipment.length} items</span>
          </div>
          <button class="equipment-modal-close" title="Close (ESC)">
            <span>×</span>
          </button>
        </div>

        <!-- Modal Body - Split Panel -->
        <div class="equipment-modal-body">
          <!-- Left Panel: Search & List -->
          <div class="equipment-left-panel">
            <!-- Search Bar -->
            <div class="equipment-search-bar">
              <span class="equipment-search-icon">🔍</span>
              <input
                type="text"
                class="equipment-search-input"
                placeholder="Search equipment..."
                autocomplete="off"
              />
            </div>

            <!-- Pinned Searches -->
            <div class="equipment-pinned-section">
              <span class="equipment-pinned-label">Pinned</span>
              <div class="equipment-pinned-buttons">
                ${this.pinnedSearches.map(search => `
                  <button class="equipment-pinned-btn" data-search="${search}">
                    ${this.getPinnedIcon(search)} ${search}
                  </button>
                `).join('')}
                <button class="equipment-pinned-btn" data-search="">
                  View All
                </button>
              </div>
            </div>

            <!-- Filters -->
            <div class="equipment-filters-compact">
              <select class="equipment-filter-select filter-status">
                <option value="">All Statuses</option>
                ${getEquipmentStatuses().map(status => `
                  <option value="${status.value}">${status.label}</option>
                `).join('')}
              </select>

              <select class="equipment-filter-select filter-location">
                <option value="">All Locations</option>
                ${getEquipmentLocations().map(location => `
                  <option value="${location}">${location}</option>
                `).join('')}
              </select>

              <select class="equipment-filter-select filter-business-unit">
                <option value="">All Units</option>
                ${businessUnits.map(bu => `
                  <option value="${bu.id}">${bu.name}</option>
                `).join('')}
              </select>
            </div>

            <!-- Equipment List -->
            <div class="equipment-list-container">
              <div class="equipment-list-header">
                <span class="equipment-list-count">${this.filteredEquipment.length} items</span>
              </div>
              <div class="equipment-list-scroll">
                <!-- Equipment items will be rendered here -->
              </div>
            </div>
          </div>

          <!-- Right Panel: Details -->
          <div class="equipment-right-panel">
            ${this.selectedEquipmentId ? this.renderRightPanelContent() : this.renderRightPanelEmpty()}
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="equipment-modal-footer">
          ${canAddEquipment() ? `
            <button class="equipment-app-btn equipment-app-btn-primary btn-add-equipment">
              + Add Equipment
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Render equipment list
    this.renderEquipmentList();
  }

  /**
   * Render equipment list items
   */
  private renderEquipmentList(): void {
    const listContainer = this.container.querySelector('.equipment-list-scroll');
    const countElement = this.container.querySelector('.equipment-list-count');

    if (!listContainer) return;

    // Update count
    if (countElement) {
      countElement.textContent = `${this.filteredEquipment.length} items`;
    }

    // Empty state
    if (this.filteredEquipment.length === 0) {
      listContainer.innerHTML = `
        <div class="equipment-empty-state">
          <div class="equipment-empty-icon">🔍</div>
          <div class="equipment-empty-title">No equipment found</div>
          <div class="equipment-empty-text">
            ${this.searchQuery || Object.values(this.activeFilters).some(f => f)
              ? 'Try adjusting your search or filters'
              : 'No equipment has been added yet'}
          </div>
        </div>
      `;
      return;
    }

    // Render items (compact version for list)
    listContainer.innerHTML = this.filteredEquipment.map(eq => {
      const icon = this.getEquipmentIcon(eq.equipment_name || '');
      const status = this.getEquipmentStatus(eq);
      const isSelected = this.selectedEquipmentId === eq.equipment_id;

      return `
        <div class="equipment-list-item ${isSelected ? 'selected' : ''}" data-equipment-id="${eq.equipment_id}">
          <div class="equipment-item-icon">${icon}</div>
          <div class="equipment-item-main">
            <div class="equipment-item-name">${eq.equipment_name || 'Unknown Equipment'}</div>
            <div class="equipment-item-id">${eq.internal_id || eq.equipment_id}</div>
            <div class="equipment-item-meta">
              <span class="equipment-item-status ${status.class}">${status.icon} ${status.text}</span>
              <span class="equipment-item-location">
                📍 ${eq.location || 'Unknown Location'}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers - now shows details in right panel
    listContainer.querySelectorAll('.equipment-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const equipmentId = item.getAttribute('data-equipment-id');
        if (equipmentId) {
          this.selectEquipment(equipmentId);
        }
      });
    });
  }

  /**
   * Select an equipment item (shows details in right panel)
   */
  private selectEquipment(equipmentId: string): void {
    this.selectedEquipmentId = equipmentId;
    const equipment = this.equipment.find(eq => eq.equipment_id === equipmentId);
    if (equipment) {
      this.currentEquipment = equipment;
    }

    // Update the right panel
    const rightPanel = this.container.querySelector('.equipment-right-panel');
    if (rightPanel) {
      rightPanel.innerHTML = this.renderRightPanelContent();
      this.setupRightPanelEventListeners();
    }

    // Update selected state in list
    this.container.querySelectorAll('.equipment-list-item').forEach(item => {
      if (item.getAttribute('data-equipment-id') === equipmentId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  /**
   * Render right panel content (equipment details)
   */
  private renderRightPanelContent(): string {
    if (!this.currentEquipment) return this.renderRightPanelEmpty();

    const equipment = this.currentEquipment;
    const serviceRecords = getServiceRecordsByEquipment(equipment.equipment_id);
    const icon = this.getEquipmentIcon(equipment.equipment_name || '');
    const status = this.getEquipmentStatus(equipment);

    return `
      <div class="equipment-detail-view">
        <!-- Detail Header -->
        <div class="equipment-detail-header">
          <div class="equipment-detail-header-main">
            <div class="equipment-detail-icon">${icon}</div>
            <div class="equipment-detail-title-group">
              <h2 class="equipment-detail-name">${equipment.equipment_name || 'Unknown Equipment'}</h2>
              <div class="equipment-detail-ids">
                <span class="equipment-detail-id">${equipment.equipment_id}</span>
                ${equipment.internal_id ? `<span class="equipment-detail-separator">•</span><span class="equipment-detail-id">${equipment.internal_id}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="equipment-detail-actions">
            ${canEditEquipment() ? `
              <button class="equipment-icon-btn btn-print-label" title="Print Label">
                🏷️
              </button>
              <button class="equipment-icon-btn btn-edit-equipment" title="Edit">
                ✏️
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Status Banner -->
        <div class="equipment-detail-status ${status.class}">
          ${status.icon} ${status.text}
        </div>

        <!-- Scrollable Content -->
        <div class="equipment-detail-scroll">
          <!-- Info Grid -->
          <div class="equipment-info-grid">
            ${this.renderDetailField('Location', equipment.location)}
            ${this.renderDetailField('Manufacturer', equipment.manufacturer)}
            ${this.renderDetailField('Model', equipment.model_number)}
            ${this.renderDetailField('Serial Number', equipment.serial_number)}
            ${this.renderDetailField('Manufactured', equipment.manufactured_date)}
            ${this.renderDetailField('ELIMS ID', equipment.elims_id)}
          </div>

          <!-- Service Records -->
          <div class="equipment-service-section">
            <div class="equipment-service-header">
              <h3 class="equipment-section-title">Service History (${serviceRecords.length})</h3>
              ${canEditEquipment() ? `
                <button class="equipment-text-btn btn-add-service-record">
                  + Add Record
                </button>
              ` : ''}
            </div>
            ${serviceRecords.length > 0 ? `
              <div class="service-records-compact">
                ${serviceRecords.slice(0, 3).map(record => this.renderServiceRecordCompact(record)).join('')}
              </div>
              ${serviceRecords.length > 3 ? `
                <div class="service-records-more">+${serviceRecords.length - 3} more records</div>
              ` : ''}
            ` : `
              <div class="service-records-empty-compact">
                No service records yet
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render right panel empty state
   */
  private renderRightPanelEmpty(): string {
    return `
      <div class="equipment-detail-empty">
        <div class="equipment-detail-empty-icon">🔬</div>
        <div class="equipment-detail-empty-title">Select Equipment</div>
        <div class="equipment-detail-empty-text">
          Click on an equipment item from the list to view its details
        </div>
      </div>
    `;
  }

  /**
   * Render a compact service record
   */
  private renderServiceRecordCompact(record: ServiceRecord): string {
    const statusClass = record.status === 'completed' ? 'completed' :
                       record.status === 'scheduled' ? 'scheduled' : 'pending';
    const typeIcon = {
      'maintenance': '🔧',
      'calibration': '📏',
      'repair': '🛠️',
      'inspection': '🔍'
    }[record.service_type] || '📋';

    return `
      <div class="service-record-compact ${statusClass} clickable" data-record-id="${record.record_id}">
        <div class="service-record-compact-header">
          <span class="service-record-compact-icon">${typeIcon}</span>
          <span class="service-record-compact-type">${record.service_type.charAt(0).toUpperCase() + record.service_type.slice(1)}</span>
          <span class="service-record-compact-date">${record.service_date}</span>
        </div>
        <div class="service-record-compact-description">${record.description}</div>
        <div class="service-record-compact-tech">By ${record.technician_name}</div>
      </div>
    `;
  }

  /**
   * Setup event listeners for modal
   */
  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.container.querySelector('.equipment-modal-close');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    // Backdrop click to close
    const backdrop = this.container.querySelector('.equipment-modal-backdrop');
    backdrop?.addEventListener('click', () => {
      this.close();
    });

    // Add equipment button
    const addBtn = this.container.querySelector('.btn-add-equipment');
    addBtn?.addEventListener('click', () => {
      this.showAddEquipmentForm();
    });

    // Search input
    const searchInput = this.container.querySelector('.equipment-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value.trim();
      this.applyFilters();
    });

    // Pinned searches
    this.container.querySelectorAll('.equipment-pinned-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const search = (e.currentTarget as HTMLElement).dataset.search || '';
        if (searchInput) {
          searchInput.value = search;
          this.searchQuery = search;
          this.applyFilters();
        }
      });
    });

    // Filter dropdowns
    const statusFilter = this.container.querySelector('.filter-status') as HTMLSelectElement;
    const locationFilter = this.container.querySelector('.filter-location') as HTMLSelectElement;
    const buFilter = this.container.querySelector('.filter-business-unit') as HTMLSelectElement;

    statusFilter?.addEventListener('change', (e) => {
      this.activeFilters.status = (e.target as HTMLSelectElement).value;
      this.applyFilters();
    });

    locationFilter?.addEventListener('change', (e) => {
      this.activeFilters.location = (e.target as HTMLSelectElement).value;
      this.applyFilters();
    });

    buFilter?.addEventListener('change', (e) => {
      this.activeFilters.businessUnit = (e.target as HTMLSelectElement).value;
      this.applyFilters();
    });

    // ESC key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Store handler for cleanup
    (this as any)._escapeHandler = handleEscape;
  }

  /**
   * Setup event listeners for right panel
   */
  private setupRightPanelEventListeners(): void {
    // Edit button
    const editBtn = this.container.querySelector('.btn-edit-equipment');
    editBtn?.addEventListener('click', () => {
      if (this.currentEquipment) {
        this.showEditEquipmentForm(this.currentEquipment);
      }
    });

    // Print label button
    const printBtn = this.container.querySelector('.btn-print-label');
    printBtn?.addEventListener('click', () => {
      if (this.currentEquipment) {
        this.showLabelView(this.currentEquipment);
      }
    });

    // Add service record button
    const addServiceBtn = this.container.querySelector('.btn-add-service-record');
    addServiceBtn?.addEventListener('click', () => {
      if (this.currentEquipment) {
        this.showAddServiceRecordForm(this.currentEquipment);
      }
    });

    // Service record cards (click to edit)
    this.container.querySelectorAll('.service-record-compact.clickable').forEach(card => {
      card.addEventListener('click', () => {
        const recordId = (card as HTMLElement).dataset.recordId;
        if (recordId) {
          const record = serviceRecords.find(r => r.record_id === recordId);
          if (record) {
            this.showEditServiceRecordForm(record);
          }
        }
      });
    });
  }

  /**
   * Apply search and filters
   */
  private applyFilters(): void {
    this.filteredEquipment = this.equipment.filter(eq => {
      // Search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const matchesSearch =
          (eq.equipment_name || '').toLowerCase().includes(query) ||
          (eq.internal_id || '').toLowerCase().includes(query) ||
          (eq.serial_number || '').toLowerCase().includes(query) ||
          (eq.model_number || '').toLowerCase().includes(query) ||
          (eq.location || '').toLowerCase().includes(query) ||
          (eq.manufacturer || '').toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      // Status filter (basic implementation for now)
      if (this.activeFilters.status) {
        // This would need proper status field in data
        // For now, skip status filtering
      }

      // Location filter
      if (this.activeFilters.location && eq.location !== this.activeFilters.location) {
        return false;
      }

      // Business unit filter (would need proper mapping)
      if (this.activeFilters.businessUnit) {
        // Skip for now - would need department mapping
      }

      return true;
    });

    this.renderEquipmentList();
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
    if (lowerName.includes('washer')) return '🧼';
    if (lowerName.includes('shaker')) return '📳';
    return '📦';
  }

  /**
   * Get pinned search icon
   */
  private getPinnedIcon(search: string): string {
    const lowerSearch = search.toLowerCase();
    if (lowerSearch.includes('incubator')) return '🧪';
    if (lowerSearch.includes('pipet')) return '💉';
    if (lowerSearch.includes('centrifuge')) return '🔬';
    if (lowerSearch.includes('autoclave')) return '🔥';
    return '📦';
  }

  /**
   * Get equipment status (mock for now)
   */
  private getEquipmentStatus(equipment: Equipment): { icon: string; text: string; class: string } {
    const hash = equipment.equipment_id.split('-')[1] || '00001';
    const num = parseInt(hash, 10);

    if (num % 5 === 0) {
      return { icon: '⚠️', text: 'Restricted', class: 'status-restricted' };
    }
    if (num % 3 === 0) {
      return { icon: '🔧', text: 'Maintenance Due', class: 'status-warning' };
    }
    return { icon: '✓', text: 'Ready for Use', class: 'status-ready' };
  }

  /**
   * Show equipment detail view
   */
  private showEquipmentDetail(equipment: Equipment): void {
    this.currentView = 'detail';
    this.currentEquipment = equipment;

    // Get service records for this equipment
    const serviceRecords = getServiceRecordsByEquipment(equipment.equipment_id);
    const icon = this.getEquipmentIcon(equipment.equipment_name || '');
    const status = this.getEquipmentStatus(equipment);

    this.container.innerHTML = `
      <div class="equipment-app">
        <!-- Header -->
        <div class="equipment-app-header">
          <div class="equipment-app-title-section">
            <button class="equipment-app-back-btn btn-back-to-list">
              <span>←</span>
              <span>Back to List</span>
            </button>
            <h1 class="equipment-app-title">
              ${icon} ${equipment.equipment_name || 'Unknown Equipment'}
              <span class="equipment-app-subtitle">${equipment.internal_id || equipment.equipment_id}</span>
            </h1>
          </div>
          <div class="equipment-app-actions">
            ${canEditEquipment() ? `
              <button class="equipment-app-btn equipment-app-btn-secondary btn-print-label">
                🏷️ Print Label
              </button>
              <button class="equipment-app-btn equipment-app-btn-primary btn-edit-equipment">
                ✏️ Edit
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Detail Content -->
        <div class="equipment-detail-content">
          <!-- Status Banner -->
          <div class="equipment-detail-status ${status.class}">
            ${status.icon} ${status.text}
          </div>

          <!-- Main Info Grid -->
          <div class="equipment-detail-grid">
            <!-- Basic Information -->
            <div class="equipment-detail-section">
              <h2 class="equipment-detail-section-title">Basic Information</h2>
              <div class="equipment-detail-fields">
                ${this.renderDetailField('Equipment Name', equipment.equipment_name)}
                ${this.renderDetailField('Internal ID', equipment.internal_id)}
                ${this.renderDetailField('Equipment ID', equipment.equipment_id)}
                ${this.renderDetailField('ELIMS ID', equipment.elims_id)}
                ${this.renderDetailField('Asset Sticker ID', equipment.asset_sticker_id)}
                ${this.renderDetailField('Location', equipment.location)}
              </div>
            </div>

            <!-- Manufacturer Details -->
            <div class="equipment-detail-section">
              <h2 class="equipment-detail-section-title">Manufacturer Details</h2>
              <div class="equipment-detail-fields">
                ${this.renderDetailField('Manufacturer', equipment.manufacturer)}
                ${this.renderDetailField('Vendor', equipment.vendor)}
                ${this.renderDetailField('Model Number', equipment.model_number)}
                ${this.renderDetailField('Serial Number', equipment.serial_number)}
                ${this.renderDetailField('Manufactured Date', equipment.manufactured_date)}
              </div>
            </div>

            <!-- Technical Specifications -->
            <div class="equipment-detail-section">
              <h2 class="equipment-detail-section-title">Technical Specifications</h2>
              <div class="equipment-detail-fields">
                ${this.renderDetailField('Software', equipment.software)}
                ${this.renderDetailField('Software Version', equipment.software_version)}
                ${this.renderDetailField('Computer User ID', equipment.computer_user_id)}
                ${this.renderDetailField('Temperature Setting', equipment.temperature_setting)}
                ${this.renderDetailField('CO2 Percentage', equipment.co2_percentage)}
                ${this.renderDetailField('Humidity Setting', equipment.humidity_setting)}
                ${this.renderDetailField('Raw Data Export Location', equipment.raw_data_export_location)}
              </div>
            </div>

            <!-- Service Contract -->
            <div class="equipment-detail-section">
              <h2 class="equipment-detail-section-title">Service Contract</h2>
              <div class="equipment-detail-fields">
                ${this.renderDetailField('Service Vendor', equipment.service_contract_vendor)}
                ${this.renderDetailField('Contract Number', equipment.service_contract_number)}
                ${this.renderDetailField('Service Phone', equipment.service_contract_phone)}
                ${this.renderDetailField('Service Email', equipment.service_contract_email)}
              </div>
            </div>

            <!-- QR Code Label (Placeholder) -->
            <div class="equipment-detail-section">
              <h2 class="equipment-detail-section-title">Equipment Label</h2>
              <div class="equipment-qr-placeholder">
                <div class="equipment-qr-code">
                  <div class="qr-code-box">QR</div>
                </div>
                <div class="equipment-qr-info">
                  <div class="equipment-qr-name">${equipment.equipment_name}</div>
                  <div class="equipment-qr-id">${equipment.internal_id || equipment.equipment_id}</div>
                </div>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="equipment-detail-section">
              <h2 class="equipment-detail-section-title">Additional Information</h2>
              <div class="equipment-detail-fields">
                ${this.renderDetailField('Department', equipment.department)}
                ${this.renderDetailField('Sub-Department', equipment.sub_department)}
                ${this.renderDetailField('Category', equipment.category)}
                ${this.renderDetailField('Assigned FTE', equipment.assigned_fte)}
                ${this.renderDetailField('Assigned Manager', equipment.assigned_manager)}
                ${this.renderDetailField('Internet Required', equipment.internet_required)}
                ${this.renderDetailField('Minus80 Tracker ID', equipment.minus80_tracker_id)}
              </div>
            </div>
          </div>

          <!-- Service History -->
          <div class="equipment-service-history">
            <div class="service-history-header">
              <h2 class="equipment-detail-section-title">
                Service History
                <span class="service-history-count">${serviceRecords.length} records</span>
              </h2>
              ${canEditEquipment() ? `
                <button class="equipment-app-btn equipment-app-btn-secondary btn-add-service-record">
                  + Add Service Record
                </button>
              ` : ''}
            </div>
            ${serviceRecords.length > 0 ? `
              <div class="service-records-list">
                ${serviceRecords.map(record => this.renderServiceRecord(record)).join('')}
              </div>
            ` : `
              <div class="service-records-empty">
                <div class="service-records-empty-icon">📋</div>
                <div class="service-records-empty-text">No service records found</div>
              </div>
            `}
          </div>

          <!-- Notes Section -->
          ${equipment.notes ? `
            <div class="equipment-notes-section">
              <h2 class="equipment-detail-section-title">Notes</h2>
              <div class="equipment-notes-content">${equipment.notes}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.setupDetailEventListeners();
  }

  /**
   * Render a detail field (label + value)
   */
  private renderDetailField(label: string, value: any): string {
    if (!value) return '';

    return `
      <div class="equipment-detail-field">
        <div class="equipment-detail-label">${label}</div>
        <div class="equipment-detail-value">${value}</div>
      </div>
    `;
  }

  /**
   * Render a service record card
   */
  private renderServiceRecord(record: ServiceRecord): string {
    const statusClass = record.status === 'completed' ? 'completed' :
                       record.status === 'scheduled' ? 'scheduled' : 'pending';
    const typeIcon = {
      'maintenance': '🔧',
      'calibration': '📏',
      'repair': '🛠️',
      'inspection': '🔍'
    }[record.service_type] || '📋';

    return `
      <div class="service-record-card ${statusClass} clickable" data-record-id="${record.record_id}">
        <div class="service-record-header">
          <div class="service-record-type">
            <span class="service-record-icon">${typeIcon}</span>
            <span class="service-record-type-text">${record.service_type.charAt(0).toUpperCase() + record.service_type.slice(1)}</span>
          </div>
          <div class="service-record-status status-${statusClass}">${record.status}</div>
        </div>
        <div class="service-record-date">${record.service_date}</div>
        <div class="service-record-description">${record.description}</div>
        <div class="service-record-technician">Technician: ${record.technician_name}</div>
        ${record.cost ? `<div class="service-record-cost">Cost: $${record.cost.toFixed(2)}</div>` : ''}
        ${record.next_service_due ? `<div class="service-record-next-due">Next Due: ${record.next_service_due}</div>` : ''}
        ${record.notes ? `<div class="service-record-notes">${record.notes}</div>` : ''}
      </div>
    `;
  }

  /**
   * Setup event listeners for detail view
   */
  private setupDetailEventListeners(): void {
    // Back to list button
    const backBtn = this.container.querySelector('.btn-back-to-list');
    backBtn?.addEventListener('click', () => {
      this.currentView = 'list';
      this.currentEquipment = null;
      this.render();
      this.setupEventListeners();
    });

    // Edit button
    const editBtn = this.container.querySelector('.btn-edit-equipment');
    editBtn?.addEventListener('click', () => {
      if (this.currentEquipment) {
        this.showEditEquipmentForm(this.currentEquipment);
      }
    });

    // Print label button
    const printBtn = this.container.querySelector('.btn-print-label');
    printBtn?.addEventListener('click', () => {
      if (this.currentEquipment) {
        this.showLabelView(this.currentEquipment);
      }
    });

    // Add service record button
    const addServiceBtn = this.container.querySelector('.btn-add-service-record');
    addServiceBtn?.addEventListener('click', () => {
      if (this.currentEquipment) {
        this.showAddServiceRecordForm(this.currentEquipment);
      }
    });

    // Click on service record cards to edit
    this.container.querySelectorAll('.service-record-card.clickable').forEach(card => {
      card.addEventListener('click', () => {
        const recordId = (card as HTMLElement).dataset.recordId;
        if (recordId) {
          const record = serviceRecords.find(r => r.record_id === recordId);
          if (record) {
            this.showEditServiceRecordForm(record);
          }
        }
      });
    });
  }

  /**
   * Show add equipment form
   */
  private showAddEquipmentForm(): void {
    this.currentView = 'add';

    this.container.innerHTML = `
      <div class="equipment-app">
        <!-- Header -->
        <div class="equipment-app-header">
          <div class="equipment-app-title-section">
            <button class="equipment-app-back-btn btn-back-to-list-from-add">
              <span>←</span>
              <span>Cancel</span>
            </button>
            <h1 class="equipment-app-title">
              Add New Equipment
              <span class="equipment-app-subtitle">Fill in equipment details</span>
            </h1>
          </div>
          <div class="equipment-app-actions">
            <button class="equipment-app-btn equipment-app-btn-primary btn-save-equipment">
              ✓ Save Equipment
            </button>
          </div>
        </div>

        <!-- Form Content -->
        <div class="equipment-form-content">
          <form id="add-equipment-form" class="equipment-form">
            <!-- Basic Information -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Basic Information</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Equipment Name *</label>
                  <input type="text" name="equipment_name" class="equipment-form-input" required placeholder="e.g., MSD Reader" />
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Internal ID *</label>
                  <input type="text" name="internal_id" class="equipment-form-input" required placeholder="e.g., PLPLR002" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">ELIMS ID</label>
                  <input type="text" name="elims_id" class="equipment-form-input" placeholder="e.g., CUS034-0000351-INS" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Asset Sticker ID</label>
                  <input type="text" name="asset_sticker_id" class="equipment-form-input" placeholder="e.g., 1971" />
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Location *</label>
                  <select name="location" class="equipment-form-select" required>
                    <option value="">Select Location</option>
                    ${getEquipmentLocations().map(loc => `
                      <option value="${loc}">${loc}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Manufacturer Details -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Manufacturer Details</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field">
                  <label class="equipment-form-label">Manufacturer</label>
                  <input type="text" name="manufacturer" class="equipment-form-input" placeholder="e.g., Meso Scale Discovery" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Vendor</label>
                  <input type="text" name="vendor" class="equipment-form-input" placeholder="e.g., Meso Scale Discovery" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Model Number</label>
                  <input type="text" name="model_number" class="equipment-form-input" placeholder="e.g., 1201151001355" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Serial Number</label>
                  <input type="text" name="serial_number" class="equipment-form-input" placeholder="e.g., SN123456" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Manufactured Date</label>
                  <input type="text" name="manufactured_date" class="equipment-form-input" placeholder="DDMmmYYYY (e.g., 17Apr2019)" />
                  <div class="equipment-form-hint">Format: DDMmmYYYY (e.g., 17Apr2019)</div>
                </div>
              </div>
            </div>

            <!-- Technical Specifications -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Technical Specifications</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field full-width">
                  <label class="equipment-form-label">Software</label>
                  <input type="text" name="software" class="equipment-form-input" placeholder="e.g., LHC Liquid Handling Control 2.22" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Software Version</label>
                  <input type="text" name="software_version" class="equipment-form-input" placeholder="e.g., v2.22" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Computer User ID</label>
                  <input type="text" name="computer_user_id" class="equipment-form-input" placeholder="e.g., BDUS005_USR_INSLSXY4" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Temperature Setting</label>
                  <input type="text" name="temperature_setting" class="equipment-form-input" placeholder="e.g., 37°C" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">CO2 Percentage</label>
                  <input type="text" name="co2_percentage" class="equipment-form-input" placeholder="e.g., 5%" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Humidity Setting</label>
                  <input type="text" name="humidity_setting" class="equipment-form-input" placeholder="e.g., 95%" />
                </div>

                <div class="equipment-form-field full-width">
                  <label class="equipment-form-label">Raw Data Export Location</label>
                  <input type="text" name="raw_data_export_location" class="equipment-form-input" placeholder="e.g., C:\\Data\\Export" />
                </div>
              </div>
            </div>

            <!-- Service Contract -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Service Contract</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field">
                  <label class="equipment-form-label">Service Vendor</label>
                  <input type="text" name="service_contract_vendor" class="equipment-form-input" placeholder="e.g., BioTek Service" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Contract Number</label>
                  <input type="text" name="service_contract_number" class="equipment-form-input" placeholder="e.g., SVC-2024-001" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Service Phone</label>
                  <input type="tel" name="service_contract_phone" class="equipment-form-input" placeholder="e.g., +1 (800) 123-4567" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Service Email</label>
                  <input type="email" name="service_contract_email" class="equipment-form-input" placeholder="e.g., service@biotek.com" />
                </div>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Additional Information</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field">
                  <label class="equipment-form-label">Department</label>
                  <input type="text" name="department" class="equipment-form-input" placeholder="e.g., BioPace Sciences" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Sub-Department</label>
                  <input type="text" name="sub_department" class="equipment-form-input" placeholder="e.g., Quality Control" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Category</label>
                  <input type="text" name="category" class="equipment-form-input" placeholder="e.g., Laboratory Equipment" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Assigned FTE</label>
                  <input type="text" name="assigned_fte" class="equipment-form-input" placeholder="e.g., John Doe" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Assigned Manager</label>
                  <input type="text" name="assigned_manager" class="equipment-form-input" placeholder="e.g., Jane Smith" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Internet Required</label>
                  <select name="internet_required" class="equipment-form-select">
                    <option value="">Not Specified</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Minus80 Tracker ID</label>
                  <input type="text" name="minus80_tracker_id" class="equipment-form-input" placeholder="e.g., M80-001" />
                </div>

                <div class="equipment-form-field full-width">
                  <label class="equipment-form-label">Notes</label>
                  <textarea name="notes" class="equipment-form-textarea" rows="4" placeholder="Additional notes or comments..."></textarea>
                </div>
              </div>
            </div>

            <!-- Required Fields Notice -->
            <div class="equipment-form-notice">
              <strong>*</strong> Required fields must be filled out
            </div>
          </form>
        </div>
      </div>
    `;

    this.setupAddFormEventListeners();
  }

  /**
   * Setup event listeners for add form
   */
  private setupAddFormEventListeners(): void {
    // Cancel button
    const cancelBtn = this.container.querySelector('.btn-back-to-list-from-add');
    cancelBtn?.addEventListener('click', () => {
      if (confirm('Cancel adding equipment? Any unsaved changes will be lost.')) {
        this.currentView = 'list';
        this.render();
        this.setupEventListeners();
      }
    });

    // Save button
    const saveBtn = this.container.querySelector('.btn-save-equipment');
    saveBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveNewEquipment();
    });

    // Form submission (Enter key)
    const form = this.container.querySelector('#add-equipment-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNewEquipment();
    });
  }

  /**
   * Save new equipment from form
   */
  private saveNewEquipment(): void {
    const form = this.container.querySelector('#add-equipment-form') as HTMLFormElement;

    if (!form) return;

    // Validate required fields
    if (!form.checkValidity()) {
      // Show validation errors
      form.reportValidity();
      return;
    }

    // Get form data
    const formData = new FormData(form);

    // Generate new equipment ID
    const maxId = Math.max(
      ...this.equipment.map(eq => {
        const match = eq.equipment_id.match(/EQ-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
    );
    const newId = `EQ-${String(maxId + 1).padStart(5, '0')}`;

    // Create new equipment object
    const newEquipment: Equipment = {
      equipment_id: newId,
      equipment_name: formData.get('equipment_name') as string || null,
      internal_id: formData.get('internal_id') as string || null,
      elims_id: formData.get('elims_id') as string || null,
      asset_sticker_id: formData.get('asset_sticker_id') as string || null,
      location: formData.get('location') as string || null,
      manufacturer: formData.get('manufacturer') as string || null,
      vendor: formData.get('vendor') as string || null,
      model_number: formData.get('model_number') as string || null,
      serial_number: formData.get('serial_number') as string || null,
      manufactured_date: formData.get('manufactured_date') as string || null,
      software: formData.get('software') as string || null,
      computer_user_id: formData.get('computer_user_id') as string || null,
      department: formData.get('department') as string || null,
      sub_department: formData.get('sub_department') as string || null,
      category: formData.get('category') as string || null,
      status: null,
      assigned_fte: formData.get('assigned_fte') as string || null,
      assigned_manager: formData.get('assigned_manager') as string || null,
      internet_required: formData.get('internet_required') as string || null,
      temperature_setting: formData.get('temperature_setting') as string || null,
      co2_percentage: formData.get('co2_percentage') as string || null,
      humidity_setting: formData.get('humidity_setting') as string || null,
      minus80_tracker_id: formData.get('minus80_tracker_id') as string || null,
      software_version: formData.get('software_version') as string || null,
      raw_data_export_location: formData.get('raw_data_export_location') as string || null,
      service_contract_vendor: formData.get('service_contract_vendor') as string || null,
      service_contract_number: formData.get('service_contract_number') as string || null,
      service_contract_phone: formData.get('service_contract_phone') as string || null,
      service_contract_email: formData.get('service_contract_email') as string || null,
      notes: formData.get('notes') as string || null
    };

    // Add to equipment array
    this.equipment.push(newEquipment);
    this.filteredEquipment = [...this.equipment];

    console.log('✅ New equipment added:', newEquipment);

    // Show success message and return to list
    alert(`Equipment added successfully!\n\nID: ${newId}\nName: ${newEquipment.equipment_name}\nInternal ID: ${newEquipment.internal_id}`);

    // Return to list view
    this.currentView = 'list';
    this.render();
    this.setupEventListeners();
  }

  /**
   * Show edit equipment form
   */
  private showEditEquipmentForm(equipment: Equipment): void {
    this.currentView = 'edit';
    this.currentEquipment = equipment;

    // Helper function to safely get value or empty string
    const val = (value: any) => value || '';

    this.container.innerHTML = `
      <div class="equipment-app">
        <!-- Header -->
        <div class="equipment-app-header">
          <div class="equipment-app-title-section">
            <button class="equipment-app-back-btn btn-back-to-detail-from-edit">
              <span>←</span>
              <span>Cancel</span>
            </button>
            <h1 class="equipment-app-title">
              Edit Equipment
              <span class="equipment-app-subtitle">${equipment.equipment_name} (${equipment.equipment_id})</span>
            </h1>
          </div>
          <div class="equipment-app-actions">
            <button class="equipment-app-btn equipment-app-btn-primary btn-update-equipment">
              ✓ Save Changes
            </button>
          </div>
        </div>

        <!-- Form Content -->
        <div class="equipment-form-content">
          <form id="edit-equipment-form" class="equipment-form">
            <!-- Equipment ID (read-only) -->
            <input type="hidden" name="equipment_id" value="${equipment.equipment_id}" />

            <!-- Basic Information -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Basic Information</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Equipment Name *</label>
                  <input type="text" name="equipment_name" class="equipment-form-input" required placeholder="e.g., MSD Reader" value="${val(equipment.equipment_name)}" />
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Internal ID *</label>
                  <input type="text" name="internal_id" class="equipment-form-input" required placeholder="e.g., PLPLR002" value="${val(equipment.internal_id)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">ELIMS ID</label>
                  <input type="text" name="elims_id" class="equipment-form-input" placeholder="e.g., CUS034-0000351-INS" value="${val(equipment.elims_id)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Asset Sticker ID</label>
                  <input type="text" name="asset_sticker_id" class="equipment-form-input" placeholder="e.g., 1971" value="${val(equipment.asset_sticker_id)}" />
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Location *</label>
                  <select name="location" class="equipment-form-select" required>
                    <option value="">Select Location</option>
                    ${getEquipmentLocations().map(loc => `
                      <option value="${loc}" ${equipment.location === loc ? 'selected' : ''}>${loc}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Manufacturer Details -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Manufacturer Details</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field">
                  <label class="equipment-form-label">Manufacturer</label>
                  <input type="text" name="manufacturer" class="equipment-form-input" placeholder="e.g., Meso Scale Discovery" value="${val(equipment.manufacturer)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Vendor</label>
                  <input type="text" name="vendor" class="equipment-form-input" placeholder="e.g., Meso Scale Discovery" value="${val(equipment.vendor)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Model Number</label>
                  <input type="text" name="model_number" class="equipment-form-input" placeholder="e.g., 1201151001355" value="${val(equipment.model_number)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Serial Number</label>
                  <input type="text" name="serial_number" class="equipment-form-input" placeholder="e.g., SN123456" value="${val(equipment.serial_number)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Manufactured Date</label>
                  <input type="text" name="manufactured_date" class="equipment-form-input" placeholder="DDMmmYYYY (e.g., 17Apr2019)" value="${val(equipment.manufactured_date)}" />
                  <div class="equipment-form-hint">Format: DDMmmYYYY (e.g., 17Apr2019)</div>
                </div>
              </div>
            </div>

            <!-- Technical Specifications -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Technical Specifications</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field full-width">
                  <label class="equipment-form-label">Software</label>
                  <input type="text" name="software" class="equipment-form-input" placeholder="e.g., LHC Liquid Handling Control 2.22" value="${val(equipment.software)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Software Version</label>
                  <input type="text" name="software_version" class="equipment-form-input" placeholder="e.g., v2.22" value="${val(equipment.software_version)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Computer User ID</label>
                  <input type="text" name="computer_user_id" class="equipment-form-input" placeholder="e.g., BDUS005_USR_INSLSXY4" value="${val(equipment.computer_user_id)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Temperature Setting</label>
                  <input type="text" name="temperature_setting" class="equipment-form-input" placeholder="e.g., 37°C" value="${val(equipment.temperature_setting)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">CO2 Percentage</label>
                  <input type="text" name="co2_percentage" class="equipment-form-input" placeholder="e.g., 5%" value="${val(equipment.co2_percentage)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Humidity Setting</label>
                  <input type="text" name="humidity_setting" class="equipment-form-input" placeholder="e.g., 95%" value="${val(equipment.humidity_setting)}" />
                </div>

                <div class="equipment-form-field full-width">
                  <label class="equipment-form-label">Raw Data Export Location</label>
                  <input type="text" name="raw_data_export_location" class="equipment-form-input" placeholder="e.g., C:\\Data\\Export" value="${val(equipment.raw_data_export_location)}" />
                </div>
              </div>
            </div>

            <!-- Service Contract -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Service Contract</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field">
                  <label class="equipment-form-label">Service Vendor</label>
                  <input type="text" name="service_contract_vendor" class="equipment-form-input" placeholder="e.g., BioTek Service" value="${val(equipment.service_contract_vendor)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Contract Number</label>
                  <input type="text" name="service_contract_number" class="equipment-form-input" placeholder="e.g., SVC-2024-001" value="${val(equipment.service_contract_number)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Service Phone</label>
                  <input type="tel" name="service_contract_phone" class="equipment-form-input" placeholder="e.g., +1 (800) 123-4567" value="${val(equipment.service_contract_phone)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Service Email</label>
                  <input type="email" name="service_contract_email" class="equipment-form-input" placeholder="e.g., service@biotek.com" value="${val(equipment.service_contract_email)}" />
                </div>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Additional Information</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field">
                  <label class="equipment-form-label">Department</label>
                  <input type="text" name="department" class="equipment-form-input" placeholder="e.g., BioPace Sciences" value="${val(equipment.department)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Sub-Department</label>
                  <input type="text" name="sub_department" class="equipment-form-input" placeholder="e.g., Quality Control" value="${val(equipment.sub_department)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Category</label>
                  <input type="text" name="category" class="equipment-form-input" placeholder="e.g., Laboratory Equipment" value="${val(equipment.category)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Assigned FTE</label>
                  <input type="text" name="assigned_fte" class="equipment-form-input" placeholder="e.g., John Doe" value="${val(equipment.assigned_fte)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Assigned Manager</label>
                  <input type="text" name="assigned_manager" class="equipment-form-input" placeholder="e.g., Jane Smith" value="${val(equipment.assigned_manager)}" />
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Internet Required</label>
                  <select name="internet_required" class="equipment-form-select">
                    <option value="" ${!equipment.internet_required ? 'selected' : ''}>Not Specified</option>
                    <option value="Yes" ${equipment.internet_required === 'Yes' ? 'selected' : ''}>Yes</option>
                    <option value="No" ${equipment.internet_required === 'No' ? 'selected' : ''}>No</option>
                  </select>
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Minus80 Tracker ID</label>
                  <input type="text" name="minus80_tracker_id" class="equipment-form-input" placeholder="e.g., M80-001" value="${val(equipment.minus80_tracker_id)}" />
                </div>

                <div class="equipment-form-field full-width">
                  <label class="equipment-form-label">Notes</label>
                  <textarea name="notes" class="equipment-form-textarea" rows="4" placeholder="Additional notes or comments...">${val(equipment.notes)}</textarea>
                </div>
              </div>
            </div>

            <!-- Required Fields Notice -->
            <div class="equipment-form-notice">
              <strong>*</strong> Required fields must be filled out
            </div>
          </form>
        </div>
      </div>
    `;

    this.setupEditFormEventListeners();
  }

  /**
   * Setup event listeners for edit form
   */
  private setupEditFormEventListeners(): void {
    // Cancel button - return to detail view
    const cancelBtn = this.container.querySelector('.btn-back-to-detail-from-edit');
    cancelBtn?.addEventListener('click', () => {
      if (confirm('Cancel editing? Any unsaved changes will be lost.')) {
        if (this.currentEquipment) {
          this.showEquipmentDetail(this.currentEquipment);
        }
      }
    });

    // Update button
    const updateBtn = this.container.querySelector('.btn-update-equipment');
    updateBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveEditedEquipment();
    });

    // Form submission (Enter key)
    const form = this.container.querySelector('#edit-equipment-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEditedEquipment();
    });
  }

  /**
   * Save edited equipment from form
   */
  private saveEditedEquipment(): void {
    const form = this.container.querySelector('#edit-equipment-form') as HTMLFormElement;

    if (!form) return;

    // Validate required fields
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Get form data
    const formData = new FormData(form);
    const equipmentId = formData.get('equipment_id') as string;

    // Find the equipment in the array
    const index = this.equipment.findIndex(eq => eq.equipment_id === equipmentId);

    if (index === -1) {
      alert('Error: Equipment not found!');
      return;
    }

    // Update equipment object with form data
    const updatedEquipment: Equipment = {
      equipment_id: equipmentId,
      equipment_name: formData.get('equipment_name') as string || null,
      internal_id: formData.get('internal_id') as string || null,
      elims_id: formData.get('elims_id') as string || null,
      asset_sticker_id: formData.get('asset_sticker_id') as string || null,
      location: formData.get('location') as string || null,
      manufacturer: formData.get('manufacturer') as string || null,
      vendor: formData.get('vendor') as string || null,
      model_number: formData.get('model_number') as string || null,
      serial_number: formData.get('serial_number') as string || null,
      manufactured_date: formData.get('manufactured_date') as string || null,
      software: formData.get('software') as string || null,
      computer_user_id: formData.get('computer_user_id') as string || null,
      department: formData.get('department') as string || null,
      sub_department: formData.get('sub_department') as string || null,
      category: formData.get('category') as string || null,
      status: this.equipment[index].status, // Preserve existing status
      assigned_fte: formData.get('assigned_fte') as string || null,
      assigned_manager: formData.get('assigned_manager') as string || null,
      internet_required: formData.get('internet_required') as string || null,
      temperature_setting: formData.get('temperature_setting') as string || null,
      co2_percentage: formData.get('co2_percentage') as string || null,
      humidity_setting: formData.get('humidity_setting') as string || null,
      minus80_tracker_id: formData.get('minus80_tracker_id') as string || null,
      software_version: formData.get('software_version') as string || null,
      raw_data_export_location: formData.get('raw_data_export_location') as string || null,
      service_contract_vendor: formData.get('service_contract_vendor') as string || null,
      service_contract_number: formData.get('service_contract_number') as string || null,
      service_contract_phone: formData.get('service_contract_phone') as string || null,
      service_contract_email: formData.get('service_contract_email') as string || null,
      notes: formData.get('notes') as string || null
    };

    // Update in equipment array
    this.equipment[index] = updatedEquipment;
    this.filteredEquipment = [...this.equipment];
    this.currentEquipment = updatedEquipment;

    console.log('✅ Equipment updated:', updatedEquipment);

    // Show success message and return to detail view
    alert(`Equipment updated successfully!\n\nID: ${equipmentId}\nName: ${updatedEquipment.equipment_name}\nInternal ID: ${updatedEquipment.internal_id}`);

    // Return to detail view
    this.showEquipmentDetail(updatedEquipment);
  }

  /**
   * Show add service record form
   */
  private showAddServiceRecordForm(equipment: Equipment): void {
    this.currentView = 'service-add';

    // Get current date in DDMmmYYYY format
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const defaultDate = `${String(today.getDate()).padStart(2, '0')}${months[today.getMonth()]}${today.getFullYear()}`;

    this.container.innerHTML = `
      <div class="equipment-app">
        <!-- Header -->
        <div class="equipment-app-header">
          <div class="equipment-app-title-section">
            <button class="equipment-app-back-btn btn-back-to-detail-from-service">
              <span>←</span>
              <span>Cancel</span>
            </button>
            <h1 class="equipment-app-title">
              Add Service Record
              <span class="equipment-app-subtitle">${equipment.equipment_name} (${equipment.equipment_id})</span>
            </h1>
          </div>
          <div class="equipment-app-actions">
            <button class="equipment-app-btn equipment-app-btn-primary btn-save-service-record">
              ✓ Save Record
            </button>
          </div>
        </div>

        <!-- Form Content -->
        <div class="equipment-form-content">
          <form id="add-service-record-form" class="equipment-form">
            <!-- Service Details -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Service Details</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Service Date *</label>
                  <input type="text" name="service_date" class="equipment-form-input" required placeholder="DDMmmYYYY (e.g., ${defaultDate})" value="${defaultDate}" />
                  <div class="equipment-form-hint">Format: DDMmmYYYY (e.g., ${defaultDate})</div>
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Service Type *</label>
                  <select name="service_type" class="equipment-form-select" required>
                    <option value="">Select Type</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="calibration">Calibration</option>
                    <option value="repair">Repair</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Technician Name *</label>
                  <input type="text" name="technician_name" class="equipment-form-input" required placeholder="e.g., John Smith" />
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Status *</label>
                  <select name="status" class="equipment-form-select" required>
                    <option value="">Select Status</option>
                    <option value="completed" selected>Completed</option>
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                <div class="equipment-form-field full-width required">
                  <label class="equipment-form-label">Description *</label>
                  <textarea name="description" class="equipment-form-textarea" rows="3" required placeholder="Describe the service work performed..."></textarea>
                </div>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Additional Information</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field">
                  <label class="equipment-form-label">Cost</label>
                  <input type="number" name="cost" class="equipment-form-input" placeholder="0.00" step="0.01" min="0" />
                  <div class="equipment-form-hint">Enter amount in dollars (e.g., 250.00)</div>
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Next Service Due</label>
                  <input type="text" name="next_service_due" class="equipment-form-input" placeholder="DDMmmYYYY (e.g., ${defaultDate})" />
                  <div class="equipment-form-hint">Format: DDMmmYYYY</div>
                </div>

                <div class="equipment-form-field full-width">
                  <label class="equipment-form-label">Notes</label>
                  <textarea name="notes" class="equipment-form-textarea" rows="3" placeholder="Additional notes or observations..."></textarea>
                </div>
              </div>
            </div>

            <!-- Required Fields Notice -->
            <div class="equipment-form-notice">
              <strong>*</strong> Required fields must be filled out
            </div>
          </form>
        </div>
      </div>
    `;

    this.setupAddServiceFormEventListeners();
  }

  /**
   * Setup event listeners for add service record form
   */
  private setupAddServiceFormEventListeners(): void {
    // Cancel button
    const cancelBtn = this.container.querySelector('.btn-back-to-detail-from-service');
    cancelBtn?.addEventListener('click', () => {
      if (confirm('Cancel adding service record? Any unsaved changes will be lost.')) {
        if (this.currentEquipment) {
          this.showEquipmentDetail(this.currentEquipment);
        }
      }
    });

    // Save button
    const saveBtn = this.container.querySelector('.btn-save-service-record');
    saveBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveNewServiceRecord();
    });

    // Form submission
    const form = this.container.querySelector('#add-service-record-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNewServiceRecord();
    });
  }

  /**
   * Save new service record from form
   */
  private saveNewServiceRecord(): void {
    const form = this.container.querySelector('#add-service-record-form') as HTMLFormElement;

    if (!form) return;

    // Validate required fields
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Get form data
    const formData = new FormData(form);

    if (!this.currentEquipment) {
      alert('Error: No equipment selected!');
      return;
    }

    // Generate new service record ID
    const maxId = Math.max(
      ...serviceRecords.map(sr => {
        const match = sr.record_id.match(/SVC-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
    );
    const newId = `SVC-${String(maxId + 1).padStart(5, '0')}`;

    // Parse cost (convert empty string to undefined)
    const costValue = formData.get('cost') as string;
    const cost = costValue && costValue.trim() ? parseFloat(costValue) : undefined;

    // Create new service record
    const newRecord: ServiceRecord = {
      record_id: newId,
      equipment_id: this.currentEquipment.equipment_id,
      service_date: formData.get('service_date') as string,
      service_type: formData.get('service_type') as any,
      technician_name: formData.get('technician_name') as string,
      description: formData.get('description') as string,
      status: formData.get('status') as any,
      cost: cost,
      next_service_due: (formData.get('next_service_due') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined
    };

    // Add to service records array
    serviceRecords.push(newRecord);

    console.log('✅ New service record added:', newRecord);

    // Show success message and return to detail view
    alert(`Service record added successfully!\n\nRecord ID: ${newId}\nType: ${newRecord.service_type}\nDate: ${newRecord.service_date}`);

    // Return to detail view
    this.showEquipmentDetail(this.currentEquipment);
  }

  /**
   * Show edit service record form
   */
  private showEditServiceRecordForm(record: ServiceRecord): void {
    this.currentView = 'service-edit';
    this.currentServiceRecord = record;

    // Helper function to safely get value or empty string
    const val = (value: any) => value || '';

    this.container.innerHTML = `
      <div class="equipment-app">
        <!-- Header -->
        <div class="equipment-app-header">
          <div class="equipment-app-title-section">
            <button class="equipment-app-back-btn btn-back-to-detail-from-service-edit">
              <span>←</span>
              <span>Cancel</span>
            </button>
            <h1 class="equipment-app-title">
              Edit Service Record
              <span class="equipment-app-subtitle">${record.record_id} - ${record.service_type}</span>
            </h1>
          </div>
          <div class="equipment-app-actions">
            <button class="equipment-app-btn equipment-app-btn-primary btn-update-service-record">
              ✓ Save Changes
            </button>
          </div>
        </div>

        <!-- Form Content -->
        <div class="equipment-form-content">
          <form id="edit-service-record-form" class="equipment-form">
            <!-- Record ID (read-only) -->
            <input type="hidden" name="record_id" value="${record.record_id}" />

            <!-- Service Details -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Service Details</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Service Date *</label>
                  <input type="text" name="service_date" class="equipment-form-input" required placeholder="DDMmmYYYY" value="${val(record.service_date)}" />
                  <div class="equipment-form-hint">Format: DDMmmYYYY (e.g., 17Apr2024)</div>
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Service Type *</label>
                  <select name="service_type" class="equipment-form-select" required>
                    <option value="">Select Type</option>
                    <option value="maintenance" ${record.service_type === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                    <option value="calibration" ${record.service_type === 'calibration' ? 'selected' : ''}>Calibration</option>
                    <option value="repair" ${record.service_type === 'repair' ? 'selected' : ''}>Repair</option>
                    <option value="inspection" ${record.service_type === 'inspection' ? 'selected' : ''}>Inspection</option>
                  </select>
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Technician Name *</label>
                  <input type="text" name="technician_name" class="equipment-form-input" required placeholder="e.g., John Smith" value="${val(record.technician_name)}" />
                </div>

                <div class="equipment-form-field required">
                  <label class="equipment-form-label">Status *</label>
                  <select name="status" class="equipment-form-select" required>
                    <option value="">Select Status</option>
                    <option value="completed" ${record.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="pending" ${record.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="scheduled" ${record.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                  </select>
                </div>

                <div class="equipment-form-field full-width required">
                  <label class="equipment-form-label">Description *</label>
                  <textarea name="description" class="equipment-form-textarea" rows="3" required placeholder="Describe the service work performed...">${val(record.description)}</textarea>
                </div>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="equipment-form-section">
              <h2 class="equipment-form-section-title">Additional Information</h2>
              <div class="equipment-form-grid">
                <div class="equipment-form-field">
                  <label class="equipment-form-label">Cost</label>
                  <input type="number" name="cost" class="equipment-form-input" placeholder="0.00" step="0.01" min="0" value="${record.cost || ''}" />
                  <div class="equipment-form-hint">Enter amount in dollars (e.g., 250.00)</div>
                </div>

                <div class="equipment-form-field">
                  <label class="equipment-form-label">Next Service Due</label>
                  <input type="text" name="next_service_due" class="equipment-form-input" placeholder="DDMmmYYYY" value="${val(record.next_service_due)}" />
                  <div class="equipment-form-hint">Format: DDMmmYYYY</div>
                </div>

                <div class="equipment-form-field full-width">
                  <label class="equipment-form-label">Notes</label>
                  <textarea name="notes" class="equipment-form-textarea" rows="3" placeholder="Additional notes or observations...">${val(record.notes)}</textarea>
                </div>
              </div>
            </div>

            <!-- Required Fields Notice -->
            <div class="equipment-form-notice">
              <strong>*</strong> Required fields must be filled out
            </div>
          </form>
        </div>
      </div>
    `;

    this.setupEditServiceFormEventListeners();
  }

  /**
   * Setup event listeners for edit service record form
   */
  private setupEditServiceFormEventListeners(): void {
    // Cancel button
    const cancelBtn = this.container.querySelector('.btn-back-to-detail-from-service-edit');
    cancelBtn?.addEventListener('click', () => {
      if (confirm('Cancel editing service record? Any unsaved changes will be lost.')) {
        if (this.currentEquipment) {
          this.showEquipmentDetail(this.currentEquipment);
        }
      }
    });

    // Update button
    const updateBtn = this.container.querySelector('.btn-update-service-record');
    updateBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.saveEditedServiceRecord();
    });

    // Form submission
    const form = this.container.querySelector('#edit-service-record-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEditedServiceRecord();
    });
  }

  /**
   * Save edited service record from form
   */
  private saveEditedServiceRecord(): void {
    const form = this.container.querySelector('#edit-service-record-form') as HTMLFormElement;

    if (!form) return;

    // Validate required fields
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Get form data
    const formData = new FormData(form);
    const recordId = formData.get('record_id') as string;

    // Find the service record in the array
    const index = serviceRecords.findIndex(sr => sr.record_id === recordId);

    if (index === -1) {
      alert('Error: Service record not found!');
      return;
    }

    // Parse cost (convert empty string to undefined)
    const costValue = formData.get('cost') as string;
    const cost = costValue && costValue.trim() ? parseFloat(costValue) : undefined;

    // Update service record
    const updatedRecord: ServiceRecord = {
      record_id: recordId,
      equipment_id: serviceRecords[index].equipment_id, // Preserve equipment_id
      service_date: formData.get('service_date') as string,
      service_type: formData.get('service_type') as any,
      technician_name: formData.get('technician_name') as string,
      description: formData.get('description') as string,
      status: formData.get('status') as any,
      cost: cost,
      next_service_due: (formData.get('next_service_due') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined
    };

    // Update in array
    serviceRecords[index] = updatedRecord;
    this.currentServiceRecord = updatedRecord;

    console.log('✅ Service record updated:', updatedRecord);

    // Show success message and return to detail view
    alert(`Service record updated successfully!\n\nRecord ID: ${recordId}\nType: ${updatedRecord.service_type}\nDate: ${updatedRecord.service_date}`);

    // Return to detail view
    if (this.currentEquipment) {
      this.showEquipmentDetail(this.currentEquipment);
    }
  }

  /**
   * Show label view for printing (both styles)
   */
  private showLabelView(equipment: Equipment): void {
    this.currentView = 'label';

    // Generate QR code URL using equipment ID
    // Using QR Server API for real QR codes (larger for better scanning)
    const qrData = `${equipment.equipment_id}|${equipment.internal_id}|${equipment.equipment_name}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

    const icon = this.getEquipmentIcon(equipment.equipment_name || '');
    const status = this.getEquipmentStatus(equipment);

    this.container.innerHTML = `
      <div class="equipment-app">
        <!-- Header (hidden when printing) -->
        <div class="equipment-app-header no-print">
          <div class="equipment-app-title-section">
            <button class="equipment-app-back-btn btn-back-to-detail-from-label">
              <span>←</span>
              <span>Back to Detail</span>
            </button>
            <h1 class="equipment-app-title">
              Equipment Labels
              <span class="equipment-app-subtitle">${equipment.equipment_name}</span>
            </h1>
          </div>
          <div class="equipment-app-actions">
            <button class="equipment-app-btn equipment-app-btn-primary btn-print-label-now">
              🖨️ Print Labels
            </button>
          </div>
        </div>

        <!-- Label Preview -->
        <div class="label-preview-container">
          <div class="label-print-instructions no-print">
            <div class="label-print-instructions-icon">📄</div>
            <div class="label-print-instructions-text">
              <strong>Print Instructions:</strong> Two label styles are shown below. Both will print when you click "Print Labels" or use Ctrl+P (Cmd+P on Mac).
            </div>
          </div>

          <!-- Label Style 1: Detailed Table Layout -->
          <div class="equipment-label equipment-label-detailed">
            <!-- Header with Logo, Title, QR -->
            <div class="label-detailed-header">
              <div class="label-detailed-logo">
                <div class="label-logo-circle">Company<br>Logo</div>
              </div>
              <div class="label-detailed-title">
                <div class="label-detailed-company">MSD</div>
                <div class="label-detailed-subtitle">${equipment.equipment_name || '406 Washer'}</div>
              </div>
              <div class="label-detailed-qr">
                <img src="${qrCodeUrl}" alt="QR Code" class="label-qr-image" />
              </div>
            </div>

            <!-- Divider Line -->
            <div class="label-divider"></div>

            <!-- Info Table (2 columns) -->
            <div class="label-detailed-table">
              <div class="label-table-col">
                <div class="label-table-row">
                  <span class="label-table-label">Model Number:</span>
                  <span class="label-table-value">${equipment.model_number || '406PSUB3'}</span>
                </div>
                <div class="label-table-row">
                  <span class="label-table-label">Internal ID:</span>
                  <span class="label-table-value">${equipment.internal_id || 'PLPWS102'}</span>
                </div>
                <div class="label-table-row">
                  <span class="label-table-label">Alternate ID:</span>
                  <span class="label-table-value">${equipment.elims_id || 'CUS034-0000381-INS'}</span>
                </div>
                <div class="label-table-row">
                  <span class="label-table-label">Department:</span>
                  <span class="label-table-value">${equipment.department || 'N/A'}</span>
                </div>
              </div>
              <div class="label-table-col">
                <div class="label-table-row">
                  <span class="label-table-label">Serial Number:</span>
                  <span class="label-table-value">${equipment.serial_number || '14062715'}</span>
                </div>
                <div class="label-table-row">
                  <span class="label-table-label">Asset ID:</span>
                  <span class="label-table-value">${equipment.asset_sticker_id || '2000266 Syringe & 1497 Washer'}</span>
                </div>
                <div class="label-table-row">
                  <span class="label-table-label">Vendor:</span>
                  <span class="label-table-value">${equipment.manufacturer || 'BioTek'}</span>
                </div>
                <div class="label-table-row">
                  <span class="label-table-label">Status:</span>
                  <span class="label-table-value">${status.text}</span>
                </div>
              </div>
            </div>

            <!-- Footer Icon -->
            <div class="label-footer-icon">🧪</div>
          </div>

          <!-- Label Style 2: Clean Minimal Layout -->
          <div class="equipment-label equipment-label-minimal">
            <!-- Header: MSD + QR + Logo -->
            <div class="label-minimal-header">
              <div class="label-minimal-company">MSD</div>
              <div class="label-minimal-qr">
                <img src="${qrCodeUrl}" alt="QR Code" class="label-qr-image" />
              </div>
              <div class="label-minimal-logo">
                <div class="label-logo-circle-small">Company<br>Logo</div>
              </div>
            </div>

            <!-- Divider Line -->
            <div class="label-divider"></div>

            <!-- Main Info with Left Border -->
            <div class="label-minimal-main">
              <div class="label-minimal-model">${equipment.model_number || '406PSUB3'}</div>
              <div class="label-minimal-serial">${equipment.serial_number || '14062715'}</div>
            </div>

            <!-- Settings at Bottom -->
            <div class="label-minimal-settings">
              <span class="label-setting-item">${equipment.temperature_setting || '37°C'}</span>
              <span class="label-setting-item">CO2: ${equipment.co2_percentage || '5%'}</span>
            </div>

            <!-- Footer Icon -->
            <div class="label-footer-icon">🧪</div>
          </div>

          <!-- Print Options (hidden when printing) -->
          <div class="label-options no-print">
            <div class="label-options-title">Print Options</div>
            <div class="label-options-info">
              Both label styles are optimized for printing on standard 4" x 6" (102mm x 152mm) label paper.
              <br>
              For best results, use label mode in your printer settings and select landscape orientation.
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupLabelViewEventListeners();
  }

  /**
   * Setup event listeners for label view
   */
  private setupLabelViewEventListeners(): void {
    // Back button
    const backBtn = this.container.querySelector('.btn-back-to-detail-from-label');
    backBtn?.addEventListener('click', () => {
      if (this.currentEquipment) {
        this.showEquipmentDetail(this.currentEquipment);
      }
    });

    // Print button
    const printBtn = this.container.querySelector('.btn-print-label-now');
    printBtn?.addEventListener('click', () => {
      window.print();
    });

    // Keyboard shortcut (Ctrl+P / Cmd+P)
    const handlePrint = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };

    document.addEventListener('keydown', handlePrint);

    // Clean up event listener when leaving this view
    const cleanup = () => {
      document.removeEventListener('keydown', handlePrint);
    };

    // Store cleanup function for later
    (this as any)._labelCleanup = cleanup;
  }

  /**
   * Close the app and return to dashboard
   */
  public close(): void {
    this.container.innerHTML = '';
    // Dispatch event to notify dashboard
    const event = new CustomEvent('equipment-app-closed');
    window.dispatchEvent(event);
  }

  /**
   * Refresh equipment data
   */
  public refresh(): void {
    this.equipment = [...equipmentData];
    this.applyFilters();
  }

  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    // Clean up event listeners
    if ((this as any)._escapeHandler) {
      document.removeEventListener('keydown', (this as any)._escapeHandler);
    }
    if ((this as any)._labelCleanup) {
      (this as any)._labelCleanup();
    }

    this.container.innerHTML = '';
  }
}
