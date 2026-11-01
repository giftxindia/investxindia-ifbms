# Investxindia IFBMS — Production Deployment & Operations Guide

This document outlines the step-by-step protocol for provisioning, securing, and deploying the **Investxindia Financial Business Management System (IFBMS)** to production on **Vercel** backed by **Supabase PostgreSQL**.

---

## 1. System Architecture Overview

- **Frontend Application**: React 19 SPA built on Vite, Tailwind CSS, TypeScript, and Lucide React.
- **Backend Database**: Supabase (PostgreSQL 15+) with Row Level Security (RLS) across all 17 tables, enforcing strict tenant isolation between corporate staff and independent sub-brokers (channel partners).
- **Storage Vault**: Supabase Storage (`private-documents` bucket) utilizing cryptographic HMAC-signed time-limited URLs (15-minute TTL) and client-side SHA-256 integrity checksums.
- **Financial Brokerage Engine**: Multi-product commission calculator supporting percentage, fixed fee, and slab structures across Health Insurance, Motor Insurance, Life Insurance, Fixed Deposits, Capital Gains Bonds (Section 54EC), and Loans. Enforces statutory Section 194H 5% TDS deduction.
- **Audit & Governance**: Tamper-proof append-only audit trail logging user perspectives, IP origins, rule revisions, and payout approvals.

---

## 2. Supabase Database Migration & RLS Setup

### Prerequisites
1. Create a production project in the [Supabase Dashboard](https://supabase.com).
2. Note your **Project URL** (`https://<project-ref>.supabase.co`) and **Anon Key** from `Project Settings > API`.

### Executing Migrations
The repository includes a comprehensive, battle-tested migration script covering all 17 tables, enumerations, triggers, helper functions, and RLS policies:
- Migration script path: `/supabase/migrations/20261022_ifbms_schema.sql`
- RLS validation suite: `/supabase/tests/rls_tests.sql`

#### Option A: Supabase SQL Editor (Recommended for Fast Deployment)
1. In the Supabase Dashboard, navigate to **SQL Editor > New Query**.
2. Copy and paste the entire contents of `/supabase/migrations/20261022_ifbms_schema.sql`.
3. Click **Run**.
4. Verify all tables are created under **Table Editor**:
   - `clients`, `sub_brokers`, `user_profiles`
   - `health_insurance_policies`, `motor_insurance_policies`, `life_insurance_policies`
   - `fixed_deposits`, `bonds`, `loan_applications`
   - `brokerage_rules`, `brokerage_rule_slabs`, `brokerage_transactions`, `partner_payouts`
   - `business_targets`, `documents`, `import_jobs`, `tasks`, `audit_logs`

#### Option B: Supabase CLI
```bash
# Link your local project to Supabase
npx supabase link --project-ref <your-project-ref>

# Push the migration
npx supabase db push
```

### Storage Bucket Configuration
1. In the Supabase Dashboard, navigate to **Storage**.
2. Create a new bucket named: `private-documents`
3. Toggle **Public Bucket** to **OFF** (Private).
4. Apply the private document security policy so only authenticated users with valid signed tokens can read objects.

---

## 3. Vercel Deployment Instructions

### Project Configuration
1. Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Import the Investxindia IFBMS repository.
3. Configure the Build & Development Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Environment Variables
Configure the following environment variables in the Vercel Project Settings (**Settings > Environment Variables**):

| Variable Name | Environment | Description | Example / Value |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Production, Preview | Supabase Project URL | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | Supabase Anon Public Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

*(Note: Never expose the Supabase `service_role` secret to client environment variables).*

### SPA Routing & Security Headers (`vercel.json`)
The repository contains `/vercel.json` which guarantees:
1. All client-side SPA routes (e.g., `/clients`, `/brokerage_register`, `/documents`) rewrite to `/index.html`.
2. Enterprise HTTP security headers are sent on all responses:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 4. Custom Domain & DNS Configuration

To point your official corporate domain (e.g., `app.investxindia.com` or `crm.investxindia.com`) to Vercel:

1. In Vercel, navigate to **Project Settings > Domains**.
2. Enter your custom domain name (e.g., `crm.investxindia.com`).
3. Log in to your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.) and add the record:
   - **Type**: `CNAME`
   - **Name / Host**: `crm`
   - **Value / Target**: `cname.vercel-dns.com`
   - **TTL**: `Automatic` or `300 seconds`
4. For apex domain (`investxindia.com`):
   - **Type**: `A`
   - **Name / Host**: `@`
   - **Value / Target**: `76.76.21.21`
5. Vercel will automatically provision a free Let's Encrypt SSL/TLS certificate once DNS propagation completes (~5–15 minutes).

---

## 5. Production Environment & Security Checklist

Before greenlighting the system for live advisor and partner usage:

- [ ] **Tenant Isolation Enforced**:
  - Sub-brokers can only query and export records where `sub_broker_id` matches their own ARN profile (`IX-SB-101`).
  - Cross-tenant lookups via Quick Search (Ctrl+K) suppress competing partner names and records.
  - Sub-Brokers directory page displays an explicit "Access Restricted" screen when accessed by channel partners.
- [ ] **Privilege Escalation Defended**:
  - Non-super-admin users cannot alter brokerage rules, change commission slabs, authorize payout batches, or approve ledger adjustments.
  - User Management and Audit Trail routes are strictly blocked for non-super-admins.
- [ ] **Financial Brokerage Integrity**:
  - Slab calculations, TDS Section 194H (5%), and net payout formulas match statutory guidelines.
  - Duplicate transaction imports and duplicate payout batches are rejected.
- [ ] **Document Vault Security**:
  - Documents stored as private objects.
  - Signed URLs strictly enforce 15-minute expiration timestamp and cryptographic HMAC tokens.
  - Expired tokens fail with `EXPIRED_OR_TAMPERED_TOKEN` error.
- [ ] **Disaster Recovery & Backup Readiness**:
  - Database snapshot generator verified in `Settings > Database Backup & Disaster Recovery`.
  - JSON snapshots include SHA-256 integrity checksums.
  - Restore operations require Super Admin role confirmation.

---

## 6. Post-Deployment Smoke Test Protocol

Run this protocol on the live production URL immediately following deployment:

| Step # | Test Target | Action | Expected Pass Criteria |
|---|---|---|---|
| **1** | System Initialization | Access `https://crm.investxindia.com/` | App loads within 1.5s with zero console errors. TopNav displays `IFBMS / Executive Dashboard`. |
| **2** | Production Audit Suite | Click `Production Audit` in TopNav | All 14 security test cases run and pass (100% green status). Click `Export Audit Report` to verify Excel generation. |
| **3** | Brokerage Calculation Engine | Click `Verify Engine` in TopNav | Runs and passes 11 unit tests verifying slabs, TDS 5%, and rule evaluations. |
| **4** | Import & Vault Engine | Click `Verify Import & Vault` in TopNav | Runs and passes 12 unit tests verifying Excel schema validation, duplicate detection, and signed URL expiry. |
| **5** | Sub-Broker Tenant Isolation | Switch perspective to `Vikram Joshi (Apex Wealth)` | Verify that: <br>a) TopNav hides `Production Audit` and `User Management`. <br>b) Sub-Brokers sidebar item is absent. Navigating to it shows Access Restricted screen. <br>c) Clients directory displays only 3 assigned clients (`Harish`, `Rajesh`, `Shalini`). <br>d) Brokerage Register displays only sub-broker payout columns; company margins are hidden. |
| **6** | Global Search Privacy | Press `Ctrl+K` as Sub-Broker and search "Kunal" | Returns 0 matching records (does not leak other partners or their clients). Search "Harish" returns client record. |
| **7** | Document Signed URL Vault | Go to `Documents Vault` > Click Key icon on any document | Signed URL is generated with 15-minute validity. Click "Test Verification" to confirm token validity. Click "Simulate Expired Token" to confirm rejection. |
| **8** | Database Snapshot Backup | Go to `System Settings` > Click `Download Database Snapshot (.json)` | Browser downloads `Investxindia_IFBMS_Full_Backup_<timestamp>.json` with complete data and SHA-256 checksum. |

---

## 7. Disaster Recovery & Backup Restoration

### Generating Backups
Super Admins should schedule periodic snapshot exports before major financial reconciliations:
1. Navigate to **System Settings > Database Backup, Snapshot Export & Disaster Recovery**.
2. Click **Download Database Snapshot (.json)**.
3. Store the downloaded archive in your company's secure cold storage or Google Drive.

### Restoring from Backup
In the event of an accidental deletion or corrupted batch import:
1. Navigate to **System Settings > Database Backup, Snapshot Export & Disaster Recovery**.
2. Click **Restore Database From Backup** (visible only to Super Admin).
3. Select the verified `.json` backup file.
4. The system validates the header, checks the payload structure and SHA-256 checksum, logs a `DATABASE_RESTORE_EXECUTED` event to the audit trail, and restores all records.

---

*Investxindia Corporate Distribution Pvt. Ltd. · Technical Operations & Regulatory Compliance*
