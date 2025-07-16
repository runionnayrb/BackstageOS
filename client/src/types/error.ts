// Extended Error type for conflict validation
export interface ConflictError extends Error {
  status?: number;
  conflicts?: Array<{
    contactId?: number;
    contactName?: string;
    locationId?: number;
    locationName?: string;
    conflictType: 'unavailable' | 'schedule_overlap' | 'location_unavailable';
    conflictTime: string;
    conflictDetails: string;
  }>;
}

// Type guard for conflict errors
export function isConflictError(error: any): error is ConflictError {
  return error && error.status === 409 && error.conflicts;
}