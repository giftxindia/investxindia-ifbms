/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, NavItemId } from './components/common/Sidebar';
import { TopNav } from './components/common/TopNav';
import { QuickSearchModal } from './components/common/QuickSearchModal';
import { SupabaseSetupModal } from './components/common/SupabaseSetupModal';
import { BrokerageTestRunnerModal } from './components/common/BrokerageTestRunnerModal';
import { ImportDocTestRunnerModal } from './components/common/ImportDocTestRunnerModal';
import { ProductionAuditModal } from './components/common/ProductionAuditModal';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole } from './types';
import { Lock, ArrowLeft } from 'lucide-react';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { SubBrokersPage } from './pages/SubBrokersPage';
import { HealthInsurancePage } from './pages/HealthInsurancePage';
import { MotorInsurancePage } from './pages/MotorInsurancePage';
import { LifeInsurancePage } from './pages/LifeInsurancePage';
import { FixedDepositsPage } from './pages/FixedDepositsPage';
import { BondsPage } from './pages/BondsPage';
import { LoansPage } from './pages/LoansPage';
import { BrokerageRulesPage } from './pages/BrokerageRulesPage';
import { BrokerageRegisterPage } from './pages/BrokerageRegisterPage';
import { PayoutsReconciliationPage } from './pages/PayoutsReconciliationPage';
import { BusinessTargetsPage } from './pages/BusinessTargetsPage';
import { MISReportsPage } from './pages/MISReportsPage';
import { ExcelCenterPage } from './pages/ExcelCenterPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { TasksPage } from './pages/TasksPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

export const TAB_ROUTES: Record<NavItemId, string> = {
  dashboard: '/dashboard',
  clients: '/clients',
  sub_brokers: '/sub-brokers',
  health_insurance: '/health-insurance',
  motor_insurance: '/motor-insurance',
  life_insurance: '/life-insurance',
  fixed_deposits: '/fixed-deposits',
  bonds: '/bonds',
  loans: '/loans',
  brokerage_rules: '/brokerage-rules',
  brokerage_register: '/brokerage-register',
  payouts: '/payouts',
  business_targets: '/business-targets',
  mis_reports: '/mis-reports',
  excel_center: '/excel-center',
  documents: '/documents',
  tasks: '/tasks',
  user_management: '/user-management',
  audit_logs: '/audit-logs',
  settings: '/settings',
};

export const ROUTE_TABS: Record<string, NavItemId> = Object.entries(TAB_ROUTES).reduce(
  (acc, [tab, path]) => {
    acc[path] = tab as NavItemId;
    return acc;
  },
  {} as Record<string, NavItemId>
);

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<NavItemId>(() => {
    const path = window.location.pathname;
    return ROUTE_TABS[path] || 'dashboard';
  });

  // Modals state
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isImportTestModalOpen, setIsImportTestModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Sync activeTab and enforce URL protection on mount and when authentication changes
  useEffect(() => {
    if (isLoading) return;

    const path = window.location.pathname;
    if (!isAuthenticated) {
      if (path !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    } else {
      if (path === '/login' || path === '/') {
        window.history.replaceState(null, '', '/dashboard');
        setActiveTab('dashboard');
      } else if (ROUTE_TABS[path]) {
        setActiveTab(ROUTE_TABS[path]);
      } else {
        // Unknown or nested route: default safely to dashboard
        window.history.replaceState(null, '', '/dashboard');
        setActiveTab('dashboard');
      }
    }
  }, [isAuthenticated, isLoading]);

  // Handle browser Back & Forward button navigation (popstate) & Back-Forward Cache (pageshow)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (!isAuthenticated) {
        if (path !== '/login') {
          window.history.replaceState(null, '', '/login');
        }
      } else {
        if (path === '/login' || path === '/') {
          window.history.replaceState(null, '', '/dashboard');
          setActiveTab('dashboard');
        } else if (ROUTE_TABS[path]) {
          setActiveTab(ROUTE_TABS[path]);
        } else {
          window.history.replaceState(null, '', '/dashboard');
          setActiveTab('dashboard');
        }
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Window was restored from Back-Forward Cache (bfcache).
        // Force immediate reload to check Supabase session fresh.
        window.location.reload();
      } else {
        handlePopState();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isAuthenticated]);

  const handleNavigate = (tab: NavItemId) => {
    if (!isAuthenticated) {
      window.history.replaceState(null, '', '/login');
      return;
    }
    const path = TAB_ROUTES[tab] || '/dashboard';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    await logout();
    setActiveTab('dashboard');
    window.history.replaceState(null, '', '/login');
  };

  // Role-based route guard definition
  const isRouteAllowed = (tab: NavItemId, role: UserRole): boolean => {
    if (role === 'super_admin') return true;

    if (role === 'staff') {
      // Staff cannot modify brokerage rules, manage user accounts, inspect root audit logs, or edit system settings
      const staffRestricted: NavItemId[] = ['brokerage_rules', 'user_management', 'audit_logs', 'settings'];
      return !staffRestricted.includes(tab);
    }

    if (role === 'sub_broker') {
      // Sub-brokers are restricted to customer registers, their commission ledger, targets, and documents
      const subBrokerRestricted: NavItemId[] = [
        'sub_brokers',
        'brokerage_rules',
        'payouts',
        'excel_center',
        'user_management',
        'audit_logs',
        'settings',
      ];
      return !subBrokerRestricted.includes(tab);
    }

    return false;
  };

  // Render Page with strict role permission checks
  const renderActivePage = () => {
    if (!user) return null;

    if (!isRouteAllowed(activeTab, user.role)) {
      return (
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your role (<strong className="capitalize">{user.role.replace('_', ' ')}</strong>) is not authorized to access this section. This attempt has been logged under security audit compliance.
          </p>
          <button
            onClick={() => handleNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Safe Dashboard</span>
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage userRole={user.role} onNavigate={handleNavigate} />;
      case 'clients':
        return <ClientsPage userRole={user.role} activeUser={user} />;
      case 'sub_brokers':
        return <SubBrokersPage userRole={user.role} activeUser={user} />;
      case 'health_insurance':
        return <HealthInsurancePage userRole={user.role} activeUser={user} />;
      case 'motor_insurance':
        return <MotorInsurancePage userRole={user.role} activeUser={user} />;
      case 'life_insurance':
        return <LifeInsurancePage userRole={user.role} activeUser={user} />;
      case 'fixed_deposits':
        return <FixedDepositsPage userRole={user.role} activeUser={user} />;
      case 'bonds':
        return <BondsPage userRole={user.role} activeUser={user} />;
      case 'loans':
        return <LoansPage userRole={user.role} activeUser={user} />;
      case 'brokerage_rules':
        return (
          <BrokerageRulesPage
            userRole={user.role}
            onOpenTestModal={() => setIsTestModalOpen(true)}
          />
        );
      case 'brokerage_register':
        return <BrokerageRegisterPage userRole={user.role} />;
      case 'payouts':
        return <PayoutsReconciliationPage userRole={user.role} />;
      case 'business_targets':
        return <BusinessTargetsPage userRole={user.role} />;
      case 'mis_reports':
        return <MISReportsPage userRole={user.role} />;
      case 'excel_center':
        return <ExcelCenterPage userRole={user.role} />;
      case 'documents':
        return <DocumentsPage userRole={user.role} />;
      case 'tasks':
        return <TasksPage userRole={user.role} />;
      case 'user_management':
        return <UserManagementPage userRole={user.role} />;
      case 'audit_logs':
        return <AuditLogsPage userRole={user.role} />;
      case 'settings':
        return (
          <SettingsPage
            userRole={user.role}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            onOpenTestModal={() => setIsTestModalOpen(true)}
            onOpenAuditModal={() => setIsAuditModalOpen(true)}
          />
        );
      default:
        return <DashboardPage userRole={user.role} onNavigate={handleNavigate} />;
    }
  };

  return (
    <ProtectedRoute onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}>
      <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
        {/* Persistent Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigate}
          userRole={user?.role || 'sub_broker'}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Main Viewport Content Area */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          {/* Sticky Top Navigation */}
          {user && (
            <TopNav
              activeTab={activeTab}
              activeUser={user}
              onLogout={handleLogout}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
              onOpenTestModal={() => setIsTestModalOpen(true)}
              onOpenImportTestModal={() => setIsImportTestModalOpen(true)}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
              setIsMobileOpen={setIsMobileOpen}
            />
          )}

          {/* Dynamic Page Viewport */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {renderActivePage()}
          </main>
        </div>

        {/* Global Modals */}
        <QuickSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigate={handleNavigate}
        />

        <SupabaseSetupModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
        />

        <BrokerageTestRunnerModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
        />

        <ImportDocTestRunnerModal
          isOpen={isImportTestModalOpen}
          onClose={() => setIsImportTestModalOpen(false)}
        />

        <ProductionAuditModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
