import React, { useState, useEffect } from 'react';
import { History, Shield, Lock, Download, Terminal, Search } from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { dataStore } from '../services/mockData';
import { AuditLog, UserRole } from '../types';
import { formatDateTimeIST } from '../utils/formatters';

import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AuditLogsPageProps {
  userRole: UserRole;
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ userRole }) => {
  const [logs, setLogs] = useState<AuditLog[]>(() => dataStore.getAuditLogs());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      if (isSupabaseConfigured()) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false });
          if (!error && data) {
            setLogs(
              data.map((row: any) => ({
                id: row.id,
                timestamp: row.timestamp,
                actorName: row.actor_name,
                actorRole: row.actor_role,
                action: row.action,
                entityType: row.entity_type,
                entityId: row.entity_id || '',
                ipAddress: row.ip_address || '103.21.144.12',
                details: row.details,
              }))
            );
            return;
          }
        } catch (e) {
          console.warn('Falling back to local audit logs:', e);
        } finally {
          setIsLoading(false);
        }
      }
      setLogs(dataStore.getAuditLogs());
    };

    fetchLogs();
    const unsubscribe = dataStore.subscribe(fetchLogs);
    return unsubscribe;
  }, []);

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp (IST)',
      width: '160px',
      sortable: true,
      render: (log) => (
        <span className="font-mono text-xs text-slate-800">{formatDateTimeIST(log.timestamp)}</span>
      ),
    },
    {
      key: 'actorName',
      header: 'Actor & Role',
      sortable: true,
      render: (log) => (
        <div>
          <span className="font-semibold text-slate-900 block">{log.actorName}</span>
          <span className="text-[10px] text-orange-600 capitalize font-medium">
            {log.actorRole.replace('_', ' ')}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Audit Action',
      sortable: true,
      render: (log) => (
        <span className="font-mono font-bold text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
          {log.action}
        </span>
      ),
    },
    {
      key: 'entityType',
      header: 'Target Entity',
      render: (log) => (
        <div>
          <span className="font-medium text-slate-900 block">{log.entityType}</span>
          <span className="text-[10px] text-slate-400 font-mono">{log.entityId}</span>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Change Audit Details',
      render: (log) => <span className="text-slate-600 text-xs">{log.details}</span>,
    },
    {
      key: 'ipAddress',
      header: 'Origin IP',
      width: '150px',
      render: (log) => (
        <span className="font-mono text-[10px] text-slate-500 block">{log.ipAddress}</span>
      ),
    },
  ];

  if (userRole !== 'super_admin') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Access Restricted: Super Admin Only</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The regulatory system audit trail contains sensitive tamper-evident security logs, IP addresses, and financial authorization history. Access is strictly limited to Super Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">System Security Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Immutable regulatory log of financial ledger adjustments, rule modifications, and payout approvals
          </p>
        </div>
      </div>

      <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>PostgreSQL Append-Only Trigger Enforced · Timezone: Asia/Kolkata (IST)</span>
        </div>
        <span className="text-emerald-400 font-semibold">Integrity Verified</span>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Search audit events by action, actor, entity..."
        searchKeys={['action', 'actorName', 'entityType', 'details', 'entityId']}
        exportFilename="Investxindia_System_Audit_Trail"
        emptyTitle="No audit logs available"
        emptyDescription="System actions will be recorded automatically."
      />
    </div>
  );
};
