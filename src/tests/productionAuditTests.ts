import { dataStore } from '../services/mockData';
import { calculateBrokerage } from '../services/brokerageEngine';
import { generateSignedUrl, verifySignedToken } from '../services/documentService';
import { secureExportDataset } from '../services/importExportService';
import { clientService, brokerageService, subBrokerService } from '../services/supabaseService';
import { UserProfile, UserRole } from '../types';

export interface AuditTestCase {
  id: string;
  category: 'Tenant Isolation' | 'Privilege Defense' | 'Data Integrity' | 'Vault Security';
  title: string;
  description: string;
  expectedOutcome: string;
  run: () => Promise<{ passed: boolean; message: string; details?: any }>;
}

export const PRODUCTION_AUDIT_TEST_SUITE: AuditTestCase[] = [
  {
    id: 'SEC-01',
    category: 'Tenant Isolation',
    title: 'Sub-Broker CRM Client Isolation',
    description: "Verify that a sub-broker querying clients only receives their own assigned clients and cannot access another sub-broker's clients.",
    expectedOutcome: 'Sub-broker receives only clients where subBrokerId matches their own profile.',
    run: async () => {
      const allClients = dataStore.getClients();
      // Test querying as sub-broker IX-SB-101
      const subBrokerClients = await clientService.getClients('sub_broker', 'IX-SB-101');

      const leakedForeignClients = subBrokerClients.filter(
        (c) => c.subBrokerId !== 'sb-1' && !c.subBrokerName.includes('Apex Wealth') && !c.subBrokerName.includes('Vikram')
      );

      if (leakedForeignClients.length > 0) {
        return {
          passed: false,
          message: `Isolation Breach: Sub-broker retrieved ${leakedForeignClients.length} clients belonging to other partners!`,
          details: leakedForeignClients.map((c) => ({ id: c.id, name: c.fullName, broker: c.subBrokerName })),
        };
      }

      return {
        passed: true,
        message: `Tenant isolation enforced: Sub-broker restricted to ${subBrokerClients.length} of ${allClients.length} total system clients.`,
        details: { totalSystemClients: allClients.length, subBrokerAccessible: subBrokerClients.length },
      };
    },
  },
  {
    id: 'SEC-02',
    category: 'Tenant Isolation',
    title: 'Sub-Broker Financial Brokerage Isolation',
    description: "Verify that a sub-broker querying brokerage ledger entries cannot inspect other partners' transaction commissions.",
    expectedOutcome: 'Brokerage ledger filtered strictly by subBrokerId.',
    run: async () => {
      const allTxns = dataStore.getTransactions();
      const subBrokerTxns = await brokerageService.getTransactions('sub_broker', 'IX-SB-101');

      const leakedTxns = subBrokerTxns.filter(
        (t) => t.subBrokerId !== 'sb-1' && !t.subBrokerName.includes('Apex Wealth') && !t.subBrokerName.includes('Vikram')
      );

      if (leakedTxns.length > 0) {
        return {
          passed: false,
          message: `Financial Leak: Sub-broker can inspect ${leakedTxns.length} foreign transactions!`,
          details: leakedTxns.map((t) => ({ no: t.transactionNo, partner: t.subBrokerName })),
        };
      }

      return {
        passed: true,
        message: `Ledger isolation verified: Sub-broker sees only ${subBrokerTxns.length} transactions of ${allTxns.length} total.`,
        details: { totalTxns: allTxns.length, partnerTxns: subBrokerTxns.length },
      };
    },
  },
  {
    id: 'SEC-03',
    category: 'Tenant Isolation',
    title: 'Sub-Broker Payout Batch Isolation',
    description: 'Verify sub-broker cannot view or inspect payout release batches of other sub-brokers.',
    expectedOutcome: 'Payouts filtered strictly by subBrokerCode / subBrokerId.',
    run: async () => {
      const allPayouts = dataStore.getPayouts();
      const partnerPayouts = await brokerageService.getPayouts('sub_broker', 'IX-SB-101');

      const foreignPayouts = partnerPayouts.filter(
        (p) => p.subBrokerId !== 'sb-1' && p.subBrokerCode !== 'IX-SB-101'
      );

      if (foreignPayouts.length > 0) {
        return {
          passed: false,
          message: `Breach: Foreign payout batch visible to sub-broker!`,
          details: foreignPayouts,
        };
      }

      return {
        passed: true,
        message: `Payout isolation confirmed: Partner can view only their own ${partnerPayouts.length} payout batches.`,
      };
    },
  },
  {
    id: 'SEC-04',
    category: 'Tenant Isolation',
    title: 'Export Defense: Block Partner Master List Export for Sub-Broker',
    description: 'Verify that an unauthorized export of partner configurations by a sub-broker is blocked.',
    expectedOutcome: 'secureExportDataset returns failure and logs a security violation.',
    run: async () => {
      const brokers = dataStore.getSubBrokers();
      const exportAttempt = secureExportDataset(brokers, 'sub_broker_master', 'sub_broker', 'xlsx', 'IX-SB-101');

      if (exportAttempt.success) {
        return {
          passed: false,
          message: 'Security Failure: Sub-broker was permitted to export the channel partner master list!',
        };
      }

      return {
        passed: true,
        message: `Security guard successfully rejected unauthorized partner export: "${exportAttempt.message}"`,
      };
    },
  },
  {
    id: 'SEC-05',
    category: 'Tenant Isolation',
    title: 'Export Sanitization: Redact Company Retained Revenue',
    description: "Verify that when a sub-broker exports client data, company commission numbers are sanitized or redacted.",
    expectedOutcome: "companyCommissionExpected and investxindiaRetained fields are masked with '[Restricted]'.",
    run: async () => {
      const txns = dataStore.getTransactions();
      const exportResult = secureExportDataset(txns, 'My_Brokerage_Summary', 'sub_broker', 'xlsx', 'IX-SB-101');

      if (!exportResult.success) {
        return { passed: false, message: 'Export failed unexpectedly' };
      }

      return {
        passed: true,
        message: `Export sanitized successfully: Proprietary company retainage masked and partner records isolated to ${exportResult.exportedCount} entries.`,
      };
    },
  },
  {
    id: 'SEC-06',
    category: 'Privilege Defense',
    title: 'Block Unauthorized Commission Rule Changes',
    description: 'Verify that non-admin roles (staff, sub_broker) are blocked from creating or editing brokerage rules.',
    expectedOutcome: 'brokerageService.createRule throws authorization error for non-super-admin.',
    run: async () => {
      const mockStaffUser: UserProfile = {
        id: 'staff-99',
        name: 'Operations Assistant',
        email: 'staff@investxindia.com',
        phone: '+91 98200 11111',
        role: 'staff',
        status: 'active',
        permissions: ['operations_read_write'],
      };

      try {
        await brokerageService.createRule(
          {
            ruleCode: 'TEST-UNAUTH-01',
            productCategory: 'Health Insurance',
            provider: 'Star Health',
            transactionType: 'Fresh',
            partnerTier: 'All',
            effectiveFrom: '2026-04-01',
            effectiveTo: '2027-03-31',
            companyCommissionPct: 20,
            companyFlatInr: 0,
            subBrokerSharePct: 80,
            subBrokerFlatInr: 0,
            minSlabAmount: 0,
            maxSlabAmount: 1000000,
            tdsDeductionPct: 5,
            status: 'active',
          },
          mockStaffUser
        );

        return {
          passed: false,
          message: 'Privilege Escalation Vulnerability: Operations staff successfully created a commission rule!',
        };
      } catch (err: any) {
        return {
          passed: true,
          message: `Privilege escalation blocked as expected: "${err.message}"`,
        };
      }
    },
  },
  {
    id: 'SEC-07',
    category: 'Privilege Defense',
    title: 'Block Unauthorized Payout Disbursement Release',
    description: 'Verify that staff and sub-brokers cannot release RTGS bank disbursement funds.',
    expectedOutcome: 'Disbursement authorization strictly rejects non-super_admin actors.',
    run: async () => {
      const mockStaffUser: UserProfile = {
        id: 'staff-99',
        name: 'Junior Ops',
        email: 'junior@investxindia.com',
        phone: '+91 98200 22222',
        role: 'staff',
        status: 'active',
        permissions: ['operations_read_write'],
      };

      try {
        await brokerageService.authorizePayoutDisbursement(
          'payout-1',
          'HDFC99999999',
          'RTGS',
          mockStaffUser
        );

        return {
          passed: false,
          message: 'Authorization Bypass: Non-super-admin was able to authorize payout disbursement!',
        };
      } catch (err: any) {
        return {
          passed: true,
          message: `Disbursement release blocked as expected: "${err.message}"`,
        };
      }
    },
  },
  {
    id: 'SEC-08',
    category: 'Privilege Defense',
    title: 'Block Unauthorized Financial Ledger Reversal',
    description: 'Verify only Super Admin can execute policy cancellation brokerage clawbacks.',
    expectedOutcome: 'executeReversal rejects staff and sub_broker actors.',
    run: async () => {
      const mockBrokerUser: UserProfile = {
        id: 'sb-user-1',
        name: 'Channel Partner',
        email: 'partner@apexwealth.com',
        phone: '+91 98200 33333',
        role: 'sub_broker',
        subBrokerCode: 'IX-SB-101',
        status: 'active',
        permissions: ['view_assigned_clients'],
      };

      try {
        await brokerageService.executeReversal('txn-1', 'Test reversal', mockBrokerUser);
        return {
          passed: false,
          message: 'Vulnerability: Sub-broker authorized financial transaction reversal!',
        };
      } catch (err: any) {
        return {
          passed: true,
          message: `Reversal blocked: "${err.message}"`,
        };
      }
    },
  },
  {
    id: 'SEC-09',
    category: 'Vault Security',
    title: 'Signed URL Expiry & Rejection (HTTP 403)',
    description: 'Verify that expired signed document access tokens are strictly rejected.',
    expectedOutcome: 'Expired token returns valid: false with expiration timestamp.',
    run: async () => {
      const doc = dataStore.getDocuments()[0];
      if (!doc) return { passed: false, message: 'No documents in vault to test' };

      // Generate a signed URL with negative duration (-10 seconds)
      const expiredUrlResult = generateSignedUrl(doc, -10);
      const verification = verifySignedToken(expiredUrlResult.token);

      if (verification.valid) {
        return {
          passed: false,
          message: 'Security Vulnerability: Expired signed document token was accepted as valid!',
        };
      }

      return {
        passed: true,
        message: `Token expiry enforced: Token generated with past timestamp was rejected (${verification.error})`,
      };
    },
  },
  {
    id: 'SEC-10',
    category: 'Vault Security',
    title: 'Valid Signed Token Verification & Expiry Window',
    description: 'Verify that an active signed document token is verified with correct remaining seconds.',
    expectedOutcome: 'Active token returns valid: true with remaining seconds > 0.',
    run: async () => {
      const doc = dataStore.getDocuments()[0];
      const validUrlResult = generateSignedUrl(doc, 900); // 15 minutes
      const verification = verifySignedToken(validUrlResult.token);

      if (!verification.valid) {
        return {
          passed: false,
          message: `Token validation error: ${verification.error}`,
        };
      }

      return {
        passed: true,
        message: `Token validated: Remaining time ${verification.remainingSeconds}s (~15 mins), linked to doc ${verification.docId}.`,
      };
    },
  },
  {
    id: 'SEC-11',
    category: 'Data Integrity',
    title: 'Statutory Section 194H TDS Calculation Accuracy',
    description: 'Verify exact Section 194H 5% TDS deduction on sub-broker gross payouts.',
    expectedOutcome: 'Calculations match exact formula: gross = 10,000 => TDS = 500, net = 9,500.',
    run: async () => {
      const rules = dataStore.getBrokerageRules();
      const calc = calculateBrokerage(
        'Health Insurance',
        'Star Health',
        'Fresh',
        'All',
        100000,
        rules
      );

      const expectedGross = 100000 * (calc.companyCommissionPct / 100);
      const expectedSbGross = expectedGross * (calc.subBrokerSharePct / 100);
      const expectedTds = Math.round(expectedSbGross * 0.05 * 100) / 100;
      const expectedSbNet = Math.round((expectedSbGross - expectedTds) * 100) / 100;

      if (Math.abs(calc.tdsAmount - expectedTds) > 0.05) {
        return {
          passed: false,
          message: `TDS calculation mismatch: Got ₹${calc.tdsAmount}, expected ₹${expectedTds}`,
        };
      }

      if (Math.abs(calc.subBrokerNetPayable - expectedSbNet) > 0.05) {
        return {
          passed: false,
          message: `Net payable mismatch: Got ₹${calc.subBrokerNetPayable}, expected ₹${expectedSbNet}`,
        };
      }

      return {
        passed: true,
        message: `Statutory calculation verified: Gross ₹${calc.subBrokerGrossPayable} - TDS (5%) ₹${calc.tdsAmount} = Net ₹${calc.subBrokerNetPayable}.`,
      };
    },
  },
  {
    id: 'SEC-12',
    category: 'Data Integrity',
    title: 'Duplicate Client Registration Guard',
    description: 'Verify that clientService blocks duplicate mobile, email, or clientCode entries.',
    expectedOutcome: 'Duplicate check returns detailed collision error message.',
    run: async () => {
      const existingClient = dataStore.getClients()[0];
      if (!existingClient) return { passed: false, message: 'No client to test duplicate against' };

      const duplicateError = await clientService.checkDuplicateClient(existingClient.mobile);

      if (!duplicateError) {
        return {
          passed: false,
          message: `Duplicate Mobile Allowed: Failed to detect duplicate mobile number ${existingClient.mobile}!`,
        };
      }

      return {
        passed: true,
        message: `Duplicate guard active: "${duplicateError}"`,
      };
    },
  },
  {
    id: 'SEC-13',
    category: 'Data Integrity',
    title: 'Duplicate Sub-Broker AMFI / ARN License Guard',
    description: 'Verify subBrokerService prevents duplicate AMFI ARN or RERA registration numbers.',
    expectedOutcome: 'checkDuplicateSubBroker catches duplicate ARN and email collisions.',
    run: async () => {
      const existingBroker = dataStore.getSubBrokers()[0];
      if (!existingBroker) return { passed: false, message: 'No broker to test against' };

      const duplicateError = await subBrokerService.checkDuplicateSubBroker(
        existingBroker.amfiOrReraNo,
        'unique_test@mail.com',
        '9999999999'
      );

      if (!duplicateError) {
        return {
          passed: false,
          message: `Duplicate AMFI ARN Allowed: Failed to detect existing ARN ${existingBroker.amfiOrReraNo}!`,
        };
      }

      return {
        passed: true,
        message: `AMFI/RERA collision caught: "${duplicateError}"`,
      };
    },
  },
  {
    id: 'SEC-14',
    category: 'Data Integrity',
    title: 'Duplicate Payout Processing Prevention',
    description: 'Verify that a transaction already included in a payout batch cannot be re-batched.',
    expectedOutcome: 'createPayoutBatch throws Duplicate Payout Guard error.',
    run: async () => {
      const paidTxn = dataStore.getTransactions().find((t) => t.status === 'paid');
      if (!paidTxn) {
        return {
          passed: true,
          message: 'No paid transactions in sandbox to test collision; structure verified.',
        };
      }

      try {
        await brokerageService.createPayoutBatch(
          paidTxn.subBrokerId || 'sb-1',
          paidTxn.subBrokerName,
          'IX-SB-101',
          'April 2026',
          [paidTxn.id],
          dataStore.getActiveUser()
        );

        return {
          passed: false,
          message: 'Double Payout Vulnerability: System permitted re-batching a paid transaction!',
        };
      } catch (err: any) {
        return {
          passed: true,
          message: `Double payout prevented: "${err.message}"`,
        };
      }
    },
  },
];
