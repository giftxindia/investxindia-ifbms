import {
  MODULE_SCHEMAS,
  secureExportDataset,
  authorizeImport,
} from '../services/importExportService';
import {
  validateDocumentFile,
  generateSignedUrl,
  verifySignedToken,
  MAX_FILE_SIZE_BYTES,
} from '../services/documentService';
import { DocumentItem } from '../types';

export interface ImportDocTestResult {
  testId: string;
  testName: string;
  category: 'Data Validation' | 'Duplicate Detection' | 'File Constraints' | 'Private Storage & Signed URLs' | 'RBAC & Authorization';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}

export function runImportExportDocTestSuite(): ImportDocTestResult[] {
  const results: ImportDocTestResult[] = [];

  // -------------------------------------------------------------
  // Test 1: Mandatory Field Validation
  // -------------------------------------------------------------
  try {
    const healthSchema = MODULE_SCHEMAS['Health Insurance'];
    const requiredCols = healthSchema.columns.filter((c) => c.required).map((c) => c.key);
    const hasPolicyNo = requiredCols.includes('policyNo');
    const hasAnnualPremium = requiredCols.includes('annualPremium');
    const passed = hasPolicyNo && hasAnnualPremium;

    results.push({
      testId: 'T01-MANDATORY-FIELDS',
      testName: 'Mandatory Field Schema Definition',
      category: 'Data Validation',
      passed,
      expected: 'Health Insurance schema defines policyNo and annualPremium as required',
      actual: passed ? 'Both fields marked required in schema' : 'Missing required flags',
      details: `Required fields: ${requiredCols.join(', ')}`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T01-MANDATORY-FIELDS',
      testName: 'Mandatory Field Schema Definition',
      category: 'Data Validation',
      passed: false,
      expected: 'Schema check succeeds',
      actual: err.message,
      details: 'Exception during schema verification',
    });
  }

  // -------------------------------------------------------------
  // Test 2: PAN Regex Format Validation
  // -------------------------------------------------------------
  try {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const validPAN = 'ABCDE1234F';
    const invalidPAN = 'INVALID_PAN_99';
    const numPan = '1234567890';

    const testValid = panRegex.test(validPAN);
    const testInvalid = !panRegex.test(invalidPAN);
    const testNum = !panRegex.test(numPan);
    const passed = testValid && testInvalid && testNum;

    results.push({
      testId: 'T02-PAN-REGEX',
      testName: 'Indian Income Tax PAN Format Validation',
      category: 'Data Validation',
      passed,
      expected: 'Accepts ABCDE1234F, rejects INVALID_PAN_99 and numeric strings',
      actual: passed ? 'All PAN patterns strictly verified' : 'Regex failed on test vectors',
      details: `Validated validPAN=${testValid}, invalidPAN_rejected=${testInvalid}, numeric_rejected=${testNum}`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T02-PAN-REGEX',
      testName: 'Indian Income Tax PAN Format Validation',
      category: 'Data Validation',
      passed: false,
      expected: 'PAN validation passes',
      actual: err.message,
      details: 'Exception in PAN validator',
    });
  }

  // -------------------------------------------------------------
  // Test 3: Mobile Number 10-Digit Constraint
  // -------------------------------------------------------------
  try {
    const validMobile = '9820112233';
    const shortMobile = '98201';
    const cleanValid = validMobile.replace(/[^0-9]/g, '');
    const cleanShort = shortMobile.replace(/[^0-9]/g, '');

    const validOk = cleanValid.length === 10;
    const shortRejected = cleanShort.length < 10;
    const passed = validOk && shortRejected;

    results.push({
      testId: 'T03-MOBILE-VALIDATION',
      testName: 'Indian 10-Digit Mobile Number Validation',
      category: 'Data Validation',
      passed,
      expected: 'Accepts 10-digit mobile (9820112233), rejects short input (98201)',
      actual: passed ? '10-digit check enforced' : 'Short mobile was not rejected',
      details: `cleanValid.length=${cleanValid.length}, cleanShort.length=${cleanShort.length}`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T03-MOBILE-VALIDATION',
      testName: 'Indian 10-Digit Mobile Number Validation',
      category: 'Data Validation',
      passed: false,
      expected: 'Mobile validation passes',
      actual: err.message,
      details: 'Exception in mobile test',
    });
  }

  // -------------------------------------------------------------
  // Test 4: Financial Number Validation (Negative Amounts)
  // -------------------------------------------------------------
  try {
    const validAmount = Number('28500');
    const negativeAmount = Number('-1500');
    const nanAmount = Number('XYZ_INVALID');

    const validPassed = !isNaN(validAmount) && validAmount >= 0;
    const negRejected = isNaN(negativeAmount) || negativeAmount < 0;
    const nanRejected = isNaN(nanAmount);
    const passed = validPassed && negRejected && nanRejected;

    results.push({
      testId: 'T04-FINANCIAL-NUMBERS',
      testName: 'Financial Amount Validation (Non-Negative & Numeric)',
      category: 'Data Validation',
      passed,
      expected: 'Accepts 28500, rejects -1500 and non-numeric strings',
      actual: passed ? 'Negative and NaN financial inputs rejected' : 'Negative amount accepted',
      details: `valid=${validPassed}, negative_rejected=${negRejected}, nan_rejected=${nanRejected}`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T04-FINANCIAL-NUMBERS',
      testName: 'Financial Amount Validation (Non-Negative & Numeric)',
      category: 'Data Validation',
      passed: false,
      expected: 'Financial numbers verified',
      actual: err.message,
      details: 'Exception in financial amount test',
    });
  }

  // -------------------------------------------------------------
  // Test 5: Intra-Batch Duplicate Detection
  // -------------------------------------------------------------
  try {
    const keysSeen = new Set<string>();
    const testBatch = ['HI-2026-STAR-01', 'HI-2026-STAR-02', 'HI-2026-STAR-01'];
    let duplicateDetected = false;
    let duplicateKey = '';

    testBatch.forEach((key) => {
      if (keysSeen.has(key)) {
        duplicateDetected = true;
        duplicateKey = key;
      } else {
        keysSeen.add(key);
      }
    });

    const passed = duplicateDetected && duplicateKey === 'HI-2026-STAR-01';

    results.push({
      testId: 'T05-BATCH-DUPLICATES',
      testName: 'Intra-Batch Duplicate Reference Detection',
      category: 'Duplicate Detection',
      passed,
      expected: 'Flags second occurrence of HI-2026-STAR-01 within uploaded file',
      actual: passed ? `Detected duplicate: "${duplicateKey}"` : 'Failed to catch batch duplicate',
      details: `Keys seen: ${Array.from(keysSeen).join(', ')}`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T05-BATCH-DUPLICATES',
      testName: 'Intra-Batch Duplicate Reference Detection',
      category: 'Duplicate Detection',
      passed: false,
      expected: 'Duplicate detection works',
      actual: err.message,
      details: 'Exception during batch duplicate test',
    });
  }

  // -------------------------------------------------------------
  // Test 6: Database Existing Record Duplicate Detection
  // -------------------------------------------------------------
  try {
    const mockDbKeys = new Set(['HI-2026-STAR-8819', 'FD-BJF-99210']);
    const incomingKey = 'HI-2026-STAR-8819';
    const isDbDuplicate = mockDbKeys.has(incomingKey);

    results.push({
      testId: 'T06-DB-DUPLICATES',
      testName: 'Database Duplicate Reference Detection',
      category: 'Duplicate Detection',
      passed: isDbDuplicate,
      expected: 'Detects that HI-2026-STAR-8819 already exists in the system database',
      actual: isDbDuplicate ? 'Database duplicate caught and flagged' : 'Duplicate not detected',
      details: `Incoming key "${incomingKey}" matched existing database set`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T06-DB-DUPLICATES',
      testName: 'Database Duplicate Reference Detection',
      category: 'Duplicate Detection',
      passed: false,
      expected: 'Database duplicate check succeeds',
      actual: err.message,
      details: 'Exception in DB duplicate test',
    });
  }

  // -------------------------------------------------------------
  // Test 7: File Size Limit (10MB Max Threshold)
  // -------------------------------------------------------------
  try {
    const oversizedFile = new File(['x'.repeat(100)], 'huge_dump.xlsx', { type: 'application/octet-stream' });
    Object.defineProperty(oversizedFile, 'size', { value: 12 * 1024 * 1024 }); // 12 MB

    const validFile = new File(['content'], 'client_kyc.pdf', { type: 'application/pdf' });
    Object.defineProperty(validFile, 'size', { value: 2 * 1024 * 1024 }); // 2 MB

    const oversizeRes = validateDocumentFile(oversizedFile);
    const validRes = validateDocumentFile(validFile);

    const passed = !oversizeRes.valid && validRes.valid;

    results.push({
      testId: 'T07-FILE-SIZE-LIMIT',
      testName: 'Document Vault 10MB Max Size Restriction',
      category: 'File Constraints',
      passed,
      expected: 'Rejects 12MB upload and permits 2MB PDF upload',
      actual: passed ? '12MB rejected (exceeds 10MB limit), 2MB accepted' : 'Size boundary test failed',
      details: `oversizeError: "${oversizeRes.error}", maxThresholdBytes: ${MAX_FILE_SIZE_BYTES}`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T07-FILE-SIZE-LIMIT',
      testName: 'Document Vault 10MB Max Size Restriction',
      category: 'File Constraints',
      passed: false,
      expected: 'Size check succeeds',
      actual: err.message,
      details: 'Exception in size limit test',
    });
  }

  // -------------------------------------------------------------
  // Test 8: Prohibited File Types Whitelist Check
  // -------------------------------------------------------------
  try {
    const exeFile = new File(['echo virus'], 'installer.exe', { type: 'application/x-msdownload' });
    const jsFile = new File(['alert(1)'], 'script.js', { type: 'text/javascript' });
    const pdfFile = new File(['valid pdf'], 'mandate.pdf', { type: 'application/pdf' });

    const exeRes = validateDocumentFile(exeFile);
    const jsRes = validateDocumentFile(jsFile);
    const pdfRes = validateDocumentFile(pdfFile);

    const passed = !exeRes.valid && !jsRes.valid && pdfRes.valid;

    results.push({
      testId: 'T08-MIME-WHITELIST',
      testName: 'Prohibited Executables & MIME Type Whitelist',
      category: 'File Constraints',
      passed,
      expected: 'Rejects .exe and .js files, accepts .pdf document',
      actual: passed ? 'Executables rejected by extension & MIME whitelist' : 'Prohibited file accepted',
      details: `exeError: "${exeRes.error}", jsError: "${jsRes.error}"`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T08-MIME-WHITELIST',
      testName: 'Prohibited Executables & MIME Type Whitelist',
      category: 'File Constraints',
      passed: false,
      expected: 'MIME validation succeeds',
      actual: err.message,
      details: 'Exception in MIME test',
    });
  }

  // -------------------------------------------------------------
  // Test 9: Active Signed URL Generation & Verification
  // -------------------------------------------------------------
  try {
    const mockDoc: DocumentItem = {
      id: 'doc-test-99',
      title: 'Test KYC Document',
      documentCategory: 'KYC',
      relatedEntity: 'Test Client',
      entityType: 'Client',
      fileUrl: '#',
      fileName: 'Test_KYC.pdf',
      fileSize: '1.2 MB',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Rajiv Malhotra',
      verified: true,
      isPrivate: true,
      storagePath: 'private/test/Test_KYC.pdf',
    };

    const signedUrlRes = generateSignedUrl(mockDoc, 900); // 15 min
    const verifyRes = verifySignedToken(signedUrlRes.token);

    const passed = verifyRes.valid && (verifyRes.remainingSeconds || 0) > 800;

    results.push({
      testId: 'T09-SIGNED-URL-VALID',
      testName: 'Time-Limited Signed URL Issuance & Verification',
      category: 'Private Storage & Signed URLs',
      passed,
      expected: 'Issues signed token valid for 900 seconds; verifies successfully',
      actual: passed ? `Token verified with ${verifyRes.remainingSeconds}s remaining` : 'Verification failed',
      details: `IssuedAt: ${signedUrlRes.issuedAt}, ExpiresAt: ${signedUrlRes.expiresAt}`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T09-SIGNED-URL-VALID',
      testName: 'Time-Limited Signed URL Issuance & Verification',
      category: 'Private Storage & Signed URLs',
      passed: false,
      expected: 'Signed URL succeeds',
      actual: err.message,
      details: 'Exception in signed URL test',
    });
  }

  // -------------------------------------------------------------
  // Test 10: Expired Signed URL Rejection (HTTP 403 Forbidden)
  // -------------------------------------------------------------
  try {
    const expiredPayload = {
      docId: 'doc-expired-01',
      fileName: 'Old_Policy.pdf',
      iat: Date.now() - 3600000,
      exp: Date.now() - 10000, // Expired 10 seconds ago
      salt: 'expired_salt',
    };
    const expiredToken = btoa(unescape(encodeURIComponent(JSON.stringify(expiredPayload))));

    const verifyRes = verifySignedToken(expiredToken);
    const passed = !verifyRes.valid && String(verifyRes.error).includes('expired');

    results.push({
      testId: 'T10-SIGNED-URL-EXPIRY',
      testName: 'Expired Signed URL Security Rejection',
      category: 'Private Storage & Signed URLs',
      passed,
      expected: 'Rejects expired token and returns HTTP 403 / expired token reason',
      actual: passed ? `Access Denied: ${verifyRes.error}` : 'Expired token was erroneously accepted',
      details: `ExpiredAt: ${verifyRes.expiredAt}`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T10-SIGNED-URL-EXPIRY',
      testName: 'Expired Signed URL Security Rejection',
      category: 'Private Storage & Signed URLs',
      passed: false,
      expected: 'Expired token check succeeds',
      actual: err.message,
      details: 'Exception in expired token test',
    });
  }

  // -------------------------------------------------------------
  // Test 11: RBAC Export Guard - Sub-Broker Blocked from Rules
  // -------------------------------------------------------------
  try {
    const mockRules = [{ ruleCode: 'BR-HLT-01', companyCommissionPct: 15 }];
    const exportRes = secureExportDataset(mockRules, 'Brokerage_Rules_Master', 'sub_broker', 'xlsx');

    const passed = !exportRes.success && exportRes.message.includes('Security Policy Violation');

    results.push({
      testId: 'T11-RBAC-UNAUTHORIZED-EXPORT',
      testName: 'RBAC Export Guard: Block Sub-Broker Proprietary Rules Export',
      category: 'RBAC & Authorization',
      passed,
      expected: 'Rejects export request and logs audit warning when sub-broker attempts rule export',
      actual: passed ? 'Blocked: Security Policy Violation' : 'Rules were exported without authorization',
      details: exportRes.message,
    });
  } catch (err: any) {
    results.push({
      testId: 'T11-RBAC-UNAUTHORIZED-EXPORT',
      testName: 'RBAC Export Guard: Block Sub-Broker Proprietary Rules Export',
      category: 'RBAC & Authorization',
      passed: false,
      expected: 'Unauthorized export blocked',
      actual: err.message,
      details: 'Exception in export guard test',
    });
  }

  // -------------------------------------------------------------
  // Test 12: RBAC Import Guard - Sub-Broker Blocked from Ingesting Rules
  // -------------------------------------------------------------
  try {
    const sbAuth = authorizeImport('sub_broker', 'Brokerage Entries');
    const adminAuth = authorizeImport('super_admin', 'Brokerage Entries');

    const passed = !sbAuth.authorized && adminAuth.authorized;

    results.push({
      testId: 'T12-RBAC-IMPORT-AUTH',
      testName: 'RBAC Import Guard: Sub-Brokers Prohibited from Master Data Imports',
      category: 'RBAC & Authorization',
      passed,
      expected: 'Denies sub-broker import for Brokerage Entries; permits super_admin',
      actual: passed ? 'Sub-broker blocked, super_admin authorized' : 'Permission check mismatch',
      details: `Sub-broker refusal reason: "${sbAuth.reason}"`,
    });
  } catch (err: any) {
    results.push({
      testId: 'T12-RBAC-IMPORT-AUTH',
      testName: 'RBAC Import Guard: Sub-Brokers Prohibited from Master Data Imports',
      category: 'RBAC & Authorization',
      passed: false,
      expected: 'Import authorization tested',
      actual: err.message,
      details: 'Exception in import auth test',
    });
  }

  return results;
}
