import React, { useState } from 'react';
import { Modal } from './Modal';
import { runBrokerageTestSuite, TestResult } from '../../tests/brokerageTests';
import { CheckCircle2, XCircle, Play, ShieldAlert } from 'lucide-react';

interface BrokerageTestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrokerageTestRunnerModal: React.FC<BrokerageTestRunnerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [results, setResults] = useState<TestResult[]>(() => runBrokerageTestSuite());
  const [isRunning, setIsRunning] = useState(false);

  const handleRerun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResults(runBrokerageTestSuite());
      setIsRunning(false);
    }, 250);
  };

  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Brokerage Engine & Permissions Verification"
      subtitle="Automated test suite verifying formulas, slabs, TDS Section 194H, and RBAC matrix"
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs">
            {allPassed ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All {passedCount} tests passed
              </span>
            ) : (
              <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Some tests failed
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
              <span>{isRunning ? 'Running...' : 'Re-run Tests'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {results.map((test, index) => (
          <div
            key={index}
            className={`p-3.5 rounded-lg border text-xs ${
              test.passed ? 'bg-slate-50/70 border-slate-200' : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2">
                {test.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold text-slate-900">{test.testName}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                {test.category}
              </span>
            </div>

            <p className="text-slate-600 text-[11px] mb-2">{test.details}</p>

            <div className="bg-white p-2 rounded border border-slate-200 font-mono text-[10px] space-y-1">
              <div className="text-slate-500">
                <span className="font-semibold text-slate-700">Expected:</span> {test.expected}
              </div>
              <div className={test.passed ? 'text-slate-800' : 'text-rose-700'}>
                <span className="font-semibold text-slate-700">Actual:</span> {test.actual}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
