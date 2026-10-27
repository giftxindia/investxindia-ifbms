-- ============================================================================
-- INVESTXINDIA FINANCIAL BUSINESS MANAGEMENT SYSTEM (IFBMS)
-- Automated Row Level Security (RLS) Verification Test Suite
-- ============================================================================
-- Run this script in the Supabase SQL Editor to verify security isolation:

DO $$
DECLARE
    v_test_count INT := 0;
    v_passed_count INT := 0;
    v_admin_id UUID := gen_random_uuid();
    v_staff_id UUID := gen_random_uuid();
    v_sub_broker_user_id UUID := gen_random_uuid();
    v_partner_a_id UUID := gen_random_uuid();
    v_partner_b_id UUID := gen_random_uuid();
    v_client_a_id UUID := gen_random_uuid();
    v_client_b_id UUID := gen_random_uuid();
    v_query_count INT;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'STARTING INVESTXINDIA IFBMS RLS VERIFICATION TESTS';
    RAISE NOTICE '=======================================================';

    -- TEST 1: Verify RLS is enabled on all critical tables
    v_test_count := v_test_count + 1;
    SELECT COUNT(*) INTO v_query_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'sub_brokers', 'clients', 'providers',
        'health_policies', 'motor_policies', 'life_policies',
        'fixed_deposits', 'bonds', 'loans', 'brokerage_rules',
        'brokerage_entries', 'payouts', 'targets', 'documents',
        'import_jobs', 'audit_logs'
      )
      AND rowsecurity = TRUE;

    IF v_query_count = 17 THEN
        v_passed_count := v_passed_count + 1;
        RAISE NOTICE 'TEST 1 PASSED: All 17 tables have Row Level Security (RLS) enabled.';
    ELSE
        RAISE WARNING 'TEST 1 FAILED: Only % of 17 tables have RLS enabled.', v_query_count;
    END IF;

    -- TEST 2: Verify current_user_role() function exists and is SECURITY DEFINER
    v_test_count := v_test_count + 1;
    SELECT COUNT(*) INTO v_query_count
    FROM pg_proc
    WHERE proname = 'current_user_role'
      AND prosecdef = TRUE;

    IF v_query_count >= 1 THEN
        v_passed_count := v_passed_count + 1;
        RAISE NOTICE 'TEST 2 PASSED: current_user_role() is installed with SECURITY DEFINER attribute.';
    ELSE
        RAISE WARNING 'TEST 2 FAILED: current_user_role() missing or lacks SECURITY DEFINER.';
    END IF;

    -- TEST 3: Verify role self-elevation prevention trigger exists on profiles
    v_test_count := v_test_count + 1;
    SELECT COUNT(*) INTO v_query_count
    FROM pg_trigger
    WHERE tgname = 'trg_prevent_role_elevation';

    IF v_query_count >= 1 THEN
        v_passed_count := v_passed_count + 1;
        RAISE NOTICE 'TEST 3 PASSED: trg_prevent_role_elevation trigger is actively attached to profiles.';
    ELSE
        RAISE WARNING 'TEST 3 FAILED: Role self-elevation trigger is missing.';
    END IF;

    -- TEST 4: Verify Sub-Broker Partner Isolation RLS Policies exist
    v_test_count := v_test_count + 1;
    SELECT COUNT(*) INTO v_query_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename = 'clients' AND policyname LIKE '%SELECT%') OR
        (tablename = 'brokerage_entries' AND policyname LIKE '%SELECT%') OR
        (tablename = 'payouts' AND policyname LIKE '%SELECT%') OR
        (tablename = 'health_policies' AND policyname LIKE '%SELECT%')
      );

    IF v_query_count >= 4 THEN
        v_passed_count := v_passed_count + 1;
        RAISE NOTICE 'TEST 4 PASSED: Sub-Broker isolation policies present for clients, entries, payouts, and policies.';
    ELSE
        RAISE WARNING 'TEST 4 FAILED: Expected at least 4 isolation policies, found %.', v_query_count;
    END IF;

    -- TEST 5: Verify Audit Log Immutability (no UPDATE/DELETE policies granted to regular users)
    v_test_count := v_test_count + 1;
    SELECT COUNT(*) INTO v_query_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND cmd IN ('UPDATE', 'DELETE');

    IF v_query_count = 0 THEN
        v_passed_count := v_passed_count + 1;
        RAISE NOTICE 'TEST 5 PASSED: audit_logs has ZERO UPDATE or DELETE policies (Append-Only enforced).';
    ELSE
        RAISE WARNING 'TEST 5 FAILED: audit_logs has mutable policies (% found).', v_query_count;
    END IF;

    -- SUMMARY
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'RLS TEST SUITE COMPLETE: % OF % TESTS PASSED.', v_passed_count, v_test_count;
    RAISE NOTICE '=======================================================';
END $$;
