/**
 * Utility functions for platform operations
 * Replaces mock data operations with real API integrations
 */

export function formatPlatformCurrency(value: number): string {
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `Rs. ${(value / 1000).toFixed(0)}K`;
  return `Rs. ${value}`;
}

export function formatCurrency(value: number, currency = 'INR'): string {
  if (currency === 'INR') {
    return formatPlatformCurrency(value);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStatusBadgeColor(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    'pending-admin': 'bg-yellow-100 text-yellow-800',
    'pending-super-admin': 'bg-orange-100 text-orange-800',
    approved: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    live: 'bg-green-100 text-green-800',
    published: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    canceled: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
    blocked: 'bg-red-100 text-red-800',
    watchlist: 'bg-purple-100 text-purple-800',
    paused: 'bg-gray-100 text-gray-800',
    verified: 'bg-green-100 text-green-800',
    not_submitted: 'bg-gray-100 text-gray-800',
  };
  return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    'pending-admin': 'Pending Admin Review',
    'pending-super-admin': 'Pending Super Admin Review',
    approved: 'Approved',
    active: 'Active',
    live: 'Live',
    published: 'Published',
    draft: 'Draft',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    rejected: 'Rejected',
    completed: 'Completed',
    blocked: 'Blocked',
    watchlist: 'Watchlist',
    paused: 'Paused',
    verified: 'Verified',
    not_submitted: 'Not Submitted',
  };
  return statusMap[status.toLowerCase()] || status;
}

export function getRiskLevelColor(level: string): string {
  const riskMap: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };
  return riskMap[level.toLowerCase()] || 'bg-gray-100 text-gray-800';
}
