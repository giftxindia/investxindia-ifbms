import React, { useState, useMemo, useEffect } from 'react';
import { Search, User, Shield, Briefcase, FileText, ArrowRight, CornerDownLeft } from 'lucide-react';
import { dataStore } from '../../services/mockData';
import { NavItemId } from './Sidebar';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavItemId) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle search
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeUser = dataStore.getActiveUser();
  const isSubBroker = activeUser.role === 'sub_broker';
  const partnerCode = activeUser.subBrokerCode || 'IX-SB-101';

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const results: Array<{
      category: string;
      title: string;
      subtitle: string;
      icon: any;
      tab: NavItemId;
    }> = [];

    // Search Clients (Tenant filtered for sub-brokers)
    dataStore.getClients().forEach((c) => {
      if (isSubBroker && c.subBrokerId !== 'sb-1' && !c.subBrokerName?.includes('Vikram') && !c.subBrokerName?.includes('Apex Wealth')) {
        return; // Tenant isolation guard
      }
      if (
        c.fullName.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.city.toLowerCase().includes(q)
      ) {
        results.push({
          category: 'Clients',
          title: `${c.fullName} (${c.clientCode})`,
          subtitle: `${c.city}, ${c.state} · ${c.subBrokerName}`,
          icon: User,
          tab: 'clients',
        });
      }
    });

    // Search Sub-Brokers (Suppressed completely for sub-broker role)
    if (!isSubBroker) {
      dataStore.getSubBrokers().forEach((sb) => {
        if (
          sb.name.toLowerCase().includes(q) ||
          sb.companyName.toLowerCase().includes(q) ||
          sb.subBrokerCode.toLowerCase().includes(q) ||
          sb.amfiOrReraNo.toLowerCase().includes(q)
        ) {
          results.push({
            category: 'Sub-Brokers',
            title: `${sb.name} - ${sb.companyName} (${sb.subBrokerCode})`,
            subtitle: `${sb.amfiOrReraNo} · ${sb.city} · Tier: ${sb.tier}`,
            icon: Briefcase,
            tab: 'sub_brokers',
          });
        }
      });
    }

    // Search Policies (Tenant filtered for sub-brokers)
    dataStore.getHealthPolicies().forEach((p) => {
      if (isSubBroker && p.subBrokerId !== 'sb-1' && !p.subBrokerName?.includes('Vikram') && !p.subBrokerName?.includes('Apex Wealth')) {
        return;
      }
      if (p.policyNo.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q) || p.insurer.toLowerCase().includes(q)) {
        results.push({
          category: 'Health Insurance',
          title: `${p.policyNo} - ${p.insurer} (${p.planName})`,
          subtitle: `Client: ${p.clientName} · Sum Insured: ₹${p.sumInsured.toLocaleString('en-IN')}`,
          icon: Shield,
          tab: 'health_insurance',
        });
      }
    });

    dataStore.getMotorPolicies().forEach((p) => {
      if (isSubBroker && p.subBrokerId !== 'sb-1' && !p.subBrokerName?.includes('Vikram') && !p.subBrokerName?.includes('Apex Wealth')) {
        return;
      }
      if (p.policyNo.toLowerCase().includes(q) || p.vehicleNo.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)) {
        results.push({
          category: 'Motor Insurance',
          title: `${p.vehicleNo} · ${p.vehicleMakeModel}`,
          subtitle: `Policy: ${p.policyNo} · ${p.insurer} · ${p.clientName}`,
          icon: Shield,
          tab: 'motor_insurance',
        });
      }
    });

    dataStore.getFixedDeposits().forEach((fd) => {
      if (isSubBroker && fd.subBrokerId !== 'sb-1' && !fd.subBrokerName?.includes('Vikram') && !fd.subBrokerName?.includes('Apex Wealth')) {
        return;
      }
      if (fd.applicationNo.toLowerCase().includes(q) || fd.clientName.toLowerCase().includes(q) || fd.provider.toLowerCase().includes(q)) {
        results.push({
          category: 'Fixed Deposits',
          title: `${fd.applicationNo} · ${fd.provider}`,
          subtitle: `Client: ${fd.clientName} · ₹${fd.depositAmount.toLocaleString('en-IN')} @ ${fd.interestRatePct}%`,
          icon: FileText,
          tab: 'fixed_deposits',
        });
      }
    });

    return results.slice(0, 8);
  }, [query, isSubBroker, partnerCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-100">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search across all clients, partners, policies, and contracts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Type at least 2 letters to quickly search clients, sub-brokers, policies, and deposits.
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching records found for "{query}".
            </div>
          ) : (
            searchResults.map((res, i) => {
              const Icon = res.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    onNavigate(res.tab);
                    onClose();
                  }}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">
                          {res.category}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate">{res.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{res.subtitle}</p>
                    </div>
                  </div>
                  <CornerDownLeft className="w-4 h-4 text-slate-300 group-hover:text-slate-700 transition-colors shrink-0" />
                </button>
              );
            })
          )}
        </div>

        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span>Navigate using Search or Sidebar</span>
          <span>Investxindia Enterprise CRM</span>
        </div>
      </div>
    </div>
  );
};
