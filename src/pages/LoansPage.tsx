import React, { useState, useEffect, useCallback } from 'react';
import {
  BadgeIndianRupee,
  Plus,
  Eye,
  Calendar,
  Building,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Edit2,
  Trash2,
  Briefcase,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { loanService, clientService, subBrokerService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { calculateBrokerage } from '../services/brokerageEngine';
import { dataStore } from '../services/mockData';
import { LoanApplication, Client, SubBroker, UserRole, UserProfile } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface LoansPageProps {
  userRole: UserRole;
  activeUser?: UserProfile;
}

export const LoansPage: React.FC<LoansPageProps> = ({ userRole, activeUser }) => {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<LoanApplication | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    applicationNo: '',
    clientId: '',
    subBrokerId: '',
    lender: 'HDFC Bank' as LoanApplication['lender'],
    loanType: 'Home Loan' as LoanApplication['loanType'],
    requestedAmount: 5000000,
    sanctionedAmount: 5000000,
    disbursedAmount: 5000000,
    roiPct: 8.5,
    stage: 'login_submitted' as LoanApplication['stage'],
    submissionDate: new Date().toISOString().split('T')[0],
    disbursementDate: new Date().toISOString().split('T')[0],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [fetchedLoans, fetchedClients, fetchedBrokers] = await Promise.all([
        loanService.getLoans(userRole, activeUser?.subBrokerCode),
        clientService.getClients(userRole, activeUser?.subBrokerCode),
        subBrokerService.getSubBrokers(),
      ]);
      setLoans(fetchedLoans);
      setClients(fetchedClients);
      setSubBrokers(fetchedBrokers);
    } catch (err: any) {
      console.error('Failed to load loans:', err);
      setErrorBanner(err.message || 'Failed to load loan applications from database.');
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
  const businessAmount = Number(formData.disbursedAmount) || Number(formData.sanctionedAmount) || Number(formData.requestedAmount) || 0;
  const rules = dataStore.getBrokerageRules();
  const calcPreview = calculateBrokerage(
    'Loans',
    formData.lender,
    'Fresh',
    selectedBrokerObj?.tier || 'All',
    businessAmount,
    rules,
    selectedBrokerObj?.defaultPayoutSharePct
  );

  const handleOpenAddModal = () => {
    setFormError(null);
    const mySubBroker = userRole === 'sub_broker'
      ? subBrokers.find((sb) => sb.subBrokerCode === activeUser?.subBrokerCode || sb.id === 'sb-1')
      : null;

    setFormData({
      applicationNo: `LN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      clientId: clients[0]?.id || '',
      subBrokerId: mySubBroker ? mySubBroker.id : (subBrokers[0]?.id || ''),
      lender: 'HDFC Bank',
      loanType: 'Home Loan',
      requestedAmount: 5000000,
      sanctionedAmount: 5000000,
      disbursedAmount: 5000000,
      roiPct: 8.5,
      stage: 'login_submitted',
      submissionDate: new Date().toISOString().split('T')[0],
      disbursementDate: new Date().toISOString().split('T')[0],
    });
    setIsAddModalOpen(true);
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.applicationNo.trim()) {
      setFormError('Application reference number is required.');
      return;
    }
    if (!formData.clientId) {
      setFormError('Please select a loan applicant client.');
      return;
    }
    if (Number(formData.requestedAmount) <= 0) {
      setFormError('Requested loan amount must be greater than zero.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await loanService.createLoan({
        applicationNo: formData.applicationNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || 'Client',
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || 'Direct House Account',
        lender: formData.lender,
        loanType: formData.loanType,
        requestedAmount: Number(formData.requestedAmount),
        sanctionedAmount: Number(formData.sanctionedAmount) || 0,
        disbursedAmount: Number(formData.disbursedAmount) || 0,
        roiPct: Number(formData.roiPct),
        stage: formData.stage,
        submissionDate: formData.submissionDate,
        disbursementDate: formData.stage === 'disbursed' ? formData.disbursementDate : undefined,
        expectedPayout: calcPreview.companyGrossExpected,
        receivedPayout: formData.stage === 'disbursed' ? calcPreview.companyGrossExpected : 0,
        subBrokerPayout: calcPreview.subBrokerNetPayable,
        payoutStatus: 'pending',
      });

      setSuccessBanner(`Loan application #${created.applicationNo} registered with ${created.lender}.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit loan file.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (loan: LoanApplication) => {
    setFormError(null);
    setLoanToEdit(loan);
    setFormData({
      applicationNo: loan.applicationNo,
      clientId: loan.clientId,
      subBrokerId: loan.subBrokerId,
      lender: loan.lender,
      loanType: loan.loanType,
      requestedAmount: loan.requestedAmount,
      sanctionedAmount: loan.sanctionedAmount,
      disbursedAmount: loan.disbursedAmount,
      roiPct: loan.roiPct,
      stage: loan.stage,
      submissionDate: loan.submissionDate,
      disbursementDate: loan.disbursementDate || new Date().toISOString().split('T')[0],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanToEdit) return;
    setFormError(null);

    setIsSaving(true);
    try {
      const updated: LoanApplication = {
        ...loanToEdit,
        applicationNo: formData.applicationNo.trim().toUpperCase(),
        clientId: formData.clientId,
        clientName: selectedClientObj?.fullName || loanToEdit.clientName,
        subBrokerId: formData.subBrokerId,
        subBrokerName: selectedBrokerObj?.name || loanToEdit.subBrokerName,
        lender: formData.lender,
        loanType: formData.loanType,
        requestedAmount: Number(formData.requestedAmount),
        sanctionedAmount: Number(formData.sanctionedAmount),
        disbursedAmount: Number(formData.disbursedAmount),
        roiPct: Number(formData.roiPct),
        stage: formData.stage,
        disbursementDate: formData.stage === 'disbursed' ? formData.disbursementDate : undefined,
        expectedPayout: calcPreview.companyGrossExpected,
        subBrokerPayout: calcPreview.subBrokerNetPayable,
      };

      await loanService.updateLoan(updated);

      setSuccessBanner(`Loan application #${updated.applicationNo} updated successfully.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsEditModalOpen(false);
      setLoanToEdit(null);
      if (selectedLoan?.id === updated.id) {
        setSelectedLoan(updated);
      }
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update loan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdvanceStage = async (newStage: LoanApplication['stage']) => {
    if (!selectedLoan) return;
    try {
      const updated = {
        ...selectedLoan,
        stage: newStage,
        disbursementDate: newStage === 'disbursed' ? new Date().toISOString().split('T')[0] : selectedLoan.disbursementDate,
      };
      await loanService.updateLoan(updated);
      setSelectedLoan(updated);
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setSuccessBanner(`Loan #${selectedLoan.applicationNo} advanced to stage "${newStage.replace('_', ' ')}".`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update stage.');
    }
  };

  const handleDeleteLoan = async (id: string, appNo: string) => {
    if (userRole !== 'super_admin') {
      alert('Only Super Admin is authorized to archive loan records.');
      return;
    }
    if (confirm(`Are you sure you want to archive loan application #${appNo}?`)) {
      try {
        await loanService.deleteLoan(id, appNo);
        setSuccessBanner(`Loan #${appNo} archived.`);
        setTimeout(() => setSuccessBanner(null), 4000);
        if (selectedLoan?.id === id) setSelectedLoan(null);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to archive loan.');
      }
    }
  };

  const columns: Column<LoanApplication>[] = [
    {
      key: 'applicationNo',
      header: 'App No. & Type',
      sortable: true,
      render: (loan) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{loan.applicationNo}</span>
          <span className="text-[11px] text-slate-500">{loan.lender} · {loan.loanType}</span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Applicant Client',
      sortable: true,
      render: (loan) => (
        <div>
          <span className="font-semibold text-slate-900 block">{loan.clientName}</span>
          <span className="text-[10px] text-slate-400">Partner: {loan.subBrokerName}</span>
        </div>
      ),
    },
    {
      key: 'requestedAmount',
      header: 'Requested Amt',
      align: 'right',
      sortable: true,
      render: (loan) => (
        <span className="font-mono font-semibold text-slate-900">{formatINR(loan.requestedAmount)}</span>
      ),
    },
    {
      key: 'disbursedAmount',
      header: 'Disbursed Amt',
      align: 'right',
      sortable: true,
      render: (loan) => (
        <div>
          <span className={`font-mono font-bold ${loan.disbursedAmount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
            {loan.disbursedAmount > 0 ? formatINR(loan.disbursedAmount) : 'Pending Disb.'}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">ROI: {loan.roiPct}% p.a.</span>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Pipeline Stage',
      render: (loan) => <StatusPill status={loan.stage} />,
    },
    {
      key: 'expectedPayout',
      header: 'Distribution Payout',
      align: 'right',
      render: (loan) => (
        <div className="font-mono">
          <span className="text-slate-900 font-semibold block">{formatINR(loan.expectedPayout)}</span>
          <span className="text-orange-600 text-[11px]">SB: {formatINR(loan.subBrokerPayout)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '100px',
      render: (loan) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedLoan(loan)}
            title="View Details"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleOpenEditModal(loan)}
            title="Edit Application"
            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {userRole === 'super_admin' && (
            <button
              onClick={() => handleDeleteLoan(loan.id, loan.applicationNo)}
              title="Archive Loan"
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
            <h2 className="text-base font-bold text-slate-900">Loans & Mortgage Origination</h2>
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
            Home loans, loan against property (LAP), and business credit pipeline with sanction, disbursement and DSA payout tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh loans"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Login Loan File</span>
          </button>
        </div>
      </div>

      {/* Role Protection Banner */}
      {userRole === 'sub_broker' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2.5 text-xs text-blue-900">
          <Briefcase className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Sub-Broker Perspective:</strong> You are viewing loan applications submitted by your agency ({activeUser?.subBrokerCode || 'Authorized Account'}).
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
        data={loans}
        isLoading={isLoading}
        searchPlaceholder="Search by application no, client, lender, loan type..."
        searchKeys={['applicationNo', 'clientName', 'lender', 'loanType', 'stage']}
        statusFilterKey="stage"
        statusFilterOptions={['login_submitted', 'underwriting', 'sanctioned', 'disbursed', 'rejected']}
        exportFilename="Investxindia_Loans_Register"
        onRowClick={(l) => setSelectedLoan(l)}
        emptyTitle="No loan files found"
        emptyDescription="Submit a retail or corporate loan file to track processing stages and DSA commissions."
      />

      {/* Loan Details Modal */}
      {selectedLoan && (
        <Modal
          isOpen={Boolean(selectedLoan)}
          onClose={() => setSelectedLoan(null)}
          title={`Loan Application: ${selectedLoan.applicationNo}`}
          subtitle={`${selectedLoan.lender} · ${selectedLoan.loanType} (${formatINR(selectedLoan.requestedAmount)})`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-500">
                Applicant: <strong>{selectedLoan.clientName}</strong> · Channel: {selectedLoan.subBrokerName}
              </span>
              <button
                onClick={() => setSelectedLoan(null)}
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
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Requested Loan</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatINR(selectedLoan.requestedAmount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Disbursed Amount</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {formatINR(selectedLoan.disbursedAmount)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Interest Rate (ROI)</span>
                <span className="text-sm font-bold text-slate-900 font-mono block mt-0.5">
                  {selectedLoan.roiPct}% p.a.
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Pipeline Stage</span>
                <StatusPill status={selectedLoan.stage} className="mt-1" />
              </div>
            </div>

            {/* Quick Pipeline Stage Controls */}
            {userRole !== 'sub_broker' && (
              <div className="p-3 bg-slate-100/70 border border-slate-200 rounded space-y-2">
                <h4 className="font-semibold text-slate-900 text-xs">Advance Underwriting Pipeline</h4>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleQuickAdvanceStage('underwriting')}
                    disabled={selectedLoan.stage === 'underwriting'}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-800 font-medium"
                  >
                    Move to Underwriting
                  </button>
                  <button
                    onClick={() => handleQuickAdvanceStage('sanctioned')}
                    disabled={selectedLoan.stage === 'sanctioned'}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded text-amber-800 font-medium"
                  >
                    Mark Sanctioned
                  </button>
                  <button
                    onClick={() => handleQuickAdvanceStage('disbursed')}
                    disabled={selectedLoan.stage === 'disbursed'}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                  >
                    Mark Disbursed
                  </button>
                  <button
                    onClick={() => handleQuickAdvanceStage('rejected')}
                    disabled={selectedLoan.stage === 'rejected'}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded text-rose-800 font-medium"
                  >
                    Mark Rejected
                  </button>
                </div>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1">
                Lending Terms & Payouts
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sanctioned Credit Limit:</span>
                <span className="font-mono text-slate-900">{formatINR(selectedLoan.sanctionedAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Investxindia Expected DSA Fee:</span>
                <span className="font-mono font-semibold text-slate-900">{formatINR(selectedLoan.expectedPayout)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Sub-Broker Share:</span>
                <span className="font-mono font-semibold text-orange-600">{formatINR(selectedLoan.subBrokerPayout)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Submission Date:</span>
                <span className="text-slate-800">{formatDateIST(selectedLoan.submissionDate)}</span>
              </div>
              {selectedLoan.disbursementDate && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Disbursement Release Date:</span>
                  <span className="text-emerald-700 font-semibold">{formatDateIST(selectedLoan.disbursementDate)}</span>
                </div>
              )}
            </div>

            {/* Document Reference */}
            <div className="p-3 bg-slate-100/70 border border-slate-200 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="font-semibold text-slate-900 block">Sanction Letter & CAM Report</span>
                  <span className="text-[11px] text-slate-500">{selectedLoan.applicationNo}_SanctionLetter.pdf</span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                Archived & Verified
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Loan Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Login Loan File"
        subtitle="Submit retail or mortgage credit file with lender, ROI, and amounts"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLoan} className="space-y-4 text-xs">
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
                placeholder="LN-2026-98124"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Financial Lender / Bank *</label>
              <select
                value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Tata Capital">Tata Capital Financial Services</option>
                <option value="Bajaj Housing Finance">Bajaj Housing Finance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loan Category</label>
              <select
                value={formData.loanType}
                onChange={(e) => setFormData({ ...formData, loanType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="Home Loan">Home Loan (Housing Finance)</option>
                <option value="Loan Against Property">Loan Against Property (LAP)</option>
                <option value="Business Loan">Unsecured Business Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Working Capital">Working Capital / CC / OD</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pipeline Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 bg-white"
              >
                <option value="login_submitted">Login File Submitted</option>
                <option value="underwriting">Credit Underwriting</option>
                <option value="sanctioned">Sanction Letter Issued</option>
                <option value="disbursed">Disbursed to Client</option>
                <option value="rejected">Rejected by Credit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Applicant Client *</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Requested Amount (₹) *</label>
              <input
                type="number"
                required
                min="50000"
                step="50000"
                value={formData.requestedAmount}
                onChange={(e) => setFormData({ ...formData, requestedAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sanctioned Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="50000"
                value={formData.sanctionedAmount}
                onChange={(e) => setFormData({ ...formData, sanctionedAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Disbursed Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="50000"
                value={formData.disbursedAmount}
                onChange={(e) => setFormData({ ...formData, disbursedAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Interest Rate (ROI %)</label>
              <input
                type="number"
                step="0.05"
                min="5"
                max="30"
                value={formData.roiPct}
                onChange={(e) => setFormData({ ...formData, roiPct: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Submission Date</label>
              <input
                type="date"
                required
                value={formData.submissionDate}
                onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Disbursement Date</label>
              <input
                type="date"
                value={formData.disbursementDate}
                onChange={(e) => setFormData({ ...formData, disbursementDate: e.target.value })}
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
              {isSaving ? 'Validating & Logging...' : 'Login Loan File'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Loan Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Loan File"
        subtitle={loanToEdit ? `Updating application #${loanToEdit.applicationNo}` : ''}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateLoan} className="space-y-4 text-xs">
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
              <label className="block font-semibold text-slate-700 mb-1">Pipeline Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
              >
                <option value="login_submitted">Login Submitted</option>
                <option value="underwriting">Underwriting</option>
                <option value="sanctioned">Sanctioned</option>
                <option value="disbursed">Disbursed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Requested (₹)</label>
              <input
                type="number"
                required
                value={formData.requestedAmount}
                onChange={(e) => setFormData({ ...formData, requestedAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sanctioned (₹)</label>
              <input
                type="number"
                value={formData.sanctionedAmount}
                onChange={(e) => setFormData({ ...formData, sanctionedAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Disbursed (₹)</label>
              <input
                type="number"
                value={formData.disbursedAmount}
                onChange={(e) => setFormData({ ...formData, disbursedAmount: Number(e.target.value) })}
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
