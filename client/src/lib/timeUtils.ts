// Time formatting utilities that respect user's time format preference

export function formatTimeDisplay(timeString: string, timeFormat: '12' | '24' = '12', showNextDay: boolean = false): string {
  if (!timeString || typeof timeString !== 'string') return '';
  
  const timeParts = timeString.split(':');
  if (timeParts.length !== 2) return timeString; // Return original if not in expected format
  
  let [hours, minutes] = timeParts.map(Number);
  
  // Handle extended hours (24-28 representing next day 12AM-4AM)
  const isNextDay = hours >= 24;
  if (isNextDay) {
    hours = hours - 24; // Convert 24->0, 25->1, etc.
  }
  
  const nextDaySuffix = (isNextDay && showNextDay) ? ' +1' : '';
  
  if (timeFormat === '24') {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}${nextDaySuffix}`;
  }
  
  // 12-hour format
  if (hours === 0) {
    return `12:${minutes.toString().padStart(2, '0')} AM${nextDaySuffix}`;
  } else if (hours < 12) {
    return `${hours}:${minutes.toString().padStart(2, '0')} AM${nextDaySuffix}`;
  } else if (hours === 12) {
    return `12:${minutes.toString().padStart(2, '0')} PM${nextDaySuffix}`;
  } else {
    return `${hours - 12}:${minutes.toString().padStart(2, '0')} PM${nextDaySuffix}`;
  }
}

export function formatTimeFromMinutes(totalMinutes: number, timeFormat: '12' | '24' | string = '12', showNextDay: boolean = false): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const format = timeFormat === '24' ? '24' : '12';
  // Auto-detect if this is an extended hour (24+) and show next day indicator
  const isExtendedHour = hours >= 24;
  return formatTimeDisplay(timeString, format, showNextDay || isExtendedHour);
}

export function getTimeGridLabels(startHour: number, endHour: number, timeFormat: '12' | '24' = '12'): { hour: number; label: string; position: number }[] {
  const labels = [];
  const totalHours = endHour - startHour;
  
  for (let i = 0; i <= totalHours; i++) {
    const hour = startHour + i;
    // For extended hours (24+), pass the hour as-is and let formatTimeDisplay handle conversion
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    // Show +1 indicator for hours >= 24 (next day)
    const label = formatTimeDisplay(timeString, timeFormat, hour >= 24);
    const position = (i / totalHours) * 100; // Percentage position
    
    labels.push({ hour, label, position });
  }
  
  return labels;
}

// Type for custom sections on daily calls
export interface CustomSection {
  id: string;
  name: string;
  position: 'top' | 'bottom';
  order: number;
}

// Default sections - migrates from old announcementsPosition setting
export function getDefaultCustomSections(announcementsPosition: string = 'bottom'): CustomSection[] {
  return [
    {
      id: 'announcements',
      name: 'Announcements',
      position: announcementsPosition === 'top' ? 'top' : 'bottom',
      order: 0,
    }
  ];
}

// Performance numbering configuration
export interface PerformanceNumberingConfig {
  firstPerformanceEventId: number | null;
  startingNumber: number;
}

export function parseScheduleSettings(settings: any) {
  // Always return defaults, even if settings are undefined
  const defaultSettings = {
    timeFormat: '12',
    timezone: 'America/New_York',
    weekStartDay: 'sunday',
    workStartTime: '09:00',
    workEndTime: '18:00',
    dayStartHour: 8,  // 8 AM default
    dayEndHour: 24,   // Midnight default (can go up to 28 for 4 AM next day)
    nameDisplayFormat: 'firstInitialLastName',
    announcementsPosition: 'bottom',
    customSections: [] as CustomSection[],
    performanceNumbering: {
      firstPerformanceEventId: null,
      startingNumber: 1,
    } as PerformanceNumberingConfig,
  };
  
  if (!settings) return defaultSettings;
  
  // Handle both string and object formats
  const scheduleSettings = typeof settings === 'string' 
    ? JSON.parse(settings) 
    : settings;
  
  // Migration: if customSections doesn't exist, create from announcementsPosition
  let customSections = scheduleSettings.customSections;
  if (!customSections || customSections.length === 0) {
    customSections = getDefaultCustomSections(scheduleSettings.announcementsPosition || defaultSettings.announcementsPosition);
  }

  // Parse performance numbering config with defaults
  const performanceNumbering: PerformanceNumberingConfig = {
    firstPerformanceEventId: scheduleSettings.performanceNumbering?.firstPerformanceEventId ?? null,
    startingNumber: scheduleSettings.performanceNumbering?.startingNumber ?? 1,
  };
    
  return {
    timeFormat: scheduleSettings.timeFormat || defaultSettings.timeFormat,
    timezone: scheduleSettings.timeZone || scheduleSettings.timezone || defaultSettings.timezone,
    weekStartDay: scheduleSettings.weekStartDay || defaultSettings.weekStartDay,
    workStartTime: scheduleSettings.workStartTime || defaultSettings.workStartTime,
    workEndTime: scheduleSettings.workEndTime || defaultSettings.workEndTime,
    dayStartHour: scheduleSettings.dayStartHour ?? defaultSettings.dayStartHour,
    dayEndHour: scheduleSettings.dayEndHour ?? defaultSettings.dayEndHour,
    nameDisplayFormat: scheduleSettings.nameDisplayFormat || defaultSettings.nameDisplayFormat,
    announcementsPosition: scheduleSettings.announcementsPosition || defaultSettings.announcementsPosition,
    customSections: customSections as CustomSection[],
    performanceNumbering,
  };
}

export function formatTimestamp(date: Date, timeFormat: '12' | '24' = '12', timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: timeFormat === '12',
  };

  if (timezone) {
    options.timeZone = timezone;
  }

  return date.toLocaleTimeString(undefined, options);
}

export function getTimezoneAbbreviation(timezone: string): string {
  try {
    // Get the timezone abbreviation using Intl.DateTimeFormat
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone;
    
    return timeZoneName;
  } catch (error) {
    console.warn('Error getting timezone abbreviation:', error);
    return timezone;
  }
}

// Format a Date object as a simple YYYY-MM-DD string (calendar date, no timezone)
// Use this for event dates which are stored as simple date strings
export function formatAsCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}