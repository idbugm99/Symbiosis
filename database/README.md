# Database Schema Documentation

## Overview

Symbiosis uses a PostgreSQL database with a normalized relational structure designed for scientific research data management.

## Core Entities

### Users & Authentication
- **users**: User accounts with role-based access control
  - Roles: user, researcher, supervisor, admin
  - Integrated with Firebase Authentication via `firebase_uid`

### Chemicals Management
- **chemicals**: CAS-registered chemicals with safety data
  - Includes PubChem integration
  - GHS hazard classifications
  - Inventory tracking with quantities and locations

### Equipment Management
- **equipment**: Laboratory equipment and instruments
  - Status tracking (operational, maintenance, retired)
  - Maintenance scheduling
  - JSONB specifications for flexible equipment-specific data

- **equipment_maintenance_logs**: Historical maintenance records
  - Tracks repairs, calibrations, and routine maintenance
  - Cost tracking and parts replacement history

### Experiments
- **experiments**: Research experiments and protocols
  - Status workflow: draft → active → completed → archived
  - Rich documentation (objective, hypothesis, methods, results)
  - Parent-child relationships for experiment series

- **experiment_chemicals**: Many-to-many relationship
  - Links experiments with chemicals used
  - Tracks quantity consumed

- **experiment_equipment**: Many-to-many relationship
  - Links experiments with equipment used
  - Stores usage duration and equipment settings

### Vendors & Ordering
- **vendors**: Supplier and vendor information
- **orders**: Purchase orders and tracking

### System
- **audit_log**: Complete audit trail of all changes
  - Tracks creates, updates, and deletes
  - Stores before/after snapshots in JSONB

## Database Features

### UUID Primary Keys
All tables use UUID primary keys for better distributed system support and security.

### Automatic Timestamps
`created_at` and `updated_at` fields are automatically managed via PostgreSQL triggers.

### Flexible Data Storage
JSONB fields are used where data structures may vary:
- Equipment specifications
- Experiment data files
- Audit log changes

### Array Support
PostgreSQL arrays are used for:
- GHS pictograms
- Hazard statements
- Tags and categories

### Full-Text Search Ready
Indexes are created on commonly searched fields (names, CAS numbers, etc.)

## Setup Instructions

### 1. Create Database

```bash
psql -U postgres
CREATE DATABASE symbiosis;
\c symbiosis
```

### 2. Run Schema

```bash
psql -U your_user -d symbiosis -f schema.sql
```

### 3. Run Migrations (Future)

```bash
cd ../backend
npm run migrate
```

### 4. Seed Data (Development)

```bash
npm run seed
```

## ER Diagram

A visual ER diagram is available at: `database/erd/symbiosis-schema.png`

## Migration Strategy

Future schema changes should be managed through numbered migration files:

```
database/migrations/
  001_initial_schema.sql
  002_add_genetic_data.sql
  003_add_panel_types.sql
```

## Backup Strategy

Recommended backup schedule:
- **Daily**: Automated backups with 7-day retention
- **Weekly**: Full backups with 4-week retention
- **Monthly**: Archive backups for compliance

## Performance Considerations

### Indexes
Indexes are created on:
- Foreign keys
- Frequently queried fields
- Date ranges
- Status fields

### Query Optimization
- Use `EXPLAIN ANALYZE` for slow queries
- Consider materialized views for complex aggregations
- Partition large tables by date if needed

## Security

- All user authentication is handled via Firebase
- Role-based access control via `users.role`
- Audit log tracks all changes for compliance
- Use connection pooling in production
- Enable SSL for database connections

## Future Enhancements

Planned additions:
- Genetic data tables (genes, markers, sequences)
- Cell panel tables (Eurofins-style assays)
- Document storage references
- Real-time collaboration tables
- AI annotation and insights tables
