import { supabase, isSupabaseConfigured } from './supabaseClient';
import { dataStore } from './mockData';
import {
  AuditLog,
  Bond,
  BrokerageRule,
  BrokerageTransaction,
  BusinessTarget,
  Client,
  DocumentItem,
  FixedDeposit,
  HealthInsurancePolicy,
  ImportJob,
  LifeInsurancePolicy,
  LoanApplication,
  MotorInsurancePolicy,
  PartnerPayout,
  SubBroker,
  TaskReminder,
  UserProfile,
  UserRole,
} from '../types';
import { generateClientCode, generateSubBrokerCode } from '../utils/formatters';

/**
 * AUDIT LOGGING HELPER
 */
export async function logAuditEvent(
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  actor?: UserProfile
) {
  const currentActor = actor || dataStore.getActiveUser();

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert({
        actor_name: currentActor.name,
        actor_role: currentActor.role,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: '103.21.144.12 (Mumbai, IN)',
      });
    } catch (err) {
      console.warn('Failed to insert Supabase audit log, recording locally:', err);
      dataStore.logAudit(action, entityType, entityId, details);
    }
  } else {
    dataStore.logAudit(action, entityType, entityId, details);
  }
}

/**
 * AUTH & PROFILES SERVICE
 */
export const authService = {
  isLive(): boolean {
    return isSupabaseConfigured();
  },

  async getCurrentSession() {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getCurrentProfile(): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) {
      return dataStore.getActiveUser();
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionData.session.user.id)
      .single();

    if (error || !profile) return null;

    return {
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      phone: profile.phone || '',
      role: profile.role,
      staffDepartment: profile.staff_department,
      subBrokerCode: profile.sub_broker_code,
      avatarUrl: profile.avatar_url,
      status: profile.is_active ? 'active' : 'inactive',
      permissions:
        profile.role === 'super_admin'
          ? ['all']
          : profile.role === 'staff'
          ? ['crm_access', 'operations_read_write']
          : ['view_assigned_clients', 'submit_leads'],
    };
  },

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      const matched = dataStore.getActiveUser();
      return { user: matched, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };

    const profile = await this.getCurrentProfile();
    if (profile) {
      await logAuditEvent('USER_SIGN_IN', 'profiles', profile.id, `User ${profile.email} signed in successfully`, profile);
    }
    return { user: profile, error: null };
  },

  async signUp(email: string, password: string, fullName: string, role: UserRole): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { success: true, error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) return { success: false, error: error.message };

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        role,
        is_active: true,
      });

      await logAuditEvent('USER_REGISTRATION', 'profiles', data.user.id, `New account registered for ${email} with requested role ${role}`);
    }

    return { success: true, error: null };
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      const current = await this.getCurrentProfile();
      if (current) {
        await logAuditEvent('USER_SIGN_OUT', 'profiles', current.id, `User ${current.email} signed out`);
      }
      await supabase.auth.signOut();
    }
  },
};

/**
 * STAFF SERVICE (For relationship managers and assignment controls)
 */
export const staffService = {
  async getStaffMembers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured()) {
      // Return staff and super admin from local store
      return [
        {
          id: 'usr-1',
          name: 'Rajiv Malhotra',
          email: 'rajiv.malhotra@investxindia.com',
          phone: '+91 98200 11223',
          role: 'super_admin',
          staffDepartment: 'Executive Directorate',
          status: 'active',
          permissions: ['all'],
        },
        {
          id: 'usr-2',
          name: 'Neha Singhal',
          email: 'neha.singhal@investxindia.com',
          phone: '+91 98200 44556',
          role: 'staff',
          staffDepartment: 'Operations & Brokerage',
          status: 'active',
          permissions: ['crm_access', 'operations_read_write'],
        },
        {
          id: 'usr-4',
          name: 'Amit Deshmukh',
          email: 'amit.deshmukh@investxindia.com',
          phone: '+91 98200 77889',
          role: 'staff',
          staffDepartment: 'Wealth Solutions',
          status: 'active',
          permissions: ['crm_access', 'operations_read_write'],
        },
      ];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['staff', 'super_admin'])
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.warn('Falling back to local staff list:', error);
      return this.getStaffMembers();
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      phone: p.phone || '',
      role: p.role,
      staffDepartment: p.staff_department || 'CRM Operations',
      avatarUrl: p.avatar_url,
      status: p.is_active ? 'active' : 'inactive',
      permissions: p.role === 'super_admin' ? ['all'] : ['crm_access', 'operations_read_write'],
    }));
  },
};

/**
 * CLIENTS CRM SERVICE
 */
export const clientService = {
  async getClients(userRole?: UserRole, subBrokerCode?: string): Promise<Client[]> {
    if (!isSupabaseConfigured()) {
      const allClients = dataStore.getClients();
      // If user is sub-broker, strictly restrict to their assigned clients
      if (userRole === 'sub_broker' && subBrokerCode) {
        const mySubBroker = dataStore.getSubBrokers().find((sb) => sb.subBrokerCode === subBrokerCode || sb.id === 'sb-1');
        if (mySubBroker) {
          return allClients.filter((c) => c.subBrokerId === mySubBroker.id);
        }
      }
      return allClients;
    }

    // Supabase query with RLS enforcement
    let query = supabase
      .from('clients')
      .select('*, sub_brokers(id, name, sub_broker_code), profiles!assigned_staff_id(id, full_name, email)')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      clientCode: row.client_code,
      fullName: row.full_name,
      email: row.email || '',
      mobile: row.mobile,
      city: row.city,
      state: row.state,
      panMasked: row.pan_masked || '',
      gstNo: row.gst_no,
      assignedStaffId: row.assigned_staff_id,
      subBrokerId: row.sub_broker_id,
      subBrokerName: row.sub_brokers?.name || 'Direct House Account',
      totalPortfolioValue: Number(row.total_portfolio_value) || 0,
      activePoliciesCount: 0,
      kycStatus: row.kyc_status,
      createdAt: row.created_at,
      tags: row.tags || [],
    }));
  },

  async checkDuplicateClient(mobile: string, email?: string, clientCode?: string, excludeId?: string): Promise<string | null> {
    const clients = await this.getClients();
    const cleanMobile = mobile.replace(/[^0-9]/g, '');

    for (const c of clients) {
      if (excludeId && c.id === excludeId) continue;

      const existingMobileClean = c.mobile.replace(/[^0-9]/g, '');
      if (cleanMobile.length >= 10 && existingMobileClean.slice(-10) === cleanMobile.slice(-10)) {
        return `A client with mobile number ${mobile} already exists (${c.fullName} - ${c.clientCode}).`;
      }
      if (email && email.trim() && c.email && c.email.toLowerCase() === email.trim().toLowerCase()) {
        return `A client with email address "${email}" is already registered (${c.fullName}).`;
      }
      if (clientCode && c.clientCode.toUpperCase() === clientCode.trim().toUpperCase()) {
        return `Client Code "${clientCode}" is already taken. Please generate a unique code.`;
      }
    }
    return null;
  },

  async createClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    // 1. Duplicate check
    const duplicateError = await this.checkDuplicateClient(client.mobile, client.email, client.clientCode);
    if (duplicateError) {
      throw new Error(duplicateError);
    }

    if (!isSupabaseConfigured()) {
      const created = dataStore.addClient(client);
      await logAuditEvent('CLIENT_CREATED', 'Client', created.id, `Created client ${created.fullName} (${created.clientCode}) assigned to partner ${created.subBrokerName}`);
      return created;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        client_code: client.clientCode,
        full_name: client.fullName,
        email: client.email || null,
        mobile: client.mobile,
        city: client.city,
        state: client.state,
        pan_masked: client.panMasked || null,
        gst_no: client.gstNo || null,
        assigned_staff_id: client.assignedStaffId || null,
        sub_broker_id: client.subBrokerId || null,
        total_portfolio_value: client.totalPortfolioValue || 0,
        kyc_status: client.kycStatus || 'pending',
        tags: client.tags || [],
      })
      .select('*, sub_brokers(name)')
      .single();

    if (error) throw error;

    const newClient: Client = {
      ...client,
      id: data.id,
      subBrokerName: data.sub_brokers?.name || client.subBrokerName,
      createdAt: data.created_at,
    };

    await logAuditEvent('CLIENT_CREATED', 'Client', newClient.id, `Created client ${newClient.fullName} (${newClient.clientCode})`);
    return newClient;
  },

  async updateClient(client: Client): Promise<void> {
    // Duplicate check excluding self
    const duplicateError = await this.checkDuplicateClient(client.mobile, client.email, client.clientCode, client.id);
    if (duplicateError) {
      throw new Error(duplicateError);
    }

    if (!isSupabaseConfigured()) {
      dataStore.updateClient(client);
      await logAuditEvent('CLIENT_UPDATED', 'Client', client.id, `Updated client record for ${client.fullName} (${client.clientCode})`);
      return;
    }

    const { error } = await supabase
      .from('clients')
      .update({
        client_code: client.clientCode,
        full_name: client.fullName,
        email: client.email || null,
        mobile: client.mobile,
        city: client.city,
        state: client.state,
        pan_masked: client.panMasked || null,
        gst_no: client.gstNo || null,
        assigned_staff_id: client.assignedStaffId || null,
        sub_broker_id: client.subBrokerId || null,
        kyc_status: client.kycStatus,
        tags: client.tags,
      })
      .eq('id', client.id);

    if (error) throw error;

    await logAuditEvent('CLIENT_UPDATED', 'Client', client.id, `Updated client profile and assignments for ${client.fullName}`);
  },

  async updateStaffAssignment(clientId: string, staffId: string, staffName: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const c = dataStore.getClients().find((item) => item.id === clientId);
      if (c) {
        dataStore.updateClient({ ...c, assignedStaffId: staffId });
      }
      await logAuditEvent('CLIENT_STAFF_REASSIGNED', 'Client', clientId, `Reassigned relationship manager to ${staffName}`);
      return;
    }

    const { error } = await supabase
      .from('clients')
      .update({ assigned_staff_id: staffId })
      .eq('id', clientId);

    if (error) throw error;

    await logAuditEvent('CLIENT_STAFF_REASSIGNED', 'Client', clientId, `Reassigned client manager to ${staffName}`);
  },

  async updateKYCStatus(clientId: string, status: Client['kycStatus'], clientName: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const c = dataStore.getClients().find((item) => item.id === clientId);
      if (c) {
        dataStore.updateClient({ ...c, kycStatus: status });
      }
      await logAuditEvent('CLIENT_KYC_CHANGED', 'Client', clientId, `Updated KYC status of ${clientName} to ${status}`);
      return;
    }

    const { error } = await supabase
      .from('clients')
      .update({ kyc_status: status })
      .eq('id', clientId);

    if (error) throw error;

    await logAuditEvent('CLIENT_KYC_CHANGED', 'Client', clientId, `Updated KYC status of ${clientName} to ${status}`);
  },

  async deleteClient(id: string, clientName: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      dataStore.deleteClient(id);
      await logAuditEvent('CLIENT_DELETED', 'Client', id, `Authorized deletion of client ${clientName}`);
      return;
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent('CLIENT_DELETED', 'Client', id, `Authorized deletion of client ${clientName}`);
  },

  async getClientBusinessHistory(clientId: string) {
    if (!isSupabaseConfigured()) {
      const health = dataStore.getHealthPolicies().filter((p) => p.clientId === clientId);
      const motor = dataStore.getMotorPolicies().filter((p) => p.clientId === clientId);
      const life = dataStore.getLifePolicies().filter((p) => p.clientId === clientId);
      const fds = dataStore.getFixedDeposits().filter((f) => f.clientId === clientId);
      const bonds = dataStore.getBonds().filter((b) => b.clientId === clientId);
      const loans = dataStore.getLoans().filter((l) => l.clientId === clientId);

      return { health, motor, life, fds, bonds, loans };
    }

    const [healthRes, motorRes, lifeRes, fdsRes, bondsRes, loansRes] = await Promise.all([
      supabase.from('health_policies').select('*').eq('client_id', clientId),
      supabase.from('motor_policies').select('*').eq('client_id', clientId),
      supabase.from('life_policies').select('*').eq('client_id', clientId),
      supabase.from('fixed_deposits').select('*').eq('client_id', clientId),
      supabase.from('bonds').select('*').eq('client_id', clientId),
      supabase.from('loans').select('*').eq('client_id', clientId),
    ]);

    return {
      health: (healthRes.data || []).map((row: any) => ({
        id: row.id,
        policyNo: row.policy_no,
        clientId: row.client_id,
        clientName: '',
        subBrokerId: row.sub_broker_id,
        subBrokerName: '',
        insurer: row.insurer,
        planName: row.plan_name,
        sumInsured: Number(row.sum_insured),
        annualPremium: Number(row.annual_premium),
        policyStartDate: row.policy_start_date,
        policyExpiryDate: row.policy_expiry_date,
        renewalDueDate: row.renewal_due_date,
        paymentMode: row.payment_mode,
        status: row.status,
        commissionExpected: Number(row.commission_expected),
        commissionReceived: Number(row.commission_received),
        subBrokerPayable: Number(row.sub_broker_payable),
        payoutStatus: row.payout_status,
      })),
      motor: motorRes.data || [],
      life: lifeRes.data || [],
      fds: fdsRes.data || [],
      bonds: bondsRes.data || [],
      loans: loansRes.data || [],
    };
  },

  async getClientFollowupTasks(clientId: string, clientName: string): Promise<TaskReminder[]> {
    if (!isSupabaseConfigured()) {
      return dataStore.getTasks().filter((t) => t.relatedTo.includes(clientName) || t.relatedTo.includes(clientId));
    }
    // In database, tasks related to this client
    return dataStore.getTasks().filter((t) => t.relatedTo.includes(clientName) || t.relatedTo.includes(clientId));
  },

  async addClientTask(clientId: string, clientName: string, title: string, description: string, dueDate: string, priority: TaskReminder['priority'] = 'medium', assignedTo = 'Relationship Manager'): Promise<void> {
    const newTask: Omit<TaskReminder, 'id'> = {
      title,
      description,
      priority,
      dueDate,
      relatedTo: `${clientName} (${clientId})`,
      assignedTo,
      status: 'pending',
      reminderType: 'General',
    };
    dataStore.addTask(newTask);
    await logAuditEvent('CLIENT_TASK_CREATED', 'TaskReminder', clientId, `Created follow-up task "${title}" for client ${clientName}`);
  },
};

/**
 * SUB-BROKERS SERVICE
 */
export const subBrokerService = {
  async getSubBrokers(): Promise<SubBroker[]> {
    if (!isSupabaseConfigured()) {
      return dataStore.getSubBrokers();
    }
    const { data, error } = await supabase
      .from('sub_brokers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      subBrokerCode: row.sub_broker_code,
      name: row.name,
      companyName: row.company_name,
      mobile: row.mobile,
      email: row.email,
      city: row.city,
      state: row.state,
      panMasked: row.pan_masked,
      amfiOrReraNo: row.amfi_or_rera_no,
      tier: row.tier,
      defaultPayoutSharePct: Number(row.default_payout_share_pct),
      totalBusinessVolume: 0,
      totalBrokerageEarned: 0,
      pendingPayout: 0,
      activeClientsCount: 0,
      bankAccountMasked: row.bank_account_masked,
      bankIfsc: row.bank_ifsc,
      status: row.status,
    }));
  },

  async checkDuplicateSubBroker(amfiOrReraNo: string, email: string, mobile: string, excludeId?: string): Promise<string | null> {
    const brokers = await this.getSubBrokers();
    const cleanArn = amfiOrReraNo.trim().toUpperCase();
    const cleanMobile = mobile.replace(/[^0-9]/g, '');

    for (const b of brokers) {
      if (excludeId && b.id === excludeId) continue;
      if (cleanArn && b.amfiOrReraNo.toUpperCase() === cleanArn) {
        return `A partner with AMFI/RERA license "${amfiOrReraNo}" already exists (${b.name} - ${b.companyName}).`;
      }
      if (b.email.toLowerCase() === email.trim().toLowerCase()) {
        return `A partner with email "${email}" is already registered (${b.name}).`;
      }
      const existingMobileClean = b.mobile.replace(/[^0-9]/g, '');
      if (cleanMobile.length >= 10 && existingMobileClean.slice(-10) === cleanMobile.slice(-10)) {
        return `A partner with mobile ${mobile} is already registered (${b.name}).`;
      }
    }
    return null;
  },

  async createSubBroker(broker: Omit<SubBroker, 'id'>): Promise<SubBroker> {
    const duplicateError = await this.checkDuplicateSubBroker(broker.amfiOrReraNo, broker.email, broker.mobile);
    if (duplicateError) {
      throw new Error(duplicateError);
    }

    if (!isSupabaseConfigured()) {
      const created = dataStore.addSubBroker(broker);
      await logAuditEvent('SUB_BROKER_ONBOARDED', 'SubBroker', created.id, `Onboarded partner ${created.name} (${created.subBrokerCode}) - ${created.tier} Tier (${created.defaultPayoutSharePct}%)`);
      return created;
    }

    const { data, error } = await supabase
      .from('sub_brokers')
      .insert({
        sub_broker_code: broker.subBrokerCode,
        name: broker.name,
        company_name: broker.companyName,
        mobile: broker.mobile,
        email: broker.email,
        city: broker.city,
        state: broker.state,
        pan_masked: broker.panMasked,
        amfi_or_rera_no: broker.amfiOrReraNo,
        tier: broker.tier,
        default_payout_share_pct: broker.defaultPayoutSharePct,
        bank_account_masked: broker.bankAccountMasked,
        bank_ifsc: broker.bankIfsc,
        status: broker.status,
      })
      .select()
      .single();

    if (error) throw error;

    const newBroker: SubBroker = {
      ...broker,
      id: data.id,
    };

    await logAuditEvent('SUB_BROKER_ONBOARDED', 'SubBroker', newBroker.id, `Onboarded partner ${newBroker.name} (${newBroker.subBrokerCode}) - ${newBroker.tier} Tier`);
    return newBroker;
  },

  async updateSubBroker(broker: SubBroker): Promise<void> {
    const duplicateError = await this.checkDuplicateSubBroker(broker.amfiOrReraNo, broker.email, broker.mobile, broker.id);
    if (duplicateError) {
      throw new Error(duplicateError);
    }

    if (!isSupabaseConfigured()) {
      const brokers = dataStore.getSubBrokers().map((b) => (b.id === broker.id ? broker : b));
      localStorage.setItem('ifbms_sub_brokers', JSON.stringify(brokers));
      dataStore.notify();
      await logAuditEvent('SUB_BROKER_UPDATED', 'SubBroker', broker.id, `Updated partner details for ${broker.name} (${broker.subBrokerCode})`);
      return;
    }

    const { error } = await supabase
      .from('sub_brokers')
      .update({
        name: broker.name,
        company_name: broker.companyName,
        mobile: broker.mobile,
        email: broker.email,
        city: broker.city,
        state: broker.state,
        pan_masked: broker.panMasked,
        amfi_or_rera_no: broker.amfiOrReraNo,
        tier: broker.tier,
        default_payout_share_pct: broker.defaultPayoutSharePct,
        bank_account_masked: broker.bankAccountMasked,
        bank_ifsc: broker.bankIfsc,
        status: broker.status,
      })
      .eq('id', broker.id);

    if (error) throw error;

    await logAuditEvent('SUB_BROKER_UPDATED', 'SubBroker', broker.id, `Updated partner ${broker.name} (${broker.subBrokerCode})`);
  },

  async updateSubBrokerStatus(id: string, status: SubBroker['status'], brokerName: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const brokers = dataStore.getSubBrokers().map((b) => (b.id === id ? { ...b, status } : b));
      localStorage.setItem('ifbms_sub_brokers', JSON.stringify(brokers));
      dataStore.notify();
      await logAuditEvent('SUB_BROKER_STATUS_CHANGED', 'SubBroker', id, `Updated partner status of ${brokerName} to ${status}`);
      return;
    }

    const { error } = await supabase
      .from('sub_brokers')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent('SUB_BROKER_STATUS_CHANGED', 'SubBroker', id, `Updated partner status of ${brokerName} to ${status}`);
  },
};

/**
 * BROKERAGE & RECONCILIATION SERVICE
 */
export const brokerageService = {
  async getRules(): Promise<BrokerageRule[]> {
    if (!isSupabaseConfigured()) {
      return dataStore.getBrokerageRules();
    }
    const { data, error } = await supabase
      .from('brokerage_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      ruleCode: r.rule_code,
      productCategory: r.product_category,
      provider: r.provider,
      transactionType: r.transaction_type,
      partnerTier: r.partner_tier,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to,
      companyCommissionPct: Number(r.company_commission_pct),
      companyFlatInr: Number(r.company_flat_inr),
      subBrokerSharePct: Number(r.sub_broker_share_pct),
      subBrokerFlatInr: Number(r.sub_broker_flat_inr),
      minSlabAmount: Number(r.min_slab_amount),
      maxSlabAmount: Number(r.max_slab_amount),
      tdsDeductionPct: Number(r.tds_deduction_pct),
      status: r.status,
      version: r.version,
      notes: r.notes,
    }));
  },

  async getTransactions(userRole?: UserRole, subBrokerCode?: string): Promise<BrokerageTransaction[]> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getTransactions();
      if (userRole === 'sub_broker' && subBrokerCode) {
        const broker = dataStore.getSubBrokers().find((sb) => sb.subBrokerCode === subBrokerCode || sb.id === 'sb-1');
        return broker ? all.filter((t) => t.subBrokerId === broker.id) : all;
      }
      return all;
    }
    const { data, error } = await supabase
      .from('brokerage_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((t: any) => ({
      id: t.id,
      transactionNo: t.transaction_no,
      productType: t.product_type,
      referenceNo: t.reference_no,
      clientName: t.client_name,
      clientId: t.client_id,
      subBrokerId: t.sub_broker_id,
      subBrokerName: t.sub_broker_name,
      grossBusinessValue: Number(t.gross_business_value),
      companyCommissionExpected: Number(t.company_commission_expected),
      companyCommissionReceived: Number(t.company_commission_received),
      subBrokerSharePct: Number(t.sub_broker_share_pct),
      subBrokerGrossPayable: Number(t.sub_broker_gross_payable),
      tdsDeducted: Number(t.tds_deducted),
      subBrokerNetPayable: Number(t.sub_broker_net_payable),
      investxindiaRetained: Number(t.investxindia_retained),
      status: t.status,
      receiptDate: t.receipt_date,
      paymentRefNo: t.payment_ref_no,
      ruleVersionApplied: t.rule_version_applied,
      payoutBatchId: t.payout_batch_id,
      notes: t.notes,
    }));
  },

  async createRule(rule: Omit<BrokerageRule, 'id' | 'version'>, actor?: UserProfile): Promise<BrokerageRule> {
    const currentActor = actor || dataStore.getActiveUser();
    if (currentActor.role !== 'super_admin') {
      throw new Error('Only Super Admin is authorized to configure or publish brokerage rules.');
    }

    if (!isSupabaseConfigured()) {
      const newRule: BrokerageRule = {
        ...rule,
        id: `rule-${Date.now()}`,
        version: 1,
      };
      dataStore.addBrokerageRule({ ...rule, version: 1 });
      await logAuditEvent('BROKERAGE_RULE_CREATED', 'BrokerageRule', newRule.ruleCode, `Configured rule ${newRule.ruleCode} for ${newRule.productCategory} / ${newRule.provider}`, currentActor);
      return newRule;
    }

    const { data, error } = await supabase
      .from('brokerage_rules')
      .insert({
        rule_code: rule.ruleCode.trim().toUpperCase(),
        product_category: rule.productCategory,
        provider: rule.provider,
        transaction_type: rule.transactionType,
        partner_tier: rule.partnerTier,
        effective_from: rule.effectiveFrom,
        effective_to: rule.effectiveTo,
        company_commission_pct: rule.companyCommissionPct,
        company_flat_inr: rule.companyFlatInr,
        sub_broker_share_pct: rule.subBrokerSharePct,
        sub_broker_flat_inr: rule.subBrokerFlatInr,
        min_slab_amount: rule.minSlabAmount,
        max_slab_amount: rule.maxSlabAmount,
        tds_deduction_pct: rule.tdsDeductionPct,
        status: rule.status,
        version: 1,
        notes: rule.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    const created: BrokerageRule = {
      ...rule,
      id: data.id,
      version: 1,
    };
    await logAuditEvent('BROKERAGE_RULE_CREATED', 'BrokerageRule', created.ruleCode, `Configured rule ${created.ruleCode}`, currentActor);
    return created;
  },

  async updateRule(rule: BrokerageRule, actor?: UserProfile): Promise<void> {
    const currentActor = actor || dataStore.getActiveUser();
    if (currentActor.role !== 'super_admin') {
      throw new Error('Only Super Admin is authorized to modify brokerage commission schedules.');
    }

    const nextVersion = (rule.version || 1) + 1;

    if (!isSupabaseConfigured()) {
      dataStore.updateBrokerageRule({ ...rule, version: nextVersion });
      await logAuditEvent('BROKERAGE_RULE_UPDATED', 'BrokerageRule', rule.ruleCode, `Updated ${rule.ruleCode} to version v${nextVersion}`, currentActor);
      return;
    }

    const { error } = await supabase
      .from('brokerage_rules')
      .update({
        product_category: rule.productCategory,
        provider: rule.provider,
        transaction_type: rule.transactionType,
        partner_tier: rule.partnerTier,
        effective_from: rule.effectiveFrom,
        effective_to: rule.effectiveTo,
        company_commission_pct: rule.companyCommissionPct,
        company_flat_inr: rule.companyFlatInr,
        sub_broker_share_pct: rule.subBrokerSharePct,
        sub_broker_flat_inr: rule.subBrokerFlatInr,
        min_slab_amount: rule.minSlabAmount,
        max_slab_amount: rule.maxSlabAmount,
        tds_deduction_pct: rule.tdsDeductionPct,
        status: rule.status,
        version: nextVersion,
        notes: rule.notes,
      })
      .eq('id', rule.id);

    if (error) throw error;
    await logAuditEvent('BROKERAGE_RULE_UPDATED', 'BrokerageRule', rule.ruleCode, `Updated rule ${rule.ruleCode} to v${nextVersion}`, currentActor);
  },

  async createManualEntry(
    entry: Omit<BrokerageTransaction, 'id' | 'transactionNo'>,
    actor?: UserProfile
  ): Promise<BrokerageTransaction> {
    const currentActor = actor || dataStore.getActiveUser();
    const txns = await this.getTransactions();
    const newTxnNo = `TXN-${new Date().getFullYear()}-${String(txns.length + 5001).padStart(5, '0')}`;

    if (!isSupabaseConfigured()) {
      const newTxn: BrokerageTransaction = {
        ...entry,
        id: `txn-${Date.now()}`,
        transactionNo: newTxnNo,
      };
      const items = dataStore.getTransactions();
      localStorage.setItem('ifbms_transactions', JSON.stringify([newTxn, ...items]));
      dataStore.notify();
      await logAuditEvent('MANUAL_BROKERAGE_LOGGED', 'BrokerageTransaction', newTxn.transactionNo, `Logged manual brokerage entry for ${newTxn.clientName} (${newTxn.productType})`, currentActor);
      return newTxn;
    }

    const { data, error } = await supabase
      .from('brokerage_entries')
      .insert({
        transaction_no: newTxnNo,
        product_type: entry.productType,
        reference_no: entry.referenceNo,
        client_name: entry.clientName,
        client_id: entry.clientId || null,
        sub_broker_id: entry.subBrokerId || null,
        sub_broker_name: entry.subBrokerName,
        gross_business_value: entry.grossBusinessValue,
        company_commission_expected: entry.companyCommissionExpected,
        company_commission_received: entry.companyCommissionReceived || 0,
        sub_broker_share_pct: entry.subBrokerSharePct,
        sub_broker_gross_payable: entry.subBrokerGrossPayable,
        tds_deducted: entry.tdsDeducted,
        sub_broker_net_payable: entry.subBrokerNetPayable,
        investxindia_retained: entry.investxindiaRetained,
        status: entry.status || 'expected',
        rule_version_applied: entry.ruleVersionApplied || 'Manual Adjustment',
        notes: entry.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    const created: BrokerageTransaction = {
      ...entry,
      id: data.id,
      transactionNo: data.transaction_no,
    };
    await logAuditEvent('MANUAL_BROKERAGE_LOGGED', 'BrokerageTransaction', created.transactionNo, `Logged manual entry for ${created.clientName}`, currentActor);
    return created;
  },

  async reconcileProvider(
    transactionId: string,
    paymentRefNo: string,
    receivedAmount: number,
    notes?: string,
    actor?: UserProfile
  ): Promise<void> {
    const currentActor = actor || dataStore.getActiveUser();
    const today = new Date().toISOString().split('T')[0];

    if (!isSupabaseConfigured()) {
      dataStore.updateTransactionStatus(transactionId, 'received', paymentRefNo, receivedAmount);
      await logAuditEvent('PROVIDER_RECONCILED', 'BrokerageTransaction', transactionId, `Reconciled receipt ref ${paymentRefNo} for ₹${receivedAmount.toLocaleString('en-IN')}`, currentActor);
      return;
    }

    const { error } = await supabase
      .from('brokerage_entries')
      .update({
        status: 'received',
        payment_ref_no: paymentRefNo,
        company_commission_received: receivedAmount,
        receipt_date: today,
        notes: notes || null,
      })
      .eq('id', transactionId);

    if (error) throw error;
    await logAuditEvent('PROVIDER_RECONCILED', 'BrokerageTransaction', transactionId, `Reconciled receipt ref ${paymentRefNo}`, currentActor);
  },

  async approveBrokerage(transactionId: string, actor?: UserProfile): Promise<void> {
    const currentActor = actor || dataStore.getActiveUser();
    if (currentActor.role === 'sub_broker') {
      throw new Error('Unauthorized: Sub-brokers cannot approve brokerage transactions.');
    }

    if (!isSupabaseConfigured()) {
      dataStore.updateTransactionStatus(transactionId, 'approved');
      await logAuditEvent('BROKERAGE_APPROVED', 'BrokerageTransaction', transactionId, 'Authorized brokerage transaction for payout batching', currentActor);
      return;
    }

    const { error } = await supabase
      .from('brokerage_entries')
      .update({ status: 'approved' })
      .eq('id', transactionId);

    if (error) throw error;
    await logAuditEvent('BROKERAGE_APPROVED', 'BrokerageTransaction', transactionId, 'Authorized for payout', currentActor);
  },

  async executeReversal(transactionId: string, reason: string, actor?: UserProfile): Promise<void> {
    const currentActor = actor || dataStore.getActiveUser();
    if (currentActor.role !== 'super_admin') {
      throw new Error('Only Super Admin is authorized to execute clawback reversals.');
    }

    const txns = await this.getTransactions();
    const target = txns.find((t) => t.id === transactionId);
    if (!target) throw new Error('Transaction record not found.');

    const revGross = -Math.abs(target.companyCommissionExpected);
    const revSbGross = -Math.abs(target.subBrokerGrossPayable);
    const revTds = -Math.abs(target.tdsDeducted);
    const revSbNet = -Math.abs(target.subBrokerNetPayable);
    const revRetained = revGross - revSbGross;

    await this.createManualEntry(
      {
        productType: target.productType,
        referenceNo: `REV-${target.referenceNo}`,
        clientName: `CLAWBACK: ${target.clientName}`,
        clientId: target.clientId,
        subBrokerId: target.subBrokerId,
        subBrokerName: target.subBrokerName,
        grossBusinessValue: -Math.abs(target.grossBusinessValue),
        companyCommissionExpected: revGross,
        companyCommissionReceived: revGross,
        subBrokerSharePct: target.subBrokerSharePct,
        subBrokerGrossPayable: revSbGross,
        tdsDeducted: revTds,
        subBrokerNetPayable: revSbNet,
        investxindiaRetained: revRetained,
        status: 'reconciled',
        ruleVersionApplied: `Reversal of ${target.transactionNo}`,
        notes: `Clawback Reason: ${reason}`,
      },
      currentActor
    );

    await logAuditEvent('CLAWBACK_REVERSAL_EXECUTED', 'BrokerageTransaction', target.transactionNo, `Executed reversal clawback for ${target.referenceNo}. Reason: ${reason}`, currentActor);
  },

  async getPayouts(userRole?: UserRole, subBrokerCode?: string): Promise<PartnerPayout[]> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getPayouts();
      if (userRole === 'sub_broker' && subBrokerCode) {
        return all.filter((p) => p.subBrokerCode === subBrokerCode || p.subBrokerId === 'sb-1');
      }
      return all;
    }

    const { data, error } = await supabase
      .from('payouts')
      .select('*, sub_brokers(name, sub_broker_code)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      payoutBatchNo: row.payout_batch_no,
      subBrokerId: row.sub_broker_id,
      subBrokerName: row.sub_brokers?.name || 'Channel Partner',
      subBrokerCode: row.sub_brokers?.sub_broker_code || 'IX-SB',
      period: row.period,
      transactionCount: Number(row.transaction_count),
      grossPayable: Number(row.gross_payable),
      tdsDeducted: Number(row.tds_deducted),
      netDisbursed: Number(row.net_disbursed),
      paymentMode: row.payment_mode,
      bankReferenceNo: row.bank_reference_no || '',
      disbursementDate: row.disbursement_date || '',
      status: row.status,
      approvedBy: row.approved_by || '',
    }));
  },

  async createPayoutBatch(
    subBrokerId: string,
    subBrokerName: string,
    subBrokerCode: string,
    period: string,
    transactionIds: string[],
    actor?: UserProfile
  ): Promise<PartnerPayout> {
    const currentActor = actor || dataStore.getActiveUser();
    if (currentActor.role === 'sub_broker') {
      throw new Error('Unauthorized: Sub-brokers cannot generate payout batches.');
    }

    // 1. DUPLICATE PAYOUT PREVENTION GUARD
    const allTxns = await this.getTransactions();
    const selectedTxns = allTxns.filter((t) => transactionIds.includes(t.id));

    for (const t of selectedTxns) {
      if (t.status === 'paid' || t.payoutBatchId) {
        throw new Error(`Duplicate Payout Guard: Transaction ${t.transactionNo} (${t.referenceNo}) is already marked as paid or belongs to another batch.`);
      }
    }

    const grossTotal = selectedTxns.reduce((sum, t) => sum + t.subBrokerGrossPayable, 0);
    const tdsTotal = selectedTxns.reduce((sum, t) => sum + t.tdsDeducted, 0);
    const netTotal = selectedTxns.reduce((sum, t) => sum + t.subBrokerNetPayable, 0);
    const batchNo = `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!isSupabaseConfigured()) {
      const newPayout: PartnerPayout = {
        id: `payout-${Date.now()}`,
        payoutBatchNo: batchNo,
        subBrokerId,
        subBrokerName,
        subBrokerCode,
        period,
        transactionCount: selectedTxns.length,
        transactionIds,
        grossPayable: grossTotal,
        tdsDeducted: tdsTotal,
        netDisbursed: netTotal,
        paymentMode: 'NEFT',
        bankReferenceNo: '',
        disbursementDate: '',
        status: 'pending_approval',
        approvedBy: '',
      };
      const existing = dataStore.getPayouts();
      localStorage.setItem('ifbms_payouts', JSON.stringify([newPayout, ...existing]));

      // Mark transactions as paid with batch ref
      const updatedTxns = allTxns.map((t) =>
        transactionIds.includes(t.id) ? { ...t, status: 'paid' as const, payoutBatchId: newPayout.id } : t
      );
      localStorage.setItem('ifbms_transactions', JSON.stringify(updatedTxns));
      dataStore.notify();

      await logAuditEvent('PAYOUT_BATCH_GENERATED', 'PartnerPayout', newPayout.payoutBatchNo, `Generated payout batch for ${subBrokerName} (Net: ₹${netTotal.toLocaleString('en-IN')})`, currentActor);
      return newPayout;
    }

    const { data, error } = await supabase
      .from('payouts')
      .insert({
        payout_batch_no: batchNo,
        sub_broker_id: subBrokerId,
        period,
        transaction_count: selectedTxns.length,
        gross_payable: grossTotal,
        tds_deducted: tdsTotal,
        net_disbursed: netTotal,
        payment_mode: 'NEFT',
        status: 'pending_approval',
      })
      .select()
      .single();

    if (error) throw error;

    // Link transactions to batch
    await supabase
      .from('brokerage_entries')
      .update({ status: 'paid', payout_batch_id: data.id })
      .in('id', transactionIds);

    const created: PartnerPayout = {
      id: data.id,
      payoutBatchNo: data.payout_batch_no,
      subBrokerId,
      subBrokerName,
      subBrokerCode,
      period,
      transactionCount: selectedTxns.length,
      transactionIds,
      grossPayable: grossTotal,
      tdsDeducted: tdsTotal,
      netDisbursed: netTotal,
      paymentMode: 'NEFT',
      bankReferenceNo: '',
      disbursementDate: '',
      status: 'pending_approval',
      approvedBy: '',
    };

    await logAuditEvent('PAYOUT_BATCH_GENERATED', 'PartnerPayout', created.payoutBatchNo, `Generated batch for ${subBrokerName}`, currentActor);
    return created;
  },

  async authorizePayoutDisbursement(
    batchId: string,
    bankRefNo: string,
    paymentMode: PartnerPayout['paymentMode'] = 'NEFT',
    actor?: UserProfile
  ): Promise<void> {
    const currentActor = actor || dataStore.getActiveUser();
    if (currentActor.role !== 'super_admin') {
      throw new Error('Only Super Admin is authorized to release fund disbursements and authorize bank references.');
    }
    if (!bankRefNo || !bankRefNo.trim()) {
      throw new Error('Real bank UTR/transaction reference number is required to confirm disbursement.');
    }

    const today = new Date().toISOString().split('T')[0];

    if (!isSupabaseConfigured()) {
      dataStore.approvePayout(batchId, bankRefNo);
      await logAuditEvent('PAYOUT_DISBURSED', 'PartnerPayout', batchId, `Released disbursement with bank UTR ${bankRefNo}`, currentActor);
      return;
    }

    const { error } = await supabase
      .from('payouts')
      .update({
        status: 'completed',
        bank_reference_no: bankRefNo.trim(),
        payment_mode: paymentMode,
        disbursement_date: today,
        approved_by: `${currentActor.name} (Super Admin)`,
      })
      .eq('id', batchId);

    if (error) throw error;
    await logAuditEvent('PAYOUT_DISBURSED', 'PartnerPayout', batchId, `Released disbursement with bank UTR ${bankRefNo}`, currentActor);
  },
};

/**
 * 1. HEALTH INSURANCE SERVICE
 */
export const healthService = {
  async getPolicies(userRole?: UserRole, subBrokerCode?: string): Promise<HealthInsurancePolicy[]> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getHealthPolicies();
      if (userRole === 'sub_broker' && subBrokerCode) {
        const broker = dataStore.getSubBrokers().find((sb) => sb.subBrokerCode === subBrokerCode || sb.id === 'sb-1');
        return broker ? all.filter((p) => p.subBrokerId === broker.id) : all;
      }
      return all;
    }

    const { data, error } = await supabase
      .from('health_policies')
      .select('*, clients(id, full_name), sub_brokers(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      policyNo: row.policy_no,
      clientId: row.client_id,
      clientName: row.clients?.full_name || 'Client',
      subBrokerId: row.sub_broker_id || '',
      subBrokerName: row.sub_brokers?.name || 'Direct House Account',
      insurer: row.insurer,
      planName: row.plan_name,
      sumInsured: Number(row.sum_insured),
      annualPremium: Number(row.annual_premium),
      policyStartDate: row.policy_start_date,
      policyExpiryDate: row.policy_expiry_date,
      renewalDueDate: row.renewal_due_date,
      paymentMode: row.payment_mode,
      status: row.status,
      commissionExpected: Number(row.commission_expected),
      commissionReceived: Number(row.commission_received),
      subBrokerPayable: Number(row.sub_broker_payable),
      payoutStatus: row.payout_status,
    }));
  },

  async checkDuplicate(policyNo: string, excludeId?: string): Promise<string | null> {
    const policies = await this.getPolicies();
    const cleanNo = policyNo.trim().toUpperCase();
    const exists = policies.some((p) => p.policyNo.toUpperCase() === cleanNo && (!excludeId || p.id !== excludeId));
    if (exists) {
      return `Health insurance policy #${policyNo} already exists in the system.`;
    }
    return null;
  },

  async createPolicy(policy: Omit<HealthInsurancePolicy, 'id'>): Promise<HealthInsurancePolicy> {
    const dup = await this.checkDuplicate(policy.policyNo);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      const created = dataStore.addHealthPolicy(policy);
      await logAuditEvent('HEALTH_POLICY_ISSUED', 'HealthInsurancePolicy', created.policyNo, `Issued ${created.insurer} policy for ${created.clientName} (Premium: ₹${created.annualPremium})`);
      return created;
    }

    const { data, error } = await supabase
      .from('health_policies')
      .insert({
        policy_no: policy.policyNo.trim().toUpperCase(),
        client_id: policy.clientId,
        sub_broker_id: policy.subBrokerId || null,
        insurer: policy.insurer,
        plan_name: policy.planName,
        sum_insured: policy.sumInsured,
        annual_premium: policy.annualPremium,
        policy_start_date: policy.policyStartDate,
        policy_expiry_date: policy.policyExpiryDate,
        renewal_due_date: policy.renewalDueDate,
        payment_mode: policy.paymentMode,
        status: policy.status,
        commission_expected: policy.commissionExpected,
        commission_received: policy.commissionReceived || 0,
        sub_broker_payable: policy.subBrokerPayable,
        payout_status: policy.payoutStatus,
      })
      .select('*, clients(full_name), sub_brokers(name)')
      .single();

    if (error) throw error;
    const created: HealthInsurancePolicy = {
      ...policy,
      id: data.id,
      clientName: data.clients?.full_name || policy.clientName,
      subBrokerName: data.sub_brokers?.name || policy.subBrokerName,
    };
    await logAuditEvent('HEALTH_POLICY_ISSUED', 'HealthInsurancePolicy', created.policyNo, `Issued ${created.insurer} policy for ${created.clientName}`);
    return created;
  },

  async updatePolicy(policy: HealthInsurancePolicy): Promise<void> {
    const dup = await this.checkDuplicate(policy.policyNo, policy.id);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      dataStore.updateHealthPolicy(policy);
      return;
    }

    const { error } = await supabase
      .from('health_policies')
      .update({
        policy_no: policy.policyNo.trim().toUpperCase(),
        client_id: policy.clientId,
        sub_broker_id: policy.subBrokerId || null,
        insurer: policy.insurer,
        plan_name: policy.planName,
        sum_insured: policy.sumInsured,
        annual_premium: policy.annualPremium,
        policy_start_date: policy.policyStartDate,
        policy_expiry_date: policy.policyExpiryDate,
        renewal_due_date: policy.renewalDueDate,
        payment_mode: policy.paymentMode,
        status: policy.status,
        commission_expected: policy.commissionExpected,
        sub_broker_payable: policy.subBrokerPayable,
      })
      .eq('id', policy.id);

    if (error) throw error;
    await logAuditEvent('HEALTH_POLICY_UPDATED', 'HealthInsurancePolicy', policy.policyNo, `Updated ${policy.insurer} policy #${policy.policyNo}`);
  },

  async deletePolicy(id: string, policyNo: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      dataStore.deleteHealthPolicy(id, policyNo);
      return;
    }
    const { error } = await supabase.from('health_policies').delete().eq('id', id);
    if (error) throw error;
    await logAuditEvent('HEALTH_POLICY_ARCHIVED', 'HealthInsurancePolicy', policyNo, `Archived health policy #${policyNo}`);
  },
};

/**
 * 2. MOTOR INSURANCE SERVICE
 */
export const motorService = {
  async getPolicies(userRole?: UserRole, subBrokerCode?: string): Promise<MotorInsurancePolicy[]> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getMotorPolicies();
      if (userRole === 'sub_broker' && subBrokerCode) {
        const broker = dataStore.getSubBrokers().find((sb) => sb.subBrokerCode === subBrokerCode || sb.id === 'sb-1');
        return broker ? all.filter((p) => p.subBrokerId === broker.id) : all;
      }
      return all;
    }

    const { data, error } = await supabase
      .from('motor_policies')
      .select('*, clients(id, full_name), sub_brokers(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      policyNo: row.policy_no,
      vehicleNo: row.vehicle_no,
      vehicleMakeModel: row.vehicle_make_model,
      policyType: row.policy_type,
      clientId: row.client_id,
      clientName: row.clients?.full_name || 'Client',
      subBrokerId: row.sub_broker_id || '',
      subBrokerName: row.sub_brokers?.name || 'Direct House Account',
      insurer: row.insurer,
      idvAmount: Number(row.idv_amount),
      netPremium: Number(row.net_premium),
      grossPremium: Number(row.gross_premium),
      policyStartDate: row.policy_start_date,
      policyExpiryDate: row.policy_expiry_date,
      status: row.status,
      commissionExpected: Number(row.commission_expected),
      commissionReceived: Number(row.commission_received),
      subBrokerPayable: Number(row.sub_broker_payable),
      payoutStatus: row.payout_status,
    }));
  },

  async checkDuplicate(policyNo: string, vehicleNo: string, excludeId?: string): Promise<string | null> {
    const policies = await this.getPolicies();
    const cleanNo = policyNo.trim().toUpperCase();
    const cleanVeh = vehicleNo.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    for (const p of policies) {
      if (excludeId && p.id === excludeId) continue;
      if (p.policyNo.toUpperCase() === cleanNo) {
        return `Motor policy #${policyNo} already exists in the system.`;
      }
      const existingVeh = p.vehicleNo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (existingVeh === cleanVeh && p.status === 'active') {
        return `An active policy for vehicle registration "${vehicleNo}" already exists (#${p.policyNo}).`;
      }
    }
    return null;
  },

  async createPolicy(policy: Omit<MotorInsurancePolicy, 'id'>): Promise<MotorInsurancePolicy> {
    const dup = await this.checkDuplicate(policy.policyNo, policy.vehicleNo);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      const created = dataStore.addMotorPolicy(policy);
      await logAuditEvent('MOTOR_POLICY_ISSUED', 'MotorInsurancePolicy', created.policyNo, `Issued ${created.insurer} motor policy for vehicle ${created.vehicleNo}`);
      return created;
    }

    const { data, error } = await supabase
      .from('motor_policies')
      .insert({
        policy_no: policy.policyNo.trim().toUpperCase(),
        vehicle_no: policy.vehicleNo.trim().toUpperCase(),
        vehicle_make_model: policy.vehicleMakeModel,
        policy_type: policy.policyType,
        client_id: policy.clientId,
        sub_broker_id: policy.subBrokerId || null,
        insurer: policy.insurer,
        idv_amount: policy.idvAmount,
        net_premium: policy.netPremium,
        gross_premium: policy.grossPremium,
        policy_start_date: policy.policyStartDate,
        policy_expiry_date: policy.policyExpiryDate,
        status: policy.status,
        commission_expected: policy.commissionExpected,
        commission_received: policy.commissionReceived || 0,
        sub_broker_payable: policy.subBrokerPayable,
        payout_status: policy.payoutStatus,
      })
      .select('*, clients(full_name), sub_brokers(name)')
      .single();

    if (error) throw error;
    const created: MotorInsurancePolicy = {
      ...policy,
      id: data.id,
      clientName: data.clients?.full_name || policy.clientName,
      subBrokerName: data.sub_brokers?.name || policy.subBrokerName,
    };
    await logAuditEvent('MOTOR_POLICY_ISSUED', 'MotorInsurancePolicy', created.policyNo, `Issued motor policy for vehicle ${created.vehicleNo}`);
    return created;
  },

  async updatePolicy(policy: MotorInsurancePolicy): Promise<void> {
    const dup = await this.checkDuplicate(policy.policyNo, policy.vehicleNo, policy.id);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      dataStore.updateMotorPolicy(policy);
      return;
    }

    const { error } = await supabase
      .from('motor_policies')
      .update({
        policy_no: policy.policyNo.trim().toUpperCase(),
        vehicle_no: policy.vehicleNo.trim().toUpperCase(),
        vehicle_make_model: policy.vehicleMakeModel,
        policy_type: policy.policyType,
        client_id: policy.clientId,
        sub_broker_id: policy.subBrokerId || null,
        insurer: policy.insurer,
        idv_amount: policy.idvAmount,
        net_premium: policy.netPremium,
        gross_premium: policy.grossPremium,
        policy_start_date: policy.policyStartDate,
        policy_expiry_date: policy.policyExpiryDate,
        status: policy.status,
        commission_expected: policy.commissionExpected,
        sub_broker_payable: policy.subBrokerPayable,
      })
      .eq('id', policy.id);

    if (error) throw error;
    await logAuditEvent('MOTOR_POLICY_UPDATED', 'MotorInsurancePolicy', policy.policyNo, `Updated motor policy #${policy.policyNo}`);
  },

  async deletePolicy(id: string, policyNo: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      dataStore.deleteMotorPolicy(id, policyNo);
      return;
    }
    const { error } = await supabase.from('motor_policies').delete().eq('id', id);
    if (error) throw error;
    await logAuditEvent('MOTOR_POLICY_ARCHIVED', 'MotorInsurancePolicy', policyNo, `Archived motor policy #${policyNo}`);
  },
};

/**
 * 3. LIFE INSURANCE SERVICE
 */
export const lifeService = {
  async getPolicies(userRole?: UserRole, subBrokerCode?: string): Promise<LifeInsurancePolicy[]> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getLifePolicies();
      if (userRole === 'sub_broker' && subBrokerCode) {
        const broker = dataStore.getSubBrokers().find((sb) => sb.subBrokerCode === subBrokerCode || sb.id === 'sb-1');
        return broker ? all.filter((p) => p.subBrokerId === broker.id) : all;
      }
      return all;
    }

    const { data, error } = await supabase
      .from('life_policies')
      .select('*, clients(id, full_name), sub_brokers(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      policyNo: row.policy_no,
      clientId: row.client_id,
      clientName: row.clients?.full_name || 'Client',
      subBrokerId: row.sub_broker_id || '',
      subBrokerName: row.sub_brokers?.name || 'Direct House Account',
      insurer: row.insurer,
      planType: row.plan_type,
      planName: row.plan_name,
      sumAssured: Number(row.sum_assured),
      policyTermYears: Number(row.policy_term_years),
      premiumPaymentTerm: Number(row.premium_payment_term),
      annualPremium: Number(row.annual_premium),
      policyDate: row.policy_date,
      nextPremiumDate: row.next_premium_date,
      status: row.status,
      commissionExpected: Number(row.commission_expected),
      commissionReceived: Number(row.commission_received),
      subBrokerPayable: Number(row.sub_broker_payable),
      payoutStatus: row.payout_status,
    }));
  },

  async checkDuplicate(policyNo: string, excludeId?: string): Promise<string | null> {
    const policies = await this.getPolicies();
    const cleanNo = policyNo.trim().toUpperCase();
    const exists = policies.some((p) => p.policyNo.toUpperCase() === cleanNo && (!excludeId || p.id !== excludeId));
    if (exists) {
      return `Life insurance policy #${policyNo} already exists in the system.`;
    }
    return null;
  },

  async createPolicy(policy: Omit<LifeInsurancePolicy, 'id'>): Promise<LifeInsurancePolicy> {
    const dup = await this.checkDuplicate(policy.policyNo);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      const created = dataStore.addLifePolicy(policy);
      await logAuditEvent('LIFE_POLICY_ISSUED', 'LifeInsurancePolicy', created.policyNo, `Issued ${created.insurer} life policy for ${created.clientName} (Sum Assured: ₹${created.sumAssured.toLocaleString('en-IN')})`);
      return created;
    }

    const { data, error } = await supabase
      .from('life_policies')
      .insert({
        policy_no: policy.policyNo.trim().toUpperCase(),
        client_id: policy.clientId,
        sub_broker_id: policy.subBrokerId || null,
        insurer: policy.insurer,
        plan_type: policy.planType,
        plan_name: policy.planName,
        sum_assured: policy.sumAssured,
        policy_term_years: policy.policyTermYears,
        premium_payment_term: policy.premiumPaymentTerm,
        annual_premium: policy.annualPremium,
        policy_date: policy.policyDate,
        next_premium_date: policy.nextPremiumDate,
        status: policy.status,
        commission_expected: policy.commissionExpected,
        commission_received: policy.commissionReceived || 0,
        sub_broker_payable: policy.subBrokerPayable,
        payout_status: policy.payoutStatus,
      })
      .select('*, clients(full_name), sub_brokers(name)')
      .single();

    if (error) throw error;
    const created: LifeInsurancePolicy = {
      ...policy,
      id: data.id,
      clientName: data.clients?.full_name || policy.clientName,
      subBrokerName: data.sub_brokers?.name || policy.subBrokerName,
    };
    await logAuditEvent('LIFE_POLICY_ISSUED', 'LifeInsurancePolicy', created.policyNo, `Issued life policy for ${created.clientName}`);
    return created;
  },

  async updatePolicy(policy: LifeInsurancePolicy): Promise<void> {
    const dup = await this.checkDuplicate(policy.policyNo, policy.id);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      dataStore.updateLifePolicy(policy);
      return;
    }

    const { error } = await supabase
      .from('life_policies')
      .update({
        policy_no: policy.policyNo.trim().toUpperCase(),
        client_id: policy.clientId,
        sub_broker_id: policy.subBrokerId || null,
        insurer: policy.insurer,
        plan_type: policy.planType,
        plan_name: policy.planName,
        sum_assured: policy.sumAssured,
        policy_term_years: policy.policyTermYears,
        premium_payment_term: policy.premiumPaymentTerm,
        annual_premium: policy.annualPremium,
        policy_date: policy.policyDate,
        next_premium_date: policy.nextPremiumDate,
        status: policy.status,
        commission_expected: policy.commissionExpected,
        sub_broker_payable: policy.subBrokerPayable,
      })
      .eq('id', policy.id);

    if (error) throw error;
    await logAuditEvent('LIFE_POLICY_UPDATED', 'LifeInsurancePolicy', policy.policyNo, `Updated life policy #${policy.policyNo}`);
  },

  async deletePolicy(id: string, policyNo: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      dataStore.deleteLifePolicy(id, policyNo);
      return;
    }
    const { error } = await supabase.from('life_policies').delete().eq('id', id);
    if (error) throw error;
    await logAuditEvent('LIFE_POLICY_ARCHIVED', 'LifeInsurancePolicy', policyNo, `Archived life policy #${policyNo}`);
  },
};

/**
 * 4. FIXED DEPOSITS SERVICE
 */
export const fdService = {
  async getDeposits(userRole?: UserRole, subBrokerCode?: string): Promise<FixedDeposit[]> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getFixedDeposits();
      if (userRole === 'sub_broker' && subBrokerCode) {
        const broker = dataStore.getSubBrokers().find((sb) => sb.subBrokerCode === subBrokerCode || sb.id === 'sb-1');
        return broker ? all.filter((f) => f.subBrokerId === broker.id) : all;
      }
      return all;
    }

    const { data, error } = await supabase
      .from('fixed_deposits')
      .select('*, clients(id, full_name), sub_brokers(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      applicationNo: row.application_no,
      clientId: row.client_id,
      clientName: row.clients?.full_name || 'Client',
      subBrokerId: row.sub_broker_id || '',
      subBrokerName: row.sub_brokers?.name || 'Direct House Account',
      provider: row.provider,
      depositAmount: Number(row.deposit_amount),
      tenureMonths: Number(row.tenure_months),
      interestRatePct: Number(row.interest_rate_pct),
      interestPayoutFrequency: row.interest_payout_frequency,
      depositDate: row.deposit_date,
      maturityDate: row.maturity_date,
      maturityAmount: Number(row.maturity_amount),
      status: row.status,
      commissionExpected: Number(row.commission_expected),
      commissionReceived: Number(row.commission_received),
      subBrokerPayable: Number(row.sub_broker_payable),
      payoutStatus: row.payout_status,
    }));
  },

  async checkDuplicate(applicationNo: string, excludeId?: string): Promise<string | null> {
    const fds = await this.getDeposits();
    const cleanApp = applicationNo.trim().toUpperCase();
    const exists = fds.some((f) => f.applicationNo.toUpperCase() === cleanApp && (!excludeId || f.id !== excludeId));
    if (exists) {
      return `Fixed deposit application #${applicationNo} already exists in the system.`;
    }
    return null;
  },

  async createDeposit(fd: Omit<FixedDeposit, 'id'>): Promise<FixedDeposit> {
    const dup = await this.checkDuplicate(fd.applicationNo);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      const created = dataStore.addFixedDeposit(fd);
      await logAuditEvent('FD_CREATED', 'FixedDeposit', created.applicationNo, `Booked FD with ${created.provider} for ₹${created.depositAmount.toLocaleString('en-IN')}`);
      return created;
    }

    const { data, error } = await supabase
      .from('fixed_deposits')
      .insert({
        application_no: fd.applicationNo.trim().toUpperCase(),
        client_id: fd.clientId,
        sub_broker_id: fd.subBrokerId || null,
        provider: fd.provider,
        deposit_amount: fd.depositAmount,
        tenure_months: fd.tenureMonths,
        interest_rate_pct: fd.interestRatePct,
        interest_payout_frequency: fd.interestPayoutFrequency,
        deposit_date: fd.depositDate,
        maturity_date: fd.maturityDate,
        maturity_amount: fd.maturityAmount,
        status: fd.status,
        commission_expected: fd.commissionExpected,
        commission_received: fd.commissionReceived || 0,
        sub_broker_payable: fd.subBrokerPayable,
        payout_status: fd.payoutStatus,
      })
      .select('*, clients(full_name), sub_brokers(name)')
      .single();

    if (error) throw error;
    const created: FixedDeposit = {
      ...fd,
      id: data.id,
      clientName: data.clients?.full_name || fd.clientName,
      subBrokerName: data.sub_brokers?.name || fd.subBrokerName,
    };
    await logAuditEvent('FD_CREATED', 'FixedDeposit', created.applicationNo, `Booked corporate FD with ${created.provider}`);
    return created;
  },

  async updateDeposit(fd: FixedDeposit): Promise<void> {
    const dup = await this.checkDuplicate(fd.applicationNo, fd.id);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      dataStore.updateFixedDeposit(fd);
      return;
    }

    const { error } = await supabase
      .from('fixed_deposits')
      .update({
        application_no: fd.applicationNo.trim().toUpperCase(),
        client_id: fd.clientId,
        sub_broker_id: fd.subBrokerId || null,
        provider: fd.provider,
        deposit_amount: fd.depositAmount,
        tenure_months: fd.tenureMonths,
        interest_rate_pct: fd.interestRatePct,
        interest_payout_frequency: fd.interestPayoutFrequency,
        deposit_date: fd.depositDate,
        maturity_date: fd.maturityDate,
        maturity_amount: fd.maturityAmount,
        status: fd.status,
        commission_expected: fd.commissionExpected,
        sub_broker_payable: fd.subBrokerPayable,
      })
      .eq('id', fd.id);

    if (error) throw error;
    await logAuditEvent('FD_UPDATED', 'FixedDeposit', fd.applicationNo, `Updated FD application #${fd.applicationNo}`);
  },

  async deleteDeposit(id: string, applicationNo: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      dataStore.deleteFixedDeposit(id, applicationNo);
      return;
    }
    const { error } = await supabase.from('fixed_deposits').delete().eq('id', id);
    if (error) throw error;
    await logAuditEvent('FD_ARCHIVED', 'FixedDeposit', applicationNo, `Archived FD #${applicationNo}`);
  },
};

/**
 * 5. BONDS & NCDS SERVICE
 */
export const bondService = {
  async getBonds(userRole?: UserRole, subBrokerCode?: string): Promise<Bond[]> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getBonds();
      if (userRole === 'sub_broker' && subBrokerCode) {
        const broker = dataStore.getSubBrokers().find((sb) => sb.subBrokerCode === subBrokerCode || sb.id === 'sb-1');
        return broker ? all.filter((b) => b.subBrokerId === broker.id) : all;
      }
      return all;
    }

    const { data, error } = await supabase
      .from('bonds')
      .select('*, clients(id, full_name), sub_brokers(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      applicationNo: row.application_no,
      isinNo: row.isin_no,
      clientId: row.client_id,
      clientName: row.clients?.full_name || 'Client',
      subBrokerId: row.sub_broker_id || '',
      subBrokerName: row.sub_brokers?.name || 'Direct House Account',
      issuer: row.issuer,
      bondType: row.bond_type,
      faceValuePerUnit: Number(row.face_value_per_unit),
      unitsAllocated: Number(row.units_allocated),
      totalInvestment: Number(row.total_investment),
      couponRatePct: Number(row.coupon_rate_pct),
      annualInterestPayout: Number(row.annual_interest_payout),
      issueDate: row.issue_date,
      maturityDate: row.maturity_date,
      status: row.status,
      commissionExpected: Number(row.commission_expected),
      commissionReceived: Number(row.commission_received),
      subBrokerPayable: Number(row.sub_broker_payable),
      payoutStatus: row.payout_status,
    }));
  },

  async checkDuplicate(applicationNo: string, isinNo?: string, excludeId?: string): Promise<string | null> {
    const bonds = await this.getBonds();
    const cleanApp = applicationNo.trim().toUpperCase();
    const exists = bonds.some((b) => b.applicationNo.toUpperCase() === cleanApp && (!excludeId || b.id !== excludeId));
    if (exists) {
      return `Bond allotment application #${applicationNo} already exists in the system.`;
    }
    return null;
  },

  async createBond(bond: Omit<Bond, 'id'>): Promise<Bond> {
    const dup = await this.checkDuplicate(bond.applicationNo, bond.isinNo);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      const created = dataStore.addBond(bond);
      await logAuditEvent('BOND_ALLOTTED', 'Bond', created.applicationNo, `Allotted ${created.issuer} (${created.bondType}) for ₹${created.totalInvestment.toLocaleString('en-IN')}`);
      return created;
    }

    const { data, error } = await supabase
      .from('bonds')
      .insert({
        application_no: bond.applicationNo.trim().toUpperCase(),
        isin_no: bond.isinNo.trim().toUpperCase(),
        client_id: bond.clientId,
        sub_broker_id: bond.subBrokerId || null,
        issuer: bond.issuer,
        bond_type: bond.bondType,
        face_value_per_unit: bond.faceValuePerUnit,
        units_allocated: bond.unitsAllocated,
        total_investment: bond.totalInvestment,
        coupon_rate_pct: bond.couponRatePct,
        annual_interest_payout: bond.annualInterestPayout,
        issue_date: bond.issueDate,
        maturity_date: bond.maturityDate,
        status: bond.status,
        commission_expected: bond.commissionExpected,
        commission_received: bond.commissionReceived || 0,
        sub_broker_payable: bond.subBrokerPayable,
        payout_status: bond.payoutStatus,
      })
      .select('*, clients(full_name), sub_brokers(name)')
      .single();

    if (error) throw error;
    const created: Bond = {
      ...bond,
      id: data.id,
      clientName: data.clients?.full_name || bond.clientName,
      subBrokerName: data.sub_brokers?.name || bond.subBrokerName,
    };
    await logAuditEvent('BOND_ALLOTTED', 'Bond', created.applicationNo, `Allotted ${created.issuer} bonds for ${created.clientName}`);
    return created;
  },

  async updateBond(bond: Bond): Promise<void> {
    const dup = await this.checkDuplicate(bond.applicationNo, bond.isinNo, bond.id);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      dataStore.updateBond(bond);
      return;
    }

    const { error } = await supabase
      .from('bonds')
      .update({
        application_no: bond.applicationNo.trim().toUpperCase(),
        isin_no: bond.isinNo.trim().toUpperCase(),
        client_id: bond.clientId,
        sub_broker_id: bond.subBrokerId || null,
        issuer: bond.issuer,
        bond_type: bond.bondType,
        face_value_per_unit: bond.faceValuePerUnit,
        units_allocated: bond.unitsAllocated,
        total_investment: bond.totalInvestment,
        coupon_rate_pct: bond.couponRatePct,
        annual_interest_payout: bond.annualInterestPayout,
        issue_date: bond.issueDate,
        maturity_date: bond.maturityDate,
        status: bond.status,
        commission_expected: bond.commissionExpected,
        sub_broker_payable: bond.subBrokerPayable,
      })
      .eq('id', bond.id);

    if (error) throw error;
    await logAuditEvent('BOND_UPDATED', 'Bond', bond.applicationNo, `Updated bond allotment #${bond.applicationNo}`);
  },

  async deleteBond(id: string, applicationNo: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      dataStore.deleteBond(id, applicationNo);
      return;
    }
    const { error } = await supabase.from('bonds').delete().eq('id', id);
    if (error) throw error;
    await logAuditEvent('BOND_ARCHIVED', 'Bond', applicationNo, `Archived bond #${applicationNo}`);
  },
};

/**
 * 6. LOANS & MORTGAGES SERVICE
 */
export const loanService = {
  async getLoans(userRole?: UserRole, subBrokerCode?: string): Promise<LoanApplication[]> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getLoans();
      if (userRole === 'sub_broker' && subBrokerCode) {
        const broker = dataStore.getSubBrokers().find((sb) => sb.subBrokerCode === subBrokerCode || sb.id === 'sb-1');
        return broker ? all.filter((l) => l.subBrokerId === broker.id) : all;
      }
      return all;
    }

    const { data, error } = await supabase
      .from('loans')
      .select('*, clients(id, full_name), sub_brokers(id, name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      applicationNo: row.application_no,
      clientId: row.client_id,
      clientName: row.clients?.full_name || 'Client',
      subBrokerId: row.sub_broker_id || '',
      subBrokerName: row.sub_brokers?.name || 'Direct House Account',
      lender: row.lender,
      loanType: row.loan_type,
      requestedAmount: Number(row.requested_amount),
      sanctionedAmount: Number(row.sanctioned_amount),
      disbursedAmount: Number(row.disbursed_amount),
      roiPct: Number(row.roi_pct),
      stage: row.stage,
      submissionDate: row.submission_date,
      disbursementDate: row.disbursement_date,
      expectedPayout: Number(row.expected_payout),
      receivedPayout: Number(row.received_payout),
      subBrokerPayout: Number(row.sub_broker_payout),
      payoutStatus: row.payout_status,
    }));
  },

  async checkDuplicate(applicationNo: string, excludeId?: string): Promise<string | null> {
    const loans = await this.getLoans();
    const cleanApp = applicationNo.trim().toUpperCase();
    const exists = loans.some((l) => l.applicationNo.toUpperCase() === cleanApp && (!excludeId || l.id !== excludeId));
    if (exists) {
      return `Loan application #${applicationNo} already exists in the system.`;
    }
    return null;
  },

  async createLoan(loan: Omit<LoanApplication, 'id'>): Promise<LoanApplication> {
    const dup = await this.checkDuplicate(loan.applicationNo);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      const created = dataStore.addLoan(loan);
      await logAuditEvent('LOAN_SUBMITTED', 'LoanApplication', created.applicationNo, `Logged loan application with ${created.lender} for ${created.clientName} (₹${created.requestedAmount.toLocaleString('en-IN')})`);
      return created;
    }

    const { data, error } = await supabase
      .from('loans')
      .insert({
        application_no: loan.applicationNo.trim().toUpperCase(),
        client_id: loan.clientId,
        sub_broker_id: loan.subBrokerId || null,
        lender: loan.lender,
        loan_type: loan.loanType,
        requested_amount: loan.requestedAmount,
        sanctioned_amount: loan.sanctionedAmount || 0,
        disbursed_amount: loan.disbursedAmount || 0,
        roi_pct: loan.roiPct,
        stage: loan.stage,
        submission_date: loan.submissionDate,
        disbursement_date: loan.disbursementDate || null,
        expected_payout: loan.expectedPayout,
        received_payout: loan.receivedPayout || 0,
        sub_broker_payout: loan.subBrokerPayout,
        payout_status: loan.payoutStatus,
      })
      .select('*, clients(full_name), sub_brokers(name)')
      .single();

    if (error) throw error;
    const created: LoanApplication = {
      ...loan,
      id: data.id,
      clientName: data.clients?.full_name || loan.clientName,
      subBrokerName: data.sub_brokers?.name || loan.subBrokerName,
    };
    await logAuditEvent('LOAN_SUBMITTED', 'LoanApplication', created.applicationNo, `Logged loan with ${created.lender} for ${created.clientName}`);
    return created;
  },

  async updateLoan(loan: LoanApplication): Promise<void> {
    const dup = await this.checkDuplicate(loan.applicationNo, loan.id);
    if (dup) throw new Error(dup);

    if (!isSupabaseConfigured()) {
      dataStore.updateLoan(loan);
      return;
    }

    const { error } = await supabase
      .from('loans')
      .update({
        application_no: loan.applicationNo.trim().toUpperCase(),
        client_id: loan.clientId,
        sub_broker_id: loan.subBrokerId || null,
        lender: loan.lender,
        loan_type: loan.loanType,
        requested_amount: loan.requestedAmount,
        sanctioned_amount: loan.sanctionedAmount,
        disbursed_amount: loan.disbursedAmount,
        roi_pct: loan.roiPct,
        stage: loan.stage,
        disbursement_date: loan.disbursementDate || null,
        expected_payout: loan.expectedPayout,
        sub_broker_payout: loan.subBrokerPayout,
      })
      .eq('id', loan.id);

    if (error) throw error;
    await logAuditEvent('LOAN_UPDATED', 'LoanApplication', loan.applicationNo, `Updated loan #${loan.applicationNo} to stage ${loan.stage}`);
  },

  async deleteLoan(id: string, applicationNo: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      dataStore.deleteLoan(id, applicationNo);
      return;
    }
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) throw error;
    await logAuditEvent('LOAN_ARCHIVED', 'LoanApplication', applicationNo, `Archived loan #${applicationNo}`);
  },
};

/**
 * 7. PROVIDERS SERVICE
 */
export interface FinancialProvider {
  id: string;
  code: string;
  name: string;
  category: string;
  regulatoryLicenseNo?: string;
  headquarters?: string;
  supportEmail?: string;
  supportPhone?: string;
  isActive: boolean;
}

export const providerService = {
  async getProviders(category?: string): Promise<FinancialProvider[]> {
    if (!isSupabaseConfigured()) {
      return [
        { id: 'pr-1', code: 'STAR-HLT', name: 'Star Health & Allied Insurance', category: 'Health Insurance', regulatoryLicenseNo: 'IRDAI/NL-06/2006', headquarters: 'Chennai, TN', supportEmail: 'support@starhealth.in', supportPhone: '1800-425-2255', isActive: true },
        { id: 'pr-2', code: 'HDFC-ERGO', name: 'HDFC ERGO General Insurance', category: 'Health Insurance', regulatoryLicenseNo: 'IRDAI/NL-146/2002', headquarters: 'Mumbai, MH', supportEmail: 'care@hdfcergo.com', supportPhone: '022-62346234', isActive: true },
        { id: 'pr-3', code: 'ICICI-LOMB', name: 'ICICI Lombard General Insurance', category: 'Motor Insurance', regulatoryLicenseNo: 'IRDAI/NL-115/2001', headquarters: 'Mumbai, MH', supportEmail: 'customersupport@icicilombard.com', supportPhone: '1800-2666', isActive: true },
        { id: 'pr-4', code: 'BAJAJ-ALL', name: 'Bajaj Allianz General Insurance', category: 'Motor Insurance', regulatoryLicenseNo: 'IRDAI/NL-113/2001', headquarters: 'Pune, MH', supportEmail: 'customercare@bajajallianz.co.in', supportPhone: '1800-209-5858', isActive: true },
        { id: 'pr-5', code: 'LIC-IND', name: 'Life Insurance Corporation of India', category: 'Life Insurance', regulatoryLicenseNo: 'IRDAI/001/1956', headquarters: 'Mumbai, MH', supportEmail: 'co_crmservices@licindia.com', supportPhone: '022-68276827', isActive: true },
        { id: 'pr-6', code: 'TATA-AIA', name: 'Tata AIA Life Insurance', category: 'Life Insurance', regulatoryLicenseNo: 'IRDAI/110/2001', headquarters: 'Mumbai, MH', supportEmail: 'customercare@tataaia.com', supportPhone: '1860-266-9966', isActive: true },
        { id: 'pr-7', code: 'BAJAJ-FIN', name: 'Bajaj Finance Ltd', category: 'Fixed Deposits', regulatoryLicenseNo: 'RBI/NBFC/BFL-1987', headquarters: 'Pune, MH', supportEmail: 'wecare@bajajfinserv.in', supportPhone: '020-71576403', isActive: true },
        { id: 'pr-8', code: 'SHRIRAM-FIN', name: 'Shriram Finance Ltd', category: 'Fixed Deposits', regulatoryLicenseNo: 'RBI/NBFC/SFL-1979', headquarters: 'Chennai, TN', supportEmail: 'support@shriramfinance.in', supportPhone: '1800-103-4959', isActive: true },
        { id: 'pr-9', code: 'REC-54EC', name: 'REC Limited (54EC Capital Gains)', category: 'Bonds', regulatoryLicenseNo: 'SEBI/BND/REC-01', headquarters: 'New Delhi, DL', supportEmail: 'investorcell@recl.in', supportPhone: '011-43691400', isActive: true },
        { id: 'pr-10', code: 'HDFC-BANK-LN', name: 'HDFC Bank Ltd (Retail Lending)', category: 'Loans', regulatoryLicenseNo: 'RBI/BNK/HDFC-01', headquarters: 'Mumbai, MH', supportEmail: 'loansupport@hdfcbank.com', supportPhone: '1800-202-6161', isActive: true },
      ].filter((p) => !category || p.category === category);
    }

    try {
      let query = supabase.from('providers').select('*').order('name');
      if (category) {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        category: row.category,
        regulatoryLicenseNo: row.regulatory_license_no,
        headquarters: row.headquarters,
        supportEmail: row.support_email,
        supportPhone: row.support_phone,
        isActive: row.is_active,
      }));
    } catch (err) {
      console.warn('Fallback to local providers:', err);
      return [
        { id: 'pr-1', code: 'STAR-HLT', name: 'Star Health & Allied Insurance', category: 'Health Insurance', regulatoryLicenseNo: 'IRDAI/NL-06/2006', headquarters: 'Chennai, TN', supportEmail: 'support@starhealth.in', supportPhone: '1800-425-2255', isActive: true },
        { id: 'pr-2', code: 'HDFC-ERGO', name: 'HDFC ERGO General Insurance', category: 'Health Insurance', regulatoryLicenseNo: 'IRDAI/NL-146/2002', headquarters: 'Mumbai, MH', supportEmail: 'care@hdfcergo.com', supportPhone: '022-62346234', isActive: true },
        { id: 'pr-3', code: 'ICICI-LOMB', name: 'ICICI Lombard General Insurance', category: 'Motor Insurance', regulatoryLicenseNo: 'IRDAI/NL-115/2001', headquarters: 'Mumbai, MH', supportEmail: 'customersupport@icicilombard.com', supportPhone: '1800-2666', isActive: true },
        { id: 'pr-4', code: 'BAJAJ-ALL', name: 'Bajaj Allianz General Insurance', category: 'Motor Insurance', regulatoryLicenseNo: 'IRDAI/NL-113/2001', headquarters: 'Pune, MH', supportEmail: 'customercare@bajajallianz.co.in', supportPhone: '1800-209-5858', isActive: true },
        { id: 'pr-5', code: 'LIC-IND', name: 'Life Insurance Corporation of India', category: 'Life Insurance', regulatoryLicenseNo: 'IRDAI/001/1956', headquarters: 'Mumbai, MH', supportEmail: 'co_crmservices@licindia.com', supportPhone: '022-68276827', isActive: true },
        { id: 'pr-6', code: 'TATA-AIA', name: 'Tata AIA Life Insurance', category: 'Life Insurance', regulatoryLicenseNo: 'IRDAI/110/2001', headquarters: 'Mumbai, MH', supportEmail: 'customercare@tataaia.com', supportPhone: '1860-266-9966', isActive: true },
        { id: 'pr-7', code: 'BAJAJ-FIN', name: 'Bajaj Finance Ltd', category: 'Fixed Deposits', regulatoryLicenseNo: 'RBI/NBFC/BFL-1987', headquarters: 'Pune, MH', supportEmail: 'wecare@bajajfinserv.in', supportPhone: '020-71576403', isActive: true },
        { id: 'pr-8', code: 'SHRIRAM-FIN', name: 'Shriram Finance Ltd', category: 'Fixed Deposits', regulatoryLicenseNo: 'RBI/NBFC/SFL-1979', headquarters: 'Chennai, TN', supportEmail: 'support@shriramfinance.in', supportPhone: '1800-103-4959', isActive: true },
        { id: 'pr-9', code: 'REC-54EC', name: 'REC Limited (54EC Capital Gains)', category: 'Bonds', regulatoryLicenseNo: 'SEBI/BND/REC-01', headquarters: 'New Delhi, DL', supportEmail: 'investorcell@recl.in', supportPhone: '011-43691400', isActive: true },
        { id: 'pr-10', code: 'HDFC-BANK-LN', name: 'HDFC Bank Ltd (Retail Lending)', category: 'Loans', regulatoryLicenseNo: 'RBI/BNK/HDFC-01', headquarters: 'Mumbai, MH', supportEmail: 'loansupport@hdfcbank.com', supportPhone: '1800-202-6161', isActive: true },
      ].filter((p) => !category || p.category === category);
    }
  },
};

/**
 * 8. TARGETS SERVICE
 */
export const targetService = {
  async getTargets(): Promise<BusinessTarget[]> {
    if (!isSupabaseConfigured()) {
      return dataStore.getTargets();
    }
    try {
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        return dataStore.getTargets();
      }
      return data.map((row: any) => ({
        id: row.id,
        entityName: row.entity_name,
        entityType: row.entity_type,
        productCategory: row.product_category,
        month: row.month,
        year: Number(row.year),
        targetAmount: Number(row.target_amount),
        achievedAmount: Number(row.achieved_amount),
        status: row.status,
      }));
    } catch (err) {
      console.warn('Fallback to local targets:', err);
      return dataStore.getTargets();
    }
  },

  async createTarget(target: Omit<BusinessTarget, 'id'>): Promise<BusinessTarget> {
    if (!isSupabaseConfigured()) {
      const created = dataStore.addTarget(target);
      await logAuditEvent('TARGET_CONFIGURED', 'BusinessTarget', created.id, `Created sales target for ${created.entityName} (${created.productCategory} - ₹${created.targetAmount.toLocaleString('en-IN')})`);
      return created;
    }

    const { data, error } = await supabase
      .from('targets')
      .insert({
        entity_name: target.entityName,
        entity_type: target.entityType,
        product_category: target.productCategory,
        month: target.month,
        year: target.year,
        target_amount: target.targetAmount,
        achieved_amount: target.achievedAmount || 0,
        status: target.status || 'on_track',
      })
      .select()
      .single();

    if (error) throw error;
    const created: BusinessTarget = {
      id: data.id,
      entityName: data.entity_name,
      entityType: data.entity_type,
      productCategory: data.product_category,
      month: data.month,
      year: Number(data.year),
      targetAmount: Number(data.target_amount),
      achievedAmount: Number(data.achieved_amount),
      status: data.status,
    };
    await logAuditEvent('TARGET_CONFIGURED', 'BusinessTarget', created.id, `Created sales target for ${created.entityName}`);
    return created;
  },

  async updateTarget(target: BusinessTarget): Promise<void> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getTargets().map((t) => (t.id === target.id ? target : t));
      localStorage.setItem('ifbms_targets', JSON.stringify(all));
      dataStore.notify();
      return;
    }
    const { error } = await supabase
      .from('targets')
      .update({
        entity_name: target.entityName,
        entity_type: target.entityType,
        product_category: target.productCategory,
        month: target.month,
        year: target.year,
        target_amount: target.targetAmount,
        achieved_amount: target.achievedAmount,
        status: target.status,
      })
      .eq('id', target.id);

    if (error) throw error;
    await logAuditEvent('TARGET_UPDATED', 'BusinessTarget', target.id, `Updated sales target for ${target.entityName}`);
  },
};

/**
 * 9. DOCUMENT VAULT SERVICE
 */
export const documentVaultService = {
  async getDocuments(userRole?: UserRole): Promise<DocumentItem[]> {
    if (!isSupabaseConfigured()) {
      return dataStore.getDocuments();
    }
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        return dataStore.getDocuments();
      }
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        documentCategory: row.document_category,
        relatedEntity: row.related_entity,
        entityType: row.entity_type,
        fileUrl: row.file_url || '#',
        fileName: row.file_name,
        fileSize: row.file_size,
        uploadedAt: row.uploaded_at,
        uploadedBy: row.uploaded_by,
        verified: row.verified,
        isPrivate: true,
      }));
    } catch (err) {
      console.warn('Fallback to local documents:', err);
      return dataStore.getDocuments();
    }
  },

  async addDocument(doc: Omit<DocumentItem, 'id' | 'uploadedAt'>): Promise<DocumentItem> {
    if (!isSupabaseConfigured()) {
      const created = dataStore.addDocument(doc);
      await logAuditEvent('DOCUMENT_VAULT_UPLOAD', 'DocumentItem', created.id, `Uploaded ${created.title} for ${created.relatedEntity}`);
      return created;
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: doc.title,
        document_category: doc.documentCategory,
        related_entity: doc.relatedEntity,
        entity_type: doc.entityType,
        file_url: doc.fileUrl,
        file_name: doc.fileName,
        file_size: doc.fileSize,
        uploaded_by: doc.uploadedBy,
        verified: doc.verified || false,
      })
      .select()
      .single();

    if (error) throw error;
    const created: DocumentItem = {
      ...doc,
      id: data.id,
      uploadedAt: data.uploaded_at,
    };
    await logAuditEvent('DOCUMENT_VAULT_UPLOAD', 'DocumentItem', created.id, `Uploaded ${created.title} for ${created.relatedEntity}`);
    return created;
  },

  async deleteDocument(id: string, title?: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      dataStore.deleteDocument(id);
      return;
    }
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    await logAuditEvent('DOCUMENT_VAULT_DELETE', 'DocumentItem', id, `Deleted document ${title || id}`);
  },

  async verifyDocument(id: string, verified: boolean): Promise<void> {
    if (!isSupabaseConfigured()) {
      const all = dataStore.getDocuments().map((d) => (d.id === id ? { ...d, verified } : d));
      localStorage.setItem('ifbms_documents', JSON.stringify(all));
      dataStore.notify();
      return;
    }
    const { error } = await supabase.from('documents').update({ verified }).eq('id', id);
    if (error) throw error;
  },
};

/**
 * 10. IMPORT JOBS SERVICE
 */
export const importJobService = {
  async getImportJobs(): Promise<ImportJob[]> {
    if (!isSupabaseConfigured()) {
      return dataStore.getImportJobs();
    }
    try {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        return dataStore.getImportJobs();
      }
      return data.map((row: any) => ({
        id: row.id,
        jobNo: `JOB-${row.id.slice(0, 8).toUpperCase()}`,
        module: row.module_type,
        fileName: row.file_name,
        fileFormat: row.file_name?.endsWith('.csv') ? 'csv' : 'xlsx',
        totalRows: Number(row.total_rows || 0),
        successCount: Number(row.valid_rows || 0),
        errorCount: Number(row.invalid_rows || 0),
        duplicateCount: 0,
        importedBy: 'System User',
        importedAt: row.created_at,
        status: row.status,
      }));
    } catch (err) {
      console.warn('Fallback to local import jobs:', err);
      return dataStore.getImportJobs();
    }
  },

  async recordImportJob(job: {
    moduleType: string;
    fileName: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    status: string;
    errorLog?: any;
  }): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('import_jobs').insert({
        module_type: job.moduleType,
        file_name: job.fileName,
        total_rows: job.totalRows,
        valid_rows: job.validRows,
        invalid_rows: job.invalidRows,
        status: job.status,
        error_log: job.errorLog || [],
      });
    } catch (err) {
      console.warn('Failed to record Supabase import job:', err);
    }
  },
};


