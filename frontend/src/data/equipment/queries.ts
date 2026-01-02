/**
 * Equipment Data Queries
 * Helper functions to query static equipment data
 *
 * These functions work with static arrays NOW, but can easily be swapped
 * to use fetch() calls to API endpoints LATER without changing components.
 */

import { equipment } from './equipment';
import { manufacturers } from './manufacturers';
import { vendors } from './vendors';
import { locations } from './locations';

/**
 * Equipment Queries
 */

export function getAllEquipment() {
  return equipment;
}

export function getEquipmentById(id: string) {
  return equipment.find(e => e.equipment_id === id) || null;
}

export function getEquipmentByInternalId(internalId: string) {
  return equipment.find(e => e.internal_id === internalId) || null;
}

export function getEquipmentByLocation(location: string) {
  return equipment.filter(e => e.location === location);
}

export function getEquipmentByManufacturer(manufacturerName: string) {
  return equipment.filter(e => e.manufacturer === manufacturerName);
}

export function getEquipmentByDepartment(department: string) {
  return equipment.filter(e => e.department === department);
}

export function getEquipmentByCategory(category: string) {
  return equipment.filter(e => e.category === category);
}

export function searchEquipment(query: string) {
  const lowerQuery = query.toLowerCase();
  return equipment.filter(e =>
    e.equipment_name?.toLowerCase().includes(lowerQuery) ||
    e.internal_id?.toLowerCase().includes(lowerQuery) ||
    e.manufacturer?.toLowerCase().includes(lowerQuery) ||
    e.model_number?.toLowerCase().includes(lowerQuery) ||
    e.serial_number?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Manufacturer Queries
 */

export function getAllManufacturers() {
  return manufacturers;
}

export function getManufacturerById(id: string) {
  return manufacturers.find(m => m.id === id) || null;
}

export function getActiveManufacturers() {
  return manufacturers.filter(m => m.isActive);
}

/**
 * Vendor Queries
 */

export function getAllVendors() {
  return vendors;
}

export function getVendorById(id: string) {
  return vendors.find(v => v.id === id) || null;
}

export function getActiveVendors() {
  return vendors.filter(v => v.isActive);
}

/**
 * Location Queries
 */

export function getAllLocations() {
  return locations;
}

export function getLocationById(id: string) {
  return locations.find(l => l.id === id) || null;
}

export function getActiveLocations() {
  return locations.filter(l => l.isActive);
}

/**
 * Statistics Queries
 */

export function getEquipmentCountByLocation() {
  const counts: Record<string, number> = {};
  equipment.forEach(e => {
    if (e.location) {
      counts[e.location] = (counts[e.location] || 0) + 1;
    }
  });
  return counts;
}

export function getEquipmentCountByManufacturer() {
  const counts: Record<string, number> = {};
  equipment.forEach(e => {
    if (e.manufacturer) {
      counts[e.manufacturer] = (counts[e.manufacturer] || 0) + 1;
    }
  });
  return counts;
}

export function getTotalEquipmentCount() {
  return equipment.length;
}

/**
 * Filter Builder (Advanced Queries)
 */

interface EquipmentFilters {
  location?: string;
  manufacturer?: string;
  department?: string;
  category?: string;
  hasServiceContract?: boolean;
  internetRequired?: boolean;
}

export function filterEquipment(filters: EquipmentFilters) {
  let results = equipment;

  if (filters.location) {
    results = results.filter(e => e.location === filters.location);
  }

  if (filters.manufacturer) {
    results = results.filter(e => e.manufacturer === filters.manufacturer);
  }

  if (filters.department) {
    results = results.filter(e => e.department === filters.department);
  }

  if (filters.category) {
    results = results.filter(e => e.category === filters.category);
  }

  if (filters.hasServiceContract !== undefined) {
    results = results.filter(e =>
      filters.hasServiceContract
        ? !!e.service_contract_vendor
        : !e.service_contract_vendor
    );
  }

  if (filters.internetRequired !== undefined) {
    results = results.filter(e => e.internet_required === String(filters.internetRequired));
  }

  return results;
}

/**
 * Pagination Helper
 */

export function paginateEquipment(
  equipmentList: typeof equipment,
  page: number = 1,
  pageSize: number = 50
) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    data: equipmentList.slice(startIndex, endIndex),
    total: equipmentList.length,
    page,
    pageSize,
    totalPages: Math.ceil(equipmentList.length / pageSize)
  };
}
