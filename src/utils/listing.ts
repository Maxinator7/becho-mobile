/** Shared listing vocabulary: conditions and statuses. */

export const CONDITIONS = [
  { value: 'NEW', label: 'New', hint: 'Unused, sealed or tags on' },
  { value: 'LIKE_NEW', label: 'Like new', hint: 'Barely used, no marks' },
  { value: 'USED', label: 'Used', hint: 'Normal signs of use' },
  { value: 'REFURBISHED', label: 'Refurbished', hint: 'Restored to working order' },
] as const;

export const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  LIKE_NEW: 'Like new',
  USED: 'Used',
  REFURBISHED: 'Refurbished',
  FOR_PARTS: 'For parts',
};

export type Tone = 'success' | 'warning' | 'danger' | 'primary' | 'neutral';

/** Label and colour for a listing status chip (seller's view). */
export function statusChip(status: string, verified?: boolean): { label: string; tone: Tone } {
  switch (status) {
    case 'LIVE':
      return { label: verified ? 'Live & verified' : 'Live', tone: 'success' };
    case 'RESERVED':
      return { label: 'Reserved', tone: 'primary' };
    case 'SOLD':
      return { label: 'Sold', tone: 'neutral' };
    case 'DRAFT':
      return { label: 'Draft', tone: 'neutral' };
    case 'SUBMITTED':
    case 'PENDING_REVIEW':
    case 'APPROVED':
      return { label: 'Under review', tone: 'warning' };
    case 'CHANGES_REQUESTED':
      return { label: 'Changes requested', tone: 'danger' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'danger' };
    case 'SUSPENDED':
      return { label: 'Suspended', tone: 'danger' };
    case 'EXPIRED':
      return { label: 'Expired', tone: 'neutral' };
    default:
      return { label: status.replace(/_/g, ' ').toLowerCase(), tone: 'neutral' };
  }
}

/** Statuses a seller may edit and resubmit (mirrors the API). */
export const EDITABLE_STATUSES = ['DRAFT', 'REJECTED', 'CHANGES_REQUESTED'];
/** Statuses a seller may delete (mirrors the API). */
export const DELETABLE_STATUSES = ['DRAFT', 'EXPIRED', 'REJECTED', 'CHANGES_REQUESTED', 'SOLD'];
