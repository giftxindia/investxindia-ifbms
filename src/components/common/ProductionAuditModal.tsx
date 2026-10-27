import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle,
  Lock,
  Layers,
  FileText,
  Clock,
  Sparkles,
  Server,
  Database,
} from 'lucide-react';
import { Modal } from './Modal';
import { PRODUCTION_AUDIT_TEST_SUITE, AuditTestCase } from '../../tests/productionAuditTests';
import { exportToExcel } from '../../services/excelService';

interface ProductionAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestRunResult {
  testId: string;
  category: string;
  title: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: any;
}

export const ProductionAuditModal: React.FC<ProductionAuditModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Record<string, TestRunResult>>({});
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<TestRunResult | null>(null);

  const categories = ['all', 'Tenant Isolation', 'Privilege Defense', 'Vault Security', 'Data Integrity'];

  const runAllTests = async () => {
    setIsRunning(true);
    const newResults: Record<string, TestRunResult> = {};

    for (const test of PRODUCTION_AUDIT_TEST_SUITE) {
      const start = performance.now();
      try {
        const out = await test.run();
        const durationMs = Math.round(performance.now() - start);
        newResults[test.id] = {
          testId: test.id,
          category: test.category,
          title: test.title,
          passed: out.passed,
          message: out.message,
          durationMs,
          details: out.details,
        };
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - start);
        newResults[test.id] = {
          testId: test.id,
          category: test.category,
          title: test.title,
          passed: false,
          message: `Unexpected test execution exception: ${err.message}`,
          durationMs,
        };
      }
      setResults({ ...newResults });
      // Short delay for visible step progression
      await new Promise((r) => setTimeout(r, 60));
    }

    setIsRunning(false);
  };

  const totalTests = PRODUCTION_AUDIT_TEST_SUITE.length;
  const executedCount = Object.keys(results).length;
  const passedCount = Object.values(results).filter((r) => r.passed).length;
  const failedCount = Object.values(results).filter((r) => !r.passed).length;
  const allPassed = executedCount === totalTests && failedCount === 0;

  const filteredTests = PRODUCTION_AUDIT_TEST_SUITE.filter((t) => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    return true;
  });

  const handleExportAuditReport = () => {
    const reportRows = PRODUCTION_AUDIT_TEST_SUITE.map((t) => {
      const res = results[t.id];
      return {
        Test_ID: t.id,
        Security_Category: t.category,
        Test_Title: t.title,
        Expected_Outcome: t.expectedOutcome,
        Verification_Status: res ? (res.passed ? 'PASSED' : 'FAILED') : 'NOT_RUN',
        Execution_Time_ms: res ? res.durationMs : 0,
        Diagnostic_Message: res ? res.message : 'Pending execution',
        Audit_Timestamp_IST: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      };
    });

    const filename = `Investxindia_Production_Security_Audit_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(reportRows, filename, 'Security_Audit_Report');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Production Security & Readiness Audit Suite"
      subtitle="Automated Row Level Security, Tenant Isolation, RBAC Defenses & Financial Integrity Verification"
      maxWidth="4xl"
    >
      <div className="space-y-5 text-xs">
        {/* Header Stats Zone */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Security Tests</span>
            <span className="text-xl font-bold text-slate-900 font-mono">{totalTests}</span>
          </div>
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
            <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Passed Verifications</span>
            <span className="text-xl font-bold text-emerald-700 font-mono">{passedCount}</span>
          </div>
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg">
            <span className="text-[10px] text-rose-600 uppercase font-semibold block">Failed / Vulnerable</span>
            <span className="text-xl font-bold text-rose-700 font-mono">{failedCount}</span>
          </div>
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
            <span className="text-[10px] text-blue-600 uppercase font-semibold block">System Status</span>
            <span className="text-sm font-bold text-blue-800 flex items-center gap-1 mt-1">
              {allPassed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Production Ready</span>
                </>
              ) : executedCount > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Attention Required</span>
                </>
              ) : (
                <span>Ready to Run</span>
              )}
            </span>
          </div>
        </div>

        {/* Action Controls & Category Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                  activeCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat === 'all' ? 'All Tests' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAuditReport}
              disabled={executedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Audit Report</span>
            </button>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-md transition-colors shadow-xs"
            >
              {isRunning ? (
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isRunning ? 'Auditing System...' : 'Run Security Suite'}</span>
            </button>
          </div>
        </div>

        {/* Test List Container */}
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[380px] overflow-y-auto bg-white">
          {filteredTests.map((test) => {
            const res = results[test.id];
            return (
              <div
                key={test.id}
                onClick={() => setSelectedResult(res || null)}
                className="p-3 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5">
                    {res ? (
                      res.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )
                    ) : (
                      <Clock className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{test.id}</span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {test.category}
                      </span>
                      <span className="font-semibold text-slate-900 truncate">{test.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{test.description}</p>
                    {res && (
                      <p
                        className={`text-[11px] mt-1 font-medium ${
                          res.passed ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {res.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {res ? (
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                        res.passed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {res.passed ? 'PASSED' : 'FAILED'} · {res.durationMs}ms
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] text-slate-400 bg-slate-100 rounded">
                      Queued
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Test Diagnostic Inspection */}
        {selectedResult && (
          <div className="p-3 bg-slate-900 text-slate-200 rounded-lg space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
              <span className="font-bold text-white">Diagnostic Output: {selectedResult.testId}</span>
              <span>{selectedResult.durationMs} ms</span>
            </div>
            <p className={selectedResult.passed ? 'text-emerald-400' : 'text-rose-400'}>
              {selectedResult.message}
            </p>
            {selectedResult.details && (
              <pre className="text-slate-400 text-[10px] bg-slate-950 p-2 rounded max-h-28 overflow-x-auto">
                {JSON.stringify(selectedResult.details, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
