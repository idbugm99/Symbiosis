-- ========================================================================
-- MIGRATION 019: CREATE AUDIT_EVENTS TABLE
-- ========================================================================
-- Purpose: Universal audit trail for all regulated table changes
-- Date: 2026-01-21
-- Compliance: GLP, FDA 21 CFR Part 11
-- Pattern: Tamper-evident history with immutable audit log
-- ========================================================================

-- ========================================================================
-- STEP 1: Create audit_events table
-- ========================================================================
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Actor information (who made the change)
    actor_user_id UUID NULL, -- NULL for system jobs
    actor_employee_code VARCHAR(50) NULL, -- Denormalized snapshot for tamper-evidence

    -- Action details (what happened)
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE')),
    table_name VARCHAR(100) NOT NULL,
    record_pk UUID NOT NULL, -- The primary key of the affected record

    -- Change details (what changed)
    old_values JSONB NULL, -- Snapshot before change (NULL for INSERT)
    new_values JSONB NULL, -- Snapshot after change (NULL for DELETE)

    -- Justification (why it changed)
    reason VARCHAR(50) NULL CHECK (reason IN ('initial_entry', 'correction', 'typo', 'retest', 'equipment_maintenance', 'calibration', 'system_migration', 'other') OR reason IS NULL),
    reason_detail TEXT NULL, -- Free-text explanation if reason = 'other'

    -- Context (where/how it happened)
    source VARCHAR(100) NULL, -- e.g., 'symbiosis-ui-v1.2.3', 'api', 'migration', 'system'
    ip_address INET NULL,
    user_agent TEXT NULL
);

-- Indexes for performance
CREATE INDEX idx_audit_events_occurred_at ON audit_events(occurred_at DESC);
CREATE INDEX idx_audit_events_actor_user_id ON audit_events(actor_user_id);
CREATE INDEX idx_audit_events_table_record ON audit_events(table_name, record_pk);
CREATE INDEX idx_audit_events_action ON audit_events(action);

-- Trigger to prevent modifications to audit log (tamper-evident)
CREATE OR REPLACE FUNCTION prevent_audit_modification() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Comments for documentation
COMMENT ON TABLE audit_events IS 'Immutable audit log for all regulated table changes (GLP/FDA compliant)';
COMMENT ON COLUMN audit_events.actor_employee_code IS 'Denormalized employee code snapshot - preserved even if user account changes';
COMMENT ON COLUMN audit_events.reason IS 'Required justification for changes in regulated environments';
COMMENT ON COLUMN audit_events.old_values IS 'JSONB snapshot of row before change (for auditors to see "83 → 80")';
COMMENT ON COLUMN audit_events.new_values IS 'JSONB snapshot of row after change';

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 019 complete';
    RAISE NOTICE '  audit_events table created';
    RAISE NOTICE '  Immutability enforced (UPDATE/DELETE blocked)';
    RAISE NOTICE '  Ready for trigger attachment to regulated tables';
    RAISE NOTICE '========================================';
END $$;
