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

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  profileType: varchar("profile_type"), // 'freelance' or 'fulltime'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  venue: varchar("venue"),
  startDate: timestamp("start_date"),
  openingNight: timestamp("opening_night"),
  status: varchar("status").notNull().default("planning"), // planning, pre-production, rehearsal, tech, performance, closed
  season: varchar("season"), // for full-time users
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").references(() => users.id),
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
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // rehearsal, tech, performance, meeting, custom
  fields: jsonb("fields").notNull(), // JSON array of field definitions
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
