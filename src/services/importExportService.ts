import * as XLSX from 'xlsx';
import { UserRole } from '../types';
import { dataStore } from './mockData';
import { importJobService } from './supabaseService';

export interface ColumnDefinition {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'pan' | 'mobile' | 'email';
  synonyms: string[];
  example: string | number;
}

export interface ValidationIssue {
  row: number;
  field: string;
  message: string;
  rejectedValue?: any;
  type: 'error' | 'warning';
}

export interface ParsedBatchResult<T = any> {
  module: string;
  totalRows: number;
  validRows: T[];
  invalidRows: { rowNumber: number; rowData: any; issues: ValidationIssue[] }[];
  duplicateCount: number;
  headers: string[];
  columnMapping: Record<string, string>; // fileHeader -> schemaKey
}

export interface ImportExecutionResult {
  jobNo: string;
  module: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  status: 'completed' | 'completed_with_errors' | 'failed';
}

// Module Schema Definitions
export const MODULE_SCHEMAS: Record<string, { label: string; primaryKey: string; columns: ColumnDefinition[] }> = {
  'Health Insurance': {
    label: 'Health Insurance',
    primaryKey: 'policyNo',
    columns: [
      { key: 'policyNo', label: 'Policy Number', required: true, type: 'string', synonyms: ['policy_number', 'policyno', 'policy no', 'policy_no'], example: 'HI-2026-STAR-0912' },
      { key: 'clientName', label: 'Client Name', required: true, type: 'string', synonyms: ['client_name', 'clientname', 'customer_name', 'proposer_name'], example: 'Rajesh Sharma' },
      { key: 'clientMobile', label: 'Client Mobile', required: true, type: 'mobile', synonyms: ['client_mobile', 'mobile', 'mobile_number', 'phone'], example: '9820112345' },
      { key: 'subBrokerCode', label: 'Sub-Broker Code', required: true, type: 'string', synonyms: ['sub_broker_code', 'partner_code', 'sb_code', 'agent_code'], example: 'IX-SB-101' },
      { key: 'insurer', label: 'Insurer', required: true, type: 'string', synonyms: ['insurer', 'insurance_company', 'provider'], example: 'Star Health' },
      { key: 'planName', label: 'Plan Name', required: true, type: 'string', synonyms: ['plan_name', 'product_name', 'scheme'], example: 'Optima Secure Family' },
      { key: 'sumInsured', label: 'Sum Insured (₹)', required: true, type: 'number', synonyms: ['sum_insured', 'suminsured', 'cover_amount'], example: 1500000 },
      { key: 'annualPremium', label: 'Annual Premium (₹)', required: true, type: 'number', synonyms: ['annual_premium', 'premium', 'gross_premium', 'net_premium'], example: 28500 },
      { key: 'policyStartDate', label: 'Policy Start Date', required: true, type: 'date', synonyms: ['policy_start_date', 'start_date', 'commencement_date'], example: '2026-05-10' },
      { key: 'renewalDueDate', label: 'Renewal Due Date', required: true, type: 'date', synonyms: ['renewal_due_date', 'expiry_date', 'renewal_date'], example: '2027-05-09' },
      { key: 'paymentMode', label: 'Payment Mode', required: false, type: 'string', synonyms: ['payment_mode', 'mode', 'frequency'], example: 'Annual' },
    ],
  },
  'Motor Insurance': {
    label: 'Motor Insurance',
    primaryKey: 'policyNo',
    columns: [
      { key: 'policyNo', label: 'Policy Number', required: true, type: 'string', synonyms: ['policy_number', 'policyno', 'policy no'], example: 'MOT-ICICI-9921' },
      { key: 'vehicleNo', label: 'Vehicle Number', required: true, type: 'string', synonyms: ['vehicle_number', 'vehicleno', 'reg_no', 'registration_number'], example: 'MH02-CW-9128' },
      { key: 'vehicleMakeModel', label: 'Make & Model', required: true, type: 'string', synonyms: ['vehicle_make_model', 'make_model', 'model'], example: 'Hyundai Creta SX 1.5' },
      { key: 'policyType', label: 'Policy Type', required: true, type: 'string', synonyms: ['policy_type', 'cover_type', 'insurance_type'], example: 'Comprehensive' },
      { key: 'clientName', label: 'Client Name', required: true, type: 'string', synonyms: ['client_name', 'customer_name'], example: 'Vikram Mehta' },
      { key: 'clientMobile', label: 'Client Mobile', required: true, type: 'mobile', synonyms: ['client_mobile', 'mobile_number', 'mobile'], example: '9820445566' },
      { key: 'subBrokerCode', label: 'Sub-Broker Code', required: true, type: 'string', synonyms: ['sub_broker_code', 'partner_code', 'sb_code'], example: 'IX-SB-101' },
      { key: 'insurer', label: 'Insurer', required: true, type: 'string', synonyms: ['insurer', 'insurance_company'], example: 'ICICI Lombard' },
      { key: 'idvAmount', label: 'IDV Amount (₹)', required: true, type: 'number', synonyms: ['idv_amount', 'idv', 'insured_declared_value'], example: 1250000 },
      { key: 'netPremium', label: 'Net Premium (₹)', required: false, type: 'number', synonyms: ['net_premium', 'od_premium'], example: 18200 },
      { key: 'grossPremium', label: 'Gross Premium (₹)', required: true, type: 'number', synonyms: ['gross_premium', 'total_premium', 'premium'], example: 21476 },
      { key: 'policyStartDate', label: 'Policy Start Date', required: true, type: 'date', synonyms: ['policy_start_date', 'start_date'], example: '2026-04-15' },
      { key: 'policyExpiryDate', label: 'Policy Expiry Date', required: true, type: 'date', synonyms: ['policy_expiry_date', 'expiry_date', 'end_date'], example: '2027-04-14' },
    ],
  },
  'Life Insurance': {
    label: 'Life Insurance',
    primaryKey: 'policyNo',
    columns: [
      { key: 'policyNo', label: 'Policy Number', required: true, type: 'string', synonyms: ['policy_number', 'policyno'], example: 'LI-LIC-88210' },
      { key: 'clientName', label: 'Client Name', required: true, type: 'string', synonyms: ['client_name', 'customer_name', 'life_assured'], example: 'Ajay K. Singhania' },
      { key: 'clientMobile', label: 'Client Mobile', required: true, type: 'mobile', synonyms: ['client_mobile', 'mobile_number'], example: '9820991122' },
      { key: 'subBrokerCode', label: 'Sub-Broker Code', required: true, type: 'string', synonyms: ['sub_broker_code', 'sb_code'], example: 'IX-SB-101' },
      { key: 'insurer', label: 'Insurer', required: true, type: 'string', synonyms: ['insurer', 'company'], example: 'LIC of India' },
      { key: 'planType', label: 'Plan Type', required: true, type: 'string', synonyms: ['plan_type', 'type'], example: 'Term Plan' },
      { key: 'planName', label: 'Plan Name', required: true, type: 'string', synonyms: ['plan_name', 'product'], example: 'Tech Term Plan' },
      { key: 'sumAssured', label: 'Sum Assured (₹)', required: true, type: 'number', synonyms: ['sum_assured', 'suminsured', 'life_cover'], example: 20000000 },
      { key: 'policyTermYears', label: 'Policy Term (Years)', required: true, type: 'number', synonyms: ['policy_term_years', 'term_years', 'tenure'], example: 35 },
      { key: 'premiumPaymentTerm', label: 'PPT (Years)', required: true, type: 'number', synonyms: ['premium_payment_term', 'ppt'], example: 35 },
      { key: 'annualPremium', label: 'Annual Premium (₹)', required: true, type: 'number', synonyms: ['annual_premium', 'premium'], example: 42000 },
      { key: 'policyDate', label: 'Policy Date', required: true, type: 'date', synonyms: ['policy_date', 'doc', 'start_date'], example: '2026-03-20' },
      { key: 'nextPremiumDate', label: 'Next Premium Date', required: true, type: 'date', synonyms: ['next_premium_date', 'renewal_date'], example: '2027-03-20' },
    ],
  },
  'Fixed Deposits': {
    label: 'Fixed Deposits',
    primaryKey: 'applicationNo',
    columns: [
      { key: 'applicationNo', label: 'Application Number', required: true, type: 'string', synonyms: ['application_number', 'applicationno', 'fdr_number', 'deposit_no'], example: 'FD-BJF-88129' },
      { key: 'clientName', label: 'Client Name', required: true, type: 'string', synonyms: ['client_name', 'depositor_name'], example: 'Suresh Patil' },
      { key: 'clientMobile', label: 'Client Mobile', required: true, type: 'mobile', synonyms: ['client_mobile', 'mobile_number'], example: '9820334411' },
      { key: 'subBrokerCode', label: 'Sub-Broker Code', required: true, type: 'string', synonyms: ['sub_broker_code', 'partner_code'], example: 'IX-SB-102' },
      { key: 'provider', label: 'Provider / Company', required: true, type: 'string', synonyms: ['provider', 'company', 'nbfc', 'bank'], example: 'Bajaj Finance Ltd' },
      { key: 'depositAmount', label: 'Deposit Amount (₹)', required: true, type: 'number', synonyms: ['deposit_amount', 'amount', 'principal'], example: 500000 },
      { key: 'tenureMonths', label: 'Tenure (Months)', required: true, type: 'number', synonyms: ['tenure_months', 'tenure', 'period_months'], example: 36 },
      { key: 'interestRatePct', label: 'Interest Rate (% p.a.)', required: true, type: 'number', synonyms: ['interest_rate_pct', 'interest_rate', 'roi'], example: 8.35 },
      { key: 'interestPayoutFrequency', label: 'Payout Frequency', required: true, type: 'string', synonyms: ['interest_payout', 'interest_frequency', 'payout'], example: 'Annual' },
      { key: 'depositDate', label: 'Deposit Date', required: true, type: 'date', synonyms: ['deposit_date', 'start_date'], example: '2026-04-01' },
      { key: 'maturityDate', label: 'Maturity Date', required: true, type: 'date', synonyms: ['maturity_date', 'end_date'], example: '2029-04-01' },
    ],
  },
  'Bonds': {
    label: 'Bonds & NCDs',
    primaryKey: 'applicationNo',
    columns: [
      { key: 'applicationNo', label: 'Application Number', required: true, type: 'string', synonyms: ['application_number', 'applicationno', 'bond_ref'], example: 'BND-REC-99120' },
      { key: 'isinNo', label: 'ISIN Number', required: true, type: 'string', synonyms: ['isin_no', 'isin', 'isin_code'], example: 'INE020B08DF2' },
      { key: 'bondType', label: 'Bond Type', required: true, type: 'string', synonyms: ['bond_type', 'category'], example: 'Capital Gains 54EC' },
      { key: 'clientName', label: 'Client Name', required: true, type: 'string', synonyms: ['client_name', 'investor_name'], example: 'Manish Chawla' },
      { key: 'clientMobile', label: 'Client Mobile', required: true, type: 'mobile', synonyms: ['client_mobile', 'mobile_number'], example: '9820551144' },
      { key: 'subBrokerCode', label: 'Sub-Broker Code', required: true, type: 'string', synonyms: ['sub_broker_code', 'partner_code'], example: 'IX-SB-101' },
      { key: 'issuer', label: 'Issuer', required: true, type: 'string', synonyms: ['issuer', 'institution'], example: 'REC Ltd (54EC)' },
      { key: 'faceValuePerUnit', label: 'Face Value (₹)', required: true, type: 'number', synonyms: ['face_value', 'unit_price'], example: 10000 },
      { key: 'unitsAllocated', label: 'Units Allocated', required: true, type: 'number', synonyms: ['units_allocated', 'units', 'quantity'], example: 250 },
      { key: 'totalInvestment', label: 'Total Investment (₹)', required: true, type: 'number', synonyms: ['total_investment', 'investment_amount'], example: 2500000 },
      { key: 'couponRatePct', label: 'Coupon Rate (% p.a.)', required: true, type: 'number', synonyms: ['coupon_rate_pct', 'coupon_rate', 'roi'], example: 5.25 },
      { key: 'issueDate', label: 'Issue Date', required: true, type: 'date', synonyms: ['issue_date', 'allotment_date'], example: '2026-04-10' },
      { key: 'maturityDate', label: 'Maturity Date', required: true, type: 'date', synonyms: ['maturity_date', 'redemption_date'], example: '2031-04-10' },
    ],
  },
  'Loans': {
    label: 'Loans & Mortgages',
    primaryKey: 'applicationNo',
    columns: [
      { key: 'applicationNo', label: 'Application Number', required: true, type: 'string', synonyms: ['application_number', 'applicationno', 'loan_no'], example: 'LN-HDFC-5520' },
      { key: 'clientName', label: 'Client Name', required: true, type: 'string', synonyms: ['client_name', 'borrower_name'], example: 'Priya Iyer' },
      { key: 'clientMobile', label: 'Client Mobile', required: true, type: 'mobile', synonyms: ['client_mobile', 'mobile_number'], example: '9811223344' },
      { key: 'subBrokerCode', label: 'Sub-Broker Code', required: true, type: 'string', synonyms: ['sub_broker_code', 'dsa_code'], example: 'IX-SB-101' },
      { key: 'lender', label: 'Lender / Bank', required: true, type: 'string', synonyms: ['lender', 'bank', 'institution'], example: 'HDFC Bank' },
      { key: 'loanType', label: 'Loan Type', required: true, type: 'string', synonyms: ['loan_type', 'facility'], example: 'Home Loan' },
      { key: 'requestedAmount', label: 'Requested Amount (₹)', required: true, type: 'number', synonyms: ['requested_amount', 'loan_amount'], example: 7500000 },
      { key: 'sanctionedAmount', label: 'Sanctioned Amount (₹)', required: false, type: 'number', synonyms: ['sanctioned_amount'], example: 7000000 },
      { key: 'disbursedAmount', label: 'Disbursed Amount (₹)', required: false, type: 'number', synonyms: ['disbursed_amount'], example: 7000000 },
      { key: 'roiPct', label: 'Rate of Interest (%)', required: true, type: 'number', synonyms: ['roi_pct', 'interest_rate', 'roi'], example: 8.5 },
      { key: 'stage', label: 'Stage / Status', required: true, type: 'string', synonyms: ['stage', 'status'], example: 'disbursed' },
      { key: 'submissionDate', label: 'Submission Date', required: true, type: 'date', synonyms: ['submission_date', 'login_date'], example: '2026-03-10' },
      { key: 'disbursementDate', label: 'Disbursement Date', required: false, type: 'date', synonyms: ['disbursement_date'], example: '2026-04-05' },
    ],
  },
  'Clients': {
    label: 'Clients CRM',
    primaryKey: 'fullName',
    columns: [
      { key: 'fullName', label: 'Full Client Name', required: true, type: 'string', synonyms: ['client_name', 'fullname', 'name', 'customer_name'], example: 'Arun Kulkarni' },
      { key: 'mobile', label: 'Mobile Number', required: true, type: 'mobile', synonyms: ['mobile_number', 'mobile', 'phone'], example: '9820556677' },
      { key: 'email', label: 'Email Address', required: false, type: 'email', synonyms: ['email_address', 'email'], example: 'arun.kulkarni@example.com' },
      { key: 'city', label: 'City', required: true, type: 'string', synonyms: ['city', 'location'], example: 'Mumbai' },
      { key: 'state', label: 'State', required: true, type: 'string', synonyms: ['state', 'province'], example: 'Maharashtra' },
      { key: 'panMasked', label: 'PAN Number', required: true, type: 'pan', synonyms: ['pan_number', 'pan', 'pan_no'], example: 'ABCDE1234F' },
      { key: 'subBrokerCode', label: 'Sub-Broker Code', required: true, type: 'string', synonyms: ['sub_broker_code', 'sb_code', 'partner_code'], example: 'IX-SB-101' },
      { key: 'gstNo', label: 'GST Number (Optional)', required: false, type: 'string', synonyms: ['gst_number', 'gstno', 'gstin'], example: '27ABCDE1234F1Z5' },
    ],
  },
  'Sub-Brokers': {
    label: 'Sub-Brokers Master',
    primaryKey: 'name',
    columns: [
      { key: 'name', label: 'Partner Full Name', required: true, type: 'string', synonyms: ['partner_name', 'name', 'full_name'], example: 'Kunal Singhania' },
      { key: 'companyName', label: 'Agency / Firm Name', required: true, type: 'string', synonyms: ['agency_name', 'company_name', 'firm_name'], example: 'Singhania Wealth Advisors' },
      { key: 'mobile', label: 'Mobile Number', required: true, type: 'mobile', synonyms: ['mobile_number', 'mobile', 'phone'], example: '9820889900' },
      { key: 'email', label: 'Email Address', required: true, type: 'email', synonyms: ['email_address', 'email'], example: 'kunal@singhaniawealth.in' },
      { key: 'city', label: 'City', required: true, type: 'string', synonyms: ['city'], example: 'Pune' },
      { key: 'state', label: 'State', required: true, type: 'string', synonyms: ['state'], example: 'Maharashtra' },
      { key: 'panMasked', label: 'PAN Number', required: true, type: 'pan', synonyms: ['pan_number', 'pan'], example: 'BCDEF2345G' },
      { key: 'amfiOrReraNo', label: 'AMFI / ARN Number', required: true, type: 'string', synonyms: ['amfi_or_rera_no', 'arn_no', 'amfi_no'], example: 'ARN-198273' },
      { key: 'tier', label: 'Partner Tier', required: true, type: 'string', synonyms: ['tier', 'partner_tier'], example: 'Gold' },
      { key: 'defaultPayoutSharePct', label: 'Default Share (%)', required: true, type: 'number', synonyms: ['default_payout_share_pct', 'share_pct'], example: 75 },
      { key: 'bankAccountMasked', label: 'Bank Account Masked', required: false, type: 'string', synonyms: ['bank_account', 'account_no'], example: 'HDFC •••• 9921' },
      { key: 'bankIfsc', label: 'Bank IFSC Code', required: false, type: 'string', synonyms: ['bank_ifsc', 'ifsc'], example: 'HDFC0000060' },
    ],
  },
  'Brokerage Entries': {
    label: 'Brokerage Register Entries',
    primaryKey: 'referenceNo',
    columns: [
      { key: 'referenceNo', label: 'Policy / Contract Ref', required: true, type: 'string', synonyms: ['reference_number', 'policy_no', 'reference_no', 'application_no'], example: 'HI-2026-STAR-9988' },
      { key: 'productType', label: 'Product Category', required: true, type: 'string', synonyms: ['product_type', 'product_category'], example: 'Health Insurance' },
      { key: 'clientName', label: 'Client Name', required: true, type: 'string', synonyms: ['client_name', 'customer'], example: 'Deepak & Associates' },
      { key: 'subBrokerCode', label: 'Sub-Broker Code', required: true, type: 'string', synonyms: ['sub_broker_code', 'partner_code'], example: 'IX-SB-101' },
      { key: 'grossBusinessValue', label: 'Gross Value (₹)', required: true, type: 'number', synonyms: ['gross_business_value', 'business_volume', 'premium_amount'], example: 65000 },
      { key: 'companyCommissionExpected', label: 'Company Expected (₹)', required: true, type: 'number', synonyms: ['company_commission_expected', 'expected_brokerage'], example: 9750 },
      { key: 'companyCommissionReceived', label: 'Received Brokerage (₹)', required: false, type: 'number', synonyms: ['company_commission_received', 'received_brokerage'], example: 9750 },
      { key: 'receiptDate', label: 'Receipt Date', required: false, type: 'date', synonyms: ['receipt_date', 'received_date'], example: '2026-04-12' },
      { key: 'paymentRefNo', label: 'Payment Reference', required: false, type: 'string', synonyms: ['payment_ref_no', 'bank_ref', 'cms_ref'], example: 'CMS-HDFC-99120' },
    ],
  },
};

/**
 * Normalizes header string to alphanumeric lowercase for fuzzy matching
 */
export function normalizeHeader(header: string): string {
  return String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Downloads a pre-formatted official Excel (.xlsx) template for a given module
 */
export function generateModuleTemplate(moduleType: string, format: 'xlsx' | 'csv' = 'xlsx'): void {
  const schema = MODULE_SCHEMAS[moduleType];
  if (!schema) {
    alert(`Unknown module: ${moduleType}`);
    return;
  }

  // Create sample row 1 and sample row 2 using schema definitions
  const sampleRow1: Record<string, any> = {};
  const sampleRow2: Record<string, any> = {};

  schema.columns.forEach((col) => {
    sampleRow1[col.label] = col.example;
    // Generate slight variation for row 2
    if (col.type === 'number') {
      sampleRow2[col.label] = Number(col.example) * 1.5;
    } else if (col.type === 'string' && col.example.toString().includes('-')) {
      sampleRow2[col.label] = col.example.toString().replace(/\d+/g, (m) => String(Number(m) + 1));
    } else {
      sampleRow2[col.label] = col.example;
    }
  });

  const dataset = [sampleRow1, sampleRow2];
  const filename = `Investxindia_Template_${moduleType.replace(/\s+/g, '_')}`;

  if (format === 'csv') {
    exportToCSV(dataset, filename);
  } else {
    exportToExcel(dataset, filename, 'Import_Template');
  }
}

/**
 * Exports data to an Excel (.xlsx) workbook
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Investxindia_Data'): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Exports data to a CSV file
 */
export function exportToCSV(data: any[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds existing key dictionary to prevent duplicate imports
 */
export function getExistingRecordKeys(moduleType: string): Set<string> {
  const keys = new Set<string>();

  switch (moduleType) {
    case 'Health Insurance':
      dataStore.getHealthPolicies().forEach((p) => keys.add(p.policyNo.trim().toUpperCase()));
      break;
    case 'Motor Insurance':
      dataStore.getMotorPolicies().forEach((p) => keys.add(p.policyNo.trim().toUpperCase()));
      break;
    case 'Life Insurance':
      dataStore.getLifePolicies().forEach((p) => keys.add(p.policyNo.trim().toUpperCase()));
      break;
    case 'Fixed Deposits':
      dataStore.getFixedDeposits().forEach((f) => keys.add(f.applicationNo.trim().toUpperCase()));
      break;
    case 'Bonds':
      dataStore.getBonds().forEach((b) => keys.add(b.applicationNo.trim().toUpperCase()));
      break;
    case 'Loans':
      dataStore.getLoans().forEach((l) => keys.add(l.applicationNo.trim().toUpperCase()));
      break;
    case 'Clients':
      dataStore.getClients().forEach((c) => {
        keys.add(c.fullName.trim().toUpperCase());
        if (c.panMasked) keys.add(c.panMasked.trim().toUpperCase());
        if (c.mobile) keys.add(c.mobile.trim());
      });
      break;
    case 'Sub-Brokers':
      dataStore.getSubBrokers().forEach((s) => {
        keys.add(s.subBrokerCode.trim().toUpperCase());
        keys.add(s.name.trim().toUpperCase());
      });
      break;
    case 'Brokerage Entries':
      dataStore.getTransactions().forEach((t) => keys.add(t.referenceNo.trim().toUpperCase()));
      break;
  }

  return keys;
}

/**
 * Auto-detects matching schema columns from uploaded file headers
 */
export function autoMapColumns(headers: string[], moduleType: string): Record<string, string> {
  const schema = MODULE_SCHEMAS[moduleType];
  if (!schema) return {};

  const mapping: Record<string, string> = {};

  headers.forEach((header) => {
    const norm = normalizeHeader(header);
    for (const col of schema.columns) {
      if (normalizeHeader(col.key) === norm || normalizeHeader(col.label) === norm) {
        mapping[header] = col.key;
        return;
      }
      for (const syn of col.synonyms) {
        if (normalizeHeader(syn) === norm) {
          mapping[header] = col.key;
          return;
        }
      }
    }
  });

  return mapping;
}

/**
 * Parses and validates an uploaded file (Excel or CSV) against the selected module schema
 */
export async function parseAndValidateFile(
  file: File,
  moduleType: string,
  customMapping?: Record<string, string>
): Promise<ParsedBatchResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          resolve({
            module: moduleType,
            totalRows: 0,
            validRows: [],
            invalidRows: [],
            duplicateCount: 0,
            headers: [],
            columnMapping: {},
          });
          return;
        }

        const headers = Object.keys(rawRows[0]);
        const schema = MODULE_SCHEMAS[moduleType];
        if (!schema) throw new Error(`Schema not defined for ${moduleType}`);

        const mapping = customMapping || autoMapColumns(headers, moduleType);
        const existingKeys = getExistingRecordKeys(moduleType);

        // Keep track of primary keys inside the uploaded file to detect intra-file duplicates
        const batchKeysSeen = new Set<string>();

        const validRows: any[] = [];
        const invalidRows: { rowNumber: number; rowData: any; issues: ValidationIssue[] }[] = [];
        let duplicateCount = 0;

        rawRows.forEach((row, idx) => {
          const rowNumber = idx + 2; // +1 for 0-index, +1 for spreadsheet header
          const issues: ValidationIssue[] = [];
          const mappedRow: Record<string, any> = {};

          // Apply mapping
          Object.keys(row).forEach((header) => {
            const mappedKey = mapping[header];
            if (mappedKey) {
              mappedRow[mappedKey] = row[header];
            } else {
              mappedRow[header] = row[header];
            }
          });

          // Validate required and typed columns
          schema.columns.forEach((col) => {
            const val = mappedRow[col.key];
            const isEmpty = val === undefined || val === null || String(val).trim() === '';

            if (col.required && isEmpty) {
              issues.push({
                row: rowNumber,
                field: col.label,
                message: `Mandatory field "${col.label}" is missing or blank`,
                rejectedValue: '',
                type: 'error',
              });
              return;
            }

            if (!isEmpty) {
              if (col.type === 'number') {
                const cleanNum = Number(String(val).replace(/,/g, '').trim());
                if (isNaN(cleanNum) || cleanNum < 0) {
                  issues.push({
                    row: rowNumber,
                    field: col.label,
                    message: `Expected non-negative numeric value, received "${val}"`,
                    rejectedValue: val,
                    type: 'error',
                  });
                } else {
                  mappedRow[col.key] = cleanNum;
                }
              } else if (col.type === 'mobile') {
                const cleanDigits = String(val).replace(/[^0-9]/g, '');
                if (cleanDigits.length < 10) {
                  issues.push({
                    row: rowNumber,
                    field: col.label,
                    message: `Invalid Indian mobile number. Must contain 10 digits, received "${val}"`,
                    rejectedValue: val,
                    type: 'error',
                  });
                } else {
                  mappedRow[col.key] = cleanDigits.slice(-10);
                }
              } else if (col.type === 'pan') {
                const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                const upperPan = String(val).trim().toUpperCase();
                if (!panRegex.test(upperPan) && !upperPan.includes('****')) {
                  issues.push({
                    row: rowNumber,
                    field: col.label,
                    message: `Invalid Indian Income Tax PAN format (expected ABCDE1234F), received "${val}"`,
                    rejectedValue: val,
                    type: 'error',
                  });
                } else {
                  mappedRow[col.key] = upperPan;
                }
              } else if (col.type === 'date') {
                const parsedDate = new Date(val);
                if (isNaN(parsedDate.getTime())) {
                  issues.push({
                    row: rowNumber,
                    field: col.label,
                    message: `Invalid calendar date format, received "${val}"`,
                    rejectedValue: val,
                    type: 'error',
                  });
                }
              }
            }
          });

          // Primary key duplicate check
          const primaryKeyCol = schema.columns.find((c) => c.key === schema.primaryKey);
          const primaryVal = mappedRow[schema.primaryKey];
          const trimmedKey = String(primaryVal || '').trim().toUpperCase();

          if (trimmedKey) {
            // Check 1: In-batch duplicate
            if (batchKeysSeen.has(trimmedKey)) {
              duplicateCount++;
              issues.push({
                row: rowNumber,
                field: primaryKeyCol?.label || 'Primary Key',
                message: `Duplicate in file: "${trimmedKey}" appears multiple times within this batch`,
                rejectedValue: trimmedKey,
                type: 'error',
              });
            } else {
              batchKeysSeen.add(trimmedKey);
            }

            // Check 2: Database existing duplicate
            if (existingKeys.has(trimmedKey)) {
              duplicateCount++;
              issues.push({
                row: rowNumber,
                field: primaryKeyCol?.label || 'Primary Key',
                message: `Duplicate in database: record with reference "${trimmedKey}" already exists`,
                rejectedValue: trimmedKey,
                type: 'error',
              });
            }
          }

          if (issues.length > 0) {
            invalidRows.push({ rowNumber, rowData: row, issues });
          } else {
            validRows.push({
              ...mappedRow,
              _sourceRowNumber: rowNumber,
            });
          }
        });

        resolve({
          module: moduleType,
          totalRows: rawRows.length,
          validRows,
          invalidRows,
          duplicateCount,
          headers,
          columnMapping: mapping,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Enforces role authorization for data imports
 */
export function authorizeImport(
  userRole: UserRole,
  moduleType: string
): { authorized: boolean; reason?: string } {
  if (userRole === 'super_admin' || userRole === 'staff') {
    return { authorized: true };
  }

  // Sub-brokers are restricted from importing rules, partners, or other partner data
  if (userRole === 'sub_broker') {
    if (['Sub-Brokers', 'Brokerage Entries'].includes(moduleType)) {
      return {
        authorized: false,
        reason: `Sub-Brokers are strictly prohibited from bulk-uploading partner configurations or company brokerage registers.`,
      };
    }
    // Sub-broker can import clients assigned to themselves
    return { authorized: true };
  }

  return { authorized: false, reason: 'Unauthorized role.' };
}

/**
 * Executes a chunked batch import of validated rows into the persistent data store
 */
export async function executeChunkedBatchImport(
  moduleType: string,
  validRows: any[],
  fileName: string,
  userRole: UserRole,
  onProgress?: (processed: number, total: number, percent: number) => void
): Promise<ImportExecutionResult> {
  const auth = authorizeImport(userRole, moduleType);
  if (!auth.authorized) {
    throw new Error(auth.reason || 'Authorization failure');
  }

  const activeUser = dataStore.getActiveUser();
  const total = validRows.length;
  let processed = 0;
  const chunkSize = 25; // Safe chunk size to keep UI responsive

  // Process chunks
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = validRows.slice(i, i + chunkSize);

    chunk.forEach((row) => {
      // Ingest based on module
      if (moduleType === 'Health Insurance') {
        dataStore.addHealthPolicy({
          policyNo: row.policyNo,
          clientId: 'cl-1',
          clientName: row.clientName,
          subBrokerId: 'sb-1',
          subBrokerName: 'Vikram Joshi (Apex Wealth)',
          insurer: row.insurer || 'Star Health',
          planName: row.planName || 'Comprehensive Health',
          sumInsured: Number(row.sumInsured) || 1000000,
          annualPremium: Number(row.annualPremium) || 25000,
          policyStartDate: row.policyStartDate || new Date().toISOString().split('T')[0],
          policyExpiryDate: row.renewalDueDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          renewalDueDate: row.renewalDueDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          paymentMode: row.paymentMode || 'Annual',
          status: 'active',
          commissionExpected: Math.round(Number(row.annualPremium) * 0.15),
          commissionReceived: 0,
          subBrokerPayable: Math.round(Number(row.annualPremium) * 0.15 * 0.75 * 0.95),
          payoutStatus: 'pending',
        });
      } else if (moduleType === 'Motor Insurance') {
        dataStore.addMotorPolicy({
          policyNo: row.policyNo,
          vehicleNo: row.vehicleNo,
          vehicleMakeModel: row.vehicleMakeModel || 'Standard Vehicle',
          policyType: row.policyType || 'Comprehensive',
          clientId: 'cl-1',
          clientName: row.clientName,
          subBrokerId: 'sb-1',
          subBrokerName: 'Vikram Joshi (Apex Wealth)',
          insurer: row.insurer || 'ICICI Lombard',
          idvAmount: Number(row.idvAmount) || 800000,
          netPremium: Number(row.netPremium) || 15000,
          grossPremium: Number(row.grossPremium) || 17700,
          policyStartDate: row.policyStartDate || new Date().toISOString().split('T')[0],
          policyExpiryDate: row.policyExpiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          status: 'active',
          commissionExpected: Math.round(Number(row.grossPremium) * 0.15),
          commissionReceived: 0,
          subBrokerPayable: Math.round(Number(row.grossPremium) * 0.15 * 0.75 * 0.95),
          payoutStatus: 'pending',
        });
      } else if (moduleType === 'Life Insurance') {
        dataStore.addLifePolicy({
          policyNo: row.policyNo,
          clientId: 'cl-1',
          clientName: row.clientName,
          subBrokerId: 'sb-1',
          subBrokerName: 'Vikram Joshi (Apex Wealth)',
          insurer: row.insurer || 'LIC of India',
          planType: row.planType || 'Term Plan',
          planName: row.planName || 'Smart Shield',
          sumAssured: Number(row.sumAssured) || 10000000,
          policyTermYears: Number(row.policyTermYears) || 25,
          premiumPaymentTerm: Number(row.premiumPaymentTerm) || 25,
          annualPremium: Number(row.annualPremium) || 35000,
          policyDate: row.policyDate || new Date().toISOString().split('T')[0],
          nextPremiumDate: row.nextPremiumDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          status: 'in_force',
          commissionExpected: Math.round(Number(row.annualPremium) * 0.25),
          commissionReceived: 0,
          subBrokerPayable: Math.round(Number(row.annualPremium) * 0.25 * 0.75 * 0.95),
          payoutStatus: 'pending',
        });
      } else if (moduleType === 'Fixed Deposits') {
        dataStore.addFixedDeposit({
          applicationNo: row.applicationNo,
          clientId: 'cl-1',
          clientName: row.clientName,
          subBrokerId: 'sb-1',
          subBrokerName: 'Vikram Joshi (Apex Wealth)',
          provider: row.provider || 'Bajaj Finance Ltd',
          depositAmount: Number(row.depositAmount) || 500000,
          tenureMonths: Number(row.tenureMonths) || 36,
          interestRatePct: Number(row.interestRatePct) || 8.2,
          interestPayoutFrequency: row.interestPayoutFrequency || 'Annual',
          depositDate: row.depositDate || new Date().toISOString().split('T')[0],
          maturityDate: row.maturityDate || new Date(Date.now() + 3 * 365 * 86400000).toISOString().split('T')[0],
          maturityAmount: Math.round(Number(row.depositAmount) * 1.25),
          status: 'active',
          commissionExpected: Math.round(Number(row.depositAmount) * 0.0125),
          commissionReceived: 0,
          subBrokerPayable: Math.round(Number(row.depositAmount) * 0.0125 * 0.7 * 0.95),
          payoutStatus: 'pending',
        });
      } else if (moduleType === 'Bonds') {
        dataStore.addBond({
          applicationNo: row.applicationNo,
          isinNo: row.isinNo || 'INE020B08DF2',
          clientId: 'cl-1',
          clientName: row.clientName,
          subBrokerId: 'sb-1',
          subBrokerName: 'Vikram Joshi (Apex Wealth)',
          issuer: row.issuer || 'REC Ltd (54EC)',
          bondType: row.bondType || 'Capital Gains 54EC',
          faceValuePerUnit: Number(row.faceValuePerUnit) || 10000,
          unitsAllocated: Number(row.unitsAllocated) || 100,
          totalInvestment: Number(row.totalInvestment) || 1000000,
          couponRatePct: Number(row.couponRatePct) || 5.25,
          annualInterestPayout: Math.round(Number(row.totalInvestment) * 0.0525),
          issueDate: row.issueDate || new Date().toISOString().split('T')[0],
          maturityDate: row.maturityDate || new Date(Date.now() + 5 * 365 * 86400000).toISOString().split('T')[0],
          status: 'allotted',
          commissionExpected: Math.round(Number(row.totalInvestment) * 0.005),
          commissionReceived: 0,
          subBrokerPayable: Math.round(Number(row.totalInvestment) * 0.005 * 0.75 * 0.95),
          payoutStatus: 'pending',
        });
      } else if (moduleType === 'Loans') {
        dataStore.addLoan({
          applicationNo: row.applicationNo,
          clientId: 'cl-1',
          clientName: row.clientName,
          subBrokerId: 'sb-1',
          subBrokerName: 'Vikram Joshi (Apex Wealth)',
          lender: row.lender || 'HDFC Bank',
          loanType: row.loanType || 'Home Loan',
          requestedAmount: Number(row.requestedAmount) || 5000000,
          sanctionedAmount: Number(row.sanctionedAmount) || 4500000,
          disbursedAmount: Number(row.disbursedAmount) || 4500000,
          roiPct: Number(row.roiPct) || 8.6,
          stage: row.stage || 'disbursed',
          submissionDate: row.submissionDate || new Date().toISOString().split('T')[0],
          disbursementDate: row.disbursementDate,
          expectedPayout: Math.round(Number(row.sanctionedAmount || row.requestedAmount) * 0.0065),
          receivedPayout: 0,
          subBrokerPayout: Math.round(Number(row.sanctionedAmount || row.requestedAmount) * 0.0065 * 0.65 * 0.95),
          payoutStatus: 'pending',
        });
      } else if (moduleType === 'Clients') {
        dataStore.addClient({
          clientCode: `IX-CL-${Math.floor(1000 + Math.random() * 9000)}`,
          fullName: row.fullName,
          email: row.email || '',
          mobile: row.mobile,
          city: row.city || 'Mumbai',
          state: row.state || 'Maharashtra',
          panMasked: row.panMasked,
          gstNo: row.gstNo,
          assignedStaffId: 'usr-2',
          subBrokerId: 'sb-1',
          subBrokerName: 'Vikram Joshi (Apex Wealth)',
          totalPortfolioValue: 0,
          activePoliciesCount: 0,
          kycStatus: 'pending',
          tags: ['Batch Imported'],
        });
      }
    });

    processed += chunk.length;
    if (onProgress) {
      const pct = Math.round((processed / total) * 100);
      onProgress(processed, total, pct);
    }

    // Small delay to yield thread for smooth animation
    await new Promise((r) => setTimeout(r, 40));
  }

  // Create persistent Import Job record in local store
  const job = dataStore.addImportJob({
    module: moduleType,
    fileName,
    fileFormat: fileName.endsWith('.csv') ? 'csv' : 'xlsx',
    totalRows: total,
    successCount: total,
    errorCount: 0,
    duplicateCount: 0,
    importedBy: activeUser.name,
    status: 'completed',
  });

  // Record in Supabase import_jobs table if connected
  try {
    await importJobService.recordImportJob({
      moduleType,
      fileName,
      totalRows: total,
      validRows: total,
      invalidRows: 0,
      status: 'completed',
    });
  } catch (err) {
    console.warn('Could not record import job to Supabase:', err);
  }

  return {
    jobNo: job.jobNo,
    module: moduleType,
    totalRows: total,
    successCount: total,
    errorCount: 0,
    duplicateCount: 0,
    status: 'completed',
  };
}

/**
 * Downloads a structured Excel error report for rejected rows
 */
export function downloadErrorReport(
  moduleType: string,
  invalidRows: { rowNumber: number; rowData: any; issues: ValidationIssue[] }[]
): void {
  if (invalidRows.length === 0) return;

  const exportRows = invalidRows.map((item) => ({
    Excel_Row_No: item.rowNumber,
    Error_Summary: item.issues.map((i) => `[${i.field}] ${i.message}`).join(' | '),
    Primary_Error_Field: item.issues[0]?.field || '',
    Primary_Error_Reason: item.issues[0]?.message || '',
    ...item.rowData,
  }));

  const filename = `Investxindia_Import_Errors_${moduleType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
  exportToExcel(exportRows, filename, 'Validation_Failures');
}

/**
 * Validates role-based export permissions and masks proprietary company fields for sub-brokers
 */
export function secureExportDataset<T extends Record<string, any>>(
  dataset: T[],
  datasetName: string,
  userRole: UserRole,
  format: 'xlsx' | 'csv' = 'xlsx',
  subBrokerCode?: string
): { success: boolean; exportedCount: number; message: string } {
  // Guard: Sub-broker attempting to export enterprise brokerage rules or other partners
  if (userRole === 'sub_broker') {
    if (datasetName.toLowerCase().includes('rule') || datasetName.toLowerCase().includes('sub_broker_master')) {
      dataStore.logAudit(
        'UNAUTHORIZED_EXPORT_ATTEMPT_BLOCKED',
        'SecurityGuard',
        datasetName,
        `Blocked sub-broker export attempt for restricted dataset: ${datasetName}`
      );
      return {
        success: false,
        exportedCount: 0,
        message: 'Security Policy Violation: Sub-Brokers do not have permission to export proprietary enterprise rules or partner databases.',
      };
    }
  }

  // Filter dataset by subBrokerCode if user is a sub_broker
  let records = [...dataset];
  if (userRole === 'sub_broker' && subBrokerCode) {
    records = records.filter((r) => {
      const code = r.subBrokerCode || r.subBrokerId || '';
      return String(code).includes(subBrokerCode) || String(r.subBrokerName || '').includes('Vikram');
    });
  }

  // Redact proprietary company commission numbers from sub-broker exports
  if (userRole === 'sub_broker') {
    records = records.map((r) => {
      const sanitized: Record<string, any> = { ...r };
      if ('companyCommissionExpected' in sanitized) sanitized.companyCommissionExpected = '[Restricted]';
      if ('companyCommissionReceived' in sanitized) sanitized.companyCommissionReceived = '[Restricted]';
      if ('investxindiaRetained' in sanitized) sanitized.investxindiaRetained = '[Restricted]';
      return sanitized as T;
    });
  }

  const filename = `Investxindia_${datasetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

  if (format === 'csv') {
    exportToCSV(records, filename);
  } else {
    exportToExcel(records, filename, datasetName.slice(0, 31));
  }

  dataStore.logAudit(
    'DATA_EXPORTED',
    'ExportService',
    datasetName,
    `Exported ${records.length} records of ${datasetName} as .${format} (Role: ${userRole})`
  );

  return {
    success: true,
    exportedCount: records.length,
    message: `Exported ${records.length} records successfully as ${filename}.${format}`,
  };
}
