/**
 * Current User & Permissions
 * Static user data and permission checking logic
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'scientist' | 'technician';
  department_id?: string;
  permissions: Permission[];
}

export type Permission =
  | 'equipment.view'
  | 'equipment.add'
  | 'equipment.edit'
  | 'equipment.delete'
  | 'equipment.export'
  | 'service.view'
  | 'service.add'
  | 'service.edit'
  | 'service.delete'
  | 'labels.generate'
  | 'admin.all';

/**
 * Current logged-in user (Admin for now)
 */
export const currentUser: User = {
  id: 'USR-00001',
  name: 'System Administrator',
  email: 'admin@eurofins.com',
  role: 'admin',
  permissions: [
    'equipment.view',
    'equipment.add',
    'equipment.edit',
    'equipment.delete',
    'equipment.export',
    'service.view',
    'service.add',
    'service.edit',
    'service.delete',
    'labels.generate',
    'admin.all'
  ]
};

/**
 * Check if current user has a specific permission
 */
export function hasPermission(permission: Permission): boolean {
  // Admin role has all permissions
  if (currentUser.role === 'admin' || currentUser.permissions.includes('admin.all')) {
    return true;
  }

  return currentUser.permissions.includes(permission);
}

/**
 * Check if current user can edit equipment
 */
export function canEditEquipment(): boolean {
  return hasPermission('equipment.edit');
}

/**
 * Check if current user can add equipment
 */
export function canAddEquipment(): boolean {
  return hasPermission('equipment.add');
}

/**
 * Check if current user can delete equipment
 */
export function canDeleteEquipment(): boolean {
  return hasPermission('equipment.delete');
}

/**
 * Check if current user can manage service records
 */
export function canManageServices(): boolean {
  return hasPermission('service.add') && hasPermission('service.edit');
}

/**
 * Check if current user can generate labels
 */
export function canGenerateLabels(): boolean {
  return hasPermission('labels.generate');
}
