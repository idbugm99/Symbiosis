/**
 * Service Records Data
 * Dummy service/maintenance records for equipment
 */

export interface ServiceRecord {
  record_id: string;
  equipment_id: string;
  service_date: string; // DDMmmYYYY format
  service_type: 'maintenance' | 'calibration' | 'repair' | 'inspection';
  technician_name: string;
  description: string;
  status: 'completed' | 'pending' | 'scheduled';
  cost?: number;
  next_service_due?: string; // DDMmmYYYY format
  notes?: string;
}

export const serviceRecords: ServiceRecord[] = [
  // MSD Equipment (EQ-00002)
  {
    record_id: 'SVC-00001',
    equipment_id: 'EQ-00002',
    service_date: '23Apr2024',
    service_type: 'maintenance',
    technician_name: 'David Martinez',
    description: 'Routine maintenance - cleaned optical components, verified voltage stability',
    status: 'completed',
    cost: 250.00,
    next_service_due: '23Oct2024',
    notes: 'All systems operating within normal parameters'
  },
  {
    record_id: 'SVC-00002',
    equipment_id: 'EQ-00002',
    service_date: '05Mar2024',
    service_type: 'calibration',
    technician_name: 'Sarah Chen',
    description: 'Annual calibration - adjusted sensitivity settings',
    status: 'completed',
    cost: 450.00,
    next_service_due: '05Mar2025',
    notes: 'Calibration certificate attached'
  },

  // 406 Washer (EQ-00001)
  {
    record_id: 'SVC-00003',
    equipment_id: 'EQ-00001',
    service_date: '15Jun2024',
    service_type: 'maintenance',
    technician_name: 'Emily Willson',
    description: 'Quarterly maintenance - replaced wash head gaskets',
    status: 'completed',
    cost: 175.00,
    next_service_due: '15Sep2024'
  },
  {
    record_id: 'SVC-00004',
    equipment_id: 'EQ-00001',
    service_date: '15Sep2024',
    service_type: 'maintenance',
    technician_name: 'Emily Willson',
    description: 'Scheduled quarterly maintenance',
    status: 'scheduled',
    next_service_due: '15Dec2024'
  },

  // BioMek (EQ-00003)
  {
    record_id: 'SVC-00005',
    equipment_id: 'EQ-00003',
    service_date: '12Jan2024',
    service_type: 'calibration',
    technician_name: 'Michael Rodriguez',
    description: 'Pipetting accuracy calibration - all channels tested',
    status: 'completed',
    cost: 850.00,
    next_service_due: '12Jan2025',
    notes: 'Replaced tip holders on channels 3 and 7'
  },
  {
    record_id: 'SVC-00006',
    equipment_id: 'EQ-00003',
    service_date: '28Feb2024',
    service_type: 'repair',
    technician_name: 'Michael Rodriguez',
    description: 'Emergency repair - replaced X-axis motor',
    status: 'completed',
    cost: 1250.00,
    notes: 'Motor failure during high-throughput run. Covered under warranty.'
  },

  // Envision (EQ-00004)
  {
    record_id: 'SVC-00007',
    equipment_id: 'EQ-00004',
    service_date: '08May2024',
    service_type: 'maintenance',
    technician_name: 'Jennifer Park',
    description: 'Annual preventive maintenance - cleaned optical system',
    status: 'completed',
    cost: 325.00,
    next_service_due: '08May2025'
  },
  {
    record_id: 'SVC-00008',
    equipment_id: 'EQ-00004',
    service_date: '20Aug2024',
    service_type: 'inspection',
    technician_name: 'Jennifer Park',
    description: 'Quarterly safety inspection',
    status: 'completed'
  }
];

/**
 * Get service records for a specific equipment
 */
export function getServiceRecordsByEquipment(equipmentId: string): ServiceRecord[] {
  return serviceRecords.filter(record => record.equipment_id === equipmentId);
}

/**
 * Get upcoming service records (scheduled or due soon)
 */
export function getUpcomingServices(): ServiceRecord[] {
  return serviceRecords.filter(record => record.status === 'scheduled');
}

/**
 * Get recent service records (last 90 days)
 */
export function getRecentServices(days: number = 90): ServiceRecord[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return serviceRecords
    .filter(record => {
      const recordDate = parseDate(record.service_date);
      return recordDate >= cutoffDate;
    })
    .sort((a, b) => parseDate(b.service_date).getTime() - parseDate(a.service_date).getTime());
}

/**
 * Parse DDMmmYYYY date format to Date object
 */
function parseDate(dateStr: string): Date {
  const months: {[key: string]: number} = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  const day = parseInt(dateStr.substring(0, 2));
  const month = months[dateStr.substring(2, 5)];
  const year = parseInt(dateStr.substring(5, 9));

  return new Date(year, month, day);
}
