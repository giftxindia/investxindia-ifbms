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
import { UserProfile } from './types';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<NavItemId>('dashboard');
  const [activeUser, setActiveUser] = useState<UserProfile>(() => dataStore.getActiveUser());
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isImportTestModalOpen, setIsImportTestModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      setActiveUser(dataStore.getActiveUser());
    });
    return unsubscribe;
  }, []);

  const handleRoleChange = (userId: string) => {
    dataStore.setActiveUser(userId);
    setActiveUser(dataStore.getActiveUser());
  };

  const renderActivePage = () => {
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
        onAuthSuccess={() => setActiveUser(dataStore.getActiveUser())}
      />
    </div>
  );
}
