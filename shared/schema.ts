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

// Session storage table (required for session management)
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
  isAdmin: boolean("is_admin").default(false), // Admin status for user management access
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  venue: varchar("venue"),
  prepStartDate: timestamp("prep_start_date"),
  firstRehearsalDate: timestamp("first_rehearsal_date"),
  designerRunDate: timestamp("designer_run_date"),
  firstTechDate: timestamp("first_tech_date"),
  firstPreviewDate: timestamp("first_preview_date"),
  openingNight: timestamp("opening_night"),
  closingDate: timestamp("closing_date"),
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
  createdBy: integer("created_by").notNull().references(() => users.id),
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
  version: varchar("version").default("1.0"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const showSchedules = pgTable("show_schedules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // rehearsal, tech, performance, general
  events: jsonb("events").notNull(), // Array of schedule events
  createdBy: integer("created_by").notNull().references(() => users.id),
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
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Script management with collaboration and version control
export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  content: jsonb("content").notNull(), // Rich text content with formatting
  version: varchar("version").default("1.0"),
  majorVersion: integer("major_version").default(1),
  minorVersion: integer("minor_version").default(0),
  totalPages: integer("total_pages").default(1),
  status: varchar("status").default("draft"), // draft, published, archived
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  publishedBy: integer("published_by").references(() => users.id),
  lastEditedBy: integer("last_edited_by").references(() => users.id),
  formatting: jsonb("formatting"), // Document formatting preferences
  pageSettings: jsonb("page_settings"), // Page size, margins, etc.
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scriptVersions = pgTable("script_versions", {
  id: serial("id").primaryKey(),
  scriptId: integer("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  version: varchar("version").notNull(),
  title: varchar("title").notNull(),
  content: jsonb("content").notNull(),
  changes: jsonb("changes"), // Summary of changes made
  publishedAt: timestamp("published_at").defaultNow(),
  publishedBy: integer("published_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
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
  timing: varchar("timing"), // pre-show, top-of-show, etc.
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scriptComments = pgTable("script_comments", {
  id: serial("id").primaryKey(),
  scriptId: integer("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references(() => scriptComments.id), // For threaded replies
  content: text("content").notNull(),
  position: integer("position"), // Character position in document
  selectedText: text("selected_text"), // Text that was highlighted when comment was made
  status: varchar("status").default("open"), // open, resolved, addressed
  type: varchar("type").default("comment"), // comment, suggestion, approval_request
  createdBy: integer("created_by").notNull().references(() => users.id),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scriptCollaborators = pgTable("script_collaborators", {
  id: serial("id").primaryKey(),
  scriptId: integer("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  permission: varchar("permission").notNull(), // read, comment, edit, admin
  invitedBy: integer("invited_by").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const scriptChanges = pgTable("script_changes", {
  id: serial("id").primaryKey(),
  scriptId: integer("script_id").notNull().references(() => scripts.id, { onDelete: "cascade" }),
  versionId: integer("version_id").references(() => scriptVersions.id),
  type: varchar("type").notNull(), // insert, delete, format, move
  position: integer("position").notNull(),
  length: integer("length"),
  oldContent: text("old_content"),
  newContent: text("new_content"),
  description: text("description"),
  isPublished: boolean("is_published").default(false),
  createdBy: integer("created_by").notNull().references(() => users.id),
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
  createdBy: integer("created_by").notNull().references(() => users.id),
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
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 2: Show settings
export const showSettings = pgTable("show_settings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  sharingEnabled: boolean("sharing_enabled").default(false),
  shareLink: varchar("share_link"),
  shareLinkExpiry: timestamp("share_link_expiry"),
  templateSettings: jsonb("template_settings"),
  reportSettings: jsonb("report_settings"),
  scheduleSettings: jsonb("schedule_settings"),
  permissions: jsonb("permissions"),
  contactCategoriesOrder: jsonb("contact_categories_order"), // Array of category IDs in custom order
  sectionsOrder: jsonb("sections_order"), // Array of section IDs in custom order for main show page
  contactSheetSettings: jsonb("contact_sheet_settings"), // Contact sheet layout and formatting settings
  companyListSettings: jsonb("company_list_settings"), // Company list layout and formatting settings
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User feedback system
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  type: varchar("type").notNull(), // bug, feature, improvement, other
  priority: varchar("priority").notNull().default("medium"), // low, medium, high, critical
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category"), // reports, script, props, costumes, admin, etc.
  status: varchar("status").notNull().default("open"), // open, in_review, in_progress, resolved, closed
  attachments: jsonb("attachments"), // URLs or file references
  adminNotes: text("admin_notes"),
  submittedBy: integer("submitted_by").notNull().references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Global template settings
export const globalTemplateSettings = pgTable("global_template_settings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  branding: jsonb("branding"),
  pageMargins: jsonb("page_margins"),
  pageNumbering: jsonb("page_numbering"),
  fonts: jsonb("fonts"),
  lists: jsonb("lists"),
  dateFormat: varchar("date_format").default("MM/DD/YYYY"),
  timeFormat: varchar("time_format").default("12h"),
  defaultHeader: text("default_header"),
  defaultFooter: text("default_footer"),
  emailSettings: jsonb("email_settings"),
  productionLogo: varchar("production_logo"),
  productionPhoto: varchar("production_photo"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Beta feature settings (admin-only global configuration)
export const betaSettings = pgTable("beta_settings", {
  id: serial("id").primaryKey(),
  features: jsonb("features").notNull(), // Array of feature configurations
  updatedBy: integer("updated_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts system
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  category: varchar("category").notNull(), // cast, crew, stage_management, creative_team, theater_staff
  role: varchar("role"), // specific role within category
  notes: text("notes"),
  // Emergency contact information
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactEmail: varchar("emergency_contact_email"),
  emergencyContactRelationship: varchar("emergency_contact_relationship"),
  // Allergies and medical information
  allergies: text("allergies"),
  medicalNotes: text("medical_notes"),
  // Cast types (for cast category only)
  castTypes: text("cast_types").array(), // ["principle", "understudy", "swing", "ensemble"]
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact availability system
export const contactAvailability = pgTable("contact_availability", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  availabilityType: varchar("availability_type").notNull(), // 'unavailable' | 'preferred'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule events system
export const scheduleEvents = pgTable("schedule_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  type: varchar("type").notNull().default("rehearsal"), // rehearsal, performance, meeting, tech, other
  location: varchar("location"),
  notes: text("notes"),
  isAllDay: boolean("is_all_day").default(false),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule event participants (many-to-many relationship)
export const scheduleEventParticipants = pgTable("schedule_event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => scheduleEvents.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  isRequired: boolean("is_required").default(true),
  status: varchar("status").default("pending"), // pending, confirmed, declined
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event locations table
export const eventLocations = pgTable("event_locations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  address: text("address"),
  description: text("description"),
  capacity: integer("capacity"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Location availability system
export const locationAvailability = pgTable("location_availability", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  locationId: integer("location_id").notNull().references(() => eventLocations.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  type: varchar("type").notNull(), // 'unavailable' | 'preferred'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  reports: many(reports),
  reportTemplates: many(reportTemplates),
  showDocuments: many(showDocuments),
  showSchedules: many(showSchedules),
  showCharacters: many(showCharacters),
  props: many(props),
  costumes: many(costumes),
  scripts: many(scripts),
  showSettings: many(showSettings),
  globalTemplateSettings: many(globalTemplateSettings),
  contacts: many(contacts),
  submittedFeedback: many(feedback, { relationName: "submittedFeedback" }),
  assignedFeedback: many(feedback, { relationName: "assignedFeedback" }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  teamMembers: many(teamMembers),
  reports: many(reports),
  reportTemplates: many(reportTemplates),
  showDocuments: many(showDocuments),
  showSchedules: many(showSchedules),
  showCharacters: many(showCharacters),
  props: many(props),
  costumes: many(costumes),
  scripts: many(scripts),
  showSettings: many(showSettings),
  globalTemplateSettings: many(globalTemplateSettings),
  contacts: many(contacts),
  eventLocations: many(eventLocations),
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
  template: one(reportTemplates, {
    fields: [reports.templateId],
    references: [reportTemplates.id],
  }),
  creator: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),
}));

export const reportTemplatesRelations = relations(reportTemplates, ({ one, many }) => ({
  project: one(projects, {
    fields: [reportTemplates.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [reportTemplates.createdBy],
    references: [users.id],
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

export const scriptsRelations = relations(scripts, ({ one, many }) => ({
  project: one(projects, {
    fields: [scripts.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [scripts.createdBy],
    references: [users.id],
  }),
  lastEditor: one(users, {
    fields: [scripts.lastEditedBy],
    references: [users.id],
  }),
  publisher: one(users, {
    fields: [scripts.publishedBy],
    references: [users.id],
  }),
  versions: many(scriptVersions),
  cues: many(scriptCues),
  comments: many(scriptComments),
  collaborators: many(scriptCollaborators),
  changes: many(scriptChanges),
}));

export const scriptVersionsRelations = relations(scriptVersions, ({ one, many }) => ({
  script: one(scripts, {
    fields: [scriptVersions.scriptId],
    references: [scripts.id],
  }),
  publisher: one(users, {
    fields: [scriptVersions.publishedBy],
    references: [users.id],
  }),
  changes: many(scriptChanges),
}));

export const scriptCuesRelations = relations(scriptCues, ({ one }) => ({
  script: one(scripts, {
    fields: [scriptCues.scriptId],
    references: [scripts.id],
  }),
  creator: one(users, {
    fields: [scriptCues.createdBy],
    references: [users.id],
  }),
}));

export const scriptCommentsRelations = relations(scriptComments, ({ one, many }) => ({
  script: one(scripts, {
    fields: [scriptComments.scriptId],
    references: [scripts.id],
  }),
  parent: one(scriptComments, {
    fields: [scriptComments.parentId],
    references: [scriptComments.id],
  }),
  creator: one(users, {
    fields: [scriptComments.createdBy],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [scriptComments.resolvedBy],
    references: [users.id],
  }),
  replies: many(scriptComments),
}));

export const scriptCollaboratorsRelations = relations(scriptCollaborators, ({ one }) => ({
  script: one(scripts, {
    fields: [scriptCollaborators.scriptId],
    references: [scripts.id],
  }),
  user: one(users, {
    fields: [scriptCollaborators.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [scriptCollaborators.invitedBy],
    references: [users.id],
  }),
}));

export const scriptChangesRelations = relations(scriptChanges, ({ one }) => ({
  script: one(scripts, {
    fields: [scriptChanges.scriptId],
    references: [scripts.id],
  }),
  version: one(scriptVersions, {
    fields: [scriptChanges.versionId],
    references: [scriptVersions.id],
  }),
  creator: one(users, {
    fields: [scriptChanges.createdBy],
    references: [users.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  submitter: one(users, {
    fields: [feedback.submittedBy],
    references: [users.id],
    relationName: "submittedFeedback",
  }),
  assignee: one(users, {
    fields: [feedback.assignedTo],
    references: [users.id],
    relationName: "assignedFeedback",
  }),
}));



export const contactsRelations = relations(contacts, ({ one, many }) => ({
  project: one(projects, {
    fields: [contacts.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [contacts.createdBy],
    references: [users.id],
  }),
  availability: many(contactAvailability),
  eventParticipants: many(scheduleEventParticipants),
}));

export const contactAvailabilityRelations = relations(contactAvailability, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactAvailability.contactId],
    references: [contacts.id],
  }),
  project: one(projects, {
    fields: [contactAvailability.projectId],
    references: [projects.id],
  }),
}));

export const scheduleEventsRelations = relations(scheduleEvents, ({ one, many }) => ({
  project: one(projects, {
    fields: [scheduleEvents.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [scheduleEvents.createdBy],
    references: [users.id],
  }),
  participants: many(scheduleEventParticipants),
}));

export const scheduleEventParticipantsRelations = relations(scheduleEventParticipants, ({ one }) => ({
  event: one(scheduleEvents, {
    fields: [scheduleEventParticipants.eventId],
    references: [scheduleEvents.id],
  }),
  contact: one(contacts, {
    fields: [scheduleEventParticipants.contactId],
    references: [contacts.id],
  }),
}));

export const eventLocationsRelations = relations(eventLocations, ({ one, many }) => ({
  project: one(projects, {
    fields: [eventLocations.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [eventLocations.createdBy],
    references: [users.id],
  }),
  availability: many(locationAvailability),
}));

export const locationAvailabilityRelations = relations(locationAvailability, ({ one }) => ({
  location: one(eventLocations, {
    fields: [locationAvailability.locationId],
    references: [eventLocations.id],
  }),
  project: one(projects, {
    fields: [locationAvailability.projectId],
    references: [projects.id],
  }),
}));

// Contact sheet versions table for version control
export const contactSheetVersions = pgTable("contact_sheet_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 20 }).notNull().default("1.0"),
  versionType: varchar("version_type", { length: 10 }).notNull(), // 'major' or 'minor'
  type: varchar("type", { length: 20 }).notNull().default("contact-sheet"), // 'contact-sheet' or 'company-list'
  settings: jsonb("settings").notNull(), // Complete contact sheet settings snapshot
  publishedBy: integer("published_by").notNull().references(() => users.id),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
});

// Error logs table for automatic error tracking
export const errorLogs = pgTable("error_logs", {
  id: serial("id").primaryKey(),
  errorType: varchar("error_type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  page: varchar("page", { length: 255 }).notNull(),
  userAction: varchar("user_action", { length: 100 }),
  elementClicked: varchar("element_clicked", { length: 255 }),
  stackTrace: text("stack_trace"),
  userAgent: text("user_agent").notNull(),
  userId: varchar("user_id", { length: 50 }),
  additionalData: jsonb("additional_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactSheetVersionsRelations = relations(contactSheetVersions, ({ one }) => ({
  project: one(projects, {
    fields: [contactSheetVersions.projectId],
    references: [projects.id],
  }),
  publisher: one(users, {
    fields: [contactSheetVersions.publishedBy],
    references: [users.id],
  }),
}));

export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  user: one(users, {
    fields: [errorLogs.userId],
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

export const insertScriptSchema = createInsertSchema(scripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScriptVersionSchema = createInsertSchema(scriptVersions).omit({
  id: true,
  createdAt: true,
});

export const insertScriptCueSchema = createInsertSchema(scriptCues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScriptCommentSchema = createInsertSchema(scriptComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScriptCollaboratorSchema = createInsertSchema(scriptCollaborators).omit({
  id: true,
  joinedAt: true,
});

export const insertScriptChangeSchema = createInsertSchema(scriptChanges).omit({
  id: true,
  createdAt: true,
});

export const insertGlobalTemplateSettingsSchema = createInsertSchema(globalTemplateSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBetaSettingsSchema = createInsertSchema(betaSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  castTypes: z.array(z.string()).optional(),
});

export const insertContactAvailabilitySchema = createInsertSchema(contactAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleEventParticipantSchema = createInsertSchema(scheduleEventParticipants).omit({
  id: true,
  createdAt: true,
});

// Domain Management Tables
export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(), // e.g., "backstageos.com"
  zoneId: varchar("zone_id").notNull(), // Cloudflare zone ID
  status: varchar("status").default("active"), // active, inactive, pending
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Domain routing configuration
export const domainRoutes = pgTable("domain_routes", {
  id: serial("id").primaryKey(),
  domain: varchar("domain").notNull(), // full domain: "backstageos.com", "beta.backstageos.com"
  routePath: varchar("route_path").notNull(), // app route to load: "/", "/landing", "/auth"
  routeType: varchar("route_type").notNull(), // "auth_required", "public", "landing"
  isActive: boolean("is_active").default(true),
  description: text("description"), // human-readable description
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dnsRecords = pgTable("dns_records", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull(),
  cloudflareId: varchar("cloudflare_id"), // Cloudflare record ID
  type: varchar("type").notNull(), // CNAME, A, AAAA, TXT, MX
  name: varchar("name").notNull(), // @ for root, subdomain name
  content: text("content").notNull(), // target/value
  ttl: integer("ttl").default(1),
  proxied: boolean("proxied").default(false),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Domain Management Insert Schemas
export const insertDomainSchema = createInsertSchema(domains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDomainRouteSchema = createInsertSchema(domainRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDnsRecordSchema = createInsertSchema(dnsRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventLocationSchema = createInsertSchema(eventLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type ContactAvailability = typeof contactAvailability.$inferSelect;
export type InsertContactAvailability = z.infer<typeof insertContactAvailabilitySchema>;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type ScheduleEventParticipant = typeof scheduleEventParticipants.$inferSelect;
export type InsertScheduleEventParticipant = z.infer<typeof insertScheduleEventParticipantSchema>;

export const insertContactSheetVersionSchema = createInsertSchema(contactSheetVersions).omit({
  id: true,
  publishedAt: true,
});

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  createdAt: true,
});

// Waitlist system for landing page
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  experience: varchar("experience"), // professional, educational, community, student
  howHeard: varchar("how_heard"), // social_media, referral, search, other
  additionalInfo: text("additional_info"),
  status: varchar("status").notNull().default("pending"), // pending, contacted, converted, declined
  position: integer("position"), // Position in waitlist (auto-generated)
  invitedAt: timestamp("invited_at"),
  convertedAt: timestamp("converted_at"),
  notes: text("notes"), // Admin notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  position: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationAvailabilitySchema = createInsertSchema(locationAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropsSchema = createInsertSchema(props).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
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
export type Script = typeof scripts.$inferSelect;
export type InsertScript = z.infer<typeof insertScriptSchema>;
export type ScriptVersion = typeof scriptVersions.$inferSelect;
export type InsertScriptVersion = z.infer<typeof insertScriptVersionSchema>;
export type ScriptCue = typeof scriptCues.$inferSelect;
export type InsertScriptCue = z.infer<typeof insertScriptCueSchema>;
export type ScriptComment = typeof scriptComments.$inferSelect;
export type InsertScriptComment = z.infer<typeof insertScriptCommentSchema>;
export type ScriptCollaborator = typeof scriptCollaborators.$inferSelect;
export type InsertScriptCollaborator = z.infer<typeof insertScriptCollaboratorSchema>;
export type ScriptChange = typeof scriptChanges.$inferSelect;
export type InsertScriptChange = z.infer<typeof insertScriptChangeSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type BetaSettings = typeof betaSettings.$inferSelect;
export type InsertBetaSettings = z.infer<typeof insertBetaSettingsSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type DomainRoute = typeof domainRoutes.$inferSelect;
export type InsertDomainRoute = z.infer<typeof insertDomainRouteSchema>;
export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type EventLocation = typeof eventLocations.$inferSelect;
export type InsertEventLocation = z.infer<typeof insertEventLocationSchema>;
export type LocationAvailability = typeof locationAvailability.$inferSelect;
export type InsertLocationAvailability = z.infer<typeof insertLocationAvailabilitySchema>;
export type Prop = typeof props.$inferSelect;
export type InsertProp = z.infer<typeof insertPropsSchema>;