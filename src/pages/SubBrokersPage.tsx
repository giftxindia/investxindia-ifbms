import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Eye,
  Plus,
  Building,
  Phone,
  Mail,
  Award,
  CheckCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Ban,
  Users,
  Edit2,
  Briefcase,
  Lock,
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { subBrokerService, clientService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { SubBroker, Client, UserProfile, UserRole } from '../types';
import { formatINR, generateSubBrokerCode, formatDateIST } from '../utils/formatters';

interface SubBrokersPageProps {
  userRole: UserRole;
  activeUser?: UserProfile;
}

export const SubBrokersPage: React.FC<SubBrokersPageProps> = ({ userRole, activeUser }) => {
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedBroker, setSelectedBroker] = useState<SubBroker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [brokerToEdit, setBrokerToEdit] = useState<SubBroker | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    mobile: '',
    email: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    panMasked: 'ABCDE****F',
    amfiOrReraNo: 'ARN-',
    tier: 'Gold' as SubBroker['tier'],
    defaultPayoutSharePct: 70,
    bankAccountMasked: 'HDFC •••• 1234',
    bankIfsc: 'HDFC0000060',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [fetchedBrokers, fetchedClients] = await Promise.all([
        subBrokerService.getSubBrokers(),
        clientService.getClients(),
      ]);
      setSubBrokers(fetchedBrokers);
      setClients(fetchedClients);
    } catch (err: any) {
      console.error('Failed to load sub-brokers:', err);
      setErrorBanner(err.message || 'Failed to retrieve sub-broker partners.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = () => {
    setFormError(null);
    setFormData({
      name: '',
      companyName: '',
      mobile: '',
      email: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      panMasked: 'ABCDE****F',
      amfiOrReraNo: 'ARN-',
      tier: 'Gold',
      defaultPayoutSharePct: 70,
      bankAccountMasked: 'HDFC •••• 1234',
      bankIfsc: 'HDFC0000060',
    });
    setIsAddModalOpen(true);
  };

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.companyName.trim()) {
      setFormError('Partner full name and agency name are required.');
      return;
    }
    const cleanMobile = formData.mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      setFormError('Please enter a valid 10-digit mobile contact.');
      return;
    }
    if (!formData.amfiOrReraNo.trim() || formData.amfiOrReraNo.trim() === 'ARN-') {
      setFormError('Please enter a valid AMFI ARN or RERA registration number.');
      return;
    }

    setIsSaving(true);
    try {
      const generatedCode = generateSubBrokerCode(subBrokers.length + 1);

      const created = await subBrokerService.createSubBroker({
        subBrokerCode: generatedCode,
        name: formData.name.trim(),
        companyName: formData.companyName.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        panMasked: formData.panMasked.trim().toUpperCase(),
        amfiOrReraNo: formData.amfiOrReraNo.trim().toUpperCase(),
        tier: formData.tier,
        defaultPayoutSharePct: Number(formData.defaultPayoutSharePct),
        totalBusinessVolume: 0,
        totalBrokerageEarned: 0,
        pendingPayout: 0,
        activeClientsCount: 0,
        bankAccountMasked: formData.bankAccountMasked.trim(),
        bankIfsc: formData.bankIfsc.trim().toUpperCase(),
        status: 'active',
      });

      setSuccessBanner(`Channel partner onboarded: ${created.name} (${created.subBrokerCode})`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to onboard partner.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (broker: SubBroker) => {
    setFormError(null);
    setBrokerToEdit(broker);
    setFormData({
      name: broker.name,
      companyName: broker.companyName,
      mobile: broker.mobile,
      email: broker.email,
      city: broker.city,
      state: broker.state,
      panMasked: broker.panMasked,
      amfiOrReraNo: broker.amfiOrReraNo,
      tier: broker.tier,
      defaultPayoutSharePct: broker.defaultPayoutSharePct,
      bankAccountMasked: broker.bankAccountMasked,
      bankIfsc: broker.bankIfsc,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerToEdit) return;
    setFormError(null);

    setIsSaving(true);
    try {
      const updated: SubBroker = {
        ...brokerToEdit,
        name: formData.name.trim(),
        companyName: formData.companyName.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        panMasked: formData.panMasked.trim().toUpperCase(),
        amfiOrReraNo: formData.amfiOrReraNo.trim().toUpperCase(),
        tier: formData.tier,
        defaultPayoutSharePct: Number(formData.defaultPayoutSharePct),
        bankAccountMasked: formData.bankAccountMasked.trim(),
        bankIfsc: formData.bankIfsc.trim().toUpperCase(),
      };

      await subBrokerService.updateSubBroker(updated);

      setSuccessBanner(`Partner ${updated.name} updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsEditModalOpen(false);
      setBrokerToEdit(null);
      if (selectedBroker?.id === updated.id) {
        setSelectedBroker(updated);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update partner details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: SubBroker['status'], name: string) => {
    if (userRole !== 'super_admin') {
      alert('Only Super Admin is authorized to alter channel partner compliance status.');
      return;
    }
    try {
      await subBrokerService.updateSubBrokerStatus(id, status, name);
      setSubBrokers((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
      if (selectedBroker?.id === id) {
        setSelectedBroker((prev) => (prev ? { ...prev, status } : null));
      }
      setSuccessBanner(`Partner ${name} status changed to ${status}.`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update partner status.');
    }
  };

  // Associated clients for selected partner
  const associatedClients = selectedBroker
    ? clients.filter((c) => c.subBrokerId === selectedBroker.id || c.subBrokerName === selectedBroker.name)
    : [];

  const columns: Column<SubBroker>[] = [
    {
      key: 'subBrokerCode',
      header: 'Partner Code',
      width: '120px',
      sortable: true,
      render: (broker) => (
        <span className="font-mono font-semibold text-slate-900">{broker.subBrokerCode}</span>
      ),
    },
    {
      key: 'name',
      header: 'Partner & Firm',
      sortable: true,
      render: (broker) => (
        <div>
          <div className="font-semibold text-slate-900">{broker.name}</div>
          <div className="text-[11px] text-slate-500">{broker.companyName}</div>
        </div>
      ),
    },
    {
      key: 'amfiOrReraNo',
      header: 'License / Reg No.',
      render: (broker) => (
        <div>
          <span className="font-mono font-medium text-slate-800">{broker.amfiOrReraNo}</span>
          <span className="text-[11px] text-slate-500 block">{broker.city}, {broker.state}</span>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier & Commission',
      align: 'center',
      render: (broker) => (
        <div className="text-center">
          <span className="font-semibold text-slate-900 block">{broker.tier}</span>
          <span className="text-[11px] text-orange-600 font-mono font-medium">
            {broker.defaultPayoutSharePct}% Share
          </span>
        </div>
      ),
    },
    {
      key: 'totalBusinessVolume',
      header: 'Volume Mobilized',
      align: 'right',
      sortable: true,
      render: (broker) => (
        <span className="font-mono font-semibold text-slate-900">
          {formatINR(broker.totalBusinessVolume, true)}
        </span>
      ),
    },
    {
      key: 'pendingPayout',
      header: 'Pending Payout',
      align: 'right',
      sortable: true,
      render: (broker) => (
        <span className={`font-mono font-semibold ${broker.pendingPayout > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
          {formatINR(broker.pendingPayout)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (broker) => <StatusPill status={broker.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '100px',
      render: (broker) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedBroker(broker)}
            title="View Partner Overview"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={() => handleOpenEditModal(broker)}
              title="Edit Partner Profile"
              className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (userRole === 'sub_broker') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Access Restricted: Partner Directory</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Channel partners are not authorized to view competitive partner directories, confidential bank credentials, or corporate tier structures.
          </p>
        </div>
        <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 max-w-md mx-auto">
          <span className="font-semibold block text-slate-800 mb-0.5">Your Active Partner Credentials</span>
          <p className="font-mono text-orange-600 font-semibold">{activeUser?.name} ({activeUser?.subBrokerCode || 'IX-SB-101'})</p>
          <p className="text-[11px] text-slate-500 mt-1">To view your assigned clients, navigate to the Clients / CRM module.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Sub-Brokers & Channel Partners</h2>
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
            Registered financial distribution partners, AMFI ARN/RERA compliance, tiers, and payout share governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh Partners"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Partner</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={subBrokers}
        isLoading={isLoading}
        searchPlaceholder="Search partners by name, firm, ARN, code, city..."
        searchKeys={['name', 'companyName', 'amfiOrReraNo', 'subBrokerCode', 'city']}
        statusFilterKey="status"
        statusFilterOptions={['active', 'suspended', 'pending']}
        exportFilename="Investxindia_SubBrokers_Directory"
        onRowClick={(broker) => setSelectedBroker(broker)}
        emptyTitle="No sub-brokers registered"
        emptyDescription="Add financial distribution partners to start tracking agency business."
      />

      {/* Partner Detail Modal */}
      {selectedBroker && (
        <Modal
          isOpen={Boolean(selectedBroker)}
          onClose={() => setSelectedBroker(null)}
          title={selectedBroker.name}
          subtitle={`${selectedBroker.companyName} · Partner Code: ${selectedBroker.subBrokerCode}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Current Status:</span>
                <StatusPill status={selectedBroker.status} />
              </div>
              <button
                onClick={() => setSelectedBroker(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Partner Tier</span>
                <span className="text-sm font-bold text-slate-900">{selectedBroker.tier}</span>
                <span className="text-[11px] text-orange-600 block mt-0.5 font-mono">{selectedBroker.defaultPayoutSharePct}% Split</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Pending Payout</span>
                <span className="text-sm font-bold text-amber-700 font-mono">
                  {formatINR(selectedBroker.pendingPayout)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">TDS Sec. 194H</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Volume</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedBroker.totalBusinessVolume, true)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">All Products</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Mapped Clients</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {associatedClients.length} Investors
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Under this ARN</span>
              </div>
            </div>

            {/* Compliance & Regulatory Details */}
            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Compliance & Banking Profile
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Regulatory Registration (AMFI/RERA):</span>
                <span className="font-mono font-semibold text-slate-900">{selectedBroker.amfiOrReraNo}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Registered Mobile:</span>
                <span className="font-mono text-slate-900">{selectedBroker.mobile}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Registered Email:</span>
                <span className="text-slate-900">{selectedBroker.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Tax Identifier (PAN):</span>
                <span className="font-mono text-slate-900">{selectedBroker.panMasked}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Disbursement Bank Account:</span>
                <span className="font-mono font-medium text-slate-900">
                  {selectedBroker.bankAccountMasked} (IFSC: {selectedBroker.bankIfsc})
                </span>
              </div>
            </div>

            {/* Super Admin Status Management Controls */}
            {userRole === 'super_admin' && (
              <div className="p-3 bg-slate-100/70 border border-slate-200 rounded space-y-2">
                <h4 className="font-semibold text-slate-900 text-xs">Administrative Status Controls</h4>
                <p className="text-[11px] text-slate-500">
                  Suspended partners will immediately lose access to the portal and will not receive scheduled automated commission payouts.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleStatusChange(selectedBroker.id, 'active', selectedBroker.name)}
                    disabled={selectedBroker.status === 'active'}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                      selectedBroker.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 opacity-60 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Set Active
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedBroker.id, 'suspended', selectedBroker.name)}
                    disabled={selectedBroker.status === 'suspended'}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                      selectedBroker.status === 'suspended'
                        ? 'bg-rose-100 text-rose-800 opacity-60 cursor-default'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" /> Suspend Agency
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedBroker.id, 'pending', selectedBroker.name)}
                    disabled={selectedBroker.status === 'pending'}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                      selectedBroker.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 opacity-60 cursor-default'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    Mark Pending Verification
                  </button>
                </div>
              </div>
            )}

            {/* Associated Clients */}
            <div>
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Associated Clients ({associatedClients.length})</span>
              </h4>
              {associatedClients.length === 0 ? (
                <p className="text-slate-400 italic py-2">No clients currently mapped to this partner.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {associatedClients.map((c) => (
                    <div key={c.id} className="p-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{c.fullName}</span>
                        <span className="text-[11px] text-slate-500 font-mono ml-2">({c.clientCode})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-700 font-medium">{formatINR(c.totalPortfolioValue)}</span>
                        <StatusPill status={c.kycStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Onboard Sub-Broker Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard Channel Partner"
        subtitle="Register new financial distributor under Investxindia distribution network"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBroker} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Principal Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Alok Singhania"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Agency / Company Name *</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Singhania Wealth Pvt Ltd"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Contact *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98200 11223"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="partner@agency.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">AMFI ARN / RERA *</label>
              <input
                type="text"
                required
                value={formData.amfiOrReraNo}
                onChange={(e) => setFormData({ ...formData, amfiOrReraNo: e.target.value })}
                placeholder="ARN-182944"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Standard">Standard (60%)</option>
                <option value="Silver">Silver (65%)</option>
                <option value="Gold">Gold (70%)</option>
                <option value="Platinum">Platinum (75%)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payout Split %</label>
              <input
                type="number"
                min="10"
                max="95"
                value={formData.defaultPayoutSharePct}
                onChange={(e) => setFormData({ ...formData, defaultPayoutSharePct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Masked PAN</label>
              <input
                type="text"
                value={formData.panMasked}
                onChange={(e) => setFormData({ ...formData, panMasked: e.target.value })}
                placeholder="ABCDE****F"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Disbursement Account</label>
              <input
                type="text"
                value={formData.bankAccountMasked}
                onChange={(e) => setFormData({ ...formData, bankAccountMasked: e.target.value })}
                placeholder="ICICI •••• 9812"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank IFSC</label>
              <input
                type="text"
                value={formData.bankIfsc}
                onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value })}
                placeholder="ICIC0000104"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
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
              {isSaving ? 'Validating & Onboarding...' : 'Register Partner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Partner Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Partner Profile"
        subtitle={brokerToEdit ? `Updating ${brokerToEdit.name} (${brokerToEdit.subBrokerCode})` : ''}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateBroker} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Principal Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Contact</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">AMFI / RERA No.</label>
              <input
                type="text"
                required
                value={formData.amfiOrReraNo}
                onChange={(e) => setFormData({ ...formData, amfiOrReraNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Standard">Standard (60%)</option>
                <option value="Silver">Silver (65%)</option>
                <option value="Gold">Gold (70%)</option>
                <option value="Platinum">Platinum (75%)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payout Split %</label>
              <input
                type="number"
                min="10"
                max="95"
                value={formData.defaultPayoutSharePct}
                onChange={(e) => setFormData({ ...formData, defaultPayoutSharePct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
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
