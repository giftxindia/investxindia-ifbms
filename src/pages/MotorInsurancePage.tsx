import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Plus,
  Eye,
  Calendar,
  Building2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Edit2,
  Trash2,
  Briefcase,
  FileText,
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { motorService, clientService, subBrokerService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { calculateBrokerage } from '../services/brokerageEngine';
import { dataStore } from '../services/mockData';
import { MotorInsurancePolicy, Client, SubBroker, UserRole, UserProfile } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface MotorInsurancePageProps {
  userRole: UserRole;
  activeUser?: UserProfile;
}

export const MotorInsurancePage: React.FC<MotorInsurancePageProps> = ({ userRole, activeUser }) => {
  const [policies, setPolicies] = useState<MotorInsurancePolicy[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<MotorInsurancePolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState<MotorInsurancePolicy | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    policyNo: '',
    vehicleNo: '',
    vehicleMakeModel: '',
    policyType: 'Comprehensive' as MotorInsurancePolicy['policyType'],
    clientId: '',
    subBrokerId: '',
    insurer: 'ICICI Lombard' as MotorInsurancePolicy['insurer'],
    idvAmount: 1200000,
    netPremium: 18500,
    grossPremium: 21830,
    policyStartDate: new Date().toISOString().split('T')[0],
    policyExpiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'active' as MotorInsurancePolicy['status'],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [fetchedPolicies, fetchedClients, fetchedBrokers] = await Promise.all([
        motorService.getPolicies(userRole, activeUser?.subBrokerCode),
        clientService.getClients(userRole, activeUser?.subBrokerCode),
        subBrokerService.getSubBrokers(),
      ]);
      setPolicies(fetchedPolicies);
      setClients(fetchedClients);
      setSubBrokers(fetchedBrokers);
    } catch (err: any) {
      console.error('Failed to load motor policies:', err);
      setErrorBanner(err.message || 'Failed to load motor policies from database.');
    } finally {
      setIsLoading(false);
    }
  }, [userRole, activeUser?.subBrokerCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Brokerage Live Calculation
  const selectedClientObj = clients.find((c) => c.id === formData.clientId);
  const selectedBrokerObj = subBrokers.find((s) => s.id === formData.subBrokerId);
  const rules = dataStore.getBrokerageRules();
  const calcPreview = calculateBrokerage(
    'Motor Insurance',
    formData.insurer,
    'Fresh',
    selectedBrokerObj?.tier || 'All',
    Number(formData.netPremium) || 0,
    rules,
    selectedBrokerObj?.defaultPayoutSharePct
  );

  const handleOpenAddModal = () => {
    setFormError(null);
    const mySubBroker = userRole === 'sub_broker'
      ? subBrokers.find((sb) => sb.subBrokerCode === activeUser?.subBrokerCode || sb.id === 'sb-1')
      : null;

    setFormData({
      policyNo: `MOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleNo: 'MH-01-AB-',
      vehicleMakeModel: 'Hyundai Creta 1.5 SX',
      policyType: 'Comprehensive',
      clientId: clients[0]?.id || '',
      subBrokerId: mySubBroker ? mySubBroker.id : (subBrokers[0]?.id || ''),
      insurer: 'ICICI Lombard',
      idvAmount: 1200000,
      netPremium: 18500,
      grossPremium: 21830,
      policyStartDate: new Date().toISOString().split('T')[0],
      policyExpiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'active',
    });
    setIsAddModalOpen(true);
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.policyNo.trim() || !formData.vehicleNo.trim()) {
      setFormError('Policy number and vehicle registration are required.');
      return;
    }
    if (!formData.clientId) {
      setFormError('Please select a registered client.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await motorService.createPolicy({
        policyNo: formData.policyNo.trim().toUpperCase(),
        vehicleNo: formData.vehicleNo.trim().toUpperCase(),
        vehicleMakeModel: formData.vehicleMakeModel.trim(),
        policyType: formData.policyType,
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || 'Client',
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || 'Direct House Account',
        insurer: formData.insurer,
        idvAmount: Number(formData.idvAmount),
        netPremium: Number(formData.netPremium),
        grossPremium: Number(formData.grossPremium),
        policyStartDate: formData.policyStartDate,
        policyExpiryDate: formData.policyExpiryDate,
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        commissionReceived: 0,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
        payoutStatus: 'pending',
      });

      setSuccessBanner(`Motor policy #${created.policyNo} registered for vehicle ${created.vehicleNo}.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to issue motor policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (policy: MotorInsurancePolicy) => {
    setFormError(null);
    setPolicyToEdit(policy);
    setFormData({
      policyNo: policy.policyNo,
      vehicleNo: policy.vehicleNo,
      vehicleMakeModel: policy.vehicleMakeModel,
      policyType: policy.policyType,
      clientId: policy.clientId,
      subBrokerId: policy.subBrokerId,
      insurer: policy.insurer,
      idvAmount: policy.idvAmount,
      netPremium: policy.netPremium,
      grossPremium: policy.grossPremium,
      policyStartDate: policy.policyStartDate,
      policyExpiryDate: policy.policyExpiryDate,
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
      const updated: MotorInsurancePolicy = {
        ...policyToEdit,
        policyNo: formData.policyNo.trim().toUpperCase(),
        vehicleNo: formData.vehicleNo.trim().toUpperCase(),
        vehicleMakeModel: formData.vehicleMakeModel.trim(),
        policyType: formData.policyType,
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || policyToEdit.clientName,
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || policyToEdit.subBrokerName,
        insurer: formData.insurer,
        idvAmount: Number(formData.idvAmount),
        netPremium: Number(formData.netPremium),
        grossPremium: Number(formData.grossPremium),
        policyStartDate: formData.policyStartDate,
        policyExpiryDate: formData.policyExpiryDate,
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
      };

      await motorService.updatePolicy(updated);

      setSuccessBanner(`Motor policy #${updated.policyNo} updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsEditModalOpen(false);
      setPolicyToEdit(null);
      if (selectedPolicy?.id === updated.id) {
        setSelectedPolicy(updated);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update motor policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (id: string, policyNo: string) => {
    if (userRole !== 'super_admin') {
      alert('Only Super Admin is authorized to archive motor policy records.');
      return;
    }
    if (confirm(`Are you sure you want to archive motor policy #${policyNo}?`)) {
      try {
        await motorService.deletePolicy(id, policyNo);
        setSuccessBanner(`Motor policy #${policyNo} archived.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        if (selectedPolicy?.id === id) setSelectedPolicy(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to archive motor policy.');
      }
    }
  };

  const columns: Column<MotorInsurancePolicy>[] = [
    {
      key: 'vehicleNo',
      header: 'Vehicle Reg. & Model',
      sortable: true,
      render: (policy) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{policy.vehicleNo}</span>
          <span className="text-[11px] text-slate-500">{policy.vehicleMakeModel}</span>
        </div>
      ),
    },
    {
      key: 'policyNo',
      header: 'Policy Reference',
      sortable: true,
      render: (policy) => (
        <div>
          <span className="font-mono text-slate-800 font-semibold block">{policy.policyNo}</span>
          <span className="text-[11px] text-slate-500">{policy.insurer} · {policy.policyType}</span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Insured Client',
      sortable: true,
      render: (policy) => (
        <div>
          <span className="font-medium text-slate-900 block">{policy.clientName}</span>
          <span className="text-[10px] text-slate-400">Partner: {policy.subBrokerName}</span>
        </div>
      ),
    },
    {
      key: 'idvAmount',
      header: 'IDV (Valuation)',
      align: 'right',
      sortable: true,
      render: (policy) => (
        <span className="font-mono font-semibold text-slate-900">{formatINR(policy.idvAmount)}</span>
      ),
    },
    {
      key: 'grossPremium',
      header: 'Gross Premium',
      align: 'right',
      sortable: true,
      render: (policy) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">{formatINR(policy.grossPremium)}</span>
          <span className="text-[10px] text-slate-400 font-mono">Net: {formatINR(policy.netPremium)}</span>
        </div>
      ),
    },
    {
      key: 'policyExpiryDate',
      header: 'Expiry Date',
      sortable: true,
      render: (policy) => (
        <span className="font-medium text-slate-800 text-xs block">
          {formatDateIST(policy.policyExpiryDate)}
        </span>
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
            <h2 className="text-base font-bold text-slate-900">Motor Insurance Portfolio</h2>
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
            Private vehicle, commercial fleet, and two-wheeler policies with IDV valuation and commission splits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh motor policies"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Motor Policy</span>
          </button>
        </div>
      </div>

      {/* Role Protection Banner */}
      {userRole === 'sub_broker' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2.5 text-xs text-blue-900">
          <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Sub-Broker Perspective:</strong> Displaying vehicle policies mobilized through your channel agency ({activeUser?.subBrokerCode || 'Authorized Account'}).
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
        searchPlaceholder="Search by vehicle no (MH-01-), policy no, client, make..."
        searchKeys={['vehicleNo', 'policyNo', 'clientName', 'vehicleMakeModel', 'insurer']}
        statusFilterKey="status"
        statusFilterOptions={['active', 'expired', 'renewed']}
        exportFilename="Investxindia_Motor_Insurance_Register"
        onRowClick={(p) => setSelectedPolicy(p)}
        emptyTitle="No motor policies registered"
        emptyDescription="Book a private or commercial motor policy to track commissions and expiry dates."
      />

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <Modal
          isOpen={Boolean(selectedPolicy)}
          onClose={() => setSelectedPolicy(null)}
          title={`Vehicle Policy: ${selectedPolicy.vehicleNo}`}
          subtitle={`${selectedPolicy.vehicleMakeModel} · Policy #${selectedPolicy.policyNo}`}
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
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Insured Declared Value</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedPolicy.idvAmount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Gross Premium</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedPolicy.grossPremium)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Policy Type</span>
                <span className="text-xs font-semibold text-slate-900 block mt-1">{selectedPolicy.policyType}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Status</span>
                <StatusPill status={selectedPolicy.status} className="mt-1" />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Policy Financials & Brokerage
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Underwriting Insurer:</span>
                <span className="font-semibold text-slate-900">{selectedPolicy.insurer}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Net OD / Third Party Premium:</span>
                <span className="font-mono text-slate-900">{formatINR(selectedPolicy.netPremium)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Investxindia Expected Commission:</span>
                <span className="font-mono font-semibold text-slate-900">{formatINR(selectedPolicy.commissionExpected)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sub-Broker Payout:</span>
                <span className="font-mono font-semibold text-orange-600">{formatINR(selectedPolicy.subBrokerPayable)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Coverage Duration:</span>
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
                  <span className="font-semibold text-slate-900 block">Certificate of Insurance & RC Copy</span>
                  <span className="text-[11px] text-slate-500">{selectedPolicy.vehicleNo}_Policy_Cert.pdf</span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Verified
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Policy Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Motor Policy"
        subtitle="Record vehicle coverage with IDV, make/model, and commission split"
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
              <label className="block font-semibold text-slate-700 mb-1">Vehicle Registration No. *</label>
              <input
                type="text"
                required
                value={formData.vehicleNo}
                onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                placeholder="MH-01-AB-1234"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Reference No. *</label>
              <input
                type="text"
                required
                value={formData.policyNo}
                onChange={(e) => setFormData({ ...formData, policyNo: e.target.value })}
                placeholder="MOT-2026-98124"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vehicle Make & Model *</label>
              <input
                type="text"
                required
                value={formData.vehicleMakeModel}
                onChange={(e) => setFormData({ ...formData, vehicleMakeModel: e.target.value })}
                placeholder="e.g. Maruti Suzuki Brezza ZXI"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Type</label>
              <select
                value={formData.policyType}
                onChange={(e) => setFormData({ ...formData, policyType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Comprehensive">Comprehensive Package</option>
                <option value="Third Party">Third Party Only (Mandatory)</option>
                <option value="Own Damage">Stand-Alone Own Damage (OD)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Insured Client *</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Underwriting Insurer</label>
              <select
                value={formData.insurer}
                onChange={(e) => setFormData({ ...formData, insurer: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="ICICI Lombard">ICICI Lombard</option>
                <option value="Bajaj Allianz">Bajaj Allianz</option>
                <option value="Tata AIG">Tata AIG</option>
                <option value="Go Digit">Go Digit</option>
                <option value="HDFC ERGO">HDFC ERGO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">IDV (Valuation ₹) *</label>
              <input
                type="number"
                required
                min="10000"
                value={formData.idvAmount}
                onChange={(e) => setFormData({ ...formData, idvAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Net Premium (OD ₹) *</label>
              <input
                type="number"
                required
                min="500"
                value={formData.netPremium}
                onChange={(e) => setFormData({ ...formData, netPremium: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gross Premium (w/ GST ₹)</label>
              <input
                type="number"
                required
                min="500"
                value={formData.grossPremium}
                onChange={(e) => setFormData({ ...formData, grossPremium: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          {/* Brokerage Preview */}
          <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-md">
            <span className="text-[11px] font-semibold text-orange-900 block mb-1">
              Live Brokerage Engine Calculation ({calcPreview.ruleVersion})
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
              <label className="block font-semibold text-slate-700 mb-1">Policy Start Date</label>
              <input
                type="date"
                required
                value={formData.policyStartDate}
                onChange={(e) => setFormData({ ...formData, policyStartDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Policy Expiry Date</label>
              <input
                type="date"
                required
                value={formData.policyExpiryDate}
                onChange={(e) => setFormData({ ...formData, policyExpiryDate: e.target.value })}
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
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition-colors"
            >
              {isSaving ? 'Validating & Issuing...' : 'Save Motor Policy'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Policy Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Motor Policy"
        subtitle={policyToEdit ? `Updating ${policyToEdit.vehicleNo} (${policyToEdit.policyNo})` : ''}
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
              <label className="block font-semibold text-slate-700 mb-1">Vehicle Registration No.</label>
              <input
                type="text"
                required
                value={formData.vehicleNo}
                onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
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
                <option value="expired">Expired</option>
                <option value="renewed">Renewed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">IDV Amount (₹)</label>
              <input
                type="number"
                required
                value={formData.idvAmount}
                onChange={(e) => setFormData({ ...formData, idvAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gross Premium (₹)</label>
              <input
                type="number"
                required
                value={formData.grossPremium}
                onChange={(e) => setFormData({ ...formData, grossPremium: Number(e.target.value) })}
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
