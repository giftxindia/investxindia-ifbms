import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  Eye,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Edit2,
  Trash2,
  Briefcase,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { healthService, clientService, subBrokerService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { calculateBrokerage } from '../services/brokerageEngine';
import { dataStore } from '../services/mockData';
import { HealthInsurancePolicy, Client, SubBroker, UserRole, UserProfile } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface HealthInsurancePageProps {
  userRole: UserRole;
  activeUser?: UserProfile;
}

export const HealthInsurancePage: React.FC<HealthInsurancePageProps> = ({ userRole, activeUser }) => {
  const [policies, setPolicies] = useState<HealthInsurancePolicy[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<HealthInsurancePolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState<HealthInsurancePolicy | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    policyNo: '',
    clientId: '',
    subBrokerId: '',
    insurer: 'Star Health' as HealthInsurancePolicy['insurer'],
    planName: 'Optima Secure Family Floater',
    sumInsured: 1500000,
    annualPremium: 28500,
    policyStartDate: new Date().toISOString().split('T')[0],
    policyExpiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    renewalDueDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    paymentMode: 'Annual' as HealthInsurancePolicy['paymentMode'],
    status: 'active' as HealthInsurancePolicy['status'],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [fetchedPolicies, fetchedClients, fetchedBrokers] = await Promise.all([
        healthService.getPolicies(userRole, activeUser?.subBrokerCode),
        clientService.getClients(userRole, activeUser?.subBrokerCode),
        subBrokerService.getSubBrokers(),
      ]);
      setPolicies(fetchedPolicies);
      setClients(fetchedClients);
      setSubBrokers(fetchedBrokers);
    } catch (err: any) {
      console.error('Failed to load health policies:', err);
      setErrorBanner(err.message || 'Failed to load health policies from database.');
    } finally {
      setIsLoading(false);
    }
  }, [userRole, activeUser?.subBrokerCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Brokerage Calculation Preview
  const selectedClientObj = clients.find((c) => c.id === formData.clientId);
  const selectedBrokerObj = subBrokers.find((s) => s.id === formData.subBrokerId);
  const rules = dataStore.getBrokerageRules();
  const calcPreview = calculateBrokerage(
    'Health Insurance',
    formData.insurer,
    'Fresh',
    selectedBrokerObj?.tier || 'All',
    Number(formData.annualPremium) || 0,
    rules,
    selectedBrokerObj?.defaultPayoutSharePct
  );

  const handleOpenAddModal = () => {
    setFormError(null);
    const mySubBroker = userRole === 'sub_broker'
      ? subBrokers.find((sb) => sb.subBrokerCode === activeUser?.subBrokerCode || sb.id === 'sb-1')
      : null;

    setFormData({
      policyNo: `HI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: clients[0]?.id || '',
      subBrokerId: mySubBroker ? mySubBroker.id : (subBrokers[0]?.id || ''),
      insurer: 'Star Health',
      planName: 'Optima Secure Family Floater',
      sumInsured: 1500000,
      annualPremium: 28500,
      policyStartDate: new Date().toISOString().split('T')[0],
      policyExpiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      renewalDueDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      paymentMode: 'Annual',
      status: 'active',
    });
    setIsAddModalOpen(true);
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.policyNo.trim()) {
      setFormError('Policy reference number is required.');
      return;
    }
    if (!formData.clientId) {
      setFormError('Please select a registered client.');
      return;
    }
    if (Number(formData.annualPremium) <= 0) {
      setFormError('Annual premium must be greater than zero.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await healthService.createPolicy({
        policyNo: formData.policyNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || 'Client',
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || 'Direct House Account',
        insurer: formData.insurer,
        planName: formData.planName.trim(),
        sumInsured: Number(formData.sumInsured),
        annualPremium: Number(formData.annualPremium),
        policyStartDate: formData.policyStartDate,
        policyExpiryDate: formData.policyExpiryDate,
        renewalDueDate: formData.renewalDueDate,
        paymentMode: formData.paymentMode,
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        commissionReceived: 0,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
        payoutStatus: 'pending',
      });

      setSuccessBanner(`Health insurance policy #${created.policyNo} created successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to issue policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (policy: HealthInsurancePolicy) => {
    setFormError(null);
    setPolicyToEdit(policy);
    setFormData({
      policyNo: policy.policyNo,
      clientId: policy.clientId,
      subBrokerId: policy.subBrokerId,
      insurer: policy.insurer,
      planName: policy.planName,
      sumInsured: policy.sumInsured,
      annualPremium: policy.annualPremium,
      policyStartDate: policy.policyStartDate,
      policyExpiryDate: policy.policyExpiryDate,
      renewalDueDate: policy.renewalDueDate,
      paymentMode: policy.paymentMode,
      status: policy.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyToEdit) return;
    setFormError(null);

    setIsSaving(true);
    try {
      const updated: HealthInsurancePolicy = {
        ...policyToEdit,
        policyNo: formData.policyNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || policyToEdit.clientName,
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || policyToEdit.subBrokerName,
        insurer: formData.insurer,
        planName: formData.planName.trim(),
        sumInsured: Number(formData.sumInsured),
        annualPremium: Number(formData.annualPremium),
        policyStartDate: formData.policyStartDate,
        policyExpiryDate: formData.policyExpiryDate,
        renewalDueDate: formData.renewalDueDate,
        paymentMode: formData.paymentMode,
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
      };

      await healthService.updatePolicy(updated);

      setSuccessBanner(`Policy #${updated.policyNo} updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsEditModalOpen(false);
      setPolicyToEdit(null);
      if (selectedPolicy?.id === updated.id) {
        setSelectedPolicy(updated);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (id: string, policyNo: string) => {
    if (userRole !== 'super_admin') {
      alert('Only Super Admin is authorized to archive or delete policy records.');
      return;
    }
    if (confirm(`Are you sure you want to archive policy #${policyNo}?\nThis action will be recorded in the audit log.`)) {
      try {
        await healthService.deletePolicy(id, policyNo);
        setSuccessBanner(`Policy #${policyNo} archived.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        if (selectedPolicy?.id === id) setSelectedPolicy(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to archive policy.');
      }
    }
  };

  const columns: Column<HealthInsurancePolicy>[] = [
    {
      key: 'policyNo',
      header: 'Policy No.',
      width: '140px',
      sortable: true,
      render: (policy) => (
        <span className="font-mono font-semibold text-slate-900">{policy.policyNo}</span>
      ),
    },
    {
      key: 'clientName',
      header: 'Client & Insurer',
      sortable: true,
      render: (policy) => (
        <div>
          <div className="font-semibold text-slate-900">{policy.clientName}</div>
          <div className="text-[11px] text-slate-500">
            {policy.insurer} · {policy.planName}
          </div>
        </div>
      ),
    },
    {
      key: 'sumInsured',
      header: 'Sum Insured',
      align: 'right',
      sortable: true,
      render: (policy) => (
        <span className="font-mono font-semibold text-slate-900">{formatINR(policy.sumInsured)}</span>
      ),
    },
    {
      key: 'annualPremium',
      header: 'Annual Premium',
      align: 'right',
      sortable: true,
      render: (policy) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">
            {formatINR(policy.annualPremium)}
          </span>
          <span className="text-[10px] text-slate-400">{policy.paymentMode}</span>
        </div>
      ),
    },
    {
      key: 'renewalDueDate',
      header: 'Renewal Due',
      sortable: true,
      render: (policy) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800 block">
            {formatDateIST(policy.renewalDueDate)}
          </span>
          <span className="text-[10px] text-slate-400">{policy.subBrokerName}</span>
        </div>
      ),
    },
    {
      key: 'commissionExpected',
      header: 'Brokerage (Gross / SB)',
      align: 'right',
      render: (policy) => (
        <div className="font-mono">
          <span className="text-slate-900 font-semibold block">{formatINR(policy.commissionExpected)}</span>
          <span className="text-orange-600 text-[11px]">SB: {formatINR(policy.subBrokerPayable)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (policy) => <StatusPill status={policy.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '100px',
      render: (policy) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedPolicy(policy)}
            title="View Details"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenEditModal(policy)}
            title="Edit Policy"
            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={() => handleDeletePolicy(policy.id, policy.policyNo)}
              title="Archive Policy"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Health Insurance Portfolio</h2>
            {!isSupabaseConfigured() ? (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                Local Sandbox Mode
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Supabase RLS Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Retail, family floater, and group medical coverage with IRDAI-compliant commission accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh policies"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Health Policy</span>
          </button>
        </div>
      </div>

      {/* Role Protection Banner */}
      {userRole === 'sub_broker' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2.5 text-xs text-blue-900">
          <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Sub-Broker Perspective:</strong> You are viewing health insurance policies originated through your channel agency ({activeUser?.subBrokerCode || 'Authorized Account'}).
          </span>
        </div>
      )}

      {/* Alerts */}
      {errorBanner && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1">{errorBanner}</span>
          <button onClick={() => setErrorBanner(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1">{successBanner}</span>
          <button onClick={() => setSuccessBanner(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={policies}
        isLoading={isLoading}
        searchPlaceholder="Search by policy no, client name, insurer, plan..."
        searchKeys={['policyNo', 'clientName', 'insurer', 'planName']}
        statusFilterKey="status"
        statusFilterOptions={['active', 'grace_period', 'lapsed', 'renewed']}
        exportFilename="Investxindia_Health_Insurance_Register"
        onRowClick={(p) => setSelectedPolicy(p)}
        emptyTitle="No health policies found"
        emptyDescription="Book a health policy or connect with your distribution network."
      />

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <Modal
          isOpen={Boolean(selectedPolicy)}
          onClose={() => setSelectedPolicy(null)}
          title={`Policy #${selectedPolicy.policyNo}`}
          subtitle={`${selectedPolicy.insurer} · ${selectedPolicy.planName}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-500">
                Client: <strong>{selectedPolicy.clientName}</strong> · Partner: {selectedPolicy.subBrokerName}
              </span>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Sum Insured</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedPolicy.sumInsured)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Annual Premium</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedPolicy.annualPremium)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Policy Status</span>
                <StatusPill status={selectedPolicy.status} className="mt-1" />
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Renewal Due</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">
                  {formatDateIST(selectedPolicy.renewalDueDate)}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Brokerage & Payout Accounting
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Investxindia Expected Commission:</span>
                <span className="font-mono font-semibold text-slate-900">{formatINR(selectedPolicy.commissionExpected)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sub-Broker Net Payout:</span>
                <span className="font-mono font-semibold text-orange-600">{formatINR(selectedPolicy.subBrokerPayable)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Payout Status:</span>
                <StatusPill status={selectedPolicy.payoutStatus} />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Policy Validity:</span>
                <span className="text-slate-800">
                  {formatDateIST(selectedPolicy.policyStartDate)} to {formatDateIST(selectedPolicy.policyExpiryDate)}
                </span>
              </div>
            </div>

            {/* Document Reference */}
            <div className="p-3 bg-slate-100/70 border border-slate-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">Policy Schedule Document</span>
                  <span className="text-[11px] text-slate-500">IRDAI-verified digital copy ({selectedPolicy.policyNo}.pdf)</span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Archived & Verified
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Policy Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Issue Health Insurance Policy"
        subtitle="Record validated medical insurance coverage with live commission calculation"
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Number *</label>
              <input
                type="text"
                required
                value={formData.policyNo}
                onChange={(e) => setFormData({ ...formData, policyNo: e.target.value })}
                placeholder="HI-2026-STAR-1234"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Underwriting Insurer *</label>
              <select
                value={formData.insurer}
                onChange={(e) => setFormData({ ...formData, insurer: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Star Health">Star Health</option>
                <option value="HDFC ERGO">HDFC ERGO</option>
                <option value="Care Health">Care Health</option>
                <option value="Niva Bupa">Niva Bupa</option>
                <option value="Aditya Birla Health">Aditya Birla Health</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client Name *</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="">Select Investor</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.clientCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Channel Partner (Sub-Broker)</label>
              <select
                value={formData.subBrokerId}
                onChange={(e) => setFormData({ ...formData, subBrokerId: e.target.value })}
                disabled={userRole === 'sub_broker'}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="">Direct House Account</option>
                {subBrokers.map((sb) => (
                  <option key={sb.id} value={sb.id}>
                    {sb.name} ({sb.subBrokerCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product / Plan Name *</label>
            <input
              type="text"
              required
              value={formData.planName}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              placeholder="e.g. Optima Secure 2A+2C Floater"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sum Insured (₹) *</label>
              <input
                type="number"
                required
                min="100000"
                step="50000"
                value={formData.sumInsured}
                onChange={(e) => setFormData({ ...formData, sumInsured: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Annual Premium (₹) *</label>
              <input
                type="number"
                required
                min="1000"
                value={formData.annualPremium}
                onChange={(e) => setFormData({ ...formData, annualPremium: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          {/* Brokerage Calculation Live Preview */}
          <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-md">
            <span className="text-[11px] font-semibold text-orange-900 block mb-1">
              Live Brokerage Engine Breakdown ({calcPreview.ruleVersion})
            </span>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Company Gross:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(calcPreview.companyGrossExpected)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sub-Broker Share:</span>
                <span className="font-mono font-bold text-orange-700">{formatINR(calcPreview.subBrokerNetPayable)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Retained Net:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(calcPreview.companyRetainedNet)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.policyStartDate}
                onChange={(e) => setFormData({ ...formData, policyStartDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                required
                value={formData.policyExpiryDate}
                onChange={(e) => setFormData({ ...formData, policyExpiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Renewal Due</label>
              <input
                type="date"
                required
                value={formData.renewalDueDate}
                onChange={(e) => setFormData({ ...formData, renewalDueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md transition-colors"
            >
              {isSaving ? 'Validating & Issuing...' : 'Issue Policy'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Policy Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Health Policy"
        subtitle={policyToEdit ? `Updating policy #${policyToEdit.policyNo}` : ''}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdatePolicy} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Number</label>
              <input
                type="text"
                required
                value={formData.policyNo}
                onChange={(e) => setFormData({ ...formData, policyNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono uppercase bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="active">Active</option>
                <option value="grace_period">Grace Period</option>
                <option value="lapsed">Lapsed</option>
                <option value="renewed">Renewed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sum Insured (₹)</label>
              <input
                type="number"
                required
                value={formData.sumInsured}
                onChange={(e) => setFormData({ ...formData, sumInsured: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Annual Premium (₹)</label>
              <input
                type="number"
                required
                value={formData.annualPremium}
                onChange={(e) => setFormData({ ...formData, annualPremium: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Name</label>
              <input
                type="text"
                required
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Renewal Due Date</label>
              <input
                type="date"
                required
                value={formData.renewalDueDate}
                onChange={(e) => setFormData({ ...formData, renewalDueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition-colors"
            >
              {isSaving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
