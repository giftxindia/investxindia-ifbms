import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  HeartPulse,
  Car,
  ShieldCheck,
  Landmark,
  Coins,
  BadgeIndianRupee,
  Scale,
  BookOpen,
  ArrowRightLeft,
  Target,
  BarChart3,
  FileSpreadsheet,
  FolderOpen,
  CheckSquare,
  UserCheck,
  History,
  Settings,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { UserRole } from '../../types';

export type NavItemId =
  | 'dashboard'
  | 'clients'
  | 'sub_brokers'
  | 'health_insurance'
  | 'motor_insurance'
  | 'life_insurance'
  | 'fixed_deposits'
  | 'bonds'
  | 'loans'
  | 'brokerage_rules'
  | 'brokerage_register'
  | 'payouts'
  | 'business_targets'
  | 'mis_reports'
  | 'excel_center'
  | 'documents'
  | 'tasks'
  | 'user_management'
  | 'audit_logs'
  | 'settings';

interface SidebarProps {
  activeTab: NavItemId;
  setActiveTab: (tab: NavItemId) => void;
  userRole: UserRole;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavGroup {
  label: string;
  items: {
    id: NavItemId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    allowedRoles: UserRole[];
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const navGroups: NavGroup[] = [
    {
      label: 'EXECUTIVE',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
      ],
    },
    {
      label: 'RELATIONSHIP CRM',
      items: [
        {
          id: 'clients',
          label: 'Clients / CRM',
          icon: Users,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
        {
          id: 'sub_brokers',
          label: 'Sub-Brokers',
          icon: Briefcase,
          allowedRoles: ['super_admin', 'staff'],
        },
      ],
    },
    {
      label: 'INSURANCE PRODUCTS',
      items: [
        {
          id: 'health_insurance',
          label: 'Health Insurance',
          icon: HeartPulse,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
        {
          id: 'motor_insurance',
          label: 'Motor Insurance',
          icon: Car,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
        {
          id: 'life_insurance',
          label: 'Life Insurance',
          icon: ShieldCheck,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
      ],
    },
    {
      label: 'INVESTMENTS & LENDING',
      items: [
        {
          id: 'fixed_deposits',
          label: 'Fixed Deposits',
          icon: Landmark,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
        {
          id: 'bonds',
          label: 'Bonds & NCDs',
          icon: Coins,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
        {
          id: 'loans',
          label: 'Loans & Mortgages',
          icon: BadgeIndianRupee,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
      ],
    },
    {
      label: 'BROKERAGE & FINANCE',
      items: [
        {
          id: 'brokerage_rules',
          label: 'Brokerage Rules',
          icon: Scale,
          allowedRoles: ['super_admin'],
        },
        {
          id: 'brokerage_register',
          label: 'Brokerage Register',
          icon: BookOpen,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
        {
          id: 'payouts',
          label: 'Payouts & Reconcile',
          icon: ArrowRightLeft,
          allowedRoles: ['super_admin', 'staff'],
        },
        {
          id: 'business_targets',
          label: 'Business Targets',
          icon: Target,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
      ],
    },
    {
      label: 'DATA & OPERATIONS',
      items: [
        {
          id: 'mis_reports',
          label: 'MIS & Reports',
          icon: BarChart3,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
        {
          id: 'excel_center',
          label: 'Excel Import / Export',
          icon: FileSpreadsheet,
          allowedRoles: ['super_admin', 'staff'],
        },
        {
          id: 'documents',
          label: 'Documents Vault',
          icon: FolderOpen,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
        {
          id: 'tasks',
          label: 'Tasks & Renewals',
          icon: CheckSquare,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
      ],
    },
    {
      label: 'GOVERNANCE & SYSTEM',
      items: [
        {
          id: 'user_management',
          label: 'User Management',
          icon: UserCheck,
          allowedRoles: ['super_admin'],
        },
        {
          id: 'audit_logs',
          label: 'Audit Trail',
          icon: History,
          allowedRoles: ['super_admin'],
        },
        {
          id: 'settings',
          label: 'System Settings',
          icon: Settings,
          allowedRoles: ['super_admin', 'staff', 'sub_broker'],
        },
      ],
    },
  ];

  const handleItemClick = (id: NavItemId) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0B192C] text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 bg-[#070F1E] shrink-0 gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm">
            IX
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm tracking-tight text-white whitespace-nowrap">
              INVESTXINDIA
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              Corporate Distribution Pvt. Ltd.
            </span>
          </div>
        </div>

        {/* User Role Badge in Sidebar */}
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Current Role</span>
          <span className="font-medium text-orange-400 capitalize">
            {userRole.replace('_', ' ')}
          </span>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter((item) =>
              item.allowedRoles.includes(userRole)
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1">
                <div className="px-3 text-[10px] font-semibold text-slate-400 tracking-wider">
                  {group.label}
                </div>
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left group ${
                        isActive
                          ? 'bg-orange-600 text-white font-semibold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer: System Status */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070F1E] shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">IFBMS v1.0 · IST (Asia/Kolkata)</span>
          </div>
        </div>
      </aside>
    </>
  );
};
