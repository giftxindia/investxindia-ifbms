import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Checks whether legitimate, non-placeholder Supabase credentials are configured
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (
    supabaseUrl.includes('your-project-id') ||
    supabaseUrl.includes('your-project.supabase.co') ||
    supabaseAnonKey.includes('your-anon-public-key') ||
    supabaseAnonKey.includes('...')
  ) {
    return false;
  }
  return true;
}

/**
 * Singleton Supabase Client instance
 * Initialized only when configured or with safe fallback
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-ifbms.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export interface ConnectionTestResult {
  isConfigured: boolean;
  canReachServer: boolean;
  tablesVerified: boolean;
  message: string;
  details?: Record<string, any>;
}

/**
 * Tests live connection against the configured Supabase instance
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      canReachServer: false,
      tablesVerified: false,
      message: 'Supabase credentials not configured in environment (Local Sandbox Mode active).',
      details: {
        configuredUrl: supabaseUrl || 'Missing',
        hasAnonKey: Boolean(supabaseAnonKey),
      },
    };
  }

  try {
    // Ping profiles or providers table
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      return {
        isConfigured: true,
        canReachServer: true,
        tablesVerified: false,
        message: `Connected to Supabase URL, but query returned: ${error.message}. Ensure SQL migrations have been executed.`,
        details: error,
      };
    }

    return {
      isConfigured: true,
      canReachServer: true,
      tablesVerified: true,
      message: 'Successfully connected to production Supabase PostgreSQL database!',
      details: {
        url: supabaseUrl,
        recordsFound: data,
      },
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      canReachServer: false,
      tablesVerified: false,
      message: `Failed to connect to Supabase: ${err.message}`,
      details: err,
    };
  }
}
