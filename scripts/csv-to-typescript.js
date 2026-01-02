#!/usr/bin/env node
/**
 * CSV to TypeScript Converter
 * Converts equipment CSV data to TypeScript static data files
 *
 * Usage: node scripts/csv-to-typescript.js <input.csv> <output-dir>
 */

const fs = require('fs');
const path = require('path');

// Parse CSV to objects
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) {
      console.warn(`Line ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
      continue;
    }

    const obj = {};
    headers.forEach((header, index) => {
      let value = values[index].trim();

      // Handle empty values
      if (value === '' || value === 'N/A' || value === "Couldn't Find") {
        value = null;
      }

      obj[header] = value;
    });

    data.push(obj);
  }

  return data;
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// Extract unique values for lookup tables
function extractUniqueValues(data, field) {
  const values = new Set();
  data.forEach(row => {
    const value = row[field];
    if (value && value !== null) {
      values.add(value);
    }
  });
  return Array.from(values).sort();
}

// Generate TypeScript file content
function generateTypeScriptFile(arrayName, data, description) {
  let content = `/**
 * ${description}
 * Auto-generated from CSV data
 * Generated: ${new Date().toISOString()}
 */

export const ${arrayName} = ${JSON.stringify(data, null, 2)};
`;

  return content;
}

// Generate lookup table TypeScript
function generateLookupTable(tableName, values, description) {
  const data = values.map((value, index) => ({
    id: `${tableName}-${String(index + 1).padStart(3, '0')}`,
    name: value,
    isActive: true
  }));

  return generateTypeScriptFile(tableName, data, description);
}

// Main conversion function
function convertEquipmentCSV(inputPath, outputDir) {
  console.log(`Reading CSV from: ${inputPath}`);
  const csvContent = fs.readFileSync(inputPath, 'utf-8');

  console.log('Parsing CSV...');
  const equipment = parseCSV(csvContent);
  console.log(`Parsed ${equipment.length} equipment records`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write main equipment file
  const equipmentFile = path.join(outputDir, 'equipment.ts');
  fs.writeFileSync(
    equipmentFile,
    generateTypeScriptFile('equipment', equipment, 'Equipment Records')
  );
  console.log(`✓ Created: ${equipmentFile}`);

  // Extract and write lookup tables
  const lookupTables = [
    { field: 'department', name: 'departments', description: 'Equipment Departments' },
    { field: 'sub_department', name: 'subDepartments', description: 'Equipment Sub-Departments' },
    { field: 'location', name: 'locations', description: 'Equipment Locations' },
    { field: 'category', name: 'categories', description: 'Equipment Categories' },
    { field: 'manufacturer', name: 'manufacturers', description: 'Equipment Manufacturers' },
    { field: 'vendor', name: 'vendors', description: 'Equipment Vendors' },
    { field: 'status', name: 'statuses', description: 'Equipment Statuses' }
  ];

  lookupTables.forEach(({ field, name, description }) => {
    const values = extractUniqueValues(equipment, field);
    if (values.length > 0) {
      const lookupFile = path.join(outputDir, `${name}.ts`);
      fs.writeFileSync(
        lookupFile,
        generateLookupTable(name, values, description)
      );
      console.log(`✓ Created: ${lookupFile} (${values.length} entries)`);
    }
  });

  // Create index file
  const indexFile = path.join(outputDir, 'index.ts');
  const indexContent = `/**
 * Equipment Data Module
 * Auto-generated exports for equipment static data
 */

export { equipment } from './equipment';
export { departments } from './departments';
export { subDepartments } from './subDepartments';
export { locations } from './locations';
export { categories } from './categories';
export { manufacturers } from './manufacturers';
export { vendors } from './vendors';
export { statuses } from './statuses';
`;
  fs.writeFileSync(indexFile, indexContent);
  console.log(`✓ Created: ${indexFile}`);

  console.log('\n✅ Conversion complete!');
  console.log(`\nGenerated files in: ${outputDir}`);
  console.log(`Total equipment records: ${equipment.length}`);
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node csv-to-typescript.js <input.csv> <output-dir>');
    console.log('Example: node csv-to-typescript.js equipment.csv ../frontend/src/data/equipment');
    process.exit(1);
  }

  const [inputPath, outputDir] = args;

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  convertEquipmentCSV(inputPath, outputDir);
}

module.exports = { convertEquipmentCSV, parseCSV };
