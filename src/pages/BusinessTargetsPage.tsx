import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Award, CheckCircle2, AlertTriangle, Plus, RefreshCw, X } from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { targetService } from '../services/supabaseService';
import { BusinessTarget, UserRole } from '../types';
import { formatINR } from '../utils/formatters';

interface BusinessTargetsPageProps {
  userRole: UserRole;
}

export const BusinessTargetsPage: React.FC<BusinessTargetsPageProps> = ({ userRole }) => {
  const [targets, setTargets] = useState<BusinessTarget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New target form
  const [formData, setFormData] = useState({
    entityName: '',
    entityType: 'Sub-Broker' as 'Staff' | 'Sub-Broker',
    productCategory: 'Health Insurance',
    month: 'May',
    year: new Date().getFullYear(),
    targetAmount: 1000000,
    achievedAmount: 0,
    status: 'on_track' as BusinessTarget['status'],
  });

  const loadTargets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await targetService.getTargets();
      setTargets(data);
    } catch (err: any) {
      console.error('Error fetching targets:', err);
      setError(err.message || 'Failed to fetch targets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargets();
  }, []);

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityName.trim()) {
      alert('Please enter entity/partner name.');
      return;
    }
    try {
      setIsSubmitting(true);
      await targetService.createTarget(formData);
      setIsModalOpen(false);
      setFormData({
        entityName: '',
        entityType: 'Sub-Broker',
        productCategory: 'Health Insurance',
        month: 'May',
        year: new Date().getFullYear(),
        targetAmount: 1000000,
        achievedAmount: 0,
        status: 'on_track',
      });
      await loadTargets();
    } catch (err: any) {
      alert(`Error saving target: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<BusinessTarget>[] = [
    {
      key: 'entityName',
      header: 'Staff / Partner Entity',
      sortable: true,
      render: (t) => (
        <div>
          <span className="font-semibold text-slate-900 block">{t.entityName}</span>
          <span className="text-[10px] text-slate-500">{t.entityType}</span>
        </div>
      ),
    },
    {
      key: 'productCategory',
      header: 'Product Vertical',
      sortable: true,
      render: (t) => (
        <span className="font-medium text-slate-800">{t.productCategory}</span>
      ),
    },
    {
      key: 'month',
      header: 'Period',
      render: (t) => (
        <span className="text-slate-600">{t.month} {t.year}</span>
      ),
    },
    {
      key: 'targetAmount',
      header: 'Assigned Target',
      align: 'right',
      sortable: true,
      render: (t) => (
        <span className="font-mono font-semibold text-slate-900">{formatINR(t.targetAmount, true)}</span>
      ),
    },
    {
      key: 'achievedAmount',
      header: 'Mobilized Actual',
      align: 'right',
      sortable: true,
      render: (t) => (
        <span className="font-mono font-bold text-slate-900">{formatINR(t.achievedAmount, true)}</span>
      ),
    },
    {
      key: 'progress',
      header: 'Achievement Pace',
      width: '180px',
      render: (t) => {
        const pct = Math.min(150, Math.round((t.achievedAmount / (t.targetAmount || 1)) * 100));
        const isExceeded = pct >= 100;

        return (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className={`font-semibold ${isExceeded ? 'text-emerald-700' : 'text-slate-700'}`}>
                {pct}%
              </span>
              <span className="text-slate-400">Target: 100%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 100 ? 'bg-emerald-600' : pct >= 70 ? 'bg-orange-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (t) => <StatusPill status={t.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Business Targets & Performance Goals</h2>
          <p className="text-xs text-slate-500">
            Monthly and quarterly sales volume goals for sales staff and sub-broker networks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTargets}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {userRole !== 'sub_broker' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign New Target</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading business targets from database...</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={targets}
          searchPlaceholder="Search by partner, employee, vertical..."
          searchKeys={['entityName', 'productCategory', 'entityType']}
          statusFilterKey="status"
          statusFilterOptions={['on_track', 'lagging', 'achieved', 'exceeded']}
          exportFilename="Investxindia_Targets_Performance"
          emptyTitle="No targets defined"
          emptyDescription="Set business targets to evaluate partner channel growth."
        />
      )}

      {/* Create Target Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign New Business Target"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTarget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Staff / Sub-Broker Name *
            </label>
            <input
              type="text"
              required
              value={formData.entityName}
              onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
              placeholder="e.g. Vikram Joshi (Apex Wealth)"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Entity Type
              </label>
              <select
                value={formData.entityType}
                onChange={(e) => setFormData({ ...formData, entityType: e.target.value as any })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
              >
                <option value="Sub-Broker">Sub-Broker Partner</option>
                <option value="Staff">Internal Staff / RM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Vertical
              </label>
              <select
                value={formData.productCategory}
                onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
              >
                <option value="Health Insurance">Health Insurance</option>
                <option value="Motor Insurance">Motor Insurance</option>
                <option value="Life Insurance">Life Insurance</option>
                <option value="Fixed Deposits">Fixed Deposits</option>
                <option value="Bonds">Bonds & NCDs</option>
                <option value="Loans">Loans & Mortgages</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 2026 })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Volume (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Achieved Volume (₹)
              </label>
              <input
                type="number"
                value={formData.achievedAmount}
                onChange={(e) => setFormData({ ...formData, achievedAmount: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{isSubmitting ? 'Saving...' : 'Save Target'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

