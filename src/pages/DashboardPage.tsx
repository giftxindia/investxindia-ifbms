import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Shield,
  BadgeIndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Landmark,
  ArrowUpRight,
  RefreshCw,
  Coins,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { StatusPill } from '../components/common/StatusPill';
import { EmptyState } from '../components/common/EmptyState';
import { dataStore } from '../services/mockData';
import { formatINR, formatDateIST } from '../utils/formatters';
import { UserRole } from '../types';
import { NavItemId } from '../components/common/Sidebar';

interface DashboardPageProps {
  userRole: UserRole;
  onNavigate: (tab: NavItemId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ userRole, onNavigate }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => setTick((t) => t + 1));
    return unsubscribe;
  }, []);

  const clients = dataStore.getClients();
  const subBrokers = dataStore.getSubBrokers();
  const healthPolicies = dataStore.getHealthPolicies();
  const motorPolicies = dataStore.getMotorPolicies();
  const lifePolicies = dataStore.getLifePolicies();
  const fixedDeposits = dataStore.getFixedDeposits();
  const bonds = dataStore.getBonds();
  const loans = dataStore.getLoans();
  const txns = dataStore.getTransactions();
  const payouts = dataStore.getPayouts();
  const isZeroState = dataStore.isZeroStateMode();

  const totalPoliciesCount = healthPolicies.length + motorPolicies.length + lifePolicies.length;

  // Calculate totals
  const totalBusinessVolume =
    healthPolicies.reduce((sum, p) => sum + p.annualPremium, 0) +
    motorPolicies.reduce((sum, p) => sum + p.grossPremium, 0) +
    lifePolicies.reduce((sum, p) => sum + p.annualPremium, 0) +
    fixedDeposits.reduce((sum, f) => sum + f.depositAmount, 0) +
    bonds.reduce((sum, b) => sum + b.totalInvestment, 0) +
    loans.reduce((sum, l) => sum + (l.disbursedAmount || l.sanctionedAmount), 0);

  const expectedBrokerage = txns.reduce((sum, t) => sum + t.companyCommissionExpected, 0);
  const brokerageReceived = txns.reduce((sum, t) => sum + t.companyCommissionReceived, 0);
  const subBrokerPayable = txns.reduce((sum, t) => sum + t.subBrokerNetPayable, 0);
  const pendingReconciliationCount = txns.filter((t) => t.status === 'expected' || t.status === 'disputed').length;

  // Monthly trend chart data
  const monthlyTrendData = [
    { month: 'Nov 25', volume: 3850000, brokerage: 245000 },
    { month: 'Dec 25', volume: 4200000, brokerage: 280000 },
    { month: 'Jan 26', volume: 5900000, brokerage: 410000 },
    { month: 'Feb 26', volume: 7200000, brokerage: 530000 },
    { month: 'Mar 26', volume: 9800000, brokerage: 720000 },
    { month: 'Apr 26', volume: 11500000, brokerage: 890000 },
  ];

  // Product distribution
  const productDistributionData = [
    { name: 'Health Insurance', value: healthPolicies.reduce((s, p) => s + p.annualPremium, 0) || 235650, color: '#EA580C' },
    { name: 'Motor Insurance', value: motorPolicies.reduce((s, p) => s + p.grossPremium, 0) || 102188, color: '#F97316' },
    { name: 'Life Insurance', value: lifePolicies.reduce((s, p) => s + p.annualPremium, 0) || 156800, color: '#FB923C' },
    { name: 'Fixed Deposits', value: fixedDeposits.reduce((s, f) => s + f.depositAmount, 0) || 5000000, color: '#0B192C' },
    { name: 'Bonds & NCDs', value: bonds.reduce((s, b) => s + b.totalInvestment, 0) || 9500000, color: '#1E3A8A' },
    { name: 'Loans & Mortgages', value: loans.reduce((s, l) => s + l.disbursedAmount, 0) || 15000000, color: '#3B82F6' },
  ];

  if (isZeroState) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-semibold text-amber-900">
              Zero Database Mode Active · Simulating Empty Production State
            </span>
          </div>
          <button
            onClick={() => dataStore.setZeroStateMode(false)}
            className="text-xs font-semibold text-amber-900 underline hover:no-underline"
          >
            Switch to Sample Data
          </button>
        </div>

        <EmptyState
          title="No live business records yet"
          description="Your Investxindia database currently has zero recorded clients, policies, or brokerage transactions. Connect Supabase or import an Excel batch to populate."
          actionLabel="Open Excel Import Hub"
          onAction={() => onNavigate('excel_center')}
          secondaryActionLabel="Restore Sample Data"
          onSecondaryAction={() => dataStore.setZeroStateMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Notice for Sub-Brokers */}
      {userRole === 'sub_broker' && (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>
              <strong>Sub-Broker Portal (IX-SB-101 · Apex Wealth)</strong>: Viewing your assigned clients, policies, and commissioned statements.
            </span>
          </div>
          <button
            onClick={() => onNavigate('brokerage_register')}
            className="font-semibold text-blue-700 hover:text-blue-900 underline text-xs"
          >
            My Statement
          </button>
        </div>
      )}

      {/* 8 Required KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={String(clients.length)}
          subtitle="Registered in CRM"
          trend={{ value: '+18.4%', isPositive: true, periodText: 'vs last quarter' }}
          icon={Users}
          onClick={() => onNavigate('clients')}
        />
        <StatCard
          title="Active Sub-Brokers"
          value={String(subBrokers.filter((sb) => sb.status === 'active').length)}
          subtitle="Distributor Channel"
          trend={{ value: '+4 New', isPositive: true, periodText: 'FY 2026-27' }}
          icon={Briefcase}
          onClick={() => onNavigate('sub_brokers')}
        />
        <StatCard
          title="Insurance Policies"
          value={String(totalPoliciesCount)}
          subtitle="Health, Motor & Life"
          trend={{ value: '+22.5%', isPositive: true, periodText: 'renewal rate: 94%' }}
          icon={Shield}
          onClick={() => onNavigate('health_insurance')}
        />
        <StatCard
          title="Total Business Volume"
          value={formatINR(totalBusinessVolume, true)}
          subtitle="Across all financial lines"
          trend={{ value: '+34.2%', isPositive: true, periodText: 'Q1 target achieved' }}
          icon={BadgeIndianRupee}
          badgeText="FY 26-27"
          badgeVariant="orange"
        />

        <StatCard
          title="Expected Brokerage"
          value={formatINR(expectedBrokerage)}
          subtitle="Gross company commission"
          icon={BadgeIndianRupee}
          badgeText="Accrued"
          badgeVariant="navy"
          onClick={() => onNavigate('brokerage_register')}
        />
        <StatCard
          title="Brokerage Received"
          value={formatINR(brokerageReceived)}
          subtitle="Realized in bank account"
          trend={{
            value: `${((brokerageReceived / (expectedBrokerage || 1)) * 100).toFixed(0)}%`,
            isPositive: true,
            periodText: 'collection efficiency',
          }}
          icon={CheckCircle2}
          onClick={() => onNavigate('brokerage_register')}
        />
        <StatCard
          title="Sub-Broker Payable"
          value={formatINR(subBrokerPayable)}
          subtitle="Net after 5% Section 194H TDS"
          icon={Briefcase}
          badgeText="Pending Batch"
          badgeVariant="orange"
          onClick={() => onNavigate('payouts')}
        />
        <StatCard
          title="Pending Reconciliation"
          value={`${pendingReconciliationCount} Txns`}
          subtitle="Awaiting provider CMS ref"
          icon={Clock}
          badgeText="Action Needed"
          badgeVariant="slate"
          onClick={() => onNavigate('payouts')}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Gross Business & Brokerage Trend</h3>
              <p className="text-xs text-slate-500">Monthly progression in INR (November 2025 – April 2026)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0B192C]" />
                Volume (Lakhs)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#EA580C]" />
                Commission
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B192C" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0B192C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="brokGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA580C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `₹${v / 100000}L`} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#0B192C', borderColor: '#1E293B', color: '#fff', fontSize: '11px', borderRadius: '6px' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#0B192C" strokeWidth={2} fillOpacity={1} fill="url(#volGradient)" />
                <Area type="monotone" dataKey="brokerage" stroke="#EA580C" strokeWidth={2} fillOpacity={1} fill="url(#brokGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Mix Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Product Distribution Mix</h3>
            <p className="text-xs text-slate-500 mb-2">Portfolio contribution by vertical</p>
          </div>

          <div className="h-44 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {productDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#0B192C', borderColor: '#1E293B', color: '#fff', fontSize: '11px', borderRadius: '6px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {productDistributionData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-mono tabular-nums font-medium text-slate-900">
                  {formatINR(item.value, true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Queues: Renewals, Maturities & Loan Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Insurance Renewals */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-orange-600" />
              Upcoming Renewals (30 Days)
            </h3>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-0.5"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-100">
            {healthPolicies.concat(motorPolicies as any).slice(0, 3).map((policy: any, idx) => (
              <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900 truncate max-w-[180px]">{policy.clientName}</p>
                  <p className="text-[11px] text-slate-500">
                    {policy.insurer} · {policy.policyNo}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono tabular-nums font-semibold text-slate-900 block">
                    {formatINR(policy.annualPremium || policy.grossPremium)}
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">
                    Due: {formatDateIST(policy.renewalDueDate || policy.policyExpiryDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FD & Bond Maturities */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Landmark className="w-3.5 h-3.5 text-blue-600" />
              FD & Bond Maturities
            </h3>
            <button
              onClick={() => onNavigate('fixed_deposits')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-100">
            {fixedDeposits.slice(0, 2).map((fd) => (
              <div key={fd.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900 truncate max-w-[180px]">{fd.clientName}</p>
                  <p className="text-[11px] text-slate-500">
                    {fd.provider} · {fd.interestRatePct}% p.a.
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono tabular-nums font-semibold text-slate-900 block">
                    {formatINR(fd.maturityAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Matures: {formatDateIST(fd.maturityDate)}
                  </span>
                </div>
              </div>
            ))}
            {bonds.slice(0, 1).map((bd) => (
              <div key={bd.id} className="pt-2 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900 truncate max-w-[180px]">{bd.clientName}</p>
                  <p className="text-[11px] text-slate-500">
                    {bd.issuer} · {bd.bondType}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono tabular-nums font-semibold text-slate-900 block">
                    {formatINR(bd.totalInvestment)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Matures: {formatDateIST(bd.maturityDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loan Pipeline Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BadgeIndianRupee className="w-3.5 h-3.5 text-emerald-600" />
              Loan Distribution Pipeline
            </h3>
            <button
              onClick={() => onNavigate('loans')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
            >
              Pipeline <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-100">
            {loans.map((loan) => (
              <div key={loan.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-slate-900 truncate max-w-[150px]">{loan.clientName}</p>
                    <StatusPill status={loan.stage} />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {loan.lender} · {loan.loanType}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono tabular-nums font-semibold text-slate-900 block">
                    {formatINR(loan.sanctionedAmount || loan.requestedAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ROI: {loan.roiPct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
