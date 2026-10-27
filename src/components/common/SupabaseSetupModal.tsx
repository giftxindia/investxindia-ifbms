import React, { useState } from 'react';
import { Modal } from './Modal';
import {
  Database,
  Check,
  Copy,
  Shield,
  Key,
  Server,
  Terminal,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Layers,
  Lock,
} from 'lucide-react';
import { testSupabaseConnection, isSupabaseConfigured, ConnectionTestResult } from '../../services/supabaseClient';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'sql' | 'admin' | 'tests'>('status');
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const isConfigured = isSupabaseConfigured();

  const envSample = `# Investxindia IFBMS Supabase Configuration (Client-safe)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Server-only (for scripts/provision-admin.ts only; never put in client bundle)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
INITIAL_SUPER_ADMIN_EMAIL="info.investxindia@gmail.com"
INITIAL_SUPER_ADMIN_PASSWORD="Investx@Admin2026!"`;

  const adminSQLSample = `-- Run in Supabase SQL Editor AFTER user signs up:
SELECT public.provision_first_admin(
    'info.investxindia@gmail.com',
    'Rajiv Malhotra (Executive Super Admin)'
);`;

  const runTest = async () => {
    setIsTesting(true);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const copyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase Production Foundation (Stage 2)"
      subtitle="Database connection status, 17-table schema, and first-admin security provisioning"
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-slate-600 font-medium">
              {isConfigured ? 'Credentials Detected (Run Connection Test)' : 'Local Sandbox Mode Active'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-xs text-slate-600">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveSubTab('status')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeSubTab === 'status'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            1. Live Connection Diagnostic
          </button>
          <button
            onClick={() => setActiveSubTab('sql')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeSubTab === 'sql'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            2. SQL Migrations (17 Tables)
          </button>
          <button
            onClick={() => setActiveSubTab('admin')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeSubTab === 'admin'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            3. First Admin Provisioning
          </button>
          <button
            onClick={() => setActiveSubTab('tests')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              activeSubTab === 'tests'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            4. Automated RLS Test Suite
          </button>
        </div>

        {/* TAB 1: CONNECTION DIAGNOSTIC */}
        {activeSubTab === 'status' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-slate-50 border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Supabase Live Integration Status
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    In compliance with financial software audit rules, the system never claims a database is live before real credentials are provided and tested.
                  </p>
                </div>
                <button
                  onClick={runTest}
                  disabled={isTesting}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              {testResult ? (
                <div
                  className={`p-3 rounded border text-xs ${
                    testResult.tablesVerified
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : testResult.canReachServer
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {testResult.tablesVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white border border-slate-200 rounded text-[11px] text-slate-500">
                  Click <strong>"Test Connection"</strong> to ping your configured Supabase project. If not configured, the app runs securely in Local Sandbox Mode using typed storage.
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-orange-600" />
                Required Environment Variables (.env)
              </h4>
              <div className="relative">
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
                  {envSample}
                </pre>
                <button
                  onClick={copyEnv}
                  className="absolute right-2 top-2 p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  title="Copy to clipboard"
                >
                  {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SQL MIGRATIONS */}
        {activeSubTab === 'sql' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  Production PostgreSQL Migration Schema
                </h4>
                <p className="text-[11px] text-slate-500">
                  Full DDL for all 17 tables, numeric monetary columns, foreign keys, timestamps, indexes, and RLS policies.
                </p>
              </div>
              <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded">
                supabase/migrations/20261022_ifbms_schema.sql
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                <strong>1. Identity & CRM:</strong> profiles, sub_brokers, clients, providers
              </div>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                <strong>2. Insurance:</strong> health_policies, motor_policies, life_policies
              </div>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                <strong>3. Investments:</strong> fixed_deposits, bonds, loans
              </div>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                <strong>4. Finance & Ops:</strong> brokerage_rules, brokerage_entries, payouts, targets, documents, import_jobs, audit_logs
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-[11px]">
              <strong>Execution Steps:</strong> Open your Supabase Dashboard -&gt; SQL Editor -&gt; New Query -&gt; Paste the script from <code className="font-mono">supabase/migrations/20261022_ifbms_schema.sql</code> and click <strong>Run</strong>.
            </div>
          </div>
        )}

        {/* TAB 3: FIRST ADMIN PROVISIONING */}
        {activeSubTab === 'admin' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-orange-600" />
                Trusted First-Admin Provisioning Procedure
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                To prevent privilege escalation, user roles cannot be changed from browser code. The first super_admin must be provisioned via one of two trusted server-side mechanisms:
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-semibold text-slate-900 block mb-1">
                  Option A: CLI Trusted Script (Using service_role key)
                </span>
                <p className="text-[11px] text-slate-500 mb-2">
                  Run this terminal command in your repository where <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> is set in .env:
                </p>
                <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded font-mono text-[11px] overflow-x-auto">
                  npx tsx scripts/provision-admin.ts info.investxindia@gmail.com "Investx@Admin2026!" "Rajiv Malhotra"
                </pre>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-semibold text-slate-900 block mb-1">
                  Option B: Supabase SQL Function
                </span>
                <p className="text-[11px] text-slate-500 mb-2">
                  After signing up with your email, execute this query directly in the Supabase SQL Editor:
                </p>
                <pre className="p-2.5 bg-slate-900 text-slate-200 rounded font-mono text-[11px] overflow-x-auto">
                  {adminSQLSample}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RLS TESTS */}
        {activeSubTab === 'tests' && (
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                Automated Row Level Security (RLS) Verification
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                The test suite in <code className="font-mono">supabase/tests/rls_tests.sql</code> verifies that:
              </p>
            </div>

            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
              <li>All 17 tables have RLS actively enabled.</li>
              <li>Security helper functions (<code className="font-mono">current_user_role()</code>) are strictly <code className="font-mono">SECURITY DEFINER</code>.</li>
              <li>The <code className="font-mono">trg_prevent_role_elevation</code> trigger rejects non-admin role modifications.</li>
              <li>Sub-broker isolation policies restrict records to assigned <code className="font-mono">sub_broker_id</code>.</li>
              <li>Audit logs have zero UPDATE or DELETE grants (Append-Only immutability).</li>
            </ul>

            <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px]">
              <div># Run in Supabase SQL Editor:</div>
              <div className="text-emerald-400">\i supabase/tests/rls_tests.sql</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
