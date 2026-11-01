import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileCheck,
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import {
  generateModuleTemplate,
  parseAndValidateFile,
  executeChunkedBatchImport,
  downloadErrorReport,
  secureExportDataset,
  MODULE_SCHEMAS,
  ParsedBatchResult,
} from '../services/importExportService';
import { dataStore } from '../services/mockData';
import { ImportJob, UserRole } from '../types';
import { formatDateIST } from '../utils/formatters';
import { ImportDocTestRunnerModal } from '../components/common/ImportDocTestRunnerModal';

interface ExcelCenterPageProps {
  userRole: UserRole;
}

export const ExcelCenterPage: React.FC<ExcelCenterPageProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'history' | 'quick_export'>('import');
  const [selectedModule, setSelectedModule] = useState<string>('Health Insurance');
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv'>('xlsx');

  // File parsing & validation state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [batchResult, setBatchResult] = useState<ParsedBatchResult | null>(null);

  // Batch execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number; percent: number }>({
    processed: 0,
    total: 0,
    percent: 0,
  });
  const [importCompleted, setImportCompleted] = useState(false);
  const [committedCount, setCommittedCount] = useState(0);

  // Import Job History
  const [importJobs, setImportJobs] = useState<ImportJob[]>(() => dataStore.getImportJobs());

  // Test modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setImportJobs(dataStore.getImportJobs());
    });
    return unsub;
  }, []);

  const modules = Object.keys(MODULE_SCHEMAS);

  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    generateModuleTemplate(selectedModule, format);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setImportCompleted(false);

    try {
      const result = await parseAndValidateFile(file, selectedModule);
      setBatchResult(result);
    } catch (err: any) {
      alert(`Error parsing file: ${err.message}`);
      setBatchResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommitBatch = async () => {
    if (!batchResult || batchResult.validRows.length === 0) return;

    setIsImporting(true);
    setImportProgress({ processed: 0, total: batchResult.validRows.length, percent: 0 });

    try {
      const execResult = await executeChunkedBatchImport(
        selectedModule,
        batchResult.validRows,
        selectedFile?.name || `${selectedModule}_Batch.xlsx`,
        userRole,
        (processed, total, percent) => {
          setImportProgress({ processed, total, percent });
        }
      );

      setCommittedCount(execResult.successCount);
      setImportCompleted(true);
      setBatchResult(null);
      setSelectedFile(null);
    } catch (err: any) {
      alert(`Import Failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!batchResult || batchResult.invalidRows.length === 0) return;
    downloadErrorReport(selectedModule, batchResult.invalidRows);
  };

  const handleQuickExport = (mod: string, format: 'xlsx' | 'csv') => {
    let data: any[] = [];
    if (mod === 'Health Insurance') data = dataStore.getHealthPolicies();
    else if (mod === 'Motor Insurance') data = dataStore.getMotorPolicies();
    else if (mod === 'Life Insurance') data = dataStore.getLifePolicies();
    else if (mod === 'Fixed Deposits') data = dataStore.getFixedDeposits();
    else if (mod === 'Bonds') data = dataStore.getBonds();
    else if (mod === 'Loans') data = dataStore.getLoans();
    else if (mod === 'Clients') data = dataStore.getClients();
    else if (mod === 'Sub-Brokers') data = dataStore.getSubBrokers();
    else if (mod === 'Brokerage Entries') data = dataStore.getTransactions();

    const res = secureExportDataset(data, mod, userRole, format);
    if (!res.success) {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Excel & CSV Operations Studio</h2>
          <p className="text-xs text-slate-500">
            Validated bulk ingestion, duplicate detection, column mapping, error isolation, and secure filtered exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Run Import & Security Tests</span>
          </button>
        </div>
      </div>

      {/* Main Mode Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'import'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Batch Import Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Import Job History ({importJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quick_export')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'quick_export'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Module Fast Exports</span>
        </button>
      </div>

      {/* TAB 1: BATCH IMPORT STUDIO */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Step 1: Select Module & Download Template */}
          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Step 1</span>
                <h3 className="text-sm font-bold text-slate-900">Select Target Module & Download Official Template</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .XLSX Template</span>
                </button>
                <button
                  onClick={() => handleDownloadTemplate('csv')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {modules.map((mod) => {
                const isSelected = selectedModule === mod;
                return (
                  <button
                    key={mod}
                    onClick={() => {
                      setSelectedModule(mod);
                      setBatchResult(null);
                      setSelectedFile(null);
                      setImportCompleted(false);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{mod}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span className={`text-[10px] block mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {MODULE_SCHEMAS[mod]?.columns.length || 0} mapped columns
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Upload Spreadsheet */}
          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Step 2</span>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Upload Completed File for {selectedModule}</h3>

            <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center transition-colors">
              <input
                type="file"
                id="batch-file-input"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isParsing || isImporting}
              />
              <label htmlFor="batch-file-input" className="cursor-pointer block">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-800 block">
                  Click to browse or drop {selectedModule} spreadsheet
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv) up to 10MB
                </span>
              </label>

              {selectedFile && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md text-xs font-mono text-slate-800">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

              {isParsing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-600">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Reading rows, verifying data types, and checking duplicate references...</span>
                </div>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {importCompleted && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    Import Succeeded: {committedCount} records committed to {selectedModule}
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    The database has been updated. You can view the newly ingested records in the {selectedModule} page.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setImportCompleted(false)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 rounded-md"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Step 3 & 4: Validation Summary & Preview */}
          {batchResult && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Total Rows Scanned</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">{batchResult.totalRows}</div>
                  <span className="text-[10px] text-slate-400">Excluding header row</span>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Ready to Import</span>
                  <div className="text-xl font-bold text-emerald-800 mt-1">{batchResult.validRows.length}</div>
                  <span className="text-[10px] text-emerald-600">Passed all validation rules</span>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[10px] text-amber-700 font-bold uppercase">Duplicates Prevented</span>
                  <div className="text-xl font-bold text-amber-800 mt-1">{batchResult.duplicateCount}</div>
                  <span className="text-[10px] text-amber-600">Existing or in-file duplicate</span>
                </div>

                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] text-rose-700 font-bold uppercase">Invalid Rows</span>
                  <div className="text-xl font-bold text-rose-800 mt-1">{batchResult.invalidRows.length}</div>
                  <span className="text-[10px] text-rose-600">Isolated with error details</span>
                </div>
              </div>

              {/* Column Mapping Preview */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Column Mapping Verification ({Object.keys(batchResult.columnMapping).length} / {batchResult.headers.length} headers mapped)
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {batchResult.headers.map((h) => {
                    const mappedKey = batchResult.columnMapping[h];
                    return (
                      <div
                        key={h}
                        className={`px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 font-mono text-[11px] ${
                          mappedKey
                            ? 'bg-slate-50 border-slate-200 text-slate-700'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        <span className="font-semibold">{h}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className={mappedKey ? 'text-emerald-700 font-bold' : 'text-amber-700 italic'}>
                          {mappedKey || 'Ignored / Unmapped'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 5: Execution Bar */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Step 3: Confirm Batch Ingestion</h4>
                  <p className="text-[11px] text-slate-500">
                    Safe chunked ingestion will process {batchResult.validRows.length} valid rows without blocking the browser.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {batchResult.invalidRows.length > 0 && (
                    <button
                      onClick={handleDownloadErrors}
                      className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Error Report ({batchResult.invalidRows.length})</span>
                    </button>
                  )}

                  <button
                    onClick={handleCommitBatch}
                    disabled={isImporting || batchResult.validRows.length === 0}
                    className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing ({importProgress.percent}%)...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Commit {batchResult.validRows.length} Valid Records</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Ingestion Progress Bar */}
              {isImporting && (
                <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Batch Ingestion Progress</span>
                    <span>
                      {importProgress.processed} / {importProgress.total} records ({importProgress.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 transition-all duration-300"
                      style={{ width: `${importProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Row-Level Errors Ledger (if any) */}
              {batchResult.invalidRows.length > 0 && (
                <div className="p-5 bg-white border border-rose-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Row-Level Error Report ({batchResult.invalidRows.length} rejected rows)
                      </h4>
                    </div>

                    <button
                      onClick={handleDownloadErrors}
                      className="text-xs font-semibold text-rose-700 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download As Excel</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 font-bold w-16">Row #</th>
                          <th className="p-2.5 font-bold w-48">Problematic Field</th>
                          <th className="p-2.5 font-bold">Failure Reason & Rejected Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchResult.invalidRows.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-slate-600 font-bold">{item.rowNumber}</td>
                            <td className="p-2.5 font-semibold text-slate-900">
                              {item.issues.map((i) => i.field).join(', ')}
                            </td>
                            <td className="p-2.5 text-slate-700">
                              {item.issues.map((i, iIdx) => (
                                <div key={iIdx} className="mb-0.5">
                                  <span className="text-rose-700 font-medium">{i.message}</span>
                                  {i.rejectedValue !== undefined && (
                                    <span className="text-slate-400 font-mono text-[10px] ml-1.5">
                                      (got: &quot;{String(i.rejectedValue)}&quot;)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              {batchResult.validRows.length > 0 && (
                <div className="p-5 bg-white border border-slate-200 rounded-lg">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Validated Rows Ready For Ingestion ({batchResult.validRows.length} rows)
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 font-bold w-12">#</th>
                          {MODULE_SCHEMAS[selectedModule]?.columns.slice(0, 6).map((c) => (
                            <th key={c.key} className="p-2.5 font-bold">
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchResult.validRows.slice(0, 20).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            {MODULE_SCHEMAS[selectedModule]?.columns.slice(0, 6).map((c) => (
                              <td key={c.key} className="p-2.5 text-slate-800">
                                {typeof row[c.key] === 'number'
                                  ? row[c.key].toLocaleString('en-IN')
                                  : String(row[c.key] || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {batchResult.validRows.length > 20 && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      Showing first 20 preview rows. All {batchResult.validRows.length} valid rows will be committed.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IMPORT JOB HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Audit Ledger of Completed Import Jobs</h3>
            <p className="text-xs text-slate-500 mb-4">
              Historical record of all bulk uploads, row-level validation outcomes, and who executed them
            </p>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Job Reference</th>
                    <th className="p-3 font-bold">Target Module</th>
                    <th className="p-3 font-bold">File Name & Format</th>
                    <th className="p-3 font-bold">Total Rows</th>
                    <th className="p-3 font-bold">Success / Errors</th>
                    <th className="p-3 font-bold">Imported By</th>
                    <th className="p-3 font-bold">Timestamp IST</th>
                    <th className="p-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{job.jobNo}</td>
                      <td className="p-3 font-semibold text-slate-800">{job.module}</td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">
                        {job.fileName}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{job.totalRows}</td>
                      <td className="p-3">
                        <span className="text-emerald-700 font-semibold">{job.successCount} ok</span>
                        {job.errorCount > 0 && (
                          <span className="text-rose-700 font-semibold ml-1.5">({job.errorCount} failed)</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700">{job.importedBy}</td>
                      <td className="p-3 text-slate-500">{formatDateIST(job.importedAt)}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                            job.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {job.status === 'completed' ? 'Completed' : 'Partial / Errors'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MODULE FAST EXPORTS */}
      {activeTab === 'quick_export' && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Instant Filtered Data Export Center</h3>
            <p className="text-xs text-slate-500 mb-4">
              Export live financial books, active client registries, and product portfolios into Microsoft Excel or CSV.
              Role-based access rules and commission redaction are strictly enforced.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map((mod) => (
                <div key={mod} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{mod}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Export active database records with standardized headers and schemas.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => handleQuickExport(mod, 'xlsx')}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200 rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>.XLSX</span>
                    </button>
                    <button
                      onClick={() => handleQuickExport(mod, 'csv')}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>.CSV</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Test Runner Modal */}
      <ImportDocTestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
};
