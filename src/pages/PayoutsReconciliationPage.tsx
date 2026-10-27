import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Download,
  AlertCircle,
  Plus,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  CheckSquare,
  Square
} from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { dataStore } from '../services/mockData';
import { exportToExcel } from '../services/excelService';
import { brokerageService, subBrokerService } from '../services/supabaseService';
import { PartnerPayout, BrokerageTransaction, SubBroker, UserRole } from '../types';
import { formatINR, formatDateIST } from '../utils/formatters';

interface PayoutsReconciliationPageProps {
  userRole: UserRole;
}

export const PayoutsReconciliationPage: React.FC<PayoutsReconciliationPageProps> = ({ userRole }) => {
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [subBrokers, setSubBrokers] = useState<SubBroker[]>([]);
  const [approvedTxns, setApprovedTxns] = useState<BrokerageTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<PartnerPayout | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Authorize Modal
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [bankRefNo, setBankRefNo] = useState('');
  const [paymentMode, setPaymentMode] = useState<PartnerPayout['paymentMode']>('NEFT');

  // Generate Batch Modal
  const [isGenerateBatchModalOpen, setIsGenerateBatchModalOpen] = useState(false);
  const [selectedSubBrokerId, setSelectedSubBrokerId] = useState('');
  const [batchPeriod, setBatchPeriod] = useState(`April ${new Date().getFullYear()}`);
  const [selectedTxnIds, setSelectedTxnIds] = useState<string[]>([]);

  const activeUser = dataStore.getActiveUser();

  const loadData = async () => {
    try {
      setLoading(true);
      const [pData, sbData, tData] = await Promise.all([
        brokerageService.getPayouts(userRole, activeUser?.subBrokerCode),
        subBrokerService.getSubBrokers(),
        brokerageService.getTransactions(userRole, activeUser?.subBrokerCode),
      ]);
      setPayouts(pData);
      setSubBrokers(sbData);
      // Filter transactions that are approved and ready for payout
      setApprovedTxns(tData.filter((t) => t.status === 'approved' && !t.payoutBatchId));
      if (sbData.length > 0 && !selectedSubBrokerId) {
        setSelectedSubBrokerId(sbData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load payouts data:', err);
      setActionError(err.message || 'Error fetching payout batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userRole]);

  // Handle Authorize Open
  const handleOpenApprove = (payout: PartnerPayout) => {
    if (userRole !== 'super_admin') {
      setActionError('Permission Denied: Only Super Admin is authorized to disburse funds.');
      return;
    }
    setSelectedPayout(payout);
    setBankRefNo(`HDFCR5${new Date().getFullYear()}${Math.floor(10000000 + Math.random() * 90000000)}`);
    setPaymentMode(payout.paymentMode || 'NEFT');
    setIsApproveModalOpen(true);
  };

  // Confirm Disbursement
  const handleAuthorizeDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;
    if (userRole !== 'super_admin') {
      setActionError('Only Super Admin can authorize disbursement.');
      return;
    }

    try {
      setActionError(null);
      await brokerageService.authorizePayoutDisbursement(
        selectedPayout.id,
        bankRefNo.trim(),
        paymentMode,
        activeUser
      );
      setActionSuccess(`Disbursement authorized for ${selectedPayout.subBrokerName} with Bank UTR ${bankRefNo}.`);
      setIsApproveModalOpen(false);
      setSelectedPayout(null);
      await loadData();
    } catch (err: any) {
      console.error('Disbursement error:', err);
      setActionError(err.message || 'Failed to authorize disbursement');
    }
  };

  // Open Generate Batch Modal
  const handleOpenGenerateBatch = () => {
    if (userRole === 'sub_broker') return;
    setSelectedTxnIds([]);
    setIsGenerateBatchModalOpen(true);
  };

  // Filter transactions available for selected sub-broker
  const eligibleTxnsForSelectedPartner = approvedTxns.filter(
    (t) => t.subBrokerId === selectedSubBrokerId
  );

  const toggleSelectTxn = (id: string) => {
    setSelectedTxnIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTxnIds.length === eligibleTxnsForSelectedPartner.length) {
      setSelectedTxnIds([]);
    } else {
      setSelectedTxnIds(eligibleTxnsForSelectedPartner.map((t) => t.id));
    }
  };

  // Selected transactions totals
  const selectedTxnObjects = eligibleTxnsForSelectedPartner.filter((t) =>
    selectedTxnIds.includes(t.id)
  );
  const totalGrossSelected = selectedTxnObjects.reduce((acc, t) => acc + t.subBrokerGrossPayable, 0);
  const totalTdsSelected = selectedTxnObjects.reduce((acc, t) => acc + t.tdsDeducted, 0);
  const totalNetSelected = selectedTxnObjects.reduce((acc, t) => acc + t.subBrokerNetPayable, 0);

  // Submit Batch Generation
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTxnIds.length === 0) {
      setActionError('Please select at least one approved transaction to include in the batch.');
      return;
    }

    const partner = subBrokers.find((s) => s.id === selectedSubBrokerId);
    if (!partner) {
      setActionError('Invalid partner selected.');
      return;
    }

    try {
      setActionError(null);
      const batch = await brokerageService.createPayoutBatch(
        partner.id,
        partner.name,
        partner.subBrokerCode,
        batchPeriod,
        selectedTxnIds,
        activeUser
      );

      setActionSuccess(`Payout batch ${batch.payoutBatchNo} generated for ${partner.name} (${selectedTxnIds.length} transactions).`);
      setIsGenerateBatchModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Batch creation error:', err);
      setActionError(err.message || 'Failed to create payout batch');
    }
  };

  // Excel Payout Advice export
  const handleDownloadPayoutAdvice = (payout: PartnerPayout) => {
    const adviceRows = [
      {
        Payout_Batch_No: payout.payoutBatchNo,
        Partner_Name: payout.subBrokerName,
        Partner_Code: payout.subBrokerCode,
        Disbursement_Period: payout.period,
        Transactions_Count: payout.transactionCount,
        Gross_Commission_Payable: payout.grossPayable,
        Statutory_TDS_Sec194H: payout.tdsDeducted,
        Net_Disbursed_Amount: payout.netDisbursed,
        Payment_Mode: payout.paymentMode,
        Bank_UTR_Reference: payout.bankReferenceNo || 'PENDING',
        Disbursement_Date: payout.disbursementDate || 'PENDING',
        Authorized_By: payout.approvedBy || 'PENDING',
        Status: payout.status,
      },
    ];
    exportToExcel(adviceRows, `Investxindia_Payout_Advice_${payout.payoutBatchNo}`);
  };

  const columns: Column<PartnerPayout>[] = [
    {
      key: 'payoutBatchNo',
      header: 'Batch Reference',
      width: '160px',
      sortable: true,
      render: (payout) => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{payout.payoutBatchNo}</span>
          <span className="text-[11px] text-slate-400 font-mono">{payout.subBrokerCode}</span>
        </div>
      ),
    },
    {
      key: 'subBrokerName',
      header: 'Sub-Broker & Period',
      sortable: true,
      render: (payout) => (
        <div>
          <div className="font-semibold text-slate-900">{payout.subBrokerName}</div>
          <div className="text-[11px] text-slate-500">
            {payout.period} · {payout.transactionCount} Policies
          </div>
        </div>
      ),
    },
    {
      key: 'grossPayable',
      header: 'Gross Commission',
      align: 'right',
      sortable: true,
      render: (payout) => (
        <span className="font-mono font-semibold text-slate-900">{formatINR(payout.grossPayable)}</span>
      ),
    },
    {
      key: 'tdsDeducted',
      header: 'TDS (Sec 194H @ 5%)',
      align: 'right',
      render: (payout) => (
        <span className="font-mono text-rose-700">-{formatINR(payout.tdsDeducted)}</span>
      ),
    },
    {
      key: 'netDisbursed',
      header: 'Net Disbursed Amount',
      align: 'right',
      sortable: true,
      render: (payout) => (
        <span className="font-mono font-bold text-orange-600">
          {formatINR(payout.netDisbursed)}
        </span>
      ),
    },
    {
      key: 'paymentMode',
      header: 'Mode & UTR',
      render: (payout) => (
        <div>
          <span className="font-medium text-slate-900 block text-xs">{payout.paymentMode}</span>
          <span className="text-[11px] text-slate-500 font-mono truncate max-w-[140px] block">
            {payout.bankReferenceNo || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (payout) => <StatusPill status={payout.status} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      width: '130px',
      render: (payout) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleDownloadPayoutAdvice(payout)}
            title="Download Payout Advice (XLSX)"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {userRole === 'super_admin' && payout.status === 'pending_approval' && (
            <button
              onClick={() => handleOpenApprove(payout)}
              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-xs"
            >
              Authorize
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
          <h2 className="text-base font-bold text-slate-900">Partner Payouts & Reconciliation</h2>
          <p className="text-xs text-slate-500">
            Batch disbursement cycle with statutory Section 194H TDS withholding and bank RTGS/NEFT reconciliation
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
              onClick={handleOpenGenerateBatch}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Payout Batch</span>
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

      {/* Payouts Table */}
      <DataTable
        columns={columns}
        data={payouts}
        isLoading={loading}
        searchPlaceholder="Search payout batch, partner name, UTR number..."
        searchKeys={['payoutBatchNo', 'subBrokerName', 'bankReferenceNo', 'period']}
        statusFilterKey="status"
        statusFilterOptions={['pending_approval', 'processing', 'completed', 'on_hold']}
        exportFilename="Investxindia_Payouts_Master"
        emptyTitle="No payout batches generated"
        emptyDescription="Batches are created during monthly reconciliation cycles from approved brokerage transactions."
      />

      {/* Authorize Disbursement Modal */}
      {selectedPayout && isApproveModalOpen && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => {
            setIsApproveModalOpen(false);
            setSelectedPayout(null);
          }}
          title="Authorize RTGS/NEFT Disbursement"
          subtitle={`Batch: ${selectedPayout.payoutBatchNo} · ${selectedPayout.subBrokerName}`}
          maxWidth="md"
        >
          <form onSubmit={handleAuthorizeDisbursement} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Brokerage:</span>
                <span className="font-mono text-slate-900">{formatINR(selectedPayout.grossPayable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statutory TDS (Sec 194H @ 5%):</span>
                <span className="font-mono text-rose-700">-{formatINR(selectedPayout.tdsDeducted)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="font-semibold text-slate-900">Net Disbursed Amount:</span>
                <span className="font-mono font-bold text-orange-600 text-sm">
                  {formatINR(selectedPayout.netDisbursed)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                >
                  <option value="NEFT">NEFT (National Electronic Fund Transfer)</option>
                  <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                  <option value="IMPS">IMPS (Immediate Payment Service)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank UTR Confirmation Reference *
                </label>
                <input
                  type="text"
                  required
                  value={bankRefNo}
                  onChange={(e) => setBankRefNo(e.target.value)}
                  placeholder="HDFCR52026043000881923"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="p-2.5 bg-blue-50 rounded border border-blue-200 flex items-start gap-2 text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px]">
                As Super Admin, your authorization releases funds, finalizes the Section 194H TDS ledger entry, and locks transactions from double-payout.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsApproveModalOpen(false);
                  setSelectedPayout(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition-colors"
              >
                Confirm Disbursement
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Generate Payout Batch Modal */}
      {isGenerateBatchModalOpen && (
        <Modal
          isOpen={isGenerateBatchModalOpen}
          onClose={() => setIsGenerateBatchModalOpen(false)}
          title="Generate Sub-Broker Payout Batch"
          subtitle="Compile verified and approved brokerage transactions into a single disbursable remittance batch"
          maxWidth="xl"
        >
          <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Channel Partner *</label>
                <select
                  value={selectedSubBrokerId}
                  onChange={(e) => {
                    setSelectedSubBrokerId(e.target.value);
                    setSelectedTxnIds([]);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                >
                  {subBrokers.map((sb) => (
                    <option key={sb.id} value={sb.id}>
                      {sb.name} ({sb.subBrokerCode}) · {sb.tier} Tier
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reconciliation Period *</label>
                <input
                  type="text"
                  required
                  value={batchPeriod}
                  onChange={(e) => setBatchPeriod(e.target.value)}
                  placeholder="e.g. April 2026"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Eligible Transactions Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-900">
                  Approved Transactions Eligible for Batching ({eligibleTxnsForSelectedPartner.length})
                </span>
                {eligibleTxnsForSelectedPartner.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    {selectedTxnIds.length === eligibleTxnsForSelectedPartner.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {eligibleTxnsForSelectedPartner.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-slate-500">
                  No approved transactions pending disbursement for this partner. Ensure transactions are marked as 'received' and 'approved' in the Brokerage Register.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                  {eligibleTxnsForSelectedPartner.map((txn) => {
                    const isSelected = selectedTxnIds.includes(txn.id);
                    return (
                      <div
                        key={txn.id}
                        onClick={() => toggleSelectTxn(txn.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-orange-50/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{txn.clientName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {txn.referenceNo} · {txn.productType}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="font-bold text-orange-600">{formatINR(txn.subBrokerNetPayable)}</div>
                          <div className="text-[10px] text-slate-400">
                            Gross: {formatINR(txn.subBrokerGrossPayable)} | TDS: -{formatINR(txn.tdsDeducted)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Batch Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1 font-mono text-xs">
              <div className="text-slate-500 text-[10px] font-sans uppercase font-bold mb-1">Batch Disbursement Summary</div>
              <div className="flex justify-between">
                <span>Selected Policies Count:</span>
                <span className="font-bold text-slate-900">{selectedTxnIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Gross Brokerage:</span>
                <span className="text-slate-900">{formatINR(totalGrossSelected)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Statutory TDS Deduction (Sec 194H @ 5%):</span>
                <span>-{formatINR(totalTdsSelected)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-orange-600 text-sm">
                <span>Net Batch Disbursable:</span>
                <span>{formatINR(totalNetSelected)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsGenerateBatchModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedTxnIds.length === 0}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold rounded-md transition-colors"
              >
                Create Batch
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
