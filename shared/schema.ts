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
  decimal,
  date,
  time,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  // User role and access management
  userRole: varchar("user_role").notNull().default("user"), // 'admin', 'user', 'editor', 'viewer'
  betaAccess: boolean("beta_access").default(false), // Automatically granted to users on the waitlist at registration
  betaFeatures: jsonb("beta_features"), // Array of enabled features for beta users
  isAdmin: boolean("is_admin").default(false), // Admin status for user management access
  // Editor limits tracking
  maxActiveShows: integer("max_active_shows").default(2), // Maximum active shows for editors
  currentActiveShows: integer("current_active_shows").default(0), // Current active show count
  lastActiveAt: timestamp("last_active_at"), // Track last activity across platform
  totalLogins: integer("total_logins").default(0), // Track login count
  totalMinutesActive: integer("total_minutes_active").default(0), // Track active time
  featuresUsed: jsonb("features_used"), // Track which features they use
  // Email settings for show-specific communications via sm@backstageos.com
  defaultReplyToEmail: varchar("default_reply_to_email"),
  emailDisplayName: varchar("email_display_name"),
  // Connected email provider for native email sending (Gmail or Outlook) - Per-user OAuth
  connectedEmailProvider: varchar("connected_email_provider"), // 'gmail' or 'outlook'
  connectedEmailAddress: varchar("connected_email_address"), // The actual email address from the connected provider
  emailProviderConnectedAt: timestamp("email_provider_connected_at"),
  // OAuth tokens for per-user email integration (encrypted)
  emailOAuthRefreshToken: text("email_oauth_refresh_token"), // Encrypted refresh token
  emailOAuthAccessToken: text("email_oauth_access_token"), // Current access token
  emailOAuthTokenExpiry: timestamp("email_oauth_token_expiry"), // When access token expires
  emailOAuthScopes: text("email_oauth_scopes"), // Granted OAuth scopes
  // Billing and subscription fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
  subscriptionPlan: varchar("subscription_plan"), // 'monthly', 'annual', 'theatre'
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  paymentMethodRequired: boolean("payment_method_required").default(false),
  grandfatheredFree: boolean("grandfathered_free").default(false), // For beta users
  isActive: boolean("is_active").default(true), // User status based on billing/subscription
  // Password reset fields
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Seasons table for full-time users
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // e.g., "2025-2026 Season"
  userId: integer("user_id").notNull().references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Venues table for full-time users
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: text("address"),
  capacity: integer("capacity"),
  notes: text("notes"),
  userId: integer("user_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(),
  description: text("description"),
  venue: varchar("venue"), // For freelance users (free text) or venue name reference
  venueId: integer("venue_id").references(() => venues.id), // For full-time users
  prepStartDate: timestamp("prep_start_date"),
  firstRehearsalDate: timestamp("first_rehearsal_date"),
  designerRunDate: timestamp("designer_run_date"),
  firstTechDate: timestamp("first_tech_date"),
  firstPreviewDate: timestamp("first_preview_date"),
  openingNight: timestamp("opening_night"),
  closingDate: timestamp("closing_date"),
  season: varchar("season"), // For freelance users (free text) or season name reference
  seasonId: integer("season_id").references(() => seasons.id), // For full-time users
  ownerId: integer("owner_id").notNull().references(() => users.id),
  // Optional show-specific email overrides for sm@backstageos.com emails
  customReplyToEmail: varchar("custom_reply_to_email"),
  customEmailDisplayName: varchar("custom_email_display_name"),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Simplified project members - just tracks who has access to which projects
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // Production Stage Manager, Stage Manager, Production Assistant
  accessLevel: varchar("access_level").notNull(), // 'editor', 'viewer'
  status: varchar("status").notNull().default("pending"), // pending, accepted, declined
  invitedBy: integer("invited_by").notNull().references(() => users.id), // Track who invited this member
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
  lastActiveAt: timestamp("last_active_at"), // Track last activity on this project
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members table for inviting users to productions
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email").notNull(),
  name: varchar("name"),
  role: varchar("role").notNull(),
  accessLevel: varchar("access_level").notNull().default("viewer"), // 'editor' or 'viewer'
  status: varchar("status").notNull().default("pending"),
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
  isArchived: boolean("is_archived").notNull().default(false),
  archivedAt: timestamp("archived_at"),
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
  layoutConfiguration: jsonb("layout_configuration"), // Drag-and-drop layout positioning for headers and notes
  isDefault: boolean("is_default").default(false),
  isPublic: boolean("is_public").default(false), // Can be shared with other users
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// V2 Template System - Normalized structure for simplified template management
export const reportTemplatesV2 = pgTable("report_templates_v2", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  reportTypeId: integer("report_type_id").references(() => reportTypes.id, { onDelete: "set null" }),
  name: varchar("name").notNull(),
  description: text("description"),
  layoutConfiguration: jsonb("layout_configuration"), // Custom layout for this template
  isDefault: boolean("is_default").default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_templates_v2_project").on(table.projectId),
  index("idx_templates_v2_report_type").on(table.reportTypeId),
]);

export const templateSections = pgTable("template_sections", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => reportTemplatesV2.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  departmentKey: varchar("department_key"), // References key in showSettings.departmentNames
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sections_template").on(table.templateId),
  index("idx_sections_template_order").on(table.templateId, table.displayOrder),
]);

export const templateFields = pgTable("template_fields", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => templateSections.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // text, textarea, number, date, time, checkbox, select
  label: varchar("label").notNull(),
  helperText: text("helper_text"),
  placeholder: text("placeholder"),
  required: boolean("required").default(false),
  options: jsonb("options"), // For select/radio fields: {values: string[]}
  defaultValue: text("default_value"),
  departmentKey: varchar("department_key"), // Field-level department for notes tracking
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fields_section").on(table.sectionId),
  index("idx_fields_section_order").on(table.sectionId, table.displayOrder),
]);

// Custom report types - user-defined categories for reports
export const reportTypes = pgTable("report_types", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // Display name: "Performance Report", "Show Report", etc.
  slug: varchar("slug").notNull(), // URL-friendly: "performance", "show", etc.
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0), // Order in UI
  isDefault: boolean("is_default").default(false), // If true, this is a default type seeded for all projects
  icon: varchar("icon"), // Lucide icon name
  color: varchar("color"), // Color for UI
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.projectId, table.slug),
]);

// Individual report notes for tracking and follow-up
export const reportNotes = pgTable("report_notes", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  templateFieldId: integer("template_field_id"), // Links to the template field this note came from
  content: text("content").notNull(),
  noteOrder: integer("note_order").notNull(), // Order within the report for numbered list display
  isCompleted: boolean("is_completed").default(false),
  priority: varchar("priority").default("medium"), // low, medium, high
  assignedTo: integer("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  department: varchar("department"), // scenic, lighting, audio, video, props, costumes, etc.
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

export const scriptComments: any = pgTable("script_comments", {
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
  act: varchar("act"), // Act number (e.g., "1", "2", "Act I", "Act II")
  scene: varchar("scene"), // Scene number within act (e.g., "1", "2", "Scene 1", "Scene 2")
  character: varchar("character"),
  location: varchar("location"),
  status: varchar("status").notNull().default("needed"), // needed, pulled, rehearsal, performance, returned
  notes: text("notes"),
  quantity: integer("quantity").default(1),
  sourcingNotes: text("sourcing_notes"),
  imageUrl: varchar("image_url"),
  consumableType: varchar("consumable_type").notNull().default("not_consumable"), // not_consumable, consumable
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
  act: varchar("act"),
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
  departmentNames: jsonb("department_names"), // Custom department names for tech reports
  departmentFormatting: jsonb("department_formatting"), // Department header formatting settings
  departmentOrder: jsonb("department_order"), // Custom department ordering for tech reports
  fieldHeaderFormatting: jsonb("field_header_formatting"), // Field header formatting settings
  headerFormatting: jsonb("header_formatting"), // Template header formatting settings
  footerFormatting: jsonb("footer_formatting"), // Template footer formatting settings
  layoutConfiguration: jsonb("layout_configuration"), // Drag-and-drop layout positioning for headers and notes
  globalPageMargins: jsonb("global_page_margins"), // Global page margins that apply to all templates
  featureSettings: jsonb("feature_settings").notNull().default('{"email":{"team":true},"chat":true,"reports":true,"calendar":true,"script":true,"props":true,"contacts":true}'), // Toggle settings for app features
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Running order versions for tracking show structure history
export const runningOrderVersions = pgTable("running_order_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, published
  label: varchar("label"), // User-friendly name like "Opening Night", "Week 2"
  runningOrder: jsonb("running_order").notNull(), // Snapshot of running order items
  structureGroups: jsonb("structure_groups"), // Snapshot of structure groups
  notes: text("notes"), // Optional notes about this version
  createdBy: integer("created_by").notNull().references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_running_order_versions_project").on(table.projectId),
  index("idx_running_order_versions_project_number").on(table.projectId, table.versionNumber),
]);

export const insertRunningOrderVersionSchema = createInsertSchema(runningOrderVersions).omit({
  id: true,
  createdAt: true,
});

export type InsertRunningOrderVersion = z.infer<typeof insertRunningOrderVersionSchema>;
export type RunningOrderVersion = typeof runningOrderVersions.$inferSelect;

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
  headerSpacing: varchar("header_spacing").default("1.2"),
  footerSpacing: varchar("footer_spacing").default("1.2"),
  headerHorizontalLine: boolean("header_horizontal_line").default(false),
  footerHorizontalLine: boolean("footer_horizontal_line").default(false),
  emailSettings: jsonb("email_settings"),
  productionLogo: varchar("production_logo"),
  productionPhoto: varchar("production_photo"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Beta feature settings (admin-only global configuration)
// Environment-scoped to ensure dev and production settings are separate
export const betaSettings = pgTable("beta_settings", {
  id: serial("id").primaryKey(),
  environment: varchar("environment").notNull().default("development"), // "development" or "production"
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
  preferredName: varchar("preferred_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  whatsapp: varchar("whatsapp"),
  category: varchar("category").notNull(), // cast, crew, stage_management, creative_team, theater_staff
  groupId: integer("group_id").references(() => contactGroups.id, { onDelete: "set null" }), // Reference to contact group
  role: varchar("role"), // specific role within category
  notes: text("notes"),
  photoUrl: varchar("photo_url"), // Contact photo
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
  // Equity status (for cast category only)
  equityStatus: varchar("equity_status"), // "equity", "non-equity", null for non-cast
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email contacts - unified contacts for email system (personal + show-specific)
export const emailContacts = pgTable("email_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }), // null for personal contacts
  originalContactId: integer("original_contact_id").references(() => contacts.id, { onDelete: "cascade" }), // Link to show contact if synced
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  role: varchar("role"), // Their role/title
  notes: text("notes"),
  isManuallyAdded: boolean("is_manually_added").default(false), // true if added directly to email, false if synced from show
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Distribution lists for email system
export const distributionLists = pgTable("distribution_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }), // null for personal lists
  name: varchar("name").notNull(), // e.g., "Cast", "Crew", "Creative Team"
  description: text("description"),
  toRecipients: text("to_recipients").array(), // Array of email addresses for TO field
  ccRecipients: text("cc_recipients").array(), // Array of email addresses for CC field
  bccRecipients: text("bcc_recipients").array(), // Array of email addresses for BCC field
  subjectTemplate: varchar("subject_template"), // Email subject template with variables like {{showName}}
  bodyTemplate: text("body_template"), // Email body template with variables
  signature: text("signature"), // Email signature
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Distribution list members - links email contacts to distribution lists
export const distributionListMembers = pgTable("distribution_list_members", {
  id: serial("id").primaryKey(),
  distributionListId: integer("distribution_list_id").notNull().references(() => distributionLists.id, { onDelete: "cascade" }),
  emailContactId: integer("email_contact_id").notNull().references(() => emailContacts.id, { onDelete: "cascade" }),
  listType: varchar("list_type").notNull(), // "to", "cc", "bcc"
  createdAt: timestamp("created_at").defaultNow(),
});

// Links distribution lists to report types - allows assigning a default distro for each report type
export const reportTypeDistributionLists = pgTable("report_type_distribution_lists", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  reportTypeId: integer("report_type_id").notNull().references(() => reportTypes.id, { onDelete: "cascade" }),
  distributionListId: integer("distribution_list_id").notNull().references(() => distributionLists.id, { onDelete: "cascade" }),
  isDefault: boolean("is_default").default(true), // If true, this is the default distro for this report type
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.reportTypeId, table.distributionListId), // Each report type can only have each distro assigned once
]);

// Contact groups for flexible group management
export const contactGroups = pgTable("contact_groups", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
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
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event types for scheduling system
export const eventTypes = pgTable("event_types", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color").default("#3b82f6"), // Default blue color
  isDefault: boolean("is_default").default(false), // System default types
  sortOrder: integer("sort_order").default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule events system
export const scheduleEvents = pgTable("schedule_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  date: date("date").notNull(), // Date type to match database
  endDate: date("end_date"), // End date for cross-midnight events (null means same as date)
  startTime: time("start_time").notNull(), // Time type to match database  
  endTime: time("end_time").notNull(), // Time type to match database
  type: varchar("type").notNull().default("rehearsal"), // rehearsal, performance, meeting, tech, other
  eventTypeId: integer("event_type_id").references(() => eventTypes.id, { onDelete: "set null" }), // Reference to custom event types
  location: varchar("location"),
  notes: text("notes"),
  isAllDay: boolean("is_all_day").default(false),
  // Schedule Relationship Mapping fields
  parentEventId: integer("parent_event_id").references(() => scheduleEvents.id, { onDelete: "set null" }), // Links daily events to production events
  isProductionLevel: boolean("is_production_level").default(false), // true for production schedule events, false for daily detail events
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id), // Track who last updated the event
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
  locationType: varchar("location_type").notNull().default("main"), // main or auxiliary
  sortOrder: integer("sort_order").default(0),
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

// ========== SCHEDULE VERSION CONTROL SYSTEM ==========

// Schedule versions for version control similar to script editor
export const scheduleVersions = pgTable("schedule_versions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  weekStart: varchar("week_start"), // Week start date (Sunday) in YYYY-MM-DD format for weekly versioning
  version: varchar("version").notNull(), // Major version number: "1", "2", "3", etc.
  minorVersion: integer("minor_version").default(0), // Minor version number: 0, 1, 2, etc. Display as major.minor
  versionType: varchar("version_type").notNull(), // 'major' | 'minor'
  title: varchar("title").notNull(), // version title/name
  description: text("description"), // version description
  changelog: text("changelog"), // description of changes
  scheduleData: jsonb("schedule_data").notNull(), // complete snapshot of schedule data
  publishedBy: integer("published_by").notNull().references(() => users.id),
  publishedAt: timestamp("published_at").defaultNow(),
  isCurrent: boolean("is_current").default(false), // current active version for this week
});

// Personal schedules for individual contact schedule access
export const personalSchedules = pgTable("personal_schedules", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  accessToken: varchar("access_token").notNull().unique(), // secure access for external viewing
  currentVersionId: integer("current_version_id").references(() => scheduleVersions.id, { onDelete: "set null" }),
  emailPreferences: jsonb("email_preferences"),
  lastViewedAt: timestamp("last_viewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule version notifications for tracking notification delivery
export const scheduleVersionNotifications = pgTable("schedule_version_notifications", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull().references(() => scheduleVersions.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  notificationType: varchar("notification_type").notNull(), // 'major_version' | 'minor_version'
  status: varchar("status").default("pending"), // 'pending' | 'sent' | 'delivered' | 'failed'
  sentAt: timestamp("sent_at"),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  errorMessage: text("error_message"),
});

// ========== SCHEDULE TEMPLATES SYSTEM ==========

// Schedule templates for reusable weekly schedules
export const scheduleTemplates = pgTable("schedule_templates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  weekStartDay: integer("week_start_day").default(0), // 0=Sunday, 1=Monday, etc. - matches show settings
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule template events (events within a template, using day of week instead of date)
export const scheduleTemplateEvents = pgTable("schedule_template_events", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => scheduleTemplates.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6, relative to template's week start
  title: varchar("title").notNull(),
  description: text("description"),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  type: varchar("type").notNull().default("rehearsal"),
  eventTypeId: integer("event_type_id").references(() => eventTypes.id, { onDelete: "set null" }),
  location: varchar("location"),
  notes: text("notes"),
  isAllDay: boolean("is_all_day").default(false),
  isProductionLevel: boolean("is_production_level").default(false), // true for events to appear on production calendar
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule template event participants
export const scheduleTemplateEventParticipants = pgTable("schedule_template_event_participants", {
  id: serial("id").primaryKey(),
  templateEventId: integer("template_event_id").notNull().references(() => scheduleTemplateEvents.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  isRequired: boolean("is_required").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom email templates for schedule notifications
export const scheduleEmailTemplates = pgTable("schedule_email_templates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  templateName: varchar("template_name").notNull(), // "Default", "Tech Week", "Performance", etc.
  templateType: varchar("template_type").notNull(), // 'major_version' | 'minor_version' | 'custom'
  subjectTemplate: text("subject_template").notNull(), // with variables like {{showName}}, {{version}}
  bodyTemplate: text("body_template").notNull(), // rich text with variable placeholders
  isDefault: boolean("is_default").default(false), // default template for this project
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== DAILY CALLS SYSTEM ==========

// Daily calls/call sheets table
export const dailyCalls = pgTable("daily_calls", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  locations: jsonb("locations").notNull().default('[]'), // Array of location objects with events
  events: jsonb("events").notNull().default('[]'), // Array of call events
  announcements: text("announcements").default(""),
  fittingsEvents: jsonb("fittings_events").default('[]'), // Fittings events
  appointmentsEvents: jsonb("appointments_events").default('[]'), // Appointments events
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== EMAIL SYSTEM TABLES ==========

// Email forwarding rules for external client integration
export const emailForwardingRules = pgTable("email_forwarding_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  forwardToEmail: varchar("forward_to_email").notNull(), // User's external email (like Gmail, Apple Mail)
  isActive: boolean("is_active").default(true),
  forwardIncoming: boolean("forward_incoming").default(true), // Forward incoming emails
  forwardOutgoing: boolean("forward_outgoing").default(false), // Forward outgoing emails
  keepOriginal: boolean("keep_original").default(true), // Keep copy in BackstageOS
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email accounts (user@backstageos.com, showname@backstageos.com)
export const emailAccounts = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }), // null for personal accounts
  emailAddress: varchar("email_address").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  accountType: varchar("account_type").notNull(), // 'personal', 'show', 'role'
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  signature: text("signature"), // Rich text signature for this email account
  // IMAP sync settings for existing email accounts
  imapHost: varchar("imap_host"),
  imapPort: integer("imap_port"),
  imapUsername: varchar("imap_username"),
  imapPassword: varchar("imap_password"), // encrypted
  imapEnabled: boolean("imap_enabled").default(false),
  imapSslEnabled: boolean("imap_ssl_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  nextSyncAt: timestamp("next_sync_at"),
  syncIntervalMinutes: integer("sync_interval_minutes").default(15),
  // SMTP settings for sending emails
  smtpHost: varchar("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUsername: varchar("smtp_username"),
  smtpPassword: varchar("smtp_password"), // encrypted
  smtpEnabled: boolean("smtp_enabled").default(false),
  smtpSslEnabled: boolean("smtp_ssl_enabled").default(true),
  // Email delivery tracking
  sentCount: integer("sent_count").default(0),
  receivedCount: integer("received_count").default(0),
  lastDeliveryStatus: varchar("last_delivery_status"), // 'success', 'failed', 'bounced'
  lastDeliveryAt: timestamp("last_delivery_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email threads for conversation grouping
export const emailThreads = pgTable("email_threads", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  subject: varchar("subject").notNull(),
  participants: text("participants").array(), // email addresses
  lastMessageAt: timestamp("last_message_at").notNull(),
  messageCount: integer("message_count").default(1),
  isRead: boolean("is_read").default(false),
  isArchived: boolean("is_archived").default(false),
  isImportant: boolean("is_important").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email messages storage with threading support
export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  threadId: integer("thread_id").references(() => emailThreads.id, { onDelete: "cascade" }),
  messageId: varchar("message_id").notNull().unique(), // Email Message-ID header
  subject: varchar("subject"),
  fromAddress: varchar("from_address").notNull(),
  toAddresses: text("to_addresses").array(),
  ccAddresses: text("cc_addresses").array(),
  bccAddresses: text("bcc_addresses").array(),
  content: text("content"),
  htmlContent: text("html_content"),
  isRead: boolean("is_read").default(false),
  isDraft: boolean("is_draft").default(false),
  isSent: boolean("is_sent").default(false),
  isStarred: boolean("is_starred").default(false),
  isImportant: boolean("is_important").default(false),
  hasAttachments: boolean("has_attachments").default(false),
  dateSent: timestamp("date_sent"),
  dateReceived: timestamp("date_received"),
  folderId: integer("folder_id").references(() => emailFolders.id),
  labels: text("labels").array(),
  priority: varchar("priority"),
  replyTo: varchar("reply_to"),
  inReplyTo: varchar("in_reply_to"),
  messageReferences: text("message_references").array(),
  sizeBytes: integer("size_bytes"),
  relatedShowId: integer("related_show_id").references(() => projects.id),
  relatedContactId: integer("related_contact_id").references(() => contacts.id),
  // Delivery tracking fields
  deliveryStatus: varchar("delivery_status").default("pending"), // pending, sent, delivered, failed, bounced
  sendGridMessageId: varchar("sendgrid_message_id"),
  deliveredAt: timestamp("delivered_at"),
  deliveryError: text("delivery_error"),
  retryCount: integer("retry_count").default(0),
  bounced: boolean("bounced").default(false),
  bounceReason: text("bounce_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email folders/labels for organization
export const emailFolders = pgTable("email_folders", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  folderType: varchar("folder_type").notNull(), // 'system', 'custom', 'project'
  color: varchar("color").default("#3b82f6"),
  parentId: integer("parent_id").references(() => emailFolders.id),
  sortOrder: integer("sort_order").default(0),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email groups for organizing contacts into mailing lists
export const emailGroups = pgTable("email_groups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color").default("#3b82f6"),
  memberIds: integer("member_ids").array().default([]),
  memberCount: integer("member_count").default(0),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email attachments handling
export const emailAttachments = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => emailMessages.id, { onDelete: "cascade" }),
  filename: varchar("filename").notNull(),
  originalFilename: varchar("original_filename").notNull(),
  contentType: varchar("content_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: varchar("file_path").notNull(), // storage path
  isInline: boolean("is_inline").default(false),
  contentId: varchar("content_id"), // for inline images
  createdAt: timestamp("created_at").defaultNow(),
});

// Email rules/filters system for automation
export const emailRules = pgTable("email_rules", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  priority: integer("priority").default(0),
  // Rule conditions (JSON structure)
  conditions: jsonb("conditions").notNull(), // {field: 'subject', operator: 'contains', value: 'rehearsal'}
  // Rule actions (JSON structure)  
  actions: jsonb("actions").notNull(), // {action: 'move_to_folder', folderId: 123}
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates for theater-specific communications
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  templateType: varchar("template_type").notNull(), // 'call_sheet', 'rehearsal_notes', 'general'
  subject: varchar("subject").notNull(),
  content: text("content").notNull(), // HTML content with variables
  variables: text("variables").array(), // available template variables
  isShared: boolean("is_shared").default(false),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email signatures for professional communication
export const emailSignatures = pgTable("email_signatures", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: integer("account_id").references(() => emailAccounts.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  content: text("content").notNull(), // HTML signature
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email sync jobs for background IMAP synchronization
export const emailSyncJobs = pgTable("email_sync_jobs", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  jobType: varchar("job_type").notNull(), // 'full_sync', 'incremental_sync', 'folder_sync'
  status: varchar("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed'
  progress: integer("progress").default(0), // percentage
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  lastSyncedUid: integer("last_synced_uid"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email delivery queue for reliable sending
export const emailQueue = pgTable("email_queue", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  messageId: integer("message_id").references(() => emailMessages.id, { onDelete: "cascade" }),
  priority: integer("priority").default(5), // 1 = highest, 10 = lowest
  status: varchar("status").notNull().default("pending"), // 'pending', 'processing', 'sent', 'failed', 'retry'
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  scheduledAt: timestamp("scheduled_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  deliveryData: jsonb("delivery_data"), // SMTP config, recipients, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scheduled emails for send later functionality
export const scheduledEmails = pgTable("scheduled_emails", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => emailAccounts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toAddresses: text("to_addresses").array().notNull(),
  ccAddresses: text("cc_addresses").array(),
  bccAddresses: text("bcc_addresses").array(),
  subject: varchar("subject").notNull(),
  content: text("content"),
  htmlContent: text("html_content"),
  attachments: jsonb("attachments"), // Store attachment info as JSON
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: varchar("status").notNull().default("scheduled"), // 'scheduled', 'sent', 'failed', 'cancelled'
  threadId: varchar("thread_id"), // For replies
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== PHASE 5: SHARED INBOXES & TEAM COLLABORATION ==========

// Shared inboxes for production teams
export const sharedInboxes = pgTable("shared_inboxes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // "Stage Management Team", "Production Team", etc.
  description: text("description"),
  emailAddress: varchar("email_address").notNull().unique(), // production@backstageos.com
  isActive: boolean("is_active").default(true),
  autoAssignRules: jsonb("auto_assign_rules"), // Rules for automatic email assignment
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members with access to shared inboxes
export const sharedInboxMembers = pgTable("shared_inbox_members", {
  id: serial("id").primaryKey(),
  inboxId: integer("inbox_id").notNull().references(() => sharedInboxes.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("viewer"), // 'admin', 'stage_manager', 'production_assistant', 'viewer'
  permissions: jsonb("permissions"), // Custom permissions for this user
  canAssignEmails: boolean("can_assign_emails").default(false),
  canManageMembers: boolean("can_manage_members").default(false),
  notificationSettings: jsonb("notification_settings"), // Email notification preferences
  joinedAt: timestamp("joined_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
});

// Email assignments for delegation
export const emailAssignments = pgTable("email_assignments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => emailMessages.id, { onDelete: "cascade" }),
  inboxId: integer("inbox_id").references(() => sharedInboxes.id, { onDelete: "cascade" }),
  assignedTo: integer("assigned_to").notNull().references(() => users.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id),
  status: varchar("status").notNull().default("pending"), // 'pending', 'accepted', 'completed', 'declined'
  priority: varchar("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team collaboration on email threads
export const emailCollaborations = pgTable("email_collaborations", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => emailThreads.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  inboxId: integer("inbox_id").references(() => sharedInboxes.id, { onDelete: "cascade" }),
  role: varchar("role").notNull().default("collaborator"), // 'owner', 'collaborator', 'cc', 'viewer'
  canReply: boolean("can_reply").default(true),
  canAssign: boolean("can_assign").default(false),
  lastReadAt: timestamp("last_read_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Email archiving rules for show completion
export const emailArchiveRules = pgTable("email_archive_rules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  ruleName: varchar("rule_name").notNull(),
  triggerEvent: varchar("trigger_event").notNull(), // 'show_closed', 'date_passed', 'manual'
  triggerDate: timestamp("trigger_date"),
  archiveAction: varchar("archive_action").notNull().default("archive"), // 'archive', 'delete', 'export'
  exportFormat: varchar("export_format"), // 'pdf', 'mbox', 'eml'
  exportDestination: varchar("export_destination"), // Storage location for exports
  isActive: boolean("is_active").default(true),
  lastExecuted: timestamp("last_executed"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== TASK MANAGEMENT SYSTEM ==========

// Task databases (equivalent to Notion databases)
export const taskDatabases = pgTable("task_databases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // emoji or icon identifier
  color: varchar("color").default("#6B7280"), // hex color code
  templateType: varchar("template_type"), // template identifier
  isGlobal: boolean("is_global").default(false), // for user-level databases
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom properties for task databases
export const taskProperties = pgTable("task_properties", {
  id: serial("id").primaryKey(),
  databaseId: integer("database_id").notNull().references(() => taskDatabases.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'person', 'file', 'url', 'email', 'phone'
  options: jsonb("options"), // For select/multi-select types, file configurations, etc.
  isRequired: boolean("is_required").default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks (main records in a database)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  databaseId: integer("database_id").notNull().references(() => taskDatabases.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  content: jsonb("content"), // Rich text content for the full-page editor
  properties: jsonb("properties"), // Dynamic property values stored as JSON
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  lastEditedBy: integer("last_edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task assignments for collaboration
export const taskAssignments = pgTable("task_assignments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").default("assignee"), // 'assignee', 'reviewer', 'collaborator'
  assignedBy: integer("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Task comments for collaboration
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references(() => taskComments.id), // For threaded replies
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task file attachments
export const taskAttachments = pgTable("task_attachments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// View configurations for different task views (list, table, kanban)
export const taskViews = pgTable("task_views", {
  id: serial("id").primaryKey(),
  databaseId: integer("database_id").notNull().references(() => taskDatabases.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'list', 'table', 'kanban'
  configuration: jsonb("configuration"), // View-specific settings (visible columns, kanban grouping, etc.)
  filters: jsonb("filters"), // Filter configuration
  sorts: jsonb("sorts"), // Sort configuration
  isDefault: boolean("is_default").default(false),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== NOTES SYSTEM ==========

// Note folders for organizing notes
export const noteFolders = pgTable("note_folders", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }), // null for global folders
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color").default("#6B7280"), // hex color code
  parentId: integer("parent_id").references(() => noteFolders.id), // for nested folders
  sortOrder: integer("sort_order").notNull().default(0),
  isGlobal: boolean("is_global").default(false), // for user-level folders
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notes (Apple Notes/Notion style rich text documents)
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }), // null for global notes
  folderId: integer("folder_id").references(() => noteFolders.id, { onDelete: "set null" }),
  title: varchar("title").notNull(),
  content: jsonb("content"), // Rich text content in TipTap JSON format
  excerpt: text("excerpt"), // Plain text preview for search and display
  isPinned: boolean("is_pinned").default(false),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Array of tags for filtering
  isArchived: boolean("is_archived").default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  lastEditedBy: integer("last_edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Note collaborators for sharing access
export const noteCollaborators = pgTable("note_collaborators", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: varchar("permission").notNull().default("view"), // 'view', 'edit', 'admin'
  invitedBy: integer("invited_by").notNull().references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
});

// Note comments for collaboration
export const noteComments = pgTable("note_comments", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id").references(() => noteComments.id), // For threaded replies
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Note attachments for images and files
export const noteAttachments = pgTable("note_attachments", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  altText: text("alt_text"), // For images
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
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
  // Email system relations
  emailAccounts: many(emailAccounts),
  emailTemplates: many(emailTemplates),
  emailSignatures: many(emailSignatures),
  emailRules: many(emailRules),
  // Phase 5 shared inbox relations
  sharedInboxMemberships: many(sharedInboxMembers),
  assignedEmails: many(emailAssignments, { relationName: "assignedEmails" }),
  emailAssignments: many(emailAssignments, { relationName: "emailAssignments" }),
  emailCollaborations: many(emailCollaborations),
  createdSharedInboxes: many(sharedInboxes),
  createdArchiveRules: many(emailArchiveRules),
  // Performance and rehearsal tracking relations
  contractSettings: many(showContractSettings),
  performanceTracker: many(performanceTracker),
  rehearsalTracker: many(rehearsalTracker),
  // Task management relations
  taskDatabases: many(taskDatabases),
  tasks: many(tasks, { relationName: "createdTasks" }),
  editedTasks: many(tasks, { relationName: "editedTasks" }),
  taskAssignments: many(taskAssignments, { relationName: "userAssignments" }),
  assignedTasks: many(taskAssignments, { relationName: "assignedByUser" }),
  taskComments: many(taskComments),
  taskAttachments: many(taskAttachments),
  taskViews: many(taskViews),
  // Notes system relations
  noteFolders: many(noteFolders),
  notes: many(notes, { relationName: "createdNotes" }),
  editedNotes: many(notes, { relationName: "editedNotes" }),
  noteCollaborators: many(noteCollaborators),
  noteComments: many(noteComments),
  noteAttachments: many(noteAttachments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  projectMembers: many(projectMembers),
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
  eventTypes: many(eventTypes),
  reportNotes: many(reportNotes),
  // Email system relations
  emailAccounts: many(emailAccounts),
  emailThreads: many(emailThreads),
  emailMessages: many(emailMessages),
  emailFolders: many(emailFolders),
  emailRules: many(emailRules),
  emailTemplates: many(emailTemplates),
  // Phase 5 shared inbox relations
  sharedInboxes: many(sharedInboxes),
  emailArchiveRules: many(emailArchiveRules),
  // Performance and rehearsal tracking relations
  contractSettings: many(showContractSettings),
  performanceTracker: many(performanceTracker),
  rehearsalTracker: many(rehearsalTracker),
  // Task management relations
  taskDatabases: many(taskDatabases),
  // Notes system relations
  noteFolders: many(noteFolders),
  notes: many(notes),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
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

export const reportsRelations = relations(reports, ({ one, many }) => ({
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
  notes: many(reportNotes),
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

export const reportNotesRelations = relations(reportNotes, ({ one }) => ({
  report: one(reports, {
    fields: [reportNotes.reportId],
    references: [reports.id],
  }),
  project: one(projects, {
    fields: [reportNotes.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [reportNotes.createdBy],
    references: [users.id],
  }),
  assignedUser: one(users, {
    fields: [reportNotes.assignedTo],
    references: [users.id],
  }),
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

export const eventTypesRelations = relations(eventTypes, ({ one, many }) => ({
  project: one(projects, {
    fields: [eventTypes.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [eventTypes.createdBy],
    references: [users.id],
  }),
  scheduleEvents: many(scheduleEvents),
}));

// ========== SCHEDULE VERSION CONTROL RELATIONS ==========

export const scheduleVersionsRelations = relations(scheduleVersions, ({ one, many }) => ({
  project: one(projects, {
    fields: [scheduleVersions.projectId],
    references: [projects.id],
  }),
  publisher: one(users, {
    fields: [scheduleVersions.publishedBy],
    references: [users.id],
  }),
  notifications: many(scheduleVersionNotifications),
  personalSchedules: many(personalSchedules),
}));

export const personalSchedulesRelations = relations(personalSchedules, ({ one }) => ({
  contact: one(contacts, {
    fields: [personalSchedules.contactId],
    references: [contacts.id],
  }),
  project: one(projects, {
    fields: [personalSchedules.projectId],
    references: [projects.id],
  }),
  currentVersion: one(scheduleVersions, {
    fields: [personalSchedules.currentVersionId],
    references: [scheduleVersions.id],
  }),
}));

export const scheduleVersionNotificationsRelations = relations(scheduleVersionNotifications, ({ one }) => ({
  version: one(scheduleVersions, {
    fields: [scheduleVersionNotifications.versionId],
    references: [scheduleVersions.id],
  }),
  contact: one(contacts, {
    fields: [scheduleVersionNotifications.contactId],
    references: [contacts.id],
  }),
}));

export const scheduleEmailTemplatesRelations = relations(scheduleEmailTemplates, ({ one }) => ({
  project: one(projects, {
    fields: [scheduleEmailTemplates.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [scheduleEmailTemplates.createdBy],
    references: [users.id],
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

// Error logs table for automatic error tracking with enhanced monitoring
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
  
  // Enhanced monitoring fields
  browserInfo: jsonb("browser_info"), // Browser, OS, device details
  userJourney: jsonb("user_journey"), // Last 5 pages/actions before error
  featureContext: varchar("feature_context", { length: 100 }), // Which feature area (calendar, reports, etc.)
  sessionId: varchar("session_id", { length: 100 }), // Session tracking
  errorSignature: varchar("error_signature", { length: 255 }), // For clustering similar errors
  businessImpact: varchar("business_impact", { length: 20 }), // critical, high, medium, low
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Error clusters table for grouping similar errors
export const errorClusters = pgTable("error_clusters", {
  id: serial("id").primaryKey(),
  signature: varchar("signature", { length: 255 }).notNull().unique(),
  firstOccurrence: timestamp("first_occurrence").defaultNow().notNull(),
  lastOccurrence: timestamp("last_occurrence").defaultNow().notNull(),
  occurrenceCount: integer("occurrence_count").default(1).notNull(),
  affectedUsers: integer("affected_users").default(1).notNull(),
  errorType: varchar("error_type", { length: 50 }).notNull(),
  featureContext: varchar("feature_context", { length: 100 }),
  businessImpact: varchar("business_impact", { length: 20 }),
  status: varchar("status", { length: 20 }).default("open").notNull(), // open, investigating, resolved
  assignedTo: integer("assigned_to").references(() => users.id),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(), // critical, high, medium, low
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Error notifications table for proactive alerts
export const errorNotifications = pgTable("error_notifications", {
  id: serial("id").primaryKey(),
  clusterId: integer("cluster_id").references(() => errorClusters.id, { onDelete: "cascade" }),
  errorLogId: integer("error_log_id").references(() => errorLogs.id, { onDelete: "cascade" }),
  notificationType: varchar("notification_type", { length: 50 }).notNull(), // critical_error, cluster_threshold, user_impact
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  readBy: integer("read_by").references(() => users.id),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Waitlist email settings table
export const waitlistEmailSettings = pgTable("waitlist_email_settings", {
  id: serial("id").primaryKey(),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  fromName: varchar("from_name", { length: 100 }).notNull().default("BackstageOS"),
  subject: varchar("subject", { length: 255 }).notNull().default("Welcome to the BackstageOS Waitlist!"),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// API settings table for SendGrid configuration
export const apiSettings = pgTable("api_settings", {
  id: serial("id").primaryKey(),
  sendgridApiKey: varchar("sendgrid_api_key", { length: 255 }),
  senderEmail: varchar("sender_email", { length: 255 }),
  senderName: varchar("sender_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Resolution records table for tracking automatic error resolutions
export const resolutionRecords = pgTable("resolution_records", {
  id: serial("id").primaryKey(),
  errorLogId: integer("error_log_id").notNull().references(() => errorLogs.id, { onDelete: "cascade" }),
  strategy: varchar("strategy", { length: 100 }).notNull(),
  action: text("action").notNull(),
  success: boolean("success").notNull(),
  implementationDetails: jsonb("implementation_details"),
  resolvedAt: timestamp("resolved_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Error resolution status updates for error logs
export const errorResolutionStatus = pgTable("error_resolution_status", {
  id: serial("id").primaryKey(),
  errorLogId: integer("error_log_id").notNull().references(() => errorLogs.id, { onDelete: "cascade" }),
  resolved: boolean("resolved").notNull().default(false),
  resolutionMethod: varchar("resolution_method", { length: 50 }), // 'automatic' | 'manual'
  resolutionStrategy: varchar("resolution_strategy", { length: 100 }),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// Phase 5: Advanced Analytics Tables
export const errorTrends = pgTable("error_trends", {
  id: serial("id").primaryKey(),
  timeFrame: varchar("time_frame", { length: 50 }).notNull(), // '7d', '30d', '90d'
  errorType: varchar("error_type", { length: 100 }).notNull(),
  frequency: integer("frequency").notNull(),
  trend: decimal("trend", { precision: 10, scale: 2 }), // percentage change
  severity: varchar("severity", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  businessImpact: varchar("business_impact", { length: 255 }),
  recommendation: text("recommendation"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const errorCategories = pgTable("error_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  parentCategoryId: integer("parent_category_id"),
  color: varchar("color", { length: 7 }).default("#6b7280"), // hex color
  iconName: varchar("icon_name", { length: 50 }),
  priority: integer("priority").default(0), // for ordering
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSatisfactionMetrics = pgTable("user_satisfaction_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  timeFrame: varchar("time_frame", { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  errorFrequency: integer("error_frequency").default(0),
  satisfactionScore: decimal("satisfaction_score", { precision: 3, scale: 2 }), // 0-10 scale
  lastErrorAt: timestamp("last_error_at"),
  totalErrors: integer("total_errors").default(0),
  resolvedErrors: integer("resolved_errors").default(0),
  criticalErrors: integer("critical_errors").default(0),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const featureStabilityMetrics = pgTable("feature_stability_metrics", {
  id: serial("id").primaryKey(),
  featureName: varchar("feature_name", { length: 100 }).notNull(),
  errorCount: integer("error_count").default(0),
  uniqueUsers: integer("unique_users").default(0),
  avgResolutionTime: integer("avg_resolution_time"), // in minutes
  stabilityScore: decimal("stability_score", { precision: 3, scale: 2 }), // 0-10 scale
  lastErrorAt: timestamp("last_error_at"),
  isActive: boolean("is_active").default(true),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const errorImpactAnalysis = pgTable("error_impact_analysis", {
  id: serial("id").primaryKey(),
  errorClusterId: integer("error_cluster_id").references(() => errorClusters.id),
  affectedUsers: integer("affected_users").notNull(),
  businessFunctionImpact: varchar("business_function_impact", { length: 255 }),
  severityLevel: varchar("severity_level", { length: 20 }).notNull(),
  costEstimate: decimal("cost_estimate", { precision: 12, scale: 2 }),
  workflowDisruption: boolean("workflow_disruption").default(false),
  dataLossRisk: boolean("data_loss_risk").default(false),
  securityImplications: boolean("security_implications").default(false),
  complianceImpact: boolean("compliance_impact").default(false),
  analysisNotes: text("analysis_notes"),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  user: one(users, {
    fields: [errorLogs.userId],
    references: [users.id],
  }),
}));

// ========== EMAIL SYSTEM RELATIONS ==========

export const emailAccountsRelations = relations(emailAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [emailAccounts.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [emailAccounts.projectId],
    references: [projects.id],
  }),
  threads: many(emailThreads),
  messages: many(emailMessages),
  folders: many(emailFolders),
  rules: many(emailRules),
  signatures: many(emailSignatures),
}));

export const emailThreadsRelations = relations(emailThreads, ({ one, many }) => ({
  account: one(emailAccounts, {
    fields: [emailThreads.accountId],
    references: [emailAccounts.id],
  }),
  project: one(projects, {
    fields: [emailThreads.projectId],
    references: [projects.id],
  }),
  messages: many(emailMessages),
  // Phase 5 shared inbox relations
  collaborations: many(emailCollaborations),
}));

export const emailMessagesRelations = relations(emailMessages, ({ one, many }) => ({
  thread: one(emailThreads, {
    fields: [emailMessages.threadId],
    references: [emailThreads.id],
  }),
  account: one(emailAccounts, {
    fields: [emailMessages.accountId],
    references: [emailAccounts.id],
  }),
  relatedShow: one(projects, {
    fields: [emailMessages.relatedShowId],
    references: [projects.id],
  }),
  folder: one(emailFolders, {
    fields: [emailMessages.folderId],
    references: [emailFolders.id],
  }),
  relatedContact: one(contacts, {
    fields: [emailMessages.relatedContactId],
    references: [contacts.id],
  }),
  attachments: many(emailAttachments),
  // Phase 5 shared inbox relations
  assignments: many(emailAssignments),
}));

export const emailFoldersRelations = relations(emailFolders, ({ one, many }) => ({
  account: one(emailAccounts, {
    fields: [emailFolders.accountId],
    references: [emailAccounts.id],
  }),
  project: one(projects, {
    fields: [emailFolders.projectId],
    references: [projects.id],
  }),
  parent: one(emailFolders, {
    fields: [emailFolders.parentId],
    references: [emailFolders.id],
  }),
  children: many(emailFolders),
  messages: many(emailMessages),
}));

export const emailAttachmentsRelations = relations(emailAttachments, ({ one }) => ({
  message: one(emailMessages, {
    fields: [emailAttachments.messageId],
    references: [emailMessages.id],
  }),
}));

export const emailRulesRelations = relations(emailRules, ({ one }) => ({
  account: one(emailAccounts, {
    fields: [emailRules.accountId],
    references: [emailAccounts.id],
  }),
  project: one(projects, {
    fields: [emailRules.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [emailRules.createdBy],
    references: [users.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  user: one(users, {
    fields: [emailTemplates.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [emailTemplates.projectId],
    references: [projects.id],
  }),
}));

export const emailSignaturesRelations = relations(emailSignatures, ({ one }) => ({
  user: one(users, {
    fields: [emailSignatures.userId],
    references: [users.id],
  }),
  account: one(emailAccounts, {
    fields: [emailSignatures.accountId],
    references: [emailAccounts.id],
  }),
}));

export const emailGroupsRelations = relations(emailGroups, ({ one }) => ({
  user: one(users, {
    fields: [emailGroups.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [emailGroups.projectId],
    references: [projects.id],
  }),
}));

// ========== PHASE 5 RELATIONS ==========

export const sharedInboxesRelations = relations(sharedInboxes, ({ one, many }) => ({
  project: one(projects, {
    fields: [sharedInboxes.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [sharedInboxes.createdBy],
    references: [users.id],
  }),
  members: many(sharedInboxMembers),
  assignments: many(emailAssignments),
  collaborations: many(emailCollaborations),
}));

export const sharedInboxMembersRelations = relations(sharedInboxMembers, ({ one }) => ({
  inbox: one(sharedInboxes, {
    fields: [sharedInboxMembers.inboxId],
    references: [sharedInboxes.id],
  }),
  user: one(users, {
    fields: [sharedInboxMembers.userId],
    references: [users.id],
  }),
}));

export const emailAssignmentsRelations = relations(emailAssignments, ({ one }) => ({
  message: one(emailMessages, {
    fields: [emailAssignments.messageId],
    references: [emailMessages.id],
  }),
  inbox: one(sharedInboxes, {
    fields: [emailAssignments.inboxId],
    references: [sharedInboxes.id],
  }),
  assignedUser: one(users, {
    fields: [emailAssignments.assignedTo],
    references: [users.id],
  }),
  assignerUser: one(users, {
    fields: [emailAssignments.assignedBy],
    references: [users.id],
  }),
}));

export const emailCollaborationsRelations = relations(emailCollaborations, ({ one }) => ({
  thread: one(emailThreads, {
    fields: [emailCollaborations.threadId],
    references: [emailThreads.id],
  }),
  user: one(users, {
    fields: [emailCollaborations.userId],
    references: [users.id],
  }),
  inbox: one(sharedInboxes, {
    fields: [emailCollaborations.inboxId],
    references: [sharedInboxes.id],
  }),
}));

// Daily calls relations
export const dailyCallsRelations = relations(dailyCalls, ({ one }) => ({
  project: one(projects, {
    fields: [dailyCalls.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [dailyCalls.createdBy],
    references: [users.id],
  }),
}));

// ========== USER ANALYTICS & COST TRACKING TABLES ==========

// User activity tracking table
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }),
  page: varchar("page", { length: 255 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // click, page_view, form_submit, etc.
  feature: varchar("feature", { length: 100 }), // reports, scripts, props, etc.
  elementClicked: varchar("element_clicked", { length: 255 }),
  duration: integer("duration"), // Time spent on page in seconds
  additionalData: jsonb("additional_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// API cost tracking table
export const apiCosts = pgTable("api_costs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  service: varchar("service", { length: 50 }).notNull(), // sendgrid, openai, cloudflare, etc.
  endpoint: varchar("endpoint", { length: 255 }),
  requestCount: integer("request_count").default(1),
  cost: decimal("cost", { precision: 10, scale: 4 }).notNull(), // Cost in USD with 4 decimal precision
  metadata: jsonb("metadata"), // Additional cost breakdown data
  date: date("date").notNull(), // Date for daily aggregation
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User session tracking
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Session duration in seconds
  pageViews: integer("page_views").default(0),
  actions: integer("actions").default(0),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
});

// Feature usage tracking
export const featureUsage = pgTable("feature_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  feature: varchar("feature", { length: 100 }).notNull(),
  usageCount: integer("usage_count").default(1),
  totalTime: integer("total_time").default(0), // Total time spent in seconds
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  date: date("date").notNull(), // Date for daily aggregation
});

// User engagement scoring system
export const userEngagementScores = pgTable("user_engagement_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  engagementScore: integer("engagement_score").notNull().default(0), // 0-100 scale
  engagementLevel: varchar("engagement_level", { length: 20 }).notNull().default("inactive"), // inactive, low, medium, high, champion
  churnRiskScore: integer("churn_risk_score").notNull().default(0), // 0-100 scale
  churnRiskLevel: varchar("churn_risk_level", { length: 20 }).notNull().default("low"), // low, medium, high, critical
  featureDiversityScore: integer("feature_diversity_score").notNull().default(0), // How many different features used
  sessionConsistencyScore: integer("session_consistency_score").notNull().default(0), // How regular their usage is
  usageTrend: varchar("usage_trend", { length: 20 }).default("stable"), // improving, stable, declining
  lastCalculated: timestamp("last_calculated").defaultNow().notNull(),
  calculationPeriodStart: date("calculation_period_start").notNull(),
  calculationPeriodEnd: date("calculation_period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscription plans for billing system
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // monthly, annual, theatre
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull(),
  priceAnnual: decimal("price_annual", { precision: 10, scale: 2 }),
  features: jsonb("features").notNull(), // Array of included features
  usageLimits: jsonb("usage_limits"), // API calls, storage, team members etc
  trialDays: integer("trial_days").default(30),
  requiresPaymentMethod: boolean("requires_payment_method").default(true),
  stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 100 }),
  stripePriceIdAnnual: varchar("stripe_price_id_annual", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User subscriptions for billing system
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("trialing"), // trialing, active, past_due, canceled, incomplete
  trialStart: date("trial_start"),
  trialEnd: date("trial_end"),
  currentPeriodStart: date("current_period_start"),
  currentPeriodEnd: date("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Analytics relations
export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id],
  }),
}));

export const apiCostsRelations = relations(apiCosts, ({ one }) => ({
  user: one(users, {
    fields: [apiCosts.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const featureUsageRelations = relations(featureUsage, ({ one }) => ({
  user: one(users, {
    fields: [featureUsage.userId],
    references: [users.id],
  }),
}));

// Account Types table (defines different user account categories)
export const accountTypes = pgTable("account_types", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // 'Freelancer', 'Full-Timer', 'Theater Company', etc.
  description: text("description"), // Description of the account type
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billing Plans table (defines available subscription plans)
export const billingPlans = pgTable("billing_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // 'Monthly', 'Annual', 'Theatre'
  planId: varchar("plan_id").unique().notNull(), // 'monthly', 'annual', 'theatre'
  accountTypeId: integer("account_type_id").references(() => accountTypes.id), // Link to account type
  stripeProductId: varchar("stripe_product_id"), // Stripe Product ID (one per plan/profile tier)
  activeStripePriceId: varchar("active_stripe_price_id"), // Currently active Stripe Price ID
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Monthly price
  billingInterval: varchar("billing_interval").notNull(), // 'month', 'year'
  trialDays: integer("trial_days").default(30), // Trial period in days
  features: jsonb("features"), // Array of included features
  maxProjects: integer("max_projects"), // null = unlimited
  maxTeamMembers: integer("max_team_members"), // null = unlimited
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billing Plan Price History table (audit trail for price changes)
export const billingPlanPrices = pgTable("billing_plan_prices", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => billingPlans.id, { onDelete: "cascade" }),
  stripeProductId: varchar("stripe_product_id"), // Associated Stripe Product ID
  stripePriceId: varchar("stripe_price_id").unique().notNull(), // Unique Stripe Price ID
  unitAmount: decimal("unit_amount", { precision: 10, scale: 2 }).notNull(), // Price amount
  currency: varchar("currency").default("usd"),
  billingInterval: varchar("billing_interval").notNull(), // 'month', 'year'
  isActive: boolean("is_active").default(true), // Active in Stripe
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"), // null = current price
  archivedBy: varchar("archived_by"), // Admin note on why archived
  createdAt: timestamp("created_at").defaultNow(),
});

// Billing History table (tracks all billing events)
export const billingHistory = pgTable("billing_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventType: varchar("event_type").notNull(), // 'subscription_created', 'payment_succeeded', 'payment_failed', 'trial_started', 'trial_ended'
  stripeEventId: varchar("stripe_event_id"), // Stripe webhook event ID
  amount: decimal("amount", { precision: 10, scale: 2 }), // Amount charged/refunded
  currency: varchar("currency").default("usd"),
  subscriptionId: varchar("subscription_id"), // Stripe subscription ID
  invoiceId: varchar("invoice_id"), // Stripe invoice ID
  planId: varchar("plan_id"), // Which plan was involved
  metadata: jsonb("metadata"), // Additional event data
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment Methods table (stores customer payment method info)
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  stripePaymentMethodId: varchar("stripe_payment_method_id").notNull(),
  type: varchar("type").notNull(), // 'card', 'bank_account'
  brand: varchar("brand"), // 'visa', 'mastercard', 'amex'
  last4: varchar("last4"), // Last 4 digits of card/account
  expMonth: integer("exp_month"), // Card expiration month
  expYear: integer("exp_year"), // Card expiration year
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription Usage table (tracks feature usage for billing purposes)
export const subscriptionUsage = pgTable("subscription_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  projectsUsed: integer("projects_used").default(0),
  teamMembersUsed: integer("team_members_used").default(0),
  apiCallsUsed: integer("api_calls_used").default(0),
  storageUsed: decimal("storage_used", { precision: 10, scale: 2 }).default("0"), // GB used
  emailsSent: integer("emails_sent").default(0),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Billing relations
export const accountTypesRelations = relations(accountTypes, ({ many }) => ({
  billingPlans: many(billingPlans),
}));

export const billingPlansRelations = relations(billingPlans, ({ one, many }) => ({
  accountType: one(accountTypes, {
    fields: [billingPlans.accountTypeId],
    references: [accountTypes.id],
  }),
  billingHistory: many(billingHistory),
  priceHistory: many(billingPlanPrices),
}));

export const billingPlanPricesRelations = relations(billingPlanPrices, ({ one }) => ({
  plan: one(billingPlans, {
    fields: [billingPlanPrices.planId],
    references: [billingPlans.id],
  }),
}));

export const billingHistoryRelations = relations(billingHistory, ({ one }) => ({
  user: one(users, {
    fields: [billingHistory.userId],
    references: [users.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}));

export const subscriptionUsageRelations = relations(subscriptionUsage, ({ one }) => ({
  user: one(users, {
    fields: [subscriptionUsage.userId],
    references: [users.id],
  }),
}));

export const emailArchiveRulesRelations = relations(emailArchiveRules, ({ one }) => ({
  project: one(projects, {
    fields: [emailArchiveRules.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [emailArchiveRules.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users); // TODO: Fix omit type issue later

export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVenueSchema = createInsertSchema(venues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  invitedAt: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  invitedAt: true,
  joinedAt: true,
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

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

// V2 Template System Insert Schemas
export const insertReportTemplateV2Schema = createInsertSchema(reportTemplatesV2).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSectionSchema = createInsertSchema(templateSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateFieldSchema = createInsertSchema(templateFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportTypeSchema = createInsertSchema(reportTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportNoteSchema = createInsertSchema(reportNotes).omit({
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
  equityStatus: z.union([z.enum(["equity", "non-equity"]), z.null()]).optional(),
});

export const insertEmailContactSchema = createInsertSchema(emailContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactAvailabilitySchema = createInsertSchema(contactAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDistributionListSchema = createInsertSchema(distributionLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDistributionListMemberSchema = createInsertSchema(distributionListMembers).omit({
  id: true,
  createdAt: true,
});

export const insertReportTypeDistributionListSchema = createInsertSchema(reportTypeDistributionLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactGroupSchema = createInsertSchema(contactGroups).omit({
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

export const insertEventTypeSchema = createInsertSchema(eventTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schedule versioning insert schemas
export const insertScheduleVersionSchema = createInsertSchema(scheduleVersions).omit({
  id: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonalScheduleSchema = createInsertSchema(personalSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleVersionNotificationSchema = createInsertSchema(scheduleVersionNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleEmailTemplateSchema = createInsertSchema(scheduleEmailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schedule template insert schemas
export const insertScheduleTemplateSchema = createInsertSchema(scheduleTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleTemplateEventSchema = createInsertSchema(scheduleTemplateEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleTemplateEventParticipantSchema = createInsertSchema(scheduleTemplateEventParticipants).omit({
  id: true,
  createdAt: true,
});

// Types
export type ContactAvailability = typeof contactAvailability.$inferSelect;
export type InsertContactAvailability = z.infer<typeof insertContactAvailabilitySchema>;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type ScheduleEventParticipant = typeof scheduleEventParticipants.$inferSelect;
export type InsertScheduleEventParticipant = z.infer<typeof insertScheduleEventParticipantSchema>;
export type ReportNote = typeof reportNotes.$inferSelect;
export type InsertReportNote = z.infer<typeof insertReportNoteSchema>;
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;
export type InsertScheduleTemplate = z.infer<typeof insertScheduleTemplateSchema>;
export type ScheduleTemplateEvent = typeof scheduleTemplateEvents.$inferSelect;
export type InsertScheduleTemplateEvent = z.infer<typeof insertScheduleTemplateEventSchema>;
export type ScheduleTemplateEventParticipant = typeof scheduleTemplateEventParticipants.$inferSelect;
export type InsertScheduleTemplateEventParticipant = z.infer<typeof insertScheduleTemplateEventParticipantSchema>;

export const insertContactSheetVersionSchema = createInsertSchema(contactSheetVersions).omit({
  id: true,
  publishedAt: true,
});

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  createdAt: true,
});

export const insertErrorClusterSchema = createInsertSchema(errorClusters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertErrorNotificationSchema = createInsertSchema(errorNotifications).omit({
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

export const insertCostumeSchema = createInsertSchema(costumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// SEO Configuration table with AI optimization
export const seoSettings = pgTable("seo_settings", {
  id: serial("id").primaryKey(),
  domain: varchar("domain").notNull().unique(), // e.g., "backstageos.com", "beta.backstageos.com"
  siteTitle: varchar("site_title").notNull(),
  siteDescription: text("site_description").notNull(),
  keywords: text("keywords"), // comma-separated keywords
  faviconUrl: varchar("favicon_url"),
  appleTouchIconUrl: varchar("apple_touch_icon_url"),
  shareImageUrl: varchar("share_image_url"), // Open Graph image
  shareImageAlt: varchar("share_image_alt"),
  twitterCard: varchar("twitter_card").default("summary_large_image"), // summary, summary_large_image
  twitterHandle: varchar("twitter_handle"), // @username
  author: varchar("author"),
  themeColor: varchar("theme_color").default("#2563eb"), // hex color for browser theme
  customMeta: jsonb("custom_meta"), // Additional meta tags as JSON
  openGraphType: varchar("og_type").default("website"), // website, article, etc.
  
  // AI Optimization Fields
  structuredData: jsonb("structured_data"), // JSON-LD schema markup for AI/search engines
  aiDescription: text("ai_description"), // Optimized description for AI systems
  semanticKeywords: text("semantic_keywords"), // LSI and semantic keywords for AI understanding
  contentCategories: text("content_categories"), // comma-separated content categories
  targetAudience: varchar("target_audience"), // primary audience description
  industryVertical: varchar("industry_vertical"), // theater, entertainment, production
  functionalityTags: text("functionality_tags"), // what the app does (comma-separated)
  aiMetadata: jsonb("ai_metadata"), // Additional AI-specific metadata
  robotsDirectives: text("robots_directives").default("index, follow"), // robots meta tag
  canonicalUrl: varchar("canonical_url"), // canonical URL for duplicate content
  languageCode: varchar("language_code").default("en-US"), // language for AI understanding
  geoTargeting: varchar("geo_targeting"), // geographic targeting info
  
  // BIMI (Brand Indicators for Message Identification) Configuration
  bimiLogoUrl: varchar("bimi_logo_url"), // URL to SVG logo for BIMI
  bimiLogoAlt: varchar("bimi_logo_alt"), // Alt text for BIMI logo
  bimiVmcUrl: varchar("bimi_vmc_url"), // URL to Verified Mark Certificate (optional)
  bimiSelector: varchar("bimi_selector").default("default"), // BIMI selector (usually "default")
  bimiEnabled: boolean("bimi_enabled").default(false), // Enable/disable BIMI record creation
  
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const seoSettingsRelations = relations(seoSettings, ({ one }) => ({
  creator: one(users, {
    fields: [seoSettings.createdBy],
    references: [users.id],
  }),
}));

export const insertSeoSettingsSchema = createInsertSchema(seoSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWaitlistEmailSettingsSchema = createInsertSchema(waitlistEmailSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiSettingsSchema = createInsertSchema(apiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResolutionRecordSchema = createInsertSchema(resolutionRecords).omit({
  id: true,
  resolvedAt: true,
  createdAt: true,
});

export const insertErrorResolutionStatusSchema = createInsertSchema(errorResolutionStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Phase 5: Advanced Analytics Insert Schemas
export const insertErrorTrendSchema = createInsertSchema(errorTrends).omit({
  id: true,
  calculatedAt: true,
});

export const insertErrorCategorySchema = createInsertSchema(errorCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSatisfactionMetricSchema = createInsertSchema(userSatisfactionMetrics).omit({
  id: true,
  calculatedAt: true,
});

export const insertFeatureStabilityMetricSchema = createInsertSchema(featureStabilityMetrics).omit({
  id: true,
  calculatedAt: true,
});

export const insertErrorImpactAnalysisSchema = createInsertSchema(errorImpactAnalysis).omit({
  id: true,
  analyzedAt: true,
});

// Account Types insert schemas
export const insertAccountTypeSchema = createInsertSchema(accountTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Billing insert schemas
export const insertBillingPlanSchema = createInsertSchema(billingPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Accept price as number from frontend and transform to string for database
  price: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertBillingPlanPriceSchema = createInsertSchema(billingPlanPrices).omit({
  id: true,
  createdAt: true,
}).extend({
  unitAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export const insertBillingHistorySchema = createInsertSchema(billingHistory).omit({
  id: true,
  processedAt: true,
  createdAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionUsageSchema = createInsertSchema(subscriptionUsage).omit({
  id: true,
  recordedAt: true,
});



// Type exports
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AccountType = typeof accountTypes.$inferSelect;
export type InsertAccountType = z.infer<typeof insertAccountTypeSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;
export type ReportTemplateV2 = typeof reportTemplatesV2.$inferSelect;
export type InsertReportTemplateV2 = z.infer<typeof insertReportTemplateV2Schema>;
export type TemplateSection = typeof templateSections.$inferSelect;
export type InsertTemplateSection = z.infer<typeof insertTemplateSectionSchema>;
export type TemplateField = typeof templateFields.$inferSelect;
export type InsertTemplateField = z.infer<typeof insertTemplateFieldSchema>;
export type ReportType = typeof reportTypes.$inferSelect;
export type InsertReportType = z.infer<typeof insertReportTypeSchema>;
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
export type EmailContact = typeof emailContacts.$inferSelect;
export type InsertEmailContact = z.infer<typeof insertEmailContactSchema>;
export type DistributionList = typeof distributionLists.$inferSelect;
export type InsertDistributionList = z.infer<typeof insertDistributionListSchema>;
export type DistributionListMember = typeof distributionListMembers.$inferSelect;
export type InsertDistributionListMember = z.infer<typeof insertDistributionListMemberSchema>;
export type ContactGroup = typeof contactGroups.$inferSelect;
export type InsertContactGroup = z.infer<typeof insertContactGroupSchema>;
export type DomainRoute = typeof domainRoutes.$inferSelect;
export type InsertDomainRoute = z.infer<typeof insertDomainRouteSchema>;
export type ErrorLog = typeof errorLogs.$inferSelect & {
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
};
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
export type ErrorCluster = typeof errorClusters.$inferSelect;
export type InsertErrorCluster = z.infer<typeof insertErrorClusterSchema>;
export type ErrorNotification = typeof errorNotifications.$inferSelect;
export type InsertErrorNotification = z.infer<typeof insertErrorNotificationSchema>;
export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type EventLocation = typeof eventLocations.$inferSelect;
export type InsertEventLocation = z.infer<typeof insertEventLocationSchema>;
export type EventType = typeof eventTypes.$inferSelect;
export type InsertEventType = z.infer<typeof insertEventTypeSchema>;
export type LocationAvailability = typeof locationAvailability.$inferSelect;
export type InsertLocationAvailability = z.infer<typeof insertLocationAvailabilitySchema>;
export type Prop = typeof props.$inferSelect;
export type InsertProp = z.infer<typeof insertPropsSchema>;
export type Costume = typeof costumes.$inferSelect;
export type InsertCostume = z.infer<typeof insertCostumeSchema>;
export type SeoSettings = typeof seoSettings.$inferSelect;
export type InsertSeoSettings = z.infer<typeof insertSeoSettingsSchema>;
export type WaitlistEmailSettings = typeof waitlistEmailSettings.$inferSelect;
export type InsertWaitlistEmailSettings = z.infer<typeof insertWaitlistEmailSettingsSchema>;
export type ApiSettings = typeof apiSettings.$inferSelect;
export type InsertApiSettings = z.infer<typeof insertApiSettingsSchema>;

// Schedule versioning types
export type ScheduleVersion = typeof scheduleVersions.$inferSelect;
export type InsertScheduleVersion = z.infer<typeof insertScheduleVersionSchema>;
export type PersonalSchedule = typeof personalSchedules.$inferSelect;
export type InsertPersonalSchedule = z.infer<typeof insertPersonalScheduleSchema>;
export type ScheduleVersionNotification = typeof scheduleVersionNotifications.$inferSelect;
export type InsertScheduleVersionNotification = z.infer<typeof insertScheduleVersionNotificationSchema>;
export type ScheduleEmailTemplate = typeof scheduleEmailTemplates.$inferSelect;
export type InsertScheduleEmailTemplate = z.infer<typeof insertScheduleEmailTemplateSchema>;

// Phase 5: Google Calendar Integration
export const googleCalendarIntegrations = pgTable("google_calendar_integrations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  calendarId: text("calendar_id").notNull(),
  calendarName: text("calendar_name").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry"),
  isActive: boolean("is_active").default(true),
  syncSettings: jsonb("sync_settings").$type<{
    syncPersonalSchedules: boolean;
    syncEventTypes: string[];
    defaultReminders: { method: string; minutes: number }[];
  }>().default({
    syncPersonalSchedules: true,
    syncEventTypes: [],
    defaultReminders: [{ method: 'email', minutes: 15 }]
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Public Calendar Sharing
export const publicCalendarShares = pgTable("public_calendar_shares", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at"), // Optional expiration
  isActive: boolean("is_active").default(true),
  lastAccessed: timestamp("last_accessed"),
  accessCount: integer("access_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event type calendar subscriptions for public access
export const eventTypeCalendarShares = pgTable("event_type_calendar_shares", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  eventTypeName: varchar("event_type_name").notNull(), // "Show Schedule", "Meetings", "Costume Fittings", etc.
  eventTypeCategory: varchar("event_type_category").notNull(), // "show_schedule", "individual"
  token: text("token").notNull().unique(),
  isActive: boolean("is_active").default(true),
  lastAccessed: timestamp("last_accessed"),
  accessCount: integer("access_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 5: Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  scheduleUpdates: boolean("schedule_updates").default(true),
  majorVersionsOnly: boolean("major_versions_only").default(false),
  emailEnabled: boolean("email_enabled").default(true),
  calendarSync: boolean("calendar_sync").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 5: Schedule Version Comparisons
export const scheduleVersionComparisons = pgTable("schedule_version_comparisons", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fromVersionId: integer("from_version_id").notNull().references(() => scheduleVersions.id, { onDelete: "cascade" }),
  toVersionId: integer("to_version_id").notNull().references(() => scheduleVersions.id, { onDelete: "cascade" }),
  comparisonData: jsonb("comparison_data").$type<{
    added: any[];
    modified: any[];
    removed: any[];
    summary: {
      totalChanges: number;
      eventsAdded: number;
      eventsModified: number;
      eventsRemoved: number;
    };
  }>(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced email template categories
export const emailTemplateCategories = pgTable("email_template_categories", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3b82f6"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for Phase 5
export const googleCalendarIntegrationsRelations = relations(googleCalendarIntegrations, ({ one }) => ({
  project: one(projects, {
    fields: [googleCalendarIntegrations.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [googleCalendarIntegrations.userId],
    references: [users.id],
  }),
}));

export const publicCalendarSharesRelations = relations(publicCalendarShares, ({ one }) => ({
  project: one(projects, {
    fields: [publicCalendarShares.projectId],
    references: [projects.id],
  }),
  contact: one(contacts, {
    fields: [publicCalendarShares.contactId],
    references: [contacts.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  contact: one(contacts, {
    fields: [notificationPreferences.contactId],
    references: [contacts.id],
  }),
  project: one(projects, {
    fields: [notificationPreferences.projectId],
    references: [projects.id],
  }),
}));

export const scheduleVersionComparisonsRelations = relations(scheduleVersionComparisons, ({ one }) => ({
  project: one(projects, {
    fields: [scheduleVersionComparisons.projectId],
    references: [projects.id],
  }),
  fromVersion: one(scheduleVersions, {
    fields: [scheduleVersionComparisons.fromVersionId],
    references: [scheduleVersions.id],
  }),
  toVersion: one(scheduleVersions, {
    fields: [scheduleVersionComparisons.toVersionId],
    references: [scheduleVersions.id],
  }),
  creator: one(users, {
    fields: [scheduleVersionComparisons.createdBy],
    references: [users.id],
  }),
}));

export const emailTemplateCategoriesRelations = relations(emailTemplateCategories, ({ one, many }) => ({
  project: one(projects, {
    fields: [emailTemplateCategories.projectId],
    references: [projects.id],
  }),
  templates: many(scheduleEmailTemplates),
}));

// Insert schemas for Phase 5
export const insertGoogleCalendarIntegrationSchema = createInsertSchema(googleCalendarIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleVersionComparisonSchema = createInsertSchema(scheduleVersionComparisons).omit({
  id: true,
  createdAt: true,
});

export const insertEmailTemplateCategorySchema = createInsertSchema(emailTemplateCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPublicCalendarShareSchema = createInsertSchema(publicCalendarShares).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventTypeCalendarShareSchema = createInsertSchema(eventTypeCalendarShares).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Relations for event type calendar shares
export const eventTypeCalendarSharesRelations = relations(eventTypeCalendarShares, ({ one }) => ({
  project: one(projects, {
    fields: [eventTypeCalendarShares.projectId],
    references: [projects.id],
  }),
}));

// Types for Phase 5
export type GoogleCalendarIntegration = typeof googleCalendarIntegrations.$inferSelect;
export type InsertGoogleCalendarIntegration = z.infer<typeof insertGoogleCalendarIntegrationSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type ScheduleVersionComparison = typeof scheduleVersionComparisons.$inferSelect;
export type InsertScheduleVersionComparison = z.infer<typeof insertScheduleVersionComparisonSchema>;
export type EmailTemplateCategory = typeof emailTemplateCategories.$inferSelect;
export type InsertEmailTemplateCategory = z.infer<typeof insertEmailTemplateCategorySchema>;
export type PublicCalendarShare = typeof publicCalendarShares.$inferSelect;
export type InsertPublicCalendarShare = z.infer<typeof insertPublicCalendarShareSchema>;
export type EventTypeCalendarShare = typeof eventTypeCalendarShares.$inferSelect;
export type InsertEventTypeCalendarShare = z.infer<typeof insertEventTypeCalendarShareSchema>;

// Performance and Rehearsal Tracking System (AEA Contract Management)
// Only activates if at least one cast member has equityStatus = "equity"

// Show contract settings for AEA rules
export const showContractSettings = pgTable("show_contract_settings", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  contractType: varchar("contract_type").notNull(), // "Production", "LORT A", "LORT B", "LORT C", "LORT D", "SPT Tier 1", ..., "SPT Tier 10"
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  understudyBump: decimal("understudy_bump", { precision: 10, scale: 2 }).notNull(),
  swingBump: decimal("swing_bump", { precision: 10, scale: 2 }),
  swingBumpRule: text("swing_bump_rule"), // For Production contracts with complex rules
  partialSwingIncrement: decimal("partial_swing_increment", { precision: 10, scale: 2 }),
  rehearsalCap: integer("rehearsal_cap").notNull(), // weekly hour limit
  overtimeTrigger: varchar("overtime_trigger").notNull(), // "Above X hours/week"
  rulebookPdfUrl: varchar("rulebook_pdf_url"), // Placeholder for Phase 2
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Performance tracking for Equity actors only
export const performanceTracker = pgTable("performance_tracker", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  contractSettingsId: integer("contract_settings_id").notNull().references(() => showContractSettings.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  rolePlayed: varchar("role_played").notNull(),
  coverType: varchar("cover_type").notNull().default("None"), // "Assigned", "Emergency", "None"
  trackType: varchar("track_type").notNull().default("Principal"), // "Principal", "Swing", "Ensemble"
  multiTrackBonus: boolean("multi_track_bonus").default(false), // true if 5+ tracks performed
  calculatedPayBump: decimal("calculated_pay_bump", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rehearsal tracking for Equity actors only
export const rehearsalTracker = pgTable("rehearsal_tracker", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  contractSettingsId: integer("contract_settings_id").notNull().references(() => showContractSettings.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  rehearsalType: varchar("rehearsal_type").notNull().default("General"), // "Understudy", "Dance", "Fight", "General"
  roleRehearsed: varchar("role_rehearsed").notNull(),
  duration: decimal("duration", { precision: 4, scale: 2 }).notNull(), // hours
  paidRehearsal: boolean("paid_rehearsal").default(false), // auto-flagged if hours exceed cap
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for new tables
export const insertShowContractSettingsSchema = createInsertSchema(showContractSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPerformanceTrackerSchema = createInsertSchema(performanceTracker).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRehearsalTrackerSchema = createInsertSchema(rehearsalTracker).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas for analytics tables
export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  createdAt: true,
});

export const insertApiCostSchema = createInsertSchema(apiCosts).omit({
  id: true,
  createdAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
});

export const insertFeatureUsageSchema = createInsertSchema(featureUsage).omit({
  id: true,
});

// Type exports for new tables
export type ShowContractSettings = typeof showContractSettings.$inferSelect;
export type InsertShowContractSettings = z.infer<typeof insertShowContractSettingsSchema>;
export type PerformanceTracker = typeof performanceTracker.$inferSelect;
export type InsertPerformanceTracker = z.infer<typeof insertPerformanceTrackerSchema>;
export type RehearsalTracker = typeof rehearsalTracker.$inferSelect;
export type InsertRehearsalTracker = z.infer<typeof insertRehearsalTrackerSchema>;

// Analytics types
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type ApiCost = typeof apiCosts.$inferSelect;
export type InsertApiCost = z.infer<typeof insertApiCostSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type FeatureUsage = typeof featureUsage.$inferSelect;
export type InsertFeatureUsage = z.infer<typeof insertFeatureUsageSchema>;

// Billing types
export type BillingPlan = typeof billingPlans.$inferSelect;
export type InsertBillingPlan = z.infer<typeof insertBillingPlanSchema>;
export type BillingPlanPrice = typeof billingPlanPrices.$inferSelect;
export type InsertBillingPlanPrice = z.infer<typeof insertBillingPlanPriceSchema>;
export type BillingHistory = typeof billingHistory.$inferSelect;
export type InsertBillingHistory = z.infer<typeof insertBillingHistorySchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type SubscriptionUsage = typeof subscriptionUsage.$inferSelect;
export type InsertSubscriptionUsage = z.infer<typeof insertSubscriptionUsageSchema>;

// ========== EMAIL SYSTEM ZODS AND TYPES ==========

// Email Account Schemas
export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailFolderSchema = createInsertSchema(emailFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailAttachmentSchema = createInsertSchema(emailAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertEmailRuleSchema = createInsertSchema(emailRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSignatureSchema = createInsertSchema(emailSignatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailSyncJobSchema = createInsertSchema(emailSyncJobs).omit({
  id: true,
  createdAt: true,
});

export const insertEmailQueueSchema = createInsertSchema(emailQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
});

export const insertEmailGroupSchema = createInsertSchema(emailGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========== PHASE 5 SHARED INBOX SCHEMAS ==========

export const insertSharedInboxSchema = createInsertSchema(sharedInboxes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSharedInboxMemberSchema = createInsertSchema(sharedInboxMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertEmailAssignmentSchema = createInsertSchema(emailAssignments).omit({
  id: true,
  assignedAt: true,
  updatedAt: true,
});

export const insertEmailCollaborationSchema = createInsertSchema(emailCollaborations).omit({
  id: true,
  joinedAt: true,
});

export const insertEmailArchiveRuleSchema = createInsertSchema(emailArchiveRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Email System Types
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;
export type EmailThread = typeof emailThreads.$inferSelect;
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;
export type EmailFolder = typeof emailFolders.$inferSelect;
export type InsertEmailFolder = z.infer<typeof insertEmailFolderSchema>;
export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;
export type EmailRule = typeof emailRules.$inferSelect;
export type InsertEmailRule = z.infer<typeof insertEmailRuleSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailSignature = typeof emailSignatures.$inferSelect;
export type InsertEmailSignature = z.infer<typeof insertEmailSignatureSchema>;
export type EmailSyncJob = typeof emailSyncJobs.$inferSelect;
export type InsertEmailSyncJob = z.infer<typeof insertEmailSyncJobSchema>;
export type EmailQueueItem = typeof emailQueue.$inferSelect;
export type InsertEmailQueueItem = z.infer<typeof insertEmailQueueSchema>;
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;
export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;
export type EmailGroup = typeof emailGroups.$inferSelect;
export type InsertEmailGroup = z.infer<typeof insertEmailGroupSchema>;

// ========== PHASE 5 SHARED INBOX TYPES ==========

export type SharedInbox = typeof sharedInboxes.$inferSelect;
export type InsertSharedInbox = z.infer<typeof insertSharedInboxSchema>;
export type SharedInboxMember = typeof sharedInboxMembers.$inferSelect;
export type InsertSharedInboxMember = z.infer<typeof insertSharedInboxMemberSchema>;
export type EmailAssignment = typeof emailAssignments.$inferSelect;
export type InsertEmailAssignment = z.infer<typeof insertEmailAssignmentSchema>;
export type EmailCollaboration = typeof emailCollaborations.$inferSelect;
export type InsertEmailCollaboration = z.infer<typeof insertEmailCollaborationSchema>;
export type EmailArchiveRule = typeof emailArchiveRules.$inferSelect;
export type InsertEmailArchiveRule = z.infer<typeof insertEmailArchiveRuleSchema>;

// Performance and Rehearsal Tracking Relations
export const showContractSettingsRelations = relations(showContractSettings, ({ one, many }) => ({
  project: one(projects, {
    fields: [showContractSettings.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [showContractSettings.createdBy],
    references: [users.id],
  }),
  performanceEntries: many(performanceTracker),
  rehearsalEntries: many(rehearsalTracker),
}));

export const performanceTrackerRelations = relations(performanceTracker, ({ one }) => ({
  project: one(projects, {
    fields: [performanceTracker.projectId],
    references: [projects.id],
  }),
  contractSettings: one(showContractSettings, {
    fields: [performanceTracker.contractSettingsId],
    references: [showContractSettings.id],
  }),
  contact: one(contacts, {
    fields: [performanceTracker.contactId],
    references: [contacts.id],
  }),
  creator: one(users, {
    fields: [performanceTracker.createdBy],
    references: [users.id],
  }),
}));

export const rehearsalTrackerRelations = relations(rehearsalTracker, ({ one }) => ({
  project: one(projects, {
    fields: [rehearsalTracker.projectId],
    references: [projects.id],
  }),
  contractSettings: one(showContractSettings, {
    fields: [rehearsalTracker.contractSettingsId],
    references: [showContractSettings.id],
  }),
  contact: one(contacts, {
    fields: [rehearsalTracker.contactId],
    references: [contacts.id],
  }),
  creator: one(users, {
    fields: [rehearsalTracker.createdBy],
    references: [users.id],
  }),
}));

// ========== TASK MANAGEMENT RELATIONS ==========

export const taskDatabasesRelations = relations(taskDatabases, ({ one, many }) => ({
  project: one(projects, {
    fields: [taskDatabases.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [taskDatabases.createdBy],
    references: [users.id],
  }),
  properties: many(taskProperties),
  tasks: many(tasks),
  views: many(taskViews),
}));

export const taskPropertiesRelations = relations(taskProperties, ({ one }) => ({
  database: one(taskDatabases, {
    fields: [taskProperties.databaseId],
    references: [taskDatabases.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  database: one(taskDatabases, {
    fields: [tasks.databaseId],
    references: [taskDatabases.id],
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  lastEditor: one(users, {
    fields: [tasks.lastEditedBy],
    references: [users.id],
  }),
  assignments: many(taskAssignments),
  comments: many(taskComments),
  attachments: many(taskAttachments),
}));

export const taskAssignmentsRelations = relations(taskAssignments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskAssignments.userId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [taskAssignments.assignedBy],
    references: [users.id],
  }),
}));

export const taskCommentsRelations = relations(taskComments, ({ one, many }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  creator: one(users, {
    fields: [taskComments.createdBy],
    references: [users.id],
  }),
  parent: one(taskComments, {
    fields: [taskComments.parentId],
    references: [taskComments.id],
  }),
  replies: many(taskComments),
}));

export const taskAttachmentsRelations = relations(taskAttachments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAttachments.taskId],
    references: [tasks.id],
  }),
  uploader: one(users, {
    fields: [taskAttachments.uploadedBy],
    references: [users.id],
  }),
}));

export const taskViewsRelations = relations(taskViews, ({ one }) => ({
  database: one(taskDatabases, {
    fields: [taskViews.databaseId],
    references: [taskDatabases.id],
  }),
  creator: one(users, {
    fields: [taskViews.createdBy],
    references: [users.id],
  }),
}));

// ========== NOTES SYSTEM RELATIONS ==========

export const noteFoldersRelations = relations(noteFolders, ({ one, many }) => ({
  project: one(projects, {
    fields: [noteFolders.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [noteFolders.createdBy],
    references: [users.id],
  }),
  parentFolder: one(noteFolders, {
    fields: [noteFolders.parentId],
    references: [noteFolders.id],
  }),
  notes: many(notes),
  subFolders: many(noteFolders),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  project: one(projects, {
    fields: [notes.projectId],
    references: [projects.id],
  }),
  folder: one(noteFolders, {
    fields: [notes.folderId],
    references: [noteFolders.id],
  }),
  creator: one(users, {
    fields: [notes.createdBy],
    references: [users.id],
  }),
  lastEditor: one(users, {
    fields: [notes.lastEditedBy],
    references: [users.id],
  }),
  collaborators: many(noteCollaborators),
  comments: many(noteComments),
  attachments: many(noteAttachments),
}));

export const noteCollaboratorsRelations = relations(noteCollaborators, ({ one }) => ({
  note: one(notes, {
    fields: [noteCollaborators.noteId],
    references: [notes.id],
  }),
  user: one(users, {
    fields: [noteCollaborators.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [noteCollaborators.invitedBy],
    references: [users.id],
  }),
}));

export const noteCommentsRelations = relations(noteComments, ({ one, many }) => ({
  note: one(notes, {
    fields: [noteComments.noteId],
    references: [notes.id],
  }),
  creator: one(users, {
    fields: [noteComments.createdBy],
    references: [users.id],
  }),
  parentComment: one(noteComments, {
    fields: [noteComments.parentId],
    references: [noteComments.id],
  }),
  replies: many(noteComments),
}));

export const noteAttachmentsRelations = relations(noteAttachments, ({ one }) => ({
  note: one(notes, {
    fields: [noteAttachments.noteId],
    references: [notes.id],
  }),
  uploader: one(users, {
    fields: [noteAttachments.uploadedBy],
    references: [users.id],
  }),
}));

// ========== TASK MANAGEMENT INSERT SCHEMAS & TYPES ==========

export const insertTaskDatabaseSchema = createInsertSchema(taskDatabases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskPropertySchema = createInsertSchema(taskProperties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskAttachmentSchema = createInsertSchema(taskAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertTaskViewSchema = createInsertSchema(taskViews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========== NOTES SYSTEM INSERT SCHEMAS ==========

export const insertNoteFolderSchema = createInsertSchema(noteFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNoteCollaboratorSchema = createInsertSchema(noteCollaborators).omit({
  id: true,
  invitedAt: true,
});

export const insertNoteCommentSchema = createInsertSchema(noteComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNoteAttachmentSchema = createInsertSchema(noteAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertDailyCallSchema = createInsertSchema(dailyCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Task management types
export type TaskDatabase = typeof taskDatabases.$inferSelect;
export type InsertTaskDatabase = z.infer<typeof insertTaskDatabaseSchema>;
export type TaskProperty = typeof taskProperties.$inferSelect;
export type InsertTaskProperty = z.infer<typeof insertTaskPropertySchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;
export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;
export type TaskAttachment = typeof taskAttachments.$inferSelect;
export type InsertTaskAttachment = z.infer<typeof insertTaskAttachmentSchema>;
export type TaskView = typeof taskViews.$inferSelect;
export type InsertTaskView = z.infer<typeof insertTaskViewSchema>;

// ========== NOTES SYSTEM TYPES ==========

export type NoteFolder = typeof noteFolders.$inferSelect;
export type InsertNoteFolder = z.infer<typeof insertNoteFolderSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type NoteCollaborator = typeof noteCollaborators.$inferSelect;
export type InsertNoteCollaborator = z.infer<typeof insertNoteCollaboratorSchema>;
export type NoteComment = typeof noteComments.$inferSelect;
export type InsertNoteComment = z.infer<typeof insertNoteCommentSchema>;
export type NoteAttachment = typeof noteAttachments.$inferSelect;
export type InsertNoteAttachment = z.infer<typeof insertNoteAttachmentSchema>;

// ========== DAILY CALLS TYPES ==========

export type DailyCall = typeof dailyCalls.$inferSelect;
export type InsertDailyCall = z.infer<typeof insertDailyCallSchema>;

// ========== SEARCH SYSTEM ==========

// Search indexes for full-text search optimization
export const searchIndexes = pgTable("search_indexes", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type").notNull(), // 'event', 'contact', 'report', 'prop', 'costume', 'script', 'email', 'note'
  entityId: integer("entity_id").notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  searchVector: text("search_vector"), // Full-text search vector
  metadata: jsonb("metadata").notNull().default('{}'),
  relevanceBoost: decimal("relevance_boost").default("1.0"), // Boost factor for search ranking
  isActive: boolean("is_active").default(true),
  lastIndexed: timestamp("last_indexed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Search history for users
export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  queryType: varchar("query_type").notNull(), // 'natural', 'advanced'
  filters: jsonb("filters").default('[]'),
  resultCount: integer("result_count").default(0),
  clickedResultId: varchar("clicked_result_id"), // Track which result was clicked
  responseTime: integer("response_time"), // Search response time in ms
  createdAt: timestamp("created_at").defaultNow(),
});

// Search suggestions for autocomplete
export const searchSuggestions = pgTable("search_suggestions", {
  id: serial("id").primaryKey(),
  text: varchar("text").notNull(),
  type: varchar("type").notNull(), // 'entity', 'action', 'filter'
  category: varchar("category"), // 'person', 'event', 'prop', etc.
  popularity: integer("popularity").default(1),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  isGlobal: boolean("is_global").default(false), // Global suggestions vs project-specific
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Search analytics for performance monitoring
export const searchAnalytics = pgTable("search_analytics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  totalSearches: integer("total_searches").default(0),
  naturalLanguageSearches: integer("natural_language_searches").default(0),
  advancedSearches: integer("advanced_searches").default(0),
  avgResponseTime: decimal("avg_response_time"),
  uniqueUsers: integer("unique_users").default(0),
  popularQueries: jsonb("popular_queries").default('[]'),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== SEARCH SYSTEM RELATIONS ==========

export const searchIndexesRelations = relations(searchIndexes, ({ one }) => ({
  project: one(projects, {
    fields: [searchIndexes.projectId],
    references: [projects.id],
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],  
    references: [users.id],
  }),
}));

export const searchSuggestionsRelations = relations(searchSuggestions, ({ one }) => ({
  project: one(projects, {
    fields: [searchSuggestions.projectId],
    references: [projects.id],
  }),
}));

// ========== SEARCH SYSTEM INSERT SCHEMAS ==========

export const insertSearchIndexSchema = createInsertSchema(searchIndexes).omit({
  id: true,
  lastIndexed: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  createdAt: true,
});

export const insertSearchSuggestionSchema = createInsertSchema(searchSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics).omit({
  id: true,
  createdAt: true,
});

// ========== SEARCH SYSTEM TYPES ==========

export type SearchIndex = typeof searchIndexes.$inferSelect;
export type InsertSearchIndex = z.infer<typeof insertSearchIndexSchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchSuggestion = typeof searchSuggestions.$inferSelect;
export type InsertSearchSuggestion = z.infer<typeof insertSearchSuggestionSchema>;
export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;