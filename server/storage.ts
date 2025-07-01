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
  props,
  domainRoutes,
  waitlist,
  seoSettings,

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
  type Waitlist,
  type InsertWaitlist,
  type Prop,
  type InsertProp,
  type DomainRoute,
  type InsertDomainRoute,
  type SeoSettings,
  type InsertSeoSettings,

} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (email/password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
  getWaitlistStats(): Promise<any>;

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
  getAllSeoSettings(): Promise<SeoSettings[]>;
  createSeoSettings(settings: InsertSeoSettings): Promise<SeoSettings>;
  updateSeoSettings(id: number, settings: Partial<InsertSeoSettings>): Promise<SeoSettings>;
  deleteSeoSettings(id: number): Promise<void>;
}

class DatabaseStorage implements IStorage {
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

  async updateUserAdmin(userId: string, updates: { profileType?: string; betaAccess?: string; betaFeatures?: string[]; isAdmin?: boolean }): Promise<User> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
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
      .set({ shareId })
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
    const result = await db.select().from(feedback).where(eq(feedback.userId, userId));
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
    const result = await db.update(contacts).set(contact).where(eq(contacts.id, id)).returning();
    return result[0];
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
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
    const result = await db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt));
    return result;
  }

  async getErrorLogsByUserId(userId: string): Promise<ErrorLog[]> {
    const result = await db.select().from(errorLogs).where(eq(errorLogs.userId, userId)).orderBy(desc(errorLogs.createdAt));
    return result;
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
      .orderBy(desc(contactSheetVersions.versionNumber));
    
    let newVersionNumber = "1.0";
    if (existingVersions.length > 0) {
      const [major, minor] = existingVersions[0].versionNumber.split('.').map(Number);
      if (versionType === 'major') {
        newVersionNumber = `${major + 1}.0`;
      } else {
        newVersionNumber = `${major}.${minor + 1}`;
      }
    }
    
    const result = await db.insert(contactSheetVersions).values({
      projectId,
      versionNumber: newVersionNumber,
      versionType,
      settings,
      publishedBy
    }).returning();
    
    return result[0];
  }

  async getContactSheetVersions(projectId: number): Promise<any[]> {
    const result = await db.select()
      .from(contactSheetVersions)
      .where(eq(contactSheetVersions.projectId, projectId))
      .orderBy(desc(contactSheetVersions.createdAt));
    
    return result;
  }

  async getCurrentContactSheetVersion(projectId: number): Promise<string> {
    const result = await db.select()
      .from(contactSheetVersions)
      .where(eq(contactSheetVersions.projectId, projectId))
      .orderBy(desc(contactSheetVersions.versionNumber))
      .limit(1);
    
    return result[0]?.versionNumber || "1.0";
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

  async getWaitlistStats(): Promise<any> {
    const total = await db.select({ count: sql<number>`count(*)` }).from(waitlist);
    const pending = await db.select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(eq(waitlist.status, 'pending'));
    const approved = await db.select({ count: sql<number>`count(*)` })
      .from(waitlist)
      .where(eq(waitlist.status, 'approved'));
    
    return {
      total: total[0]?.count || 0,
      pending: pending[0]?.count || 0,
      approved: approved[0]?.count || 0
    };
  }

  // SEO settings operations
  async getSeoSettings(domain: string): Promise<SeoSettings | undefined> {
    const result = await db.select()
      .from(seoSettings)
      .where(eq(seoSettings.domain, domain))
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
}

export const storage = new DatabaseStorage();
