import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Key, Plus, Lock, CheckCircle2, User, RefreshCw } from 'lucide-react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusPill } from '../components/common/StatusPill';
import { Modal } from '../components/common/Modal';
import { INITIAL_USERS } from '../services/mockData';
import { authService, logAuditEvent } from '../services/supabaseService';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { UserProfile, UserRole } from '../types';

interface UserManagementPageProps {
  userRole: UserRole;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ userRole }) => {
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const fetched = await authService.getAllUsers();
        if (fetched && fetched.length > 0) {
          setUsers(fetched);
        }
      } catch (err) {
        console.warn('Failed to load users from auth service:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as UserRole,
    staffDepartment: 'Operations & CRM',
    subBrokerCode: '',
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      staffDepartment: formData.role === 'staff' ? formData.staffDepartment : undefined,
      subBrokerCode: formData.role === 'sub_broker' ? formData.subBrokerCode : undefined,
      status: 'active',
      permissions:
        formData.role === 'super_admin'
          ? ['all']
          : formData.role === 'staff'
          ? ['crm_access', 'operations_read_write']
          : ['view_assigned_clients', 'submit_leads'],
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('profiles').insert({
          id: crypto.randomUUID(),
          full_name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: formData.role,
          staff_department: formData.role === 'staff' ? formData.staffDepartment : null,
          sub_broker_code: formData.role === 'sub_broker' ? formData.subBrokerCode : null,
          is_active: true,
        });
        await logAuditEvent('USER_PROVISIONED', 'profiles', formData.email, `Super Admin provisioned account for ${formData.email} as ${formData.role}`);
      } catch (err) {
        console.warn('Could not insert profile in Supabase:', err);
      }
    }

    setUsers([newUser, ...users]);
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      staffDepartment: 'Operations & CRM',
      subBrokerCode: '',
    });
  };

  const columns: Column<UserProfile>[] = [
    {
      key: 'name',
      header: 'User Identity & Contact',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            {u.name.charAt(0)}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{u.name}</span>
            <span className="text-[11px] text-slate-500">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      render: (u) => (
        <div>
          <span className="font-semibold text-slate-900 capitalize block">
            {u.role.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-slate-500">
            {u.staffDepartment || u.subBrokerCode || 'Full System Rights'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Contact',
      render: (u) => <span className="font-mono text-slate-700 text-xs">{u.phone}</span>,
    },
    {
      key: 'permissions',
      header: 'Security Scope',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.permissions.map((p, idx) => (
            <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
              {p}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      width: '100px',
      render: (u) => <StatusPill status={u.status} />,
    },
  ];

  if (userRole !== 'super_admin') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Access Restricted: User & Role Administration</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            User directory administration and role assignments are restricted to Super Administrators. Non-admin users cannot alter account permissions or view staff credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">User Accounts & Role Permissions</h2>
          <p className="text-xs text-slate-500">
            RBAC provisioning across Super Admin, operations Staff, and channel Sub-Brokers
          </p>
        </div>

        {userRole === 'super_admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Invite User</span>
          </button>
        )}
      </div>

      {/* Permissions Matrix */}
      <div className="p-4 bg-white border border-slate-200 rounded-lg text-xs space-y-3">
        <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-orange-600" />
          Access Control Matrix (Enforced via Supabase RLS)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-2 px-3">System Capability</th>
                <th className="py-2 px-3 text-center">Super Admin</th>
                <th className="py-2 px-3 text-center">Operations Staff</th>
                <th className="py-2 px-3 text-center">Sub-Broker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              <tr>
                <td className="py-2 px-3 font-medium">View Global CRM & Portfolio Volume</td>
                <td className="py-2 px-3 text-center text-emerald-700 font-semibold">Full Access</td>
                <td className="py-2 px-3 text-center text-emerald-700 font-semibold">Assigned Only</td>
                <td className="py-2 px-3 text-center text-amber-700 font-semibold">Own Clients Only</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Configure Brokerage Commission Formulas</td>
                <td className="py-2 px-3 text-center text-emerald-700 font-semibold">Authorized</td>
                <td className="py-2 px-3 text-center text-rose-700 font-semibold">Restricted</td>
                <td className="py-2 px-3 text-center text-rose-700 font-semibold">Restricted</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Authorize Partner Payouts & RTGS Release</td>
                <td className="py-2 px-3 text-center text-emerald-700 font-semibold">Authorized</td>
                <td className="py-2 px-3 text-center text-rose-700 font-semibold">Restricted</td>
                <td className="py-2 px-3 text-center text-rose-700 font-semibold">Restricted</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Inspect Immutable System Audit Trails</td>
                <td className="py-2 px-3 text-center text-emerald-700 font-semibold">Authorized</td>
                <td className="py-2 px-3 text-center text-rose-700 font-semibold">Restricted</td>
                <td className="py-2 px-3 text-center text-rose-700 font-semibold">Restricted</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Search user accounts by name, email, department..."
        searchKeys={['name', 'email', 'staffDepartment', 'subBrokerCode']}
        exportFilename="Investxindia_Users_Directory"
        emptyTitle="No users found"
        emptyDescription="Add users to grant authorization into the system."
      />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Provision User Account"
        subtitle="Invite personnel or partner into Investxindia IFBMS"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Priya Sharma"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Corporate Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@investxindia.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98200 00000"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role Type</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
              >
                <option value="staff">Staff (Operations & CRM)</option>
                <option value="sub_broker">Sub-Broker (Restricted Portal)</option>
                <option value="super_admin">Super Admin (Full Governance)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {formData.role === 'sub_broker' ? 'Sub-Broker Code' : 'Department'}
              </label>
              {formData.role === 'sub_broker' ? (
                <input
                  type="text"
                  value={formData.subBrokerCode}
                  onChange={(e) => setFormData({ ...formData, subBrokerCode: e.target.value })}
                  placeholder="IX-SB-101"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
                />
              ) : (
                <input
                  type="text"
                  value={formData.staffDepartment}
                  onChange={(e) => setFormData({ ...formData, staffDepartment: e.target.value })}
                  placeholder="Operations & Underwriting"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition-colors"
            >
              Provision Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
