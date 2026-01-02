-- Symbiosis Database Schema
-- Scientific Research and Data Management Platform

-- Enable UUID extension (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appwrite_user_id VARCHAR(128) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- user, researcher, supervisor, admin
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_appwrite_uid ON users(appwrite_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- User menu bar preferences
CREATE TABLE user_menubar_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_user_menubar_user_id ON user_menubar_preferences(user_id);

-- ============================================================
-- CHEMICALS MANAGEMENT
-- ============================================================

CREATE TABLE chemicals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cas_number VARCHAR(50) UNIQUE,
  name VARCHAR(500) NOT NULL,
  common_name VARCHAR(500),
  molecular_formula VARCHAR(255),
  molecular_weight DECIMAL(10, 4),
  iupac_name TEXT,
  pubchem_id VARCHAR(50),

  -- Physical properties
  melting_point VARCHAR(100),
  boiling_point VARCHAR(100),
  density VARCHAR(100),
  appearance TEXT,

  -- Safety information
  hazard_class VARCHAR(100),
  ghs_pictograms TEXT[], -- Array of GHS codes
  signal_word VARCHAR(50), -- Danger, Warning
  hazard_statements TEXT[],
  precautionary_statements TEXT[],

  -- Storage and handling
  storage_conditions TEXT,
  incompatibilities TEXT[],

  -- Inventory
  current_quantity DECIMAL(10, 3),
  unit VARCHAR(50), -- g, kg, mL, L
  location VARCHAR(255),
  supplier VARCHAR(255),
  catalog_number VARCHAR(100),
  lot_number VARCHAR(100),
  expiration_date DATE,

  -- Metadata
  notes TEXT,
  msds_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chemicals_cas ON chemicals(cas_number);
CREATE INDEX idx_chemicals_name ON chemicals(name);
CREATE INDEX idx_chemicals_pubchem ON chemicals(pubchem_id);

-- ============================================================
-- EQUIPMENT MANAGEMENT
-- ============================================================

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  equipment_type VARCHAR(100), -- microscope, centrifuge, incubator, etc.
  manufacturer VARCHAR(255),
  model_number VARCHAR(255),
  serial_number VARCHAR(255) UNIQUE,

  -- Location and status
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'operational', -- operational, maintenance, retired

  -- Specifications
  specifications JSONB, -- Flexible storage for equipment-specific specs

  -- Maintenance
  purchase_date DATE,
  warranty_expiration DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_days INTEGER,

  -- Documentation
  manual_url TEXT,
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_equipment_type ON equipment(equipment_type);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_serial ON equipment(serial_number);

-- ============================================================
-- EQUIPMENT MAINTENANCE LOGS
-- ============================================================

CREATE TABLE equipment_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(100), -- routine, repair, calibration
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMP NOT NULL,
  description TEXT,
  parts_replaced TEXT[],
  cost DECIMAL(10, 2),
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_equipment ON equipment_maintenance_logs(equipment_id);
CREATE INDEX idx_maintenance_date ON equipment_maintenance_logs(performed_at);

-- ============================================================
-- EXPERIMENTS
-- ============================================================

CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  objective TEXT,
  hypothesis TEXT,

  -- Status and classification
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, archived
  experiment_type VARCHAR(100), -- molecular, cellular, analytical, etc.

  -- Protocol
  protocol TEXT,
  methods TEXT,

  -- Results
  results TEXT,
  conclusions TEXT,

  -- Data files
  data_files JSONB, -- Array of file references

  -- Relationships
  parent_experiment_id UUID REFERENCES experiments(id),

  -- Timeline
  start_date DATE,
  end_date DATE,

  -- Metadata
  tags TEXT[],
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_type ON experiments(experiment_type);
CREATE INDEX idx_experiments_created_by ON experiments(created_by);
CREATE INDEX idx_experiments_dates ON experiments(start_date, end_date);

-- ============================================================
-- EXPERIMENT CHEMICALS (Many-to-Many)
-- ============================================================

CREATE TABLE experiment_chemicals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  chemical_id UUID REFERENCES chemicals(id) ON DELETE CASCADE,
  quantity_used DECIMAL(10, 3),
  unit VARCHAR(50),
  purpose TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(experiment_id, chemical_id)
);

CREATE INDEX idx_exp_chem_experiment ON experiment_chemicals(experiment_id);
CREATE INDEX idx_exp_chem_chemical ON experiment_chemicals(chemical_id);

-- ============================================================
-- EXPERIMENT EQUIPMENT (Many-to-Many)
-- ============================================================

CREATE TABLE experiment_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  usage_duration INTEGER, -- minutes
  settings JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(experiment_id, equipment_id)
);

CREATE INDEX idx_exp_equip_experiment ON experiment_equipment(experiment_id);
CREATE INDEX idx_exp_equip_equipment ON experiment_equipment(equipment_id);

-- ============================================================
-- VENDORS
-- ============================================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  website VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_name ON vendors(name);

-- ============================================================
-- ORDERS/PURCHASES
-- ============================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(id),
  order_number VARCHAR(255),
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, ordered, delivered, cancelled
  total_cost DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  notes TEXT,
  ordered_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_vendor ON orders(vendor_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- create, update, delete
  entity_type VARCHAR(100) NOT NULL, -- chemical, equipment, experiment
  entity_id UUID NOT NULL,
  changes JSONB, -- Before/after snapshots
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_date ON audit_log(created_at);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_menubar_preferences_updated_at BEFORE UPDATE ON user_menubar_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chemicals_updated_at BEFORE UPDATE ON chemicals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
