import React, { useState } from 'react';
import { Modal } from './Modal';
import { runImportExportDocTestSuite, ImportDocTestResult } from '../../tests/importExportDocTests';
import { CheckCircle2, XCircle, Play, ShieldAlert, FileSpreadsheet, Lock, FileCheck } from 'lucide-react';

interface ImportDocTestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportDocTestRunnerModal: React.FC<ImportDocTestRunnerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [results, setResults] = useState<ImportDocTestResult[]>(() => runImportExportDocTestSuite());
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleRerun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResults(runImportExportDocTestSuite());
      setIsRunning(false);
    }, 250);
  };

  const categories = [
    'all',
    'Data Validation',
    'Duplicate Detection',
    'File Constraints',
    'Private Storage & Signed URLs',
    'RBAC & Authorization',
  ];

  const filteredResults =
    selectedCategory === 'all' ? results : results.filter((r) => r.category === selectedCategory);

  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import / Export & Private Document Security Verification"
      subtitle="Automated test harness verifying Excel/CSV parsing, type validation, duplicate detection, signed URLs, and RBAC export rules"
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs">
            {allPassed ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All {passedCount} tests passed cleanly
              </span>
            ) : (
              <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Some security or validation tests failed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRerun}
              disabled={isRunning}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Running...' : 'Re-run Test Suite'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Tests' : cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {filteredResults.map((test) => (
            <div
              key={test.testId}
              className={`p-3.5 rounded-lg border text-xs transition-all ${
                test.passed
                  ? 'bg-emerald-50/50 border-emerald-200/80'
                  : 'bg-rose-50/50 border-rose-200/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{test.testName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                        {test.testId}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        [{test.category}]
                      </span>
                    </div>

                    <div className="mt-1.5 space-y-1 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-medium">Expected: </span>
                        <span className="text-slate-700">{test.expected}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Actual: </span>
                        <span
                          className={`font-semibold ${
                            test.passed ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {test.actual}
                        </span>
                      </div>
                      <div className="text-slate-500 font-mono text-[10px]">
                        {test.details}
                      </div>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-sm shrink-0 ${
                    test.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {test.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
