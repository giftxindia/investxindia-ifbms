-- ============================================================================
-- INVESTXINDIA FINANCIAL BUSINESS MANAGEMENT SYSTEM (IFBMS)
-- Production Supabase PostgreSQL Schema & Security Architecture
-- Migration: 20261103_ifbms_schema.sql (Phase 2.3 Hardened)
-- Target Project ID: nasyrcuicuvtqjbnuvsi
-- Initial Super Admin: Rahul Pandey (info.investxindia@gmail.com)
--
-- ATOMIC TRANSACTION:
-- Wrapped in BEGIN ... COMMIT. If any statement encounters an error, the
-- entire migration rolls back automatically, preventing partial schema state.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. ENUMS & DOMAIN TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'staff', 'sub_broker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_category AS ENUM (
        'Health Insurance',
        'Motor Insurance',
        'Life Insurance',
        'Fixed Deposits',
        'Bonds',
        'Loans'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE policy_status AS ENUM (
        'active',
        'grace_period',
        'lapsed',
        'renewed',
        'expired',
        'in_force',
        'paid_up',
        'matured'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM (
        'pending_approval',
        'processing',
        'completed',
        'on_hold'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entry_status AS ENUM (
        'expected',
        'received',
        'approved',
        'paid',
        'reconciled',
        'disputed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 3. SYSTEM BOOTSTRAP STATE (PERMANENT ONE-TIME FIRST ADMIN LOCK)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_bootstrap (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_first_admin_provisioned BOOLEAN NOT NULL DEFAULT FALSE,
    provisioned_admin_email TEXT,
    provisioned_admin_id UUID,
    provisioned_at TIMESTAMPTZ,
    lock_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed single row if missing
INSERT INTO public.system_bootstrap (id, is_first_admin_provisioned)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Trigger to permanently guard bootstrap record from tampering or reset
CREATE OR REPLACE FUNCTION public.guard_system_bootstrap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Security Policy Violation: system_bootstrap record cannot be deleted under any circumstances.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Once provisioned, no modification to ANY column is permitted
        IF OLD.is_first_admin_provisioned = TRUE THEN
            RAISE EXCEPTION 'Security Policy Violation: system_bootstrap record is permanently locked and immutable.';
        END IF;

        -- Even before provisioning, only the database owner can update
        IF session_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Security Policy Violation: Only the database owner can configure system_bootstrap.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_system_bootstrap ON public.system_bootstrap;
CREATE TRIGGER trg_guard_system_bootstrap
    BEFORE UPDATE OR DELETE ON public.system_bootstrap
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_system_bootstrap();

-- ----------------------------------------------------------------------------
-- 4. PROFILES TABLE (Linked 1:1 with auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'staff',
    staff_department TEXT,
    sub_broker_code TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. SUB-BROKERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sub_brokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sub_broker_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pan_masked TEXT NOT NULL,
    amfi_or_rera_no TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'Standard' CHECK (tier IN ('Standard', 'Silver', 'Gold', 'Platinum')),
    default_payout_share_pct NUMERIC(5,2) NOT NULL DEFAULT 70.00 CHECK (default_payout_share_pct >= 0 AND default_payout_share_pct <= 100),
    bank_account_masked TEXT NOT NULL,
    bank_ifsc TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. CLIENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    mobile TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pan_masked TEXT,
    gst_no TEXT,
    assigned_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    total_portfolio_value NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (total_portfolio_value >= 0),
    kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('verified', 'pending', 'rejected')),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. PROVIDERS TABLE (Financial Institutions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Insurance', 'Banking / NBFC', 'Investment / AMC')),
    products_offered TEXT[] DEFAULT ARRAY[]::TEXT[],
    portal_url TEXT,
    helpline TEXT,
    commission_cycle TEXT NOT NULL DEFAULT 'Monthly',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. HEALTH POLICIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    sum_insured NUMERIC(14,2) NOT NULL CHECK (sum_insured >= 0),
    premium_gross NUMERIC(12,2) NOT NULL CHECK (premium_gross >= 0),
    premium_net NUMERIC(12,2) NOT NULL CHECK (premium_net >= 0),
    gst_amount NUMERIC(12,2) NOT NULL CHECK (gst_amount >= 0),
    policy_term_years INTEGER NOT NULL DEFAULT 1 CHECK (policy_term_years > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status policy_status NOT NULL DEFAULT 'active',
    portability_flag BOOLEAN NOT NULL DEFAULT FALSE,
    previous_insurer TEXT,
    tpa_name TEXT,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (commission_rate >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_health_dates CHECK (end_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- 9. MOTOR POLICIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.motor_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    vehicle_reg_no TEXT NOT NULL,
    vehicle_class TEXT NOT NULL CHECK (vehicle_class IN ('Private Car', 'Two Wheeler', 'Commercial Vehicle', 'Passenger Carrying')),
    make_model TEXT NOT NULL,
    idv NUMERIC(12,2) NOT NULL CHECK (idv >= 0),
    od_premium NUMERIC(12,2) NOT NULL CHECK (od_premium >= 0),
    tp_premium NUMERIC(12,2) NOT NULL CHECK (tp_premium >= 0),
    gst_amount NUMERIC(12,2) NOT NULL CHECK (gst_amount >= 0),
    net_premium NUMERIC(12,2) NOT NULL CHECK (net_premium >= 0),
    gross_premium NUMERIC(12,2) NOT NULL CHECK (gross_premium >= 0),
    ncb_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (ncb_pct >= 0 AND ncb_pct <= 100),
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status policy_status NOT NULL DEFAULT 'active',
    policy_type TEXT NOT NULL CHECK (policy_type IN ('Comprehensive', 'Third Party', 'Standalone OD', 'Bundled')),
    fuel_type TEXT NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (commission_rate >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_motor_dates CHECK (expiry_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- 10. LIFE POLICIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.life_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    sum_assured NUMERIC(14,2) NOT NULL CHECK (sum_assured >= 0),
    annualized_premium NUMERIC(12,2) NOT NULL CHECK (annualized_premium >= 0),
    premium_paying_term INTEGER NOT NULL CHECK (premium_paying_term > 0),
    policy_term INTEGER NOT NULL CHECK (policy_term >= premium_paying_term),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Annual', 'Semi-Annual', 'Quarterly', 'Monthly', 'Single')),
    start_date DATE NOT NULL,
    next_due_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status policy_status NOT NULL DEFAULT 'in_force',
    nominee_name TEXT NOT NULL,
    nominee_relation TEXT NOT NULL,
    first_year_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 25.00 CHECK (first_year_commission_pct >= 0),
    renewal_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (renewal_commission_pct >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. FIXED DEPOSITS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixed_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fd_receipt_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    fdr_type TEXT NOT NULL CHECK (fdr_type IN ('Cumulative', 'Non-Cumulative')),
    deposit_amount NUMERIC(14,2) NOT NULL CHECK (deposit_amount > 0),
    interest_rate NUMERIC(5,2) NOT NULL CHECK (interest_rate > 0),
    tenure_months INTEGER NOT NULL CHECK (tenure_months > 0),
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    maturity_amount NUMERIC(14,2) NOT NULL CHECK (maturity_amount >= deposit_amount),
    interest_payout_frequency TEXT NOT NULL DEFAULT 'At Maturity',
    crisil_rating TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'prematurely_closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fd_dates CHECK (maturity_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- 12. BONDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isin TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    issuer_name TEXT NOT NULL,
    bond_type TEXT NOT NULL CHECK (bond_type IN ('Sovereign Gold', 'Tax-Free', 'Corporate NCD', 'RBI Floating', 'Capital Gain 54EC')),
    face_value NUMERIC(12,2) NOT NULL CHECK (face_value > 0),
    units INTEGER NOT NULL CHECK (units > 0),
    investment_amount NUMERIC(14,2) NOT NULL CHECK (investment_amount > 0),
    coupon_rate NUMERIC(5,2) NOT NULL CHECK (coupon_rate >= 0),
    yield_to_maturity NUMERIC(5,2) NOT NULL CHECK (yield_to_maturity >= 0),
    interest_payment_frequency TEXT NOT NULL DEFAULT 'Annual',
    allotment_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    credit_rating TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'called_back')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_bond_dates CHECK (maturity_date >= allotment_date)
);

-- ----------------------------------------------------------------------------
-- 13. LOANS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    lender_name TEXT NOT NULL,
    loan_type TEXT NOT NULL CHECK (loan_type IN ('Home Loan', 'LAP', 'Business Loan', 'Personal Loan', 'Working Capital', 'Machinery Loan')),
    sanctioned_amount NUMERIC(14,2) NOT NULL CHECK (sanctioned_amount >= 0),
    disbursed_amount NUMERIC(14,2) NOT NULL CHECK (disbursed_amount >= 0),
    roi NUMERIC(5,2) NOT NULL CHECK (roi > 0),
    tenure_years INTEGER NOT NULL CHECK (tenure_years > 0),
    emi_amount NUMERIC(12,2) NOT NULL CHECK (emi_amount >= 0),
    sanction_date DATE,
    disbursement_date DATE,
    status TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('logged', 'in_process', 'sanctioned', 'partially_disbursed', 'fully_disbursed', 'rejected')),
    payout_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0.50 CHECK (payout_rate_pct >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 14. BROKERAGE RULES TABLE (Commission Master)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brokerage_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code TEXT NOT NULL,
    product_category product_category NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'Fresh' CHECK (transaction_type IN ('Fresh', 'Renewal', 'Portability', 'Enhancement', 'Disbursement')),
    partner_tier TEXT NOT NULL DEFAULT 'Standard' CHECK (partner_tier IN ('Standard', 'Silver', 'Gold', 'Platinum')),
    company_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (company_commission_pct >= 0 AND company_commission_pct <= 100),
    company_flat_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (company_flat_inr >= 0),
    sub_broker_share_pct NUMERIC(5,2) NOT NULL DEFAULT 70.00 CHECK (sub_broker_share_pct >= 0 AND sub_broker_share_pct <= 100),
    sub_broker_flat_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (sub_broker_flat_inr >= 0),
    min_slab_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (min_slab_amount >= 0),
    max_slab_amount NUMERIC(12,2),
    tds_deduction_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tds_deduction_pct >= 0 AND tds_deduction_pct <= 100),
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 15. PAYOUTS TABLE (Sub-broker Payout Batches)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_no TEXT UNIQUE NOT NULL,
    sub_broker_id UUID NOT NULL REFERENCES public.sub_brokers(id) ON DELETE RESTRICT,
    sub_broker_name TEXT NOT NULL,
    period TEXT NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 2020),
    transaction_count INTEGER NOT NULL DEFAULT 0 CHECK (transaction_count >= 0),
    gross_commission NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (gross_commission >= 0),
    gross_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (gross_payable >= 0),
    tds_deducted NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tds_deducted >= 0),
    net_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (net_payable >= 0),
    net_disbursed NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (net_disbursed >= 0),
    payment_mode TEXT DEFAULT 'NEFT/RTGS',
    bank_reference_no TEXT,
    disbursement_date TIMESTAMPTZ,
    status payout_status NOT NULL DEFAULT 'pending_approval',
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_partner_period
ON public.payouts (sub_broker_id, period, year)
WHERE status <> 'on_hold';

-- ----------------------------------------------------------------------------
-- 16. BROKERAGE ENTRIES TABLE (Transaction Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brokerage_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_no TEXT UNIQUE NOT NULL,
    policy_id UUID,
    product_type TEXT NOT NULL,
    reference_no TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    provider_code TEXT NOT NULL,
    gross_business_value NUMERIC(14,2) NOT NULL CHECK (gross_business_value >= 0),
    company_commission_expected NUMERIC(12,2) NOT NULL CHECK (company_commission_expected >= 0),
    company_commission_received NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (company_commission_received >= 0),
    sub_broker_share_pct NUMERIC(5,2) NOT NULL DEFAULT 70.00 CHECK (sub_broker_share_pct >= 0 AND sub_broker_share_pct <= 100),
    sub_broker_gross_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sub_broker_gross_payable >= 0),
    tds_deducted NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tds_deducted >= 0),
    sub_broker_net_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sub_broker_net_payable >= 0),
    investxindia_retained NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (investxindia_retained >= 0),
    status entry_status NOT NULL DEFAULT 'expected',
    receipt_date DATE,
    payment_ref_no TEXT,
    rule_version_applied UUID REFERENCES public.brokerage_rules(id) ON DELETE SET NULL,
    payout_batch_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL,
    reconciled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reconciled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 17. TARGETS TABLE (Performance Goals)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('staff', 'sub_broker', 'department')),
    entity_id UUID NOT NULL,
    product_category TEXT NOT NULL,
    period TEXT NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 2020),
    target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount >= 0),
    achieved_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (achieved_amount >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'missed', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 18. DOCUMENTS TABLE (Enterprise Document Vault)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
    file_url TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Policy Schedule',
        'Proposal Form',
        'RC Copy',
        'KYC - PAN Card',
        'KYC - Aadhaar',
        'Client Form 16',
        'Sub-Broker Agreement',
        'AMFI Certificate',
        'RERA License',
        'Commission Statement',
        'Bank Mandate',
        'Claim Document',
        'Medical Report',
        'Endorsement Copy',
        'Other'
    )),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE CASCADE,
    policy_id UUID,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 19. IMPORT JOBS TABLE (Batch Data Engine)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN ('clients', 'health_policies', 'motor_policies', 'life_policies', 'sub_brokers', 'brokerage_rules', 'brokerage_entries')),
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back')),
    total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    imported_rows INTEGER NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
    failed_rows INTEGER NOT NULL DEFAULT 0 CHECK (failed_rows >= 0),
    skipped_rows INTEGER NOT NULL DEFAULT 0 CHECK (skipped_rows >= 0),
    error_summary TEXT[] DEFAULT ARRAY[]::TEXT[],
    row_errors JSONB DEFAULT '[]'::JSONB,
    initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 20. AUDIT LOGS TABLE (Immutable Compliance Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 21. PERFORMANCE & RLS FILTER INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON public.profiles(role, is_active);
CREATE INDEX IF NOT EXISTS idx_sub_brokers_user_id ON public.sub_brokers(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_brokers_code ON public.sub_brokers(sub_broker_code);
CREATE INDEX IF NOT EXISTS idx_clients_sub_broker_id ON public.clients(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_clients_staff_id ON public.clients(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_health_client_id ON public.health_policies(client_id);
CREATE INDEX IF NOT EXISTS idx_health_sub_broker_id ON public.health_policies(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_motor_client_id ON public.motor_policies(client_id);
CREATE INDEX IF NOT EXISTS idx_motor_sub_broker_id ON public.motor_policies(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_life_client_id ON public.life_policies(client_id);
CREATE INDEX IF NOT EXISTS idx_life_sub_broker_id ON public.life_policies(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_fd_client_id ON public.fixed_deposits(client_id);
CREATE INDEX IF NOT EXISTS idx_fd_sub_broker_id ON public.fixed_deposits(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_bonds_client_id ON public.bonds(client_id);
CREATE INDEX IF NOT EXISTS idx_bonds_sub_broker_id ON public.bonds(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_loans_client_id ON public.loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_sub_broker_id ON public.loans(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_rules_provider ON public.brokerage_rules(provider_code, product_category, partner_tier);
CREATE INDEX IF NOT EXISTS idx_entries_sub_broker_id ON public.brokerage_entries(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_entries_client_id ON public.brokerage_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_entries_payout_batch ON public.brokerage_entries(payout_batch_id);
CREATE INDEX IF NOT EXISTS idx_payouts_sub_broker_id ON public.payouts(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_targets_entity ON public.targets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_sub_broker_id ON public.documents(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_confidential ON public.documents(is_confidential);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 22. SECURITY HELPER FUNCTIONS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'super_admin'
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'staff'
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.is_sub_broker()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'sub_broker'
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.current_sub_broker_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT sb.id
    FROM public.sub_brokers sb
    WHERE sb.user_id = auth.uid()
       OR (
           sb.sub_broker_code = (
               SELECT p.sub_broker_code
               FROM public.profiles p
               WHERE p.id = auth.uid()
                 AND p.role = 'sub_broker'
                 AND p.is_active = TRUE
           )
           AND sb.sub_broker_code IS NOT NULL
       )
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_sub_broker() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_sub_broker_id() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sub_broker() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_sub_broker_id() TO authenticated;

-- ----------------------------------------------------------------------------
-- 23. AUDIT PAYLOAD SANITIZER (PII & SENSITIVE FINANCIAL DATA MASKING)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanitize_audit_payload(
    table_name TEXT,
    raw_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    sanitized JSONB;
BEGIN
    IF raw_payload IS NULL THEN
        RETURN NULL;
    END IF;

    sanitized := raw_payload;

    -- Redact sensitive identification and payment numbers
    IF sanitized ? 'pan_masked' THEN
        sanitized := jsonb_set(sanitized, '{pan_masked}', '"[CONFIDENTIAL_PAN]"'::JSONB);
    END IF;
    IF sanitized ? 'bank_account_masked' THEN
        sanitized := jsonb_set(sanitized, '{bank_account_masked}', '"[CONFIDENTIAL_ACCOUNT]"'::JSONB);
    END IF;
    IF sanitized ? 'bank_ifsc' THEN
        sanitized := jsonb_set(sanitized, '{bank_ifsc}', '"[CONFIDENTIAL_IFSC]"'::JSONB);
    END IF;
    IF sanitized ? 'nominee_name' THEN
        sanitized := jsonb_set(sanitized, '{nominee_name}', '"[REDACTED_NOMINEE]"'::JSONB);
    END IF;
    IF sanitized ? 'nominee_relation' THEN
        sanitized := jsonb_set(sanitized, '{nominee_relation}', '"[REDACTED_RELATION]"'::JSONB);
    END IF;

    RETURN sanitized;
END;
$$;

-- ----------------------------------------------------------------------------
-- 24. INTERNAL AUDIT TRIGGER DISPATCHER (NO DIRECT USER CALLS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_table_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_uid UUID;
    prof RECORD;
    actor_id_val UUID := NULL;
    actor_role_val TEXT := 'system';
    actor_name_val TEXT := 'Database Engine';
    row_id_val TEXT;
    old_json JSONB := NULL;
    new_json JSONB := NULL;
BEGIN
    caller_uid := auth.uid();

    -- Determine trusted actor identity from authentication context
    IF caller_uid IS NOT NULL THEN
        SELECT id, role, full_name, is_active INTO prof
        FROM public.profiles
        WHERE id = caller_uid;

        IF FOUND THEN
            actor_id_val := prof.id;
            actor_role_val := prof.role::TEXT;
            actor_name_val := prof.full_name;
        ELSE
            actor_id_val := caller_uid;
            actor_role_val := 'authenticated';
            actor_name_val := 'Authenticated User';
        END IF;
    ELSE
        actor_id_val := NULL;
        actor_role_val := 'system';
        actor_name_val := 'Database Engine / Maintenance';
    END IF;

    IF TG_OP = 'DELETE' THEN
        row_id_val := OLD.id::TEXT;
        old_json := public.sanitize_audit_payload(TG_TABLE_NAME, to_jsonb(OLD));
    ELSIF TG_OP = 'UPDATE' THEN
        row_id_val := NEW.id::TEXT;
        old_json := public.sanitize_audit_payload(TG_TABLE_NAME, to_jsonb(OLD));
        new_json := public.sanitize_audit_payload(TG_TABLE_NAME, to_jsonb(NEW));
    ELSE
        row_id_val := NEW.id::TEXT;
        new_json := public.sanitize_audit_payload(TG_TABLE_NAME, to_jsonb(NEW));
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        actor_role,
        actor_name,
        action,
        entity,
        entity_id,
        old_data,
        new_data,
        created_at
    )
    VALUES (
        actor_id_val,
        actor_role_val,
        actor_name_val,
        TG_TABLE_NAME || '_' || TG_OP,
        TG_TABLE_NAME,
        row_id_val,
        old_json,
        new_json,
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_table_mutation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_sub_brokers ON public.sub_brokers;
CREATE TRIGGER trg_audit_sub_brokers AFTER INSERT OR UPDATE OR DELETE ON public.sub_brokers FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_clients ON public.clients;
CREATE TRIGGER trg_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_providers ON public.providers;
CREATE TRIGGER trg_audit_providers AFTER INSERT OR UPDATE OR DELETE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_health_policies ON public.health_policies;
CREATE TRIGGER trg_audit_health_policies AFTER INSERT OR UPDATE OR DELETE ON public.health_policies FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_motor_policies ON public.motor_policies;
CREATE TRIGGER trg_audit_motor_policies AFTER INSERT OR UPDATE OR DELETE ON public.motor_policies FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_life_policies ON public.life_policies;
CREATE TRIGGER trg_audit_life_policies AFTER INSERT OR UPDATE OR DELETE ON public.life_policies FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_fixed_deposits ON public.fixed_deposits;
CREATE TRIGGER trg_audit_fixed_deposits AFTER INSERT OR UPDATE OR DELETE ON public.fixed_deposits FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_bonds ON public.bonds;
CREATE TRIGGER trg_audit_bonds AFTER INSERT OR UPDATE OR DELETE ON public.bonds FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_loans ON public.loans;
CREATE TRIGGER trg_audit_loans AFTER INSERT OR UPDATE OR DELETE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_brokerage_rules ON public.brokerage_rules;
CREATE TRIGGER trg_audit_brokerage_rules AFTER INSERT OR UPDATE OR DELETE ON public.brokerage_rules FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_brokerage_entries ON public.brokerage_entries;
CREATE TRIGGER trg_audit_brokerage_entries AFTER INSERT OR UPDATE OR DELETE ON public.brokerage_entries FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_payouts ON public.payouts;
CREATE TRIGGER trg_audit_payouts AFTER INSERT OR UPDATE OR DELETE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_targets ON public.targets;
CREATE TRIGGER trg_audit_targets AFTER INSERT OR UPDATE OR DELETE ON public.targets FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_documents ON public.documents;
CREATE TRIGGER trg_audit_documents AFTER INSERT OR UPDATE OR DELETE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

DROP TRIGGER IF EXISTS trg_audit_import_jobs ON public.import_jobs;
CREATE TRIGGER trg_audit_import_jobs AFTER INSERT OR UPDATE OR DELETE ON public.import_jobs FOR EACH ROW EXECUTE FUNCTION public.audit_table_mutation();

-- ----------------------------------------------------------------------------
-- 25. PROFILE IMMUTABILITY & ELEVATION GUARD TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_uid UUID;
    caller_is_super_admin BOOLEAN := FALSE;
    jwt_claims TEXT;
    is_direct_sql_session BOOLEAN := FALSE;
BEGIN
    caller_uid := auth.uid();
    jwt_claims := current_setting('request.jwt.claims', true);

    is_direct_sql_session := (
        session_user IN ('postgres', 'supabase_admin')
        AND (jwt_claims IS NULL OR jwt_claims = '')
        AND caller_uid IS NULL
    );

    IF is_direct_sql_session THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    IF caller_uid IS NULL THEN
        RAISE EXCEPTION 'Security Policy Violation: Unauthenticated profile modifications are forbidden.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = caller_uid
          AND role = 'super_admin'
          AND is_active = TRUE
    ) INTO caller_is_super_admin;

    IF NOT caller_is_super_admin THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Security Policy Violation: You cannot modify user roles.';
        END IF;

        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Security Policy Violation: You cannot alter account activation status.';
        END IF;

        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Security Policy Violation: Account email cannot be modified via self-service.';
        END IF;

        IF NEW.staff_department IS DISTINCT FROM OLD.staff_department THEN
            RAISE EXCEPTION 'Security Policy Violation: Only administrators can assign staff departments.';
        END IF;

        IF NEW.sub_broker_code IS DISTINCT FROM OLD.sub_broker_code THEN
            RAISE EXCEPTION 'Security Policy Violation: Sub-broker association cannot be altered.';
        END IF;

        IF NEW.id <> caller_uid THEN
            RAISE EXCEPTION 'Security Policy Violation: You can only edit your own user profile.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_security ON public.profiles;
CREATE TRIGGER trg_guard_profile_security
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_profile_security();

-- ----------------------------------------------------------------------------
-- 26. STRICT CLIENT & POLICY OWNERSHIP CONSISTENCY TRIGGER (ALL 6 PRODUCTS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_policy_client_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    client_rec RECORD;
    caller_sub_id UUID;
BEGIN
    SELECT id, sub_broker_id INTO client_rec
    FROM public.clients
    WHERE id = NEW.client_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Integrity Policy Violation: Referenced client % does not exist.', NEW.client_id;
    END IF;

    -- Enforce sub_broker_id alignment across all operations (Admin, Staff, Sub-Broker)
    IF client_rec.sub_broker_id IS NOT NULL THEN
        IF NEW.sub_broker_id IS NULL THEN
            NEW.sub_broker_id := client_rec.sub_broker_id;
        ELSIF NEW.sub_broker_id <> client_rec.sub_broker_id THEN
            RAISE EXCEPTION 'Integrity Policy Violation: Policy sub_broker_id (%) conflicts with client owning partner (%).', NEW.sub_broker_id, client_rec.sub_broker_id;
        END IF;
    ELSE
        -- Direct house client: policy sub_broker_id MUST be NULL
        IF NEW.sub_broker_id IS NOT NULL THEN
            RAISE EXCEPTION 'Integrity Policy Violation: Client is a direct house account and cannot have an assigned sub-broker.';
        END IF;
    END IF;

    -- Sub-broker isolation check
    IF public.is_sub_broker() THEN
        caller_sub_id := public.current_sub_broker_id();

        IF caller_sub_id IS NULL THEN
            RAISE EXCEPTION 'Security Policy Violation: Authenticated user is not linked to an active sub-broker record.';
        END IF;

        IF client_rec.sub_broker_id IS NULL OR client_rec.sub_broker_id <> caller_sub_id THEN
            RAISE EXCEPTION 'Security Policy Violation: You can only manage policies for clients registered under your partner account.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_health_ownership ON public.health_policies;
CREATE TRIGGER trg_enforce_health_ownership BEFORE INSERT OR UPDATE ON public.health_policies FOR EACH ROW EXECUTE FUNCTION public.enforce_policy_client_ownership();

DROP TRIGGER IF EXISTS trg_enforce_motor_ownership ON public.motor_policies;
CREATE TRIGGER trg_enforce_motor_ownership BEFORE INSERT OR UPDATE ON public.motor_policies FOR EACH ROW EXECUTE FUNCTION public.enforce_policy_client_ownership();

DROP TRIGGER IF EXISTS trg_enforce_life_ownership ON public.life_policies;
CREATE TRIGGER trg_enforce_life_ownership BEFORE INSERT OR UPDATE ON public.life_policies FOR EACH ROW EXECUTE FUNCTION public.enforce_policy_client_ownership();

DROP TRIGGER IF EXISTS trg_enforce_fd_ownership ON public.fixed_deposits;
CREATE TRIGGER trg_enforce_fd_ownership BEFORE INSERT OR UPDATE ON public.fixed_deposits FOR EACH ROW EXECUTE FUNCTION public.enforce_policy_client_ownership();

DROP TRIGGER IF EXISTS trg_enforce_bonds_ownership ON public.bonds;
CREATE TRIGGER trg_enforce_bonds_ownership BEFORE INSERT OR UPDATE ON public.bonds FOR EACH ROW EXECUTE FUNCTION public.enforce_policy_client_ownership();

DROP TRIGGER IF EXISTS trg_enforce_loans_ownership ON public.loans;
CREATE TRIGGER trg_enforce_loans_ownership BEFORE INSERT OR UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.enforce_policy_client_ownership();

-- ----------------------------------------------------------------------------
-- 27. DOCUMENT OWNERSHIP & CONFIDENTIALITY INTEGRITY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_document_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    client_sub_id UUID;
    caller_sub_id UUID;
BEGIN
    IF NEW.client_id IS NOT NULL THEN
        SELECT sub_broker_id INTO client_sub_id
        FROM public.clients
        WHERE id = NEW.client_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Document Validation Error: Referenced client % does not exist.', NEW.client_id;
        END IF;

        IF NEW.sub_broker_id IS NULL AND client_sub_id IS NOT NULL THEN
            NEW.sub_broker_id := client_sub_id;
        ELSIF NEW.sub_broker_id IS NOT NULL AND client_sub_id IS NOT NULL AND NEW.sub_broker_id <> client_sub_id THEN
            RAISE EXCEPTION 'Document Validation Error: Document sub_broker_id does not match the owning client partner account.';
        END IF;
    END IF;

    IF public.is_sub_broker() THEN
        caller_sub_id := public.current_sub_broker_id();

        IF caller_sub_id IS NULL THEN
            RAISE EXCEPTION 'Security Policy Violation: Authenticated user is not linked to a valid sub-broker profile.';
        END IF;

        IF NEW.sub_broker_id IS NULL OR NEW.sub_broker_id <> caller_sub_id THEN
            RAISE EXCEPTION 'Security Policy Violation: Sub-brokers cannot attach documents to other partner accounts.';
        END IF;

        IF NEW.is_confidential THEN
            RAISE EXCEPTION 'Security Policy Violation: Sub-brokers cannot designate documents as confidential.';
        END IF;
    END IF;

    IF NEW.is_confidential AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Security Policy Violation: Only Super Admins can set or alter confidential document classification.';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_document_integrity ON public.documents;
CREATE TRIGGER trg_validate_document_integrity
    BEFORE INSERT OR UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_document_integrity();

-- ----------------------------------------------------------------------------
-- 28. PAYOUT LIFECYCLE & DISBURSEMENT INTEGRITY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_payout_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.status IN ('processing', 'completed') OR (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Security Policy Violation: Only Super Admins can alter payout lifecycle stages.';
        END IF;
    END IF;

    IF NEW.status = 'completed' THEN
        IF NEW.bank_reference_no IS NULL OR TRIM(NEW.bank_reference_no) = '' THEN
            RAISE EXCEPTION 'Payout Validation Error: Bank reference number is mandatory for completed disbursements.';
        END IF;
        IF NEW.disbursement_date IS NULL THEN
            NEW.disbursement_date := NOW();
        END IF;
        IF NEW.net_disbursed <= 0 THEN
            NEW.net_disbursed := NEW.net_payable;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
        RAISE EXCEPTION 'Security Policy Violation: Completed payouts are immutable and cannot be altered.';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_payout_lifecycle ON public.payouts;
CREATE TRIGGER trg_guard_payout_lifecycle
    BEFORE INSERT OR UPDATE ON public.payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_payout_lifecycle();

-- ----------------------------------------------------------------------------
-- 29. BROKERAGE ENTRY INTEGRITY TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_brokerage_entry_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    batch_status payout_status;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.payout_batch_id IS NOT NULL THEN
        SELECT status INTO batch_status FROM public.payouts WHERE id = OLD.payout_batch_id;
        IF batch_status = 'completed' THEN
            RAISE EXCEPTION 'Security Policy Violation: Brokerage entry is locked inside a disbursed payout batch.';
        END IF;
    END IF;

    IF NEW.status IN ('approved', 'paid', 'reconciled') THEN
        IF NOT (public.is_super_admin() OR public.is_staff()) THEN
            RAISE EXCEPTION 'Security Policy Violation: Only staff or administrators can reconcile ledger entries.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_brokerage_entry_lifecycle ON public.brokerage_entries;
CREATE TRIGGER trg_guard_brokerage_entry_lifecycle
    BEFORE INSERT OR UPDATE ON public.brokerage_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_brokerage_entry_lifecycle();

-- ----------------------------------------------------------------------------
-- 30. PERMANENT FIRST SUPER ADMIN PROVISIONING (HARDENED ONE-TIME LOCK)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_first_admin(
    target_email TEXT,
    target_name TEXT DEFAULT 'Rahul Pandey'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_auth_user_id UUID;
    is_locked BOOLEAN;
    result_profile RECORD;
    lock_hash_val TEXT;
BEGIN
    -- 1. Strict atomic lock check
    SELECT is_first_admin_provisioned INTO is_locked
    FROM public.system_bootstrap
    WHERE id = 1
    FOR UPDATE;

    IF is_locked = TRUE THEN
        RAISE EXCEPTION 'Permanent Lock Violation: Initial Super Admin bootstrap has already been permanently executed. Cannot re-provision under any circumstances.';
    END IF;

    -- 2. Verify target user exists in auth.users
    SELECT id INTO target_auth_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(TRIM(target_email));

    IF target_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: No registered account in auth.users matches email "%". Have Rahul Pandey sign up in Supabase Auth first.', target_email;
    END IF;

    -- 3. Upsert Super Admin profile
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        staff_department,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        target_auth_user_id,
        TRIM(target_name),
        LOWER(TRIM(target_email)),
        'super_admin',
        'Executive Management',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'super_admin',
        staff_department = 'Executive Management',
        is_active = TRUE,
        updated_at = NOW()
    RETURNING * INTO result_profile;

    -- 4. Generate internal lock hash
    lock_hash_val := encode(digest(target_auth_user_id::text || target_email || NOW()::text, 'sha256'), 'hex');

    -- 5. Atomically lock system_bootstrap record
    UPDATE public.system_bootstrap
    SET is_first_admin_provisioned = TRUE,
        provisioned_admin_email = LOWER(TRIM(target_email)),
        provisioned_admin_id = target_auth_user_id,
        provisioned_at = NOW(),
        lock_hash = lock_hash_val,
        updated_at = NOW()
    WHERE id = 1;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Initial Super Admin provisioned and permanent lock established.',
        'user_id', target_auth_user_id,
        'email', target_email,
        'role', 'super_admin'
    );
END;
$$;

-- Executable strictly by database owner (postgres) via trusted Supabase SQL Editor
REVOKE ALL ON FUNCTION public.provision_first_admin(TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provision_first_admin(TEXT, TEXT) TO postgres;

-- ----------------------------------------------------------------------------
-- 31. AUTHENTICATED USER PROVISIONING BY ACTIVE SUPER ADMIN
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_user(
    new_user_email TEXT,
    new_user_name TEXT,
    new_user_role user_role,
    new_user_department TEXT DEFAULT NULL,
    new_sub_broker_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
    result_record RECORD;
BEGIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Security Policy Violation: Only an active Super Admin can provision team accounts.';
    END IF;

    IF new_user_role NOT IN ('super_admin', 'staff', 'sub_broker') THEN
        RAISE EXCEPTION 'Invalid role specified: %', new_user_role;
    END IF;

    SELECT id INTO target_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(TRIM(new_user_email));

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User "%" has not created an authentication account. They must sign up first before their profile can be provisioned.', new_user_email;
    END IF;

    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        staff_department,
        sub_broker_code,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        target_user_id,
        TRIM(new_user_name),
        LOWER(TRIM(new_user_email)),
        new_user_role,
        new_user_department,
        new_sub_broker_code,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        staff_department = EXCLUDED.staff_department,
        sub_broker_code = EXCLUDED.sub_broker_code,
        is_active = TRUE,
        updated_at = NOW()
    RETURNING * INTO result_record;

    IF new_user_role = 'sub_broker' AND new_sub_broker_code IS NOT NULL THEN
        UPDATE public.sub_brokers
        SET user_id = target_user_id, updated_at = NOW()
        WHERE sub_broker_code = new_sub_broker_code
          AND (user_id IS NULL OR user_id = target_user_id);
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'user_id', target_user_id,
        'email', new_user_email,
        'role', new_user_role
    );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_user(TEXT, TEXT, user_role, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_user(TEXT, TEXT, user_role, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 32. SUPABASE STORAGE SECURITY ARCHITECTURE (ifbms-documents)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ifbms-documents',
    'ifbms-documents',
    FALSE,
    26214400, -- 25 MB max
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 26214400;

-- Path helper for storage security:
-- Exact 4-segment structure: <partner_scope>/<client_scope>/<document_uuid>/<filename>
CREATE OR REPLACE FUNCTION public.can_access_storage_object(
    object_name TEXT,
    required_mode TEXT -- 'read' or 'write'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
STABLE
AS $$
DECLARE
    parts TEXT[];
    path_partner_scope TEXT;
    path_client_scope TEXT;
    path_doc_id UUID;
    target_doc RECORD;
    caller_sub_id UUID;
BEGIN
    -- Super Admin has universal access
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Deletions and updates restricted to Super Admin
    IF required_mode = 'write' AND (TG_OP IN ('UPDATE', 'DELETE') OR TG_OP IS NULL) THEN
        IF NOT public.is_super_admin() THEN
            IF required_mode <> 'write' THEN
                RETURN FALSE;
            END IF;
        END IF;
    END IF;

    parts := string_to_array(object_name, '/');
    -- Enforce EXACTLY 4 segments: <partner_scope>/<client_scope>/<document_uuid>/<filename>
    IF array_length(parts, 1) <> 4 THEN
        RETURN FALSE;
    END IF;

    path_partner_scope := parts[1];
    path_client_scope := parts[2];
    
    -- Attempt to parse document UUID
    BEGIN
        path_doc_id := parts[3]::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    -- Validate referenced document exists in public.documents
    SELECT id, client_id, sub_broker_id, is_confidential INTO target_doc
    FROM public.documents
    WHERE id = path_doc_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Validate partner scope alignment with database record
    IF target_doc.sub_broker_id IS NOT NULL THEN
        IF path_partner_scope <> target_doc.sub_broker_id::TEXT THEN
            RETURN FALSE;
        END IF;
    ELSE
        IF path_partner_scope NOT IN ('direct', 'corporate') THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Validate client scope alignment with database record
    IF target_doc.client_id IS NOT NULL THEN
        IF path_client_scope <> target_doc.client_id::TEXT THEN
            RETURN FALSE;
        END IF;
    ELSE
        IF path_client_scope <> 'general' THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Confidential documents are strictly Super Admin only
    IF target_doc.is_confidential THEN
        RETURN FALSE;
    END IF;

    -- Staff can access non-confidential files
    IF public.is_staff() THEN
        RETURN TRUE;
    END IF;

    -- Sub-broker access verification
    IF public.is_sub_broker() THEN
        caller_sub_id := public.current_sub_broker_id();
        IF caller_sub_id IS NULL THEN
            RETURN FALSE;
        END IF;

        IF path_partner_scope = 'corporate' OR path_partner_scope = 'direct' THEN
            RETURN FALSE;
        END IF;

        IF path_partner_scope <> caller_sub_id::TEXT THEN
            RETURN FALSE;
        END IF;

        IF target_doc.sub_broker_id IS NULL OR target_doc.sub_broker_id <> caller_sub_id THEN
            RETURN FALSE;
        END IF;

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_storage_object(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_storage_object(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "storage_select_documents" ON storage.objects;
CREATE POLICY "storage_select_documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'ifbms-documents'
        AND public.can_access_storage_object(name, 'read')
    );

DROP POLICY IF EXISTS "storage_insert_documents" ON storage.objects;
CREATE POLICY "storage_insert_documents" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'ifbms-documents'
        AND public.can_access_storage_object(name, 'write')
    );

DROP POLICY IF EXISTS "storage_update_admin_only" ON storage.objects;
CREATE POLICY "storage_update_admin_only" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'ifbms-documents'
        AND public.is_super_admin()
    )
    WITH CHECK (
        bucket_id = 'ifbms-documents'
        AND public.is_super_admin()
    );

DROP POLICY IF EXISTS "storage_delete_admin_only" ON storage.objects;
CREATE POLICY "storage_delete_admin_only" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'ifbms-documents'
        AND public.is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- 33. ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.system_bootstrap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motor_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokerage_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokerage_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------- SYSTEM BOOTSTRAP POLICIES -----------------
DROP POLICY IF EXISTS "bootstrap_select_super_admin" ON public.system_bootstrap;
CREATE POLICY "bootstrap_select_super_admin" ON public.system_bootstrap
    FOR SELECT TO authenticated
    USING (public.is_super_admin());

-- ----------------- PROFILES POLICIES -----------------
DROP POLICY IF EXISTS "profiles_select_active_staff_admin" ON public.profiles;
CREATE POLICY "profiles_select_active_staff_admin" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_super_admin()
        OR public.is_staff()
    );

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        id = auth.uid() OR public.is_super_admin()
    )
    WITH CHECK (
        id = auth.uid() OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "profiles_insert_super_admin_only" ON public.profiles;
CREATE POLICY "profiles_insert_super_admin_only" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "profiles_delete_super_admin_only" ON public.profiles;
CREATE POLICY "profiles_delete_super_admin_only" ON public.profiles
    FOR DELETE TO authenticated
    USING (public.is_super_admin() AND id <> auth.uid());

-- ----------------- SUB-BROKERS POLICIES -----------------
DROP POLICY IF EXISTS "sub_brokers_select_policy" ON public.sub_brokers;
CREATE POLICY "sub_brokers_select_policy" ON public.sub_brokers
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "sub_brokers_admin_staff_write" ON public.sub_brokers;
CREATE POLICY "sub_brokers_admin_staff_write" ON public.sub_brokers
    FOR ALL TO authenticated
    USING (public.is_super_admin() OR public.is_staff())
    WITH CHECK (public.is_super_admin() OR public.is_staff());

-- ----------------- CLIENTS POLICIES -----------------
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
CREATE POLICY "clients_select_policy" ON public.clients
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
CREATE POLICY "clients_insert_policy" ON public.clients
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
CREATE POLICY "clients_update_policy" ON public.clients
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "clients_delete_admin_only" ON public.clients;
CREATE POLICY "clients_delete_admin_only" ON public.clients
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- PROVIDERS POLICIES -----------------
DROP POLICY IF EXISTS "providers_select_authenticated" ON public.providers;
CREATE POLICY "providers_select_authenticated" ON public.providers
    FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "providers_write_admin_staff" ON public.providers;
CREATE POLICY "providers_write_admin_staff" ON public.providers
    FOR ALL TO authenticated
    USING (public.is_super_admin() OR public.is_staff())
    WITH CHECK (public.is_super_admin() OR public.is_staff());

-- ----------------- HEALTH POLICIES -----------------
DROP POLICY IF EXISTS "health_policies_select" ON public.health_policies;
CREATE POLICY "health_policies_select" ON public.health_policies
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "health_policies_write" ON public.health_policies;
CREATE POLICY "health_policies_write" ON public.health_policies
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "health_policies_update" ON public.health_policies;
CREATE POLICY "health_policies_update" ON public.health_policies
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "health_policies_delete" ON public.health_policies;
CREATE POLICY "health_policies_delete" ON public.health_policies
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- MOTOR POLICIES -----------------
DROP POLICY IF EXISTS "motor_policies_select" ON public.motor_policies;
CREATE POLICY "motor_policies_select" ON public.motor_policies
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "motor_policies_write" ON public.motor_policies;
CREATE POLICY "motor_policies_write" ON public.motor_policies
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "motor_policies_update" ON public.motor_policies;
CREATE POLICY "motor_policies_update" ON public.motor_policies
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "motor_policies_delete" ON public.motor_policies;
CREATE POLICY "motor_policies_delete" ON public.motor_policies
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- LIFE POLICIES -----------------
DROP POLICY IF EXISTS "life_policies_select" ON public.life_policies;
CREATE POLICY "life_policies_select" ON public.life_policies
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "life_policies_write" ON public.life_policies;
CREATE POLICY "life_policies_write" ON public.life_policies
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "life_policies_update" ON public.life_policies;
CREATE POLICY "life_policies_update" ON public.life_policies
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "life_policies_delete" ON public.life_policies;
CREATE POLICY "life_policies_delete" ON public.life_policies
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- FIXED DEPOSITS -----------------
DROP POLICY IF EXISTS "fixed_deposits_select" ON public.fixed_deposits;
CREATE POLICY "fixed_deposits_select" ON public.fixed_deposits
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "fixed_deposits_write" ON public.fixed_deposits;
CREATE POLICY "fixed_deposits_write" ON public.fixed_deposits
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "fixed_deposits_update" ON public.fixed_deposits;
CREATE POLICY "fixed_deposits_update" ON public.fixed_deposits
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "fixed_deposits_delete" ON public.fixed_deposits;
CREATE POLICY "fixed_deposits_delete" ON public.fixed_deposits
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- BONDS -----------------
DROP POLICY IF EXISTS "bonds_select" ON public.bonds;
CREATE POLICY "bonds_select" ON public.bonds
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "bonds_write" ON public.bonds;
CREATE POLICY "bonds_write" ON public.bonds
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "bonds_update" ON public.bonds;
CREATE POLICY "bonds_update" ON public.bonds
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "bonds_delete" ON public.bonds;
CREATE POLICY "bonds_delete" ON public.bonds
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- LOANS -----------------
DROP POLICY IF EXISTS "loans_select" ON public.loans;
CREATE POLICY "loans_select" ON public.loans
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "loans_write" ON public.loans;
CREATE POLICY "loans_write" ON public.loans
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "loans_update" ON public.loans;
CREATE POLICY "loans_update" ON public.loans
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "loans_delete" ON public.loans;
CREATE POLICY "loans_delete" ON public.loans
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- BROKERAGE RULES -----------------
DROP POLICY IF EXISTS "rules_select_authenticated" ON public.brokerage_rules;
CREATE POLICY "rules_select_authenticated" ON public.brokerage_rules
    FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "rules_write_admin_only" ON public.brokerage_rules;
CREATE POLICY "rules_write_admin_only" ON public.brokerage_rules
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ----------------- BROKERAGE ENTRIES -----------------
DROP POLICY IF EXISTS "entries_select" ON public.brokerage_entries;
CREATE POLICY "entries_select" ON public.brokerage_entries
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "entries_insert_admin_staff" ON public.brokerage_entries;
CREATE POLICY "entries_insert_admin_staff" ON public.brokerage_entries
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin() OR public.is_staff());

DROP POLICY IF EXISTS "entries_update_admin_staff" ON public.brokerage_entries;
CREATE POLICY "entries_update_admin_staff" ON public.brokerage_entries
    FOR UPDATE TO authenticated
    USING (public.is_super_admin() OR public.is_staff())
    WITH CHECK (public.is_super_admin() OR public.is_staff());

DROP POLICY IF EXISTS "entries_delete_admin_only" ON public.brokerage_entries;
CREATE POLICY "entries_delete_admin_only" ON public.brokerage_entries
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- PAYOUTS -----------------
DROP POLICY IF EXISTS "payouts_select" ON public.payouts;
CREATE POLICY "payouts_select" ON public.payouts
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (public.is_sub_broker() AND sub_broker_id = public.current_sub_broker_id())
    );

DROP POLICY IF EXISTS "payouts_write_admin_only" ON public.payouts;
CREATE POLICY "payouts_write_admin_only" ON public.payouts
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ----------------- TARGETS -----------------
DROP POLICY IF EXISTS "targets_select" ON public.targets;
CREATE POLICY "targets_select" ON public.targets
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_staff()
        OR (
            public.is_sub_broker()
            AND entity_type = 'sub_broker'
            AND entity_id = public.current_sub_broker_id()
        )
    );

DROP POLICY IF EXISTS "targets_write_admin_only" ON public.targets;
CREATE POLICY "targets_write_admin_only" ON public.targets
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ----------------- DOCUMENTS -----------------
DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR (public.is_staff() AND is_confidential = FALSE)
        OR (
            public.is_sub_broker()
            AND is_confidential = FALSE
            AND (
                sub_broker_id = public.current_sub_broker_id()
                OR client_id IN (
                    SELECT c.id FROM public.clients c
                    WHERE c.sub_broker_id = public.current_sub_broker_id()
                )
            )
        )
    );

DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (public.is_staff() AND is_confidential = FALSE)
        OR (
            public.is_sub_broker()
            AND is_confidential = FALSE
            AND sub_broker_id = public.current_sub_broker_id()
        )
    );

DROP POLICY IF EXISTS "documents_update_admin_only" ON public.documents;
CREATE POLICY "documents_update_admin_only" ON public.documents
    FOR UPDATE TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "documents_delete_admin_only" ON public.documents;
CREATE POLICY "documents_delete_admin_only" ON public.documents
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ----------------- IMPORT JOBS -----------------
DROP POLICY IF EXISTS "import_jobs_admin_staff_only" ON public.import_jobs;
CREATE POLICY "import_jobs_admin_staff_only" ON public.import_jobs
    FOR ALL TO authenticated
    USING (public.is_super_admin() OR public.is_staff())
    WITH CHECK (public.is_super_admin() OR public.is_staff());

-- ----------------- AUDIT LOGS -----------------
DROP POLICY IF EXISTS "audit_logs_select_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin_only" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin());

DROP POLICY IF EXISTS "audit_logs_block_direct_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_block_direct_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (FALSE);

DROP POLICY IF EXISTS "audit_logs_prevent_mutation" ON public.audit_logs;
CREATE POLICY "audit_logs_prevent_mutation" ON public.audit_logs
    FOR UPDATE TO authenticated
    USING (FALSE);

DROP POLICY IF EXISTS "audit_logs_prevent_deletion" ON public.audit_logs;
CREATE POLICY "audit_logs_prevent_deletion" ON public.audit_logs
    FOR DELETE TO authenticated
    USING (FALSE);

-- ----------------------------------------------------------------------------
-- 34. EXPLICIT SQL GRANTS & REVOCATIONS (DEFENSE-IN-DEPTH)
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, PUBLIC;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sub_brokers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.providers TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motor_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_deposits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bonds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brokerage_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brokerage_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_jobs TO authenticated;

-- Direct mutation on audit logs is REVOKED; authenticated can only SELECT (RLS limits to super_admin)
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.system_bootstrap TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
