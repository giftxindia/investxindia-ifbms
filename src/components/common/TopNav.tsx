import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  Database,
  Terminal,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  Clock,
  LogOut,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { NavItemId } from './Sidebar';

interface TopNavProps {
  activeTab: NavItemId;
  activeUser: UserProfile;
  onOpenSearch: () => void;
  onOpenSupabaseModal: () => void;
  onOpenTestModal: () => void;
  onOpenImportTestModal?: () => void;
  onOpenAuditModal?: () => void;
  setIsMobileOpen: (open: boolean) => void;
  onLogout?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  activeUser,
  onOpenSearch,
  onOpenSupabaseModal,
  onOpenTestModal,
  onOpenImportTestModal,
  onOpenAuditModal,
  setIsMobileOpen,
  onLogout,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const isSuperAdminOrStaff = activeUser.role === 'super_admin' || activeUser.role === 'staff';

  const getBreadcrumbTitle = (tab: NavItemId): string => {
    const titles: Record<NavItemId, string> = {
      dashboard: 'Executive Dashboard',
      clients: 'Clients Directory & CRM',
      sub_brokers: 'Sub-Brokers & Channel Partners',
      health_insurance: 'Health Insurance Register',
      motor_insurance: 'Motor Insurance Register',
      life_insurance: 'Life Insurance Register',
      fixed_deposits: 'Corporate & Bank Fixed Deposits',
      bonds: 'Capital Gains 54EC & Corporate Bonds',
      loans: 'Loans & Mortgage Pipeline',
      brokerage_rules: 'Brokerage Calculation Rules',
      brokerage_register: 'Brokerage Transaction Ledger',
      payouts: 'Sub-Broker Payouts & Reconciliation',
      business_targets: 'Business Targets vs Achievement',
      mis_reports: 'MIS Reports & Analytics',
      excel_center: 'Excel Import / Export Hub',
      documents: 'Secure Document Repository',
      tasks: 'Tasks, Follow-ups & Renewals',
      user_management: 'User Accounts & Access Control',
      audit_logs: 'System Audit Trail',
      settings: 'Company Profile & System Settings',
    };
    return titles[tab] || 'Dashboard';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 gap-4">
      {/* Left zone: Mobile toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md lg:hidden transition-colors cursor-pointer"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs truncate">
          <span className="font-semibold text-slate-400 hidden sm:inline">IFBMS</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="font-semibold text-slate-900 truncate">
            {getBreadcrumbTitle(activeTab)}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar trigger */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-2">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-600 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search clients, policies, ARN, applications...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right zone: Actions, Status & Authenticated Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Environment Status Badge */}
        <div
          title={
            isSupabaseConfigured()
              ? 'Connected to live Supabase PostgreSQL backend'
              : 'Supabase configuration required'
          }
          className={`flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
            isSupabaseConfigured()
              ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
              : 'text-rose-700 bg-rose-50 border-rose-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isSupabaseConfigured() ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="hidden xs:inline">{isSupabaseConfigured() ? 'Supabase Live' : 'Not Connected'}</span>
        </div>

        {/* Verification Engine Trigger */}
        <button
          onClick={onOpenTestModal}
          title="Run Brokerage & Permissions Automated Test Suite"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5 text-orange-600" />
          <span>Verify Engine</span>
        </button>

        {/* Import & Security Verification Trigger */}
        {onOpenImportTestModal && (
          <button
            onClick={onOpenImportTestModal}
            title="Run Import, Export & Private Document Security Tests"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50/70 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verify Import & Vault</span>
          </button>
        )}

        {/* Full Production Security Audit Trigger */}
        {onOpenAuditModal && isSuperAdminOrStaff && (
          <button
            onClick={onOpenAuditModal}
            title="Run Full Production Security & Tenant Isolation Audit Suite"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-900 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Production Audit</span>
          </button>
        )}

        {/* Supabase Schema Modal Button */}
        <button
          onClick={onOpenSupabaseModal}
          title="Supabase PostgreSQL Schema & RLS"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Supabase Setup</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowRoleMenu(false);
            }}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md relative transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-600 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="font-semibold text-slate-900">Notifications & Alerts</span>
                <span className="text-[10px] text-slate-400">Asia/Kolkata</span>
              </div>
              <div className="space-y-2">
                <div className="p-2 rounded bg-amber-50/60 border border-amber-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Health Policy Renewal Due</p>
                    <p className="text-slate-500 text-[11px]">Niva Bupa Titanium for Manish Chawla is in 30-day grace period.</p>
                  </div>
                </div>
                <div className="p-2 rounded bg-blue-50/60 border border-blue-100 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">April Payout Batch Ready</p>
                    <p className="text-slate-500 text-[11px]">IX-PAY-2026-M04 awaiting Super Admin RTGS authorization.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Authenticated User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRoleMenu(!showRoleMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
              {activeUser.name.charAt(0)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                {activeUser.name}
              </span>
              <span className="text-[10px] text-orange-600 font-medium capitalize">
                {activeUser.role.replace('_', ' ')}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="font-semibold text-slate-900">{activeUser.name}</p>
                <p className="text-slate-500 text-[11px] truncate">{activeUser.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Authorized Role: {activeUser.role.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>

              {/* Log Out Action */}
              <div className="pt-2 mt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowRoleMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded text-left transition-colors font-medium text-xs cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of IFBMS</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Log Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Log Out of IFBMS"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
