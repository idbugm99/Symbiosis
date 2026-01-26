-- ========================================================================
-- MIGRATION 025: CREATE REGULATED TABLES REGISTRY
-- ========================================================================
-- Purpose: Single source of truth for regulated table coverage
-- Date: 2026-01-21
-- Benefit: Prevents drift, provides auditor evidence of coverage
-- ========================================================================

-- ========================================================================
-- STEP 1: Create regulated tables registry
-- ========================================================================
CREATE TABLE IF NOT EXISTS audit_regulated_tables (
    table_name VARCHAR(100) PRIMARY KEY,
    audit_required BOOLEAN NOT NULL DEFAULT TRUE,
    hard_delete_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    soft_delete_supported BOOLEAN NOT NULL DEFAULT FALSE,
    reason_required_on_update BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_regulated_tables IS 'Registry of regulated tables - single source of truth for audit coverage';
COMMENT ON COLUMN audit_regulated_tables.audit_required IS 'TRUE if table has audit trigger attached';
COMMENT ON COLUMN audit_regulated_tables.hard_delete_blocked IS 'TRUE if DELETE operations are blocked by trigger';
COMMENT ON COLUMN audit_regulated_tables.soft_delete_supported IS 'TRUE if table has deleted_at/deleted_by columns';
COMMENT ON COLUMN audit_regulated_tables.reason_required_on_update IS 'TRUE if UPDATE requires audit context with reason';

-- ========================================================================
-- STEP 2: Register current regulated tables
-- ========================================================================
INSERT INTO audit_regulated_tables (table_name, audit_required, hard_delete_blocked, soft_delete_supported, notes) VALUES
    (
        'service_records',
        TRUE,
        TRUE,
        TRUE,
        'Lab work logs - highly regulated under GLP. Soft delete required for audit trail preservation.'
    ),
    (
        'equipment',
        TRUE,
        FALSE,
        FALSE,
        'Asset tracking and calibration history. Hard DELETE allowed (use is_active=false for retirement).'
    ),
    (
        'equipment_attribute_values',
        TRUE,
        TRUE,
        FALSE,
        'Equipment setpoints and configurations - regulated edits. Hard DELETE blocked.'
    ),
    (
        'service_contracts',
        TRUE,
        FALSE,
        FALSE,
        'Compliance documentation - vendor service agreements. Hard DELETE allowed (errors only).'
    );

-- ========================================================================
-- STEP 3: Create compliance report view
-- ========================================================================
CREATE OR REPLACE VIEW audit_compliance_report AS
SELECT
    rt.table_name,
    rt.audit_required AS "Audit Required",
    rt.hard_delete_blocked AS "DELETE Blocked",
    rt.soft_delete_supported AS "Soft Delete",
    rt.reason_required_on_update AS "Reason Required",
    -- Check if audit trigger exists
    EXISTS (
        SELECT 1 FROM pg_trigger t
        WHERE t.tgrelid = rt.table_name::regclass
          AND t.tgname LIKE 'audit_%_trigger'
    ) AS "Audit Trigger Exists",
    -- Check if hard delete prevention trigger exists
    EXISTS (
        SELECT 1 FROM pg_trigger t
        WHERE t.tgrelid = rt.table_name::regclass
          AND t.tgname LIKE 'prevent_hard_delete%'
    ) AS "DELETE Prevention Exists",
    -- Compliance status
    CASE
        WHEN rt.audit_required AND NOT EXISTS (
            SELECT 1 FROM pg_trigger t
            WHERE t.tgrelid = rt.table_name::regclass
              AND t.tgname LIKE 'audit_%_trigger'
        ) THEN '❌ MISSING AUDIT TRIGGER'
        WHEN rt.hard_delete_blocked AND NOT EXISTS (
            SELECT 1 FROM pg_trigger t
            WHERE t.tgrelid = rt.table_name::regclass
              AND t.tgname LIKE 'prevent_hard_delete%'
        ) THEN '❌ MISSING DELETE PREVENTION'
        ELSE '✅ COMPLIANT'
    END AS "Compliance Status"
FROM audit_regulated_tables rt
ORDER BY rt.table_name;

COMMENT ON VIEW audit_compliance_report IS 'Compliance report - verifies all regulated tables have required triggers';

-- ========================================================================
-- STEP 4: Create helper function to check table compliance
-- ========================================================================
CREATE OR REPLACE FUNCTION check_regulated_table_compliance()
RETURNS TABLE (
    table_name VARCHAR(100),
    issue TEXT
) AS $$
BEGIN
    -- Check for missing audit triggers
    RETURN QUERY
    SELECT
        rt.table_name,
        'Missing audit trigger - expected audit_' || rt.table_name || '_trigger' AS issue
    FROM audit_regulated_tables rt
    WHERE rt.audit_required = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM pg_trigger t
          WHERE t.tgrelid = rt.table_name::regclass
            AND t.tgname LIKE 'audit_%_trigger'
      );

    -- Check for missing hard delete prevention
    RETURN QUERY
    SELECT
        rt.table_name,
        'Missing hard DELETE prevention - expected prevent_hard_delete_' || rt.table_name AS issue
    FROM audit_regulated_tables rt
    WHERE rt.hard_delete_blocked = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM pg_trigger t
          WHERE t.tgrelid = rt.table_name::regclass
            AND t.tgname LIKE 'prevent_hard_delete%'
      );

    -- Check for missing soft delete columns
    RETURN QUERY
    SELECT
        rt.table_name,
        'Missing soft delete columns - expected deleted_at, deleted_by, delete_reason' AS issue
    FROM audit_regulated_tables rt
    WHERE rt.soft_delete_supported = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_name = rt.table_name
            AND c.column_name = 'deleted_at'
      );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_regulated_table_compliance IS 'Returns list of compliance issues (empty = fully compliant)';

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
DECLARE
    regulated_count INTEGER;
    compliant_count INTEGER;
    issue_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO regulated_count FROM audit_regulated_tables;

    SELECT COUNT(*) INTO compliant_count
    FROM audit_compliance_report
    WHERE "Compliance Status" = '✅ COMPLIANT';

    SELECT COUNT(*) INTO issue_count FROM check_regulated_table_compliance();

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 025 complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Regulated tables registry created:';
    RAISE NOTICE '  • Total regulated tables: %', regulated_count;
    RAISE NOTICE '  • Fully compliant: %', compliant_count;
    RAISE NOTICE '  • Issues found: %', issue_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Query compliance status:';
    RAISE NOTICE '  SELECT * FROM audit_compliance_report;';
    RAISE NOTICE '';
    RAISE NOTICE 'Check for issues:';
    RAISE NOTICE '  SELECT * FROM check_regulated_table_compliance();';
    RAISE NOTICE '========================================';
END $$;
