export type UserRole = 'super_admin' | 'staff' | 'sub_broker';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  subBrokerCode?: string;
  staffDepartment?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  permissions: string[];
}

export interface Client {
  id: string;
  clientCode: string;
  fullName: string;
  email: string;
  mobile: string;
  city: string;
  state: string;
  panMasked: string;
  gstNo?: string;
  assignedStaffId: string;
  subBrokerId: string;
  subBrokerName: string;
  totalPortfolioValue: number;
  activePoliciesCount: number;
  kycStatus: 'verified' | 'pending' | 'rejected';
  createdAt: string;
  tags: string[];
}

export interface SubBroker {
  id: string;
  subBrokerCode: string;
  name: string;
  companyName: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  panMasked: string;
  amfiOrReraNo: string;
  tier: 'Standard' | 'Silver' | 'Gold' | 'Platinum';
  defaultPayoutSharePct: number;
  totalBusinessVolume: number;
  totalBrokerageEarned: number;
  pendingPayout: number;
  activeClientsCount: number;
  bankAccountMasked: string;
  bankIfsc: string;
  status: 'active' | 'suspended' | 'pending';
}

export interface HealthInsurancePolicy {
  id: string;
  policyNo: string;
  clientId: string;
  clientName: string;
  subBrokerId: string;
  subBrokerName: string;
  insurer: 'Star Health' | 'HDFC ERGO' | 'Care Health' | 'Niva Bupa' | 'Aditya Birla Health';
  planName: string;
  sumInsured: number;
  annualPremium: number;
  policyStartDate: string;
  policyExpiryDate: string;
  renewalDueDate: string;
  paymentMode: 'Annual' | 'Semi-Annual' | 'Monthly';
  status: 'active' | 'grace_period' | 'lapsed' | 'renewed';
  commissionExpected: number;
  commissionReceived: number;
  subBrokerPayable: number;
  payoutStatus: 'pending' | 'approved' | 'paid';
}

export interface MotorInsurancePolicy {
  id: string;
  policyNo: string;
  vehicleNo: string;
  vehicleMakeModel: string;
  policyType: 'Comprehensive' | 'Third Party' | 'Own Damage';
  clientId: string;
  clientName: string;
  subBrokerId: string;
  subBrokerName: string;
  insurer: 'ICICI Lombard' | 'Bajaj Allianz' | 'Tata AIG' | 'Go Digit' | 'HDFC ERGO';
  idvAmount: number;
  netPremium: number;
  grossPremium: number;
  policyStartDate: string;
  policyExpiryDate: string;
  status: 'active' | 'expired' | 'renewed';
  commissionExpected: number;
  commissionReceived: number;
  subBrokerPayable: number;
  payoutStatus: 'pending' | 'approved' | 'paid';
}

export interface LifeInsurancePolicy {
  id: string;
  policyNo: string;
  clientId: string;
  clientName: string;
  subBrokerId: string;
  subBrokerName: string;
  insurer: 'LIC of India' | 'HDFC Life' | 'Max Life' | 'ICICI Prudential' | 'SBI Life';
  planType: 'Term Plan' | 'Endowment' | 'ULIP' | 'Whole Life' | 'Guaranteed Return';
  planName: string;
  sumAssured: number;
  policyTermYears: number;
  premiumPaymentTerm: number;
  annualPremium: number;
  policyDate: string;
  nextPremiumDate: string;
  status: 'in_force' | 'lapsed' | 'paid_up' | 'matured';
  commissionExpected: number;
  commissionReceived: number;
  subBrokerPayable: number;
  payoutStatus: 'pending' | 'approved' | 'paid';
}

export interface FixedDeposit {
  id: string;
  applicationNo: string;
  clientId: string;
  clientName: string;
  subBrokerId: string;
  subBrokerName: string;
  provider: 'Bajaj Finance Ltd' | 'Shriram Finance' | 'HDFC Bank Ltd' | 'Mahindra Finance' | 'Sundaram Home';
  depositAmount: number;
  tenureMonths: number;
  interestRatePct: number;
  interestPayoutFrequency: 'Cumulative' | 'Monthly' | 'Quarterly' | 'Annual';
  depositDate: string;
  maturityDate: string;
  maturityAmount: number;
  status: 'active' | 'matured' | 'premature_closed';
  commissionExpected: number;
  commissionReceived: number;
  subBrokerPayable: number;
  payoutStatus: 'pending' | 'approved' | 'paid';
}

export interface Bond {
  id: string;
  applicationNo: string;
  isinNo: string;
  clientId: string;
  clientName: string;
  subBrokerId: string;
  subBrokerName: string;
  issuer: 'REC Ltd (54EC)' | 'NHAI (54EC)' | 'PFC Ltd (54EC)' | 'Tata Capital NCD' | 'L&T Finance NCD';
  bondType: 'Capital Gains 54EC' | 'Corporate NCD' | 'Sovereign Gold Bond' | 'Tax-Free Bond';
  faceValuePerUnit: number;
  unitsAllocated: number;
  totalInvestment: number;
  couponRatePct: number;
  annualInterestPayout: number;
  issueDate: string;
  maturityDate: string;
  status: 'allotted' | 'pending_allotment' | 'redeemed';
  commissionExpected: number;
  commissionReceived: number;
  subBrokerPayable: number;
  payoutStatus: 'pending' | 'approved' | 'paid';
}

export interface LoanApplication {
  id: string;
  applicationNo: string;
  clientId: string;
  clientName: string;
  subBrokerId: string;
  subBrokerName: string;
  lender: 'HDFC Bank' | 'State Bank of India' | 'ICICI Bank' | 'Tata Capital' | 'Bajaj Housing Finance';
  loanType: 'Home Loan' | 'Loan Against Property' | 'Business Loan' | 'Personal Loan' | 'Working Capital';
  requestedAmount: number;
  sanctionedAmount: number;
  disbursedAmount: number;
  roiPct: number;
  stage: 'login_submitted' | 'underwriting' | 'sanctioned' | 'disbursed' | 'rejected';
  submissionDate: string;
  disbursementDate?: string;
  expectedPayout: number;
  receivedPayout: number;
  subBrokerPayout: number;
  payoutStatus: 'pending' | 'approved' | 'paid';
}

export interface BrokerageRule {
  id: string;
  ruleCode: string;
  productCategory: 'Health Insurance' | 'Motor Insurance' | 'Life Insurance' | 'Fixed Deposits' | 'Bonds' | 'Loans';
  provider: string;
  transactionType: 'Fresh' | 'Renewal' | 'Topup' | 'Rollover';
  partnerTier: 'All' | 'Standard' | 'Silver' | 'Gold' | 'Platinum';
  effectiveFrom: string;
  effectiveTo: string;
  companyCommissionPct: number;
  companyFlatInr: number;
  subBrokerSharePct: number; // percentage of company commission that goes to sub-broker
  subBrokerFlatInr: number;
  minSlabAmount: number;
  maxSlabAmount: number;
  tdsDeductionPct: number; // typically 5% under Indian tax law Section 194H
  status: 'active' | 'draft' | 'archived';
  version: number;
  notes?: string;
}

export interface BrokerageTransaction {
  id: string;
  transactionNo: string;
  productType: 'Health Insurance' | 'Motor Insurance' | 'Life Insurance' | 'Fixed Deposits' | 'Bonds' | 'Loans';
  referenceNo: string;
  clientName: string;
  clientId: string;
  subBrokerId: string;
  subBrokerName: string;
  grossBusinessValue: number;
  companyCommissionExpected: number;
  companyCommissionReceived: number;
  subBrokerSharePct: number;
  subBrokerGrossPayable: number;
  tdsDeducted: number;
  subBrokerNetPayable: number;
  investxindiaRetained: number;
  status: 'expected' | 'received' | 'approved' | 'paid' | 'reconciled' | 'disputed';
  receiptDate?: string;
  paymentRefNo?: string;
  ruleVersionApplied: string;
  calculationSnapshot?: string;
  payoutBatchId?: string;
  disputeNotes?: string;
  notes?: string;
}

export interface PartnerPayout {
  id: string;
  payoutBatchNo: string;
  subBrokerId: string;
  subBrokerName: string;
  subBrokerCode: string;
  period: string;
  transactionCount: number;
  transactionIds?: string[];
  grossPayable: number;
  tdsDeducted: number;
  netDisbursed: number;
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'Direct Transfer';
  bankReferenceNo: string;
  disbursementDate: string;
  status: 'pending_approval' | 'processing' | 'completed' | 'on_hold';
  approvedBy: string;
}

export interface BusinessTarget {
  id: string;
  entityName: string;
  entityType: 'Staff' | 'Sub-Broker';
  productCategory: string;
  month: string;
  year: number;
  targetAmount: number;
  achievedAmount: number;
  status: 'on_track' | 'lagging' | 'achieved' | 'exceeded';
}

export interface DocumentAccessRecord {
  id: string;
  accessedBy: string;
  accessedAt: string;
  role: UserRole;
  ipAddress: string;
  action: 'download' | 'preview' | 'generate_signed_url';
  tokenUsed: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  documentCategory:
    | 'KYC'
    | 'Policy Copy'
    | 'Proposal Form'
    | 'Mandate'
    | 'Brokerage Agreement'
    | 'Payout Advice'
    | 'Bank Proof'
    | 'GST Certificate';
  relatedEntity: string;
  entityType: 'Client' | 'Sub-Broker' | 'Policy' | 'Payout' | 'Loan';
  fileUrl: string;
  fileName: string;
  fileSize: string;
  fileSizeBytes?: number;
  mimeType?: string;
  storagePath?: string;
  isPrivate?: boolean;
  sha256Checksum?: string;
  uploadedAt: string;
  uploadedBy: string;
  verified: boolean;
  accessLog?: DocumentAccessRecord[];
}

export interface ImportJob {
  id: string;
  jobNo: string;
  module: string;
  fileName: string;
  fileFormat: 'xlsx' | 'csv';
  totalRows: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  importedBy: string;
  importedAt: string;
  status: 'completed' | 'completed_with_errors' | 'failed';
  errorDetails?: { row: number; field: string; message: string; rejectedValue?: any }[];
}


export interface TaskReminder {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  relatedTo: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed';
  reminderType: 'Renewal Followup' | 'Document Collection' | 'Maturity Intimation' | 'Payout Query' | 'General';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  details: string;
}
