# Audit System - Operations Guide

## Date: January 21, 2026

**Purpose:** Practical policies and procedures to maintain audit-grade compliance as Symbiosis grows.

---

## 🔐 DELETE Posture Policy (Per Table)

### Hard DELETE Blocked (Regulated Records)
These tables have hard DELETE prevention triggers. All deletions must use soft delete pattern.

**Tables:**
- `service_records` - Lab work logs (highly regulated under GLP)
- `equipment_attribute_values` - Equipment setpoints/configurations

**Rationale:** These tables represent regulated lab decisions and measurements. Complete audit trail required.

**Soft Delete Pattern:**
```sql
UPDATE service_records
SET deleted_at = NOW(),
    deleted_by = user_id,
    delete_reason = 'entered in error'
WHERE id = 'uuid';
```

### Hard DELETE Restricted (Controlled Access Only)
These tables allow hard DELETE but only for authorized roles (migration/system/admin).

**Tables:**
- `equipment` - Asset records
- `service_contracts` - Vendor agreements

**Rationale:**
- **Equipment:** Retirement handled via `is_active=false`, `retired_at`, `retired_reason`. Hard DELETE reserved for data cleanup/errors only.
- **Service Contracts:** Hard DELETE allowed for contract entry errors. Normal workflow uses expiration dates.

**Policy:** Hard deletes on these tables:
- Must be performed by dedicated role (`symbiosis_migration_role` or DBA)
- Always logged as SYSTEM operation in audit trail
- Require documented justification in reason_detail

### Unrestricted (Platform Tables)
Platform/UI tables (`workspaces`, `widget_instances`, `menubar_preferences`) allow normal DELETE operations. These are not regulated records.

---

## 📋 Process: Adding New Regulated Tables

**Rule:** Any new domain table representing lab activity or decisions must follow this checklist.

### Checklist for New Regulated Table

#### 1. Database Schema
- [ ] Add table to `audit_regulated_tables` registry
```sql
INSERT INTO audit_regulated_tables (table_name, audit_required, hard_delete_blocked, soft_delete_supported, notes)
VALUES (
    'new_table_name',
    TRUE,  -- audit required
    TRUE,  -- block hard DELETE if regulated record
    TRUE,  -- add soft delete columns if deletions expected
    'Description of why this table is regulated'
);
```

- [ ] Add soft delete columns if applicable
```sql
ALTER TABLE new_table_name
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN deleted_by UUID NULL REFERENCES users(id),
ADD COLUMN delete_reason TEXT NULL;
```

- [ ] Attach audit trigger
```sql
CREATE TRIGGER audit_new_table_name_trigger
    AFTER INSERT OR UPDATE OR DELETE ON new_table_name
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

- [ ] Add hard DELETE prevention if needed
```sql
CREATE TRIGGER prevent_hard_delete_new_table_name
    BEFORE DELETE ON new_table_name
    FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
```

#### 2. Compliance Verification
- [ ] Run compliance check:
```sql
SELECT * FROM check_regulated_table_compliance();
-- Must return 0 rows (no issues)
```

- [ ] Verify in compliance report:
```sql
SELECT * FROM audit_compliance_report
WHERE table_name = 'new_table_name';
-- Must show ✅ COMPLIANT
```

#### 3. Test Coverage
- [ ] Add test case to `TEST_AUDIT_COVERAGE.sql`
- [ ] Test hard DELETE prevention (if applicable)
- [ ] Test audit context enforcement
- [ ] Test soft delete pattern (if applicable)

#### 4. Timeline Views
- [ ] Add timeline function for auditor access
```sql
CREATE FUNCTION get_new_table_timeline(p_record_id UUID)
RETURNS TABLE (...) AS $$
-- Show complete change history
END;
$$ LANGUAGE plpgsql STABLE;
```

#### 5. Documentation
- [ ] Update `AUDIT_COMPLIANCE_FINAL.md` with new table
- [ ] Document DELETE posture in this guide
- [ ] Update application integration guide if new patterns needed

---

## 🖥️ Application Layer Requirements (Minimal)

To maintain database guarantees, the application must implement these minimal requirements:

### 1. Audit Context Wrapper (Critical)

**Every UPDATE/DELETE operation must:**
```javascript
const client = await pool.connect();
try {
    await client.query('BEGIN');

    // REQUIRED: Set audit context
    await client.query(`
        SELECT set_audit_context($1, $2, $3, $4, $5)
    `, [
        user.id,
        user.employee_code,
        reasonCode,        // From dropdown
        reasonDetail,      // From text field (if required)
        'app-v1.2.3'       // Application version
    ]);

    // Perform operation(s)
    await client.query(`UPDATE service_records SET ... WHERE id = $1`, [recordId]);

    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    // Handle enforcement errors gracefully
    if (error.message.includes('Audit context required')) {
        throw new ValidationError('Please provide a reason for this change');
    }
    throw error;
} finally {
    client.release();
}
```

### 2. Edit Forms (Required UI Elements)

**All edit forms for regulated tables must include:**

```html
<form id="edit-form">
    <!-- Regular fields -->
    <input name="temperature" value="...">

    <!-- REQUIRED: Reason dropdown -->
    <label>Reason for Change *</label>
    <select name="reason_code" required>
        <option value="">Select reason...</option>
        <option value="typo">Typographical Error</option>
        <option value="correction">Factual Correction</option>
        <option value="retest">Retest Results</option>
        <option value="equipment_maintenance">Equipment Maintenance</option>
        <option value="calibration">Calibration</option>
        <option value="other">Other (explain below)</option>
    </select>

    <!-- REQUIRED if certain reason codes selected -->
    <label>Explanation (required for corrections, retests) *</label>
    <textarea name="reason_detail"></textarea>
</form>
```

**Validation:**
- Reason code required for all UPDATE/DELETE operations
- Reason detail required if code is: `correction`, `retest`, `equipment_maintenance`, `calibration`, `other`

### 3. Display Requirements

**In regulated contexts, display:**
- Employee codes instead of names: "EMP-1047" or "Dr. Smith (EMP-1047)"
- Timestamp of last change
- "View History" button

**Example:**
```
Last changed by: EMP-1047 on 2026-01-21 14:30
Reason: Typo correction
[View History]
```

### 4. History View Implementation

**"View History" button must show:**
```javascript
// API endpoint
GET /api/service-records/:id/history

// Response from: SELECT * FROM get_service_record_timeline(:id)
[
    {
        timestamp: '2026-01-21T14:30:00Z',
        action: 'UPDATE',
        actor: 'EMP-1047',
        reason_code: 'typo',
        reason_detail: 'Corrected temperature reading',
        changed_fields: 'temperature: 83°C → 80°C'
    },
    {
        timestamp: '2026-01-20T09:15:00Z',
        action: 'INSERT',
        actor: 'EMP-0023',
        reason_code: 'initial_entry',
        changed_fields: 'Record created'
    }
]
```

### 5. Soft Delete UI

**Delete button workflow:**
```javascript
// Instead of hard DELETE:
async function deleteRecord(recordId, user, reason) {
    await query(`
        UPDATE service_records
        SET deleted_at = NOW(),
            deleted_by = $1,
            delete_reason = $2
        WHERE id = $3
    `, [user.id, reason, recordId]);
}
```

**Display:**
- Show soft-deleted records in "Deleted Items" view
- Option to restore (set deleted_at = NULL)
- Never show in default views (query: `WHERE deleted_at IS NULL`)

---

## 📝 Language Guidelines (Don't Overclaim)

### ✅ What You CAN Say

**To Management/Users:**
- "Audit-grade compliance infrastructure"
- "Tamper-evident audit trail"
- "Database layer ready for FDA 21 CFR Part 11 compliance"
- "Defense-in-depth security model"
- "Fail-closed enforcement (deny by default)"

**To Auditors/Regulators:**
- "Complete audit trail capturing who/what/when/why"
- "Immutable audit log with multiple protection layers"
- "Regulated tables registry prevents coverage drift"
- "Repeatable validation test suite"
- "System operations tightly controlled and logged"

### ❌ What NOT to Say (Without Additional Components)

**Don't claim:**
- "FDA 21 CFR Part 11 compliant" ← Requires e-signatures, validation package, SOPs
- "GLP compliant" ← Requires training, SOPs, QA review
- "SOC 2 compliant" ← Requires full security program + audit
- "HIPAA compliant" ← Requires BAA, security program, policies
- "Auditor-proof" ← Implies zero risk (use "audit-grade" instead)

**Why:** Compliance certifications require:
1. Database controls (✅ You have this)
2. Application controls (⚠️ Partially implemented)
3. Authentication/access controls (⚠️ Not evaluated)
4. SOPs and training (❌ Not implemented)
5. Validation evidence (⚠️ Test suite exists, formal validation needed)
6. Environmental controls (❌ Not evaluated)
7. E-signatures (❌ Not implemented)

### ✅ Best Phrasing (Accurate and Powerful)

**Internal communications:**
> "We've implemented an audit-grade database layer with defense-in-depth controls. The system captures complete audit trails (who/what/when/why), enforces fail-closed security, and provides automated compliance verification. This foundation is ready for FDA 21 CFR Part 11 compliance once we complete application-layer integration, SOPs, and validation documentation."

**To auditors:**
> "Our database implements tamper-evident audit trails with immutable logs, strict enforcement of change justifications, and automated compliance verification. All regulated tables are tracked in a registry that prevents coverage drift. We have repeatable test suites demonstrating enforcement mechanisms."

---

## 🎯 Compliance Scope (What's Covered vs. What's Not)

### ✅ Database Layer (Complete)

**Implemented:**
- Tamper-evident audit trail (immutable log)
- Fail-closed enforcement (UPDATE/DELETE require context)
- Reason code validation
- Hard DELETE prevention
- Soft delete support
- Pseudonymization (employee codes)
- Regulated tables registry
- Automated compliance checks
- Repeatable test suite
- System operation controls

**Grade:** A+ (Audit-Grade)

### ⚠️ Application Layer (Partially Implemented)

**Needs Implementation:**
- [ ] Audit context wrapper in middleware
- [ ] Reason dropdown in edit forms
- [ ] History view UI component
- [ ] Employee code display
- [ ] Soft delete UI workflows
- [ ] Error handling for enforcement

**Status:** Requirements documented, implementation pending

### ❌ Operational Controls (Not Implemented)

**Out of Scope for Database:**
- Standard Operating Procedures (SOPs)
- User training programs
- E-signature implementation
- Validation package (IQ/OQ/PQ)
- Access control policies
- Backup/restore procedures
- Change control process
- Retention policies

**Status:** Requires separate implementation

---

## 🚀 Growth Strategy (Preventing Regression)

### As Symbiosis Grows

**When adding new domain areas (Maintenance, Calibration, Inventory):**

1. **Evaluate:** Is this lab activity or decision-making? → Yes = Regulated
2. **Register:** Add to `audit_regulated_tables` before creating table
3. **Implement:** Follow "Adding New Regulated Tables" checklist
4. **Verify:** Run `check_regulated_table_compliance()` → Must return 0 issues
5. **Test:** Add to `TEST_AUDIT_COVERAGE.sql`
6. **Document:** Update DELETE posture in this guide

**Default Stance:** When in doubt, make it regulated. It's easier to relax controls later than to retrofit audit trails.

### Maintenance Schedule

**Monthly:**
- [ ] Run: `SELECT * FROM check_regulated_table_compliance();`
- [ ] Verify: 0 issues
- [ ] Review: `audit_system_operations` for unexpected system operations

**Quarterly:**
- [ ] Re-run: `TEST_AUDIT_COVERAGE.sql`
- [ ] Review: Recent changes (`audit_recent_changes` view)
- [ ] Update: Test suite for any new regulated tables

**Annually (or before audits):**
- [ ] Full validation: All test suites
- [ ] Documentation review: Update any policy changes
- [ ] Training: Ensure staff understands reason code requirements

---

## 📞 Support Queries

### For Developers

**Q:** "How do I update a regulated record?"
**A:** See Application Layer Requirements → Audit Context Wrapper

**Q:** "The database rejected my UPDATE with 'Audit context required' error"
**A:** You must call `set_audit_context()` in the same transaction before UPDATE

**Q:** "How do I delete a service record?"
**A:** Use soft delete: `UPDATE service_records SET deleted_at = NOW(), deleted_by = ..., delete_reason = ...`

### For Auditors

**Q:** "Show me the compliance status"
**A:** `SELECT * FROM audit_compliance_report;`

**Q:** "Show me all changes to record X"
**A:** `SELECT * FROM get_service_record_timeline('record-uuid');`

**Q:** "Show me system operations"
**A:** `SELECT * FROM audit_system_operations;`

**Q:** "How do I know all regulated tables are protected?"
**A:** `SELECT * FROM check_regulated_table_compliance();` → Returns 0 rows = fully compliant

---

## ✅ Summary

**Database Foundation:** Audit-grade, production-ready

**Current Status:**
- All regulated tables registered: ✅
- Compliance verification: ✅ (0 issues)
- Test suite: ✅ (repeatable)
- Timeline views: ✅ (auditor-friendly)

**Next Steps:**
1. Application layer integration (reason dropdowns, history views)
2. SOPs for regulated workflows
3. User training on audit requirements
4. Validation documentation (IQ/OQ/PQ) if pursuing Part 11 certification

**Policy:** Default to regulated for all lab activity tables. Use checklist when adding new domain areas.

---

**Document Owner:** Database Team
**Last Updated:** January 21, 2026
**Review Frequency:** Quarterly or before audits
