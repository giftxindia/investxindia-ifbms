import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  Calendar,
  Shield,
  Landmark,
  Coins,
  HeartPulse,
  Car,
  ShieldCheck,
  BadgeIndianRupee,
  Scale,
  ArrowRightLeft,
  Target,
  Clock,
  Sparkles,
  AlertCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { dataStore } from '../services/mockData';
import { secureExportDataset } from '../services/importExportService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  healthService,
  motorService,
  lifeService,
  fdService,
  bondService,
  loanService,
  brokerageService,
  subBrokerService,
  targetService,
} from '../services/supabaseService';
import { UserRole } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface MISReportsPageProps {
  userRole: UserRole;
}

export const MISReportsPage: React.FC<MISReportsPageProps> = ({ userRole }) => {
  const [reportTab, setReportTab] = useState<
    | 'business_volume'
    | 'brokerage_recon'
    | 'payouts_ledger'
    | 'targets_vs_actuals'
    | 'renewals_schedule'
    | 'maturities_schedule'
  >('business_volume');

  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedPartner, setSelectedPartner] = useState<string>('all');
  const [renewalHorizon, setRenewalHorizon] = useState<'all' | '30' | '60' | '90'>('all');
  const [maturityHorizon, setMaturityHorizon] = useState<'all' | '30' | '60' | '90' | '180'>('all');

  const activeUser = dataStore.getActiveUser();
  const subBrokerCode = activeUser.role === 'sub_broker' ? activeUser.subBrokerCode : undefined;

  const [loading, setLoading] = useState(false);
  const [healthPolicies, setHealthPolicies] = useState(() => dataStore.getHealthPolicies());
  const [motorPolicies, setMotorPolicies] = useState(() => dataStore.getMotorPolicies());
  const [lifePolicies, setLifePolicies] = useState(() => dataStore.getLifePolicies());
  const [fixedDeposits, setFixedDeposits] = useState(() => dataStore.getFixedDeposits());
  const [bonds, setBonds] = useState(() => dataStore.getBonds());
  const [loans, setLoans] = useState(() => dataStore.getLoans());
  const [txns, setTxns] = useState(() => dataStore.getTransactions());
  const [payouts, setPayouts] = useState(() => dataStore.getPayouts());
  const [targets, setTargets] = useState(() => dataStore.getTargets());
  const [subBrokers, setSubBrokers] = useState(() => dataStore.getSubBrokers());

  const loadLiveReportsData = async () => {
    if (!isSupabaseConfigured()) {
      setHealthPolicies(dataStore.getHealthPolicies());
      setMotorPolicies(dataStore.getMotorPolicies());
      setLifePolicies(dataStore.getLifePolicies());
      setFixedDeposits(dataStore.getFixedDeposits());
      setBonds(dataStore.getBonds());
      setLoans(dataStore.getLoans());
      setTxns(dataStore.getTransactions());
      setPayouts(dataStore.getPayouts());
      setTargets(dataStore.getTargets());
      setSubBrokers(dataStore.getSubBrokers());
      return;
    }
    try {
      setLoading(true);
      const [hl, mt, lf, fd, bd, ln, tr, py, tg, sb] = await Promise.all([
        healthService.getPolicies(userRole, subBrokerCode),
        motorService.getPolicies(userRole, subBrokerCode),
        lifeService.getPolicies(userRole, subBrokerCode),
        fdService.getDeposits(userRole, subBrokerCode),
        bondService.getBonds(userRole, subBrokerCode),
        loanService.getLoans(userRole, subBrokerCode),
        brokerageService.getTransactions(userRole, subBrokerCode),
        brokerageService.getPayouts(userRole, subBrokerCode),
        targetService.getTargets(),
        subBrokerService.getSubBrokers(),
      ]);
      setHealthPolicies(hl);
      setMotorPolicies(mt);
      setLifePolicies(lf);
      setFixedDeposits(fd);
      setBonds(bd);
      setLoans(ln);
      setTxns(tr);
      setPayouts(py);
      setTargets(tg);
      setSubBrokers(sb);
    } catch (err) {
      console.warn('Fallback to local store for reports:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadLiveReportsData();
    const unsub = dataStore.subscribe(() => {
      loadLiveReportsData();
    });
    return unsub;
  }, [userRole, subBrokerCode]);

  // 1. Unified Business Volume Dataset
  const unifiedVolume = useMemo(() => {
    const list: any[] = [];

    healthPolicies.forEach((p) => {
      list.push({
        id: p.id,
        referenceNo: p.policyNo,
        clientName: p.clientName,
        subBrokerName: p.subBrokerName,
        subBrokerId: p.subBrokerId,
        productCategory: 'Health Insurance',
        provider: p.insurer,
        businessVolume: p.annualPremium,
        companyCommissionExpected: p.commissionExpected,
        subBrokerPayable: p.subBrokerPayable,
        date: p.policyStartDate,
        status: p.status,
      });
    });

    motorPolicies.forEach((p) => {
      list.push({
        id: p.id,
        referenceNo: p.policyNo,
        clientName: p.clientName,
        subBrokerName: p.subBrokerName,
        subBrokerId: p.subBrokerId,
        productCategory: 'Motor Insurance',
        provider: p.insurer,
        businessVolume: p.grossPremium,
        companyCommissionExpected: p.commissionExpected,
        subBrokerPayable: p.subBrokerPayable,
        date: p.policyStartDate,
        status: p.status,
      });
    });

    lifePolicies.forEach((p) => {
      list.push({
        id: p.id,
        referenceNo: p.policyNo,
        clientName: p.clientName,
        subBrokerName: p.subBrokerName,
        subBrokerId: p.subBrokerId,
        productCategory: 'Life Insurance',
        provider: p.insurer,
        businessVolume: p.annualPremium,
        companyCommissionExpected: p.commissionExpected,
        subBrokerPayable: p.subBrokerPayable,
        date: p.policyDate,
        status: p.status,
      });
    });

    fixedDeposits.forEach((f) => {
      list.push({
        id: f.id,
        referenceNo: f.applicationNo,
        clientName: f.clientName,
        subBrokerName: f.subBrokerName,
        subBrokerId: f.subBrokerId,
        productCategory: 'Fixed Deposits',
        provider: f.provider,
        businessVolume: f.depositAmount,
        companyCommissionExpected: f.commissionExpected,
        subBrokerPayable: f.subBrokerPayable,
        date: f.depositDate,
        status: f.status,
      });
    });

    bonds.forEach((b) => {
      list.push({
        id: b.id,
        referenceNo: b.applicationNo,
        clientName: b.clientName,
        subBrokerName: b.subBrokerName,
        subBrokerId: b.subBrokerId,
        productCategory: 'Bonds',
        provider: b.issuer,
        businessVolume: b.totalInvestment,
        companyCommissionExpected: b.commissionExpected,
        subBrokerPayable: b.subBrokerPayable,
        date: b.issueDate,
        status: b.status,
      });
    });

    loans.forEach((l) => {
      list.push({
        id: l.id,
        referenceNo: l.applicationNo,
        clientName: l.clientName,
        subBrokerName: l.subBrokerName,
        subBrokerId: l.subBrokerId,
        productCategory: 'Loans',
        provider: l.lender,
        businessVolume: l.disbursedAmount || l.sanctionedAmount,
        companyCommissionExpected: l.expectedPayout,
        subBrokerPayable: l.subBrokerPayout,
        date: l.submissionDate,
        status: l.stage,
      });
    });

    return list.filter((item) => {
      if (userRole === 'sub_broker' && !item.subBrokerName.includes('Vikram') && item.subBrokerId !== 'sb-1') {
        return false;
      }
      if (selectedProduct !== 'all' && item.productCategory !== selectedProduct) return false;
      if (selectedPartner !== 'all' && !item.subBrokerName.includes(selectedPartner)) return false;
      return true;
    });
  }, [
    healthPolicies,
    motorPolicies,
    lifePolicies,
    fixedDeposits,
    bonds,
    loans,
    selectedProduct,
    selectedPartner,
    userRole,
  ]);

  // 2. Brokerage Realization Dataset
  const brokerageReconRecords = useMemo(() => {
    return txns.filter((t) => {
      if (userRole === 'sub_broker' && t.subBrokerId !== 'sb-1') return false;
      if (selectedProduct !== 'all' && t.productType !== selectedProduct) return false;
      if (selectedPartner !== 'all' && !t.subBrokerName.includes(selectedPartner)) return false;
      return true;
    });
  }, [txns, userRole, selectedProduct, selectedPartner]);

  // 3. Renewals Schedule Dataset (Health, Motor, Life upcoming within horizon)
  const renewalsSchedule = useMemo(() => {
    const list: any[] = [];
    const now = new Date().getTime();

    // Health renewals
    healthPolicies.forEach((p) => {
      const renewalDate = new Date(p.renewalDueDate).getTime();
      const diffDays = Math.round((renewalDate - now) / 86400000);
      list.push({
        id: p.id,
        referenceNo: p.policyNo,
        product: 'Health Insurance',
        clientName: p.clientName,
        subBrokerName: p.subBrokerName,
        subBrokerId: p.subBrokerId,
        provider: p.insurer,
        premiumDue: p.annualPremium,
        expiryDate: p.renewalDueDate,
        daysRemaining: diffDays,
        status: p.status,
      });
    });

    // Motor renewals
    motorPolicies.forEach((p) => {
      const renewalDate = new Date(p.policyExpiryDate).getTime();
      const diffDays = Math.round((renewalDate - now) / 86400000);
      list.push({
        id: p.id,
        referenceNo: p.policyNo,
        product: 'Motor Insurance',
        clientName: p.clientName,
        subBrokerName: p.subBrokerName,
        subBrokerId: p.subBrokerId,
        provider: p.insurer,
        premiumDue: p.grossPremium,
        expiryDate: p.policyExpiryDate,
        daysRemaining: diffDays,
        status: p.status,
      });
    });

    // Life renewals
    lifePolicies.forEach((p) => {
      const renewalDate = new Date(p.nextPremiumDate).getTime();
      const diffDays = Math.round((renewalDate - now) / 86400000);
      list.push({
        id: p.id,
        referenceNo: p.policyNo,
        product: 'Life Insurance',
        clientName: p.clientName,
        subBrokerName: p.subBrokerName,
        subBrokerId: p.subBrokerId,
        provider: p.insurer,
        premiumDue: p.annualPremium,
        expiryDate: p.nextPremiumDate,
        daysRemaining: diffDays,
        status: p.status,
      });
    });

    return list.filter((item) => {
      if (userRole === 'sub_broker' && item.subBrokerId !== 'sb-1') return false;
      if (selectedPartner !== 'all' && !item.subBrokerName.includes(selectedPartner)) return false;
      if (renewalHorizon === '30' && (item.daysRemaining < 0 || item.daysRemaining > 30)) return false;
      if (renewalHorizon === '60' && (item.daysRemaining < 0 || item.daysRemaining > 60)) return false;
      if (renewalHorizon === '90' && (item.daysRemaining < 0 || item.daysRemaining > 90)) return false;
      return true;
    });
  }, [healthPolicies, motorPolicies, lifePolicies, userRole, selectedPartner, renewalHorizon]);

  // 4. Maturities Schedule Dataset (FDs and Bonds maturing)
  const maturitiesSchedule = useMemo(() => {
    const list: any[] = [];
    const now = new Date().getTime();

    // Fixed Deposits
    fixedDeposits.forEach((f) => {
      const matDate = new Date(f.maturityDate).getTime();
      const diffDays = Math.round((matDate - now) / 86400000);
      list.push({
        id: f.id,
        referenceNo: f.applicationNo,
        assetType: 'Fixed Deposit',
        clientName: f.clientName,
        subBrokerName: f.subBrokerName,
        subBrokerId: f.subBrokerId,
        institution: f.provider,
        principalInvested: f.depositAmount,
        maturityPayout: f.maturityAmount,
        maturityDate: f.maturityDate,
        daysRemaining: diffDays,
        status: f.status,
      });
    });

    // Bonds
    bonds.forEach((b) => {
      const matDate = new Date(b.maturityDate).getTime();
      const diffDays = Math.round((matDate - now) / 86400000);
      list.push({
        id: b.id,
        referenceNo: b.applicationNo,
        assetType: 'Bond / NCD',
        clientName: b.clientName,
        subBrokerName: b.subBrokerName,
        subBrokerId: b.subBrokerId,
        institution: b.issuer,
        principalInvested: b.totalInvestment,
        maturityPayout: b.totalInvestment,
        maturityDate: b.maturityDate,
        daysRemaining: diffDays,
        status: b.status,
      });
    });

    return list.filter((item) => {
      if (userRole === 'sub_broker' && item.subBrokerId !== 'sb-1') return false;
      if (selectedPartner !== 'all' && !item.subBrokerName.includes(selectedPartner)) return false;
      if (maturityHorizon === '30' && (item.daysRemaining < 0 || item.daysRemaining > 30)) return false;
      if (maturityHorizon === '60' && (item.daysRemaining < 0 || item.daysRemaining > 60)) return false;
      if (maturityHorizon === '90' && (item.daysRemaining < 0 || item.daysRemaining > 90)) return false;
      if (maturityHorizon === '180' && (item.daysRemaining < 0 || item.daysRemaining > 180)) return false;
      return true;
    });
  }, [fixedDeposits, bonds, userRole, selectedPartner, maturityHorizon]);

  // Aggregate Metrics
  const totalVolume = unifiedVolume.reduce((acc, r) => acc + (r.businessVolume || 0), 0);
  const totalSubBrokerPayable = unifiedVolume.reduce((acc, r) => acc + (r.subBrokerPayable || 0), 0);
  const totalCompanyExpected =
    userRole === 'sub_broker' ? 0 : unifiedVolume.reduce((acc, r) => acc + (r.companyCommissionExpected || 0), 0);

  // Brokerage metrics
  const totalExpectedBrokerage = brokerageReconRecords.reduce((acc, t) => acc + t.companyCommissionExpected, 0);
  const totalReceivedBrokerage = brokerageReconRecords.reduce((acc, t) => acc + t.companyCommissionReceived, 0);
  const totalTdsDeducted = brokerageReconRecords.reduce((acc, t) => acc + t.tdsDeducted, 0);
  const totalPartnerNetDisbursed = brokerageReconRecords.reduce((acc, t) => acc + t.subBrokerNetPayable, 0);

  // Handle Filtered Export
  const handleExportFiltered = (format: 'xlsx' | 'csv') => {
    let datasetToExport: any[] = [];
    let reportName = 'MIS_Report';

    if (reportTab === 'business_volume') {
      datasetToExport = unifiedVolume;
      reportName = 'Business_Volume_MIS';
    } else if (reportTab === 'brokerage_recon') {
      datasetToExport = brokerageReconRecords;
      reportName = 'Brokerage_Realization_Recon';
    } else if (reportTab === 'payouts_ledger') {
      datasetToExport = payouts;
      reportName = 'Partner_Payouts_Ledger';
    } else if (reportTab === 'targets_vs_actuals') {
      datasetToExport = targets;
      reportName = 'Targets_vs_Actuals_Performance';
    } else if (reportTab === 'renewals_schedule') {
      datasetToExport = renewalsSchedule;
      reportName = `Renewals_Schedule_${renewalHorizon}Days`;
    } else if (reportTab === 'maturities_schedule') {
      datasetToExport = maturitiesSchedule;
      reportName = `Asset_Maturities_Schedule_${maturityHorizon}Days`;
    }

    const res = secureExportDataset(datasetToExport, reportName, userRole, format, subBrokerCode);
    if (!res.success) {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Executive MIS & Analytical Reporting Hub</h2>
          <p className="text-xs text-slate-500">
            Real-time business volumes, brokerage realization, partner payout reconciliations, targets, and renewal calendars
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLiveReportsData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleExportFiltered('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Filtered .XLSX</span>
          </button>
          <button
            onClick={() => handleExportFiltered('csv')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export .CSV</span>
          </button>
        </div>
      </div>

      {/* Role Notice for Sub-Brokers */}
      {userRole === 'sub_broker' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Sub-Broker Limited Access:</strong> You are viewing your assigned client portfolio and partner payout statements. Company-wide margins and provider gross commission margins are protected and redacted.
          </span>
        </div>
      )}

      {/* Executive Report Mode Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setReportTab('business_volume')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            reportTab === 'business_volume'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>1. Business Volume Summary</span>
        </button>

        <button
          onClick={() => setReportTab('brokerage_recon')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            reportTab === 'brokerage_recon'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>2. Brokerage Realization</span>
        </button>

        <button
          onClick={() => setReportTab('payouts_ledger')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            reportTab === 'payouts_ledger'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>3. Partner Payouts & TDS</span>
        </button>

        <button
          onClick={() => setReportTab('targets_vs_actuals')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            reportTab === 'targets_vs_actuals'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>4. Targets vs Achievement</span>
        </button>

        <button
          onClick={() => setReportTab('renewals_schedule')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            reportTab === 'renewals_schedule'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>5. Renewals Schedule ({renewalsSchedule.length})</span>
        </button>

        <button
          onClick={() => setReportTab('maturities_schedule')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            reportTab === 'maturities_schedule'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>6. Asset Maturities ({maturitiesSchedule.length})</span>
        </button>
      </div>

      {/* Global Filter Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Product Filter */}
          {reportTab !== 'renewals_schedule' && reportTab !== 'maturities_schedule' && (
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Product Categories</option>
              <option value="Health Insurance">Health Insurance</option>
              <option value="Motor Insurance">Motor Insurance</option>
              <option value="Life Insurance">Life Insurance</option>
              <option value="Fixed Deposits">Fixed Deposits</option>
              <option value="Bonds">Bonds & NCDs</option>
              <option value="Loans">Loans & Mortgages</option>
            </select>
          )}

          {/* Partner Filter (Super Admin / Staff only) */}
          {userRole !== 'sub_broker' && (
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Sub-Broker Partners</option>
              {subBrokers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.subBrokerCode})
                </option>
              ))}
            </select>
          )}

          {/* Renewals Horizon Filter */}
          {reportTab === 'renewals_schedule' && (
            <select
              value={renewalHorizon}
              onChange={(e) => setRenewalHorizon(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none font-semibold text-emerald-800"
            >
              <option value="all">All Horizon Horizons</option>
              <option value="30">Expiring in Next 30 Days (Urgent)</option>
              <option value="60">Expiring in Next 60 Days</option>
              <option value="90">Expiring in Next 90 Days (Quarterly)</option>
            </select>
          )}

          {/* Maturities Horizon Filter */}
          {reportTab === 'maturities_schedule' && (
            <select
              value={maturityHorizon}
              onChange={(e) => setMaturityHorizon(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none font-semibold text-emerald-800"
            >
              <option value="all">All Maturity Horizons</option>
              <option value="30">Maturing in Next 30 Days</option>
              <option value="60">Maturing in Next 60 Days</option>
              <option value="90">Maturing in Next 90 Days</option>
              <option value="180">Maturing in Next 180 Days (Half Year)</option>
            </select>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{unifiedVolume.length}</span> active portfolio records
        </div>
      </div>

      {/* TAB 1: BUSINESS VOLUME SUMMARY */}
      {reportTab === 'business_volume' && (
        <div className="space-y-6">
          {/* Executive Volume KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Total Business Volume (AUM / Premium)
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(totalVolume)}</div>
              <span className="text-[10px] text-slate-400">Aggregated across all products</span>
            </div>

            {userRole !== 'sub_broker' && (
              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Company Gross Commission Expected
                </span>
                <div className="text-xl font-bold text-emerald-700 mt-1">{formatINR(totalCompanyExpected)}</div>
                <span className="text-[10px] text-slate-400">Total institutional receivables</span>
              </div>
            )}

            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {userRole === 'sub_broker' ? 'My Earned Commission Payout' : 'Partner Payouts Allocated'}
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(totalSubBrokerPayable)}</div>
              <span className="text-[10px] text-slate-400">Net of applicable commission split</span>
            </div>
          </div>

          {/* Volume Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Business Volume Ledger
              </h3>
              <span className="text-[11px] text-slate-500">{unifiedVolume.length} Transactions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Reference #</th>
                    <th className="p-3 font-bold">Product Category</th>
                    <th className="p-3 font-bold">Client Name</th>
                    <th className="p-3 font-bold">Provider / Issuer</th>
                    <th className="p-3 font-bold">Sub-Broker</th>
                    <th className="p-3 font-bold text-right">Business Volume</th>
                    {userRole !== 'sub_broker' && (
                      <th className="p-3 font-bold text-right">Company Expected</th>
                    )}
                    <th className="p-3 font-bold text-right">Partner Payable</th>
                    <th className="p-3 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unifiedVolume.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{row.referenceNo}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {row.productCategory}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{row.clientName}</td>
                      <td className="p-3 text-slate-700">{row.provider}</td>
                      <td className="p-3 text-slate-600">{row.subBrokerName}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatINR(row.businessVolume)}</td>
                      {userRole !== 'sub_broker' && (
                        <td className="p-3 text-right text-emerald-700 font-semibold">
                          {formatINR(row.companyCommissionExpected)}
                        </td>
                      )}
                      <td className="p-3 text-right text-slate-800 font-semibold">
                        {formatINR(row.subBrokerPayable)}
                      </td>
                      <td className="p-3 text-slate-500">{formatDateIST(row.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BROKERAGE REALIZATION & RECONCILIATION */}
      {reportTab === 'brokerage_recon' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Expected Commission
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {userRole === 'sub_broker' ? '[Restricted]' : formatINR(totalExpectedBrokerage)}
              </div>
              <span className="text-[10px] text-slate-400">Institutional brokerage booked</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Commission Realized
              </span>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {userRole === 'sub_broker' ? '[Restricted]' : formatINR(totalReceivedBrokerage)}
              </div>
              <span className="text-[10px] text-slate-400">Received in company bank</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                TDS Deducted (Sec 194H @ 5%)
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(totalTdsDeducted)}</div>
              <span className="text-[10px] text-slate-400">Deposited to ITD quarterly</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Net Disbursed to Partners
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(totalPartnerNetDisbursed)}</div>
              <span className="text-[10px] text-slate-400">Net of 5% TDS deduction</span>
            </div>
          </div>

          {/* Brokerage Recon Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Transaction #</th>
                    <th className="p-3 font-bold">Product</th>
                    <th className="p-3 font-bold">Contract Ref</th>
                    <th className="p-3 font-bold">Client</th>
                    <th className="p-3 font-bold">Partner</th>
                    {userRole !== 'sub_broker' && (
                      <th className="p-3 font-bold text-right">Expected Brokerage</th>
                    )}
                    {userRole !== 'sub_broker' && (
                      <th className="p-3 font-bold text-right">Received</th>
                    )}
                    <th className="p-3 font-bold text-right">Partner Share</th>
                    <th className="p-3 font-bold text-right">TDS (5%)</th>
                    <th className="p-3 font-bold text-right">Net Payable</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brokerageReconRecords.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{t.transactionNo}</td>
                      <td className="p-3 text-slate-700">{t.productType}</td>
                      <td className="p-3 font-mono text-slate-600">{t.referenceNo}</td>
                      <td className="p-3 font-semibold text-slate-800">{t.clientName}</td>
                      <td className="p-3 text-slate-600">{t.subBrokerName}</td>
                      {userRole !== 'sub_broker' && (
                        <td className="p-3 text-right font-medium text-slate-900">
                          {formatINR(t.companyCommissionExpected)}
                        </td>
                      )}
                      {userRole !== 'sub_broker' && (
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {formatINR(t.companyCommissionReceived)}
                        </td>
                      )}
                      <td className="p-3 text-right font-semibold text-slate-800">
                        {formatINR(t.subBrokerGrossPayable)}
                      </td>
                      <td className="p-3 text-right text-rose-700">
                        -{formatINR(t.tdsDeducted)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-800">
                        {formatINR(t.subBrokerNetPayable)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                            t.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PARTNER PAYOUTS & TDS */}
      {reportTab === 'payouts_ledger' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sub-Broker Payout Disbursed Batches & Bank References
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Batch #</th>
                    <th className="p-3 font-bold">Partner Name</th>
                    <th className="p-3 font-bold">Partner Code</th>
                    <th className="p-3 font-bold">Billing Period</th>
                    <th className="p-3 font-bold">Txn Count</th>
                    <th className="p-3 font-bold text-right">Gross Payable</th>
                    <th className="p-3 font-bold text-right">TDS (5%)</th>
                    <th className="p-3 font-bold text-right">Net Disbursed</th>
                    <th className="p-3 font-bold">Payment Mode</th>
                    <th className="p-3 font-bold">Bank Reference No</th>
                    <th className="p-3 font-bold">Disbursement Date</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{p.payoutBatchNo}</td>
                      <td className="p-3 font-semibold text-slate-800">{p.subBrokerName}</td>
                      <td className="p-3 font-mono text-slate-600">{p.subBrokerCode}</td>
                      <td className="p-3 text-slate-700">{p.period}</td>
                      <td className="p-3 font-bold text-slate-800">{p.transactionCount}</td>
                      <td className="p-3 text-right font-medium text-slate-900">{formatINR(p.grossPayable)}</td>
                      <td className="p-3 text-right text-rose-700">-{formatINR(p.tdsDeducted)}</td>
                      <td className="p-3 text-right font-bold text-emerald-800">{formatINR(p.netDisbursed)}</td>
                      <td className="p-3 font-semibold text-slate-700">{p.paymentMode}</td>
                      <td className="p-3 font-mono text-slate-600 text-[11px]">{p.bankReferenceNo}</td>
                      <td className="p-3 text-slate-500">{p.disbursementDate}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                            p.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TARGETS VS ACTUALS */}
      {reportTab === 'targets_vs_actuals' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Monthly Performance Quota vs Realized Production
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Entity Name</th>
                    <th className="p-3 font-bold">Type</th>
                    <th className="p-3 font-bold">Product Category</th>
                    <th className="p-3 font-bold">Month / Year</th>
                    <th className="p-3 font-bold text-right">Assigned Target</th>
                    <th className="p-3 font-bold text-right">Achieved Volume</th>
                    <th className="p-3 font-bold text-right">Completion %</th>
                    <th className="p-3 font-bold">Performance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targets.map((tgt) => {
                    const pct = Math.round((tgt.achievedAmount / tgt.targetAmount) * 100);
                    return (
                      <tr key={tgt.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-semibold text-slate-900">{tgt.entityName}</td>
                        <td className="p-3 text-slate-600">{tgt.entityType}</td>
                        <td className="p-3 text-slate-800">{tgt.productCategory}</td>
                        <td className="p-3 text-slate-600">
                          {tgt.month} {tgt.year}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-900">
                          {formatINR(tgt.targetAmount)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-800">
                          {formatINR(tgt.achievedAmount)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">{pct}%</td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                              pct >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : pct >= 80
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tgt.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RENEWALS SCHEDULE */}
      {reportTab === 'renewals_schedule' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Upcoming Insurance Renewal Calendar
                </h3>
                <p className="text-[11px] text-slate-500">
                  Actionable renewal dates for client retention across Health, Motor, and Life policies
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {renewalsSchedule.length} Policies Queued
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Policy Number</th>
                    <th className="p-3 font-bold">Line of Business</th>
                    <th className="p-3 font-bold">Client Name</th>
                    <th className="p-3 font-bold">Insurer</th>
                    <th className="p-3 font-bold">Sub-Broker</th>
                    <th className="p-3 font-bold text-right">Renewal Premium</th>
                    <th className="p-3 font-bold">Expiry Date</th>
                    <th className="p-3 font-bold text-right">Horizon</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {renewalsSchedule.map((ren) => (
                    <tr key={ren.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{ren.referenceNo}</td>
                      <td className="p-3 text-slate-700 font-semibold">{ren.product}</td>
                      <td className="p-3 font-semibold text-slate-900">{ren.clientName}</td>
                      <td className="p-3 text-slate-700">{ren.provider}</td>
                      <td className="p-3 text-slate-600">{ren.subBrokerName}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatINR(ren.premiumDue)}</td>
                      <td className="p-3 text-slate-600">{ren.expiryDate}</td>
                      <td className="p-3 text-right">
                        <span
                          className={`font-mono font-bold text-xs ${
                            ren.daysRemaining <= 30
                              ? 'text-rose-600'
                              : ren.daysRemaining <= 60
                              ? 'text-amber-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {ren.daysRemaining > 0 ? `${ren.daysRemaining} days` : 'Overdue / Due Today'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                            ren.status === 'active' || ren.status === 'in_force'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ren.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ASSET MATURITIES SCHEDULE */}
      {reportTab === 'maturities_schedule' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Fixed Deposit & Capital Gains Bond Maturity Calendar
                </h3>
                <p className="text-[11px] text-slate-500">
                  Track maturing assets to retain capital and propose reinvestment in higher-yield corporate FDs or 54EC bonds
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {maturitiesSchedule.length} Maturing Instruments
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Application / Ref #</th>
                    <th className="p-3 font-bold">Instrument Type</th>
                    <th className="p-3 font-bold">Client / Investor</th>
                    <th className="p-3 font-bold">Institution / Issuer</th>
                    <th className="p-3 font-bold">Sub-Broker</th>
                    <th className="p-3 font-bold text-right">Principal Invested</th>
                    <th className="p-3 font-bold text-right">Maturity Payout</th>
                    <th className="p-3 font-bold">Maturity Date</th>
                    <th className="p-3 font-bold text-right">Horizon</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maturitiesSchedule.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{mat.referenceNo}</td>
                      <td className="p-3 text-slate-700 font-semibold">{mat.assetType}</td>
                      <td className="p-3 font-semibold text-slate-900">{mat.clientName}</td>
                      <td className="p-3 text-slate-700">{mat.institution}</td>
                      <td className="p-3 text-slate-600">{mat.subBrokerName}</td>
                      <td className="p-3 text-right font-medium text-slate-900">
                        {formatINR(mat.principalInvested)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-800">
                        {formatINR(mat.maturityPayout)}
                      </td>
                      <td className="p-3 text-slate-600">{mat.maturityDate}</td>
                      <td className="p-3 text-right font-mono font-semibold text-xs text-slate-700">
                        {mat.daysRemaining > 0 ? `${mat.daysRemaining} days` : 'Matured'}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase bg-emerald-100 text-emerald-800">
                          {mat.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
