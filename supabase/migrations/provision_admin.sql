-- ============================================================================
-- INVESTXINDIA IFBMS — INITIAL SUPER ADMIN PROVISIONING SCRIPT
-- Execute in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Target Admin Email: info.investxindia@gmail.com
-- ============================================================================

-- Step 1: Ensure user_role type exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'staff', 'sub_broker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Ensure public.profiles table exists and has RLS enabled
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Define or Replace the Server-Authoritative Provisioning Function
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
    -- Query the user directly from Supabase auth.users table
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE LOWER(email) = LOWER(TRIM(p_email)) 
    LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'User account was not found in auth.users. Please create the user in Supabase Authentication > Users first, then re-run this script.',
            'target_email', p_email
        );
    END IF;

    -- Upsert the authoritative profile row with super_admin role
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

    -- Ensure an audit log entry is recorded
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        INSERT INTO public.audit_logs (actor_name, actor_role, action, entity_type, entity_id, details)
        VALUES (
            p_full_name, 
            'super_admin', 
            'FIRST_SUPER_ADMIN_PROVISIONED', 
            'profiles', 
            target_user_id::TEXT, 
            'Initial executive Super Admin account authorized in public.profiles.'
        );
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'message', 'Super Admin role successfully assigned and activated in public.profiles.',
        'user_id', target_user_id,
        'role', 'super_admin',
        'email', p_email
    );
END;
$$;

-- Step 4: Execute the Provisioning for the First Admin
SELECT public.provision_first_admin(
    'info.investxindia@gmail.com',
    'Rahul Pandey (Executive Super Admin)'
);

-- Step 5: Verification Query
SELECT 
    p.id AS profile_uuid,
    p.full_name,
    p.email,
    p.role AS database_verified_role,
    p.is_active AS account_active,
    u.email_confirmed_at,
    u.last_sign_in_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE LOWER(p.email) = 'info.investxindia@gmail.com';
