-- ============================================================================
-- INVESTXINDIA FINANCIAL BUSINESS MANAGEMENT SYSTEM (IFBMS)
-- Production Supabase PostgreSQL Schema & Security Architecture (Stage 2)
-- Investxindia Corporate Distribution Pvt. Ltd.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAIN TYPES
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

-- 3. PROFILES TABLE (Linked directly to auth.users)
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

-- 4. SUB-BROKERS TABLE
CREATE TABLE IF NOT EXISTS public.sub_brokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sub_broker_code TEXT UNIQUE NOT NULL, -- e.g. IX-SB-101
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pan_masked TEXT NOT NULL,
    amfi_or_rera_no TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'Standard',
    default_payout_share_pct NUMERIC(5,2) NOT NULL DEFAULT 70.00 CHECK (default_payout_share_pct >= 0 AND default_payout_share_pct <= 100),
    bank_account_masked TEXT NOT NULL,
    bank_ifsc TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code TEXT UNIQUE NOT NULL, -- e.g. IX-CL-1001
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

-- 6. PROVIDERS TABLE (Configurable Financial Institutions)
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

-- 7. HEALTH POLICIES TABLE
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

-- 8. MOTOR POLICIES TABLE
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

-- 9. LIFE POLICIES TABLE
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

-- 10. FIXED DEPOSITS TABLE
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

-- 11. BONDS & NCDS TABLE
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

-- 12. LOANS TABLE
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

-- 13. BROKERAGE RULES TABLE
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

-- 14. BROKERAGE ENTRIES / TRANSACTION LEDGER TABLE
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
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. PAYOUTS TABLE
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_batch_no TEXT UNIQUE NOT NULL,
    sub_broker_id UUID NOT NULL REFERENCES public.sub_brokers(id) ON DELETE RESTRICT,
    sub_broker_name TEXT NOT NULL,
    sub_broker_code TEXT NOT NULL,
    period TEXT NOT NULL,
    transaction_count INT NOT NULL DEFAULT 0 CHECK (transaction_count >= 0),
    gross_payable NUMERIC(14,2) NOT NULL CHECK (gross_payable >= 0),
    tds_deducted NUMERIC(12,2) NOT NULL CHECK (tds_deducted >= 0),
    net_disbursed NUMERIC(14,2) NOT NULL CHECK (net_disbursed >= 0),
    payment_mode TEXT NOT NULL DEFAULT 'RTGS' CHECK (payment_mode IN ('NEFT', 'RTGS', 'IMPS', 'Direct Transfer')),
    bank_reference_no TEXT NOT NULL,
    disbursement_date DATE,
    status payout_status NOT NULL DEFAULT 'pending_approval',
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. TARGETS TABLE
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

-- 17. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    document_category TEXT NOT NULL CHECK (document_category IN ('KYC', 'Policy Copy', 'Proposal Form', 'Mandate', 'Brokerage Agreement', 'Payout Advice')),
    related_entity TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('Client', 'Sub-Broker', 'Policy', 'Payout')),
    entity_id UUID,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- 18. IMPORT JOBS TABLE
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INT NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    valid_rows INT NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
    invalid_rows INT NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_log JSONB DEFAULT '[]'::JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. AUDIT LOGS TABLE
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

-- 20. SECURITY DEFINER HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_sub_broker_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT id FROM public.sub_brokers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforce_role_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF public.current_user_role() != 'super_admin' THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Administrators can alter user account roles.';
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

-- 21. ENABLE RLS ON ALL TABLES
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

-- 22. POLICIES
CREATE POLICY "Profiles viewable by self, staff, or super_admin" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.current_user_role() IN ('super_admin', 'staff'));
CREATE POLICY "Profiles updatable by self or super_admin" ON public.profiles FOR UPDATE USING (public.current_user_role() = 'super_admin' OR auth.uid() = id);

CREATE POLICY "Sub-Brokers viewable by staff or self" ON public.sub_brokers FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR user_id = auth.uid());
CREATE POLICY "Sub-Brokers manage by super_admin" ON public.sub_brokers FOR ALL USING (public.current_user_role() = 'super_admin');

CREATE POLICY "Clients SELECT" ON public.clients FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Clients INSERT" ON public.clients FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Clients UPDATE" ON public.clients FOR UPDATE USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Clients DELETE (Super Admin Only)" ON public.clients FOR DELETE USING (public.current_user_role() = 'super_admin');

CREATE POLICY "Providers SELECT" ON public.providers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Providers WRITE" ON public.providers FOR ALL USING (public.current_user_role() = 'super_admin');

CREATE POLICY "Health Policies SELECT" ON public.health_policies FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Health Policies INSERT" ON public.health_policies FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Health Policies UPDATE" ON public.health_policies FOR UPDATE USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

CREATE POLICY "Motor Policies SELECT" ON public.motor_policies FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Motor Policies INSERT" ON public.motor_policies FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Motor Policies UPDATE" ON public.motor_policies FOR UPDATE USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

CREATE POLICY "Life Policies SELECT" ON public.life_policies FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Life Policies INSERT" ON public.life_policies FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Life Policies UPDATE" ON public.life_policies FOR UPDATE USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

CREATE POLICY "Fixed Deposits SELECT" ON public.fixed_deposits FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Fixed Deposits INSERT" ON public.fixed_deposits FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

CREATE POLICY "Bonds SELECT" ON public.bonds FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Bonds INSERT" ON public.bonds FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());

CREATE POLICY "Loans SELECT" ON public.loans FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Loans INSERT" ON public.loans FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Loans UPDATE" ON public.loans FOR UPDATE USING (public.current_user_role() IN ('super_admin', 'staff'));

CREATE POLICY "Brokerage Rules SELECT" ON public.brokerage_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Brokerage Rules WRITE (Super Admin Only)" ON public.brokerage_rules FOR ALL USING (public.current_user_role() = 'super_admin');

CREATE POLICY "Brokerage Entries SELECT" ON public.brokerage_entries FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Brokerage Entries WRITE" ON public.brokerage_entries FOR ALL USING (public.current_user_role() IN ('super_admin', 'staff'));

CREATE POLICY "Payouts SELECT" ON public.payouts FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR sub_broker_id = public.current_sub_broker_id());
CREATE POLICY "Payouts WRITE (Super Admin Only)" ON public.payouts FOR ALL USING (public.current_user_role() = 'super_admin');

CREATE POLICY "Targets SELECT" ON public.targets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Targets WRITE" ON public.targets FOR ALL USING (public.current_user_role() = 'super_admin');

CREATE POLICY "Documents SELECT" ON public.documents FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff') OR uploaded_by = auth.email());
CREATE POLICY "Documents INSERT" ON public.documents FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Import Jobs SELECT" ON public.import_jobs FOR SELECT USING (public.current_user_role() IN ('super_admin', 'staff'));
CREATE POLICY "Import Jobs INSERT" ON public.import_jobs FOR INSERT WITH CHECK (public.current_user_role() IN ('super_admin', 'staff'));

CREATE POLICY "Audit Logs SELECT (Super Admin Only)" ON public.audit_logs FOR SELECT USING (public.current_user_role() = 'super_admin');
CREATE POLICY "Audit Logs INSERT" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 23. TRUSTED FIRST ADMIN PROVISIONING FUNCTION
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
    SELECT id INTO target_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'pending_user_signup',
            'message', 'User must first sign up via Supabase Auth. Once signed up, run this function again to assign super_admin role.',
            'target_email', p_email
        );
    END IF;

    INSERT INTO public.profiles (id, full_name, email, role, staff_department, is_active)
    VALUES (target_user_id, p_full_name, p_email, 'super_admin', 'Executive Directorate', TRUE)
    ON CONFLICT (id) DO UPDATE SET
        role = 'super_admin',
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    INSERT INTO public.audit_logs (actor_name, actor_role, action, entity_type, entity_id, details)
    VALUES (p_full_name, 'super_admin', 'FIRST_SUPER_ADMIN_PROVISIONED', 'profiles', target_user_id::TEXT, 'Initial executive root administrator provisioned.');

    RETURN jsonb_build_object(
        'status', 'success',
        'user_id', target_user_id,
        'role', 'super_admin',
        'email', p_email
    );
END;
$$;
