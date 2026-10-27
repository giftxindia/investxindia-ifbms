import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Eye,
  Calendar,
  Award,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  Briefcase,
  FileText,
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { lifeService, clientService, subBrokerService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { calculateBrokerage } from '../services/brokerageEngine';
import { dataStore } from '../services/mockData';
import { LifeInsurancePolicy, Client, SubBroker, UserRole, UserProfile } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface LifeInsurancePageProps {
  userRole: UserRole;
  activeUser?: UserProfile;
}

export const LifeInsurancePage: React.FC<LifeInsurancePageProps> = ({ userRole, activeUser }) => {
  const [policies, setPolicies] = useState<LifeInsurancePolicy[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<LifeInsurancePolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState<LifeInsurancePolicy | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    policyNo: '',
    clientId: '',
    subBrokerId: '',
    insurer: 'LIC of India' as LifeInsurancePolicy['insurer'],
    planType: 'Term Plan' as LifeInsurancePolicy['planType'],
    planName: 'Tech Term Pure Life Cover',
    sumAssured: 10000000,
    policyTermYears: 25,
    premiumPaymentTerm: 25,
    annualPremium: 24500,
    policyDate: new Date().toISOString().split('T')[0],
    nextPremiumDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'in_force' as LifeInsurancePolicy['status'],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [fetchedPolicies, fetchedClients, fetchedBrokers] = await Promise.all([
        lifeService.getPolicies(userRole, activeUser?.subBrokerCode),
        clientService.getClients(userRole, activeUser?.subBrokerCode),
        subBrokerService.getSubBrokers(),
      ]);
      setPolicies(fetchedPolicies);
      setClients(fetchedClients);
      setSubBrokers(fetchedBrokers);
    } catch (err: any) {
      console.error('Failed to load life policies:', err);
      setErrorBanner(err.message || 'Failed to load life policies from database.');
    } finally {
      setIsLoading(false);
    }
  }, [userRole, activeUser?.subBrokerCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Brokerage Calculation Preview
  const selectedClientObj = clients.find((c) => c.id === formData.clientId);
  const selectedBrokerObj = subBrokers.find((s) => s.id === formData.subBrokerId);
  const rules = dataStore.getBrokerageRules();
  const calcPreview = calculateBrokerage(
    'Life Insurance',
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
      policyNo: `LIC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      clientId: clients[0]?.id || '',
      subBrokerId: mySubBroker ? mySubBroker.id : (subBrokers[0]?.id || ''),
      insurer: 'LIC of India',
      planType: 'Term Plan',
      planName: 'Tech Term Pure Life Cover',
      sumAssured: 10000000,
      policyTermYears: 25,
      premiumPaymentTerm: 25,
      annualPremium: 24500,
      policyDate: new Date().toISOString().split('T')[0],
      nextPremiumDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'in_force',
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

    setIsSaving(true);
    try {
      const created = await lifeService.createPolicy({
        policyNo: formData.policyNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || 'Client',
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || 'Direct House Account',
        insurer: formData.insurer,
        planType: formData.planType,
        planName: formData.planName.trim(),
        sumAssured: Number(formData.sumAssured),
        policyTermYears: Number(formData.policyTermYears),
        premiumPaymentTerm: Number(formData.premiumPaymentTerm),
        annualPremium: Number(formData.annualPremium),
        policyDate: formData.policyDate,
        nextPremiumDate: formData.nextPremiumDate,
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        commissionReceived: 0,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
        payoutStatus: 'pending',
      });

      setSuccessBanner(`Life insurance policy #${created.policyNo} created for ${created.clientName}.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to issue life policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (policy: LifeInsurancePolicy) => {
    setFormError(null);
    setPolicyToEdit(policy);
    setFormData({
      policyNo: policy.policyNo,
      clientId: policy.clientId,
      subBrokerId: policy.subBrokerId,
      insurer: policy.insurer,
      planType: policy.planType,
      planName: policy.planName,
      sumAssured: policy.sumAssured,
      policyTermYears: policy.policyTermYears,
      premiumPaymentTerm: policy.premiumPaymentTerm,
      annualPremium: policy.annualPremium,
      policyDate: policy.policyDate,
      nextPremiumDate: policy.nextPremiumDate,
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
      const updated: LifeInsurancePolicy = {
        ...policyToEdit,
        policyNo: formData.policyNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || policyToEdit.clientName,
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || policyToEdit.subBrokerName,
        insurer: formData.insurer,
        planType: formData.planType,
        planName: formData.planName.trim(),
        sumAssured: Number(formData.sumAssured),
        policyTermYears: Number(formData.policyTermYears),
        premiumPaymentTerm: Number(formData.premiumPaymentTerm),
        annualPremium: Number(formData.annualPremium),
        policyDate: formData.policyDate,
        nextPremiumDate: formData.nextPremiumDate,
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
      };

      await lifeService.updatePolicy(updated);

      setSuccessBanner(`Life policy #${updated.policyNo} updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsEditModalOpen(false);
      setPolicyToEdit(null);
      if (selectedPolicy?.id === updated.id) {
        setSelectedPolicy(updated);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update life policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (id: string, policyNo: string) => {
    if (userRole !== 'super_admin') {
      alert('Only Super Admin is authorized to archive life policy records.');
      return;
    }
    if (confirm(`Are you sure you want to archive life policy #${policyNo}?`)) {
      try {
        await lifeService.deletePolicy(id, policyNo);
        setSuccessBanner(`Life policy #${policyNo} archived.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        if (selectedPolicy?.id === id) setSelectedPolicy(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to archive life policy.');
      }
    }
  };

  const columns: Column<LifeInsurancePolicy>[] = [
    {
      key: 'policyNo',
      header: 'Policy No. & Plan',
      sortable: true,
      render: (policy) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{policy.policyNo}</span>
          <span className="text-[11px] text-slate-500">{policy.insurer} · {policy.planType}</span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Life Assured',
      sortable: true,
      render: (policy) => (
        <div>
          <span className="font-semibold text-slate-900 block">{policy.clientName}</span>
          <span className="text-[11px] text-slate-500 font-medium">{policy.planName}</span>
        </div>
      ),
    },
    {
      key: 'sumAssured',
      header: 'Sum Assured',
      align: 'right',
      sortable: true,
      render: (policy) => (
        <span className="font-mono font-semibold text-slate-900">{formatINR(policy.sumAssured)}</span>
      ),
    },
    {
      key: 'annualPremium',
      header: 'Annual Premium',
      align: 'right',
      sortable: true,
      render: (policy) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">{formatINR(policy.annualPremium)}</span>
          <span className="text-[10px] text-slate-400">Term: {policy.policyTermYears}Y / PPT: {policy.premiumPaymentTerm}Y</span>
        </div>
      ),
    },
    {
      key: 'nextPremiumDate',
      header: 'Next Due Date',
      sortable: true,
      render: (policy) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800 block">
            {formatDateIST(policy.nextPremiumDate)}
          </span>
          <span className="text-[10px] text-slate-400">{policy.subBrokerName}</span>
        </div>
      ),
    },
    {
      key: 'commissionExpected',
      header: 'First-Yr Brokerage',
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
      width: '100px',
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
            <h2 className="text-base font-bold text-slate-900">Life Insurance Portfolio</h2>
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
            Term life protection, guaranteed savings, and ULIP policies with premium payment schedules and commission splits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh life policies"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Life Policy</span>
          </button>
        </div>
      </div>

      {/* Role Protection Banner */}
      {userRole === 'sub_broker' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2.5 text-xs text-blue-900">
          <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Sub-Broker Perspective:</strong> You are viewing life insurance contracts mapped to your channel agency ({activeUser?.subBrokerCode || 'Authorized Account'}).
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
        searchPlaceholder="Search by policy no, client name, insurer, plan type..."
        searchKeys={['policyNo', 'clientName', 'insurer', 'planName', 'planType']}
        statusFilterKey="status"
        statusFilterOptions={['in_force', 'lapsed', 'paid_up', 'matured']}
        exportFilename="Investxindia_Life_Insurance_Register"
        onRowClick={(p) => setSelectedPolicy(p)}
        emptyTitle="No life insurance policies recorded"
        emptyDescription="Book a pure risk term plan or wealth solution to record long-term agency earnings."
      />

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <Modal
          isOpen={Boolean(selectedPolicy)}
          onClose={() => setSelectedPolicy(null)}
          title={`Life Policy #${selectedPolicy.policyNo}`}
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
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Sum Assured</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedPolicy.sumAssured)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Annual Premium</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedPolicy.annualPremium)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Next Due Date</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">
                  {formatDateIST(selectedPolicy.nextPremiumDate)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Status</span>
                <StatusPill status={selectedPolicy.status} className="mt-1" />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Tenure & Brokerage Breakdown
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Plan Structure:</span>
                <span className="font-medium text-slate-900">{selectedPolicy.planType} ({selectedPolicy.policyTermYears} Yrs Term / {selectedPolicy.premiumPaymentTerm} Yrs PPT)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Expected First-Year Commission:</span>
                <span className="font-mono font-semibold text-slate-900">{formatINR(selectedPolicy.commissionExpected)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sub-Broker Payout:</span>
                <span className="font-mono font-semibold text-orange-600">{formatINR(selectedPolicy.subBrokerPayable)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Policy Commencement Date:</span>
                <span className="text-slate-800">{formatDateIST(selectedPolicy.policyDate)}</span>
              </div>
            </div>

            {/* Document Reference */}
            <div className="p-3 bg-slate-100/70 border border-slate-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">First Premium Receipt (FPR) & Policy Bond</span>
                  <span className="text-[11px] text-slate-500">{selectedPolicy.policyNo}_PolicyBond.pdf</span>
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
        title="Issue Life Insurance Policy"
        subtitle="Record individual term or guaranteed endowment contract"
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
                placeholder="LIC-2026-981245"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Life Insurer *</label>
              <select
                value={formData.insurer}
                onChange={(e) => setFormData({ ...formData, insurer: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="LIC of India">LIC of India</option>
                <option value="HDFC Life">HDFC Life</option>
                <option value="Max Life">Max Life</option>
                <option value="ICICI Prudential">ICICI Prudential</option>
                <option value="SBI Life">SBI Life</option>
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
              <label className="block font-semibold text-slate-700 mb-1">Channel Partner</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Plan Category</label>
              <select
                value={formData.planType}
                onChange={(e) => setFormData({ ...formData, planType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Term Plan">Pure Term Plan</option>
                <option value="Endowment">Endowment Savings Plan</option>
                <option value="Guaranteed Return">Guaranteed Income / Annuity</option>
                <option value="ULIP">Unit Linked Insurance Plan (ULIP)</option>
                <option value="Whole Life">Whole Life Cover</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Plan Name *</label>
              <input
                type="text"
                required
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                placeholder="e.g. Sanchay Plus Long Term Guaranteed"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sum Assured (₹) *</label>
              <input
                type="number"
                required
                min="500000"
                step="100000"
                value={formData.sumAssured}
                onChange={(e) => setFormData({ ...formData, sumAssured: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Annual Premium (₹) *</label>
              <input
                type="number"
                required
                min="5000"
                value={formData.annualPremium}
                onChange={(e) => setFormData({ ...formData, annualPremium: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Term (Years)</label>
              <input
                type="number"
                min="5"
                max="80"
                value={formData.policyTermYears}
                onChange={(e) => setFormData({ ...formData, policyTermYears: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Premium Payment Term (Years)</label>
              <input
                type="number"
                min="1"
                max="80"
                value={formData.premiumPaymentTerm}
                onChange={(e) => setFormData({ ...formData, premiumPaymentTerm: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          {/* Brokerage Engine Preview */}
          <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-md">
            <span className="text-[11px] font-semibold text-orange-900 block mb-1">
              Live Brokerage Calculation ({calcPreview.ruleVersion})
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Date</label>
              <input
                type="date"
                required
                value={formData.policyDate}
                onChange={(e) => setFormData({ ...formData, policyDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Next Premium Date</label>
              <input
                type="date"
                required
                value={formData.nextPremiumDate}
                onChange={(e) => setFormData({ ...formData, nextPremiumDate: e.target.value })}
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
              {isSaving ? 'Validating & Issuing...' : 'Issue Life Policy'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Policy Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Life Policy"
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
                <option value="in_force">In Force</option>
                <option value="lapsed">Lapsed</option>
                <option value="paid_up">Paid Up</option>
                <option value="matured">Matured</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sum Assured (₹)</label>
              <input
                type="number"
                required
                value={formData.sumAssured}
                onChange={(e) => setFormData({ ...formData, sumAssured: Number(e.target.value) })}
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
