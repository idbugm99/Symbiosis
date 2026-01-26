-- ========================================================================
-- MIGRATION 022: CREATE AUDIT TRIGGERS FOR REGULATED TABLES
-- ========================================================================
-- Purpose: Automatically capture all changes to regulated tables
-- Date: 2026-01-21
-- Pattern: Generic trigger function + per-table trigger attachment
-- Tables: service_records, equipment, equipment_attribute_values, service_contracts
-- ========================================================================

-- ========================================================================
-- STEP 1: Create generic audit trigger function
-- ========================================================================
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
    actor_user_id UUID;
    actor_employee_code VARCHAR(50);
    audit_action VARCHAR(20);
    old_snapshot JSONB;
    new_snapshot JSONB;
BEGIN
    -- Determine the action type
    IF (TG_OP = 'INSERT') THEN
        audit_action := 'INSERT';
        old_snapshot := NULL;
        new_snapshot := row_to_json(NEW)::JSONB;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Check if this is a soft delete
        IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
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

    -- Get actor information from session variables (set by application)
    -- Format: SET LOCAL app.current_user_id = 'uuid';
    BEGIN
        actor_user_id := current_setting('app.current_user_id', true)::UUID;
        actor_employee_code := current_setting('app.current_employee_code', true);
    EXCEPTION
        WHEN OTHERS THEN
            actor_user_id := NULL;
            actor_employee_code := NULL;
    END;

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
        COALESCE(NEW.id, OLD.id), -- Use NEW.id for INSERT/UPDATE, OLD.id for DELETE
        old_snapshot,
        new_snapshot,
        current_setting('app.change_reason', true), -- Set by application
        current_setting('app.change_reason_detail', true),
        current_setting('app.source', true)
    );

    -- Return appropriate value based on operation
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_trigger_function IS 'Generic trigger function for capturing all changes to regulated tables';

-- ========================================================================
-- STEP 2: Attach audit triggers to regulated tables
-- ========================================================================

-- Service Records (required - work logs are highly regulated)
DROP TRIGGER IF EXISTS audit_service_records_trigger ON service_records;
CREATE TRIGGER audit_service_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON service_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Equipment (recommended - asset changes need tracking)
DROP TRIGGER IF EXISTS audit_equipment_trigger ON equipment;
CREATE TRIGGER audit_equipment_trigger
    AFTER INSERT OR UPDATE OR DELETE ON equipment
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Equipment Attribute Values (required - setpoint changes are regulated)
DROP TRIGGER IF EXISTS audit_equipment_attribute_values_trigger ON equipment_attribute_values;
CREATE TRIGGER audit_equipment_attribute_values_trigger
    AFTER INSERT OR UPDATE OR DELETE ON equipment_attribute_values
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Service Contracts (optional but good - contract changes affect compliance)
DROP TRIGGER IF EXISTS audit_service_contracts_trigger ON service_contracts;
CREATE TRIGGER audit_service_contracts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON service_contracts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ========================================================================
-- STEP 3: Create helper functions for application layer
-- ========================================================================

-- Function to set audit context before making changes
CREATE OR REPLACE FUNCTION set_audit_context(
    p_user_id UUID,
    p_employee_code VARCHAR(50),
    p_reason VARCHAR(50) DEFAULT NULL,
    p_reason_detail TEXT DEFAULT NULL,
    p_source VARCHAR(100) DEFAULT 'symbiosis-ui'
) RETURNS VOID AS $$
BEGIN
    -- Set session variables that the trigger will read
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
    PERFORM set_config('app.current_employee_code', p_employee_code, true);

    IF p_reason IS NOT NULL THEN
        PERFORM set_config('app.change_reason', p_reason, true);
    END IF;

    IF p_reason_detail IS NOT NULL THEN
        PERFORM set_config('app.change_reason_detail', p_reason_detail, true);
    END IF;

    PERFORM set_config('app.source', p_source, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_audit_context IS 'Call this before making audited changes to set who/why/where';

-- Function to get audit history for a record
CREATE OR REPLACE FUNCTION get_audit_history(
    p_table_name VARCHAR(100),
    p_record_pk UUID
) RETURNS TABLE (
    occurred_at TIMESTAMP,
    action VARCHAR(20),
    actor_display TEXT,
    reason VARCHAR(50),
    reason_detail TEXT,
    changes JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ae.occurred_at,
        ae.action,
        COALESCE(
            get_user_display_identity(ae.actor_user_id),
            ae.actor_employee_code,
            'System'
        ) AS actor_display,
        ae.reason,
        ae.reason_detail,
        -- Build a simplified diff for display
        CASE
            WHEN ae.action = 'INSERT' THEN ae.new_values
            WHEN ae.action = 'DELETE' THEN ae.old_values
            ELSE jsonb_build_object(
                'before', ae.old_values,
                'after', ae.new_values
            )
        END AS changes
    FROM audit_events ae
    WHERE ae.table_name = p_table_name
      AND ae.record_pk = p_record_pk
    ORDER BY ae.occurred_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_audit_history IS 'Get complete audit history for a specific record (for "View History" button)';

-- ========================================================================
-- STEP 4: Create example usage documentation
-- ========================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 022 complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Audit triggers attached to:';
    RAISE NOTICE '  • service_records';
    RAISE NOTICE '  • equipment';
    RAISE NOTICE '  • equipment_attribute_values';
    RAISE NOTICE '  • service_contracts';
    RAISE NOTICE '';
    RAISE NOTICE 'Application Usage Pattern:';
    RAISE NOTICE '';
    RAISE NOTICE '-- Before making changes, set audit context:';
    RAISE NOTICE 'SELECT set_audit_context(';
    RAISE NOTICE '  ''user-uuid'',';
    RAISE NOTICE '  ''EMP-1047'',';
    RAISE NOTICE '  ''typo'',';
    RAISE NOTICE '  ''Changed temperature from 83 to 80'',';
    RAISE NOTICE '  ''symbiosis-ui-v1.2.3''';
    RAISE NOTICE ');';
    RAISE NOTICE '';
    RAISE NOTICE '-- Then make your change:';
    RAISE NOTICE 'UPDATE service_records SET temperature = 80 WHERE id = ''...'';';
    RAISE NOTICE '';
    RAISE NOTICE '-- View history:';
    RAISE NOTICE 'SELECT * FROM get_audit_history(''service_records'', ''record-uuid'');';
    RAISE NOTICE '========================================';
END $$;
