-- ========================================================================
-- MIGRATION 020: ADD SOFT DELETE TO SERVICE_RECORDS
-- ========================================================================
-- Purpose: Enable audit-friendly deletion (mark deleted instead of DROP)
-- Date: 2026-01-21
-- Pattern: Soft delete with reason tracking
-- ========================================================================

-- ========================================================================
-- STEP 1: Add soft delete columns to service_records
-- ========================================================================
ALTER TABLE service_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID NULL,
ADD COLUMN IF NOT EXISTS delete_reason TEXT NULL;

-- Add foreign key for deleted_by
ALTER TABLE service_records
ADD CONSTRAINT service_records_deleted_by_fkey
FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- Index for filtering out deleted records
CREATE INDEX idx_service_records_deleted_at ON service_records(deleted_at);

-- ========================================================================
-- STEP 2: Create view for active (non-deleted) service records
-- ========================================================================
CREATE OR REPLACE VIEW service_records_active AS
SELECT * FROM service_records WHERE deleted_at IS NULL;

-- ========================================================================
-- STEP 3: Add CHECK constraint to ensure delete reason when deleted
-- ========================================================================
ALTER TABLE service_records
ADD CONSTRAINT service_records_delete_reason_check
CHECK (
    (deleted_at IS NULL) OR
    (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND delete_reason IS NOT NULL)
);

-- Comments for documentation
COMMENT ON COLUMN service_records.deleted_at IS 'Soft delete timestamp - record not actually deleted, just marked';
COMMENT ON COLUMN service_records.deleted_by IS 'User who marked this record as deleted';
COMMENT ON COLUMN service_records.delete_reason IS 'Required justification for deletion (e.g., "duplicate entry", "entered in error")';
COMMENT ON VIEW service_records_active IS 'Convenience view showing only non-deleted service records';

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
DECLARE
    service_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO service_count FROM service_records;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 020 complete';
    RAISE NOTICE '  Total service records: %', service_count;
    RAISE NOTICE '  Soft delete columns added';
    RAISE NOTICE '  service_records_active view created';
    RAISE NOTICE '  All existing records remain active (deleted_at IS NULL)';
    RAISE NOTICE '========================================';
END $$;
