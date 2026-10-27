import { dataStore } from './mockData';
import { generateChecksum } from './documentService';
import { UserRole } from '../types';

export interface DatabaseBackupPayload {
  version: string;
  systemName: string;
  environment: string;
  timestampIST: string;
  exportedBy: string;
  actorRole: UserRole;
  checksum: string;
  recordCounts: Record<string, number>;
  data: {
    clients: any[];
    subBrokers: any[];
    healthPolicies: any[];
    motorPolicies: any[];
    lifePolicies: any[];
    fixedDeposits: any[];
    bonds: any[];
    loans: any[];
    brokerageRules: any[];
    transactions: any[];
    payouts: any[];
    targets: any[];
    documents: any[];
    tasks: any[];
    importJobs: any[];
    auditLogs: any[];
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredCounts?: Record<string, number>;
  error?: string;
}

/**
 * Creates a verified JSON snapshot backup of the IFBMS database
 */
export function createDatabaseBackup(): {
  backup: DatabaseBackupPayload;
  blob: Blob;
  filename: string;
} {
  const activeUser = dataStore.getActiveUser();
  const now = new Date();
  const timestampIST = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const rawData = {
    clients: dataStore.getClients(),
    subBrokers: dataStore.getSubBrokers(),
    healthPolicies: dataStore.getHealthPolicies(),
    motorPolicies: dataStore.getMotorPolicies(),
    lifePolicies: dataStore.getLifePolicies(),
    fixedDeposits: dataStore.getFixedDeposits(),
    bonds: dataStore.getBonds(),
    loans: dataStore.getLoans(),
    brokerageRules: dataStore.getBrokerageRules(),
    transactions: dataStore.getTransactions(),
    payouts: dataStore.getPayouts(),
    targets: dataStore.getTargets(),
    documents: dataStore.getDocuments(),
    tasks: dataStore.getTasks(),
    importJobs: dataStore.getImportJobs(),
    auditLogs: dataStore.getAuditLogs(),
  };

  const recordCounts: Record<string, number> = {};
  for (const [key, arr] of Object.entries(rawData)) {
    recordCounts[key] = arr.length;
  }

  const payloadWithoutChecksum = {
    version: '2.4.0',
    systemName: 'Investxindia Financial Business Management System (IFBMS)',
    environment: 'production',
    timestampIST,
    exportedBy: activeUser.name,
    actorRole: activeUser.role,
    recordCounts,
    data: rawData,
  };

  const checksum = generateChecksum(JSON.stringify(payloadWithoutChecksum));

  const backup: DatabaseBackupPayload = {
    ...payloadWithoutChecksum,
    checksum,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Investxindia_IFBMS_Full_Backup_${dateStr}.json`;

  dataStore.logAudit(
    'DATABASE_BACKUP_CREATED',
    'SystemDatabase',
    filename,
    `Full database snapshot exported (${Object.values(recordCounts).reduce((a, b) => a + b, 0)} total records, SHA-256 Checksum: ${checksum.slice(0, 16)}...)`
  );

  return { backup, blob, filename };
}

/**
 * Validates and restores database state from an uploaded JSON backup
 */
export function restoreDatabaseBackup(
  backupJson: string,
  requesterRole: UserRole
): RestoreResult {
  if (requesterRole !== 'super_admin') {
    return {
      success: false,
      message: 'Access Denied: Only Super Admin can perform database restore operations.',
      error: 'UNAUTHORIZED_ROLE',
    };
  }

  try {
    const parsed = JSON.parse(backupJson) as DatabaseBackupPayload;

    // Structural validations
    if (!parsed.systemName || !parsed.systemName.includes('Investxindia')) {
      return {
        success: false,
        message: 'Invalid backup file: Not an official Investxindia IFBMS backup archive.',
        error: 'INVALID_HEADER',
      };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return {
        success: false,
        message: 'Corrupted backup file: Missing or invalid "data" container payload.',
        error: 'MISSING_DATA',
      };
    }

    const { data } = parsed;

    // Required entity arrays
    const requiredKeys = [
      'clients',
      'subBrokers',
      'healthPolicies',
      'motorPolicies',
      'lifePolicies',
      'fixedDeposits',
      'bonds',
      'loans',
      'brokerageRules',
      'transactions',
      'payouts',
    ];

    for (const key of requiredKeys) {
      if (!Array.isArray((data as any)[key])) {
        return {
          success: false,
          message: `Corrupted backup archive: collection "${key}" is missing or not an array.`,
          error: `MISSING_COLLECTION_${key.toUpperCase()}`,
        };
      }
    }

    // Restore into localStorage
    localStorage.setItem('ifbms_clients', JSON.stringify(data.clients));
    localStorage.setItem('ifbms_sub_brokers', JSON.stringify(data.subBrokers));
    localStorage.setItem('ifbms_health_policies', JSON.stringify(data.healthPolicies));
    localStorage.setItem('ifbms_motor_policies', JSON.stringify(data.motorPolicies));
    localStorage.setItem('ifbms_life_policies', JSON.stringify(data.lifePolicies));
    localStorage.setItem('ifbms_fixed_deposits', JSON.stringify(data.fixedDeposits));
    localStorage.setItem('ifbms_bonds', JSON.stringify(data.bonds));
    localStorage.setItem('ifbms_loans', JSON.stringify(data.loans));
    localStorage.setItem('ifbms_brokerage_rules', JSON.stringify(data.brokerageRules));
    localStorage.setItem('ifbms_transactions', JSON.stringify(data.transactions));
    localStorage.setItem('ifbms_payouts', JSON.stringify(data.payouts));

    if (Array.isArray(data.targets)) localStorage.setItem('ifbms_targets', JSON.stringify(data.targets));
    if (Array.isArray(data.documents)) localStorage.setItem('ifbms_documents', JSON.stringify(data.documents));
    if (Array.isArray(data.tasks)) localStorage.setItem('ifbms_tasks', JSON.stringify(data.tasks));
    if (Array.isArray(data.importJobs)) localStorage.setItem('ifbms_import_jobs', JSON.stringify(data.importJobs));

    dataStore.notify();

    dataStore.logAudit(
      'DATABASE_RESTORED_FROM_BACKUP',
      'SystemDatabase',
      parsed.checksum?.slice(0, 16) || 'MANUAL_RESTORE',
      `Restored database from archive created on ${parsed.timestampIST || 'Unknown'}. Total records: ${Object.values(parsed.recordCounts || {}).reduce((a, b) => a + b, 0)}`
    );

    return {
      success: true,
      message: `Database successfully restored from backup snapshot (${parsed.timestampIST}).`,
      restoredCounts: parsed.recordCounts,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to restore database: ${err.message}`,
      error: err.message,
    };
  }
}
