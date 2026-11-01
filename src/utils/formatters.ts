/**
 * Formatting utilities tailored for Indian Financial Distribution (IFBMS)
 * Compliant with INR numbering formats and Asia/Kolkata timezone
 */

export function formatINR(amount: number | null | undefined, compact: boolean = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';

  if (compact) {
    const abs = Math.abs(amount);
    if (abs >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    if (abs >= 1000) {
      return `₹${(amount / 1000).toFixed(1)} K`;
    }
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatINRPrecise(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

export function formatDateTimeIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return `${value.toFixed(2)}%`;
}

export function generateClientCode(index: number): string {
  return `IX-CL-${String(1000 + index).padStart(4, '0')}`;
}

export function generateSubBrokerCode(index: number): string {
  return `IX-SB-${String(100 + index).padStart(3, '0')}`;
}

export function generateTransactionNo(index: number): string {
  return `TXN-${new Date().getFullYear()}-${String(5000 + index).padStart(5, '0')}`;
}
