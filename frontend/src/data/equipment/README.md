# Equipment Data Module

Static TypeScript data for the Equipment app, generated from CSV files.

## 📁 Structure

```
equipment/
├── equipment.ts          ← 688 equipment records
├── manufacturers.ts      ← 48 manufacturers (lookup table)
├── vendors.ts           ← 37 vendors (lookup table)
├── locations.ts         ← 280 locations (lookup table)
├── departments.ts       ← Departments (lookup table)
├── subDepartments.ts    ← Sub-departments (lookup table)
├── categories.ts        ← Categories (lookup table)
├── statuses.ts          ← Status values (lookup table)
├── queries.ts           ← Query helper functions
├── index.ts             ← Barrel export
└── README.md            ← This file
```

## 🔧 Usage

### Import Equipment Data

```typescript
import { equipment, manufacturers, vendors } from '@/data/equipment';

// Get all equipment
console.log(equipment); // Array of 688 equipment objects

// Get all manufacturers
console.log(manufacturers); // Array of 48 manufacturer objects
```

### Use Query Helpers

```typescript
import {
  getEquipmentById,
  searchEquipment,
  getEquipmentByLocation,
  filterEquipment,
  paginateEquipment
} from '@/data/equipment/queries';

// Find specific equipment
const washer = getEquipmentById('EQ-00001');
console.log(washer.equipment_name); // "406 Washer"

// Search equipment
const results = searchEquipment('BioTek');
console.log(results.length); // All BioTek equipment

// Filter by location
const processingEquipment = getEquipmentByLocation('Processing');

// Advanced filtering
const filtered = filterEquipment({
  location: 'Processing',
  hasServiceContract: true,
  internetRequired: true
});

// Pagination
const page1 = paginateEquipment(equipment, 1, 50);
console.log(page1.data); // First 50 records
console.log(page1.totalPages); // Total pages
```

## 📊 Data Schema

### Equipment Record

```typescript
{
  equipment_id: string;           // "EQ-00001"
  equipment_name: string;         // "406 Washer"
  internal_id: string;            // "PLPWS102"
  elims_id: string;               // "CUS034-0000381-INS"
  asset_sticker_id: string | null;
  location: string | null;        // "Processing"
  manufacturer: string | null;    // "BioTek"
  vendor: string | null;          // "BioTek"
  model_number: string | null;
  serial_number: string | null;
  manufactured_date: string | null;
  software: string | null;
  computer_user_id: string | null;
  department: string | null;
  sub_department: string | null;
  category: string | null;
  status: string | null;
  assigned_fte: string | null;
  assigned_manager: string | null;
  internet_required: string | null;
  temperature_setting: string | null;
  co2_percentage: string | null;
  humidity_setting: string | null;
  minus80_tracker_id: string | null;
  software_version: string | null;
  raw_data_export_location: string | null;
  service_contract_vendor: string | null;
  service_contract_number: string | null;
  service_contract_phone: string | null;
  service_contract_email: string | null;
  notes: string | null;
}
```

### Lookup Table Record

```typescript
{
  id: string;        // "manufacturers-001"
  name: string;      // "BioTek"
  isActive: boolean; // true
}
```

## 🔄 Regenerating Data

If you need to update the equipment data from a new CSV file:

```bash
cd /Users/programmer/Projects/Symbiosis
node scripts/csv-to-typescript.js <input.csv> frontend/src/data/equipment
```

This will regenerate all `.ts` files with the latest data.

## 🚀 Future: Migration to API

When you're ready to move to a real database and API:

1. **Backend:** Create API endpoints:
   - `GET /api/equipment`
   - `GET /api/equipment/:id`
   - `GET /api/equipment/search?q=...`
   - `GET /api/manufacturers`
   - etc.

2. **Frontend:** Update `queries.ts` to use `fetch()`:

```typescript
// Before (static data)
export function getEquipmentById(id: string) {
  return equipment.find(e => e.equipment_id === id) || null;
}

// After (API)
export async function getEquipmentById(id: string) {
  const response = await fetch(`/api/equipment/${id}`);
  return response.json();
}
```

3. **Components:** No changes needed! ✅
   - Components already use the query functions
   - Just handle async/await in components

## 📈 Statistics

- **Total Equipment:** 688 records
- **Manufacturers:** 48 unique
- **Vendors:** 37 unique
- **Locations:** 280 unique
- **Generated:** 2025-12-27

## 🎯 Design Phase Benefits

✅ **No database setup** - Work with real data immediately
✅ **Fast iteration** - Edit TS files directly for testing
✅ **Type safety** - Full TypeScript intellisense
✅ **Portable** - Easy to version control
✅ **Testable** - No API mocking needed
✅ **Future-proof** - Easy migration path to API

---

**Next Steps:**
1. Build Equipment widget UI using these query functions
2. Build Equipment app UI
3. Test with real data
4. When ready: Migrate to database + API
