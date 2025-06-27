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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
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
      .where(eq(reports.createdBy, userId))
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
      .where(eq(reportTemplates.createdBy, userId))
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
    return await db
      .select()
      .from(showDocuments)
      .where(eq(showDocuments.projectId, projectId))
      .orderBy(desc(showDocuments.createdAt));
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
    const [settings] = await db
      .insert(showSettings)
      .values(settingsData)
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
    const [settings] = await db
      .update(showSettings)
      .set({
        ...settingsData,
        updatedAt: new Date(),
      })
      .where(eq(showSettings.projectId, projectId))
      .returning();
    return settings;
  }

  async generateShareLink(projectId: number): Promise<string> {
    const shareableLink = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/shared/${projectId}/${Math.random().toString(36).substring(2, 15)}`;
    
    await this.updateShowSettings(projectId, {
      sharingSettings: {
        shareableLink,
        linkExpiration: null,
      } as any,
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
}

export const storage = new DatabaseStorage();
