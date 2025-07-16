import { DatabaseStorage } from '../storage.js';

export interface ConflictValidationResult {
  hasConflicts: boolean;
  conflicts: Array<{
    contactId?: number;
    contactName?: string;
    locationId?: number;
    locationName?: string;
    conflictType: 'unavailable' | 'schedule_overlap' | 'location_unavailable';
    conflictTime: string;
    conflictDetails: string;
  }>;
}

export class ConflictValidationService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Validates if participants and locations have availability conflicts for a given event
   */
  async validateEventConflicts(
    projectId: number,
    date: string,
    startTime: string,
    endTime: string,
    participantIds: number[],
    locationName?: string
  ): Promise<ConflictValidationResult> {
    const conflicts: ConflictValidationResult['conflicts'] = [];

    // Check participant availability conflicts
    const availabilityConflicts = await this.checkAvailabilityConflicts(
      projectId,
      date,
      startTime,
      endTime,
      participantIds
    );
    conflicts.push(...availabilityConflicts);

    // Check participant schedule overlap conflicts
    const scheduleConflicts = await this.checkScheduleOverlapConflicts(
      projectId,
      date,
      startTime,
      endTime,
      participantIds
    );
    conflicts.push(...scheduleConflicts);

    // Check location availability conflicts
    if (locationName) {
      const locationConflicts = await this.checkLocationAvailabilityConflicts(
        projectId,
        date,
        startTime,
        endTime,
        locationName
      );
      conflicts.push(...locationConflicts);
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * Check if participants have marked themselves as unavailable during the event time
   */
  private async checkAvailabilityConflicts(
    projectId: number,
    date: string,
    startTime: string,
    endTime: string,
    participantIds: number[]
  ): Promise<ConflictValidationResult['conflicts']> {
    const conflicts: ConflictValidationResult['conflicts'] = [];

    // Get all availability records for this project and date
    const availabilityRecords = await this.storage.getContactAvailabilityByProjectAndDate(projectId, date);

    // Get contact info for participant names
    const contacts = await this.storage.getContactsByProjectId(projectId);
    const contactMap = new Map(contacts.map((c: any) => [c.id, `${c.firstName} ${c.lastName}`]));

    for (const participantId of participantIds) {
      const participantAvailability = availabilityRecords.filter(
        record => record.contactId === participantId && record.availabilityType === 'unavailable'
      );

      for (const availability of participantAvailability) {
        if (this.hasTimeOverlap(startTime, endTime, availability.startTime, availability.endTime)) {
          conflicts.push({
            contactId: participantId,
            contactName: contactMap.get(participantId) || 'Unknown Contact',
            conflictType: 'unavailable',
            conflictTime: `${availability.startTime} - ${availability.endTime}`,
            conflictDetails: `${contactMap.get(participantId) || 'Unknown Contact'} is unavailable during ${availability.startTime} - ${availability.endTime}${availability.notes ? `: ${availability.notes}` : ''}`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if participants are already scheduled in overlapping events
   */
  private async checkScheduleOverlapConflicts(
    projectId: number,
    date: string,
    startTime: string,
    endTime: string,
    participantIds: number[]
  ): Promise<ConflictValidationResult['conflicts']> {
    const conflicts: ConflictValidationResult['conflicts'] = [];

    // Get all existing events for this project and date
    const existingEvents = await this.storage.getScheduleEventsByProjectAndDate(projectId, date);

    // Get contact info for participant names
    const contacts = await this.storage.getContactsByProjectId(projectId);
    const contactMap = new Map(contacts.map((c: any) => [c.id, `${c.firstName} ${c.lastName}`]));

    for (const participantId of participantIds) {
      for (const event of existingEvents) {
        // Check if this participant is in the existing event
        const isParticipantInEvent = event.participants.some(
          (p: any) => p.contactId === participantId
        );

        if (isParticipantInEvent) {
          // Check if the events overlap in time
          if (this.hasTimeOverlap(startTime, endTime, event.startTime, event.endTime)) {
            conflicts.push({
              contactId: participantId,
              contactName: contactMap.get(participantId) || 'Unknown Contact',
              conflictType: 'schedule_overlap',
              conflictTime: `${event.startTime} - ${event.endTime}`,
              conflictDetails: `${contactMap.get(participantId) || 'Unknown Contact'} is unavailable during ${event.startTime} - ${event.endTime}`
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Checks if two time ranges overlap
   */
  private hasTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    // Convert time strings to minutes for easier comparison
    const start1Minutes = this.timeToMinutes(start1);
    const end1Minutes = this.timeToMinutes(end1);
    const start2Minutes = this.timeToMinutes(start2);
    const end2Minutes = this.timeToMinutes(end2);

    // Check if ranges overlap: (start1 < end2 && end1 > start2)
    return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
  }

  /**
   * Check if location is marked as unavailable during the event time
   */
  private async checkLocationAvailabilityConflicts(
    projectId: number,
    date: string,
    startTime: string,
    endTime: string,
    locationName: string
  ): Promise<ConflictValidationResult['conflicts']> {
    const conflicts: ConflictValidationResult['conflicts'] = [];

    // Get location availability records for this project and date
    const locationAvailabilityRecords = await this.storage.getLocationAvailabilityByProjectAndDate(projectId, date);
    
    // Get all locations for this project to find the location ID by name
    const locations = await this.storage.getEventLocationsByProjectId(projectId);
    const location = locations.find(loc => loc.name === locationName);
    
    if (!location) {
      // If location doesn't exist in database, no conflicts can exist
      return conflicts;
    }

    // Filter for this specific location and unavailable type
    const locationUnavailability = locationAvailabilityRecords.filter(
      record => record.locationId === location.id && record.type === 'unavailable'
    );

    for (const availability of locationUnavailability) {
      if (this.hasTimeOverlap(startTime, endTime, availability.startTime, availability.endTime)) {
        conflicts.push({
          locationId: location.id,
          locationName: locationName,
          conflictType: 'location_unavailable',
          conflictTime: `${availability.startTime} - ${availability.endTime}`,
          conflictDetails: `Location "${locationName}" is marked as unavailable during ${availability.startTime} - ${availability.endTime}${availability.notes ? `: ${availability.notes}` : ''}`
        });
      }
    }

    return conflicts;
  }

  /**
   * Converts time string (HH:MM or HH:MM:SS) to minutes since midnight
   */
  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }
}