import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle,
  RotateCcw,
  Eye,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ShieldAlert,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { dataStore } from '../services/mockData';
import { calculateBrokerage, calculateReversal } from '../services/brokerageEngine';
import { brokerageService } from '../services/supabaseService';
import { BrokerageTransaction, BrokerageRule, UserRole } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface BrokerageRegisterPageProps {
  userRole: UserRole;
}

export const BrokerageRegisterPage: React.FC<BrokerageRegisterPageProps> = ({ userRole }) => {
  const [txns, setTxns] = useState<BrokerageTransaction[]>([]);
  const [rules, setRules] = useState<BrokerageRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<BrokerageTransaction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Reconcile Modal State
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileTxn, setReconcileTxn] = useState<BrokerageTransaction | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [receivedAmountInput, setReceivedAmountInput] = useState<number>(0);
  const [reconcileNotes, setReconcileNotes] = useState('');

  // Reversal Clawback Modal State
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [reversalTxn, setReversalTxn] = useState<BrokerageTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Manual Entry Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    productType: 'Health Insurance' as BrokerageTransaction['productType'],
    referenceNo: '',
    clientName: '',
    subBrokerId: 'sb-1',
    subBrokerName: 'Aarav Sharma Financial Services',
    grossBusinessValue: 50000,
    companyCommissionPct: 15.0,
    companyFlatInr: 0,
    subBrokerSharePct: 75.0,
    tdsRatePct: 5.0,
    notes: '',
  });

  const activeUser = dataStore.getActiveUser();

  const loadData = async () => {
    try {
      setLoading(true);
      const [tData, rData] = await Promise.all([
        brokerageService.getTransactions(userRole, activeUser?.subBrokerCode),
        brokerageService.getRules(),
      ]);
      setTxns(tData);
      setRules(rData);
    } catch (err: any) {
      console.error('Failed to load ledger data:', err);
      setActionError(err.message || 'Error fetching brokerage ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userRole]);

  // Open Reconcile Modal
  const handleOpenReconcile = (txn: BrokerageTransaction) => {
    setReconcileTxn(txn);
    setPaymentRefInput(txn.paymentRefNo || `CMS-HDFC-${Math.floor(10000 + Math.random() * 90000)}`);
    setReceivedAmountInput(txn.companyCommissionExpected);
    setReconcileNotes('');
    setIsReconcileModalOpen(true);
  };

  // Confirm Reconcile
  const handleConfirmReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTxn) return;

    try {
      setActionError(null);
      await brokerageService.reconcileProvider(
        reconcileTxn.id,
        paymentRefInput.trim(),
        Number(receivedAmountInput),
        reconcileNotes.trim(),
        activeUser
      );
      setActionSuccess(`Recorded remittance ${paymentRefInput} for transaction ${reconcileTxn.transactionNo}.`);
      setIsReconcileModalOpen(false);
      setReconcileTxn(null);
      await loadData();
    } catch (err: any) {
      console.error('Reconciliation error:', err);
      setActionError(err.message || 'Failed to reconcile provider remittance');
    }
  };

  // Authorize for Payout
  const handleApproveForPayout = async (txn: BrokerageTransaction) => {
    if (userRole === 'sub_broker') return;
    try {
      setActionError(null);
      await brokerageService.approveBrokerage(txn.id, activeUser);
      setActionSuccess(`Transaction ${txn.transactionNo} authorized for partner payout batching.`);
      await loadData();
    } catch (err: any) {
      console.error('Approval error:', err);
      setActionError(err.message || 'Failed to approve brokerage transaction');
    }
  };

  // Open Reversal Modal
  const handleOpenReversal = (txn: BrokerageTransaction) => {
    if (userRole !== 'super_admin') {
      setActionError('Permission Denied: Only Super Admin can authorize cancellation reversal clawbacks.');
      return;
    }
    setReversalTxn(txn);
    setReversalReason('Policy cancelled within 15-day free-look period per insurer notice.');
    setIsReversalModalOpen(true);
  };

  // Confirm Reversal
  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTxn) return;

    try {
      setActionError(null);
      await brokerageService.executeReversal(reversalTxn.id, reversalReason, activeUser);
      setActionSuccess(`Cancellation reversal ledger entry created for reference ${reversalTxn.referenceNo}.`);
      setIsReversalModalOpen(false);
      setReversalTxn(null);
      await loadData();
    } catch (err: any) {
      console.error('Reversal error:', err);
      setActionError(err.message || 'Failed to execute cancellation reversal');
    }
  };

  // Handle Manual Entry Submit
  const handleCreateManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'sub_broker') return;
    if (!manualForm.referenceNo.trim() || !manualForm.clientName.trim()) {
      setActionError('Reference / Policy No and Client Name are required.');
      return;
    }

    try {
      setActionError(null);
      const grossBiz = Number(manualForm.grossBusinessValue);
      const commExpected = Math.round(((grossBiz * (manualForm.companyCommissionPct / 100)) + manualForm.companyFlatInr) * 100) / 100;
      const sbGross = Math.round((commExpected * (manualForm.subBrokerSharePct / 100)) * 100) / 100;
      const tds = Math.round((sbGross * (manualForm.tdsRatePct / 100)) * 100) / 100;
      const sbNet = Math.max(0, Math.round((sbGross - tds) * 100) / 100);
      const retained = Math.round((commExpected - sbGross) * 100) / 100;

      await brokerageService.createManualEntry(
        {
          productType: manualForm.productType,
          referenceNo: manualForm.referenceNo.trim().toUpperCase(),
          clientName: manualForm.clientName.trim(),
          clientId: 'cli-manual',
          subBrokerId: manualForm.subBrokerId,
          subBrokerName: manualForm.subBrokerName,
          grossBusinessValue: grossBiz,
          companyCommissionExpected: commExpected,
          companyCommissionReceived: 0,
          subBrokerSharePct: manualForm.subBrokerSharePct,
          subBrokerGrossPayable: sbGross,
          tdsDeducted: tds,
          subBrokerNetPayable: sbNet,
          investxindiaRetained: retained,
          status: 'expected',
          ruleVersionApplied: 'Manual Override Entry',
          notes: manualForm.notes || undefined,
        },
        activeUser
      );

      setActionSuccess(`Manual brokerage entry for ${manualForm.clientName} logged successfully.`);
      setIsManualModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Manual entry error:', err);
      setActionError(err.message || 'Failed to create manual entry');
    }
  };

  // Calculation preview for manual form
  const manualCommExpected = Math.round(((Number(manualForm.grossBusinessValue) * (manualForm.companyCommissionPct / 100)) + manualForm.companyFlatInr) * 100) / 100;
  const manualSbGross = Math.round((manualCommExpected * (manualForm.subBrokerSharePct / 100)) * 100) / 100;
  const manualTds = Math.round((manualSbGross * (manualForm.tdsRatePct / 100)) * 100) / 100;
  const manualSbNet = Math.max(0, Math.round((manualSbGross - manualTds) * 100) / 100);
  const manualRetained = Math.round((manualCommExpected - manualSbGross) * 100) / 100;

  const columns: Column<BrokerageTransaction>[] = [
    {
      key: 'transactionNo',
      header: 'Txn / Ref No.',
      width: '160px',
      sortable: true,
      render: (txn) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{txn.transactionNo}</span>
          <span className="text-[11px] text-slate-500 font-mono truncate max-w-[130px] block">
            {txn.referenceNo}
          </span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Client & Partner',
      sortable: true,
      render: (txn) => (
        <div>
          <div className="font-semibold text-slate-900">{txn.clientName}</div>
          <div className="text-[11px] text-slate-500">
            {txn.productType} · {txn.subBrokerName}
          </div>
        </div>
      ),
    },
    {
      key: 'grossBusinessValue',
      header: 'Business Volume',
      align: 'right',
      sortable: true,
      render: (txn) => (
        <span className={`font-mono font-semibold ${txn.grossBusinessValue < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
          {formatINR(txn.grossBusinessValue)}
        </span>
      ),
    },
    {
      key: 'companyCommissionExpected',
      header: 'Company Expected / Recd',
      align: 'right',
      sortable: true,
      render: (txn) => (
        <div>
          <span className={`font-mono font-semibold block ${txn.companyCommissionExpected < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatINR(txn.companyCommissionExpected)}
          </span>
          <span className={`text-[10px] font-mono ${txn.companyCommissionReceived > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
            Recd: {formatINR(txn.companyCommissionReceived)}
          </span>
        </div>
      ),
    },
    {
      key: 'subBrokerNetPayable',
      header: 'Partner Net Payout',
      align: 'right',
      sortable: true,
      render: (txn) => (
        <div>
          <span className={`font-mono font-bold block ${txn.subBrokerNetPayable < 0 ? 'text-rose-600' : 'text-orange-600'}`}>
            {formatINR(txn.subBrokerNetPayable)}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            TDS: {formatINR(txn.tdsDeducted)}
          </span>
        </div>
      ),
    },
    {
      key: 'investxindiaRetained',
      header: 'Investx Margin',
      align: 'right',
      render: (txn) => (
        <span className={`font-mono font-semibold ${txn.investxindiaRetained < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
          {formatINR(txn.investxindiaRetained)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (txn) => <StatusPill status={txn.status} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      width: '110px',
      render: (txn) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedTxn(txn)}
            title="View Calculation Snapshot"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Record Remittance: expected -> received */}
          {userRole !== 'sub_broker' && txn.status === 'expected' && (
            <button
              onClick={() => handleOpenReconcile(txn)}
              title="Record Provider Remittance"
              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Authorize for Payout: received -> approved */}
          {userRole !== 'sub_broker' && txn.status === 'received' && (
            <button
              onClick={() => handleApproveForPayout(txn)}
              title="Approve for Payout Batching"
              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Super Admin Reversal Clawback */}
          {userRole === 'super_admin' && txn.grossBusinessValue > 0 && !txn.referenceNo.startsWith('REV-') && (
            <button
              onClick={() => handleOpenReversal(txn)}
              title="Execute Cancellation Reversal Clawback"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
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
          <h2 className="text-base font-bold text-slate-900">Brokerage Transaction Ledger</h2>
          <p className="text-xs text-slate-500">
            Immutable transaction register with rule snapshots, TDS deductions, provider remittances, and clawback accounting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
            <span>Refresh</span>
          </button>
          {userRole !== 'sub_broker' && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Entry</span>
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

      {/* Ledger Table */}
      <DataTable
        columns={columns}
        data={txns}
        isLoading={loading}
        searchPlaceholder="Search by transaction no, policy no, client name, partner..."
        searchKeys={['transactionNo', 'referenceNo', 'clientName', 'subBrokerName', 'productType']}
        statusFilterKey="status"
        statusFilterOptions={['expected', 'received', 'approved', 'paid', 'reconciled', 'disputed']}
        exportFilename="Investxindia_Brokerage_Ledger"
        onRowClick={(t) => setSelectedTxn(t)}
        emptyTitle="No brokerage transactions found"
        emptyDescription="Transactions appear automatically when policies and financial deposits are registered."
      />

      {/* View Calculation Snapshot Modal */}
      {selectedTxn && !isReconcileModalOpen && !isReversalModalOpen && (
        <Modal
          isOpen={Boolean(selectedTxn)}
          onClose={() => setSelectedTxn(null)}
          title={`Ledger Entry: ${selectedTxn.transactionNo}`}
          subtitle={`Reference: ${selectedTxn.referenceNo} · ${selectedTxn.productType}`}
          maxWidth="lg"
          footer={
            <button
              onClick={() => setSelectedTxn(null)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
            >
              Close
            </button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Applied Commission Rule Snapshot</span>
                <span className="font-mono font-semibold text-slate-900 text-xs">{selectedTxn.ruleVersionApplied || 'Standard Schedule'}</span>
              </div>
              <StatusPill status={selectedTxn.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Business Volume</span>
                <span className={`text-sm font-bold font-mono ${selectedTxn.grossBusinessValue < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatINR(selectedTxn.grossBusinessValue)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Company Commission Expected</span>
                <span className={`text-sm font-bold font-mono ${selectedTxn.companyCommissionExpected < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {formatINR(selectedTxn.companyCommissionExpected)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Sub-Broker Payout Share:</span>
                <span className="font-mono text-slate-900">{selectedTxn.subBrokerSharePct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sub-Broker Gross Payable:</span>
                <span className="font-mono text-slate-900">{formatINR(selectedTxn.subBrokerGrossPayable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statutory TDS (Section 194H @ 5%):</span>
                <span className={`font-mono ${selectedTxn.tdsDeducted < 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedTxn.tdsDeducted < 0 ? '+' : '-'}{formatINR(Math.abs(selectedTxn.tdsDeducted))}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-900">Net Payable to Partner:</span>
                <span className={`font-mono font-bold ${selectedTxn.subBrokerNetPayable < 0 ? 'text-rose-600' : 'text-orange-600'}`}>
                  {formatINR(selectedTxn.subBrokerNetPayable)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-900">Investxindia Retained Margin:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(selectedTxn.investxindiaRetained)}</span>
              </div>
            </div>

            {selectedTxn.paymentRefNo && (
              <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-900">
                <strong>Remittance Reference:</strong> {selectedTxn.paymentRefNo}
                {selectedTxn.receiptDate && ` · Received on ${formatDateIST(selectedTxn.receiptDate)}`}
                {selectedTxn.companyCommissionReceived > 0 && ` (₹${selectedTxn.companyCommissionReceived.toLocaleString('en-IN')})`}
              </div>
            )}

            {selectedTxn.notes && (
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700">
                <strong>Audit Notes:</strong> {selectedTxn.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Record Provider Remittance Modal */}
      {reconcileTxn && isReconcileModalOpen && (
        <Modal
          isOpen={isReconcileModalOpen}
          onClose={() => {
            setIsReconcileModalOpen(false);
            setReconcileTxn(null);
          }}
          title="Record Provider Remittance"
          subtitle={`Acknowledge receipt from provider for ${reconcileTxn.referenceNo}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmReconcile} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Policy / Deposit Ref:</span>
                <span className="font-mono font-semibold text-slate-900">{reconcileTxn.referenceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Commission:</span>
                <span className="font-mono font-bold text-slate-900">{formatINR(reconcileTxn.companyCommissionExpected)}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Provider Bank CMS / NEFT Reference *</label>
              <input
                type="text"
                required
                value={paymentRefInput}
                onChange={(e) => setPaymentRefInput(e.target.value)}
                placeholder="CMS-STAR-99201"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Commission Amount Received in Bank (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={receivedAmountInput}
                onChange={(e) => setReceivedAmountInput(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
              {receivedAmountInput !== reconcileTxn.companyCommissionExpected && (
                <div className="mt-1 text-[11px] text-orange-600 font-mono">
                  Variance: {formatINR(receivedAmountInput - reconcileTxn.companyCommissionExpected)} vs expected
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reconciliation Notes</label>
              <textarea
                rows={2}
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                placeholder="e.g. Cleared via HDFC Bank CMS account..."
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              Confirming this records the actual receipt in Investxindia's bank account and moves the transaction to received state for partner payout release.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsReconcileModalOpen(false);
                  setReconcileTxn(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md transition-colors"
              >
                Confirm Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Super Admin Reversal Clawback Modal */}
      {reversalTxn && isReversalModalOpen && (
        <Modal
          isOpen={isReversalModalOpen}
          onClose={() => {
            setIsReversalModalOpen(false);
            setReversalTxn(null);
          }}
          title="Execute Cancellation Reversal / Clawback"
          subtitle={`Clawback for ${reversalTxn.referenceNo} (${reversalTxn.clientName})`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmReversal} className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900 space-y-1.5">
              <div className="flex justify-between">
                <span>Original Business Value:</span>
                <span className="font-mono font-semibold">{formatINR(reversalTxn.grossBusinessValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Company Brokerage Reversal:</span>
                <span className="font-mono font-bold text-rose-700">-{formatINR(reversalTxn.companyCommissionExpected)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sub-Broker Payout Clawback:</span>
                <span className="font-mono font-bold text-rose-700">-{formatINR(reversalTxn.subBrokerNetPayable)}</span>
              </div>
              <div className="flex justify-between">
                <span>TDS Credit Offset (Sec 194H):</span>
                <span className="font-mono text-emerald-800">+{formatINR(reversalTxn.tdsDeducted)}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clawback Justification / Reason *</label>
              <textarea
                rows={3}
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="State the cancellation notice number or insurer debit note reference..."
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              This action creates an immutable negative offsetting entry in the ledger (prefixed with REV-) ensuring regulatory double-entry compliance.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsReversalModalOpen(false);
                  setReversalTxn(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-md transition-colors"
              >
                Execute Clawback
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <Modal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          title="Log Manual Brokerage Entry"
          subtitle="Record manual commission transactions, direct distributor adjustments, or legacy policy entries"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateManualEntry} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Category *</label>
                <select
                  value={manualForm.productType}
                  onChange={(e) => setManualForm({ ...manualForm, productType: e.target.value as any })}
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / Policy No *</label>
                <input
                  type="text"
                  required
                  value={manualForm.referenceNo}
                  onChange={(e) => setManualForm({ ...manualForm, referenceNo: e.target.value })}
                  placeholder="POL-2026-9901"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Full Name *</label>
                <input
                  type="text"
                  required
                  value={manualForm.clientName}
                  onChange={(e) => setManualForm({ ...manualForm, clientName: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sub-Broker / Partner *</label>
                <select
                  value={manualForm.subBrokerId}
                  onChange={(e) => {
                    const sbId = e.target.value;
                    const sbName = sbId === 'sb-1' ? 'Aarav Sharma Financial Services' : 'Vikramaditya Wealth LLP';
                    setManualForm({ ...manualForm, subBrokerId: sbId, subBrokerName: sbName });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                >
                  <option value="sb-1">Aarav Sharma Financial Services (IX-SB-001)</option>
                  <option value="sb-2">Vikramaditya Wealth LLP (IX-SB-002)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gross Volume (₹) *</label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={manualForm.grossBusinessValue}
                  onChange={(e) => setManualForm({ ...manualForm, grossBusinessValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Comm % *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={manualForm.companyCommissionPct}
                  onChange={(e) => setManualForm({ ...manualForm, companyCommissionPct: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Partner Share % *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={manualForm.subBrokerSharePct}
                  onChange={(e) => setManualForm({ ...manualForm, subBrokerSharePct: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">TDS Sec 194H %</label>
                <input
                  type="number"
                  step="0.1"
                  value={manualForm.tdsRatePct}
                  onChange={(e) => setManualForm({ ...manualForm, tdsRatePct: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            {/* Live Breakdown Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1 font-mono text-xs">
              <div className="text-slate-500 text-[10px] font-sans uppercase font-bold mb-1">Calculation Breakdown Preview</div>
              <div className="flex justify-between">
                <span>Company Gross Commission:</span>
                <span className="font-bold text-slate-900">{formatINR(manualCommExpected)}</span>
              </div>
              <div className="flex justify-between">
                <span>Partner Gross Entitlement ({manualForm.subBrokerSharePct}%):</span>
                <span className="text-slate-900">{formatINR(manualSbGross)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Statutory TDS (Sec 194H @ {manualForm.tdsRatePct}%):</span>
                <span>-{formatINR(manualTds)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-orange-600">
                <span>Net Payable to Partner:</span>
                <span>{formatINR(manualSbNet)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Investxindia Retained Margin:</span>
                <span>{formatINR(manualRetained)}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
              <textarea
                rows={2}
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                placeholder="e.g. Special quarterly volume bonus adjustment..."
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition-colors"
              >
                Record Entry
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
