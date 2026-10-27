import React, { useState, useRef } from 'react';
import {
  Building2,
  Database,
  Shield,
  RotateCcw,
  Check,
  Copy,
  Server,
  Globe,
  Mail,
  Phone,
  ExternalLink,
  Download,
  Upload,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { dataStore } from '../services/mockData';
import { createDatabaseBackup, restoreDatabaseBackup, RestoreResult } from '../services/backupRestoreService';
import { UserRole } from '../types';

interface SettingsPageProps {
  userRole: UserRole;
  onOpenSupabaseModal: () => void;
  onOpenTestModal: () => void;
  onOpenAuditModal?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userRole,
  onOpenSupabaseModal,
  onOpenTestModal,
  onOpenAuditModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [restoreFeedback, setRestoreFeedback] = useState<RestoreResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResetData = () => {
    if (confirm('Reset all demo data back to default initial records? Any custom created records will be refreshed.')) {
      dataStore.resetDemoData();
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2500);
      window.location.reload();
    }
  };

  const handleCreateBackup = () => {
    try {
      const { backup, blob, filename } = createDatabaseBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalRecs = Object.values(backup.recordCounts).reduce((a, b) => a + b, 0);
      setBackupSuccessMsg(
        `Backup snapshot successfully created: ${filename} (${totalRecs} records, Checksum: ${backup.checksum.slice(0, 12)}...)`
      );
      setTimeout(() => setBackupSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(`Backup generation failed: ${err.message}`);
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = restoreDatabaseBackup(content, userRole);
        setRestoreFeedback(result);
        if (result.success) {
          setTimeout(() => {
            window.location.reload();
          }, 1800);
        }
      } catch (err: any) {
        setRestoreFeedback({
          success: false,
          message: `Restore parse error: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-base font-bold text-slate-900">Company Profile & System Settings</h2>
        <p className="text-xs text-slate-500">
          Corporate entity identification, regulatory distribution licenses, and Supabase database configuration
        </p>
      </div>

      {/* Corporate Details */}
      <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-base">
            IX
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Investxindia Corporate Distribution Pvt. Ltd.
            </h3>
            <p className="text-xs text-slate-500">
              Registered Indian Financial Products Distributor & Corporate Corporate Agent
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Corporate ID (CIN)</span>
            <span className="font-mono font-semibold text-slate-900">U67190MH2022PTC389102</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">GST Identification No.</span>
            <span className="font-mono font-semibold text-slate-900">27AAACI4912K1Z9</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">AMFI Registration ARN</span>
            <span className="font-mono font-semibold text-orange-600">ARN-210892</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Statutory Section 194H TDS</span>
            <span className="font-mono font-semibold text-slate-900">5.00% (Income Tax Act)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Financial Year</span>
            <span className="font-mono font-semibold text-slate-900">FY 2026-27 (Active)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Operational Timezone</span>
            <span className="font-mono font-semibold text-slate-900">Asia/Kolkata (IST, UTC+05:30)</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Registered Corporate Office</span>
          <p className="text-slate-800 font-medium">
            Suite 804, Express Towers, Barrister Rajni Patel Marg, Nariman Point, Mumbai, Maharashtra - 400021, India
          </p>
          <div className="flex flex-wrap gap-4 text-slate-500 pt-1 text-[11px]">
            <span>Email: info.investxindia@gmail.com</span>
            <span>Support: +91 22 6123 4500</span>
          </div>
        </div>
      </div>

      {/* Database Backup & Disaster Recovery */}
      <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Database Backup, Snapshot Export & Disaster Recovery
              </h3>
              <p className="text-xs text-slate-500">
                Export verified JSON database snapshots with SHA-256 integrity checksums or restore from previous archives.
              </p>
            </div>
          </div>
        </div>

        {backupSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupSuccessMsg}</span>
          </div>
        )}

        {restoreFeedback && (
          <div
            className={`p-3 rounded text-xs flex items-center gap-2 border ${
              restoreFeedback.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {restoreFeedback.success ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{restoreFeedback.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleCreateBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Database Snapshot (.json)</span>
          </button>

          {userRole === 'super_admin' ? (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileRestore}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Restore Database From Backup</span>
              </button>
            </>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              (Super Admin privileges required to execute database restore)
            </span>
          )}
        </div>
      </div>

      {/* Supabase Migration & Backend Readiness */}
      <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Supabase PostgreSQL Backend & RLS Status
              </h3>
              <p className="text-xs text-slate-500">
                17 production tables, Row Level Security policies, and tamper-resistant audit triggers ready.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSupabaseModal}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors"
          >
            View SQL Migration Script
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 space-y-2">
          <p>
            The IFBMS frontend connects with <strong>Supabase</strong> (PostgreSQL, Supabase Auth, and Supabase Private Storage) with automatic fallback to local verified sandbox.
          </p>
          <div className="font-mono text-[11px] bg-slate-900 text-slate-200 p-2.5 rounded">
            <div># Migration file:</div>
            <div className="text-emerald-400">/supabase/migrations/20261022_ifbms_schema.sql</div>
          </div>
        </div>
      </div>

      {/* Production Security & Verification Suites */}
      <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Production Readiness & Security Audit Suite</span>
            </h3>
            <p className="text-xs text-slate-500">
              Run automated verification tests for tenant isolation, non-super-admin privilege defense, signed URL vault security, and calculation integrity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenTestModal}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Brokerage Engine Tests
            </button>
            {onOpenAuditModal && (
              <button
                onClick={onOpenAuditModal}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-600 rounded-md transition-colors shadow-xs"
              >
                Launch Security Audit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Demo Data Management */}
      <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Data Management & State Control
        </h3>
        <p className="text-xs text-slate-500">
          Reset local demonstration state or toggle between live sample records and empty zero-database states.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data to Factory Initial</span>
          </button>
          {resetDone && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> Reset Complete
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
