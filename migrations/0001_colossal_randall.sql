CREATE TABLE "contact_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_templates_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"report_type_id" integer,
	"name" varchar NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false,
	"icon" varchar,
	"color" varchar,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "report_types_project_id_slug_unique" UNIQUE("project_id","slug")
);
--> statement-breakpoint
CREATE TABLE "template_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"type" varchar NOT NULL,
	"label" varchar NOT NULL,
	"helper_text" text,
	"placeholder" text,
	"required" boolean DEFAULT false,
	"options" jsonb,
	"default_value" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"department_key" varchar,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "daily_calls" ALTER COLUMN "locations" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "daily_calls" ALTER COLUMN "locations" SET DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "preferred_name" varchar;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "whatsapp" varchar;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "daily_calls" ADD COLUMN "fittings_events" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "daily_calls" ADD COLUMN "appointments_events" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "connected_email_provider" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "connected_email_address" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_provider_connected_at" timestamp;--> statement-breakpoint
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates_v2" ADD CONSTRAINT "report_templates_v2_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates_v2" ADD CONSTRAINT "report_templates_v2_report_type_id_report_types_id_fk" FOREIGN KEY ("report_type_id") REFERENCES "public"."report_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_templates_v2" ADD CONSTRAINT "report_templates_v2_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_types" ADD CONSTRAINT "report_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_types" ADD CONSTRAINT "report_types_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_section_id_template_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."template_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_sections" ADD CONSTRAINT "template_sections_template_id_report_templates_v2_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_templates_v2_project" ON "report_templates_v2" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_templates_v2_report_type" ON "report_templates_v2" USING btree ("report_type_id");--> statement-breakpoint
CREATE INDEX "idx_fields_section" ON "template_fields" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_fields_section_order" ON "template_fields" USING btree ("section_id","display_order");--> statement-breakpoint
CREATE INDEX "idx_sections_template" ON "template_sections" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_sections_template_order" ON "template_sections" USING btree ("template_id","display_order");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_group_id_contact_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."contact_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP COLUMN "reminder_settings";