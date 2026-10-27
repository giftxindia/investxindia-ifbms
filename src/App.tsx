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
import { AuthModal } from './components/common/AuthModal';
import { dataStore } from './services/mockData';
import { authService } from './services/supabaseService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { UserProfile, UserRole } from './types';
import { Building2, Shield, Lock, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

// Pages
import { LoginPage } from './pages/LoginPage';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItemId>('dashboard');
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Modals state
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isImportTestModalOpen, setIsImportTestModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Verify authentication on mount and on page refresh
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const profile = await authService.getCurrentProfile();
        if (isMounted) {
          if (profile) {
            setActiveUser(profile);
            setIsAuthenticated(true);
          } else {
            setActiveUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.warn('Session verification failed:', err);
        if (isMounted) {
          setActiveUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    verifySession();

    // In Supabase mode, attach real-time auth state listener
    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (session) {
          const profile = await authService.getCurrentProfile();
          if (isMounted && profile) {
            setActiveUser(profile);
            setIsAuthenticated(true);
          }
        } else {
          if (isMounted) {
            setActiveUser(null);
            setIsAuthenticated(false);
          }
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setActiveUser(user);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } finally {
      setActiveUser(null);
      setIsAuthenticated(false);
      setActiveTab('dashboard');
    }
  };

  const handleRoleChange = (userId: string) => {
    dataStore.setActiveUser(userId);
    const updated = dataStore.getActiveUser();
    setActiveUser(updated);
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
    if (!activeUser) return null;

    if (!isRouteAllowed(activeTab, activeUser.role)) {
      return (
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center max-w-lg mx-auto my-12 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your role (<strong className="capitalize">{activeUser.role.replace('_', ' ')}</strong>) is not authorized to access this section. This attempt has been logged under security audit compliance.
          </p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Safe Dashboard</span>
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage userRole={activeUser.role} onNavigate={setActiveTab} />;
      case 'clients':
        return <ClientsPage userRole={activeUser.role} activeUser={activeUser} />;
      case 'sub_brokers':
        return <SubBrokersPage userRole={activeUser.role} activeUser={activeUser} />;
      case 'health_insurance':
        return <HealthInsurancePage userRole={activeUser.role} activeUser={activeUser} />;
      case 'motor_insurance':
        return <MotorInsurancePage userRole={activeUser.role} activeUser={activeUser} />;
      case 'life_insurance':
        return <LifeInsurancePage userRole={activeUser.role} activeUser={activeUser} />;
      case 'fixed_deposits':
        return <FixedDepositsPage userRole={activeUser.role} activeUser={activeUser} />;
      case 'bonds':
        return <BondsPage userRole={activeUser.role} activeUser={activeUser} />;
      case 'loans':
        return <LoansPage userRole={activeUser.role} activeUser={activeUser} />;
      case 'brokerage_rules':
        return (
          <BrokerageRulesPage
            userRole={activeUser.role}
            onOpenTestModal={() => setIsTestModalOpen(true)}
          />
        );
      case 'brokerage_register':
        return <BrokerageRegisterPage userRole={activeUser.role} />;
      case 'payouts':
        return <PayoutsReconciliationPage userRole={activeUser.role} />;
      case 'business_targets':
        return <BusinessTargetsPage userRole={activeUser.role} />;
      case 'mis_reports':
        return <MISReportsPage userRole={activeUser.role} />;
      case 'excel_center':
        return <ExcelCenterPage userRole={activeUser.role} />;
      case 'documents':
        return <DocumentsPage userRole={activeUser.role} />;
      case 'tasks':
        return <TasksPage userRole={activeUser.role} />;
      case 'user_management':
        return <UserManagementPage userRole={activeUser.role} />;
      case 'audit_logs':
        return <AuditLogsPage userRole={activeUser.role} />;
      case 'settings':
        return (
          <SettingsPage
            userRole={activeUser.role}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            onOpenTestModal={() => setIsTestModalOpen(true)}
            onOpenAuditModal={() => setIsAuditModalOpen(true)}
          />
        );
      default:
        return <DashboardPage userRole={activeUser.role} onNavigate={setActiveTab} />;
    }
  };

  // 1. Initial Authentication Check State (Loading Splash Screen)
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#070F1E] flex flex-col items-center justify-center text-slate-100 font-sans p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-xl shadow-orange-600/30 ring-4 ring-white/10 animate-pulse">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Investxindia IFBMS</h1>
            <p className="text-xs text-slate-400 mt-1">
              Verifying enterprise security credentials & session state...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-orange-400 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
            <span>Validating PostgreSQL RLS Session</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Default Route is LoginPage
  if (!isAuthenticated || !activeUser) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        />
        <SupabaseSetupModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
        />
      </>
    );
  }

  // 3. Authenticated State: Protected Enterprise Layout
  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={activeUser.role}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Viewport Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Sticky Top Navigation */}
        <TopNav
          activeTab={activeTab}
          activeUser={activeUser}
          onRoleChange={handleRoleChange}
          onLogout={handleLogout}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          onOpenTestModal={() => setIsTestModalOpen(true)}
          onOpenImportTestModal={() => setIsImportTestModalOpen(true)}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Dynamic Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>

      {/* Global Modals */}
      <QuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={setActiveTab}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={async () => {
          const profile = await authService.getCurrentProfile();
          if (profile) setActiveUser(profile);
        }}
      />
    </div>
  );
}
