import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Plus,
  Eye,
  Calendar,
  Building,
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
import { fdService, clientService, subBrokerService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { calculateBrokerage } from '../services/brokerageEngine';
import { dataStore } from '../services/mockData';
import { FixedDeposit, Client, SubBroker, UserRole, UserProfile } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface FixedDepositsPageProps {
  userRole: UserRole;
  activeUser?: UserProfile;
}

export const FixedDepositsPage: React.FC<FixedDepositsPageProps> = ({ userRole, activeUser }) => {
  const [fds, setFds] = useState<FixedDeposit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [selectedFd, setSelectedFd] = useState<FixedDeposit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fdToEdit, setFdToEdit] = useState<FixedDeposit | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    applicationNo: '',
    clientId: '',
    subBrokerId: '',
    provider: 'Bajaj Finance Ltd' as FixedDeposit['provider'],
    depositAmount: 500000,
    tenureMonths: 36,
    interestRatePct: 8.35,
    interestPayoutFrequency: 'Annual' as FixedDeposit['interestPayoutFrequency'],
    depositDate: new Date().toISOString().split('T')[0],
    maturityDate: new Date(Date.now() + 36 * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'active' as FixedDeposit['status'],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [fetchedFds, fetchedClients, fetchedBrokers] = await Promise.all([
        fdService.getDeposits(userRole, activeUser?.subBrokerCode),
        clientService.getClients(userRole, activeUser?.subBrokerCode),
        subBrokerService.getSubBrokers(),
      ]);
      setFds(fetchedFds);
      setClients(fetchedClients);
      setSubBrokers(fetchedBrokers);
    } catch (err: any) {
      console.error('Failed to load fixed deposits:', err);
      setErrorBanner(err.message || 'Failed to load fixed deposits from database.');
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
    'Fixed Deposits',
    formData.provider,
    'Fresh',
    selectedBrokerObj?.tier || 'All',
    Number(formData.depositAmount) || 0,
    rules,
    selectedBrokerObj?.defaultPayoutSharePct
  );

  const handleOpenAddModal = () => {
    setFormError(null);
    const mySubBroker = userRole === 'sub_broker'
      ? subBrokers.find((sb) => sb.subBrokerCode === activeUser?.subBrokerCode || sb.id === 'sb-1')
      : null;

    setFormData({
      applicationNo: `FD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      clientId: clients[0]?.id || '',
      subBrokerId: mySubBroker ? mySubBroker.id : (subBrokers[0]?.id || ''),
      provider: 'Bajaj Finance Ltd',
      depositAmount: 500000,
      tenureMonths: 36,
      interestRatePct: 8.35,
      interestPayoutFrequency: 'Annual',
      depositDate: new Date().toISOString().split('T')[0],
      maturityDate: new Date(Date.now() + 36 * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'active',
    });
    setIsAddModalOpen(true);
  };

  const handleCreateFd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.applicationNo.trim()) {
      setFormError('Application or deposit reference number is required.');
      return;
    }
    if (!formData.clientId) {
      setFormError('Please select a registered client.');
      return;
    }
    if (Number(formData.depositAmount) <= 0) {
      setFormError('Deposit amount must be greater than zero.');
      return;
    }

    const amt = Number(formData.depositAmount);
    const rate = Number(formData.interestRatePct);
    const years = Number(formData.tenureMonths) / 12;
    const estMaturity = amt + amt * (rate / 100) * years;

    setIsSaving(true);
    try {
      const created = await fdService.createDeposit({
        applicationNo: formData.applicationNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || 'Client',
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || 'Direct House Account',
        provider: formData.provider,
        depositAmount: amt,
        tenureMonths: Number(formData.tenureMonths),
        interestRatePct: rate,
        interestPayoutFrequency: formData.interestPayoutFrequency,
        depositDate: formData.depositDate,
        maturityDate: formData.maturityDate,
        maturityAmount: Math.round(estMaturity),
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        commissionReceived: 0,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
        payoutStatus: 'pending',
      });

      setSuccessBanner(`Corporate FD application #${created.applicationNo} booked with ${created.provider}.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to book fixed deposit.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (fd: FixedDeposit) => {
    setFormError(null);
    setFdToEdit(fd);
    setFormData({
      applicationNo: fd.applicationNo,
      clientId: fd.clientId,
      subBrokerId: fd.subBrokerId,
      provider: fd.provider,
      depositAmount: fd.depositAmount,
      tenureMonths: fd.tenureMonths,
      interestRatePct: fd.interestRatePct,
      interestPayoutFrequency: fd.interestPayoutFrequency,
      depositDate: fd.depositDate,
      maturityDate: fd.maturityDate,
      status: fd.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateFd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fdToEdit) return;
    setFormError(null);

    const amt = Number(formData.depositAmount);
    const rate = Number(formData.interestRatePct);
    const years = Number(formData.tenureMonths) / 12;
    const estMaturity = amt + amt * (rate / 100) * years;

    setIsSaving(true);
    try {
      const updated: FixedDeposit = {
        ...fdToEdit,
        applicationNo: formData.applicationNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || fdToEdit.clientName,
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || fdToEdit.subBrokerName,
        provider: formData.provider,
        depositAmount: amt,
        tenureMonths: Number(formData.tenureMonths),
        interestRatePct: rate,
        interestPayoutFrequency: formData.interestPayoutFrequency,
        depositDate: formData.depositDate,
        maturityDate: formData.maturityDate,
        maturityAmount: Math.round(estMaturity),
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
      };

      await fdService.updateDeposit(updated);

      setSuccessBanner(`Fixed Deposit #${updated.applicationNo} updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsEditModalOpen(false);
      setFdToEdit(null);
      if (selectedFd?.id === updated.id) {
        setSelectedFd(updated);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update fixed deposit.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFd = async (id: string, appNo: string) => {
    if (userRole !== 'super_admin') {
      alert('Only Super Admin is authorized to archive fixed deposit records.');
      return;
    }
    if (confirm(`Are you sure you want to archive FD application #${appNo}?`)) {
      try {
        await fdService.deleteDeposit(id, appNo);
        setSuccessBanner(`Fixed Deposit #${appNo} archived.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        if (selectedFd?.id === id) setSelectedFd(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to archive FD.');
      }
    }
  };

  const columns: Column<FixedDeposit>[] = [
    {
      key: 'applicationNo',
      header: 'App Ref. & Provider',
      sortable: true,
      render: (fd) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{fd.applicationNo}</span>
          <span className="text-[11px] text-slate-500 font-medium">{fd.provider}</span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Investor Client',
      sortable: true,
      render: (fd) => (
        <div>
          <span className="font-semibold text-slate-900 block">{fd.clientName}</span>
          <span className="text-[10px] text-slate-400">Partner: {fd.subBrokerName}</span>
        </div>
      ),
    },
    {
      key: 'depositAmount',
      header: 'Deposit Amount',
      align: 'right',
      sortable: true,
      render: (fd) => (
        <span className="font-mono font-semibold text-slate-900">{formatINR(fd.depositAmount)}</span>
      ),
    },
    {
      key: 'interestRatePct',
      header: 'Rate & Tenure',
      align: 'center',
      render: (fd) => (
        <div className="text-center">
          <span className="font-mono font-bold text-emerald-700 block">{fd.interestRatePct}% p.a.</span>
          <span className="text-[10px] text-slate-400">{fd.tenureMonths} Months ({fd.interestPayoutFrequency})</span>
        </div>
      ),
    },
    {
      key: 'maturityAmount',
      header: 'Maturity Amount',
      align: 'right',
      sortable: true,
      render: (fd) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">{formatINR(fd.maturityAmount)}</span>
          <span className="text-[10px] text-slate-500">{formatDateIST(fd.maturityDate)}</span>
        </div>
      ),
    },
    {
      key: 'commissionExpected',
      header: 'Brokerage (Gross / SB)',
      align: 'right',
      render: (fd) => (
        <div className="font-mono">
          <span className="text-slate-900 font-semibold block">{formatINR(fd.commissionExpected)}</span>
          <span className="text-orange-600 text-[11px]">SB: {formatINR(fd.subBrokerPayable)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (fd) => <StatusPill status={fd.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '100px',
      render: (fd) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedFd(fd)}
            title="View Details"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenEditModal(fd)}
            title="Edit Deposit"
            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={() => handleDeleteFd(fd.id, fd.applicationNo)}
              title="Archive Deposit"
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
            <h2 className="text-base font-bold text-slate-900">Corporate Fixed Deposits</h2>
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
            AAA-rated corporate and bank fixed deposits with interest payout schedules and mobilization commissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh FDs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Book Fixed Deposit</span>
          </button>
        </div>
      </div>

      {/* Role Protection Banner */}
      {userRole === 'sub_broker' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2.5 text-xs text-blue-900">
          <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Sub-Broker Perspective:</strong> You are viewing corporate fixed deposits sourced through your agency ({activeUser?.subBrokerCode || 'Authorized Account'}).
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
        data={fds}
        isLoading={isLoading}
        searchPlaceholder="Search by application no, client, provider..."
        searchKeys={['applicationNo', 'clientName', 'provider']}
        statusFilterKey="status"
        statusFilterOptions={['active', 'matured', 'premature_closed']}
        exportFilename="Investxindia_Fixed_Deposits_Register"
        onRowClick={(f) => setSelectedFd(f)}
        emptyTitle="No corporate fixed deposits registered"
        emptyDescription="Mobilize investor funds into high-yielding corporate FDs to earn distribution fees."
      />

      {/* Policy Details Modal */}
      {selectedFd && (
        <Modal
          isOpen={Boolean(selectedFd)}
          onClose={() => setSelectedFd(null)}
          title={`Fixed Deposit: App #${selectedFd.applicationNo}`}
          subtitle={`${selectedFd.provider} · ${selectedFd.tenureMonths} Months (${selectedFd.interestRatePct}% p.a.)`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-500">
                Client: <strong>{selectedFd.clientName}</strong> · Partner: {selectedFd.subBrokerName}
              </span>
              <button
                onClick={() => setSelectedFd(null)}
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
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Principal Amount</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedFd.depositAmount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Maturity Amount</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {formatINR(selectedFd.maturityAmount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Interest Rate</span>
                <span className="text-sm font-bold text-slate-900 font-mono block mt-0.5">
                  {selectedFd.interestRatePct}% p.a.
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Maturity Date</span>
                <span className="text-xs font-bold text-slate-900 block mt-1">
                  {formatDateIST(selectedFd.maturityDate)}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Deposit Terms & Payouts
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Payout Frequency:</span>
                <span className="font-medium text-slate-900">{selectedFd.interestPayoutFrequency}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Investxindia Expected Fee:</span>
                <span className="font-mono font-semibold text-slate-900">{formatINR(selectedFd.commissionExpected)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sub-Broker Share:</span>
                <span className="font-mono font-semibold text-orange-600">{formatINR(selectedFd.subBrokerPayable)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Deposit Booking Date:</span>
                <span className="text-slate-800">{formatDateIST(selectedFd.depositDate)}</span>
              </div>
            </div>

            {/* Document Reference */}
            <div className="p-3 bg-slate-100/70 border border-slate-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">Fixed Deposit Receipt (FDR Copy)</span>
                  <span className="text-[11px] text-slate-500">{selectedFd.applicationNo}_FDR_Advice.pdf</span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Archived & Verified
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Add FD Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Book Corporate Fixed Deposit"
        subtitle="Record corporate deposit application with rate, tenure, and payout frequency"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateFd} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application / Deposit No. *</label>
              <input
                type="text"
                required
                value={formData.applicationNo}
                onChange={(e) => setFormData({ ...formData, applicationNo: e.target.value })}
                placeholder="FD-2026-98124"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Corporate Deposit Issuer *</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Bajaj Finance Ltd">Bajaj Finance Ltd (AAA Rated)</option>
                <option value="Shriram Finance">Shriram Finance (AA+ Rated)</option>
                <option value="HDFC Bank Ltd">HDFC Bank Ltd</option>
                <option value="Mahindra Finance">Mahindra Finance (AAA Rated)</option>
                <option value="Sundaram Home">Sundaram Home Finance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Investor Client *</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deposit Principal (₹) *</label>
              <input
                type="number"
                required
                min="10000"
                step="5000"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tenure (Months) *</label>
              <input
                type="number"
                required
                min="12"
                max="120"
                value={formData.tenureMonths}
                onChange={(e) => setFormData({ ...formData, tenureMonths: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Interest Rate (% p.a.) *</label>
              <input
                type="number"
                step="0.05"
                required
                min="3"
                max="15"
                value={formData.interestRatePct}
                onChange={(e) => setFormData({ ...formData, interestRatePct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Interest Frequency</label>
              <select
                value={formData.interestPayoutFrequency}
                onChange={(e) => setFormData({ ...formData, interestPayoutFrequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Annual">Annual Payout</option>
                <option value="Cumulative">Cumulative (at Maturity)</option>
                <option value="Monthly">Monthly Non-Cumulative</option>
                <option value="Quarterly">Quarterly Non-Cumulative</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deposit Date</label>
              <input
                type="date"
                required
                value={formData.depositDate}
                onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Maturity Date</label>
              <input
                type="date"
                required
                value={formData.maturityDate}
                onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white"
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
              {isSaving ? 'Validating & Booking...' : 'Book Fixed Deposit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit FD Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Fixed Deposit"
        subtitle={fdToEdit ? `Updating deposit #${fdToEdit.applicationNo}` : ''}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateFd} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application No.</label>
              <input
                type="text"
                required
                value={formData.applicationNo}
                onChange={(e) => setFormData({ ...formData, applicationNo: e.target.value })}
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
                <option value="matured">Matured</option>
                <option value="premature_closed">Premature Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Principal Amount (₹)</label>
              <input
                type="number"
                required
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Interest Rate (% p.a.)</label>
              <input
                type="number"
                step="0.05"
                required
                value={formData.interestRatePct}
                onChange={(e) => setFormData({ ...formData, interestRatePct: Number(e.target.value) })}
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
