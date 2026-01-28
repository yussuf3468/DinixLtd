# 📊 Database Schema Quick Reference

## Core Tables

### 1. `staff`

Manages staff members who use the CMS.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- full_name (TEXT)
- email (TEXT, UNIQUE)
- phone (TEXT)
- role (ENUM: admin, manager, staff, accountant)
- is_active (BOOLEAN, default true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 2. `clients`

Stores client information.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- client_name (TEXT)
- client_code (TEXT, UNIQUE, auto-generated)
- email (TEXT)
- phone (TEXT)
- address (TEXT)
- status (ENUM: active, inactive)
- created_by (UUID, FK → staff) ⭐ NEW
- updated_by (UUID, FK → staff) ⭐ NEW
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 3. `client_debts`

Tracks client debts and balances.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- client_id (UUID, FK → clients)
- amount (NUMERIC, total debt amount)
- currency (ENUM: KES, USD)
- amount_paid (NUMERIC, default 0)
- balance (NUMERIC, GENERATED ALWAYS) ⭐ Auto-calculated
- description (TEXT)
- reference_number (TEXT)
- debt_date (DATE)
- due_date (DATE)
- paid_date (DATE, nullable)
- status (ENUM: pending, overdue, paid, cancelled)
- priority (ENUM: low, normal, high, urgent)
- payment_plan (TEXT)
- reminder_sent (BOOLEAN)
- created_by (UUID, FK → staff) ⭐ NEW
- updated_by (UUID, FK → staff) ⭐ NEW
- notes (TEXT)
- attachments (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 4. `debt_payments`

Records payments made towards debts.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- debt_id (UUID, FK → client_debts)
- amount (NUMERIC)
- payment_date (DATE)
- payment_method (ENUM: cash, bank_transfer, mpesa, card, other)
- reference_number (TEXT)
- receipt_number (TEXT)
- recorded_by (UUID, FK → staff) ⭐ NEW
- notes (TEXT)
- attachments (JSONB)
- created_at (TIMESTAMP)
```

### 5. `client_transactions_kes`

KES currency transactions.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- client_id (UUID, FK → clients)
- transaction_type (ENUM: invoice, payment, refund, other)
- amount (NUMERIC)
- payment_status (ENUM: pending, completed, failed)
- payment_method (ENUM: cash, bank_transfer, mpesa, card, other)
- reference_number (TEXT)
- description (TEXT)
- transaction_date (DATE)
- recorded_by (UUID, FK → staff) ⭐ NEW
- notes (TEXT)
- attachments (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 6. `client_transactions_usd`

USD currency transactions (same structure as KES).

### 7. `vehicles`

Vehicle information for clients.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- client_id (UUID, FK → clients)
- vehicle_type (TEXT)
- make (TEXT)
- model (TEXT)
- year (INTEGER)
- registration_number (TEXT)
- vin (TEXT)
- status (ENUM: active, inactive, sold)
- created_by (UUID, FK → staff) ⭐ NEW
- updated_by (UUID, FK → staff) ⭐ NEW
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 8. `client_documents`

Document storage for clients.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- client_id (UUID, FK → clients)
- document_type (ENUM: contract, invoice, receipt, id, other)
- file_name (TEXT)
- file_url (TEXT)
- file_size (INTEGER)
- mime_type (TEXT)
- uploaded_by (UUID, FK → staff) ⭐ NEW
- notes (TEXT)
- created_at (TIMESTAMP)
```

## Views

### `overdue_debts`

Shows all debts past their due date.

```sql
SELECT
  d.*,
  c.client_name,
  c.client_code
FROM client_debts d
JOIN clients c ON d.client_id = c.id
WHERE d.status = 'overdue'
ORDER BY d.due_date;
```

### `upcoming_debts`

Shows debts due within the next 7 days.

```sql
SELECT
  d.*,
  c.client_name,
  c.client_code
FROM client_debts d
JOIN clients c ON d.client_id = c.id
WHERE d.status = 'pending'
  AND d.due_date >= CURRENT_DATE
  AND d.due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY d.due_date;
```

## Triggers

### 1. `update_debt_status_trigger`

Automatically updates debt status to 'overdue' when due_date is past.

```sql
CREATE TRIGGER update_debt_status_trigger
  BEFORE INSERT OR UPDATE ON client_debts
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_status();
```

### 2. `update_debt_payment_trigger`

Updates `amount_paid` in client_debts when a payment is recorded.

```sql
CREATE TRIGGER update_debt_payment_trigger
  AFTER INSERT ON debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_payment();
```

### 3. `generate_client_code_trigger`

Auto-generates unique client codes (CL-XXXX format).

### 4. `update_last_transaction_trigger`

Updates client's `last_transaction_date` when transactions are recorded.

## Security (RLS Policies)

All tables have Row Level Security enabled with policies:

- Users can only see their own data
- `user_id` must match authenticated user
- Applied to SELECT, INSERT, UPDATE, DELETE operations

## Indexes

Performance indexes on:

- Foreign keys (client_id, user_id, debt_id, etc.)
- Status columns
- Due dates
- Transaction dates
- Email addresses (for lookups)
- Client codes (for quick search)

## Key Relationships

```
auth.users
  └─→ staff (user_id)
  └─→ clients (user_id)
  └─→ client_debts (user_id)
  └─→ debt_payments (user_id)
  └─→ client_transactions_kes (user_id)
  └─→ client_transactions_usd (user_id)
  └─→ vehicles (user_id)
  └─→ client_documents (user_id)

staff
  └─→ clients (created_by, updated_by)
  └─→ client_debts (created_by, updated_by)
  └─→ debt_payments (recorded_by)
  └─→ client_transactions_kes (recorded_by)
  └─→ client_transactions_usd (recorded_by)
  └─→ vehicles (created_by, updated_by)
  └─→ client_documents (uploaded_by)

clients
  └─→ client_debts (client_id)
  └─→ client_transactions_kes (client_id)
  └─→ client_transactions_usd (client_id)
  └─→ vehicles (client_id)
  └─→ client_documents (client_id)

client_debts
  └─→ debt_payments (debt_id)
```

## Common Queries

### Get all overdue debts for a user:

```sql
SELECT * FROM overdue_debts WHERE user_id = 'user-uuid';
```

### Get upcoming debts for a user:

```sql
SELECT * FROM upcoming_debts WHERE user_id = 'user-uuid';
```

### Get client with total debt:

```sql
SELECT
  c.*,
  COALESCE(SUM(d.balance), 0) as total_debt
FROM clients c
LEFT JOIN client_debts d ON c.id = d.client_id AND d.status != 'paid'
WHERE c.user_id = 'user-uuid'
GROUP BY c.id;
```

### Get debt payment history:

```sql
SELECT
  dp.*,
  d.description as debt_description,
  c.client_name,
  s.full_name as recorded_by_name
FROM debt_payments dp
JOIN client_debts d ON dp.debt_id = d.id
JOIN clients c ON d.client_id = c.id
LEFT JOIN staff s ON dp.recorded_by = s.id
WHERE dp.user_id = 'user-uuid'
ORDER BY dp.payment_date DESC;
```

## Migration Notes

- Old schema backed up as `001_create_cms_schema_old.sql`
- New schema at `001_create_cms_schema.sql`
- Run migration via Supabase Dashboard or CLI
- Create staff records after migration
- Test with sample data before production use

## Enum Values Reference

```sql
staff.role:
  - admin
  - manager
  - staff
  - accountant

clients.status:
  - active
  - inactive

client_debts.status:
  - pending
  - overdue
  - paid
  - cancelled

client_debts.priority:
  - low
  - normal
  - high
  - urgent

client_debts.currency:
  - KES
  - USD

payment_method (all transaction tables):
  - cash
  - bank_transfer
  - mpesa
  - card
  - other

transaction_type:
  - invoice
  - payment
  - refund
  - other

payment_status:
  - pending
  - completed
  - failed

document_type:
  - contract
  - invoice
  - receipt
  - id
  - other

vehicles.status:
  - active
  - inactive
  - sold
```
