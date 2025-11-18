// Time formatting utilities that respect user's time format preference

export function formatTimeDisplay(timeString: string, timeFormat: '12' | '24' = '12'): string {
  if (!timeString || typeof timeString !== 'string') return '';
  
  const timeParts = timeString.split(':');
  if (timeParts.length !== 2) return timeString; // Return original if not in expected format
  
  const [hours, minutes] = timeParts.map(Number);
  
  if (timeFormat === '24') {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // 12-hour format
  if (hours === 0) {
    return `12:${minutes.toString().padStart(2, '0')} AM`;
  } else if (hours < 12) {
    return `${hours}:${minutes.toString().padStart(2, '0')} AM`;
  } else if (hours === 12) {
    return `12:${minutes.toString().padStart(2, '0')} PM`;
  } else {
    return `${hours - 12}:${minutes.toString().padStart(2, '0')} PM`;
  }
}

export function formatTimeFromMinutes(totalMinutes: number, timeFormat: '12' | '24' | string = '12'): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const format = timeFormat === '24' ? '24' : '12';
  return formatTimeDisplay(timeString, format);
}

export function getTimeGridLabels(startHour: number, endHour: number, timeFormat: '12' | '24' = '12'): { hour: number; label: string; position: number }[] {
  const labels = [];
  const totalHours = endHour - startHour;
  
  for (let i = 0; i <= totalHours; i++) {
    const hour = startHour + i;
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const label = formatTimeDisplay(timeString, timeFormat);
    const position = (i / totalHours) * 100; // Percentage position
    
    labels.push({ hour, label, position });
  }
  
  return labels;
}

export function parseScheduleSettings(settings: any) {
  if (!settings) return {};
  
  // Handle both string and object formats
  const scheduleSettings = typeof settings === 'string' 
    ? JSON.parse(settings) 
    : settings;
    
  return {
    timeFormat: scheduleSettings.timeFormat || '12',
    timezone: scheduleSettings.timeZone || scheduleSettings.timezone || 'America/New_York',
    weekStartDay: scheduleSettings.weekStartDay || 'sunday',
    workStartTime: scheduleSettings.workStartTime || '09:00',
    workEndTime: scheduleSettings.workEndTime || '18:00',
    allowConflicts: scheduleSettings.allowConflicts || false,
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

// Format a date as YYYY-MM-DD in the specified timezone (not UTC)
// Uses formatToParts for consistent cross-browser output
export function formatDateInTimezone(date: Date, timezone: string = 'America/New_York'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('Error formatting date in timezone:', error);
    // Fallback to simple local date format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}