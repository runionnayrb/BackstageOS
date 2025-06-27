import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  profileType: varchar("profile_type"), // 'freelance' or 'fulltime'
  betaAccess: varchar("beta_access").default("limited"), // 'none', 'limited', 'full'
  betaFeatures: jsonb("beta_features"), // Array of enabled features for beta users
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  venue: varchar("venue"),
  prepStartDate: timestamp("prep_start_date"),
  closingDate: timestamp("closing_date"),
  openingNight: timestamp("opening_night"),
  status: varchar("status").notNull().default("planning"), // planning, pre-production, rehearsal, tech, performance, closed
  season: varchar("season"), // for full-time users
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").references(() => users.id),
  email: varchar("email").notNull(),
  name: varchar("name"),
  role: varchar("role").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, accepted, declined
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: varchar("title").notNull(),
  type: varchar("type").notNull(), // rehearsal, tech, performance, meeting, custom
  templateId: integer("template_id").references(() => reportTemplates.id),
  content: jsonb("content").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, complete
  date: timestamp("date").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // rehearsal, tech, performance, meeting, custom
  phase: varchar("phase"), // prep, rehearsal, tech, previews, performance
  header: text("header"), // template header with variables
  footer: text("footer"), // template footer with variables
  fields: jsonb("fields").notNull(), // JSON array of field definitions with order, type, etc.
  isDefault: boolean("is_default").default(false),
  isPublic: boolean("is_public").default(false), // Can be shared with other users
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New tables for show-specific documentation
export const showDocuments = pgTable("show_documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // props_list, costume_tracking, scene_breakdown, stage_plot, etc.
  content: jsonb("content").notNull(),
  version: integer("version").default(1),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const showSchedules = pgTable("show_schedules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // rehearsal, tech, performance, general
  events: jsonb("events").notNull(), // Array of schedule events
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const showCharacters = pgTable("show_characters", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  scenes: jsonb("scenes").notNull().default('[]'), // Array of scene appearances
  costumes: jsonb("costumes").notNull().default('[]'), // Costume requirements
  props: jsonb("props").notNull().default('[]'), // Character props
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 2: Script management
export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  content: text("content"),
  version: varchar("version").default("1.0"),
  totalPages: integer("total_pages").default(1),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scriptCues = pgTable("script_cues", {
  id: serial("id").primaryKey(),
  scriptId: integer("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // lighting, sound, video, automation, other
  number: varchar("number").notNull(),
  description: text("description"),
  position: integer("position").notNull(),
  page: integer("page").notNull(),
  act: integer("act"),
  scene: integer("scene"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Phase 2: Props tracking
export const props = pgTable("props", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  scene: varchar("scene"),
  character: varchar("character"),
  location: varchar("location"),
  status: varchar("status").notNull().default("needed"), // needed, pulled, rehearsal, performance, returned
  notes: text("notes"),
  quantity: integer("quantity").default(1),
  sourcingNotes: text("sourcing_notes"),
  imageUrl: varchar("image_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 2: Costume tracking
export const costumes = pgTable("costumes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  character: varchar("character").notNull(),
  piece: varchar("piece").notNull(),
  scene: varchar("scene"),
  notes: text("notes"),
  status: varchar("status").notNull().default("needed"), // needed, fitted, ready, in_use, repair
  isQuickChange: boolean("is_quick_change").default(false),
  quickChangeTime: integer("quick_change_time").default(60), // seconds
  quickChangeNotes: text("quick_change_notes"),
  imageUrl: varchar("image_url"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 2: Show settings
export const showSettings = pgTable("show_settings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  teamMemberSettings: jsonb("team_member_settings").notNull().default('{"allowInvitations":true,"requireApproval":false,"defaultRole":"member","maxMembers":20}'),
  sharingSettings: jsonb("sharing_settings").notNull().default('{"isPublic":false,"allowGuestView":false,"shareableLink":null,"linkExpiration":null,"password":null}'),
  templateSettings: jsonb("template_settings").notNull().default('{"useDefaultTemplates":true,"allowCustomTemplates":true,"templateApprovalRequired":false,"sharedTemplateLibrary":false}'),
  reportSettings: jsonb("report_settings").notNull().default('{"defaultReportType":"rehearsal","requireReview":false,"autoArchive":false,"archiveDays":30,"notificationsEnabled":true}'),
  scheduleSettings: jsonb("schedule_settings").notNull().default('{"timeZone":"America/New_York","workingHours":{"start":"09:00","end":"18:00"},"allowConflicts":false,"reminderSettings":{"enabled":true,"minutesBefore":30}}'),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Global template settings for formatting and branding
export const globalTemplateSettings = pgTable("global_template_settings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  branding: jsonb("branding").notNull().default('{"logoPosition":"header-left","logoSize":"medium","showProductionPhoto":false,"photoPosition":"header"}'),
  pageMargins: jsonb("page_margins").notNull().default('{"top":"1in","bottom":"1in","left":"1in","right":"1in"}'),
  pageNumbering: jsonb("page_numbering").notNull().default('{"enabled":true,"format":"Page 1 of X","position":"bottom-center"}'),
  fonts: jsonb("fonts").notNull().default('{"heading":{"family":"Arial, sans-serif","size":"18px","weight":"bold","lineHeight":"1.4"},"body":{"family":"Arial, sans-serif","size":"12px","weight":"normal","lineHeight":"1.6"}}'),
  lists: jsonb("lists").notNull().default('{"numbered":{"spacing":"6px","indentation":"20px","style":"1."},"bulleted":{"spacing":"6px","indentation":"20px","style":"•"}}'),
  dateFormat: varchar("date_format").notNull().default("MM/DD/YYYY"),
  timeFormat: varchar("time_format").notNull().default("12h"),
  defaultHeader: text("default_header").notNull().default('<div style="text-align: center; font-weight: bold;">{{showName}} - {{reportType}}<br>Date: {{date}}<br>Stage Manager: {{stageManager}}</div>'),
  defaultFooter: text("default_footer").notNull().default('<div style="text-align: center; color: #666666;">Prepared by: {{preparedBy}}<br>Next report: {{nextReportDate}}</div>'),
  email: jsonb("email_settings").notNull().default('{"distributionLists":{"to":[],"cc":[],"bcc":[]},"subjectTemplate":"{{showName}} - {{reportType}} - {{date}}","bodyTemplate":"Please find attached the {{reportType}} for {{showName}}.\\n\\nBest regards,\\n{{stageManager}}","signature":""}'),
  productionLogo: text("production_logo"), // Base64 encoded image
  productionPhoto: text("production_photo"), // Base64 encoded image
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  reports: many(reports),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  teamMembers: many(teamMembers),
  reports: many(reports),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  project: one(projects, {
    fields: [teamMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  project: one(projects, {
    fields: [reports.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),
  template: one(reportTemplates, {
    fields: [reports.templateId],
    references: [reportTemplates.id],
  }),
}));

export const reportTemplatesRelations = relations(reportTemplates, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [reportTemplates.createdBy],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [reportTemplates.projectId],
    references: [projects.id],
  }),
  reports: many(reports),
}));

export const showDocumentsRelations = relations(showDocuments, ({ one }) => ({
  project: one(projects, {
    fields: [showDocuments.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [showDocuments.createdBy],
    references: [users.id],
  }),
}));

export const showSchedulesRelations = relations(showSchedules, ({ one }) => ({
  project: one(projects, {
    fields: [showSchedules.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [showSchedules.createdBy],
    references: [users.id],
  }),
}));

export const showCharactersRelations = relations(showCharacters, ({ one }) => ({
  project: one(projects, {
    fields: [showCharacters.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [showCharacters.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  invitedAt: true,
  joinedAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShowDocumentSchema = createInsertSchema(showDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShowScheduleSchema = createInsertSchema(showSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShowCharacterSchema = createInsertSchema(showCharacters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShowSettingsSchema = createInsertSchema(showSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGlobalTemplateSettingsSchema = createInsertSchema(globalTemplateSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ShowDocument = typeof showDocuments.$inferSelect;
export type InsertShowDocument = z.infer<typeof insertShowDocumentSchema>;
export type ShowSchedule = typeof showSchedules.$inferSelect;
export type InsertShowSchedule = z.infer<typeof insertShowScheduleSchema>;
export type ShowCharacter = typeof showCharacters.$inferSelect;
export type InsertShowCharacter = z.infer<typeof insertShowCharacterSchema>;
export type ShowSettings = typeof showSettings.$inferSelect;
export type InsertShowSettings = z.infer<typeof insertShowSettingsSchema>;
export type GlobalTemplateSettings = typeof globalTemplateSettings.$inferSelect;
export type InsertGlobalTemplateSettings = z.infer<typeof insertGlobalTemplateSettingsSchema>;
