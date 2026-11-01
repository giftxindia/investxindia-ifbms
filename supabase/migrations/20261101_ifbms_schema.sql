-- ============================================================================
-- INVESTXINDIA FINANCIAL BUSINESS MANAGEMENT SYSTEM (IFBMS)
-- Production Supabase PostgreSQL Schema & Security Architecture
-- Version: 2026.11.01-PROD
-- Target: Clean Supabase Project (public schema)
-- ============================================================================

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
-- 3. PROFILES TABLE (Linked 1:1 with auth.users)
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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. SUB-BROKERS TABLE
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
-- 5. CLIENTS TABLE
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
-- 6. PROVIDERS TABLE (Financial Institutions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category product_category NOT NULL,
    regulatory_license_no TEXT,
    headquarters TEXT,
    support_email TEXT,
    support_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. HEALTH POLICIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    insurer TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    sum_insured NUMERIC(14,2) NOT NULL CHECK (sum_insured > 0),
    annual_premium NUMERIC(12,2) NOT NULL CHECK (annual_premium > 0),
    policy_start_date DATE NOT NULL,
    policy_expiry_date DATE NOT NULL,
    renewal_due_date DATE NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'Annual' CHECK (payment_mode IN ('Annual', 'Semi-Annual', 'Monthly', 'Quarterly')),
    status policy_status NOT NULL DEFAULT 'active',
    commission_expected NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    commission_received NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sub_broker_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. MOTOR POLICIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.motor_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_no TEXT UNIQUE NOT NULL,
    vehicle_no TEXT NOT NULL,
    vehicle_make_model TEXT NOT NULL,
    policy_type TEXT NOT NULL CHECK (policy_type IN ('Comprehensive', 'Third Party', 'Own Damage')),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    insurer TEXT NOT NULL,
    idv_amount NUMERIC(14,2) NOT NULL CHECK (idv_amount >= 0),
    net_premium NUMERIC(12,2) NOT NULL CHECK (net_premium > 0),
    gross_premium NUMERIC(12,2) NOT NULL CHECK (gross_premium >= net_premium),
    policy_start_date DATE NOT NULL,
    policy_expiry_date DATE NOT NULL,
    status policy_status NOT NULL DEFAULT 'active',
    commission_expected NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    commission_received NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sub_broker_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. LIFE POLICIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.life_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    insurer TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('Term Plan', 'Endowment', 'ULIP', 'Whole Life', 'Guaranteed Return')),
    plan_name TEXT NOT NULL,
    sum_assured NUMERIC(14,2) NOT NULL CHECK (sum_assured > 0),
    policy_term_years INT NOT NULL CHECK (policy_term_years > 0),
    premium_payment_term INT NOT NULL CHECK (premium_payment_term > 0),
    annual_premium NUMERIC(12,2) NOT NULL CHECK (annual_premium > 0),
    policy_date DATE NOT NULL,
    next_premium_date DATE NOT NULL,
    status policy_status NOT NULL DEFAULT 'in_force',
    commission_expected NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    commission_received NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sub_broker_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. FIXED DEPOSITS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixed_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    deposit_amount NUMERIC(14,2) NOT NULL CHECK (deposit_amount > 0),
    tenure_months INT NOT NULL CHECK (tenure_months > 0),
    interest_rate_pct NUMERIC(5,2) NOT NULL CHECK (interest_rate_pct > 0),
    interest_payout_frequency TEXT NOT NULL CHECK (interest_payout_frequency IN ('Cumulative', 'Monthly', 'Quarterly', 'Annual')),
    deposit_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    maturity_amount NUMERIC(14,2) NOT NULL CHECK (maturity_amount >= deposit_amount),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'premature_closed')),
    commission_expected NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    commission_received NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sub_broker_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. BONDS & NCDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no TEXT UNIQUE NOT NULL,
    isin_no TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    issuer TEXT NOT NULL,
    bond_type TEXT NOT NULL CHECK (bond_type IN ('Capital Gains 54EC', 'Corporate NCD', 'Sovereign Gold Bond', 'Tax-Free Bond')),
    face_value_per_unit NUMERIC(10,2) NOT NULL CHECK (face_value_per_unit > 0),
    units_allocated INT NOT NULL CHECK (units_allocated > 0),
    total_investment NUMERIC(14,2) NOT NULL CHECK (total_investment > 0),
    coupon_rate_pct NUMERIC(5,2) NOT NULL CHECK (coupon_rate_pct >= 0),
    annual_interest_payout NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'allotted' CHECK (status IN ('allotted', 'pending_allotment', 'redeemed')),
    commission_expected NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    commission_received NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sub_broker_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12. LOANS & MORTGAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no TEXT UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    lender TEXT NOT NULL,
    loan_type TEXT NOT NULL CHECK (loan_type IN ('Home Loan', 'Loan Against Property', 'Business Loan', 'Personal Loan', 'Working Capital')),
    requested_amount NUMERIC(14,2) NOT NULL CHECK (requested_amount > 0),
    sanctioned_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (sanctioned_amount >= 0),
    disbursed_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (disbursed_amount >= 0),
    roi_pct NUMERIC(5,2) NOT NULL CHECK (roi_pct >= 0),
    stage TEXT NOT NULL DEFAULT 'login_submitted' CHECK (stage IN ('login_submitted', 'underwriting', 'sanctioned', 'disbursed', 'rejected')),
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    disbursement_date DATE,
    expected_payout NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    received_payout NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sub_broker_payout NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. BROKERAGE RULES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brokerage_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code TEXT UNIQUE NOT NULL,
    product_category product_category NOT NULL,
    provider TEXT NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'Fresh' CHECK (transaction_type IN ('Fresh', 'Renewal', 'Topup', 'Rollover')),
    partner_tier TEXT NOT NULL DEFAULT 'All' CHECK (partner_tier IN ('All', 'Standard', 'Silver', 'Gold', 'Platinum')),
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    company_commission_pct NUMERIC(5,2) NOT NULL CHECK (company_commission_pct >= 0 AND company_commission_pct <= 100),
    company_flat_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (company_flat_inr >= 0),
    sub_broker_share_pct NUMERIC(5,2) NOT NULL DEFAULT 70.00 CHECK (sub_broker_share_pct >= 0 AND sub_broker_share_pct <= 100),
    sub_broker_flat_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (sub_broker_flat_inr >= 0),
    min_slab_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (min_slab_amount >= 0),
    max_slab_amount NUMERIC(14,2) NOT NULL DEFAULT 999999999.00 CHECK (max_slab_amount >= min_slab_amount),
    tds_deduction_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tds_deduction_pct >= 0 AND tds_deduction_pct <= 30),
    version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 14. PAYOUTS TABLE (Disbursement Batches)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_batch_no TEXT UNIQUE NOT NULL,
    sub_broker_id UUID NOT NULL REFERENCES public.sub_brokers(id) ON DELETE RESTRICT,
    sub_broker_name TEXT,
    sub_broker_code TEXT,
    period TEXT NOT NULL,
    transaction_count INT NOT NULL DEFAULT 0 CHECK (transaction_count >= 0),
    gross_payable NUMERIC(14,2) NOT NULL CHECK (gross_payable >= 0),
    tds_deducted NUMERIC(12,2) NOT NULL CHECK (tds_deducted >= 0),
    net_disbursed NUMERIC(14,2) NOT NULL CHECK (net_disbursed >= 0),
    payment_mode TEXT NOT NULL DEFAULT 'NEFT' CHECK (payment_mode IN ('NEFT', 'RTGS', 'IMPS', 'Direct Transfer')),
    bank_reference_no TEXT,
    disbursement_date DATE,
    status payout_status NOT NULL DEFAULT 'pending_approval',
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 15. BROKERAGE ENTRIES / TRANSACTION LEDGER TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brokerage_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_no TEXT UNIQUE NOT NULL,
    product_type product_category NOT NULL,
    reference_no TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    sub_broker_id UUID REFERENCES public.sub_brokers(id) ON DELETE SET NULL,
    sub_broker_name TEXT NOT NULL,
    gross_business_value NUMERIC(14,2) NOT NULL CHECK (gross_business_value != 0),
    company_commission_expected NUMERIC(12,2) NOT NULL,
    company_commission_received NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sub_broker_share_pct NUMERIC(5,2) NOT NULL,
    sub_broker_gross_payable NUMERIC(12,2) NOT NULL,
    tds_deducted NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sub_broker_net_payable NUMERIC(12,2) NOT NULL,
    investxindia_retained NUMERIC(12,2) NOT NULL,
    status entry_status NOT NULL DEFAULT 'expected',
    receipt_date DATE,
    payment_ref_no TEXT,
    rule_version_applied TEXT NOT NULL,
    payout_batch_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 16. TARGETS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('Staff', 'Sub-Broker')),
    entity_id UUID,
    product_category TEXT NOT NULL,
    month TEXT NOT NULL,
    year INT NOT NULL CHECK (year >= 2020 AND year <= 2040),
    target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount >= 0),
    achieved_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (achieved_amount >= 0),
    status TEXT NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'lagging', 'achieved', 'exceeded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 17. DOCUMENTS TABLE (Vault Metadata)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    document_category TEXT NOT NULL CHECK (document_category IN ('KYC', 'Policy Copy', 'Proposal Form', 'Mandate', 'Brokerage Agreement', 'Payout Advice', 'Bank Proof', 'GST Certificate')),
    related_entity TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('Client', 'Sub-Broker', 'Policy', 'Payout', 'Loan')),
    entity_id UUID,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- ----------------------------------------------------------------------------
-- 18. IMPORT JOBS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INT NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    valid_rows INT NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
    invalid_rows INT NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors', 'failed')),
    error_log JSONB DEFAULT '[]'::JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 19. AUDIT LOGS TABLE (Immutable Log Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role user_role NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    ip_address TEXT,
    details TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 20. INDEXES (High Performance & RLS Filter Optimizations)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_sub_brokers_user_id ON public.sub_brokers(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_brokers_code ON public.sub_brokers(sub_broker_code);
CREATE INDEX IF NOT EXISTS idx_clients_sub_broker_id ON public.clients(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_clients_code ON public.clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_staff ON public.clients(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_providers_category ON public.providers(category);
CREATE INDEX IF NOT EXISTS idx_health_policies_sb ON public.health_policies(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_health_policies_client ON public.health_policies(client_id);
CREATE INDEX IF NOT EXISTS idx_health_policies_renewal ON public.health_policies(renewal_due_date);
CREATE INDEX IF NOT EXISTS idx_motor_policies_sb ON public.motor_policies(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_motor_policies_client ON public.motor_policies(client_id);
CREATE INDEX IF NOT EXISTS idx_motor_policies_veh ON public.motor_policies(vehicle_no);
CREATE INDEX IF NOT EXISTS idx_life_policies_sb ON public.life_policies(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_life_policies_client ON public.life_policies(client_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_sb ON public.fixed_deposits(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_client ON public.fixed_deposits(client_id);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_mat ON public.fixed_deposits(maturity_date);
CREATE INDEX IF NOT EXISTS idx_bonds_sb ON public.bonds(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_bonds_client ON public.bonds(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_sb ON public.loans(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_loans_client ON public.loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_stage ON public.loans(stage);
CREATE INDEX IF NOT EXISTS idx_brokerage_rules_cat ON public.brokerage_rules(product_category, status);
CREATE INDEX IF NOT EXISTS idx_brokerage_entries_sb ON public.brokerage_entries(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_entries_batch ON public.brokerage_entries(payout_batch_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_entries_status ON public.brokerage_entries(status);
CREATE INDEX IF NOT EXISTS idx_payouts_sb ON public.payouts(sub_broker_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON public.audit_logs(timestamp DESC);

-- ----------------------------------------------------------------------------
-- 21. SECURITY HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Retrieves authenticated user's authoritative role from profiles table
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Retrieves authenticated user's linked sub_broker_id
CREATE OR REPLACE FUNCTION public.current_sub_broker_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT id FROM public.sub_brokers 
    WHERE user_id = auth.uid() 
       OR sub_broker_code = (SELECT sub_broker_code FROM public.profiles WHERE id = auth.uid()) 
    LIMIT 1;
$$;

-- Enforces role immutability: Non-super_admins cannot elevate or change user roles
CREATE OR REPLACE FUNCTION public.enforce_role_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF public.current_user_role() != 'super_admin' THEN
            RAISE EXCEPTION 'Security Policy Violation: Only Super Administrators can alter user account roles.';
        END IF;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_role_elevation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_role_immutability();

-- Updated_at trigger handler
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sub_brokers_updated_at ON public.sub_brokers;
CREATE TRIGGER trg_sub_brokers_updated_at BEFORE UPDATE ON public.sub_brokers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_health_policies_updated_at ON public.health_policies;
CREATE TRIGGER trg_health_policies_updated_at BEFORE UPDATE ON public.health_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_motor_policies_updated_at ON public.motor_policies;
CREATE TRIGGER trg_motor_policies_updated_at BEFORE UPDATE ON public.motor_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_life_policies_updated_at ON public.life_policies;
CREATE TRIGGER trg_life_policies_updated_at BEFORE UPDATE ON public.life_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fixed_deposits_updated_at ON public.fixed_deposits;
CREATE TRIGGER trg_fixed_deposits_updated_at BEFORE UPDATE ON public.fixed_deposits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_bonds_updated_at ON public.bonds;
CREATE TRIGGER trg_bonds_updated_at BEFORE UPDATE ON public.bonds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_loans_updated_at ON public.loans;
CREATE TRIGGER trg_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_brokerage_rules_updated_at ON public.brokerage_rules;
CREATE TRIGGER trg_brokerage_rules_updated_at BEFORE UPDATE ON public.brokerage_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_brokerage_entries_updated_at ON public.brokerage_entries;
CREATE TRIGGER trg_brokerage_entries_updated_at BEFORE UPDATE ON public.brokerage_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payouts_updated_at ON public.payouts;
CREATE TRIGGER trg_payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Automatically populate payout sub-broker details if omitted on insert
CREATE OR REPLACE FUNCTION public.handle_payout_sub_broker_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.sub_broker_name IS NULL OR NEW.sub_broker_code IS NULL THEN
        SELECT name, sub_broker_code INTO NEW.sub_broker_name, NEW.sub_broker_code
        FROM public.sub_brokers
        WHERE id = NEW.sub_broker_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payout_defaults ON public.payouts;
CREATE TRIGGER trg_payout_defaults
    BEFORE INSERT ON public.payouts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payout_sub_broker_defaults();

-- ----------------------------------------------------------------------------
-- 22. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

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

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles viewable by self, staff, or super_admin" ON public.profiles;
CREATE POLICY "Profiles viewable by self, staff, or super_admin"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() = id OR
        public.current_user_role() IN ('super_admin', 'staff')
    );

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
    ON public.profiles FOR UPDATE
    USING (
        public.current_user_role() = 'super_admin' OR
        auth.uid() = id
    );

DROP POLICY IF EXISTS "Profiles insert policy (Super Admin Only)" ON public.profiles;
CREATE POLICY "Profiles insert policy (Super Admin Only)"
    ON public.profiles FOR INSERT
    WITH CHECK (
        public.current_user_role() = 'super_admin'
    );

DROP POLICY IF EXISTS "Profiles delete policy (Super Admin Only)" ON public.profiles;
CREATE POLICY "Profiles delete policy (Super Admin Only)"
    ON public.profiles FOR DELETE
    USING (
        public.current_user_role() = 'super_admin'
    );

-- SUB-BROKERS POLICIES
DROP POLICY IF EXISTS "Sub-brokers SELECT" ON public.sub_brokers;
CREATE POLICY "Sub-brokers SELECT"
    ON public.sub_brokers FOR SELECT
    USING (
        public.current_user_role() IN ('super_admin', 'staff') OR
        user_id = auth.uid() OR
        id = public.current_sub_broker_id()
    );

DROP POLICY IF EXISTS "Sub-brokers WRITE (Super Admin Only)" ON public.sub_brokers;
CREATE POLICY "Sub-brokers WRITE (Super Admin Only)"
    ON public.sub_brokers FOR ALL
    USING (public.current_user_role() = 'super_admin');

-- CLIENTS POLICIES
DROP POLICY IF EXISTS "Clients SELECT" ON public.clients;
CREATE POLICY "Clients SELECT"
    ON public.clients FOR SELECT
    USING (
        public.current_user_role() IN ('super_admin', 'staff') OR
        sub_broker_id = public.current_sub_broker_id()
    );

DROP POLICY IF EXISTS "Clients INSERT" ON public.clients;
CREATE POLICY "Clients INSERT"
    ON public.clients FOR INSERT
    WITH CHECK (
        public.current_user_role() IN ('super_admin', 'staff') OR
        sub_broker_id = public.current_sub_broker_id()
    );

DROP POLICY IF EXISTS "Clients UPDATE" ON public.clients;
CREATE POLICY "Clients UPDATE"
    ON public.clients FOR UPDATE
    USING (
        public.current_user_role() IN ('super_admin', 'staff') OR
        sub_broker_id = public.current_sub_broker_id()
    );

DROP POLICY IF EXISTS "Clients DELETE (Super Admin Only)" ON public.clients;
CREATE POLICY "Clients DELETE (Super Admin Only)"
    ON public.clients FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- PROVIDERS POLICIES
DROP POLICY IF EXISTS "Providers SELECT" ON public.providers;
CREATE POLICY "Providers SELECT"
    ON public.providers FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Providers WRITE (Super Admin Only)" ON public.providers;
CREATE POLICY "Providers WRITE (Super Admin Only)"
    ON public.providers FOR ALL
    USING (public.current_user_role() = 'super_admin');

-- HEALTH POLICIES
DROP POLICY IF EXISTS "Health Policies SELECT" ON public.health_policies;
CREATE POLICY "Health Policies SELECT" ON public.health_policies FOR SELECT
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Health Policies INSERT" ON public.health_policies;
CREATE POLICY "Health Policies INSERT" ON public.health_policies FOR INSERT
    WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Health Policies UPDATE" ON public.health_policies;
CREATE POLICY "Health Policies UPDATE" ON public.health_policies FOR UPDATE
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Health Policies DELETE (Super Admin Only)" ON public.health_policies;
CREATE POLICY "Health Policies DELETE (Super Admin Only)" ON public.health_policies FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- MOTOR POLICIES
DROP POLICY IF EXISTS "Motor Policies SELECT" ON public.motor_policies;
CREATE POLICY "Motor Policies SELECT" ON public.motor_policies FOR SELECT
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Motor Policies INSERT" ON public.motor_policies;
CREATE POLICY "Motor Policies INSERT" ON public.motor_policies FOR INSERT
    WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Motor Policies UPDATE" ON public.motor_policies;
CREATE POLICY "Motor Policies UPDATE" ON public.motor_policies FOR UPDATE
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Motor Policies DELETE (Super Admin Only)" ON public.motor_policies;
CREATE POLICY "Motor Policies DELETE (Super Admin Only)" ON public.motor_policies FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- LIFE POLICIES
DROP POLICY IF EXISTS "Life Policies SELECT" ON public.life_policies;
CREATE POLICY "Life Policies SELECT" ON public.life_policies FOR SELECT
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Life Policies INSERT" ON public.life_policies;
CREATE POLICY "Life Policies INSERT" ON public.life_policies FOR INSERT
    WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Life Policies UPDATE" ON public.life_policies;
CREATE POLICY "Life Policies UPDATE" ON public.life_policies FOR UPDATE
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Life Policies DELETE (Super Admin Only)" ON public.life_policies;
CREATE POLICY "Life Policies DELETE (Super Admin Only)" ON public.life_policies FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- FIXED DEPOSITS
DROP POLICY IF EXISTS "Fixed Deposits SELECT" ON public.fixed_deposits;
CREATE POLICY "Fixed Deposits SELECT" ON public.fixed_deposits FOR SELECT
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Fixed Deposits INSERT" ON public.fixed_deposits;
CREATE POLICY "Fixed Deposits INSERT" ON public.fixed_deposits FOR INSERT
    WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Fixed Deposits UPDATE" ON public.fixed_deposits;
CREATE POLICY "Fixed Deposits UPDATE" ON public.fixed_deposits FOR UPDATE
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Fixed Deposits DELETE (Super Admin Only)" ON public.fixed_deposits;
CREATE POLICY "Fixed Deposits DELETE (Super Admin Only)" ON public.fixed_deposits FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- BONDS
DROP POLICY IF EXISTS "Bonds SELECT" ON public.bonds;
CREATE POLICY "Bonds SELECT" ON public.bonds FOR SELECT
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Bonds INSERT" ON public.bonds;
CREATE POLICY "Bonds INSERT" ON public.bonds FOR INSERT
    WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Bonds UPDATE" ON public.bonds;
CREATE POLICY "Bonds UPDATE" ON public.bonds FOR UPDATE
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Bonds DELETE (Super Admin Only)" ON public.bonds;
CREATE POLICY "Bonds DELETE (Super Admin Only)" ON public.bonds FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- LOANS
DROP POLICY IF EXISTS "Loans SELECT" ON public.loans;
CREATE POLICY "Loans SELECT" ON public.loans FOR SELECT
    USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Loans INSERT" ON public.loans;
CREATE POLICY "Loans INSERT" ON public.loans FOR INSERT
    WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

DROP POLICY IF EXISTS "Loans UPDATE" ON public.loans;
CREATE POLICY "Loans UPDATE" ON public.loans FOR UPDATE
    USING (public.current_user_role() IN ('super_admin', 'staff'));

DROP POLICY IF EXISTS "Loans DELETE (Super Admin Only)" ON public.loans;
CREATE POLICY "Loans DELETE (Super Admin Only)" ON public.loans FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- BROKERAGE RULES (Super Admin Exclusive write)
DROP POLICY IF EXISTS "Brokerage Rules SELECT" ON public.brokerage_rules;
CREATE POLICY "Brokerage Rules SELECT"
    ON public.brokerage_rules FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Brokerage Rules WRITE (Super Admin Only)" ON public.brokerage_rules;
CREATE POLICY "Brokerage Rules WRITE (Super Admin Only)"
    ON public.brokerage_rules FOR ALL
    USING (public.current_user_role() = 'super_admin');

-- BROKERAGE ENTRIES
DROP POLICY IF EXISTS "Brokerage Entries SELECT" ON public.brokerage_entries;
CREATE POLICY "Brokerage Entries SELECT"
    ON public.brokerage_entries FOR SELECT
    USING (
        public.current_user_role() IN ('super_admin', 'staff') OR
        sub_broker_id = public.current_sub_broker_id()
    );

DROP POLICY IF EXISTS "Brokerage Entries WRITE" ON public.brokerage_entries;
CREATE POLICY "Brokerage Entries WRITE"
    ON public.brokerage_entries FOR ALL
    USING (public.current_user_role() IN ('super_admin', 'staff'));

-- PAYOUTS
DROP POLICY IF EXISTS "Payouts SELECT" ON public.payouts;
CREATE POLICY "Payouts SELECT"
    ON public.payouts FOR SELECT
    USING (
        public.current_user_role() IN ('super_admin', 'staff') OR
        sub_broker_id = public.current_sub_broker_id()
    );

DROP POLICY IF EXISTS "Payouts WRITE (Super Admin Only)" ON public.payouts;
CREATE POLICY "Payouts WRITE (Super Admin Only)"
    ON public.payouts FOR ALL
    USING (public.current_user_role() = 'super_admin');

-- TARGETS
DROP POLICY IF EXISTS "Targets SELECT" ON public.targets;
CREATE POLICY "Targets SELECT"
    ON public.targets FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Targets WRITE" ON public.targets;
CREATE POLICY "Targets WRITE"
    ON public.targets FOR ALL
    USING (public.current_user_role() = 'super_admin');

-- DOCUMENTS
DROP POLICY IF EXISTS "Documents SELECT" ON public.documents;
CREATE POLICY "Documents SELECT"
    ON public.documents FOR SELECT
    USING (
        public.current_user_role() IN ('super_admin', 'staff') OR
        uploaded_by = auth.email()
    );

DROP POLICY IF EXISTS "Documents INSERT" ON public.documents;
CREATE POLICY "Documents INSERT"
    ON public.documents FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Documents DELETE (Super Admin Only)" ON public.documents;
CREATE POLICY "Documents DELETE (Super Admin Only)"
    ON public.documents FOR DELETE
    USING (public.current_user_role() = 'super_admin');

-- IMPORT JOBS
DROP POLICY IF EXISTS "Import Jobs SELECT" ON public.import_jobs;
CREATE POLICY "Import Jobs SELECT"
    ON public.import_jobs FOR SELECT
    USING (public.current_user_role() IN ('super_admin', 'staff'));

DROP POLICY IF EXISTS "Import Jobs INSERT" ON public.import_jobs;
CREATE POLICY "Import Jobs INSERT"
    ON public.import_jobs FOR INSERT
    WITH CHECK (public.current_user_role() IN ('super_admin', 'staff'));

-- AUDIT LOGS (Immutable: SELECT for Super Admin, INSERT for authenticated actors)
DROP POLICY IF EXISTS "Audit Logs SELECT (Super Admin Only)" ON public.audit_logs;
CREATE POLICY "Audit Logs SELECT (Super Admin Only)"
    ON public.audit_logs FOR SELECT
    USING (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Audit Logs INSERT" ON public.audit_logs;
CREATE POLICY "Audit Logs INSERT"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 23. TRUSTED SERVER-AUTHORITATIVE PROVISIONING FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function: Provision First Super Admin (Initial Root Administrator Setup)
CREATE OR REPLACE FUNCTION public.provision_first_admin(
    p_email TEXT,
    p_full_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE LOWER(email) = LOWER(TRIM(p_email)) 
    LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'User account was not found in auth.users. Please create the user in Supabase Authentication > Users first, then execute this function.',
            'target_email', p_email
        );
    END IF;

    -- Upsert profile with super_admin role
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
        target_user_id, 
        p_full_name, 
        LOWER(TRIM(p_email)), 
        'super_admin', 
        'Executive Directorate', 
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        full_name = EXCLUDED.full_name,
        is_active = TRUE,
        updated_at = NOW();

    -- Record in audit logs
    INSERT INTO public.audit_logs (actor_name, actor_role, action, entity_type, entity_id, details)
    VALUES (
        p_full_name, 
        'super_admin', 
        'FIRST_SUPER_ADMIN_PROVISIONED', 
        'profiles', 
        target_user_id::TEXT, 
        'Initial executive root Super Admin account authorized in public.profiles.'
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Super Admin role successfully assigned and activated in public.profiles.',
        'user_id', target_user_id,
        'email', p_email,
        'role', 'super_admin'
    );
END;
$$;

-- Function: Provision Staff or Sub-Broker User (Callable Only by Super Admin)
CREATE OR REPLACE FUNCTION public.provision_user(
    p_email TEXT,
    p_full_name TEXT,
    p_role user_role,
    p_department_or_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    target_user_id UUID;
    v_dept TEXT := NULL;
    v_sb_code TEXT := NULL;
BEGIN
    IF public.current_user_role() != 'super_admin' AND CURRENT_USER != 'postgres' THEN
        RAISE EXCEPTION 'Access Denied: Only Super Administrators can provision user roles.';
    END IF;

    SELECT id INTO target_user_id FROM auth.users WHERE LOWER(email) = LOWER(TRIM(p_email)) LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'User must first be registered in Supabase Authentication before role provisioning.',
            'target_email', p_email
        );
    END IF;

    IF p_role = 'staff' THEN
        v_dept := COALESCE(p_department_or_code, 'Operations & CRM');
    ELSIF p_role = 'sub_broker' THEN
        v_sb_code := COALESCE(p_department_or_code, 'IX-SB-PROV');
    ELSIF p_role = 'super_admin' THEN
        v_dept := 'Executive Directorate';
    END IF;

    INSERT INTO public.profiles (id, full_name, email, role, staff_department, sub_broker_code, is_active)
    VALUES (target_user_id, p_full_name, LOWER(TRIM(p_email)), p_role, v_dept, v_sb_code, TRUE)
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        staff_department = EXCLUDED.staff_department,
        sub_broker_code = EXCLUDED.sub_broker_code,
        is_active = TRUE,
        updated_at = NOW();

    INSERT INTO public.audit_logs (actor_name, actor_role, action, entity_type, entity_id, details)
    VALUES (
        COALESCE(auth.email(), 'SYSTEM_ADMIN'),
        COALESCE(public.current_user_role()::TEXT, 'super_admin'),
        'USER_ROLE_PROVISIONED',
        'profiles',
        target_user_id::TEXT,
        format('Account %s provisioned with role %s by authorized administrator.', p_email, p_role)
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'user_id', target_user_id,
        'role', p_role,
        'email', p_email
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 24. AUTOMATIC NEW USER ONBOARDING TRIGGER
-- (Never trust user metadata for role elevation; default to inactive staff)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, is_active)
    VALUES (
        NEW.id,
        split_part(NEW.email, '@', 1),
        LOWER(TRIM(NEW.email)),
        'staff'::user_role,
        FALSE -- Default inactive: Must be activated by Super Admin
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 25. STORAGE BUCKET CONFIGURATION (Secure Private Vault)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    FALSE, -- Private bucket: access only via signed URLs or authenticated RLS
    10485760, -- 10 MB maximum per file
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 10485760,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Object RLS Policies
DROP POLICY IF EXISTS "Document Objects SELECT" ON storage.objects;
CREATE POLICY "Document Objects SELECT"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'documents' AND (
            public.current_user_role() IN ('super_admin', 'staff') OR
            owner = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Document Objects INSERT" ON storage.objects;
CREATE POLICY "Document Objects INSERT"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'documents' AND
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Document Objects DELETE (Super Admin Only)" ON storage.objects;
CREATE POLICY "Document Objects DELETE (Super Admin Only)"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'documents' AND
        public.current_user_role() = 'super_admin'
    );
