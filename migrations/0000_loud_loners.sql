CREATE TABLE "account_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"service" varchar(50) NOT NULL,
	"endpoint" varchar(255),
	"request_count" integer DEFAULT 1,
	"cost" numeric(10, 4) NOT NULL,
	"metadata" jsonb,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sendgrid_api_key" varchar(255),
	"sender_email" varchar(255),
	"sender_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beta_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"features" jsonb NOT NULL,
	"updated_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "billing_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" varchar NOT NULL,
	"stripe_event_id" varchar,
	"amount" numeric(10, 2),
	"currency" varchar DEFAULT 'usd',
	"subscription_id" varchar,
	"invoice_id" varchar,
	"plan_id" varchar,
	"metadata" jsonb,
	"processed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "billing_plan_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"stripe_product_id" varchar,
	"stripe_price_id" varchar NOT NULL,
	"unit_amount" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'usd',
	"billing_interval" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"valid_from" timestamp DEFAULT now(),
	"valid_until" timestamp,
	"archived_by" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "billing_plan_prices_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
CREATE TABLE "billing_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"account_type_id" integer,
	"stripe_product_id" varchar,
	"active_stripe_price_id" varchar,
	"price" numeric(10, 2) NOT NULL,
	"billing_interval" varchar NOT NULL,
	"trial_days" integer DEFAULT 30,
	"features" jsonb,
	"max_projects" integer,
	"max_team_members" integer,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "billing_plans_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "contact_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"date" varchar NOT NULL,
	"start_time" varchar NOT NULL,
	"end_time" varchar NOT NULL,
	"availability_type" varchar NOT NULL,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_sheet_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"version" varchar(20) DEFAULT '1.0' NOT NULL,
	"version_type" varchar(10) NOT NULL,
	"type" varchar(20) DEFAULT 'contact-sheet' NOT NULL,
	"settings" jsonb NOT NULL,
	"published_by" integer NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"category" varchar NOT NULL,
	"role" varchar,
	"notes" text,
	"photo_url" varchar,
	"emergency_contact_name" varchar,
	"emergency_contact_phone" varchar,
	"emergency_contact_email" varchar,
	"emergency_contact_relationship" varchar,
	"allergies" text,
	"medical_notes" text,
	"cast_types" text[],
	"equity_status" varchar,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "costumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"character" varchar NOT NULL,
	"piece" varchar NOT NULL,
	"act" varchar,
	"scene" varchar,
	"notes" text,
	"status" varchar DEFAULT 'needed' NOT NULL,
	"is_quick_change" boolean DEFAULT false,
	"quick_change_time" integer DEFAULT 60,
	"quick_change_notes" text,
	"image_url" varchar,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"date" date NOT NULL,
	"locations" text[] DEFAULT '["Rehearsal Hall"]' NOT NULL,
	"events" jsonb DEFAULT '[]' NOT NULL,
	"announcements" text DEFAULT '',
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "distribution_list_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"distribution_list_id" integer NOT NULL,
	"email_contact_id" integer NOT NULL,
	"list_type" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "distribution_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dns_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" integer NOT NULL,
	"cloudflare_id" varchar,
	"type" varchar NOT NULL,
	"name" varchar NOT NULL,
	"content" text NOT NULL,
	"ttl" integer DEFAULT 1,
	"proxied" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "domain_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar NOT NULL,
	"route_path" varchar NOT NULL,
	"route_type" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"description" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"zone_id" varchar NOT NULL,
	"status" varchar DEFAULT 'active',
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "domains_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "email_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"email_address" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"account_type" varchar NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"signature" text,
	"imap_host" varchar,
	"imap_port" integer,
	"imap_username" varchar,
	"imap_password" varchar,
	"imap_enabled" boolean DEFAULT false,
	"imap_ssl_enabled" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"next_sync_at" timestamp,
	"sync_interval_minutes" integer DEFAULT 15,
	"smtp_host" varchar,
	"smtp_port" integer,
	"smtp_username" varchar,
	"smtp_password" varchar,
	"smtp_enabled" boolean DEFAULT false,
	"smtp_ssl_enabled" boolean DEFAULT true,
	"sent_count" integer DEFAULT 0,
	"received_count" integer DEFAULT 0,
	"last_delivery_status" varchar,
	"last_delivery_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_accounts_email_address_unique" UNIQUE("email_address")
);
--> statement-breakpoint
CREATE TABLE "email_archive_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"rule_name" varchar NOT NULL,
	"trigger_event" varchar NOT NULL,
	"trigger_date" timestamp,
	"archive_action" varchar DEFAULT 'archive' NOT NULL,
	"export_format" varchar,
	"export_destination" varchar,
	"is_active" boolean DEFAULT true,
	"last_executed" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"inbox_id" integer,
	"assigned_to" integer NOT NULL,
	"assigned_by" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"priority" varchar DEFAULT 'medium',
	"due_date" timestamp,
	"notes" text,
	"completed_at" timestamp,
	"assigned_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"filename" varchar NOT NULL,
	"original_filename" varchar NOT NULL,
	"content_type" varchar NOT NULL,
	"file_size" integer NOT NULL,
	"file_path" varchar NOT NULL,
	"is_inline" boolean DEFAULT false,
	"content_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_collaborations" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"inbox_id" integer,
	"role" varchar DEFAULT 'collaborator' NOT NULL,
	"can_reply" boolean DEFAULT true,
	"can_assign" boolean DEFAULT false,
	"last_read_at" timestamp,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"original_contact_id" integer,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"role" varchar,
	"notes" text,
	"is_manually_added" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"folder_type" varchar NOT NULL,
	"color" varchar DEFAULT '#3b82f6',
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"is_hidden" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_forwarding_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"forward_to_email" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"forward_incoming" boolean DEFAULT true,
	"forward_outgoing" boolean DEFAULT false,
	"keep_original" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"color" varchar DEFAULT '#3b82f6',
	"member_ids" integer[] DEFAULT '{}',
	"member_count" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"thread_id" integer,
	"message_id" varchar NOT NULL,
	"subject" varchar,
	"from_address" varchar NOT NULL,
	"to_addresses" text[],
	"cc_addresses" text[],
	"bcc_addresses" text[],
	"content" text,
	"html_content" text,
	"is_read" boolean DEFAULT false,
	"is_draft" boolean DEFAULT false,
	"is_sent" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"is_important" boolean DEFAULT false,
	"has_attachments" boolean DEFAULT false,
	"date_sent" timestamp,
	"date_received" timestamp,
	"folder_id" integer,
	"labels" text[],
	"priority" varchar,
	"reply_to" varchar,
	"in_reply_to" varchar,
	"message_references" text[],
	"size_bytes" integer,
	"related_show_id" integer,
	"related_contact_id" integer,
	"delivery_status" varchar DEFAULT 'pending',
	"sendgrid_message_id" varchar,
	"delivered_at" timestamp,
	"delivery_error" text,
	"retry_count" integer DEFAULT 0,
	"bounced" boolean DEFAULT false,
	"bounce_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_messages_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"message_id" integer,
	"priority" integer DEFAULT 5,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"scheduled_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"error_message" text,
	"delivery_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer,
	"name" varchar NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_sync_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"job_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"total_items" integer DEFAULT 0,
	"processed_items" integer DEFAULT 0,
	"last_synced_uid" integer,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_template_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#3b82f6',
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"template_type" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"content" text NOT NULL,
	"variables" text[],
	"is_shared" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"project_id" integer,
	"subject" varchar NOT NULL,
	"participants" text[],
	"last_message_at" timestamp NOT NULL,
	"message_count" integer DEFAULT 1,
	"is_read" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"is_important" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "error_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_category_id" integer,
	"color" varchar(7) DEFAULT '#6b7280',
	"icon_name" varchar(50),
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_clusters" (
	"id" serial PRIMARY KEY NOT NULL,
	"signature" varchar(255) NOT NULL,
	"first_occurrence" timestamp DEFAULT now() NOT NULL,
	"last_occurrence" timestamp DEFAULT now() NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"affected_users" integer DEFAULT 1 NOT NULL,
	"error_type" varchar(50) NOT NULL,
	"feature_context" varchar(100),
	"business_impact" varchar(20),
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"assigned_to" integer,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "error_clusters_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "error_impact_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"error_cluster_id" integer,
	"affected_users" integer NOT NULL,
	"business_function_impact" varchar(255),
	"severity_level" varchar(20) NOT NULL,
	"cost_estimate" numeric(12, 2),
	"workflow_disruption" boolean DEFAULT false,
	"data_loss_risk" boolean DEFAULT false,
	"security_implications" boolean DEFAULT false,
	"compliance_impact" boolean DEFAULT false,
	"analysis_notes" text,
	"analyzed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"error_type" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"page" varchar(255) NOT NULL,
	"user_action" varchar(100),
	"element_clicked" varchar(255),
	"stack_trace" text,
	"user_agent" text NOT NULL,
	"user_id" varchar(50),
	"additional_data" jsonb,
	"browser_info" jsonb,
	"user_journey" jsonb,
	"feature_context" varchar(100),
	"session_id" varchar(100),
	"error_signature" varchar(255),
	"business_impact" varchar(20),
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"cluster_id" integer,
	"error_log_id" integer,
	"notification_type" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"read_by" integer,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_resolution_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"error_log_id" integer NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolution_method" varchar(50),
	"resolution_strategy" varchar(100),
	"resolved_at" timestamp,
	"resolved_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_trends" (
	"id" serial PRIMARY KEY NOT NULL,
	"time_frame" varchar(50) NOT NULL,
	"error_type" varchar(100) NOT NULL,
	"frequency" integer NOT NULL,
	"trend" numeric(10, 2),
	"severity" varchar(20) NOT NULL,
	"business_impact" varchar(255),
	"recommendation" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"address" text,
	"description" text,
	"capacity" integer,
	"notes" text,
	"location_type" varchar DEFAULT 'main' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_type_calendar_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"event_type_name" varchar NOT NULL,
	"event_type_category" varchar NOT NULL,
	"token" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_accessed" timestamp,
	"access_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "event_type_calendar_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "event_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"color" varchar DEFAULT '#3b82f6',
	"is_default" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feature_stability_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_name" varchar(100) NOT NULL,
	"error_count" integer DEFAULT 0,
	"unique_users" integer DEFAULT 0,
	"avg_resolution_time" integer,
	"stability_score" numeric(3, 2),
	"last_error_at" timestamp,
	"is_active" boolean DEFAULT true,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"feature" varchar(100) NOT NULL,
	"usage_count" integer DEFAULT 1,
	"total_time" integer DEFAULT 0,
	"last_used" timestamp DEFAULT now() NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"category" varchar,
	"status" varchar DEFAULT 'open' NOT NULL,
	"attachments" jsonb,
	"admin_notes" text,
	"submitted_by" integer NOT NULL,
	"assigned_to" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_template_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"branding" jsonb,
	"page_margins" jsonb,
	"page_numbering" jsonb,
	"fonts" jsonb,
	"lists" jsonb,
	"date_format" varchar DEFAULT 'MM/DD/YYYY',
	"time_format" varchar DEFAULT '12h',
	"default_header" text,
	"default_footer" text,
	"header_spacing" varchar DEFAULT '1.2',
	"footer_spacing" varchar DEFAULT '1.2',
	"header_horizontal_line" boolean DEFAULT false,
	"footer_horizontal_line" boolean DEFAULT false,
	"email_settings" jsonb,
	"production_logo" varchar,
	"production_photo" varchar,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "global_template_settings_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "google_calendar_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"calendar_id" text NOT NULL,
	"calendar_name" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expiry" timestamp,
	"is_active" boolean DEFAULT true,
	"sync_settings" jsonb DEFAULT '{"syncPersonalSchedules":true,"syncEventTypes":[],"defaultReminders":[{"method":"email","minutes":15}]}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "location_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"date" varchar NOT NULL,
	"start_time" varchar NOT NULL,
	"end_time" varchar NOT NULL,
	"type" varchar NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "note_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"file_name" varchar NOT NULL,
	"file_url" varchar NOT NULL,
	"file_size" integer,
	"mime_type" varchar,
	"alt_text" text,
	"uploaded_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "note_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"permission" varchar DEFAULT 'view' NOT NULL,
	"invited_by" integer NOT NULL,
	"invited_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "note_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"content" text NOT NULL,
	"parent_id" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "note_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"color" varchar DEFAULT '#6B7280',
	"parent_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_global" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"folder_id" integer,
	"title" varchar NOT NULL,
	"content" jsonb,
	"excerpt" text,
	"is_pinned" boolean DEFAULT false,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"is_archived" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"last_edited_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"schedule_updates" boolean DEFAULT true,
	"major_versions_only" boolean DEFAULT false,
	"email_enabled" boolean DEFAULT true,
	"calendar_sync" boolean DEFAULT false,
	"reminder_settings" jsonb DEFAULT '{"scheduleChanges":24,"newVersions":2,"personalScheduleUpdates":true}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_payment_method_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"brand" varchar,
	"last4" varchar,
	"exp_month" integer,
	"exp_year" integer,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_tracker" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"contract_settings_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"date" date NOT NULL,
	"role_played" varchar NOT NULL,
	"cover_type" varchar DEFAULT 'None' NOT NULL,
	"track_type" varchar DEFAULT 'Principal' NOT NULL,
	"multi_track_bonus" boolean DEFAULT false,
	"calculated_pay_bump" numeric(10, 2) NOT NULL,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "personal_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer,
	"project_id" integer NOT NULL,
	"access_token" varchar NOT NULL,
	"current_version_id" integer,
	"email_preferences" jsonb,
	"last_viewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "personal_schedules_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar NOT NULL,
	"access_level" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"invited_by" integer NOT NULL,
	"invited_at" timestamp DEFAULT now(),
	"joined_at" timestamp,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"venue" varchar,
	"venue_id" integer,
	"prep_start_date" timestamp,
	"first_rehearsal_date" timestamp,
	"designer_run_date" timestamp,
	"first_tech_date" timestamp,
	"first_preview_date" timestamp,
	"opening_night" timestamp,
	"closing_date" timestamp,
	"season" varchar,
	"season_id" integer,
	"owner_id" integer NOT NULL,
	"custom_reply_to_email" varchar,
	"custom_email_display_name" varchar,
	"is_archived" boolean DEFAULT false,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "props" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"act" varchar,
	"scene" varchar,
	"character" varchar,
	"location" varchar,
	"status" varchar DEFAULT 'needed' NOT NULL,
	"notes" text,
	"quantity" integer DEFAULT 1,
	"sourcing_notes" text,
	"image_url" varchar,
	"consumable_type" varchar DEFAULT 'not_consumable' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "public_calendar_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"last_accessed" timestamp,
	"access_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "public_calendar_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "rehearsal_tracker" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"contract_settings_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"date" date NOT NULL,
	"rehearsal_type" varchar DEFAULT 'General' NOT NULL,
	"role_rehearsed" varchar NOT NULL,
	"duration" numeric(4, 2) NOT NULL,
	"paid_rehearsal" boolean DEFAULT false,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"content" text NOT NULL,
	"note_order" integer NOT NULL,
	"is_completed" boolean DEFAULT false,
	"priority" varchar DEFAULT 'medium',
	"assigned_to" integer,
	"due_date" timestamp,
	"department" varchar,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"type" varchar NOT NULL,
	"phase" varchar,
	"header" text,
	"footer" text,
	"fields" jsonb NOT NULL,
	"layout_configuration" jsonb,
	"is_default" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"type" varchar NOT NULL,
	"template_id" integer,
	"content" jsonb NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"date" timestamp NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resolution_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"error_log_id" integer NOT NULL,
	"strategy" varchar(100) NOT NULL,
	"action" text NOT NULL,
	"success" boolean NOT NULL,
	"implementation_details" jsonb,
	"resolved_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"template_name" varchar NOT NULL,
	"template_type" varchar NOT NULL,
	"subject_template" text NOT NULL,
	"body_template" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_event_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"is_required" boolean DEFAULT true,
	"status" varchar DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"type" varchar DEFAULT 'rehearsal' NOT NULL,
	"event_type_id" integer,
	"location" varchar,
	"notes" text,
	"is_all_day" boolean DEFAULT false,
	"parent_event_id" integer,
	"is_production_level" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_version_comparisons" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"from_version_id" integer NOT NULL,
	"to_version_id" integer NOT NULL,
	"comparison_data" jsonb,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schedule_version_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" integer NOT NULL,
	"contact_id" integer,
	"notification_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"sent_at" timestamp,
	"email_subject" text,
	"email_body" text,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "schedule_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"version" varchar NOT NULL,
	"version_type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"changelog" text,
	"schedule_data" jsonb NOT NULL,
	"published_by" integer NOT NULL,
	"published_at" timestamp DEFAULT now(),
	"is_current" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "script_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"version_id" integer,
	"type" varchar NOT NULL,
	"position" integer NOT NULL,
	"length" integer,
	"old_content" text,
	"new_content" text,
	"description" text,
	"is_published" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "script_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"permission" varchar NOT NULL,
	"invited_by" integer NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "script_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"parent_id" integer,
	"content" text NOT NULL,
	"position" integer,
	"selected_text" text,
	"status" varchar DEFAULT 'open',
	"type" varchar DEFAULT 'comment',
	"created_by" integer NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "script_cues" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"type" varchar NOT NULL,
	"number" varchar NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"page" integer NOT NULL,
	"act" integer,
	"scene" integer,
	"timing" varchar,
	"notes" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "script_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"script_id" integer NOT NULL,
	"version" varchar NOT NULL,
	"title" varchar NOT NULL,
	"content" jsonb NOT NULL,
	"changes" jsonb,
	"published_at" timestamp DEFAULT now(),
	"published_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"content" jsonb NOT NULL,
	"version" varchar DEFAULT '1.0',
	"major_version" integer DEFAULT 1,
	"minor_version" integer DEFAULT 0,
	"total_pages" integer DEFAULT 1,
	"status" varchar DEFAULT 'draft',
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"published_by" integer,
	"last_edited_by" integer,
	"formatting" jsonb,
	"page_settings" jsonb,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"total_searches" integer DEFAULT 0,
	"natural_language_searches" integer DEFAULT 0,
	"advanced_searches" integer DEFAULT 0,
	"avg_response_time" numeric,
	"unique_users" integer DEFAULT 0,
	"popular_queries" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"query" text NOT NULL,
	"query_type" varchar NOT NULL,
	"filters" jsonb DEFAULT '[]',
	"result_count" integer DEFAULT 0,
	"clicked_result_id" varchar,
	"response_time" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_indexes" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar NOT NULL,
	"entity_id" integer NOT NULL,
	"project_id" integer,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"search_vector" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"relevance_boost" numeric DEFAULT '1.0',
	"is_active" boolean DEFAULT true,
	"last_indexed" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" varchar NOT NULL,
	"type" varchar NOT NULL,
	"category" varchar,
	"popularity" integer DEFAULT 1,
	"project_id" integer,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"user_id" integer NOT NULL,
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seo_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar NOT NULL,
	"site_title" varchar NOT NULL,
	"site_description" text NOT NULL,
	"keywords" text,
	"favicon_url" varchar,
	"apple_touch_icon_url" varchar,
	"share_image_url" varchar,
	"share_image_alt" varchar,
	"twitter_card" varchar DEFAULT 'summary_large_image',
	"twitter_handle" varchar,
	"author" varchar,
	"theme_color" varchar DEFAULT '#2563eb',
	"custom_meta" jsonb,
	"og_type" varchar DEFAULT 'website',
	"structured_data" jsonb,
	"ai_description" text,
	"semantic_keywords" text,
	"content_categories" text,
	"target_audience" varchar,
	"industry_vertical" varchar,
	"functionality_tags" text,
	"ai_metadata" jsonb,
	"robots_directives" text DEFAULT 'index, follow',
	"canonical_url" varchar,
	"language_code" varchar DEFAULT 'en-US',
	"geo_targeting" varchar,
	"bimi_logo_url" varchar,
	"bimi_logo_alt" varchar,
	"bimi_vmc_url" varchar,
	"bimi_selector" varchar DEFAULT 'default',
	"bimi_enabled" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "seo_settings_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_inbox_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"inbox_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar DEFAULT 'viewer' NOT NULL,
	"permissions" jsonb,
	"can_assign_emails" boolean DEFAULT false,
	"can_manage_members" boolean DEFAULT false,
	"notification_settings" jsonb,
	"joined_at" timestamp DEFAULT now(),
	"last_active_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shared_inboxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"email_address" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"auto_assign_rules" jsonb,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shared_inboxes_email_address_unique" UNIQUE("email_address")
);
--> statement-breakpoint
CREATE TABLE "show_characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"scenes" jsonb DEFAULT '[]' NOT NULL,
	"costumes" jsonb DEFAULT '[]' NOT NULL,
	"props" jsonb DEFAULT '[]' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "show_contract_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"contract_type" varchar NOT NULL,
	"base_salary" numeric(10, 2) NOT NULL,
	"understudy_bump" numeric(10, 2) NOT NULL,
	"swing_bump" numeric(10, 2),
	"swing_bump_rule" text,
	"partial_swing_increment" numeric(10, 2),
	"rehearsal_cap" integer NOT NULL,
	"overtime_trigger" varchar NOT NULL,
	"rulebook_pdf_url" varchar,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "show_contract_settings_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "show_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"content" jsonb NOT NULL,
	"version" varchar DEFAULT '1.0',
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "show_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"events" jsonb NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "show_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"sharing_enabled" boolean DEFAULT false,
	"share_link" varchar,
	"share_link_expiry" timestamp,
	"template_settings" jsonb,
	"report_settings" jsonb,
	"schedule_settings" jsonb,
	"permissions" jsonb,
	"contact_categories_order" jsonb,
	"sections_order" jsonb,
	"contact_sheet_settings" jsonb,
	"company_list_settings" jsonb,
	"department_names" jsonb,
	"department_formatting" jsonb,
	"department_order" jsonb,
	"field_header_formatting" jsonb,
	"header_formatting" jsonb,
	"footer_formatting" jsonb,
	"layout_configuration" jsonb,
	"global_page_margins" jsonb,
	"feature_settings" jsonb DEFAULT '{"email":{"team":true},"chat":true,"reports":true,"calendar":true,"script":true,"props":true,"contacts":true}' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "show_settings_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"price_monthly" numeric(10, 2) NOT NULL,
	"price_annual" numeric(10, 2),
	"features" jsonb NOT NULL,
	"usage_limits" jsonb,
	"trial_days" integer DEFAULT 30,
	"requires_payment_method" boolean DEFAULT true,
	"stripe_price_id_monthly" varchar(100),
	"stripe_price_id_annual" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"projects_used" integer DEFAULT 0,
	"team_members_used" integer DEFAULT 0,
	"api_calls_used" integer DEFAULT 0,
	"storage_used" numeric(10, 2) DEFAULT '0',
	"emails_sent" integer DEFAULT 0,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar DEFAULT 'assignee',
	"assigned_by" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"file_name" varchar NOT NULL,
	"file_url" varchar NOT NULL,
	"file_size" integer,
	"mime_type" varchar,
	"uploaded_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"content" text NOT NULL,
	"parent_id" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_databases" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"icon" varchar,
	"color" varchar DEFAULT '#6B7280',
	"template_type" varchar,
	"is_global" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"database_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"options" jsonb,
	"is_required" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"database_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"configuration" jsonb,
	"filters" jsonb,
	"sorts" jsonb,
	"is_default" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"database_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"content" jsonb,
	"properties" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"last_edited_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" varchar(255),
	"page" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"feature" varchar(100),
	"element_clicked" varchar(255),
	"duration" integer,
	"additional_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_engagement_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"engagement_score" integer DEFAULT 0 NOT NULL,
	"engagement_level" varchar(20) DEFAULT 'inactive' NOT NULL,
	"churn_risk_score" integer DEFAULT 0 NOT NULL,
	"churn_risk_level" varchar(20) DEFAULT 'low' NOT NULL,
	"feature_diversity_score" integer DEFAULT 0 NOT NULL,
	"session_consistency_score" integer DEFAULT 0 NOT NULL,
	"usage_trend" varchar(20) DEFAULT 'stable',
	"last_calculated" timestamp DEFAULT now() NOT NULL,
	"calculation_period_start" date NOT NULL,
	"calculation_period_end" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_satisfaction_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"time_frame" varchar(20) NOT NULL,
	"error_frequency" integer DEFAULT 0,
	"satisfaction_score" numeric(3, 2),
	"last_error_at" timestamp,
	"total_errors" integer DEFAULT 0,
	"resolved_errors" integer DEFAULT 0,
	"critical_errors" integer DEFAULT 0,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"page_views" integer DEFAULT 0,
	"actions" integer DEFAULT 0,
	"user_agent" text,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"stripe_customer_id" varchar(100),
	"stripe_subscription_id" varchar(100),
	"stripe_payment_method_id" varchar(100),
	"status" varchar(50) DEFAULT 'trialing' NOT NULL,
	"trial_start" date,
	"trial_end" date,
	"current_period_start" date,
	"current_period_end" date,
	"cancel_at_period_end" boolean DEFAULT false,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"profile_type" varchar,
	"user_role" varchar DEFAULT 'user' NOT NULL,
	"beta_access" boolean DEFAULT false,
	"beta_features" jsonb,
	"is_admin" boolean DEFAULT false,
	"max_active_shows" integer DEFAULT 2,
	"current_active_shows" integer DEFAULT 0,
	"last_active_at" timestamp,
	"total_logins" integer DEFAULT 0,
	"total_minutes_active" integer DEFAULT 0,
	"features_used" jsonb,
	"default_reply_to_email" varchar,
	"email_display_name" varchar,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"subscription_status" varchar,
	"subscription_plan" varchar,
	"trial_ends_at" timestamp,
	"subscription_ends_at" timestamp,
	"payment_method_required" boolean DEFAULT false,
	"grandfathered_free" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"address" text,
	"capacity" integer,
	"notes" text,
	"user_id" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"experience" varchar,
	"how_heard" varchar,
	"additional_info" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"position" integer,
	"invited_at" timestamp,
	"converted_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waitlist_email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_email" varchar(255) NOT NULL,
	"from_name" varchar(100) DEFAULT 'BackstageOS' NOT NULL,
	"subject" varchar(255) DEFAULT 'Welcome to the BackstageOS Waitlist!' NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_costs" ADD CONSTRAINT "api_costs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_settings" ADD CONSTRAINT "beta_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_prices" ADD CONSTRAINT "billing_plan_prices_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plans" ADD CONSTRAINT "billing_plans_account_type_id_account_types_id_fk" FOREIGN KEY ("account_type_id") REFERENCES "public"."account_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_availability" ADD CONSTRAINT "contact_availability_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_availability" ADD CONSTRAINT "contact_availability_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_availability" ADD CONSTRAINT "contact_availability_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_sheet_versions" ADD CONSTRAINT "contact_sheet_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_sheet_versions" ADD CONSTRAINT "contact_sheet_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costumes" ADD CONSTRAINT "costumes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costumes" ADD CONSTRAINT "costumes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_calls" ADD CONSTRAINT "daily_calls_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_calls" ADD CONSTRAINT "daily_calls_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_list_members" ADD CONSTRAINT "distribution_list_members_distribution_list_id_distribution_lists_id_fk" FOREIGN KEY ("distribution_list_id") REFERENCES "public"."distribution_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_list_members" ADD CONSTRAINT "distribution_list_members_email_contact_id_email_contacts_id_fk" FOREIGN KEY ("email_contact_id") REFERENCES "public"."email_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_lists" ADD CONSTRAINT "distribution_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_lists" ADD CONSTRAINT "distribution_lists_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_lists" ADD CONSTRAINT "distribution_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_archive_rules" ADD CONSTRAINT "email_archive_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_archive_rules" ADD CONSTRAINT "email_archive_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_assignments" ADD CONSTRAINT "email_assignments_message_id_email_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_assignments" ADD CONSTRAINT "email_assignments_inbox_id_shared_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."shared_inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_assignments" ADD CONSTRAINT "email_assignments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_assignments" ADD CONSTRAINT "email_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attachments" ADD CONSTRAINT "email_attachments_message_id_email_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_collaborations" ADD CONSTRAINT "email_collaborations_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_collaborations" ADD CONSTRAINT "email_collaborations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_collaborations" ADD CONSTRAINT "email_collaborations_inbox_id_shared_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."shared_inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_contacts" ADD CONSTRAINT "email_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_contacts" ADD CONSTRAINT "email_contacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_contacts" ADD CONSTRAINT "email_contacts_original_contact_id_contacts_id_fk" FOREIGN KEY ("original_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_contacts" ADD CONSTRAINT "email_contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_folders" ADD CONSTRAINT "email_folders_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_folders" ADD CONSTRAINT "email_folders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_folders" ADD CONSTRAINT "email_folders_parent_id_email_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."email_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_forwarding_rules" ADD CONSTRAINT "email_forwarding_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_forwarding_rules" ADD CONSTRAINT "email_forwarding_rules_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_groups" ADD CONSTRAINT "email_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_groups" ADD CONSTRAINT "email_groups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_folder_id_email_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."email_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_related_show_id_projects_id_fk" FOREIGN KEY ("related_show_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_related_contact_id_contacts_id_fk" FOREIGN KEY ("related_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_message_id_email_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."email_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_rules" ADD CONSTRAINT "email_rules_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_rules" ADD CONSTRAINT "email_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_rules" ADD CONSTRAINT "email_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sync_jobs" ADD CONSTRAINT "email_sync_jobs_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_categories" ADD CONSTRAINT "email_template_categories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_account_id_email_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_clusters" ADD CONSTRAINT "error_clusters_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_impact_analysis" ADD CONSTRAINT "error_impact_analysis_error_cluster_id_error_clusters_id_fk" FOREIGN KEY ("error_cluster_id") REFERENCES "public"."error_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_notifications" ADD CONSTRAINT "error_notifications_cluster_id_error_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."error_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_notifications" ADD CONSTRAINT "error_notifications_error_log_id_error_logs_id_fk" FOREIGN KEY ("error_log_id") REFERENCES "public"."error_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_notifications" ADD CONSTRAINT "error_notifications_read_by_users_id_fk" FOREIGN KEY ("read_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_resolution_status" ADD CONSTRAINT "error_resolution_status_error_log_id_error_logs_id_fk" FOREIGN KEY ("error_log_id") REFERENCES "public"."error_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_resolution_status" ADD CONSTRAINT "error_resolution_status_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_locations" ADD CONSTRAINT "event_locations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_locations" ADD CONSTRAINT "event_locations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_type_calendar_shares" ADD CONSTRAINT "event_type_calendar_shares_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_usage" ADD CONSTRAINT "feature_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_template_settings" ADD CONSTRAINT "global_template_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_template_settings" ADD CONSTRAINT "global_template_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_integrations" ADD CONSTRAINT "google_calendar_integrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_integrations" ADD CONSTRAINT "google_calendar_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_availability" ADD CONSTRAINT "location_availability_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_availability" ADD CONSTRAINT "location_availability_location_id_event_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."event_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_attachments" ADD CONSTRAINT "note_attachments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_attachments" ADD CONSTRAINT "note_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_collaborators" ADD CONSTRAINT "note_collaborators_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_collaborators" ADD CONSTRAINT "note_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_collaborators" ADD CONSTRAINT "note_collaborators_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_parent_id_note_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."note_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_parent_id_note_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."note_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_folder_id_note_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."note_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_tracker" ADD CONSTRAINT "performance_tracker_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_tracker" ADD CONSTRAINT "performance_tracker_contract_settings_id_show_contract_settings_id_fk" FOREIGN KEY ("contract_settings_id") REFERENCES "public"."show_contract_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_tracker" ADD CONSTRAINT "performance_tracker_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_tracker" ADD CONSTRAINT "performance_tracker_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_schedules" ADD CONSTRAINT "personal_schedules_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_schedules" ADD CONSTRAINT "personal_schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_schedules" ADD CONSTRAINT "personal_schedules_current_version_id_schedule_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."schedule_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_calendar_shares" ADD CONSTRAINT "public_calendar_shares_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_calendar_shares" ADD CONSTRAINT "public_calendar_shares_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_tracker" ADD CONSTRAINT "rehearsal_tracker_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_tracker" ADD CONSTRAINT "rehearsal_tracker_contract_settings_id_show_contract_settings_id_fk" FOREIGN KEY ("contract_settings_id") REFERENCES "public"."show_contract_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_tracker" ADD CONSTRAINT "rehearsal_tracker_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsal_tracker" ADD CONSTRAINT "rehearsal_tracker_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_notes" ADD CONSTRAINT "report_notes_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_notes" ADD CONSTRAINT "report_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_notes" ADD CONSTRAINT "report_notes_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_notes" ADD CONSTRAINT "report_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolution_records" ADD CONSTRAINT "resolution_records_error_log_id_error_logs_id_fk" FOREIGN KEY ("error_log_id") REFERENCES "public"."error_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_email_templates" ADD CONSTRAINT "schedule_email_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_email_templates" ADD CONSTRAINT "schedule_email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_event_participants" ADD CONSTRAINT "schedule_event_participants_event_id_schedule_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."schedule_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_event_participants" ADD CONSTRAINT "schedule_event_participants_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_event_type_id_event_types_id_fk" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_parent_event_id_schedule_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."schedule_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_version_comparisons" ADD CONSTRAINT "schedule_version_comparisons_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_version_comparisons" ADD CONSTRAINT "schedule_version_comparisons_from_version_id_schedule_versions_id_fk" FOREIGN KEY ("from_version_id") REFERENCES "public"."schedule_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_version_comparisons" ADD CONSTRAINT "schedule_version_comparisons_to_version_id_schedule_versions_id_fk" FOREIGN KEY ("to_version_id") REFERENCES "public"."schedule_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_version_comparisons" ADD CONSTRAINT "schedule_version_comparisons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_version_notifications" ADD CONSTRAINT "schedule_version_notifications_version_id_schedule_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."schedule_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_version_notifications" ADD CONSTRAINT "schedule_version_notifications_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_versions" ADD CONSTRAINT "schedule_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_versions" ADD CONSTRAINT "schedule_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_changes" ADD CONSTRAINT "script_changes_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_changes" ADD CONSTRAINT "script_changes_version_id_script_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."script_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_changes" ADD CONSTRAINT "script_changes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_collaborators" ADD CONSTRAINT "script_collaborators_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_collaborators" ADD CONSTRAINT "script_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_collaborators" ADD CONSTRAINT "script_collaborators_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_comments" ADD CONSTRAINT "script_comments_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_comments" ADD CONSTRAINT "script_comments_parent_id_script_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."script_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_comments" ADD CONSTRAINT "script_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_comments" ADD CONSTRAINT "script_comments_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_cues" ADD CONSTRAINT "script_cues_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_cues" ADD CONSTRAINT "script_cues_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_indexes" ADD CONSTRAINT "search_indexes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_suggestions" ADD CONSTRAINT "search_suggestions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_settings" ADD CONSTRAINT "seo_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_inbox_members" ADD CONSTRAINT "shared_inbox_members_inbox_id_shared_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."shared_inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_inbox_members" ADD CONSTRAINT "shared_inbox_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_inboxes" ADD CONSTRAINT "shared_inboxes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_inboxes" ADD CONSTRAINT "shared_inboxes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_characters" ADD CONSTRAINT "show_characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_characters" ADD CONSTRAINT "show_characters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_contract_settings" ADD CONSTRAINT "show_contract_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_contract_settings" ADD CONSTRAINT "show_contract_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_documents" ADD CONSTRAINT "show_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_documents" ADD CONSTRAINT "show_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_schedules" ADD CONSTRAINT "show_schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_schedules" ADD CONSTRAINT "show_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_settings" ADD CONSTRAINT "show_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_settings" ADD CONSTRAINT "show_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_parent_id_task_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."task_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_databases" ADD CONSTRAINT "task_databases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_databases" ADD CONSTRAINT "task_databases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_properties" ADD CONSTRAINT "task_properties_database_id_task_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."task_databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_views" ADD CONSTRAINT "task_views_database_id_task_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."task_databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_views" ADD CONSTRAINT "task_views_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_database_id_task_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."task_databases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_engagement_scores" ADD CONSTRAINT "user_engagement_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_satisfaction_metrics" ADD CONSTRAINT "user_satisfaction_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");