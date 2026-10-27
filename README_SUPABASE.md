# Investxindia Financial Business Management System (IFBMS)
## Stage 2: Supabase Production Foundation & Database Architecture

This document contains instructions to connect the IFBMS application with a production **Supabase** instance (PostgreSQL, Supabase Auth, and Row Level Security).

---

### 1. Required Environment Variables

Populate these variables in your deployment environment (e.g. Vercel, Cloud Run, or `.env`):

```bash
# ==============================================================================
# CLIENT-SAFE ENVIRONMENT VARIABLES (Safe for Vite browser bundle)
# ==============================================================================
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ==============================================================================
# SERVER-ONLY PRIVILEGED KEYS (NEVER expose to browser client code)
# ==============================================================================
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
INITIAL_SUPER_ADMIN_EMAIL="info.investxindia@gmail.com"
INITIAL_SUPER_ADMIN_PASSWORD="YourSecurePassword123!"
```

---

### 2. Database Schema (17 Production Tables)

The complete SQL migration script is located at:
- `supabase/migrations/20261022_ifbms_schema.sql` (and mirrored at `src/db/supabase-migration.sql`).

#### Tables Created:
1. `profiles`: Linked to `auth.users(id)` with `role` (`super_admin`, `staff`, `sub_broker`).
2. `sub_brokers`: Distributor records with AMFI/RERA licensing, commission split %, and bank info.
3. `clients`: Client CRM records linked to sub-brokers with masked PAN and KYC status.
4. `providers`: Configurable financial institutions (Star Health, ICICI Lombard, LIC, Bajaj Finance, etc.).
5. `health_policies`: Health insurance policies with sum insured, premium, and renewal countdowns.
6. `motor_policies`: Vehicle registration, IDV amount, OD/TP net & gross premiums.
7. `life_policies`: Term insurance, guaranteed return, sum assured, and payment terms.
8. `fixed_deposits`: Corporate & bank FDs with interest rate, tenure, and maturity amount.
9. `bonds`: Section 54EC capital gains bonds & corporate NCDs with ISIN tracking.
10. `loans`: Lending pipeline (login submitted $\rightarrow$ underwriting $\rightarrow$ sanctioned $\rightarrow$ disbursed).
11. `brokerage_rules`: Versioned commission formulas with slabs, flat fee, and Section 194H TDS.
12. `brokerage_entries`: Transaction ledger with calculation snapshots and reconciliation status.
13. `payouts`: Batch payout releases with gross payable, TDS deduction, and bank UTR numbers.
14. `targets`: Monthly/quarterly sales volume targets vs achievements.
15. `documents`: Document repository with entity links and verification flags.
16. `import_jobs`: Tracking for batch Excel workbook import operations.
17. `audit_logs`: Immutable, append-only security and regulatory audit trail.

---

### 3. Row Level Security (RLS) & Security Functions

All 17 tables have **Row Level Security (RLS) enabled**.

#### Key Security Controls:
1. **Helper Functions**:
   - `public.current_user_role()`: `SECURITY DEFINER` function returning the caller's verified role from `profiles`.
   - `public.current_sub_broker_id()`: `SECURITY DEFINER` function returning the caller's linked `sub_brokers.id`.
2. **Role Self-Elevation Prevention**:
   - The trigger `trg_prevent_role_elevation` on `profiles` blocks any user from altering `role` unless `public.current_user_role() = 'super_admin'`.
3. **Sub-Broker Isolation**:
   - Channel partners can ONLY query and insert rows where `sub_broker_id = public.current_sub_broker_id()`. Cross-partner viewing is rejected at the database level.
4. **Audit Trail Immutability**:
   - `audit_logs` has zero `UPDATE` or `DELETE` grants. Regular users and staff can never alter historical audit records.

---

### 4. First Super Admin Provisioning

Privilege escalation cannot be performed from client code. Use one of these trusted server-side procedures:

#### Method A: Command-Line Interface (CLI Script)
Run the provisioning script using `tsx` (reads `SUPABASE_SERVICE_ROLE_KEY`):
```bash
npx tsx scripts/provision-admin.ts info.investxindia@gmail.com "YourPassword123!" "Rajiv Malhotra"
```

#### Method B: Supabase SQL Function
1. Sign up a user account via the Supabase Auth dialog in the app.
2. In the Supabase SQL Editor, run:
```sql
SELECT public.provision_first_admin(
    'info.investxindia@gmail.com',
    'Rajiv Malhotra (Executive Super Admin)'
);
```

---

### 5. Running Automated RLS Verification Tests

Run the test suite in the Supabase SQL Editor:
```sql
\i supabase/tests/rls_tests.sql
```
This tests:
- Table RLS enablement across all 17 tables.
- `SECURITY DEFINER` attributes on security functions.
- Role self-elevation rejection trigger.
- Sub-broker data isolation policies.
- Audit log immutability.
