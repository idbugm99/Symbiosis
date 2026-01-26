-- ========================================================================
-- MIGRATION 023: HARDEN AUDIT SYSTEM (AUDIT-GRADE DEFENSE-IN-DEPTH)
-- ========================================================================
-- Purpose: PostgreSQL-specific refinements for regulatory compliance
-- Date: 2026-01-21
-- Improvements:
--   1. Hard DELETE prevention on regulated tables
--   2. Enforce audit context presence (RAISE EXCEPTION if missing)
--   3. Reason codes lookup table (standardized values)
--   4. Privilege restrictions on audit_events
-- ========================================================================

-- ========================================================================
-- STEP 1: Create reason codes lookup table
-- ========================================================================
CREATE TABLE IF NOT EXISTS audit_reason_codes (
    code VARCHAR(50) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    requires_detail BOOLEAN NOT NULL DEFAULT FALSE, -- If true, reason_detail is mandatory
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed standard reason codes
INSERT INTO audit_reason_codes (code, label, description, requires_detail, sort_order) VALUES
    ('initial_entry', 'Initial Entry', 'First-time data entry (automatic)', FALSE, 1),
    ('typo', 'Typographical Error', 'Correcting a typing mistake', FALSE, 2),
    ('correction', 'Factual Correction', 'Correcting an error in recorded data', TRUE, 3),
    ('retest', 'Retest Results', 'Updating with retest or verification results', TRUE, 4),
    ('equipment_maintenance', 'Equipment Maintenance', 'Change due to equipment service or repair', TRUE, 5),
    ('calibration', 'Calibration', 'Change due to equipment calibration', TRUE, 6),
    ('system_migration', 'System Migration', 'Data migration or system update', FALSE, 7),
    ('other', 'Other', 'Other reason (must explain in detail)', TRUE, 8)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE audit_reason_codes IS 'Standardized reason codes for audit trail (prevents nonsense reasons)';

-- ========================================================================
-- STEP 2: Update audit_events to reference reason codes table
-- ========================================================================
ALTER TABLE audit_events
DROP CONSTRAINT IF EXISTS audit_events_reason_check;

-- Add FK to reason codes (allow NULL for legacy records)
ALTER TABLE audit_events
ADD CONSTRAINT audit_events_reason_code_fkey
FOREIGN KEY (reason) REFERENCES audit_reason_codes(code) ON DELETE RESTRICT;

-- ========================================================================
-- STEP 3: Update audit trigger to enforce context on regulated tables
-- ========================================================================
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
    actor_user_id UUID;
    actor_employee_code VARCHAR(50);
    audit_action VARCHAR(20);
    old_snapshot JSONB;
    new_snapshot JSONB;
    change_reason VARCHAR(50);
    change_reason_detail TEXT;
    change_source VARCHAR(100);
    is_user_initiated BOOLEAN := FALSE;
BEGIN
    -- Determine the action type
    IF (TG_OP = 'INSERT') THEN
        audit_action := 'INSERT';
        old_snapshot := NULL;
        new_snapshot := row_to_json(NEW)::JSONB;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Check if this is a soft delete
        IF (row_to_json(NEW)::JSONB ? 'deleted_at') AND
           (row_to_json(NEW)::JSONB->>'deleted_at') IS NOT NULL AND
           ((row_to_json(OLD)::JSONB->>'deleted_at') IS NULL) THEN
            audit_action := 'SOFT_DELETE';
        ELSE
            audit_action := 'UPDATE';
        END IF;

        old_snapshot := row_to_json(OLD)::JSONB;
        new_snapshot := row_to_json(NEW)::JSONB;
    ELSIF (TG_OP = 'DELETE') THEN
        audit_action := 'DELETE';
        old_snapshot := row_to_json(OLD)::JSONB;
        new_snapshot := NULL;
    END IF;

    -- Get actor information from transaction-scoped session variables
    BEGIN
        actor_user_id := NULLIF(current_setting('audit.user_id', true), '')::UUID;
        actor_employee_code := NULLIF(current_setting('audit.employee_code', true), '');
        change_reason := NULLIF(current_setting('audit.reason', true), '');
        change_reason_detail := NULLIF(current_setting('audit.reason_detail', true), '');
        change_source := NULLIF(current_setting('audit.source', true), '');
    EXCEPTION
        WHEN OTHERS THEN
            actor_user_id := NULL;
            actor_employee_code := NULL;
            change_reason := NULL;
            change_reason_detail := NULL;
            change_source := NULL;
    END;

    -- Determine if this is a user-initiated change (vs system/migration)
    is_user_initiated := (actor_user_id IS NOT NULL);

    -- ENFORCEMENT: For user-initiated UPDATE/SOFT_DELETE, require reason
    IF is_user_initiated AND (audit_action = 'UPDATE' OR audit_action = 'SOFT_DELETE') THEN
        IF change_reason IS NULL THEN
            RAISE EXCEPTION 'Audit context missing: reason code required for changes to %.% (set via audit.reason)',
                TG_TABLE_SCHEMA, TG_TABLE_NAME;
        END IF;

        -- Check if reason code requires detail
        IF EXISTS (
            SELECT 1 FROM audit_reason_codes
            WHERE code = change_reason
              AND requires_detail = TRUE
        ) AND change_reason_detail IS NULL THEN
            RAISE EXCEPTION 'Reason "%" requires explanation (set via audit.reason_detail)', change_reason;
        END IF;
    END IF;

    -- Insert audit event
    INSERT INTO audit_events (
        occurred_at,
        actor_user_id,
        actor_employee_code,
        action,
        table_name,
        record_pk,
        old_values,
        new_values,
        reason,
        reason_detail,
        source
    ) VALUES (
        CURRENT_TIMESTAMP,
        actor_user_id,
        actor_employee_code,
        audit_action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_snapshot,
        new_snapshot,
        change_reason,
        change_reason_detail,
        change_source
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_trigger_function IS 'Audit trigger with context enforcement - RAISES EXCEPTION if user-initiated change lacks reason';

-- ========================================================================
-- STEP 4: Create hard DELETE prevention triggers for regulated tables
-- ========================================================================

-- Function to block hard deletes
CREATE OR REPLACE FUNCTION prevent_hard_delete() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Hard DELETE blocked on %.% (use soft delete: UPDATE deleted_at = NOW())',
        TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING HINT = 'Regulated tables require soft delete for audit trail preservation';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_hard_delete IS 'Blocks hard DELETE on regulated tables - forces soft delete pattern';

-- Attach to regulated tables
DROP TRIGGER IF EXISTS prevent_hard_delete_service_records ON service_records;
CREATE TRIGGER prevent_hard_delete_service_records
    BEFORE DELETE ON service_records
    FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

DROP TRIGGER IF EXISTS prevent_hard_delete_equipment_attribute_values ON equipment_attribute_values;
CREATE TRIGGER prevent_hard_delete_equipment_attribute_values
    BEFORE DELETE ON equipment_attribute_values
    FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- Note: equipment table allows hard delete for now (retire with is_active=false instead)
-- Note: service_contracts allows hard delete (typically deleted only in error)

-- ========================================================================
-- STEP 5: Update set_audit_context to use transaction-scoped variables
-- ========================================================================
CREATE OR REPLACE FUNCTION set_audit_context(
    p_user_id UUID,
    p_employee_code VARCHAR(50),
    p_reason VARCHAR(50) DEFAULT NULL,
    p_reason_detail TEXT DEFAULT NULL,
    p_source VARCHAR(100) DEFAULT 'symbiosis-ui'
) RETURNS VOID AS $$
BEGIN
    -- Set transaction-scoped session variables (3rd param = true)
    PERFORM set_config('audit.user_id', p_user_id::TEXT, true);
    PERFORM set_config('audit.employee_code', p_employee_code, true);

    IF p_reason IS NOT NULL THEN
        -- Validate reason code exists
        IF NOT EXISTS (SELECT 1 FROM audit_reason_codes WHERE code = p_reason AND is_active = true) THEN
            RAISE EXCEPTION 'Invalid reason code: % (must be one of the active codes in audit_reason_codes)', p_reason;
        END IF;

        PERFORM set_config('audit.reason', p_reason, true);
    END IF;

    IF p_reason_detail IS NOT NULL THEN
        PERFORM set_config('audit.reason_detail', p_reason_detail, true);
    END IF;

    PERFORM set_config('audit.source', p_source, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_audit_context IS 'Sets transaction-scoped audit context (validates reason codes)';

-- ========================================================================
-- STEP 6: Privilege restrictions on audit_events
-- ========================================================================

-- Revoke UPDATE/DELETE from app role (only INSERT allowed)
REVOKE UPDATE, DELETE ON audit_events FROM symbiosis_user;

-- Ensure app role can still INSERT and SELECT
GRANT SELECT, INSERT ON audit_events TO symbiosis_user;

-- Note: Immutability trigger remains as defense-in-depth

COMMENT ON TABLE audit_events IS 'Immutable audit log - INSERT only, UPDATE/DELETE revoked from app role';

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
DECLARE
    reason_code_count INTEGER;
    delete_prevention_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO reason_code_count FROM audit_reason_codes WHERE is_active = true;
    SELECT COUNT(*) INTO delete_prevention_count FROM pg_trigger WHERE tgname LIKE 'prevent_hard_delete%';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 023 complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Hardening measures applied:';
    RAISE NOTICE '  • Reason codes table: % active codes', reason_code_count;
    RAISE NOTICE '  • Hard DELETE prevention: % triggers', delete_prevention_count;
    RAISE NOTICE '  • Audit context enforcement: RAISES EXCEPTION if missing';
    RAISE NOTICE '  • Privileges restricted: UPDATE/DELETE revoked on audit_events';
    RAISE NOTICE '';
    RAISE NOTICE 'Audit system is now AUDIT-GRADE (defense-in-depth)';
    RAISE NOTICE '========================================';
END $$;
