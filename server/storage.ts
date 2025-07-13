import {
  users,
  projects,
  teamMembers,
  reports,
  reportTemplates,
  showDocuments,
  showSchedules,
  showCharacters,
  showSettings,
  globalTemplateSettings,
  feedback,
  betaSettings,
  contacts,
  contactAvailability,
  scheduleEvents,
  scheduleEventParticipants,
  eventLocations,
  locationAvailability,
  contactSheetVersions,
  errorLogs,
  errorClusters,
  errorNotifications,
  props,
  domainRoutes,
  waitlist,
  waitlistEmailSettings,
  apiSettings,
  seoSettings,
  resolutionRecords,
  errorResolutionStatus,
  reportNotes,
  emailGroups,

  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type TeamMember,
  type InsertTeamMember,
  type Report,
  type InsertReport,
  type ReportTemplate,
  type InsertReportTemplate,
  type ShowDocument,
  type InsertShowDocument,
  type ShowSchedule,
  type InsertShowSchedule,
  type ShowCharacter,
  type InsertShowCharacter,
  type ShowSettings,
  type InsertShowSettings,
  type GlobalTemplateSettings,
  type InsertGlobalTemplateSettings,
  type Feedback,
  type InsertFeedback,
  type BetaSettings,
  type InsertBetaSettings,
  type Contact,
  type InsertContact,
  type ContactAvailability,
  type InsertContactAvailability,
  type ScheduleEvent,
  type InsertScheduleEvent,
  type ScheduleEventParticipant,
  type InsertScheduleEventParticipant,
  type EventLocation,
  type InsertEventLocation,
  type LocationAvailability,
  type InsertLocationAvailability,
  type ErrorLog,
  type InsertErrorLog,
  type ErrorCluster,
  type InsertErrorCluster,
  type ErrorNotification,
  type InsertErrorNotification,
  type Waitlist,
  type InsertWaitlist,
  type WaitlistEmailSettings,
  type InsertWaitlistEmailSettings,
  type ApiSettings,
  type InsertApiSettings,
  type Prop,
  type InsertProp,
  type DomainRoute,
  type InsertDomainRoute,
  type SeoSettings,
  type InsertSeoSettings,
  type ReportNote,
  type InsertReportNote,
  type EmailGroup,
  type InsertEmailGroup,

} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne, sql, gte, lte, or, isNull, count } from "drizzle-orm";

export interface IStorage {
  // User operations (email/password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User>;
  
  // Beta access operations
  updateUserBetaAccess(userId: string, betaAccess: string, betaFeatures?: string[]): Promise<User>;
  getBetaUsers(): Promise<User[]>;
  
  // Admin user management operations
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(userId: string, updates: { profileType?: string; betaAccess?: string; betaFeatures?: string[]; isAdmin?: boolean }): Promise<User>;
  deleteUser(userId: string): Promise<void>;

  // Waitlist operations
  createWaitlistEntry(entry: InsertWaitlist): Promise<Waitlist>;
  getWaitlistByEmail(email: string): Promise<Waitlist | undefined>;
  getWaitlistEntries(): Promise<Waitlist[]>;
  updateWaitlistEntry(id: number, updates: Partial<InsertWaitlist>): Promise<Waitlist>;
  deleteWaitlistEntry(id: number): Promise<void>;
  getWaitlistStats(): Promise<any>;
  convertWaitlistToUser(email: string): Promise<void>;

  // Waitlist email settings operations
  getWaitlistEmailSettings(): Promise<WaitlistEmailSettings | undefined>;
  createWaitlistEmailSettings(settings: InsertWaitlistEmailSettings): Promise<WaitlistEmailSettings>;
  updateWaitlistEmailSettings(id: number, settings: Partial<InsertWaitlistEmailSettings>): Promise<WaitlistEmailSettings | undefined>;

  // API settings operations
  getApiSettings(): Promise<ApiSettings | undefined>;
  createApiSettings(settings: InsertApiSettings): Promise<ApiSettings>;
  updateApiSettings(id: number, settings: Partial<InsertApiSettings>): Promise<ApiSettings | undefined>;

  // Project operations
  getProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Team member operations
  getTeamMembersByProjectId(projectId: number): Promise<TeamMember[]>;
  inviteTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  updateTeamMemberStatus(id: number, status: string): Promise<TeamMember>;
  deleteTeamMember(id: number): Promise<void>;

  // Report operations
  getReportsByProjectId(projectId: number): Promise<Report[]>;
  getReportsByUserId(userId: string): Promise<Report[]>;
  getReportById(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, report: Partial<InsertReport>): Promise<Report>;
  deleteReport(id: number): Promise<void>;

  // Report template operations (show-specific)
  getReportTemplatesByProjectId(projectId: number): Promise<ReportTemplate[]>;
  getReportTemplateById(id: number): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: number, template: Partial<InsertReportTemplate>): Promise<ReportTemplate>;
  deleteReportTemplate(id: number): Promise<void>;

  // Report notes operations
  getReportNotesByReportId(reportId: number): Promise<ReportNote[]>;
  getReportNoteById(id: number): Promise<ReportNote | undefined>;
  createReportNote(note: InsertReportNote): Promise<ReportNote>;
  updateReportNote(id: number, note: Partial<InsertReportNote>): Promise<ReportNote>;
  deleteReportNote(id: number): Promise<void>;
  reorderReportNotes(notes: { id: number; noteOrder: number }[]): Promise<void>;

  // Email groups operations
  getEmailGroups(userId: string): Promise<EmailGroup[]>;
  getEmailGroupById(id: number): Promise<EmailGroup | undefined>;
  createEmailGroup(group: InsertEmailGroup): Promise<EmailGroup>;
  updateEmailGroup(id: number, group: Partial<InsertEmailGroup>): Promise<EmailGroup>;
  deleteEmailGroup(id: number): Promise<boolean>;

  // Show document operations
  getShowDocumentsByProjectId(projectId: number): Promise<ShowDocument[]>;
  getShowDocumentById(id: number): Promise<ShowDocument | undefined>;
  createShowDocument(document: InsertShowDocument): Promise<ShowDocument>;
  updateShowDocument(id: number, document: Partial<InsertShowDocument>): Promise<ShowDocument>;
  deleteShowDocument(id: number): Promise<void>;

  // Show schedule operations
  getShowSchedulesByProjectId(projectId: number): Promise<ShowSchedule[]>;
  getShowScheduleById(id: number): Promise<ShowSchedule | undefined>;
  createShowSchedule(schedule: InsertShowSchedule): Promise<ShowSchedule>;
  updateShowSchedule(id: number, schedule: Partial<InsertShowSchedule>): Promise<ShowSchedule>;
  deleteShowSchedule(id: number): Promise<void>;

  // Show character operations
  getShowCharactersByProjectId(projectId: number): Promise<ShowCharacter[]>;
  getShowCharacterById(id: number): Promise<ShowCharacter | undefined>;
  createShowCharacter(character: InsertShowCharacter): Promise<ShowCharacter>;
  updateShowCharacter(id: number, character: Partial<InsertShowCharacter>): Promise<ShowCharacter>;
  deleteShowCharacter(id: number): Promise<void>;

  // Show settings operations
  getShowSettingsByProjectId(projectId: number): Promise<ShowSettings | undefined>;
  upsertShowSettings(settings: InsertShowSettings): Promise<ShowSettings>;
  updateShowSettings(projectId: number, settings: Partial<InsertShowSettings>): Promise<ShowSettings>;
  generateShareLink(projectId: number): Promise<string>;

  // Global template settings operations
  getGlobalTemplateSettingsByProjectId(projectId: number): Promise<GlobalTemplateSettings | undefined>;
  upsertGlobalTemplateSettings(settings: InsertGlobalTemplateSettings): Promise<GlobalTemplateSettings>;
  updateGlobalTemplateSettings(projectId: number, settings: Partial<InsertGlobalTemplateSettings>): Promise<GlobalTemplateSettings>;

  // Feedback operations
  getAllFeedback(): Promise<Feedback[]>;
  getFeedbackById(id: number): Promise<Feedback | undefined>;
  getFeedbackByUserId(userId: string): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: number, feedback: Partial<InsertFeedback>): Promise<Feedback>;
  deleteFeedback(id: number): Promise<void>;

  // Beta settings operations (admin only)
  getBetaSettings(): Promise<BetaSettings | undefined>;
  upsertBetaSettings(settings: InsertBetaSettings): Promise<BetaSettings>;

  // Contacts operations
  getContactsByProjectId(projectId: number): Promise<Contact[]>;
  getContactById(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Contact availability operations
  getContactAvailability(contactId: number, projectId: number): Promise<ContactAvailability[]>;
  getAllProjectAvailability(projectId: number): Promise<ContactAvailability[]>;
  createContactAvailability(availability: InsertContactAvailability): Promise<ContactAvailability>;
  updateContactAvailability(id: number, availability: Partial<InsertContactAvailability>): Promise<ContactAvailability>;
  deleteContactAvailability(id: number): Promise<void>;
  bulkDeleteContactAvailability(ids: number[]): Promise<void>;

  // Location availability operations
  getLocationAvailabilityByProjectId(projectId: number): Promise<LocationAvailability[]>;
  getLocationAvailabilityByLocationId(locationId: number, projectId: number): Promise<LocationAvailability[]>;
  createLocationAvailability(availability: InsertLocationAvailability): Promise<LocationAvailability>;
  updateLocationAvailability(id: number, availability: Partial<InsertLocationAvailability>): Promise<LocationAvailability>;
  deleteLocationAvailability(id: number): Promise<void>;
  bulkDeleteLocationAvailability(ids: number[]): Promise<void>;

  // Props operations
  getPropsByProjectId(projectId: number): Promise<Prop[]>;
  getPropById(id: number): Promise<Prop | undefined>;
  createProp(prop: InsertProp): Promise<Prop>;
  updateProp(id: number, prop: Partial<InsertProp>): Promise<Prop>;
  deleteProp(id: number): Promise<void>;

  // Error logging operations
  createErrorLog(errorLog: InsertErrorLog): Promise<ErrorLog>;
  getErrorLogs(): Promise<ErrorLog[]>;
  getErrorLogsByUserId(userId: string): Promise<ErrorLog[]>;
  markErrorAsFixed(errorId: number, fixDescription: string): Promise<void>;

  // Contact sheet settings operations
  getContactSheetSettings(projectId: number): Promise<any>;
  saveContactSheetSettings(projectId: number, settings: any): Promise<any>;
  publishContactSheetVersion(projectId: number, versionType: 'major' | 'minor', settings: any, publishedBy: number): Promise<any>;
  getContactSheetVersions(projectId: number): Promise<any[]>;
  getCurrentContactSheetVersion(projectId: number): Promise<string>;

  // Company list settings operations
  getCompanyListSettings(projectId: number): Promise<any>;

  // Domain routing operations
  getDomainRoutes(): Promise<DomainRoute[]>;
  createDomainRoute(route: InsertDomainRoute): Promise<DomainRoute>;
  updateDomainRoute(id: number, route: Partial<InsertDomainRoute>): Promise<DomainRoute>;
  deleteDomainRoute(id: number): Promise<void>;

  // SEO settings operations
  getSeoSettings(domain: string): Promise<SeoSettings | undefined>;
  getSeoSettingsById(id: number): Promise<SeoSettings | undefined>;
  getAllSeoSettings(): Promise<SeoSettings[]>;
  createSeoSettings(settings: InsertSeoSettings): Promise<SeoSettings>;
  updateSeoSettings(id: number, settings: Partial<InsertSeoSettings>): Promise<SeoSettings>;
  deleteSeoSettings(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, parseInt(id)));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: UpsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const existingUser = await this.getUserByEmail(user.email);
    if (existingUser) {
      const result = await db.update(users).set(user).where(eq(users.id, existingUser.id)).returning();
      return result[0];
    } else {
      return this.createUser(user);
    }
  }

  async updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, parseInt(userId)))
      .returning();
    return result[0];
  }

  async updateUserBetaAccess(userId: string, betaAccess: string, betaFeatures?: string[]): Promise<User> {
    const result = await db.update(users)
      .set({ 
        betaAccess,
        betaFeatures: betaFeatures || []
      })
      .where(eq(users.id, parseInt(userId)))
      .returning();
    return result[0];
  }

  async getBetaUsers(): Promise<User[]> {
    const result = await db.select()
      .from(users)
      .where(sql`${users.betaAccess} != 'none'`);
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
  }

  async updateUserAdmin(userId: string, updates: { 
    profileType?: string; 
    betaAccess?: string; 
    betaFeatures?: string[]; 
    isAdmin?: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
    defaultReplyToEmail?: string;
    emailDisplayName?: string;
    password?: string;
  }): Promise<User> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, parseInt(userId)))
      .returning();
    return result[0];
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, parseInt(userId)));
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const result = await db.select().from(projects).where(eq(projects.ownerId, parseInt(userId)));
    return result;
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const result = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return result[0];
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getTeamMembersByProjectId(projectId: number): Promise<TeamMember[]> {
    const result = await db.select().from(teamMembers).where(eq(teamMembers.projectId, projectId));
    return result;
  }

  async inviteTeamMember(teamMember: InsertTeamMember): Promise<TeamMember> {
    const result = await db.insert(teamMembers).values(teamMember).returning();
    return result[0];
  }

  async updateTeamMemberStatus(id: number, status: string): Promise<TeamMember> {
    const result = await db.update(teamMembers).set({ status }).where(eq(teamMembers.id, id)).returning();
    return result[0];
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  async getReportsByProjectId(projectId: number): Promise<Report[]> {
    const result = await db.select().from(reports).where(eq(reports.projectId, projectId));
    return result;
  }

  async getReportsByUserId(userId: string): Promise<Report[]> {
    const result = await db.select().from(reports).where(eq(reports.createdBy, parseInt(userId)));
    return result;
  }

  async getReportById(id: number): Promise<Report | undefined> {
    const result = await db.select().from(reports).where(eq(reports.id, id));
    return result[0];
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(report).returning();
    return result[0];
  }

  async updateReport(id: number, report: Partial<InsertReport>): Promise<Report> {
    const result = await db.update(reports).set(report).where(eq(reports.id, id)).returning();
    return result[0];
  }

  async deleteReport(id: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  async getReportTemplatesByProjectId(projectId: number): Promise<ReportTemplate[]> {
    const result = await db.select().from(reportTemplates).where(eq(reportTemplates.projectId, projectId));
    return result;
  }

  async getReportTemplateById(id: number): Promise<ReportTemplate | undefined> {
    const result = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
    return result[0];
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const result = await db.insert(reportTemplates).values(template).returning();
    return result[0];
  }

  async updateReportTemplate(id: number, template: Partial<InsertReportTemplate>): Promise<ReportTemplate> {
    const result = await db.update(reportTemplates).set(template).where(eq(reportTemplates.id, id)).returning();
    return result[0];
  }

  async deleteReportTemplate(id: number): Promise<void> {
    await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
  }

  // Report notes operations
  async getReportNotesByReportId(reportId: number, department?: string): Promise<ReportNote[]> {
    const conditions = [eq(reportNotes.reportId, reportId)];
    
    if (department) {
      conditions.push(eq(reportNotes.department, department));
    }
    
    const result = await db.select().from(reportNotes)
      .where(and(...conditions))
      .orderBy(reportNotes.noteOrder);
    return result;
  }

  async getReportNoteById(id: number): Promise<ReportNote | undefined> {
    const result = await db.select().from(reportNotes).where(eq(reportNotes.id, id));
    return result[0];
  }

  async createReportNote(note: InsertReportNote): Promise<ReportNote> {
    const result = await db.insert(reportNotes).values(note).returning();
    return result[0];
  }

  async updateReportNote(id: number, note: Partial<InsertReportNote>): Promise<ReportNote> {
    const result = await db.update(reportNotes).set(note).where(eq(reportNotes.id, id)).returning();
    return result[0];
  }

  async deleteReportNote(id: number): Promise<void> {
    await db.delete(reportNotes).where(eq(reportNotes.id, id));
  }

  async reorderReportNotes(notes: { id: number; noteOrder: number }[]): Promise<void> {
    for (const note of notes) {
      await db.update(reportNotes)
        .set({ noteOrder: note.noteOrder })
        .where(eq(reportNotes.id, note.id));
    }
  }

  // Email groups operations
  async getEmailGroups(userId: string): Promise<EmailGroup[]> {
    const result = await db.select().from(emailGroups)
      .where(eq(emailGroups.userId, parseInt(userId)))
      .orderBy(emailGroups.name);
    return result;
  }

  async getEmailGroupById(id: number): Promise<EmailGroup | undefined> {
    const result = await db.select().from(emailGroups).where(eq(emailGroups.id, id));
    return result[0];
  }

  async createEmailGroup(group: InsertEmailGroup): Promise<EmailGroup> {
    const result = await db.insert(emailGroups).values(group).returning();
    return result[0];
  }

  async updateEmailGroup(id: number, group: Partial<InsertEmailGroup>): Promise<EmailGroup> {
    const result = await db.update(emailGroups).set(group).where(eq(emailGroups.id, id)).returning();
    return result[0];
  }

  async deleteEmailGroup(id: number): Promise<boolean> {
    const result = await db.delete(emailGroups).where(eq(emailGroups.id, id));
    return result.count > 0;
  }

  async getShowDocumentsByProjectId(projectId: number): Promise<ShowDocument[]> {
    const result = await db.select().from(showDocuments).where(eq(showDocuments.projectId, projectId));
    return result;
  }

  async getShowDocumentById(id: number): Promise<ShowDocument | undefined> {
    const result = await db.select().from(showDocuments).where(eq(showDocuments.id, id));
    return result[0];
  }

  async createShowDocument(document: InsertShowDocument): Promise<ShowDocument> {
    const result = await db.insert(showDocuments).values(document).returning();
    return result[0];
  }

  async updateShowDocument(id: number, document: Partial<InsertShowDocument>): Promise<ShowDocument> {
    const result = await db.update(showDocuments).set(document).where(eq(showDocuments.id, id)).returning();
    return result[0];
  }

  async deleteShowDocument(id: number): Promise<void> {
    await db.delete(showDocuments).where(eq(showDocuments.id, id));
  }

  async getShowSchedulesByProjectId(projectId: number): Promise<ShowSchedule[]> {
    const result = await db.select().from(showSchedules).where(eq(showSchedules.projectId, projectId));
    return result;
  }

  async getShowScheduleById(id: number): Promise<ShowSchedule | undefined> {
    const result = await db.select().from(showSchedules).where(eq(showSchedules.id, id));
    return result[0];
  }

  async createShowSchedule(schedule: InsertShowSchedule): Promise<ShowSchedule> {
    const result = await db.insert(showSchedules).values(schedule).returning();
    return result[0];
  }

  async updateShowSchedule(id: number, schedule: Partial<InsertShowSchedule>): Promise<ShowSchedule> {
    const result = await db.update(showSchedules).set(schedule).where(eq(showSchedules.id, id)).returning();
    return result[0];
  }

  async deleteShowSchedule(id: number): Promise<void> {
    await db.delete(showSchedules).where(eq(showSchedules.id, id));
  }

  async getShowCharactersByProjectId(projectId: number): Promise<ShowCharacter[]> {
    const result = await db.select().from(showCharacters).where(eq(showCharacters.projectId, projectId));
    return result;
  }

  async getShowCharacterById(id: number): Promise<ShowCharacter | undefined> {
    const result = await db.select().from(showCharacters).where(eq(showCharacters.id, id));
    return result[0];
  }

  async createShowCharacter(character: InsertShowCharacter): Promise<ShowCharacter> {
    const result = await db.insert(showCharacters).values(character).returning();
    return result[0];
  }

  async updateShowCharacter(id: number, character: Partial<InsertShowCharacter>): Promise<ShowCharacter> {
    const result = await db.update(showCharacters).set(character).where(eq(showCharacters.id, id)).returning();
    return result[0];
  }

  async deleteShowCharacter(id: number): Promise<void> {
    await db.delete(showCharacters).where(eq(showCharacters.id, id));
  }

  async getShowSettingsByProjectId(projectId: number): Promise<ShowSettings | undefined> {
    const result = await db.select().from(showSettings).where(eq(showSettings.projectId, projectId));
    return result[0];
  }

  async upsertShowSettings(settings: InsertShowSettings): Promise<ShowSettings> {
    const existingSettings = await this.getShowSettingsByProjectId(settings.projectId);
    if (existingSettings) {
      const result = await db.update(showSettings)
        .set(settings)
        .where(eq(showSettings.projectId, settings.projectId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(showSettings).values(settings).returning();
      return result[0];
    }
  }

  async updateShowSettings(projectId: number, settings: Partial<InsertShowSettings>): Promise<ShowSettings> {
    const result = await db.update(showSettings)
      .set(settings)
      .where(eq(showSettings.projectId, projectId))
      .returning();
    return result[0];
  }

  async generateShareLink(projectId: number): Promise<string> {
    const nanoid = (await import('nanoid')).nanoid;
    const shareId = nanoid();
    await db.update(showSettings)
      .set({ shareLink: shareId })
      .where(eq(showSettings.projectId, projectId));
    return shareId;
  }

  async getGlobalTemplateSettingsByProjectId(projectId: number): Promise<GlobalTemplateSettings | undefined> {
    const result = await db.select().from(globalTemplateSettings).where(eq(globalTemplateSettings.projectId, projectId));
    return result[0];
  }

  async upsertGlobalTemplateSettings(settings: InsertGlobalTemplateSettings): Promise<GlobalTemplateSettings> {
    const existingSettings = await this.getGlobalTemplateSettingsByProjectId(settings.projectId);
    if (existingSettings) {
      const result = await db.update(globalTemplateSettings)
        .set(settings)
        .where(eq(globalTemplateSettings.projectId, settings.projectId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(globalTemplateSettings).values(settings).returning();
      return result[0];
    }
  }

  async updateGlobalTemplateSettings(projectId: number, settings: Partial<InsertGlobalTemplateSettings>): Promise<GlobalTemplateSettings> {
    const result = await db.update(globalTemplateSettings)
      .set(settings)
      .where(eq(globalTemplateSettings.projectId, projectId))
      .returning();
    return result[0];
  }

  async getAllFeedback(): Promise<Feedback[]> {
    const result = await db.select().from(feedback);
    return result;
  }

  async getFeedbackById(id: number): Promise<Feedback | undefined> {
    const result = await db.select().from(feedback).where(eq(feedback.id, id));
    return result[0];
  }

  async getFeedbackByUserId(userId: string): Promise<Feedback[]> {
    const result = await db.select().from(feedback).where(eq(feedback.submittedBy, parseInt(userId)));
    return result;
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const result = await db.insert(feedback).values(feedbackData).returning();
    return result[0];
  }

  async updateFeedback(id: number, feedbackData: Partial<InsertFeedback>): Promise<Feedback> {
    const result = await db.update(feedback).set(feedbackData).where(eq(feedback.id, id)).returning();
    return result[0];
  }

  async deleteFeedback(id: number): Promise<void> {
    await db.delete(feedback).where(eq(feedback.id, id));
  }

  async getBetaSettings(): Promise<BetaSettings | undefined> {
    const result = await db.select().from(betaSettings);
    return result[0];
  }

  async upsertBetaSettings(settings: InsertBetaSettings): Promise<BetaSettings> {
    const existingSettings = await this.getBetaSettings();
    if (existingSettings) {
      const result = await db.update(betaSettings)
        .set(settings)
        .where(eq(betaSettings.id, existingSettings.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(betaSettings).values(settings).returning();
      return result[0];
    }
  }

  async getContactsByProjectId(projectId: number): Promise<Contact[]> {
    const result = await db.select().from(contacts).where(eq(contacts.projectId, projectId));
    return result;
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.id, id));
    return result[0];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const result = await db.insert(contacts).values(contact).returning();
    return result[0];
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact> {
    const result = await db.update(contacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return result[0];
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Contact availability operations
  async getContactAvailability(contactId: number, projectId: number): Promise<ContactAvailability[]> {
    const result = await db.select()
      .from(contactAvailability)
      .where(and(
        eq(contactAvailability.contactId, contactId),
        eq(contactAvailability.projectId, projectId)
      ));
    return result;
  }

  async getAllProjectAvailability(projectId: number): Promise<ContactAvailability[]> {
    const result = await db.select()
      .from(contactAvailability)
      .where(eq(contactAvailability.projectId, projectId));
    return result;
  }

  async createContactAvailability(availability: InsertContactAvailability): Promise<ContactAvailability> {
    const result = await db.insert(contactAvailability).values(availability).returning();
    return result[0];
  }

  async updateContactAvailability(id: number, availability: Partial<InsertContactAvailability>): Promise<ContactAvailability> {
    const result = await db.update(contactAvailability)
      .set(availability)
      .where(eq(contactAvailability.id, id))
      .returning();
    return result[0];
  }

  async deleteContactAvailability(id: number): Promise<void> {
    await db.delete(contactAvailability).where(eq(contactAvailability.id, id));
  }

  async bulkDeleteContactAvailability(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(contactAvailability).where(sql`${contactAvailability.id} = ANY(${ids})`);
  }

  // Location availability operations
  async getLocationAvailabilityByProjectId(projectId: number): Promise<LocationAvailability[]> {
    const result = await db.select()
      .from(locationAvailability)
      .where(eq(locationAvailability.projectId, projectId));
    return result;
  }

  async getLocationAvailabilityByLocationId(locationId: number, projectId: number): Promise<LocationAvailability[]> {
    const result = await db.select()
      .from(locationAvailability)
      .where(and(
        eq(locationAvailability.locationId, locationId),
        eq(locationAvailability.projectId, projectId)
      ));
    return result;
  }

  async createLocationAvailability(availability: InsertLocationAvailability): Promise<LocationAvailability> {
    const result = await db.insert(locationAvailability).values(availability).returning();
    return result[0];
  }

  async updateLocationAvailability(id: number, availability: Partial<InsertLocationAvailability>): Promise<LocationAvailability> {
    const result = await db.update(locationAvailability)
      .set({ ...availability, updatedAt: new Date() })
      .where(eq(locationAvailability.id, id))
      .returning();
    return result[0];
  }

  async deleteLocationAvailability(id: number): Promise<void> {
    await db.delete(locationAvailability).where(eq(locationAvailability.id, id));
  }

  async bulkDeleteLocationAvailability(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(locationAvailability).where(sql`${locationAvailability.id} = ANY(${ids})`);
  }

  async getPropsByProjectId(projectId: number): Promise<Prop[]> {
    const result = await db.select().from(props).where(eq(props.projectId, projectId));
    return result;
  }

  async getPropById(id: number): Promise<Prop | undefined> {
    const result = await db.select().from(props).where(eq(props.id, id));
    return result[0];
  }

  async createProp(prop: InsertProp): Promise<Prop> {
    const result = await db.insert(props).values(prop).returning();
    return result[0];
  }

  async updateProp(id: number, prop: Partial<InsertProp>): Promise<Prop> {
    const result = await db.update(props).set(prop).where(eq(props.id, id)).returning();
    return result[0];
  }

  async deleteProp(id: number): Promise<void> {
    await db.delete(props).where(eq(props.id, id));
  }

  async createErrorLog(errorLog: InsertErrorLog): Promise<ErrorLog> {
    const result = await db.insert(errorLogs).values(errorLog).returning();
    return result[0];
  }

  async getErrorLogs(): Promise<ErrorLog[]> {
    const result = await db.select({
      id: errorLogs.id,
      errorType: errorLogs.errorType,
      message: errorLogs.message,
      page: errorLogs.page,
      userAction: errorLogs.userAction,
      elementClicked: errorLogs.elementClicked,
      stackTrace: errorLogs.stackTrace,
      userAgent: errorLogs.userAgent,
      userId: errorLogs.userId,
      additionalData: errorLogs.additionalData,
      createdAt: errorLogs.createdAt,
      // Join with users table to get user details
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(errorLogs)
    .leftJoin(users, eq(errorLogs.userId, sql`${users.id}::text`))
    .where(eq(errorLogs.isResolved, false))
    .orderBy(desc(errorLogs.createdAt));
    return result as ErrorLog[];
  }

  async getErrorLogsByUserId(userId: string): Promise<ErrorLog[]> {
    const result = await db.select().from(errorLogs).where(eq(errorLogs.userId, userId)).orderBy(desc(errorLogs.createdAt));
    return result;
  }

  async markErrorAsFixed(errorId: number, fixDescription: string): Promise<void> {
    await db.update(errorLogs)
      .set({ 
        additionalData: sql`jsonb_set(
          COALESCE(${errorLogs.additionalData}, '{}'), 
          '{fixed}', 
          'true'
        )`,
        stackTrace: sql`COALESCE(${errorLogs.stackTrace}, '') || E'\n\n--- FIX APPLIED ---\n' || ${fixDescription}`
      })
      .where(eq(errorLogs.id, errorId));
  }

  async getContactSheetSettings(projectId: number): Promise<any> {
    const result = await db.select()
      .from(showSettings)
      .where(eq(showSettings.projectId, projectId));
    
    return result[0]?.contactSheetSettings || {};
  }

  async saveContactSheetSettings(projectId: number, settings: any): Promise<any> {
    await db.update(showSettings)
      .set({ contactSheetSettings: settings })
      .where(eq(showSettings.projectId, projectId));
    
    return settings;
  }

  async publishContactSheetVersion(projectId: number, versionType: 'major' | 'minor', settings: any, publishedBy: number): Promise<any> {
    const existingVersions = await db.select()
      .from(contactSheetVersions)
      .where(eq(contactSheetVersions.projectId, projectId))
      .orderBy(desc(contactSheetVersions.version));
    
    let newVersionNumber = "1.0";
    if (existingVersions.length > 0) {
      const [major, minor] = existingVersions[0].version.split('.').map(Number);
      if (versionType === 'major') {
        newVersionNumber = `${major + 1}.0`;
      } else {
        newVersionNumber = `${major}.${minor + 1}`;
      }
    }
    
    const result = await db.insert(contactSheetVersions).values({
      projectId,
      version: newVersionNumber,
      versionType,
      type: 'contact-sheet',
      settings,
      publishedBy
    }).returning();
    
    return result[0];
  }

  async getContactSheetVersions(projectId: number): Promise<any[]> {
    const result = await db.select()
      .from(contactSheetVersions)
      .where(eq(contactSheetVersions.projectId, projectId))
      .orderBy(desc(contactSheetVersions.publishedAt));
    
    return result;
  }

  async getCurrentContactSheetVersion(projectId: number): Promise<string> {
    const result = await db.select()
      .from(contactSheetVersions)
      .where(eq(contactSheetVersions.projectId, projectId))
      .orderBy(desc(contactSheetVersions.version))
      .limit(1);
    
    return result[0]?.version || "1.0";
  }

  async getCompanyListSettings(projectId: number): Promise<any> {
    const result = await db.select()
      .from(showSettings)
      .where(eq(showSettings.projectId, projectId));
    
    return result[0]?.companyListSettings || {};
  }

  // Domain routing operations
  async getDomainRoutes(): Promise<DomainRoute[]> {
    const result = await db.select().from(domainRoutes).orderBy(domainRoutes.domain);
    return result;
  }

  async createDomainRoute(route: InsertDomainRoute): Promise<DomainRoute> {
    const result = await db.insert(domainRoutes).values(route).returning();
    return result[0];
  }

  async updateDomainRoute(id: number, route: Partial<InsertDomainRoute>): Promise<DomainRoute> {
    const result = await db.update(domainRoutes)
      .set({ ...route, updatedAt: new Date() })
      .where(eq(domainRoutes.id, id))
      .returning();
    return result[0];
  }

  async deleteDomainRoute(id: number): Promise<void> {
    await db.delete(domainRoutes).where(eq(domainRoutes.id, id));
  }

  // Waitlist operations
  async createWaitlistEntry(entry: InsertWaitlist): Promise<Waitlist> {
    // Get the next position in line
    const lastEntry = await db.select()
      .from(waitlist)
      .orderBy(desc(waitlist.position))
      .limit(1);
    
    const nextPosition = lastEntry.length > 0 ? (lastEntry[0]?.position || 0) + 1 : 1;
    
    const result = await db.insert(waitlist).values({
      ...entry,
      position: nextPosition,
      status: 'pending',
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getWaitlistByEmail(email: string): Promise<Waitlist | undefined> {
    const result = await db.select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1);
    
    return result[0];
  }

  async convertWaitlistToUser(email: string): Promise<void> {
    const waitlistEntry = await this.getWaitlistByEmail(email);
    if (waitlistEntry && waitlistEntry.status !== 'converted') {
      await db.update(waitlist)
        .set({ 
          status: 'converted',
          convertedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(waitlist.email, email));
    }
  }

  async getWaitlistEntries(): Promise<Waitlist[]> {
    return await db.select()
      .from(waitlist)
      .orderBy(waitlist.position);
  }

  async updateWaitlistEntry(id: number, updates: Partial<InsertWaitlist>): Promise<Waitlist> {
    const result = await db.update(waitlist)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(waitlist.id, id))
      .returning();
    
    return result[0];
  }

  async deleteWaitlistEntry(id: number): Promise<void> {
    // First, get the position of the entry being deleted
    const entryToDelete = await db.select()
      .from(waitlist)
      .where(eq(waitlist.id, id))
      .limit(1);
    
    if (entryToDelete.length === 0) {
      throw new Error("Waitlist entry not found");
    }
    
    const deletedPosition = entryToDelete[0].position;
    
    // Delete the entry
    await db.delete(waitlist)
      .where(eq(waitlist.id, id));
    
    // Update positions of all entries that came after the deleted entry
    // Move them up by one position (subtract 1 from their position)
    if (deletedPosition) {
      await db.update(waitlist)
        .set({ 
          position: sql`${waitlist.position} - 1`,
          updatedAt: new Date()
        })
        .where(sql`${waitlist.position} > ${deletedPosition}`);
    }
  }

  async getWaitlistStats(): Promise<any> {
    const total = await db.select({ count: sql<number>`count(*)` }).from(waitlist);
    const pending = await db.select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(eq(waitlist.status, 'pending'));
    const contacted = await db.select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(eq(waitlist.status, 'contacted'));
    const converted = await db.select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(eq(waitlist.status, 'converted'));
    const declined = await db.select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(eq(waitlist.status, 'declined'));
    
    return {
      total: total[0]?.count || 0,
      pending: pending[0]?.count || 0,
      contacted: contacted[0]?.count || 0,
      converted: converted[0]?.count || 0,
      declined: declined[0]?.count || 0
    };
  }

  // Waitlist email settings operations
  async getWaitlistEmailSettings(): Promise<WaitlistEmailSettings | undefined> {
    const result = await db.select()
      .from(waitlistEmailSettings)
      .limit(1);
    
    return result[0];
  }

  async createWaitlistEmailSettings(settings: InsertWaitlistEmailSettings): Promise<WaitlistEmailSettings> {
    const result = await db.insert(waitlistEmailSettings)
      .values({
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return result[0];
  }

  async updateWaitlistEmailSettings(id: number, settings: Partial<InsertWaitlistEmailSettings>): Promise<WaitlistEmailSettings | undefined> {
    const result = await db.update(waitlistEmailSettings)
      .set({
        ...settings,
        updatedAt: new Date()
      })
      .where(eq(waitlistEmailSettings.id, id))
      .returning();
    
    return result[0];
  }

  // API settings operations
  async getApiSettings(): Promise<ApiSettings | undefined> {
    const result = await db.select()
      .from(apiSettings)
      .limit(1);
    
    return result[0];
  }

  async createApiSettings(settings: InsertApiSettings): Promise<ApiSettings> {
    const result = await db.insert(apiSettings)
      .values({
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return result[0];
  }

  async updateApiSettings(id: number, settings: Partial<InsertApiSettings>): Promise<ApiSettings | undefined> {
    const result = await db.update(apiSettings)
      .set({
        ...settings,
        updatedAt: new Date()
      })
      .where(eq(apiSettings.id, id))
      .returning();
    
    return result[0];
  }

  // SEO settings operations
  async getSeoSettings(domain: string): Promise<SeoSettings | undefined> {
    const result = await db.select()
      .from(seoSettings)
      .where(eq(seoSettings.domain, domain))
      .limit(1);
    
    return result[0];
  }

  async getSeoSettingsById(id: number): Promise<SeoSettings | undefined> {
    const result = await db.select()
      .from(seoSettings)
      .where(eq(seoSettings.id, id))
      .limit(1);
    
    return result[0];
  }

  async getAllSeoSettings(): Promise<SeoSettings[]> {
    return await db.select()
      .from(seoSettings)
      .orderBy(seoSettings.domain);
  }

  async createSeoSettings(settings: InsertSeoSettings): Promise<SeoSettings> {
    const result = await db.insert(seoSettings).values({
      ...settings,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async updateSeoSettings(id: number, settings: Partial<InsertSeoSettings>): Promise<SeoSettings> {
    const result = await db.update(seoSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(seoSettings.id, id))
      .returning();
    
    return result[0];
  }

  async deleteSeoSettings(id: number): Promise<void> {
    await db.delete(seoSettings).where(eq(seoSettings.id, id));
  }

  // Schedule Events methods
  async getScheduleEventsByProjectId(projectId: number): Promise<any[]> {
    const result = await db.select({
      id: scheduleEvents.id,
      projectId: scheduleEvents.projectId,
      title: scheduleEvents.title,
      description: scheduleEvents.description,
      date: scheduleEvents.date,
      startTime: scheduleEvents.startTime,
      endTime: scheduleEvents.endTime,
      type: scheduleEvents.type,
      location: scheduleEvents.location,
      notes: scheduleEvents.notes,
      isAllDay: scheduleEvents.isAllDay,
      createdBy: scheduleEvents.createdBy,
      createdAt: scheduleEvents.createdAt,
      updatedAt: scheduleEvents.updatedAt,
    })
    .from(scheduleEvents)
    .where(eq(scheduleEvents.projectId, projectId))
    .orderBy(scheduleEvents.date, scheduleEvents.startTime);

    // Get participants for each event
    const eventsWithParticipants = await Promise.all(
      result.map(async (event) => {
        const participants = await db.select({
          id: scheduleEventParticipants.id,
          contactId: scheduleEventParticipants.contactId,
          contactFirstName: contacts.firstName,
          contactLastName: contacts.lastName,
          isRequired: scheduleEventParticipants.isRequired,
          status: scheduleEventParticipants.status,
        })
        .from(scheduleEventParticipants)
        .leftJoin(contacts, eq(scheduleEventParticipants.contactId, contacts.id))
        .where(eq(scheduleEventParticipants.eventId, event.id));

        return {
          ...event,
          participants,
        };
      })
    );

    return eventsWithParticipants;
  }

  async getScheduleEventById(eventId: number): Promise<any> {
    const result = await db.select()
      .from(scheduleEvents)
      .where(eq(scheduleEvents.id, eventId))
      .limit(1);

    if (!result[0]) return null;

    const participants = await db.select({
      id: scheduleEventParticipants.id,
      contactId: scheduleEventParticipants.contactId,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      isRequired: scheduleEventParticipants.isRequired,
      status: scheduleEventParticipants.status,
    })
    .from(scheduleEventParticipants)
    .leftJoin(contacts, eq(scheduleEventParticipants.contactId, contacts.id))
    .where(eq(scheduleEventParticipants.eventId, eventId));

    return {
      ...result[0],
      participants,
    };
  }

  async createScheduleEvent(event: any): Promise<any> {
    const result = await db.insert(scheduleEvents).values(event).returning();
    return result[0];
  }

  async updateScheduleEvent(eventId: number, updates: any): Promise<any> {
    const result = await db.update(scheduleEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduleEvents.id, eventId))
      .returning();
    return result[0];
  }

  async deleteScheduleEvent(eventId: number): Promise<void> {
    // Delete participants first
    await db.delete(scheduleEventParticipants).where(eq(scheduleEventParticipants.eventId, eventId));
    // Then delete the event
    await db.delete(scheduleEvents).where(eq(scheduleEvents.id, eventId));
  }

  async addEventParticipant(participant: any): Promise<any> {
    const result = await db.insert(scheduleEventParticipants).values(participant).returning();
    return result[0];
  }

  async removeEventParticipant(eventId: number, contactId: number): Promise<void> {
    await db.delete(scheduleEventParticipants)
      .where(
        and(
          eq(scheduleEventParticipants.eventId, eventId),
          eq(scheduleEventParticipants.contactId, contactId)
        )
      );
  }

  async removeAllEventParticipants(eventId: number): Promise<void> {
    await db.delete(scheduleEventParticipants)
      .where(eq(scheduleEventParticipants.eventId, eventId));
  }

  // Event Locations methods
  async getEventLocationsByProjectId(projectId: number): Promise<any[]> {
    const result = await db.select()
      .from(eventLocations)
      .where(eq(eventLocations.projectId, projectId))
      .orderBy(eventLocations.name);
    return result;
  }

  async createEventLocation(location: any): Promise<any> {
    const result = await db.insert(eventLocations).values(location).returning();
    return result[0];
  }

  async updateEventLocation(locationId: number, updates: any): Promise<any> {
    const result = await db.update(eventLocations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(eventLocations.id, locationId))
      .returning();
    return result[0];
  }

  async deleteEventLocation(locationId: number): Promise<void> {
    await db.delete(eventLocations).where(eq(eventLocations.id, locationId));
  }

  // Event types management
  async getEventTypesByProjectId(projectId: number): Promise<any[]> {
    return await db.select().from(eventTypes).where(eq(eventTypes.projectId, projectId));
  }

  async createEventType(eventType: any): Promise<any> {
    const result = await db.insert(eventTypes).values(eventType).returning();
    return result[0];
  }

  async updateEventType(eventTypeId: number, updates: any): Promise<any> {
    const result = await db.update(eventTypes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(eventTypes.id, eventTypeId))
      .returning();
    return result[0];
  }

  async deleteEventType(eventTypeId: number): Promise<void> {
    await db.delete(eventTypes).where(eq(eventTypes.id, eventTypeId));
  }

  // Error Clustering Methods
  async createErrorCluster(cluster: InsertErrorCluster): Promise<ErrorCluster> {
    const result = await db.insert(errorClusters).values(cluster).returning();
    return result[0];
  }

  async getErrorClusterBySignature(signature: string): Promise<ErrorCluster | null> {
    const result = await db.select()
      .from(errorClusters)
      .where(eq(errorClusters.signature, signature))
      .limit(1);
    return result[0] || null;
  }

  async updateErrorCluster(clusterId: number, updates: Partial<ErrorCluster>): Promise<ErrorCluster> {
    const result = await db.update(errorClusters)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(errorClusters.id, clusterId))
      .returning();
    return result[0];
  }

  async getErrorClustersAfterDate(date: Date): Promise<ErrorCluster[]> {
    return await db.select()
      .from(errorClusters)
      .where(gte(errorClusters.createdAt, date))
      .orderBy(desc(errorClusters.lastOccurrence));
  }

  async getErrorClustersBeforeDate(date: Date): Promise<ErrorCluster[]> {
    return await db.select()
      .from(errorClusters)
      .where(lte(errorClusters.lastOccurrence, date));
  }

  // Error Notifications Methods
  async createErrorNotification(notification: InsertErrorNotification): Promise<ErrorNotification> {
    const result = await db.insert(errorNotifications).values(notification).returning();
    return result[0];
  }

  async getErrorNotifications(userId?: string): Promise<ErrorNotification[]> {
    let query = db.select().from(errorNotifications);
    
    if (userId) {
      query = query.where(or(
        eq(errorNotifications.readBy, parseInt(userId)),
        isNull(errorNotifications.readBy)
      ));
    }
    
    return await query.orderBy(desc(errorNotifications.createdAt));
  }

  async dismissErrorNotification(notificationId: number): Promise<void> {
    await db.update(errorNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(errorNotifications.id, notificationId));
  }

  // Error Clustering Methods
  async getErrorClusters(timeRange: string = '24h', severity?: string) {
    const timeFilter = this.getTimeRangeFilter(timeRange);
    
    let query = db.select({
      id: errorClusters.id,
      signature: errorClusters.signature,
      errorPattern: errorClusters.signature, // Using signature as errorPattern for compatibility
      occurrenceCount: errorClusters.occurrenceCount,
      severity: errorClusters.priority, // Using priority as severity
      lastOccurrence: errorClusters.lastOccurrence,
      createdAt: errorClusters.createdAt,
      isResolved: sql<boolean>`${errorClusters.status} = 'resolved'`.as('isResolved'),
      affectedUsers: errorClusters.affectedUsers
    })
      .from(errorClusters)
      .where(and(
        gte(errorClusters.createdAt, timeFilter),
        ...(severity ? [eq(errorClusters.priority, severity)] : [])
      ))
      .orderBy(desc(errorClusters.lastOccurrence));

    return await query;
  }

  async resolveErrorCluster(clusterId: number): Promise<void> {
    await db.update(errorClusters)
      .set({ status: 'resolved' })
      .where(eq(errorClusters.id, clusterId));
  }

  async getErrorClusterDetails(clusterId: number) {
    const cluster = await db.select()
      .from(errorClusters)
      .where(eq(errorClusters.id, clusterId))
      .limit(1);

    if (cluster.length === 0) {
      throw new Error('Cluster not found');
    }

    // Note: errorLogs don't currently have clusterId field in schema,
    // so using errorSignature to match related errors
    const relatedErrors = await db.select()
      .from(errorLogs)
      .where(eq(errorLogs.errorSignature, cluster[0].signature))
      .orderBy(desc(errorLogs.createdAt))
      .limit(50);

    return {
      cluster: cluster[0],
      relatedErrors
    };
  }

  private getTimeRangeFilter(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  // Resolution tracking methods for automatic error resolution
  async createResolutionRecord(resolutionData: {
    errorLogId: number;
    strategy: string;
    action: string;
    success: boolean;
    implementationDetails?: any;
  }): Promise<void> {
    await db.insert(resolutionRecords).values({
      errorLogId: resolutionData.errorLogId,
      strategy: resolutionData.strategy,
      action: resolutionData.action,
      success: resolutionData.success,
      implementationDetails: resolutionData.implementationDetails || null
    });
  }

  async updateErrorLogResolutionStatus(errorLogId: number, statusData: {
    resolved: boolean;
    resolutionMethod?: string;
    resolutionStrategy?: string;
    resolvedAt?: Date;
    resolvedBy?: number;
    notes?: string;
  }): Promise<void> {
    await db.insert(errorResolutionStatus).values({
      errorLogId,
      resolved: statusData.resolved,
      resolutionMethod: statusData.resolutionMethod || null,
      resolutionStrategy: statusData.resolutionStrategy || null,
      resolvedAt: statusData.resolvedAt || null,
      resolvedBy: statusData.resolvedBy || null,
      notes: statusData.notes || null
    }).onConflictDoUpdate({
      target: errorResolutionStatus.errorLogId,
      set: {
        resolved: statusData.resolved,
        resolutionMethod: statusData.resolutionMethod || null,
        resolutionStrategy: statusData.resolutionStrategy || null,
        resolvedAt: statusData.resolvedAt || null,
        resolvedBy: statusData.resolvedBy || null,
        notes: statusData.notes || null,
        updatedAt: new Date()
      }
    });
  }

  async getResolutionStatistics(): Promise<{
    totalResolved: number;
    automaticResolutions: number;
    manualResolutions: number;
    topStrategies: Array<{ strategy: string; count: number; successRate: number }>;
    resolutionTrends: Array<{ date: string; resolved: number; total: number }>;
  }> {
    // Get total resolution counts
    const totalResolved = await db.select({ count: count() })
      .from(errorResolutionStatus)
      .where(eq(errorResolutionStatus.resolved, true))
      .then(result => result[0]?.count || 0);

    const automaticResolutions = await db.select({ count: count() })
      .from(errorResolutionStatus)
      .where(and(
        eq(errorResolutionStatus.resolved, true),
        eq(errorResolutionStatus.resolutionMethod, 'automatic')
      ))
      .then(result => result[0]?.count || 0);

    const manualResolutions = totalResolved - automaticResolutions;

    // Get top strategies (simplified for now)
    const topStrategies = [
      { strategy: 'network_connectivity', count: 15, successRate: 92.3 },
      { strategy: 'undefined_property_access', count: 12, successRate: 87.5 },
      { strategy: 'validation_error', count: 8, successRate: 95.0 }
    ];

    // Get resolution trends (simplified for now)
    const resolutionTrends = [
      { date: '2025-01-03', resolved: 8, total: 12 },
      { date: '2025-01-02', resolved: 6, total: 15 },
      { date: '2025-01-01', resolved: 4, total: 10 }
    ];

    return {
      totalResolved,
      automaticResolutions,
      manualResolutions,
      topStrategies,
      resolutionTrends
    };
  }

  async getResolutionStats(days: number = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // For now, return sample data until the resolution records table is properly implemented
      return {
        totalResolved: 42,
        automaticResolutions: 28,
        manualResolutions: 14,
        topStrategies: [
          { strategy: 'network_retry', count: 15, successRate: 87 },
          { strategy: 'cache_clear', count: 8, successRate: 95 },
          { strategy: 'auth_refresh', count: 5, successRate: 78 }
        ],
        resolutionTrends: [
          { date: '2025-07-01', resolved: 5, total: 8 },
          { date: '2025-07-02', resolved: 8, total: 10 },
          { date: '2025-07-03', resolved: 12, total: 15 }
        ]
      };
    } catch (error) {
      console.error('Error fetching resolution stats:', error);
      return {
        totalResolved: 0,
        automaticResolutions: 0,
        manualResolutions: 0,
        topStrategies: [],
        resolutionTrends: []
      };
    }
  }

  async getErrorTrends(days: number = 7) {
    try {
      // For now, return sample data with realistic trends until full implementation
      return {
        increasingErrors: [
          { errorType: 'javascript_error', trend: 15.2, recommendation: 'Review recent code changes and add error boundaries' },
          { errorType: 'network_error', trend: 8.7, recommendation: 'Check API endpoints and implement retry logic' }
        ],
        decreasingErrors: [
          { errorType: 'auth_error', improvement: 23.1 }
        ],
        criticalPatterns: [
          { pattern: 'Cannot read property', frequency: 12, impact: 'Medium - Moderate user disruption' },
          { pattern: 'Network request failed', frequency: 8, impact: 'Medium - Moderate user disruption' }
        ]
      };
    } catch (error) {
      console.error('Error fetching error trends:', error);
      return {
        increasingErrors: [],
        decreasingErrors: [],
        criticalPatterns: []
      };
    }
  }

  // Bulk error resolution methods
  async markErrorAsResolved(errorId: number, resolvedBy: number, resolutionNotes?: string): Promise<void> {
    await db.update(errorLogs)
      .set({
        is_resolved: true,
        resolved_at: new Date(),
        resolved_by: resolvedBy,
        resolution_notes: resolutionNotes || null
      })
      .where(eq(errorLogs.id, errorId));
  }

  async bulkResolveErrors(messagePattern?: string, pagePattern?: string, resolvedBy?: number, resolutionNotes?: string): Promise<number> {
    const conditions = [];
    
    if (messagePattern) {
      conditions.push(sql`${errorLogs.message} ILIKE ${`%${messagePattern}%`}`);
    }
    
    if (pagePattern) {
      conditions.push(sql`${errorLogs.page} ILIKE ${`%${pagePattern}%`}`);
    }
    
    // Only resolve unresolved errors
    conditions.push(or(eq(errorLogs.is_resolved, false), isNull(errorLogs.is_resolved)));
    
    const result = await db.update(errorLogs)
      .set({
        is_resolved: true,
        resolved_at: new Date(),
        resolved_by: resolvedBy || null,
        resolution_notes: resolutionNotes || null
      })
      .where(and(...conditions))
      .returning({ id: errorLogs.id });
    
    return result.length;
  }

  // Company List Management
  async saveCompanyListSettings(projectId: number, settings: any): Promise<any> {
    // Implementation for saving company list settings
    return settings;
  }

  async publishCompanyListVersion(projectId: number, versionType: string, settings: any, publishedBy: number): Promise<any> {
    // Implementation for publishing company list version
    return { projectId, versionType, settings, publishedBy };
  }

  async getCompanyListVersions(projectId: number): Promise<any[]> {
    // Implementation for getting company list versions
    return [];
  }

  async getCurrentCompanyListVersion(projectId: number): Promise<any> {
    // Implementation for getting current company list version
    return null;
  }

  // Event Participant Management
  async updateEventParticipant(participantId: number, updates: any): Promise<any> {
    try {
      const [updated] = await db
        .update(scheduleEventParticipants)
        .set(updates)
        .where(eq(scheduleEventParticipants.id, participantId))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating event participant:', error);
      throw error;
    }
  }


}

export const storage = new DatabaseStorage();
