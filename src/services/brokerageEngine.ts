import { BrokerageRule } from '../types';

export interface BrokerageCalculationSnapshot {
  ruleCode: string;
  ruleVersion: number;
  productCategory: string;
  provider: string;
  transactionType: string;
  partnerTier: string;
  businessVolume: number;
  companyCommissionPct: number;
  companyFlatInr: number;
  companyGrossExpected: number;
  subBrokerSharePct: number;
  subBrokerGrossPayable: number;
  tdsRatePct: number;
  tdsAmount: number;
  subBrokerNetPayable: number;
  companyRetainedGross: number;
  companyRetainedNet: number;
  calculatedAt: string;
}

export interface BrokerageCalculationResult {
  ruleApplied: BrokerageRule | null;
  ruleVersion: string;
  businessVolume: number;
  companyCommissionPct: number;
  companyFlatInr: number;
  companyGrossExpected: number;
  subBrokerSharePct: number;
  subBrokerGrossPayable: number;
  tdsRatePct: number;
  tdsAmount: number;
  subBrokerNetPayable: number;
  companyRetainedGross: number;
  companyRetainedNet: number;
  breakdownSummary: string[];
  snapshot: BrokerageCalculationSnapshot;
}

/**
 * Validates inputs for brokerage calculations
 */
export function validateBrokerageInput(
  businessAmount: number,
  productCategory?: string,
  provider?: string
): { isValid: boolean; error?: string } {
  if (isNaN(businessAmount) || businessAmount < 0) {
    return { isValid: false, error: 'Business volume must be a non-negative number.' };
  }
  if (productCategory && !productCategory.trim()) {
    return { isValid: false, error: 'Product category is required.' };
  }
  if (provider && !provider.trim()) {
    return { isValid: false, error: 'Provider or financial institution is required.' };
  }
  return { isValid: true };
}

/**
 * Evaluates whether a transaction amount falls into a rule slab
 * Bounds are inclusive: minSlab <= amount <= maxSlab
 */
export function matchesSlab(amount: number, minSlab: number, maxSlab: number): boolean {
  if (minSlab > 0 && amount < minSlab) return false;
  if (maxSlab > 0 && amount > maxSlab) return false;
  return true;
}

/**
 * Evaluates whether a transaction date falls into a rule's effective window
 */
export function matchesEffectiveDate(dateStr?: string, fromStr?: string, toStr?: string): boolean {
  if (!dateStr || !fromStr) return true;
  if (dateStr < fromStr) return false;
  if (toStr && dateStr > toStr) return false;
  return true;
}

/**
 * Core Rule Matcher & Calculation Engine
 */
export function calculateBrokerage(
  productCategory: string,
  provider: string,
  transactionType: 'Fresh' | 'Renewal' | 'Topup' | 'Rollover',
  partnerTier: string,
  businessAmount: number,
  rules: BrokerageRule[],
  partnerShareOverridePct?: number,
  transactionDate?: string
): BrokerageCalculationResult {
  const validation = validateBrokerageInput(businessAmount, productCategory, provider);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Find matching active rule
  const matchedRule = rules.find((r) => {
    if (r.status !== 'active') return false;
    if (r.productCategory !== productCategory) return false;
    if (r.provider !== 'All' && r.provider !== provider) return false;
    if (r.transactionType !== transactionType) return false;
    if (r.partnerTier !== 'All' && r.partnerTier !== partnerTier) return false;
    if (!matchesSlab(businessAmount, r.minSlabAmount, r.maxSlabAmount)) return false;
    if (transactionDate && !matchesEffectiveDate(transactionDate, r.effectiveFrom, r.effectiveTo)) return false;
    return true;
  });

  const ruleVersion = matchedRule ? `v${matchedRule.version} (${matchedRule.ruleCode})` : 'Manual / Fallback';
  const ruleCode = matchedRule ? matchedRule.ruleCode : 'FALLBACK-DEFAULT';
  const versionNum = matchedRule ? matchedRule.version : 1;
  const companyPct = matchedRule ? matchedRule.companyCommissionPct : 10.0;
  const companyFlat = matchedRule ? matchedRule.companyFlatInr : 0;

  // Sub-broker payout % of company commission (allows 0% or custom override)
  let subBrokerSharePct = 70.0;
  if (partnerShareOverridePct !== undefined && partnerShareOverridePct !== null) {
    subBrokerSharePct = Number(partnerShareOverridePct);
  } else if (matchedRule) {
    subBrokerSharePct = matchedRule.subBrokerSharePct;
  }

  // TDS Rate (Typically 5% under Section 194H of Indian Income Tax Act)
  const tdsRatePct = matchedRule ? matchedRule.tdsDeductionPct : 5.0;

  // 1. Company Gross Expected Commission (Percentage + Fixed fee)
  const companyGrossExpected = Math.round(((businessAmount * (companyPct / 100)) + companyFlat) * 100) / 100;

  // 2. Sub-broker gross entitlement
  const subBrokerGrossPayable = Math.round((companyGrossExpected * (subBrokerSharePct / 100)) * 100) / 100;

  // 3. Statutory TDS Deduction
  const tdsAmount = Math.round((subBrokerGrossPayable * (tdsRatePct / 100)) * 100) / 100;

  // 4. Net payable to Sub-broker after TDS
  const subBrokerNetPayable = Math.max(0, Math.round((subBrokerGrossPayable - tdsAmount) * 100) / 100);

  // 5. Investxindia Retained Gross & Net
  const companyRetainedGross = Math.round((companyGrossExpected - subBrokerGrossPayable) * 100) / 100;
  const companyRetainedNet = companyRetainedGross;

  const breakdownSummary: string[] = [
    `1. Gross Business Volume: ₹${businessAmount.toLocaleString('en-IN')}`,
    `2. Matched Rule: ${ruleVersion} [${productCategory} / ${provider} / ${transactionType} / Tier: ${partnerTier}]`,
    `3. Company Commission: ${companyPct}% ${companyFlat > 0 ? `+ ₹${companyFlat.toLocaleString('en-IN')} flat` : ''} = ₹${companyGrossExpected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    `4. Sub-Broker Split: ${subBrokerSharePct}% of gross commission = ₹${subBrokerGrossPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    `5. Statutory TDS (Sec 194H @ ${tdsRatePct}%): -₹${tdsAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    `6. Net Disbursable to Sub-Broker: ₹${subBrokerNetPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    `7. Investxindia Retained Margin: ₹${companyRetainedGross.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${(100 - subBrokerSharePct).toFixed(1)}%)`,
  ];

  const snapshot: BrokerageCalculationSnapshot = {
    ruleCode,
    ruleVersion: versionNum,
    productCategory,
    provider,
    transactionType,
    partnerTier,
    businessVolume: businessAmount,
    companyCommissionPct: companyPct,
    companyFlatInr: companyFlat,
    companyGrossExpected,
    subBrokerSharePct,
    subBrokerGrossPayable,
    tdsRatePct,
    tdsAmount,
    subBrokerNetPayable,
    companyRetainedGross,
    companyRetainedNet,
    calculatedAt: new Date().toISOString(),
  };

  return {
    ruleApplied: matchedRule || null,
    ruleVersion,
    businessVolume: businessAmount,
    companyCommissionPct: companyPct,
    companyFlatInr: companyFlat,
    companyGrossExpected,
    subBrokerSharePct,
    subBrokerGrossPayable,
    tdsRatePct,
    tdsAmount,
    subBrokerNetPayable,
    companyRetainedGross,
    companyRetainedNet,
    breakdownSummary,
    snapshot,
  };
}

/**
 * Handles policy cancellation or reversal calculation
 */
export function calculateReversal(
  originalGrossCommission: number,
  originalSubBrokerPayable: number,
  tdsPct: number = 5.0
) {
  const reversedCompanyBrokerage = -Math.abs(originalGrossCommission);
  const reversedSubBrokerGross = -Math.abs(originalSubBrokerPayable);
  const reversedTds = -Math.abs(Math.round((reversedSubBrokerGross * (tdsPct / 100)) * 100) / 100);
  const reversedNetPayable = Math.round((reversedSubBrokerGross - reversedTds) * 100) / 100;

  return {
    reversedCompanyBrokerage,
    reversedSubBrokerGross,
    reversedTds,
    reversedNetPayable,
  };
}
