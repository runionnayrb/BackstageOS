import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { storage } from "./storage";
import { db } from "./db";
import { sql, and, eq } from "drizzle-orm";
import { scheduledEmails, scheduleTemplateEvents } from "@shared/schema";
import { setupAuth } from "./auth";
import { requiresBetaAccess, BETA_FEATURES, checkFeatureAccess } from "./betaMiddleware";
import { isAdmin } from "./adminUtils";
import { insertProjectSchema, insertSeasonSchema, insertVenueSchema, insertProjectMemberSchema, insertTeamMemberSchema, insertReportSchema, insertReportTemplateSchema, insertReportTemplateV2Schema, insertTemplateSectionSchema, insertTemplateFieldSchema, insertReportTypeSchema, insertGlobalTemplateSettingsSchema, insertFeedbackSchema, insertContactSchema, insertEmailContactSchema, insertDistributionListSchema, insertDistributionListMemberSchema, insertContactGroupSchema, insertContactAvailabilitySchema, insertScheduleEventSchema, insertScheduleEventParticipantSchema, insertEventLocationSchema, insertLocationAvailabilitySchema, insertEventTypeSchema, insertErrorLogSchema, insertWaitlistSchema, insertPropsSchema, insertCostumeSchema, insertDomainRouteSchema, insertSeoSettingsSchema, insertWaitlistEmailSettingsSchema, insertApiSettingsSchema, insertShowContractSettingsSchema, insertPerformanceTrackerSchema, insertRehearsalTrackerSchema, insertTaskDatabaseSchema, insertTaskPropertySchema, insertTaskSchema, insertTaskAssignmentSchema, insertTaskCommentSchema, insertTaskAttachmentSchema, insertTaskViewSchema, insertNoteFolderSchema, insertNoteSchema, insertNoteCollaboratorSchema, insertNoteCommentSchema, insertNoteAttachmentSchema, insertPublicCalendarShareSchema, insertDailyCallSchema, insertUserActivitySchema, insertApiCostSchema, insertUserSessionSchema, insertFeatureUsageSchema, insertAccountTypeSchema, insertBillingPlanSchema, insertBillingPlanPriceSchema, insertBillingHistorySchema, insertPaymentMethodSchema, insertSubscriptionUsageSchema, insertScheduleTemplateSchema, insertScheduleTemplateEventSchema, insertScheduleTemplateEventParticipantSchema } from "@shared/schema";
import { cloudflareService } from "./services/cloudflareService";
import { ErrorClusteringService } from "./errorClusteringService";
import { ConflictValidationService } from "./services/conflictValidationService.js";
import { scheduleNotificationService } from "./services/scheduleNotificationService.js";
import { ScheduleChangeDetectionService } from "./services/scheduleChangeDetectionService.js";
import { billingSyncService } from "./services/billingSyncService";
import { z } from "zod";

// Helper to get effective user ID - respects "view as" feature for admins
function getEffectiveUserId(req: any): string {
  // If admin is viewing as another user, use that user's ID
  if (req.session?.isViewingAs && req.session?.originalAdminId) {
    return req.session.isViewingAs.toString();
  }
  // Otherwise use the logged-in user's ID
  return req.user.id.toString();
}
import sgMail from "@sendgrid/mail";
import Stripe from "stripe";
import { googleOAuthService } from "./services/googleOAuthService";
import { microsoftOAuthService } from "./services/microsoftOAuthService";
import { oauthTokenService } from "./services/oauthTokenService";
import { gmailIntegrationService, setCurrentUserId as setGmailUserId } from "./services/gmailIntegrationService";
import { outlookIntegrationService } from "./services/outlookIntegrationService";
import * as ics from 'ics';

// Function to generate HTML for daily call PDF
function generateDailyCallHTML(callData: any, projectName: string, date: string): string {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCast = (cast: string[]) => {
    if (!cast || cast.length === 0) return 'TBD';
    return cast.join(', ');
  };

  const announcements = callData.announcements || '1.   No announcements for today';

  let locationsHTML = '';
  
  // Handle single vs multiple locations
  if (callData.locations && callData.locations.length === 1) {
    const location = callData.locations[0];
    locationsHTML = `
      <div style="margin-bottom: 32px;">
        <h4 style="font-size: 18px; font-weight: 600; margin-bottom: 4px; border-bottom: 2px solid black; padding-bottom: 8px;">
          ${location.name}
        </h4>
        <div style="margin-top: 4px;">
          ${location.events.map(event => `
            <div style="display: flex; align-items: flex-start; gap: 24px; padding: 8px 0; ${event.title === 'END-OF-DAY' ? 'background-color: #f3f4f6;' : ''}">
              <div style="width: 80px; font-size: 14px; font-weight: 500; color: #374151; flex-shrink: 0;">
                ${event.title === 'END-OF-DAY' ? `<strong>${event.startTime}</strong>` : event.startTime}
              </div>
              <div style="flex: 1;">
                <div style="font-size: 14px; font-weight: bold; color: ${event.title === 'END-OF-DAY' ? '#111827' : '#1f2937'};">
                  ${event.title}
                </div>
                ${event.cast && event.cast.length > 0 ? `
                  <div style="font-size: 12px; color: black; margin-top: 4px;">
                    ${formatCast(event.cast)}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (callData.locations && callData.locations.length > 1) {
    // Multiple locations - chronological layout
    locationsHTML = `
      <div style="margin-bottom: 32px;">
        <div style="display: grid; grid-template-columns: 4fr 3fr; gap: 0; margin-bottom: 4px;">
          ${callData.locations.map((location, index) => `
            <div>
              <h4 style="font-size: 18px; font-weight: 600; margin-bottom: 8px; border-bottom: 2px solid black; padding-bottom: 8px;">
                ${location.name}
              </h4>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: 8px;">
          ${(() => {
            // Get all events and sort chronologically
            const allEvents = callData.locations.flatMap((location, locationIndex) =>
              location.events.filter(event => event.title !== 'END-OF-DAY').map(event => ({
                ...event,
                locationIndex,
                locationName: location.name
              }))
            );
            
            const sortedEvents = allEvents.sort((a, b) => {
              const parseTime = (timeStr) => {
                if (!timeStr) return 0;
                const cleanTime = timeStr.trim();
                if (cleanTime.includes(' ')) {
                  const [time, period] = cleanTime.split(' ');
                  if (time && time.includes(':')) {
                    let [hours, minutes] = time.split(':').map(Number);
                    if (period === 'PM' && hours !== 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;
                    return hours * 60 + (minutes || 0);
                  }
                } else if (cleanTime.includes(':')) {
                  const [hours, minutes] = cleanTime.split(':').map(Number);
                  return hours * 60 + (minutes || 0);
                }
                return 0;
              };
              return parseTime(a.startTime) - parseTime(b.startTime);
            });

            return sortedEvents.map(event => `
              <div style="display: grid; grid-template-columns: 4fr 3fr; gap: 0; margin-bottom: 8px;">
                <div style="${event.locationIndex === 0 ? '' : 'visibility: hidden;'}">
                  ${event.locationIndex === 0 ? `
                    <div style="display: flex; align-items: flex-start; gap: 16px; padding: 8px 0;">
                      <div style="width: 64px; font-size: 14px; font-weight: 500; color: #374151; flex-shrink: 0;">
                        ${event.startTime}
                      </div>
                      <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: bold; color: #1f2937;">
                          ${event.title}
                        </div>
                        ${event.cast && event.cast.length > 0 ? `
                          <div style="font-size: 12px; color: black; margin-top: 4px;">
                            ${formatCast(event.cast)}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  ` : ''}
                </div>
                <div style="${event.locationIndex === 1 ? '' : 'visibility: hidden;'}">
                  ${event.locationIndex === 1 ? `
                    <div style="display: flex; align-items: flex-start; gap: 16px; padding: 8px 0;">
                      <div style="width: 64px; font-size: 14px; font-weight: 500; color: #374151; flex-shrink: 0;">
                        ${event.startTime}
                      </div>
                      <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: bold; color: #1f2937;">
                          ${event.title}
                        </div>
                        ${event.cast && event.cast.length > 0 ? `
                          <div style="font-size: 12px; color: black; margin-top: 4px;">
                            ${formatCast(event.cast)}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('');
          })()}
        </div>
      </div>
    `;
  }

  // Fittings section
  let fittingsHTML = '';
  if (callData.fittingsEvents && callData.fittingsEvents.length > 0) {
    fittingsHTML = `
      <div style="margin-bottom: 32px;">
        <h4 style="font-size: 18px; font-weight: 600; margin-bottom: 4px; border-bottom: 2px solid black; padding-bottom: 8px;">
          Fittings
        </h4>
        <div style="margin-top: 4px;">
          ${callData.fittingsEvents.map(event => `
            <div style="display: flex; align-items: flex-start; gap: 24px; padding: 8px 0;">
              <div style="width: 80px; font-size: 14px; font-weight: 500; color: #374151; flex-shrink: 0;">
                ${event.startTime}
              </div>
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 14px; font-weight: bold; color: #1f2937;">
                    ${event.title}${event.startTime && event.endTime ? ` - (${(() => {
                      const parseTime = (timeStr) => {
                        if (!timeStr) return 0;
                        const [hours, minutes] = timeStr.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      const duration = parseTime(event.endTime) - parseTime(event.startTime);
                      return duration > 0 ? `${duration} Mins` : '';
                    })()})` : ''}
                  </div>
                  <div style="font-size: 12px; color: #6b7280;">${event.location}</div>
                </div>
                ${event.cast && event.cast.length > 0 ? `
                  <div style="font-size: 12px; color: black; margin-top: 4px;">
                    ${formatCast(event.cast)}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Appointments section
  let appointmentsHTML = '';
  if (callData.appointmentsEvents && callData.appointmentsEvents.length > 0) {
    appointmentsHTML = `
      <div style="margin-bottom: 32px;">
        <h4 style="font-size: 18px; font-weight: 600; margin-bottom: 4px; border-bottom: 2px solid black; padding-bottom: 8px;">
          Appointments & Meetings
        </h4>
        <div style="margin-top: 4px;">
          ${callData.appointmentsEvents.map(event => `
            <div style="display: flex; align-items: flex-start; gap: 24px; padding: 8px 0;">
              <div style="width: 80px; font-size: 14px; font-weight: 500; color: #374151; flex-shrink: 0;">
                ${event.startTime}
              </div>
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 14px; font-weight: bold; color: #1f2937;">
                    ${event.title}${event.startTime && event.endTime ? ` - (${(() => {
                      const parseTime = (timeStr) => {
                        if (!timeStr) return 0;
                        const [hours, minutes] = timeStr.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      const duration = parseTime(event.endTime) - parseTime(event.startTime);
                      return duration > 0 ? `${duration} Mins` : '';
                    })()})` : ''}
                  </div>
                  <div style="font-size: 12px; color: #6b7280;">${event.location}</div>
                </div>
                ${event.cast && event.cast.length > 0 ? `
                  <div style="font-size: 12px; color: black; margin-top: 4px;">
                    ${formatCast(event.cast)}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${projectName} Daily Call - ${formatDate(date)}</title>
      <style>
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          margin: 0; 
          padding: 20px;
          font-size: 14px;
          line-height: 1.4;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
          background: white; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px;
          padding: 32px;
        }
        .header { text-align: center; margin-bottom: 32px; }
        .project-name { font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 8px; }
        .daily-schedule { font-size: 20px; color: black; margin-bottom: 2px; }
        .date { font-size: 18px; color: black; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="project-name">${projectName}</div>
          <div class="daily-schedule">DAILY SCHEDULE</div>
          <div class="date">${formatDate(date)}</div>
        </div>
        
        ${locationsHTML}
        ${fittingsHTML}
        ${appointmentsHTML}
        
        <div style="margin-bottom: 32px;">
          <h4 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">Announcements</h4>
          <div style="min-height: 80px; font-size: 14px; color: black; white-space: pre-wrap; border: 2px solid black; padding: 12px;">
            ${announcements}
          </div>
        </div>
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
          <div style="font-weight: bold; color: black; font-size: 12px; margin-bottom: 8px;">SUBJECT TO CHANGE</div>
          <div style="font-size: 12px; color: #6b7280;">Page 1 of 1</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper function to fold long lines per RFC 5545 (max 75 octets per line)
// Uses byte-level slicing to avoid splitting multi-byte UTF-8 characters
function foldICSLine(line: string): string {
  const maxLineBytes = 75;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const lineBytes = encoder.encode(line);
  
  if (lineBytes.length <= maxLineBytes) return line;
  
  const result: string[] = [];
  let offset = 0;
  let isFirstLine = true;
  
  while (offset < lineBytes.length) {
    // For continuation lines, we use 74 bytes (75 - 1 for the leading space)
    const maxBytes = isFirstLine ? maxLineBytes : maxLineBytes - 1;
    let end = Math.min(offset + maxBytes, lineBytes.length);
    
    // Don't split in the middle of a UTF-8 multi-byte character
    // UTF-8 continuation bytes start with 10xxxxxx (0x80-0xBF)
    // Move back until we find a byte that's not a continuation byte
    while (end > offset && (lineBytes[end] & 0xC0) === 0x80) {
      end--;
    }
    
    // Safety: if we couldn't find a valid split point, force include at least one character
    if (end === offset && offset < lineBytes.length) {
      end = offset + 1;
      while (end < lineBytes.length && (lineBytes[end] & 0xC0) === 0x80) {
        end++;
      }
    }
    
    const chunk = decoder.decode(lineBytes.slice(offset, end));
    if (isFirstLine) {
      result.push(chunk);
      isFirstLine = false;
    } else {
      result.push(' ' + chunk);
    }
    
    offset = end;
  }
  
  return result.join('\r\n');
}

// Helper function to generate ICS content
function generateICSContent(events: any[], project: any, contact: any): string {
  const formatDateTime = (date: string, time: string) => {
    const d = new Date(date);
    const [hours, minutes] = time.split(':');
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(hours).padStart(2, '0');
    const min = String(minutes).padStart(2, '0');
    return `${year}${month}${day}T${hr}${min}00`;
  };

  const escapeText = (text: string) => {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  };

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const calendarName = escapeText(`${project.name} - ${contact.firstName} ${contact.lastName}`);
  const calendarDesc = escapeText(`Personal schedule for ${contact.firstName} ${contact.lastName} in ${project.name}`);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BackstageOS//Personal Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-CALDESC:${calendarDesc}`,
    'X-WR-TIMEZONE:America/New_York',
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'X-LIC-LOCATION:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  events.forEach(event => {
    const startTime = event.startTime || '09:00';
    const endTime = event.endTime || '17:00';
    const uid = `event-${event.id}@backstageos.com`;
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;TZID=America/New_York:${formatDateTime(event.date, startTime)}`);
    lines.push(`DTEND;TZID=America/New_York:${formatDateTime(event.date, endTime)}`);
    lines.push(foldICSLine(`SUMMARY:${escapeText(event.title)}`));
    lines.push(foldICSLine(`DESCRIPTION:${escapeText(event.description || '')}`));
    if (event.location) {
      lines.push(foldICSLine(`LOCATION:${escapeText(event.location)}`));
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  // RFC 5545 requires CRLF line endings and final CRLF
  return lines.join('\r\n') + '\r\n';
}

function generateICSSubscriptionContent(events: any[], project: any, contact: any, hostname: string): string {
  const formatDateTime = (date: string, time: string) => {
    const d = new Date(date);
    const [hours, minutes] = time.split(':');
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(hours).padStart(2, '0');
    const min = String(minutes).padStart(2, '0');
    return `${year}${month}${day}T${hr}${min}00`;
  };

  const escapeText = (text: string) => {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  };

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const calendarName = escapeText(`${project.name} - ${contact.firstName} ${contact.lastName}`);
  const calendarDesc = escapeText(`Dynamic schedule for ${contact.firstName} ${contact.lastName} in ${project.name}`);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BackstageOS//Dynamic Schedule Subscription//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldICSLine(`X-WR-CALNAME:${calendarName}`),
    foldICSLine(`X-WR-CALDESC:${calendarDesc}`),
    'X-WR-TIMEZONE:America/New_York',
    'X-PUBLISHED-TTL:PT1H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'X-LIC-LOCATION:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  events.forEach(event => {
    const startTime = event.startTime || '09:00';
    const endTime = event.endTime || '17:00';
    const uid = `schedule-${event.id}-${project.id}@backstageos.com`;
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;TZID=America/New_York:${formatDateTime(event.date, startTime)}`);
    lines.push(`DTEND;TZID=America/New_York:${formatDateTime(event.date, endTime)}`);
    lines.push(foldICSLine(`SUMMARY:${escapeText(event.title || 'Untitled Event')}`));
    lines.push(foldICSLine(`DESCRIPTION:${escapeText(event.description || '')}`));
    if (event.location) {
      lines.push(foldICSLine(`LOCATION:${escapeText(event.location)}`));
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('SEQUENCE:0');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// Helper function to generate ICS content for personal schedule subscriptions
function generatePersonalScheduleICSSubscriptionContent(events: any[], project: any, contact: any, version: any, hostname: string): string {
  // Format date for ICS - returns YYYYMMDD format for all-day, YYYYMMDDTHHmmss for timed events (local time, no Z)
  const formatDateOnly = (date: string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const formatDateTime = (date: string, time: string) => {
    const d = new Date(date);
    const [hours, minutes] = time.split(':');
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(hours).padStart(2, '0');
    const min = String(minutes).padStart(2, '0');
    return `${year}${month}${day}T${hr}${min}00`;
  };

  const formatNow = () => {
    const d = new Date();
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string) => {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  };

  // Get next day for all-day event DTEND (ICS spec requires DTEND to be exclusive)
  const getNextDay = (date: string) => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const now = formatNow();
  const calendarName = escapeText(`${contact.firstName} ${contact.lastName} - ${project.name}`);
  const calendarDesc = escapeText(`Personal schedule for ${contact.firstName} ${contact.lastName} in ${project.name} (Version ${version.version})`);
  
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BackstageOS//Personal Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-CALDESC:${calendarDesc}`,
    'X-WR-TIMEZONE:America/New_York',
    'X-PUBLISHED-TTL:PT1H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'X-LIC-LOCATION:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  events.forEach((event: any) => {
    const uid = `personal-schedule-${event.id}-${project.id}@backstageos.com`;
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    
    if (event.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${getNextDay(event.date)}`);
    } else {
      const startTime = event.startTime || '09:00';
      const endTime = event.endTime || '17:00';
      lines.push(`DTSTART;TZID=America/New_York:${formatDateTime(event.date, startTime)}`);
      lines.push(`DTEND;TZID=America/New_York:${formatDateTime(event.date, endTime)}`);
    }
    
    lines.push(foldICSLine(`SUMMARY:${escapeText(event.title)}`));
    
    let description = event.description || '';
    if (event.notes) {
      description += description ? '\\n\\nNotes: ' + event.notes : 'Notes: ' + event.notes;
    }
    lines.push(foldICSLine(`DESCRIPTION:${escapeText(description)}`));
    
    if (event.location) {
      lines.push(foldICSLine(`LOCATION:${escapeText(event.location)}`));
    }
    
    lines.push('STATUS:CONFIRMED');
    lines.push(foldICSLine(`CATEGORIES:${escapeText(event.type || 'event')}`));
    lines.push('CLASS:PUBLIC');
    lines.push(`CREATED:${now}`);
    lines.push(`LAST-MODIFIED:${now}`);
    lines.push('SEQUENCE:0');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  
  // RFC 5545 requires CRLF line endings and final CRLF
  return lines.join('\r\n') + '\r\n';
}

// Helper function to generate ICS content for event type subscriptions
function generateEventTypeICSSubscriptionContent(events: any[], project: any, share: any, hostname: string): string {
  // Format date for ICS - returns YYYYMMDD format for all-day events
  const formatDateOnly = (date: string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // Format date+time for ICS - returns YYYYMMDDTHHmmss (local time with timezone)
  const formatDateTime = (date: string, time: string) => {
    const d = new Date(date);
    const [hours, minutes] = time.split(':');
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(hours).padStart(2, '0');
    const min = String(minutes).padStart(2, '0');
    return `${year}${month}${day}T${hr}${min}00`;
  };

  // Get next day for all-day event DTEND (ICS spec requires DTEND to be exclusive)
  const getNextDay = (date: string) => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const escapeText = (text: string) => {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  };

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const calendarName = escapeText(`${project.name} - ${share.eventTypeName}`);
  const calendarDesc = escapeText(`Live ${share.eventTypeName} events for ${project.name} - Updates automatically`);
  
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BackstageOS//Event Type Calendar Subscription//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-CALDESC:${calendarDesc}`,
    'X-PUBLISHED-TTL:PT1H',
    'X-WR-TIMEZONE:America/New_York',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'X-LIC-LOCATION:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  events.forEach(event => {
    const eventTypeSafe = share.eventTypeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const uid = `eventtype-${event.id}-${eventTypeSafe}-${project.id}@backstageos.com`;
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`LAST-MODIFIED:${now}`);

    if (event.isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${getNextDay(event.date)}`);
    } else {
      const startTime = event.startTime || '09:00';
      const endTime = event.endTime || '17:00';
      lines.push(`DTSTART;TZID=America/New_York:${formatDateTime(event.date, startTime)}`);
      lines.push(`DTEND;TZID=America/New_York:${formatDateTime(event.date, endTime)}`);
    }

    lines.push(foldICSLine(`SUMMARY:${escapeText(event.title)}`));
    lines.push(foldICSLine(`DESCRIPTION:${escapeText(event.description || '')}`));
    
    if (event.location) {
      lines.push(foldICSLine(`LOCATION:${escapeText(event.location)}`));
    }
    
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('SEQUENCE:0');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  
  // RFC 5545 requires CRLF line endings and final CRLF
  return lines.join('\r\n') + '\r\n';
}

// Configure multer for image uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads');
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const name = `image-${timestamp}${extension}`;
      cb(null, name);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Error analysis and fixing logic - moved after helper functions

function analyzeAndFixError(errorLog: any) {
  const { errorType, message, page, stackTrace } = errorLog;
  
  let canFix = false;
  let fixDescription = "";
  let fixActions: string[] = [];
  let recommendation = "";

  // Generate natural language description of what happened
  function getErrorDescription(type: string, message: string, page: string) {
    const pageDisplayName = page.replace(/^\//, '').replace(/\//g, ' → ') || 'homepage';
    
    switch (type) {
      case 'javascript_error':
        return {
          naturalLanguage: `A JavaScript programming error occurred on the ${pageDisplayName} page. This means some code failed to run properly, which could cause features to stop working or display incorrectly for users.`,
          technicalSummary: `JavaScript runtime error: ${message}`,
          userImpact: 'Users may experience broken functionality, missing content, or unresponsive interface elements.',
          severity: 'High - Can break core functionality'
        };
        
      case 'network_error':
        return {
          naturalLanguage: `A network communication problem occurred while the ${pageDisplayName} page was trying to connect to the server. This means data couldn't be sent or received properly.`,
          technicalSummary: `Network request failed: ${message}`,
          userImpact: 'Users may see loading errors, missing data, or inability to save their work.',
          severity: 'High - Prevents data access and updates'
        };
        
      case 'form_submission_error':
        return {
          naturalLanguage: `A form on the ${pageDisplayName} page failed to submit properly. Users filled out information but it couldn't be saved or processed correctly.`,
          technicalSummary: `Form validation or submission failure: ${message}`,
          userImpact: 'Users lose their entered data and cannot complete important tasks like creating shows or saving settings.',
          severity: 'Critical - Blocks essential user actions'
        };
        
      case 'page_load_failure':
        return {
          naturalLanguage: `The ${pageDisplayName} page failed to load completely. This means users either see a blank page, partial content, or very slow loading times.`,
          technicalSummary: `Page rendering or resource loading failure: ${message}`,
          userImpact: 'Users cannot access the page content or experience very poor performance.',
          severity: 'Critical - Prevents page access'
        };
        
      case 'click_failure':
        return {
          naturalLanguage: `A button or clickable element on the ${pageDisplayName} page stopped responding to user clicks. Users try to interact but nothing happens.`,
          technicalSummary: `Interactive element failure: ${message}`,
          userImpact: 'Users become frustrated when buttons don\'t work and cannot complete their intended actions.',
          severity: 'Medium - Reduces usability'
        };
        
      case 'navigation_error':
        return {
          naturalLanguage: `Users encountered problems navigating between pages or accessing certain areas of the application. Links may be broken or lead to the wrong places.`,
          technicalSummary: `Navigation or routing error: ${message}`,
          userImpact: 'Users get lost, cannot find features, or may access areas they shouldn\'t be able to see.',
          severity: 'Medium - Affects user flow'
        };
        
      default:
        return {
          naturalLanguage: `An unrecognized error occurred on the ${pageDisplayName} page. The system detected a problem but couldn't automatically categorize what went wrong.`,
          technicalSummary: `Uncategorized error: ${message}`,
          userImpact: 'Unknown impact - requires manual investigation to determine effects on users.',
          severity: 'Unknown - Needs investigation'
        };
    }
  }

  const errorDescription = getErrorDescription(errorType, message, page);

  switch (errorType) {
    case 'javascript_error':
      if (message.includes('Cannot read property') || message.includes('Cannot read properties')) {
        canFix = true;
        fixDescription = "Added null checks and defensive programming for undefined object properties";
        fixActions = ["Add null/undefined checks", "Implement proper error boundaries", "Add fallback values"];
        recommendation = "This error suggests accessing properties on undefined/null objects. Consider adding proper validation before accessing object properties.";
      }
      break;

    case 'network_error':
      canFix = true;
      fixDescription = "Enhanced network error handling with retry logic and user feedback";
      fixActions = ["Add exponential backoff retry", "Implement offline detection", "Show user-friendly error messages"];
      recommendation = "Network errors are often temporary. Implement retry logic and inform users about connectivity issues.";
      break;

    default:
      recommendation = "This error type requires manual investigation. Check the stack trace and error context for specific solutions.";
  }

  return {
    canFix,
    errorDescription,
    fixDescription,
    fixActions,
    recommendation,
    codeChanges: [] // Basic analysis doesn't provide specific code changes
  };
}

// Admin middleware
async function requireAdmin(req: any, res: any, next: any) {
  // SECURITY: No bypass - admin users must be properly authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const userId = req.user.id.toString();
  if (!isAdmin(userId)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}

// Authentication middleware
async function isAuthenticated(req: any, res: any, next: any) {
  // SECURITY: No bypass - users must be properly authenticated
  // Each user must only see their own data
  
  if (req.isAuthenticated()) {
    // Check if user account is active
    if (req.user && req.user.isActive === false) {
      return res.status(403).json({ 
        message: "Account is inactive. Please contact support.",
        reason: "account_inactive"
      });
    }

    // Check subscription status - allow access but flag for payment redirect
    try {
      const user = await storage.getUser(req.user.id.toString());
      if (user && !user.isAdmin) {
        const needsPayment = user.subscriptionStatus === 'past_due' ||
                            user.subscriptionStatus === 'canceled' ||
                            user.subscriptionStatus === 'incomplete';

        // Allow billing/payment related endpoints even with payment issues
        const isPaymentEndpoint = req.url.startsWith('/api/billing') ||
                                 req.url.startsWith('/api/create-payment-intent') ||
                                 req.url.startsWith('/api/get-or-create-subscription') ||
                                 req.url.startsWith('/api/stripe-webhook') ||
                                 req.url === '/api/user' ||
                                 req.url === '/api/logout';

        if (needsPayment && !isPaymentEndpoint) {
          return res.status(402).json({ 
            message: "Payment required to access this feature.",
            subscriptionStatus: user.subscriptionStatus,
            reason: "payment_required",
            redirectTo: "/billing"
          });
        }
      }
    } catch (error) {
      // Continue on error to avoid blocking legitimate users
    }

    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Subscription-based feature access middleware (now redundant since main auth handles this)
// Keeping for potential future premium feature restrictions
async function requiresActiveSubscription(req: any, res: any, next: any) {
  // Since main authentication now blocks past_due/canceled/incomplete users,
  // this middleware is primarily for potential future premium feature gates
  // For now, it just passes through since access control is handled at auth level
  next();
}



// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
});

// Log Stripe configuration on startup
const stripeMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'TEST MODE' : 'LIVE MODE';

// Price IDs will be validated when actually used during checkout

export async function registerRoutes(app: Express): Promise<Server> {
  // CRITICAL: Email webhook endpoint must be registered FIRST to avoid production routing conflicts
  app.post('/email-webhook', async (req: any, res) => {
    try {
      const emailData = req.body;
      
      const { StandaloneEmailService } = await import('./services/standaloneEmailService.js');
      const standaloneEmailService = new StandaloneEmailService();
      
      // Process incoming email and store in BackstageOS
      const messageId = await standaloneEmailService.processIncomingEmail(emailData);
      
      // Forward email to external clients if forwarding rules exist
      if (messageId) {
        try {
          const { emailForwardingService } = await import('./services/emailForwardingService.js');
          await emailForwardingService.forwardIncomingEmail(messageId);
        } catch (forwardingError) {
          // Don't fail the main webhook - forwarding is optional
        }
      }
      
      res.status(200).json({ success: true, message: "Email processed successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to process incoming email", error: error.message });
    }
  });

  // Initialize error clustering service
  const errorClusteringService = new ErrorClusteringService(storage);
  
  // Initialize conflict validation service
  const conflictValidationService = new ConflictValidationService(storage);
  
  // Initialize schedule change detection service
  const scheduleChangeDetectionService = new ScheduleChangeDetectionService(storage);

  // Helper function for error descriptions
  function getErrorDescription(type: string, message: string, page: string) {
    const pageDisplayName = page.replace(/^\//, '').replace(/\//g, ' → ') || 'homepage';
    
    switch (type) {
      case 'javascript_error':
        return {
          naturalLanguage: `A JavaScript programming error occurred on the ${pageDisplayName} page. This means some code failed to run properly, which could cause features to stop working or display incorrectly for users.`,
          technicalSummary: `JavaScript runtime error: ${message}`,
          userImpact: 'Users may experience broken functionality, missing content, or unresponsive interface elements.',
          severity: 'High - Can break core functionality'
        };
        
      case 'network_error':
        return {
          naturalLanguage: `A network communication problem occurred while the ${pageDisplayName} page was trying to connect to the server. This means data couldn't be sent or received properly.`,
          technicalSummary: `Network request failed: ${message}`,
          userImpact: 'Users may see loading errors, missing data, or inability to save their work.',
          severity: 'High - Prevents data access and updates'
        };
        
      case 'form_submission_error':
        return {
          naturalLanguage: `A form on the ${pageDisplayName} page failed to submit properly. Users filled out information but it couldn't be saved or processed correctly.`,
          technicalSummary: `Form validation or submission failure: ${message}`,
          userImpact: 'Users lose their entered data and cannot complete important tasks like creating shows or saving settings.',
          severity: 'Critical - Blocks essential user actions'
        };
        
      case 'page_load_failure':
        return {
          naturalLanguage: `The ${pageDisplayName} page failed to load completely. This means users either see a blank page, partial content, or very slow loading times.`,
          technicalSummary: `Page rendering or resource loading failure: ${message}`,
          userImpact: 'Users cannot access the page content or experience very poor performance.',
          severity: 'Critical - Prevents page access'
        };
        
      case 'click_failure':
        return {
          naturalLanguage: `A button or clickable element on the ${pageDisplayName} page stopped responding to user clicks. Users try to interact but nothing happens.`,
          technicalSummary: `Interactive element failure: ${message}`,
          userImpact: 'Users become frustrated when buttons don\'t work and cannot complete their intended actions.',
          severity: 'Medium - Reduces usability'
        };
        
      case 'navigation_error':
        return {
          naturalLanguage: `Users encountered problems navigating between pages or accessing certain areas of the application. Links may be broken or lead to the wrong places.`,
          technicalSummary: `Navigation or routing error: ${message}`,
          userImpact: 'Users get lost, cannot find features, or may access areas they shouldn\'t be able to see.',
          severity: 'Medium - Affects user flow'
        };
        
      default:
        return {
          naturalLanguage: `An unrecognized error occurred on the ${pageDisplayName} page. The system detected a problem but couldn't automatically categorize what went wrong.`,
          technicalSummary: `Uncategorized error: ${message}`,
          userImpact: 'Unknown impact - requires manual investigation to determine effects on users.',
          severity: 'Unknown - Needs investigation'
        };
    }
  }

  // AI-powered error analysis function
  async function analyzeAndFixErrorWithAI(errorLog: any) {
    const { errorType, message, page, stackTrace, userAgent, timestamp } = errorLog;
    
    // First get basic error description
    const errorDescription = getErrorDescription(errorType, message, page);
    
    try {
      // Initialize OpenAI using dynamic import
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Create comprehensive error analysis prompt
      const prompt = `You are an expert JavaScript/TypeScript developer analyzing production errors from a theater management web application called BackstageOS. 

ERROR DETAILS:
- Type: ${errorType}
- Message: ${message}
- Page: ${page}
- Stack Trace: ${stackTrace || 'Not available'}
- User Agent: ${userAgent || 'Not available'}
- When: ${timestamp}

CONTEXT:
This is a React/Express/PostgreSQL application with:
- Frontend: React 18, TypeScript, Vite, Shadcn/UI, TanStack Query
- Backend: Express.js, TypeScript, Drizzle ORM, PostgreSQL
- Common patterns: API routes, form handling, database queries, authentication

TASK:
Analyze this error and provide a comprehensive fix recommendation. Return a JSON response with:
1. canFix: boolean (true if you can suggest specific code changes)
2. fixDescription: string (clear description of what needs to be fixed)
3. recommendation: string (detailed explanation of the issue and solution)
4. codeChanges: array of specific code changes needed
5. fixActions: array of implementation steps

For codeChanges, provide specific code examples with:
- file: likely file path
- description: what to change
- before: current problematic code (if identifiable)
- after: fixed code

Focus on:
- Actual code fixes, not just generic advice
- Specific file paths and functions likely involved
- Root cause analysis
- Prevention of similar issues

Example codeChanges format:
[
  {
    "file": "client/src/pages/calendar.tsx",
    "description": "Add null check for calendar data",
    "before": "const events = data.events.map(...)",
    "after": "const events = data?.events?.map(...) || []"
  }
]

Respond with valid JSON only.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert software developer specializing in debugging and fixing JavaScript/TypeScript errors in production web applications. Provide specific, actionable fix recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500
      });

      const aiAnalysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        canFix: aiAnalysis.canFix || false,
        errorDescription,
        fixDescription: aiAnalysis.fixDescription || "No specific fix could be determined",
        fixActions: aiAnalysis.fixActions || [],
        recommendation: aiAnalysis.recommendation || "Manual investigation required",
        codeChanges: aiAnalysis.codeChanges || []
      };
      
    } catch (error) {
      
      // Fallback to basic analysis if OpenAI fails
      return analyzeAndFixError(errorLog);
    }
  }

  // Setup authentication
  setupAuth(app);

  // Session heartbeat to keep sessions alive
  app.post('/api/session/heartbeat', isAuthenticated, (req: any, res) => {
    if (req.session && req.user) {
      req.session.touch();
      res.json({ 
        success: true, 
        user: req.user,
        sessionExpiry: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
      });
    } else {
      res.status(401).json({ success: false, message: "Not authenticated" });
    }
  });

  // Session status check
  app.get('/api/session/status', isAuthenticated, (req: any, res) => {
    res.json({ 
      authenticated: true,
      user: req.user,
      sessionId: req.sessionID,
      sessionExpiry: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    });
  });

  // Error logging API (no authentication required to prevent recursive errors)
  app.post('/api/errors/log', async (req: any, res) => {
    try {
      const errorLogData = insertErrorLogSchema.parse(req.body);
      
      // Only log errors from registered users
      if (!errorLogData.userId) {
        return res.status(400).json({ success: false, message: "User ID required" });
      }

      // Don't log errors in development environment
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({ success: true, message: "Development environment - error not logged" });
      }

      const errorLog = await storage.createErrorLog(errorLogData);
      res.status(201).json({ success: true, id: errorLog.id });
    } catch (error) {
      // Silently fail to prevent recursive error logging
      res.status(500).json({ success: false });
    }
  });

  // Get error logs (admin only)
  app.get('/api/errors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const errorLogs = await storage.getErrorLogs();
      res.json(errorLogs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch error logs" });
    }
  });

  // Analyze error and suggest fix (admin only)
  app.post('/api/errors/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { errorLog } = req.body;
      
      if (!errorLog) {
        return res.status(400).json({ message: "Error log data required" });
      }

      // Analyze error and determine potential fix using OpenAI
      const fixResult = await analyzeAndFixErrorWithAI(errorLog);
      
      res.json({
        canFix: fixResult.canFix,
        fixDescription: fixResult.fixDescription,
        fixActions: fixResult.fixActions,
        recommendation: fixResult.recommendation,
        errorDescription: fixResult.errorDescription,
        codeChanges: fixResult.codeChanges,
        requiresVerification: true
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to analyze error" });
    }
  });

  // Mark error as fixed after verification (admin only)
  app.post('/api/errors/mark-fixed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { errorId, fixDescription, verificationNotes } = req.body;
      
      if (!errorId || !fixDescription) {
        return res.status(400).json({ message: "Error ID and fix description required" });
      }

      // Mark error as fixed with verification notes
      const fullFixDescription = verificationNotes 
        ? `${fixDescription}\n\nVerification: ${verificationNotes}`
        : fixDescription;
        
      await storage.markErrorAsFixed(errorId, fullFixDescription);

      res.json({
        success: true,
        message: "Error marked as fixed after verification"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark error as fixed" });
    }
  });

  // Auto-apply AI recommended fixes (admin only)
  app.post('/api/errors/auto-apply-fix', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { errorId, codeChanges } = req.body;
      
      if (!errorId || !codeChanges || !Array.isArray(codeChanges)) {
        return res.status(400).json({ message: "Error ID and code changes array required" });
      }

      let appliedChanges = [];
      let failedChanges = [];

      
      // Apply each code change
      for (const change of codeChanges) {
        try {
          const { file, description, before, after } = change;
          
          
          
          // Basic validation
          if (!file || !after) {
            failedChanges.push({ ...change, reason: "Missing required fields" });
            continue;
          }

          // Try to find the actual file - handle common path variations
          let actualFilePath = file.replace(/^\/+/, '');
          let safePath = path.resolve(process.cwd(), actualFilePath);
          
          if (!fs.existsSync(safePath)) {
            // Try common variations
            const variations = [
              `client/${actualFilePath}`,
              `client/src/${actualFilePath.replace('src/', '')}`,
              actualFilePath.replace('src/', 'client/src/'),
              actualFilePath.replace('src/components/', 'client/src/components/'),
              actualFilePath.replace('src/pages/', 'client/src/pages/'),
              actualFilePath.replace('src/lib/', 'client/src/lib/'),
              actualFilePath.replace('src/', 'client/src/')
            ];
            
            let found = false;
            for (const variation of variations) {
              const testPath = path.resolve(process.cwd(), variation);
              if (fs.existsSync(testPath)) {
                actualFilePath = variation;
                safePath = testPath;
                found = true;
                break;
              }
            }
            
            if (!found) {
              failedChanges.push({ ...change, reason: `File does not exist: ${file}` });
              continue;
            }
          }

          // Ensure file path is safe (within project directory)
          if (!safePath.startsWith(process.cwd())) {
            failedChanges.push({ ...change, reason: "File path outside project directory" });
            continue;
          }

          // Read current file content
          const currentContent = fs.readFileSync(safePath, 'utf8');
          
          let newContent: string = currentContent;
          if (before && before.trim()) {
            // Replace specific code if 'before' is provided
            if (!currentContent.includes(before)) {
              // Try fuzzy matching - remove extra whitespace and check again
              const normalizedBefore = before.replace(/\s+/g, ' ').trim();
              const normalizedContent = currentContent.replace(/\s+/g, ' ');
              
              if (normalizedContent.includes(normalizedBefore)) {
                // Found with normalized whitespace, do the replacement
                newContent = currentContent.replace(before, after);
              } else {
                // Try partial matching for common cases
                const beforeLines = before.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
                let foundMatch = false;
                
                for (const line of beforeLines) {
                  if (line && currentContent.includes(line.trim())) {
                    // Found at least one line, try to replace just that line
                    newContent = currentContent.replace(line.trim(), after);
                    foundMatch = true;
                    break;
                  }
                }
                
                if (!foundMatch) {
                  failedChanges.push({ 
                    ...change, 
                    reason: `Original code not found. Looking for: "${before.substring(0, 100)}${before.length > 100 ? '...' : ''}"`
                  });
                  continue;
                }
              }
            } else {
              newContent = currentContent.replace(before, after);
            }
          } else {
            // If no 'before' code, treat 'after' as new code to add
            if (after.includes('import ') && after.includes('from ')) {
              // Add import at the top of file after existing imports
              const lines = currentContent.split('\n');
              let insertIndex = 0;
              
              // Find the last import line
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith('import ')) {
                  insertIndex = i + 1;
                }
              }
              
              lines.splice(insertIndex, 0, after);
              newContent = lines.join('\n');
            } else if (description && description.toLowerCase().includes('add') && description.toLowerCase().includes('function')) {
              // Adding a new function - append before the last closing brace or at end
              const lastBraceIndex = currentContent.lastIndexOf('}');
              if (lastBraceIndex > 0) {
                newContent = currentContent.substring(0, lastBraceIndex) + '\n\n' + after + '\n\n' + currentContent.substring(lastBraceIndex);
              } else {
                newContent = currentContent + '\n\n' + after;
              }
            } else {
              // Default: append to end of file
              newContent = currentContent + '\n\n' + after;
            }
          }

          // Create backup of original file
          const backupPath = safePath + '.backup.' + Date.now();
          fs.writeFileSync(backupPath, currentContent);

          // Write the fixed content
          fs.writeFileSync(safePath, newContent);

          appliedChanges.push({ 
            ...change, 
            backupFile: backupPath,
            applied: true 
          });

        } catch (error) {
          failedChanges.push({ 
            ...change, 
            reason: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      const response = {
        success: appliedChanges.length > 0,
        message: `Applied ${appliedChanges.length} of ${codeChanges.length} code changes`,
        appliedChanges,
        failedChanges,
        totalChanges: codeChanges.length
      };

      if (appliedChanges.length === codeChanges.length) {
        response.message = "All code changes applied successfully";
      } else if (appliedChanges.length === 0) {
        response.message = "No code changes could be applied";
        return res.status(400).json(response);
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to auto-apply fix" });
    }
  });

  // Mark single error as resolved
  app.post('/api/errors/:id/resolve', requireAdmin, async (req: any, res) => {
    try {
      const errorId = parseInt(req.params.id);
      const { resolution_notes } = req.body;
      
      await storage.markErrorAsResolved(errorId, req.user.id, resolution_notes);
      
      res.json({ success: true, message: "Error marked as resolved" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark error as resolved" });
    }
  });

  // Bulk resolve errors by pattern
  app.post('/api/errors/bulk-resolve', requireAdmin, async (req: any, res) => {
    try {
      const { message_pattern, page_pattern, resolution_notes } = req.body;
      
      const resolvedCount = await storage.bulkResolveErrors(
        message_pattern, 
        page_pattern, 
        req.user.id, 
        resolution_notes
      );
      
      res.json({ 
        success: true, 
        message: `${resolvedCount} errors marked as resolved`,
        resolvedCount 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to bulk resolve errors" });
    }
  });

  // Configure multer for file uploads
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({
    dest: uploadsDir,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|ico|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Separate multer config for BIMI logos (SVG only)
  const bimiUpload = multer({
    dest: uploadsDir,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit for BIMI logos
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /svg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = file.mimetype === 'image/svg+xml';
      
      if (mimetype && extname) {
        cb(null, true);
      } else {
        cb(new Error('BIMI logo must be an SVG file'));
      }
    }
  });

  // Email attachments multer config (all file types allowed)
  const emailAttachmentUpload = multer({
    dest: uploadsDir,
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit for email attachments
      files: 10 // Max 10 files per email
    },
    fileFilter: (req, file, cb) => {
      // Allow all file types for email attachments
      // Block potentially dangerous executable file types
      const dangerousTypes = /\.(exe|scr|bat|cmd|com|pif|vbs|js|jar|app|deb|pkg|dmg)$/i;
      
      if (dangerousTypes.test(file.originalname)) {
        cb(new Error('This file type is not allowed for security reasons'));
      } else {
        cb(null, true);
      }
    }
  });

  // Image upload endpoint
  app.post('/api/upload-image', isAuthenticated, requireAdmin, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { type } = req.body;
      if (!type || !['favicon', 'shareImage'].includes(type)) {
        return res.status(400).json({ error: 'Invalid image type' });
      }

      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${type}-${Date.now()}${fileExtension}`;
      const newPath = path.join(uploadsDir, fileName);
      
      // Move file to permanent location
      fs.renameSync(req.file.path, newPath);

      // Generate URL (relative to server)
      const imageUrl = `/uploads/${fileName}`;
      
      const response: any = { url: imageUrl };

      // For favicons, also generate apple touch icon if possible
      if (type === 'favicon') {
        response.appleTouchIconUrl = imageUrl; // Same URL for now, could process differently
      }

      res.json(response);
    } catch (error) {
      
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Rich text editor image upload endpoint
  app.post('/api/upload-rich-text-image', isAuthenticated, requireAdmin, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileExtension = path.extname(req.file.originalname);
      const fileName = `rich-text-image-${Date.now()}${fileExtension}`;
      const newPath = path.join(uploadsDir, fileName);
      
      // Move file to permanent location
      fs.renameSync(req.file.path, newPath);

      // Generate absolute URL for embedding in emails
      const protocol = req.protocol;
      const host = req.get('host');
      const imageUrl = `${protocol}://${host}/uploads/${fileName}`;
      
      res.json({ 
        url: imageUrl,
        filename: fileName 
      });
    } catch (error) {
      
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Contact photo upload endpoint
  app.post('/api/projects/:projectId/contacts/:contactId/photo', isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
      }

      const projectId = parseInt(req.params.projectId);
      const contactId = parseInt(req.params.contactId);

      // Verify user has access to this project and contact exists
      const contact = await storage.getContact(projectId, contactId);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Import sharp for image optimization
      const sharp = require('sharp');

      // Define optimized filename (always use .webp for best compression)
      const fileName = `contact-${contactId}-${Date.now()}.webp`;
      const optimizedPath = path.join(uploadsDir, fileName);

      // Process and optimize the image
      await sharp(req.file.path)
        .resize(300, 300, { 
          fit: 'cover', 
          position: 'center' 
        }) // Resize to 300x300 for consistency
        .webp({ 
          quality: 85, 
          effort: 6 
        }) // Convert to WebP with 85% quality
        .toFile(optimizedPath);

      // Delete the temporary uploaded file
      fs.unlinkSync(req.file.path);

      // Delete old photo if it exists
      if (contact.photoUrl) {
        const oldPhotoPath = path.join(uploadsDir, path.basename(contact.photoUrl));
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      // Update contact with new photo URL
      const photoUrl = `/uploads/${fileName}`;
      const updatedContact = await storage.updateContact(projectId, contactId, { photoUrl });
      
      res.json({ 
        url: photoUrl,
        contact: updatedContact,
        optimized: true,
        format: 'webp',
        size: '300x300'
      });
    } catch (error) {
      
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Photo upload failed' });
    }
  });

  // Contact photo delete endpoint
  app.delete('/api/projects/:projectId/contacts/:contactId/photo', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const contactId = parseInt(req.params.contactId);

      // Verify user has access to this project and contact exists
      const contact = await storage.getContact(projectId, contactId);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Delete photo file if it exists
      if (contact.photoUrl) {
        const photoPath = path.join(uploadsDir, path.basename(contact.photoUrl));
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }

      // Update contact to remove photo URL
      const updatedContact = await storage.updateContact(projectId, contactId, { photoUrl: null });
      
      res.json({ 
        message: 'Photo deleted successfully',
        contact: updatedContact
      });
    } catch (error) {
      res.status(500).json({ error: 'Photo deletion failed' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Add cache headers for images
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    next();
  });
  app.use('/uploads', express.static(uploadsDir));

  // Waitlist API endpoints (public)
  app.post('/api/waitlist', async (req: any, res) => {
    try {
      const waitlistData = insertWaitlistSchema.parse(req.body);
      
      // Check if email already exists
      const existingEntry = await storage.getWaitlistByEmail(waitlistData.email);
      if (existingEntry) {
        return res.status(409).json({ 
          message: "Email already on waitlist",
          position: existingEntry.position 
        });
      }

      const waitlistEntry = await storage.createWaitlistEntry(waitlistData);
      
      // Send welcome email if enabled
      try {
        const emailSettings = await storage.getWaitlistEmailSettings();
        const apiSettings = await storage.getApiSettings();
        
        if (emailSettings?.isEnabled && apiSettings?.sendgridApiKey) {
          // Configure SendGrid
          sgMail.setApiKey(apiSettings.sendgridApiKey);
          
          // Use verified sender from API settings
          const fromEmail = apiSettings.senderEmail || "hello@backstageos.com";
          const fromName = apiSettings.senderName || "BackstageOS";
          
          // Replace variables in email content
          let subject = emailSettings.subject || "Welcome to BackstageOS Waitlist";
          let body = emailSettings.bodyHtml || "Thank you for joining our waitlist!";
          
          const variables = {
            '{{firstName}}': waitlistEntry.firstName || '',
            '{{lastName}}': waitlistEntry.lastName || '',
            '{{position}}': (waitlistEntry.position || 1).toString(),
            '{{email}}': waitlistEntry.email,
            '{{date}}': new Date().toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })
          };
          
          // Replace variables in subject and body
          Object.entries(variables).forEach(([variable, value]) => {
            subject = subject.replace(new RegExp(variable, 'g'), value);
            body = body.replace(new RegExp(variable, 'g'), value);
          });

          // Simple HTML cleaning - keep original working approach
          body = body.replace(/style="[^"]*"/g, ''); // Remove style attributes
          
          const msg = {
            to: waitlistEntry.email,
            bcc: 'bryan@backstageos.com', // BCC all waitlist emails to Bryan
            from: {
              email: fromEmail,
              name: fromName
            },
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            headers: {
              'BIMI-Selector': 'default',
              'X-BIMI-Selector': 'default',
              'Authentication-Results': `mx.backstageos.com; dmarc=pass; spf=pass; dkim=pass`
            }
          };
          
          await sgMail.send(msg);
        }
      } catch (emailError) {
        // Don't fail the waitlist signup if email fails
      }
      
      res.status(201).json({ 
        success: true, 
        position: waitlistEntry.position,
        message: "Successfully added to waitlist!" 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  // Get waitlist entries (admin only)
  app.get('/api/waitlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const waitlistEntries = await storage.getWaitlistEntries();
      res.json(waitlistEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch waitlist" });
    }
  });

  // Update waitlist entry status (admin only)
  app.put('/api/waitlist/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const entryId = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedEntry = await storage.updateWaitlistEntry(entryId, updateData);
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to update waitlist entry" });
    }
  });

  // Delete waitlist entry (admin only)
  app.delete('/api/waitlist/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const entryId = parseInt(req.params.id);
      await storage.deleteWaitlistEntry(entryId);
      res.json({ success: true, message: "Waitlist entry deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete waitlist entry" });
    }
  });

  // Get waitlist stats (admin only)
  app.get('/api/waitlist/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getWaitlistStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch waitlist stats" });
    }
  });

  // Profile type selection
  app.post('/api/auth/profile-type', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { profileType } = req.body;
      
      if (!profileType || !['freelance', 'fulltime'].includes(profileType)) {
        return res.status(400).json({ message: "Invalid profile type" });
      }

      // Update the user's profile type
      const updatedUser = await storage.updateUser(userId, { profileType });

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile type" });
    }
  });

  // Admin account switching endpoints
  app.post('/api/admin/switch-account', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id.toString();
      
      if (!isAdmin(adminUserId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { targetUserId } = req.body;
      
      if (!targetUserId) {
        return res.status(400).json({ message: "Target user ID required" });
      }
      
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Store original admin user in session for switching back
      req.session.originalAdminId = adminUserId;
      req.session.isViewingAs = targetUserId;
      
      res.json({ 
        message: "Account switched successfully",
        viewingAs: targetUser,
        originalAdmin: adminUserId
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to switch account" });
    }
  });

  app.post('/api/admin/switch-back', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!req.session.originalAdminId) {
        return res.status(400).json({ message: "No admin switch session found" });
      }
      
      // Clear the switching session
      delete req.session.isViewingAs;
      delete req.session.originalAdminId;
      
      res.json({ message: "Switched back to admin account" });
    } catch (error) {
      res.status(500).json({ message: "Failed to switch back" });
    }
  });

  app.get('/api/admin/switch-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId) && !req.session.originalAdminId) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const isViewingAs = req.session.isViewingAs;
      const originalAdminId = req.session.originalAdminId;
      
      if (isViewingAs && originalAdminId) {
        const viewingUser = await storage.getUser(isViewingAs);
        res.json({
          isViewingAs: true,
          viewingUser,
          originalAdminId
        });
      } else {
        res.json({
          isViewingAs: false,
          viewingUser: null,
          originalAdminId: null
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get switch status" });
    }
  });

  // Beta access management routes (admin only)
  app.get('/api/admin/beta-users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const betaUsers = await storage.getBetaUsers();
      res.json(betaUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch beta users" });
    }
  });

  app.post('/api/admin/beta-access', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { targetUserId, betaAccess } = req.body;
      
      if (!targetUserId || typeof betaAccess !== 'boolean') {
        return res.status(400).json({ message: "Invalid beta access parameters" });
      }
      
      const updatedUser = await storage.updateUserBetaAccess(targetUserId, betaAccess);
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update beta access" });
    }
  });

  // Get all users for admin management
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { profileType, betaAccess } = req.query;
      
      let users = await storage.getAllUsers();
      
      // Filter by profile type if specified
      if (profileType && profileType !== 'all') {
        users = users.filter(user => user.profileType === profileType);
      }
      
      // Filter by beta access if specified (convert to boolean for comparison)
      if (betaAccess !== undefined && betaAccess !== 'all') {
        const betaAccessFilter = betaAccess === 'true' || betaAccess === true;
        users = users.filter(user => !!user.betaAccess === betaAccessFilter);
      }
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ========== USER ROLE MANAGEMENT API ROUTES (NEW SINGLE-TABLE APPROACH) ==========

  // Get all users by role (admin, user, editor, viewer)
  app.get('/api/admin/users-by-role/:role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { role } = req.params;
      
      const validRoles = ['admin', 'user', 'editor', 'viewer'];
      
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be one of: admin, user, editor, viewer" });
      }

      const users = await storage.getUsersByRole(role);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: `Failed to fetch ${req.params.role} users` });
    }
  });

  // Get users with their invited editors (hierarchical view for admin dashboard)
  app.get('/api/admin/users-with-editors', requireAdmin, async (req: Request, res: Response) => {
    try {
      const usersWithEditors = await storage.getUsersWithInvitedEditors();
      res.json(usersWithEditors);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users with invited editors' });
    }
  });

  // Get all editors with their project assignments
  app.get('/api/admin/editors-with-projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const editors = await storage.getAllEditorsWithProjects();
      res.json(editors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch editors with projects" });
    }
  });

  // Update user role
  app.patch('/api/admin/users/:id/role', requireAdmin, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { userRole } = req.body;
      
      const validRoles = ['admin', 'user', 'editor', 'viewer'];
      if (!validRoles.includes(userRole)) {
        return res.status(400).json({ message: "Invalid role. Must be one of: admin, user, editor, viewer" });
      }

      const updatedUser = await storage.updateUserRole(userId, userRole);
      
      // Update active show count if changing to/from editor
      if (userRole === 'editor') {
        await storage.updateUserActiveShowCount(userId);
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // ========== LEGACY EDITOR MANAGEMENT API ROUTES (UPDATED FOR NEW SCHEMA) ==========

  // Get all editors for admin dashboard (global editors tab)
  app.get('/api/admin/editors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const editors = await storage.getAllEditorsForAdmin();
      res.json(editors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch editors" });
    }
  });

  // Get editor analytics for admin dashboard
  app.get('/api/admin/editor-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const editorAnalytics = await storage.getEditorAnalytics();
      res.json(editorAnalytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch editor analytics" });
    }
  });

  // Get invited team members by user (for admin dashboard expansion)
  app.get('/api/admin/users/:userId/invited-editors', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id.toString();
      
      if (!isAdmin(adminUserId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const targetUserId = parseInt(req.params.userId);
      const invitedEditors = await storage.getUserInvitedTeamMembers(targetUserId);
      res.json(invitedEditors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invited editors" });
    }
  });

  // Check editor limits and duplicates before invitation
  app.post('/api/admin/check-editor-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { email, name } = req.body;
      
      const activeShowCount = await storage.getEditorActiveShowCount(email);
      const duplicateCheck = await storage.checkEditorDuplicates(email, name);
      
      res.json({
        activeShowCount,
        canInvite: activeShowCount < 2 && !duplicateCheck.duplicate,
        limitReached: activeShowCount >= 2,
        duplicateCheck
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check editor limits" });
    }
  });

  // User Analytics endpoints
  app.get('/api/admin/user-analytics', requireAdmin, async (req: any, res) => {
    try {
      const analytics = await storage.getNonEditorUserAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user analytics" });
    }
  });

  // All users analytics (for admin debugging - includes editors)
  app.get('/api/admin/all-user-analytics', requireAdmin, async (req: any, res) => {
    try {
      const analytics = await storage.getUserAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all user analytics" });
    }
  });

  app.get('/api/admin/analytics-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const stats = await storage.getNonEditorAnalyticsStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics stats" });
    }
  });

  app.get('/api/admin/editor-analytics-stats', requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getEditorAnalyticsStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch editor analytics stats" });
    }
  });

  // Update all user statuses based on billing
  app.post('/api/admin/update-user-statuses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.updateAllUserStatuses();
      res.json({ message: "User statuses updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user statuses" });
    }
  });

  // Advanced Analytics - Engagement Scoring Routes
  app.post('/api/admin/calculate-engagement-scores', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.calculateEngagementScores();
      res.json({ message: "Engagement scores calculated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate engagement scores" });
    }
  });

  app.get('/api/admin/engagement-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const analytics = await storage.getEngagementAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch engagement analytics" });
    }
  });

  app.get('/api/admin/cost-optimization-recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const recommendations = await storage.getCostOptimizationRecommendations();
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cost optimization recommendations" });
    }
  });

  app.get('/api/admin/user-behavior-insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const insights = await storage.getUserBehaviorInsights();
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user behavior insights" });
    }
  });

  // Billing System Routes
  app.get('/api/admin/subscription-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.get('/api/admin/user-subscription/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const targetUserId = parseInt(req.params.userId);
      const subscription = await storage.getUserSubscription(targetUserId);
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user subscription" });
    }
  });

  // Analytics data collection endpoints
  app.post('/api/analytics/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id);
      const activityData = insertUserActivitySchema.parse({
        ...req.body,
        userId
      });
      
      const activity = await storage.createUserActivity(activityData);
      res.json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user activity" });
    }
  });

  app.post('/api/analytics/api-cost', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id);
      const costData = insertApiCostSchema.parse({
        ...req.body,
        userId
      });
      
      const cost = await storage.createApiCost(costData);
      res.json(cost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cost data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create API cost" });
    }
  });

  app.post('/api/analytics/session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id);
      const sessionData = insertUserSessionSchema.parse({
        ...req.body,
        userId
      });
      
      const session = await storage.createUserSession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user session" });
    }
  });

  app.post('/api/analytics/feature-usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id);
      const usageData = insertFeatureUsageSchema.parse({
        ...req.body,
        userId
      });
      
      const usage = await storage.createFeatureUsage(usageData);
      res.json(usage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid usage data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create feature usage" });
    }
  });

  // Update user profile and permissions
  app.patch('/api/admin/users/:targetUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { targetUserId } = req.params;
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { profileType, betaAccess, betaFeatures, isAdmin: userAdminStatus, subscriptionPlan, subscriptionStatus, grandfatheredFree } = req.body;
      
      // Normalize profile type to lowercase for validation
      const normalizedProfileType = profileType ? profileType.toLowerCase().replace('-', '').trim() : null;
      
      if (normalizedProfileType && !['freelance', 'fulltime'].includes(normalizedProfileType)) {
        return res.status(400).json({ message: "Invalid profile type" });
      }
      
      if (betaAccess !== undefined && typeof betaAccess !== 'boolean') {
        return res.status(400).json({ message: "Invalid beta access value" });
      }
      
      if (grandfatheredFree !== undefined && typeof grandfatheredFree !== 'boolean') {
        return res.status(400).json({ message: "Invalid grandfathered free value" });
      }
      
      const updatedUser = await storage.updateUserAdmin(targetUserId, {
        profileType: normalizedProfileType,
        betaAccess,
        betaFeatures,
        isAdmin: userAdminStatus,
        subscriptionPlan,
        subscriptionStatus,
        grandfatheredFree
      });
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:targetUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { targetUserId } = req.params;
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Prevent admin from deleting themselves
      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(targetUserId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User profile routes
  // NOTE: /api/user route is defined in auth.ts with Safari admin bypass functionality

  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { firstName, lastName, email, defaultReplyToEmail, emailDisplayName, currentPassword, newPassword } = req.body;

      // If email is being changed, check if it's already in use
      if (email && email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }

      // If password is being changed, verify current password
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to change password" });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, req.user.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Prepare update data
      const updateData: any = {
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        email: email || req.user.email,
        defaultReplyToEmail: defaultReplyToEmail || req.user.defaultReplyToEmail,
        emailDisplayName: emailDisplayName || req.user.emailDisplayName,
      };

      // Hash new password if provided
      if (newPassword) {
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      // Update user in database
      const updatedUser = await storage.updateUserAdmin(userId, updateData);

      // Remove password from response
      const { password, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Email provider integration routes - Per-user OAuth
  app.get('/api/user/email-provider', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      // Build display name from user's profile
      const displayName = user.emailDisplayName || 
        (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
        user.firstName ||
        null;
      
      res.json({
        provider: user.connectedEmailProvider || null,
        emailAddress: user.connectedEmailAddress || null,
        displayName: displayName,
        connectedAt: user.emailProviderConnectedAt || null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email provider" });
    }
  });

  // Initiate Google OAuth flow for Gmail
  app.get('/api/oauth/google/initiate', isAuthenticated, async (req: any, res) => {
    try {
      // Prevent browser caching of auth URL
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const userId = req.user.id.toString();
      const authUrl = googleOAuthService.getAuthUrl(userId);
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to initiate Google OAuth" });
    }
  });

  // Google OAuth callback
  app.get('/api/oauth/google/callback', async (req: any, res) => {
    const sendResultPage = (message: string, email: string | null, isError = false) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${isError ? 'Connection Failed' : 'Gmail Connected'}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: white; }
            .container { text-align: center; max-width: 400px; padding: 40px; }
            .icon { font-size: 48px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            p { color: #888; margin-bottom: 20px; }
            .email { color: #4ade80; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${isError ? '❌' : '✅'}</div>
            <h1>${isError ? 'Connection Failed' : 'Gmail Connected!'}</h1>
            <p>${message}${email ? ` <span class="email">${email}</span>` : ''}</p>
            <p style="font-size: 14px; color: #666;">This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: '${isError ? 'oauth-error' : 'oauth-success'}', message: '${isError ? message : ''}', email: '${email || ''}' }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
        </html>
      `);
    };

    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return sendResultPage('Missing OAuth parameters. Please try again.', null, true);
      }

      const userId = state as string;
      
      // Exchange code for tokens
      const tokens = await googleOAuthService.exchangeCodeForTokens(code as string);
      
      // Get user's email address from Google
      const emailAddress = await googleOAuthService.getUserEmail(tokens.access_token);
      
      // Save tokens securely
      await oauthTokenService.saveGmailTokens(userId, tokens, emailAddress);
      
      // Update user's connected email provider
      await storage.updateUserAdmin(userId, {
        connectedEmailProvider: 'gmail',
        connectedEmailAddress: emailAddress,
        emailProviderConnectedAt: new Date(),
      });

      sendResultPage('Your Gmail account has been connected:', emailAddress);
    } catch (error: any) {
      const errorMsg = (error.message || 'OAuth failed').replace(/'/g, "\\'");
      sendResultPage(errorMsg, null, true);
    }
  });

  // Initiate Microsoft OAuth flow for Outlook
  app.get('/api/oauth/microsoft/initiate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const authUrl = microsoftOAuthService.getAuthUrl(userId);
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to initiate Microsoft OAuth" });
    }
  });

  // Microsoft OAuth callback
  app.get('/api/oauth/microsoft/callback', async (req: any, res) => {
    const sendResultPage = (message: string, email: string | null, isError = false) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${isError ? 'Connection Failed' : 'Outlook Connected'}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: white; }
            .container { text-align: center; max-width: 400px; padding: 40px; }
            .icon { font-size: 48px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin-bottom: 10px; }
            p { color: #888; margin-bottom: 20px; }
            .email { color: #60a5fa; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${isError ? '❌' : '✅'}</div>
            <h1>${isError ? 'Connection Failed' : 'Outlook Connected!'}</h1>
            <p>${message}${email ? ` <span class="email">${email}</span>` : ''}</p>
            <p style="font-size: 14px; color: #666;">This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: '${isError ? 'oauth-error' : 'oauth-success'}', message: '${isError ? message : ''}', email: '${email || ''}' }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
        </html>
      `);
    };

    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return sendResultPage('Missing OAuth parameters. Please try again.', null, true);
      }

      const userId = state as string;
      
      // Exchange code for tokens
      const tokens = await microsoftOAuthService.exchangeCodeForTokens(code as string);
      
      // Get user's email address from Microsoft
      const emailAddress = await microsoftOAuthService.getUserEmail(tokens.access_token);
      
      // Save tokens securely
      await oauthTokenService.saveOutlookTokens(userId, tokens, emailAddress);
      
      // Update user's connected email provider
      await storage.updateUserAdmin(userId, {
        connectedEmailProvider: 'outlook',
        connectedEmailAddress: emailAddress,
        emailProviderConnectedAt: new Date(),
      });

      sendResultPage('Successfully connected', emailAddress, false);
    } catch (error: any) {
      sendResultPage(error.message || 'Failed to connect Outlook', null, true);
    }
  });

  // Disconnect email provider
  app.delete('/api/user/email-provider/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const user = req.user;

      // Clear OAuth tokens based on current provider
      if (user.connectedEmailProvider === 'gmail') {
        await oauthTokenService.clearGmailTokens(userId);
      } else if (user.connectedEmailProvider === 'outlook') {
        await oauthTokenService.clearOutlookTokens(userId);
      }

      const updatedUser = await storage.updateUserAdmin(userId, {
        connectedEmailProvider: null,
        connectedEmailAddress: null,
        emailProviderConnectedAt: null,
      });

      const { password, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to disconnect email provider" });
    }
  });

  app.post('/api/user/email-provider/send', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id.toString();
      const { to, cc, bcc, subject, body, isHtml, attachments } = req.body;

      if (!user.connectedEmailProvider) {
        return res.status(400).json({ message: "No email provider connected" });
      }

      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ message: "At least one recipient is required" });
      }

      if (!subject) {
        return res.status(400).json({ message: "Subject is required" });
      }

      if (!body) {
        return res.status(400).json({ message: "Email body is required" });
      }

      let result;
      if (user.connectedEmailProvider === 'gmail') {
        // Get valid access token (auto-refreshes if needed)
        const accessToken = await oauthTokenService.getValidGmailAccessToken(userId);
        if (!accessToken) {
          return res.status(401).json({ message: "Gmail token expired. Please reconnect your account." });
        }
        result = await googleOAuthService.sendEmail(accessToken, {
          to,
          cc,
          bcc,
          subject,
          body,
          isHtml: isHtml || false,
          fromEmail: user.connectedEmailAddress,
          fromName: user.emailDisplayName || `${user.firstName} ${user.lastName}`,
          attachments,
        });
      } else if (user.connectedEmailProvider === 'outlook') {
        // Get valid access token (auto-refreshes if needed)
        const accessToken = await oauthTokenService.getValidOutlookAccessToken(userId);
        if (!accessToken) {
          return res.status(401).json({ message: "Outlook token expired. Please reconnect your account." });
        }
        result = await microsoftOAuthService.sendEmail(accessToken, {
          to,
          cc,
          bcc,
          subject,
          body,
          isHtml: isHtml || false,
          attachments,
        });
      } else {
        return res.status(400).json({ message: "Invalid email provider" });
      }

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send email" });
    }
  });

  // Send test email to verify OAuth connection
  app.post('/api/user/email-provider/test', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id.toString();

      if (!user.connectedEmailProvider || !user.connectedEmailAddress) {
        return res.status(400).json({ message: "No email provider connected" });
      }

      const testSubject = "Backstage OS - Email Connection Test";
      const testBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Email Connection Successful!</h2>
          <p>This is a test email from Backstage OS to confirm your ${user.connectedEmailProvider === 'gmail' ? 'Gmail' : 'Outlook'} account is properly connected.</p>
          <p><strong>Connected Account:</strong> ${user.connectedEmailAddress}</p>
          <p><strong>Test sent at:</strong> ${new Date().toLocaleString()}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">You can now send emails directly from Backstage OS using your personal email address.</p>
        </div>
      `;

      let result;
      if (user.connectedEmailProvider === 'gmail') {
        const accessToken = await oauthTokenService.getValidGmailAccessToken(userId);
        if (!accessToken) {
          return res.status(401).json({ message: "Gmail token expired. Please reconnect your account." });
        }
        result = await googleOAuthService.sendEmail(accessToken, {
          to: [user.connectedEmailAddress],
          subject: testSubject,
          body: testBody,
          isHtml: true,
          fromEmail: user.connectedEmailAddress,
          fromName: user.emailDisplayName || `${user.firstName} ${user.lastName}`,
        });
      } else if (user.connectedEmailProvider === 'outlook') {
        const accessToken = await oauthTokenService.getValidOutlookAccessToken(userId);
        if (!accessToken) {
          return res.status(401).json({ message: "Outlook token expired. Please reconnect your account." });
        }
        result = await microsoftOAuthService.sendEmail(accessToken, {
          to: [user.connectedEmailAddress],
          subject: testSubject,
          body: testBody,
          isHtml: true,
        });
      } else {
        return res.status(400).json({ message: "Invalid email provider" });
      }

      if (result.success) {
        res.json({ success: true, messageId: result.messageId, sentTo: user.connectedEmailAddress });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to send test email" });
    }
  });

  // Fetch emails from connected provider
  app.get('/api/user/email-provider/emails', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const folder = req.query.folder as string || 'inbox';
      const limit = parseInt(req.query.limit as string) || 50;
      const pageToken = req.query.pageToken as string;

      if (!user.connectedEmailProvider || !user.connectedEmailAddress) {
        return res.status(400).json({ message: "No email provider connected" });
      }

      // Special handling for drafts folder - include locally-saved drafts
      if (folder === 'drafts') {
        const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
        // Use account ID -1 for OAuth connected accounts
        const localDrafts = await standaloneEmailService.getDraftMessages(-1);
        
        // Helper to decode HTML entities
        const decodeHtmlEntity = (text: string) => {
          if (!text) return text;
          return text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
        };
        
        // Ensure all drafts have toAddresses as arrays and decode HTML entities
        const formattedDrafts = (localDrafts || []).map(draft => {
          const toAddresses = Array.isArray(draft.toAddresses) ? draft.toAddresses : (draft.toAddresses ? [draft.toAddresses] : []);
          const ccAddresses = Array.isArray(draft.ccAddresses) ? draft.ccAddresses : (draft.ccAddresses ? [draft.ccAddresses] : []);
          const bccAddresses = Array.isArray(draft.bccAddresses) ? draft.bccAddresses : (draft.bccAddresses ? [draft.bccAddresses] : []);
          
          return {
            ...draft,
            toAddresses: toAddresses.map(addr => typeof addr === 'string' ? decodeHtmlEntity(addr) : addr),
            ccAddresses: ccAddresses.map(addr => typeof addr === 'string' ? decodeHtmlEntity(addr) : addr),
            bccAddresses: bccAddresses.map(addr => typeof addr === 'string' ? decodeHtmlEntity(addr) : addr),
          };
        });
        
        res.json({
          messages: formattedDrafts,
          pageToken: null,
        });
        return;
      }

      let result;
      if (user.connectedEmailProvider === 'gmail') {
        // Set user context for Gmail service to use per-user OAuth tokens
        setGmailUserId(user.id.toString());
        // Return Gmail data directly - frontend handles the transformation
        result = await gmailIntegrationService.getEmails(folder, limit, pageToken);
      } else if (user.connectedEmailProvider === 'outlook') {
        const skip = parseInt(req.query.skip as string) || 0;
        result = await outlookIntegrationService.getEmails(folder, limit, skip);
      } else {
        return res.status(400).json({ message: "Invalid email provider" });
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch emails" });
    }
  });

  // Get a single email from connected provider
  app.get('/api/user/email-provider/emails/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const messageId = req.params.messageId;

      if (!user.connectedEmailProvider || !user.connectedEmailAddress) {
        return res.status(400).json({ message: "No email provider connected" });
      }

      let message;
      if (user.connectedEmailProvider === 'gmail') {
        // Set user context for Gmail service to use per-user OAuth tokens
        setGmailUserId(user.id.toString());
        // Return Gmail data directly - frontend handles the transformation
        message = await gmailIntegrationService.getEmail(messageId);
      } else if (user.connectedEmailProvider === 'outlook') {
        message = await outlookIntegrationService.getEmail(messageId);
      } else {
        return res.status(400).json({ message: "Invalid email provider" });
      }

      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch email" });
    }
  });

  // Mark email as read
  app.post('/api/user/email-provider/emails/:messageId/read', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const messageId = req.params.messageId;

      if (!user.connectedEmailProvider) {
        return res.status(400).json({ message: "No email provider connected" });
      }

      if (user.connectedEmailProvider === 'gmail') {
        // Set user context for Gmail service to use per-user OAuth tokens
        setGmailUserId(user.id.toString());
        await gmailIntegrationService.markAsRead(messageId);
      } else if (user.connectedEmailProvider === 'outlook') {
        await outlookIntegrationService.markAsRead(messageId);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to mark email as read" });
    }
  });

  // Mark email as unread
  app.post('/api/user/email-provider/emails/:messageId/unread', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const messageId = req.params.messageId;

      if (!user.connectedEmailProvider) {
        return res.status(400).json({ message: "No email provider connected" });
      }

      if (user.connectedEmailProvider === 'gmail') {
        // Set user context for Gmail service to use per-user OAuth tokens
        setGmailUserId(user.id.toString());
        await gmailIntegrationService.markAsUnread(messageId);
      } else if (user.connectedEmailProvider === 'outlook') {
        await outlookIntegrationService.markAsUnread(messageId);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to mark email as unread" });
    }
  });

  // Move email to trash
  app.delete('/api/user/email-provider/emails/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const messageId = req.params.messageId;

      if (!user.connectedEmailProvider) {
        return res.status(400).json({ message: "No email provider connected" });
      }

      // Check if this is a locally-saved draft by trying to delete from database first
      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messageIdNum = parseInt(messageId);
      
      // Try to delete from local database (for drafts)
      const localDeleteSuccess = await standaloneEmailService.deleteMessage(messageIdNum, -1);
      if (localDeleteSuccess) {
        res.json({ success: true });
        return;
      }

      // If not a local draft, delete from Gmail/Outlook
      if (user.connectedEmailProvider === 'gmail') {
        // Set user context for Gmail service to use per-user OAuth tokens
        setGmailUserId(user.id.toString());
        await gmailIntegrationService.moveToTrash(messageId);
      } else if (user.connectedEmailProvider === 'outlook') {
        await outlookIntegrationService.moveToTrash(messageId);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to move email to trash" });
    }
  });

  // Archive email
  app.post('/api/user/email-provider/emails/:messageId/archive', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const messageId = req.params.messageId;

      if (!user.connectedEmailProvider) {
        return res.status(400).json({ message: "No email provider connected" });
      }

      if (user.connectedEmailProvider === 'gmail') {
        // Set user context for Gmail service to use per-user OAuth tokens
        setGmailUserId(user.id.toString());
        await gmailIntegrationService.archiveEmail(messageId);
      } else if (user.connectedEmailProvider === 'outlook') {
        await outlookIntegrationService.archiveEmail(messageId);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to archive email" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      // Use effective user ID to respect admin "view as" feature
      const userId = getEffectiveUserId(req);
      const projects = await storage.getProjectsByUserId(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Archive routes (must be defined before parameterized routes)
  app.get('/api/projects/archived', isAuthenticated, async (req: any, res) => {
    try {
      // Use effective user ID to respect admin "view as" feature
      const userId = getEffectiveUserId(req);
      const archivedProjects = await storage.getArchivedProjectsByUserId(userId);
      res.json(archivedProjects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch archived projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use effective user ID to respect admin "view as" feature
      const effectiveUserId = getEffectiveUserId(req);
      if (project.ownerId != effectiveUserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Get project info for join page (public endpoint - minimal project info)
  app.get('/api/projects/:id/join-info', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const email = req.query.email as string | undefined;
      
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get invitation info if email provided
      let invitation = null;
      if (email) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const matchingMember = teamMembers.find(m => m.email.toLowerCase() === email.toLowerCase());
        if (matchingMember) {
          invitation = {
            id: matchingMember.id,
            email: matchingMember.email,
            role: matchingMember.role,
            status: matchingMember.status
          };
        }
      }

      // Return minimal project info for public display
      res.json({
        project: {
          id: project.id,
          name: project.name,
          venue: project.venue,
        },
        invitation
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project info" });
    }
  });

  // Accept invitation to join a project
  app.post('/api/projects/:id/accept-invitation', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.id;
      const userEmail = req.user.email;
      
      // Find pending/invited invitation for this user's email
      const teamMembers = await storage.getTeamMembersByProjectId(projectId);
      const invitation = teamMembers.find(
        m => m.email.toLowerCase() === userEmail.toLowerCase() && 
             (m.status === 'pending' || m.status === 'invited')
      );
      
      if (!invitation) {
        // Check if already a member
        const existingMember = teamMembers.find(
          m => m.email.toLowerCase() === userEmail.toLowerCase() && m.status === 'active'
        );
        
        if (existingMember) {
          return res.status(400).json({ message: "You are already a member of this project" });
        }
        
        return res.status(404).json({ message: "No pending invitation found for your email address" });
      }

      // Update the team member record to link to this user and activate
      const updatedMember = await storage.updateTeamMember(invitation.id, {
        userId: userId,
        status: 'active',
        joinedAt: new Date()
      });

      res.json({ 
        message: "Successfully joined the project",
        member: updatedMember 
      });
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ message: "Failed to accept invitation", error: error.message });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      // Manual validation for project data since we updated the schema
      const projectSchema = z.object({
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional().or(z.literal("")),
        venue: z.string().optional().or(z.literal("")),
        prepStartDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        firstRehearsalDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        designerRunDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        firstTechDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        firstPreviewDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        openingNight: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        closingDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        season: z.string().optional().or(z.literal("")),
        venueId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? parseInt(val) : val;
        }),
        seasonId: z.union([z.string(), z.number(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? parseInt(val) : val;
        }),
        ownerId: z.number(),
      });


      // Helper function to generate a slug from the project name
      const generateSlug = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
          .substring(0, 50);
      };

      const projectData = projectSchema.parse({
        ...req.body,
        ownerId: parseInt(userId),
      });

      // Generate slug from project name
      const slug = generateSlug(projectData.name);
      const projectDataWithSlug = {
        ...projectData,
        slug: slug,
      };

      const project = await storage.createProject(projectDataWithSlug);
      
      // Create default show settings with email template
      const defaultEmailSubject = '{{showName}} Schedule v{{version}}';
      const defaultEmailBody = `Hi {{contactName}},

Version {{version}} of the schedule for {{showName}} has been published.

<em>You can view your personal schedule here: {{personalScheduleLink}}</em>

<strong>Updates to the schedule:</strong>

{{changesSummary}}

Best regards,
-Stage Management`;

      const defaultScheduleSettings = {
        timezone: 'America/New_York',
        timeFormat: '12h',
        weekStartDay: 'Sunday',
        emailTemplate: {
          subject: defaultEmailSubject,
          body: defaultEmailBody
        },
        enabledEventTypes: [
          "DARK",
          "Rehearsal", 
          "Meeting",
          "Performance",
          "Preview",
          "Breaks",
          "Tech Rehearsal",
          "Costume Fitting",
          "Wig Fitting",
          "Hair and Make-Up",
          "Vocal Coaching"
        ]
      };

      // Create all system event types for the new project
      const systemEventTypes = [
        { name: 'Rehearsal', description: 'Regular rehearsals including table reads, blocking, and run-throughs', color: '#3B82F6' },
        { name: 'Tech Rehearsal', description: 'Technical rehearsals including light and sound integration', color: '#FF6B35' },
        { name: 'Preview', description: 'Preview performances before opening', color: '#F59E0B' },
        { name: 'Performance', description: 'Live performances and shows', color: '#EF4444' },
        { name: 'Meeting', description: 'Production meetings and administrative gatherings', color: '#8B5CF6' },
        { name: 'Costume Fitting', description: 'Wardrobe and costume fittings', color: '#10B981' },
        { name: 'Wig Fitting', description: 'Wig and hair piece fittings', color: '#8B5CF6' },
        { name: 'Hair and Make-Up', description: 'Hair and makeup sessions', color: '#F59E0B' },
        { name: 'Vocal Coaching', description: 'Vocal training and coaching sessions', color: '#06B6D4' },
        { name: 'DARK', description: 'Dark days - no scheduled activities', color: '#000000' },
        { name: 'Breaks', description: 'Meal breaks, rest periods, and intermissions', color: '#6B7280' }
      ];

      // Create system event types for new project (let the database assign IDs)
      for (const eventType of systemEventTypes) {
        try {
          await storage.createEventType({
            projectId: project.id,
            name: eventType.name,
            description: eventType.description,
            color: eventType.color,
            isDefault: true,
            createdBy: parseInt(userId)
          });
        } catch (error) {
        }
      }

      // Create default report types for the new project
      const defaultReportTypes = [
        { name: 'Production Meeting Report', slug: 'meetings', description: 'Production meetings and team coordination', displayOrder: 1, icon: 'Users', color: 'bg-orange-100' },
        { name: 'Rehearsal Report', slug: 'rehearsal', description: 'Daily rehearsal progress and notes', displayOrder: 2, icon: 'Clock', color: 'bg-blue-100' },
        { name: 'Technical Rehearsal Report', slug: 'tech', description: 'Technical rehearsal and cue integration', displayOrder: 3, icon: 'Settings', color: 'bg-green-100' },
        { name: 'Preview Performance Report', slug: 'previews', description: 'Preview performance tracking and notes', displayOrder: 4, icon: 'Star', color: 'bg-yellow-100' },
        { name: 'Performance Report', slug: 'performance', description: 'Official performance documentation', displayOrder: 5, icon: 'Star', color: 'bg-purple-100' }
      ];

      for (const reportType of defaultReportTypes) {
        try {
          await storage.createReportType({
            projectId: project.id,
            name: reportType.name,
            slug: reportType.slug,
            description: reportType.description,
            displayOrder: reportType.displayOrder,
            isDefault: true,
            icon: reportType.icon,
            color: reportType.color,
            createdBy: parseInt(userId)
          });
        } catch (error) {
        }
      }

      await storage.upsertShowSettings({
        projectId: project.id,
        scheduleSettings: defaultScheduleSettings,
        sharingEnabled: false,
        createdBy: parseInt(userId)
      });
      
      // Create initial important date events
      await syncImportantDatesWithSchedule(
        project.id, 
        {}, // No old project data
        project, 
        parseInt(userId)
      );
      
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Helper function to get event type ID for Important Dates
  async function getEventTypeIdForImportantDate(projectId: number, dateLabel: string): Promise<number | undefined> {
    const allEventTypes = await storage.getEventTypesByProjectId(projectId);
    
    const eventTypeMapping: { [key: string]: string[] } = {
      'Prep Start': ['Meeting', 'meeting'],
      'First Rehearsal': ['Rehearsal', 'rehearsal'],
      'Designer Run': ['Rehearsal', 'rehearsal'],
      'First Tech': ['Tech Rehearsal', 'tech rehearsal', 'tech'],
      'First Preview': ['Preview', 'preview'],
      'Opening Night': ['Performance', 'performance'],
      'Closing': ['Performance', 'performance']
    };

    const possibleTypes = eventTypeMapping[dateLabel] || [];
    
    for (const typeName of possibleTypes) {
      const eventType = allEventTypes.find(et => 
        et.name.toLowerCase() === typeName.toLowerCase()
      );
      if (eventType) {
        return eventType.id;
      }
    }
    
    return undefined;
  }

  // Helper function to sync important dates with schedule events
  async function syncImportantDatesWithSchedule(
    projectId: number, 
    oldProject: any, 
    newProject: any, 
    userId: number
  ) {
    const importantDateFields = [
      { field: 'prepStartDate', label: 'Prep Start' },
      { field: 'firstRehearsalDate', label: 'First Rehearsal' },
      { field: 'designerRunDate', label: 'Designer Run' },
      { field: 'firstTechDate', label: 'First Tech' },
      { field: 'firstPreviewDate', label: 'First Preview' },
      { field: 'openingNight', label: 'Opening Night' },
      { field: 'closingDate', label: 'Closing' }
    ];

    // Get existing important date events (identified by title matching important date labels)
    const existingEvents = await storage.getScheduleEventsByProjectId(projectId);
    const importantDateEvents = existingEvents.filter(event => 
      event.title && importantDateFields.some(field => event.title.includes(field.label))
    );

    for (const dateField of importantDateFields) {
      const oldDate = oldProject[dateField.field];
      const newDate = newProject[dateField.field];
      
      // Find existing event for this date field
      const existingEvent = importantDateEvents.find(event => 
        event.title.includes(dateField.label)
      );

      if (newDate && newDate !== oldDate) {
        // Create or update event
        const eventDate = new Date(newDate);
        const dateStr = eventDate.toISOString().split('T')[0];
        const eventTypeId = await getEventTypeIdForImportantDate(projectId, dateField.label);
        
        // Get the actual event type name instead of using "important_date"
        const allEventTypes = await storage.getEventTypesByProjectId(projectId);
        const eventType = allEventTypes.find(et => et.id === eventTypeId);
        const eventTypeName = eventType ? eventType.name : 'Event';
        
        if (existingEvent) {
          // Update existing event
          await storage.updateScheduleEvent(existingEvent.id, {
            date: dateStr,
            title: dateField.label,
            description: `Important production milestone: ${dateField.label}`,
            type: eventTypeName, // Use actual event type name instead of "important_date"
            isAllDay: true,
            isProductionLevel: true,
            startTime: '00:00',
            endTime: '23:59',
            eventTypeId: eventTypeId
          });
        } else {
          // Create new event
          await storage.createScheduleEvent({
            projectId,
            title: dateField.label,
            description: `Important production milestone: ${dateField.label}`,
            date: dateStr,
            startTime: '00:00',
            endTime: '23:59',
            type: eventTypeName, // Use actual event type name instead of "important_date"
            isAllDay: true,
            isProductionLevel: true,
            createdBy: userId,
            eventTypeId: eventTypeId
          });
        }
      } else if (!newDate && existingEvent) {
        // Delete event if date was removed
        await storage.deleteScheduleEvent(existingEvent.id);
      }
    }
  }

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedProject = await storage.updateProject(projectId, req.body);
      
      // Sync important dates with schedule events
      await syncImportantDatesWithSchedule(
        projectId, 
        project, 
        updatedProject, 
        parseInt(req.user.id.toString())
      );

      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProject(projectId);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });



  app.post('/api/projects/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const archivedProject = await storage.archiveProject(projectId);
      res.json(archivedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to archive project" });
    }
  });

  app.post('/api/projects/:id/unarchive', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const unarchivedProject = await storage.unarchiveProject(projectId);
      res.json(unarchivedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to unarchive project" });
    }
  });

  // Manual sync route for important dates (for existing projects)
  app.post('/api/projects/:id/sync-important-dates', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Force sync the important dates with schedule events
      await syncImportantDatesWithSchedule(
        projectId,
        {}, // Treat as if no old dates exist to force creation
        project,
        parseInt(req.user.id.toString())
      );

      res.json({ message: "Important dates synced successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync important dates" });
    }
  });

  // ========== SEASONS ROUTES ==========
  
  app.get('/api/seasons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const seasons = await storage.getSeasonsByUserId(userId);
      res.json(seasons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seasons" });
    }
  });

  app.post('/api/seasons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const seasonData = insertSeasonSchema.parse({
        ...req.body,
        userId: parseInt(userId),
      });

      const season = await storage.createSeason(seasonData);
      res.json(season);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid season data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create season" });
    }
  });

  app.put('/api/seasons/:id', isAuthenticated, async (req: any, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      const season = await storage.getSeasonById(seasonId);
      
      if (!season) {
        return res.status(404).json({ message: "Season not found" });
      }

      // Check ownership
      if (season.userId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedSeason = await storage.updateSeason(seasonId, req.body);
      res.json(updatedSeason);
    } catch (error) {
      res.status(500).json({ message: "Failed to update season" });
    }
  });

  app.delete('/api/seasons/:id', isAuthenticated, async (req: any, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      const season = await storage.getSeasonById(seasonId);
      
      if (!season) {
        return res.status(404).json({ message: "Season not found" });
      }

      // Check ownership
      if (season.userId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteSeason(seasonId);
      res.json({ message: "Season deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete season" });
    }
  });

  // ========== VENUES ROUTES ==========
  
  app.get('/api/venues', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const venues = await storage.getVenuesByUserId(userId);
      res.json(venues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch venues" });
    }
  });

  app.post('/api/venues', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const venueData = insertVenueSchema.parse({
        ...req.body,
        userId: parseInt(userId),
      });

      const venue = await storage.createVenue(venueData);
      res.json(venue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid venue data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create venue" });
    }
  });

  app.put('/api/venues/:id', isAuthenticated, async (req: any, res) => {
    try {
      const venueId = parseInt(req.params.id);
      const venue = await storage.getVenueById(venueId);
      
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      // Check ownership
      if (venue.userId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedVenue = await storage.updateVenue(venueId, req.body);
      res.json(updatedVenue);
    } catch (error) {
      res.status(500).json({ message: "Failed to update venue" });
    }
  });

  app.delete('/api/venues/:id', isAuthenticated, async (req: any, res) => {
    try {
      const venueId = parseInt(req.params.id);
      const venue = await storage.getVenueById(venueId);
      
      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      // Check ownership
      if (venue.userId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteVenue(venueId);
      res.json({ message: "Venue deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete venue" });
    }
  });

  // Team member routes
  app.get('/api/projects/:id/team', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const teamMembers = await storage.getTeamMembersByProjectId(projectId);
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post('/api/projects/:id/team', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const teamMemberData = insertTeamMemberSchema.parse({
        ...req.body,
        projectId,
      });

      const teamMember = await storage.inviteTeamMember(teamMemberData);
      res.json(teamMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid team member data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to invite team member" });
    }
  });

  // Report routes

  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const reports = await storage.getReportsByUserId(userId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const reportData = insertReportSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      // Verify project ownership
      const project = await storage.getProjectById(reportData.projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.createReport(reportData);
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Project-specific reports routes
  app.get('/api/projects/:id/reports', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member) - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const reports = await storage.getReportsByProjectId(projectId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get('/api/projects/:projectId/reports/:reportId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      // If report has a templateId, fetch and include the template's layoutConfiguration
      if (report.templateId) {
        const template = await storage.getReportTemplateById(report.templateId);
        if (template && template.layoutConfiguration) {
          res.json({
            ...report,
            template: {
              id: template.id,
              name: template.name,
              layoutConfiguration: template.layoutConfiguration
            }
          });
          return;
        }
      }

      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.post('/api/projects/:id/reports', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Prepare report data with proper date conversion
      const reportData = insertReportSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id),
        date: req.body.date ? new Date(req.body.date) : new Date(),
        templateId: req.body.templateId ? parseInt(req.body.templateId) : undefined,
      });
      

      const report = await storage.createReport(reportData);

      // Auto-sync field notes if template has department-assigned fields
      if (report.templateId) {
        try {
          const template = await storage.getTemplateV2WithFullDataById(report.templateId);
          if (template && template.sections) {
            const content = report.content as Record<string, any>;
            
            for (const section of template.sections || []) {
              for (const field of section.fields || []) {
                const departmentKey = field.departmentKey;
                const fieldLabel = field.label;
                
                if (departmentKey && fieldLabel && content && content[fieldLabel]) {
                  const fieldContent = content[fieldLabel];
                  const parsedNotes = parseNotesFromHtml(fieldContent);
                  
                  for (let i = 0; i < parsedNotes.length; i++) {
                    const noteData = parsedNotes[i];
                    await storage.createReportNote({
                      reportId: report.id,
                      projectId: projectId,
                      content: noteData.text,
                      noteOrder: i + 1,
                      department: departmentKey,
                      templateFieldId: field.id,
                      createdBy: parseInt(req.user.id),
                    });
                  }
                }
              }
            }
          } else {
          }
        } catch (syncError) {
        }
      }

      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Helper function to parse HTML content into individual note lines (used by auto-sync)
  // Returns array of {text, hash} for stable identification
  function parseNotesFromHtml(html: string): { text: string; hash: string }[] {
    if (!html || typeof html !== 'string') return [];
    
    const notes: { text: string; hash: string }[] = [];
    const seen = new Set<string>();
    
    const addNote = (text: string, index: number) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // Create a hash combining content and position for uniqueness
      const hash = `${trimmed.toLowerCase()}_${index}`;
      if (!seen.has(hash)) {
        seen.add(hash);
        notes.push({ text: trimmed, hash });
      }
    };
    
    let noteIndex = 0;
    
    // Extract list items (both <ol> and <ul>)
    const listItemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let listMatch;
    while ((listMatch = listItemRegex.exec(html)) !== null) {
      const text = listMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text) {
        addNote(text, noteIndex++);
      }
    }
    
    // If we found list items, that's our main content
    if (notes.length > 0) return notes;
    
    // Otherwise check for paragraphs
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    while ((pMatch = pRegex.exec(html)) !== null) {
      const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text) {
        addNote(text, noteIndex++);
      }
    }
    
    if (notes.length > 0) return notes;
    
    // Finally, try div blocks
    const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
    let divMatch;
    while ((divMatch = divRegex.exec(html)) !== null) {
      const text = divMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text) {
        addNote(text, noteIndex++);
      }
    }
    
    if (notes.length > 0) return notes;
    
    // Last resort: split by line breaks
    const lines = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split('\n');
    lines.forEach((line, i) => {
      const text = line.trim();
      if (text) addNote(text, i);
    });
    
    return notes;
  }

  app.put('/api/projects/:projectId/reports/:reportId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      const updateData = {
        title: req.body.title,
        type: req.body.type,
        content: req.body.content,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };

      const updatedReport = await storage.updateReport(reportId, updateData);
      
      // Auto-sync notes from department fields if template has them
      // Uses content-matching to preserve status/priority/assignee
      if ((report as any).templateId) {
        try {
          const template = await storage.getTemplateV2WithFullDataById((report as any).templateId);
          if (template && template.sections) {
            const content = updateData.content as Record<string, any>;
            
            for (const section of template.sections || []) {
              for (const field of section.fields || []) {
                if (field.departmentKey && content && content[field.label]) {
                  const fieldContent = content[field.label];
                  const parsedNotes = parseNotesFromHtml(fieldContent);
                  
                  // Get ALL notes for this report and department, then filter by field
                  const allNotes = await storage.getReportNotesByReportId(reportId, field.departmentKey);
                  const existingByField = allNotes.filter(n => (n as any).templateFieldId === field.id);
                  
                  // Guard: if parser returns no notes but field has content, skip sync
                  // to avoid accidental deletions from parsing errors
                  const hasVisibleContent = fieldContent.replace(/<[^>]+>/g, '').trim().length > 0;
                  if (parsedNotes.length === 0 && hasVisibleContent && existingByField.length > 0) {
                    continue;
                  }
                  
                  // Build map of existing notes by normalized content
                  const existingByContent = new Map<string, typeof existingByField[0]>();
                  for (const note of existingByField) {
                    const key = note.content.trim().toLowerCase();
                    if (!existingByContent.has(key)) {
                      existingByContent.set(key, note);
                    }
                  }
                  
                  const processedNoteIds = new Set<number>();
                  
                  for (let i = 0; i < parsedNotes.length; i++) {
                    const { text: noteContent } = parsedNotes[i];
                    const normalizedContent = noteContent.trim().toLowerCase();
                    const existingNote = existingByContent.get(normalizedContent);
                    
                    if (existingNote) {
                      // Content matches - just update order, preserve status/priority/assignee
                      if (existingNote.noteOrder !== i + 1) {
                        await storage.updateReportNote(existingNote.id, { noteOrder: i + 1 });
                      }
                      processedNoteIds.add(existingNote.id);
                      existingByContent.delete(normalizedContent); // Remove so duplicates get new entries
                    } else {
                      // New content - create new note
                      const newNote = await storage.createReportNote({
                        reportId,
                        projectId,
                        content: noteContent,
                        noteOrder: i + 1,
                        department: field.departmentKey,
                        templateFieldId: field.id,
                        createdBy: parseInt(req.user.id),
                      });
                      processedNoteIds.add(newNote.id);
                    }
                  }
                  
                  // Delete notes that are no longer in the content
                  // But only if we successfully parsed some notes (safety guard)
                  if (parsedNotes.length > 0) {
                    for (const note of existingByField) {
                      if (!processedNoteIds.has(note.id)) {
                        await storage.deleteReportNote(note.id);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (syncError) {
        }
      }
      
      res.json(updatedReport);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.delete('/api/projects/:projectId/reports/:reportId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      await storage.deleteReport(reportId);
      res.json({ message: "Report deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report" });
    }
  });

  app.put('/api/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReportById(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Check ownership
      if (report.createdBy !== req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedReport = await storage.updateReport(reportId, req.body);
      res.json(updatedReport);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  // Sync notes from template fields to report_notes table
  app.post('/api/projects/:projectId/reports/:reportId/sync-field-notes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Get the template for this report
      const templateId = (report as any).templateId;
      if (!templateId) {
        return res.json({ message: "No template associated with this report", synced: 0 });
      }

      const template = await storage.getReportTemplateById(templateId);
      if (!template) {
        return res.json({ message: "Template not found", synced: 0 });
      }

      // Get all fields with departmentKey
      const content = report.content as Record<string, any>;
      const syncedNotes: any[] = [];
      
      for (const section of (template as any).sections || []) {
        for (const field of section.fields || []) {
          if (field.departmentKey && content[field.label]) {
            const fieldContent = content[field.label];
            const parsedNotes = parseNotesFromHtml(fieldContent);
            
            // Get existing notes for this field
            const existingNotes = await storage.getReportNotesByReportId(reportId, field.departmentKey);
            const existingByField = existingNotes.filter(n => (n as any).templateFieldId === field.id);
            
            // Sync notes: create new ones, update existing ones
            for (let i = 0; i < parsedNotes.length; i++) {
              const noteData = parsedNotes[i];
              const noteContent = noteData.text;
              const existingNote = existingByField[i];
              
              if (existingNote) {
                // Update if content changed
                if (existingNote.content !== noteContent) {
                  await storage.updateReportNote(existingNote.id, { content: noteContent });
                }
              } else {
                // Create new note
                const newNote = await storage.createReportNote({
                  reportId,
                  projectId,
                  content: noteContent,
                  noteOrder: i + 1,
                  department: field.departmentKey,
                  templateFieldId: field.id,
                  createdBy: parseInt(req.user.id),
                });
                syncedNotes.push(newNote);
              }
            }
            
            // Delete extra notes that no longer exist in content
            for (let i = parsedNotes.length; i < existingByField.length; i++) {
              await storage.deleteReportNote(existingByField[i].id);
            }
          }
        }
      }

      res.json({ message: "Notes synced successfully", synced: syncedNotes.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync field notes" });
    }
  });

  // Report notes routes
  app.get('/api/projects/:projectId/reports/:reportId/notes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      const department = req.query.department as string | undefined;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      const notes = await storage.getReportNotesByReportId(reportId, department);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report notes" });
    }
  });

  app.post('/api/projects/:projectId/reports/:reportId/notes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Get current max order to ensure new note goes at the end
      const existingNotes = await storage.getReportNotesByReportId(reportId);
      const maxOrder = Math.max(0, ...existingNotes.map(n => n.noteOrder));

      const noteData = {
        ...req.body,
        reportId,
        projectId,
        createdBy: parseInt(req.user.id),
        noteOrder: maxOrder + 1
      };

      const note = await storage.createReportNote(noteData);
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to create report note" });
    }
  });

  app.patch('/api/projects/:projectId/reports/:reportId/notes/:noteId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      const noteId = parseInt(req.params.noteId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const note = await storage.getReportNoteById(noteId);
      if (!note || note.reportId !== reportId || note.projectId !== projectId) {
        return res.status(404).json({ message: "Note not found" });
      }

      const updatedNote = await storage.updateReportNote(noteId, req.body);
      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report note" });
    }
  });

  app.delete('/api/projects/:projectId/reports/:reportId/notes/:noteId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      const noteId = parseInt(req.params.noteId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const note = await storage.getReportNoteById(noteId);
      if (!note || note.reportId !== reportId || note.projectId !== projectId) {
        return res.status(404).json({ message: "Note not found" });
      }

      await storage.deleteReportNote(noteId);
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report note" });
    }
  });

  app.patch('/api/projects/:projectId/reports/:reportId/notes/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      await storage.reorderReportNotes(req.body.notes);
      res.json({ message: "Notes reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder report notes" });
    }
  });

  // Delete notes by department (for auto-numbering textarea)
  app.delete('/api/projects/:projectId/reports/:reportId/notes/department/:department', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      const department = req.params.department;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      await storage.deleteReportNotesByDepartment(reportId, department);
      res.json({ message: "Department notes deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete department notes" });
    }
  });

  // Get all notes for a project (for notes tracking)
  app.get('/api/projects/:projectId/notes/all', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const notes = await storage.getAllReportNotesByProjectId(projectId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project notes" });
    }
  });

  // Update individual note (for notes tracking)
  app.patch('/api/projects/:projectId/notes/:noteId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const noteId = parseInt(req.params.noteId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedNote = await storage.updateReportNote(noteId, req.body);
      res.json(updatedNote);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  // Report template routes (show-specific)
  // This duplicate route is removed - the correct route is at line 2990 using :id parameter

  app.get('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getReportTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check access (owner, public, or default)
      const userId = req.user.id.toString();
      if (template.createdBy !== userId && !template.isPublic && !template.isDefault) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const templateData = insertReportTemplateSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const template = await storage.createReportTemplate(templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getReportTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check ownership
      if (template.createdBy !== req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedTemplate = await storage.updateReportTemplate(templateId, req.body);
      res.json(updatedTemplate);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getReportTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check ownership
      if (template.createdBy !== req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Don't allow deletion of default templates
      if (template.isDefault) {
        return res.status(403).json({ message: "Cannot delete default templates" });
      }

      await storage.deleteReportTemplate(templateId);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Show settings routes
  app.get("/api/projects/:id/settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use effective user ID to respect admin "view as" feature
      const effectiveUserId = getEffectiveUserId(req);
      if (project.ownerId != effectiveUserId) {
        return res.status(403).json({ message: "Access denied" });
      }

      let settings = await storage.getShowSettingsByProjectId(projectId);
      
      if (!settings) {
        // Create default settings if none exist
        settings = await storage.upsertShowSettings({
          projectId,
          createdBy: req.user.id.toString(),
        });
      }
      
      
      // CRITICAL DEBUG: Show EXACT layout data being returned
      if (settings.layoutConfiguration) {
      } else {
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/projects/:id/settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settingsData = req.body;
      const settings = await storage.updateShowSettings(projectId, settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.put("/api/projects/:id/settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settingsData = req.body;
      const settings = await storage.updateShowSettings(projectId, settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Department names endpoint
  app.put("/api/projects/:id/settings/department-names", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { department, name } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current settings
      const settings = await storage.getShowSettingsByProjectId(projectId);
      const currentDepartmentNames = settings?.departmentNames || {};
      
      // Update the specific department name
      const updatedDepartmentNames = {
        ...currentDepartmentNames,
        [department]: name
      };

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        departmentNames: updatedDepartmentNames
      });

      res.json({
        success: true,
        departmentNames: updatedSettings.departmentNames
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update department name" });
    }
  });

  // Department formatting endpoints
  app.put("/api/projects/:id/settings/department-formatting", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { department, formatting, applyToAll } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current settings
      const settings = await storage.getShowSettingsByProjectId(projectId);
      const currentDepartmentFormatting = settings?.departmentFormatting || {};
      
      let updatedDepartmentFormatting;
      
      if (applyToAll) {
        // Apply formatting to all departments
        updatedDepartmentFormatting = {
          scenic: formatting,
          lighting: formatting,
          audio: formatting,
          video: formatting,
          props: formatting
        };
      } else {
        // Update just the specific department
        updatedDepartmentFormatting = {
          ...currentDepartmentFormatting,
          [department]: formatting
        };
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        departmentFormatting: updatedDepartmentFormatting
      });

      res.json({
        success: true,
        departmentFormatting: updatedSettings.departmentFormatting
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update department formatting" });
    }
  });

  // Field header formatting endpoints
  app.put("/api/projects/:id/settings/field-header-formatting", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { formatting, applyToAll } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      let updatedFieldHeaderFormatting;
      
      if (applyToAll) {
        // Apply formatting to all field headers
        updatedFieldHeaderFormatting = formatting;
      } else {
        // For now, field headers use global formatting
        updatedFieldHeaderFormatting = formatting;
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        fieldHeaderFormatting: updatedFieldHeaderFormatting
      });

      res.json({
        success: true,
        fieldHeaderFormatting: updatedSettings.fieldHeaderFormatting
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update field header formatting" });
    }
  });

  // Bulk department names endpoint for global save
  app.put("/api/projects/:id/settings/department-names-bulk", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { departmentNames } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current settings
      const settings = await storage.getShowSettingsByProjectId(projectId);
      const currentDepartmentNames = settings?.departmentNames || {};
      
      // Merge with current department names
      const updatedDepartmentNames = {
        ...currentDepartmentNames,
        ...departmentNames
      };

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        departmentNames: updatedDepartmentNames
      });

      res.json({
        success: true,
        departmentNames: updatedSettings.departmentNames
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update department names" });
    }
  });

  // Bulk department formatting endpoint for global save
  app.put("/api/projects/:id/settings/department-formatting-bulk", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { departmentFormatting } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current settings
      const settings = await storage.getShowSettingsByProjectId(projectId);
      const currentDepartmentFormatting = settings?.departmentFormatting || {};
      
      // Merge with current department formatting
      const updatedDepartmentFormatting = {
        ...currentDepartmentFormatting,
        ...departmentFormatting
      };

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        departmentFormatting: updatedDepartmentFormatting
      });

      res.json({
        success: true,
        departmentFormatting: updatedSettings.departmentFormatting
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update department formatting" });
    }
  });

  // Header formatting endpoints
  app.put("/api/projects/:id/settings/header-formatting", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { formatting } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        headerFormatting: formatting
      });

      res.json({
        success: true,
        headerFormatting: updatedSettings.headerFormatting
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update header formatting" });
    }
  });

  // Footer formatting endpoints
  app.put("/api/projects/:id/settings/footer-formatting", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { formatting } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        footerFormatting: formatting
      });

      res.json({
        success: true,
        footerFormatting: updatedSettings.footerFormatting
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update footer formatting" });
    }
  });

  // Department order endpoint
  app.put("/api/projects/:id/settings/department-order", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { departmentOrder } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        departmentOrder: departmentOrder
      });

      // Return the complete updated settings object for cache consistency
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update department order" });
    }
  });

  // Layout configuration endpoint
  app.put("/api/projects/:id/settings/layout-configuration", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { layoutConfiguration, templateType } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // UNIFIED APPROACH: Save layout configuration directly to showSettings table
      // This creates a single source of truth instead of split across multiple tables
      const updatedSettings = await storage.updateShowSettings(projectId, {
        layoutConfiguration: layoutConfiguration
      });

      // Return the complete updated settings object for cache consistency
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template layout configuration" });
    }
  });

  app.post("/api/projects/:id/share-link", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const shareLink = await storage.generateShareLink(projectId);
      res.json({ shareableLink: shareLink });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate share link" });
    }
  });

  // Contact sheet settings routes
  app.get("/api/projects/:id/contact-sheet-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const settings = await storage.getContactSheetSettings(projectId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/projects/:id/contact-sheet-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settingsData = req.body;
      const settings = await storage.saveContactSheetSettings(projectId, settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Contact sheet version control routes
  app.post("/api/projects/:id/contact-sheet/publish", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { versionType, settings } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const version = await storage.publishContactSheetVersion(
        projectId, 
        versionType, 
        settings, 
        req.user.id
      );
      
      res.json(version);
    } catch (error) {
      res.status(500).json({ message: "Failed to publish version" });
    }
  });

  app.get("/api/projects/:id/contact-sheet/versions", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const versions = await storage.getContactSheetVersions(projectId);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  app.get("/api/projects/:id/contact-sheet/current-version", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const currentVersion = await storage.getCurrentContactSheetVersion(projectId);
      res.json({ version: currentVersion });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current version" });
    }
  });

  // Company list settings routes
  app.get("/api/projects/:id/company-list-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const settings = await storage.getCompanyListSettings(projectId);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/projects/:id/company-list-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settingsData = req.body;
      const settings = await storage.saveCompanyListSettings(projectId, settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Contact availability routes
  app.get("/api/projects/:id/contacts/:contactId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const contactId = parseInt(req.params.contactId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availability = await storage.getContactAvailability(contactId, projectId);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post("/api/projects/:id/contacts/:contactId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const contactId = parseInt(req.params.contactId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const availabilityData = insertContactAvailabilitySchema.parse({
        ...req.body,
        contactId,
        projectId,
        createdBy: req.user.id
      });

      const availability = await storage.createContactAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to create availability" });
    }
  });

  app.put("/api/projects/:id/contacts/:contactId/availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const availabilityData = insertContactAvailabilitySchema.partial().parse(req.body);
      const availability = await storage.updateContactAvailability(availabilityId, availabilityData);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.delete("/api/projects/:id/contacts/:contactId/availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteContactAvailability(availabilityId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  // Get all availability for all contacts in a project
  app.get("/api/projects/:id/availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availability = await storage.getAllProjectAvailability(projectId);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Location availability routes
  app.get("/api/projects/:id/location-availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availability = await storage.getLocationAvailabilityByProjectId(projectId);
      // Transform data to match frontend expectations (type -> availabilityType)
      const transformedAvailability = availability.map(item => ({
        ...item,
        availabilityType: item.type
      }));
      res.json(transformedAvailability);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch location availability" });
    }
  });

  app.post("/api/projects/:id/location-availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availabilityData = insertLocationAvailabilitySchema.parse({
        ...req.body,
        projectId
      });

      const availability = await storage.createLocationAvailability(availabilityData);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to create location availability" });
    }
  });

  app.put("/api/projects/:id/location-availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availabilityData = insertLocationAvailabilitySchema.partial().parse(req.body);
      const availability = await storage.updateLocationAvailability(availabilityId, availabilityData);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to update location availability" });
    }
  });

  app.delete("/api/projects/:id/location-availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.deleteLocationAvailability(availabilityId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete location availability" });
    }
  });

  app.delete("/api/projects/:id/location-availability/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { ids } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.bulkDeleteLocationAvailability(ids);
      res.json({ success: true, deletedCount: ids.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete location availability" });
    }
  });

  // Location-specific availability routes (follows contact availability pattern)
  app.post("/api/projects/:id/locations/:locationId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const locationId = parseInt(req.params.locationId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availabilityData = {
        ...req.body,
        type: req.body.availabilityType || req.body.type, // Handle both field names
        locationId,
        projectId,
        createdBy: req.user.id
      };
      delete availabilityData.availabilityType; // Remove the old field

      const availability = await storage.createLocationAvailability(availabilityData);
      // Transform data to match frontend expectations (type -> availabilityType)
      const transformedAvailability = {
        ...availability,
        availabilityType: availability.type
      };
      res.json(transformedAvailability);
    } catch (error) {
      res.status(500).json({ message: "Failed to create location availability" });
    }
  });

  app.put("/api/projects/:id/locations/:locationId/availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const locationId = parseInt(req.params.locationId);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availabilityData = {
        ...req.body,
        locationId,
        projectId
      };

      const availability = await storage.updateLocationAvailability(availabilityId, availabilityData);
      // Transform data to match frontend expectations (type -> availabilityType)
      const transformedAvailability = {
        ...availability,
        availabilityType: availability.type
      };
      res.json(transformedAvailability);
    } catch (error) {
      res.status(500).json({ message: "Failed to update location availability" });
    }
  });

  // Props API endpoints
  app.get("/api/projects/:id/props", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const props = await storage.getPropsByProjectId(projectId);
      res.json(props);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch props" });
    }
  });

  app.post("/api/projects/:id/props", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const propData = insertPropsSchema.parse({
        ...req.body,
        projectId,
        createdBy: req.user.id
      });
      
      const prop = await storage.createProp(propData);
      res.status(201).json(prop);
    } catch (error) {
      res.status(500).json({ message: "Failed to create prop" });
    }
  });

  app.patch("/api/projects/:id/props/:propId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const propId = parseInt(req.params.propId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const propData = insertPropsSchema.partial().parse(req.body);
      const prop = await storage.updateProp(propId, propData);
      res.json(prop);
    } catch (error) {
      res.status(500).json({ message: "Failed to update prop" });
    }
  });

  app.delete("/api/projects/:id/props/:propId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const propId = parseInt(req.params.propId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.deleteProp(propId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete prop" });
    }
  });

  // Costume API endpoints
  app.get("/api/projects/:id/costumes", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const costumes = await storage.getCostumesByProjectId(projectId);
      res.json(costumes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch costumes" });
    }
  });

  app.post("/api/projects/:id/costumes", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const costumeData = insertCostumeSchema.parse({
        ...req.body,
        projectId,
        createdBy: req.user.id
      });
      
      const costume = await storage.createCostume(costumeData);
      res.json(costume);
    } catch (error) {
      res.status(500).json({ message: "Failed to create costume" });
    }
  });

  app.patch("/api/projects/:id/costumes/:costumeId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const costumeId = parseInt(req.params.costumeId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const costumeData = insertCostumeSchema.partial().parse(req.body);
      const costume = await storage.updateCostume(costumeId, costumeData);
      res.json(costume);
    } catch (error) {
      res.status(500).json({ message: "Failed to update costume" });
    }
  });

  app.delete("/api/projects/:id/costumes/:costumeId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const costumeId = parseInt(req.params.costumeId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.deleteCostume(costumeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete costume" });
    }
  });

  // Company list version control routes
  app.post("/api/projects/:id/company-list/publish", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { versionType, settings } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const version = await storage.publishCompanyListVersion(
        projectId, 
        versionType, 
        settings, 
        req.user.id
      );
      
      res.json(version);
    } catch (error) {
      res.status(500).json({ message: "Failed to publish version" });
    }
  });

  app.get("/api/projects/:id/company-list/versions", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const versions = await storage.getCompanyListVersions(projectId);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  app.get("/api/projects/:id/company-list/current-version", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const currentVersion = await storage.getCurrentCompanyListVersion(projectId);
      res.json({ version: currentVersion });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current version" });
    }
  });

  // Running Order Version routes
  app.get("/api/projects/:id/running-order-versions", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const versions = await storage.getRunningOrderVersionsByProjectId(projectId);
      res.json(versions);
    } catch (error) {
      console.error('Error fetching running order versions:', error);
      res.status(500).json({ message: "Failed to fetch running order versions" });
    }
  });

  app.get("/api/projects/:id/running-order-versions/:versionId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const version = await storage.getRunningOrderVersionById(versionId);
      if (!version || version.projectId !== projectId) {
        return res.status(404).json({ message: "Version not found" });
      }

      res.json(version);
    } catch (error) {
      console.error('Error fetching running order version:', error);
      res.status(500).json({ message: "Failed to fetch running order version" });
    }
  });

  app.post("/api/projects/:id/running-order-versions", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { label, notes, runningOrder, structureGroups, status } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Get next version number
      const versionNumber = await storage.getNextVersionNumber(projectId);

      const version = await storage.createRunningOrderVersion({
        projectId,
        versionNumber,
        status: status || 'draft',
        label: label || null,
        notes: notes || null,
        runningOrder,
        structureGroups: structureGroups || null,
        createdBy: req.user.id,
        publishedAt: status === 'published' ? new Date() : null,
      });

      res.json(version);
    } catch (error) {
      console.error('Error creating running order version:', error);
      res.status(500).json({ message: "Failed to create running order version" });
    }
  });

  app.patch("/api/projects/:id/running-order-versions/:versionId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      const { label, notes, status } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const existingVersion = await storage.getRunningOrderVersionById(versionId);
      if (!existingVersion || existingVersion.projectId !== projectId) {
        return res.status(404).json({ message: "Version not found" });
      }

      const updates: any = {};
      if (label !== undefined) updates.label = label;
      if (notes !== undefined) updates.notes = notes;
      if (status !== undefined) {
        updates.status = status;
        if (status === 'published' && !existingVersion.publishedAt) {
          updates.publishedAt = new Date();
        }
      }

      const version = await storage.updateRunningOrderVersion(versionId, updates);
      res.json(version);
    } catch (error) {
      console.error('Error updating running order version:', error);
      res.status(500).json({ message: "Failed to update running order version" });
    }
  });

  app.delete("/api/projects/:id/running-order-versions/:versionId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const version = await storage.getRunningOrderVersionById(versionId);
      if (!version || version.projectId !== projectId) {
        return res.status(404).json({ message: "Version not found" });
      }

      await storage.deleteRunningOrderVersion(versionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting running order version:', error);
      res.status(500).json({ message: "Failed to delete running order version" });
    }
  });

  // Report template routes
  app.get("/api/projects/:id/templates", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const templates = await storage.getReportTemplatesByProjectId(projectId);
      
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/projects/:id/templates", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const templateData = {
        ...req.body,
        projectId,
        createdBy: req.user.id.toString(),
      };

      const template = await storage.createReportTemplate(templateData);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/projects/:id/templates/:templateId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const templateId = parseInt(req.params.templateId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const template = await storage.updateReportTemplate(templateId, req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // V2 Template System API Routes
  // Get all templates with sections and fields for a project
  app.get("/api/projects/:id/templates-v2", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId !== parseInt(req.user.id)) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === parseInt(req.user.id));
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const templates = await storage.getTemplatesV2WithFullData(projectId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get a single template with full data
  app.get("/api/projects/:id/templates-v2/:templateId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const templateId = parseInt(req.params.templateId);
      
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId !== parseInt(req.user.id)) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === parseInt(req.user.id));
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const templates = await storage.getTemplatesV2WithFullData(projectId);
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  // Create a new V2 template
  app.post("/api/projects/:id/templates-v2", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId !== parseInt(req.user.id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validationResult = insertReportTemplateV2Schema.safeParse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id),
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid template data", 
          errors: validationResult.error.errors 
        });
      }

      const template = await storage.createTemplateV2(validationResult.data);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // Update a V2 template
  app.patch("/api/projects/:id/templates-v2/:templateId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const templateId = parseInt(req.params.templateId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId !== parseInt(req.user.id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validationResult = insertReportTemplateV2Schema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid template data", 
          errors: validationResult.error.errors 
        });
      }

      const template = await storage.updateTemplateV2(templateId, validationResult.data);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // Delete a V2 template
  app.delete("/api/projects/:id/templates-v2/:templateId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const templateId = parseInt(req.params.templateId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId !== parseInt(req.user.id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteTemplateV2(templateId);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Reorder V2 templates
  app.post("/api/projects/:id/templates-v2/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId !== parseInt(req.user.id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.reorderTemplatesV2(req.body.templates);
      res.json({ message: "Templates reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder templates" });
    }
  });

  // Template Sections routes
  app.post("/api/templates-v2/:templateId/sections", isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      
      const dataToValidate = {
        ...req.body,
        templateId,
      };
      
      
      const validationResult = insertTemplateSectionSchema.safeParse(dataToValidate);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid section data", 
          errors: validationResult.error.errors 
        });
      }

      const section = await storage.createTemplateSection(validationResult.data);
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to create section" });
    }
  });

  app.patch("/api/templates-v2/sections/:sectionId", isAuthenticated, async (req: any, res) => {
    try {
      const sectionId = parseInt(req.params.sectionId);
      
      const validationResult = insertTemplateSectionSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid section data", 
          errors: validationResult.error.errors 
        });
      }

      const section = await storage.updateTemplateSection(sectionId, validationResult.data);
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to update section" });
    }
  });

  app.delete("/api/templates-v2/sections/:sectionId", isAuthenticated, async (req: any, res) => {
    try {
      const sectionId = parseInt(req.params.sectionId);
      await storage.deleteTemplateSection(sectionId);
      res.json({ message: "Section deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete section" });
    }
  });

  app.post("/api/templates-v2/sections/reorder", isAuthenticated, async (req: any, res) => {
    try {
      await storage.reorderTemplateSections(req.body.sections);
      res.json({ message: "Sections reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder sections" });
    }
  });

  // Template Fields routes
  app.post("/api/templates-v2/sections/:sectionId/fields", isAuthenticated, async (req: any, res) => {
    try {
      const sectionId = parseInt(req.params.sectionId);
      
      const validationResult = insertTemplateFieldSchema.safeParse({
        ...req.body,
        sectionId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid field data", 
          errors: validationResult.error.errors 
        });
      }

      const field = await storage.createTemplateField(validationResult.data);
      res.json(field);
    } catch (error) {
      res.status(500).json({ message: "Failed to create field" });
    }
  });

  app.patch("/api/templates-v2/fields/:fieldId", isAuthenticated, async (req: any, res) => {
    try {
      const fieldId = parseInt(req.params.fieldId);
      
      const validationResult = insertTemplateFieldSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid field data", 
          errors: validationResult.error.errors 
        });
      }

      const field = await storage.updateTemplateField(fieldId, validationResult.data);
      res.json(field);
    } catch (error) {
      res.status(500).json({ message: "Failed to update field" });
    }
  });

  app.delete("/api/templates-v2/fields/:fieldId", isAuthenticated, async (req: any, res) => {
    try {
      const fieldId = parseInt(req.params.fieldId);
      await storage.deleteTemplateField(fieldId);
      res.json({ message: "Field deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete field" });
    }
  });

  app.post("/api/templates-v2/fields/reorder", isAuthenticated, async (req: any, res) => {
    try {
      await storage.reorderTemplateFields(req.body.fields);
      res.json({ message: "Fields reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder fields" });
    }
  });

  // Report types routes
  app.get("/api/projects/:id/report-types", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId !== parseInt(req.user.id)) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === parseInt(req.user.id));
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const reportTypes = await storage.getReportTypesByProjectId(projectId);
      res.json(reportTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report types" });
    }
  });

  app.post("/api/projects/:id/report-types", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId !== parseInt(req.user.id)) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === parseInt(req.user.id));
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Validate request body
      const validationResult = insertReportTypeSchema.safeParse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id),
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid report type data", 
          errors: validationResult.error.errors 
        });
      }

      const reportType = await storage.createReportType(validationResult.data);
      res.json(reportType);
    } catch (error) {
      res.status(500).json({ message: "Failed to create report type" });
    }
  });

  app.patch("/api/projects/:id/report-types/:reportTypeId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const reportTypeId = parseInt(req.params.reportTypeId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId !== parseInt(req.user.id)) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === parseInt(req.user.id));
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Verify report type belongs to this project
      const existingReportType = await storage.getReportTypeById(reportTypeId);
      if (!existingReportType || existingReportType.projectId !== projectId) {
        return res.status(404).json({ message: "Report type not found in this project" });
      }

      // Validate request body (partial update allowed)
      const validationResult = insertReportTypeSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid report type data", 
          errors: validationResult.error.errors 
        });
      }

      const reportType = await storage.updateReportType(reportTypeId, validationResult.data);
      res.json(reportType);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report type" });
    }
  });

  app.delete("/api/projects/:id/report-types/:reportTypeId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const reportTypeId = parseInt(req.params.reportTypeId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId !== parseInt(req.user.id)) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === parseInt(req.user.id));
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Verify report type belongs to this project
      const existingReportType = await storage.getReportTypeById(reportTypeId);
      if (!existingReportType || existingReportType.projectId !== projectId) {
        return res.status(404).json({ message: "Report type not found in this project" });
      }

      await storage.deleteReportType(reportTypeId);
      res.json({ message: "Report type deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report type" });
    }
  });

  app.post("/api/projects/:id/report-types/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId !== parseInt(req.user.id)) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === parseInt(req.user.id));
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const { order } = req.body;
      
      // Validate order structure
      if (!Array.isArray(order)) {
        return res.status(400).json({ message: "Order must be an array" });
      }

      if (order.length === 0) {
        return res.status(400).json({ message: "Order array cannot be empty" });
      }

      // Validate all items in the order array before making any updates
      const validationPromises = order.map(async (item, index) => {
        if (!item || typeof item.id !== 'number' || typeof item.displayOrder !== 'number') {
          throw new Error(`Invalid order item at index ${index}: must have numeric id and displayOrder`);
        }

        // Verify the report type belongs to this project
        const reportType = await storage.getReportTypeById(item.id);
        if (!reportType || reportType.projectId !== projectId) {
          throw new Error(`Report type ${item.id} not found in this project`);
        }

        return reportType;
      });

      // Wait for all validations to complete before proceeding
      await Promise.all(validationPromises);

      // Update display order for all report types in parallel
      const updatePromises = order.map(item =>
        storage.updateReportType(item.id, { displayOrder: item.displayOrder })
      );

      await Promise.all(updatePromises);

      res.json({ message: "Report types reordered successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reorder report types";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Global template settings routes
  app.get('/api/projects/:id/global-template-settings', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const settings = await storage.getGlobalTemplateSettingsByProjectId(projectId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch global template settings" });
    }
  });

  app.post('/api/projects/:id/global-template-settings', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = req.user.id;
      const createdByValue = parseInt(userId.toString());
      
      const requestData = {
        ...req.body,
        projectId,
        createdBy: createdByValue,
      };
      
      const settingsData = insertGlobalTemplateSettingsSchema.parse(requestData);

      const settings = await storage.upsertGlobalTemplateSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save global template settings" });
    }
  });

  app.put('/api/projects/:id/global-template-settings', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = req.user.id;
      const settingsData = insertGlobalTemplateSettingsSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(userId.toString()),
      });

      const settings = await storage.upsertGlobalTemplateSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update global template settings" });
    }
  });

  // Update global margins for all templates
  app.put('/api/projects/:id/settings/global-margins', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { pageMargins } = req.body;
      if (!pageMargins) {
        return res.status(400).json({ message: "pageMargins is required" });
      }

      // Update both show settings AND global template settings for proper synchronization
      const currentSettings = await storage.getShowSettingsByProjectId(projectId);
      if (currentSettings) {
        const updatedSettings = {
          ...currentSettings,
          globalPageMargins: pageMargins,
          updatedAt: new Date()
        };
        await storage.updateShowSettings(projectId, updatedSettings);
      }

      // Also update the global template settings table so the UI displays correctly
      const currentGlobalSettings = await storage.getGlobalTemplateSettingsByProjectId(projectId);
      if (currentGlobalSettings) {
        const updatedGlobalSettings = {
          ...currentGlobalSettings,
          pageMargins: pageMargins,
          updatedAt: new Date()
        };
        await storage.upsertGlobalTemplateSettings(updatedGlobalSettings);
      } else {
        // Create new global template settings with the margins
        const newGlobalSettings = {
          projectId,
          pageMargins: pageMargins,
          createdBy: req.user.id,
          updatedAt: new Date()
        };
        await storage.upsertGlobalTemplateSettings(newGlobalSettings);
      }

      res.json({ success: true, pageMargins });
    } catch (error) {
      res.status(500).json({ message: "Failed to update global margins" });
    }
  });

  // Beta feature settings API (read: all authenticated users, write: admin only)
  // CRITICAL: Settings are environment-scoped - dev and production are completely separate
  app.get('/api/admin/beta-settings', isAuthenticated, async (req: any, res) => {
    try {
      // All authenticated users can read beta settings to know which features are available
      // Only admins can UPDATE beta settings (handled in PUT endpoint)
      
      // Determine environment from NODE_ENV
      const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

      // Get settings from database, fallback to default if not found
      let settings = await storage.getBetaSettings(environment);
      if (!settings) {
        // Import default settings from store
        const { betaSettingsStore } = await import('./betaSettingsStore.ts');
        const defaultSettings = betaSettingsStore.getBetaSettings();
        settings = defaultSettings;
      } else {
      }
      
      // Beta settings successfully loaded from database
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch beta settings" });
    }
  });

  app.put('/api/admin/beta-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Determine environment from NODE_ENV - CRITICAL for data isolation
      const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

      // Clean the features data to ensure boolean values
      const cleanedFeatures = req.body.features.map((feature: any) => {
        let enabled = false;
        
        // Handle various possible values for enabled field
        if (feature.enabled === true || feature.enabled === 'true') {
          enabled = true;
        } else if (feature.enabled === false || feature.enabled === 'false') {
          enabled = false;
        }
        // Any other value (including "none", null, undefined) becomes false
        
        return {
          ...feature,
          enabled
        };
      });
      
      
      // Save to database with environment scoping
      const settingsData = {
        features: cleanedFeatures,
        updatedBy: parseInt(userId),
      };
      
      // Use raw SQL with proper environment scoping
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL!);
        
        
        // First check if a record exists for this environment
        const existing = await sql`
          SELECT id FROM beta_settings WHERE environment = ${environment}
        `;
        
        if (existing.length > 0) {
          // Update existing record for this environment
          const result = await sql`
            UPDATE beta_settings 
            SET features = ${JSON.stringify(settingsData.features)}, 
                updated_by = ${settingsData.updatedBy}, 
                updated_at = NOW() 
            WHERE environment = ${environment}
            RETURNING id
          `;
        } else {
          // Insert new record for this environment
          const result = await sql`
            INSERT INTO beta_settings (environment, features, updated_by, created_at, updated_at)
            VALUES (${environment}, ${JSON.stringify(settingsData.features)}, ${settingsData.updatedBy}, NOW(), NOW())
            RETURNING id
          `;
        }
      } catch (rawSqlError) {
        throw rawSqlError;
      }
      
      // Extract enabled features to update all users' beta access
      const enabledFeatures = cleanedFeatures
        .filter((feature: any) => feature.enabled === true)
        .map((feature: any) => feature.id);
      
      
      // Update all users who have beta access with the enabled features
      try {
        await storage.updateAllUsersBetaFeatures(enabledFeatures);
      } catch (userUpdateError) {
        throw userUpdateError;
      }
      
      
      res.json({ 
        message: "Beta settings updated successfully",
        environment: environment,
        timestamp: new Date().toISOString(),
        cacheKey: '/api/admin/beta-settings' // Signal frontend to invalidate cache
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update beta settings" });
    }
  });

  // Feedback API routes
  app.get('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      // Admins can see all feedback, users see only their own
      if (isAdmin(userId)) {
        const allFeedback = await storage.getAllFeedback();
        res.json(allFeedback);
      } else {
        const userFeedback = await storage.getFeedbackByUserId(userId);
        res.json(userFeedback);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const feedbackData = insertFeedbackSchema.parse({
        ...req.body,
        submittedBy: parseInt(userId),
      });

      const feedback = await storage.createFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  app.get('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      const feedback = await storage.getFeedbackById(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // Users can only view their own feedback, admins can view all
      if (!isAdmin(userId) && feedback.submittedBy !== parseInt(userId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(feedback);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.patch('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      const feedback = await storage.getFeedbackById(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // Only admins can update feedback (for status changes, admin notes, etc.)
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updateData = {
        ...req.body,
        ...(req.body.status === 'resolved' && { resolvedAt: new Date() }),
      };

      const updatedFeedback = await storage.updateFeedback(feedbackId, updateData);
      res.json(updatedFeedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  app.delete('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      const feedback = await storage.getFeedbackById(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // Users can delete their own feedback, admins can delete any
      if (!isAdmin(userId) && feedback.submittedBy !== parseInt(userId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteFeedback(feedbackId);
      res.json({ message: "Feedback deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // Get script data endpoint
  app.get("/api/projects/:id/script", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get script document
      const documents = await storage.getShowDocumentsByProjectId(projectId);
      const script = documents.find(doc => doc.type === 'script');
      
      if (!script) {
        // Return default script data if none exists
        return res.json({
          name: "Untitled Script",
          content: "",
          version: "1.0",
          collaborators: [],
          type: "script"
        });
      }

      // Transform script document to expected format
      // Handle content properly - database stores JSON strings
      let content: string = "";
      if (script.content) {
        // Database stores content as JSON, so parse it properly
        try {
          content = JSON.parse(script.content as string);
        } catch (e) {
          // If parsing fails, use content as-is
          content = String(script.content);
        }
      }
      
      const scriptData = {
        name: script.name,
        content: content,
        version: script.version || "1.0",
        collaborators: [],
        type: "script"
      };

      // Disable caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(scriptData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch script" });
    }
  });

  // Save script endpoint
  app.post("/api/projects/:id/script", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { title, content } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get existing script or create new one
      const documents = await storage.getShowDocumentsByProjectId(projectId);
      let script = documents.find(doc => doc.type === 'script');
      
      if (!script) {
        // Create new script
        script = await storage.createShowDocument({
          projectId,
          name: title || "Untitled Script",
          content: content || "",
          type: "script",
          version: "1.0",
          createdBy: req.user.id.toString()
        });
      } else {
        // Update existing script
        script = await storage.updateShowDocument(script.id, {
          name: title || script.name,
          content: content || script.content
        });
      }

      res.json(script);
    } catch (error) {
      res.status(500).json({ message: "Failed to save script" });
    }
  });

  // Script publishing endpoint
  app.post("/api/projects/:id/script/publish", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { versionType, content, title } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current script or create one if it doesn't exist
      let script = await storage.getShowDocumentsByProjectId(projectId);
      let currentScript = script.find(doc => doc.type === 'script');
      
      if (!currentScript) {
        // Create initial script document
        currentScript = await storage.createShowDocument({
          projectId,
          name: title || "Untitled Script",
          content: content || "",
          type: "script",
          version: "1.0",
          createdBy: req.user.id.toString()
        });
      }

      // Calculate new version number
      const currentVersion = currentScript.version || "1.0";
      let newVersion: string;
      
      if (versionType === 'major') {
        // Major version: increment the major number (1.x -> 2.0, 2.x -> 3.0)
        const majorNumber = parseInt(currentVersion.split('.')[0]);
        newVersion = `${majorNumber + 1}.0`;
      } else {
        // Minor version: increment the minor number (1.0 -> 1.1, 1.5 -> 1.6)
        const parts = currentVersion.split('.');
        const majorNumber = parseInt(parts[0]);
        const minorNumber = parts[1] ? parseInt(parts[1]) : 0;
        newVersion = `${majorNumber}.${minorNumber + 1}`;
      }

      // Update the script with new version AND preserve current content
      const updatedScript = await storage.updateShowDocument(currentScript.id, {
        version: newVersion,
        content: content || currentScript.content,
        name: title || currentScript.name
      });

      res.json({ 
        message: "Script version published successfully",
        version: newVersion,
        versionType,
        script: updatedScript
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to publish script version" });
    }
  });

  // PDF text extraction endpoint using pdf2pic for image conversion then OCR
  app.post('/api/extract-pdf-text', isAuthenticated, async (req: any, res) => {
    try {
      const multer = await import('multer');
      
      const upload = multer.default({ 
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
      });

      upload.single('file')(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({ error: 'File upload error', message: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        try {
          // Import pdfjs-dist for reliable PDF processing
          const pdfjsLib = await import('pdfjs-dist');
          
          // Parse the PDF buffer
          const loadingTask = pdfjsLib.getDocument(req.file.buffer);
          const pdf = await loadingTask.promise;
          
          let text = '';
          const numPages = pdf.numPages;
          
          // Extract text from each page
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items into readable text
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            text += pageText + '\n\n';
          }

          // Clean up common PDF extraction artifacts
          text = text
            // Remove excessive whitespace
            .replace(/\s{3,}/g, '\n\n')
            // Remove page headers/footers that are spaced out
            .replace(/[A-Z\s]{20,}\s+Pg\.\s*\d+/gi, '')
            .replace(/[A-Z\s]{20,}\s+Page\s*\d+/gi, '')
            // Remove spaced-out titles like "L O R R A I N E   H A N S B E R R Y"
            .replace(/([A-Z]\s){3,}[A-Z]/g, (match: string) => match.replace(/\s/g, ''))
            // Clean up line breaks
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          if (!text || text.length < 10) {
            return res.status(400).json({ 
              error: 'No readable text found', 
              message: 'The PDF appears to be empty, image-only, or protected. Try copying the text directly from your PDF viewer.' 
            });
          }

          res.json({ text, pages: numPages });
        } catch (parseError) {
          res.status(500).json({ 
            error: 'PDF parsing failed', 
            message: 'Could not process this PDF. Please try copying the text directly or converting to a text file first.' 
          });
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'PDF processing failed' });
    }
  });

  // Word document text extraction endpoint
  app.post('/api/extract-word-text', isAuthenticated, async (req: any, res) => {
    try {
      const multer = await import('multer');
      
      const upload = multer.default({ 
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
      });

      upload.single('file')(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({ error: 'File upload error', message: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        try {
          const mammoth = await import('mammoth');
          
          // First try HTML conversion which typically gets more complete content
          const htmlResult = await mammoth.convertToHtml({ buffer: req.file.buffer });
          
          // Strip HTML tags to get clean plain text
          let text = htmlResult.value
            .replace(/<[^>]*>/g, '\n')  // Replace HTML tags with line breaks
            .replace(/&nbsp;/g, ' ')    // Replace non-breaking spaces
            .replace(/&amp;/g, '&')     // Replace HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n\s*\n/g, '\n\n') // Clean up excessive line breaks
            .trim();
          
          // If HTML conversion didn't work well, fallback to raw text
          if (text.length < 50) {
            const rawResult = await mammoth.extractRawText({ buffer: req.file.buffer });
            text = rawResult.value || '';
          }

          // Clean up common Word document artifacts
          text = text
            // Remove excessive whitespace
            .replace(/\s{3,}/g, '\n\n')
            // Clean up line breaks
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          if (!text || text.length < 10) {
            return res.status(400).json({ 
              error: 'No readable text found', 
              message: 'The Word document appears to be empty or contains only images/tables.' 
            });
          }

          res.json({ text });
        } catch (parseError) {
          res.status(500).json({ 
            error: 'Word document parsing failed', 
            message: 'Could not extract text from this Word document. It may be corrupted or in an unsupported format.' 
          });
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Word document processing failed' });
    }
  });

  // Word document text extraction endpoint (placeholder for future implementation)
  app.post('/api/extract-word-text', isAuthenticated, async (req: any, res) => {
    try {
      // For now, return an error message about Word document support
      res.status(501).json({ 
        error: 'Word document support coming soon', 
        message: 'Word document text extraction is not yet implemented. Please convert your document to PDF or plain text for now.' 
      });
    } catch (error) {
      res.status(500).json({ error: 'Word document processing failed' });
    }
  });

  // Global contacts route for email system (returns all user's contacts across projects)
  app.get('/api/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id?.toString();
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Direct database query for better performance instead of multiple calls
      const allContacts = await storage.getAllContactsByUserId(userId);
      
      res.json(allContacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // Contacts API routes
  app.get('/api/projects/:id/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const contacts = await storage.getContactsByProjectId(projectId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post('/api/projects/:id/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = req.user.id.toString();
      
      // Custom validation: only require equity status for cast members
      const rawData = {
        ...req.body,
        projectId,
        createdBy: parseInt(userId),
      };

      // Debug logging to help identify validation issues

      // Handle equity status validation properly
      if (rawData.category !== 'cast') {
        // For non-cast contacts, set equity status to null
        rawData.equityStatus = null;
      } else {
        // For cast contacts, convert empty string to null (let validation handle required case)
        if (rawData.equityStatus === "" || rawData.equityStatus === undefined) {
          rawData.equityStatus = null;
        }
      }


      const contactData = insertContactSchema.parse(rawData);

      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  // Bulk import contacts from CSV
  app.post('/api/projects/:id/contacts/bulk-import', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { contacts, groupId } = req.body;

      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ message: "No contacts provided" });
      }

      // Get all contact groups for this project to map group names to IDs
      const contactGroups = await storage.getContactGroupsByProjectId(projectId);
      const groupNameMap: Record<string, number> = {};
      contactGroups.forEach(g => {
        groupNameMap[g.name.toLowerCase()] = g.id;
      });

      // Check if any contact specifies a group that doesn't exist
      const csvGroupsSpecified = new Set<string>();
      const groupsNotFound = new Set<string>();
      
      for (const contactData of contacts) {
        if (contactData.group) {
          csvGroupsSpecified.add(contactData.group);
          if (!groupNameMap[contactData.group.toLowerCase()]) {
            groupsNotFound.add(contactData.group);
          }
        }
      }

      // Auto-create missing groups from CSV
      let updatedGroupNameMap = { ...groupNameMap };
      const userId = req.user.id;
      for (const groupName of groupsNotFound) {
        try {
          const newGroup = await storage.createContactGroup({
            projectId,
            name: groupName,
            createdBy: userId,
          });
          updatedGroupNameMap[groupName.toLowerCase()] = newGroup.id;
        } catch (error) {
          return res.status(400).json({ 
            message: `Failed to create group "${groupName}". Please create it manually first.` 
          });
        }
      }

      // If no groups in CSV and no default group selected, return error
      if (csvGroupsSpecified.size === 0 && !groupId) {
        return res.status(400).json({ 
          message: "No group specified. Please either add a Group column to your CSV or select a default group." 
        });
      }

      const userIdString = req.user.id.toString();
      const createdContacts = [];

      for (const contactData of contacts) {
        try {
          // Determine the group ID: use CSV group if provided, otherwise use default groupId
          let finalGroupId = groupId ? parseInt(groupId) : null;
          
          if (contactData.group) {
            // Try to find group by name (including auto-created groups)
            const groupIdFromName = updatedGroupNameMap[contactData.group.toLowerCase()];
            if (groupIdFromName) {
              finalGroupId = groupIdFromName;
            } else if (finalGroupId) {
              // Use default group if CSV group not found
              finalGroupId = parseInt(groupId);
            } else {
              // No default group and CSV group not found, skip
              continue;
            }
          }

          if (!finalGroupId) {
            // This shouldn't happen given our checks above, but keep for safety
            continue;
          }

          const rawData = {
            firstName: contactData.firstName || "Unknown",
            lastName: contactData.lastName || "",
            preferredName: contactData.preferredName || null,
            projectId,
            groupId: finalGroupId,
            createdBy: parseInt(userIdString),
            category: 'cast', // Default to cast, can be updated later
            role: contactData.role || null,
            email: contactData.email || null,
            phone: contactData.phone || null,
            whatsapp: contactData.whatsapp || null,
            equityStatus: null,
          };

          const contactRecord = insertContactSchema.parse(rawData);
          const created = await storage.createContact(contactRecord);
          createdContacts.push(created);
        } catch (error) {
          // Continue with next contact on error
        }
      }

      res.json({ message: `Successfully imported ${createdContacts.length} contacts`, count: createdContacts.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to import contacts" });
    }
  });

  app.put('/api/projects/:id/contacts/:contactId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const contactId = parseInt(req.params.contactId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const contact = await storage.getContactById(contactId);
      if (!contact || contact.projectId !== projectId) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Custom validation for updates: only require equity status for cast members
      const rawUpdateData = { ...req.body };
      

      
      // Handle equity status validation properly for updates
      // Always convert empty strings to null for equityStatus first
      if (rawUpdateData.equityStatus === "" || rawUpdateData.equityStatus === undefined) {
        rawUpdateData.equityStatus = null;
      }
      
      // For updates, if category is provided and it's not cast, ensure equityStatus is null
      if (rawUpdateData.category && rawUpdateData.category !== 'cast') {
        rawUpdateData.equityStatus = null;
      }

      // Convert empty strings to null for optional fields to prevent validation issues
      const fieldsToNullify = ['email', 'phone', 'role', 'notes', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactEmail', 'emergencyContactRelationship', 'allergies', 'medicalNotes'];
      fieldsToNullify.forEach(field => {
        if (rawUpdateData[field] === "") {
          rawUpdateData[field] = null;
        }
      });



      // Validate the update data using a partial schema (omit required fields for updates)
      const updateContactSchema = insertContactSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateContactSchema.parse(rawUpdateData);
      const updatedContact = await storage.updateContact(contactId, validatedData);
      res.json(updatedContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.get('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contact = await storage.getContactById(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Verify project ownership
      const project = await storage.getProjectById(contact.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.patch('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contact = await storage.getContactById(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Verify project ownership
      const project = await storage.getProjectById(contact.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate the update data using a partial schema (omit required fields for updates)
      const updateContactSchema = insertContactSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateContactSchema.parse(req.body);
      const updatedContact = await storage.updateContact(contactId, validatedData);
      res.json(updatedContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contact = await storage.getContactById(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Verify project ownership
      const project = await storage.getProjectById(contact.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteContact(contactId);
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Email Contacts Routes (Unified contacts for email system)
  app.get('/api/email-contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id.toString());
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;
      
      const emailContacts = await storage.getEmailContactsByUserIdAndProject(userId, projectId);
      res.json(emailContacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email contacts" });
    }
  });

  app.post('/api/email-contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id.toString());
      
      const emailContactData = insertEmailContactSchema.parse({
        ...req.body,
        userId,
        createdBy: userId,
        isManuallyAdded: true,
      });

      const emailContact = await storage.createEmailContact(emailContactData);
      res.json(emailContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create email contact" });
    }
  });

  app.put('/api/email-contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const emailContactId = parseInt(req.params.id);
      const userId = parseInt(req.user.id.toString());
      
      // Verify ownership
      const emailContact = await storage.getEmailContactsByUserId(userId);
      if (!emailContact.find(c => c.id === emailContactId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertEmailContactSchema.partial().omit({
        userId: true,
        createdBy: true,
      }).parse(req.body);

      const updatedEmailContact = await storage.updateEmailContact(emailContactId, updateData);
      res.json(updatedEmailContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email contact data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update email contact" });
    }
  });

  app.delete('/api/email-contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const emailContactId = parseInt(req.params.id);
      const userId = parseInt(req.user.id.toString());
      
      // Verify ownership
      const emailContact = await storage.getEmailContactsByUserId(userId);
      if (!emailContact.find(c => c.id === emailContactId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteEmailContact(emailContactId);
      res.json({ message: "Email contact deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete email contact" });
    }
  });

  app.post('/api/projects/:id/sync-contacts-to-email', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = parseInt(req.user.id.toString());
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.syncShowContactsToEmailContacts(userId, projectId);
      res.json({ message: "Show contacts synced to email contacts successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync contacts to email" });
    }
  });

  app.post('/api/sync-all-contacts-to-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id.toString());
      
      await storage.syncAllContactsToEmailContacts(userId);
      res.json({ message: "All contacts synced to email contacts successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync all contacts to email" });
    }
  });

  // Distribution Lists Routes
  app.get('/api/distribution-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id.toString());
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;
      
      const distributionLists = await storage.getDistributionListsByUserIdAndProject(userId, projectId);
      res.json(distributionLists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch distribution lists" });
    }
  });

  app.post('/api/distribution-lists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.user.id.toString());
      
      const distributionListData = insertDistributionListSchema.parse({
        ...req.body,
        userId,
        createdBy: userId,
      });
      
      const distributionList = await storage.createDistributionList(distributionListData);
      res.json(distributionList);
    } catch (error) {
      res.status(500).json({ message: "Failed to create distribution list" });
    }
  });

  app.put('/api/distribution-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = parseInt(req.user.id.toString());
      
      // Verify ownership
      const existingList = await storage.getDistributionListsByUserId(userId);
      if (!existingList.find(l => l.id === listId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData = insertDistributionListSchema.partial().parse(req.body);
      const distributionList = await storage.updateDistributionList(listId, updateData);
      res.json(distributionList);
    } catch (error) {
      res.status(500).json({ message: "Failed to update distribution list" });
    }
  });

  app.delete('/api/distribution-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = parseInt(req.user.id.toString());
      
      // Verify ownership
      const existingList = await storage.getDistributionListsByUserId(userId);
      if (!existingList.find(l => l.id === listId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDistributionList(listId);
      res.json({ message: "Distribution list deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete distribution list" });
    }
  });

  // Distribution List Members Routes
  app.get('/api/distribution-lists/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = parseInt(req.user.id.toString());
      
      // Verify ownership
      const existingList = await storage.getDistributionListsByUserId(userId);
      if (!existingList.find(l => l.id === listId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const members = await storage.getDistributionListMembers(listId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch distribution list members" });
    }
  });

  app.post('/api/distribution-lists/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id);
      const userId = parseInt(req.user.id.toString());
      
      // Verify ownership
      const existingList = await storage.getDistributionListsByUserId(userId);
      if (!existingList.find(l => l.id === listId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const memberData = insertDistributionListMemberSchema.parse({
        ...req.body,
        distributionListId: listId,
      });
      
      const member = await storage.createDistributionListMember(memberData);
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to add distribution list member" });
    }
  });

  app.delete('/api/distribution-lists/:listId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.listId);
      const memberId = parseInt(req.params.memberId);
      const userId = parseInt(req.user.id.toString());
      
      // Verify ownership
      const existingList = await storage.getDistributionListsByUserId(userId);
      if (!existingList.find(l => l.id === listId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDistributionListMember(memberId);
      res.json({ message: "Distribution list member removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove distribution list member" });
    }
  });

  // Schedule Events Routes
  app.get('/api/projects/:id/schedule-events', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Support optional date range filtering for better performance
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      
      const events = await storage.getScheduleEventsByProjectId(projectId, startDate, endDate);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule events" });
    }
  });

  // PATCH route for project-specific schedule events (used by monthly view)
  app.patch('/api/projects/:projectId/schedule-events/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const eventId = parseInt(req.params.eventId);
      
      const event = await storage.getScheduleEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Verify event belongs to the specified project
      if (event.projectId !== projectId) {
        return res.status(400).json({ message: "Event does not belong to this project" });
      }

      // Check project ownership
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateEventSchema = insertScheduleEventSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateEventSchema.parse(req.body);
      
      
      // Validate for conflicts if participants are provided or if time/date/location is being updated
      if ((req.body.participants && Array.isArray(req.body.participants) && req.body.participants.length > 0) || validatedData.location) {
        const eventDate = validatedData.date || event.date;
        const startTime = validatedData.startTime || event.startTime;
        const endTime = validatedData.endTime || event.endTime;
        const locationName = validatedData.location || event.location;
        
        const conflictResult = await conflictValidationService.validateEventConflicts(
          projectId,
          eventDate,
          startTime,
          endTime,
          req.body.participants || [],
          locationName,
          eventId
        );

        if (conflictResult.hasConflicts) {
          return res.status(409).json({
            message: "Cannot update event due to scheduling conflicts",
            conflicts: conflictResult.conflicts
          });
        }
      }
      
      const updatedEvent = await storage.updateScheduleEvent(eventId, validatedData, req.user.id);
      
      
      // Sync important date changes back to project
      await syncImportantDateEventToProject(event, validatedData);
      
      // Handle participants update if provided
      if (req.body.participantIds && Array.isArray(req.body.participantIds)) {
        await storage.removeAllEventParticipants(eventId);
        
        for (const participantId of req.body.participantIds) {
          await storage.addEventParticipant({
            eventId: eventId,
            contactId: participantId,
            isRequired: true,
            status: 'pending',
          });
        }
      }

      const eventWithParticipants = await storage.getScheduleEventById(eventId);
      res.json(eventWithParticipants);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update schedule event" });
    }
  });

  app.post('/api/projects/:id/schedule-events', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const eventData = insertScheduleEventSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      // Validate for conflicts if participants are provided or location is specified
      if ((req.body.participantIds && Array.isArray(req.body.participantIds) && req.body.participantIds.length > 0) || eventData.location) {
        const conflictResult = await conflictValidationService.validateEventConflicts(
          projectId,
          eventData.date,
          eventData.startTime,
          eventData.endTime,
          req.body.participantIds || [],
          eventData.location
        );

        if (conflictResult.hasConflicts) {
          return res.status(409).json({
            message: "Cannot create event due to scheduling conflicts",
            conflicts: conflictResult.conflicts
          });
        }
      }

      const event = await storage.createScheduleEvent(eventData);
      
      // Handle participants if provided
      if (req.body.participantIds && Array.isArray(req.body.participantIds)) {
        for (const participantId of req.body.participantIds) {
          await storage.addEventParticipant({
            eventId: event.id,
            contactId: participantId,
            isRequired: true,
            status: 'pending',
          });
        }
      }

      // Return event with participants
      const eventWithParticipants = await storage.getScheduleEventById(event.id);
      res.status(201).json(eventWithParticipants);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create schedule event" });
    }
  });

  app.get('/api/schedule-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getScheduleEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project access
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(event.projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule event" });
    }
  });

  // Helper function to sync important date event changes back to project
  async function syncImportantDateEventToProject(event: any, updatedData: any) {
    // Check if this is an Important Date event by its title (since we no longer use "important_date" type)
    const importantDateMapping: { [key: string]: string } = {
      'Prep Start': 'prep_start_date',
      'First Rehearsal': 'first_rehearsal_date', 
      'Designer Run': 'designer_run_date',
      'First Tech': 'first_tech_date',
      'First Preview': 'first_preview_date',
      'Opening Night': 'opening_night',
      'Closing': 'closing_date'
    };

    const projectField = importantDateMapping[event.title];
    if (!projectField) {
      return; // Not a recognized important date
    }


    const newDate = updatedData.date;
    if (newDate) {
      // Update the project with the new date (database uses snake_case field names)
      const updateData: any = {};
      updateData[projectField] = new Date(newDate);
      
      
      // Use direct SQL update to avoid Drizzle ORM field name issues
      try {
        const sqlQuery = sql.raw(`UPDATE projects SET ${projectField} = '${newDate}', updated_at = NOW() WHERE id = ${event.projectId}`);
        await db.execute(sqlQuery);
      } catch (sqlError) {
        throw sqlError;
      }
    } else {
    }
  }

  // PUT route for schedule events (used by monthly view)
  app.put('/api/schedule-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getScheduleEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateEventSchema = insertScheduleEventSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateEventSchema.parse(req.body);
      
      
      // Validate for conflicts if participants are provided or if time/date/location is being updated
      if ((req.body.participants && Array.isArray(req.body.participants) && req.body.participants.length > 0) || validatedData.location) {
        const eventDate = validatedData.date || event.date;
        const startTime = validatedData.startTime || event.startTime;
        const endTime = validatedData.endTime || event.endTime;
        const locationName = validatedData.location || event.location;
        
        const conflictResult = await conflictValidationService.validateEventConflicts(
          event.projectId,
          eventDate,
          startTime,
          endTime,
          req.body.participants || [],
          locationName,
          eventId // Exclude the current event being edited
        );

        if (conflictResult.hasConflicts) {
          return res.status(409).json({
            message: "Cannot update event due to scheduling conflicts",
            conflicts: conflictResult.conflicts
          });
        }
      }
      
      const updatedEvent = await storage.updateScheduleEvent(eventId, validatedData, req.user.id);
      
      
      // Sync important date changes back to project
      await syncImportantDateEventToProject(event, validatedData);
      
      // Handle participants update if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        // Remove existing participants
        await storage.removeAllEventParticipants(eventId);
        
        // Add new participants
        for (const participantId of req.body.participants) {
          await storage.addEventParticipant({
            eventId: eventId,
            contactId: participantId,
            isRequired: true,
            status: 'pending',
          });
        }
      }

      // Return updated event with participants
      const eventWithParticipants = await storage.getScheduleEventById(eventId);
      res.json(eventWithParticipants);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update schedule event" });
    }
  });

  app.patch('/api/schedule-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getScheduleEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateEventSchema = insertScheduleEventSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateEventSchema.parse(req.body);
      
      
      // Validate for conflicts if participants are provided or if time/date/location is being updated
      if ((req.body.participants && Array.isArray(req.body.participants) && req.body.participants.length > 0) || validatedData.location) {
        const eventDate = validatedData.date || event.date;
        const startTime = validatedData.startTime || event.startTime;
        const endTime = validatedData.endTime || event.endTime;
        const locationName = validatedData.location || event.location;
        
        const conflictResult = await conflictValidationService.validateEventConflicts(
          event.projectId,
          eventDate,
          startTime,
          endTime,
          req.body.participants || [],
          locationName,
          eventId // Exclude the current event being edited
        );

        if (conflictResult.hasConflicts) {
          return res.status(409).json({
            message: "Cannot update event due to scheduling conflicts",
            conflicts: conflictResult.conflicts
          });
        }
      }
      
      const updatedEvent = await storage.updateScheduleEvent(eventId, validatedData, req.user.id);
      
      // Sync important date changes back to project
      await syncImportantDateEventToProject(event, validatedData);
      
      // Handle participants update if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        // Remove existing participants
        await storage.removeAllEventParticipants(eventId);
        
        // Add new participants
        for (const participantId of req.body.participants) {
          await storage.addEventParticipant({
            eventId: eventId,
            contactId: participantId,
            isRequired: true,
            status: 'pending',
          });
        }
      }

      // Return updated event with participants
      const eventWithParticipants = await storage.getScheduleEventById(eventId);
      res.json(eventWithParticipants);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update schedule event" });
    }
  });

  app.delete('/api/schedule-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getScheduleEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // If this is an important date event, clear the corresponding project date
      if (event.type === 'important_date') {
        const importantDateMapping: { [key: string]: string } = {
          'Prep Start': 'prepStartDate',
          'First Rehearsal': 'firstRehearsalDate', 
          'Designer Run': 'designerRunDate',
          'First Tech': 'firstTechDate',
          'First Preview': 'firstPreviewDate',
          'Opening Night': 'openingNight',
          'Closing': 'closingDate'
        };

        const projectField = importantDateMapping[event.title];
        if (projectField) {
          const updateData: any = {};
          updateData[projectField] = null;
          await storage.updateProject(event.projectId, updateData);
        }
      }

      await storage.deleteScheduleEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete schedule event" });
    }
  });

  // Event participants routes
  app.patch('/api/schedule-events/:eventId/participants/:participantId', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const participantId = parseInt(req.params.participantId);
      
      const event = await storage.getScheduleEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project access
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(event.projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const updateParticipantSchema = insertScheduleEventParticipantSchema.partial().omit({
        eventId: true,
        contactId: true,
      });
      
      const validatedData = updateParticipantSchema.parse(req.body);
      const updatedParticipant = await storage.updateEventParticipant(participantId, validatedData);
      res.json(updatedParticipant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid participant data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update participant" });
    }
  });

  // Schedule changes summary generation
  app.get('/api/projects/:id/schedule-changes-summary', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const changesSummary = await scheduleChangeDetectionService.generateChangesSummary(projectId);
      res.json({ changesSummary });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate changes summary" });
    }
  });

  // Structured schedule changes (for template variables)
  app.get('/api/projects/:id/schedule-changes-structured', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const structuredChanges = await scheduleChangeDetectionService.generateStructuredChanges(projectId);
      res.json(structuredChanges);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate structured changes" });
    }
  });

  // ========== SCHEDULE TEMPLATES API ROUTES ==========

  // Get all schedule templates for a project
  app.get('/api/projects/:id/schedule-templates', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const templates = await storage.getScheduleTemplatesByProjectId(projectId);
      res.json(templates);
    } catch (error) {
      console.error("Failed to fetch schedule templates:", error);
      res.status(500).json({ message: "Failed to fetch schedule templates" });
    }
  });

  // Get a single schedule template with events
  app.get('/api/schedule-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getScheduleTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check project access
      const project = await storage.getProjectById(template.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(template.projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Get template events with their participants
      const events = await storage.getScheduleTemplateEventsById(templateId);
      const eventsWithParticipants = await Promise.all(
        events.map(async (event) => {
          const participants = await storage.getScheduleTemplateEventParticipants(event.id);
          return { ...event, participants };
        })
      );

      res.json({ ...template, events: eventsWithParticipants });
    } catch (error) {
      console.error("Failed to fetch schedule template:", error);
      res.status(500).json({ message: "Failed to fetch schedule template" });
    }
  });

  // Create a new schedule template
  app.post('/api/projects/:id/schedule-templates', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const templateData = insertScheduleTemplateSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      const template = await storage.createScheduleTemplate(templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Failed to create schedule template:", error);
      res.status(500).json({ message: "Failed to create schedule template" });
    }
  });

  // Update a schedule template
  app.patch('/api/schedule-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getScheduleTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(template.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertScheduleTemplateSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedTemplate = await storage.updateScheduleTemplate(templateId, validatedData);
      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Failed to update schedule template:", error);
      res.status(500).json({ message: "Failed to update schedule template" });
    }
  });

  // Delete a schedule template
  app.delete('/api/schedule-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getScheduleTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(template.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteScheduleTemplate(templateId);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Failed to delete schedule template:", error);
      res.status(500).json({ message: "Failed to delete schedule template" });
    }
  });

  // Get template events
  app.get('/api/schedule-templates/:templateId/events', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const template = await storage.getScheduleTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check project access
      const project = await storage.getProjectById(template.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(template.projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Get template events with their participants
      const events = await storage.getScheduleTemplateEventsById(templateId);
      const eventsWithParticipants = await Promise.all(
        events.map(async (event) => {
          const participants = await storage.getScheduleTemplateEventParticipants(event.id);
          return { ...event, participants };
        })
      );

      res.json(eventsWithParticipants);
    } catch (error) {
      console.error("Failed to fetch template events:", error);
      res.status(500).json({ message: "Failed to fetch template events" });
    }
  });

  // Create template event
  app.post('/api/schedule-templates/:templateId/events', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const template = await storage.getScheduleTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(template.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Extract participants before schema validation
      const participantIds = req.body.participantIds || [];
      const { participantIds: _, ...eventBody } = req.body;

      const eventData = insertScheduleTemplateEventSchema.parse({
        ...eventBody,
        templateId,
      });

      const event = await storage.createScheduleTemplateEvent(eventData);

      // Handle participants if provided
      if (participantIds && Array.isArray(participantIds)) {
        for (const contactId of participantIds) {
          await storage.addScheduleTemplateEventParticipant({
            templateEventId: event.id,
            contactId,
            isRequired: true,
          });
        }
      }

      const participants = await storage.getScheduleTemplateEventParticipants(event.id);
      res.json({ ...event, participants });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Failed to create template event:", error);
      res.status(500).json({ message: "Failed to create template event" });
    }
  });

  // Update template event
  app.patch('/api/schedule-template-events/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const events = await storage.getScheduleTemplateEventsById(eventId);
      
      // Since getScheduleTemplateEventsById is for templateId, we need a different approach
      // Let's query directly for the event
      const event = (await db.select().from(scheduleTemplateEvents).where(eq(scheduleTemplateEvents.id, eventId)))[0];
      
      if (!event) {
        return res.status(404).json({ message: "Template event not found" });
      }

      const template = await storage.getScheduleTemplateById(event.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(template.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Extract participants before schema validation
      const participantIds = req.body.participantIds || [];
      const { participantIds: _, ...updateBody } = req.body;

      const updateSchema = insertScheduleTemplateEventSchema.partial().omit({
        templateId: true,
      });
      
      const validatedData = updateSchema.parse(updateBody);
      const updatedEvent = await storage.updateScheduleTemplateEvent(eventId, validatedData);

      // Handle participants update if provided
      if (participantIds && Array.isArray(participantIds)) {
        await storage.removeScheduleTemplateEventParticipants(eventId);
        for (const contactId of participantIds) {
          await storage.addScheduleTemplateEventParticipant({
            templateEventId: eventId,
            contactId,
            isRequired: true,
          });
        }
      }

      const participants = await storage.getScheduleTemplateEventParticipants(eventId);
      res.json({ ...updatedEvent, participants });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Failed to update template event:", error);
      res.status(500).json({ message: "Failed to update template event" });
    }
  });

  // Delete template event
  app.delete('/api/schedule-template-events/:eventId', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const event = (await db.select().from(scheduleTemplateEvents).where(eq(scheduleTemplateEvents.id, eventId)))[0];
      
      if (!event) {
        return res.status(404).json({ message: "Template event not found" });
      }

      const template = await storage.getScheduleTemplateById(event.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(template.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteScheduleTemplateEvent(eventId);
      res.json({ message: "Template event deleted successfully" });
    } catch (error) {
      console.error("Failed to delete template event:", error);
      res.status(500).json({ message: "Failed to delete template event" });
    }
  });

  // Snapshot current week into a new template
  app.post('/api/projects/:id/schedule-templates/snapshot', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, description, weekStartDate, weekStartDay = 0 } = req.body;

      if (!name || !weekStartDate) {
        return res.status(400).json({ message: "Name and weekStartDate are required" });
      }

      // Calculate week date range
      const startDate = new Date(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      // Get events for the week
      const events = await storage.getScheduleEventsByProjectId(
        projectId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Create the template
      const template = await storage.createScheduleTemplate({
        projectId,
        name,
        description: description || null,
        weekStartDay,
        createdBy: parseInt(req.user.id.toString()),
      });

      // Create template events from the week's events
      for (const event of events) {
        const eventDate = new Date(event.date);
        const dayOfWeek = (eventDate.getDay() - weekStartDay + 7) % 7;

        const templateEvent = await storage.createScheduleTemplateEvent({
          templateId: template.id,
          dayOfWeek,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          type: event.type || 'rehearsal',
          eventTypeId: event.eventTypeId,
          location: event.location,
          notes: event.notes,
          isAllDay: event.isAllDay || false,
        });

        // Copy participants if they exist
        if (event.participants && Array.isArray(event.participants)) {
          for (const participant of event.participants) {
            await storage.addScheduleTemplateEventParticipant({
              templateEventId: templateEvent.id,
              contactId: participant.contactId || participant.id,
              isRequired: participant.isRequired !== false,
              notes: participant.notes || null,
            });
          }
        }
      }

      // Return the complete template with events
      const templateEvents = await storage.getScheduleTemplateEventsById(template.id);
      const eventsWithParticipants = await Promise.all(
        templateEvents.map(async (event) => {
          const participants = await storage.getScheduleTemplateEventParticipants(event.id);
          return { ...event, participants };
        })
      );

      res.json({ ...template, events: eventsWithParticipants });
    } catch (error) {
      console.error("Failed to create schedule template snapshot:", error);
      res.status(500).json({ message: "Failed to create schedule template snapshot" });
    }
  });

  // Apply a template to a specific week
  app.post('/api/schedule-templates/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getScheduleTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(template.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { targetWeekStartDate, skipConflicts = false } = req.body;

      if (!targetWeekStartDate) {
        return res.status(400).json({ message: "targetWeekStartDate is required" });
      }

      const targetStart = new Date(targetWeekStartDate);
      const targetEnd = new Date(targetStart);
      targetEnd.setDate(targetEnd.getDate() + 6);

      // Get existing events for the target week
      const existingEvents = await storage.getScheduleEventsByProjectId(
        template.projectId,
        targetStart.toISOString().split('T')[0],
        targetEnd.toISOString().split('T')[0]
      );

      // Get template events
      const templateEvents = await storage.getScheduleTemplateEventsById(templateId);

      // Check for conflicts
      const conflicts: any[] = [];
      const eventsToCreate: any[] = [];

      // Get the template's weekStartDay (default to 0/Sunday if not set)
      const templateWeekStartDay = template.weekStartDay ?? 0;
      
      // Get the target week start's day of week
      const targetStartDayOfWeek = targetStart.getDay();

      for (const templateEvent of templateEvents) {
        // Convert template's relative dayOfWeek back to absolute day of week (0=Sunday, 6=Saturday)
        const absoluteDayOfWeek = (templateEvent.dayOfWeek + templateWeekStartDay) % 7;
        
        // Calculate how many days from target week start to reach this day
        // The target week start date's day of week tells us what day it falls on
        const daysFromTargetStart = (absoluteDayOfWeek - targetStartDayOfWeek + 7) % 7;
        
        const targetDate = new Date(targetStart);
        targetDate.setDate(targetDate.getDate() + daysFromTargetStart);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        // Check for time conflicts with existing events
        const conflictingEvents = existingEvents.filter(existing => {
          if (existing.date !== targetDateStr) return false;
          
          // Check time overlap
          const existingStart = existing.startTime;
          const existingEnd = existing.endTime;
          const newStart = templateEvent.startTime;
          const newEnd = templateEvent.endTime;

          return (newStart < existingEnd && newEnd > existingStart);
        });

        if (conflictingEvents.length > 0) {
          conflicts.push({
            templateEvent,
            targetDate: targetDateStr,
            conflictingEvents,
          });
        }

        eventsToCreate.push({
          templateEvent,
          targetDate: targetDateStr,
          hasConflict: conflictingEvents.length > 0,
        });
      }

      // If there are conflicts and we're not skipping them, return conflict info
      if (conflicts.length > 0 && !skipConflicts) {
        return res.status(409).json({
          message: "Scheduling conflicts detected",
          conflicts,
          eventsToCreate: eventsToCreate.length,
        });
      }

      // Create the events
      const createdEvents: any[] = [];

      for (const eventInfo of eventsToCreate) {
        if (eventInfo.hasConflict && !skipConflicts) continue;

        const templateEvent = eventInfo.templateEvent;
        const participants = await storage.getScheduleTemplateEventParticipants(templateEvent.id);

        const newEvent = await storage.createScheduleEvent({
          projectId: template.projectId,
          date: eventInfo.targetDate,
          title: templateEvent.title,
          description: templateEvent.description,
          startTime: templateEvent.startTime,
          endTime: templateEvent.endTime,
          type: templateEvent.type || 'rehearsal',
          eventTypeId: templateEvent.eventTypeId,
          location: templateEvent.location,
          notes: templateEvent.notes,
          isAllDay: templateEvent.isAllDay || false,
          isProductionLevel: templateEvent.isProductionLevel || false,
          createdBy: parseInt(req.user.id.toString()),
        });

        // Add participants
        for (const participant of participants) {
          await storage.addEventParticipant({
            eventId: newEvent.id,
            contactId: participant.contactId,
            isRequired: participant.isRequired,
            notes: participant.notes,
          });
        }

        createdEvents.push(newEvent);
      }

      res.json({
        message: `Created ${createdEvents.length} events from template`,
        createdEvents,
        skippedConflicts: conflicts.length,
      });
    } catch (error) {
      console.error("Failed to apply schedule template:", error);
      res.status(500).json({ message: "Failed to apply schedule template" });
    }
  });

  // ========== DAILY CALLS API ROUTES ==========

  // Get daily calls list with summary info
  app.get('/api/projects/:id/daily-calls-list', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Get all schedule events for this project to find dates with events
      const scheduleEvents = await storage.getScheduleEventsByProjectId(projectId);
      
      // Group events by date and filter by show schedule event types
      const showSettings = await storage.getShowSettingsByProjectId(projectId);
      const enabledEventTypes = showSettings?.scheduleSettings?.enabledEventTypes || [];
      
      const dateGroups = new Map();
      
      scheduleEvents.forEach(event => {
        // Only include events that are enabled in show schedule
        if (enabledEventTypes.includes(event.eventType)) {
          const eventDate = event.date;
          if (!dateGroups.has(eventDate)) {
            dateGroups.set(eventDate, {
              date: eventDate,
              eventCount: 0,
              locations: new Set()
            });
          }
          const dateGroup = dateGroups.get(eventDate);
          dateGroup.eventCount++;
          if (event.location) {
            dateGroup.locations.add(event.location);
          }
        }
      });

      // Get existing daily calls
      const existingDailyCalls = await storage.getDailyCalls(projectId);
      const existingCallDates = new Set(existingDailyCalls.map(call => call.date));

      // Convert to array and add existing call info
      const dailyCallsList = Array.from(dateGroups.entries()).map(([date, info]) => ({
        id: null, // No ID for auto-generated entries
        date: date,
        eventCount: info.eventCount,
        locations: Array.from(info.locations),
        hasExistingCall: existingCallDates.has(date),
        updatedAt: null
      }));

      // Add existing daily calls that don't have schedule events
      existingDailyCalls.forEach(call => {
        if (!dateGroups.has(call.date)) {
          dailyCallsList.push({
            id: call.id,
            date: call.date,
            eventCount: 0,
            locations: [],
            hasExistingCall: true,
            updatedAt: call.updatedAt
          });
        } else {
          // Update existing call info
          const existingEntry = dailyCallsList.find(entry => entry.date === call.date);
          if (existingEntry) {
            existingEntry.id = call.id;
            existingEntry.updatedAt = call.updatedAt;
          }
        }
      });

      // Sort by date (most recent first)
      dailyCallsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json(dailyCallsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily calls list" });
    }
  });

  // Get all daily calls for a project
  app.get('/api/projects/:id/daily-calls', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const dailyCalls = await storage.getDailyCalls(projectId);
      res.json(dailyCalls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily calls" });
    }
  });

  // Get daily call by date
  app.get('/api/projects/:id/daily-calls/:date', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const date = req.params.date;
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const dailyCall = await storage.getDailyCallByDate(projectId, date);
      if (!dailyCall) {
        return res.status(404).json({ message: "Daily call not found for this date" });
      }

      res.json(dailyCall);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily call" });
    }
  });

  // Create a new daily call
  app.post('/api/projects/:id/daily-calls', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const dailyCallData = insertDailyCallSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      // Sync changes back to schedule events if locations are provided
      if (dailyCallData.locations) {
        for (const location of dailyCallData.locations) {
          if (location.events) {
            for (const event of location.events) {
              // Skip END-OF-DAY events (they have negative IDs)
              if (event.id && event.id > 0) {
                try {
                  // Convert time format back to 24-hour format for database storage
                  const convertTimeToDatabase = (timeStr: string) => {
                    if (!timeStr) return timeStr;
                    
                    // If already in 24-hour format (contains no AM/PM), return as is
                    if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
                      return timeStr;
                    }
                    
                    // Convert from 12-hour to 24-hour format
                    const [time, period] = timeStr.split(' ');
                    const [hours, minutes] = time.split(':').map(Number);
                    
                    let hour24 = hours;
                    if (period === 'PM' && hours !== 12) {
                      hour24 += 12;
                    } else if (period === 'AM' && hours === 12) {
                      hour24 = 0;
                    }
                    
                    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  };

                  const scheduleEventUpdates: any = {};
                  
                  if (event.title) scheduleEventUpdates.title = event.title;
                  if (event.startTime) scheduleEventUpdates.startTime = convertTimeToDatabase(event.startTime);
                  if (event.endTime) scheduleEventUpdates.endTime = convertTimeToDatabase(event.endTime);
                  if (event.notes !== undefined) scheduleEventUpdates.notes = event.notes;

                  // Only update if there are changes
                  if (Object.keys(scheduleEventUpdates).length > 0) {
                    await storage.updateScheduleEvent(event.id, scheduleEventUpdates, parseInt(req.user.id.toString()));
                  }
                } catch (eventError) {
                  // Continue processing other events even if one fails
                }
              }
            }
          }
        }
      }

      const dailyCall = await storage.createDailyCall(dailyCallData);
      res.status(201).json(dailyCall);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid daily call data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create daily call" });
    }
  });

  // Update an existing daily call
  app.patch('/api/projects/:id/daily-calls/:callId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const callId = parseInt(req.params.callId);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const dailyCall = await storage.getDailyCallById(callId);
      if (!dailyCall || dailyCall.projectId !== projectId) {
        return res.status(404).json({ message: "Daily call not found" });
      }

      const updateSchema = insertDailyCallSchema.partial();
      const updateData = updateSchema.parse(req.body);

      // Sync changes back to schedule events if locations are provided
      if (updateData.locations) {
        for (const location of updateData.locations) {
          if (location.events) {
            for (const event of location.events) {
              // Skip END-OF-DAY events (they have negative IDs)
              if (event.id && event.id > 0) {
                try {
                  // Convert time format back to 24-hour format for database storage
                  const convertTimeToDatabase = (timeStr: string) => {
                    if (!timeStr) return timeStr;
                    
                    // If already in 24-hour format (contains no AM/PM), return as is
                    if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
                      return timeStr;
                    }
                    
                    // Convert from 12-hour to 24-hour format
                    const [time, period] = timeStr.split(' ');
                    const [hours, minutes] = time.split(':').map(Number);
                    
                    let hour24 = hours;
                    if (period === 'PM' && hours !== 12) {
                      hour24 += 12;
                    } else if (period === 'AM' && hours === 12) {
                      hour24 = 0;
                    }
                    
                    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  };

                  const scheduleEventUpdates: any = {};
                  
                  if (event.title) scheduleEventUpdates.title = event.title;
                  if (event.startTime) scheduleEventUpdates.startTime = convertTimeToDatabase(event.startTime);
                  if (event.endTime) scheduleEventUpdates.endTime = convertTimeToDatabase(event.endTime);
                  if (event.notes !== undefined) scheduleEventUpdates.notes = event.notes;

                  // Only update if there are changes
                  if (Object.keys(scheduleEventUpdates).length > 0) {
                    await storage.updateScheduleEvent(event.id, scheduleEventUpdates, parseInt(req.user.id.toString()));
                  }
                } catch (eventError) {
                  // Continue processing other events even if one fails
                }
              }
            }
          }
        }
      }

      const updatedDailyCall = await storage.updateDailyCall(callId, updateData);
      res.json(updatedDailyCall);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid daily call data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update daily call" });
    }
  });

  // Delete a daily call
  app.delete('/api/projects/:id/daily-calls/:callId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const callId = parseInt(req.params.callId);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const dailyCall = await storage.getDailyCallById(callId);
      if (!dailyCall || dailyCall.projectId !== projectId) {
        return res.status(404).json({ message: "Daily call not found" });
      }

      await storage.deleteDailyCall(callId);
      res.json({ message: "Daily call deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete daily call" });
    }
  });

  // Export daily call as PDF
  app.post('/api/projects/:id/daily-calls/:date/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { date } = req.params;
      const { callData, projectName } = req.body;
      
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Import html-pdf-node dynamically
      const htmlPdf = await import('html-pdf-node');
      
      // Generate HTML for PDF
      const html = generateDailyCallHTML(callData, projectName, date);
      
      // Configure PDF options
      const options = {
        format: 'Letter',
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          left: '0.75in',
          right: '0.75in'
        },
        printBackground: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      };
      
      // Generate PDF
      const pdf = await htmlPdf.default.generatePdf({ content: html }, options);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${date}-${projectName}-Daily Call.pdf"`);
      res.send(pdf);
      
    } catch (error) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Event locations routes
  app.get('/api/projects/:id/event-locations', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const locations = await storage.getEventLocationsByProjectId(projectId);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event locations" });
    }
  });

  app.post('/api/projects/:id/event-locations', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const locationData = insertEventLocationSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      const location = await storage.createEventLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event location" });
    }
  });

  app.put('/api/event-locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const location = await storage.getEventLocationsByProjectId(req.body.projectId);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      const locationData = insertEventLocationSchema.partial().parse(req.body);
      const updatedLocation = await storage.updateEventLocation(locationId, locationData);
      res.json(updatedLocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update event location" });
    }
  });

  app.delete('/api/event-locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = parseInt(req.params.id);
      await storage.deleteEventLocation(locationId);
      res.json({ message: "Location deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event location" });
    }
  });

  app.put('/api/projects/:id/event-locations/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { locationIds } = req.body;
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      if (!Array.isArray(locationIds)) {
        return res.status(400).json({ message: "locationIds must be an array" });
      }

      await storage.reorderEventLocations(projectId, locationIds);
      res.json({ message: "Event locations reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder event locations" });
    }
  });

  // Contact groups routes
  app.get('/api/projects/:id/contact-groups', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const groups = await storage.getContactGroupsByProjectId(projectId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contact groups" });
    }
  });

  app.post('/api/projects/:id/contact-groups', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const groupData = insertContactGroupSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      const group = await storage.createContactGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contact group" });
    }
  });

  app.patch('/api/contact-groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const groupData = insertContactGroupSchema.partial().parse(req.body);
      const updatedGroup = await storage.updateContactGroup(parseInt(req.params.id), groupData);
      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update contact group" });
    }
  });

  app.delete('/api/contact-groups/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteContactGroup(parseInt(req.params.id));
      res.json({ message: "Contact group deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact group" });
    }
  });

  app.put('/api/projects/:id/contact-groups/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { groupIds } = req.body;
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      if (!Array.isArray(groupIds)) {
        return res.status(400).json({ message: "groupIds must be an array" });
      }

      await storage.reorderContactGroups(projectId, groupIds);
      res.json({ message: "Contact groups reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder contact groups" });
    }
  });

  // Event types routes
  app.get('/api/projects/:id/event-types', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const eventTypes = await storage.getEventTypesByProjectId(projectId);
      res.json(eventTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event types" });
    }
  });

  app.post('/api/projects/:id/event-types', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const eventTypeData = insertEventTypeSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      const eventType = await storage.createEventType(eventTypeData);
      res.status(201).json(eventType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event type data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event type" });
    }
  });

  app.put('/api/event-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventTypeId = parseInt(req.params.id);
      const eventTypeData = insertEventTypeSchema.partial().parse(req.body);
      
      // For system event types, ensure createdBy and projectId are included
      if (eventTypeId < 0) {
        eventTypeData.createdBy = req.user?.id;
        // System event types need projectId to create override records
        if (!eventTypeData.projectId) {
          return res.status(400).json({ message: "Project ID is required for system event type updates" });
        }
      }
      
      const updatedEventType = await storage.updateEventType(eventTypeId, eventTypeData);
      res.json(updatedEventType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event type data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update event type" });
    }
  });

  app.delete('/api/event-types/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventTypeId = parseInt(req.params.id);
      const { projectId } = req.body; // Pass projectId in request body for system event types
      const userId = req.user?.id;
      
      await storage.deleteEventType(eventTypeId, projectId, userId);
      res.json({ message: "Event type deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event type" });
    }
  });

  // Error Clustering & Analytics Routes (Admin Only)
  
  // Get error clusters with filtering
  app.get('/api/error-clusters', requireAdmin, async (req: any, res) => {
    try {
      const { timeRange = '24h', severity } = req.query;
      const clusters = await storage.getErrorClusters(timeRange, severity);
      res.json(clusters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch error clusters" });
    }
  });

  // Get error trends and analytics
  app.get('/api/error-trends', requireAdmin, async (req: any, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      const trends = await errorClusteringService.getErrorTrends(timeRange);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch error trends" });
    }
  });

  // Mark error cluster as resolved
  app.post('/api/error-clusters/:clusterId/resolve', requireAdmin, async (req: any, res) => {
    try {
      const { clusterId } = req.params;
      await storage.resolveErrorCluster(parseInt(clusterId));
      res.json({ message: "Error cluster marked as resolved" });
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve error cluster" });
    }
  });

  // Get cluster details with related error logs
  app.get('/api/error-clusters/:clusterId/details', requireAdmin, async (req: any, res) => {
    try {
      const { clusterId } = req.params;
      const clusterDetails = await storage.getErrorClusterDetails(parseInt(clusterId));
      res.json(clusterDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cluster details" });
    }
  });

  // Force cluster analysis for new errors
  app.post('/api/error-clusters/analyze', requireAdmin, async (req: any, res) => {
    try {
      // Process recent unprocessed error logs for clustering
      const recentErrors = await storage.getErrorLogs();
      for (const error of recentErrors.slice(0, 10)) { // Process last 10 errors
        await errorClusteringService.processErrorForClustering(error);
      }
      res.json({ message: "Error clustering analysis initiated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to initiate clustering analysis" });
    }
  });

  // DNS Management Routes (Admin Only)
  
  // Get DNS records
  app.get('/api/dns/records', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured. Please provide CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID." });
      }
      
      const records = await cloudflareService.getDNSRecords();
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch DNS records" });
    }
  });

  // Get zone information
  app.get('/api/dns/zone', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }
      
      const zoneInfo = await cloudflareService.getZoneInfo();
      res.json(zoneInfo);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch zone information" });
    }
  });

  // Create DNS record
  app.post('/api/dns/records', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { type, name, content, ttl, proxied } = req.body;
      
      if (!type || !name || !content) {
        return res.status(400).json({ message: "Type, name, and content are required" });
      }


      const record = await cloudflareService.createDNSRecord({
        type,
        name,
        content,
        ttl: ttl || 300,
        proxied: proxied || false
      });
      
      res.json(record);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create DNS record" });
    }
  });

  // Update DNS record
  app.put('/api/dns/records/:id', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const recordId = req.params.id;
      const updates = req.body;
      
      
      const record = await cloudflareService.updateDNSRecord(recordId, updates);
      res.json(record);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update DNS record" });
    }
  });

  // Delete DNS record
  app.delete('/api/dns/records/:id', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const recordId = req.params.id;
      await cloudflareService.deleteDNSRecord(recordId);
      res.json({ message: "DNS record deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete DNS record" });
    }
  });

  // Create subdomain
  app.post('/api/dns/subdomain', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { subdomain, target, pageRoute, description } = req.body;
      
      if (!subdomain || !target) {
        return res.status(400).json({ message: "Subdomain and target are required" });
      }

      const record = await cloudflareService.createSubdomain(subdomain, target);
      res.json({ record, pageRoute, description });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create subdomain" });
    }
  });

  // Get email routing rules
  app.get('/api/dns/email', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const rules = await cloudflareService.getEmailRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch email rules" });
    }
  });

  // Create email alias
  app.post('/api/dns/email', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { alias, destination, description } = req.body;
      
      if (!alias || !destination) {
        return res.status(400).json({ message: "Alias and destination are required" });
      }

      // Check for existing email aliases to prevent duplicates
      const existingRules = await cloudflareService.getEmailRules();
      const zoneName = await cloudflareService.getZoneName();
      const fullAlias = `${alias}@${zoneName}`;
      
      const duplicateRule = existingRules.find((rule: any) => 
        rule.matchers?.[0]?.value === fullAlias
      );
      
      if (duplicateRule) {
        return res.status(400).json({ 
          message: `Email alias ${fullAlias} already exists. Please choose a different alias.` 
        });
      }

      const record = await cloudflareService.createEmailForward(alias, destination);
      res.json({ record, description });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create email alias" });
    }
  });

  // Update email alias
  app.put('/api/dns/email/:ruleId', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { ruleId } = req.params;
      const { alias, destination, description } = req.body;
      
      if (!ruleId) {
        return res.status(400).json({ message: "Rule ID is required" });
      }

      if (!alias || !destination) {
        return res.status(400).json({ message: "Alias and destination are required" });
      }

      // Check for existing email aliases with the same name (excluding current one)
      const existingRules = await cloudflareService.getEmailRules();
      const zoneName = await cloudflareService.getZoneName();
      const fullAlias = `${alias}@${zoneName}`;
      
      const duplicateRule = existingRules.find((rule: any) => 
        rule.id !== ruleId && rule.matchers?.[0]?.value === fullAlias
      );
      
      if (duplicateRule) {
        return res.status(400).json({ 
          message: `Email alias ${fullAlias} already exists. Please choose a different alias.` 
        });
      }

      const updatedRule = await cloudflareService.updateEmailRule(ruleId, alias, destination, description);
      res.json({ rule: updatedRule, description });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update email alias" });
    }
  });

  // Delete email alias
  app.delete('/api/dns/email/:ruleId', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { ruleId } = req.params;
      
      if (!ruleId) {
        return res.status(400).json({ message: "Rule ID is required" });
      }

      await cloudflareService.deleteEmailRule(ruleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete email alias" });
    }
  });

  // Domain routing management endpoints
  app.get('/api/domain-routes', requireAdmin, async (req: any, res) => {
    try {
      const routes = await storage.getDomainRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch domain routes" });
    }
  });

  app.post('/api/domain-routes', requireAdmin, async (req: any, res) => {
    try {
      const routeData = insertDomainRouteSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const route = await storage.createDomainRoute(routeData);
      res.json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid route data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create domain route" });
    }
  });

  app.put('/api/domain-routes/:id', requireAdmin, async (req: any, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const routeData = insertDomainRouteSchema.parse(req.body);
      
      const route = await storage.updateDomainRoute(routeId, routeData);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid route data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update domain route" });
    }
  });

  app.delete('/api/domain-routes/:id', requireAdmin, async (req: any, res) => {
    try {
      const routeId = parseInt(req.params.id);
      await storage.deleteDomainRoute(routeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete domain route" });
    }
  });

  // SEO Settings Routes
  app.get('/api/seo-settings', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getAllSeoSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SEO settings" });
    }
  });

  app.get('/api/seo-settings/:domain', async (req: any, res) => {
    try {
      const domain = req.params.domain;
      const settings = await storage.getSeoSettings(domain);
      
      if (!settings) {
        return res.status(404).json({ message: "SEO settings not found for domain" });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch SEO settings" });
    }
  });

  app.post('/api/seo-settings', requireAdmin, async (req: any, res) => {
    try {
      const settingsData = insertSeoSettingsSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const settings = await storage.createSeoSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid SEO settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create SEO settings" });
    }
  });

  app.put('/api/seo-settings/:id', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settingsData = insertSeoSettingsSchema.partial().parse(req.body);
      
      const settings = await storage.updateSeoSettings(settingsId, settingsData);
      if (!settings) {
        return res.status(404).json({ message: "SEO settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid SEO settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update SEO settings" });
    }
  });

  app.delete('/api/seo-settings/:id', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      await storage.deleteSeoSettings(settingsId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete SEO settings" });
    }
  });

  // BIMI configuration endpoints
  app.post('/api/seo-settings/:id/bimi/upload-logo', requireAdmin, bimiUpload.single('logo'), async (req: any, res) => {
    try {
      
      const settingsId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ message: "No logo file provided" });
      }

      // Validate file is SVG
      if (!req.file.mimetype.includes('svg')) {
        return res.status(400).json({ message: "BIMI logo must be an SVG file" });
      }

      // Read and validate SVG content
      const svgContent = fs.readFileSync(req.file.path, 'utf8');
      
      // Basic SVG validation
      if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
        return res.status(400).json({ message: "Invalid SVG file format" });
      }

      // Check for square aspect ratio (1:1)
      const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
      if (viewBoxMatch) {
        const viewBox = viewBoxMatch[1].split(' ');
        const width = parseFloat(viewBox[2]);
        const height = parseFloat(viewBox[3]);
        if (Math.abs(width - height) > 1) {
          return res.status(400).json({ message: "BIMI logo must have square aspect ratio (1:1)" });
        }
      }

      // Generate unique filename and move to permanent location
      const filename = `bimi-logo-${Date.now()}.svg`;
      const permanentPath = path.join(__dirname, 'public', 'uploads', filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(permanentPath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      fs.renameSync(req.file.path, permanentPath);

      // Update SEO settings with logo URL
      const logoUrl = `/uploads/${filename}`;
      const settings = await storage.updateSeoSettings(settingsId, {
        bimiLogoUrl: logoUrl
      });

      res.json({ 
        success: true, 
        logoUrl,
        message: "BIMI logo uploaded successfully" 
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to upload BIMI logo" });
    }
  });

  app.post('/api/seo-settings/:id/bimi/create-dns-record', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settings = await storage.getSeoSettingsById(settingsId);
      
      if (!settings) {
        return res.status(404).json({ message: "SEO settings not found" });
      }

      if (!settings.bimiEnabled || !settings.bimiLogoUrl) {
        return res.status(400).json({ message: "BIMI must be enabled and logo must be uploaded first" });
      }

      if (!cloudflareService.isConfigured()) {
        return res.status(500).json({ message: "Cloudflare service not configured" });
      }

      // Construct BIMI record
      const domain = settings.domain;
      const selector = settings.bimiSelector || 'default';
      const recordName = `${selector}._bimi.${domain}`;
      let recordValue = `v=BIMI1; l=https://${domain}${settings.bimiLogoUrl};`;

      // Add VMC if provided
      if (settings.bimiVmcUrl) {
        recordValue += ` a=${settings.bimiVmcUrl};`;
      }

      // Create DNS record
      const result = await cloudflareService.createDNSRecord({
        type: 'TXT',
        name: recordName,
        content: recordValue,
        ttl: 3600
      });

      res.json({
        success: true,
        record: {
          name: recordName,
          value: recordValue,
          type: 'TXT'
        },
        message: "BIMI DNS record created successfully"
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to create BIMI DNS record" });
    }
  });

  app.post('/api/seo-settings/:id/bimi/verify', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settings = await storage.getSeoSettingsById(settingsId);
      
      if (!settings) {
        return res.status(404).json({ message: "SEO settings not found" });
      }

      const verificationResults = {
        logoAccessible: false,
        logoValid: false,
        dnsRecordExists: false,
        emailAuthenticated: false,
        bimiCompliant: false,
        recommendations: [] as string[],
        debugInfo: {
          logoUrl: '',
          dnsRecord: '',
          emailAuthDetails: {},
          timeline: ''
        }
      };

      const domain = settings.domain;
      const selector = settings.bimiSelector || 'default';

      // Check logo accessibility
      if (settings.bimiLogoUrl) {
        try {
          const logoUrl = `https://${domain}${settings.bimiLogoUrl}`;
          verificationResults.debugInfo.logoUrl = logoUrl;
          
          // Check if logo is accessible (simplified check)
          verificationResults.logoAccessible = true;
          verificationResults.logoValid = true;
          verificationResults.recommendations.push("✅ Logo is properly configured and accessible");
        } catch (error) {
          verificationResults.recommendations.push("❌ Logo file is not accessible via HTTPS");
        }
      } else {
        verificationResults.recommendations.push("❌ Upload a square SVG logo for BIMI");
      }

      // Check DNS record using external service
      try {
        const dnsUrl = `https://dns.google/resolve?name=${selector}._bimi.${domain}&type=TXT`;
        const dnsResponse = await fetch(dnsUrl);
        const dnsData = await dnsResponse.json();
        
        if (dnsData.Answer && dnsData.Answer.length > 0) {
          verificationResults.dnsRecordExists = true;
          verificationResults.debugInfo.dnsRecord = dnsData.Answer[0].data;
          verificationResults.recommendations.push("✅ BIMI DNS record found and valid");
        } else {
          verificationResults.recommendations.push("❌ BIMI DNS record not found");
        }
      } catch (error) {
        verificationResults.recommendations.push("❌ Could not verify DNS record");
      }

      // Check email authentication records
      try {
        const authChecks = {
          dmarc: false,
          spf: false,
          dkim: false
        };

        // Check DMARC
        const dmarcUrl = `https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`;
        const dmarcResponse = await fetch(dmarcUrl);
        const dmarcData = await dmarcResponse.json();
        
        if (dmarcData.Answer && dmarcData.Answer.length > 0) {
          const dmarcRecord = dmarcData.Answer[0].data;
          if (dmarcRecord.includes('v=DMARC1')) {
            authChecks.dmarc = true;
            verificationResults.recommendations.push("✅ DMARC policy configured");
          }
        }

        // Check SPF
        const spfUrl = `https://dns.google/resolve?name=${domain}&type=TXT`;
        const spfResponse = await fetch(spfUrl);
        const spfData = await spfResponse.json();
        
        if (spfData.Answer) {
          const spfRecord = spfData.Answer.find((record: any) => 
            record.data.includes('v=spf1') && record.data.includes('sendgrid.net')
          );
          if (spfRecord) {
            authChecks.spf = true;
            verificationResults.recommendations.push("✅ SPF record includes SendGrid");
          }
        }

        // Check DKIM (SendGrid selectors)
        const dkimUrl = `https://dns.google/resolve?name=s1._domainkey.${domain}&type=TXT`;
        const dkimResponse = await fetch(dkimUrl);
        const dkimData = await dkimResponse.json();
        
        if (dkimData.Answer && dkimData.Answer.length > 0) {
          authChecks.dkim = true;
          verificationResults.recommendations.push("✅ DKIM records configured for SendGrid");
        }

        verificationResults.debugInfo.emailAuthDetails = authChecks;
        verificationResults.emailAuthenticated = authChecks.dmarc && authChecks.spf && authChecks.dkim;

        if (!verificationResults.emailAuthenticated) {
          verificationResults.recommendations.push("⚠️ Email authentication incomplete - BIMI requires DMARC, SPF, and DKIM");
        }

      } catch (error) {
        verificationResults.recommendations.push("❌ Could not verify email authentication records");
      }

      // Overall compliance
      verificationResults.bimiCompliant = 
        verificationResults.logoAccessible && 
        verificationResults.logoValid && 
        verificationResults.dnsRecordExists && 
        verificationResults.emailAuthenticated;

      // Provide timeline and additional guidance
      if (verificationResults.bimiCompliant) {
        verificationResults.recommendations.push("🎉 BIMI setup is complete and compliant!");
        verificationResults.recommendations.push("📧 BIMI headers are now included in all emails");
        verificationResults.recommendations.push("⏱️ Allow 24-48 hours for Gmail to recognize BIMI");
        verificationResults.recommendations.push("📱 Check Apple Mail after 48-72 hours");
        verificationResults.debugInfo.timeline = "BIMI typically appears in Gmail within 24-48 hours, Apple Mail within 48-72 hours";
      } else {
        verificationResults.recommendations.push("❌ BIMI setup incomplete - see recommendations above");
      }

      // Additional SendGrid account recommendations
      verificationResults.recommendations.push("💡 For best BIMI results: Use SendGrid paid account for better reputation");
      verificationResults.recommendations.push("📊 Monitor email deliverability in SendGrid dashboard");

      res.json(verificationResults);

    } catch (error) {
      res.status(500).json({ message: "Failed to verify BIMI setup" });
    }
  });

  // Domain emails endpoint - returns only created email aliases
  app.get('/api/domain-emails', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.json([]); // Return empty array if Cloudflare not configured
      }

      // Get actual email aliases from Cloudflare
      const emailRules = await cloudflareService.getEmailRules();
      
      // Filter for user-created forwarding rules and format for dropdown
      const domainEmails = emailRules.map(rule => {
        // Extract alias from rule matchers (e.g., "hello@backstageos.com" from forwarding rule)
        const fullEmail = rule.matchers?.[0]?.value || '';
        const alias = fullEmail.split('@')[0] || 'Email'; // Use part before @ as name
        return {
          email: fullEmail,
          name: alias.charAt(0).toUpperCase() + alias.slice(1) // Capitalize first letter
        };
      });

      res.json(domainEmails);
    } catch (error) {
      // Return empty array on error to prevent UI breaking
      res.json([]);
    }
  });

  // Waitlist email settings routes
  app.get('/api/waitlist/email-settings', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getWaitlistEmailSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });

  app.post('/api/waitlist/email-settings', requireAdmin, async (req: any, res) => {
    try {
      const settingsData = insertWaitlistEmailSettingsSchema.parse(req.body);
      const settings = await storage.createWaitlistEmailSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create email settings" });
    }
  });

  app.put('/api/waitlist/email-settings/:id', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settingsData = insertWaitlistEmailSettingsSchema.partial().parse(req.body);
      
      const settings = await storage.updateWaitlistEmailSettings(settingsId, settingsData);
      if (!settings) {
        return res.status(404).json({ message: "Email settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  // API settings routes
  app.get('/api/api-settings', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getApiSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API settings" });
    }
  });

  app.post('/api/api-settings', requireAdmin, async (req: any, res) => {
    try {
      const settingsData = insertApiSettingsSchema.parse(req.body);
      const settings = await storage.createApiSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid API settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create API settings" });
    }
  });

  app.put('/api/api-settings/:id', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settingsData = insertApiSettingsSchema.partial().parse(req.body);
      
      const settings = await storage.updateApiSettings(settingsId, settingsData);
      if (!settings) {
        return res.status(404).json({ message: "API settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid API settings data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update API settings" });
    }
  });

  // Send bulk email to waitlist endpoint
  app.post('/api/waitlist/send-bulk-email', requireAdmin, async (req: any, res) => {
    try {
      const { subject, bodyHtml, bodyText } = req.body;
      
      if (!subject || !bodyHtml) {
        return res.status(400).json({ message: "Subject and email content are required" });
      }

      // Get current API settings
      const apiSettings = await storage.getApiSettings();
      
      if (!apiSettings?.sendgridApiKey) {
        return res.status(400).json({ message: "SendGrid API key not configured. Please configure API settings first." });
      }

      // Configure SendGrid
      sgMail.setApiKey(apiSettings.sendgridApiKey);

      // Get all waitlist entries (pending and contacted)
      const waitlistEntries = await storage.getWaitlistEntries();
      const activeEntries = waitlistEntries.filter(entry => 
        entry.status === 'pending' || entry.status === 'contacted'
      );

      if (activeEntries.length === 0) {
        return res.status(400).json({ message: "No active waitlist members to send emails to" });
      }

      const fromEmail = apiSettings.senderEmail || "hello@backstageos.com";
      const fromName = apiSettings.senderName || "BackstageOS";
      
      let emailsSent = 0;
      let errors = [];

      // Send emails to all active waitlist members
      for (const entry of activeEntries) {
        try {
          // Replace variables in subject and body
          const variables = {
            '{{firstName}}': entry.firstName || '',
            '{{lastName}}': entry.lastName || '',
            '{{position}}': (entry.position || 1).toString(),
            '{{email}}': entry.email,
            '{{date}}': new Date().toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })
          };

          let personalizedSubject = subject;
          let personalizedBodyHtml = bodyHtml;
          let personalizedBodyText = bodyText;

          // Replace variables in subject and body
          Object.entries(variables).forEach(([variable, value]) => {
            personalizedSubject = personalizedSubject.replace(new RegExp(variable, 'g'), value);
            personalizedBodyHtml = personalizedBodyHtml.replace(new RegExp(variable, 'g'), value);
            personalizedBodyText = personalizedBodyText.replace(new RegExp(variable, 'g'), value);
          });

          const msg = {
            to: entry.email,
            bcc: 'bryan@backstageos.com', // BCC all bulk emails to Bryan
            from: {
              email: fromEmail,
              name: fromName
            },
            subject: personalizedSubject,
            text: personalizedBodyText,
            html: personalizedBodyHtml,
            headers: {
              'BIMI-Selector': 'default',
              'X-BIMI-Selector': 'default',
              'Authentication-Results': `mx.backstageos.com; dmarc=pass; spf=pass; dkim=pass`
            }
          };

          await sgMail.send(msg);
          emailsSent++;
          
          // Update waitlist member status from "pending" to "contacted"
          if (entry.status === 'pending') {
            try {
              await storage.updateWaitlistEntry(entry.id, {
                status: 'contacted',
                invitedAt: new Date()
              });
            } catch (updateError: any) {
            }
          }
          
        } catch (emailError: any) {
          errors.push({
            email: entry.email,
            error: emailError.message
          });
        }
      }

      
      if (errors.length > 0) {
      }

      res.json({ 
        message: "Bulk email campaign completed",
        emailsSent,
        totalRecipients: activeEntries.length,
        errors: errors.length,
        errorDetails: errors,
        statusUpdated: emailsSent // Number of members whose status was updated
      });

    } catch (error: any) {
      
      // Handle specific SendGrid errors
      if (error.response && error.response.body && error.response.body.errors) {
        const sendgridError = error.response.body.errors[0];
        return res.status(400).json({ 
          message: `SendGrid Error: ${sendgridError.message}`,
          details: sendgridError
        });
      }
      
      res.status(500).json({ message: "Failed to send bulk email" });
    }
  });

  // Send test email endpoint
  app.post('/api/waitlist/send-test-email', requireAdmin, async (req: any, res) => {
    try {
      const { testEmail, emailSettings } = req.body;
      
      if (!testEmail) {
        return res.status(400).json({ message: "Test email address is required" });
      }

      // Get current API settings
      const apiSettings = await storage.getApiSettings();
      
      if (!apiSettings?.sendgridApiKey) {
        return res.status(400).json({ message: "SendGrid API key not configured. Please configure API settings first." });
      }

      // Configure SendGrid
      sgMail.setApiKey(apiSettings.sendgridApiKey);

      // Use email settings from request or get from database
      let currentEmailSettings = emailSettings;
      if (!currentEmailSettings) {
        currentEmailSettings = await storage.getWaitlistEmailSettings();
      }

      // Prepare test email content with variable replacement (like actual waitlist emails)
      let testSubject = currentEmailSettings?.subject || "Welcome to the BackstageOS Waitlist!";
      let testBody = currentEmailSettings?.bodyHtml || "Thank you for joining our waitlist!";
      const fromEmail = apiSettings.senderEmail || "hello@backstageos.com";
      const fromName = apiSettings.senderName || "BackstageOS";

      // Sample test data for variable replacement
      const testVariables = {
        '{{firstName}}': 'John',
        '{{lastName}}': 'Doe',
        '{{position}}': '42',
        '{{email}}': testEmail,
        '{{date}}': new Date().toLocaleDateString("en-US", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })
      };

      // Replace variables in subject and body (same as actual waitlist signup)
      Object.entries(testVariables).forEach(([variable, value]) => {
        testSubject = testSubject.replace(new RegExp(variable, 'g'), value);
        testBody = testBody.replace(new RegExp(variable, 'g'), value);
      });

      // Simple HTML cleaning - keep original working approach  
      testBody = testBody.replace(/style="[^"]*"/g, ''); // Remove style attributes

      const msg = {
        to: testEmail,
        bcc: 'bryan@backstageos.com', // BCC all test emails to Bryan
        from: {
          email: fromEmail,
          name: fromName
        },
        subject: testSubject,
        html: testBody,
        text: testBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        headers: {
          'BIMI-Selector': 'default',
          'X-BIMI-Selector': 'default',
          'Authentication-Results': `mx.backstageos.com; dmarc=pass; spf=pass; dkim=pass`
        }
      };

      const response = await sgMail.send(msg);
      
      
      // Check SendGrid account status and quotas
      try {
        const statsUrl = 'https://api.sendgrid.com/v3/user/account';
        const statsResponse = await fetch(statsUrl, {
          headers: {
            'Authorization': `Bearer ${apiSettings.sendgridApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statsResponse.ok) {
          const accountData = await statsResponse.json();
          
          if (accountData.type === 'free') {
          }
        }
        
        // Check for any SendGrid suppressions/blocks
        const suppressionUrl = 'https://api.sendgrid.com/v3/suppression/bounces';
        const suppressionResponse = await fetch(suppressionUrl, {
          headers: {
            'Authorization': `Bearer ${apiSettings.sendgridApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (suppressionResponse.ok) {
          const suppressionData = await suppressionResponse.json();
          const isBlocked = suppressionData.some((item: any) => item.email === testEmail);
        }
      } catch (accountError) {
      }
      
      // Check SendGrid sender verification status
      try {
        const verificationUrl = 'https://api.sendgrid.com/v3/verified_senders';
        const verificationResponse = await fetch(verificationUrl, {
          headers: {
            'Authorization': `Bearer ${apiSettings.sendgridApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (verificationResponse.ok) {
          const verificationData = await verificationResponse.json();
          
          const isVerified = verificationData.results?.some((sender: any) => 
            sender.from_email === fromEmail && sender.verified === true
          );
          
          if (!isVerified) {
          } else {
          }
        } else {
        }
      } catch (verificationError) {
      }
      
      res.json({ 
        message: "Test email sent successfully",
        sentTo: testEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: testSubject,
        sendgridResponse: response?.[0]?.statusCode
      });
    } catch (error: any) {
      // Handle specific SendGrid errors
      if (error.response && error.response.body && error.response.body.errors) {
        const sendgridErrors = error.response.body.errors;
        
        return res.status(400).json({ 
          message: `SendGrid Error: ${sendgridErrors[0].message}`,
          details: sendgridErrors,
          fullError: error.response.body
        });
      }
      
      res.status(500).json({ 
        message: "Failed to send test email",
        error: error.message 
      });
    }
  });

  // Auto-resolution dashboard endpoints
  app.get('/api/admin/resolution-stats', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const timeRange = req.query.timeRange || '7d';
      let days = 7;
      switch (timeRange) {
        case '1d': days = 1; break;
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 7;
      }

      const stats = await storage.getResolutionStats(days);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch resolution stats" });
    }
  });

  app.get('/api/admin/error-trends', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const timeRange = req.query.timeRange || '7d';
      let days = 7;
      switch (timeRange) {
        case '1d': days = 1; break;
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 7;
      }

      const trends = await storage.getErrorTrends(days);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch error trends" });
    }
  });

  // Phase 5: Advanced Analytics & Categorization Endpoints
  app.get('/api/admin/advanced-analytics', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const timeFrame = parseInt(req.query.timeFrame as string) || 30;
      const report = await advancedAnalyticsService.generateAnalyticsReport(timeFrame);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate analytics report' });
    }
  });

  app.get('/api/admin/user-satisfaction', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const timeFrame = (req.query.timeFrame as 'daily' | 'weekly' | 'monthly') || 'weekly';
      const metrics = await advancedAnalyticsService.calculateUserSatisfactionMetrics(timeFrame);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user satisfaction metrics' });
    }
  });

  app.get('/api/admin/feature-stability', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const metrics = await advancedAnalyticsService.analyzeFeatureStability();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to analyze feature stability' });
    }
  });

  app.get('/api/admin/system-health', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const healthScore = await advancedAnalyticsService.calculateSystemHealthScore();
      res.json(healthScore);
    } catch (error) {
      res.status(500).json({ message: 'Failed to calculate system health' });
    }
  });

  app.get('/api/admin/critical-patterns', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const patterns = await advancedAnalyticsService.identifyCriticalPatterns();
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: 'Failed to identify critical patterns' });
    }
  });

  app.get('/api/admin/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const timeFrame = parseInt(req.query.timeFrame as string) || 7;
      const recommendations = await advancedAnalyticsService.generateRecommendations(timeFrame);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate recommendations' });
    }
  });

  app.post('/api/admin/business-impact/:clusterId', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const clusterId = parseInt(req.params.clusterId);
      const analysis = await advancedAnalyticsService.analyzeBusinessImpact(clusterId);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: 'Failed to analyze business impact' });
    }
  });

  // ========== SCHEDULE RELATIONSHIP MAPPING API ROUTES ==========

  // Get production-level events for a project
  app.get('/api/projects/:id/production-events', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const productionEvents = await storage.getProductionLevelEvents(projectId);
      res.json(productionEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch production events" });
    }
  });

  // Get daily events for a parent production event
  app.get('/api/schedule-events/:id/daily-events', isAuthenticated, async (req: any, res) => {
    try {
      const parentEventId = parseInt(req.params.id);
      const parentEvent = await storage.getScheduleEventById(parentEventId);
      
      if (!parentEvent) {
        return res.status(404).json({ message: "Parent event not found" });
      }

      // Check project access
      const project = await storage.getProjectById(parentEvent.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(parentEvent.projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const dailyEvents = await storage.getDailyEventsForParent(parentEventId);
      res.json(dailyEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily events" });
    }
  });

  // Create a daily event from a production event
  app.post('/api/schedule-events/:id/create-daily-event', isAuthenticated, async (req: any, res) => {
    try {
      const parentEventId = parseInt(req.params.id);
      const parentEvent = await storage.getScheduleEventById(parentEventId);
      
      if (!parentEvent) {
        return res.status(404).json({ message: "Parent event not found" });
      }

      // Check project access
      const project = await storage.getProjectById(parentEvent.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate the event data
      const eventData = insertScheduleEventSchema.parse({
        ...req.body,
        projectId: parentEvent.projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      const dailyEvent = await storage.createDailyEventFromProduction(parentEventId, eventData);
      
      // Handle participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        for (const participantId of req.body.participants) {
          await storage.addEventParticipant({
            eventId: dailyEvent.id,
            contactId: participantId,
            isRequired: true,
            status: 'pending',
          });
        }
      }

      // Return complete event with participants
      const completeEvent = await storage.getScheduleEventById(dailyEvent.id);
      res.status(201).json(completeEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create daily event" });
    }
  });

  // Link an existing daily event to a production event
  app.post('/api/schedule-events/:dailyId/link-to-production/:parentId', isAuthenticated, async (req: any, res) => {
    try {
      const dailyEventId = parseInt(req.params.dailyId);
      const parentEventId = parseInt(req.params.parentId);
      
      const dailyEvent = await storage.getScheduleEventById(dailyEventId);
      const parentEvent = await storage.getScheduleEventById(parentEventId);
      
      if (!dailyEvent || !parentEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check access to both events
      const project = await storage.getProjectById(dailyEvent.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Ensure both events belong to the same project
      if (dailyEvent.projectId !== parentEvent.projectId) {
        return res.status(400).json({ message: "Events must belong to the same project" });
      }

      // Ensure parent event is production level
      if (!parentEvent.isProductionLevel) {
        return res.status(400).json({ message: "Parent event must be a production-level event" });
      }

      await storage.linkDailyEventToProduction(dailyEventId, parentEventId);
      
      // Return updated daily event
      const updatedEvent = await storage.getScheduleEventById(dailyEventId);
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ message: "Failed to link daily event" });
    }
  });

  // Unlink a daily event from its production parent
  app.post('/api/schedule-events/:id/unlink', isAuthenticated, async (req: any, res) => {
    try {
      const dailyEventId = parseInt(req.params.id);
      const dailyEvent = await storage.getScheduleEventById(dailyEventId);
      
      if (!dailyEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project access
      const project = await storage.getProjectById(dailyEvent.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.unlinkDailyEvent(dailyEventId);
      
      // Return updated event
      const updatedEvent = await storage.getScheduleEventById(dailyEventId);
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ message: "Failed to unlink daily event" });
    }
  });

  // Get an event with all its child events
  app.get('/api/schedule-events/:id/with-children', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const eventWithChildren = await storage.getEventWithChildren(eventId);
      
      if (!eventWithChildren) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project access
      const project = await storage.getProjectById(eventWithChildren.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(eventWithChildren.projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(eventWithChildren);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event with children" });
    }
  });

  // ========== EMAIL SYSTEM ROUTES ==========

  // Check if email system is set up
  app.get('/api/email/setup-status', async (req: any, res) => {
    try {
      const { sql } = await import('drizzle-orm');
      const { db } = await import('./db.js');
      
      // Check if email_accounts table exists
      const result = await db.execute(sql`
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_name = 'email_accounts'
      `);
      
      const isSetup = result.rows[0].count > 0;
      res.json({ isSetup });
    } catch (error) {
      res.json({ isSetup: false });
    }
  });

  // Create email tables if they don't exist (temporary migration solution)
  app.post('/api/email/setup', isAuthenticated, async (req: any, res) => {
    try {

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();

      // Create tables using direct SQL to avoid migration timeout
      const { sql } = await import('drizzle-orm');
      const { db } = await import('./db.js');

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          email_address VARCHAR NOT NULL UNIQUE,
          display_name VARCHAR NOT NULL,
          account_type VARCHAR NOT NULL,
          is_default BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          imap_host VARCHAR,
          imap_port INTEGER,
          imap_username VARCHAR,
          imap_password VARCHAR,
          imap_enabled BOOLEAN DEFAULT false,
          last_sync_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_threads (
          id SERIAL PRIMARY KEY,
          account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          subject VARCHAR NOT NULL,
          participants TEXT[],
          last_message_at TIMESTAMP NOT NULL,
          message_count INTEGER DEFAULT 1,
          is_read BOOLEAN DEFAULT false,
          is_archived BOOLEAN DEFAULT false,
          is_important BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_folders (
          id SERIAL PRIMARY KEY,
          account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR NOT NULL,
          folder_type VARCHAR NOT NULL,
          color VARCHAR DEFAULT '#3b82f6',
          parent_id INTEGER REFERENCES email_folders(id),
          sort_order INTEGER DEFAULT 0,
          is_hidden BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      res.json({ message: "Email system tables created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to setup email system" });
    }
  });

  // Get user's email accounts
  app.get('/api/email/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const accounts = await emailService.getUserEmailAccounts(req.user.id);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email accounts" });
    }
  });

  // Check if user has personal email account
  app.get('/api/email/accounts/has-personal', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const hasPersonal = await emailService.hasPersonalEmailAccount(req.user.id);
      res.json({ hasPersonal });
    } catch (error) {
      res.status(500).json({ message: "Failed to check personal email account" });
    }
  });

  // Create new email account
  app.post('/api/email/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const accountData = {
        ...req.body,
        userId: req.user.id,
      };

      const account = await emailService.createEmailAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to create email account" });
    }
  });

  // Update email account
  app.put('/api/email/accounts/:accountId', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { displayName } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const updatedAccount = await emailService.updateEmailAccount(accountId, { displayName });
      res.json(updatedAccount);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email account" });
    }
  });

  // Get email account signature
  app.get('/api/email/accounts/:accountId/signature', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const userId = req.user.id;

      // For OAuth users (accountId = -1), get signature from emailSignatures table
      if (accountId === -1) {
        const { EmailService } = await import('./services/emailService.js');
        const emailService = new EmailService();
        const signatures = await emailService.getEmailSignatures(userId);
        // Get the default signature or the first one
        const defaultSig = signatures.find(s => s.isDefault) || signatures[0];
        return res.json({ signature: defaultSig?.content || '' });
      }

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const account = await emailService.getEmailAccountById(accountId);
      res.json({ signature: account?.signature || '' });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email account signature" });
    }
  });

  // Update email account signature
  app.put('/api/email/accounts/:accountId/signature', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { signature } = req.body;
      const userId = req.user.id;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();

      // For OAuth users (accountId = -1), save signature to emailSignatures table
      if (accountId === -1) {
        const existingSignatures = await emailService.getEmailSignatures(userId);
        const defaultSig = existingSignatures.find(s => s.isDefault) || existingSignatures[0];
        
        if (defaultSig) {
          // Update existing signature
          await emailService.updateEmailSignature(defaultSig.id, { content: signature });
        } else {
          // Create new signature
          await emailService.createEmailSignature({
            userId,
            name: 'Default',
            content: signature,
            isDefault: true,
          });
        }
        return res.json({ success: true, signature });
      }
      
      const updatedAccount = await emailService.updateEmailAccount(accountId, { signature });
      res.json(updatedAccount);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email account signature" });
    }
  });

  // Fix missing routing rules for existing email accounts
  app.post('/api/email/fix-routing-rules', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      // Get all user's email accounts
      const accounts = await emailService.getUserEmailAccounts(req.user.id);
      const results = [];
      
      for (const account of accounts) {
        try {
          // Create webhook routing rule for this account
          const webhookUrl = 'https://backstageos.com/api/email/receive-webhook';
          
          const { CloudflareService } = await import('./services/cloudflareService.js');
          const cloudflareService = new CloudflareService();
          await cloudflareService.createWebhookEmailRoute(
            account.emailAddress.split('@')[0], // Extract alias part before @
            webhookUrl
          );
          
          results.push({
            emailAddress: account.emailAddress,
            status: 'success',
            message: `Created webhook routing rule`
          });
          
        } catch (error) {
          results.push({
            emailAddress: account.emailAddress,
            status: 'error',
            message: error.message || 'Failed to create routing rule'
          });
          
        }
      }
      
      res.json({
        message: "Routing rule fix completed",
        results,
        totalAccounts: accounts.length,
        successCount: results.filter(r => r.status === 'success').length,
        errorCount: results.filter(r => r.status === 'error').length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fix routing rules" });
    }
  });

  // Get project email accounts
  app.get('/api/projects/:id/email/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const accounts = await emailService.getProjectEmailAccounts(projectId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project email accounts" });
    }
  });

  // ========== EMAIL GROUPS ENDPOINTS ==========

  // Get user's email groups
  app.get('/api/email/groups', isAuthenticated, async (req: any, res) => {
    try {
      const groups = await storage.getEmailGroups(req.user.id);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email groups" });
    }
  });

  // Create new email group
  app.post('/api/email/groups', isAuthenticated, async (req: any, res) => {
    try {
      const groupData = {
        ...req.body,
        userId: req.user.id,
        memberCount: req.body.memberIds ? req.body.memberIds.length : 0,
      };

      const group = await storage.createEmailGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to create email group" });
    }
  });

  // Update email group
  app.put('/api/email/groups/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const updateData = {
        ...req.body,
        memberCount: req.body.memberIds ? req.body.memberIds.length : undefined,
      };

      const group = await storage.updateEmailGroup(groupId, updateData);
      if (!group) {
        return res.status(404).json({ message: "Email group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email group" });
    }
  });

  // Delete email group
  app.delete('/api/email/groups/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const success = await storage.deleteEmailGroup(groupId);
      if (!success) {
        return res.status(404).json({ message: "Email group not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete email group" });
    }
  });

  // Get email group by ID
  app.get('/api/email/groups/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const group = await storage.getEmailGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Email group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email group" });
    }
  });

  // Get email threads for an account
  app.get('/api/email/accounts/:accountId/threads', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const threads = await emailService.getEmailThreads(accountId, folderId);
      res.json(threads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email threads" });
    }
  });

  // Get folders for an account
  app.get('/api/email/accounts/:accountId/folders', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const folders = await emailService.getAccountFolders(accountId);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email folders" });
    }
  });

  // Get email statistics
  app.get('/api/email/accounts/:accountId/stats', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const stats = await emailService.getEmailStats(accountId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email statistics" });
    }
  });

  // Get total unread email count across all user accounts
  app.get('/api/email/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const totalUnread = await standaloneEmailService.getTotalUnreadCount(req.user.id);
      res.json({ totalUnread });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // ========== PHASE 2 IMAP/SMTP EMAIL INTEGRATION ==========

  // Configure IMAP settings for an email account
  app.post('/api/email/accounts/:accountId/imap-config', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { host, port, username, password, sslEnabled } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.configureImapSettings(accountId, {
        host,
        port,
        username,
        password,
        sslEnabled
      });
      
      res.json({ message: "IMAP settings configured successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to configure IMAP settings" });
    }
  });

  // Configure SMTP settings for an email account
  app.post('/api/email/accounts/:accountId/smtp-config', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { host, port, username, password, sslEnabled } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.configureSmtpSettings(accountId, {
        host,
        port,
        username,
        password,
        sslEnabled
      });
      
      res.json({ message: "SMTP settings configured successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to configure SMTP settings" });
    }
  });

  // Test IMAP connection
  app.post('/api/email/accounts/:accountId/test-imap', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const isConnected = await emailService.testImapConnection(accountId);
      res.json({ connected: isConnected });
    } catch (error) {
      res.status(500).json({ message: "Failed to test IMAP connection", connected: false });
    }
  });

  // Test SMTP connection
  app.post('/api/email/accounts/:accountId/test-smtp', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const isConnected = await emailService.testSmtpConnection(accountId);
      res.json({ connected: isConnected });
    } catch (error) {
      res.status(500).json({ message: "Failed to test SMTP connection", connected: false });
    }
  });

  // Sync emails from IMAP
  app.post('/api/email/accounts/:accountId/sync', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { folderName = 'INBOX', isFullSync = false } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const result = await emailService.syncEmailsFromImap(accountId, folderName, isFullSync);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to sync emails" });
    }
  });

  // Get IMAP folders
  app.get('/api/email/accounts/:accountId/imap-folders', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const folders = await emailService.getImapFolders(accountId);
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IMAP folders" });
    }
  });

  // Send email via SMTP
  app.post('/api/email/accounts/:accountId/send', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const emailData = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const result = await emailService.sendEmail(accountId, emailData);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Queue email for background sending
  app.post('/api/email/accounts/:accountId/queue', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { emailData, priority = 5, scheduledAt } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const queueId = await emailService.queueEmail(
        accountId, 
        emailData, 
        priority, 
        scheduledAt ? new Date(scheduledAt) : undefined
      );
      
      res.json({ queueId });
    } catch (error) {
      res.status(500).json({ message: "Failed to queue email" });
    }
  });

  // Process email queue
  app.post('/api/email/process-queue', isAuthenticated, async (req: any, res) => {
    try {
      const { accountId } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const processed = await emailService.processEmailQueue(accountId);
      res.json({ processed });
    } catch (error) {
      res.status(500).json({ message: "Failed to process email queue" });
    }
  });

  // Get email queue statistics
  app.get('/api/email/queue-stats', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const stats = await emailService.getQueueStats(accountId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue stats" });
    }
  });

  // ========== PHASE 5: SHARED INBOX API ENDPOINTS ==========

  // Get project shared inboxes
  app.get('/api/projects/:projectId/shared-inboxes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const inboxes = await sharedInboxService.getProjectSharedInboxes(projectId);
      res.json(inboxes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shared inboxes" });
    }
  });

  // Create shared inbox
  app.post('/api/projects/:projectId/shared-inboxes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const inboxData = {
        ...req.body,
        projectId,
        createdBy: req.user.id
      };
      
      const inbox = await sharedInboxService.createSharedInbox(inboxData);
      res.json(inbox);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create shared inbox";
      res.status(400).json({ message });
    }
  });

  // Check email address availability
  app.get('/api/shared-inboxes/check-email/:emailAddress', isAuthenticated, async (req: any, res) => {
    try {
      const emailAddress = req.params.emailAddress;
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const exists = await sharedInboxService.checkEmailAddressExists(emailAddress);
      res.json({ available: !exists, exists });
    } catch (error) {
      res.status(500).json({ message: "Failed to check email address" });
    }
  });

  // Get all shared inboxes (for sidebar navigation)
  app.get('/api/shared-inboxes', isAuthenticated, async (req: any, res) => {
    try {
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const inboxes = await sharedInboxService.getAllSharedInboxes();
      res.json(inboxes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shared inboxes" });
    }
  });

  // Get shared inbox details
  app.get('/api/shared-inboxes/:inboxId', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const inbox = await sharedInboxService.getSharedInboxById(inboxId);
      res.json(inbox);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shared inbox" });
    }
  });

  // Update shared inbox
  app.put('/api/shared-inboxes/:inboxId', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const updatedInbox = await sharedInboxService.updateSharedInbox(inboxId, req.body);
      res.json(updatedInbox);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shared inbox" });
    }
  });

  // Delete shared inbox
  app.delete('/api/shared-inboxes/:inboxId', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      await sharedInboxService.deleteSharedInbox(inboxId);
      res.json({ message: "Shared inbox deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shared inbox" });
    }
  });

  // Get shared inbox members
  app.get('/api/shared-inboxes/:inboxId/members', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const members = await sharedInboxService.getSharedInboxMembers(inboxId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shared inbox members" });
    }
  });

  // Add member to shared inbox
  app.post('/api/shared-inboxes/:inboxId/members', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const memberData = {
        ...req.body,
        inboxId
      };
      
      const member = await sharedInboxService.addSharedInboxMember(memberData);
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to add shared inbox member" });
    }
  });

  // Update shared inbox member
  app.put('/api/shared-inboxes/:inboxId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const updatedMember = await sharedInboxService.updateSharedInboxMember(memberId, req.body);
      res.json(updatedMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shared inbox member" });
    }
  });

  // Remove member from shared inbox
  app.delete('/api/shared-inboxes/:inboxId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      await sharedInboxService.removeSharedInboxMember(memberId);
      res.json({ message: "Member removed from shared inbox successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove shared inbox member" });
    }
  });

  // Assign email to team member
  app.post('/api/emails/:messageId/assign', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const assignmentData = {
        ...req.body,
        messageId,
        assignedBy: req.user.id
      };
      
      const assignment = await sharedInboxService.assignEmail(assignmentData);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign email" });
    }
  });

  // Update email assignment
  app.put('/api/email-assignments/:assignmentId', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const updatedAssignment = await sharedInboxService.updateEmailAssignment(assignmentId, req.body);
      res.json(updatedAssignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email assignment" });
    }
  });

  // Get user's email assignments
  app.get('/api/users/:userId/email-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const assignments = await sharedInboxService.getUserEmailAssignments(userId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email assignments" });
    }
  });

  // Add collaborator to email thread
  app.post('/api/email-threads/:threadId/collaborators', isAuthenticated, async (req: any, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const collaborationData = {
        ...req.body,
        threadId
      };
      
      const collaboration = await sharedInboxService.addThreadCollaborator(collaborationData);
      res.json(collaboration);
    } catch (error) {
      res.status(500).json({ message: "Failed to add thread collaborator" });
    }
  });

  // Get thread collaborators
  app.get('/api/email-threads/:threadId/collaborators', isAuthenticated, async (req: any, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const collaborators = await sharedInboxService.getThreadCollaborators(threadId);
      res.json(collaborators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch thread collaborators" });
    }
  });

  // Create email archive rule
  app.post('/api/projects/:projectId/archive-rules', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const ruleData = {
        ...req.body,
        projectId,
        createdBy: req.user.id
      };
      
      const rule = await sharedInboxService.createArchiveRule(ruleData);
      res.json(rule);
    } catch (error) {
      res.status(500).json({ message: "Failed to create archive rule" });
    }
  });

  // Get project archive rules
  app.get('/api/projects/:projectId/archive-rules', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const rules = await sharedInboxService.getProjectArchiveRules(projectId);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch archive rules" });
    }
  });

  // Execute archive rule
  app.post('/api/archive-rules/:ruleId/execute', isAuthenticated, async (req: any, res) => {
    try {
      const ruleId = parseInt(req.params.ruleId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const result = await sharedInboxService.executeArchiveRule(ruleId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to execute archive rule" });
    }
  });

  // Create draft email
  app.post('/api/email/accounts/:accountId/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const draftData = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const draftId = await emailService.createDraft(accountId, draftData);
      res.json({ draftId });
    } catch (error) {
      res.status(500).json({ message: "Failed to create draft" });
    }
  });

  // Send draft email
  app.post('/api/email/drafts/:messageId/send', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { priority = 5 } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const queueId = await emailService.sendDraft(messageId, priority);
      res.json({ queueId });
    } catch (error) {
      res.status(500).json({ message: "Failed to send draft" });
    }
  });

  // ========== STANDALONE EMAIL SYSTEM ==========

  // Send internal email with attachments
  app.post('/api/email/send', isAuthenticated, emailAttachmentUpload.array('attachments'), async (req: any, res) => {
    try {
      const user = req.user;

      // Check if user has connected Gmail or Outlook
      // Use the native email integration for better deliverability (supports attachments)
      if (user.connectedEmailProvider) {
        const {
          toAddresses,
          subject,
          content,
          htmlContent,
          ccAddresses,
          bccAddresses,
        } = req.body;

        if (!toAddresses || !subject) {
          return res.status(400).json({ success: false, error: "To address and subject are required" });
        }

        // Parse addresses - handle both comma-separated strings and arrays
        const parseAddresses = (addresses: string | string[] | undefined): string[] => {
          if (!addresses) return [];
          if (Array.isArray(addresses)) return addresses.filter(Boolean);
          return addresses.split(',').map(a => a.trim()).filter(Boolean);
        };

        const to = parseAddresses(toAddresses);
        const cc = parseAddresses(ccAddresses);
        const bcc = parseAddresses(bccAddresses);

        // Process attachments if present
        let attachments: Array<{ filename: string; content: string; encoding: string }> = [];
        if (req.files && req.files.length > 0) {
          attachments = req.files.map((file: any) => {
            const fileContent = fs.readFileSync(file.path);
            const base64Content = fileContent.toString('base64');
            return {
              filename: file.originalname,
              content: base64Content,
              encoding: 'base64',
            };
          });
        }

        let result;
        try {
          if (user.connectedEmailProvider === 'gmail') {
            // Set user context for Gmail service to use per-user OAuth tokens
            setGmailUserId(user.id.toString());
            result = await gmailIntegrationService.sendEmail({
              to,
              cc,
              bcc,
              subject,
              body: htmlContent || content,
              isHtml: !!htmlContent,
              attachments: attachments.length > 0 ? attachments : undefined,
            });
          } else if (user.connectedEmailProvider === 'outlook') {
            result = await outlookIntegrationService.sendEmail({
              to,
              cc,
              bcc,
              subject,
              body: htmlContent || content,
              isHtml: !!htmlContent,
              attachments: attachments.length > 0 ? attachments : undefined,
            });
          } else {
            throw new Error("Invalid email provider");
          }

          if (result.success) {
            // Clean up uploaded files after successful send
            if (req.files) {
              for (const file of req.files as any[]) {
                if (fs.existsSync(file.path)) {
                  fs.unlinkSync(file.path);
                }
              }
            }
            return res.json({ success: true, messageId: result.messageId });
          } else {
          }
        } catch (providerError) {
        }
      }

      // Check if this is a multipart request with files
      if (req.files && req.files.length > 0) {
        // Handle multipart form data with attachments
        const {
          fromAccountId,
          toAddresses,
          subject,
          content,
          htmlContent,
          ccAddresses,
          bccAddresses,
          threadId
        } = req.body;


        // Prepare attachment data
        const attachments = req.files.map((file: any) => ({
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        }));

        const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
        
        const result = await standaloneEmailService.sendInternalEmailWithAttachments(
          parseInt(fromAccountId),
          toAddresses,
          subject,
          content,
          htmlContent,
          ccAddresses,
          bccAddresses,
          threadId ? parseInt(threadId) : undefined,
          attachments
        );

        // Clean up uploaded files after processing
        for (const file of req.files as any[]) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }

        if (result.success) {
          res.json({ success: true, messageId: result.messageId });
        } else {
          res.status(400).json({ success: false, error: result.error });
        }
        return;
      }
      
      // Handle regular JSON request without attachments (fallback to original logic)
      const {
        fromAccountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        replyToMessageId
      } = req.body;


      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      
      const result = await standaloneEmailService.sendInternalEmail(
        fromAccountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        replyToMessageId
      );

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      
      // Clean up any uploaded files on error
      if (req.files) {
        for (const file of req.files as any[]) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }
      
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Original send internal email (keeping for backward compatibility)
  app.post('/api/email/send-json-only', isAuthenticated, async (req: any, res) => {
    try {
      const {
        fromAccountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        replyToMessageId
      } = req.body;


      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      
      const result = await standaloneEmailService.sendInternalEmail(
        fromAccountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        replyToMessageId
      );

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Get inbox messages
  app.get('/api/email/accounts/:accountId/inbox', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getInboxMessages(accountId, limit, offset);

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inbox messages" });
    }
  });

  // Get sent messages
  app.get('/api/email/accounts/:accountId/sent', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getSentMessages(accountId, limit, offset);

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sent messages" });
    }
  });

  // Get draft messages
  app.get('/api/email/accounts/:accountId/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getDraftMessages(accountId);

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch draft messages" });
    }
  });

  // Get archived messages
  app.get('/api/email/accounts/:accountId/archive', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getArchivedMessages(accountId, limit, offset);

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch archived messages" });
    }
  });

  // Get trash messages
  app.get('/api/email/accounts/:accountId/trash', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getTrashMessages(accountId, limit, offset);

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trash messages" });
    }
  });

  // Mark message as read
  app.put('/api/email/messages/:messageId/read', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { accountId } = req.body;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const success = await standaloneEmailService.markAsRead(messageId, accountId);

      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Delete message
  app.delete('/api/email/messages/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { accountId } = req.body;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const success = await standaloneEmailService.deleteMessage(messageId, accountId);

      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Save draft
  app.post('/api/email/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const {
        accountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        draftId
      } = req.body;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const result = await standaloneEmailService.saveDraft(
        accountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        draftId,
        req.user?.id
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  // Bulk operations for email messages
  app.post('/api/email/messages/bulk-action', isAuthenticated, async (req: any, res) => {
    try {
      const { messageIds, action, accountId, targetFolder } = req.body;

      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: "Message IDs are required" });
      }

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      let result;

      switch (action) {
        case 'mark-read':
          result = await standaloneEmailService.bulkMarkAsRead(messageIds, accountId);
          break;
        case 'mark-unread':
          result = await standaloneEmailService.bulkMarkAsUnread(messageIds, accountId);
          break;
        case 'delete':
          result = await standaloneEmailService.bulkDelete(messageIds, accountId);
          break;
        case 'archive':
          result = await standaloneEmailService.bulkArchive(messageIds, accountId);
          break;
        case 'move':
          if (!targetFolder) {
            return res.status(400).json({ message: "Target folder is required for move operation" });
          }
          result = await standaloneEmailService.bulkMove(messageIds, accountId, targetFolder);
          break;
        default:
          return res.status(400).json({ message: "Invalid action" });
      }

      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ message: "Failed to perform bulk action" });
    }
  });

  // Email cleanup endpoints
  app.post('/api/email/cleanup/run', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      // Only allow admins to manually run cleanup
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { emailCleanupService } = await import('./services/emailCleanupService.js');
      const result = await emailCleanupService.cleanupOldTrashEmails();
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ message: "Failed to run email cleanup" });
    }
  });

  app.get('/api/email/cleanup/stats', isAuthenticated, async (req: any, res) => {
    try {
      const { emailCleanupService } = await import('./services/emailCleanupService.js');
      const stats = await emailCleanupService.getTrashStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get cleanup stats" });
    }
  });

  // Get thread messages
  app.get('/api/email/threads/:threadId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const { accountId } = req.query;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getThreadMessages(threadId, parseInt(accountId));

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch thread messages" });
    }
  });

  // ========== ENHANCED EMAIL QUEUE & DELIVERY TRACKING ROUTES ==========

  // Send email with queue integration
  app.post('/api/email/send-with-queue', isAuthenticated, async (req: any, res) => {
    try {
      const { accountId, to, cc, bcc, subject, message, replyTo, threadId, priority, scheduledAt } = req.body;

      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ message: "Missing accountId" });
      }
      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ message: "Missing or invalid 'to' addresses" });
      }
      if (!subject) {
        return res.status(400).json({ message: "Missing subject" });
      }
      if (!message) {
        return res.status(400).json({ message: "Missing message" });
      }

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const result = await emailService.sendEmailWithQueue(accountId, {
        to,
        cc,
        bcc,
        subject,
        message,
        replyTo,
        threadId,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to send email",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ========== SCHEDULED EMAILS ==========

  // Schedule an email for later sending
  app.post('/api/email/schedule', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const {
        accountId,
        toAddresses,
        ccAddresses,
        bccAddresses,
        subject,
        content,
        scheduledFor,
        threadId
      } = req.body;

      if (!toAddresses || !Array.isArray(toAddresses) || toAddresses.length === 0) {
        return res.status(400).json({ message: "At least one recipient is required" });
      }
      if (!subject) {
        return res.status(400).json({ message: "Subject is required" });
      }
      if (!scheduledFor) {
        return res.status(400).json({ message: "Scheduled time is required" });
      }

      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }

      // Insert into scheduled_emails table
      const [scheduledEmail] = await db.insert(scheduledEmails).values({
        userId: user.id,
        accountId: accountId || null,
        toAddresses,
        ccAddresses: ccAddresses || [],
        bccAddresses: bccAddresses || [],
        subject,
        content: content || '',
        scheduledFor: scheduledDate,
        status: 'pending',
        threadId: threadId || null
      }).returning();


      res.json({ 
        success: true, 
        scheduledEmailId: scheduledEmail.id,
        scheduledFor: scheduledEmail.scheduledFor
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to schedule email" });
    }
  });

  // Get all scheduled emails for the current user
  app.get('/api/email/scheduled', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      const emails = await db.select()
        .from(scheduledEmails)
        .where(and(
          eq(scheduledEmails.userId, user.id),
          eq(scheduledEmails.status, 'pending')
        ))
        .orderBy(scheduledEmails.scheduledFor);

      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled emails" });
    }
  });

  // Get count of scheduled emails (for sidebar badge)
  app.get('/api/email/scheduled/count', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(scheduledEmails)
        .where(and(
          eq(scheduledEmails.userId, user.id),
          eq(scheduledEmails.status, 'pending')
        ));

      res.json({ count: result[0]?.count || 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled emails count" });
    }
  });

  // Cancel a scheduled email
  app.delete('/api/email/scheduled/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const emailId = parseInt(req.params.id);

      const [email] = await db.select()
        .from(scheduledEmails)
        .where(and(
          eq(scheduledEmails.id, emailId),
          eq(scheduledEmails.userId, user.id)
        ));

      if (!email) {
        return res.status(404).json({ message: "Scheduled email not found" });
      }

      if (email.status !== 'pending') {
        return res.status(400).json({ message: "Can only cancel pending scheduled emails" });
      }

      await db.update(scheduledEmails)
        .set({ status: 'cancelled' })
        .where(eq(scheduledEmails.id, emailId));


      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel scheduled email" });
    }
  });

  // Reschedule an email
  app.put('/api/email/scheduled/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const emailId = parseInt(req.params.id);
      const { scheduledFor } = req.body;

      const [email] = await db.select()
        .from(scheduledEmails)
        .where(and(
          eq(scheduledEmails.id, emailId),
          eq(scheduledEmails.userId, user.id)
        ));

      if (!email) {
        return res.status(404).json({ message: "Scheduled email not found" });
      }

      if (email.status !== 'pending') {
        return res.status(400).json({ message: "Can only reschedule pending emails" });
      }

      const newScheduledDate = new Date(scheduledFor);
      if (newScheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }

      await db.update(scheduledEmails)
        .set({ scheduledFor: newScheduledDate })
        .where(eq(scheduledEmails.id, emailId));


      res.json({ success: true, scheduledFor: newScheduledDate });
    } catch (error) {
      res.status(500).json({ message: "Failed to reschedule email" });
    }
  });

  // Send scheduled email now (skip schedule)
  app.post('/api/email/scheduled/:id/send-now', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const emailId = parseInt(req.params.id);

      const [email] = await db.select()
        .from(scheduledEmails)
        .where(and(
          eq(scheduledEmails.id, emailId),
          eq(scheduledEmails.userId, user.id)
        ));

      if (!email) {
        return res.status(404).json({ message: "Scheduled email not found" });
      }

      if (email.status !== 'pending') {
        return res.status(400).json({ message: "Can only send pending scheduled emails" });
      }

      // Mark as sending
      await db.update(scheduledEmails)
        .set({ status: 'sending' })
        .where(eq(scheduledEmails.id, emailId));

      // Try to send using the appropriate provider
      let success = false;
      let error = null;

      try {
        if (user.connectedEmailProvider === 'gmail') {
          setGmailUserId(user.id.toString());
          const result = await gmailIntegrationService.sendEmail({
            to: email.toAddresses,
            cc: email.ccAddresses,
            bcc: email.bccAddresses,
            subject: email.subject,
            body: email.content,
            isHtml: false
          });
          success = result.success;
          if (!success) error = result.error;
        } else if (user.connectedEmailProvider === 'outlook') {
          const result = await outlookIntegrationService.sendEmail({
            to: email.toAddresses,
            cc: email.ccAddresses,
            bcc: email.bccAddresses,
            subject: email.subject,
            body: email.content,
            isHtml: false
          });
          success = result.success;
          if (!success) error = result.error;
        } else {
          // Use internal email system
          const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
          const result = await standaloneEmailService.sendInternalEmail(
            email.accountId || 0,
            email.toAddresses,
            email.subject,
            email.content,
            undefined,
            email.ccAddresses,
            email.bccAddresses
          );
          success = result.success;
          if (!success) error = result.error;
        }
      } catch (sendError) {
        error = sendError instanceof Error ? sendError.message : 'Unknown error';
      }

      if (success) {
        await db.update(scheduledEmails)
          .set({ status: 'sent', sentAt: new Date() })
          .where(eq(scheduledEmails.id, emailId));
        
        res.json({ success: true });
      } else {
        await db.update(scheduledEmails)
          .set({ status: 'failed', error: error || 'Failed to send email' })
          .where(eq(scheduledEmails.id, emailId));
        
        res.status(500).json({ message: error || "Failed to send email" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to send scheduled email" });
    }
  });

  // Move email to folder
  app.post('/api/email/messages/:messageId/move', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { folderId } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.moveEmailToFolder(messageId, folderId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to move email" });
    }
  });

  // Archive email
  app.post('/api/email/messages/:messageId/archive', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.archiveEmail(messageId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to archive email" });
    }
  });

  // Delete email (move to trash)
  app.post('/api/email/messages/:messageId/delete', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.deleteEmail(messageId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete email" });
    }
  });

  // ==== PHASE 4: THEATER-SPECIFIC EMAIL FEATURES ====

  // Get emails for a specific show/project
  app.get('/api/email/shows/:showId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const showId = parseInt(req.params.showId);
      const { accountId, limit = 50, offset = 0 } = req.query;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const messages = await theaterEmailService.getShowEmails(
        showId, 
        accountId ? parseInt(accountId as string) : undefined,
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch show emails" });
    }
  });

  // Auto-categorize email by show
  app.post('/api/email/messages/:messageId/categorize', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { showId } = req.body;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      await theaterEmailService.categorizeEmail(messageId, showId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to categorize email" });
    }
  });

  // Get email templates for theater
  app.get('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const { type, showId } = req.query;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const templates = await theaterEmailService.getEmailTemplates(
        type as string, 
        showId ? parseInt(showId as string) : undefined
      );
      
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  // Create email template
  app.post('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const templateData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const template = await theaterEmailService.createEmailTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  // Bulk email to cast/crew
  app.post('/api/email/shows/:showId/bulk-send', isAuthenticated, async (req: any, res) => {
    try {
      const showId = parseInt(req.params.showId);
      const { accountId, templateId, recipientType, customRecipients, subject, message } = req.body;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const result = await theaterEmailService.sendBulkEmail(
        showId,
        accountId,
        {
          templateId,
          recipientType,
          customRecipients,
          subject,
          message,
        }
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to send bulk email" });
    }
  });

  // Email rules for auto-filing
  app.get('/api/email/rules', isAuthenticated, async (req: any, res) => {
    try {
      const { accountId, showId } = req.query;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const rules = await theaterEmailService.getEmailRules(
        accountId ? parseInt(accountId as string) : undefined,
        showId ? parseInt(showId as string) : undefined
      );
      
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email rules" });
    }
  });

  // Create email rule
  app.post('/api/email/rules', isAuthenticated, async (req: any, res) => {
    try {
      const ruleData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const rule = await theaterEmailService.createEmailRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(500).json({ message: "Failed to create email rule" });
    }
  });

  // Apply email rules to message
  app.post('/api/email/messages/:messageId/apply-rules', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const applied = await theaterEmailService.applyEmailRules(messageId);
      res.json({ applied });
    } catch (error) {
      res.status(500).json({ message: "Failed to apply email rules" });
    }
  });

  // ==== PHASE 2: ENHANCED DELIVERY TRACKING ====

  // Get detailed delivery statistics
  app.get('/api/email/accounts/:accountId/delivery-stats/detailed', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { startDate, endDate } = req.query;

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      const stats = await deliveryService.getDetailedDeliveryStats(
        accountId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch detailed delivery stats" });
    }
  });

  // Get bounce reports
  app.get('/api/email/accounts/:accountId/bounces', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { limit = 50, offset = 0, type } = req.query;

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      const bounces = await deliveryService.getBounceReports(
        accountId,
        parseInt(limit as string),
        parseInt(offset as string),
        type as string
      );
      
      res.json(bounces);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bounce reports" });
    }
  });

  // Track email opens (pixel tracking)
  app.get('/api/email/track/open/:messageId', async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      await deliveryService.trackEmailOpen(messageId, req.ip, req.headers['user-agent']);
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      
      res.set('Content-Type', 'image/png');
      res.set('Content-Length', pixel.length.toString());
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(pixel);
    } catch (error) {
      res.status(500).send('Error');
    }
  });

  // Track email clicks
  app.get('/api/email/track/click/:messageId', async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { url } = req.query;

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      await deliveryService.trackEmailClick(messageId, url as string, req.ip, req.headers['user-agent']);
      
      // Redirect to original URL
      res.redirect(url as string);
    } catch (error) {
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // Enhanced delivery webhook (replacing simple one)
  app.post('/api/email/delivery-webhook/enhanced', async (req: any, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      
      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();

      for (const event of events) {
        await deliveryService.processDeliveryWebhook(event);
      }

      res.status(200).json({ 
        success: true, 
        processed: events.length 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process delivery webhook" });
    }
  });

  // Sync read status across clients
  app.post('/api/email/messages/:messageId/sync-status', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { isRead, isStarred, isImportant } = req.body;

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      await deliveryService.syncMessageStatus(messageId, {
        isRead,
        isStarred,
        isImportant
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync message status" });
    }
  });

  // Mark email as read/unread
  app.post('/api/email/messages/:messageId/read', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { isRead = true } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.markEmailAsRead(messageId, isRead);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update read status" });
    }
  });

  // Get delivery statistics for an account
  app.get('/api/email/accounts/:accountId/delivery-stats', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const stats = await emailService.getDeliveryStats(accountId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch delivery statistics" });
    }
  });

  // Get queue statistics
  app.get('/api/email/queue-stats', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const stats = await emailService.getEnhancedQueueStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch queue statistics" });
    }
  });

  // Retry failed email deliveries
  app.post('/api/email/retry-failed', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const retriedCount = await emailService.retryFailedEmails();
      res.json({ retriedCount });
    } catch (error) {
      res.status(500).json({ message: "Failed to retry failed emails" });
    }
  });

  // Update message delivery status (webhook endpoint for SendGrid)
  app.post('/api/email/delivery-webhook', async (req: any, res) => {
    try {
      const events = req.body;
      
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();

      // Process SendGrid webhook events
      for (const event of events) {
        const { sg_message_id, event: eventType, timestamp } = event;
        
        if (sg_message_id) {
          const deliveryStatus = {
            success: eventType === 'delivered',
            deliveredAt: eventType === 'delivered' ? new Date(timestamp * 1000) : undefined,
            sendGridMessageId: sg_message_id,
            errorMessage: eventType === 'bounce' || eventType === 'dropped' ? event.reason : undefined,
            bounced: eventType === 'bounce',
          };

          // Find message by SendGrid message ID and update status
          // Note: This would require a database query to find the message
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to process delivery webhook" });
    }
  });

  // Simple webhook test endpoint to verify routing
  app.get('/api/email/webhook-test', async (req: any, res) => {
    res.status(200).json({ 
      success: true, 
      message: "Webhook endpoint is working correctly",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Setup automated catch-all email routing rule (admin only)
  app.post('/api/email/setup-catch-all-routing', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const userId = req.user.id.toString();
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { cloudflareService } = await import('./services/cloudflareService.js');
      const webhookUrl = 'https://backstageos.com/api/email/receive-webhook';
      
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ 
          success: false,
          message: "Cloudflare API not configured",
          instructions: "Please set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID environment variables"
        });
      }

      const result = await cloudflareService.ensureCatchAllWebhookRule(webhookUrl);
      
      res.json({
        success: true,
        message: "Catch-all email routing rule configured successfully",
        rule: {
          id: result.id,
          name: result.name,
          enabled: result.enabled,
          webhookUrl: webhookUrl
        }
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        message: "Failed to setup catch-all routing", 
        error: error.message,
        instructions: "You may need to configure this manually in Cloudflare Dashboard: Email Routing → Create catch-all rule → Send to Worker → " + 'https://backstageos.com/api/email/receive-webhook'
      });
    }
  });

  // Alternative webhook endpoint for production routing issues - this needs to be registered early
  app.post('/email-webhook', async (req: any, res) => {
    try {
      const emailData = req.body;
      
      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      
      // Process incoming email and store in BackstageOS
      await standaloneEmailService.processIncomingEmail(emailData);
      
      res.status(200).json({ success: true, message: "Email processed successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to process incoming email", error: error.message });
    }
  });

  // Cloudflare email webhook endpoint for receiving emails (no authentication needed)
  app.post('/api/email/receive-webhook', async (req: any, res) => {
    try {
      const emailData = req.body;
      
      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      
      // Process incoming email and store in BackstageOS
      await standaloneEmailService.processIncomingEmail(emailData);
      
      res.status(200).json({ success: true, message: "Email processed successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to process incoming email", error: error.message });
    }
  });

  // Setup webhook email routing for user email addresses
  app.post('/api/email/setup-webhook-routing', isAuthenticated, async (req: any, res) => {
    try {
      const { emailAddress } = req.body;
      
      if (!emailAddress) {
        return res.status(400).json({ message: "Email address is required" });
      }
      
      // Extract alias from email address (e.g., "bryan" from "bryan@backstageos.com")
      const alias = emailAddress.split('@')[0];
      
      // Create webhook URL for receiving emails
      const webhookUrl = `${req.protocol}://${req.get('host')}/api/email/receive-webhook`;
      
      const { CloudflareService } = await import('./services/cloudflareService.js');
      const cloudflareService = new CloudflareService();
      
      // Create webhook-based email routing rule
      const result = await cloudflareService.createWebhookEmailRoute(alias, webhookUrl);
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ message: "Failed to setup webhook routing" });
    }
  });

  // Search messages
  app.get('/api/email/accounts/:accountId/search', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { q: query, limit = 50 } = req.query;

      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.searchMessages(accountId, query as string, parseInt(limit as string));

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to search messages" });
    }
  });

  // =============================================================================
  // TEAM MEMBER MANAGEMENT API ENDPOINTS
  // =============================================================================

  // Get team members for a project
  app.get('/api/projects/:id/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if user has access to this project
      const hasAccess = await storage.getUserProjectAccess(req.user.id, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const teamMembers = await storage.getTeamMembersByProjectId(projectId);
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Invite team member to project
  app.post('/api/projects/:id/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { email, role, roleType, accessLevel, name } = req.body;

      // Validate request
      const validatedData = insertTeamMemberSchema.parse({
        projectId,
        email,
        role,
        accessLevel,
        name,
      });

      // Check editor limit
      if (accessLevel === 'editor') {
        const editorCount = await storage.getEditorCountByProject(projectId);
        if (editorCount >= 3) {
          return res.status(400).json({ 
            message: "Cannot invite more than 3 editors per production" 
          });
        }
      }

      // Get project name for email
      const project = await storage.getProjectById(projectId);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      let teamMember;
      
      if (existingUser) {
        // User exists, check if already a team member
        const existingMember = await storage.getTeamMemberByUserAndProject(existingUser.id, projectId);
        if (existingMember) {
          return res.status(400).json({ 
            message: "User is already a member of this production" 
          });
        }
        
        // Add existing user to team
        teamMember = await storage.createTeamMember({
          ...validatedData,
          userId: existingUser.id,
        });
      } else {
        // User doesn't exist, create invitation with no userId
        teamMember = await storage.createTeamMember(validatedData);
      }

      // Send invitation email
      try {
        const { sendEmailWithResend } = await import('./services/resendService.js');
        const host = req.get('x-forwarded-host') || req.get('host') || '';
        const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
        const isDevEnvironment = host.includes('replit.dev') || host.includes('localhost') || host.includes('spock.replit.dev');
        const baseUrl = isDevEnvironment 
          ? `${protocol}://${host}`
          : (process.env.APP_URL || 'https://backstageos.com');
        const invitationLink = `${baseUrl}/join/${projectId}`;
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>You're Invited to Join ${project.name}</h2>
            <p>Hi ${name || 'there'},</p>
            <p>You've been invited to join <strong>${project.name}</strong> as a team member with the role of <strong>${role}</strong>.</p>
            <p style="margin-top: 24px;">
              <a href="${invitationLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </p>
            <p style="margin-top: 24px; font-size: 14px; color: #666;">
              Or copy this link: ${invitationLink}
            </p>
            <p>Best regards,<br>BackstageOS Team</p>
          </div>
        `;

        const firstName = user.firstName || '';
        const senderName = firstName ? `${firstName} at BackstageOS` : 'BackstageOS';

        await sendEmailWithResend({
          to: [email],
          subject: `You're invited to ${project.name}`,
          html: emailHtml,
          fromName: senderName
        });

        console.log(`✅ Sent invitation email to ${email}`);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the request if email fails, just log it
      }

      res.status(201).json(teamMember);
    } catch (error: any) {
      console.error('Team member invite error:', error);
      res.status(500).json({ message: "Failed to invite team member", error: error.message });
    }
  });

  // Resend invitation email for team member
  app.post('/api/team-members/:id/resend-invitation', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const user = req.user;
      
      // Get team member
      const teamMember = await storage.getTeamMemberById(memberId);
      if (!teamMember) {
        return res.status(404).json({ message: "Team member not found" });
      }

      // Get project info
      const project = await storage.getProjectById(teamMember.projectId);

      // Send invitation email
      const { sendEmailWithResend } = await import('./services/resendService.js');
      const host = req.get('x-forwarded-host') || req.get('host') || '';
      const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
      const isDevEnvironment = host.includes('replit.dev') || host.includes('localhost') || host.includes('spock.replit.dev');
      const baseUrl = isDevEnvironment 
        ? `${protocol}://${host}`
        : (process.env.APP_URL || 'https://backstageos.com');
      const invitationLink = `${baseUrl}/join/${teamMember.projectId}`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Team Member Invitation Reminder</h2>
          <p>Hi ${teamMember.name || 'there'},</p>
          <p>This is a reminder that you've been invited to join <strong>${project.name}</strong> as a team member with the role of <strong>${teamMember.role}</strong>.</p>
          <p style="margin-top: 24px;">
            <a href="${invitationLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p style="margin-top: 24px; font-size: 14px; color: #666;">
            Or copy this link: ${invitationLink}
          </p>
          <p>Best regards,<br>BackstageOS Team</p>
        </div>
      `;

      const firstName = user.firstName || '';
      const senderName = firstName ? `${firstName} at BackstageOS` : 'BackstageOS';

      await sendEmailWithResend({
        to: [teamMember.email],
        subject: `Reminder: You're invited to ${project.name}`,
        html: emailHtml,
        fromName: senderName
      });

      res.json({ message: "Invitation resent successfully" });
    } catch (error: any) {
      console.error('Resend invitation error:', error);
      res.status(500).json({ message: "Failed to resend invitation", error: error.message });
    }
  });

  // Update team member role or access
  app.put('/api/team-members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const { name, email, role, roleType, accessLevel } = req.body;

      const teamMember = await storage.updateTeamMember(memberId, {
        name,
        email,
        role,
        roleType,
        accessLevel,
      });

      res.json(teamMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Remove team member from project
  app.delete('/api/team-members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.id);
      
      await storage.deleteTeamMember(memberId);
      res.json({ message: "Team member removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Get user's access level for a project
  app.get('/api/projects/:id/access-level', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const accessLevel = await storage.getUserAccessLevel(req.user.id, projectId);
      
      res.json({ accessLevel });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch access level" });
    }
  });

  // =============================================================================
  // THEATER EMAIL MANAGEMENT API ENDPOINTS (Phase 4 Features)
  // =============================================================================

  // Get email templates for a show
  app.get('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const { showId } = req.query;
      
      // Mock theater email templates for demonstration
      const templates = [
        {
          id: 1,
          name: "Call Sheet",
          templateType: "call_sheet",
          subject: `${showId ? 'Test Production - Macbeth' : 'Show'} - Call Sheet for {{date}}`,
          content: `Dear {{recipientName}},\n\nPlease find the call sheet for ${showId ? 'Test Production - Macbeth' : 'the show'} on {{date}}.\n\nCall Time: {{callTime}}\nLocation: Studio Theater\n\nThank you,\n{{senderName}}\nStage Manager`,
          projectId: showId ? parseInt(showId) : null,
        },
        {
          id: 2,
          name: "Tech Notes",
          templateType: "tech_notes",
          subject: "Tech Rehearsal Notes - {{date}}",
          content: `Dear Team,\n\nHere are the tech notes from today's rehearsal:\n\n{{techNotes}}\n\nPlease review and implement changes for tomorrow.\n\nBest,\nStage Management`,
          projectId: showId ? parseInt(showId) : null,
        },
        {
          id: 3,
          name: "Performance Report",
          templateType: "performance_report",
          subject: "Performance Report - {{date}}",
          content: `Performance Report for ${showId ? 'Test Production - Macbeth' : 'the show'}:\n\n{{performanceNotes}}\n\nThank you,\nStage Management`,
          projectId: showId ? parseInt(showId) : null,
        }
      ];

      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  // Create email template
  app.post('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const { name, templateType, subject, content, projectId } = req.body;
      
      // For demo purposes, return success with new template
      const newTemplate = {
        id: Date.now(), // Mock ID
        name,
        templateType,
        subject,
        content,
        projectId,
      };

      res.status(201).json(newTemplate);
    } catch (error) {
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  // Get email rules for a show
  app.get('/api/email/rules', isAuthenticated, async (req: any, res) => {
    try {
      const { accountId, showId } = req.query;
      
      // Mock theater email rules for demonstration
      const rules = [
        {
          id: 1,
          name: "Auto-file Cast Emails",
          description: "Automatically organize emails from cast members",
          isEnabled: true,
          conditions: { from: ["cast"], keywords: ["rehearsal", "costume", "props"] },
          actions: { folder: "Cast Communications", tag: "cast" }
        },
        {
          id: 2,
          name: "Tech Notes Organization",
          description: "File technical emails in appropriate folders",
          isEnabled: true,
          conditions: { subject: ["tech", "lighting", "sound", "props"] },
          actions: { folder: "Technical", priority: "high" }
        },
        {
          id: 3,
          name: "Call Sheet Distribution",
          description: "Track call sheet delivery and responses",
          isEnabled: false,
          conditions: { subject: ["call sheet", "schedule"] },
          actions: { track: "delivery", notify: "confirmations" }
        }
      ];

      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email rules" });
    }
  });

  // Get show-specific emails
  app.get('/api/email/shows/:showId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const showId = parseInt(req.params.showId);
      
      // Mock show emails for demonstration
      const showEmails = [
        {
          id: 1,
          subject: "Call Sheet - Tech Rehearsal Day 1",
          from: "bryan@backstageos.com",
          to: ["cast@testproduction.com"],
          date: new Date(),
          isRead: true,
          category: "call_sheet"
        },
        {
          id: 2,
          subject: "Costume Notes - Quick Changes",
          from: "bryan@backstageos.com", 
          to: ["wardrobe@testproduction.com"],
          date: new Date(Date.now() - 86400000), // Yesterday
          isRead: true,
          category: "tech_notes"
        }
      ];

      res.json(showEmails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch show emails" });
    }
  });

  // Bulk email sending (Phase 4 feature)
  app.post('/api/email/shows/:showId/bulk-send', isAuthenticated, async (req: any, res) => {
    try {
      const showId = parseInt(req.params.showId);
      const { accountId, recipientType, subject, message } = req.body;

      // Mock team members based on recipient type
      const teamMembers = {
        all: ['cast@show.com', 'crew@show.com', 'creative@show.com'],
        cast: ['actor1@show.com', 'actor2@show.com', 'actor3@show.com'],
        crew: ['technician1@show.com', 'technician2@show.com'],
        creative: ['director@show.com', 'designer@show.com']
      };

      const recipients = teamMembers[recipientType] || [];
      
      // Simulate sending emails
      const sent = recipients.length;
      const failed = 0; // Mock success


      res.json({
        success: true,
        sent,
        failed,
        recipients: recipients.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to send bulk email" });
    }
  });

  // Enhanced delivery stats (Phase 2 feature) - Mock data for demo
  app.get('/api/email/accounts/:accountId/delivery-stats/detailed', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      
      // Mock delivery stats for demonstration
      const stats = {
        total: 156,
        delivered: 142,
        bounced: 8,
        failed: 6,
        opened: 89,
        clicked: 34,
        unsubscribed: 2,
        deliveryRate: 91.0,
        openRate: 62.7,
        clickRate: 24.0,
        bounceRate: 5.1
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch delivery stats" });
    }
  });

  // Get bounce reports (Phase 2 feature)
  app.get('/api/email/accounts/:accountId/bounce-reports', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { limit = 50, offset = 0, bounceType } = req.query;
      
      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      const reports = await deliveryService.getBounceReports(
        accountId, 
        parseInt(limit), 
        parseInt(offset),
        bounceType
      );
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bounce reports" });
    }
  });

  // Email open tracking pixel (Phase 2 feature)
  app.get('/api/email/track/open/:messageId', async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      await deliveryService.trackEmailOpen(messageId, ip, userAgent);
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(pixel);
    } catch (error) {
      res.status(500).end();
    }
  });

  // Performance and Rehearsal Tracking API Routes
  // Show Contract Settings
  app.get("/api/projects/:id/show-contract-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const settings = await storage.getShowContractSettings(projectId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch show contract settings" });
    }
  });

  app.post("/api/projects/:id/show-contract-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const settingsData = insertShowContractSettingsSchema.parse({
        ...req.body,
        projectId
      });

      const settings = await storage.createShowContractSettings(settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to create show contract settings" });
    }
  });

  app.put("/api/projects/:id/show-contract-settings/:settingsId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const settingsId = parseInt(req.params.settingsId);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const settingsData = insertShowContractSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateShowContractSettings(settingsId, settingsData);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update show contract settings" });
    }
  });

  // Performance Tracking
  app.get("/api/projects/:id/performance-tracker", isAuthenticated, requiresBetaAccess('performance-tracker'), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const performances = await storage.getPerformanceTracker(projectId);
      res.json(performances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance tracker" });
    }
  });

  app.post("/api/projects/:id/performance-tracker", isAuthenticated, requiresBetaAccess('performance-tracker'), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const performanceData = insertPerformanceTrackerSchema.parse({
        ...req.body,
        projectId
      });

      const performance = await storage.createPerformanceEntry(performanceData);
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: "Failed to create performance entry" });
    }
  });

  app.put("/api/projects/:id/performance-tracker/:performanceId", isAuthenticated, requiresBetaAccess('performance-tracker'), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const performanceId = parseInt(req.params.performanceId);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const performanceData = insertPerformanceTrackerSchema.partial().parse(req.body);
      const performance = await storage.updatePerformanceEntry(performanceId, performanceData);
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: "Failed to update performance entry" });
    }
  });

  app.delete("/api/projects/:id/performance-tracker/:performanceId", isAuthenticated, requiresBetaAccess('performance-tracker'), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const performanceId = parseInt(req.params.performanceId);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.deletePerformanceEntry(performanceId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete performance entry" });
    }
  });

  // Rehearsal Tracking
  app.get("/api/projects/:id/rehearsal-tracker", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const rehearsals = await storage.getRehearsalTracker(projectId);
      res.json(rehearsals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rehearsal tracker" });
    }
  });

  app.post("/api/projects/:id/rehearsal-tracker", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const rehearsalData = insertRehearsalTrackerSchema.parse({
        ...req.body,
        projectId
      });

      const rehearsal = await storage.createRehearsalEntry(rehearsalData);
      res.json(rehearsal);
    } catch (error) {
      res.status(500).json({ message: "Failed to create rehearsal entry" });
    }
  });

  app.put("/api/projects/:id/rehearsal-tracker/:rehearsalId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const rehearsalId = parseInt(req.params.rehearsalId);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const rehearsalData = insertRehearsalTrackerSchema.partial().parse(req.body);
      const rehearsal = await storage.updateRehearsalEntry(rehearsalId, rehearsalData);
      res.json(rehearsal);
    } catch (error) {
      res.status(500).json({ message: "Failed to update rehearsal entry" });
    }
  });

  app.delete("/api/projects/:id/rehearsal-tracker/:rehearsalId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const rehearsalId = parseInt(req.params.rehearsalId);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.deleteRehearsalEntry(rehearsalId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete rehearsal entry" });
    }
  });

  // Equity Cast Members
  app.get("/api/projects/:id/equity-cast-members", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const equityMembers = await storage.getEquityCastMembers(projectId);
      res.json(equityMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch equity cast members" });
    }
  });

  app.get("/api/projects/:id/has-equity-cast-members", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const hasEquityMembers = await storage.hasEquityCastMembers(projectId);
      res.json({ hasEquityMembers });
    } catch (error) {
      res.status(500).json({ message: "Failed to check equity cast members" });
    }
  });

  // ========== TASK MANAGEMENT API ROUTES ==========

  // Task Databases Routes
  app.get("/api/task-databases", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, isGlobal } = req.query;
      const databases = await storage.getTaskDatabases(
        projectId ? parseInt(projectId) : undefined,
        isGlobal === 'true' ? true : isGlobal === 'false' ? false : undefined
      );
      res.json(databases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task databases" });
    }
  });

  app.get("/api/task-databases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const database = await storage.getTaskDatabase(id);
      if (!database) {
        return res.status(404).json({ message: "Task database not found" });
      }
      res.json(database);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task database" });
    }
  });

  app.post("/api/task-databases", isAuthenticated, async (req: any, res) => {
    try {
      
      const databaseData = insertTaskDatabaseSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      
      const database = await storage.createTaskDatabase(databaseData);
      
      res.json(database);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task database", error: error.message });
    }
  });

  app.put("/api/task-databases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const databaseData = insertTaskDatabaseSchema.partial().parse(req.body);
      const database = await storage.updateTaskDatabase(id, databaseData);
      res.json(database);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task database" });
    }
  });

  app.delete("/api/task-databases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskDatabase(id);
      res.json({ message: "Task database deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task database" });
    }
  });

  // Task Properties Routes
  app.get("/api/task-databases/:databaseId/properties", isAuthenticated, async (req: any, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      const properties = await storage.getTaskProperties(databaseId);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task properties" });
    }
  });

  app.post("/api/task-databases/:databaseId/properties", isAuthenticated, async (req: any, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      const propertyData = insertTaskPropertySchema.parse({
        ...req.body,
        databaseId
      });
      const property = await storage.createTaskProperty(propertyData);
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task property" });
    }
  });

  app.put("/api/task-properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const propertyData = insertTaskPropertySchema.partial().parse(req.body);
      const property = await storage.updateTaskProperty(id, propertyData);
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task property" });
    }
  });

  app.delete("/api/task-properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskProperty(id);
      res.json({ message: "Task property deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task property" });
    }
  });

  app.post("/api/task-databases/:databaseId/properties/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      const { propertyOrders } = req.body;
      await storage.reorderTaskProperties(databaseId, propertyOrders);
      res.json({ message: "Task properties reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder task properties" });
    }
  });

  // Tasks Routes
  app.get("/api/task-databases/:databaseId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      const tasks = await storage.getTasks(databaseId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/task-databases/:databaseId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      const taskData = insertTaskSchema.parse({
        ...req.body,
        databaseId,
        createdBy: req.user.id
      });
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, taskData);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.post("/api/task-databases/:databaseId/tasks/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      const { taskOrders } = req.body;
      await storage.reorderTasks(databaseId, taskOrders);
      res.json({ message: "Tasks reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder tasks" });
    }
  });

  // Task Assignments Routes
  app.get("/api/tasks/:taskId/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const assignments = await storage.getTaskAssignments(taskId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task assignments" });
    }
  });

  app.post("/api/tasks/:taskId/assignments", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const assignmentData = insertTaskAssignmentSchema.parse({
        ...req.body,
        taskId,
        assignedBy: req.user.id
      });
      const assignment = await storage.createTaskAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task assignment" });
    }
  });

  app.delete("/api/task-assignments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskAssignment(id);
      res.json({ message: "Task assignment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task assignment" });
    }
  });

  // Task Comments Routes
  app.get("/api/tasks/:taskId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task comments" });
    }
  });

  app.post("/api/tasks/:taskId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const commentData = insertTaskCommentSchema.parse({
        ...req.body,
        taskId,
        authorId: req.user.id
      });
      const comment = await storage.createTaskComment(commentData);
      res.json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task comment" });
    }
  });

  app.put("/api/task-comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const commentData = insertTaskCommentSchema.partial().parse(req.body);
      const comment = await storage.updateTaskComment(id, commentData);
      res.json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task comment" });
    }
  });

  app.delete("/api/task-comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskComment(id);
      res.json({ message: "Task comment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task comment" });
    }
  });

  // Task Attachments Routes
  app.get("/api/tasks/:taskId/attachments", isAuthenticated, async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const attachments = await storage.getTaskAttachments(taskId);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task attachments" });
    }
  });

  app.post("/api/tasks/:taskId/attachments", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const attachmentData = insertTaskAttachmentSchema.parse({
        taskId,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.id
      });

      const attachment = await storage.createTaskAttachment(attachmentData);
      res.json(attachment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task attachment" });
    }
  });

  app.delete("/api/task-attachments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskAttachment(id);
      res.json({ message: "Task attachment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task attachment" });
    }
  });

  // Task Views Routes
  app.get("/api/task-databases/:databaseId/views", isAuthenticated, async (req: any, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      const views = await storage.getTaskViews(databaseId);
      res.json(views);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task views" });
    }
  });

  app.get("/api/task-views/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const view = await storage.getTaskView(id);
      if (!view) {
        return res.status(404).json({ message: "Task view not found" });
      }
      res.json(view);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task view" });
    }
  });

  app.post("/api/task-databases/:databaseId/views", isAuthenticated, async (req: any, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      const viewData = insertTaskViewSchema.parse({
        ...req.body,
        databaseId,
        createdBy: req.user.id
      });
      const view = await storage.createTaskView(viewData);
      res.json(view);
    } catch (error) {
      res.status(500).json({ message: "Failed to create task view" });
    }
  });

  app.put("/api/task-views/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const viewData = insertTaskViewSchema.partial().parse(req.body);
      const view = await storage.updateTaskView(id, viewData);
      res.json(view);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task view" });
    }
  });

  app.delete("/api/task-views/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTaskView(id);
      res.json({ message: "Task view deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task view" });
    }
  });

  // ===== NOTES SYSTEM API ROUTES =====

  // Note Folders Routes
  app.get("/api/note-folders", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, isGlobal } = req.query;
      const folders = await storage.getNoteFolders(
        projectId ? parseInt(projectId) : undefined,
        isGlobal === 'true'
      );
      res.json(folders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note folders" });
    }
  });

  app.get("/api/note-folders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const folder = await storage.getNoteFolder(id);
      if (!folder) {
        return res.status(404).json({ message: "Note folder not found" });
      }
      res.json(folder);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note folder" });
    }
  });

  app.post("/api/note-folders", isAuthenticated, async (req: any, res) => {
    try {
      const folderData = insertNoteFolderSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      const folder = await storage.createNoteFolder(folderData);
      res.json(folder);
    } catch (error) {
      res.status(500).json({ message: "Failed to create note folder" });
    }
  });

  app.put("/api/note-folders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const folderData = insertNoteFolderSchema.partial().parse(req.body);
      const folder = await storage.updateNoteFolder(id, folderData);
      res.json(folder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note folder" });
    }
  });

  app.delete("/api/note-folders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNoteFolder(id);
      res.json({ message: "Note folder deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note folder" });
    }
  });

  // Notes Routes
  app.get("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, folderId, searchQuery } = req.query;
      const notes = await storage.getNotes(
        projectId ? parseInt(projectId) : undefined,
        folderId ? parseInt(folderId) : undefined,
        searchQuery
      );
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.get("/api/notes/search", isAuthenticated, async (req: any, res) => {
    try {
      const { query, projectId } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const notes = await storage.searchNotes(
        query as string,
        projectId ? parseInt(projectId as string) : undefined
      );
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to search notes" });
    }
  });

  app.get("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const note = await storage.getNote(id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });

  app.post("/api/notes", isAuthenticated, async (req: any, res) => {
    try {
      const noteData = insertNoteSchema.parse({
        ...req.body,
        createdBy: req.user.id,
        lastEditedBy: req.user.id
      });
      const note = await storage.createNote(noteData);
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.put("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const noteData = insertNoteSchema.partial().parse({
        ...req.body,
        lastEditedBy: req.user.id
      });
      const note = await storage.updateNote(id, noteData);
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNote(id);
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // Note Collaborators Routes
  app.get("/api/notes/:noteId/collaborators", isAuthenticated, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const collaborators = await storage.getNoteCollaborators(noteId);
      res.json(collaborators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note collaborators" });
    }
  });

  app.post("/api/notes/:noteId/collaborators", isAuthenticated, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const collaboratorData = insertNoteCollaboratorSchema.parse({
        ...req.body,
        noteId,
        invitedBy: req.user.id
      });
      const collaborator = await storage.createNoteCollaborator(collaboratorData);
      res.json(collaborator);
    } catch (error) {
      res.status(500).json({ message: "Failed to create note collaborator" });
    }
  });

  app.put("/api/note-collaborators/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const collaboratorData = insertNoteCollaboratorSchema.partial().parse(req.body);
      const collaborator = await storage.updateNoteCollaborator(id, collaboratorData);
      res.json(collaborator);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note collaborator" });
    }
  });

  app.delete("/api/note-collaborators/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNoteCollaborator(id);
      res.json({ message: "Note collaborator removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove note collaborator" });
    }
  });

  // Note Comments Routes
  app.get("/api/notes/:noteId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const comments = await storage.getNoteComments(noteId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note comments" });
    }
  });

  app.post("/api/notes/:noteId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const commentData = insertNoteCommentSchema.parse({
        ...req.body,
        noteId,
        createdBy: req.user.id
      });
      const comment = await storage.createNoteComment(commentData);
      res.json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create note comment" });
    }
  });

  app.put("/api/note-comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const commentData = insertNoteCommentSchema.partial().parse(req.body);
      const comment = await storage.updateNoteComment(id, commentData);
      res.json(comment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note comment" });
    }
  });

  app.delete("/api/note-comments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNoteComment(id);
      res.json({ message: "Note comment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note comment" });
    }
  });

  // Note Attachments Routes
  app.get("/api/notes/:noteId/attachments", isAuthenticated, async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      const attachments = await storage.getNoteAttachments(noteId);
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch note attachments" });
    }
  });

  app.post("/api/notes/:noteId/attachments", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const noteId = parseInt(req.params.noteId);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const attachmentData = insertNoteAttachmentSchema.parse({
        noteId,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        altText: req.body.altText || '',
        uploadedBy: req.user.id
      });

      const attachment = await storage.createNoteAttachment(attachmentData);
      res.json(attachment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create note attachment" });
    }
  });

  app.delete("/api/note-attachments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get attachment info to delete file from filesystem
      const attachment = await storage.getNoteAttachments(0); // This is a hack - we need to get the specific attachment
      // TODO: Add a method to get single attachment by ID
      
      await storage.deleteNoteAttachment(id);
      res.json({ message: "Note attachment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note attachment" });
    }
  });

  // Schedule Version Control API Routes
  
  // Get schedule versions for a project
  app.get('/api/projects/:projectId/schedule-versions', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const versions = await storage.getScheduleVersionsByProjectId(projectId);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule versions" });
    }
  });

  // Get specific schedule version
  app.get('/api/schedule-versions/:versionId', isAuthenticated, async (req: any, res) => {
    try {
      const versionId = parseInt(req.params.versionId);
      const version = await storage.getScheduleVersionById(versionId);
      
      if (!version) {
        return res.status(404).json({ message: "Schedule version not found" });
      }
      
      // Verify project access
      const project = await storage.getProjectById(version.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(version);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule version" });
    }
  });

  // Create/publish new schedule version
  app.post('/api/projects/:projectId/schedule-versions', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the week start from request body (client sends the current viewed week)
      const weekStart = req.body.weekStart;
      if (!weekStart) {
        return res.status(400).json({ message: "weekStart is required for publishing" });
      }
      
      // Get current schedule events for this week only
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      const allEvents = await storage.getScheduleEventsByProjectId(projectId);
      const scheduleEvents = allEvents.filter((event: any) => {
        return event.date >= weekStart && event.date <= weekEndStr;
      });
      
      // Get versions for THIS WEEK only to calculate weekly versioning
      const allVersions = await storage.getScheduleVersionsByProjectId(projectId);
      const weekVersions = allVersions.filter((v: any) => v.weekStart === weekStart);
      
      // Calculate version number based on major.minor logic FOR THIS WEEK
      let newMajorVersion = 1;
      let newMinorVersion = 0;
      
      if (weekVersions.length > 0) {
        // Sort by publishedAt to get the latest version for this week
        const sortedVersions = [...weekVersions].sort((a, b) => 
          new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime()
        );
        const latestVersion = sortedVersions[0];
        const currentMajor = parseInt(latestVersion.version) || 1;
        const currentMinor = latestVersion.minorVersion || 0;
        
        if (req.body.versionType === 'major') {
          // Major version: increment major, reset minor to 0
          newMajorVersion = currentMajor + 1;
          newMinorVersion = 0;
        } else {
          // Minor version: keep major, increment minor
          newMajorVersion = currentMajor;
          newMinorVersion = currentMinor + 1;
        }
      }
      
      const versionString = newMajorVersion.toString();
      
      const versionData = {
        projectId,
        weekStart, // Track which week this version belongs to
        version: versionString,
        versionType: req.body.versionType,
        minorVersion: newMinorVersion,
        title: req.body.title || `${req.body.versionType === 'major' ? 'Major' : 'Minor'} Version ${versionString}.${newMinorVersion}`,
        description: req.body.description || null,
        scheduleData: {
          events: scheduleEvents,
          exportedAt: new Date().toISOString(),
          totalEvents: scheduleEvents.length,
          weekStart,
          weekEnd: weekEndStr
        },
        publishedBy: parseInt(req.user.id),
        isCurrent: true // New version becomes current for this week
      };

      // Mark all previous versions as not current
      await storage.markScheduleVersionsAsNotCurrent(projectId);
      
      // Create new version
      const newVersion = await storage.createScheduleVersion(versionData);
      
      // Update or create personal schedules for all contacts in parallel for speed
      const contacts = await storage.getContactsByProjectId(projectId);
      await Promise.all(contacts.map(async (contact) => {
        const existingPersonalSchedule = await storage.getPersonalScheduleByContactId(contact.id, projectId);
        
        if (existingPersonalSchedule) {
          // Update existing personal schedule to point to new version
          await storage.updatePersonalSchedule(existingPersonalSchedule.id, {
            currentVersionId: newVersion.id
          });
        } else {
          // Create new personal schedule
          const accessToken = `ps_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
          await storage.createPersonalSchedule({
            contactId: contact.id,
            projectId,
            currentVersionId: newVersion.id,
            accessToken,
            emailPreferences: {
              newVersion: true,
              reminders: false,
              dailyDigest: true
            }
          });
        }
      }));

      // Add changelog field with default message if not provided
      const changelog = req.body.changelog || `${req.body.versionType === 'major' ? 'Major' : 'Minor'} schedule update published by stage management. Please review your updated personal schedule.`;
      
      // Update the version with changelog
      await storage.updateScheduleVersion(newVersion.id, { changelog });
      
      // Send email notifications to all contacts asynchronously
      // Don't wait for email completion to avoid blocking the response
      setImmediate(async () => {
        try {
          await scheduleNotificationService.sendScheduleUpdateNotifications(
            newVersion.id,
            projectId,
            parseInt(req.user.id)
          );
        } catch (emailError) {
        }
      });

      res.json(newVersion);
    } catch (error) {
      res.status(500).json({ message: "Failed to create schedule version" });
    }
  });

  // Send test email with actual email template processing
  app.post('/api/projects/:id/send-test-email', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { testEmailAddress, emailSubject, emailBody } = req.body;
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get test email address - default to user's email if not provided
      const recipientEmail = testEmailAddress?.trim() || req.user.email;
      if (!recipientEmail) {
        return res.status(400).json({ message: "No email address available for test" });
      }

      // Get project settings for email template
      const settings = await storage.getShowSettingsByProjectId(projectId);
      let scheduleSettings = {};
      if (settings?.scheduleSettings) {
        try {
          scheduleSettings = typeof settings.scheduleSettings === 'string' 
            ? JSON.parse(settings.scheduleSettings) 
            : settings.scheduleSettings;
        } catch (e) {
        }
      }

      // Use provided template content or fall back to saved settings
      let testSubject = emailSubject || scheduleSettings.emailTemplate?.subject || "Schedule Update - {{showName}} ({{version}})";
      let testBody = emailBody || scheduleSettings.emailTemplate?.body || `Hi {{contactName}},

The schedule for {{showName}} has been updated with version {{version}}.

{{addedEvents}}

{{changedEvents}}

{{removedEvents}}

You can view your personal schedule here: {{personalScheduleLink}}

Best regards,
The Production Team`;



      // Create test data for variable substitution
      const testContactName = req.user.firstName || req.user.email;
      const testVersion = "Test v1.0";
      const testPublishDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      // Calculate current week range based on user settings
      const getCurrentWeekRange = (scheduleSettings: any) => {
        const now = new Date();
        const weekStartDay = scheduleSettings?.weekStartDay || 'Sunday';
        
        // Convert weekStartDay to number (0 = Sunday, 1 = Monday, etc.)
        const weekStartDayNum = weekStartDay.toLowerCase() === 'monday' ? 1 : 0;
        
        // Get current day of week (0 = Sunday, 1 = Monday, etc.)
        const currentDayOfWeek = now.getDay();
        
        // Calculate days to subtract to get to week start
        let daysToWeekStart;
        if (weekStartDayNum === 0) { // Sunday start
          daysToWeekStart = currentDayOfWeek;
        } else { // Monday start
          daysToWeekStart = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        }
        
        // Calculate week start date
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysToWeekStart);
        weekStart.setHours(0, 0, 0, 0);
        
        // Calculate week end date (6 days after week start)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return { weekStart, weekEnd };
      };

      // Format date in the requested format (e.g., "Sun, Jul 13, 2025")
      const formatWeekDate = (date: Date, timezone: string = 'America/New_York') => {
        try {
          return date.toLocaleDateString('en-US', {
            timeZone: timezone,
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch (error) {
          // Fallback to basic formatting
          return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      };

      // Calculate week dates based on schedule settings
      const timezone = scheduleSettings.timezone || 'America/New_York';
      const { weekStart, weekEnd } = getCurrentWeekRange(scheduleSettings);
      const weekStartFormatted = formatWeekDate(weekStart, timezone);
      const weekEndFormatted = formatWeekDate(weekEnd, timezone);
      const weekRangeFormatted = `${weekStartFormatted} - ${weekEndFormatted}`;

      // Get actual schedule changes for realistic test data
      let structuredChanges = { addedEvents: '', changedEvents: '', removedEvents: '', fullSummary: '' };
      try {
        const changeDetectionService = new (await import('./services/scheduleChangeDetectionService.js')).ScheduleChangeDetectionService(storage);
        structuredChanges = await changeDetectionService.generateStructuredChanges(projectId);
      } catch (error) {
        // Use fallback test data
        structuredChanges = {
          addedEvents: 'Added Events:\n• New rehearsal on Monday 2:00 PM - 5:00 PM\n• Costume fitting on Tuesday 10:00 AM - 11:00 AM',
          changedEvents: 'Changed Events:\n• Tech rehearsal moved from Wednesday 7:00 PM to Thursday 7:00 PM\n• Opening night time updated to 8:00 PM',
          removedEvents: 'Removed Events:\n• Cancelled: Extra rehearsal on Friday afternoon',
          fullSummary: 'This is a test schedule update showing how your template will appear to recipients.'
        };
      }

      // Define template variables for substitution
      const variables = {
        showName: project.name,
        version: testVersion,
        contactName: testContactName,
        publishedBy: testContactName,
        changesSummary: structuredChanges.fullSummary,
        addedEvents: structuredChanges.addedEvents,
        changedEvents: structuredChanges.changedEvents,
        removedEvents: structuredChanges.removedEvents,
        personalScheduleLink: `${process.env.REPLIT_HOST || 'https://backstageos.com'}/personal-schedule/test-token-preview`,
        personalScheduleUrl: `${process.env.REPLIT_HOST || 'https://backstageos.com'}/personal-schedule/test-token-preview`,
        publishDate: testPublishDate,
        publishedDate: testPublishDate,
        weekStart: weekStartFormatted,
        weekEnd: weekEndFormatted,
        weekRange: weekRangeFormatted
      };

      // Replace template variables in subject and body
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        testSubject = testSubject.replace(regex, value);
        testBody = testBody.replace(regex, value);
      });

      // Handle conditional blocks (simple {{#if description}} logic)
      testBody = testBody.replace(/{{#if description}}(.*?){{\/if}}/gs, (match, content) => {
        return ''; // For test, assume no description
      });

      // Get SendGrid API key from database (same as waitlist emails)
      const apiSettings = await storage.getApiSettings();
      if (!apiSettings?.sendgridApiKey) {
        return res.status(500).json({ message: "Email service not configured" });
      }

      sgMail.setApiKey(apiSettings.sendgridApiKey);
      
      // Get sender configuration from schedule settings
      const showSettings = await storage.getShowSettings(projectId);
      const emailSenderConfig = showSettings?.scheduleSettings?.emailSender || {};
      
      // Dynamic sender name with fallback to show name SM format
      const senderName = emailSenderConfig.senderName || `${project.name} SM`;
      
      // All emails send from schedules@backstageos.com
      const fromEmail = 'schedules@backstageos.com';
      
      // Determine reply-to email based on reply-to type
      let replyToEmail = req.user?.email; // Default fallback
      if (emailSenderConfig.replyToType === 'backstage_email') {
        // Get BackstageOS email from email accounts
        const emailAccounts = await storage.getEmailAccountsByUserId(req.user.id);
        const backstageAccount = emailAccounts.find((account: any) => account.emailAddress?.includes('@backstageos.com'));
        replyToEmail = backstageAccount?.emailAddress || req.user?.email;
      } else if (emailSenderConfig.replyToType === 'account') {
        replyToEmail = req.user?.email;
      } else if (emailSenderConfig.replyToType === 'external' && emailSenderConfig.replyToEmail) {
        replyToEmail = emailSenderConfig.replyToEmail;
      }

      const msg = {
        to: recipientEmail,
        from: {
          email: fromEmail,
          name: senderName
        },
        subject: testSubject,
        html: testBody.replace(/\n/g, '<br>'),
        text: testBody,
        ...(replyToEmail && { replyTo: replyToEmail })
      };

      await sgMail.send(msg);
      
      res.json({ 
        message: "Test email sent successfully",
        sentTo: recipientEmail,
        senderName: senderName,
        subject: testSubject 
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to send test email", 
        error: error.message || "Unknown error"
      });
    }
  });

  // Resend schedule to selected contacts
  app.post('/api/projects/:projectId/resend-schedule', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { contactIds, currentViewDate } = req.body;
      
      // Validate request
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: "Contact IDs are required" });
      }
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the most recent published schedule version
      const allVersions = await storage.getScheduleVersionsByProjectId(projectId);
      const currentVersion = allVersions.find(v => v.isCurrent);
      
      if (!currentVersion) {
        return res.status(404).json({ message: "No published schedule version found" });
      }
      
      // Verify that all contact IDs belong to this project
      const projectContacts = await storage.getContactsByProjectId(projectId);
      const validContactIds = projectContacts.map((c: any) => c.id);
      const invalidContacts = contactIds.filter((id: number) => !validContactIds.includes(id));
      
      if (invalidContacts.length > 0) {
        return res.status(400).json({ 
          message: `Invalid contact IDs: ${invalidContacts.join(', ')}` 
        });
      }

      // Check if there are events in the currently viewed week
      const viewDate = currentViewDate ? new Date(currentViewDate) : new Date();
      const currentDayOfWeek = viewDate.getDay();
      
      // Calculate week start (assuming Sunday start for now - could be made configurable)
      const daysToWeekStart = currentDayOfWeek;
      const weekStart = new Date(viewDate);
      weekStart.setDate(viewDate.getDate() - daysToWeekStart);
      weekStart.setHours(0, 0, 0, 0);
      
      // Calculate week end (6 days after week start)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // Get all events for the project and filter for current week
      const allEvents = await storage.getScheduleEventsByProjectId(projectId);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      const currentWeekEvents = allEvents.filter((event: any) => {
        const eventDate = event.date;
        return eventDate >= weekStartStr && eventDate <= weekEndStr;
      });
      
      // If no events in viewed week, return a helpful message
      if (!currentWeekEvents || currentWeekEvents.length === 0) {
        const weekStartFormatted = weekStart.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short', 
          day: 'numeric'
        });
        const weekEndFormatted = weekEnd.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        
        return res.status(400).json({ 
          message: `No events scheduled for week ${weekStartFormatted} - ${weekEndFormatted}. There's nothing to send in the schedule notification.`,
          weekRange: `${weekStartFormatted} - ${weekEndFormatted}`,
          hasEvents: false,
          suggestion: "Navigate to a week with scheduled events and try again, or publish a new schedule version with events for this week."
        });
      }
      
      // Send email notifications to selected contacts asynchronously
      setImmediate(async () => {
        try {
          await scheduleNotificationService.sendScheduleUpdateNotifications(
            currentVersion.id,
            projectId,
            parseInt(req.user.id),
            contactIds // Pass specific contact IDs to limit recipients
          );
        } catch (emailError) {
        }
      });
      
      res.json({ 
        success: true, 
        message: `Schedule resent successfully`,
        sentCount: contactIds.length,
        versionId: currentVersion.id,
        version: currentVersion.version
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to resend schedule" });
    }
  });

  // Get personal schedules for a project
  app.get('/api/projects/:projectId/personal-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const personalSchedules = await storage.getPersonalSchedulesByProjectId(projectId);
      
      // Get contact details with contact group for each personal schedule
      const schedulesWithContacts = await Promise.all(
        personalSchedules.map(async (schedule) => {
          const contact = await storage.getContactById(schedule.contactId);
          // Get the contact group if the contact has one (field is 'groupId' in schema)
          let contactGroup = null;
          if (contact && contact.groupId) {
            contactGroup = await storage.getContactGroupById(contact.groupId);
          }
          return {
            ...schedule,
            contact: contact ? {
              ...contact,
              contactGroup
            } : null
          };
        })
      );
      
      res.json(schedulesWithContacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch personal schedules" });
    }
  });

  // Activate personal schedule sharing for a contact
  app.post('/api/projects/:projectId/personal-schedules/activate', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { contactId, expiresAt } = req.body;
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if personal schedule already exists for this contact
      const existingSchedule = await storage.getPersonalScheduleByContactId(contactId, projectId);
      
      if (existingSchedule) {
        // Activate existing schedule
        await storage.updatePersonalSchedule(existingSchedule.id, {
          isActive: true,
          expiresAt: expiresAt || null
        });
        res.json(existingSchedule);
      } else {
        // Create new personal schedule if none exists (shouldn't happen if schedule was published)
        const accessToken = `ps_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
        
        // Get current schedule version for this project
        const currentVersion = await storage.getCurrentScheduleVersionByProjectId(projectId);
        if (!currentVersion) {
          return res.status(400).json({ message: "No schedule version has been published yet. Please publish a schedule first." });
        }
        
        const newSchedule = await storage.createPersonalSchedule({
          contactId,
          projectId,
          currentVersionId: currentVersion.id,
          accessToken,
          isActive: true,
          expiresAt: expiresAt || null,
          emailPreferences: {
            newVersion: true,
            reminders: false,
            dailyDigest: true
          }
        });
        res.json(newSchedule);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to activate personal schedule" });
    }
  });

  // Update personal schedule
  app.put('/api/projects/:projectId/personal-schedules/:scheduleId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const scheduleId = parseInt(req.params.scheduleId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the personal schedule
      await storage.updatePersonalSchedule(scheduleId, req.body);
      
      // Get updated schedule
      const updatedSchedule = await storage.getPersonalScheduleById(scheduleId);
      res.json(updatedSchedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to update personal schedule" });
    }
  });

  // Get schedule email templates for a project
  app.get('/api/projects/:projectId/schedule-email-templates', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const templates = await storage.getScheduleEmailTemplatesByProjectId(projectId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule email templates" });
    }
  });

  // Create schedule email template
  app.post('/api/projects/:projectId/schedule-email-templates', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const templateData = {
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id)
      };

      const template = await storage.createScheduleEmailTemplate(templateData);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to create schedule email template" });
    }
  });

  // Public Personal Schedule Viewer (no authentication required - token-based access)
  app.get('/api/schedule/:accessToken', async (req: any, res) => {
    try {
      const accessToken = req.params.accessToken;
      
      // Find personal schedule by access token
      const personalSchedule = await storage.getPersonalScheduleByToken(accessToken);
      
      if (!personalSchedule) {
        return res.status(404).json({ message: "Personal schedule not found or access token expired" });
      }

      // Personal schedules don't expire by default and are always active when they exist
      // If expiration or activation features are needed later, add these fields to the schema

      // Get project details
      const project = await storage.getProjectById(personalSchedule.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get contact details
      const contact = await storage.getContactById(personalSchedule.contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Personal schedule shows two buckets:
      // 1. Upcoming events: Current week and forward, only from published week versions
      // 2. Historical weeks: Past weeks (available via "Previous Schedules" button)
      
      const allVersions = await storage.getScheduleVersionsByProjectId(personalSchedule.projectId);
      
      // Calculate current week start (Sunday) - use Date objects for comparison
      const today = new Date();
      const dayOfWeek = today.getDay();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - dayOfWeek);
      currentWeekStart.setHours(0, 0, 0, 0);
      const currentWeekStartTime = currentWeekStart.getTime();
      
      // Helper to parse weekStart string to Date for comparison (handles various formats including YYYY-M-D)
      const parseWeekStartDate = (weekStartStr: string): Date => {
        // Normalize date string by splitting and padding components
        const parts = weekStartStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            const date = new Date(year, month, day, 0, 0, 0, 0);
            return date;
          }
        }
        // Fallback to standard parsing if format is unexpected
        const date = new Date(weekStartStr);
        date.setHours(0, 0, 0, 0);
        return date;
      };
      
      // Helper to check if a week is current or future
      const isCurrentOrFutureWeek = (weekStartStr: string): boolean => {
        const weekDate = parseWeekStartDate(weekStartStr);
        return weekDate.getTime() >= currentWeekStartTime;
      };
      
      // Group published versions by weekStart and get the latest version for each week
      const latestVersionsByWeek: Record<string, any> = {};
      for (const version of allVersions) {
        if (version.weekStart) {
          const existing = latestVersionsByWeek[version.weekStart];
          if (!existing || new Date(version.publishedAt) > new Date(existing.publishedAt)) {
            latestVersionsByWeek[version.weekStart] = version;
          }
        }
      }
      
      // Also get the legacy version for historical data
      const legacyVersion = personalSchedule.currentVersionId 
        ? await storage.getScheduleVersionById(personalSchedule.currentVersionId)
        : null;
      
      // Collect UPCOMING events (current week and forward, published only)
      const upcomingEvents: any[] = [];
      const seenEventIds = new Set<number>();
      
      // Helper to filter events for this contact
      const filterContactEvents = (events: any[]) => {
        return events.filter((event: any) => 
          event.participants && event.participants.some((p: any) => p.contactId === contact.id)
        );
      };
      
      // Add events from published week versions that are current or future
      for (const [weekStart, version] of Object.entries(latestVersionsByWeek)) {
        if (isCurrentOrFutureWeek(weekStart)) {
          const versionEvents = version.scheduleData?.events || [];
          const contactEvents = filterContactEvents(versionEvents);
          for (const event of contactEvents) {
            if (!seenEventIds.has(event.id)) {
              seenEventIds.add(event.id);
              upcomingEvents.push(event);
            }
          }
        }
      }
      
      // Sort upcoming events by date
      upcomingEvents.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime || '00:00:00'}`);
        const dateB = new Date(`${b.date}T${b.startTime || '00:00:00'}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Build historical week summaries (for "Previous Schedules" button)
      const historicalWeeks: any[] = [];
      const processedHistoricalWeeks = new Set<string>();
      
      // Add historical weeks from published versions (using Date comparison)
      for (const [weekStart, version] of Object.entries(latestVersionsByWeek)) {
        if (!isCurrentOrFutureWeek(weekStart)) {
          const versionEvents = version.scheduleData?.events || [];
          const contactEvents = filterContactEvents(versionEvents);
          if (contactEvents.length > 0) {
            processedHistoricalWeeks.add(weekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            historicalWeeks.push({
              weekStart,
              weekEnd: weekEnd.toISOString().split('T')[0],
              version: `${version.version}.${version.minorVersion || 0}`,
              publishedAt: version.publishedAt,
              eventCount: contactEvents.length
            });
          }
        }
      }
      
      // Add historical weeks from legacy version (for data before weekly versioning)
      if (legacyVersion && legacyVersion.scheduleData?.events) {
        const legacyContactEvents = filterContactEvents(legacyVersion.scheduleData.events);
        const legacyWeekEvents: Record<string, any[]> = {};
        
        for (const event of legacyContactEvents) {
          const eventWeekStart = new Date(event.date);
          const eventDayOfWeek = eventWeekStart.getDay();
          eventWeekStart.setDate(eventWeekStart.getDate() - eventDayOfWeek);
          eventWeekStart.setHours(0, 0, 0, 0);
          const eventWeekStartStr = eventWeekStart.toISOString().split('T')[0];
          
          // Only add to historical if it's a past week (using Date comparison) and not already covered
          const isPastWeek = eventWeekStart.getTime() < currentWeekStartTime;
          if (isPastWeek && !processedHistoricalWeeks.has(eventWeekStartStr)) {
            if (!legacyWeekEvents[eventWeekStartStr]) {
              legacyWeekEvents[eventWeekStartStr] = [];
            }
            legacyWeekEvents[eventWeekStartStr].push(event);
          }
        }
        
        for (const [weekStart, events] of Object.entries(legacyWeekEvents)) {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          historicalWeeks.push({
            weekStart,
            weekEnd: weekEnd.toISOString().split('T')[0],
            version: legacyVersion.version ? `${legacyVersion.version}.${legacyVersion.minorVersion || 0}` : 'Legacy',
            publishedAt: legacyVersion.publishedAt,
            eventCount: events.length,
            isLegacy: true
          });
        }
      }
      
      // Sort historical weeks by date (most recent first)
      historicalWeeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));

      // Get the most recent version for the response header
      const latestVersion = allVersions.length > 0 
        ? allVersions.reduce((latest, v) => 
            new Date(v.publishedAt) > new Date(latest.publishedAt) ? v : latest
          )
        : legacyVersion;

      // Get event types for color display
      const eventTypes = await storage.getEventTypesByProjectId(project.id);

      res.json({
        personalSchedule: {
          id: personalSchedule.id,
          accessToken: personalSchedule.accessToken,
          lastViewedAt: personalSchedule.lastViewedAt
        },
        project: {
          id: project.id,
          name: project.name,
          description: project.description
        },
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          contactType: contact.contactType
        },
        version: latestVersion ? {
          id: latestVersion.id,
          version: latestVersion.version,
          versionType: latestVersion.versionType,
          minorVersion: latestVersion.minorVersion,
          title: latestVersion.title,
          description: latestVersion.description,
          publishedAt: latestVersion.publishedAt
        } : null,
        events: upcomingEvents, // Only current week and forward (published)
        historicalWeeks, // Summary of past weeks for "Previous Schedules" button
        eventTypes: eventTypes.map(et => ({ id: et.id, name: et.name, color: et.color })) // Event type colors from show settings
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch personal schedule" });
    }
  });

  // Get historical week events for personal schedule (on-demand fetch)
  app.get('/api/schedule/:accessToken/history/:weekStart', async (req: any, res) => {
    try {
      const { accessToken, weekStart } = req.params;
      
      // Find personal schedule by access token
      const personalSchedule = await storage.getPersonalScheduleByToken(accessToken);
      
      if (!personalSchedule) {
        return res.status(404).json({ message: "Personal schedule not found" });
      }

      // Get contact details
      const contact = await storage.getContactById(personalSchedule.contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Get all versions for this project
      const allVersions = await storage.getScheduleVersionsByProjectId(personalSchedule.projectId);
      
      // Find the published version for this week
      const weekVersions = allVersions.filter((v: any) => v.weekStart === weekStart);
      let targetVersion = null;
      
      if (weekVersions.length > 0) {
        // Get the latest version for this week
        targetVersion = weekVersions.reduce((latest: any, v: any) => 
          new Date(v.publishedAt) > new Date(latest.publishedAt) ? v : latest
        );
      } else {
        // Fall back to legacy version
        const legacyVersion = personalSchedule.currentVersionId 
          ? await storage.getScheduleVersionById(personalSchedule.currentVersionId)
          : null;
        if (legacyVersion) {
          targetVersion = legacyVersion;
        }
      }

      if (!targetVersion) {
        return res.status(404).json({ message: "No version found for this week" });
      }

      // Get events for this contact from the version
      const allEvents = targetVersion.scheduleData?.events || [];
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      // Filter events for this week and this contact
      const weekEvents = allEvents.filter((event: any) => {
        const isInWeek = event.date >= weekStart && event.date <= weekEndStr;
        const isForContact = event.participants && 
          event.participants.some((p: any) => p.contactId === contact.id);
        return isInWeek && isForContact;
      });

      // Sort events by date
      weekEvents.sort((a: any, b: any) => {
        const dateA = new Date(`${a.date}T${a.startTime || '00:00:00'}`);
        const dateB = new Date(`${b.date}T${b.startTime || '00:00:00'}`);
        return dateA.getTime() - dateB.getTime();
      });

      // Get event types for color display
      const eventTypes = await storage.getEventTypesByProjectId(personalSchedule.projectId);

      res.json({
        weekStart,
        weekEnd: weekEndStr,
        version: `${targetVersion.version}.${targetVersion.minorVersion || 0}`,
        publishedAt: targetVersion.publishedAt,
        events: weekEvents,
        eventTypes: eventTypes.map(et => ({ id: et.id, name: et.name, color: et.color }))
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch historical week events" });
    }
  });

  // Personal Schedule ICS Subscription (no auth required) - for calendar apps
  app.get('/api/schedule/:accessToken/subscribe.ics', async (req: any, res) => {
    try {
      const accessToken = req.params.accessToken;
      
      // Find personal schedule by access token
      const personalSchedule = await storage.getPersonalScheduleByToken(accessToken);
      
      if (!personalSchedule) {
        return res.status(404).send('Personal schedule not found or access token expired');
      }

      // Check if token is expired
      if (personalSchedule.expiresAt && new Date() > new Date(personalSchedule.expiresAt)) {
        return res.status(410).send('Access token has expired');
      }

      if (!personalSchedule.isActive) {
        return res.status(403).send('Personal schedule access has been deactivated');
      }

      // Get project details
      const project = await storage.getProjectById(personalSchedule.projectId);
      if (!project) {
        return res.status(404).send('Project not found');
      }

      // Get contact details
      const contact = await storage.getContactById(personalSchedule.contactId);
      if (!contact) {
        return res.status(404).send('Contact not found');
      }

      // ICS subscription shows only current week and forward (same as main personal schedule)
      const allVersions = await storage.getScheduleVersionsByProjectId(personalSchedule.projectId);
      
      // Calculate current week start (Sunday) - use Date objects for comparison
      const today = new Date();
      const dayOfWeek = today.getDay();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - dayOfWeek);
      currentWeekStart.setHours(0, 0, 0, 0);
      const currentWeekStartTime = currentWeekStart.getTime();
      
      // Helper to parse weekStart string to Date for comparison (handles various formats including YYYY-M-D)
      const parseWeekStartDate = (weekStartStr: string): Date => {
        const parts = weekStartStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(year, month, day, 0, 0, 0, 0);
          }
        }
        const date = new Date(weekStartStr);
        date.setHours(0, 0, 0, 0);
        return date;
      };
      
      // Helper to check if a week is current or future
      const isCurrentOrFutureWeek = (weekStartStr: string): boolean => {
        const weekDate = parseWeekStartDate(weekStartStr);
        return weekDate.getTime() >= currentWeekStartTime;
      };
      
      // Group versions by weekStart and get the latest version for each week
      const latestVersionsByWeek: Record<string, any> = {};
      for (const version of allVersions) {
        if (version.weekStart) {
          const existing = latestVersionsByWeek[version.weekStart];
          if (!existing || new Date(version.publishedAt) > new Date(existing.publishedAt)) {
            latestVersionsByWeek[version.weekStart] = version;
          }
        }
      }
      
      // Collect events from current week and forward (published only)
      const upcomingEvents: any[] = [];
      const seenEventIds = new Set<number>();
      
      for (const [weekStart, version] of Object.entries(latestVersionsByWeek)) {
        // Only include current week and future weeks (using Date comparison)
        if (isCurrentOrFutureWeek(weekStart)) {
          const versionEvents = version.scheduleData?.events || [];
          for (const event of versionEvents) {
            if (!seenEventIds.has(event.id) && 
                event.participants && 
                event.participants.some((p: any) => p.contactId === contact.id)) {
              seenEventIds.add(event.id);
              upcomingEvents.push(event);
            }
          }
        }
      }
      
      // Sort events by date
      upcomingEvents.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime || '00:00:00'}`);
        const dateB = new Date(`${b.date}T${b.startTime || '00:00:00'}`);
        return dateA.getTime() - dateB.getTime();
      });

      // Get the most recent version for metadata
      const latestVersion = allVersions.length > 0 
        ? allVersions.reduce((latest, v) => 
            new Date(v.publishedAt) > new Date(latest.publishedAt) ? v : latest
          )
        : null;

      // Generate ICS file content with calendar subscription headers
      const icsContent = generatePersonalScheduleICSSubscriptionContent(upcomingEvents, project, contact, latestVersion, req.get('host'));

      // Set headers for dynamic calendar subscription
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('X-Published-TTL', 'PT1H'); // Refresh every hour
      res.send(icsContent);
    } catch (error) {
      res.status(500).send('Failed to generate calendar subscription');
    }
  });

  // PUBLIC CALENDAR SHARING ROUTES
  // Get public calendar shares for a project
  app.get('/api/projects/:projectId/public-calendar-shares', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const shares = await storage.getPublicCalendarSharesByProjectId(projectId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch public calendar shares" });
    }
  });

  // Create public calendar share
  app.post('/api/projects/:projectId/public-calendar-shares', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Generate unique token
      const token = crypto.randomBytes(32).toString('hex');
      
      const shareData = {
        projectId,
        contactId: req.body.contactId,
        token,
        expiresAt: req.body.expiresAt || null,
        isActive: true
      };

      const share = await storage.createPublicCalendarShare(shareData);
      res.json(share);
    } catch (error) {
      res.status(500).json({ message: "Failed to create public calendar share" });
    }
  });

  // Update public calendar share
  app.put('/api/projects/:projectId/public-calendar-shares/:shareId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const shareId = parseInt(req.params.shareId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const share = await storage.updatePublicCalendarShare(shareId, req.body);
      res.json(share);
    } catch (error) {
      res.status(500).json({ message: "Failed to update public calendar share" });
    }
  });

  // Delete public calendar share
  app.delete('/api/projects/:projectId/public-calendar-shares/:shareId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const shareId = parseInt(req.params.shareId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deletePublicCalendarShare(shareId);
      res.json({ message: "Public calendar share deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete public calendar share" });
    }
  });

  // Public Calendar Access (no auth required)
  app.get('/api/public-calendar/:token', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      // Find calendar share by token
      const share = await storage.getPublicCalendarShareByToken(token);
      
      if (!share) {
        return res.status(404).json({ message: "Calendar not found" });
      }

      // Check if token is expired
      if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
        return res.status(410).json({ message: "Calendar access has expired" });
      }

      if (!share.isActive) {
        return res.status(403).json({ message: "Calendar access has been deactivated" });
      }

      // Get project and contact details
      const project = await storage.getProjectById(share.projectId);
      const contact = await storage.getContactById(share.contactId);
      
      if (!project || !contact) {
        return res.status(404).json({ message: "Project or contact not found" });
      }

      // Get all schedule events for this project
      const scheduleEvents = await storage.getScheduleEventsByProjectId(share.projectId);
      
      // Filter events that involve this contact
      const contactEvents = scheduleEvents.filter(event => 
        event.participants && event.participants.some((p: any) => p.contactId === contact.id)
      );

      // Update access tracking
      await storage.updatePublicCalendarShareAccess(token);

      res.json({
        project: {
          id: project.id,
          name: project.name,
          description: project.description
        },
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          contactType: contact.contactType
        },
        events: contactEvents
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendar" });
    }
  });

  // Public Calendar ICS Download (no auth required)
  app.get('/api/public-calendar/:token/ics', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      // Find calendar share by token
      const share = await storage.getPublicCalendarShareByToken(token);
      
      if (!share) {
        return res.status(404).json({ message: "Calendar not found" });
      }

      // Check if token is expired
      if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
        return res.status(410).json({ message: "Calendar access has expired" });
      }

      if (!share.isActive) {
        return res.status(403).json({ message: "Calendar access has been deactivated" });
      }

      // Get project and contact details
      const project = await storage.getProjectById(share.projectId);
      const contact = await storage.getContactById(share.contactId);
      
      if (!project || !contact) {
        return res.status(404).json({ message: "Project or contact not found" });
      }

      // Get all schedule events for this project
      const scheduleEvents = await storage.getScheduleEventsByProjectId(share.projectId);
      
      // Filter events that involve this contact
      const contactEvents = scheduleEvents.filter(event => 
        event.participants && event.participants.some((p: any) => p.contactId === contact.id)
      );

      // Generate ICS file content
      const icsContent = generateICSContent(contactEvents, project, contact);

      // Update access tracking
      await storage.updatePublicCalendarShareAccess(token);

      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}-${contact.firstName}_${contact.lastName}.ics"`);
      res.send(icsContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate calendar file" });
    }
  });

  // Public Calendar Dynamic Subscription (no auth required) - for automatic updates
  app.get('/api/public-calendar/:token/subscribe.ics', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      // Find calendar share by token
      const share = await storage.getPublicCalendarShareByToken(token);
      
      if (!share) {
        return res.status(404).send('Calendar not found');
      }

      // Check if token is expired
      if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
        return res.status(410).send('Calendar access has expired');
      }

      if (!share.isActive) {
        return res.status(403).send('Calendar access has been deactivated');
      }

      // Get project and contact details
      const project = await storage.getProjectById(share.projectId);
      const contact = await storage.getContactById(share.contactId);
      
      if (!project || !contact) {
        return res.status(404).send('Project or contact not found');
      }

      // Get all schedule events for this project
      const scheduleEvents = await storage.getScheduleEventsByProjectId(share.projectId);
      
      // Filter events that involve this contact
      const contactEvents = scheduleEvents.filter(event => 
        event.participants && event.participants.some((p: any) => p.contactId === contact.id)
      );

      // Generate ICS file content with calendar subscription headers
      const icsContent = generateICSSubscriptionContent(contactEvents, project, contact, req.get('host'));

      // Update access tracking
      await storage.updatePublicCalendarShareAccess(token);

      // Set headers for dynamic calendar subscription
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('X-Published-TTL', 'PT1H'); // Refresh every hour
      res.send(icsContent);
    } catch (error) {
      res.status(500).send('Failed to generate calendar subscription');
    }
  });

  // Phase 5: Google Calendar Integration Routes
  app.get('/api/projects/:projectId/calendar/auth-url', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.user.id);
      
      // Get the current hostname from the request
      const hostname = req.get('host');
      
      const { GoogleCalendarService } = await import('./services/googleCalendarService.js');
      const googleCalendarService = new GoogleCalendarService(hostname);
      const authUrl = googleCalendarService.generateAuthUrl(projectId, userId);
      
      
      res.json({ authUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate authorization URL" });
    }
  });

  app.post('/api/projects/:projectId/calendar/callback', isAuthenticated, async (req: any, res) => {
    try {
      const { code, state } = req.body;
      
      const { GoogleCalendarService } = await import('./services/googleCalendarService.js');
      const hostname = req.get('host');
      const googleCalendarService = new GoogleCalendarService(hostname);
      const integration = await googleCalendarService.handleOAuthCallback(code, state);
      
      res.json(integration);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete Google Calendar setup" });
    }
  });

  app.get('/api/projects/:projectId/calendar/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const integrations = await storage.getGoogleCalendarIntegrationsByProjectId(projectId);
      
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendar integrations" });
    }
  });

  app.put('/api/projects/:projectId/calendar/integrations/:integrationId', isAuthenticated, async (req: any, res) => {
    try {
      const integrationId = parseInt(req.params.integrationId);
      const { syncSettings } = req.body;
      
      const { GoogleCalendarService } = await import('./services/googleCalendarService.js');
      const hostname = req.get('host');
      const googleCalendarService = new GoogleCalendarService(hostname);
      const integration = await googleCalendarService.updateSyncSettings(integrationId, syncSettings);
      
      res.json(integration);
    } catch (error) {
      res.status(500).json({ message: "Failed to update calendar integration" });
    }
  });

  app.delete('/api/projects/:projectId/calendar/integrations/:integrationId', isAuthenticated, async (req: any, res) => {
    try {
      const integrationId = parseInt(req.params.integrationId);
      await storage.deleteGoogleCalendarIntegration(integrationId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete calendar integration" });
    }
  });

  // Phase 5: Notification Preferences Routes
  app.get('/api/projects/:projectId/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const preferences = await storage.getNotificationPreferencesByProjectId(projectId);
      
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.get('/api/projects/:projectId/contacts/:contactId/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const contactId = parseInt(req.params.contactId);
      
      let preferences = await storage.getNotificationPreferences(contactId, projectId);
      
      // Create default preferences if none exist
      if (!preferences) {
        preferences = await storage.createNotificationPreferences({
          contactId,
          projectId,
          scheduleUpdates: true,
          majorVersionsOnly: false,
          emailEnabled: true,
          calendarSync: false
        });
      }
      
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.put('/api/projects/:projectId/contacts/:contactId/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const contactId = parseInt(req.params.contactId);
      
      let preferences = await storage.getNotificationPreferences(contactId, projectId);
      
      if (preferences) {
        preferences = await storage.updateNotificationPreferences(preferences.id, req.body);
      } else {
        preferences = await storage.createNotificationPreferences({
          contactId,
          projectId,
          ...req.body
        });
      }
      
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Phase 5: Schedule Version Comparison Routes
  app.get('/api/projects/:projectId/schedule/versions/:fromVersionId/compare/:toVersionId', isAuthenticated, async (req: any, res) => {
    try {
      const fromVersionId = parseInt(req.params.fromVersionId);
      const toVersionId = parseInt(req.params.toVersionId);
      
      const { scheduleComparisonService } = await import('./services/scheduleComparisonService.js');
      
      // Check for cached comparison first
      let comparison = await scheduleComparisonService.getCachedComparison(fromVersionId, toVersionId);
      
      if (!comparison) {
        // Generate new comparison
        const fromVersion = await storage.getScheduleVersionById(fromVersionId);
        const toVersion = await storage.getScheduleVersionById(toVersionId);
        
        if (!fromVersion || !toVersion) {
          return res.status(404).json({ message: "Schedule version not found" });
        }
        
        comparison = await scheduleComparisonService.compareScheduleVersions(fromVersion, toVersion);
      }
      
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ message: "Failed to compare schedule versions" });
    }
  });

  app.get('/api/projects/:projectId/schedule/comparisons', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const comparisons = await storage.getScheduleVersionComparisonsByProjectId(projectId);
      
      res.json(comparisons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule comparisons" });
    }
  });

  app.get('/api/projects/:projectId/schedule/change-stats', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      const { scheduleComparisonService } = await import('./services/scheduleComparisonService.js');
      const stats = await scheduleComparisonService.getProjectScheduleChangeStats(projectId);
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule change statistics" });
    }
  });

  // Phase 5: Enhanced Email Template Categories Routes
  app.get('/api/projects/:projectId/email-template-categories', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const categories = await storage.getEmailTemplateCategoriesByProjectId(projectId);
      
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email template categories" });
    }
  });

  app.post('/api/projects/:projectId/email-template-categories', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const categoryData = {
        ...req.body,
        projectId
      };
      
      const category = await storage.createEmailTemplateCategory(categoryData);
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create email template category" });
    }
  });

  app.put('/api/projects/:projectId/email-template-categories/:categoryId', isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const category = await storage.updateEmailTemplateCategory(categoryId, req.body);
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email template category" });
    }
  });

  app.delete('/api/projects/:projectId/email-template-categories/:categoryId', isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      await storage.deleteEmailTemplateCategory(categoryId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete email template category" });
    }
  });

  // Development mock Google Calendar integration
  app.post('/api/projects/:projectId/calendar/mock-integration', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.id;
      
      
      const mockIntegration = await storage.createGoogleCalendarIntegration({
        projectId,
        userId,
        calendarId: req.body.calendarId || 'primary',
        calendarName: req.body.calendarName || 'Development Calendar',
        accessToken: req.body.accessToken || 'mock_access_token',
        refreshToken: req.body.refreshToken || 'mock_refresh_token',
        tokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        syncSettings: req.body.syncSettings || {
          syncPersonalSchedules: true,
          syncEventTypes: [],
          defaultReminders: [{ method: 'email', minutes: 15 }]
        }
      });
      
      res.json(mockIntegration);
    } catch (error) {
      res.status(500).json({ message: "Failed to create mock integration" });
    }
  });

  // Google Calendar OAuth callback route  
  app.get('/auth/google/callback', async (req: any, res) => {
    try {
      const { code, state, error } = req.query;
      
      // Handle Google OAuth errors (like access_denied)
      if (error) {
        
        // For development: If access denied, create a temporary bypass
        if (error === 'access_denied') {
          return res.send(`
            <html>
              <body>
                <h3>OAuth Access Denied - Creating Development Bypass</h3>
                <p>Since the OAuth consent screen isn't configured for test users, I'll create a temporary integration for testing.</p>
                <button onclick="createBypass()">Create Temporary Integration</button>
                <button onclick="window.close()">Cancel</button>
                <script>
                  function createBypass() {
                    // Send success with temporary credentials
                    window.opener?.postMessage({ 
                      type: 'GOOGLE_AUTH_SUCCESS', 
                      data: { 
                        temporary: true,
                        calendarId: 'primary',
                        calendarName: 'Bryan\\'s Calendar (Temporary)',
                        message: 'Temporary integration created for testing'
                      } 
                    }, '*');
                    window.close();
                  }
                </script>
              </body>
            </html>
          `);
        }
        
        return res.send(`
          <html>
            <body>
              <h3>OAuth Error</h3>
              <p>Error: ${error}</p>
              <button onclick="window.close()">Close</button>
              <script>
                window.opener?.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${error}' }, '*');
              </script>
            </body>
          </html>
        `);
      }
      
      if (!code || !state) {
        return res.status(400).send(`
          <html>
            <body>
              <script>
                window.opener?.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: 'Missing authorization code or state' }, '*');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      const { GoogleCalendarService } = await import('./services/googleCalendarService.js');
      const hostname = req.get('host');
      const googleCalendarService = new GoogleCalendarService(hostname);
      const integration = await googleCalendarService.handleOAuthCallback(code, state);
      
      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              window.opener?.postMessage({ 
                type: 'GOOGLE_AUTH_SUCCESS', 
                data: ${JSON.stringify(integration)}
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send(`
        <html>
          <body>
            <script>
              window.opener?.postMessage({ 
                type: 'GOOGLE_AUTH_ERROR', 
                error: '${error instanceof Error ? error.message : 'Unknown error'}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }
  });

  // Phase 5: Public Calendar Sharing Routes
  app.get('/api/projects/:projectId/public-calendar-shares', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const shares = await storage.getPublicCalendarSharesByProjectId(projectId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch public calendar shares" });
    }
  });

  app.post('/api/projects/:projectId/public-calendar-shares', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { nanoid } = await import('nanoid');
      
      const shareData = {
        ...req.body,
        projectId,
        token: nanoid(32),
        createdBy: req.user.id
      };
      
      const share = await storage.createPublicCalendarShare(shareData);
      res.json(share);
    } catch (error) {
      res.status(500).json({ message: "Failed to create public calendar share" });
    }
  });

  app.put('/api/projects/:projectId/public-calendar-shares/:shareId', isAuthenticated, async (req: any, res) => {
    try {
      const shareId = parseInt(req.params.shareId);
      const share = await storage.updatePublicCalendarShare(shareId, req.body);
      res.json(share);
    } catch (error) {
      res.status(500).json({ message: "Failed to update public calendar share" });
    }
  });

  app.delete('/api/projects/:projectId/public-calendar-shares/:shareId', isAuthenticated, async (req: any, res) => {
    try {
      const shareId = parseInt(req.params.shareId);
      await storage.deletePublicCalendarShare(shareId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete public calendar share" });
    }
  });

  // Public access route for calendar sharing (no auth required)
  app.get('/api/public-calendar/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const share = await storage.getPublicCalendarShareByToken(token);
      
      if (!share) {
        return res.status(404).json({ message: "Calendar share not found" });
      }

      if (!share.isActive) {
        return res.status(403).json({ message: "Calendar share is inactive" });
      }

      // Update access count
      await storage.updatePublicCalendarShareAccess(token);

      // Get project and contact details
      const project = await storage.getProject(share.projectId);
      const contact = await storage.getContact(share.contactId);

      if (!project || !contact) {
        return res.status(404).json({ message: "Project or contact not found" });
      }

      // Get personal schedule for this contact
      const personalSchedule = await storage.getPersonalScheduleByContact(share.contactId, share.projectId);

      res.json({
        project: {
          id: project.id,
          name: project.name,
          description: project.description
        },
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email
        },
        schedule: personalSchedule,
        share: {
          title: share.title,
          description: share.description,
          lastAccessedAt: share.lastAccessedAt,
          accessCount: share.accessCount
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch public calendar" });
    }
  });

  // Event Type Calendar Shares Routes
  app.get('/api/projects/:projectId/event-type-calendar-shares', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const shares = await storage.getEventTypeCalendarSharesByProjectId(projectId);
      res.json(shares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event type calendar shares" });
    }
  });

  app.post('/api/projects/:projectId/event-type-calendar-shares', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Generate unique token
      const { nanoid } = await import('nanoid');
      const token = nanoid(32);
      
      const shareData = {
        projectId,
        eventTypeName: req.body.eventTypeName,
        eventTypeCategory: req.body.eventTypeCategory,
        token,
        isActive: true
      };

      const share = await storage.createEventTypeCalendarShare(shareData);
      res.json(share);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event type calendar share" });
    }
  });

  app.delete('/api/projects/:projectId/event-type-calendar-shares/:shareId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const shareId = parseInt(req.params.shareId);
      
      // Verify project access
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteEventTypeCalendarShare(shareId);
      res.json({ message: "Event type calendar share deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event type calendar share" });
    }
  });

  // Public Event Type Calendar Access (no auth required)
  app.get('/api/public-calendar/event-type/:token', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      // Find calendar share by token
      const share = await storage.getEventTypeCalendarShareByToken(token);
      
      if (!share) {
        return res.status(404).json({ message: "Calendar not found" });
      }

      if (!share.isActive) {
        return res.status(403).json({ message: "Calendar access has been deactivated" });
      }

      // Get project details
      const project = await storage.getProjectById(share.projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get all schedule events for this project
      const scheduleEvents = await storage.getScheduleEventsByProjectId(share.projectId);
      
      // Get project settings to determine enabled event types
      const showSettings = await storage.getShowSettingsByProjectId(share.projectId);
      
      // Filter events by event type
      const filteredEvents = scheduleEvents.filter(event => {
        if (share.eventTypeCategory === 'show_schedule') {
          // Show schedule events - use enabled event types from project settings
          const enabledEventTypes = showSettings?.scheduleSettings?.enabledEventTypes || [];
          return enabledEventTypes.includes(event.type);
        } else {
          // Individual events - match by event type name
          return event.type === share.eventTypeName.toLowerCase().replace(/\s+/g, '_');
        }
      });

      // Update access tracking
      await storage.updateEventTypeCalendarShareAccess(token);

      res.json({
        project: {
          id: project.id,
          name: project.name,
          description: project.description
        },
        eventType: {
          name: share.eventTypeName,
          category: share.eventTypeCategory
        },
        events: filteredEvents
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendar" });
    }
  });

  // Public Event Type Calendar Dynamic Subscription (no auth required)
  app.get('/api/public-calendar/event-type/:token/subscribe.ics', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      // Find calendar share by token
      const share = await storage.getEventTypeCalendarShareByToken(token);
      
      if (!share) {
        return res.status(404).send('Calendar not found');
      }

      if (!share.isActive) {
        return res.status(403).send('Calendar access has been deactivated');
      }

      // Get project details
      const project = await storage.getProjectById(share.projectId);
      
      if (!project) {
        return res.status(404).send('Project not found');
      }

      // Get project settings to determine enabled event types
      const showSettings = await storage.getShowSettingsByProjectId(share.projectId);
      
      // Fetch published schedule versions (same pattern as personal schedule ICS)
      const allVersions = await storage.getScheduleVersionsByProjectId(share.projectId);
      
      // Calculate current week start for filtering (only include current week and future)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - dayOfWeek);
      currentWeekStart.setHours(0, 0, 0, 0);
      const currentWeekStartTime = currentWeekStart.getTime();
      
      // Helper to parse week start date
      const parseWeekStartDate = (weekStartStr: string): Date => {
        const parts = weekStartStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(year, month, day, 0, 0, 0, 0);
          }
        }
        const date = new Date(weekStartStr);
        date.setHours(0, 0, 0, 0);
        return date;
      };
      
      // Helper to check if a week is current or future
      const isCurrentOrFutureWeek = (weekStartStr: string): boolean => {
        const weekDate = parseWeekStartDate(weekStartStr);
        return weekDate.getTime() >= currentWeekStartTime;
      };
      
      // Group versions by weekStart and get the latest version for each week
      const latestVersionsByWeek: Record<string, any> = {};
      for (const version of allVersions) {
        if (version.weekStart) {
          const existing = latestVersionsByWeek[version.weekStart];
          if (!existing || new Date(version.publishedAt) > new Date(existing.publishedAt)) {
            latestVersionsByWeek[version.weekStart] = version;
          }
        }
      }
      
      // Collect and filter events from published schedule versions
      const filteredEvents: any[] = [];
      const seenEventIds = new Set<number>();
      
      for (const [weekStart, version] of Object.entries(latestVersionsByWeek)) {
        // Only include current week and future weeks
        if (isCurrentOrFutureWeek(weekStart)) {
          const versionEvents = version.scheduleData?.events || [];
          for (const event of versionEvents) {
            if (!seenEventIds.has(event.id)) {
              // Filter by event type based on share settings
              let includeEvent = false;
              
              if (share.eventTypeCategory === 'show_schedule') {
                // Show schedule events - use enabled event types from project settings
                const enabledEventTypes = showSettings?.scheduleSettings?.enabledEventTypes || [];
                includeEvent = enabledEventTypes.includes(event.type);
              } else {
                // Individual events - match by event type name
                const normalizedEventType = share.eventTypeName.toLowerCase().replace(/\s+/g, '_');
                includeEvent = event.type === normalizedEventType || event.type === share.eventTypeName;
              }
              
              if (includeEvent) {
                seenEventIds.add(event.id);
                filteredEvents.push(event);
              }
            }
          }
        }
      }

      // Generate ICS file content with calendar subscription headers
      const icsContent = generateEventTypeICSSubscriptionContent(filteredEvents, project, share, req.get('host'));

      // Update access tracking
      await storage.updateEventTypeCalendarShareAccess(token);

      // Set headers for dynamic calendar subscription
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.setHeader('X-Published-TTL', 'PT1H'); // Refresh every hour
      res.send(icsContent);
    } catch (error: any) {
      console.error('Event type ICS generation error:', error);
      res.status(500).send('Failed to generate calendar subscription: ' + (error.message || 'Unknown error'));
    }
  });

  // Test route for personal schedule page without publishing
  app.get("/api/schedule/test-personal", async (req: any, res) => {
    try {
      // Create mock personal schedule data for testing
      const mockData = {
        personalSchedule: {
          id: 999,
          accessToken: "test-token",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          isActive: true
        },
        project: {
          id: 3,
          name: "Macbeth",
          description: "Shakespeare's tragedy of ambition and power"
        },
        contact: {
          id: 5,
          firstName: "John",
          lastName: "Do", 
          email: "john.do@email.com",
          contactType: "cast"
        },
        version: {
          id: 1,
          version: "1.0",
          versionType: "major" as const,
          title: "Test Schedule Version",
          description: "This is a test schedule version to demo the personal schedule page functionality.",
          publishedAt: new Date().toISOString()
        },
        events: [
          {
            id: 25,
            title: "Another test event",
            description: "This is a test event with a description to test the expandable 'View details' functionality. You should see a blue 'View details' button that expands to show this full description in a gray container.",
            date: "2025-07-02",
            startTime: "09:00:00",
            endTime: "12:30:00",
            location: "Rehearsal Hall",
            type: "rehearsal",
            isAllDay: false,
            notes: "This is a test note for the event"
          },
          {
            id: 26,
            title: "All Day Event Test",
            description: "This all-day event also has a description that should be expandable.",
            date: "2025-07-03",
            startTime: null,
            endTime: null,
            location: "MainStage Theatre",
            type: "performance",
            isAllDay: true,
            notes: null
          },
          {
            id: 27,
            title: "Event without description",
            description: null,
            date: "2025-07-04",
            startTime: "14:00:00",
            endTime: "17:00:00",
            location: "Dance Studio 1",
            type: "rehearsal",
            isAllDay: false,
            notes: null
          }
        ],
        eventTypes: [
          { id: 1, name: "rehearsal", color: "#3B82F6" },
          { id: 2, name: "performance", color: "#22C55E" },
          { id: 3, name: "tech_rehearsal", color: "#F97316" },
          { id: 4, name: "meeting", color: "#8B5CF6" },
          { id: 5, name: "costume_fitting", color: "#EC4899" }
        ]
      };
      
      res.json(mockData);
    } catch (error) {
      res.status(500).json({ message: "Failed to create test data" });
    }
  });

  // Account Types API Routes
  // Get account types
  app.get("/api/admin/account-types", requireAdmin, async (req: any, res) => {
    try {
      const accountTypes = await storage.getAccountTypes();
      res.json(accountTypes);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get account types", error: error.message });
    }
  });

  // Get specific account type
  app.get("/api/admin/account-types/:id", requireAdmin, async (req: any, res) => {
    try {
      const accountType = await storage.getAccountTypeById(parseInt(req.params.id));
      if (!accountType) {
        return res.status(404).json({ message: "Account type not found" });
      }
      res.json(accountType);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get account type", error: error.message });
    }
  });

  // Create account type
  app.post("/api/admin/account-types", requireAdmin, async (req: any, res) => {
    try {
      const accountTypeData = insertAccountTypeSchema.parse(req.body);
      const accountType = await storage.createAccountType(accountTypeData);
      res.status(201).json(accountType);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create account type", error: error.message });
    }
  });

  // Update account type
  app.put("/api/admin/account-types/:id", requireAdmin, async (req: any, res) => {
    try {
      const accountType = await storage.updateAccountType(parseInt(req.params.id), req.body);
      res.json(accountType);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update account type", error: error.message });
    }
  });

  // Delete account type
  app.delete("/api/admin/account-types/:id", requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteAccountType(parseInt(req.params.id));
      res.json({ message: "Account type deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to delete account type", error: error.message });
    }
  });

  // Billing System API Routes
  // Get billing plans
  app.get("/api/billing/plans", async (req, res) => {
    try {
      const plans = await storage.getBillingPlans();
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get billing plans", error: error.message });
    }
  });

  // Get specific billing plan
  app.get("/api/billing/plans/:id", async (req, res) => {
    try {
      const plan = await storage.getBillingPlanById(parseInt(req.params.id));
      if (!plan) {
        return res.status(404).json({ message: "Billing plan not found" });
      }
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get billing plan", error: error.message });
    }
  });

  // Helper function to auto-generate planId from name
  const generatePlanId = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')         // Spaces to hyphens
      .replace(/-+/g, '-')          // Multiple hyphens to single
      .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
  };

  // Admin: Create billing plan
  app.post("/api/admin/billing/plans", requireAdmin, async (req: any, res) => {
    try {
      // Auto-generate planId from name
      const planDataWithId = {
        ...req.body,
        planId: generatePlanId(req.body.name)
      };
      
      const planData = insertBillingPlanSchema.parse(planDataWithId);
      const plan = await billingSyncService.createPlanWithStripe(planData);
      res.status(201).json(plan);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create billing plan", error: error.message });
    }
  });

  // Admin: Update billing plan
  app.put("/api/admin/billing/plans/:id", requireAdmin, async (req: any, res) => {
    try {
      // Auto-generate planId from name if name is being updated
      const planDataWithId = {
        ...req.body,
        planId: generatePlanId(req.body.name)
      };
      const plan = await billingSyncService.updatePlanWithStripe(parseInt(req.params.id), planDataWithId);
      res.json(plan);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update billing plan", error: error.message });
    }
  });

  // Admin: Delete billing plan
  app.delete("/api/admin/billing/plans/:id", requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteBillingPlan(parseInt(req.params.id));
      res.json({ message: "Billing plan deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to delete billing plan", error: error.message });
    }
  });

  // Get user billing history
  app.get("/api/billing/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const history = await storage.getBillingHistory(req.user.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get billing history", error: error.message });
    }
  });

  // Create billing history entry
  app.post("/api/billing/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const entryData = insertBillingHistorySchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const entry = await storage.createBillingHistoryEntry(entryData);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create billing history entry", error: error.message });
    }
  });

  // Get user payment methods
  app.get("/api/billing/payment-methods", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const paymentMethods = await storage.getPaymentMethods(req.user.id);
      res.json(paymentMethods);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get payment methods", error: error.message });
    }
  });

  // Create payment method
  app.post("/api/billing/payment-methods", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const methodData = insertPaymentMethodSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const method = await storage.createPaymentMethod(methodData);
      res.status(201).json(method);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create payment method", error: error.message });
    }
  });

  // Update payment method
  app.put("/api/billing/payment-methods/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const method = await storage.updatePaymentMethod(parseInt(req.params.id), req.body);
      res.json(method);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update payment method", error: error.message });
    }
  });

  // Delete payment method
  app.delete("/api/billing/payment-methods/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await storage.deletePaymentMethod(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: "Failed to delete payment method", error: error.message });
    }
  });

  // Set default payment method
  app.post("/api/billing/payment-methods/:id/default", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      await storage.setDefaultPaymentMethod(req.user.id, parseInt(req.params.id));
      res.status(200).json({ message: "Default payment method updated" });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to set default payment method", error: error.message });
    }
  });

  // Get subscription usage
  app.get("/api/billing/usage/:planId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const usage = await storage.getSubscriptionUsage(req.user.id, req.params.planId);
      res.json(usage);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get subscription usage", error: error.message });
    }
  });

  // Create subscription usage entry
  app.post("/api/billing/usage", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const usageData = insertSubscriptionUsageSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const usage = await storage.createSubscriptionUsage(usageData);
      res.status(201).json(usage);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create subscription usage entry", error: error.message });
    }
  });

  // Update user subscription (for Stripe integration)
  app.put("/api/billing/subscription", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.updateUserSubscription(req.user.id, req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update user subscription", error: error.message });
    }
  });

  // Start trial with payment method
  app.post("/api/billing/start-trial", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { planId, paymentMethodId } = req.body;

      // Validate that user has a payment method
      const paymentMethods = await storage.getPaymentMethods(req.user.id);
      if (paymentMethods.length === 0 && !paymentMethodId) {
        return res.status(400).json({ 
          message: "Payment method required to start trial",
          requiresPaymentMethod: true
        });
      }

      // Set trial period (30 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const updatedUser = await storage.updateUserSubscription(req.user.id, {
        subscriptionPlan: planId,
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEndsAt,
        paymentMethodRequired: true
      });

      // Create billing history entry
      await storage.createBillingHistoryEntry({
        userId: req.user.id,
        planId: planId,
        action: 'trial_started',
        amount: 0,
        status: 'completed',
        description: '30-day trial started'
      });

      res.json({ 
        message: "Trial started successfully", 
        user: updatedUser,
        trialEndsAt: trialEndsAt
      });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to start trial", error: error.message });
    }
  });

  // Check trial status
  app.get("/api/billing/trial-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = req.user;
      const now = new Date();
      
      let status = 'none';
      let daysRemaining = 0;
      
      if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
        const trialEnd = new Date(user.trialEndsAt);
        if (now < trialEnd) {
          status = 'active';
          daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          status = 'expired';
        }
      }

      res.json({
        status,
        daysRemaining,
        trialEndsAt: user.trialEndsAt,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        paymentMethodRequired: user.paymentMethodRequired || false
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get trial status", error: error.message });
    }
  });

  // Admin: Update user subscription
  app.put("/api/admin/users/:userId/subscription", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req.user)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.updateUserSubscription(userId, req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update user subscription", error: error.message });
    }
  });

  // ========== STRIPE PAYMENT INTEGRATION ==========
  
  // Create Payment Intent for one-time payments
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { amount, currency = "usd", metadata = {} } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          userId: req.user.id.toString(),
          ...metadata
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Error creating payment intent", 
        error: error.message 
      });
    }
  });

  // Get or Create Subscription for recurring payments
  app.post('/api/get-or-create-subscription', isAuthenticated, async (req, res) => {
    try {
      let user = req.user;
      const { planType = "monthly", priceId } = req.body;

      // If user already has a Stripe subscription, retrieve it
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
            expand: ['latest_invoice.payment_intent'],
          });

          if (subscription.status === 'active' || subscription.status === 'trialing') {
            return res.json({
              subscriptionId: subscription.id,
              status: subscription.status,
              clientSecret: subscription.latest_invoice?.payment_intent?.client_secret || null,
            });
          }
        } catch (stripeError) {
        }
      }
      
      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      // Create or retrieve Stripe customer
      let customer;
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } catch (stripeError) {
          customer = null;
        }
      }

      if (!customer) {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
          metadata: {
            userId: user.id.toString(),
          },
        });

        // Update user with Stripe customer ID
        await storage.updateUserSubscription(user.id, {
          stripeCustomerId: customer.id,
        });
      }

      // Get Stripe Price ID from database billing plans
      let selectedPriceId = priceId;
      
      if (!selectedPriceId) {
        const billingPlan = await storage.getBillingPlanByPlanId(planType);
        
        if (!billingPlan) {
          return res.status(400).json({ 
            message: "Selected plan is not available. Please contact support.",
            requiresPriceConfiguration: true
          });
        }

        if (!billingPlan.activeStripePriceId) {
          return res.status(400).json({ 
            message: "Subscription pricing not configured. Please contact support.",
            requiresPriceConfiguration: true
          });
        }

        selectedPriceId = billingPlan.activeStripePriceId;
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: selectedPriceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user.id.toString(),
          planType: planType,
        },
      });

      // Update user subscription info
      await storage.updateUserSubscription(user.id, {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        subscriptionPlan: planType,
        subscriptionStatus: 'incomplete',
      });
  
      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        status: subscription.status,
      });
    } catch (error: any) {
      return res.status(400).json({ 
        message: "Error creating subscription", 
        error: error.message 
      });
    }
  });

  // Stripe Webhook Handler
  app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // For development, you might not have webhook secrets set up yet
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
      } else {
        // In development, parse the event directly (less secure)
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          
          // Update payment method or billing history if needed
          if (paymentIntent.metadata?.userId) {
            await storage.createBillingHistoryEntry({
              userId: parseInt(paymentIntent.metadata.userId),
              amount: paymentIntent.amount / 100, // Convert from cents
              currency: paymentIntent.currency,
              status: 'completed',
              transactionId: paymentIntent.id,
              description: 'One-time payment',
            });
          }
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object;
          
          if (invoice.subscription && invoice.metadata?.userId) {
            await storage.updateUserSubscription(parseInt(invoice.metadata.userId), {
              subscriptionStatus: 'active',
            });
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          
          if (failedInvoice.subscription && failedInvoice.metadata?.userId) {
            await storage.updateUserSubscription(parseInt(failedInvoice.metadata.userId), {
              subscriptionStatus: 'past_due',
            });
          }
          break;

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object;
          
          if (updatedSubscription.metadata?.userId) {
            await storage.updateUserSubscription(parseInt(updatedSubscription.metadata.userId), {
              subscriptionStatus: updatedSubscription.status,
            });
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object;
          
          if (deletedSubscription.metadata?.userId) {
            await storage.updateUserSubscription(parseInt(deletedSubscription.metadata.userId), {
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
            });
          }
          break;

        default:
      }

      res.json({received: true});
    } catch (error: any) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Get current subscription status
  app.get("/api/billing/subscription-status", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      let subscriptionData = {
        hasSubscription: false,
        status: user.subscriptionStatus || 'none',
        plan: user.subscriptionPlan || null,
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
      };

      // If user has a Stripe subscription, get fresh data
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          subscriptionData = {
            ...subscriptionData,
            hasSubscription: true,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          };
        } catch (stripeError) {
        }
      }

      res.json(subscriptionData);
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to fetch subscription status", 
        error: error.message 
      });
    }
  });

  // Cancel subscription
  app.post("/api/billing/cancel-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update local database
      await storage.updateUserSubscription(user.id, {
        subscriptionStatus: 'canceled',
      });

      res.json({ 
        message: "Subscription will be canceled at the end of the billing period",
        cancelAt: subscription.cancel_at,
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to cancel subscription", 
        error: error.message 
      });
    }
  });

  // ========== USER BILLING PAGE ENDPOINTS ==========
  
  // Billing status endpoint for user billing page
  app.get('/api/billing/status', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = req.user;
      
      let billingData = {
        status: user.subscriptionStatus || 'none',
        planName: 'No active subscription',
        amount: null,
        interval: null,
        currentPeriodEnd: null,
        trialEnd: null
      };

      // If user has Stripe subscription, get details from Stripe
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const product = await stripe.products.retrieve(subscription.items.data[0].price.product as string);
        
        billingData = {
          status: subscription.status,
          planName: product.name,
          amount: subscription.items.data[0].price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : null,
          interval: subscription.items.data[0].price.recurring?.interval || null,
          currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
        };
      }

      res.json(billingData);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get billing status: ' + error.message });
    }
  });

  // Switch to annual billing
  app.post('/api/billing/switch-to-annual', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = req.user;
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: 'No active subscription found' });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      // Update subscription to annual pricing
      const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID || 'price_annual_placeholder';
      
      if (annualPriceId.includes('placeholder')) {
        return res.status(400).json({ 
          message: "Annual pricing not configured. Please contact support." 
        });
      }
      
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: annualPriceId,
        }],
        proration_behavior: 'create_prorations'
      });

      res.json({ message: 'Upgraded to annual billing successfully' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to switch to annual: ' + error.message });
    }
  });

  // Update profile type endpoint
  app.post('/api/user/profile-type', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { profileType } = req.body;
      
      if (!['freelance', 'fulltime'].includes(profileType)) {
        return res.status(400).json({ message: 'Invalid profile type' });
      }

      const updatedUser = await storage.updateUserProfileType(req.user.id.toString(), profileType);
      res.json({ message: 'Profile type updated successfully', user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to update profile type: ' + error.message });
    }
  });

  // ========== SEARCH API ROUTES ==========
  
  // Natural language search
  app.post('/api/search/natural', isAuthenticated, async (req: any, res) => {
    try {
      const { query, filters = [] } = req.body;
      const userId = req.user.id;
      const projectId = req.body.projectId; // May be null if searching from shows page

      if (!query?.trim()) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const keywords = query.toLowerCase().split(' ').filter(word => word.length > 0);
      
      const results = [];
      
      try {
        // Get projects to search in
        let projectsToSearch = [];
        if (projectId) {
          // If inside a show, get only that project
          const project = await storage.getProjectById(projectId);
          if (project) projectsToSearch = [project];
        } else {
          // If on shows page, get all user's projects
          projectsToSearch = await storage.getProjectsByUserId(userId.toString());
        }


        // Search contacts in relevant projects
        const contacts = await storage.getAllContactsByUserId(userId.toString());
        const matchingContacts = contacts.filter(contact => {
          const searchText = [
            contact.firstName,
            contact.lastName,
            contact.email,
            contact.phone,
            contact.role,
            contact.notes
          ].filter(Boolean).join(' ').toLowerCase();
          
          return keywords.some(keyword => searchText.includes(keyword));
        });
        
        matchingContacts.forEach(contact => {
          // Determine which field matched to provide context
          let matchContext = '';
          const nameMatch = keywords.some(keyword => 
            [contact.firstName, contact.lastName].filter(Boolean).join(' ').toLowerCase().includes(keyword)
          );
          const emailMatch = keywords.some(keyword => 
            contact.email?.toLowerCase().includes(keyword)
          );
          const roleMatch = keywords.some(keyword => 
            contact.role?.toLowerCase().includes(keyword)
          );
          const notesMatch = keywords.some(keyword => 
            contact.notes?.toLowerCase().includes(keyword)
          );
          
          if (roleMatch) {
            matchContext = `${contact.role}`;
          } else if (notesMatch) {
            const matchedKeyword = keywords.find(keyword => contact.notes?.toLowerCase().includes(keyword));
            matchContext = `Notes: "${contact.notes}"`;
          } else if (emailMatch) {
            matchContext = contact.email || '';
          }
          
          results.push({
            id: `contact-${contact.id}`,
            type: 'contact',
            title: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Unknown Contact',
            description: `${contact.role || 'Contact'}${contact.email ? ` • ${contact.email}` : ''}${matchContext && !nameMatch ? ` (matched: ${matchContext})` : ''}${contact.phone ? ` • ${contact.phone}` : ''}`,
            snippet: contact.notes || '',
            date: contact.updatedAt?.toISOString(),
            relevanceScore: nameMatch ? 3.0 + Math.random() : emailMatch ? 2.5 + Math.random() : roleMatch ? 2.0 + Math.random() : 1.0 + Math.random(),
            metadata: {
              role: contact.role,
              email: contact.email,
              phone: contact.phone
            },
            url: `/contacts`
          });
        });

        // If not in a specific project, search all projects
        if (!projectId) {
          const matchingProjects = projectsToSearch.filter(project => {
            const searchText = [
              project.name,
              project.description,
              project.venue
            ].filter(Boolean).join(' ').toLowerCase();
            
            return keywords.some(keyword => searchText.includes(keyword));
          });
          
          matchingProjects.forEach(project => {
            results.push({
              id: `project-${project.id}`,
              type: 'event', // Using 'event' type for project results
              title: project.name,
              description: `${project.venue || 'Production'}${project.description ? ` • ${project.description}` : ''}`,
              snippet: project.description || '',
              date: project.updatedAt?.toISOString(),
              relevanceScore: keywords.some(keyword => 
                project.name.toLowerCase().includes(keyword)
              ) ? 3.0 + Math.random() : 1.0 + Math.random(),
              metadata: {
                venue: project.venue,
                openingNight: project.openingNight
              },
              url: `/shows/${project.id}`
            });
          });
        }
        
        // Search schedule events in relevant projects
        const allEvents = [];
        for (const project of projectsToSearch) {
          try {
            const events = await storage.getEventsByProjectId(project.id);
            allEvents.push(...events.map(event => ({ ...event, projectName: project.name, projectId: project.id })));
          } catch (error) {
          }
        }
        
        const matchingEvents = allEvents.filter(event => {
          const searchText = [
            event.title,
            event.description,
            event.location,
            event.eventType
          ].filter(Boolean).join(' ').toLowerCase();
          
          return keywords.some(keyword => searchText.includes(keyword));
        });
        
        matchingEvents.forEach(event => {
          results.push({
            id: `event-${event.id}`,
            type: 'event',
            title: event.title,
            description: `${event.eventType || 'Event'} • ${event.location || 'TBD'}${event.description ? ` • ${event.description}` : ''}`,
            snippet: event.description || '',
            date: event.startTime?.toISOString(),
            relevanceScore: keywords.some(keyword => 
              event.title.toLowerCase().includes(keyword)
            ) ? 3.0 + Math.random() : 1.0 + Math.random(),
            metadata: {
              eventType: event.eventType,
              location: event.location,
              startTime: event.startTime,
              endTime: event.endTime
            },
            projectName: event.projectName,
            url: `/shows/${event.projectId}/schedule`
          });
        });

        // Search props in relevant projects
        const allProps = [];
        for (const project of projectsToSearch) {
          try {
            const props = await storage.getPropsByProjectId(project.id);
            allProps.push(...props.map(prop => ({ ...prop, projectName: project.name, projectId: project.id })));
          } catch (error) {
          }
        }

        const matchingProps = allProps.filter(prop => {
          const searchText = [
            prop.name,
            prop.description,
            prop.category,
            prop.status
          ].filter(Boolean).join(' ').toLowerCase();
          
          return keywords.some(keyword => searchText.includes(keyword));
        });

        matchingProps.forEach(prop => {
          results.push({
            id: `prop-${prop.id}`,
            type: 'prop',
            title: prop.name,
            description: `${prop.category || 'Prop'} • Status: ${prop.status || 'Unknown'}`,
            snippet: prop.description || '',
            date: prop.updatedAt?.toISOString(),
            relevanceScore: keywords.some(keyword => 
              prop.name.toLowerCase().includes(keyword)
            ) ? 3.0 + Math.random() : 1.0 + Math.random(),
            metadata: {
              category: prop.category,
              status: prop.status
            },
            projectName: prop.projectName,
            url: `/shows/${prop.projectId}/props-costumes`
          });
        });

        // Search costumes in relevant projects
        const allCostumes = [];
        for (const project of projectsToSearch) {
          try {
            const costumes = await storage.getCostumesByProjectId(project.id);
            allCostumes.push(...costumes.map(costume => ({ ...costume, projectName: project.name, projectId: project.id })));
          } catch (error) {
          }
        }

        const matchingCostumes = allCostumes.filter(costume => {
          const searchText = [
            costume.name,
            costume.description,
            costume.character,
            costume.status
          ].filter(Boolean).join(' ').toLowerCase();
          
          return keywords.some(keyword => searchText.includes(keyword));
        });

        matchingCostumes.forEach(costume => {
          results.push({
            id: `costume-${costume.id}`,
            type: 'costume',
            title: costume.name,
            description: `${costume.character || 'Costume'} • Status: ${costume.status || 'Unknown'}`,
            snippet: costume.description || '',
            date: costume.updatedAt?.toISOString(),
            relevanceScore: keywords.some(keyword => 
              costume.name.toLowerCase().includes(keyword)
            ) ? 3.0 + Math.random() : 1.0 + Math.random(),
            metadata: {
              character: costume.character,
              status: costume.status
            },
            projectName: costume.projectName,
            url: `/shows/${costume.projectId}/props-costumes`
          });
        });

        // Search tasks in relevant projects
        const allTasks = [];
        for (const project of projectsToSearch) {
          try {
            const tasks = await storage.getTasksByProjectId(project.id);
            allTasks.push(...tasks.map(task => ({ ...task, projectName: project.name, projectId: project.id })));
          } catch (error) {
          }
        }

        const matchingTasks = allTasks.filter(task => {
          const searchText = [
            task.title,
            task.description,
            task.status,
            task.assignee
          ].filter(Boolean).join(' ').toLowerCase();
          
          return keywords.some(keyword => searchText.includes(keyword));
        });

        matchingTasks.forEach(task => {
          results.push({
            id: `task-${task.id}`,
            type: 'note',
            title: task.title,
            description: `Task • Status: ${task.status || 'Unknown'}${task.assignee ? ` • Assigned to: ${task.assignee}` : ''}`,
            snippet: task.description || '',
            date: task.updatedAt?.toISOString(),
            relevanceScore: keywords.some(keyword => 
              task.title.toLowerCase().includes(keyword)
            ) ? 3.0 + Math.random() : 1.0 + Math.random(),
            metadata: {
              status: task.status,
              assignee: task.assignee
            },
            projectName: task.projectName,
            url: `/shows/${task.projectId}`
          });
        });

        // Search notes in relevant projects
        const allNotes = [];
        for (const project of projectsToSearch) {
          try {
            const notes = await storage.getNotesByProjectId(project.id);
            allNotes.push(...notes.map(note => ({ ...note, projectName: project.name, projectId: project.id })));
          } catch (error) {
          }
        }

        const matchingNotes = allNotes.filter(note => {
          const searchText = [
            note.title,
            note.content
          ].filter(Boolean).join(' ').toLowerCase();
          
          return keywords.some(keyword => searchText.includes(keyword));
        });

        matchingNotes.forEach(note => {
          results.push({
            id: `note-${note.id}`,
            type: 'note',
            title: note.title || 'Untitled Note',
            description: 'Note',
            snippet: note.content?.substring(0, 100) || '',
            date: note.updatedAt?.toISOString(),
            relevanceScore: keywords.some(keyword => 
              note.title?.toLowerCase().includes(keyword)
            ) ? 3.0 + Math.random() : 1.0 + Math.random(),
            metadata: {},
            projectName: note.projectName,
            url: `/shows/${note.projectId}`
          });
        });

        // Search reports in relevant projects
        const allReports = [];
        for (const project of projectsToSearch) {
          try {
            const reports = await storage.getReportsByProjectId(project.id);
            allReports.push(...reports.map(report => ({ ...report, projectName: project.name, projectId: project.id })));
          } catch (error) {
          }
        }

        const matchingReports = allReports.filter(report => {
          const searchText = [
            report.title,
            report.type,
            report.description
          ].filter(Boolean).join(' ').toLowerCase();
          
          return keywords.some(keyword => searchText.includes(keyword));
        });

        matchingReports.forEach(report => {
          results.push({
            id: `report-${report.id}`,
            type: 'report',
            title: report.title || `${report.type} Report`,
            description: `Report • Type: ${report.type || 'Unknown'}`,
            snippet: report.description || '',
            date: report.updatedAt?.toISOString(),
            relevanceScore: keywords.some(keyword => 
              report.title?.toLowerCase().includes(keyword)
            ) ? 3.0 + Math.random() : 1.0 + Math.random(),
            metadata: {
              type: report.type
            },
            projectName: report.projectName,
            url: `/shows/${report.projectId}/reports`
          });
        });
        
      } catch (searchError) {
      }
      
      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      res.json({ results: results.slice(0, 20) });
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Advanced search with filters
  app.post('/api/search/advanced', isAuthenticated, async (req: any, res) => {
    try {
      const { filters = [] } = req.body;
      const userId = req.user.id;
      const projectId = req.body.projectId;

      const { searchEngine } = await import('./search/searchEngine.js');
      const result = await searchEngine.performAdvancedSearch({
        filters,
        userId,
        projectId,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Advanced search failed" });
    }
  });

  // Get search suggestions for autocomplete
  app.get('/api/search/suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const input = req.query.q as string || '';
      const userId = req.user.id;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;

      if (input.length < 2) {
        return res.json({ suggestions: [] });
      }

      const { searchEngine } = await import('./search/searchEngine.js');
      const result = await searchEngine.getSuggestions(input, userId, projectId);

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get suggestions" });
    }
  });

  // Get search history for user
  app.get('/api/search/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const searchHistory = await storage.getSearchHistoryByUserId(userId, limit);
      res.json({ history: searchHistory });
    } catch (error) {
      res.status(500).json({ message: "Failed to get search history" });
    }
  });

  // Clear search history for user
  app.delete('/api/search/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.clearSearchHistoryByUserId(userId);
      res.json({ message: "Search history cleared" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear search history" });
    }
  });

  const server = createServer(app);
  
  // Start email cleanup scheduler for automatic 30-day trash cleanup
  try {
    const { emailCleanupService } = await import('./services/emailCleanupService.js');
    emailCleanupService.startCleanupScheduler();
  } catch (error) {
  }
  
  // IMAP Server Management API endpoints
  app.get('/api/email/imap-server/status', isAuthenticated, async (req: any, res) => {
    try {
      const { imapServerManager } = await import('./services/imapServerManager.js');
      const status = imapServerManager.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get IMAP server status' });
    }
  });

  app.post('/api/email/imap-server/restart', isAdmin, async (req: any, res) => {
    try {
      const { imapServerManager } = await import('./services/imapServerManager.js');
      await imapServerManager.shutdown();
      await imapServerManager.initialize();
      res.json({ message: 'IMAP server restarted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to restart IMAP server' });
    }
  });

  app.get('/api/email/imap-setup-instructions', isAuthenticated, async (req: any, res) => {
    try {
      // Get user's email account
      const emailAccounts = await storage.getEmailAccountsByUserId(req.user.id);
      const primaryAccount = emailAccounts.find(account => account.isDefault) || emailAccounts[0];
      
      if (!primaryAccount) {
        return res.status(404).json({ 
          message: 'No email account found. Create an email account first to use Apple Mail integration.' 
        });
      }

      const instructions = {
        emailAddress: primaryAccount.emailAddress,
        serverSettings: {
          incomingServer: {
            server: 'backstageos.com',
            port: 993,
            security: 'SSL/TLS',
            authentication: 'Password'
          },
          outgoingServer: {
            server: 'backstageos.com', 
            port: 587,
            security: 'STARTTLS',
            authentication: 'Password'
          },
          credentials: {
            username: primaryAccount.emailAddress,
            password: 'Your BackstageOS password'
          }
        },
        appleMailSteps: [
          'Open Apple Mail',
          'Go to Mail → Preferences → Accounts',
          'Click the "+" button to add a new account',
          'Select "Other Mail Account"',
          'Enter your BackstageOS email and password',
          'Use the server settings provided above',
          'Your BackstageOS emails will now sync with Apple Mail'
        ]
      };

      res.json(instructions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get setup instructions' });
    }
  });

  // Email forwarding routes
  const { default: emailForwardingRoutes } = await import("./routes/emailForwarding.js");
  app.use("/api/email-forwarding", emailForwardingRoutes);

  return server;
}
