-- ========================================================================
-- MIGRATION 027: ADD AUDIT TIMELINE VIEWS
-- ========================================================================
-- Purpose: Auditor-friendly views for record history timelines
-- Date: 2026-01-21
-- Benefit: "Show me everything that happened to this record" without ad-hoc queries
-- ========================================================================

-- ========================================================================
-- STEP 1: Generic audit timeline view (all tables)
-- ========================================================================
CREATE OR REPLACE VIEW audit_record_timeline AS
SELECT
    ae.occurred_at AS timestamp,
    ae.table_name,
    ae.record_pk,
    ae.action,
    COALESCE(ae.actor_employee_code, 'SYSTEM') AS actor,
    ae.reason AS reason_code,
    ae.reason_detail,
    ae.source,
    -- Simplified diff summary
    CASE
        WHEN ae.action = 'INSERT' THEN 'Record created'
        WHEN ae.action = 'DELETE' THEN 'Record deleted'
        WHEN ae.action = 'SOFT_DELETE' THEN 'Record marked as deleted'
        WHEN ae.action = 'UPDATE' THEN
            -- Count changed fields
            (
                SELECT COUNT(*)
                FROM jsonb_each(ae.old_values) old_kv
                JOIN jsonb_each(ae.new_values) new_kv ON old_kv.key = new_kv.key
                WHERE old_kv.value IS DISTINCT FROM new_kv.value
            )::TEXT || ' field(s) changed'
        ELSE 'Unknown action'
    END AS change_summary,
    ae.old_values,
    ae.new_values
FROM audit_events ae
ORDER BY ae.occurred_at DESC;

COMMENT ON VIEW audit_record_timeline IS 'Complete audit timeline for all records - auditor-friendly view';

-- ========================================================================
-- STEP 2: Per-table timeline functions (detailed diffs)
-- ========================================================================

-- Service Records Timeline
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
        -- List changed field names
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
                    )
                    FROM (
                        SELECT DISTINCT key
                        FROM jsonb_each(ae.old_values) old_kv
                        JOIN jsonb_each(ae.new_values) new_kv ON old_kv.key = new_kv.key
                        WHERE old_kv.value IS DISTINCT FROM new_kv.value
                          AND old_kv.key NOT IN ('updated_at', 'created_at') -- Exclude timestamps
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

COMMENT ON FUNCTION get_service_record_timeline IS 'Detailed timeline for specific service record - shows exact field changes';

-- Equipment Timeline
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
                    )
                    FROM (
                        SELECT DISTINCT key
                        FROM jsonb_each(ae.old_values) old_kv
                        JOIN jsonb_each(ae.new_values) new_kv ON old_kv.key = new_kv.key
                        WHERE old_kv.value IS DISTINCT FROM new_kv.value
                          AND old_kv.key NOT IN ('updated_at', 'created_at')
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

COMMENT ON FUNCTION get_equipment_timeline IS 'Complete equipment history including status changes, maintenance, etc.';

-- Equipment Attribute Values Timeline
CREATE OR REPLACE FUNCTION get_attribute_value_timeline(p_value_id UUID)
RETURNS TABLE (
    occurred_at TIMESTAMP,
    action VARCHAR(20),
    actor TEXT,
    reason_code VARCHAR(50),
    reason_detail TEXT,
    change_detail TEXT
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
            WHEN ae.action = 'INSERT' THEN
                'Initial value: ' ||
                COALESCE(
                    ae.new_values->>'value_text',
                    (ae.new_values->>'value_number'),
                    (ae.new_values->>'value_bool'),
                    (ae.new_values->>'value_date'),
                    'N/A'
                )
            WHEN ae.action = 'UPDATE' THEN
                COALESCE(
                    ae.old_values->>'value_text',
                    (ae.old_values->>'value_number'),
                    (ae.old_values->>'value_bool'),
                    (ae.old_values->>'value_date'),
                    'N/A'
                ) || ' → ' ||
                COALESCE(
                    ae.new_values->>'value_text',
                    (ae.new_values->>'value_number'),
                    (ae.new_values->>'value_bool'),
                    (ae.new_values->>'value_date'),
                    'N/A'
                )
            WHEN ae.action = 'DELETE' THEN 'Value deleted'
            ELSE 'Unknown'
        END AS change_detail
    FROM audit_events ae
    WHERE ae.table_name = 'equipment_attribute_values'
      AND ae.record_pk = p_value_id
    ORDER BY ae.occurred_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_attribute_value_timeline IS 'Timeline for equipment attribute changes - shows value corrections';

-- ========================================================================
-- STEP 3: Recent changes summary (for dashboards)
-- ========================================================================
CREATE OR REPLACE VIEW audit_recent_changes AS
SELECT
    ae.occurred_at AS timestamp,
    ae.table_name,
    ae.record_pk,
    ae.action,
    COALESCE(ae.actor_employee_code, get_user_display_identity(ae.actor_user_id), 'SYSTEM') AS actor_display,
    ae.reason AS reason_code,
    LEFT(ae.reason_detail, 50) || CASE WHEN LENGTH(ae.reason_detail) > 50 THEN '...' ELSE '' END AS reason_summary,
    CASE
        WHEN ae.action = 'INSERT' THEN '✅ Created'
        WHEN ae.action = 'UPDATE' THEN '✏️ Updated'
        WHEN ae.action = 'SOFT_DELETE' THEN '🗑️ Deleted'
        WHEN ae.action = 'DELETE' THEN '⚠️ Hard Delete'
        ELSE ae.action
    END AS action_display
FROM audit_events ae
WHERE ae.occurred_at > NOW() - INTERVAL '7 days'
ORDER BY ae.occurred_at DESC
LIMIT 100;

COMMENT ON VIEW audit_recent_changes IS 'Last 7 days of changes across all regulated tables - for dashboard display';

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
DECLARE
    timeline_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO timeline_count FROM audit_record_timeline;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 027 complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Audit timeline views created:';
    RAISE NOTICE '  • audit_record_timeline (generic view)';
    RAISE NOTICE '  • get_service_record_timeline(uuid)';
    RAISE NOTICE '  • get_equipment_timeline(uuid)';
    RAISE NOTICE '  • get_attribute_value_timeline(uuid)';
    RAISE NOTICE '  • audit_recent_changes (last 7 days)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total audit events: %', timeline_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Usage examples:';
    RAISE NOTICE '  -- All changes to a record:';
    RAISE NOTICE '  SELECT * FROM get_service_record_timeline(''record-uuid'');';
    RAISE NOTICE '';
    RAISE NOTICE '  -- Recent activity dashboard:';
    RAISE NOTICE '  SELECT * FROM audit_recent_changes;';
    RAISE NOTICE '========================================';
END $$;
