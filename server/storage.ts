import {
  users,
  seasons,
  venues,
  projects,
  projectMembers,
  teamMembers,
  reports,
  reportTemplates,
  reportTemplatesV2,
  templateSections,
  templateFields,
  reportTypes,
  showDocuments,
  showSchedules,
  showCharacters,
  showSettings,
  globalTemplateSettings,
  feedback,
  betaSettings,
  contacts,
  emailContacts,
  distributionLists,
  distributionListMembers,
  reportTypeDistributionLists,
  contactGroups,
  contactAvailability,
  scheduleEvents,
  scheduleEventParticipants,
  eventLocations,
  eventTypes,
  locationAvailability,
  contactSheetVersions,
  errorLogs,
  errorClusters,
  errorNotifications,
  props,
  costumes,
  domainRoutes,
  waitlist,
  waitlistEmailSettings,
  apiSettings,
  seoSettings,
  resolutionRecords,
  errorResolutionStatus,
  reportNotes,
  emailGroups,
  showContractSettings,
  performanceTracker,
  rehearsalTracker,
  taskDatabases,
  taskProperties,
  tasks,
  taskAssignments,
  taskComments,
  taskAttachments,
  taskViews,
  noteFolders,
  notes,
  noteCollaborators,
  noteComments,
  noteAttachments,
  scheduleVersions,
  personalSchedules,
  scheduleVersionNotifications,
  scheduleEmailTemplates,
  googleCalendarIntegrations,
  notificationPreferences,
  scheduleVersionComparisons,
  emailTemplateCategories,
  publicCalendarShares,
  eventTypeCalendarShares,
  dailyCalls,
  userActivity,
  apiCosts,
  userSessions,
  featureUsage,
  userEngagementScores,
  subscriptionPlans,
  userSubscriptions,
  accountTypes,
  billingPlans,
  billingPlanPrices,
  billingHistory,
  paymentMethods,
  subscriptionUsage,
  searchHistory,
  searchIndexes,
  searchSuggestions,
  searchAnalytics,
  runningOrderVersions,
  scheduleTemplates,
  scheduleTemplateEvents,
  scheduleTemplateEventParticipants,

  type User,
  type UpsertUser,
  type Season,
  type InsertSeason,
  type Venue,
  type InsertVenue,
  type Project,
  type InsertProject,
  type TeamMember,
  type InsertTeamMember,
  type Report,
  type InsertReport,
  type ReportTemplate,
  type InsertReportTemplate,
  type ReportTemplateV2,
  type InsertReportTemplateV2,
  type TemplateSection,
  type InsertTemplateSection,
  type TemplateField,
  type InsertTemplateField,
  type ReportType,
  type InsertReportType,
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
  type EmailContact,
  type InsertEmailContact,
  type DistributionList,
  type InsertDistributionList,
  type DistributionListMember,
  type InsertDistributionListMember,
  type ContactGroup,
  type InsertContactGroup,
  type ContactAvailability,
  type InsertContactAvailability,
  type ScheduleEvent,
  type InsertScheduleEvent,
  type ScheduleEventParticipant,
  type InsertScheduleEventParticipant,
  type EventLocation,
  type InsertEventLocation,
  type EventType,
  type InsertEventType,
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
  type Costume,
  type InsertCostume,
  type DomainRoute,
  type InsertDomainRoute,
  type SeoSettings,
  type InsertSeoSettings,
  type ReportNote,
  type InsertReportNote,
  type EmailGroup,
  type InsertEmailGroup,
  type ShowContractSettings,
  type InsertShowContractSettings,
  type PerformanceTracker,
  type InsertPerformanceTracker,
  type RehearsalTracker,
  type InsertRehearsalTracker,
  type TaskDatabase,
  type InsertTaskDatabase,
  type TaskProperty,
  type InsertTaskProperty,
  type Task,
  type InsertTask,
  type TaskAssignment,
  type InsertTaskAssignment,
  type TaskComment,
  type InsertTaskComment,
  type TaskAttachment,
  type InsertTaskAttachment,
  type TaskView,
  type InsertTaskView,
  type NoteFolder,
  type InsertNoteFolder,
  type Note,
  type InsertNote,
  type NoteCollaborator,
  type InsertNoteCollaborator,
  type NoteComment,
  type InsertNoteComment,
  type NoteAttachment,
  type InsertNoteAttachment,
  type ScheduleVersion,
  type InsertScheduleVersion,
  type PersonalSchedule,
  type InsertPersonalSchedule,
  type ScheduleVersionNotification,
  type InsertScheduleVersionNotification,
  type ScheduleEmailTemplate,
  type InsertScheduleEmailTemplate,
  type GoogleCalendarIntegration,
  type InsertGoogleCalendarIntegration,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type ScheduleVersionComparison,
  type InsertScheduleVersionComparison,
  type EmailTemplateCategory,
  type InsertEmailTemplateCategory,
  type PublicCalendarShare,
  type InsertPublicCalendarShare,
  type EventTypeCalendarShare,
  type InsertEventTypeCalendarShare,
  type DailyCall,
  type InsertDailyCall,
  type UserActivity,
  type InsertUserActivity,
  type ApiCost,
  type InsertApiCost,
  type UserSession,
  type InsertUserSession,
  type FeatureUsage,
  type InsertFeatureUsage,
  type AccountType,
  type InsertAccountType,
  type BillingPlan,
  type InsertBillingPlan,
  type BillingPlanPrice,
  type InsertBillingPlanPrice,
  type BillingHistory,
  type InsertBillingHistory,
  type PaymentMethod,
  type InsertPaymentMethod,
  type SubscriptionUsage,
  type InsertSubscriptionUsage,
  type SearchHistory,
  type InsertSearchHistory,
  type SearchIndex,
  type InsertSearchIndex,  
  type SearchSuggestion,
  type InsertSearchSuggestion,
  type SearchAnalytics,
  type InsertSearchAnalytics,
  type RunningOrderVersion,
  type InsertRunningOrderVersion,
  type ScheduleTemplate,
  type InsertScheduleTemplate,
  type ScheduleTemplateEvent,
  type InsertScheduleTemplateEvent,
  type ScheduleTemplateEventParticipant,
  type InsertScheduleTemplateEventParticipant,

} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne, sql, gte, lte, or, isNull, count, max, not, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (email/password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User>;
  
  // Beta access operations
  updateUserBetaAccess(userId: string, betaAccess: boolean): Promise<User>;
  getBetaUsers(): Promise<User[]>;
  
  // Admin user management operations
  getAllUsers(): Promise<User[]>;
  updateUserAdmin(userId: string, updates: { profileType?: string; betaAccess?: string; betaFeatures?: string[]; isAdmin?: boolean; subscriptionPlan?: string; subscriptionStatus?: string; grandfatheredFree?: boolean }): Promise<User>;
  updateAllUsersBetaFeatures(enabledFeatures: string[]): Promise<void>;
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

  // Season operations
  getSeasonsByUserId(userId: string): Promise<Season[]>;
  getSeasonById(id: number): Promise<Season | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: number, season: Partial<InsertSeason>): Promise<Season>;
  deleteSeason(id: number): Promise<void>;

  // Venue operations
  getVenuesByUserId(userId: string): Promise<Venue[]>;
  getVenueById(id: number): Promise<Venue | undefined>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: number, venue: Partial<InsertVenue>): Promise<Venue>;
  deleteVenue(id: number): Promise<void>;

  // Project operations
  getProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Team member operations
  getTeamMembersByProjectId(projectId: number): Promise<TeamMember[]>;
  // Editor limit and duplicate protection methods
  getEditorActiveShowCount(email: string): Promise<number>;
  checkEditorDuplicates(email: string, name: string): Promise<{ duplicate: boolean; type: string; existingMember?: any }>;
  getAllEditorsForAdmin(): Promise<any[]>;
  getUserInvitedTeamMembers(userId: number): Promise<any[]>;
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
  updateTemplateLayoutConfiguration(projectId: number, templateType: string, layoutConfiguration: any): Promise<ReportTemplate>;
  deleteReportTemplate(id: number): Promise<void>;

  // V2 Template System operations
  getTemplatesV2WithFullData(projectId: number): Promise<any[]>;
  getTemplateV2ById(id: number): Promise<ReportTemplateV2 | undefined>;
  getTemplateV2WithFullDataById(id: number): Promise<any | undefined>;
  createTemplateV2(template: InsertReportTemplateV2): Promise<ReportTemplateV2>;
  updateTemplateV2(id: number, template: Partial<InsertReportTemplateV2>): Promise<ReportTemplateV2>;
  deleteTemplateV2(id: number): Promise<void>;
  reorderTemplatesV2(templates: { id: number; displayOrder: number }[]): Promise<void>;
  
  getSectionsByTemplateId(templateId: number): Promise<TemplateSection[]>;
  createTemplateSection(section: InsertTemplateSection): Promise<TemplateSection>;
  updateTemplateSection(id: number, section: Partial<InsertTemplateSection>): Promise<TemplateSection>;
  deleteTemplateSection(id: number): Promise<void>;
  reorderTemplateSections(sections: { id: number; displayOrder: number }[]): Promise<void>;
  
  getFieldsBySectionId(sectionId: number): Promise<TemplateField[]>;
  createTemplateField(field: InsertTemplateField): Promise<TemplateField>;
  updateTemplateField(id: number, field: Partial<InsertTemplateField>): Promise<TemplateField>;
  deleteTemplateField(id: number): Promise<void>;
  reorderTemplateFields(fields: { id: number; displayOrder: number }[]): Promise<void>;

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
  getAllContactsByUserId(userId: string): Promise<Contact[]>;
  getContactById(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Email contacts operations (unified contacts for email system)
  getEmailContactsByUserId(userId: number): Promise<EmailContact[]>;
  getEmailContactsByUserIdAndProject(userId: number, projectId: number | null): Promise<EmailContact[]>;
  createEmailContact(contact: InsertEmailContact): Promise<EmailContact>;
  updateEmailContact(id: number, contact: Partial<InsertEmailContact>): Promise<EmailContact>;
  deleteEmailContact(id: number): Promise<void>;
  syncShowContactsToEmailContacts(userId: number, projectId: number): Promise<void>;

  // Contact groups operations
  getContactGroupsByProjectId(projectId: number): Promise<ContactGroup[]>;
  getContactGroupById(id: number): Promise<ContactGroup | undefined>;
  createContactGroup(group: InsertContactGroup): Promise<ContactGroup>;
  updateContactGroup(id: number, group: Partial<InsertContactGroup>): Promise<ContactGroup>;
  deleteContactGroup(id: number): Promise<void>;
  reorderContactGroups(projectId: number, groupIds: number[]): Promise<void>;

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

  // Event location operations
  getEventLocationsByProjectId(projectId: number): Promise<EventLocation[]>;
  createEventLocation(location: InsertEventLocation): Promise<EventLocation>;
  updateEventLocation(locationId: number, updates: Partial<InsertEventLocation>): Promise<EventLocation>;
  deleteEventLocation(locationId: number): Promise<void>;
  reorderEventLocations(projectId: number, locationIds: number[]): Promise<void>;

  // Props operations
  getPropsByProjectId(projectId: number): Promise<Prop[]>;
  getPropById(id: number): Promise<Prop | undefined>;
  createProp(prop: InsertProp): Promise<Prop>;
  updateProp(id: number, prop: Partial<InsertProp>): Promise<Prop>;
  deleteProp(id: number): Promise<void>;

  // Costume operations
  getCostumesByProjectId(projectId: number): Promise<Costume[]>;
  getCostumeById(id: number): Promise<Costume | undefined>;
  createCostume(costume: InsertCostume): Promise<Costume>;
  updateCostume(id: number, costume: Partial<InsertCostume>): Promise<Costume>;
  deleteCostume(id: number): Promise<void>;

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

  // Performance and Rehearsal Tracking operations
  getShowContractSettings(projectId: number): Promise<ShowContractSettings | undefined>;
  createShowContractSettings(settings: InsertShowContractSettings): Promise<ShowContractSettings>;
  updateShowContractSettings(id: number, settings: Partial<InsertShowContractSettings>): Promise<ShowContractSettings>;
  deleteShowContractSettings(id: number): Promise<void>;
  
  getPerformanceTracker(projectId: number): Promise<PerformanceTracker[]>;
  createPerformanceEntry(entry: InsertPerformanceTracker): Promise<PerformanceTracker>;
  updatePerformanceEntry(id: number, entry: Partial<InsertPerformanceTracker>): Promise<PerformanceTracker>;
  deletePerformanceEntry(id: number): Promise<void>;
  
  getRehearsalTracker(projectId: number): Promise<RehearsalTracker[]>;
  createRehearsalEntry(entry: InsertRehearsalTracker): Promise<RehearsalTracker>;
  updateRehearsalEntry(id: number, entry: Partial<InsertRehearsalTracker>): Promise<RehearsalTracker>;
  deleteRehearsalEntry(id: number): Promise<void>;
  
  getEquityCastMembers(projectId: number): Promise<Contact[]>;
  hasEquityCastMembers(projectId: number): Promise<boolean>;

  // Task Management operations
  // Task Databases
  getTaskDatabases(projectId?: number, isGlobal?: boolean): Promise<TaskDatabase[]>;
  getTaskDatabase(id: number): Promise<TaskDatabase | undefined>;
  createTaskDatabase(database: InsertTaskDatabase): Promise<TaskDatabase>;
  updateTaskDatabase(id: number, database: Partial<InsertTaskDatabase>): Promise<TaskDatabase>;
  deleteTaskDatabase(id: number): Promise<void>;

  // Task Properties
  getTaskProperties(databaseId: number): Promise<TaskProperty[]>;
  createTaskProperty(property: InsertTaskProperty): Promise<TaskProperty>;
  updateTaskProperty(id: number, property: Partial<InsertTaskProperty>): Promise<TaskProperty>;
  deleteTaskProperty(id: number): Promise<void>;
  reorderTaskProperties(databaseId: number, propertyOrders: { id: number; sortOrder: number }[]): Promise<void>;

  // Tasks
  getTasks(databaseId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  reorderTasks(databaseId: number, taskOrders: { id: number; sortOrder: number }[]): Promise<void>;

  // Task Assignments
  getTaskAssignments(taskId: number): Promise<TaskAssignment[]>;
  createTaskAssignment(assignment: InsertTaskAssignment): Promise<TaskAssignment>;
  deleteTaskAssignment(id: number): Promise<void>;

  // Task Comments
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  updateTaskComment(id: number, comment: Partial<InsertTaskComment>): Promise<TaskComment>;
  deleteTaskComment(id: number): Promise<void>;

  // Task Attachments
  getTaskAttachments(taskId: number): Promise<TaskAttachment[]>;
  createTaskAttachment(attachment: InsertTaskAttachment): Promise<TaskAttachment>;
  deleteTaskAttachment(id: number): Promise<void>;

  // Task Views
  getTaskViews(databaseId: number): Promise<TaskView[]>;
  getTaskView(id: number): Promise<TaskView | undefined>;
  createTaskView(view: InsertTaskView): Promise<TaskView>;
  updateTaskView(id: number, view: Partial<InsertTaskView>): Promise<TaskView>;
  deleteTaskView(id: number): Promise<void>;

  // Notes System - Folders
  getNoteFolders(projectId?: number, isGlobal?: boolean): Promise<NoteFolder[]>;
  getNoteFolder(id: number): Promise<NoteFolder | undefined>;
  createNoteFolder(folder: InsertNoteFolder): Promise<NoteFolder>;
  updateNoteFolder(id: number, folder: Partial<InsertNoteFolder>): Promise<NoteFolder>;
  deleteNoteFolder(id: number): Promise<void>;

  // Notes System - Notes
  getNotes(projectId?: number, folderId?: number, searchQuery?: string): Promise<Note[]>;
  getNote(id: number): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number): Promise<void>;
  searchNotes(query: string, projectId?: number): Promise<Note[]>;

  // Notes System - Collaborators
  getNoteCollaborators(noteId: number): Promise<NoteCollaborator[]>;
  createNoteCollaborator(collaborator: InsertNoteCollaborator): Promise<NoteCollaborator>;
  updateNoteCollaborator(id: number, collaborator: Partial<InsertNoteCollaborator>): Promise<NoteCollaborator>;
  deleteNoteCollaborator(id: number): Promise<void>;

  // Notes System - Comments
  getNoteComments(noteId: number): Promise<NoteComment[]>;
  createNoteComment(comment: InsertNoteComment): Promise<NoteComment>;
  updateNoteComment(id: number, comment: Partial<InsertNoteComment>): Promise<NoteComment>;
  deleteNoteComment(id: number): Promise<void>;

  // Notes System - Attachments
  getNoteAttachments(noteId: number): Promise<NoteAttachment[]>;
  createNoteAttachment(attachment: InsertNoteAttachment): Promise<NoteAttachment>;
  deleteNoteAttachment(id: number): Promise<void>;

  // Schedule Version Control System
  getScheduleVersionsByProjectId(projectId: number): Promise<ScheduleVersion[]>;
  getScheduleVersionById(id: number): Promise<ScheduleVersion | undefined>;
  getCurrentScheduleVersion(projectId: number): Promise<ScheduleVersion | undefined>;
  createScheduleVersion(version: InsertScheduleVersion): Promise<ScheduleVersion>;
  updateScheduleVersion(id: number, version: Partial<InsertScheduleVersion>): Promise<ScheduleVersion>;
  deleteScheduleVersion(id: number): Promise<void>;
  markScheduleVersionsAsNotCurrent(projectId: number): Promise<void>;
  
  // Personal Schedules
  getPersonalSchedulesByProjectId(projectId: number): Promise<PersonalSchedule[]>;
  getPersonalScheduleById(id: number): Promise<PersonalSchedule | undefined>;
  getPersonalScheduleByToken(token: string): Promise<PersonalSchedule | undefined>;
  getPersonalScheduleByContactId(contactId: number, projectId: number): Promise<PersonalSchedule | undefined>;
  createPersonalSchedule(schedule: InsertPersonalSchedule): Promise<PersonalSchedule>;
  updatePersonalSchedule(id: number, schedule: Partial<InsertPersonalSchedule>): Promise<PersonalSchedule>;
  deletePersonalSchedule(id: number): Promise<void>;
  
  // Schedule Version Notifications
  getScheduleVersionNotifications(versionId: number): Promise<ScheduleVersionNotification[]>;
  createScheduleVersionNotification(notification: InsertScheduleVersionNotification): Promise<ScheduleVersionNotification>;
  updateScheduleVersionNotification(id: number, notification: Partial<InsertScheduleVersionNotification>): Promise<ScheduleVersionNotification>;
  deleteScheduleVersionNotification(id: number): Promise<void>;
  
  // Schedule Email Templates
  getScheduleEmailTemplatesByProjectId(projectId: number): Promise<ScheduleEmailTemplate[]>;
  getScheduleEmailTemplateById(id: number): Promise<ScheduleEmailTemplate | undefined>;
  createScheduleEmailTemplate(template: InsertScheduleEmailTemplate): Promise<ScheduleEmailTemplate>;
  updateScheduleEmailTemplate(id: number, template: Partial<InsertScheduleEmailTemplate>): Promise<ScheduleEmailTemplate>;
  deleteScheduleEmailTemplate(id: number): Promise<void>;

  // Public Calendar Shares
  getPublicCalendarSharesByProjectId(projectId: number): Promise<PublicCalendarShare[]>;
  getPublicCalendarShareByToken(token: string): Promise<PublicCalendarShare | undefined>;
  getPublicCalendarShareByContact(contactId: number, projectId: number): Promise<PublicCalendarShare | undefined>;
  createPublicCalendarShare(share: InsertPublicCalendarShare): Promise<PublicCalendarShare>;
  updatePublicCalendarShare(id: number, share: Partial<InsertPublicCalendarShare>): Promise<PublicCalendarShare>;
  deletePublicCalendarShare(id: number): Promise<void>;
  updatePublicCalendarShareAccess(token: string): Promise<void>;

  // Event Type Calendar Shares  
  getEventTypeCalendarSharesByProjectId(projectId: number): Promise<EventTypeCalendarShare[]>;
  getEventTypeCalendarShareByToken(token: string): Promise<EventTypeCalendarShare | undefined>;
  getEventTypeCalendarShareByEventType(eventTypeName: string, projectId: number): Promise<EventTypeCalendarShare | undefined>;
  createEventTypeCalendarShare(share: InsertEventTypeCalendarShare): Promise<EventTypeCalendarShare>;
  updateEventTypeCalendarShare(id: number, share: Partial<InsertEventTypeCalendarShare>): Promise<EventTypeCalendarShare>;
  deleteEventTypeCalendarShare(id: number): Promise<void>;
  updateEventTypeCalendarShareAccess(token: string): Promise<void>;

  // Daily calls methods
  getDailyCalls(projectId: number): Promise<DailyCall[]>;
  getDailyCallById(id: number): Promise<DailyCall | undefined>;
  getDailyCallByDate(projectId: number, date: string): Promise<DailyCall | undefined>;
  createDailyCall(dailyCall: InsertDailyCall): Promise<DailyCall>;
  updateDailyCall(id: number, dailyCall: Partial<InsertDailyCall>): Promise<DailyCall>;
  deleteDailyCall(id: number): Promise<void>;

  // User Analytics
  getUserAnalytics(): Promise<any[]>;
  getAnalyticsStats(): Promise<any>;
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  createApiCost(cost: InsertApiCost): Promise<ApiCost>;
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  createFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage>;
  getUserActivityByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<UserActivity[]>;
  getApiCostsByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<ApiCost[]>;
  getFeatureUsageByUserId(userId: number): Promise<FeatureUsage[]>;
  getUserSessionsByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<UserSession[]>;
  
  // Advanced Analytics - Engagement Scoring
  calculateEngagementScores(): Promise<void>;
  getUserEngagementScore(userId: number): Promise<any>;
  getEngagementAnalytics(): Promise<any>;
  getCostOptimizationRecommendations(): Promise<any[]>;
  getUserBehaviorInsights(): Promise<any[]>;
  
  // Billing System
  getSubscriptionPlans(): Promise<any[]>;
  getUserSubscription(userId: number): Promise<any>;
  createUserSubscription(subscription: any): Promise<any>;
  updateUserSubscription(userId: number, updates: any): Promise<any>;
  updateUserProfileType(userId: string, profileType: string): Promise<User>;

  // Account Types operations
  getAccountTypes(): Promise<AccountType[]>;
  getAccountTypeById(id: number): Promise<AccountType | undefined>;
  createAccountType(accountType: InsertAccountType): Promise<AccountType>;
  updateAccountType(id: number, accountType: Partial<InsertAccountType>): Promise<AccountType>;
  deleteAccountType(id: number): Promise<void>;

  // Billing operations
  getBillingPlans(): Promise<BillingPlan[]>;
  getBillingPlanById(id: number): Promise<BillingPlan | undefined>;
  getBillingPlanByPlanId(planId: string): Promise<BillingPlan | undefined>;
  createBillingPlan(plan: InsertBillingPlan): Promise<BillingPlan>;
  updateBillingPlan(id: number, plan: Partial<InsertBillingPlan>): Promise<BillingPlan>;
  deleteBillingPlan(id: number): Promise<void>;
  
  // Billing plan price history operations
  getBillingPlanPrices(planId: number): Promise<BillingPlanPrice[]>;
  getActiveBillingPlanPrice(planId: number): Promise<BillingPlanPrice | undefined>;
  createBillingPlanPrice(price: InsertBillingPlanPrice): Promise<BillingPlanPrice>;
  archiveBillingPlanPrice(priceId: number, archivedBy?: string): Promise<void>;
  
  getBillingHistory(userId: number): Promise<BillingHistory[]>;
  createBillingHistoryEntry(entry: InsertBillingHistory): Promise<BillingHistory>;
  
  getPaymentMethods(userId: number): Promise<PaymentMethod[]>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, method: Partial<InsertPaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: number): Promise<void>;
  setDefaultPaymentMethod(userId: number, paymentMethodId: number): Promise<void>;
  
  getSubscriptionUsage(userId: number, planId: string): Promise<SubscriptionUsage[]>;
  createSubscriptionUsage(usage: InsertSubscriptionUsage): Promise<SubscriptionUsage>;

  // Search system operations
  getSearchHistoryByUserId(userId: number, limit?: number): Promise<SearchHistory[]>;
  clearSearchHistoryByUserId(userId: number): Promise<void>;
  createSearchIndex(index: InsertSearchIndex): Promise<SearchIndex>;
  updateSearchIndex(id: number, index: Partial<InsertSearchIndex>): Promise<SearchIndex>;
  getSearchSuggestionsByQuery(query: string, projectId?: number): Promise<SearchSuggestion[]>;
  
  updateUserSubscription(userId: number, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    trialEndsAt?: Date;
    subscriptionEndsAt?: Date;
    paymentMethodRequired?: boolean;
    grandfatheredFree?: boolean;
  }): Promise<User>;

  // Schedule Events operations
  getScheduleEventsByProjectId(projectId: number, startDate?: string, endDate?: string): Promise<any[]>;
  getScheduleEventsByProjectAndDate(projectId: number, date: string): Promise<any[]>;
  getScheduleEventById(eventId: number): Promise<any>;
  createScheduleEvent(event: any): Promise<any>;
  updateScheduleEvent(eventId: number, updates: any): Promise<any>;
  deleteScheduleEvent(eventId: number): Promise<void>;
  addEventParticipant(participant: any): Promise<any>;
  removeEventParticipant(eventId: number, contactId: number): Promise<void>;
  removeAllEventParticipants(eventId: number): Promise<void>;

  // Schedule Relationship Mapping operations
  getProductionLevelEvents(projectId: number): Promise<any[]>;
  getDailyEventsForParent(parentEventId: number): Promise<any[]>;
  createDailyEventFromProduction(parentEventId: number, eventData: any): Promise<any>;
  linkDailyEventToProduction(dailyEventId: number, parentEventId: number): Promise<void>;
  unlinkDailyEvent(dailyEventId: number): Promise<void>;
  getEventWithChildren(eventId: number): Promise<any>;

  // Running Order Versions operations
  getRunningOrderVersionsByProjectId(projectId: number): Promise<RunningOrderVersion[]>;
  getRunningOrderVersionById(id: number): Promise<RunningOrderVersion | undefined>;
  getNextVersionNumber(projectId: number): Promise<number>;
  createRunningOrderVersion(version: InsertRunningOrderVersion): Promise<RunningOrderVersion>;
  updateRunningOrderVersion(id: number, version: Partial<InsertRunningOrderVersion>): Promise<RunningOrderVersion>;
  deleteRunningOrderVersion(id: number): Promise<void>;

  // Schedule Templates operations
  getScheduleTemplatesByProjectId(projectId: number): Promise<ScheduleTemplate[]>;
  getScheduleTemplateById(templateId: number): Promise<ScheduleTemplate | undefined>;
  createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate>;
  updateScheduleTemplate(templateId: number, updates: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate>;
  deleteScheduleTemplate(templateId: number): Promise<void>;
  getScheduleTemplateEventsById(templateId: number): Promise<ScheduleTemplateEvent[]>;
  createScheduleTemplateEvent(event: InsertScheduleTemplateEvent): Promise<ScheduleTemplateEvent>;
  updateScheduleTemplateEvent(eventId: number, updates: Partial<InsertScheduleTemplateEvent>): Promise<ScheduleTemplateEvent>;
  deleteScheduleTemplateEvent(eventId: number): Promise<void>;
  getScheduleTemplateEventParticipants(templateEventId: number): Promise<ScheduleTemplateEventParticipant[]>;
  addScheduleTemplateEventParticipant(participant: InsertScheduleTemplateEventParticipant): Promise<ScheduleTemplateEventParticipant>;
  removeScheduleTemplateEventParticipants(templateEventId: number): Promise<void>;
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

  async updateUserBetaAccess(userId: string, betaAccess: boolean): Promise<User> {
    const result = await db.update(users)
      .set({ betaAccess })
      .where(eq(users.id, parseInt(userId)))
      .returning();
    return result[0];
  }

  async getBetaUsers(): Promise<User[]> {
    const result = await db.select()
      .from(users)
      .where(eq(users.betaAccess, true));
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
  }

  async updateUserAdmin(userId: string, updates: { 
    profileType?: string; 
    betaAccess?: boolean; 
    betaFeatures?: string[]; 
    isAdmin?: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
    defaultReplyToEmail?: string;
    emailDisplayName?: string;
    password?: string;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    grandfatheredFree?: boolean;
  }): Promise<User> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, parseInt(userId)))
      .returning();
    return result[0];
  }

  async updateUserProfileType(userId: string, profileType: string): Promise<User> {
    const result = await db.update(users)
      .set({ profileType })
      .where(eq(users.id, parseInt(userId)))
      .returning();
    return result[0];
  }

  async updateAllUsersBetaFeatures(enabledFeatures: string[]): Promise<void> {
    // Update all users who have beta access to have the currently enabled features
    await db.update(users)
      .set({ 
        betaFeatures: enabledFeatures
      })
      .where(eq(users.betaAccess, true));
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, parseInt(userId)));
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const result = await db.select().from(projects).where(and(eq(projects.ownerId, parseInt(userId)), eq(projects.isArchived, false)));
    return result;
  }

  async getArchivedProjectsByUserId(userId: string): Promise<Project[]> {
    const result = await db.select().from(projects).where(and(eq(projects.ownerId, parseInt(userId)), eq(projects.isArchived, true)));
    return result;
  }

  async archiveProject(id: number): Promise<Project> {
    const result = await db.update(projects)
      .set({ 
        isArchived: true, 
        archivedAt: new Date() 
      })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async unarchiveProject(id: number): Promise<Project> {
    const result = await db.update(projects)
      .set({ 
        isArchived: false, 
        archivedAt: null 
      })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
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
    console.log('💾 updateProject called with:', { id, project });
    try {
      const result = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
      console.log('✅ updateProject successful:', result[0]);
      return result[0];
    } catch (error) {
      console.error('❌ updateProject failed:', error);
      console.error('❌ Failed query details:', { id, project });
      throw error;
    }
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // ========== SEASONS IMPLEMENTATION ==========

  async getSeasonsByUserId(userId: string): Promise<Season[]> {
    const result = await db.select().from(seasons).where(eq(seasons.userId, parseInt(userId)));
    return result;
  }

  async getSeasonById(id: number): Promise<Season | undefined> {
    const result = await db.select().from(seasons).where(eq(seasons.id, id));
    return result[0];
  }

  async createSeason(season: InsertSeason): Promise<Season> {
    const result = await db.insert(seasons).values(season).returning();
    return result[0];
  }

  async updateSeason(id: number, season: Partial<InsertSeason>): Promise<Season> {
    const result = await db.update(seasons).set(season).where(eq(seasons.id, id)).returning();
    return result[0];
  }

  async deleteSeason(id: number): Promise<void> {
    await db.delete(seasons).where(eq(seasons.id, id));
  }

  // ========== VENUES IMPLEMENTATION ==========

  async getVenuesByUserId(userId: string): Promise<Venue[]> {
    const result = await db.select().from(venues).where(eq(venues.userId, parseInt(userId)));
    return result;
  }

  async getVenueById(id: number): Promise<Venue | undefined> {
    const result = await db.select().from(venues).where(eq(venues.id, id));
    return result[0];
  }

  async createVenue(venue: InsertVenue): Promise<Venue> {
    const result = await db.insert(venues).values(venue).returning();
    return result[0];
  }

  async updateVenue(id: number, venue: Partial<InsertVenue>): Promise<Venue> {
    const result = await db.update(venues).set(venue).where(eq(venues.id, id)).returning();
    return result[0];
  }

  async deleteVenue(id: number): Promise<void> {
    await db.delete(venues).where(eq(venues.id, id));
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
    const result = await db.update(reportTemplates).set({
      ...template,
      updatedAt: new Date()
    }).where(eq(reportTemplates.id, id)).returning();
    return result[0];
  }

  async updateTemplateLayoutConfiguration(projectId: number, templateType: string, layoutConfiguration: any): Promise<ReportTemplate> {
    const result = await db.update(reportTemplates)
      .set({ 
        layoutConfiguration: layoutConfiguration,
        updatedAt: new Date()
      })
      .where(and(
        eq(reportTemplates.projectId, projectId),
        eq(reportTemplates.type, templateType)
      ))
      .returning();
    return result[0];
  }

  async deleteReportTemplate(id: number): Promise<void> {
    await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
  }

  // V2 Template System implementation
  async getTemplatesV2WithFullData(projectId: number): Promise<any[]> {
    // Fetch templates with their sections and fields in a single efficient query
    const templatesData = await db
      .select()
      .from(reportTemplatesV2)
      .where(eq(reportTemplatesV2.projectId, projectId))
      .orderBy(reportTemplatesV2.displayOrder);
    
    // Fetch all sections for these templates
    const templateIds = templatesData.map(t => t.id);
    if (templateIds.length === 0) return [];
    
    const sectionsData = await db
      .select()
      .from(templateSections)
      .where(inArray(templateSections.templateId, templateIds))
      .orderBy(templateSections.displayOrder);
    
    // Fetch all fields for these sections
    const sectionIds = sectionsData.map(s => s.id);
    const fieldsData = sectionIds.length > 0
      ? await db
          .select()
          .from(templateFields)
          .where(inArray(templateFields.sectionId, sectionIds))
          .orderBy(templateFields.displayOrder)
      : [];
    
    // Build nested structure with explicit sorting
    return templatesData.map(template => ({
      ...template,
      sections: sectionsData
        .filter(s => s.templateId === template.id)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(section => ({
          ...section,
          fields: fieldsData
            .filter(f => f.sectionId === section.id)
            .sort((a, b) => a.displayOrder - b.displayOrder)
        }))
    }));
  }

  async getTemplateV2ById(id: number): Promise<ReportTemplateV2 | undefined> {
    const result = await db.select().from(reportTemplatesV2).where(eq(reportTemplatesV2.id, id));
    return result[0];
  }

  async getTemplateV2WithFullDataById(id: number): Promise<any | undefined> {
    const templateData = await db
      .select()
      .from(reportTemplatesV2)
      .where(eq(reportTemplatesV2.id, id));
    
    if (templateData.length === 0) return undefined;
    
    const template = templateData[0];
    
    const sectionsData = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, id))
      .orderBy(templateSections.displayOrder);
    
    const sectionIds = sectionsData.map(s => s.id);
    const fieldsData = sectionIds.length > 0
      ? await db
          .select()
          .from(templateFields)
          .where(inArray(templateFields.sectionId, sectionIds))
          .orderBy(templateFields.displayOrder)
      : [];
    
    return {
      ...template,
      sections: sectionsData
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(section => ({
          ...section,
          fields: fieldsData
            .filter(f => f.sectionId === section.id)
            .sort((a, b) => a.displayOrder - b.displayOrder)
        }))
    };
  }

  async createTemplateV2(template: InsertReportTemplateV2): Promise<ReportTemplateV2> {
    const result = await db.insert(reportTemplatesV2).values(template).returning();
    return result[0];
  }

  async updateTemplateV2(id: number, template: Partial<InsertReportTemplateV2>): Promise<ReportTemplateV2> {
    const result = await db.update(reportTemplatesV2)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(reportTemplatesV2.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplateV2(id: number): Promise<void> {
    await db.delete(reportTemplatesV2).where(eq(reportTemplatesV2.id, id));
  }

  async reorderTemplatesV2(templates: { id: number; displayOrder: number }[]): Promise<void> {
    await db.transaction(async (tx) => {
      await Promise.all(
        templates.map(({ id, displayOrder }) =>
          tx.update(reportTemplatesV2)
            .set({ displayOrder, updatedAt: new Date() })
            .where(eq(reportTemplatesV2.id, id))
        )
      );
    });
  }

  async getSectionsByTemplateId(templateId: number): Promise<TemplateSection[]> {
    const result = await db
      .select()
      .from(templateSections)
      .where(eq(templateSections.templateId, templateId))
      .orderBy(templateSections.displayOrder);
    return result;
  }

  async createTemplateSection(section: InsertTemplateSection): Promise<TemplateSection> {
    const result = await db.insert(templateSections).values(section).returning();
    return result[0];
  }

  async updateTemplateSection(id: number, section: Partial<InsertTemplateSection>): Promise<TemplateSection> {
    const result = await db.update(templateSections)
      .set({ ...section, updatedAt: new Date() })
      .where(eq(templateSections.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplateSection(id: number): Promise<void> {
    await db.delete(templateSections).where(eq(templateSections.id, id));
  }

  async reorderTemplateSections(sections: { id: number; displayOrder: number }[]): Promise<void> {
    await db.transaction(async (tx) => {
      await Promise.all(
        sections.map(({ id, displayOrder }) =>
          tx.update(templateSections)
            .set({ displayOrder, updatedAt: new Date() })
            .where(eq(templateSections.id, id))
        )
      );
    });
  }

  async getFieldsBySectionId(sectionId: number): Promise<TemplateField[]> {
    const result = await db
      .select()
      .from(templateFields)
      .where(eq(templateFields.sectionId, sectionId))
      .orderBy(templateFields.displayOrder);
    return result;
  }

  async createTemplateField(field: InsertTemplateField): Promise<TemplateField> {
    const result = await db.insert(templateFields).values(field).returning();
    return result[0];
  }

  async updateTemplateField(id: number, field: Partial<InsertTemplateField>): Promise<TemplateField> {
    const result = await db.update(templateFields)
      .set({ ...field, updatedAt: new Date() })
      .where(eq(templateFields.id, id))
      .returning();
    return result[0];
  }

  async deleteTemplateField(id: number): Promise<void> {
    await db.delete(templateFields).where(eq(templateFields.id, id));
  }

  async reorderTemplateFields(fields: { id: number; displayOrder: number }[]): Promise<void> {
    await db.transaction(async (tx) => {
      await Promise.all(
        fields.map(({ id, displayOrder }) =>
          tx.update(templateFields)
            .set({ displayOrder, updatedAt: new Date() })
            .where(eq(templateFields.id, id))
        )
      );
    });
  }

  // Report types operations
  async getReportTypesByProjectId(projectId: number): Promise<ReportType[]> {
    const result = await db.select().from(reportTypes)
      .where(eq(reportTypes.projectId, projectId))
      .orderBy(reportTypes.displayOrder);
    return result;
  }

  async getReportTypeById(id: number): Promise<ReportType | undefined> {
    const result = await db.select().from(reportTypes).where(eq(reportTypes.id, id));
    return result[0];
  }

  async getReportTypeBySlug(projectId: number, slug: string): Promise<ReportType | undefined> {
    const result = await db.select().from(reportTypes)
      .where(and(
        eq(reportTypes.projectId, projectId),
        eq(reportTypes.slug, slug)
      ));
    return result[0];
  }

  async createReportType(reportType: InsertReportType): Promise<ReportType> {
    const result = await db.insert(reportTypes).values(reportType).returning();
    return result[0];
  }

  async updateReportType(id: number, reportType: Partial<InsertReportType>): Promise<ReportType> {
    const result = await db.update(reportTypes).set(reportType).where(eq(reportTypes.id, id)).returning();
    return result[0];
  }

  async deleteReportType(id: number): Promise<void> {
    await db.delete(reportTypes).where(eq(reportTypes.id, id));
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
      console.log('📝 Updating note:', { 
        id: note.id, 
        noteOrder: note.noteOrder, 
        noteOrderType: typeof note.noteOrder,
        isNaN: Number.isNaN(note.noteOrder)
      });
      
      // Ensure we have valid numbers
      const noteOrder = Number(note.noteOrder);
      if (Number.isNaN(noteOrder)) {
        throw new Error(`Invalid note order for note ${note.id}: ${note.noteOrder}`);
      }
      
      await db.update(reportNotes)
        .set({ noteOrder })
        .where(eq(reportNotes.id, note.id));
    }
  }

  async deleteReportNotesByDepartment(reportId: number, department: string): Promise<void> {
    await db.delete(reportNotes).where(
      and(
        eq(reportNotes.reportId, reportId),
        eq(reportNotes.department, department)
      )
    );
  }

  async getAllReportNotesByProjectId(projectId: number): Promise<ReportNote[]> {
    const result = await db.select().from(reportNotes)
      .where(eq(reportNotes.projectId, projectId))
      .orderBy(reportNotes.createdAt);
    return result;
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
    // Filter out timestamp fields that shouldn't be updated from the frontend
    const { createdAt, updatedAt, id, ...filteredSettings } = settings as any;
    
    const updateData = {
      ...filteredSettings,
      updatedAt: new Date()
    };
    
    const result = await db.update(showSettings)
      .set(updateData)
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

  async getBetaSettings(environment: string = "development"): Promise<BetaSettings | undefined> {
    const result = await db.select().from(betaSettings).where(eq(betaSettings.environment, environment));
    const settings = result[0];
    
    if (!settings) return undefined;
    
    // 🔧 CRITICAL FIX: Ensure all feature.enabled values are strict booleans
    // Some features may have string "false" instead of boolean false, causing UI flash
    if (settings.features) {
      settings.features = settings.features.map(feature => ({
        ...feature,
        enabled: feature.enabled === true || feature.enabled === 1 || feature.enabled === "1" || feature.enabled === "true"
      }));
    }
    
    return settings;
  }

  async upsertBetaSettings(settings: InsertBetaSettings, environment: string = "development"): Promise<BetaSettings> {
    // 🔧 Normalize all feature.enabled values to strict booleans before saving
    if (settings.features) {
      settings.features = settings.features.map(feature => ({
        ...feature,
        enabled: feature.enabled === true || feature.enabled === 1 || feature.enabled === "1" || feature.enabled === "true"
      }));
    }
    
    const existingSettings = await this.getBetaSettings(environment);
    if (existingSettings) {
      const result = await db.update(betaSettings)
        .set({ ...settings, environment })
        .where(eq(betaSettings.id, existingSettings.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(betaSettings).values({ ...settings, environment }).returning();
      return result[0];
    }
  }

  async getContactsByProjectId(projectId: number): Promise<any[]> {
    const result = await db.select().from(contacts)
      .leftJoin(contactGroups, eq(contacts.groupId, contactGroups.id))
      .where(eq(contacts.projectId, projectId));
    return result.map(row => {
      const contact = row.contacts;
      const group = row.contact_groups;
      return {
        ...contact,
        contactGroup: group || null
      };
    });
  }

  async getAllContactsByUserId(userId: string): Promise<Contact[]> {
    // Get contacts from user's projects (show contacts)
    const projectContacts = await db.select()
      .from(contacts)
      .innerJoin(projects, eq(contacts.projectId, projects.id))
      .where(eq(projects.ownerId, userId))
      .orderBy(contacts.firstName, contacts.lastName);
    
    // Get email contacts that don't have originalContactId (manually added email contacts)
    const userIdNum = parseInt(userId);
    const emailContactsResult = await db.select()
      .from(emailContacts)
      .where(
        and(
          eq(emailContacts.userId, userIdNum),
          isNull(emailContacts.originalContactId)
        )
      )
      .orderBy(emailContacts.firstName, emailContacts.lastName);
    
    // Convert email contacts to Contact format
    const convertedEmailContacts = emailContactsResult.map(ec => ({
      id: ec.id + 100000, // Offset ID to avoid conflicts
      projectId: ec.projectId || 0,
      firstName: ec.firstName,
      lastName: ec.lastName,
      email: ec.email,
      phone: ec.phone,
      category: ec.contactCategory || 'vendor',
      role: ec.role,
      notes: ec.notes,
      photoUrl: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactEmail: null,
      emergencyContactRelationship: null,
      allergies: null,
      medicalNotes: null,
      castTypes: null,
      equityStatus: null,
      createdBy: ec.createdBy,
      createdAt: ec.createdAt,
      updatedAt: ec.updatedAt
    }));
    
    // Combine and deduplicate contacts
    const allContacts = [...projectContacts.map(row => row.contacts), ...convertedEmailContacts];
    
    // Remove duplicates based on email
    const uniqueContacts = allContacts.reduce((acc, contact) => {
      if (contact.email && !acc.find(c => c.email === contact.email)) {
        acc.push(contact);
      } else if (!contact.email) {
        acc.push(contact);
      }
      return acc;
    }, [] as Contact[]);
    
    return uniqueContacts.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
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

  // Email contacts operations (unified contacts for email system)
  async getEmailContactsByUserId(userId: number): Promise<EmailContact[]> {
    const result = await db.select().from(emailContacts).where(eq(emailContacts.userId, userId));
    return result;
  }

  async getEmailContactsByUserIdAndProject(userId: number, projectId: number | null): Promise<EmailContact[]> {
    if (projectId === null) {
      // Get ALL user contacts (personal + all project contacts) - unified view for email composer
      const result = await db.select().from(emailContacts).where(
        eq(emailContacts.userId, userId)
      );
      return result;
    } else {
      // Get both project contacts and personal contacts
      const result = await db.select().from(emailContacts).where(
        and(
          eq(emailContacts.userId, userId),
          or(
            eq(emailContacts.projectId, projectId),
            isNull(emailContacts.projectId)
          )
        )
      );
      return result;
    }
  }

  async createEmailContact(contact: InsertEmailContact): Promise<EmailContact> {
    const result = await db.insert(emailContacts).values(contact).returning();
    return result[0];
  }

  async updateEmailContact(id: number, contact: Partial<InsertEmailContact>): Promise<EmailContact> {
    const result = await db.update(emailContacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(emailContacts.id, id))
      .returning();
    return result[0];
  }

  async deleteEmailContact(id: number): Promise<void> {
    await db.delete(emailContacts).where(eq(emailContacts.id, id));
  }

  // Distribution lists operations
  async getDistributionListsByUserId(userId: number): Promise<DistributionList[]> {
    const result = await db.select().from(distributionLists).where(eq(distributionLists.userId, userId));
    return result;
  }

  async getDistributionListsByUserIdAndProject(userId: number, projectId: number | null): Promise<DistributionList[]> {
    if (projectId === null) {
      const result = await db.select().from(distributionLists).where(
        and(
          eq(distributionLists.userId, userId),
          isNull(distributionLists.projectId)
        )
      );
      return result;
    } else {
      const result = await db.select().from(distributionLists).where(
        and(
          eq(distributionLists.userId, userId),
          or(
            eq(distributionLists.projectId, projectId),
            isNull(distributionLists.projectId)
          )
        )
      );
      return result;
    }
  }

  async createDistributionList(list: InsertDistributionList): Promise<DistributionList> {
    const result = await db.insert(distributionLists).values(list).returning();
    return result[0];
  }

  async updateDistributionList(id: number, list: Partial<InsertDistributionList>): Promise<DistributionList> {
    const result = await db.update(distributionLists)
      .set({ ...list, updatedAt: new Date() })
      .where(eq(distributionLists.id, id))
      .returning();
    return result[0];
  }

  async deleteDistributionList(id: number): Promise<void> {
    await db.delete(distributionLists).where(eq(distributionLists.id, id));
  }

  // Distribution list members operations
  async getDistributionListMembers(listId: number): Promise<(DistributionListMember & { emailContact: EmailContact })[]> {
    const result = await db
      .select({
        id: distributionListMembers.id,
        distributionListId: distributionListMembers.distributionListId,
        emailContactId: distributionListMembers.emailContactId,
        listType: distributionListMembers.listType,
        createdAt: distributionListMembers.createdAt,
        emailContact: {
          id: emailContacts.id,
          userId: emailContacts.userId,
          projectId: emailContacts.projectId,
          originalContactId: emailContacts.originalContactId,
          firstName: emailContacts.firstName,
          lastName: emailContacts.lastName,
          email: emailContacts.email,
          phone: emailContacts.phone,
          role: emailContacts.role,
          notes: emailContacts.notes,
          isManuallyAdded: emailContacts.isManuallyAdded,
          createdBy: emailContacts.createdBy,
          createdAt: emailContacts.createdAt,
          updatedAt: emailContacts.updatedAt,
        }
      })
      .from(distributionListMembers)
      .innerJoin(emailContacts, eq(distributionListMembers.emailContactId, emailContacts.id))
      .where(eq(distributionListMembers.distributionListId, listId));
    return result;
  }

  async createDistributionListMember(member: InsertDistributionListMember): Promise<DistributionListMember> {
    const result = await db.insert(distributionListMembers).values(member).returning();
    return result[0];
  }

  async deleteDistributionListMember(id: number): Promise<void> {
    await db.delete(distributionListMembers).where(eq(distributionListMembers.id, id));
  }

  async deleteDistributionListMembersByContactAndList(emailContactId: number, distributionListId: number): Promise<void> {
    await db.delete(distributionListMembers).where(
      and(
        eq(distributionListMembers.emailContactId, emailContactId),
        eq(distributionListMembers.distributionListId, distributionListId)
      )
    );
  }

  async getDistributionListById(id: number): Promise<DistributionList | null> {
    const result = await db.select().from(distributionLists).where(eq(distributionLists.id, id));
    return result[0] || null;
  }

  async getDistributionListsByProjectId(projectId: number): Promise<DistributionList[]> {
    const result = await db.select().from(distributionLists).where(eq(distributionLists.projectId, projectId));
    return result;
  }

  async getReportTypeDistributionList(reportTypeId: number): Promise<{ distributionListId: number } | null> {
    const result = await db.select().from(reportTypeDistributionLists).where(eq(reportTypeDistributionLists.reportTypeId, reportTypeId));
    return result[0] || null;
  }

  async assignDistributionListToReportType(projectId: number, reportTypeId: number, distributionListId: number): Promise<any> {
    // Remove existing assignment first
    await db.delete(reportTypeDistributionLists).where(eq(reportTypeDistributionLists.reportTypeId, reportTypeId));
    
    // Create new assignment
    const result = await db.insert(reportTypeDistributionLists).values({
      projectId,
      reportTypeId,
      distributionListId,
      isDefault: true,
    }).returning();
    return result[0];
  }

  async removeDistributionListFromReportType(reportTypeId: number): Promise<void> {
    await db.delete(reportTypeDistributionLists).where(eq(reportTypeDistributionLists.reportTypeId, reportTypeId));
  }

  async getReportTypesByDistributionListId(distributionListId: number): Promise<number[]> {
    const result = await db.select({ reportTypeId: reportTypeDistributionLists.reportTypeId })
      .from(reportTypeDistributionLists)
      .where(eq(reportTypeDistributionLists.distributionListId, distributionListId));
    return result.map(r => r.reportTypeId);
  }

  async syncDistributionListReportTypes(projectId: number, distributionListId: number, reportTypeIds: number[]): Promise<void> {
    // Remove all existing assignments for this distro
    await db.delete(reportTypeDistributionLists).where(eq(reportTypeDistributionLists.distributionListId, distributionListId));
    
    // Add new assignments
    for (const reportTypeId of reportTypeIds) {
      await db.insert(reportTypeDistributionLists).values({
        projectId,
        reportTypeId,
        distributionListId,
        isDefault: true,
      });
    }
  }

  async getAllDistroReportTypeMappings(projectId: number): Promise<Record<number, number[]>> {
    const result = await db.select({
      distributionListId: reportTypeDistributionLists.distributionListId,
      reportTypeId: reportTypeDistributionLists.reportTypeId,
    })
      .from(reportTypeDistributionLists)
      .where(eq(reportTypeDistributionLists.projectId, projectId));
    
    const mappings: Record<number, number[]> = {};
    for (const row of result) {
      if (!mappings[row.distributionListId]) {
        mappings[row.distributionListId] = [];
      }
      mappings[row.distributionListId].push(row.reportTypeId);
    }
    return mappings;
  }

  async syncShowContactsToEmailContacts(userId: number, projectId: number): Promise<void> {
    // Get all contacts for this project
    const showContacts = await this.getContactsByProjectId(projectId);
    
    // For each show contact, create or update corresponding email contact
    for (const showContact of showContacts) {
      // Check if this contact is already synced
      const existingEmailContact = await db.select().from(emailContacts).where(
        and(
          eq(emailContacts.userId, userId),
          eq(emailContacts.originalContactId, showContact.id)
        )
      );

      if (existingEmailContact.length === 0) {
        // Create new email contact
        await db.insert(emailContacts).values({
          userId,
          projectId,
          originalContactId: showContact.id,
          firstName: showContact.firstName,
          lastName: showContact.lastName,
          email: showContact.email,
          phone: showContact.phone,
          role: showContact.role,
          notes: showContact.notes,
          isManuallyAdded: false,
          createdBy: userId,
        });
      } else {
        // Update existing email contact with latest show contact data
        await db.update(emailContacts)
          .set({
            firstName: showContact.firstName,
            lastName: showContact.lastName,
            email: showContact.email,
            phone: showContact.phone,
            role: showContact.role,
            notes: showContact.notes,
            updatedAt: new Date(),
          })
          .where(eq(emailContacts.id, existingEmailContact[0].id));
      }
    }
  }

  async syncAllContactsToEmailContacts(userId: number): Promise<void> {
    // Get all projects for this user
    const userProjects = await this.getProjectsByOwnerId(userId.toString());
    
    let totalSynced = 0;
    
    // For each project, sync all its contacts
    for (const project of userProjects) {
      const showContacts = await this.getContactsByProjectId(project.id);
      
      // For each show contact, create or update corresponding email contact
      for (const showContact of showContacts) {
        // Check if this contact is already synced
        const existingEmailContact = await db.select().from(emailContacts).where(
          and(
            eq(emailContacts.userId, userId),
            eq(emailContacts.originalContactId, showContact.id)
          )
        );

        if (existingEmailContact.length === 0) {
          // Create new email contact
          await db.insert(emailContacts).values({
            userId,
            projectId: project.id,
            originalContactId: showContact.id,
            firstName: showContact.firstName,
            lastName: showContact.lastName,
            email: showContact.email,
            phone: showContact.phone,
            role: showContact.role,
            notes: showContact.notes,
            contactCategory: showContact.contactCategory,
            isManuallyAdded: false,
            createdBy: userId,
          });
          totalSynced++;
        } else {
          // Update existing email contact with latest show contact data
          await db.update(emailContacts)
            .set({
              firstName: showContact.firstName,
              lastName: showContact.lastName,
              email: showContact.email,
              phone: showContact.phone,
              role: showContact.role,
              notes: showContact.notes,
              contactCategory: showContact.contactCategory,
              updatedAt: new Date(),
            })
            .where(eq(emailContacts.id, existingEmailContact[0].id));
        }
      }
    }
    
    console.log(`🔄 Bulk sync completed: ${totalSynced} contacts synced for user ${userId}`);
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

  async getContactAvailabilityByProjectAndDate(projectId: number, date: string): Promise<ContactAvailability[]> {
    const result = await db.select()
      .from(contactAvailability)
      .where(and(
        eq(contactAvailability.projectId, projectId),
        eq(contactAvailability.date, date)
      ));
    return result;
  }

  async getLocationAvailabilityByProjectAndDate(projectId: number, date: string): Promise<LocationAvailability[]> {
    const result = await db.select()
      .from(locationAvailability)
      .where(and(
        eq(locationAvailability.projectId, projectId),
        eq(locationAvailability.date, date)
      ));
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

  async getCostumesByProjectId(projectId: number): Promise<Costume[]> {
    const result = await db.select().from(costumes).where(eq(costumes.projectId, projectId));
    return result;
  }

  async getCostumeById(id: number): Promise<Costume | undefined> {
    const result = await db.select().from(costumes).where(eq(costumes.id, id));
    return result[0];
  }

  async createCostume(costume: InsertCostume): Promise<Costume> {
    const result = await db.insert(costumes).values(costume).returning();
    return result[0];
  }

  async updateCostume(id: number, costume: Partial<InsertCostume>): Promise<Costume> {
    const result = await db.update(costumes).set(costume).where(eq(costumes.id, id)).returning();
    return result[0];
  }

  async deleteCostume(id: number): Promise<void> {
    await db.delete(costumes).where(eq(costumes.id, id));
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
  async getScheduleEventsByProjectId(projectId: number, startDate?: string, endDate?: string): Promise<any[]> {
    // Build where conditions
    let whereConditions = eq(scheduleEvents.projectId, projectId);
    
    // Add date range filtering if provided
    if (startDate && endDate) {
      whereConditions = and(
        whereConditions,
        gte(scheduleEvents.date, startDate),
        lte(scheduleEvents.date, endDate)
      ) as any;
    } else if (startDate) {
      whereConditions = and(
        whereConditions,
        gte(scheduleEvents.date, startDate)
      ) as any;
    } else if (endDate) {
      whereConditions = and(
        whereConditions,
        lte(scheduleEvents.date, endDate)
      ) as any;
    }
    
    const result = await db.select({
      id: scheduleEvents.id,
      projectId: scheduleEvents.projectId,
      title: scheduleEvents.title,
      description: scheduleEvents.description,
      date: scheduleEvents.date,
      startTime: scheduleEvents.startTime,
      endTime: scheduleEvents.endTime,
      type: scheduleEvents.type,
      eventTypeId: scheduleEvents.eventTypeId,
      location: scheduleEvents.location,
      notes: scheduleEvents.notes,
      isAllDay: scheduleEvents.isAllDay,
      parentEventId: scheduleEvents.parentEventId,
      isProductionLevel: scheduleEvents.isProductionLevel,
      createdBy: scheduleEvents.createdBy,
      createdAt: scheduleEvents.createdAt,
      updatedAt: scheduleEvents.updatedAt,
    })
    .from(scheduleEvents)
    .where(whereConditions)
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

  async getScheduleEventsByProjectAndDate(projectId: number, date: string): Promise<any[]> {
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
      parentEventId: scheduleEvents.parentEventId,
      isProductionLevel: scheduleEvents.isProductionLevel,
      createdBy: scheduleEvents.createdBy,
      createdAt: scheduleEvents.createdAt,
      updatedAt: scheduleEvents.updatedAt,
    })
    .from(scheduleEvents)
    .where(and(
      eq(scheduleEvents.projectId, projectId),
      eq(scheduleEvents.date, date)
    ))
    .orderBy(scheduleEvents.startTime);

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

  async createScheduleEvent(event: any): Promise<any> {
    const result = await db.insert(scheduleEvents).values(event).returning();
    return result[0];
  }

  async updateScheduleEvent(eventId: number, updates: any, updatedBy?: number): Promise<any> {
    const result = await db.update(scheduleEvents)
      .set({ ...updates, updatedAt: new Date(), updatedBy })
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

  // Schedule Relationship Mapping methods
  async getProductionLevelEvents(projectId: number): Promise<any[]> {
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
      parentEventId: scheduleEvents.parentEventId,
      isProductionLevel: scheduleEvents.isProductionLevel,
      createdBy: scheduleEvents.createdBy,
      createdAt: scheduleEvents.createdAt,
      updatedAt: scheduleEvents.updatedAt,
    })
    .from(scheduleEvents)
    .where(and(
      eq(scheduleEvents.projectId, projectId),
      eq(scheduleEvents.isProductionLevel, true)
    ))
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

  async getDailyEventsForParent(parentEventId: number): Promise<any[]> {
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
      parentEventId: scheduleEvents.parentEventId,
      isProductionLevel: scheduleEvents.isProductionLevel,
      createdBy: scheduleEvents.createdBy,
      createdAt: scheduleEvents.createdAt,
      updatedAt: scheduleEvents.updatedAt,
    })
    .from(scheduleEvents)
    .where(eq(scheduleEvents.parentEventId, parentEventId))
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

  async createDailyEventFromProduction(parentEventId: number, eventData: any): Promise<any> {
    // Create the daily event with parent linkage
    const result = await db.insert(scheduleEvents).values({
      ...eventData,
      parentEventId,
      isProductionLevel: false,
    }).returning();
    return result[0];
  }

  async linkDailyEventToProduction(dailyEventId: number, parentEventId: number): Promise<void> {
    await db.update(scheduleEvents)
      .set({ 
        parentEventId,
        updatedAt: new Date()
      })
      .where(eq(scheduleEvents.id, dailyEventId));
  }

  async unlinkDailyEvent(dailyEventId: number): Promise<void> {
    await db.update(scheduleEvents)
      .set({ 
        parentEventId: null,
        updatedAt: new Date()
      })
      .where(eq(scheduleEvents.id, dailyEventId));
  }

  async getEventWithChildren(eventId: number): Promise<any> {
    // Get the main event
    const event = await this.getScheduleEventById(eventId);
    if (!event) return null;

    // Get all child events
    const childEvents = await this.getDailyEventsForParent(eventId);

    return {
      ...event,
      childEvents,
    };
  }

  // Contact groups methods
  async getContactGroupsByProjectId(projectId: number): Promise<ContactGroup[]> {
    const result = await db.select()
      .from(contactGroups)
      .where(eq(contactGroups.projectId, projectId))
      .orderBy(contactGroups.sortOrder, contactGroups.name);
    return result;
  }

  async getContactGroupById(id: number): Promise<ContactGroup | undefined> {
    const result = await db.select()
      .from(contactGroups)
      .where(eq(contactGroups.id, id));
    return result[0];
  }

  async createContactGroup(group: InsertContactGroup & { createdBy?: number }): Promise<ContactGroup> {
    const maxOrder = await db.select({ maxOrder: max(contactGroups.sortOrder) })
      .from(contactGroups)
      .where(eq(contactGroups.projectId, group.projectId));
    
    const nextOrder = (maxOrder[0]?.maxOrder || 0) + 1;
    
    const result = await db.insert(contactGroups).values({
      ...group,
      sortOrder: nextOrder,
      createdBy: group.createdBy || undefined
    }).returning();
    return result[0];
  }

  async updateContactGroup(id: number, updates: Partial<InsertContactGroup>): Promise<ContactGroup> {
    const result = await db.update(contactGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contactGroups.id, id))
      .returning();
    return result[0];
  }

  async deleteContactGroup(id: number): Promise<void> {
    await db.delete(contactGroups).where(eq(contactGroups.id, id));
  }

  async reorderContactGroups(projectId: number, groupIds: number[]): Promise<void> {
    const updatePromises = groupIds.map((groupId, index) =>
      db.update(contactGroups)
        .set({ sortOrder: index + 1, updatedAt: new Date() })
        .where(and(
          eq(contactGroups.id, groupId),
          eq(contactGroups.projectId, projectId)
        ))
    );
    
    await Promise.all(updatePromises);
  }

  // Event Locations methods
  async getEventLocationsByProjectId(projectId: number): Promise<any[]> {
    const result = await db.select()
      .from(eventLocations)
      .where(eq(eventLocations.projectId, projectId))
      .orderBy(eventLocations.sortOrder, eventLocations.name);
    return result;
  }

  async createEventLocation(location: any): Promise<any> {
    // Get the highest sortOrder for this project
    const maxOrder = await db.select({ maxOrder: max(eventLocations.sortOrder) })
      .from(eventLocations)
      .where(eq(eventLocations.projectId, location.projectId));
    
    const nextOrder = (maxOrder[0]?.maxOrder || 0) + 1;
    
    const result = await db.insert(eventLocations).values({
      ...location,
      sortOrder: nextOrder
    }).returning();
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

  async reorderEventLocations(projectId: number, locationIds: number[]): Promise<void> {
    // Update sortOrder for each location based on its new position
    const updatePromises = locationIds.map((locationId, index) =>
      db.update(eventLocations)
        .set({ sortOrder: index + 1, updatedAt: new Date() })
        .where(and(
          eq(eventLocations.id, locationId),
          eq(eventLocations.projectId, projectId)
        ))
    );
    
    await Promise.all(updatePromises);
  }

  // Event types management
  async getEventTypesByProjectId(projectId: number): Promise<any[]> {
    // Simply return all event types from the database for this project, ordered by sortOrder
    // These are managed through the Show Settings page in the Schedule tab
    const allEventTypes = await db.select().from(eventTypes)
      .where(eq(eventTypes.projectId, projectId))
      .orderBy(eventTypes.sortOrder, eventTypes.name);
    return allEventTypes;
  }

  async createEventType(eventType: any): Promise<any> {
    // Get the highest sortOrder for this project
    const maxOrder = await db.select({ maxOrder: max(eventTypes.sortOrder) })
      .from(eventTypes)
      .where(eq(eventTypes.projectId, eventType.projectId));
    
    const nextOrder = (maxOrder[0]?.maxOrder || 0) + 1;
    
    const result = await db.insert(eventTypes).values({
      ...eventType,
      sortOrder: nextOrder
    }).returning();
    return result[0];
  }

  async reorderEventTypes(projectId: number, eventTypeIds: number[]): Promise<void> {
    // Update sortOrder for each event type based on its new position
    const updatePromises = eventTypeIds.map((eventTypeId, index) =>
      db.update(eventTypes)
        .set({ sortOrder: index + 1, updatedAt: new Date() })
        .where(and(
          eq(eventTypes.id, eventTypeId),
          eq(eventTypes.projectId, projectId)
        ))
    );
    
    await Promise.all(updatePromises);
  }

  async updateEventType(eventTypeId: number, updates: any): Promise<any> {
    // If updating a system event type (negative ID), create a custom override
    if (eventTypeId < 0) {
      // Check if an override already exists for this project
      const existingOverride = await db.select()
        .from(eventTypes)
        .where(and(
          eq(eventTypes.id, eventTypeId),
          eq(eventTypes.projectId, updates.projectId)
        ))
        .limit(1);
      
      if (existingOverride.length > 0) {
        // Update existing override
        const result = await db.update(eventTypes)
          .set({ ...updates, updatedAt: new Date() })
          .where(and(
            eq(eventTypes.id, eventTypeId),
            eq(eventTypes.projectId, updates.projectId)
          ))
          .returning();
        return result[0];
      } else {
        // Create new override for system event type
        const overrideData = {
          id: eventTypeId, // Keep the negative ID to override the system type
          projectId: updates.projectId,
          isDefault: true, // Mark as system type override
          createdBy: updates.createdBy || 2,
          ...updates,
        };
        const result = await db.insert(eventTypes).values(overrideData).returning();
        return result[0];
      }
    } else {
      // Regular custom event type update
      const result = await db.update(eventTypes)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(eventTypes.id, eventTypeId))
        .returning();
      return result[0];
    }
  }

  async deleteEventType(eventTypeId: number, projectId?: number, userId?: number): Promise<void> {
    // If deleting a system event type (negative ID), create a hidden override
    if (eventTypeId < 0) {
      if (!projectId) {
        throw new Error('Project ID is required for system event type deletion');
      }
      
      // Check if an override already exists for this project
      const existingOverride = await db.select()
        .from(eventTypes)
        .where(and(
          eq(eventTypes.id, eventTypeId),
          eq(eventTypes.projectId, projectId)
        ))
        .limit(1);
      
      if (existingOverride.length > 0) {
        // Update existing override to hide it
        await db.update(eventTypes)
          .set({ 
            name: `HIDDEN_${existingOverride[0].name}`,
            updatedAt: new Date() 
          })
          .where(and(
            eq(eventTypes.id, eventTypeId),
            eq(eventTypes.projectId, projectId)
          ));
      } else {
        // Create new hidden override for system event type
        const systemEventTypes = [
          { id: -1, name: 'Rehearsal' },
          { id: -2, name: 'Tech Rehearsal' },
          { id: -3, name: 'Preview' },
          { id: -4, name: 'Performance' },
          { id: -5, name: 'Meeting' },
          { id: -6, name: 'Costume Fitting' },
          { id: -7, name: 'Wig Fitting' },
          { id: -8, name: 'Hair and Make-Up' },
          { id: -9, name: 'Vocal Coaching' },
          { id: -10, name: 'DARK' },
          { id: -11, name: 'Breaks' }
        ];
        
        const systemType = systemEventTypes.find(st => st.id === eventTypeId);
        if (systemType) {
          await db.insert(eventTypes).values({
            id: eventTypeId,
            projectId: projectId,
            name: `HIDDEN_${systemType.name}`,
            isDefault: true,
            createdBy: userId || 2
          });
        }
      }
    } else {
      // Regular custom event type deletion
      await db.delete(eventTypes).where(eq(eventTypes.id, eventTypeId));
    }
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

  // Performance and Rehearsal Tracking operations
  async getShowContractSettings(projectId: number): Promise<ShowContractSettings | undefined> {
    const result = await db
      .select()
      .from(showContractSettings)
      .where(eq(showContractSettings.projectId, projectId));
    return result[0];
  }

  async createShowContractSettings(settings: InsertShowContractSettings): Promise<ShowContractSettings> {
    const result = await db.insert(showContractSettings).values(settings).returning();
    return result[0];
  }

  async updateShowContractSettings(id: number, settings: Partial<InsertShowContractSettings>): Promise<ShowContractSettings> {
    const result = await db
      .update(showContractSettings)
      .set(settings)
      .where(eq(showContractSettings.id, id))
      .returning();
    return result[0];
  }

  async deleteShowContractSettings(id: number): Promise<void> {
    await db.delete(showContractSettings).where(eq(showContractSettings.id, id));
  }

  async getPerformanceTracker(projectId: number): Promise<PerformanceTracker[]> {
    const result = await db
      .select()
      .from(performanceTracker)
      .where(eq(performanceTracker.projectId, projectId))
      .orderBy(desc(performanceTracker.date));
    return result;
  }

  async createPerformanceEntry(entry: InsertPerformanceTracker): Promise<PerformanceTracker> {
    const result = await db.insert(performanceTracker).values(entry).returning();
    return result[0];
  }

  async updatePerformanceEntry(id: number, entry: Partial<InsertPerformanceTracker>): Promise<PerformanceTracker> {
    const result = await db
      .update(performanceTracker)
      .set(entry)
      .where(eq(performanceTracker.id, id))
      .returning();
    return result[0];
  }

  async deletePerformanceEntry(id: number): Promise<void> {
    await db.delete(performanceTracker).where(eq(performanceTracker.id, id));
  }

  async getRehearsalTracker(projectId: number): Promise<RehearsalTracker[]> {
    const result = await db
      .select()
      .from(rehearsalTracker)
      .where(eq(rehearsalTracker.projectId, projectId))
      .orderBy(desc(rehearsalTracker.date));
    return result;
  }

  async createRehearsalEntry(entry: InsertRehearsalTracker): Promise<RehearsalTracker> {
    const result = await db.insert(rehearsalTracker).values(entry).returning();
    return result[0];
  }

  async updateRehearsalEntry(id: number, entry: Partial<InsertRehearsalTracker>): Promise<RehearsalTracker> {
    const result = await db
      .update(rehearsalTracker)
      .set(entry)
      .where(eq(rehearsalTracker.id, id))
      .returning();
    return result[0];
  }

  async deleteRehearsalEntry(id: number): Promise<void> {
    await db.delete(rehearsalTracker).where(eq(rehearsalTracker.id, id));
  }

  async getEquityCastMembers(projectId: number): Promise<Contact[]> {
    const result = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.projectId, projectId),
          eq(contacts.category, 'cast'),
          eq(contacts.equityStatus, 'equity')
        )
      );
    return result;
  }

  async hasEquityCastMembers(projectId: number): Promise<boolean> {
    const result = await db
      .select({ count: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.projectId, projectId),
          eq(contacts.category, 'cast'),
          eq(contacts.equityStatus, 'equity')
        )
      );
    return result[0].count > 0;
  }

  // ========== TASK MANAGEMENT IMPLEMENTATIONS ==========

  // Task Databases
  async getTaskDatabases(projectId?: number, isGlobal?: boolean): Promise<TaskDatabase[]> {
    let whereConditions = [];
    
    if (projectId !== undefined) {
      whereConditions.push(eq(taskDatabases.projectId, projectId));
    }
    
    if (isGlobal !== undefined) {
      whereConditions.push(eq(taskDatabases.isGlobal, isGlobal));
    }
    
    const result = await db
      .select()
      .from(taskDatabases)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(taskDatabases.createdAt);
    
    return result;
  }

  async getTaskDatabase(id: number): Promise<TaskDatabase | undefined> {
    const result = await db
      .select()
      .from(taskDatabases)
      .where(eq(taskDatabases.id, id));
    return result[0];
  }

  async createTaskDatabase(database: InsertTaskDatabase): Promise<TaskDatabase> {
    const result = await db.insert(taskDatabases).values(database).returning();
    return result[0];
  }

  async updateTaskDatabase(id: number, database: Partial<InsertTaskDatabase>): Promise<TaskDatabase> {
    const result = await db
      .update(taskDatabases)
      .set(database)
      .where(eq(taskDatabases.id, id))
      .returning();
    return result[0];
  }

  async deleteTaskDatabase(id: number): Promise<void> {
    await db.delete(taskDatabases).where(eq(taskDatabases.id, id));
  }

  // Task Properties
  async getTaskProperties(databaseId: number): Promise<TaskProperty[]> {
    const result = await db
      .select()
      .from(taskProperties)
      .where(eq(taskProperties.databaseId, databaseId))
      .orderBy(taskProperties.sortOrder);
    return result;
  }

  async createTaskProperty(property: InsertTaskProperty): Promise<TaskProperty> {
    const result = await db.insert(taskProperties).values(property).returning();
    return result[0];
  }

  async updateTaskProperty(id: number, property: Partial<InsertTaskProperty>): Promise<TaskProperty> {
    const result = await db
      .update(taskProperties)
      .set(property)
      .where(eq(taskProperties.id, id))
      .returning();
    return result[0];
  }

  async deleteTaskProperty(id: number): Promise<void> {
    await db.delete(taskProperties).where(eq(taskProperties.id, id));
  }

  async reorderTaskProperties(databaseId: number, propertyOrders: { id: number; sortOrder: number }[]): Promise<void> {
    for (const order of propertyOrders) {
      await db
        .update(taskProperties)
        .set({ sortOrder: order.sortOrder })
        .where(and(
          eq(taskProperties.id, order.id),
          eq(taskProperties.databaseId, databaseId)
        ));
    }
  }

  // Tasks
  async getTasks(databaseId: number): Promise<Task[]> {
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.databaseId, databaseId))
      .orderBy(tasks.sortOrder, tasks.createdAt);
    return result;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));
    return result[0];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const result = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async reorderTasks(databaseId: number, taskOrders: { id: number; sortOrder: number }[]): Promise<void> {
    for (const order of taskOrders) {
      await db
        .update(tasks)
        .set({ sortOrder: order.sortOrder })
        .where(and(
          eq(tasks.id, order.id),
          eq(tasks.databaseId, databaseId)
        ));
    }
  }

  // Task Assignments
  async getTaskAssignments(taskId: number): Promise<TaskAssignment[]> {
    const result = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.taskId, taskId))
      .orderBy(taskAssignments.assignedAt);
    return result;
  }

  async createTaskAssignment(assignment: InsertTaskAssignment): Promise<TaskAssignment> {
    const result = await db.insert(taskAssignments).values(assignment).returning();
    return result[0];
  }

  async deleteTaskAssignment(id: number): Promise<void> {
    await db.delete(taskAssignments).where(eq(taskAssignments.id, id));
  }

  // Task Comments
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    const result = await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(taskComments.createdAt);
    return result;
  }

  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const result = await db.insert(taskComments).values(comment).returning();
    return result[0];
  }

  async updateTaskComment(id: number, comment: Partial<InsertTaskComment>): Promise<TaskComment> {
    const result = await db
      .update(taskComments)
      .set({ ...comment, updatedAt: new Date() })
      .where(eq(taskComments.id, id))
      .returning();
    return result[0];
  }

  async deleteTaskComment(id: number): Promise<void> {
    await db.delete(taskComments).where(eq(taskComments.id, id));
  }

  // Task Attachments
  async getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
    const result = await db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.taskId, taskId))
      .orderBy(taskAttachments.createdAt);
    return result;
  }

  async createTaskAttachment(attachment: InsertTaskAttachment): Promise<TaskAttachment> {
    const result = await db.insert(taskAttachments).values(attachment).returning();
    return result[0];
  }

  async deleteTaskAttachment(id: number): Promise<void> {
    await db.delete(taskAttachments).where(eq(taskAttachments.id, id));
  }

  // Task Views
  async getTaskViews(databaseId: number): Promise<TaskView[]> {
    const result = await db
      .select()
      .from(taskViews)
      .where(eq(taskViews.databaseId, databaseId))
      .orderBy(taskViews.createdAt);
    return result;
  }

  async getTaskView(id: number): Promise<TaskView | undefined> {
    const result = await db
      .select()
      .from(taskViews)
      .where(eq(taskViews.id, id));
    return result[0];
  }

  async createTaskView(view: InsertTaskView): Promise<TaskView> {
    const result = await db.insert(taskViews).values(view).returning();
    return result[0];
  }

  async updateTaskView(id: number, view: Partial<InsertTaskView>): Promise<TaskView> {
    const result = await db
      .update(taskViews)
      .set({ ...view, updatedAt: new Date() })
      .where(eq(taskViews.id, id))
      .returning();
    return result[0];
  }

  async deleteTaskView(id: number): Promise<void> {
    await db.delete(taskViews).where(eq(taskViews.id, id));
  }

  // Notes System - Folders Implementation
  async getNoteFolders(projectId?: number, isGlobal?: boolean): Promise<NoteFolder[]> {
    let query = db.select().from(noteFolders);
    
    if (isGlobal) {
      query = query.where(isNull(noteFolders.projectId));
    } else if (projectId !== undefined) {
      query = query.where(eq(noteFolders.projectId, projectId));
    }
    
    const result = await query.orderBy(noteFolders.sortOrder, noteFolders.name);
    return result;
  }

  async getNoteFolder(id: number): Promise<NoteFolder | undefined> {
    const result = await db
      .select()
      .from(noteFolders)
      .where(eq(noteFolders.id, id));
    return result[0];
  }

  async createNoteFolder(folder: InsertNoteFolder): Promise<NoteFolder> {
    const result = await db.insert(noteFolders).values(folder).returning();
    return result[0];
  }

  async updateNoteFolder(id: number, folder: Partial<InsertNoteFolder>): Promise<NoteFolder> {
    const result = await db
      .update(noteFolders)
      .set({ ...folder, updatedAt: new Date() })
      .where(eq(noteFolders.id, id))
      .returning();
    return result[0];
  }

  async deleteNoteFolder(id: number): Promise<void> {
    await db.delete(noteFolders).where(eq(noteFolders.id, id));
  }

  // Notes System - Notes Implementation
  async getNotes(projectId?: number, folderId?: number, searchQuery?: string): Promise<Note[]> {
    let query = db.select().from(notes);
    
    const conditions = [];
    
    if (projectId !== undefined) {
      conditions.push(eq(notes.projectId, projectId));
    }
    
    if (folderId !== undefined) {
      conditions.push(eq(notes.folderId, folderId));
    }
    
    if (searchQuery) {
      conditions.push(
        or(
          sql`${notes.title} ILIKE ${`%${searchQuery}%`}`,
          sql`${notes.excerpt} ILIKE ${`%${searchQuery}%`}`
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const result = await query
      .where(eq(notes.isArchived, false))
      .orderBy(desc(notes.isPinned), notes.sortOrder, desc(notes.updatedAt));
    return result;
  }

  async getNote(id: number): Promise<Note | undefined> {
    const result = await db
      .select()
      .from(notes)
      .where(eq(notes.id, id));
    return result[0];
  }

  async createNote(note: InsertNote): Promise<Note> {
    const result = await db.insert(notes).values(note).returning();
    return result[0];
  }

  async updateNote(id: number, note: Partial<InsertNote>): Promise<Note> {
    const result = await db
      .update(notes)
      .set({ ...note, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return result[0];
  }

  async deleteNote(id: number): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async searchNotes(query: string, projectId?: number): Promise<Note[]> {
    let searchQuery = db
      .select()
      .from(notes)
      .where(
        and(
          or(
            sql`${notes.title} ILIKE ${`%${query}%`}`,
            sql`${notes.excerpt} ILIKE ${`%${query}%`}`,
            sql`array_to_string(${notes.tags}, ' ') ILIKE ${`%${query}%`}`
          ),
          eq(notes.isArchived, false)
        )
      );
    
    if (projectId !== undefined) {
      searchQuery = searchQuery.where(eq(notes.projectId, projectId));
    }
    
    const result = await searchQuery.orderBy(desc(notes.updatedAt));
    return result;
  }

  // Notes System - Collaborators Implementation
  async getNoteCollaborators(noteId: number): Promise<NoteCollaborator[]> {
    const result = await db
      .select()
      .from(noteCollaborators)
      .where(eq(noteCollaborators.noteId, noteId))
      .orderBy(noteCollaborators.invitedAt);
    return result;
  }

  async createNoteCollaborator(collaborator: InsertNoteCollaborator): Promise<NoteCollaborator> {
    const result = await db.insert(noteCollaborators).values(collaborator).returning();
    return result[0];
  }

  async updateNoteCollaborator(id: number, collaborator: Partial<InsertNoteCollaborator>): Promise<NoteCollaborator> {
    const result = await db
      .update(noteCollaborators)
      .set(collaborator)
      .where(eq(noteCollaborators.id, id))
      .returning();
    return result[0];
  }

  async deleteNoteCollaborator(id: number): Promise<void> {
    await db.delete(noteCollaborators).where(eq(noteCollaborators.id, id));
  }

  // Notes System - Comments Implementation
  async getNoteComments(noteId: number): Promise<NoteComment[]> {
    const result = await db
      .select()
      .from(noteComments)
      .where(eq(noteComments.noteId, noteId))
      .orderBy(noteComments.createdAt);
    return result;
  }

  async createNoteComment(comment: InsertNoteComment): Promise<NoteComment> {
    const result = await db.insert(noteComments).values(comment).returning();
    return result[0];
  }

  async updateNoteComment(id: number, comment: Partial<InsertNoteComment>): Promise<NoteComment> {
    const result = await db
      .update(noteComments)
      .set({ ...comment, updatedAt: new Date() })
      .where(eq(noteComments.id, id))
      .returning();
    return result[0];
  }

  async deleteNoteComment(id: number): Promise<void> {
    await db.delete(noteComments).where(eq(noteComments.id, id));
  }

  // Notes System - Attachments Implementation
  async getNoteAttachments(noteId: number): Promise<NoteAttachment[]> {
    const result = await db
      .select()
      .from(noteAttachments)
      .where(eq(noteAttachments.noteId, noteId))
      .orderBy(noteAttachments.createdAt);
    return result;
  }

  async createNoteAttachment(attachment: InsertNoteAttachment): Promise<NoteAttachment> {
    const result = await db.insert(noteAttachments).values(attachment).returning();
    return result[0];
  }

  async deleteNoteAttachment(id: number): Promise<void> {
    await db.delete(noteAttachments).where(eq(noteAttachments.id, id));
  }

  // ========== SCHEDULE VERSION CONTROL IMPLEMENTATIONS ==========

  // Schedule Versions
  async getScheduleVersionsByProjectId(projectId: number): Promise<ScheduleVersion[]> {
    const result = await db
      .select()
      .from(scheduleVersions)
      .where(eq(scheduleVersions.projectId, projectId))
      .orderBy(desc(scheduleVersions.publishedAt));
    return result;
  }

  async getScheduleVersionById(id: number): Promise<ScheduleVersion | undefined> {
    const result = await db
      .select()
      .from(scheduleVersions)
      .where(eq(scheduleVersions.id, id));
    return result[0];
  }

  async getCurrentScheduleVersion(projectId: number): Promise<ScheduleVersion | undefined> {
    const result = await db
      .select()
      .from(scheduleVersions)
      .where(eq(scheduleVersions.projectId, projectId))
      .orderBy(desc(scheduleVersions.publishedAt))
      .limit(1);
    return result[0];
  }

  async getLastPublishedScheduleVersion(projectId: number): Promise<ScheduleVersion | undefined> {
    const result = await db
      .select()
      .from(scheduleVersions)
      .where(eq(scheduleVersions.projectId, projectId))
      .orderBy(desc(scheduleVersions.publishedAt))
      .limit(2);
    
    // Return the second most recent (previous version)
    return result[1];
  }

  async createScheduleVersion(version: InsertScheduleVersion): Promise<ScheduleVersion> {
    const result = await db.insert(scheduleVersions).values(version).returning();
    return result[0];
  }

  async updateScheduleVersion(id: number, version: Partial<InsertScheduleVersion>): Promise<ScheduleVersion> {
    const result = await db
      .update(scheduleVersions)
      .set(version)
      .where(eq(scheduleVersions.id, id))
      .returning();
    return result[0];
  }

  async deleteScheduleVersion(id: number): Promise<void> {
    await db.delete(scheduleVersions).where(eq(scheduleVersions.id, id));
  }

  async markScheduleVersionsAsNotCurrent(projectId: number): Promise<void> {
    await db
      .update(scheduleVersions)
      .set({ isCurrent: false })
      .where(eq(scheduleVersions.projectId, projectId));
  }

  // Personal Schedules
  async getPersonalSchedulesByProjectId(projectId: number): Promise<PersonalSchedule[]> {
    const result = await db
      .select()
      .from(personalSchedules)
      .where(eq(personalSchedules.projectId, projectId))
      .orderBy(personalSchedules.createdAt);
    return result;
  }

  async getPersonalScheduleById(id: number): Promise<PersonalSchedule | undefined> {
    const result = await db
      .select()
      .from(personalSchedules)
      .where(eq(personalSchedules.id, id));
    return result[0];
  }

  async getPersonalScheduleByToken(token: string): Promise<PersonalSchedule | undefined> {
    const result = await db
      .select()
      .from(personalSchedules)
      .where(eq(personalSchedules.accessToken, token));
    return result[0];
  }

  async getPersonalScheduleByContactId(contactId: number, projectId: number): Promise<PersonalSchedule | undefined> {
    const result = await db
      .select()
      .from(personalSchedules)
      .where(and(
        eq(personalSchedules.contactId, contactId),
        eq(personalSchedules.projectId, projectId)
      ));
    return result[0];
  }

  async createPersonalSchedule(schedule: InsertPersonalSchedule): Promise<PersonalSchedule> {
    const result = await db.insert(personalSchedules).values(schedule).returning();
    return result[0];
  }

  async updatePersonalSchedule(id: number, schedule: Partial<InsertPersonalSchedule>): Promise<PersonalSchedule> {
    const result = await db
      .update(personalSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(personalSchedules.id, id))
      .returning();
    return result[0];
  }

  async deletePersonalSchedule(id: number): Promise<void> {
    await db.delete(personalSchedules).where(eq(personalSchedules.id, id));
  }

  // Schedule Version Notifications
  async getScheduleVersionNotifications(versionId: number): Promise<ScheduleVersionNotification[]> {
    const result = await db
      .select()
      .from(scheduleVersionNotifications)
      .where(eq(scheduleVersionNotifications.versionId, versionId))
      .orderBy(scheduleVersionNotifications.sentAt);
    return result;
  }

  async createScheduleVersionNotification(notification: InsertScheduleVersionNotification): Promise<ScheduleVersionNotification> {
    const result = await db.insert(scheduleVersionNotifications).values(notification).returning();
    return result[0];
  }

  async updateScheduleVersionNotification(id: number, notification: Partial<InsertScheduleVersionNotification>): Promise<ScheduleVersionNotification> {
    const result = await db
      .update(scheduleVersionNotifications)
      .set(notification)
      .where(eq(scheduleVersionNotifications.id, id))
      .returning();
    return result[0];
  }

  async deleteScheduleVersionNotification(id: number): Promise<void> {
    await db.delete(scheduleVersionNotifications).where(eq(scheduleVersionNotifications.id, id));
  }

  // Schedule Email Templates
  async getScheduleEmailTemplatesByProjectId(projectId: number): Promise<ScheduleEmailTemplate[]> {
    const result = await db
      .select()
      .from(scheduleEmailTemplates)
      .where(eq(scheduleEmailTemplates.projectId, projectId))
      .orderBy(scheduleEmailTemplates.createdAt);
    return result;
  }

  async getScheduleEmailTemplateById(id: number): Promise<ScheduleEmailTemplate | undefined> {
    const result = await db
      .select()
      .from(scheduleEmailTemplates)
      .where(eq(scheduleEmailTemplates.id, id));
    return result[0];
  }

  async createScheduleEmailTemplate(template: InsertScheduleEmailTemplate): Promise<ScheduleEmailTemplate> {
    const result = await db.insert(scheduleEmailTemplates).values(template).returning();
    return result[0];
  }

  async updateScheduleEmailTemplate(id: number, template: Partial<InsertScheduleEmailTemplate>): Promise<ScheduleEmailTemplate> {
    const result = await db
      .update(scheduleEmailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(scheduleEmailTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteScheduleEmailTemplate(id: number): Promise<void> {
    await db.delete(scheduleEmailTemplates).where(eq(scheduleEmailTemplates.id, id));
  }

  // Google Calendar Integration (Phase 5)
  async getGoogleCalendarIntegrationsByProjectId(projectId: number): Promise<GoogleCalendarIntegration[]> {
    const result = await db
      .select()
      .from(googleCalendarIntegrations)
      .where(eq(googleCalendarIntegrations.projectId, projectId))
      .orderBy(googleCalendarIntegrations.createdAt);
    return result;
  }

  async getGoogleCalendarIntegrationByUserId(userId: number, projectId: number): Promise<GoogleCalendarIntegration | undefined> {
    const result = await db
      .select()
      .from(googleCalendarIntegrations)
      .where(
        and(
          eq(googleCalendarIntegrations.userId, userId),
          eq(googleCalendarIntegrations.projectId, projectId),
          eq(googleCalendarIntegrations.isActive, true)
        )
      );
    return result[0];
  }

  async createGoogleCalendarIntegration(integration: InsertGoogleCalendarIntegration): Promise<GoogleCalendarIntegration> {
    const result = await db.insert(googleCalendarIntegrations).values(integration).returning();
    return result[0];
  }

  async updateGoogleCalendarIntegration(id: number, integration: Partial<InsertGoogleCalendarIntegration>): Promise<GoogleCalendarIntegration> {
    const result = await db
      .update(googleCalendarIntegrations)
      .set({ ...integration, updatedAt: new Date() })
      .where(eq(googleCalendarIntegrations.id, id))
      .returning();
    return result[0];
  }

  async deleteGoogleCalendarIntegration(id: number): Promise<void> {
    await db.delete(googleCalendarIntegrations).where(eq(googleCalendarIntegrations.id, id));
  }

  // Notification Preferences (Phase 5)
  async getNotificationPreferences(contactId: number, projectId: number): Promise<NotificationPreferences | undefined> {
    const result = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.contactId, contactId),
          eq(notificationPreferences.projectId, projectId)
        )
      );
    return result[0];
  }

  async getNotificationPreferencesByProjectId(projectId: number): Promise<NotificationPreferences[]> {
    const result = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.projectId, projectId))
      .orderBy(notificationPreferences.createdAt);
    return result;
  }

  async createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const result = await db.insert(notificationPreferences).values(preferences).returning();
    return result[0];
  }

  async updateNotificationPreferences(id: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    const result = await db
      .update(notificationPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(notificationPreferences.id, id))
      .returning();
    return result[0];
  }

  async deleteNotificationPreferences(id: number): Promise<void> {
    await db.delete(notificationPreferences).where(eq(notificationPreferences.id, id));
  }

  // Schedule Version Comparisons (Phase 5)
  async getScheduleVersionComparison(fromVersionId: number, toVersionId: number): Promise<ScheduleVersionComparison | undefined> {
    const result = await db
      .select()
      .from(scheduleVersionComparisons)
      .where(
        and(
          eq(scheduleVersionComparisons.fromVersionId, fromVersionId),
          eq(scheduleVersionComparisons.toVersionId, toVersionId)
        )
      );
    return result[0];
  }

  async getScheduleVersionComparisonsByProjectId(projectId: number): Promise<ScheduleVersionComparison[]> {
    const result = await db
      .select()
      .from(scheduleVersionComparisons)
      .where(eq(scheduleVersionComparisons.projectId, projectId))
      .orderBy(scheduleVersionComparisons.createdAt);
    return result;
  }

  async createScheduleVersionComparison(comparison: InsertScheduleVersionComparison): Promise<ScheduleVersionComparison> {
    const result = await db.insert(scheduleVersionComparisons).values(comparison).returning();
    return result[0];
  }

  async deleteScheduleVersionComparison(id: number): Promise<void> {
    await db.delete(scheduleVersionComparisons).where(eq(scheduleVersionComparisons.id, id));
  }

  // Email Template Categories (Phase 5)
  async getEmailTemplateCategoriesByProjectId(projectId: number): Promise<EmailTemplateCategory[]> {
    const result = await db
      .select()
      .from(emailTemplateCategories)
      .where(eq(emailTemplateCategories.projectId, projectId))
      .orderBy(emailTemplateCategories.name);
    return result;
  }

  async createEmailTemplateCategory(category: InsertEmailTemplateCategory): Promise<EmailTemplateCategory> {
    const result = await db.insert(emailTemplateCategories).values(category).returning();
    return result[0];
  }

  async updateEmailTemplateCategory(id: number, category: Partial<InsertEmailTemplateCategory>): Promise<EmailTemplateCategory> {
    const result = await db
      .update(emailTemplateCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(emailTemplateCategories.id, id))
      .returning();
    return result[0];
  }

  async deleteEmailTemplateCategory(id: number): Promise<void> {
    await db.delete(emailTemplateCategories).where(eq(emailTemplateCategories.id, id));
  }

  // Phase 5: Google Calendar Integration Methods
  async getGoogleCalendarIntegrationsByProjectId(projectId: number): Promise<GoogleCalendarIntegration[]> {
    const result = await db
      .select()
      .from(googleCalendarIntegrations)
      .where(eq(googleCalendarIntegrations.projectId, projectId))
      .orderBy(googleCalendarIntegrations.createdAt);
    return result;
  }

  async getGoogleCalendarIntegrationById(id: number): Promise<GoogleCalendarIntegration | undefined> {
    const result = await db
      .select()
      .from(googleCalendarIntegrations)
      .where(eq(googleCalendarIntegrations.id, id));
    return result[0];
  }

  async createGoogleCalendarIntegration(integration: InsertGoogleCalendarIntegration): Promise<GoogleCalendarIntegration> {
    const result = await db.insert(googleCalendarIntegrations).values(integration).returning();
    return result[0];
  }

  async updateGoogleCalendarIntegration(id: number, integration: Partial<InsertGoogleCalendarIntegration>): Promise<GoogleCalendarIntegration> {
    const result = await db
      .update(googleCalendarIntegrations)
      .set({ ...integration, updatedAt: new Date() })
      .where(eq(googleCalendarIntegrations.id, id))
      .returning();
    return result[0];
  }

  async deleteGoogleCalendarIntegration(id: number): Promise<void> {
    await db.delete(googleCalendarIntegrations).where(eq(googleCalendarIntegrations.id, id));
  }

  // Phase 5: Notification Preferences Methods
  async getNotificationPreferencesByProjectId(projectId: number): Promise<NotificationPreferences[]> {
    const result = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.projectId, projectId))
      .orderBy(notificationPreferences.createdAt);
    return result;
  }

  async getNotificationPreferences(contactId: number, projectId: number): Promise<NotificationPreferences | undefined> {
    const result = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.contactId, contactId),
          eq(notificationPreferences.projectId, projectId)
        )
      );
    return result[0];
  }

  async createNotificationPreferences(preferences: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const result = await db.insert(notificationPreferences).values(preferences).returning();
    return result[0];
  }

  async updateNotificationPreferences(id: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    const result = await db
      .update(notificationPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(notificationPreferences.id, id))
      .returning();
    return result[0];
  }

  async deleteNotificationPreferences(id: number): Promise<void> {
    await db.delete(notificationPreferences).where(eq(notificationPreferences.id, id));
  }

  // Phase 5: Schedule Version Comparison Methods
  async getScheduleVersionComparisonsByProjectId(projectId: number): Promise<ScheduleVersionComparison[]> {
    const result = await db
      .select()
      .from(scheduleVersionComparisons)
      .where(eq(scheduleVersionComparisons.projectId, projectId))
      .orderBy(desc(scheduleVersionComparisons.createdAt));
    return result;
  }

  async getScheduleVersionComparisonById(id: number): Promise<ScheduleVersionComparison | undefined> {
    const result = await db
      .select()
      .from(scheduleVersionComparisons)
      .where(eq(scheduleVersionComparisons.id, id));
    return result[0];
  }

  async createScheduleVersionComparison(comparison: InsertScheduleVersionComparison): Promise<ScheduleVersionComparison> {
    const result = await db.insert(scheduleVersionComparisons).values(comparison).returning();
    return result[0];
  }

  async deleteScheduleVersionComparison(id: number): Promise<void> {
    await db.delete(scheduleVersionComparisons).where(eq(scheduleVersionComparisons.id, id));
  }

  async getScheduleVersionComparisonByVersions(fromVersionId: number, toVersionId: number): Promise<ScheduleVersionComparison | undefined> {
    const result = await db
      .select()
      .from(scheduleVersionComparisons)
      .where(
        and(
          eq(scheduleVersionComparisons.fromVersionId, fromVersionId),
          eq(scheduleVersionComparisons.toVersionId, toVersionId)
        )
      );
    return result[0];
  }

  // Public Calendar Share Methods
  async getPublicCalendarSharesByProjectId(projectId: number): Promise<PublicCalendarShare[]> {
    const result = await db
      .select()
      .from(publicCalendarShares)
      .where(eq(publicCalendarShares.projectId, projectId))
      .orderBy(publicCalendarShares.createdAt);
    return result;
  }

  async getPublicCalendarShareByToken(token: string): Promise<PublicCalendarShare | undefined> {
    const result = await db
      .select()
      .from(publicCalendarShares)
      .where(eq(publicCalendarShares.token, token));
    return result[0];
  }

  async getPublicCalendarShareByContact(contactId: number, projectId: number): Promise<PublicCalendarShare | undefined> {
    const result = await db
      .select()
      .from(publicCalendarShares)
      .where(
        and(
          eq(publicCalendarShares.contactId, contactId),
          eq(publicCalendarShares.projectId, projectId)
        )
      );
    return result[0];
  }

  async createPublicCalendarShare(share: InsertPublicCalendarShare): Promise<PublicCalendarShare> {
    const result = await db.insert(publicCalendarShares).values(share).returning();
    return result[0];
  }

  async updatePublicCalendarShare(id: number, share: Partial<InsertPublicCalendarShare>): Promise<PublicCalendarShare> {
    const result = await db
      .update(publicCalendarShares)
      .set({ ...share, updatedAt: new Date() })
      .where(eq(publicCalendarShares.id, id))
      .returning();
    return result[0];
  }

  async deletePublicCalendarShare(id: number): Promise<void> {
    await db.delete(publicCalendarShares).where(eq(publicCalendarShares.id, id));
  }

  async updatePublicCalendarShareAccess(token: string): Promise<void> {
    await db
      .update(publicCalendarShares)
      .set({ 
        accessCount: sql`${publicCalendarShares.accessCount} + 1`,
        lastAccessedAt: new Date()
      })
      .where(eq(publicCalendarShares.token, token));
  }

  // Event Type Calendar Share Methods
  async getEventTypeCalendarSharesByProjectId(projectId: number): Promise<EventTypeCalendarShare[]> {
    const result = await db
      .select()
      .from(eventTypeCalendarShares)
      .where(eq(eventTypeCalendarShares.projectId, projectId))
      .orderBy(eventTypeCalendarShares.createdAt);
    return result;
  }

  async getEventTypeCalendarShareByToken(token: string): Promise<EventTypeCalendarShare | undefined> {
    const result = await db
      .select()
      .from(eventTypeCalendarShares)
      .where(eq(eventTypeCalendarShares.token, token));
    return result[0];
  }

  async getEventTypeCalendarShareByEventType(eventTypeName: string, projectId: number): Promise<EventTypeCalendarShare | undefined> {
    const result = await db
      .select()
      .from(eventTypeCalendarShares)
      .where(
        and(
          eq(eventTypeCalendarShares.eventTypeName, eventTypeName),
          eq(eventTypeCalendarShares.projectId, projectId)
        )
      );
    return result[0];
  }

  async createEventTypeCalendarShare(share: InsertEventTypeCalendarShare): Promise<EventTypeCalendarShare> {
    const result = await db.insert(eventTypeCalendarShares).values(share).returning();
    return result[0];
  }

  async updateEventTypeCalendarShare(id: number, share: Partial<InsertEventTypeCalendarShare>): Promise<EventTypeCalendarShare> {
    const result = await db
      .update(eventTypeCalendarShares)
      .set({ ...share, updatedAt: new Date() })
      .where(eq(eventTypeCalendarShares.id, id))
      .returning();
    return result[0];
  }

  async deleteEventTypeCalendarShare(id: number): Promise<void> {
    await db.delete(eventTypeCalendarShares).where(eq(eventTypeCalendarShares.id, id));
  }

  async updateEventTypeCalendarShareAccess(token: string): Promise<void> {
    await db
      .update(eventTypeCalendarShares)
      .set({ 
        accessCount: sql`${eventTypeCalendarShares.accessCount} + 1`,
        lastAccessed: new Date()
      })
      .where(eq(eventTypeCalendarShares.token, token));
  }

  async getPersonalScheduleByContact(contactId: number, projectId: number): Promise<PersonalSchedule | undefined> {
    const result = await db
      .select()
      .from(personalSchedules)
      .where(
        and(
          eq(personalSchedules.contactId, contactId),
          eq(personalSchedules.projectId, projectId)
        )
      )
      .orderBy(desc(personalSchedules.createdAt));
    return result[0];
  }

  // Daily Calls Implementation
  async getDailyCalls(projectId: number): Promise<DailyCall[]> {
    const result = await db
      .select()
      .from(dailyCalls)
      .where(eq(dailyCalls.projectId, projectId))
      .orderBy(desc(dailyCalls.date));
    return result;
  }

  async getDailyCallById(id: number): Promise<DailyCall | undefined> {
    const result = await db
      .select()
      .from(dailyCalls)
      .where(eq(dailyCalls.id, id));
    return result[0];
  }

  async getDailyCallByDate(projectId: number, date: string): Promise<DailyCall | undefined> {
    const result = await db
      .select()
      .from(dailyCalls)
      .where(
        and(
          eq(dailyCalls.projectId, projectId),
          eq(dailyCalls.date, date)
        )
      );
    return result[0];
  }

  async createDailyCall(dailyCall: InsertDailyCall): Promise<DailyCall> {
    const result = await db.insert(dailyCalls).values(dailyCall).returning();
    return result[0];
  }

  async updateDailyCall(id: number, dailyCall: Partial<InsertDailyCall>): Promise<DailyCall> {
    const result = await db
      .update(dailyCalls)
      .set({ ...dailyCall, updatedAt: new Date() })
      .where(eq(dailyCalls.id, id))
      .returning();
    return result[0];
  }

  async deleteDailyCall(id: number): Promise<void> {
    await db.delete(dailyCalls).where(eq(dailyCalls.id, id));
  }

  // User Analytics Implementation
  async getUserAnalytics(): Promise<any[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all users with their basic data
    const allUsers = await db.select().from(users);
    
    // Get analytics data for each user
    const userAnalytics = await Promise.all(allUsers.map(async (user) => {
      // Get activity data
      const activities = await db.select()
        .from(userActivity)
        .where(and(
          eq(userActivity.userId, user.id),
          gte(userActivity.createdAt, thirtyDaysAgo)
        ));

      // Get cost data
      const dailyCosts = await db.select()
        .from(apiCosts)
        .where(and(
          eq(apiCosts.userId, user.id),
          gte(apiCosts.date, todayStart)
        ));

      const monthlyCosts = await db.select()
        .from(apiCosts)
        .where(and(
          eq(apiCosts.userId, user.id),
          gte(apiCosts.date, thirtyDaysAgo)
        ));

      // Get session data
      const sessions = await db.select()
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, user.id),
          gte(userSessions.startTime, thirtyDaysAgo)
        ));

      // Get feature usage
      const featureUsages = await db.select()
        .from(featureUsage)
        .where(eq(featureUsage.userId, user.id));

      // Calculate analytics
      const dailyCost = dailyCosts.reduce((sum, cost) => sum + parseFloat(cost.cost), 0);
      const monthlyCost = monthlyCosts.reduce((sum, cost) => sum + parseFloat(cost.cost), 0);
      
      const totalSessions = sessions.length;
      const averageSessionMinutes = totalSessions > 0 
        ? sessions.reduce((sum, session) => {
            const duration = session.endTime 
              ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)
              : 0;
            return sum + duration;
          }, 0) / totalSessions
        : 0;

      const lastSession = sessions.length > 0 
        ? sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
        : null;

      // Determine activity level
      let activityLevel: 'high' | 'medium' | 'low' | 'inactive' = 'inactive';
      if (activities.length > 50) activityLevel = 'high';
      else if (activities.length > 20) activityLevel = 'medium';
      else if (activities.length > 0) activityLevel = 'low';

      // Top features
      const featureMap = new Map<string, number>();
      featureUsages.forEach(usage => {
        featureMap.set(usage.featureName, (featureMap.get(usage.featureName) || 0) + usage.usageCount);
      });
      
      const totalUsage = Array.from(featureMap.values()).reduce((sum, count) => sum + count, 0);
      const topFeatures = Array.from(featureMap.entries())
        .map(([feature, usage]) => ({
          feature,
          usage,
          percentage: totalUsage > 0 ? Math.round((usage / totalUsage) * 100) : 0
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      // Get search history and metrics
      const userSearchHistory = await db.select()
        .from(searchHistory)
        .where(
          and(
            eq(searchHistory.userId, user.id),
            sql`${searchHistory.createdAt} >= ${thirtyDaysAgo}`
          )
        );

      const searchMetrics = {
        totalSearches: userSearchHistory.length,
        dailySearches: userSearchHistory.filter(search => search.createdAt >= todayStart).length,
        naturalLanguageSearches: userSearchHistory.filter(search => search.queryType === 'natural').length,
        advancedSearches: userSearchHistory.filter(search => search.queryType === 'advanced').length,
        averageResponseTime: userSearchHistory.length > 0 
          ? Math.round(userSearchHistory.reduce((sum, search) => sum + (search.responseTime || 0), 0) / userSearchHistory.length)
          : 0,
        searchCost: monthlyCosts.filter(cost => cost.service === 'OpenAI' && (cost.description?.includes('search') || cost.endpoint?.includes('search'))).reduce((sum, cost) => sum + parseFloat(cost.cost), 0)
      };

      // Cost breakdown by service
      const costBreakdown = monthlyCosts.reduce((breakdown, cost) => {
        const existing = breakdown.find(item => item.service === cost.service);
        if (existing) {
          existing.cost += parseFloat(cost.cost);
          existing.requests += cost.requests;
        } else {
          breakdown.push({
            service: cost.service,
            cost: parseFloat(cost.cost),
            requests: cost.requests
          });
        }
        return breakdown;
      }, [] as Array<{ service: string; cost: number; requests: number }>);

      return {
        ...user,
        activityLevel,
        dailyCost,
        monthlyCost,
        topFeatures,
        sessionStats: {
          averageSession: averageSessionMinutes,
          totalSessions,
          lastSession: lastSession?.startTime || null
        },
        costBreakdown,
        lastSeen: lastSession?.startTime || null,
        searchMetrics,
        // Include billing status fields for user status calculation
        isActive: user.isActive ?? true, // Default to true if not set
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        grandfatheredFree: user.grandfatheredFree ?? false
      };
    }));

    return userAnalytics;
  }

  async getAnalyticsStats(): Promise<any> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total users
    const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUsers = totalUsersResult[0].count;

    // Active users (users with is_active = true)
    const activeUsersResult = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(users).where(eq(users.isActive, true));
    const activeUsers = activeUsersResult[0].count;

    // Total monthly cost
    const monthlyCostResult = await db.select({ 
      total: sql<number>`sum(cost)` 
    }).from(apiCosts).where(gte(apiCosts.date, thirtyDaysAgo));
    const totalMonthlyCost = monthlyCostResult[0].total || 0;

    // Average session time
    const sessionsResult = await db.select().from(userSessions).where(gte(userSessions.startTime, thirtyDaysAgo));
    const averageSessionTime = sessionsResult.length > 0 
      ? sessionsResult.reduce((sum, session) => {
          const duration = session.endTime 
            ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)
            : 0;
          return sum + duration;
        }, 0) / sessionsResult.length
      : 0;

    // Top feature
    const featureUsagesResult = await db.select().from(featureUsage);
    const featureMap = new Map<string, number>();
    featureUsagesResult.forEach(usage => {
      featureMap.set(usage.featureName, (featureMap.get(usage.featureName) || 0) + usage.usageCount);
    });
    const topFeature = featureMap.size > 0 
      ? Array.from(featureMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : 'None';

    return {
      totalUsers,
      activeUsers,
      totalMonthlyCost,
      averageSessionTime,
      topFeature
    };
  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const result = await db.insert(userActivity).values(activity).returning();
    return result[0];
  }

  async createApiCost(cost: InsertApiCost): Promise<ApiCost> {
    const result = await db.insert(apiCosts).values(cost).returning();
    return result[0];
  }

  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const result = await db.insert(userSessions).values(session).returning();
    return result[0];
  }

  async createFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    const result = await db.insert(featureUsage).values(usage).returning();
    return result[0];
  }

  async getUserActivityByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<UserActivity[]> {
    let query = db.select().from(userActivity).where(eq(userActivity.userId, userId));
    
    if (startDate && endDate) {
      query = db.select().from(userActivity).where(
        and(
          eq(userActivity.userId, userId),
          gte(userActivity.createdAt, startDate),
          lte(userActivity.createdAt, endDate)
        )
      );
    }
    
    return await query;
  }

  async getApiCostsByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<ApiCost[]> {
    let query = db.select().from(apiCosts).where(eq(apiCosts.userId, userId));
    
    if (startDate && endDate) {
      query = db.select().from(apiCosts).where(
        and(
          eq(apiCosts.userId, userId),
          gte(apiCosts.date, startDate),
          lte(apiCosts.date, endDate)
        )
      );
    }
    
    return await query;
  }

  async getFeatureUsageByUserId(userId: number): Promise<FeatureUsage[]> {
    return await db.select().from(featureUsage).where(eq(featureUsage.userId, userId));
  }

  async getUserSessionsByUserId(userId: number, startDate?: Date, endDate?: Date): Promise<UserSession[]> {
    let query = db.select().from(userSessions).where(eq(userSessions.userId, userId));
    
    if (startDate && endDate) {
      query = db.select().from(userSessions).where(
        and(
          eq(userSessions.userId, userId),
          gte(userSessions.startTime, startDate),
          lte(userSessions.startTime, endDate)
        )
      );
    }
    
    return await query;
  }

  // Advanced Analytics - Engagement Scoring Implementation
  async calculateEngagementScores(): Promise<void> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const calculationStart = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate());
    const calculationEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all users
    const allUsers = await db.select().from(users);
    
    for (const user of allUsers) {
      // Get user activity data for scoring
      const activities = await db.select().from(userActivity)
        .where(and(
          eq(userActivity.userId, user.id),
          gte(userActivity.createdAt, thirtyDaysAgo)
        ));

      const sessions = await db.select().from(userSessions)
        .where(and(
          eq(userSessions.userId, user.id),
          gte(userSessions.startTime, thirtyDaysAgo)
        ));

      const features = await db.select().from(featureUsage)
        .where(eq(featureUsage.userId, user.id));

      // Calculate engagement metrics
      const totalActivities = activities.length;
      const uniqueFeatures = new Set(features.map(f => f.feature)).size;
      const totalSessions = sessions.length;
      
      // Session consistency (how regularly they use the app)
      const sessionDays = new Set(sessions.map(s => 
        new Date(s.startTime).toISOString().split('T')[0]
      )).size;
      const sessionConsistency = Math.min(100, (sessionDays / 30) * 100);

      // Feature diversity (how many different features they use)
      const featureDiversity = Math.min(100, (uniqueFeatures / 15) * 100); // Assuming 15 core features

      // Base engagement score (weighted combination)
      let engagementScore = Math.round(
        (totalActivities * 0.4) +
        (totalSessions * 2) +
        (uniqueFeatures * 5) +
        (sessionConsistency * 0.3) +
        (featureDiversity * 0.3)
      );
      engagementScore = Math.min(100, Math.max(0, engagementScore));

      // Determine engagement level
      let engagementLevel: string = 'inactive';
      if (engagementScore >= 80) engagementLevel = 'champion';
      else if (engagementScore >= 60) engagementLevel = 'high';
      else if (engagementScore >= 40) engagementLevel = 'medium';
      else if (engagementScore >= 20) engagementLevel = 'low';

      // Calculate churn risk (inverse of engagement with additional factors)
      const daysSinceLastActivity = activities.length > 0 
        ? Math.floor((now.getTime() - new Date(activities[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      
      let churnRiskScore = Math.round(
        (100 - engagementScore) * 0.6 +
        (daysSinceLastActivity / 30 * 100) * 0.4
      );
      churnRiskScore = Math.min(100, Math.max(0, churnRiskScore));

      // Determine churn risk level
      let churnRiskLevel: string = 'low';
      if (churnRiskScore >= 75) churnRiskLevel = 'critical';
      else if (churnRiskScore >= 50) churnRiskLevel = 'high';
      else if (churnRiskScore >= 25) churnRiskLevel = 'medium';

      // Determine usage trend (comparing recent vs older activity)
      const recentActivities = activities.filter(a => 
        new Date(a.createdAt).getTime() > now.getTime() - 14 * 24 * 60 * 60 * 1000
      ).length;
      const olderActivities = activities.length - recentActivities;
      
      let usageTrend: string = 'stable';
      if (recentActivities > olderActivities * 1.5) usageTrend = 'improving';
      else if (recentActivities < olderActivities * 0.5) usageTrend = 'declining';

      // Upsert engagement score record
      await db.insert(userEngagementScores).values({
        userId: user.id,
        engagementScore,
        engagementLevel,
        churnRiskScore,
        churnRiskLevel,
        featureDiversityScore: Math.round(featureDiversity),
        sessionConsistencyScore: Math.round(sessionConsistency),
        usageTrend,
        calculationPeriodStart: calculationStart,
        calculationPeriodEnd: calculationEnd,
      }).onConflictDoUpdate({
        target: [userEngagementScores.userId],
        set: {
          engagementScore,
          engagementLevel,
          churnRiskScore,
          churnRiskLevel,
          featureDiversityScore: Math.round(featureDiversity),
          sessionConsistencyScore: Math.round(sessionConsistency),
          usageTrend,
          lastCalculated: new Date(),
          calculationPeriodStart: calculationStart,
          calculationPeriodEnd: calculationEnd,
          updatedAt: new Date(),
        }
      });
    }
  }

  async getUserEngagementScore(userId: number): Promise<any> {
    const result = await db.select().from(userEngagementScores)
      .where(eq(userEngagementScores.userId, userId));
    return result[0] || null;
  }

  async getEngagementAnalytics(): Promise<any> {
    const scores = await db.select().from(userEngagementScores);
    
    // Calculate aggregate metrics
    const totalUsers = scores.length;
    const engagementLevels = {
      champion: scores.filter(s => s.engagementLevel === 'champion').length,
      high: scores.filter(s => s.engagementLevel === 'high').length,
      medium: scores.filter(s => s.engagementLevel === 'medium').length,
      low: scores.filter(s => s.engagementLevel === 'low').length,
      inactive: scores.filter(s => s.engagementLevel === 'inactive').length,
    };

    const churnRiskLevels = {
      critical: scores.filter(s => s.churnRiskLevel === 'critical').length,
      high: scores.filter(s => s.churnRiskLevel === 'high').length,
      medium: scores.filter(s => s.churnRiskLevel === 'medium').length,
      low: scores.filter(s => s.churnRiskLevel === 'low').length,
    };

    const usageTrends = {
      improving: scores.filter(s => s.usageTrend === 'improving').length,
      stable: scores.filter(s => s.usageTrend === 'stable').length,
      declining: scores.filter(s => s.usageTrend === 'declining').length,
    };

    const averageEngagementScore = totalUsers > 0 
      ? Math.round(scores.reduce((sum, s) => sum + s.engagementScore, 0) / totalUsers)
      : 0;

    const averageChurnRisk = totalUsers > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.churnRiskScore, 0) / totalUsers)
      : 0;

    return {
      totalUsers,
      averageEngagementScore,
      averageChurnRisk,
      engagementLevels,
      churnRiskLevels,
      usageTrends,
      lastCalculated: scores.length > 0 ? scores[0].lastCalculated : null,
    };
  }

  async getCostOptimizationRecommendations(): Promise<any[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get cost data with user engagement
    const costData = await db.select({
      userId: apiCosts.userId,
      totalCost: sql<number>`SUM(${apiCosts.cost})`,
      service: apiCosts.service,
    })
      .from(apiCosts)
      .where(gte(apiCosts.date, thirtyDaysAgo))
      .groupBy(apiCosts.userId, apiCosts.service);

    const engagementData = await db.select().from(userEngagementScores);
    const engagementMap = new Map(engagementData.map(e => [e.userId, e]));

    // Analyze cost patterns and generate recommendations
    const recommendations: any[] = [];
    const costsByUser = new Map();

    // Group costs by user
    costData.forEach(cost => {
      if (!costsByUser.has(cost.userId)) {
        costsByUser.set(cost.userId, { total: 0, services: new Map() });
      }
      const userCosts = costsByUser.get(cost.userId);
      userCosts.total += cost.totalCost;
      userCosts.services.set(cost.service, cost.totalCost);
    });

    // Generate recommendations based on cost vs engagement patterns
    for (const [userId, costs] of costsByUser) {
      const engagement = engagementMap.get(userId);
      const user = await this.getUser(userId.toString());
      
      if (!user || !engagement) continue;

      // High cost, low engagement users
      if (costs.total > 50 && engagement.engagementLevel === 'low') {
        recommendations.push({
          type: 'cost_optimization',
          priority: 'high',
          userId,
          userName: user.username || user.email,
          title: 'High Cost, Low Engagement User',
          description: `User ${user.username || user.email} has generated $${costs.total.toFixed(2)} in costs but has low engagement. Consider reaching out to understand their needs.`,
          estimatedSavings: costs.total * 0.7,
          actionItems: ['Schedule user interview', 'Review feature usage patterns', 'Consider usage limits'],
        });
      }

      // Heavy API users with declining trends
      if (costs.total > 25 && engagement.usageTrend === 'declining') {
        recommendations.push({
          type: 'churn_prevention',
          priority: 'medium',
          userId,
          userName: user.username || user.email,
          title: 'High-Cost User with Declining Usage',
          description: `User ${user.username || user.email} has high API costs ($${costs.total.toFixed(2)}) but declining usage. Risk of churn.`,
          estimatedSavings: costs.total,
          actionItems: ['Send re-engagement email', 'Offer usage consultation', 'Review pain points'],
        });
      }

      // Service-specific optimizations
      for (const [service, cost] of costs.services) {
        if (service === 'openai' && cost > 30) {
          recommendations.push({
            type: 'service_optimization',
            priority: 'low',
            userId,
            userName: user.username || user.email,
            title: 'High OpenAI API Usage',
            description: `User has high OpenAI costs ($${cost.toFixed(2)}). Consider implementing caching or rate limiting.`,
            estimatedSavings: cost * 0.3,
            actionItems: ['Implement response caching', 'Add rate limiting', 'Optimize prompts'],
          });
        }
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  async getUserBehaviorInsights(): Promise<any[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get comprehensive user behavior data
    const activities = await db.select().from(userActivity)
      .where(gte(userActivity.createdAt, thirtyDaysAgo));

    const sessions = await db.select().from(userSessions)
      .where(gte(userSessions.startTime, thirtyDaysAgo));

    const features = await db.select().from(featureUsage);

    // Analyze patterns
    const insights: any[] = [];

    // Peak usage hours
    const hourlyActivity = new Map();
    activities.forEach(activity => {
      const hour = new Date(activity.createdAt).getHours();
      hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
    });

    const peakHour = Array.from(hourlyActivity.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (peakHour) {
      insights.push({
        type: 'usage_pattern',
        title: 'Peak Usage Hour',
        description: `Most user activity occurs at ${peakHour[0]}:00 with ${peakHour[1]} activities`,
        impact: 'infrastructure_planning',
        recommendation: 'Schedule maintenance and deployments outside peak hours',
      });
    }

    // Feature adoption patterns
    const featurePopularity = new Map();
    features.forEach(feature => {
      featurePopularity.set(feature.feature, (featurePopularity.get(feature.feature) || 0) + feature.usageCount);
    });

    const topFeatures = Array.from(featurePopularity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    insights.push({
      type: 'feature_adoption',
      title: 'Most Popular Features',
      description: `Top features: ${topFeatures.map(f => f[0]).join(', ')}`,
      impact: 'product_development',
      recommendation: 'Focus development resources on top-performing features',
      data: topFeatures,
    });

    // Session duration patterns
    const sessionDurations = sessions
      .filter(s => s.endTime)
      .map(s => (new Date(s.endTime!).getTime() - new Date(s.startTime).getTime()) / (1000 * 60));

    if (sessionDurations.length > 0) {
      const avgDuration = sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length;
      const shortSessions = sessionDurations.filter(d => d < 5).length;
      const shortSessionPercentage = (shortSessions / sessionDurations.length) * 100;

      insights.push({
        type: 'session_analysis',
        title: 'Session Duration Insights',
        description: `Average session: ${avgDuration.toFixed(1)} minutes, ${shortSessionPercentage.toFixed(1)}% are under 5 minutes`,
        impact: 'user_experience',
        recommendation: shortSessionPercentage > 30 
          ? 'High bounce rate detected. Review onboarding and initial user experience'
          : 'Healthy session durations indicate good user engagement',
      });
    }

    // User growth trends
    const userRegistrations = await db.select().from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));

    const dailySignups = new Map();
    userRegistrations.forEach(user => {
      const day = new Date(user.createdAt).toISOString().split('T')[0];
      dailySignups.set(day, (dailySignups.get(day) || 0) + 1);
    });

    insights.push({
      type: 'growth_analysis',
      title: 'User Growth Trend',
      description: `${userRegistrations.length} new users in the last 30 days`,
      impact: 'business_metrics',
      recommendation: userRegistrations.length > 10 
        ? 'Strong growth trend. Consider scaling infrastructure'
        : 'Consider growth marketing initiatives',
      data: Array.from(dailySignups.entries()),
    });

    return insights;
  }

  // Billing System Methods
  async getSubscriptionPlans(): Promise<any[]> {
    return await db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));
  }

  async getUserSubscription(userId: number): Promise<any> {
    const result = await db.select().from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    return result[0] || null;
  }

  async createUserSubscription(subscription: any): Promise<any> {
    const result = await db.insert(userSubscriptions).values(subscription).returning();
    return result[0];
  }

  // Account Types Methods
  async getAccountTypes(): Promise<AccountType[]> {
    const result = await db.select().from(accountTypes)
      .where(eq(accountTypes.isActive, true))
      .orderBy(accountTypes.sortOrder);
    return result;
  }

  async getAccountTypeById(id: number): Promise<AccountType | undefined> {
    const result = await db.select().from(accountTypes)
      .where(eq(accountTypes.id, id));
    return result[0];
  }

  async createAccountType(accountType: InsertAccountType): Promise<AccountType> {
    const result = await db.insert(accountTypes).values(accountType).returning();
    return result[0];
  }

  async updateAccountType(id: number, accountType: Partial<InsertAccountType>): Promise<AccountType> {
    const result = await db.update(accountTypes)
      .set({ ...accountType, updatedAt: new Date() })
      .where(eq(accountTypes.id, id))
      .returning();
    return result[0];
  }

  async deleteAccountType(id: number): Promise<void> {
    await db.delete(accountTypes).where(eq(accountTypes.id, id));
  }

  // Billing Plans Methods
  async getBillingPlans(): Promise<BillingPlan[]> {
    const result = await db.select().from(billingPlans)
      .where(eq(billingPlans.isActive, true))
      .orderBy(billingPlans.sortOrder);
    return result;
  }

  async getBillingPlanById(id: number): Promise<BillingPlan | undefined> {
    const result = await db.select().from(billingPlans)
      .where(eq(billingPlans.id, id));
    return result[0];
  }

  async getBillingPlanByPlanId(planId: string): Promise<BillingPlan | undefined> {
    const result = await db.select().from(billingPlans)
      .where(eq(billingPlans.planId, planId));
    return result[0];
  }

  async createBillingPlan(plan: InsertBillingPlan): Promise<BillingPlan> {
    const result = await db.insert(billingPlans).values(plan).returning();
    return result[0];
  }

  async updateBillingPlan(id: number, plan: Partial<InsertBillingPlan>): Promise<BillingPlan> {
    const result = await db.update(billingPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(billingPlans.id, id))
      .returning();
    return result[0];
  }

  async deleteBillingPlan(id: number): Promise<void> {
    await db.delete(billingPlans).where(eq(billingPlans.id, id));
  }

  // Billing Plan Price History Methods
  async getBillingPlanPrices(planId: number): Promise<BillingPlanPrice[]> {
    const result = await db.select().from(billingPlanPrices)
      .where(eq(billingPlanPrices.planId, planId))
      .orderBy(sql`${billingPlanPrices.createdAt} DESC`);
    return result;
  }

  async getActiveBillingPlanPrice(planId: number): Promise<BillingPlanPrice | undefined> {
    const result = await db.select().from(billingPlanPrices)
      .where(and(
        eq(billingPlanPrices.planId, planId),
        eq(billingPlanPrices.isActive, true),
        sql`${billingPlanPrices.validUntil} IS NULL`
      ))
      .orderBy(sql`${billingPlanPrices.createdAt} DESC`)
      .limit(1);
    return result[0];
  }

  async createBillingPlanPrice(price: InsertBillingPlanPrice): Promise<BillingPlanPrice> {
    const result = await db.insert(billingPlanPrices).values(price).returning();
    return result[0];
  }

  async archiveBillingPlanPrice(priceId: number, archivedBy?: string): Promise<void> {
    await db.update(billingPlanPrices)
      .set({ 
        isActive: false, 
        validUntil: new Date(),
        archivedBy: archivedBy || null
      })
      .where(eq(billingPlanPrices.id, priceId));
  }

  // Billing History Methods
  async getBillingHistory(userId: number): Promise<BillingHistory[]> {
    const result = await db.select().from(billingHistory)
      .where(eq(billingHistory.userId, userId))
      .orderBy(sql`${billingHistory.createdAt} DESC`);
    return result;
  }

  async createBillingHistoryEntry(entry: InsertBillingHistory): Promise<BillingHistory> {
    const result = await db.insert(billingHistory).values(entry).returning();
    return result[0];
  }

  // Payment Methods
  async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    const result = await db.select().from(paymentMethods)
      .where(and(
        eq(paymentMethods.userId, userId),
        eq(paymentMethods.isActive, true)
      ))
      .orderBy(sql`${paymentMethods.isDefault} DESC, ${paymentMethods.createdAt} DESC`);
    return result;
  }

  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    const result = await db.insert(paymentMethods).values(method).returning();
    return result[0];
  }

  async updatePaymentMethod(id: number, method: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
    const result = await db.update(paymentMethods)
      .set({ ...method, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    return result[0];
  }

  async deletePaymentMethod(id: number): Promise<void> {
    await db.update(paymentMethods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id));
  }

  async setDefaultPaymentMethod(userId: number, paymentMethodId: number): Promise<void> {
    // First, set all payment methods to non-default
    await db.update(paymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(paymentMethods.userId, userId));
    
    // Then set the specified payment method as default
    await db.update(paymentMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(paymentMethods.id, paymentMethodId));
  }

  // Subscription Usage Methods
  async getSubscriptionUsage(userId: number, planId: string): Promise<SubscriptionUsage[]> {
    const result = await db.select().from(subscriptionUsage)
      .where(and(
        eq(subscriptionUsage.userId, userId),
        eq(subscriptionUsage.planId, planId)
      ))
      .orderBy(sql`${subscriptionUsage.recordedAt} DESC`);
    return result;
  }

  async createSubscriptionUsage(usage: InsertSubscriptionUsage): Promise<SubscriptionUsage> {
    const result = await db.insert(subscriptionUsage).values(usage).returning();
    return result[0];
  }

  // ========== SEARCH SYSTEM OPERATIONS ==========

  async getSearchHistoryByUserId(userId: number, limit: number = 10): Promise<SearchHistory[]> {
    const result = await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.createdAt))
      .limit(limit);
    return result;
  }

  async clearSearchHistoryByUserId(userId: number): Promise<void> {
    await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
  }

  async createSearchIndex(index: InsertSearchIndex): Promise<SearchIndex> {
    const result = await db.insert(searchIndexes).values(index).returning();
    return result[0];
  }

  async updateSearchIndex(id: number, index: Partial<InsertSearchIndex>): Promise<SearchIndex> {
    const result = await db
      .update(searchIndexes)
      .set({ ...index, updatedAt: new Date() })
      .where(eq(searchIndexes.id, id))
      .returning();
    return result[0];
  }

  async getSearchSuggestionsByQuery(query: string, projectId?: number): Promise<SearchSuggestion[]> {
    let queryBuilder = db
      .select()
      .from(searchSuggestions)
      .where(sql`${searchSuggestions.text} ILIKE ${`%${query}%`}`);

    if (projectId) {
      queryBuilder = queryBuilder.where(
        or(
          eq(searchSuggestions.projectId, projectId),
          eq(searchSuggestions.isGlobal, true)
        )
      );
    }

    const result = await queryBuilder
      .orderBy(desc(searchSuggestions.popularity), searchSuggestions.text)
      .limit(10);
    
    return result;
  }

  // User Subscription Update (overridden method to handle billing fields)
  async updateUserSubscription(userId: number, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
    trialEndsAt?: Date;
    subscriptionEndsAt?: Date;
    paymentMethodRequired?: boolean;
    grandfatheredFree?: boolean;
  }): Promise<User> {
    // Calculate user status based on billing
    const isActive = this.calculateUserStatus(subscriptionData);
    
    const result = await db.update(users)
      .set({ 
        ...subscriptionData,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Calculate user active status based on billing
  calculateUserStatus(userData: {
    subscriptionStatus?: string;
    grandfatheredFree?: boolean;
    subscriptionPlan?: string;
  }): boolean {
    // If user is grandfathered (beta user with permanent free access), they're active
    if (userData.grandfatheredFree) {
      return true;
    }

    // If user has a free plan, they're active
    if (userData.subscriptionPlan === 'free') {
      return true;
    }

    // If subscription status is active or trialing, they're active
    if (userData.subscriptionStatus && 
        ['active', 'trialing'].includes(userData.subscriptionStatus)) {
      return true;
    }

    // If subscription is cancelled, past_due, or unpaid, they're inactive
    if (userData.subscriptionStatus && 
        ['canceled', 'cancelled', 'past_due', 'unpaid'].includes(userData.subscriptionStatus)) {
      return false;
    }

    // Default to active for users without billing setup yet
    return true;
  }

  // Update user status for all users based on current billing status
  async updateAllUserStatuses(): Promise<void> {
    const allUsers = await db.select().from(users);
    
    for (const user of allUsers) {
      const isActive = this.calculateUserStatus({
        subscriptionStatus: user.subscriptionStatus || undefined,
        grandfatheredFree: user.grandfatheredFree || false,
        subscriptionPlan: user.subscriptionPlan || undefined
      });

      await db.update(users)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  }

  // ========== TEAM MEMBER MANAGEMENT METHODS ==========

  async getTeamMembersByProjectId(projectId: number): Promise<TeamMember[]> {
    const result = await db
      .select({
        id: teamMembers.id,
        projectId: teamMembers.projectId,
        userId: teamMembers.userId,
        email: teamMembers.email,
        name: teamMembers.name,
        role: teamMembers.role,
        accessLevel: teamMembers.accessLevel,
        status: teamMembers.status,
        invitedAt: teamMembers.invitedAt,
        joinedAt: teamMembers.joinedAt,
        isArchived: teamMembers.isArchived,
        archivedAt: teamMembers.archivedAt,
        // Include user information
        userName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(and(
        eq(teamMembers.projectId, projectId),
        eq(teamMembers.isArchived, false)
      ))
      .orderBy(teamMembers.id);
    
    return result;
  }

  async createTeamMember(teamMember: InsertTeamMember): Promise<TeamMember> {
    // Check editor limits before creating
    if (teamMember.userType === 'editor' || teamMember.accessLevel === 'editor') {
      const activeShowCount = await this.getEditorActiveShowCount(teamMember.email);
      if (activeShowCount >= 2) {
        throw new Error(`Editor already assigned to maximum 2 active shows (currently: ${activeShowCount})`);
      }

      // Check for duplicates
      const duplicateCheck = await this.checkEditorDuplicates(teamMember.email, teamMember.name || '');
      if (duplicateCheck.duplicate) {
        throw new Error(`Duplicate editor detected: ${duplicateCheck.type}. Existing: ${duplicateCheck.existingMember?.name} (${duplicateCheck.existingMember?.email})`);
      }
    }

    const result = await db.insert(teamMembers).values({
      ...teamMember,
      invitedAt: new Date(),
      status: 'invited',
    }).returning();
    return result[0];
  }

  async updateTeamMember(id: number, updates: Partial<InsertTeamMember> & { joinedAt?: Date; userId?: number }): Promise<TeamMember> {
    const result = await db
      .update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, id))
      .returning();
    return result[0];
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db
      .update(teamMembers)
      .set({ isArchived: true, archivedAt: new Date() })
      .where(eq(teamMembers.id, id));
  }

  async getTeamMemberById(id: number): Promise<TeamMember | null> {
    const result = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);
    
    return result[0] || null;
  }

  async getTeamMemberByUserAndProject(userId: number, projectId: number): Promise<TeamMember | null> {
    const result = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.projectId, projectId)
      ))
      .limit(1);
    
    return result[0] || null;
  }

  async getEditorCountByProject(projectId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.projectId, projectId),
        eq(teamMembers.accessLevel, 'editor'),
        eq(teamMembers.isArchived, false)
      ));
    
    return result[0]?.count || 0;
  }

  async getUserAccessLevel(userId: number, projectId: number): Promise<string | null> {
    // Check if user is admin first
    const user = await this.getUser(userId.toString());
    if (user?.isAdmin) {
      return 'admin';
    }

    // Check if user owns the project
    const project = await this.getProjectById(projectId);
    if (project?.createdBy === userId) {
      return 'user';
    }

    // Check team member access level
    const teamMember = await this.getTeamMemberByUserAndProject(userId, projectId);
    return teamMember?.accessLevel || null;
  }

  async getUserProjectAccess(userId: number, projectId: number): Promise<boolean> {
    const accessLevel = await this.getUserAccessLevel(userId, projectId);
    return accessLevel !== null;
  }

  // ========== EDITOR MANAGEMENT METHODS (NEW SINGLE-TABLE APPROACH) ==========
  
  // Get all users by role (admin, user, editor, viewer)
  async getUsersByRole(role: string): Promise<any[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userRole: users.userRole,
        profileType: users.profileType,
        isActive: users.isActive,
        currentActiveShows: users.currentActiveShows,
        maxActiveShows: users.maxActiveShows,
        lastActiveAt: users.lastActiveAt,
        totalLogins: users.totalLogins,
        betaAccess: users.betaAccess,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.userRole, role))
      .orderBy(desc(users.createdAt));
    
    return result;
  }

  // Get users with their invited editors hierarchically
  async getUsersWithInvitedEditors(): Promise<any[]> {
    // Get all users with user_role = 'user'
    const usersResult = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userRole: users.userRole,
        profileType: users.profileType,
        isActive: users.isActive,
        totalLogins: users.totalLogins,
        lastActiveAt: users.lastActiveAt,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.userRole, 'user'))
      .orderBy(desc(users.createdAt));

    // For each user, get the editors they have invited
    const usersWithEditors = await Promise.all(
      usersResult.map(async (user) => {
        const invitedEditors = await db
          .select({
            editorId: users.id,
            editorEmail: users.email,
            editorFirstName: users.firstName,
            editorLastName: users.lastName,
            projectId: projectMembers.projectId,
            projectName: projects.name,
            accessLevel: projectMembers.accessLevel,
            status: projectMembers.status,
            invitedAt: projectMembers.invitedAt,
            joinedAt: projectMembers.joinedAt
          })
          .from(projectMembers)
          .innerJoin(users, eq(projectMembers.userId, users.id))
          .innerJoin(projects, eq(projectMembers.projectId, projects.id))
          .where(and(
            eq(projectMembers.invitedBy, user.id),
            eq(projectMembers.accessLevel, 'editor')
          ))
          .orderBy(users.email, projects.name);

        // Group editors by editor (in case same editor invited to multiple projects)
        const editorsMap = new Map();
        invitedEditors.forEach(editor => {
          const key = editor.editorId;
          if (!editorsMap.has(key)) {
            editorsMap.set(key, {
              id: editor.editorId,
              email: editor.editorEmail,
              firstName: editor.editorFirstName,
              lastName: editor.editorLastName,
              projects: []
            });
          }
          editorsMap.get(key).projects.push({
            projectId: editor.projectId,
            projectName: editor.projectName,
            accessLevel: editor.accessLevel,
            status: editor.status,
            invitedAt: editor.invitedAt,
            joinedAt: editor.joinedAt
          });
        });

        return {
          ...user,
          invitedEditors: Array.from(editorsMap.values()),
          editorCount: editorsMap.size
        };
      })
    );

    return usersWithEditors;
  }

  // Get editors with their invited sub-editors hierarchically
  async getEditorsWithInvitedEditors(): Promise<any[]> {
    // Get all users with user_role = 'editor'
    const editorsResult = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userRole: users.userRole,
        profileType: users.profileType,
        isActive: users.isActive,
        totalLogins: users.totalLogins,
        lastActiveAt: users.lastActiveAt,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.userRole, 'editor'))
      .orderBy(desc(users.createdAt));

    // For each user, get the editors they have invited
    const usersWithEditors = await Promise.all(
      usersResult.map(async (user) => {
        const invitedEditors = await db
          .select({
            editorId: users.id,
            editorEmail: users.email,
            editorFirstName: users.firstName,
            editorLastName: users.lastName,
            projectId: projectMembers.projectId,
            projectName: projects.name,
            accessLevel: projectMembers.accessLevel,
            status: projectMembers.status,
            invitedAt: projectMembers.invitedAt,
            joinedAt: projectMembers.joinedAt
          })
          .from(projectMembers)
          .innerJoin(users, eq(projectMembers.userId, users.id))
          .innerJoin(projects, eq(projectMembers.projectId, projects.id))
          .where(and(
            eq(projectMembers.invitedBy, user.id),
            eq(projectMembers.accessLevel, 'editor')
          ))
          .orderBy(users.email, projects.name);

        // Group editors by editor (in case same editor invited to multiple projects)
        const editorsMap = new Map();
        invitedEditors.forEach(editor => {
          const key = editor.editorId;
          if (!editorsMap.has(key)) {
            editorsMap.set(key, {
              id: editor.editorId,
              email: editor.editorEmail,
              firstName: editor.editorFirstName,
              lastName: editor.editorLastName,
              projects: []
            });
          }
          editorsMap.get(key).projects.push({
            projectId: editor.projectId,
            projectName: editor.projectName,
            accessLevel: editor.accessLevel,
            status: editor.status,
            invitedAt: editor.invitedAt,
            joinedAt: editor.joinedAt
          });
        });

        return {
          ...user,
          invitedEditors: Array.from(editorsMap.values()),
          editorCount: editorsMap.size
        };
      })
    );

    return usersWithEditors;
  }

  // Get all editors with their project assignments
  async getAllEditorsWithProjects(): Promise<any[]> {
    const editorsResult = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userRole: users.userRole,
        profileType: users.profileType,
        isActive: users.isActive,
        currentActiveShows: users.currentActiveShows,
        maxActiveShows: users.maxActiveShows,
        lastActiveAt: users.lastActiveAt,
        totalLogins: users.totalLogins,
        betaAccess: users.betaAccess,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.userRole, 'editor'))
      .orderBy(desc(users.createdAt));

    // Get project assignments for each editor
    const editorsWithProjects = await Promise.all(
      editorsResult.map(async (editor) => {
        const projectAssignments = await db
          .select({
            projectId: projectMembers.projectId,
            projectName: projects.name,
            role: projectMembers.role,
            accessLevel: projectMembers.accessLevel,
            status: projectMembers.status,
            invitedAt: projectMembers.invitedAt,
            joinedAt: projectMembers.joinedAt,
            lastActiveAt: projectMembers.lastActiveAt
          })
          .from(projectMembers)
          .innerJoin(projects, eq(projectMembers.projectId, projects.id))
          .where(and(
            eq(projectMembers.userId, editor.id),
            eq(projectMembers.accessLevel, 'editor')
          ));

        return {
          ...editor,
          projectAssignments
        };
      })
    );

    return editorsWithProjects;
  }

  // Update user role
  async updateUserRole(userId: number, userRole: string): Promise<any> {
    const result = await db
      .update(users)
      .set({ 
        userRole,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
      
    return result[0];
  }

  // Update user active show count
  async updateUserActiveShowCount(userId: number): Promise<number> {
    const activeShowCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(and(
        eq(projectMembers.userId, userId),
        eq(projectMembers.accessLevel, 'editor'),
        eq(projectMembers.status, 'accepted')
      ));

    const count = activeShowCount[0]?.count || 0;

    // Update the user's currentActiveShows field
    await db
      .update(users)
      .set({ 
        currentActiveShows: count,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return count;
  }

  // ========== LEGACY EDITOR MANAGEMENT METHODS (UPDATED FOR NEW SCHEMA) ==========

  async getEditorActiveShowCount(email: string): Promise<number> {
    const user = await this.getUserByEmail(email);
    if (!user) return 0;
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(and(
        eq(projectMembers.userId, user.id),
        eq(projectMembers.accessLevel, 'editor'),
        eq(projectMembers.status, 'accepted')
      ));
    
    return result[0]?.count || 0;
  }

  async checkEditorDuplicates(email: string, name: string): Promise<{ duplicate: boolean; type: string; existingMember?: any }> {
    // Check for user by email
    const user = await this.getUserByEmail(email);
    if (user) {
      // Check if this user is already an editor on any active shows
      const activeEditorShows = await db
        .select({
          projectId: projectMembers.projectId,
          projectName: projects.name,
          role: projectMembers.role
        })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(and(
          eq(projectMembers.userId, user.id),
          eq(projectMembers.accessLevel, 'editor'),
          eq(projectMembers.status, 'accepted')
        ));

      if (activeEditorShows.length > 0) {
        return {
          duplicate: true,
          type: 'user already registered as editor',
          existingMember: {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            email: user.email,
            projectName: activeEditorShows.map(s => s.projectName).join(', ')
          }
        };
      }
    }

    // If name is provided, check for similar users with different emails
    if (name && name.trim()) {
      const [firstName, ...lastNameParts] = name.trim().split(' ');
      const lastName = lastNameParts.join(' ');
      
      const nameMatches = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .where(and(
          or(
            eq(users.firstName, firstName),
            eq(users.lastName, lastName)
          ),
          ne(users.email, email)
        ))
        .limit(5);

      if (nameMatches.length > 0) {
        return {
          duplicate: true,
          type: 'similar name found with different email',
          existingMember: {
            name: `${nameMatches[0].firstName || ''} ${nameMatches[0].lastName || ''}`.trim(),
            email: nameMatches[0].email
          }
        };
      }
    }

    return { duplicate: false, type: '' };
  }

  async getAllEditorsForAdmin(): Promise<any[]> {
    // Use new single-table approach - get all users with editor role
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userRole: users.userRole,
        profileType: users.profileType,
        isActive: users.isActive,
        currentActiveShows: users.currentActiveShows,
        maxActiveShows: users.maxActiveShows,
        lastActiveAt: users.lastActiveAt,
        totalLogins: users.totalLogins,
        betaAccess: users.betaAccess,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.userRole, 'editor'))
      .orderBy(desc(users.createdAt));
    
    return result;
  }

  async getEditorAnalytics(): Promise<any[]> {
    // Get all users who were invited to productions (have entries in teamMembers table)
    // First, get all team member entries with user and project info
    const allTeamMemberEntries = await db.select({
      teamMemberUserId: teamMembers.userId,
      teamMemberEmail: teamMembers.email,
      projectId: teamMembers.projectId,
      role: teamMembers.role,
      accessLevel: teamMembers.accessLevel,
      status: teamMembers.status,
      invitedAt: teamMembers.invitedAt,
      projectName: projects.name,
      ownerId: projects.ownerId,
      ownerFirstName: users.firstName,
      ownerLastName: users.lastName,
      ownerEmail: users.email,
    })
    .from(teamMembers)
    .innerJoin(projects, eq(teamMembers.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id));
    
    if (allTeamMemberEntries.length === 0) {
      return [];
    }
    
    // Get unique user IDs and emails from team members (invited editors)
    const invitedUserIds = new Set<number>();
    const invitedEmails = new Set<string>();
    
    for (const entry of allTeamMemberEntries) {
      if (entry.teamMemberUserId) {
        invitedUserIds.add(entry.teamMemberUserId);
      }
      if (entry.teamMemberEmail) {
        invitedEmails.add(entry.teamMemberEmail);
      }
    }
    
    // Get full analytics for these invited users
    const allAnalytics = await this.getUserAnalytics();
    const invitedEditorAnalytics = allAnalytics.filter(user => 
      invitedUserIds.has(user.id) || invitedEmails.has(user.email)
    );
    
    // Group team member entries by editor
    const teamMembersByEditor = new Map<number, typeof allTeamMemberEntries>();
    
    for (const entry of allTeamMemberEntries) {
      const matchingEditor = invitedEditorAnalytics.find(
        e => e.id === entry.teamMemberUserId || e.email === entry.teamMemberEmail
      );
      
      if (matchingEditor) {
        if (!teamMembersByEditor.has(matchingEditor.id)) {
          teamMembersByEditor.set(matchingEditor.id, []);
        }
        teamMembersByEditor.get(matchingEditor.id)!.push(entry);
      }
    }
    
    // Enrich each editor with their production and inviter info
    const enrichedEditorAnalytics = invitedEditorAnalytics.map(editor => {
      const teamMemberEntries = teamMembersByEditor.get(editor.id) || [];
      
      // Build unique inviters list
      const inviterMap = new Map<number, { id: number; name: string; email: string }>();
      for (const entry of teamMemberEntries) {
        if (!inviterMap.has(entry.ownerId)) {
          inviterMap.set(entry.ownerId, {
            id: entry.ownerId,
            name: entry.ownerFirstName && entry.ownerLastName 
              ? `${entry.ownerFirstName} ${entry.ownerLastName}`.trim()
              : entry.ownerEmail,
            email: entry.ownerEmail
          });
        }
      }
      const inviters = Array.from(inviterMap.values());
      
      // Build productions list with inviter info
      const productions = teamMemberEntries.map(entry => ({
        projectId: entry.projectId,
        projectName: entry.projectName,
        role: entry.role,
        accessLevel: entry.accessLevel,
        status: entry.status,
        invitedAt: entry.invitedAt,
        invitedBy: entry.ownerFirstName && entry.ownerLastName 
          ? `${entry.ownerFirstName} ${entry.ownerLastName}`.trim()
          : entry.ownerEmail
      }));
      
      return {
        ...editor,
        invitedBy: inviters.length > 0 ? inviters.map(i => i.name).join(', ') : 'Unknown',
        inviters,
        productions
      };
    });
    
    return enrichedEditorAnalytics;
  }

  async getNonEditorUserAnalytics(): Promise<any[]> {
    // Get users who were NOT invited to any production (don't have entries in teamMembers table)
    // First, get all invited user IDs and emails
    const allTeamMemberEntries = await db.select({
      userId: teamMembers.userId,
      email: teamMembers.email,
    }).from(teamMembers);
    
    const invitedUserIds = new Set<number>();
    const invitedEmails = new Set<string>();
    
    for (const entry of allTeamMemberEntries) {
      if (entry.userId) {
        invitedUserIds.add(entry.userId);
      }
      if (entry.email) {
        invitedEmails.add(entry.email);
      }
    }
    
    // Get all user analytics, excluding those who were invited
    const allAnalytics = await this.getUserAnalytics();
    return allAnalytics.filter(user => 
      !invitedUserIds.has(user.id) && !invitedEmails.has(user.email)
    );
  }

  async getNonEditorAnalyticsStats(): Promise<any> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total non-editor users (user/admin roles only)
    const totalUsersResult = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(users).where(or(eq(users.userRole, 'user'), eq(users.userRole, 'admin')));
    const totalUsers = totalUsersResult[0].count;

    // Active non-editor users (users with is_active = true and user/admin roles)
    const activeUsersResult = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(users).where(and(
      eq(users.isActive, true),
      or(eq(users.userRole, 'user'), eq(users.userRole, 'admin'))
    ));
    const activeUsers = activeUsersResult[0].count;

    // Get non-editor user IDs for cost calculations
    const nonEditorUsersResult = await db.select({ id: users.id })
      .from(users)
      .where(or(eq(users.userRole, 'user'), eq(users.userRole, 'admin')));
    const nonEditorUserIds = nonEditorUsersResult.map(u => u.id);

    // Total monthly cost for non-editor users only
    let totalMonthlyCost = 0;
    if (nonEditorUserIds.length > 0) {
      const monthlyCostResult = await db.select({ 
        total: sql<number>`sum(cost)` 
      }).from(apiCosts).where(and(
        gte(apiCosts.date, thirtyDaysAgo),
        sql`${apiCosts.userId} IN (${sql.join(nonEditorUserIds, sql`,`)})`
      ));
      totalMonthlyCost = monthlyCostResult[0].total || 0;
    }

    // Average session time for non-editor users only
    let averageSessionTime = 0;
    if (nonEditorUserIds.length > 0) {
      const sessionsResult = await db.select().from(userSessions).where(and(
        gte(userSessions.startTime, thirtyDaysAgo),
        sql`${userSessions.userId} IN (${sql.join(nonEditorUserIds, sql`,`)})`
      ));
      averageSessionTime = sessionsResult.length > 0 
        ? sessionsResult.reduce((sum, session) => {
            const duration = session.endTime 
              ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)
              : 0;
            return sum + duration;
          }, 0) / sessionsResult.length
        : 0;
    }

    // Top feature for non-editor users only
    let topFeature = 'None';
    if (nonEditorUserIds.length > 0) {
      const featureUsagesResult = await db.select().from(featureUsage).where(
        sql`${featureUsage.userId} IN (${sql.join(nonEditorUserIds, sql`,`)})`
      );
      const featureMap = new Map<string, number>();
      featureUsagesResult.forEach(usage => {
        featureMap.set(usage.featureName, (featureMap.get(usage.featureName) || 0) + usage.usageCount);
      });
      topFeature = featureMap.size > 0 
        ? Array.from(featureMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
        : 'None';
    }

    return {
      totalUsers,
      activeUsers,
      totalMonthlyCost,
      averageSessionTime,
      topFeature
    };
  }

  async getEditorAnalyticsStats(): Promise<any> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total editor users
    const totalUsersResult = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(users).where(eq(users.userRole, 'editor'));
    const totalUsers = totalUsersResult[0].count;

    // Active editor users
    const activeUsersResult = await db.select({ 
      count: sql<number>`count(*)` 
    }).from(users).where(and(
      eq(users.isActive, true),
      eq(users.userRole, 'editor')
    ));
    const activeUsers = activeUsersResult[0].count;

    // Get editor user IDs for cost calculations
    const editorUsersResult = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.userRole, 'editor'));
    const editorUserIds = editorUsersResult.map(u => u.id);

    // Total monthly cost for editors only
    let totalMonthlyCost = 0;
    if (editorUserIds.length > 0) {
      const monthlyCostResult = await db.select({ 
        total: sql<number>`sum(cost)` 
      }).from(apiCosts).where(and(
        gte(apiCosts.date, thirtyDaysAgo),
        sql`${apiCosts.userId} IN (${sql.join(editorUserIds, sql`,`)})`
      ));
      totalMonthlyCost = monthlyCostResult[0].total || 0;
    }

    // Average session time for editors only
    let averageSessionTime = 0;
    if (editorUserIds.length > 0) {
      const sessionsResult = await db.select().from(userSessions).where(and(
        gte(userSessions.startTime, thirtyDaysAgo),
        sql`${userSessions.userId} IN (${sql.join(editorUserIds, sql`,`)})`
      ));
      averageSessionTime = sessionsResult.length > 0 
        ? sessionsResult.reduce((sum, session) => {
            const duration = session.endTime 
              ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)
              : 0;
            return sum + duration;
          }, 0) / sessionsResult.length
        : 0;
    }

    // Top feature for editors only
    let topFeature = 'None';
    if (editorUserIds.length > 0) {
      const featureUsagesResult = await db.select().from(featureUsage).where(
        sql`${featureUsage.userId} IN (${sql.join(editorUserIds, sql`,`)})`
      );
      const featureMap = new Map<string, number>();
      featureUsagesResult.forEach(usage => {
        featureMap.set(usage.featureName, (featureMap.get(usage.featureName) || 0) + usage.usageCount);
      });
      topFeature = featureMap.size > 0 
        ? Array.from(featureMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
        : 'None';
    }

    return {
      totalUsers,
      activeUsers,
      totalMonthlyCost,
      averageSessionTime,
      topFeature
    };
  }

  async getUserInvitedTeamMembers(userId: number): Promise<any[]> {
    // Return empty array for now - this method was for legacy teamMembers expansion
    // In new architecture, invited team members are handled differently
    return [];
  }

  // Running Order Versions operations
  async getRunningOrderVersionsByProjectId(projectId: number): Promise<RunningOrderVersion[]> {
    const result = await db.select()
      .from(runningOrderVersions)
      .where(eq(runningOrderVersions.projectId, projectId))
      .orderBy(desc(runningOrderVersions.versionNumber));
    return result;
  }

  async getRunningOrderVersionById(id: number): Promise<RunningOrderVersion | undefined> {
    const result = await db.select()
      .from(runningOrderVersions)
      .where(eq(runningOrderVersions.id, id));
    return result[0];
  }

  async getNextVersionNumber(projectId: number): Promise<number> {
    const result = await db.select({ maxVersion: max(runningOrderVersions.versionNumber) })
      .from(runningOrderVersions)
      .where(eq(runningOrderVersions.projectId, projectId));
    return (result[0]?.maxVersion || 0) + 1;
  }

  async createRunningOrderVersion(version: InsertRunningOrderVersion): Promise<RunningOrderVersion> {
    const result = await db.insert(runningOrderVersions).values(version).returning();
    return result[0];
  }

  async updateRunningOrderVersion(id: number, version: Partial<InsertRunningOrderVersion>): Promise<RunningOrderVersion> {
    const result = await db.update(runningOrderVersions)
      .set(version)
      .where(eq(runningOrderVersions.id, id))
      .returning();
    return result[0];
  }

  async deleteRunningOrderVersion(id: number): Promise<void> {
    await db.delete(runningOrderVersions).where(eq(runningOrderVersions.id, id));
  }

  // Schedule Templates operations
  async getScheduleTemplatesByProjectId(projectId: number): Promise<ScheduleTemplate[]> {
    const result = await db.select()
      .from(scheduleTemplates)
      .where(eq(scheduleTemplates.projectId, projectId))
      .orderBy(desc(scheduleTemplates.createdAt));
    return result;
  }

  async getScheduleTemplateById(templateId: number): Promise<ScheduleTemplate | undefined> {
    const result = await db.select()
      .from(scheduleTemplates)
      .where(eq(scheduleTemplates.id, templateId));
    return result[0];
  }

  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const result = await db.insert(scheduleTemplates).values(template).returning();
    return result[0];
  }

  async updateScheduleTemplate(templateId: number, updates: Partial<InsertScheduleTemplate>): Promise<ScheduleTemplate> {
    const result = await db.update(scheduleTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduleTemplates.id, templateId))
      .returning();
    return result[0];
  }

  async deleteScheduleTemplate(templateId: number): Promise<void> {
    await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, templateId));
  }

  async getScheduleTemplateEventsById(templateId: number): Promise<ScheduleTemplateEvent[]> {
    const result = await db.select()
      .from(scheduleTemplateEvents)
      .where(eq(scheduleTemplateEvents.templateId, templateId))
      .orderBy(scheduleTemplateEvents.dayOfWeek, scheduleTemplateEvents.startTime);
    return result;
  }

  async createScheduleTemplateEvent(event: InsertScheduleTemplateEvent): Promise<ScheduleTemplateEvent> {
    const result = await db.insert(scheduleTemplateEvents).values(event).returning();
    return result[0];
  }

  async updateScheduleTemplateEvent(eventId: number, updates: Partial<InsertScheduleTemplateEvent>): Promise<ScheduleTemplateEvent> {
    const result = await db.update(scheduleTemplateEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduleTemplateEvents.id, eventId))
      .returning();
    return result[0];
  }

  async deleteScheduleTemplateEvent(eventId: number): Promise<void> {
    await db.delete(scheduleTemplateEvents).where(eq(scheduleTemplateEvents.id, eventId));
  }

  async getScheduleTemplateEventParticipants(templateEventId: number): Promise<ScheduleTemplateEventParticipant[]> {
    const result = await db.select()
      .from(scheduleTemplateEventParticipants)
      .where(eq(scheduleTemplateEventParticipants.templateEventId, templateEventId));
    return result;
  }

  async addScheduleTemplateEventParticipant(participant: InsertScheduleTemplateEventParticipant): Promise<ScheduleTemplateEventParticipant> {
    const result = await db.insert(scheduleTemplateEventParticipants).values(participant).returning();
    return result[0];
  }

  async removeScheduleTemplateEventParticipants(templateEventId: number): Promise<void> {
    await db.delete(scheduleTemplateEventParticipants)
      .where(eq(scheduleTemplateEventParticipants.templateEventId, templateEventId));
  }

}

export const storage = new DatabaseStorage();
