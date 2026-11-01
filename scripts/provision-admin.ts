/**
 * Trusted Server-Side Script: First Super Admin Provisioning
 * Investxindia Corporate Distribution Pvt. Ltd. (IFBMS)
 * 
 * SECURITY NOTICE:
 * This script runs strictly in a trusted Node.js/server-side environment.
 * It uses the SUPABASE_SERVICE_ROLE_KEY to bootstrap the initial executive super_admin
 * account. This key MUST NEVER be bundled or exposed to frontend client code.
 * 
 * Usage:
 * npx tsx scripts/provision-admin.ts [email] [password] [fullName]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const targetEmail = process.argv[2] || process.env.INITIAL_SUPER_ADMIN_EMAIL || 'info.investxindia@gmail.com';
const targetPassword = process.argv[3] || process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'Investx@Admin2026!';
const targetName = process.argv[4] || 'Rajiv Malhotra (Executive Super Admin)';

async function provisionSuperAdmin() {
  console.log('=======================================================');
  console.log('INVESTXINDIA IFBMS: FIRST SUPER ADMIN PROVISIONING');
  console.log('=======================================================');

  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project-id')) {
    console.error('❌ Error: VITE_SUPABASE_URL / SUPABASE_URL is not configured in .env');
    process.exit(1);
  }

  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.includes('...')) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is required for server-side admin provisioning.');
    console.error('Get this from Supabase Dashboard -> Project Settings -> API -> service_role key.');
    process.exit(1);
  }

  console.log(`Connecting securely to: ${SUPABASE_URL}`);
  console.log(`Target Super Admin: ${targetEmail} (${targetName})`);

  // Create admin client with service_role privileges
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Check if user already exists in auth.users
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      throw listError;
    }

    let existingUser = usersData.users.find((u) => u.email === targetEmail);
    let userId: string;

    if (!existingUser) {
      console.log('Creating auth user in auth.users...');
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email: targetEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          full_name: targetName,
          role: 'super_admin',
        },
      });

      if (createError) throw createError;
      existingUser = createData.user;
      userId = existingUser.id;
      console.log(`✅ Auth user created with UID: ${userId}`);
    } else {
      userId = existingUser.id;
      console.log(`ℹ️ Auth user already exists with UID: ${userId}`);
    }

    // 2. Upsert profile with super_admin role
    console.log('Upserting profile with verified super_admin role...');
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        full_name: targetName,
        email: targetEmail,
        role: 'super_admin',
        staff_department: 'Executive Directorate',
        is_active: true,
      }, { onConflict: 'id' });

    if (profileError) {
      throw profileError;
    }

    // 3. Record audit log
    await adminClient.from('audit_logs').insert({
      actor_name: targetName,
      actor_role: 'super_admin',
      action: 'SERVER_BOOTSTRAP_FIRST_ADMIN',
      entity_type: 'profiles',
      entity_id: userId,
      details: `Idempotently provisioned first super_admin user ${targetEmail} via server bootstrap.`,
    });

    console.log('=======================================================');
    console.log('✅ FIRST SUPER ADMIN PROVISIONED SUCCESSFULLY!');
    console.log(`Email: ${targetEmail}`);
    console.log(`Role:  super_admin`);
    console.log('You can now log in via the Supabase Auth panel in IFBMS.');
    console.log('=======================================================');
  } catch (err: any) {
    console.error('❌ Provisioning failed:', err.message);
    process.exit(1);
  }
}

provisionSuperAdmin();
