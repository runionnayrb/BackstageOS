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
  contactSheetVersions,
  errorLogs,
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
  type ErrorLog,
  type InsertErrorLog,
  waitlist,
  type Waitlist,
  type InsertWaitlist,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne } from "drizzle-orm";

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
  saveCompanyListSettings(projectId: number, settings: any): Promise<any>;
  publishCompanyListVersion(projectId: number, versionType: 'major' | 'minor', settings: any, publishedBy: number): Promise<any>;
  getCompanyListVersions(projectId: number): Promise<any[]>;
  getCurrentCompanyListVersion(projectId: number): Promise<string>;

  // Waitlist operations
  getWaitlistByEmail(email: string): Promise<Waitlist | undefined>;
  createWaitlistEntry(waitlist: InsertWaitlist): Promise<Waitlist>;
  getWaitlistEntries(): Promise<Waitlist[]>;
  updateWaitlistEntry(id: number, updates: Partial<InsertWaitlist>): Promise<Waitlist>;
  getWaitlistStats(): Promise<{
    total: number;
    pending: number;
    contacted: number;
    converted: number;
    declined: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values([userData] as any)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values([userData] as any)
      .onConflictDoUpdate({
        target: users.email,
        set: userData,
      })
      .returning();
    return user;
  }

  async updateUserBetaAccess(userId: string, betaAccess: string, betaFeatures?: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        betaAccess,
        betaFeatures: betaFeatures ? JSON.stringify(betaFeatures) : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(userId)))
      .returning();
    return user;
  }

  async getBetaUsers(): Promise<User[]> {
    return db.select().from(users).where(ne(users.betaAccess, 'none')).orderBy(desc(users.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserAdmin(userId: string, updates: { profileType?: string; betaAccess?: string; betaFeatures?: string[]; isAdmin?: boolean; firstName?: string; lastName?: string; email?: string; password?: string }): Promise<User> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.profileType) {
      updateData.profileType = updates.profileType;
    }
    if (updates.betaAccess) {
      updateData.betaAccess = updates.betaAccess;
    }
    if (updates.betaFeatures) {
      updateData.betaFeatures = JSON.stringify(updates.betaFeatures);
    }
    if (updates.isAdmin !== undefined) {
      updateData.isAdmin = updates.isAdmin;
    }
    if (updates.firstName !== undefined) {
      updateData.firstName = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      updateData.lastName = updates.lastName;
    }
    if (updates.email) {
      updateData.email = updates.email;
    }
    if (updates.password) {
      updateData.password = updates.password;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, Number(userId)))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, Number(userId)));
  }

  // Project operations
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, Number(userId)))
      .orderBy(desc(projects.updatedAt));
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async createProject(project: any): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Team member operations
  async getTeamMembersByProjectId(projectId: number): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.projectId, projectId));
  }

  async inviteTeamMember(teamMember: InsertTeamMember): Promise<TeamMember> {
    const [newTeamMember] = await db
      .insert(teamMembers)
      .values(teamMember)
      .returning();
    return newTeamMember;
  }

  async updateTeamMemberStatus(id: number, status: string): Promise<TeamMember> {
    const [updatedTeamMember] = await db
      .update(teamMembers)
      .set({ status, joinedAt: status === "accepted" ? new Date() : null })
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedTeamMember;
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Report operations
  async getReportsByProjectId(projectId: number): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(eq(reports.projectId, projectId))
      .orderBy(desc(reports.date));
  }

  async getReportsByUserId(userId: string): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(eq(reports.createdBy, Number(userId)))
      .orderBy(desc(reports.date));
  }

  async getReportById(id: number): Promise<Report | undefined> {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id));
    return report;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db
      .insert(reports)
      .values(report)
      .returning();
    return newReport;
  }

  async updateReport(id: number, report: Partial<InsertReport>): Promise<Report> {
    const [updatedReport] = await db
      .update(reports)
      .set({ ...report, updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return updatedReport;
  }

  async deleteReport(id: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  // Report template operations
  async getReportTemplatesByUserId(userId: string): Promise<ReportTemplate[]> {
    return await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.createdBy, Number(userId)))
      .orderBy(desc(reportTemplates.createdAt));
  }

  async getPublicReportTemplates(): Promise<ReportTemplate[]> {
    return await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.isPublic, true))
      .orderBy(desc(reportTemplates.createdAt));
  }

  async getDefaultReportTemplates(): Promise<ReportTemplate[]> {
    return await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.isDefault, true))
      .orderBy(reportTemplates.type);
  }

  async getReportTemplateById(id: number): Promise<ReportTemplate | undefined> {
    const [template] = await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.id, id));
    return template;
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const [newTemplate] = await db
      .insert(reportTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateReportTemplate(id: number, template: Partial<InsertReportTemplate>): Promise<ReportTemplate> {
    const [updatedTemplate] = await db
      .update(reportTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(reportTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteReportTemplate(id: number): Promise<void> {
    await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
  }

  // Show document operations
  async getShowDocumentsByProjectId(projectId: number): Promise<ShowDocument[]> {
    const documents = await db
      .select()
      .from(showDocuments)
      .where(eq(showDocuments.projectId, projectId))
      .orderBy(desc(showDocuments.updatedAt), desc(showDocuments.createdAt));
    
    console.log(`Storage: Retrieved ${documents.length} documents for project ${projectId}`);
    if (documents.length > 0) {
      const script = documents.find(doc => doc.type === 'script');
      if (script) {
        console.log(`Storage: Script document - ID: ${script.id}, content length: ${script.content ? String(script.content).length : 0}, updated: ${script.updatedAt}`);
      }
    }
    
    return documents;
  }

  async getShowDocumentById(id: number): Promise<ShowDocument | undefined> {
    const [document] = await db
      .select()
      .from(showDocuments)
      .where(eq(showDocuments.id, id));
    return document;
  }

  async createShowDocument(document: InsertShowDocument): Promise<ShowDocument> {
    const [newDocument] = await db
      .insert(showDocuments)
      .values(document)
      .returning();
    return newDocument;
  }

  async updateShowDocument(id: number, document: Partial<InsertShowDocument>): Promise<ShowDocument> {
    // Add updatedAt timestamp to ensure fresh data
    const documentWithTimestamp = {
      ...document,
      updatedAt: new Date()
    };
    
    const [updatedDocument] = await db
      .update(showDocuments)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(showDocuments.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteShowDocument(id: number): Promise<void> {
    await db.delete(showDocuments).where(eq(showDocuments.id, id));
  }

  // Show schedule operations
  async getShowSchedulesByProjectId(projectId: number): Promise<ShowSchedule[]> {
    return await db
      .select()
      .from(showSchedules)
      .where(eq(showSchedules.projectId, projectId))
      .orderBy(desc(showSchedules.createdAt));
  }

  async getShowScheduleById(id: number): Promise<ShowSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(showSchedules)
      .where(eq(showSchedules.id, id));
    return schedule;
  }

  async createShowSchedule(schedule: InsertShowSchedule): Promise<ShowSchedule> {
    const [newSchedule] = await db
      .insert(showSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async updateShowSchedule(id: number, schedule: Partial<InsertShowSchedule>): Promise<ShowSchedule> {
    const [updatedSchedule] = await db
      .update(showSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(showSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteShowSchedule(id: number): Promise<void> {
    await db.delete(showSchedules).where(eq(showSchedules.id, id));
  }

  // Show character operations
  async getShowCharactersByProjectId(projectId: number): Promise<ShowCharacter[]> {
    return await db
      .select()
      .from(showCharacters)
      .where(eq(showCharacters.projectId, projectId))
      .orderBy(desc(showCharacters.createdAt));
  }

  async getShowCharacterById(id: number): Promise<ShowCharacter | undefined> {
    const [character] = await db
      .select()
      .from(showCharacters)
      .where(eq(showCharacters.id, id));
    return character;
  }

  async createShowCharacter(character: InsertShowCharacter): Promise<ShowCharacter> {
    const [newCharacter] = await db
      .insert(showCharacters)
      .values(character)
      .returning();
    return newCharacter;
  }

  async updateShowCharacter(id: number, character: Partial<InsertShowCharacter>): Promise<ShowCharacter> {
    const [updatedCharacter] = await db
      .update(showCharacters)
      .set({ ...character, updatedAt: new Date() })
      .where(eq(showCharacters.id, id))
      .returning();
    return updatedCharacter;
  }

  async deleteShowCharacter(id: number): Promise<void> {
    await db.delete(showCharacters).where(eq(showCharacters.id, id));
  }

  // Replace old template methods with show-specific ones
  async getReportTemplatesByProjectId(projectId: number): Promise<ReportTemplate[]> {
    return await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.projectId, projectId))
      .orderBy(desc(reportTemplates.createdAt));
  }

  // Show settings operations
  async getShowSettingsByProjectId(projectId: number): Promise<ShowSettings | undefined> {
    const [settings] = await db.select().from(showSettings).where(eq(showSettings.projectId, projectId));
    return settings;
  }

  async upsertShowSettings(settingsData: InsertShowSettings): Promise<ShowSettings> {
    const insertData = {
      ...settingsData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const [settings] = await db
      .insert(showSettings)
      .values(insertData)
      .onConflictDoUpdate({
        target: showSettings.projectId,
        set: {
          ...settingsData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return settings;
  }

  async updateShowSettings(projectId: number, settingsData: Partial<InsertShowSettings>): Promise<ShowSettings> {
    // Create update object with only safe, non-timestamp fields
    const updateData: any = {};
    
    // Copy only JSONB and simple fields (no timestamp fields)
    const safeFields = ['scheduleSettings', 'templateSettings', 'reportSettings', 'permissions', 
                       'contactCategoriesOrder', 'sectionsOrder', 'contactSheetSettings', 
                       'companyListSettings', 'sharingEnabled', 'shareLink'];
    
    for (const field of safeFields) {
      if (field in settingsData) {
        updateData[field] = settingsData[field as keyof typeof settingsData];
      }
    }

    const [settings] = await db
      .update(showSettings)
      .set(updateData)
      .where(eq(showSettings.projectId, projectId))
      .returning();
    return settings;
  }

  async generateShareLink(projectId: number): Promise<string> {
    const shareableLink = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/shared/${projectId}/${Math.random().toString(36).substring(2, 15)}`;
    
    await this.updateShowSettings(projectId, {
      shareLink: shareableLink,
      shareLinkExpiry: null,
    });
    
    return shareableLink;
  }

  // Global template settings operations
  async getGlobalTemplateSettingsByProjectId(projectId: number): Promise<GlobalTemplateSettings | undefined> {
    const [settings] = await db.select().from(globalTemplateSettings).where(eq(globalTemplateSettings.projectId, projectId));
    return settings;
  }

  async upsertGlobalTemplateSettings(settingsData: InsertGlobalTemplateSettings): Promise<GlobalTemplateSettings> {
    const [settings] = await db
      .insert(globalTemplateSettings)
      .values(settingsData)
      .onConflictDoUpdate({
        target: globalTemplateSettings.projectId,
        set: {
          ...settingsData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return settings;
  }

  async updateGlobalTemplateSettings(projectId: number, settingsData: Partial<InsertGlobalTemplateSettings>): Promise<GlobalTemplateSettings> {
    const [settings] = await db
      .update(globalTemplateSettings)
      .set({
        ...settingsData,
        updatedAt: new Date(),
      })
      .where(eq(globalTemplateSettings.projectId, projectId))
      .returning();
    return settings;
  }

  // Feedback operations
  async getAllFeedback(): Promise<Feedback[]> {
    return await db
      .select({
        id: feedback.id,
        type: feedback.type,
        priority: feedback.priority,
        title: feedback.title,
        description: feedback.description,
        category: feedback.category,
        status: feedback.status,
        attachments: feedback.attachments,
        adminNotes: feedback.adminNotes,
        submittedBy: feedback.submittedBy,
        assignedTo: feedback.assignedTo,
        resolvedAt: feedback.resolvedAt,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
        submitter: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.submittedBy, users.id))
      .orderBy(desc(feedback.createdAt));
  }

  async getFeedbackById(id: number): Promise<Feedback | undefined> {
    const [feedbackItem] = await db.select().from(feedback).where(eq(feedback.id, id));
    return feedbackItem;
  }

  async getFeedbackByUserId(userId: string): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .where(eq(feedback.submittedBy, parseInt(userId)))
      .orderBy(desc(feedback.createdAt));
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  async updateFeedback(id: number, feedbackData: Partial<InsertFeedback>): Promise<Feedback> {
    const [updatedFeedback] = await db
      .update(feedback)
      .set({
        ...feedbackData,
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, id))
      .returning();
    return updatedFeedback;
  }

  async deleteFeedback(id: number): Promise<void> {
    await db.delete(feedback).where(eq(feedback.id, id));
  }

  // Beta settings operations (admin only)
  async getBetaSettings(): Promise<BetaSettings | undefined> {
    const [settings] = await db.select().from(betaSettings).orderBy(desc(betaSettings.updatedAt)).limit(1);
    return settings;
  }

  async upsertBetaSettings(settingsData: InsertBetaSettings): Promise<BetaSettings> {
    // Check if settings exist
    const existing = await this.getBetaSettings();
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(betaSettings)
        .set({
          features: settingsData.features,
          updatedBy: settingsData.updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(betaSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(betaSettings)
        .values(settingsData)
        .returning();
      return created;
    }
  }

  // Contacts operations
  async getContactsByProjectId(projectId: number): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.projectId, projectId))
      .orderBy(contacts.lastName, contacts.firstName);
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contactData: InsertContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values({
        ...contactData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return contact;
  }

  async updateContact(id: number, contactData: Partial<InsertContact>): Promise<Contact> {
    const [contact] = await db
      .update(contacts)
      .set({
        ...contactData,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();
    return contact;
  }

  async deleteContact(id: number): Promise<void> {
    await db
      .delete(contacts)
      .where(eq(contacts.id, id));
  }

  // Contact availability operations
  async getContactAvailability(contactId: number, projectId: number): Promise<ContactAvailability[]> {
    return await db
      .select()
      .from(contactAvailability)
      .where(and(
        eq(contactAvailability.contactId, contactId),
        eq(contactAvailability.projectId, projectId)
      ))
      .orderBy(contactAvailability.date, contactAvailability.startTime);
  }

  async createContactAvailability(availability: InsertContactAvailability): Promise<ContactAvailability> {
    const [newAvailability] = await db
      .insert(contactAvailability)
      .values({
        ...availability,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newAvailability;
  }

  async updateContactAvailability(id: number, availability: Partial<InsertContactAvailability>): Promise<ContactAvailability> {
    const [updatedAvailability] = await db
      .update(contactAvailability)
      .set({ ...availability, updatedAt: new Date() })
      .where(eq(contactAvailability.id, id))
      .returning();
    return updatedAvailability;
  }

  async deleteContactAvailability(id: number): Promise<void> {
    await db.delete(contactAvailability).where(eq(contactAvailability.id, id));
  }

  async getAvailabilityByDateRange(projectId: number, startDate: string, endDate: string): Promise<ContactAvailability[]> {
    return await db
      .select()
      .from(contactAvailability)
      .where(eq(contactAvailability.projectId, projectId))
      .orderBy(contactAvailability.date, contactAvailability.startTime);
  }

  // Error logging operations
  async createErrorLog(errorLogData: InsertErrorLog): Promise<ErrorLog> {
    const [errorLog] = await db
      .insert(errorLogs)
      .values({
        ...errorLogData,
        createdAt: new Date(),
      })
      .returning();
    return errorLog;
  }

  async getErrorLogs(): Promise<ErrorLog[]> {
    return await db
      .select()
      .from(errorLogs)
      .orderBy(desc(errorLogs.createdAt));
  }

  async getErrorLogsByUserId(userId: string): Promise<ErrorLog[]> {
    return await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.userId, userId))
      .orderBy(desc(errorLogs.createdAt));
  }

  // Contact sheet settings operations
  async getContactSheetSettings(projectId: number): Promise<any> {
    const settings = await db
      .select()
      .from(showSettings)
      .where(eq(showSettings.projectId, projectId))
      .limit(1);
    
    if (settings.length > 0 && settings[0].contactSheetSettings) {
      return JSON.parse(settings[0].contactSheetSettings as string);
    }
    return null;
  }

  async saveContactSheetSettings(projectId: number, settings: any): Promise<any> {
    const existing = await db
      .select()
      .from(showSettings)
      .where(eq(showSettings.projectId, projectId))
      .limit(1);
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(showSettings)
        .set({ 
          contactSheetSettings: settings,
          updatedAt: new Date()
        })
        .where(eq(showSettings.projectId, projectId))
        .returning();
      return updated.contactSheetSettings;
    } else {
      const [created] = await db
        .insert(showSettings)
        .values({
          projectId,
          contactSheetSettings: settings,
          createdBy: 1, // Default user ID for now
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return created.contactSheetSettings;
    }
  }

  // Contact sheet version control operations
  async publishContactSheetVersion(projectId: number, versionType: 'major' | 'minor', settings: any, publishedBy: number): Promise<any> {
    // Get current version
    const versions = await db
      .select()
      .from(contactSheetVersions)
      .where(eq(contactSheetVersions.projectId, projectId))
      .orderBy(desc(contactSheetVersions.publishedAt))
      .limit(1);

    let newVersion: string;
    if (versions.length === 0) {
      newVersion = "1.0";
    } else {
      const currentVersion = versions[0].version;
      if (versionType === 'major') {
        const majorNumber = parseInt(currentVersion.split('.')[0]);
        newVersion = `${majorNumber + 1}.0`;
      } else {
        const parts = currentVersion.split('.');
        const majorNumber = parseInt(parts[0]);
        const minorNumber = parts[1] ? parseInt(parts[1]) : 0;
        newVersion = `${majorNumber}.${minorNumber + 1}`;
      }
    }

    const [published] = await db
      .insert(contactSheetVersions)
      .values({
        projectId,
        version: newVersion,
        versionType,
        settings,
        publishedBy
      })
      .returning();

    return published;
  }

  async getContactSheetVersions(projectId: number): Promise<any[]> {
    return await db
      .select({
        id: contactSheetVersions.id,
        version: contactSheetVersions.version,
        versionType: contactSheetVersions.versionType,
        settings: contactSheetVersions.settings,
        publishedAt: contactSheetVersions.publishedAt,
        publishedBy: contactSheetVersions.publishedBy,
        publisherName: users.firstName,
        publisherLastName: users.lastName
      })
      .from(contactSheetVersions)
      .leftJoin(users, eq(contactSheetVersions.publishedBy, users.id))
      .where(eq(contactSheetVersions.projectId, projectId))
      .orderBy(desc(contactSheetVersions.publishedAt));
  }

  async getCurrentContactSheetVersion(projectId: number): Promise<string> {
    const versions = await db
      .select()
      .from(contactSheetVersions)
      .where(eq(contactSheetVersions.projectId, projectId))
      .orderBy(desc(contactSheetVersions.publishedAt))
      .limit(1);

    return versions.length > 0 ? versions[0].version : "1.0";
  }

  // Company list settings operations
  async getCompanyListSettings(projectId: number): Promise<any> {
    const settings = await db.select().from(showSettings).where(eq(showSettings.projectId, projectId));
    
    if (settings.length > 0 && settings[0].companyListSettings) {
      // Check if it's already an object or needs parsing
      const companyListSettings = settings[0].companyListSettings;
      if (typeof companyListSettings === 'string') {
        return JSON.parse(companyListSettings);
      }
      return companyListSettings;
    }
    return null;
  }

  async saveCompanyListSettings(projectId: number, settings: any): Promise<any> {
    // Check if settings already exist
    const existingSettings = await db
      .select()
      .from(showSettings)
      .where(eq(showSettings.projectId, projectId));

    if (existingSettings.length > 0) {
      // Update existing
      const [updated] = await db
        .update(showSettings)
        .set({
          companyListSettings: settings,
          updatedAt: new Date(),
        })
        .where(eq(showSettings.projectId, projectId))
        .returning();
      return updated.companyListSettings;
    } else {
      // Create new
      const [created] = await db
        .insert(showSettings)
        .values({
          projectId,
          companyListSettings: settings,
          createdBy: 1, // Default user ID for now
        })
        .returning();
      return created.companyListSettings;
    }
  }

  async publishCompanyListVersion(projectId: number, versionType: 'major' | 'minor', settings: any, publishedBy: number): Promise<any> {
    // Get current latest version for company lists only
    const latestVersion = await db
      .select()
      .from(contactSheetVersions)
      .where(and(
        eq(contactSheetVersions.projectId, projectId),
        eq(contactSheetVersions.type, 'company-list')
      ))
      .orderBy(desc(contactSheetVersions.publishedAt))
      .limit(1);

    let newVersion = "1.0";
    if (latestVersion.length > 0) {
      const current = latestVersion[0].version;
      const [major, minor] = current.split('.').map(Number);
      
      if (versionType === 'major') {
        newVersion = `${major + 1}.0`;
      } else {
        newVersion = `${major}.${minor + 1}`;
      }
    }

    // Insert new version
    const [version] = await db
      .insert(contactSheetVersions)
      .values({
        projectId,
        version: newVersion,
        versionType,
        settings: JSON.stringify(settings),
        publishedBy,
        publishedAt: new Date(),
        type: 'company-list' // Distinguish from contact sheet versions
      })
      .returning();

    return { version: version.version, versionType };
  }

  async getCompanyListVersions(projectId: number): Promise<any[]> {
    return await db
      .select({
        id: contactSheetVersions.id,
        version: contactSheetVersions.version,
        versionType: contactSheetVersions.versionType,
        settings: contactSheetVersions.settings,
        publishedAt: contactSheetVersions.publishedAt,
        publishedBy: contactSheetVersions.publishedBy,
        publisherName: users.firstName,
        publisherLastName: users.lastName
      })
      .from(contactSheetVersions)
      .leftJoin(users, eq(contactSheetVersions.publishedBy, users.id))
      .where(and(
        eq(contactSheetVersions.projectId, projectId),
        eq(contactSheetVersions.type, 'company-list')
      ))
      .orderBy(desc(contactSheetVersions.publishedAt));
  }

  async getCurrentCompanyListVersion(projectId: number): Promise<string> {
    const versions = await db
      .select()
      .from(contactSheetVersions)
      .where(and(
        eq(contactSheetVersions.projectId, projectId),
        eq(contactSheetVersions.type, 'company-list')
      ))
      .orderBy(desc(contactSheetVersions.publishedAt))
      .limit(1);

    return versions.length > 0 ? versions[0].version : "1.0";
  }

  // Waitlist operations
  async getWaitlistByEmail(email: string): Promise<Waitlist | undefined> {
    const [entry] = await db.select().from(waitlist).where(eq(waitlist.email, email));
    return entry || undefined;
  }

  async createWaitlistEntry(waitlistData: InsertWaitlist): Promise<Waitlist> {
    // Get the next position in the waitlist
    const countResult = await db.select().from(waitlist);
    const position = countResult.length + 1;

    const [newEntry] = await db
      .insert(waitlist)
      .values({ ...waitlistData, position })
      .returning();
    
    return newEntry;
  }

  async getWaitlistEntries(): Promise<Waitlist[]> {
    return await db.select().from(waitlist).orderBy(waitlist.position);
  }

  async updateWaitlistEntry(id: number, updates: Partial<InsertWaitlist>): Promise<Waitlist> {
    const [updatedEntry] = await db
      .update(waitlist)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(waitlist.id, id))
      .returning();
    
    return updatedEntry;
  }

  async getWaitlistStats(): Promise<{
    total: number;
    pending: number;
    contacted: number;
    converted: number;
    declined: number;
  }> {
    const entries = await db.select().from(waitlist);
    
    return {
      total: entries.length,
      pending: entries.filter(e => e.status === 'pending').length,
      contacted: entries.filter(e => e.status === 'contacted').length,
      converted: entries.filter(e => e.status === 'converted').length,
      declined: entries.filter(e => e.status === 'declined').length,
    };
  }
}

export const storage = new DatabaseStorage();
