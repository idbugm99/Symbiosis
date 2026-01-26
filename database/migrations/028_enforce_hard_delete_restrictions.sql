-- ========================================================================
-- MIGRATION 028: ENFORCE HARD DELETE RESTRICTIONS
-- ========================================================================
-- Purpose: Add testable enforcement for "restricted" DELETE tables
-- Date: 2026-01-21
-- Benefit: Policy becomes code - no accidental hard deletes by app role
-- ========================================================================

-- ========================================================================
-- STEP 1: Create restricted DELETE enforcement function
-- ========================================================================
CREATE OR REPLACE FUNCTION enforce_restricted_delete() RETURNS TRIGGER AS $$
DECLARE
    allowed_roles TEXT[] := ARRAY['symbiosis_migration_role', 'postgres', 'symbiosis_admin'];
    change_source TEXT;
    change_reason TEXT;
    reason_detail TEXT;
BEGIN
    -- Get audit context
    change_source := NULLIF(current_setting('audit.source', true), '');
    change_reason := NULLIF(current_setting('audit.reason', true), '');
    reason_detail := NULLIF(current_setting('audit.reason_detail', true), '');

    -- Allow if current user is in allowed roles
    IF current_user = ANY(allowed_roles) THEN
        -- Must still provide reason detail for audit trail
        IF reason_detail IS NULL OR reason_detail = '' THEN
            RAISE EXCEPTION 'Hard DELETE on %.% requires reason_detail even for authorized roles',
                TG_TABLE_SCHEMA, TG_TABLE_NAME
            USING HINT = 'Call set_audit_context() with detailed justification';
        END IF;

        -- Allow the DELETE (audit trigger will log it as SYSTEM operation)
        RETURN OLD;
    END IF;

    -- Allow if system operation with proper context
    IF change_source IS NOT NULL AND change_source LIKE 'system%' THEN
        IF reason_detail IS NULL OR reason_detail = '' THEN
            RAISE EXCEPTION 'System hard DELETE on %.% requires reason_detail',
                TG_TABLE_SCHEMA, TG_TABLE_NAME
            USING HINT = 'Set audit.reason_detail to document system operation';
        END IF;
        RETURN OLD;
    END IF;

    -- Block all other attempts
    RAISE EXCEPTION 'Hard DELETE on %.% restricted to authorized roles only',
        TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING
        HINT = 'Current user: ' || current_user || '. Allowed roles: ' || array_to_string(allowed_roles, ', '),
        DETAIL = 'Use soft delete pattern (UPDATE SET deleted_at = NOW()) or switch to authorized role';

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_restricted_delete IS 'Enforces role-based hard DELETE restrictions with mandatory reason_detail';

-- ========================================================================
-- STEP 2: Attach triggers to restricted tables
-- ========================================================================

-- Equipment: Restrict hard DELETE (retirement uses is_active=false)
CREATE TRIGGER enforce_restricted_delete_equipment
    BEFORE DELETE ON equipment
    FOR EACH ROW EXECUTE FUNCTION enforce_restricted_delete();

COMMENT ON TRIGGER enforce_restricted_delete_equipment ON equipment IS
    'Allows DELETE only for authorized roles with reason_detail. Normal workflow uses is_active=false.';

-- Service Contracts: Restrict hard DELETE (entry errors only)
CREATE TRIGGER enforce_restricted_delete_service_contracts
    BEFORE DELETE ON service_contracts
    FOR EACH ROW EXECUTE FUNCTION enforce_restricted_delete();

COMMENT ON TRIGGER enforce_restricted_delete_service_contracts ON service_contracts IS
    'Allows DELETE only for authorized roles with reason_detail. Entry errors only.';

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
DECLARE
    restricted_trigger_count INTEGER;
BEGIN
    -- Count restricted DELETE triggers
    SELECT COUNT(*) INTO restricted_trigger_count
    FROM pg_trigger
    WHERE tgname LIKE 'enforce_restricted_delete%';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 028 complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Hard DELETE restrictions enforced:';
    RAISE NOTICE '  • equipment (authorized roles only)';
    RAISE NOTICE '  • service_contracts (authorized roles only)';
    RAISE NOTICE '';
    RAISE NOTICE 'Authorized roles:';
    RAISE NOTICE '  • symbiosis_migration_role';
    RAISE NOTICE '  • postgres';
    RAISE NOTICE '  • symbiosis_admin';
    RAISE NOTICE '';
    RAISE NOTICE 'Enforcement: Role check + mandatory reason_detail';
    RAISE NOTICE 'Total restricted DELETE triggers: %', restricted_trigger_count;
    RAISE NOTICE '========================================';
END $$;
