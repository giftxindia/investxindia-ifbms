import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Plus,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { clientService, staffService, subBrokerService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Client, SubBroker, UserProfile, UserRole, TaskReminder } from '../types';
import { formatINR, formatDateIST, generateClientCode } from '../utils/formatters';

interface ClientsPageProps {
  userRole: UserRole;
  activeUser?: UserProfile;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ userRole, activeUser }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Selected client for Drawer / Modal
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'business' | 'tasks'>('overview');
  const [businessHistory, setBusinessHistory] = useState<any | null>(null);
  const [clientTasks, setClientTasks] = useState<TaskReminder[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Task Form inside drawer
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskReminder['priority']>('medium');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    panMasked: '',
    subBrokerId: '',
    assignedStaffId: '',
    kycStatus: 'pending' as Client['kycStatus'],
    tags: 'HNI, Retail',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [fetchedClients, fetchedBrokers, fetchedStaff] = await Promise.all([
        clientService.getClients(userRole, activeUser?.subBrokerCode),
        subBrokerService.getSubBrokers(),
        staffService.getStaffMembers(),
      ]);
      setClients(fetchedClients);
      setSubBrokers(fetchedBrokers);
      setStaffMembers(fetchedStaff);
    } catch (err: any) {
      console.error('Failed to load CRM clients:', err);
      setErrorBanner(err.message || 'Failed to retrieve client records. Please check database connectivity.');
    } finally {
      setIsLoading(false);
    }
  }, [userRole, activeUser?.subBrokerCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load details whenever selectedClient changes
  useEffect(() => {
    if (!selectedClient) {
      setBusinessHistory(null);
      setClientTasks([]);
      return;
    }
    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const [history, tasks] = await Promise.all([
          clientService.getClientBusinessHistory(selectedClient.id),
          clientService.getClientFollowupTasks(selectedClient.id, selectedClient.fullName),
        ]);
        setBusinessHistory(history);
        setClientTasks(tasks);
      } catch (err) {
        console.error('Error fetching client details:', err);
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedClient]);

  const handleOpenAddModal = () => {
    setFormError(null);
    // If sub-broker, auto-lock to their own subBroker record
    const mySubBroker = userRole === 'sub_broker'
      ? subBrokers.find((sb) => sb.subBrokerCode === activeUser?.subBrokerCode || sb.id === 'sb-1')
      : null;

    setFormData({
      fullName: '',
      email: '',
      mobile: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      panMasked: '',
      subBrokerId: mySubBroker ? mySubBroker.id : (subBrokers[0]?.id || ''),
      assignedStaffId: staffMembers[0]?.id || '',
      kycStatus: 'pending',
      tags: 'Direct Client, Priority',
    });
    setIsAddModalOpen(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.fullName.trim()) {
      setFormError('Please enter a valid client or entity name.');
      return;
    }
    const cleanMobile = formData.mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length < 10) {
      setFormError('Please enter a valid 10-digit Indian mobile contact.');
      return;
    }

    setIsSaving(true);
    try {
      const matchedBroker = subBrokers.find((sb) => sb.id === formData.subBrokerId);
      const generatedCode = generateClientCode(clients.length + 1);

      const created = await clientService.createClient({
        clientCode: generatedCode,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        panMasked: formData.panMasked.trim().toUpperCase() || 'XXXXX****X',
        assignedStaffId: formData.assignedStaffId || 'usr-1',
        subBrokerId: formData.subBrokerId || 'sb-1',
        subBrokerName: matchedBroker ? matchedBroker.name : 'Direct House Account',
        totalPortfolioValue: 0,
        activePoliciesCount: 0,
        kycStatus: formData.kycStatus,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      setSuccessBanner(`Client record created successfully: ${created.fullName} (${created.clientCode})`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Unable to register client.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (client: Client) => {
    setFormError(null);
    setClientToEdit(client);
    setFormData({
      fullName: client.fullName,
      email: client.email || '',
      mobile: client.mobile,
      city: client.city,
      state: client.state,
      panMasked: client.panMasked || '',
      subBrokerId: client.subBrokerId || '',
      assignedStaffId: client.assignedStaffId || '',
      kycStatus: client.kycStatus,
      tags: client.tags.join(', '),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToEdit) return;
    setFormError(null);

    setIsSaving(true);
    try {
      const matchedBroker = subBrokers.find((sb) => sb.id === formData.subBrokerId);

      const updatedClient: Client = {
        ...clientToEdit,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        panMasked: formData.panMasked.trim().toUpperCase(),
        subBrokerId: formData.subBrokerId || clientToEdit.subBrokerId || 'sb-1',
        subBrokerName: matchedBroker ? matchedBroker.name : 'Direct House Account',
        assignedStaffId: formData.assignedStaffId || clientToEdit.assignedStaffId || 'usr-1',
        kycStatus: formData.kycStatus,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      await clientService.updateClient(updatedClient);

      setSuccessBanner(`Client ${updatedClient.fullName} updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsEditModalOpen(false);
      setClientToEdit(null);
      if (selectedClient?.id === updatedClient.id) {
        setSelectedClient(updatedClient);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update client.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (userRole !== 'super_admin') {
      alert('Only Super Admin is authorized to archive or delete client records.');
      return;
    }
    if (confirm(`Are you sure you want to delete client record for "${name}"?\nThis action is irreversible and recorded in the audit log.`)) {
      try {
        await clientService.deleteClient(id, name);
        setSuccessBanner(`Client "${name}" was deleted successfully.`);
        setTimeout(() => setSuccessBanner(null), 5000);
        if (selectedClient?.id === id) setSelectedClient(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to delete client record.');
      }
    }
  };

  const handleUpdateKYCDirect = async (newStatus: Client['kycStatus']) => {
    if (!selectedClient) return;
    try {
      await clientService.updateKYCStatus(selectedClient.id, newStatus, selectedClient.fullName);
      const updated = { ...selectedClient, kycStatus: newStatus };
      setSelectedClient(updated);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccessBanner(`KYC status for ${selectedClient.fullName} changed to ${newStatus}.`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update KYC status.');
    }
  };

  const handleReassignStaffDirect = async (staffId: string) => {
    if (!selectedClient) return;
    const staff = staffMembers.find((s) => s.id === staffId);
    const staffName = staff ? staff.name : 'Unassigned';
    try {
      await clientService.updateStaffAssignment(selectedClient.id, staffId, staffName);
      const updated = { ...selectedClient, assignedStaffId: staffId };
      setSelectedClient(updated);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSuccessBanner(`Relationship manager updated to ${staffName}.`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to reassign relationship manager.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newTaskTitle.trim()) return;
    setIsAddingTask(true);
    try {
      await clientService.addClientTask(
        selectedClient.id,
        selectedClient.fullName,
        newTaskTitle.trim(),
        `CRM reminder for client ${selectedClient.fullName} (${selectedClient.clientCode})`,
        newTaskDueDate || new Date().toISOString().split('T')[0],
        newTaskPriority
      );
      setNewTaskTitle('');
      setNewTaskDueDate('');
      const updatedTasks = await clientService.getClientFollowupTasks(selectedClient.id, selectedClient.fullName);
      setClientTasks(updatedTasks);
      setSuccessBanner('Follow-up task scheduled.');
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to create task.');
    } finally {
      setIsAddingTask(false);
    }
  };

  // Table Columns
  const columns: Column<Client>[] = [
    {
      key: 'clientCode',
      header: 'Client Code',
      width: '120px',
      sortable: true,
      render: (client) => (
        <span className="font-mono font-semibold text-slate-900">{client.clientCode}</span>
      ),
    },
    {
      key: 'fullName',
      header: 'Client Name & Contact',
      sortable: true,
      render: (client) => (
        <div>
          <div className="font-semibold text-slate-900">{client.fullName}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>{client.mobile}</span>
            <span aria-hidden="true">·</span>
            <span>{client.city}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'subBrokerName',
      header: 'Channel Partner',
      sortable: true,
      render: (client) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800">{client.subBrokerName || 'Direct Account'}</span>
        </div>
      ),
    },
    {
      key: 'totalPortfolioValue',
      header: 'Portfolio Value',
      align: 'right',
      sortable: true,
      render: (client) => (
        <span className="font-mono font-semibold text-slate-900">
          {formatINR(client.totalPortfolioValue)}
        </span>
      ),
    },
    {
      key: 'assignedStaffId',
      header: 'Relationship Manager',
      render: (client) => {
        const staff = staffMembers.find((s) => s.id === client.assignedStaffId);
        return (
          <span className="text-xs text-slate-700 font-medium">
            {staff ? staff.name : 'Unassigned'}
          </span>
        );
      },
    },
    {
      key: 'kycStatus',
      header: 'KYC Status',
      width: '120px',
      render: (client) => <StatusPill status={client.kycStatus} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '110px',
      render: (client) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedClient(client);
              setActiveTab('overview');
            }}
            title="View Client Details"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenEditModal(client)}
            title="Edit Client"
            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={() => handleDeleteClient(client.id, client.fullName)}
              title="Delete Client Record"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Client CRM & Staff Assignment</h2>
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
            Institutional client directory with unique codes, staff RM assignments, KYC governance, and business history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh from Database"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Client</span>
          </button>
        </div>
      </div>

      {/* Role Protection Banner */}
      {userRole === 'sub_broker' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2.5 text-xs text-blue-900">
          <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Sub-Broker Perspective:</strong> You are viewing clients strictly assigned to your channel agency ({activeUser?.subBrokerCode || 'Authorized Account'}). Database RLS policies prevent access to unassigned client records.
          </span>
        </div>
      )}

      {/* Error / Success Notifications */}
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
        data={clients}
        isLoading={isLoading}
        searchPlaceholder="Search clients by name, code (IX-CL-), phone, city..."
        searchKeys={['fullName', 'clientCode', 'mobile', 'city', 'panMasked']}
        statusFilterKey="kycStatus"
        statusFilterOptions={['verified', 'pending', 'rejected']}
        exportFilename="Investxindia_Clients_Register"
        onRowClick={(client) => {
          setSelectedClient(client);
          setActiveTab('overview');
        }}
        emptyTitle="No clients found"
        emptyDescription={
          userRole === 'sub_broker'
            ? 'No clients have been assigned to your sub-broker agency yet. Click "New Client" to register your first investor.'
            : 'Get started by creating your first client record or importing client sheets.'
        }
      />

      {/* View Client Details Multi-Tab Modal */}
      {selectedClient && (
        <Modal
          isOpen={Boolean(selectedClient)}
          onClose={() => setSelectedClient(null)}
          title={selectedClient.fullName}
          subtitle={`Client ID: ${selectedClient.clientCode} · Registered ${formatDateIST(selectedClient.createdAt)}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-500">
                Partner: <strong>{selectedClient.subBrokerName || 'Direct House Account'}</strong>
              </span>
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-1 pb-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 font-medium rounded-t text-xs transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-orange-600 text-orange-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Overview & KYC
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-3 py-1.5 font-medium rounded-t text-xs transition-colors ${
                  activeTab === 'assignments'
                    ? 'border-b-2 border-orange-600 text-orange-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff & Partner Controls
              </button>
              <button
                onClick={() => setActiveTab('business')}
                className={`px-3 py-1.5 font-medium rounded-t text-xs transition-colors ${
                  activeTab === 'business'
                    ? 'border-b-2 border-orange-600 text-orange-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Business History
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-1.5 font-medium rounded-t text-xs transition-colors ${
                  activeTab === 'tasks'
                    ? 'border-b-2 border-orange-600 text-orange-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Follow-up Tasks ({clientTasks.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Portfolio Value</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {formatINR(selectedClient.totalPortfolioValue)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">KYC Status</span>
                    <StatusPill status={selectedClient.kycStatus} className="mt-1" />
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Mobile Contact</span>
                    <span className="text-xs font-semibold text-slate-900 font-mono block mt-1">
                      {selectedClient.mobile}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Masked PAN</span>
                    <span className="text-xs font-semibold text-slate-900 font-mono block mt-1">
                      {selectedClient.panMasked || 'Not Specified'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Email Address:</span>
                    <span className="font-medium text-slate-900">{selectedClient.email || 'None provided'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Geographic Location:</span>
                    <span className="font-medium text-slate-900">
                      {selectedClient.city}, {selectedClient.state}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Registered Since:</span>
                    <span className="font-medium text-slate-900">{formatDateIST(selectedClient.createdAt)}</span>
                  </div>
                </div>

                {/* KYC Governance Action */}
                <div className="p-3 bg-slate-100/70 border border-slate-200 rounded">
                  <h4 className="font-semibold text-slate-900 mb-1">Update KYC Compliance</h4>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Modifying verification status will write a verified event to the immutable audit log.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateKYCDirect('verified')}
                      disabled={selectedClient.kycStatus === 'verified'}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        selectedClient.kycStatus === 'verified'
                          ? 'bg-emerald-100 text-emerald-800 opacity-60 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      Mark KYC Verified
                    </button>
                    <button
                      onClick={() => handleUpdateKYCDirect('pending')}
                      disabled={selectedClient.kycStatus === 'pending'}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        selectedClient.kycStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800 opacity-60 cursor-default'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      Mark Pending Verification
                    </button>
                    <button
                      onClick={() => handleUpdateKYCDirect('rejected')}
                      disabled={selectedClient.kycStatus === 'rejected'}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        selectedClient.kycStatus === 'rejected'
                          ? 'bg-rose-100 text-rose-800 opacity-60 cursor-default'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      Reject KYC
                    </button>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Investor Segments</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClient.tags?.length ? (
                      selectedClient.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-200/80 text-slate-800 rounded text-[11px]">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No tags assigned</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ASSIGNMENTS */}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Assigned Relationship Manager (Staff)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Internal Investxindia staff representative responsible for client portfolio advisory and servicing.
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedClient.assignedStaffId || ''}
                        onChange={(e) => handleReassignStaffDirect(e.target.value)}
                        disabled={userRole === 'sub_broker'}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded bg-white text-xs text-slate-800"
                      >
                        <option value="">Unassigned</option>
                        {staffMembers.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name} ({staff.staffDepartment || staff.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Originating Channel Partner (Sub-Broker)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Distribution partner through whom this client account was mobilized.
                    </p>
                    <div className="p-2.5 bg-white border border-slate-200 rounded flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {selectedClient.subBrokerName || 'Direct House Account'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Partner Ref ID: {selectedClient.subBrokerId || 'DIRECT'}
                        </span>
                      </div>
                      {userRole === 'super_admin' && (
                        <button
                          onClick={() => handleOpenEditModal(selectedClient)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                        >
                          Change Partner
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BUSINESS HISTORY */}
            {activeTab === 'business' && (
              <div className="space-y-4">
                {isLoadingDetails ? (
                  <div className="py-8 text-center text-slate-500">Loading business portfolio...</div>
                ) : !businessHistory ? (
                  <div className="py-8 text-center text-slate-400 italic">No business holdings found.</div>
                ) : (
                  <div className="space-y-3">
                    {/* Health Insurance */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span>Health Insurance Policies</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({businessHistory.health?.length || 0})
                        </span>
                      </h4>
                      {businessHistory.health?.length ? (
                        <div className="space-y-1.5">
                          {businessHistory.health.map((p: any) => (
                            <div key={p.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-900">{p.insurer} ({p.planName})</span>
                                <p className="text-[11px] text-slate-500">
                                  Policy #{p.policyNo} · Renewal: {formatDateIST(p.renewalDueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-semibold text-slate-900 block">{formatINR(p.annualPremium)}</span>
                                <span className="text-[10px] text-slate-500">Annual Premium</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">No active health policies.</p>
                      )}
                    </div>

                    {/* Motor Insurance */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span>Motor Insurance Policies</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({businessHistory.motor?.length || 0})
                        </span>
                      </h4>
                      {businessHistory.motor?.length ? (
                        <div className="space-y-1.5">
                          {businessHistory.motor.map((p: any) => (
                            <div key={p.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-900">{p.vehicleNo} · {p.insurer}</span>
                                <p className="text-[11px] text-slate-500">Policy #{p.policyNo}</p>
                              </div>
                              <span className="font-mono font-semibold text-slate-900">{formatINR(p.grossPremium)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">No active motor policies.</p>
                      )}
                    </div>

                    {/* Fixed Deposits */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span>Fixed Deposits</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({businessHistory.fds?.length || 0})
                        </span>
                      </h4>
                      {businessHistory.fds?.length ? (
                        <div className="space-y-1.5">
                          {businessHistory.fds.map((f: any) => (
                            <div key={f.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-900">{f.provider}</span>
                                <p className="text-[11px] text-slate-500">
                                  App #{f.applicationNo} · {f.interestRatePct}% p.a.
                                </p>
                              </div>
                              <span className="font-mono font-semibold text-slate-900">{formatINR(f.depositAmount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">No corporate fixed deposits.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TASKS */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {/* Schedule Quick Reminder Form */}
                <form onSubmit={handleCreateTask} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                  <h4 className="font-semibold text-slate-900 text-xs">Schedule Follow-up Task</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Call client for health renewal..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="sm:col-span-2 px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white"
                    />
                    <input
                      type="date"
                      required
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Priority:</span>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as any)}
                        className="px-2 py-1 border border-slate-200 rounded text-[11px] bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingTask || !newTaskTitle.trim()}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs transition-colors"
                    >
                      {isAddingTask ? 'Saving...' : 'Add Task'}
                    </button>
                  </div>
                </form>

                {/* Task List */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                    Pending Client Reminders
                  </h4>
                  {clientTasks.length === 0 ? (
                    <p className="text-slate-400 italic text-xs py-2">No pending follow-ups for this client.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientTasks.map((t) => (
                        <div key={t.id} className="p-2.5 bg-white border border-slate-200 rounded flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900 block">{t.title}</span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3" /> Due {t.dueDate} · Assigned to {t.assignedTo}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded uppercase ${
                            t.priority === 'high'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Register New Client Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Client"
        subtitle="Create validated investor record with unique code and duplicate checks"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Client / Entity Name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Ramesh Kumar or TechCorp LLP"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Contact *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 98200 12345"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Mumbai"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Maharashtra"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Masked PAN (Optional)</label>
              <input
                type="text"
                value={formData.panMasked}
                onChange={(e) => setFormData({ ...formData, panMasked: e.target.value })}
                placeholder="ABCDE****F"
                maxLength={10}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Sub-Broker Partner</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Assigned Staff RM</label>
              <select
                value={formData.assignedStaffId}
                onChange={(e) => setFormData({ ...formData, assignedStaffId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="">Unassigned</option>
                {staffMembers.map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.name} ({sm.staffDepartment || sm.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">KYC Status</label>
              <select
                value={formData.kycStatus}
                onChange={(e) => setFormData({ ...formData, kycStatus: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="pending">Pending Document Verification</option>
                <option value="verified">KYC Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="HNI, Corporate, Priority"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
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
              {isSaving ? 'Validating & Saving...' : 'Save Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client Details"
        subtitle={clientToEdit ? `Updating ${clientToEdit.fullName} (${clientToEdit.clientCode})` : ''}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateClient} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Client Name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
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
              <label className="block font-semibold text-slate-700 mb-1">KYC Status</label>
              <select
                value={formData.kycStatus}
                onChange={(e) => setFormData({ ...formData, kycStatus: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="pending">Pending</option>
                <option value="verified">KYC Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Staff RM</label>
              <select
                value={formData.assignedStaffId}
                onChange={(e) => setFormData({ ...formData, assignedStaffId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="">Unassigned</option>
                {staffMembers.map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-Broker</label>
              <select
                value={formData.subBrokerId}
                onChange={(e) => setFormData({ ...formData, subBrokerId: e.target.value })}
                disabled={userRole === 'sub_broker'}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="">Direct House Account</option>
                {subBrokers.map((sb) => (
                  <option key={sb.id} value={sb.id}>
                    {sb.name}
                  </option>
                ))}
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
              {isSaving ? 'Updating...' : 'Update Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
