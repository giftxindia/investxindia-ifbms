import React, { useState, useEffect } from 'react';
import { Scale, Plus, Eye, Edit2, Play, CheckCircle2, ShieldAlert, AlertTriangle, RefreshCw } from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { dataStore } from '../services/mockData';
import { calculateBrokerage } from '../services/brokerageEngine';
import { brokerageService } from '../services/supabaseService';
import { BrokerageRule, UserRole } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface BrokerageRulesPageProps {
  userRole: UserRole;
  onOpenTestModal: () => void;
}

export const BrokerageRulesPage: React.FC<BrokerageRulesPageProps> = ({ userRole, onOpenTestModal }) => {
  const [rules, setRules] = useState<BrokerageRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<BrokerageRule | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BrokerageRule | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Live calculator test state
  const [calcAmount, setCalcAmount] = useState<number>(50000);
  const [calcProduct, setCalcProduct] = useState<string>('Health Insurance');
  const [calcProvider, setCalcProvider] = useState<string>('Star Health');

  const [formData, setFormData] = useState({
    ruleCode: '',
    productCategory: 'Health Insurance' as BrokerageRule['productCategory'],
    provider: 'Star Health',
    transactionType: 'Fresh' as BrokerageRule['transactionType'],
    partnerTier: 'All' as BrokerageRule['partnerTier'],
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    companyCommissionPct: 15.0,
    companyFlatInr: 0,
    subBrokerSharePct: 75.0,
    subBrokerFlatInr: 0,
    minSlabAmount: 0,
    maxSlabAmount: 1000000,
    tdsDeductionPct: 5.0,
    status: 'active' as BrokerageRule['status'],
    notes: '',
  });

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await brokerageService.getRules();
      setRules(data);
    } catch (err: any) {
      console.error('Failed to load rules:', err);
      setActionError(err.message || 'Error fetching brokerage rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const liveCalculationResult = calculateBrokerage(
    calcProduct,
    calcProvider,
    'Fresh',
    'All',
    calcAmount,
    rules
  );

  const handleOpenAdd = () => {
    if (userRole !== 'super_admin') {
      setActionError('Access Denied: Only Super Admin is authorized to configure or modify commission rules.');
      return;
    }
    setEditingRule(null);
    setFormData({
      ruleCode: '',
      productCategory: 'Health Insurance',
      provider: 'Star Health',
      transactionType: 'Fresh',
      partnerTier: 'All',
      effectiveFrom: '2026-04-01',
      effectiveTo: '2027-03-31',
      companyCommissionPct: 15.0,
      companyFlatInr: 0,
      subBrokerSharePct: 75.0,
      subBrokerFlatInr: 0,
      minSlabAmount: 0,
      maxSlabAmount: 1000000,
      tdsDeductionPct: 5.0,
      status: 'active',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (rule: BrokerageRule) => {
    if (userRole !== 'super_admin') {
      setActionError('Access Denied: Only Super Admin can modify commission rules.');
      return;
    }
    setEditingRule(rule);
    setFormData({
      ruleCode: rule.ruleCode,
      productCategory: rule.productCategory,
      provider: rule.provider,
      transactionType: rule.transactionType,
      partnerTier: rule.partnerTier,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo,
      companyCommissionPct: rule.companyCommissionPct,
      companyFlatInr: rule.companyFlatInr,
      subBrokerSharePct: rule.subBrokerSharePct,
      subBrokerFlatInr: rule.subBrokerFlatInr,
      minSlabAmount: rule.minSlabAmount,
      maxSlabAmount: rule.maxSlabAmount,
      tdsDeductionPct: rule.tdsDeductionPct,
      status: rule.status,
      notes: rule.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (userRole !== 'super_admin') {
      setActionError('Unauthorized: Only Super Admin can save rule configurations.');
      return;
    }

    try {
      if (editingRule) {
        // Update existing rule (will increment version)
        await brokerageService.updateRule({
          ...editingRule,
          productCategory: formData.productCategory,
          provider: formData.provider,
          transactionType: formData.transactionType,
          partnerTier: formData.partnerTier,
          effectiveFrom: formData.effectiveFrom,
          effectiveTo: formData.effectiveTo,
          companyCommissionPct: Number(formData.companyCommissionPct),
          companyFlatInr: Number(formData.companyFlatInr),
          subBrokerSharePct: Number(formData.subBrokerSharePct),
          subBrokerFlatInr: Number(formData.subBrokerFlatInr),
          minSlabAmount: Number(formData.minSlabAmount),
          maxSlabAmount: Number(formData.maxSlabAmount),
          tdsDeductionPct: Number(formData.tdsDeductionPct),
          status: formData.status,
          notes: formData.notes,
        });
        setActionSuccess(`Brokerage Rule ${editingRule.ruleCode} updated to version v${(editingRule.version || 1) + 1}.`);
      } else {
        // Create new rule
        if (!formData.ruleCode.trim()) {
          setActionError('Rule code is required.');
          return;
        }
        await brokerageService.createRule({
          ruleCode: formData.ruleCode.trim().toUpperCase(),
          productCategory: formData.productCategory,
          provider: formData.provider,
          transactionType: formData.transactionType,
          partnerTier: formData.partnerTier,
          effectiveFrom: formData.effectiveFrom,
          effectiveTo: formData.effectiveTo,
          companyCommissionPct: Number(formData.companyCommissionPct),
          companyFlatInr: Number(formData.companyFlatInr),
          subBrokerSharePct: Number(formData.subBrokerSharePct),
          subBrokerFlatInr: Number(formData.subBrokerFlatInr),
          minSlabAmount: Number(formData.minSlabAmount),
          maxSlabAmount: Number(formData.maxSlabAmount),
          tdsDeductionPct: Number(formData.tdsDeductionPct),
          status: formData.status,
          notes: formData.notes,
        });
        setActionSuccess(`Brokerage Rule ${formData.ruleCode.toUpperCase()} configured and published.`);
      }

      setIsAddModalOpen(false);
      setEditingRule(null);
      await loadRules();
    } catch (err: any) {
      console.error('Error saving rule:', err);
      setActionError(err.message || 'Failed to save brokerage rule');
    }
  };

  const columns: Column<BrokerageRule>[] = [
    {
      key: 'ruleCode',
      header: 'Rule Code',
      width: '160px',
      sortable: true,
      render: (rule) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-900">{rule.ruleCode}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-semibold">
              v{rule.version || 1}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {rule.transactionType} · Tier: {rule.partnerTier}
          </span>
        </div>
      ),
    },
    {
      key: 'productCategory',
      header: 'Product & Provider',
      sortable: true,
      render: (rule) => (
        <div>
          <div className="font-semibold text-slate-900">{rule.productCategory}</div>
          <div className="text-[11px] text-slate-500">{rule.provider}</div>
        </div>
      ),
    },
    {
      key: 'companyCommissionPct',
      header: 'Investxindia Rate',
      align: 'center',
      render: (rule) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{rule.companyCommissionPct}%</span>
          {rule.companyFlatInr > 0 && (
            <span className="text-[10px] text-slate-500 font-mono">+ ₹{rule.companyFlatInr}</span>
          )}
        </div>
      ),
    },
    {
      key: 'subBrokerSharePct',
      header: 'Partner Share %',
      align: 'center',
      render: (rule) => (
        <div>
          <span className="font-mono font-bold text-orange-600 block">{rule.subBrokerSharePct}% of gross</span>
          <span className="text-[10px] text-slate-400">TDS: {rule.tdsDeductionPct}%</span>
        </div>
      ),
    },
    {
      key: 'minSlabAmount',
      header: 'Slab Range (Min - Max)',
      align: 'right',
      render: (rule) => (
        <span className="font-mono text-slate-700 text-xs">
          {rule.minSlabAmount === 0 ? '₹0' : formatINR(rule.minSlabAmount, true)} – {formatINR(rule.maxSlabAmount, true)}
        </span>
      ),
    },
    {
      key: 'effectiveTo',
      header: 'Validity Period',
      sortable: true,
      render: (rule) => (
        <span className="text-slate-600 text-[11px]">
          {formatDateIST(rule.effectiveFrom)} to {formatDateIST(rule.effectiveTo)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '90px',
      render: (rule) => <StatusPill status={rule.status} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      width: '90px',
      render: (rule) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedRule(rule)}
            title="View Rule Details"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={() => handleOpenEdit(rule)}
              title="Edit Rule (Creates Next Version)"
              className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Brokerage Commission Rules Engine</h2>
          <p className="text-xs text-slate-500">
            Configure provider commission rates, distributor sharing splits, slab conditions, and Section 194H TDS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadRules}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onOpenTestModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-orange-600 fill-current" />
            <span>Run Test Suite</span>
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{actionError}</div>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 text-xs">Dismiss</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{actionSuccess}</div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700 text-xs">Dismiss</button>
        </div>
      )}

      {/* Interactive Simulation Sandbox */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Scale className="w-4 h-4 text-orange-600" />
          Interactive Rule Simulator & Breakdown Sandbox
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Test any transaction volume against active rules to preview expected gross commission, TDS deductions, and partner net payable.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Product Category</label>
            <select
              value={calcProduct}
              onChange={(e) => setCalcProduct(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="Health Insurance">Health Insurance</option>
              <option value="Motor Insurance">Motor Insurance</option>
              <option value="Life Insurance">Life Insurance</option>
              <option value="Fixed Deposits">Fixed Deposits</option>
              <option value="Bonds">Bonds & NCDs</option>
              <option value="Loans">Loans & Mortgages</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Provider Institution</label>
            <input
              type="text"
              value={calcProvider}
              onChange={(e) => setCalcProvider(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Business Amount (₹)</label>
            <input
              type="number"
              step="5000"
              value={calcAmount}
              onChange={(e) => setCalcAmount(Number(e.target.value))}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-xs space-y-1">
          {liveCalculationResult.breakdownSummary.map((item, idx) => (
            <div key={idx} className="text-slate-700">{item}</div>
          ))}
        </div>
      </div>

      {/* Rules Table */}
      <DataTable
        columns={columns}
        data={rules}
        isLoading={loading}
        searchPlaceholder="Search rules by rule code, provider, category..."
        searchKeys={['ruleCode', 'provider', 'productCategory', 'partnerTier']}
        statusFilterKey="status"
        statusFilterOptions={['active', 'draft', 'archived']}
        exportFilename="Investxindia_Brokerage_Rules_Matrix"
        onRowClick={(r) => setSelectedRule(r)}
        emptyTitle="No brokerage rules active"
        emptyDescription="Create standard product commission rules to automate transaction calculation."
      />

      {/* View Rule Modal */}
      {selectedRule && (
        <Modal
          isOpen={Boolean(selectedRule)}
          onClose={() => setSelectedRule(null)}
          title={`Rule ${selectedRule.ruleCode} (v${selectedRule.version || 1})`}
          subtitle={`${selectedRule.productCategory} · ${selectedRule.provider}`}
          maxWidth="md"
          footer={
            <div className="flex justify-between w-full">
              {userRole === 'super_admin' ? (
                <button
                  onClick={() => {
                    const r = selectedRule;
                    setSelectedRule(null);
                    handleOpenEdit(r);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
                >
                  Edit Rule
                </button>
              ) : <div />}
              <button
                onClick={() => setSelectedRule(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Type:</span>
                <span className="font-semibold text-slate-900">{selectedRule.transactionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Partner Tier:</span>
                <span className="text-slate-900">{selectedRule.partnerTier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Company Rate:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedRule.companyCommissionPct}%
                  {selectedRule.companyFlatInr > 0 && ` + ₹${selectedRule.companyFlatInr}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sub-Broker Entitlement:</span>
                <span className="font-mono font-bold text-orange-600">
                  {selectedRule.subBrokerSharePct}% of gross
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statutory TDS (Sec 194H):</span>
                <span className="font-mono text-slate-900">{selectedRule.tdsDeductionPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Slab Range:</span>
                <span className="font-mono text-slate-900">
                  ₹{selectedRule.minSlabAmount.toLocaleString('en-IN')} – ₹{selectedRule.maxSlabAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Validity:</span>
                <span className="text-slate-900">
                  {formatDateIST(selectedRule.effectiveFrom)} to {formatDateIST(selectedRule.effectiveTo)}
                </span>
              </div>
            </div>
            {selectedRule.notes && (
              <p className="text-slate-600 italic p-2 bg-slate-50 rounded border border-slate-100">
                {selectedRule.notes}
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Edit Rule Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRule(null);
        }}
        title={editingRule ? `Edit Rule: ${editingRule.ruleCode} (v${editingRule.version || 1})` : "Configure Brokerage Rule"}
        subtitle={editingRule ? "Updating this rule increments the version number while preserving historical audits." : "Define commission formula, distributor sharing slab, and effective dates."}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rule Code *</label>
              <input
                type="text"
                required
                disabled={Boolean(editingRule)}
                value={formData.ruleCode}
                onChange={(e) => setFormData({ ...formData, ruleCode: e.target.value })}
                placeholder="BR-HLT-STAR-02"
                className={`w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase ${
                  editingRule ? 'bg-slate-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Category *</label>
              <select
                value={formData.productCategory}
                onChange={(e) => setFormData({ ...formData, productCategory: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              >
                <option value="Health Insurance">Health Insurance</option>
                <option value="Motor Insurance">Motor Insurance</option>
                <option value="Life Insurance">Life Insurance</option>
                <option value="Fixed Deposits">Fixed Deposits</option>
                <option value="Bonds">Bonds</option>
                <option value="Loans">Loans</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Provider Institution *</label>
              <input
                type="text"
                required
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="e.g. Star Health or All"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Transaction Type</label>
              <select
                value={formData.transactionType}
                onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              >
                <option value="Fresh">Fresh Business</option>
                <option value="Renewal">Renewal</option>
                <option value="Topup">Topup / Endorsement</option>
                <option value="Rollover">Rollover</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Partner Tier</label>
              <select
                value={formData.partnerTier}
                onChange={(e) => setFormData({ ...formData, partnerTier: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              >
                <option value="All">All Tiers</option>
                <option value="Standard">Standard</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Comm % *</label>
              <input
                type="number"
                step="0.05"
                required
                value={formData.companyCommissionPct}
                onChange={(e) => setFormData({ ...formData, companyCommissionPct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Flat (₹)</label>
              <input
                type="number"
                value={formData.companyFlatInr}
                onChange={(e) => setFormData({ ...formData, companyFlatInr: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Partner Share % *</label>
              <input
                type="number"
                step="0.5"
                required
                value={formData.subBrokerSharePct}
                onChange={(e) => setFormData({ ...formData, subBrokerSharePct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">TDS Sec 194H %</label>
              <input
                type="number"
                step="0.1"
                value={formData.tdsDeductionPct}
                onChange={(e) => setFormData({ ...formData, tdsDeductionPct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Slab Amount (₹)</label>
              <input
                type="number"
                value={formData.minSlabAmount}
                onChange={(e) => setFormData({ ...formData, minSlabAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Slab Amount (₹)</label>
              <input
                type="number"
                value={formData.maxSlabAmount}
                onChange={(e) => setFormData({ ...formData, maxSlabAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Effective From *</label>
              <input
                type="date"
                required
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Effective To *</label>
              <input
                type="date"
                required
                value={formData.effectiveTo}
                onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Internal Audit Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. FY 2026-27 updated contract schedule per distributor agreement..."
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingRule(null);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition-colors shadow-xs"
            >
              {editingRule ? 'Save & Increment Version' : 'Save & Publish Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
