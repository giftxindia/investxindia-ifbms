import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Sanitizes an environment variable value by trimming whitespace and removing
 * surrounding single or double quotes accidentally added in hosting dashboards.
 */
function sanitizeEnvValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  let clean = val.trim();
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

/**
 * Normalizes a Supabase base URL to strictly its protocol + host origin (e.g. https://xxxx.supabase.co).
 * 
 * CRITICAL FIX FOR PGRST125 ("Invalid path specified in request URL"):
 * When users configure Vercel with the REST URL (https://xxxx.supabase.co/rest/v1) or AUTH URL
 * (https://xxxx.supabase.co/auth/v1) instead of the bare Project URL, the Supabase JS SDK internally
 * appends its own /auth/v1 and /rest/v1 segments. This creates invalid duplicate paths such as:
 * https://xxxx.supabase.co/rest/v1/auth/v1/token
 * resulting in Supabase's API Gateway (Kong/PostgREST) returning:
 * {"code":"PGRST125","message":"Invalid path specified in request URL"}
 * 
 * This function guarantees that only the canonical base origin is passed to createClient.
 */
export function normalizeSupabaseUrl(rawUrl: string): {
  cleanUrl: string;
  originalUrl: string;
  pathCorrectionApplied: boolean;
  correctionDetail?: string;
} {
  const sanitized = sanitizeEnvValue(rawUrl);
  if (!sanitized) {
    return { cleanUrl: '', originalUrl: '', pathCorrectionApplied: false };
  }

  try {
    const parsed = new URL(sanitized);
    const origin = `${parsed.protocol}//${parsed.host}`;
    const pathname = parsed.pathname.replace(/\/+$/, ''); // Strip trailing slashes

    if (pathname && pathname !== '') {
      return {
        cleanUrl: origin,
        originalUrl: sanitized,
        pathCorrectionApplied: true,
        correctionDetail: `Automatically stripped subpath "${pathname}" from Supabase Project URL. The Supabase SDK handles /auth/v1 and /rest/v1 internally.`,
      };
    }

    return {
      cleanUrl: origin,
      originalUrl: sanitized,
      pathCorrectionApplied: false,
    };
  } catch {
    // Fallback regex cleaning if URL constructor encounters non-standard strings
    const cleaned = sanitized
      .replace(/\/rest\/v1\/?$/i, '')
      .replace(/\/auth\/v1\/?$/i, '')
      .replace(/\/storage\/v1\/?$/i, '')
      .replace(/\/+$/, '');

    return {
      cleanUrl: cleaned,
      originalUrl: sanitized,
      pathCorrectionApplied: cleaned !== sanitized,
      correctionDetail: cleaned !== sanitized ? 'Stripped trailing API path segment' : undefined,
    };
  }
}

/**
 * Resolves the Supabase URL across standard Vite and Vercel naming conventions.
 */
function resolveSupabaseUrl(): {
  url: string;
  source: string;
  originalUrl: string;
  pathCorrectionApplied: boolean;
  correctionDetail?: string;
} {
  let rawUrl = '';
  let source = 'none';

  // 1. Standard Vite client-prefixed variable
  const viteUrl = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
  if (viteUrl) {
    rawUrl = viteUrl;
    source = 'VITE_SUPABASE_URL';
  } else {
    // 2. Vercel Supabase Integration standard variable (when exposed via envPrefix)
    const directUrl = sanitizeEnvValue((import.meta.env as any).SUPABASE_URL);
    if (directUrl) {
      rawUrl = directUrl;
      source = 'SUPABASE_URL';
    } else {
      // 3. Next.js / Universal public variable
      const nextUrl = sanitizeEnvValue((import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL);
      if (nextUrl) {
        rawUrl = nextUrl;
        source = 'NEXT_PUBLIC_SUPABASE_URL';
      } else if (typeof process !== 'undefined' && process.env) {
        // 4. Runtime or process.env fallback (if inlined by build system)
        const procVite = sanitizeEnvValue(process.env.VITE_SUPABASE_URL);
        if (procVite) {
          rawUrl = procVite;
          source = 'process.env.VITE_SUPABASE_URL';
        } else {
          const procDirect = sanitizeEnvValue(process.env.SUPABASE_URL);
          if (procDirect) {
            rawUrl = procDirect;
            source = 'process.env.SUPABASE_URL';
          }
        }
      } else if (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_SUPABASE_URL) {
        // 5. Global browser window fallback
        rawUrl = sanitizeEnvValue((window as any).__ENV__.VITE_SUPABASE_URL);
        source = 'window.__ENV__.VITE_SUPABASE_URL';
      }
    }
  }

  const norm = normalizeSupabaseUrl(rawUrl);
  return {
    url: norm.cleanUrl,
    source,
    originalUrl: norm.originalUrl,
    pathCorrectionApplied: norm.pathCorrectionApplied,
    correctionDetail: norm.correctionDetail,
  };
}

/**
 * Resolves the Supabase Anon / Publishable Key across standard naming conventions.
 */
function resolveSupabaseAnonKey(): { key: string; source: string } {
  // 1. Standard Vite client-prefixed anon key
  const viteKey = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
  if (viteKey) return { key: viteKey, source: 'VITE_SUPABASE_ANON_KEY' };

  // 2. Standard Vite publishable key convention
  const vitePubKey = sanitizeEnvValue((import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY);
  if (vitePubKey) return { key: vitePubKey, source: 'VITE_SUPABASE_PUBLISHABLE_KEY' };

  // 3. Vercel Supabase Integration direct key
  const directKey = sanitizeEnvValue((import.meta.env as any).SUPABASE_ANON_KEY);
  if (directKey) return { key: directKey, source: 'SUPABASE_ANON_KEY' };

  // 4. Next.js public variable
  const nextKey = sanitizeEnvValue((import.meta.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (nextKey) return { key: nextKey, source: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' };

  // 5. Runtime or process.env fallback
  if (typeof process !== 'undefined' && process.env) {
    const procVite = sanitizeEnvValue(process.env.VITE_SUPABASE_ANON_KEY);
    if (procVite) return { key: procVite, source: 'process.env.VITE_SUPABASE_ANON_KEY' };

    const procDirect = sanitizeEnvValue(process.env.SUPABASE_ANON_KEY);
    if (procDirect) return { key: procDirect, source: 'process.env.SUPABASE_ANON_KEY' };
  }

  // 6. Global browser window fallback
  if (typeof window !== 'undefined' && (window as any).__ENV__?.VITE_SUPABASE_ANON_KEY) {
    return {
      key: sanitizeEnvValue((window as any).__ENV__.VITE_SUPABASE_ANON_KEY),
      source: 'window.__ENV__.VITE_SUPABASE_ANON_KEY',
    };
  }

  return { key: '', source: 'none' };
}

const resolvedUrlResult = resolveSupabaseUrl();
const resolvedKeyResult = resolveSupabaseAnonKey();

export const supabaseUrl = resolvedUrlResult.url;
export const supabaseAnonKey = resolvedKeyResult.key;

/**
 * Diagnostic tracking for recent requests without exposing keys or credentials
 */
export interface EndpointDiagnostic {
  method: string;
  path: string;
  status: number;
  errorMessage?: string;
  timestamp: string;
}

let lastEndpointDiagnostic: EndpointDiagnostic | null = null;

export function getLastEndpointDiagnostic(): EndpointDiagnostic | null {
  return lastEndpointDiagnostic;
}

/**
 * Custom safe fetch wrapper to trace and diagnose endpoint paths
 */
const diagnosticFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
  let pathOnly = '';
  try {
    const parsed = new URL(urlStr);
    pathOnly = parsed.pathname;
  } catch {
    pathOnly = urlStr;
  }

  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      let errMsg = '';
      try {
        const cloned = response.clone();
        const bodyText = await cloned.text();
        try {
          const json = JSON.parse(bodyText);
          errMsg = json.message || json.error_description || json.error || bodyText;
        } catch {
          errMsg = bodyText.slice(0, 150);
        }
      } catch {
        errMsg = `HTTP ${response.status} ${response.statusText}`;
      }

      lastEndpointDiagnostic = {
        method: init?.method || 'GET',
        path: pathOnly,
        status: response.status,
        errorMessage: errMsg,
        timestamp: new Date().toISOString(),
      };

      if (errMsg.includes('Invalid path specified in request URL') || errMsg.includes('PGRST125')) {
        console.error(
          `[IFBMS Supabase Diagnostic] Route "${pathOnly}" returned PGRST125 / Invalid Path. Targeted URL was "${urlStr.split('?')[0]}". Base URL must strictly be the origin without any subpaths.`
        );
      }
    }
    return response;
  } catch (err: any) {
    lastEndpointDiagnostic = {
      method: init?.method || 'GET',
      path: pathOnly,
      status: 0,
      errorMessage: err?.message || 'Network transport error',
      timestamp: new Date().toISOString(),
    };
    throw err;
  }
};

export interface SupabaseConfigDiagnostics {
  isConfigured: boolean;
  urlStatus: 'configured' | 'missing' | 'placeholder' | 'malformed';
  keyStatus: 'configured' | 'missing' | 'placeholder' | 'malformed';
  urlSource: string;
  keySource: string;
  maskedUrl: string;
  keyInfo: string;
  pathCorrectionApplied: boolean;
  pathCorrectionDetail?: string;
  missingVariables: string[];
  remedyGuidance: string[];
}

/**
 * Safely inspects the Supabase configuration and returns diagnostic status
 * WITHOUT EVER EXPOSING sensitive keys or tokens.
 */
export function getSupabaseConfigDiagnostics(): SupabaseConfigDiagnostics {
  const missing: string[] = [];
  const guidance: string[] = [];

  let urlStatus: SupabaseConfigDiagnostics['urlStatus'] = 'missing';
  let keyStatus: SupabaseConfigDiagnostics['keyStatus'] = 'missing';
  let maskedUrl = 'Not configured';
  let keyInfo = 'Not configured';

  // Evaluate URL
  if (!supabaseUrl) {
    urlStatus = 'missing';
    missing.push('VITE_SUPABASE_URL');
    guidance.push('Add VITE_SUPABASE_URL in Vercel Project Settings > Environment Variables.');
  } else if (
    supabaseUrl.includes('your-project-id') ||
    supabaseUrl.includes('your-project.supabase.co') ||
    supabaseUrl.includes('placeholder-ifbms')
  ) {
    urlStatus = 'placeholder';
    missing.push('VITE_SUPABASE_URL (has placeholder value)');
    guidance.push('Replace placeholder URL with your real Supabase project URL (https://<project-ref>.supabase.co).');
  } else if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    urlStatus = 'malformed';
    guidance.push('VITE_SUPABASE_URL must start with https:// (e.g. https://xxxx.supabase.co).');
  } else {
    urlStatus = 'configured';
    try {
      const parsed = new URL(supabaseUrl);
      const hostParts = parsed.hostname.split('.');
      if (hostParts.length >= 3) {
        const ref = hostParts[0];
        const maskedRef = ref.length > 4 ? `${ref.slice(0, 4)}****` : '****';
        maskedUrl = `${parsed.protocol}//${maskedRef}.${hostParts.slice(1).join('.')}`;
      } else {
        maskedUrl = `${parsed.protocol}//${parsed.hostname}`;
      }
    } catch {
      maskedUrl = 'Valid URL (custom domain)';
    }
  }

  // Evaluate Anon Key (WITHOUT EVER PRINTING KEY CHARACTERS)
  if (!supabaseAnonKey) {
    keyStatus = 'missing';
    missing.push('VITE_SUPABASE_ANON_KEY');
    guidance.push('Add VITE_SUPABASE_ANON_KEY in Vercel Project Settings > Environment Variables.');
  } else if (
    supabaseAnonKey.includes('your-anon-public-key') ||
    supabaseAnonKey === 'placeholder-anon-key' ||
    supabaseAnonKey.endsWith('...')
  ) {
    keyStatus = 'placeholder';
    missing.push('VITE_SUPABASE_ANON_KEY (has placeholder text)');
    guidance.push('Replace placeholder key with your real Supabase anon/public API key (copy from Project Settings > API).');
  } else if (supabaseAnonKey.length < 20) {
    keyStatus = 'malformed';
    guidance.push('VITE_SUPABASE_ANON_KEY appears truncated or invalid (too short).');
  } else {
    keyStatus = 'configured';
    if (supabaseAnonKey.startsWith('eyJ')) {
      keyInfo = `Valid JWT Anon Key detected (${supabaseAnonKey.length} chars)`;
    } else if (supabaseAnonKey.startsWith('sb_publishable_')) {
      keyInfo = `Valid Supabase Publishable Key detected (${supabaseAnonKey.length} chars)`;
    } else {
      keyInfo = `Active key detected (${supabaseAnonKey.length} chars)`;
    }
  }

  if (resolvedUrlResult.pathCorrectionApplied) {
    guidance.push(
      resolvedUrlResult.correctionDetail ||
        'Path correction was automatically applied to ensure base URL does not contain /rest/v1 or /auth/v1 subpaths.'
    );
  }

  const isConfigured = urlStatus === 'configured' && keyStatus === 'configured';

  return {
    isConfigured,
    urlStatus,
    keyStatus,
    urlSource: resolvedUrlResult.source,
    keySource: resolvedKeyResult.source,
    maskedUrl,
    keyInfo,
    pathCorrectionApplied: resolvedUrlResult.pathCorrectionApplied,
    pathCorrectionDetail: resolvedUrlResult.correctionDetail,
    missingVariables: missing,
    remedyGuidance: guidance,
  };
}

/**
 * Checks whether legitimate, non-placeholder Supabase credentials are configured
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigDiagnostics().isConfigured;
}

/**
 * Singleton Supabase Client instance
 * Initialized with canonical origin URL, valid key, and diagnostic fetch interceptor
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
    global: {
      fetch: diagnosticFetch,
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
  const diag = getSupabaseConfigDiagnostics();

  if (!diag.isConfigured) {
    return {
      isConfigured: false,
      canReachServer: false,
      tablesVerified: false,
      message: `Supabase credentials not fully configured: ${diag.missingVariables.join(', ')}.`,
      details: {
        urlStatus: diag.urlStatus,
        keyStatus: diag.keyStatus,
        urlSource: diag.urlSource,
        keySource: diag.keySource,
        maskedUrl: diag.maskedUrl,
        keyInfo: diag.keyInfo,
        remedyGuidance: diag.remedyGuidance,
      },
    };
  }

  try {
    // Ping profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      return {
        isConfigured: true,
        canReachServer: true,
        tablesVerified: false,
        message: `Connected to Supabase (${diag.maskedUrl}), but query returned: ${error.message}. Ensure SQL migrations have been executed.`,
        details: {
          error: error.message,
          maskedUrl: diag.maskedUrl,
          pathCorrectionApplied: diag.pathCorrectionApplied,
          lastEndpointDiagnostic: getLastEndpointDiagnostic(),
        },
      };
    }

    return {
      isConfigured: true,
      canReachServer: true,
      tablesVerified: true,
      message: 'Successfully connected to production Supabase PostgreSQL database!',
      details: {
        maskedUrl: diag.maskedUrl,
        recordsFound: data,
        pathCorrectionApplied: diag.pathCorrectionApplied,
      },
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      canReachServer: false,
      tablesVerified: false,
      message: `Failed to connect to Supabase: ${err.message}`,
      details: {
        error: err.message,
        maskedUrl: diag.maskedUrl,
        lastEndpointDiagnostic: getLastEndpointDiagnostic(),
      },
    };
  }
}
