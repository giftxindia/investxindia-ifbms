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
} from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-1',
    name: 'Rajiv Malhotra',
    email: 'rajiv.malhotra@investxindia.com',
    phone: '+91 98200 11223',
    role: 'super_admin',
    staffDepartment: 'Executive Directorate',
    avatarUrl: '',
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
    avatarUrl: '',
    status: 'active',
    permissions: ['crm_access', 'operations_read_write', 'reconciliation_view'],
  },
  {
    id: 'usr-3',
    name: 'Vikram Joshi (Apex Wealth)',
    email: 'vikram.joshi@apexwealth.co.in',
    phone: '+91 98199 88776',
    role: 'sub_broker',
    subBrokerCode: 'IX-SB-101',
    avatarUrl: '',
    status: 'active',
    permissions: ['view_assigned_clients', 'submit_leads', 'view_own_statement'],
  },
];

export const INITIAL_SUB_BROKERS: SubBroker[] = [
  {
    id: 'sb-1',
    subBrokerCode: 'IX-SB-101',
    name: 'Vikram Joshi',
    companyName: 'Apex Wealth Partners',
    mobile: '+91 98199 88776',
    email: 'vikram.joshi@apexwealth.co.in',
    city: 'Mumbai',
    state: 'Maharashtra',
    panMasked: 'ABCDE****F',
    amfiOrReraNo: 'ARN-148922',
    tier: 'Platinum',
    defaultPayoutSharePct: 75.0,
    totalBusinessVolume: 18500000,
    totalBrokerageEarned: 925000,
    pendingPayout: 68500,
    activeClientsCount: 42,
    bankAccountMasked: 'HDFC •••• 8192',
    bankIfsc: 'HDFC0000060',
    status: 'active',
  },
  {
    id: 'sb-2',
    subBrokerCode: 'IX-SB-102',
    name: 'Pooja Agarwal',
    companyName: 'Prosper Financial Services',
    mobile: '+91 98220 33445',
    email: 'pooja@prosperfinancial.in',
    city: 'Pune',
    state: 'Maharashtra',
    panMasked: 'BCDEF****G',
    amfiOrReraNo: 'ARN-192844',
    tier: 'Gold',
    defaultPayoutSharePct: 70.0,
    totalBusinessVolume: 12200000,
    totalBrokerageEarned: 580000,
    pendingPayout: 42000,
    activeClientsCount: 28,
    bankAccountMasked: 'ICICI •••• 4421',
    bankIfsc: 'ICIC0000104',
    status: 'active',
  },
  {
    id: 'sb-3',
    subBrokerCode: 'IX-SB-103',
    name: 'Kunal Deshmukh',
    companyName: 'Deshmukh & Associates',
    mobile: '+91 98901 22334',
    email: 'kunal@deshmukhadvisors.com',
    city: 'Nagpur',
    state: 'Maharashtra',
    panMasked: 'CDEFG****H',
    amfiOrReraNo: 'ARN-201994',
    tier: 'Silver',
    defaultPayoutSharePct: 65.0,
    totalBusinessVolume: 8400000,
    totalBrokerageEarned: 395000,
    pendingPayout: 21500,
    activeClientsCount: 19,
    bankAccountMasked: 'SBI •••• 9920',
    bankIfsc: 'SBIN0000432',
    status: 'active',
  },
  {
    id: 'sb-4',
    subBrokerCode: 'IX-SB-104',
    name: 'Amitabh Sen',
    companyName: 'Bengal Finvest Capital',
    mobile: '+91 98300 55667',
    email: 'amitabh@bengalfinvest.com',
    city: 'Kolkata',
    state: 'West Bengal',
    panMasked: 'DEFGH****I',
    amfiOrReraNo: 'ARN-119283',
    tier: 'Standard',
    defaultPayoutSharePct: 60.0,
    totalBusinessVolume: 4100000,
    totalBrokerageEarned: 184500,
    pendingPayout: 0,
    activeClientsCount: 11,
    bankAccountMasked: 'AXIS •••• 1102',
    bankIfsc: 'UTIB0000211',
    status: 'active',
  },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cl-1',
    clientCode: 'IX-CL-1001',
    fullName: 'Harish R. Vardhan',
    email: 'harish.vardhan@example.com',
    mobile: '+91 98201 11222',
    city: 'Mumbai',
    state: 'Maharashtra',
    panMasked: 'AAAPV****M',
    gstNo: '27AAAPV1234M1Z5',
    assignedStaffId: 'usr-2',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    totalPortfolioValue: 4800000,
    activePoliciesCount: 4,
    kycStatus: 'verified',
    createdAt: '2025-11-12T10:30:00Z',
    tags: ['HNI', 'Corporate Director', 'Cross-Sell Priority'],
  },
  {
    id: 'cl-2',
    clientCode: 'IX-CL-1002',
    fullName: 'Sunita Mehra',
    email: 'sunita.mehra@example.com',
    mobile: '+91 98202 33444',
    city: 'Pune',
    state: 'Maharashtra',
    panMasked: 'BBAPM****N',
    assignedStaffId: 'usr-2',
    subBrokerId: 'sb-2',
    subBrokerName: 'Pooja Agarwal (Prosper Financial)',
    totalPortfolioValue: 2400000,
    activePoliciesCount: 2,
    kycStatus: 'verified',
    createdAt: '2026-01-18T14:15:00Z',
    tags: ['Health Insurance', 'FD Investor'],
  },
  {
    id: 'cl-3',
    clientCode: 'IX-CL-1003',
    fullName: 'Deepak & Associates LLP',
    email: 'contact@deepakassociates.in',
    mobile: '+91 98203 55666',
    city: 'Mumbai',
    state: 'Maharashtra',
    panMasked: 'AABFD****K',
    gstNo: '27AABFD4491K1Z2',
    assignedStaffId: 'usr-2',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    totalPortfolioValue: 12500000,
    activePoliciesCount: 3,
    kycStatus: 'verified',
    createdAt: '2026-02-04T09:00:00Z',
    tags: ['Corporate Fleet', 'Group Health'],
  },
  {
    id: 'cl-4',
    clientCode: 'IX-CL-1004',
    fullName: 'Manish Chawla',
    email: 'manish.chawla@example.com',
    mobile: '+91 98901 77889',
    city: 'Nagpur',
    state: 'Maharashtra',
    panMasked: 'CCEPC****L',
    assignedStaffId: 'usr-2',
    subBrokerId: 'sb-3',
    subBrokerName: 'Kunal Deshmukh',
    totalPortfolioValue: 3500000,
    activePoliciesCount: 2,
    kycStatus: 'pending',
    createdAt: '2026-03-15T11:45:00Z',
    tags: ['Home Loan Borrower', 'Term Cover'],
  },
  {
    id: 'cl-5',
    clientCode: 'IX-CL-1005',
    fullName: 'Shalini Nambiar',
    email: 'shalini.nambiar@example.com',
    mobile: '+91 98450 99001',
    city: 'Bengaluru',
    state: 'Karnataka',
    panMasked: 'DDJPN****O',
    assignedStaffId: 'usr-2',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    totalPortfolioValue: 6200000,
    activePoliciesCount: 3,
    kycStatus: 'verified',
    createdAt: '2026-03-28T16:20:00Z',
    tags: ['Capital Gains 54EC', 'Corporate Bonds'],
  },
];

export const INITIAL_HEALTH_POLICIES: HealthInsurancePolicy[] = [
  {
    id: 'hp-1',
    policyNo: 'HI-2026-STAR-8819',
    clientId: 'cl-1',
    clientName: 'Harish R. Vardhan',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    insurer: 'Star Health',
    planName: 'Family Health Optima Plus',
    sumInsured: 2500000,
    annualPremium: 42500,
    policyStartDate: '2025-11-20',
    policyExpiryDate: '2026-11-19',
    renewalDueDate: '2026-11-19',
    paymentMode: 'Annual',
    status: 'active',
    commissionExpected: 6375, // 15%
    commissionReceived: 6375,
    subBrokerPayable: 4542.19, // 75% of 6375 - 5% TDS
    payoutStatus: 'paid',
  },
  {
    id: 'hp-2',
    policyNo: 'HI-2026-CARE-1102',
    clientId: 'cl-2',
    clientName: 'Sunita Mehra',
    subBrokerId: 'sb-2',
    subBrokerName: 'Pooja Agarwal (Prosper Financial)',
    insurer: 'Care Health',
    planName: 'Care Supreme Comprehensive',
    sumInsured: 1500000,
    annualPremium: 28400,
    policyStartDate: '2025-12-05',
    policyExpiryDate: '2026-12-04',
    renewalDueDate: '2026-12-04',
    paymentMode: 'Annual',
    status: 'active',
    commissionExpected: 4260,
    commissionReceived: 4260,
    subBrokerPayable: 2832.9,
    payoutStatus: 'paid',
  },
  {
    id: 'hp-3',
    policyNo: 'HI-2026-HDFC-9934',
    clientId: 'cl-3',
    clientName: 'Deepak & Associates LLP',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    insurer: 'HDFC ERGO',
    planName: 'my:health Suraksha Corporate Group',
    sumInsured: 5000000,
    annualPremium: 145000,
    policyStartDate: '2026-03-01',
    policyExpiryDate: '2027-02-28',
    renewalDueDate: '2027-02-28',
    paymentMode: 'Annual',
    status: 'active',
    commissionExpected: 21750,
    commissionReceived: 21750,
    subBrokerPayable: 15496.88,
    payoutStatus: 'approved',
  },
  {
    id: 'hp-4',
    policyNo: 'HI-2026-NIVA-3321',
    clientId: 'cl-4',
    clientName: 'Manish Chawla',
    subBrokerId: 'sb-3',
    subBrokerName: 'Kunal Deshmukh',
    insurer: 'Niva Bupa',
    planName: 'ReAssure 2.0 Titanium',
    sumInsured: 1000000,
    annualPremium: 19800,
    policyStartDate: '2025-10-30',
    policyExpiryDate: '2026-10-29',
    renewalDueDate: '2026-10-29',
    paymentMode: 'Annual',
    status: 'grace_period',
    commissionExpected: 2970,
    commissionReceived: 0,
    subBrokerPayable: 1833.98,
    payoutStatus: 'pending',
  },
];

export const INITIAL_MOTOR_POLICIES: MotorInsurancePolicy[] = [
  {
    id: 'mp-1',
    policyNo: 'MOT-ICICI-44120',
    vehicleNo: 'MH02-CW-9128',
    vehicleMakeModel: 'Hyundai Creta SX (O) 1.5 AT',
    policyType: 'Comprehensive',
    clientId: 'cl-1',
    clientName: 'Harish R. Vardhan',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    insurer: 'ICICI Lombard',
    idvAmount: 1420000,
    netPremium: 22400,
    grossPremium: 26432,
    policyStartDate: '2026-01-10',
    policyExpiryDate: '2027-01-09',
    status: 'active',
    commissionExpected: 3360, // 15% on OD
    commissionReceived: 3360,
    subBrokerPayable: 2394,
    payoutStatus: 'paid',
  },
  {
    id: 'mp-2',
    policyNo: 'MOT-BAJAJ-77192',
    vehicleNo: 'MH12-TY-3301',
    vehicleMakeModel: 'Toyota Innova Hycross ZX',
    policyType: 'Comprehensive',
    clientId: 'cl-2',
    clientName: 'Sunita Mehra',
    subBrokerId: 'sb-2',
    subBrokerName: 'Pooja Agarwal (Prosper Financial)',
    insurer: 'Bajaj Allianz',
    idvAmount: 2850000,
    netPremium: 38200,
    grossPremium: 45076,
    policyStartDate: '2025-11-15',
    policyExpiryDate: '2026-11-14',
    status: 'active',
    commissionExpected: 5730,
    commissionReceived: 5730,
    subBrokerPayable: 3810.45,
    payoutStatus: 'approved',
  },
  {
    id: 'mp-3',
    policyNo: 'MOT-TATA-11209',
    vehicleNo: 'MH04-KP-8822',
    vehicleMakeModel: 'Tata Nexon EV Empowered',
    policyType: 'Comprehensive',
    clientId: 'cl-3',
    clientName: 'Deepak & Associates LLP',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    insurer: 'Tata AIG',
    idvAmount: 1800000,
    netPremium: 26000,
    grossPremium: 30680,
    policyStartDate: '2026-02-20',
    policyExpiryDate: '2027-02-19',
    status: 'active',
    commissionExpected: 3900,
    commissionReceived: 3900,
    subBrokerPayable: 2778.75,
    payoutStatus: 'paid',
  },
];

export const INITIAL_LIFE_POLICIES: LifeInsurancePolicy[] = [
  {
    id: 'lp-1',
    policyNo: 'LIC-TERM-9912803',
    clientId: 'cl-1',
    clientName: 'Harish R. Vardhan',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    insurer: 'LIC of India',
    planType: 'Term Plan',
    planName: 'Tech Term Non-Smoking Pure Life Cover',
    sumAssured: 20000000,
    policyTermYears: 30,
    premiumPaymentTerm: 30,
    annualPremium: 34200,
    policyDate: '2025-08-10',
    nextPremiumDate: '2026-08-10',
    status: 'in_force',
    commissionExpected: 8550, // 25% first year
    commissionReceived: 8550,
    subBrokerPayable: 6091.88,
    payoutStatus: 'paid',
  },
  {
    id: 'lp-2',
    policyNo: 'HDFC-LIFE-440192',
    clientId: 'cl-5',
    clientName: 'Shalini Nambiar',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    insurer: 'HDFC Life',
    planType: 'Guaranteed Return',
    planName: 'Sanchay Plus Long Term Guaranteed Income',
    sumAssured: 5000000,
    policyTermYears: 20,
    premiumPaymentTerm: 10,
    annualPremium: 100000,
    policyDate: '2026-02-14',
    nextPremiumDate: '2027-02-14',
    status: 'in_force',
    commissionExpected: 25000, // 25%
    commissionReceived: 25000,
    subBrokerPayable: 17812.5,
    payoutStatus: 'approved',
  },
  {
    id: 'lp-3',
    policyNo: 'MAX-TERM-88129',
    clientId: 'cl-4',
    clientName: 'Manish Chawla',
    subBrokerId: 'sb-3',
    subBrokerName: 'Kunal Deshmukh',
    insurer: 'Max Life',
    planType: 'Term Plan',
    planName: 'Smart Secure Plus Plan',
    sumAssured: 15000000,
    policyTermYears: 25,
    premiumPaymentTerm: 25,
    annualPremium: 22600,
    policyDate: '2026-03-20',
    nextPremiumDate: '2027-03-20',
    status: 'in_force',
    commissionExpected: 5650,
    commissionReceived: 0,
    subBrokerPayable: 3488.88,
    payoutStatus: 'pending',
  },
];

export const INITIAL_FIXED_DEPOSITS: FixedDeposit[] = [
  {
    id: 'fd-1',
    applicationNo: 'FD-BJF-99210',
    clientId: 'cl-2',
    clientName: 'Sunita Mehra',
    subBrokerId: 'sb-2',
    subBrokerName: 'Pooja Agarwal (Prosper Financial)',
    provider: 'Bajaj Finance Ltd',
    depositAmount: 1500000,
    tenureMonths: 36,
    interestRatePct: 8.35,
    interestPayoutFrequency: 'Annual',
    depositDate: '2025-06-15',
    maturityDate: '2028-06-15',
    maturityAmount: 1875375,
    status: 'active',
    commissionExpected: 18750, // 1.25%
    commissionReceived: 18750,
    subBrokerPayable: 12468.75, // 70% share - 5% TDS
    payoutStatus: 'paid',
  },
  {
    id: 'fd-2',
    applicationNo: 'FD-SHR-44109',
    clientId: 'cl-1',
    clientName: 'Harish R. Vardhan',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    provider: 'Shriram Finance',
    depositAmount: 1000000,
    tenureMonths: 24,
    interestRatePct: 8.6,
    interestPayoutFrequency: 'Cumulative',
    depositDate: '2025-09-20',
    maturityDate: '2027-09-20',
    maturityAmount: 1184350,
    status: 'active',
    commissionExpected: 15000, // 1.50%
    commissionReceived: 15000,
    subBrokerPayable: 10687.5,
    payoutStatus: 'paid',
  },
  {
    id: 'fd-3',
    applicationNo: 'FD-HDFC-33291',
    clientId: 'cl-3',
    clientName: 'Deepak & Associates LLP',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    provider: 'HDFC Bank Ltd',
    depositAmount: 2500000,
    tenureMonths: 12,
    interestRatePct: 7.25,
    interestPayoutFrequency: 'Quarterly',
    depositDate: '2025-11-01',
    maturityDate: '2026-11-01',
    maturityAmount: 2685000,
    status: 'active',
    commissionExpected: 12500, // 0.50%
    commissionReceived: 12500,
    subBrokerPayable: 8906.25,
    payoutStatus: 'approved',
  },
];

export const INITIAL_BONDS: Bond[] = [
  {
    id: 'bd-1',
    applicationNo: 'BND-REC-2025-01',
    isinNo: 'INE020B08DF2',
    clientId: 'cl-5',
    clientName: 'Shalini Nambiar',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    issuer: 'REC Ltd (54EC)',
    bondType: 'Capital Gains 54EC',
    faceValuePerUnit: 10000,
    unitsAllocated: 500,
    totalInvestment: 5000000,
    couponRatePct: 5.25,
    annualInterestPayout: 262500,
    issueDate: '2025-10-15',
    maturityDate: '2030-10-15',
    status: 'allotted',
    commissionExpected: 25000, // 0.50%
    commissionReceived: 25000,
    subBrokerPayable: 17812.5,
    payoutStatus: 'paid',
  },
  {
    id: 'bd-2',
    applicationNo: 'BND-NHAI-2026-04',
    isinNo: 'INE906B08HN8',
    clientId: 'cl-1',
    clientName: 'Harish R. Vardhan',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    issuer: 'NHAI (54EC)',
    bondType: 'Capital Gains 54EC',
    faceValuePerUnit: 10000,
    unitsAllocated: 250,
    totalInvestment: 2500000,
    couponRatePct: 5.25,
    annualInterestPayout: 131250,
    issueDate: '2026-01-20',
    maturityDate: '2031-01-20',
    status: 'allotted',
    commissionExpected: 12500,
    commissionReceived: 12500,
    subBrokerPayable: 8906.25,
    payoutStatus: 'approved',
  },
  {
    id: 'bd-3',
    applicationNo: 'BND-TATA-2026-11',
    isinNo: 'INE306N07LG1',
    clientId: 'cl-3',
    clientName: 'Deepak & Associates LLP',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    issuer: 'Tata Capital NCD',
    bondType: 'Corporate NCD',
    faceValuePerUnit: 1000,
    unitsAllocated: 2000,
    totalInvestment: 2000000,
    couponRatePct: 8.9,
    annualInterestPayout: 178000,
    issueDate: '2026-03-05',
    maturityDate: '2029-03-05',
    status: 'allotted',
    commissionExpected: 16000, // 0.80%
    commissionReceived: 16000,
    subBrokerPayable: 11400,
    payoutStatus: 'pending',
  },
];

export const INITIAL_LOANS: LoanApplication[] = [
  {
    id: 'ln-1',
    applicationNo: 'LN-HDFC-99120',
    clientId: 'cl-4',
    clientName: 'Manish Chawla',
    subBrokerId: 'sb-3',
    subBrokerName: 'Kunal Deshmukh',
    lender: 'HDFC Bank',
    loanType: 'Home Loan',
    requestedAmount: 5500000,
    sanctionedAmount: 5000000,
    disbursedAmount: 5000000,
    roiPct: 8.45,
    stage: 'disbursed',
    submissionDate: '2026-01-15',
    disbursementDate: '2026-02-18',
    expectedPayout: 32500, // 0.65%
    receivedPayout: 32500,
    subBrokerPayout: 20068.75, // 65% - 5% TDS
    payoutStatus: 'paid',
  },
  {
    id: 'ln-2',
    applicationNo: 'LN-SBI-44129',
    clientId: 'cl-1',
    clientName: 'Harish R. Vardhan',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    lender: 'State Bank of India',
    loanType: 'Loan Against Property',
    requestedAmount: 12000000,
    sanctionedAmount: 10000000,
    disbursedAmount: 10000000,
    roiPct: 9.15,
    stage: 'disbursed',
    submissionDate: '2026-02-01',
    disbursementDate: '2026-03-12',
    expectedPayout: 75000, // 0.75%
    receivedPayout: 75000,
    subBrokerPayout: 53437.5, // 75% - 5% TDS
    payoutStatus: 'approved',
  },
  {
    id: 'ln-3',
    applicationNo: 'LN-TATA-33108',
    clientId: 'cl-3',
    clientName: 'Deepak & Associates LLP',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    lender: 'Tata Capital',
    loanType: 'Business Loan',
    requestedAmount: 3500000,
    sanctionedAmount: 3000000,
    disbursedAmount: 0,
    roiPct: 11.5,
    stage: 'sanctioned',
    submissionDate: '2026-03-25',
    expectedPayout: 36000, // 1.20%
    receivedPayout: 0,
    subBrokerPayout: 25650,
    payoutStatus: 'pending',
  },
];

export const INITIAL_BROKERAGE_RULES: BrokerageRule[] = [
  {
    id: 'rule-1',
    ruleCode: 'BR-HLT-STAR-01',
    productCategory: 'Health Insurance',
    provider: 'Star Health',
    transactionType: 'Fresh',
    partnerTier: 'All',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    companyCommissionPct: 15.0,
    companyFlatInr: 0,
    subBrokerSharePct: 75.0,
    subBrokerFlatInr: 0,
    minSlabAmount: 0,
    maxSlabAmount: 500000,
    tdsDeductionPct: 5.0,
    status: 'active',
    version: 1,
    notes: 'IRDAI compliant standard health commission structure',
  },
  {
    id: 'rule-2',
    ruleCode: 'BR-HLT-CARE-01',
    productCategory: 'Health Insurance',
    provider: 'Care Health',
    transactionType: 'Fresh',
    partnerTier: 'All',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    companyCommissionPct: 15.0,
    companyFlatInr: 0,
    subBrokerSharePct: 70.0,
    subBrokerFlatInr: 0,
    minSlabAmount: 0,
    maxSlabAmount: 1000000,
    tdsDeductionPct: 5.0,
    status: 'active',
    version: 1,
  },
  {
    id: 'rule-3',
    ruleCode: 'BR-MOT-ICICI-01',
    productCategory: 'Motor Insurance',
    provider: 'ICICI Lombard',
    transactionType: 'Fresh',
    partnerTier: 'All',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    companyCommissionPct: 15.0,
    companyFlatInr: 0,
    subBrokerSharePct: 75.0,
    subBrokerFlatInr: 0,
    minSlabAmount: 0,
    maxSlabAmount: 200000,
    tdsDeductionPct: 5.0,
    status: 'active',
    version: 2,
  },
  {
    id: 'rule-4',
    ruleCode: 'BR-LIFE-LIC-01',
    productCategory: 'Life Insurance',
    provider: 'LIC of India',
    transactionType: 'Fresh',
    partnerTier: 'All',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    companyCommissionPct: 25.0,
    companyFlatInr: 0,
    subBrokerSharePct: 75.0,
    subBrokerFlatInr: 0,
    minSlabAmount: 0,
    maxSlabAmount: 500000,
    tdsDeductionPct: 5.0,
    status: 'active',
    version: 1,
    notes: 'Year 1 pure term fresh business agency sharing',
  },
  {
    id: 'rule-5',
    ruleCode: 'BR-FD-BAJAJ-01',
    productCategory: 'Fixed Deposits',
    provider: 'Bajaj Finance Ltd',
    transactionType: 'Fresh',
    partnerTier: 'All',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    companyCommissionPct: 1.25,
    companyFlatInr: 0,
    subBrokerSharePct: 70.0,
    subBrokerFlatInr: 0,
    minSlabAmount: 50000,
    maxSlabAmount: 5000000,
    tdsDeductionPct: 5.0,
    status: 'active',
    version: 3,
  },
  {
    id: 'rule-6',
    ruleCode: 'BR-BND-REC-01',
    productCategory: 'Bonds',
    provider: 'REC Ltd (54EC)',
    transactionType: 'Fresh',
    partnerTier: 'All',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    companyCommissionPct: 0.5,
    companyFlatInr: 0,
    subBrokerSharePct: 75.0,
    subBrokerFlatInr: 0,
    minSlabAmount: 100000,
    maxSlabAmount: 5000000,
    tdsDeductionPct: 5.0,
    status: 'active',
    version: 1,
  },
  {
    id: 'rule-7',
    ruleCode: 'BR-LN-HDFC-01',
    productCategory: 'Loans',
    provider: 'HDFC Bank',
    transactionType: 'Fresh',
    partnerTier: 'All',
    effectiveFrom: '2026-04-01',
    effectiveTo: '2027-03-31',
    companyCommissionPct: 0.65,
    companyFlatInr: 0,
    subBrokerSharePct: 65.0,
    subBrokerFlatInr: 0,
    minSlabAmount: 2500000,
    maxSlabAmount: 50000000,
    tdsDeductionPct: 5.0,
    status: 'active',
    version: 1,
  },
];

export const INITIAL_TRANSACTIONS: BrokerageTransaction[] = [
  {
    id: 'txn-1',
    transactionNo: 'TXN-2026-0912',
    productType: 'Health Insurance',
    referenceNo: 'HI-2026-STAR-8819',
    clientName: 'Harish R. Vardhan',
    clientId: 'cl-1',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    grossBusinessValue: 42500,
    companyCommissionExpected: 6375,
    companyCommissionReceived: 6375,
    subBrokerSharePct: 75.0,
    subBrokerGrossPayable: 4781.25,
    tdsDeducted: 239.06,
    subBrokerNetPayable: 4542.19,
    investxindiaRetained: 1593.75,
    status: 'paid',
    receiptDate: '2025-11-25',
    paymentRefNo: 'CMS-HDFC-99120',
    ruleVersionApplied: 'v1 (BR-HLT-STAR-01)',
  },
  {
    id: 'txn-2',
    transactionNo: 'TXN-2026-0913',
    productType: 'Motor Insurance',
    referenceNo: 'MOT-ICICI-44120',
    clientName: 'Harish R. Vardhan',
    clientId: 'cl-1',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    grossBusinessValue: 22400,
    companyCommissionExpected: 3360,
    companyCommissionReceived: 3360,
    subBrokerSharePct: 75.0,
    subBrokerGrossPayable: 2520,
    tdsDeducted: 126,
    subBrokerNetPayable: 2394,
    investxindiaRetained: 840,
    status: 'paid',
    receiptDate: '2026-01-15',
    paymentRefNo: 'NEFT-ICICI-8841',
    ruleVersionApplied: 'v2 (BR-MOT-ICICI-01)',
  },
  {
    id: 'txn-3',
    transactionNo: 'TXN-2026-0914',
    productType: 'Fixed Deposits',
    referenceNo: 'FD-BJF-99210',
    clientName: 'Sunita Mehra',
    clientId: 'cl-2',
    subBrokerId: 'sb-2',
    subBrokerName: 'Pooja Agarwal (Prosper Financial)',
    grossBusinessValue: 1500000,
    companyCommissionExpected: 18750,
    companyCommissionReceived: 18750,
    subBrokerSharePct: 70.0,
    subBrokerGrossPayable: 13125,
    tdsDeducted: 656.25,
    subBrokerNetPayable: 12468.75,
    investxindiaRetained: 5625,
    status: 'paid',
    receiptDate: '2025-06-25',
    paymentRefNo: 'RTGS-BJF-11029',
    ruleVersionApplied: 'v3 (BR-FD-BAJAJ-01)',
  },
  {
    id: 'txn-4',
    transactionNo: 'TXN-2026-0915',
    productType: 'Health Insurance',
    referenceNo: 'HI-2026-HDFC-9934',
    clientName: 'Deepak & Associates LLP',
    clientId: 'cl-3',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    grossBusinessValue: 145000,
    companyCommissionExpected: 21750,
    companyCommissionReceived: 21750,
    subBrokerSharePct: 75.0,
    subBrokerGrossPayable: 16312.5,
    tdsDeducted: 815.62,
    subBrokerNetPayable: 15496.88,
    investxindiaRetained: 5437.5,
    status: 'approved',
    receiptDate: '2026-03-05',
    paymentRefNo: 'NEFT-HDFC-4419',
    ruleVersionApplied: 'v1 (BR-HLT-CARE-01)',
  },
  {
    id: 'txn-5',
    transactionNo: 'TXN-2026-0916',
    productType: 'Loans',
    referenceNo: 'LN-SBI-44129',
    clientName: 'Harish R. Vardhan',
    clientId: 'cl-1',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    grossBusinessValue: 10000000,
    companyCommissionExpected: 75000,
    companyCommissionReceived: 75000,
    subBrokerSharePct: 75.0,
    subBrokerGrossPayable: 56250,
    tdsDeducted: 2812.5,
    subBrokerNetPayable: 53437.5,
    investxindiaRetained: 18750,
    status: 'approved',
    receiptDate: '2026-03-18',
    paymentRefNo: 'CMS-SBI-3301',
    ruleVersionApplied: 'v1 (BR-LN-HDFC-01)',
  },
  {
    id: 'txn-6',
    transactionNo: 'TXN-2026-0917',
    productType: 'Bonds',
    referenceNo: 'BND-TATA-2026-11',
    clientName: 'Deepak & Associates LLP',
    clientId: 'cl-3',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi (Apex Wealth)',
    grossBusinessValue: 2000000,
    companyCommissionExpected: 16000,
    companyCommissionReceived: 0,
    subBrokerSharePct: 75.0,
    subBrokerGrossPayable: 12000,
    tdsDeducted: 600,
    subBrokerNetPayable: 11400,
    investxindiaRetained: 4000,
    status: 'expected',
    ruleVersionApplied: 'v1 (BR-BND-REC-01)',
  },
];

export const INITIAL_PAYOUTS: PartnerPayout[] = [
  {
    id: 'pay-1',
    payoutBatchNo: 'IX-PAY-2026-M02',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi',
    subBrokerCode: 'IX-SB-101',
    period: 'February 2026',
    transactionCount: 8,
    grossPayable: 124500,
    tdsDeducted: 6225,
    netDisbursed: 118275,
    paymentMode: 'RTGS',
    bankReferenceNo: 'HDFCR52026022800412891',
    disbursementDate: '2026-02-28',
    status: 'completed',
    approvedBy: 'Rajiv Malhotra (Super Admin)',
  },
  {
    id: 'pay-2',
    payoutBatchNo: 'IX-PAY-2026-M03',
    subBrokerId: 'sb-2',
    subBrokerName: 'Pooja Agarwal',
    subBrokerCode: 'IX-SB-102',
    period: 'March 2026',
    transactionCount: 4,
    grossPayable: 44200,
    tdsDeducted: 2210,
    netDisbursed: 41990,
    paymentMode: 'NEFT',
    bankReferenceNo: 'ICICN2026033100881923',
    disbursementDate: '2026-03-31',
    status: 'completed',
    approvedBy: 'Rajiv Malhotra (Super Admin)',
  },
  {
    id: 'pay-3',
    payoutBatchNo: 'IX-PAY-2026-M04',
    subBrokerId: 'sb-1',
    subBrokerName: 'Vikram Joshi',
    subBrokerCode: 'IX-SB-101',
    period: 'April 2026',
    transactionCount: 3,
    grossPayable: 72562.5,
    tdsDeducted: 3628.12,
    netDisbursed: 68934.38,
    paymentMode: 'RTGS',
    bankReferenceNo: 'Pending Generation',
    disbursementDate: '2026-04-30',
    status: 'pending_approval',
    approvedBy: 'Pending Authorization',
  },
];

export const INITIAL_BUSINESS_TARGETS: BusinessTarget[] = [
  {
    id: 'tgt-1',
    entityName: 'Vikram Joshi (Apex Wealth)',
    entityType: 'Sub-Broker',
    productCategory: 'Health Insurance',
    month: 'April',
    year: 2026,
    targetAmount: 500000,
    achievedAmount: 485000,
    status: 'on_track',
  },
  {
    id: 'tgt-2',
    entityName: 'Vikram Joshi (Apex Wealth)',
    entityType: 'Sub-Broker',
    productCategory: 'Bonds & FDs',
    month: 'April',
    year: 2026,
    targetAmount: 5000000,
    achievedAmount: 7500000,
    status: 'exceeded',
  },
  {
    id: 'tgt-3',
    entityName: 'Neha Singhal (Operations)',
    entityType: 'Staff',
    productCategory: 'Overall Volume',
    month: 'April',
    year: 2026,
    targetAmount: 20000000,
    achievedAmount: 18500000,
    status: 'on_track',
  },
  {
    id: 'tgt-4',
    entityName: 'Kunal Deshmukh',
    entityType: 'Sub-Broker',
    productCategory: 'Loans & Mortgages',
    month: 'April',
    year: 2026,
    targetAmount: 10000000,
    achievedAmount: 5000000,
    status: 'lagging',
  },
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'Client PAN & Aadhaar KYC Bundle',
    documentCategory: 'KYC',
    relatedEntity: 'Harish R. Vardhan (IX-CL-1001)',
    entityType: 'Client',
    fileUrl: '#',
    fileName: 'KYC_Harish_Vardhan_Masked.pdf',
    fileSize: '1.4 MB',
    fileSizeBytes: 1468006,
    mimeType: 'application/pdf',
    storagePath: 'private/clients/cl-1/kyc/KYC_Harish_Vardhan_Masked.pdf',
    isPrivate: true,
    sha256Checksum: '8f4c2e6b1a9d4c7e3f5b0a1d8e7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c',
    uploadedAt: '2025-11-12T11:00:00Z',
    uploadedBy: 'Neha Singhal',
    verified: true,
    accessLog: [
      {
        id: 'acc-1',
        accessedBy: 'Rajiv Malhotra',
        role: 'super_admin',
        accessedAt: '2026-04-10T09:30:00Z',
        ipAddress: '103.21.144.12',
        action: 'preview',
        tokenUsed: 'sig_f93e1a0b_900',
      },
    ],
  },
  {
    id: 'doc-2',
    title: 'Star Health Optima Secure Policy Copy',
    documentCategory: 'Policy Copy',
    relatedEntity: 'HI-2026-STAR-8819',
    entityType: 'Policy',
    fileUrl: '#',
    fileName: 'Star_Health_Policy_HI8819.pdf',
    fileSize: '840 KB',
    fileSizeBytes: 860160,
    mimeType: 'application/pdf',
    storagePath: 'private/policies/HI-2026-STAR-8819/Star_Health_Policy_HI8819.pdf',
    isPrivate: true,
    sha256Checksum: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
    uploadedAt: '2025-11-20T14:30:00Z',
    uploadedBy: 'Neha Singhal',
    verified: true,
    accessLog: [],
  },
  {
    id: 'doc-3',
    title: 'Sub-Broker Distribution Agreement & ARN',
    documentCategory: 'Brokerage Agreement',
    relatedEntity: 'Vikram Joshi (IX-SB-101)',
    entityType: 'Sub-Broker',
    fileUrl: '#',
    fileName: 'Agreement_Apex_Wealth_2025.pdf',
    fileSize: '2.1 MB',
    fileSizeBytes: 2202009,
    mimeType: 'application/pdf',
    storagePath: 'private/sub_brokers/sb-1/agreements/Agreement_Apex_Wealth_2025.pdf',
    isPrivate: true,
    sha256Checksum: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
    uploadedAt: '2025-04-01T09:15:00Z',
    uploadedBy: 'Rajiv Malhotra',
    verified: true,
    accessLog: [],
  },
  {
    id: 'doc-4',
    title: 'REC 54EC Bond Allotment Advice',
    documentCategory: 'Policy Copy',
    relatedEntity: 'BND-REC-2025-01',
    entityType: 'Policy',
    fileUrl: '#',
    fileName: 'REC_54EC_Allotment_Shalini_N.pdf',
    fileSize: '520 KB',
    fileSizeBytes: 532480,
    mimeType: 'application/pdf',
    storagePath: 'private/bonds/bd-1/REC_54EC_Allotment_Shalini_N.pdf',
    isPrivate: true,
    sha256Checksum: 'ccddeeff11223344556677889900aabbccddeeff11223344556677889900aabb',
    uploadedAt: '2025-10-18T16:00:00Z',
    uploadedBy: 'Neha Singhal',
    verified: true,
    accessLog: [],
  },
  {
    id: 'doc-5',
    title: 'NACH Mandate & Cancelled Cheque (HDFC Bank)',
    documentCategory: 'Mandate',
    relatedEntity: 'Harish R. Vardhan (IX-CL-1001)',
    entityType: 'Client',
    fileUrl: '#',
    fileName: 'NACH_Mandate_Harish_Vardhan.pdf',
    fileSize: '680 KB',
    fileSizeBytes: 696320,
    mimeType: 'application/pdf',
    storagePath: 'private/clients/cl-1/mandates/NACH_Mandate_Harish_Vardhan.pdf',
    isPrivate: true,
    sha256Checksum: 'eeff11223344556677889900aabbccddeeff11223344556677889900aabbccdd',
    uploadedAt: '2025-11-15T11:20:00Z',
    uploadedBy: 'Neha Singhal',
    verified: true,
    accessLog: [],
  },
  {
    id: 'doc-6',
    title: 'GST Registration Certificate (Prosper Financial)',
    documentCategory: 'GST Certificate',
    relatedEntity: 'Pooja Agarwal (IX-SB-102)',
    entityType: 'Sub-Broker',
    fileUrl: '#',
    fileName: 'GST_Certificate_Prosper_Financial.pdf',
    fileSize: '410 KB',
    fileSizeBytes: 419840,
    mimeType: 'application/pdf',
    storagePath: 'private/sub_brokers/sb-2/gst/GST_Certificate_Prosper_Financial.pdf',
    isPrivate: true,
    sha256Checksum: '9900aabbccddeeff11223344556677889900aabbccddeeff1122334455667788',
    uploadedAt: '2025-05-10T14:40:00Z',
    uploadedBy: 'Neha Singhal',
    verified: true,
    accessLog: [],
  },
];

export const INITIAL_IMPORT_JOBS: ImportJob[] = [
  {
    id: 'job-1',
    jobNo: 'IX-JOB-2026-0401',
    module: 'Health Insurance',
    fileName: 'Star_Health_Policy_Dump_April.xlsx',
    fileFormat: 'xlsx',
    totalRows: 120,
    successCount: 118,
    errorCount: 2,
    duplicateCount: 1,
    importedBy: 'Neha Singhal',
    importedAt: '2026-04-18T10:30:00Z',
    status: 'completed_with_errors',
    errorDetails: [
      { row: 42, field: 'Policy_Number', message: 'Identifier HI-2026-STAR-8819 already exists in the system', rejectedValue: 'HI-2026-STAR-8819' },
      { row: 89, field: 'Annual_Premium', message: 'Invalid financial amount "-1500"', rejectedValue: '-1500' },
    ],
  },
  {
    id: 'job-2',
    jobNo: 'IX-JOB-2026-0402',
    module: 'Fixed Deposits',
    fileName: 'Bajaj_Finance_FD_Book_Q1.xlsx',
    fileFormat: 'xlsx',
    totalRows: 45,
    successCount: 45,
    errorCount: 0,
    duplicateCount: 0,
    importedBy: 'Rajiv Malhotra',
    importedAt: '2026-04-19T14:15:00Z',
    status: 'completed',
  },
  {
    id: 'job-3',
    jobNo: 'IX-JOB-2026-0403',
    module: 'Clients',
    fileName: 'New_Corporate_Clients_Import.csv',
    fileFormat: 'csv',
    totalRows: 15,
    successCount: 15,
    errorCount: 0,
    duplicateCount: 0,
    importedBy: 'Neha Singhal',
    importedAt: '2026-04-20T16:45:00Z',
    status: 'completed',
  },
];

export const INITIAL_TASKS: TaskReminder[] = [
  {
    id: 'tsk-1',
    title: 'Follow up on Star Health Policy Renewal (Grace Period)',
    description: 'Call Manish Chawla for Niva Bupa premium payment renewal before policy lapses.',
    priority: 'high',
    dueDate: '2026-10-28',
    relatedTo: 'Niva Bupa (HI-2026-NIVA-3321)',
    assignedTo: 'Neha Singhal',
    status: 'pending',
    reminderType: 'Renewal Followup',
  },
  {
    id: 'tsk-2',
    title: 'Disburse Sub-Broker April Payout Batch',
    description: 'Super Admin approval required for April payout batch IX-PAY-2026-M04 (₹68,934.38).',
    priority: 'high',
    dueDate: '2026-04-30',
    relatedTo: 'Vikram Joshi (IX-SB-101)',
    assignedTo: 'Rajiv Malhotra',
    status: 'in_progress',
    reminderType: 'Payout Query',
  },
  {
    id: 'tsk-3',
    title: 'Collect KYC Address Proof for Manish Chawla',
    description: 'Current utility bill pending for Loan & Insurance file completion.',
    priority: 'medium',
    dueDate: '2026-05-05',
    relatedTo: 'Manish Chawla (IX-CL-1004)',
    assignedTo: 'Neha Singhal',
    status: 'pending',
    reminderType: 'Document Collection',
  },
  {
    id: 'tsk-4',
    title: 'Intimate HDFC Bank FD Maturity to Client',
    description: 'Deepak & Associates FD of ₹25,00,000 maturing in November 2026; prepare rollover options.',
    priority: 'low',
    dueDate: '2026-10-15',
    relatedTo: 'Deepak & Associates LLP',
    assignedTo: 'Neha Singhal',
    status: 'pending',
    reminderType: 'Maturity Intimation',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: '2026-04-22T08:14:22Z',
    actorName: 'Rajiv Malhotra',
    actorRole: 'super_admin',
    action: 'BROKERAGE_RULE_UPDATED',
    entityType: 'BrokerageRule',
    entityId: 'BR-FD-BAJAJ-01',
    ipAddress: '103.21.144.12 (Mumbai, IN)',
    details: 'Incremented rule version to v3: adjusted company commission slab to 1.25%',
  },
  {
    id: 'aud-2',
    timestamp: '2026-04-21T14:32:10Z',
    actorName: 'Neha Singhal',
    actorRole: 'staff',
    action: 'POLICY_RECORD_CREATED',
    entityType: 'HealthInsurancePolicy',
    entityId: 'HI-2026-HDFC-9934',
    ipAddress: '103.21.144.18 (Mumbai, IN)',
    details: 'Created corporate group health policy for Deepak & Associates LLP (Sum Insured ₹50L)',
  },
  {
    id: 'aud-3',
    timestamp: '2026-04-20T11:05:44Z',
    actorName: 'Rajiv Malhotra',
    actorRole: 'super_admin',
    action: 'PAYOUT_BATCH_AUTHORIZED',
    entityType: 'PartnerPayout',
    entityId: 'IX-PAY-2026-M03',
    ipAddress: '103.21.144.12 (Mumbai, IN)',
    details: 'Authorized RTGS payout release of ₹41,990 to Pooja Agarwal (Prosper Financial)',
  },
];

// LocalStorage Persistence Keys
const STORAGE_PREFIX = 'ifbms_';
const KEYS = {
  CLIENTS: `${STORAGE_PREFIX}clients`,
  SUB_BROKERS: `${STORAGE_PREFIX}sub_brokers`,
  HEALTH: `${STORAGE_PREFIX}health`,
  MOTOR: `${STORAGE_PREFIX}motor`,
  LIFE: `${STORAGE_PREFIX}life`,
  FDS: `${STORAGE_PREFIX}fds`,
  BONDS: `${STORAGE_PREFIX}bonds`,
  LOANS: `${STORAGE_PREFIX}loans`,
  RULES: `${STORAGE_PREFIX}rules`,
  TXNS: `${STORAGE_PREFIX}txns`,
  PAYOUTS: `${STORAGE_PREFIX}payouts`,
  TARGETS: `${STORAGE_PREFIX}targets`,
  DOCS: `${STORAGE_PREFIX}docs`,
  IMPORT_JOBS: `${STORAGE_PREFIX}import_jobs`,
  TASKS: `${STORAGE_PREFIX}tasks`,
  AUDIT: `${STORAGE_PREFIX}audit`,
  ZERO_STATE_MODE: `${STORAGE_PREFIX}zero_state_mode`,
  ACTIVE_USER_ID: `${STORAGE_PREFIX}active_user_id`,
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * DataStore Class providing reactive state for IFBMS
 */
class DataStore {
  private subscribers: Array<() => void> = [];

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  notify() {
    this.subscribers.forEach((cb) => cb());
  }

  isZeroStateMode(): boolean {
    return getStored<boolean>(KEYS.ZERO_STATE_MODE, false);
  }

  setZeroStateMode(val: boolean) {
    setStored(KEYS.ZERO_STATE_MODE, val);
    this.notify();
  }

  getActiveUser(): UserProfile {
    const userId = getStored<string>(KEYS.ACTIVE_USER_ID, 'usr-1');
    return INITIAL_USERS.find((u) => u.id === userId) || INITIAL_USERS[0];
  }

  setActiveUser(userId: string) {
    setStored(KEYS.ACTIVE_USER_ID, userId);
    this.logAudit('USER_ROLE_SWITCH', 'UserProfile', userId, `Switched active perspective to ${userId}`);
    this.notify();
  }

  // Clients
  getClients(): Client[] {
    if (this.isZeroStateMode()) return [];
    return getStored<Client[]>(KEYS.CLIENTS, INITIAL_CLIENTS);
  }

  addClient(client: Omit<Client, 'id' | 'createdAt'>): Client {
    const clients = this.getClients();
    const newClient: Client = {
      ...client,
      id: `cl-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newClient, ...clients];
    setStored(KEYS.CLIENTS, updated);
    this.logAudit('CLIENT_CREATED', 'Client', newClient.id, `Created client ${newClient.fullName} (${newClient.clientCode})`);
    this.notify();
    return newClient;
  }

  updateClient(client: Client) {
    const clients = this.getClients().map((c) => (c.id === client.id ? client : c));
    setStored(KEYS.CLIENTS, clients);
    this.logAudit('CLIENT_UPDATED', 'Client', client.id, `Updated client ${client.fullName}`);
    this.notify();
  }

  deleteClient(id: string) {
    const clients = this.getClients().filter((c) => c.id !== id);
    setStored(KEYS.CLIENTS, clients);
    this.logAudit('CLIENT_DELETED', 'Client', id, `Deleted client ${id}`);
    this.notify();
  }

  // Sub Brokers
  getSubBrokers(): SubBroker[] {
    if (this.isZeroStateMode()) return [];
    return getStored<SubBroker[]>(KEYS.SUB_BROKERS, INITIAL_SUB_BROKERS);
  }

  addSubBroker(broker: Omit<SubBroker, 'id'>): SubBroker {
    const brokers = this.getSubBrokers();
    const newBroker: SubBroker = {
      ...broker,
      id: `sb-${Date.now()}`,
    };
    const updated = [newBroker, ...brokers];
    setStored(KEYS.SUB_BROKERS, updated);
    this.logAudit('SUB_BROKER_CREATED', 'SubBroker', newBroker.id, `Registered partner ${newBroker.name} (${newBroker.subBrokerCode})`);
    this.notify();
    return newBroker;
  }

  // Health Policies
  getHealthPolicies(): HealthInsurancePolicy[] {
    if (this.isZeroStateMode()) return [];
    return getStored<HealthInsurancePolicy[]>(KEYS.HEALTH, INITIAL_HEALTH_POLICIES);
  }

  addHealthPolicy(policy: Omit<HealthInsurancePolicy, 'id'>) {
    const items = this.getHealthPolicies();
    const newItem: HealthInsurancePolicy = { ...policy, id: `hp-${Date.now()}` };
    setStored(KEYS.HEALTH, [newItem, ...items]);
    this.createTransactionForPolicy('Health Insurance', newItem.policyNo, newItem.clientName, newItem.clientId, newItem.subBrokerId, newItem.subBrokerName, newItem.annualPremium, newItem.commissionExpected, newItem.subBrokerPayable);
    this.logAudit('HEALTH_POLICY_CREATED', 'HealthInsurancePolicy', newItem.policyNo, `Issued ${newItem.insurer} policy for ${newItem.clientName}`);
    this.notify();
    return newItem;
  }

  updateHealthPolicy(policy: HealthInsurancePolicy) {
    const items = this.getHealthPolicies().map((p) => (p.id === policy.id ? policy : p));
    setStored(KEYS.HEALTH, items);
    this.logAudit('HEALTH_POLICY_UPDATED', 'HealthInsurancePolicy', policy.policyNo, `Updated ${policy.insurer} policy #${policy.policyNo}`);
    this.notify();
  }

  deleteHealthPolicy(id: string, policyNo: string) {
    const items = this.getHealthPolicies().filter((p) => p.id !== id);
    setStored(KEYS.HEALTH, items);
    this.logAudit('HEALTH_POLICY_DELETED', 'HealthInsurancePolicy', policyNo, `Archived policy #${policyNo}`);
    this.notify();
  }

  // Motor Policies
  getMotorPolicies(): MotorInsurancePolicy[] {
    if (this.isZeroStateMode()) return [];
    return getStored<MotorInsurancePolicy[]>(KEYS.MOTOR, INITIAL_MOTOR_POLICIES);
  }

  addMotorPolicy(policy: Omit<MotorInsurancePolicy, 'id'>) {
    const items = this.getMotorPolicies();
    const newItem: MotorInsurancePolicy = { ...policy, id: `mp-${Date.now()}` };
    setStored(KEYS.MOTOR, [newItem, ...items]);
    this.createTransactionForPolicy('Motor Insurance', newItem.policyNo, newItem.clientName, newItem.clientId, newItem.subBrokerId, newItem.subBrokerName, newItem.netPremium, newItem.commissionExpected, newItem.subBrokerPayable);
    this.logAudit('MOTOR_POLICY_CREATED', 'MotorInsurancePolicy', newItem.policyNo, `Issued ${newItem.insurer} motor policy for ${newItem.vehicleNo}`);
    this.notify();
    return newItem;
  }

  updateMotorPolicy(policy: MotorInsurancePolicy) {
    const items = this.getMotorPolicies().map((p) => (p.id === policy.id ? policy : p));
    setStored(KEYS.MOTOR, items);
    this.logAudit('MOTOR_POLICY_UPDATED', 'MotorInsurancePolicy', policy.policyNo, `Updated ${policy.insurer} motor policy #${policy.policyNo}`);
    this.notify();
  }

  deleteMotorPolicy(id: string, policyNo: string) {
    const items = this.getMotorPolicies().filter((p) => p.id !== id);
    setStored(KEYS.MOTOR, items);
    this.logAudit('MOTOR_POLICY_DELETED', 'MotorInsurancePolicy', policyNo, `Archived motor policy #${policyNo}`);
    this.notify();
  }

  // Life Policies
  getLifePolicies(): LifeInsurancePolicy[] {
    if (this.isZeroStateMode()) return [];
    return getStored<LifeInsurancePolicy[]>(KEYS.LIFE, INITIAL_LIFE_POLICIES);
  }

  addLifePolicy(policy: Omit<LifeInsurancePolicy, 'id'>) {
    const items = this.getLifePolicies();
    const newItem: LifeInsurancePolicy = { ...policy, id: `lp-${Date.now()}` };
    setStored(KEYS.LIFE, [newItem, ...items]);
    this.createTransactionForPolicy('Life Insurance', newItem.policyNo, newItem.clientName, newItem.clientId, newItem.subBrokerId, newItem.subBrokerName, newItem.annualPremium, newItem.commissionExpected, newItem.subBrokerPayable);
    this.logAudit('LIFE_POLICY_CREATED', 'LifeInsurancePolicy', newItem.policyNo, `Issued ${newItem.insurer} life policy for ${newItem.clientName}`);
    this.notify();
    return newItem;
  }

  updateLifePolicy(policy: LifeInsurancePolicy) {
    const items = this.getLifePolicies().map((p) => (p.id === policy.id ? policy : p));
    setStored(KEYS.LIFE, items);
    this.logAudit('LIFE_POLICY_UPDATED', 'LifeInsurancePolicy', policy.policyNo, `Updated life policy #${policy.policyNo}`);
    this.notify();
  }

  deleteLifePolicy(id: string, policyNo: string) {
    const items = this.getLifePolicies().filter((p) => p.id !== id);
    setStored(KEYS.LIFE, items);
    this.logAudit('LIFE_POLICY_DELETED', 'LifeInsurancePolicy', policyNo, `Archived life policy #${policyNo}`);
    this.notify();
  }

  // FDs
  getFixedDeposits(): FixedDeposit[] {
    if (this.isZeroStateMode()) return [];
    return getStored<FixedDeposit[]>(KEYS.FDS, INITIAL_FIXED_DEPOSITS);
  }

  addFixedDeposit(fd: Omit<FixedDeposit, 'id'>) {
    const items = this.getFixedDeposits();
    const newItem: FixedDeposit = { ...fd, id: `fd-${Date.now()}` };
    setStored(KEYS.FDS, [newItem, ...items]);
    this.createTransactionForPolicy('Fixed Deposits', newItem.applicationNo, newItem.clientName, newItem.clientId, newItem.subBrokerId, newItem.subBrokerName, newItem.depositAmount, newItem.commissionExpected, newItem.subBrokerPayable);
    this.logAudit('FD_CREATED', 'FixedDeposit', newItem.applicationNo, `Booked FD with ${newItem.provider} for ₹${newItem.depositAmount.toLocaleString('en-IN')}`);
    this.notify();
    return newItem;
  }

  updateFixedDeposit(fd: FixedDeposit) {
    const items = this.getFixedDeposits().map((f) => (f.id === fd.id ? fd : f));
    setStored(KEYS.FDS, items);
    this.logAudit('FD_UPDATED', 'FixedDeposit', fd.applicationNo, `Updated FD application #${fd.applicationNo}`);
    this.notify();
  }

  deleteFixedDeposit(id: string, applicationNo: string) {
    const items = this.getFixedDeposits().filter((f) => f.id !== id);
    setStored(KEYS.FDS, items);
    this.logAudit('FD_DELETED', 'FixedDeposit', applicationNo, `Archived FD application #${applicationNo}`);
    this.notify();
  }

  // Bonds
  getBonds(): Bond[] {
    if (this.isZeroStateMode()) return [];
    return getStored<Bond[]>(KEYS.BONDS, INITIAL_BONDS);
  }

  addBond(bond: Omit<Bond, 'id'>) {
    const items = this.getBonds();
    const newItem: Bond = { ...bond, id: `bd-${Date.now()}` };
    setStored(KEYS.BONDS, [newItem, ...items]);
    this.createTransactionForPolicy('Bonds', newItem.applicationNo, newItem.clientName, newItem.clientId, newItem.subBrokerId, newItem.subBrokerName, newItem.totalInvestment, newItem.commissionExpected, newItem.subBrokerPayable);
    this.logAudit('BOND_CREATED', 'Bond', newItem.applicationNo, `Allotted ${newItem.issuer} bonds (${newItem.bondType}) for ₹${newItem.totalInvestment.toLocaleString('en-IN')}`);
    this.notify();
    return newItem;
  }

  updateBond(bond: Bond) {
    const items = this.getBonds().map((b) => (b.id === bond.id ? bond : b));
    setStored(KEYS.BONDS, items);
    this.logAudit('BOND_UPDATED', 'Bond', bond.applicationNo, `Updated bond allotment #${bond.applicationNo}`);
    this.notify();
  }

  deleteBond(id: string, applicationNo: string) {
    const items = this.getBonds().filter((b) => b.id !== id);
    setStored(KEYS.BONDS, items);
    this.logAudit('BOND_DELETED', 'Bond', applicationNo, `Archived bond allotment #${applicationNo}`);
    this.notify();
  }

  // Loans
  getLoans(): LoanApplication[] {
    if (this.isZeroStateMode()) return [];
    return getStored<LoanApplication[]>(KEYS.LOANS, INITIAL_LOANS);
  }

  addLoan(loan: Omit<LoanApplication, 'id'>) {
    const items = this.getLoans();
    const newItem: LoanApplication = { ...loan, id: `ln-${Date.now()}` };
    setStored(KEYS.LOANS, [newItem, ...items]);
    this.createTransactionForPolicy('Loans', newItem.applicationNo, newItem.clientName, newItem.clientId, newItem.subBrokerId, newItem.subBrokerName, newItem.sanctionedAmount || newItem.requestedAmount, newItem.expectedPayout, newItem.subBrokerPayout);
    this.logAudit('LOAN_CREATED', 'LoanApplication', newItem.applicationNo, `Logged loan application with ${newItem.lender} (${newItem.loanType})`);
    this.notify();
    return newItem;
  }

  updateLoan(loan: LoanApplication) {
    const items = this.getLoans().map((l) => (l.id === loan.id ? loan : l));
    setStored(KEYS.LOANS, items);
    this.logAudit('LOAN_UPDATED', 'LoanApplication', loan.applicationNo, `Updated loan #${loan.applicationNo} to stage ${loan.stage}`);
    this.notify();
  }

  deleteLoan(id: string, applicationNo: string) {
    const items = this.getLoans().filter((l) => l.id !== id);
    setStored(KEYS.LOANS, items);
    this.logAudit('LOAN_DELETED', 'LoanApplication', applicationNo, `Archived loan application #${applicationNo}`);
    this.notify();
  }

  // Rules
  getBrokerageRules(): BrokerageRule[] {
    if (this.isZeroStateMode()) return [];
    return getStored<BrokerageRule[]>(KEYS.RULES, INITIAL_BROKERAGE_RULES);
  }

  addBrokerageRule(rule: Omit<BrokerageRule, 'id'>) {
    const rules = this.getBrokerageRules();
    const newRule: BrokerageRule = { ...rule, id: `rule-${Date.now()}` };
    setStored(KEYS.RULES, [newRule, ...rules]);
    this.logAudit('BROKERAGE_RULE_CREATED', 'BrokerageRule', newRule.ruleCode, `Configured brokerage rule for ${newRule.productCategory} / ${newRule.provider}`);
    this.notify();
  }

  updateBrokerageRule(rule: BrokerageRule) {
    const rules = this.getBrokerageRules().map((r) => (r.id === rule.id ? rule : r));
    setStored(KEYS.RULES, rules);
    this.logAudit('BROKERAGE_RULE_UPDATED', 'BrokerageRule', rule.ruleCode, `Updated rule ${rule.ruleCode} to version ${rule.version}`);
    this.notify();
  }

  // Transactions
  getTransactions(): BrokerageTransaction[] {
    if (this.isZeroStateMode()) return [];
    return getStored<BrokerageTransaction[]>(KEYS.TXNS, INITIAL_TRANSACTIONS);
  }

  createTransactionForPolicy(
    productType: BrokerageTransaction['productType'],
    referenceNo: string,
    clientName: string,
    clientId: string,
    subBrokerId: string,
    subBrokerName: string,
    grossBusinessValue: number,
    companyCommissionExpected: number,
    subBrokerNetPayable: number
  ) {
    const txns = this.getTransactions();
    const tds = subBrokerNetPayable * 0.0526; // approx grossing up 5%
    const grossSb = subBrokerNetPayable + tds;
    const newTxn: BrokerageTransaction = {
      id: `txn-${Date.now()}`,
      transactionNo: `TXN-${new Date().getFullYear()}-${String(txns.length + 5001).padStart(5, '0')}`,
      productType,
      referenceNo,
      clientName,
      clientId,
      subBrokerId,
      subBrokerName,
      grossBusinessValue,
      companyCommissionExpected,
      companyCommissionReceived: 0,
      subBrokerSharePct: 75.0,
      subBrokerGrossPayable: grossSb,
      tdsDeducted: tds,
      subBrokerNetPayable,
      investxindiaRetained: companyCommissionExpected - grossSb,
      status: 'expected',
      ruleVersionApplied: 'Auto-Calculated v1',
    };
    setStored(KEYS.TXNS, [newTxn, ...txns]);
    this.notify();
  }

  updateTransactionStatus(
    id: string,
    status: BrokerageTransaction['status'],
    paymentRefNo?: string,
    receivedAmount?: number
  ) {
    const txns = this.getTransactions().map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status,
          paymentRefNo: paymentRefNo || t.paymentRefNo,
          companyCommissionReceived: receivedAmount !== undefined ? receivedAmount : (status === 'received' || status === 'approved' || status === 'paid' ? t.companyCommissionExpected : t.companyCommissionReceived),
          receiptDate: (status === 'received' || status === 'approved' || status === 'paid') && !t.receiptDate ? new Date().toISOString().split('T')[0] : t.receiptDate,
        };
      }
      return t;
    });
    setStored(KEYS.TXNS, txns);
    this.logAudit('TRANSACTION_RECONCILED', 'BrokerageTransaction', id, `Updated transaction status to ${status} with ref ${paymentRefNo || 'N/A'}`);
    this.notify();
  }

  // Payouts
  getPayouts(): PartnerPayout[] {
    if (this.isZeroStateMode()) return [];
    return getStored<PartnerPayout[]>(KEYS.PAYOUTS, INITIAL_PAYOUTS);
  }

  approvePayout(id: string, bankRef: string) {
    const user = this.getActiveUser();
    const payouts = this.getPayouts().map((p) => {
      if (p.id === id) {
        return {
          ...p,
          status: 'completed' as const,
          bankReferenceNo: bankRef || `RTGS-${Date.now()}`,
          approvedBy: `${user.name} (${user.role === 'super_admin' ? 'Super Admin' : 'Staff'})`,
          disbursementDate: new Date().toISOString().split('T')[0],
        };
      }
      return p;
    });
    setStored(KEYS.PAYOUTS, payouts);
    this.logAudit('PAYOUT_DISBURSED', 'PartnerPayout', id, `Authorized payout release with bank ref ${bankRef}`);
    this.notify();
  }

  // Targets
  getTargets(): BusinessTarget[] {
    if (this.isZeroStateMode()) return [];
    return getStored<BusinessTarget[]>(KEYS.TARGETS, INITIAL_BUSINESS_TARGETS);
  }

  addTarget(target: Omit<BusinessTarget, 'id'>): BusinessTarget {
    const targets = this.getTargets();
    const newTarget: BusinessTarget = {
      ...target,
      id: `tgt-${Date.now()}`,
    };
    setStored(KEYS.TARGETS, [newTarget, ...targets]);
    this.logAudit('TARGET_CONFIGURED', 'BusinessTarget', newTarget.id, `Created sales target for ${newTarget.entityName}`);
    this.notify();
    return newTarget;
  }

  // Documents
  getDocuments(): DocumentItem[] {
    if (this.isZeroStateMode()) return [];
    return getStored<DocumentItem[]>(KEYS.DOCS, INITIAL_DOCUMENTS);
  }

  addDocument(doc: Omit<DocumentItem, 'id' | 'uploadedAt'>): DocumentItem {
    const docs = this.getDocuments();
    const newDoc: DocumentItem = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setStored(KEYS.DOCS, [newDoc, ...docs]);
    this.logAudit('DOCUMENT_UPLOADED', 'DocumentItem', newDoc.id, `Uploaded ${newDoc.title} for ${newDoc.relatedEntity}`);
    this.notify();
    return newDoc;
  }

  deleteDocument(id: string) {
    const doc = this.getDocuments().find((d) => d.id === id);
    const docs = this.getDocuments().filter((d) => d.id !== id);
    setStored(KEYS.DOCS, docs);
    if (doc) {
      this.logAudit('DOCUMENT_DELETED', 'DocumentItem', id, `Deleted document: ${doc.title} (${doc.fileName})`);
    }
    this.notify();
  }

  recordDocumentAccess(docId: string, action: 'download' | 'preview' | 'generate_signed_url', tokenUsed: string) {
    const user = this.getActiveUser();
    const docs = this.getDocuments().map((doc) => {
      if (doc.id === docId) {
        const accessLog = doc.accessLog || [];
        const newRecord = {
          id: `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          accessedBy: user.name,
          accessedAt: new Date().toISOString(),
          role: user.role,
          ipAddress: '103.21.144.12 (Mumbai, IN)',
          action,
          tokenUsed,
        };
        return {
          ...doc,
          accessLog: [newRecord, ...accessLog.slice(0, 49)],
        };
      }
      return doc;
    });
    setStored(KEYS.DOCS, docs);
    this.logAudit(
      action === 'download' ? 'DOCUMENT_DOWNLOADED' : action === 'preview' ? 'DOCUMENT_PREVIEWED' : 'SIGNED_URL_ISSUED',
      'DocumentItem',
      docId,
      `User ${user.name} (${user.role}) initiated ${action} via signed token ${tokenUsed.slice(0, 12)}...`
    );
    this.notify();
  }

  // Import Jobs
  getImportJobs(): ImportJob[] {
    if (this.isZeroStateMode()) return [];
    return getStored<ImportJob[]>(KEYS.IMPORT_JOBS, INITIAL_IMPORT_JOBS);
  }

  addImportJob(job: Omit<ImportJob, 'id' | 'jobNo' | 'importedAt'>): ImportJob {
    const jobs = this.getImportJobs();
    const nextNum = jobs.length + 101;
    const newJob: ImportJob = {
      ...job,
      id: `job-${Date.now()}`,
      jobNo: `IX-JOB-2026-${String(nextNum).padStart(4, '0')}`,
      importedAt: new Date().toISOString(),
    };
    setStored(KEYS.IMPORT_JOBS, [newJob, ...jobs]);
    this.logAudit(
      'BATCH_IMPORT_COMPLETED',
      'ImportJob',
      newJob.jobNo,
      `Imported ${newJob.successCount}/${newJob.totalRows} records into ${newJob.module} (errors: ${newJob.errorCount})`
    );
    this.notify();
    return newJob;
  }

  // Tasks
  getTasks(): TaskReminder[] {
    if (this.isZeroStateMode()) return [];
    return getStored<TaskReminder[]>(KEYS.TASKS, INITIAL_TASKS);
  }

  addTask(task: Omit<TaskReminder, 'id'>) {
    const tasks = this.getTasks();
    const newTask: TaskReminder = { ...task, id: `tsk-${Date.now()}` };
    setStored(KEYS.TASKS, [newTask, ...tasks]);
    this.notify();
  }

  toggleTaskStatus(id: string) {
    const tasks = this.getTasks().map((t) => {
      if (t.id === id) {
        const nextStatus = t.status === 'completed' ? 'pending' : ('completed' as const);
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setStored(KEYS.TASKS, tasks);
    this.notify();
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    if (this.isZeroStateMode()) return [];
    return getStored<AuditLog[]>(KEYS.AUDIT, INITIAL_AUDIT_LOGS);
  }

  logAudit(action: string, entityType: string, entityId: string, details: string) {
    const user = this.getActiveUser();
    const logs = getStored<AuditLog[]>(KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: user.name,
      actorRole: user.role,
      action,
      entityType,
      entityId,
      ipAddress: '103.21.144.12 (Mumbai, IN)',
      details,
    };
    setStored(KEYS.AUDIT, [newLog, ...logs.slice(0, 99)]);
  }

  // Reset to initial demo data
  resetDemoData() {
    localStorage.removeItem(KEYS.CLIENTS);
    localStorage.removeItem(KEYS.SUB_BROKERS);
    localStorage.removeItem(KEYS.HEALTH);
    localStorage.removeItem(KEYS.MOTOR);
    localStorage.removeItem(KEYS.LIFE);
    localStorage.removeItem(KEYS.FDS);
    localStorage.removeItem(KEYS.BONDS);
    localStorage.removeItem(KEYS.LOANS);
    localStorage.removeItem(KEYS.RULES);
    localStorage.removeItem(KEYS.TXNS);
    localStorage.removeItem(KEYS.PAYOUTS);
    localStorage.removeItem(KEYS.TARGETS);
    localStorage.removeItem(KEYS.DOCS);
    localStorage.removeItem(KEYS.TASKS);
    localStorage.removeItem(KEYS.AUDIT);
    setStored(KEYS.ZERO_STATE_MODE, false);
    this.notify();
  }
}

export const dataStore = new DataStore();
