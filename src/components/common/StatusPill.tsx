import React from 'react';

interface StatusPillProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, variant, className = '' }) => {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, '');

  let colorClass = 'text-slate-600';
  let dotColor = 'bg-slate-400';

  if (
    variant === 'success' ||
    ['active', 'verified', 'disbursed', 'allotted', 'completed', 'paid', 'renewed', 'inforce', 'ontrack', 'exceeded', 'approved'].includes(normalized)
  ) {
    colorClass = 'text-emerald-700';
    dotColor = 'bg-emerald-500';
  } else if (
    variant === 'warning' ||
    ['pending', 'graceperiod', 'lagging', 'processing', 'underwriting', 'draft', 'pendingallotment', 'pendingapproval', 'onhold'].includes(normalized)
  ) {
    colorClass = 'text-amber-700';
    dotColor = 'bg-amber-500';
  } else if (
    variant === 'error' ||
    ['lapsed', 'rejected', 'expired', 'suspended', 'disputed', 'prematureclosed'].includes(normalized)
  ) {
    colorClass = 'text-rose-700';
    dotColor = 'bg-rose-500';
  } else if (
    variant === 'info' ||
    ['expected', 'sanctioned', 'loginsubmitted', 'paidup', 'matured'].includes(normalized)
  ) {
    colorClass = 'text-blue-700';
    dotColor = 'bg-blue-500';
  }

  const formattedLabel = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colorClass} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>{formattedLabel}</span>
    </span>
  );
};
