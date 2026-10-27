import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  Plus,
  Eye,
  Calendar,
  Award,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Edit2,
  Trash2,
  Briefcase,
  FileText,
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { bondService, clientService, subBrokerService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { calculateBrokerage } from '../services/brokerageEngine';
import { dataStore } from '../services/mockData';
import { Bond, Client, SubBroker, UserRole, UserProfile } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface BondsPageProps {
  userRole: UserRole;
  activeUser?: UserProfile;
}

export const BondsPage: React.FC<BondsPageProps> = ({ userRole, activeUser }) => {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bondToEdit, setBondToEdit] = useState<Bond | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    applicationNo: '',
    isinNo: 'INE020B08DF2',
    clientId: '',
    subBrokerId: '',
    issuer: 'REC Ltd (54EC)' as Bond['issuer'],
    bondType: 'Capital Gains 54EC' as Bond['bondType'],
    faceValuePerUnit: 10000,
    unitsAllocated: 250,
    totalInvestment: 2500000,
    couponRatePct: 5.25,
    issueDate: new Date().toISOString().split('T')[0],
    maturityDate: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    status: 'allotted' as Bond['status'],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [fetchedBonds, fetchedClients, fetchedBrokers] = await Promise.all([
        bondService.getBonds(userRole, activeUser?.subBrokerCode),
        clientService.getClients(userRole, activeUser?.subBrokerCode),
        subBrokerService.getSubBrokers(),
      ]);
      setBonds(fetchedBonds);
      setClients(fetchedClients);
      setSubBrokers(fetchedBrokers);
    } catch (err: any) {
      console.error('Failed to load bonds:', err);
      setErrorBanner(err.message || 'Failed to load bonds and debentures from database.');
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
    'Bonds',
    formData.issuer,
    'Fresh',
    selectedBrokerObj?.tier || 'All',
    Number(formData.totalInvestment) || 0,
    rules,
    selectedBrokerObj?.defaultPayoutSharePct
  );

  const handleOpenAddModal = () => {
    setFormError(null);
    const mySubBroker = userRole === 'sub_broker'
      ? subBrokers.find((sb) => sb.subBrokerCode === activeUser?.subBrokerCode || sb.id === 'sb-1')
      : null;

    setFormData({
      applicationNo: `BND-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      isinNo: 'INE020B08DF2',
      clientId: clients[0]?.id || '',
      subBrokerId: mySubBroker ? mySubBroker.id : (subBrokers[0]?.id || ''),
      issuer: 'REC Ltd (54EC)',
      bondType: 'Capital Gains 54EC',
      faceValuePerUnit: 10000,
      unitsAllocated: 250,
      totalInvestment: 2500000,
      couponRatePct: 5.25,
      issueDate: new Date().toISOString().split('T')[0],
      maturityDate: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'allotted',
    });
    setIsAddModalOpen(true);
  };

  const handleCreateBond = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.applicationNo.trim() || !formData.isinNo.trim()) {
      setFormError('Application reference number and ISIN code are required.');
      return;
    }
    if (!formData.clientId) {
      setFormError('Please select an investor client.');
      return;
    }
    if (Number(formData.totalInvestment) <= 0) {
      setFormError('Total investment amount must be greater than zero.');
      return;
    }

    const total = Number(formData.totalInvestment);
    const rate = Number(formData.couponRatePct);
    const annualInterest = total * (rate / 100);

    setIsSaving(true);
    try {
      const created = await bondService.createBond({
        applicationNo: formData.applicationNo.trim().toUpperCase(),
        isinNo: formData.isinNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || 'Client',
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || 'Direct House Account',
        issuer: formData.issuer,
        bondType: formData.bondType,
        faceValuePerUnit: Number(formData.faceValuePerUnit),
        unitsAllocated: Number(formData.unitsAllocated),
        totalInvestment: total,
        couponRatePct: rate,
        annualInterestPayout: Math.round(annualInterest),
        issueDate: formData.issueDate,
        maturityDate: formData.maturityDate,
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        commissionReceived: 0,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
        payoutStatus: 'pending',
      });

      setSuccessBanner(`Bond allotment #${created.applicationNo} registered (${created.issuer}).`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to allot bond.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (bond: Bond) => {
    setFormError(null);
    setBondToEdit(bond);
    setFormData({
      applicationNo: bond.applicationNo,
      isinNo: bond.isinNo,
      clientId: bond.clientId,
      subBrokerId: bond.subBrokerId,
      issuer: bond.issuer,
      bondType: bond.bondType,
      faceValuePerUnit: bond.faceValuePerUnit,
      unitsAllocated: bond.unitsAllocated,
      totalInvestment: bond.totalInvestment,
      couponRatePct: bond.couponRatePct,
      issueDate: bond.issueDate,
      maturityDate: bond.maturityDate,
      status: bond.status,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateBond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bondToEdit) return;
    setFormError(null);

    const total = Number(formData.totalInvestment);
    const rate = Number(formData.couponRatePct);
    const annualInterest = total * (rate / 100);

    setIsSaving(true);
    try {
      const updated: Bond = {
        ...bondToEdit,
        applicationNo: formData.applicationNo.trim().toUpperCase(),
        isinNo: formData.isinNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || bondToEdit.clientName,
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || bondToEdit.subBrokerName,
        issuer: formData.issuer,
        bondType: formData.bondType,
        faceValuePerUnit: Number(formData.faceValuePerUnit),
        unitsAllocated: Number(formData.unitsAllocated),
        totalInvestment: total,
        couponRatePct: rate,
        annualInterestPayout: Math.round(annualInterest),
        issueDate: formData.issueDate,
        maturityDate: formData.maturityDate,
        status: formData.status,
        commissionExpected: calcPreview.companyGrossExpected,
        subBrokerPayable: calcPreview.subBrokerNetPayable,
      };

      await bondService.updateBond(updated);

      setSuccessBanner(`Bond allotment #${updated.applicationNo} updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsEditModalOpen(false);
      setBondToEdit(null);
      if (selectedBond?.id === updated.id) {
        setSelectedBond(updated);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update bond record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBond = async (id: string, appNo: string) => {
    if (userRole !== 'super_admin') {
      alert('Only Super Admin is authorized to archive bond allotments.');
      return;
    }
    if (confirm(`Are you sure you want to archive bond application #${appNo}?`)) {
      try {
        await bondService.deleteBond(id, appNo);
        setSuccessBanner(`Bond #${appNo} archived.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        if (selectedBond?.id === id) setSelectedBond(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to archive bond.');
      }
    }
  };

  const columns: Column<Bond>[] = [
    {
      key: 'applicationNo',
      header: 'Allotment Ref & ISIN',
      sortable: true,
      render: (bond) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{bond.applicationNo}</span>
          <span className="font-mono text-[10px] text-slate-500">{bond.isinNo}</span>
        </div>
      ),
    },
    {
      key: 'issuer',
      header: 'Issuer & Bond Series',
      sortable: true,
      render: (bond) => (
        <div>
          <span className="font-semibold text-slate-900 block">{bond.issuer}</span>
          <span className="text-[11px] text-slate-500">{bond.bondType}</span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Allottee Client',
      sortable: true,
      render: (bond) => (
        <div>
          <span className="font-medium text-slate-900 block">{bond.clientName}</span>
          <span className="text-[10px] text-slate-400">Partner: {bond.subBrokerName}</span>
        </div>
      ),
    },
    {
      key: 'totalInvestment',
      header: 'Total Allotted',
      align: 'right',
      sortable: true,
      render: (bond) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">{formatINR(bond.totalInvestment)}</span>
          <span className="text-[10px] text-slate-400 font-mono">{bond.unitsAllocated} Units</span>
        </div>
      ),
    },
    {
      key: 'couponRatePct',
      header: 'Coupon Rate',
      align: 'center',
      render: (bond) => (
        <div className="text-center">
          <span className="font-mono font-bold text-blue-700 block">{bond.couponRatePct}% p.a.</span>
          <span className="text-[10px] text-slate-500 font-mono">{formatINR(bond.annualInterestPayout)}/yr</span>
        </div>
      ),
    },
    {
      key: 'maturityDate',
      header: 'Maturity Date',
      sortable: true,
      render: (bond) => (
        <span className="font-medium text-slate-800 text-xs block">
          {formatDateIST(bond.maturityDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (bond) => <StatusPill status={bond.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '100px',
      render: (bond) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedBond(bond)}
            title="View Details"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenEditModal(bond)}
            title="Edit Bond"
            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={() => handleDeleteBond(bond.id, bond.applicationNo)}
              title="Archive Bond"
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
            <h2 className="text-base font-bold text-slate-900">Capital Gains 54EC Bonds & Corporate NCDs</h2>
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
            REC, NHAI, PFC 54EC tax exemption bonds and high-yield corporate NCDs with coupon rate and allotment tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh bonds"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Allot Bonds</span>
          </button>
        </div>
      </div>

      {/* Role Protection Banner */}
      {userRole === 'sub_broker' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2.5 text-xs text-blue-900">
          <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Sub-Broker Perspective:</strong> You are viewing bond allotments sourced through your partner agency ({activeUser?.subBrokerCode || 'Authorized Account'}).
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
        data={bonds}
        isLoading={isLoading}
        searchPlaceholder="Search by application no, ISIN, client, issuer..."
        searchKeys={['applicationNo', 'isinNo', 'clientName', 'issuer', 'bondType']}
        statusFilterKey="status"
        statusFilterOptions={['allotted', 'pending_allotment', 'redeemed']}
        exportFilename="Investxindia_Bonds_Register"
        onRowClick={(b) => setSelectedBond(b)}
        emptyTitle="No bond allotments recorded"
        emptyDescription="Record Section 54EC capital gains bond applications or corporate NCD allotments."
      />

      {/* Policy Details Modal */}
      {selectedBond && (
        <Modal
          isOpen={Boolean(selectedBond)}
          onClose={() => setSelectedBond(null)}
          title={`Bond Allotment: ${selectedBond.applicationNo}`}
          subtitle={`${selectedBond.issuer} · ISIN: ${selectedBond.isinNo}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-500">
                Client: <strong>{selectedBond.clientName}</strong> · Partner: {selectedBond.subBrokerName}
              </span>
              <button
                onClick={() => setSelectedBond(null)}
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
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Investment</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedBond.totalInvestment)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Coupon Rate</span>
                <span className="text-sm font-bold text-blue-700 font-mono">
                  {selectedBond.couponRatePct}% p.a.
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Annual Interest</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedBond.annualInterestPayout)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Status</span>
                <StatusPill status={selectedBond.status} className="mt-1" />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Depository & Commission Information
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Units & Face Value:</span>
                <span className="font-mono text-slate-900">{selectedBond.unitsAllocated} units @ {formatINR(selectedBond.faceValuePerUnit)}/unit</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Investxindia Expected Commission:</span>
                <span className="font-mono font-semibold text-slate-900">{formatINR(selectedBond.commissionExpected)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sub-Broker Payout:</span>
                <span className="font-mono font-semibold text-orange-600">{formatINR(selectedBond.subBrokerPayable)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Maturity / Redemption Date:</span>
                <span className="text-slate-800">{formatDateIST(selectedBond.maturityDate)}</span>
              </div>
            </div>

            {/* Document Reference */}
            <div className="p-3 bg-slate-100/70 border border-slate-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">Depository Allotment Advice (NSDL/CDSL)</span>
                  <span className="text-[11px] text-slate-500">{selectedBond.applicationNo}_AllotmentAdvice.pdf</span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Archived & Verified
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Bond Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Allot Section 54EC / Corporate Bonds"
        subtitle="Record capital gains tax exemption bond application or corporate NCD"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBond} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Application Reference No. *</label>
              <input
                type="text"
                required
                value={formData.applicationNo}
                onChange={(e) => setFormData({ ...formData, applicationNo: e.target.value })}
                placeholder="BND-2026-98124"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ISIN Depository Code *</label>
              <input
                type="text"
                required
                value={formData.isinNo}
                onChange={(e) => setFormData({ ...formData, isinNo: e.target.value })}
                placeholder="INE020B08DF2"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bond Issuer Entity *</label>
              <select
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="REC Ltd (54EC)">REC Ltd (54EC Capital Gains)</option>
                <option value="NHAI (54EC)">NHAI (54EC Capital Gains)</option>
                <option value="PFC Ltd (54EC)">PFC Ltd (54EC Capital Gains)</option>
                <option value="Tata Capital NCD">Tata Capital Corporate NCD</option>
                <option value="L&T Finance NCD">L&T Finance NCD</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bond Type</label>
              <select
                value={formData.bondType}
                onChange={(e) => setFormData({ ...formData, bondType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Capital Gains 54EC">Capital Gains 54EC (Lock-in 5 Yrs)</option>
                <option value="Corporate NCD">Corporate Secured NCD</option>
                <option value="Tax-Free Bond">Tax-Free PSU Bond</option>
                <option value="Sovereign Gold Bond">Sovereign Gold Bond (SGB)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Allottee Client *</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Face Value (₹)</label>
              <input
                type="number"
                value={formData.faceValuePerUnit}
                onChange={(e) => {
                  const fv = Number(e.target.value);
                  setFormData({
                    ...formData,
                    faceValuePerUnit: fv,
                    totalInvestment: fv * formData.unitsAllocated,
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Units Allocated</label>
              <input
                type="number"
                min="1"
                value={formData.unitsAllocated}
                onChange={(e) => {
                  const u = Number(e.target.value);
                  setFormData({
                    ...formData,
                    unitsAllocated: u,
                    totalInvestment: u * formData.faceValuePerUnit,
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Allotment (₹) *</label>
              <input
                type="number"
                required
                min="10000"
                value={formData.totalInvestment}
                onChange={(e) => setFormData({ ...formData, totalInvestment: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Coupon Rate (% p.a.)</label>
              <input
                type="number"
                step="0.05"
                value={formData.couponRatePct}
                onChange={(e) => setFormData({ ...formData, couponRatePct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
              <input
                type="date"
                required
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
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
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-md transition-colors"
            >
              {isSaving ? 'Validating & Allotting...' : 'Allot Bond'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Bond Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Bond Allotment"
        subtitle={bondToEdit ? `Updating allotment #${bondToEdit.applicationNo}` : ''}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateBond} className="space-y-4 text-xs">
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
              <label className="block font-semibold text-slate-700 mb-1">ISIN Code</label>
              <input
                type="text"
                required
                value={formData.isinNo}
                onChange={(e) => setFormData({ ...formData, isinNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono uppercase bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Investment (₹)</label>
              <input
                type="number"
                required
                value={formData.totalInvestment}
                onChange={(e) => setFormData({ ...formData, totalInvestment: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Coupon Rate (%)</label>
              <input
                type="number"
                step="0.05"
                required
                value={formData.couponRatePct}
                onChange={(e) => setFormData({ ...formData, couponRatePct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="allotted">Allotted</option>
                <option value="pending_allotment">Pending Allotment</option>
                <option value="redeemed">Redeemed</option>
              </select>
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
