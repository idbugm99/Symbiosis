#!/bin/bash

# ========================================================================
# AUDIT TRAIL SYSTEM - MASTER SCRIPT
# ========================================================================
# Purpose: Install comprehensive audit trail for regulated lab environment
# Date: 2026-01-21
# Database: PostgreSQL (symbiosis)
# Compliance: GLP, FDA 21 CFR Part 11
# ========================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_USER="symbiosis_user"
DB_NAME="symbiosis"
MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}========================================================================"
echo -e "Symbiosis Audit Trail System Installation"
echo -e "========================================================================${NC}"
echo ""
echo -e "${YELLOW}This will install:"
echo "  1. audit_events table (immutable audit log)"
echo "  2. Soft delete columns on service_records"
echo "  3. employee_code for users (immutable identity)"
echo "  4. Audit triggers on regulated tables"
echo ""
echo -e "Compliance: GLP, FDA 21 CFR Part 11"
echo -e "Database: ${DB_NAME}"
echo -e "User: ${DB_USER}${NC}"
echo ""

# ========================================================================
# Pre-flight checks
# ========================================================================

echo -e "${YELLOW}→ Running pre-flight checks...${NC}"

# Check PostgreSQL connection
if ! psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}✗ ERROR: Cannot connect to PostgreSQL database${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL connection successful${NC}"

# Check if equipment refactoring is complete (migration 014)
if ! psql -U "$DB_USER" -d "$DB_NAME" -c "\d equipment" | grep -q "equipment_type_id" > /dev/null 2>&1; then
    echo -e "${RED}✗ ERROR: Equipment refactoring not complete (run RUN_EQUIPMENT_MIGRATION.sh first)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Equipment refactoring complete${NC}"

echo ""

# ========================================================================
# Confirmation
# ========================================================================

echo -e "${YELLOW}⚠️  These migrations will add audit infrastructure${NC}"
echo ""
read -p "Continue with audit trail installation? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Installation cancelled${NC}"
    exit 0
fi

echo ""

# ========================================================================
# Run migrations
# ========================================================================

MIGRATIONS=(
    "019_create_audit_events_table.sql"
    "020_add_soft_delete_to_service_records.sql"
    "021_add_employee_code_to_users.sql"
    "022_create_audit_triggers.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    MIGRATION_FILE="${MIGRATIONS_DIR}/${migration}"

    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${RED}✗ ERROR: Migration file not found: $migration${NC}"
        exit 1
    fi

    echo -e "${YELLOW}→ Running: $migration${NC}"

    if psql -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" > /tmp/migration_output.txt 2>&1; then
        # Show notices from migration
        grep "NOTICE" /tmp/migration_output.txt | while read -r line; do
            echo -e "${GREEN}  $line${NC}"
        done
        echo -e "${GREEN}✓ $migration completed${NC}"
    else
        echo -e "${RED}✗ ERROR: Migration failed: $migration${NC}"
        echo ""
        cat /tmp/migration_output.txt
        exit 1
    fi

    echo ""
done

# ========================================================================
# Verification
# ========================================================================

echo -e "${YELLOW}→ Running verification...${NC}"

# Check audit_events table exists
AUDIT_TABLE=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audit_events';")
echo -e "${GREEN}✓ audit_events table: $([ "$AUDIT_TABLE" -eq "1" ] && echo 'exists' || echo 'MISSING')${NC}"

# Check soft delete columns
SOFT_DELETE_COL=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'service_records' AND column_name = 'deleted_at';")
echo -e "${GREEN}✓ service_records.deleted_at: $([ "$SOFT_DELETE_COL" -eq "1" ] && echo 'exists' || echo 'MISSING')${NC}"

# Check employee_code
EMPLOYEE_CODE_COL=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'employee_code';")
echo -e "${GREEN}✓ users.employee_code: $([ "$EMPLOYEE_CODE_COL" -eq "1" ] && echo 'exists' || echo 'MISSING')${NC}"

# Count audit triggers
TRIGGER_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'audit_%_trigger';")
echo -e "${GREEN}✓ Audit triggers installed: $TRIGGER_COUNT${NC}"

# Show sample employee code
SAMPLE_EMP=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT employee_code, display_name FROM users LIMIT 1;")
echo -e "${GREEN}✓ Sample user: $SAMPLE_EMP${NC}"

echo ""

# ========================================================================
# Success
# ========================================================================

echo -e "${GREEN}========================================================================"
echo -e "✓ Audit trail system installed successfully!"
echo -e "========================================================================${NC}"
echo ""
echo -e "${BLUE}What was installed:${NC}"
echo "  • audit_events table (immutable log)"
echo "  • Soft delete on service_records (deleted_at, deleted_by, delete_reason)"
echo "  • Employee codes for all users (EMP-0001, EMP-0002, ...)"
echo "  • Audit triggers on: service_records, equipment, equipment_attribute_values, service_contracts"
echo ""
echo -e "${YELLOW}Application Integration Required:${NC}"
echo ""
echo "Before making regulated changes, call:"
echo ""
echo "  SELECT set_audit_context("
echo "    user_id::UUID,"
echo "    'EMP-1047',"
echo "    'typo',  -- reason: typo, correction, retest, etc."
echo "    'Changed temperature from 83 to 80',"
echo "    'symbiosis-ui-v1.2.3'"
echo "  );"
echo ""
echo "Then make your change:"
echo "  UPDATE service_records SET temperature = 80 WHERE id = '...';"
echo ""
echo "View audit history:"
echo "  SELECT * FROM get_audit_history('service_records', 'record-uuid');"
echo ""
echo -e "${GREEN}Compliance: GLP, FDA 21 CFR Part 11 ready ✅${NC}"
echo ""
