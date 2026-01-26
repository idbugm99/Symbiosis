-- ========================================================================
-- MIGRATION 024: STRICT AUDIT CONTEXT ENFORCEMENT
-- ========================================================================
-- Purpose: Require audit context for ALL UPDATE/DELETE operations
-- Date: 2026-01-21
-- Pattern: Fail-closed (deny by default, allow only with explicit context)
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
    is_system_operation BOOLEAN := FALSE;
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

    -- Check if this is explicitly marked as a system operation
    -- Use COALESCE to handle NULL (NULL should be FALSE, not NULL)
    is_system_operation := COALESCE(
        (change_source LIKE 'system%' OR change_source = 'migration'),
        FALSE
    );

    -- STRICT ENFORCEMENT: UPDATE/SOFT_DELETE/DELETE require audit context
    -- Exception: system operations (migrations, automated processes)
    IF (audit_action IN ('UPDATE', 'SOFT_DELETE', 'DELETE')) AND NOT is_system_operation THEN
        -- Require user_id
        IF actor_user_id IS NULL THEN
            RAISE EXCEPTION 'Audit context required: user_id missing for % on %.% (call set_audit_context first)',
                audit_action, TG_TABLE_SCHEMA, TG_TABLE_NAME
            USING HINT = 'Call set_audit_context(user_id, employee_code, reason, detail, source) before making changes';
        END IF;

        -- Require reason
        IF change_reason IS NULL THEN
            RAISE EXCEPTION 'Audit context required: reason missing for % on %.% (set via audit.reason)',
                audit_action, TG_TABLE_SCHEMA, TG_TABLE_NAME
            USING HINT = 'Valid reasons: typo, correction, retest, equipment_maintenance, calibration, other';
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
        COALESCE(change_source, 'unknown')
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_trigger_function IS 'Strict audit enforcement - UPDATE/DELETE require context, except system operations';

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 024 complete';
    RAISE NOTICE '  Audit enforcement now STRICT:';
    RAISE NOTICE '  • UPDATE/DELETE require audit context';
    RAISE NOTICE '  • Exception: source = system%% or migration';
    RAISE NOTICE '  • Fail-closed security model';
    RAISE NOTICE '========================================';
END $$;
