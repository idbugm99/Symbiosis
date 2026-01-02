/**
 * Company Organization Structure
 * Static data for business units, departments, and organizational hierarchy
 */

export const company = {
  name: 'Eurofins',
  fullName: 'Eurofins Scientific',
  location: 'Saint Louis, MO'
};

export const departments = [
  {
    id: 'DEPT-001',
    name: 'BioPace Sciences',
    code: 'BIO',
    description: 'Biological and pharmaceutical testing services'
  },
  {
    id: 'DEPT-002',
    name: 'Analytical Services',
    code: 'ANA',
    description: 'Chemical analysis and testing laboratory'
  }
];

export const businessUnits = [
  {
    id: 'BU-001',
    name: 'Laboratory Services',
    departments: ['DEPT-001', 'DEPT-002']
  },
  {
    id: 'BU-002',
    name: 'Quality Control',
    departments: ['DEPT-001', 'DEPT-002']
  }
];

/**
 * Get unique locations from equipment data
 * This will be dynamically populated from the equipment records
 */
export function getEquipmentLocations(): string[] {
  // These match the 10 Eurofins labs we created
  return [
    'Analytical Chemistry Laboratory',
    'Microbiology & Virology Lab',
    'Molecular Biology Laboratory',
    'Environmental Testing Facility',
    'Food Safety Laboratory',
    'Pharmaceutical Analysis Lab',
    'Quality Control Laboratory',
    'Sample Receiving & Preparation',
    'Clinical Diagnostics Laboratory',
    'Genomics & Proteomics Lab'
  ];
}

/**
 * Get equipment statuses
 */
export function getEquipmentStatuses(): Array<{value: string; label: string; color: string}> {
  return [
    { value: 'in_commission', label: 'In Commission', color: '#10b981' },
    { value: 'ready', label: 'Ready for Use', color: '#10b981' },
    { value: 'restricted', label: 'Restricted', color: '#f59e0b' },
    { value: 'maintenance', label: 'Maintenance Required', color: '#ef4444' },
    { value: 'decommissioned', label: 'Decommissioned', color: '#6b7280' },
    { value: 'calibration_due', label: 'Calibration Due', color: '#f59e0b' }
  ];
}
