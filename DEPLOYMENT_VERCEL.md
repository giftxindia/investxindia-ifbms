# Investxindia IFBMS — Vercel & Supabase Production Deployment Guide

This document outlines the exact, step-by-step procedures for deploying the **Investxindia Financial Business Management System (IFBMS)** to Vercel with a live Supabase PostgreSQL backend.

---

## 1. Vercel Project Configuration

### Build & Output Settings
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build` (or `vite build`)
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: `20.x` or higher

### Single Page Application (SPA) Routing & Headers
The project includes a root `vercel.json` file that automatically configures client-side routing rewrites and security headers:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

## 2. Environment Variables Configuration

In your **Vercel Project Settings > Environment Variables**, add the following variables for the `Production`, `Preview`, and `Development` environments:

| Variable Name | Required | Target | Description & Value Format |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Client-Safe (Browser) | Your Supabase project URL (e.g. `https://xyzproject.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Client-Safe (Browser) | Your Supabase public anonymous key (`anon` key starting with `eyJ...`) |
| `GEMINI_API_KEY` | Optional | Server / AI Studio | Injected by AI Studio if using generative AI features |

### ⚠️ Critical Security Rules:
1. **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` in Vercel environment variables or prefix them with `VITE_`.
2. All client queries to Supabase utilize `VITE_SUPABASE_ANON_KEY` and are strictly governed by PostgreSQL Row Level Security (RLS).
3. If privileged backend operations are ever required (e.g. automated cron settlements), execute them via secure serverless functions (e.g. Supabase Edge Functions or an Express proxy), never in client bundle code.

---

## 3. Supabase Database Setup & Migration

### Step 1: Execute Schema Migration
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your target Supabase project.
3. In the left navigation, select **SQL Editor** > **New Query**.
4. Open the file `supabase/migrations/20261022_ifbms_schema.sql` from this repository.
5. Copy the entire contents, paste it into the SQL Editor, and click **Run**.
6. Verify that all 17 tables and RLS security policies are created:
   - `profiles`, `sub_brokers`, `clients`, `providers`
   - `health_policies`, `motor_policies`, `life_policies`, `fixed_deposits`, `bonds`, `loans`
   - `brokerage_rules`, `brokerage_entries`, `payouts`
   - `targets`, `documents`, `import_jobs`, `audit_logs`

### Step 2: Configure Supabase Authentication
1. Go to **Authentication > Providers** in the Supabase Dashboard.
2. Enable **Email / Password** provider.
3. (Recommended for production): Configure email confirmation templates or disable email confirmation if immediate onboarding is required.
4. Set Site URL to your Vercel deployment URL (e.g. `https://investxindia-ifbms.vercel.app`).
5. Add your Vercel URL and preview URLs to **Redirect URLs**:
   - `https://investxindia-ifbms.vercel.app/**`
   - `http://localhost:3000/**`

### Step 3: Provision First Super Admin
To establish the first administrative account:
1. In the Supabase SQL Editor, run:
```sql
SELECT public.provision_first_admin(
    'info.investxindia@gmail.com',
    'Rajiv Malhotra (Executive Super Admin)'
);
```
2. Have the Super Admin register or log in using `info.investxindia@gmail.com`. The trigger will automatically assign them the `super_admin` role with full system privileges.

---

## 4. Post-Deployment Verification (Smoke Tests)

After deploying to Vercel, perform these validation checks:

1. **Environment Status Badge**:
   - Confirm that the top navigation header displays **"● Live Supabase"** in green instead of "Sandbox Demo".
2. **Supabase Connectivity**:
   - Click the **Supabase Setup** button in the top navigation and click **"Test Connection"**. Ensure all 4 checkmarks (URL, Anon Key, Profiles Table, RLS Active) turn green.
3. **Authentication & Session**:
   - Log in using Super Admin credentials. Confirm the profile avatar and name update accurately in the top right menu.
   - Test logout and verify clean session invalidation.
4. **CRUD Operations**:
   - Create a test Client, Health Insurance Policy, Fixed Deposit, and Loan.
   - Confirm that the records persist upon page reload.
5. **Multi-Tenant Isolation**:
   - Log in or switch to a Sub-Broker account (e.g. `IX-SB-101`).
   - Confirm that other sub-brokers' clients, policies, transactions, and documents are inaccessible.
6. **Excel Import & Deduplication**:
   - Download the template for any module (e.g. Health Insurance), enter test rows, and import via the Excel Center.
   - Confirm that duplicate primary keys are rejected with clear error reports.
7. **Document Vault**:
   - Upload a test PDF document. Generate a 15-minute signed URL and confirm token verification.
