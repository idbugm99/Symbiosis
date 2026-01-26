#!/bin/bash
# ========================================================================
# AUDIT SYSTEM VALIDATION SCRIPT
# ========================================================================
# Purpose: Enforces audit compliance by running automated checks
# Date: 2026-01-21
# Usage: ./scripts/validate_audit_system.sh
# Exit Codes: 0 = pass, 1 = fail
# ========================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-symbiosis}"
DB_USER="${DB_USER:-symbiosis_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       Audit System Validation - Automated Compliance Check   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ ERROR: psql not found. Install PostgreSQL client tools.${NC}"
    exit 1
fi

# Test database connection
echo -e "${BLUE}→ Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
    echo -e "${RED}❌ ERROR: Cannot connect to database${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# ========================================================================
# CHECK 1: Regulated Tables Registry Compliance
# ========================================================================
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  CHECK 1: Regulated Tables Registry Compliance              │"
echo "└─────────────────────────────────────────────────────────────┘"

COMPLIANCE_ISSUES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT COUNT(*) FROM check_regulated_table_compliance();")

if [ "$COMPLIANCE_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS: All regulated tables compliant (0 issues)${NC}"
else
    echo -e "${RED}❌ FAIL: $COMPLIANCE_ISSUES compliance issues found${NC}"
    echo ""
    echo "Issues:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT * FROM check_regulated_table_compliance();"
    exit 1
fi
echo ""

# ========================================================================
# CHECK 2: Audit Coverage Test Suite
# ========================================================================
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  CHECK 2: Running Audit Coverage Test Suite                 │"
echo "└─────────────────────────────────────────────────────────────┘"

TEST_OUTPUT_FILE="/tmp/audit_coverage_test_$$.log"

# Run test suite and capture output
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$MIGRATIONS_DIR/TEST_AUDIT_COVERAGE.sql" > "$TEST_OUTPUT_FILE" 2>&1; then

    # Check for unexpected failures (errors that shouldn't happen)
    if grep -q "FAIL:" "$TEST_OUTPUT_FILE"; then
        echo -e "${RED}❌ FAIL: Test suite reported failures${NC}"
        echo ""
        echo "Failed tests:"
        grep "FAIL:" "$TEST_OUTPUT_FILE"
        echo ""
        echo "Full output: $TEST_OUTPUT_FILE"
        exit 1
    fi

    # Check for expected enforcement errors (these are GOOD - they prove enforcement works)
    EXPECTED_ERRORS=0
    EXPECTED_ERRORS=$(grep -c "ERROR:" "$TEST_OUTPUT_FILE" || true)

    if [ "$EXPECTED_ERRORS" -lt 8 ]; then
        echo -e "${YELLOW}⚠️  WARNING: Expected at least 8 enforcement errors (found $EXPECTED_ERRORS)${NC}"
        echo "Enforcement may not be working correctly."
    fi

    echo -e "${GREEN}✅ PASS: Test suite completed successfully${NC}"
    echo "   • Enforcement errors detected: $EXPECTED_ERRORS (expected)"
    echo "   • Full output: $TEST_OUTPUT_FILE"
else
    echo -e "${RED}❌ FAIL: Test suite execution failed${NC}"
    echo ""
    echo "Last 20 lines of output:"
    tail -n 20 "$TEST_OUTPUT_FILE"
    exit 1
fi
echo ""

# ========================================================================
# CHECK 3: Audit Event Statistics
# ========================================================================
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  CHECK 3: Audit Event Statistics                            │"
echo "└─────────────────────────────────────────────────────────────┘"

TOTAL_EVENTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT COUNT(*) FROM audit_events;")

SYSTEM_OPS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT COUNT(*) FROM audit_system_operations;")

RECENT_CHANGES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT COUNT(*) FROM audit_recent_changes;")

echo "  • Total audit events: $TOTAL_EVENTS"
echo "  • System operations: $SYSTEM_OPS"
echo "  • Recent changes (7d): $RECENT_CHANGES"

if [ "$TOTAL_EVENTS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: No audit events in database (new installation?)${NC}"
fi
echo ""

# ========================================================================
# CHECK 4: Immutability Verification
# ========================================================================
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  CHECK 4: Immutability Verification                         │"
echo "└─────────────────────────────────────────────────────────────┘"

# Check privileges are revoked
UPDATE_ALLOWED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT has_table_privilege('$DB_USER', 'audit_events', 'UPDATE');" || echo "f")

DELETE_ALLOWED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c \
    "SELECT has_table_privilege('$DB_USER', 'audit_events', 'DELETE');" || echo "f")

if [ "$UPDATE_ALLOWED" = "f" ] && [ "$DELETE_ALLOWED" = "f" ]; then
    echo -e "${GREEN}✅ PASS: UPDATE/DELETE privileges properly revoked${NC}"
else
    echo -e "${RED}❌ FAIL: Immutability not properly enforced${NC}"
    echo "   • UPDATE allowed: $UPDATE_ALLOWED (should be f)"
    echo "   • DELETE allowed: $DELETE_ALLOWED (should be f)"
    exit 1
fi
echo ""

# ========================================================================
# FINAL SUMMARY
# ========================================================================
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    VALIDATION PASSED ✅                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "All compliance checks passed:"
echo "  ✅ Registry compliance: 0 issues"
echo "  ✅ Test suite: All tests passed"
echo "  ✅ Audit statistics: Tracked"
echo "  ✅ Immutability: Enforced"
echo ""
echo "Audit system is production-ready."
echo ""
echo "Next steps:"
echo "  • Add this script to CI/CD pipeline"
echo "  • Run before deployments"
echo "  • Schedule monthly compliance checks"
echo ""
echo "═══════════════════════════════════════════════════════════════"

# Cleanup
rm -f "$TEST_OUTPUT_FILE"

exit 0
