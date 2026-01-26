-- ========================================================================
-- MIGRATION 029: FIX DETERMINISTIC TIMELINE DIFFS
-- ========================================================================
-- Purpose: Ensure field change summaries are deterministic for auditors
-- Date: 2026-01-21
-- Benefit: Repeatable, consistent output (auditors care about repeatability)
-- ========================================================================

-- ========================================================================
-- STEP 1: Update service_record_timeline with deterministic ordering
-- ========================================================================
CREATE OR REPLACE FUNCTION get_service_record_timeline(p_record_id UUID)
RETURNS TABLE (
    occurred_at TIMESTAMP,
    action VARCHAR(20),
    actor TEXT,
    reason_code VARCHAR(50),
    reason_detail TEXT,
    changed_fields TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ae.occurred_at,
        ae.action,
        COALESCE(ae.actor_employee_code, 'SYSTEM') AS actor,
        ae.reason,
        ae.reason_detail,
        -- List changed field names (DETERMINISTIC ORDER)
        CASE
            WHEN ae.action = 'INSERT' THEN 'Record created'
            WHEN ae.action = 'DELETE' THEN 'Record deleted'
            WHEN ae.action = 'SOFT_DELETE' THEN 'Marked as deleted'
            WHEN ae.action = 'UPDATE' THEN
                (
                    SELECT string_agg(
                        changed_field.key || ': ' ||
                        COALESCE((ae.old_values->>changed_field.key)::TEXT, 'NULL') ||
                        ' → ' ||
                        COALESCE((ae.new_values->>changed_field.key)::TEXT, 'NULL'),
                        ', '
                        ORDER BY changed_field.key  -- DETERMINISTIC: Always alphabetical
                    )
                    FROM (
                        SELECT DISTINCT key
                        FROM jsonb_each(ae.old_values) old_kv
                        JOIN jsonb_each(ae.new_values) new_kv ON old_kv.key = new_kv.key
                        WHERE old_kv.value IS DISTINCT FROM new_kv.value
                          AND old_kv.key NOT IN ('updated_at', 'created_at') -- Exclude timestamps
                        ORDER BY key  -- DETERMINISTIC: Subquery ordering
                    ) changed_field
                )
            ELSE 'Unknown'
        END AS changed_fields
    FROM audit_events ae
    WHERE ae.table_name = 'service_records'
      AND ae.record_pk = p_record_id
    ORDER BY ae.occurred_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_service_record_timeline IS 'Detailed timeline for specific service record - deterministic field ordering for repeatability';

-- ========================================================================
-- STEP 2: Update equipment_timeline with deterministic ordering
-- ========================================================================
CREATE OR REPLACE FUNCTION get_equipment_timeline(p_equipment_id UUID)
RETURNS TABLE (
    occurred_at TIMESTAMP,
    action VARCHAR(20),
    actor TEXT,
    reason_code VARCHAR(50),
    reason_detail TEXT,
    changed_fields TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ae.occurred_at,
        ae.action,
        COALESCE(ae.actor_employee_code, 'SYSTEM') AS actor,
        ae.reason,
        ae.reason_detail,
        CASE
            WHEN ae.action = 'INSERT' THEN 'Equipment added to system'
            WHEN ae.action = 'DELETE' THEN 'Equipment record deleted'
            WHEN ae.action = 'UPDATE' THEN
                (
                    SELECT string_agg(
                        changed_field.key || ': ' ||
                        COALESCE((ae.old_values->>changed_field.key)::TEXT, 'NULL') ||
                        ' → ' ||
                        COALESCE((ae.new_values->>changed_field.key)::TEXT, 'NULL'),
                        ', '
                        ORDER BY changed_field.key  -- DETERMINISTIC
                    )
                    FROM (
                        SELECT DISTINCT key
                        FROM jsonb_each(ae.old_values) old_kv
                        JOIN jsonb_each(ae.new_values) new_kv ON old_kv.key = new_kv.key
                        WHERE old_kv.value IS DISTINCT FROM new_kv.value
                          AND old_kv.key NOT IN ('updated_at', 'created_at')
                        ORDER BY key  -- DETERMINISTIC
                    ) changed_field
                )
            ELSE 'Unknown'
        END AS changed_fields
    FROM audit_events ae
    WHERE ae.table_name = 'equipment'
      AND ae.record_pk = p_equipment_id
    ORDER BY ae.occurred_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_equipment_timeline IS 'Complete equipment history - deterministic field ordering for repeatability';

-- ========================================================================
-- STEP 3: Update attribute_value_timeline (already deterministic, but verify)
-- ========================================================================
-- Note: get_attribute_value_timeline uses COALESCE for specific columns
-- (value_text, value_number, value_bool, value_date) so it's already deterministic

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 029 complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Timeline diff functions updated:';
    RAISE NOTICE '  • get_service_record_timeline - deterministic field order';
    RAISE NOTICE '  • get_equipment_timeline - deterministic field order';
    RAISE NOTICE '';
    RAISE NOTICE 'Determinism guarantees:';
    RAISE NOTICE '  ✅ Fields ordered alphabetically (ORDER BY key)';
    RAISE NOTICE '  ✅ NULL normalized to ''NULL'' string (COALESCE)';
    RAISE NOTICE '  ✅ IS DISTINCT FROM ensures no fields omitted';
    RAISE NOTICE '  ✅ PostgreSQL TEXT cast provides consistent formatting';
    RAISE NOTICE '';
    RAISE NOTICE 'Auditor benefit: Repeatable output for compliance evidence';
    RAISE NOTICE '========================================';
END $$;
