-- ========================================================================
-- MIGRATION 021: ADD EMPLOYEE_CODE TO USERS
-- ========================================================================
-- Purpose: Immutable identity for audit trails (survives name changes)
-- Date: 2026-01-21
-- Pattern: Pseudonymization-friendly accountability
-- ========================================================================

-- ========================================================================
-- STEP 1: Add employee_code and related fields
-- ========================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50) NULL UNIQUE,
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS name_redacted BOOLEAN NOT NULL DEFAULT FALSE;

-- ========================================================================
-- STEP 2: Generate employee codes for existing users
-- ========================================================================
DO $$
DECLARE
    user_record RECORD;
    user_count INTEGER := 0;
BEGIN
    -- Generate employee codes for users that don't have one
    FOR user_record IN
        SELECT id, email
        FROM users
        WHERE employee_code IS NULL
        ORDER BY created_at
    LOOP
        user_count := user_count + 1;

        UPDATE users
        SET employee_code = 'EMP-' || LPAD(user_count::TEXT, 4, '0'),
            display_name = COALESCE(email, 'User ' || user_count)
        WHERE id = user_record.id;
    END LOOP;

    RAISE NOTICE '✓ Generated employee codes for % users', user_count;
END $$;

-- ========================================================================
-- STEP 3: Make employee_code NOT NULL after backfill
-- ========================================================================
ALTER TABLE users ALTER COLUMN employee_code SET NOT NULL;

-- Index for lookups
CREATE INDEX idx_users_employee_code ON users(employee_code);

-- ========================================================================
-- STEP 4: Create helper function for display
-- ========================================================================
CREATE OR REPLACE FUNCTION get_user_display_identity(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_rec RECORD;
BEGIN
    SELECT employee_code, display_name, name_redacted, email
    INTO user_rec
    FROM users
    WHERE id = user_id;

    IF NOT FOUND THEN
        RETURN 'Unknown User';
    END IF;

    -- If name is redacted, show only employee code
    IF user_rec.name_redacted THEN
        RETURN user_rec.employee_code;
    END IF;

    -- Otherwise show display_name (employee_code)
    RETURN COALESCE(user_rec.display_name, user_rec.email) || ' (' || user_rec.employee_code || ')';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_display_identity IS 'Returns user-friendly display name with employee code, respecting redaction';

-- Comments for documentation
COMMENT ON COLUMN users.employee_code IS 'Immutable internal identifier (e.g., EMP-1047) - NEVER changes, even if name changes';
COMMENT ON COLUMN users.display_name IS 'User-friendly name for UI display - CAN change anytime';
COMMENT ON COLUMN users.name_redacted IS 'If true, UI shows only employee_code (for "remove my name" requests)';

-- ========================================================================
-- VERIFICATION
-- ========================================================================
DO $$
DECLARE
    user_count INTEGER;
    sample_user RECORD;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;

    SELECT employee_code, display_name, email
    INTO sample_user
    FROM users
    LIMIT 1;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 021 complete';
    RAISE NOTICE '  Total users: %', user_count;
    RAISE NOTICE '  All users have employee_code assigned';
    RAISE NOTICE '  Sample: % (display: %)', sample_user.employee_code, sample_user.display_name;
    RAISE NOTICE '  Helper function: get_user_display_identity(user_id)';
    RAISE NOTICE '========================================';
END $$;
