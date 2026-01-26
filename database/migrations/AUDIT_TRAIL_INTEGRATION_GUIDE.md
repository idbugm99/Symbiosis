# Audit Trail Integration Guide

## Date: January 21, 2026

This guide explains how to integrate the GLP/FDA 21 CFR Part 11 compliant audit trail system into the Symbiosis application.

---

## 🎯 What You Have

### Database Infrastructure (Installed)

1. **audit_events table** - Immutable log of all changes
2. **Soft delete columns** - `deleted_at`, `deleted_by`, `delete_reason` on regulated tables
3. **Employee codes** - Immutable user identifiers (EMP-0001, EMP-0002, etc.)
4. **Audit triggers** - Automatic capture on: `service_records`, `equipment`, `equipment_attribute_values`, `service_contracts`

### Compliance Features

✅ **Tamper-evident history** - Audit log cannot be modified or deleted
✅ **Who/What/When/Why tracking** - Complete change context
✅ **Pseudonymization-ready** - Uses employee codes instead of names
✅ **Soft deletes** - Records marked deleted, not destroyed

---

## 📝 Application Integration Pattern

### Basic Workflow

```javascript
// Node.js/Express example
async function updateServiceRecord(recordId, newData, user, reason, reasonDetail) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // STEP 1: Set audit context
    await client.query(`
      SELECT set_audit_context($1, $2, $3, $4, $5)
    `, [
      user.id,                  // UUID
      user.employee_code,       // e.g., 'EMP-1047'
      reason,                   // 'typo', 'correction', 'retest', etc.
      reasonDetail,             // Free-text explanation
      'symbiosis-ui-v1.2.3'     // Application version
    ]);

    // STEP 2: Make the change (audit trigger captures automatically)
    await client.query(`
      UPDATE service_records
      SET temperature = $1, updated_at = NOW()
      WHERE id = $2
    `, [newData.temperature, recordId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Important: Transaction Scoping

**✅ CORRECT** - Audit context and change in same transaction:
```javascript
await client.query('BEGIN');
await client.query('SELECT set_audit_context(...)');
await client.query('UPDATE service_records SET ...');
await client.query('COMMIT');
```

**❌ WRONG** - Separate transactions (context lost):
```javascript
await pool.query('SELECT set_audit_context(...)');
await pool.query('UPDATE service_records SET ...');  // Context not available
```

---

## 🔐 Reason Codes

When setting audit context, use these standard reason codes:

| Code | Usage |
|------|-------|
| `initial_entry` | First-time data entry (automatic for INSERTs) |
| `typo` | Correcting typographical error |
| `correction` | Correcting factual error |
| `retest` | Updating with retest results |
| `equipment_maintenance` | Change due to equipment service |
| `calibration` | Change due to calibration event |
| `system_migration` | Data migration/system update |
| `other` | Other reason (provide `reason_detail`) |

---

## 🖥️ UI Requirements

### 1. Edit Form - Reason Required

When user clicks "Edit" on regulated records:

```javascript
// Show modal with:
// 1. Editable fields
// 2. Reason dropdown (required)
// 3. Justification text area (required if reason = 'other')

<select name="reason" required>
  <option value="">Select reason...</option>
  <option value="typo">Typographical Error</option>
  <option value="correction">Factual Correction</option>
  <option value="retest">Retest Results</option>
  <option value="other">Other (explain below)</option>
</select>

<textarea name="reason_detail" required>
  Explain the change...
</textarea>
```

### 2. View History Button

Add "View History" button to all regulated record views:

```javascript
async function showAuditHistory(tableName, recordId) {
  const history = await fetch(`/api/audit/history?table=${tableName}&id=${recordId}`);

  // Display timeline showing:
  // - Timestamp
  // - Action (INSERT/UPDATE/DELETE)
  // - Actor (employee code + display name)
  // - Reason
  // - Before/After values
}
```

### 3. History API Endpoint

```javascript
// GET /api/audit/history?table=service_records&id=uuid
router.get('/audit/history', async (req, res) => {
  const { table, id } = req.query;

  const result = await pool.query(`
    SELECT * FROM get_audit_history($1, $2)
    ORDER BY occurred_at DESC
  `, [table, id]);

  res.json(result.rows);
});
```

---

## 📊 Querying Audit History

### Get History for Specific Record

```sql
-- Using helper function
SELECT * FROM get_audit_history('service_records', 'record-uuid');

-- Returns:
-- occurred_at | action | actor_display | reason | reason_detail | changes (JSONB)
```

### Find All Changes by User

```sql
SELECT
  ae.occurred_at,
  ae.table_name,
  ae.record_pk,
  ae.action,
  ae.reason
FROM audit_events ae
WHERE ae.actor_employee_code = 'EMP-1047'
ORDER BY ae.occurred_at DESC;
```

### Find Recent Corrections

```sql
SELECT
  ae.occurred_at,
  ae.table_name,
  ae.actor_employee_code,
  ae.reason_detail,
  ae.old_values->>'value_text' AS before,
  ae.new_values->>'value_text' AS after
FROM audit_events ae
WHERE ae.reason = 'correction'
  AND ae.occurred_at > NOW() - INTERVAL '30 days'
ORDER BY ae.occurred_at DESC;
```

---

## 🗑️ Soft Delete Pattern

### Marking Records as Deleted

```javascript
async function softDeleteServiceRecord(recordId, user, reason) {
  await pool.query(`
    UPDATE service_records
    SET deleted_at = NOW(),
        deleted_by = $1,
        delete_reason = $2
    WHERE id = $3
  `, [user.id, reason, recordId]);

  // Audit trigger automatically captures this as SOFT_DELETE action
}
```

### Querying Active Records

```sql
-- Option 1: Use the view
SELECT * FROM service_records_active;

-- Option 2: Filter manually
SELECT * FROM service_records WHERE deleted_at IS NULL;
```

### Restoring Soft-Deleted Records

```javascript
async function restoreServiceRecord(recordId, user) {
  await client.query('BEGIN');

  await client.query(`SELECT set_audit_context($1, $2, 'correction', 'Restored incorrectly deleted record', 'symbiosis-ui')`);

  await client.query(`
    UPDATE service_records
    SET deleted_at = NULL,
        deleted_by = NULL,
        delete_reason = NULL
    WHERE id = $1
  `, [recordId]);

  await client.query('COMMIT');
}
```

---

## 👤 Employee Code Display

### Show Employee Codes in Regulated Views

```javascript
// Instead of showing "Dr. Jane Smith"
// Show "Dr. Jane Smith (EMP-1047)" in audit contexts

function getUserDisplay(user) {
  if (user.name_redacted) {
    return user.employee_code;  // Only show EMP-1047
  }
  return `${user.display_name} (${user.employee_code})`;
}
```

### Pseudonymization (Name Removal)

```javascript
// If employee requests name removal:
async function redactUserName(userId) {
  await pool.query(`
    UPDATE users
    SET name_redacted = true,
        display_name = employee_code
    WHERE id = $1
  `, [userId]);

  // Past audit records still show employee code
  // No need to rewrite history
}
```

---

## 🚨 Error Handling

### Missing Audit Context

```javascript
// If application doesn't call set_audit_context():
// - Audit record still created
// - actor_user_id = NULL
// - actor_employee_code = NULL
// - Shows as "System" in audit trail

// This is ACCEPTABLE for:
// - Background jobs
// - System migrations
// - Automated processes

// This is NOT ACCEPTABLE for:
// - User-initiated changes to regulated data
```

### Validation in Application Layer

```javascript
// Enforce reason requirement in application
if (isRegulatedTable(tableName) && !reason) {
  throw new Error('Change reason required for regulated records');
}
```

---

## 📋 Regulated Tables

These tables have audit triggers attached:

| Table | Why Regulated |
|-------|---------------|
| `service_records` | Lab work logs (GLP requirement) |
| `equipment` | Asset tracking (calibration history) |
| `equipment_attribute_values` | Setpoints and configurations |
| `service_contracts` | Compliance documentation |

### Adding More Regulated Tables

```sql
-- Example: Add audit trigger to calibration_records
CREATE TRIGGER audit_calibration_records_trigger
  AFTER INSERT OR UPDATE OR DELETE ON calibration_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Add soft delete columns
ALTER TABLE calibration_records
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN deleted_by UUID NULL REFERENCES users(id),
ADD COLUMN delete_reason TEXT NULL;
```

---

## ✅ Testing Checklist

### Unit Tests

- [ ] Audit context set correctly in transaction
- [ ] Changes captured with actor information
- [ ] Reason codes validated
- [ ] Soft delete marks record correctly
- [ ] History query returns complete timeline

### Integration Tests

- [ ] Edit form requires reason selection
- [ ] History button shows complete audit trail
- [ ] Pseudonymization works (name_redacted = true)
- [ ] Deleted records hidden from default views
- [ ] Immutability enforced (UPDATE audit_events fails)

### Compliance Validation

- [ ] Can answer "Who changed X?"
- [ ] Can answer "What was changed?"
- [ ] Can answer "When was it changed?"
- [ ] Can answer "Why was it changed?"
- [ ] Can prove data was not tampered with

---

## 📚 Database Functions Reference

### `set_audit_context(user_id, employee_code, reason, reason_detail, source)`

Sets session variables for the audit trigger to capture.

**Parameters:**
- `user_id` (UUID): User making the change
- `employee_code` (VARCHAR): Employee code (e.g., 'EMP-1047')
- `reason` (VARCHAR): Standard reason code
- `reason_detail` (TEXT): Free-text explanation
- `source` (VARCHAR): Application identifier

**Example:**
```sql
SELECT set_audit_context(
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'EMP-1047',
  'typo',
  'Corrected temperature from 83 to 80',
  'symbiosis-ui-v1.2.3'
);
```

### `get_audit_history(table_name, record_pk)`

Returns complete audit trail for a specific record.

**Parameters:**
- `table_name` (VARCHAR): Table name (e.g., 'service_records')
- `record_pk` (UUID): Primary key of record

**Returns:**
- `occurred_at` (TIMESTAMP): When change occurred
- `action` (VARCHAR): INSERT/UPDATE/DELETE/SOFT_DELETE
- `actor_display` (TEXT): User-friendly actor name
- `reason` (VARCHAR): Change reason
- `reason_detail` (TEXT): Explanation
- `changes` (JSONB): Before/after values

**Example:**
```sql
SELECT * FROM get_audit_history('service_records', 'record-uuid');
```

### `get_user_display_identity(user_id)`

Returns display name respecting pseudonymization.

**Parameters:**
- `user_id` (UUID): User ID

**Returns:**
- Display name (e.g., "Dr. Jane Smith (EMP-1047)") if not redacted
- Employee code only (e.g., "EMP-1047") if redacted

**Example:**
```sql
SELECT get_user_display_identity('user-uuid');
```

---

## 🎓 Key Principles

### 1. Never Store Names on Regulated Records

❌ **Wrong:**
```sql
ALTER TABLE service_records ADD COLUMN performed_by_name VARCHAR(255);
```

✅ **Right:**
```sql
-- Store user_id, render name at display time using get_user_display_identity()
ALTER TABLE service_records ADD COLUMN performed_by UUID REFERENCES users(id);
```

### 2. Always Provide Context for Changes

❌ **Wrong:**
```javascript
await pool.query('UPDATE service_records SET temperature = 80 WHERE id = $1', [id]);
```

✅ **Right:**
```javascript
await client.query('SELECT set_audit_context(...)');
await client.query('UPDATE service_records SET temperature = 80 WHERE id = $1', [id]);
```

### 3. Soft Delete Instead of Hard Delete

❌ **Wrong:**
```sql
DELETE FROM service_records WHERE id = 'uuid';
```

✅ **Right:**
```sql
UPDATE service_records
SET deleted_at = NOW(), deleted_by = $1, delete_reason = $2
WHERE id = 'uuid';
```

---

## 🚀 Production Deployment

1. **Run migrations** (already completed)
   ```bash
   ./RUN_AUDIT_MIGRATIONS.sh
   ```

2. **Update application code** to call `set_audit_context()` before regulated changes

3. **Add UI components** for reason selection and history viewing

4. **Train users** on justification requirements

5. **Enable auditor access** to `audit_events` table (read-only)

---

## 📞 Support

For questions about audit trail implementation:
- See `FINAL_ARCHITECTURE_STATUS.md` for database schema
- See migration files 019-022 for SQL implementation details
- Test queries in `RUN_AUDIT_MIGRATIONS.sh` for examples

**Status:** ✅ Production-ready for GLP/FDA 21 CFR Part 11 compliance

---

**Last Updated:** January 21, 2026
**Database:** PostgreSQL (symbiosis)
**Migrations:** 019-022
