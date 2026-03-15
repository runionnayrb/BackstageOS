# BackstageOS - Complete Documentation & Features Guide

**Platform**: Professional Theater Management Software  
**Version**: 27.0.0  
**Last Updated**: January 1, 2026

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Current Working Features](#current-working-features)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [User Interface Components](#user-interface-components)
6. [Authentication & Security](#authentication--security)
7. [Email System](#email-system)
8. [Task Management System](#task-management-system)
9. [Notes System](#notes-system)
10. [Calendar & Scheduling](#calendar--scheduling)
11. [Billing & Subscriptions](#billing--subscriptions)
12. [API Endpoints](#api-endpoints)
13. [Deployment Information](#deployment-information)
14. [Recent Development History](#recent-development-history)
15. [Planned Features](#planned-features)

---

## Platform Overview

BackstageOS is a comprehensive theater management platform specifically designed for professional stage managers to streamline production workflows. The platform provides show-centric organization with complete data isolation between productions, ensuring no cross-contamination of information.

**Core Philosophy**: Everything is tied to specific shows/projects with no data crossover between productions.

### Target Users
- Professional Stage Managers (freelance and full-time)
- Theater Production Teams
- Assistant Stage Managers
- Production Managers
- Theater Companies

### Profile Types
- **Freelance Users**: Independent stage managers working on multiple productions
- **Full-time Users**: Stage managers at resident theaters with seasons and venues

---

## Current Working Features

### Core Platform Features

#### Authentication System
- **Custom Email/Password Authentication** with bcrypt password hashing
- **Profile Types**: Freelance vs Full-time user categorization
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Admin System**: User management with beta access controls
- **Password Reset**: Secure token-based password recovery via email
- **OAuth Integration**: Gmail and Outlook OAuth for email connectivity

#### Show Management
- **Show-Centric Organization**: All data tied to specific productions
- **Show Creation**: Name, venue, description, important dates (prep, rehearsal, designer run, tech, preview, opening, closing)
- **Show Settings**: Comprehensive configuration system with department customization
- **Team Member Management**: Invite and manage team members with roles (Production Stage Manager, Stage Manager, Production Assistant)
- **Access Levels**: Editor and Viewer permissions for team members
- **Secure Sharing**: Generate shareable links for external collaborators
- **Show Archiving**: Archive completed productions while retaining data
- **Seasons & Venues**: Full-time users can organize shows by seasons and venues

### Report System (Fully Functional)

#### Report Types
1. **Rehearsal Reports**
2. **Tech Reports** 
3. **Performance Reports**
4. **Meeting Reports**
5. **Custom Report Types** (user-defined)

#### Template System
- **Advanced Template Builder**: Drag-drop field reordering
- **Custom Field Types**: Text, textarea, number, date, time, dropdown, checkbox, select
- **Rich Text Editor**: Google Docs-style interface with TipTap
- **Phase-Specific Templates**: Prep, rehearsal, tech, previews, performance
- **Header/Footer Customization**: Rich text with variables ({{showName}}, {{date}}, etc.)
- **Template Settings**: Per-show template configuration
- **V2 Template System**: Normalized structure with sections and fields
- **Department Keys**: Link fields to specific departments for tracking

#### Report Notes Tracking
- **Individual Note Extraction**: Notes from reports are extracted as trackable items
- **Custom Note Statuses**: Define custom statuses (Pending, In Progress, Done, etc.)
- **Status Colors**: Visual color coding for note status
- **Priority Levels**: Low, medium, high priority assignments
- **Due Dates**: Assign deadlines to individual notes
- **Department Assignment**: Categorize notes by department
- **Assignee Tracking**: Assign notes to team members

#### Document Interface
- **Borderless Design**: Clean, document-style editing
- **Auto-Save**: Automatic content and formatting persistence
- **Field Header Formatting**: Bold, italic, colors, alignment, borders
- **Department Headers**: Customizable section headers with rich formatting
- **"Apply to All"**: Batch formatting across all headers

### Advanced Production Tools

#### Script Editor
- **Theater Script Formatting**: ACT/SCENE headings, character names, stage directions
- **Auto-Format**: Intelligent script parsing and formatting
- **Rich Text Editing**: Font families, sizes, colors, alignment
- **Page Management**: Visual page breaks, margins, headers/footers
- **File Import**: Support for .txt, .rtf, .html, .docx, .pdf files
- **Version Control**: Save, publish, revert functionality with version history
- **Comments System**: Inline comments with threaded replies
- **Collaboration**: Script collaborators with read, comment, edit, admin permissions
- **Auto-Save**: Real-time content preservation
- **Script Cues**: Track lighting, sound, video, automation cues by page and position
- **Change Tracking**: Record all changes with before/after content

#### Props Tracker
- **Scene/Character Organization**: Track props by act, scene, and characters
- **Status Tracking**: Needed, pulled, rehearsal, performance, returned
- **Consumable Tracking**: Mark props as consumable or not
- **Quantity Management**: Track multiple instances of props
- **Sourcing Notes**: Document where props are being sourced
- **Image Support**: Upload prop images for reference
- **Location Tracking**: Track prop storage locations
- **Comprehensive Database**: Full CRUD operations

#### Costume Tracker
- **Character-Based Organization**: Track costumes by character
- **Scene Assignment**: Assign costumes to specific acts and scenes
- **Quick-Change Management**: 
  - Mark costumes as quick changes
  - Track quick change timing (in seconds)
  - Quick change notes for dressers
- **Status Tracking**: Needed, fitted, ready, in use, repair
- **Repair Tracking**: Maintenance and repair notes
- **Image Support**: Upload costume images

#### Performance & Rehearsal Tracking
- **Show Contract Settings**: Configure performance/rehearsal tracking rules
  - Maximum consecutive performances
  - Required break periods
  - Overtime thresholds
  - Holiday and dark day scheduling
- **Performance Tracker**: Log all performances with dates and notes
- **Rehearsal Tracker**: Track rehearsal hours and types
- **Contract Compliance**: Automatic warnings for contract violations

### Contact Management
- **Personnel Categories**: Cast, Crew, Creative Team, Producers, Venue, Other
- **Comprehensive Contact Info**: 
  - Name, role, email, phone
  - Emergency contacts (name, phone, relationship)
  - Address information
- **Health & Safety**:
  - Allergies and dietary restrictions
  - Medical notes
- **Cast-Specific Fields**:
  - Cast Types: Principal, Ensemble, Understudy, Swing
  - Character assignments
- **Contact Groups**: Organize contacts into custom groups
- **Distribution Lists**: Create email distribution lists
- **Contact Availability**: Track individual availability schedules
- **Full CRUD Operations**: Create, read, update, delete contacts

### Admin & Beta Features

#### Admin Dashboard
- **User Management**: View and manage all users
- **Beta Access Control**: Three-tier system (none, limited, full)
- **Feature Permissions**: Granular control over beta feature access
- **Admin Status Assignment**: Promote/demote admin users
- **View As Feature**: Admins can view platform as specific users
- **Editor Limits**: Set maximum active shows per user

#### Error Logging & Analytics
- **Production Error Tracking**: Real-time error capture from registered users
- **Error Clustering**: Intelligent grouping of similar errors
- **Auto-Resolution**: Automated fix application for common issues
- **Advanced Analytics**: 
  - Error trends by time frame
  - Feature stability metrics
  - User satisfaction metrics
  - Error impact analysis
- **Error Categories**: Hierarchical categorization with colors and icons
- **Admin Interface**: Error management and resolution tracking

#### Domain & Infrastructure Management
- **DNS Manager**: Complete Cloudflare DNS integration
- **Domain Manager**: Subdomain and routing configuration
- **Email Alias Management**: Email forwarding setup
- **SEO Manager**: Search engine optimization settings
- **API Settings**: Configure API behaviors and limits

#### User Analytics & Engagement
- **User Activity Tracking**: Page views, clicks, form submissions
- **Session Tracking**: Duration, page views, actions per session
- **Feature Usage Metrics**: Track which features users engage with
- **Engagement Scoring**: 
  - 0-100 engagement score
  - Engagement levels: inactive, low, medium, high, champion
  - Churn risk scoring
  - Usage trend analysis
- **API Cost Tracking**: Monitor external API usage costs

### Infrastructure Features

#### Email System (Comprehensive)
- **Resend Integration**: Professional email delivery
- **Gmail OAuth Integration**: Connect personal Gmail accounts
- **Outlook OAuth Integration**: Connect Microsoft 365 accounts
- **Email Aliases**: hello@backstageos.com, sm@backstageos.com
- **Waitlist Management**: Automated signup and conversion tracking
- **Rich Text Email Templates**: HTML email composition with variables

#### Version Tracking
- **Release Notes**: Comprehensive changelog accessible from any page
- **Version Display**: Current version in footer
- **Feature History**: Complete development timeline

---

## System Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Shadcn/UI** components (Radix UI primitives, "new-york" variant)
- **Tailwind CSS** for styling
- **TanStack Query v5** (React Query) for server state
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation
- **TipTap** for rich text editing
- **React DnD** for drag-and-drop functionality
- **Framer Motion** for animations
- **Recharts** for data visualization

### Backend Stack
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Drizzle ORM** for database operations
- **Passport.js** with LocalStrategy authentication
- **Express Session** with PostgreSQL store (connect-pg-simple)
- **Multer** for file uploads
- **Agenda** for job scheduling

### External Services
- **Stripe**: Payment processing and subscription management
- **Resend**: Transactional email delivery
- **Cloudflare**: DNS management and CDN
- **Google APIs**: Gmail OAuth and integration
- **Microsoft Graph**: Outlook OAuth and integration
- **Puppeteer**: PDF generation
- **OpenAI**: AI-powered features

### Database
- **PostgreSQL** (Neon serverless)
- **Drizzle Kit** for schema management and migrations
- **Connection Pooling** via @neondatabase/serverless
- **Data Isolation** through foreign key relationships

---

## Database Schema

### Core Tables
- **users**: User profiles, authentication, preferences, billing info, OAuth tokens
- **projects**: Show/production information with dates and settings
- **project_members**: Team access and permissions
- **team_members**: Invitations and team collaboration
- **sessions**: Session management
- **seasons**: Theater seasons for full-time users
- **venues**: Venue management for full-time users

### Report System Tables
- **reports**: Show-specific reports with content
- **report_templates**: Custom report templates (legacy)
- **report_templates_v2**: Normalized template system
- **template_sections**: Template sections with department keys
- **template_fields**: Individual fields within sections
- **report_types**: Custom user-defined report categories
- **report_notes**: Individual notes extracted from reports
- **note_statuses**: Custom status definitions for notes

### Production Document Tables
- **scripts**: Script content with version control
- **script_versions**: Published script versions
- **script_cues**: Cue tracking by type and position
- **script_comments**: Inline comments with threading
- **script_collaborators**: Script sharing and permissions
- **script_changes**: Change tracking for scripts
- **props**: Props tracking with status and location
- **costumes**: Costume tracking with quick change info
- **show_documents**: General show documentation
- **show_schedules**: Schedule definitions
- **show_characters**: Character breakdowns

### Contact & Availability Tables
- **contacts**: Production team contact information
- **email_contacts**: Standalone email contacts
- **contact_groups**: Contact organization
- **distribution_lists**: Email distribution lists
- **distribution_list_members**: List membership
- **contact_availability**: Individual availability schedules
- **location_availability**: Venue/space availability

### Calendar & Scheduling Tables
- **schedule_events**: Calendar events with recurrence
- **schedule_event_participants**: Event attendance
- **event_locations**: Locations for events
- **event_types**: Custom event type definitions
- **daily_calls**: Daily call sheet data
- **public_calendar_shares**: Shareable calendar links
- **schedule_templates**: Reusable schedule templates
- **schedule_template_events**: Events within templates

### Email System Tables
- **email_accounts**: User email account connections
- **email_threads**: Email conversation threads
- **email_messages**: Individual email messages
- **email_folders**: Email organization
- **email_groups**: Email mailing lists
- **email_attachments**: Message attachments
- **email_rules**: Automated email rules
- **email_templates**: Reusable email templates
- **email_signatures**: Email signatures
- **email_sync_jobs**: Background sync tracking
- **email_queue**: Email delivery queue
- **scheduled_emails**: Scheduled send functionality
- **shared_inboxes**: Team shared email inboxes
- **shared_inbox_members**: Inbox access
- **email_assignments**: Email delegation
- **email_collaborations**: Thread collaboration
- **email_archive_rules**: Archival automation

### Task Management Tables
- **task_databases**: Notion-style task databases
- **task_properties**: Custom property definitions
- **tasks**: Individual task records
- **task_assignments**: Task delegation
- **task_comments**: Task discussion
- **task_attachments**: Task file attachments
- **task_views**: Saved view configurations (list, table, kanban)

### Notes System Tables
- **note_folders**: Hierarchical note organization
- **notes**: Rich text notes with TipTap content
- **note_collaborators**: Note sharing
- **note_comments**: Note discussion
- **note_attachments**: Note file attachments

### Contract & Tracking Tables
- **show_contract_settings**: Performance/rehearsal rules
- **performance_tracker**: Performance logging
- **rehearsal_tracker**: Rehearsal hour tracking

### Settings Tables
- **show_settings**: Per-show configuration with department names
- **global_template_settings**: User-level template defaults
- **seo_settings**: Search engine optimization
- **domain_routes**: Domain and routing management
- **api_settings**: API configuration
- **waitlist_email_settings**: Waitlist email configuration

### Billing Tables
- **account_types**: User account categories
- **billing_plans**: Subscription plan definitions
- **billing_plan_prices**: Price history and Stripe sync
- **billing_history**: Payment and subscription events
- **payment_methods**: Stored payment methods
- **subscription_usage**: Usage tracking per period
- **subscription_plans**: Legacy plan definitions
- **user_subscriptions**: User subscription records

### Analytics & Admin Tables
- **user_activity**: Page and action tracking
- **api_costs**: External API cost tracking
- **user_sessions**: Session analytics
- **feature_usage**: Feature engagement metrics
- **user_engagement_scores**: Engagement and churn scoring
- **error_logs**: Production error tracking
- **error_clusters**: Intelligent error grouping
- **error_trends**: Error trend analysis
- **error_categories**: Error categorization
- **user_satisfaction_metrics**: User satisfaction tracking
- **feature_stability_metrics**: Feature reliability metrics
- **error_impact_analysis**: Error severity analysis
- **waitlist**: User registration queue
- **feedback**: User feedback and bug reports

---

## User Interface Components

### Design System
- **Shadcn/UI**: "new-york" style variant with Radix UI primitives
- **Responsive Design**: Mobile-first with Tailwind breakpoints
- **Accessibility**: ARIA compliant via Radix UI
- **Dark Mode**: CSS custom properties support with theme provider
- **Icons**: Lucide React for UI icons, React Icons for brand logos

### Navigation
- **Header**: User menu, admin dropdown, version link, notifications
- **Hierarchical Navigation**: Show → Section → Item
- **Back Buttons**: Context-aware navigation
- **Clean Interface**: Minimal, professional design
- **Sidebar Navigation**: Collapsible sidebar for show sections

### Forms & Inputs
- **React Hook Form**: Consistent form handling with validation
- **Zod Validation**: Type-safe data validation with drizzle-zod
- **Rich Text Editors**: TipTap-based Google Docs-style interfaces
- **Drag-and-Drop**: React DnD for reordering and layout
- **Date Pickers**: React Day Picker for date selection
- **Select Components**: Radix Select with search capability

### Key Pages
- **Landing Page**: Public marketing page with waitlist signup
- **Dashboard**: User's shows overview and recent activity
- **Show Detail**: Individual show management hub
- **Reports**: Report creation and management
- **Template Editor**: Visual template building
- **Script Editor**: Full-featured script editing
- **Props/Costumes Tracker**: Production tracking tools
- **Calendar**: Event scheduling and daily calls
- **Team Management**: Member invitations and permissions
- **Settings**: Show and user configuration
- **Admin Dashboard**: User and system management
- **Billing**: Subscription and payment management

---

## Authentication & Security

### Authentication Flow
1. Email/password registration with validation
2. bcrypt password hashing (10 rounds)
3. Passport.js LocalStrategy
4. PostgreSQL session storage with connect-pg-simple
5. Profile type selection (freelance/full-time)
6. Optional OAuth connection for email

### Authorization Levels
- **Owner**: Full control over show (delete, transfer)
- **Editor**: Can modify show data and create content
- **Viewer**: Read-only access to show data
- **Admin**: Platform-wide administrative access
- **Beta User**: Access to beta features based on tier

### Security Features
- **Route Protection**: Middleware on all API endpoints
- **Admin Middleware**: Role-based admin access
- **Beta Feature Gates**: Tiered access control
- **Session Security**: Secure cookies, session expiry
- **Password Reset**: Time-limited tokens via email
- **OAuth Token Management**: Secure token storage and refresh

---

## Email System

### Architecture
BackstageOS includes a comprehensive email system designed for theater production communication.

### Email Account Types
1. **Platform Email** (sm@backstageos.com): Sending reports and announcements
2. **Connected Gmail**: User's personal Gmail via OAuth
3. **Connected Outlook**: User's Microsoft 365 email via OAuth

### Features
- **Email Composition**: Rich text composer with templates
- **Thread Management**: Conversation threading and organization
- **Folder Organization**: Custom folders and system folders
- **Email Rules**: Automated filtering and organization
- **Signatures**: Multiple signature support
- **Attachments**: File attachment handling
- **Scheduled Sending**: Queue emails for later delivery
- **Email Templates**: Reusable templates with variables
- **Delivery Tracking**: Status tracking with SendGrid
- **Shared Inboxes**: Team email collaboration
- **Email Assignment**: Delegate emails to team members

### Email Services
- **Resend**: Primary email delivery service
- **Gmail API**: Direct Gmail integration
- **Microsoft Graph API**: Outlook integration
- **Background Sync**: Agenda-based email synchronization

---

## Task Management System

### Overview
A Notion-inspired task management system for production workflows.

### Features
- **Task Databases**: Create multiple task boards per show
- **Custom Properties**: 
  - Text, number, date, select, multi-select
  - Checkbox, person, file, URL, email, phone
- **Views**: List, table, and kanban views
- **Filters & Sorts**: Custom view configurations
- **Rich Content**: Full-page task editor with TipTap
- **Assignments**: Assign tasks to team members
- **Comments**: Threaded discussion on tasks
- **Attachments**: File uploads per task
- **Templates**: Pre-defined database templates

---

## Notes System

### Overview
An Apple Notes/Notion-style note-taking system for production documentation.

### Features
- **Rich Text Notes**: TipTap-powered editor
- **Folder Organization**: Hierarchical folder structure
- **Tags**: Tag-based organization
- **Pinned Notes**: Quick access to important notes
- **Search**: Full-text search across notes
- **Sharing**: Collaborate with team members
- **Comments**: Discussion threads on notes
- **Attachments**: Image and file support
- **Archive**: Archive old notes without deletion
- **Mobile Optimized**: Responsive mobile interface

---

## Calendar & Scheduling

### Features
- **Event Management**: Create, edit, delete events
- **Event Types**: Custom event categories with colors
- **Locations**: Track event locations with availability
- **Participants**: Assign contacts to events
- **Recurring Events**: Support for recurring schedules
- **Time Views**: 15, 30, 60-minute increments
- **Conflict Detection**: Automatic conflict warnings
- **Drag-and-Drop**: Visual event scheduling

### Daily Calls
- **Daily Call Sheets**: Generate formatted daily schedules
- **Multiple Locations**: Support for concurrent locations
- **Fittings & Appointments**: Separate tracking sections
- **Announcements**: Daily announcement section
- **PDF Export**: Generate printable PDF calls
- **Email Distribution**: Send calls to cast/crew

### Personal Schedules
- **Cast Member Schedules**: Individual filtered views
- **ICS Export**: Download personal calendar files
- **Calendar Subscriptions**: Live-updating calendar feeds
- **Public Sharing**: Shareable calendar links

### Schedule Templates
- **Template Creation**: Save reusable schedule patterns
- **Template Application**: Apply templates to date ranges
- **Template Events**: Pre-defined event structures

---

## Billing & Subscriptions

### Stripe Integration
- **Customer Management**: Automatic Stripe customer creation
- **Subscription Plans**: Monthly and annual billing options
- **Payment Methods**: Card storage and management
- **Webhooks**: Real-time subscription updates
- **Invoice History**: Complete billing history
- **Trial Periods**: Configurable trial durations

### Subscription Features
- **Plan Tiers**: Multiple plan options with feature gates
- **Usage Tracking**: Monitor feature usage
- **Grandfathered Access**: Beta user special pricing
- **Billing History**: Complete payment audit trail
- **Cancellation**: Self-service subscription management

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/user` - Current user info
- `PATCH /api/user` - Update user profile
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Complete password reset

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/archive` - Archive project
- `POST /api/projects/:id/unarchive` - Restore project

### Team Management
- `GET /api/projects/:id/members` - List team members
- `POST /api/projects/:id/members` - Invite team member
- `PUT /api/projects/:id/members/:memberId` - Update member
- `DELETE /api/projects/:id/members/:memberId` - Remove member

### Reports
- `GET /api/projects/:id/reports` - List reports
- `POST /api/projects/:id/reports` - Create report
- `GET /api/reports/:id` - Get report
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report

### Templates
- `GET /api/projects/:id/templates` - List templates
- `POST /api/projects/:id/templates` - Create template
- `GET /api/templates/:id` - Get template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Report Types
- `GET /api/projects/:id/report-types` - List report types
- `POST /api/projects/:id/report-types` - Create type
- `PUT /api/report-types/:id` - Update type
- `DELETE /api/report-types/:id` - Delete type

### Note Statuses
- `GET /api/projects/:id/note-statuses` - List statuses
- `POST /api/projects/:id/note-statuses` - Create status
- `PUT /api/note-statuses/:id` - Update status
- `DELETE /api/note-statuses/:id` - Delete status

### Contacts
- `GET /api/projects/:id/contacts` - List contacts
- `POST /api/projects/:id/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Scripts
- `GET /api/projects/:id/scripts` - List scripts
- `POST /api/projects/:id/scripts` - Create script
- `GET /api/scripts/:id` - Get script
- `PUT /api/scripts/:id` - Update script
- `POST /api/scripts/:id/publish` - Publish version

### Props & Costumes
- `GET /api/projects/:id/props` - List props
- `POST /api/projects/:id/props` - Create prop
- `PUT /api/props/:id` - Update prop
- `DELETE /api/props/:id` - Delete prop
- `GET /api/projects/:id/costumes` - List costumes
- `POST /api/projects/:id/costumes` - Create costume
- `PUT /api/costumes/:id` - Update costume
- `DELETE /api/costumes/:id` - Delete costume

### Calendar
- `GET /api/projects/:id/events` - List events
- `POST /api/projects/:id/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/projects/:id/daily-calls` - Get daily calls
- `POST /api/projects/:id/daily-calls` - Save daily call

### Tasks
- `GET /api/projects/:id/task-databases` - List databases
- `POST /api/projects/:id/task-databases` - Create database
- `GET /api/task-databases/:id/tasks` - List tasks
- `POST /api/task-databases/:id/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Notes
- `GET /api/projects/:id/notes` - List notes
- `POST /api/projects/:id/notes` - Create note
- `GET /api/notes/:id` - Get note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Email
- `GET /api/email/accounts` - List email accounts
- `POST /api/email/messages` - Send email
- `GET /api/email/threads` - List threads
- `GET /api/email/messages/:id` - Get message

### Billing
- `GET /api/billing/subscription` - Get subscription
- `POST /api/billing/create-checkout` - Create checkout session
- `POST /api/billing/create-portal` - Create customer portal
- `GET /api/billing/history` - Get billing history

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/errors` - Error logs
- `GET /api/admin/error-clusters` - Error clusters
- `POST /api/admin/errors/:id/fix` - Apply error fix
- `GET /api/admin/analytics` - Platform analytics

---

## Deployment Information

### Environment Configuration
- **Development**: Vite dev server with hot reload
- **Production**: Express serving built assets
- **Database**: Neon PostgreSQL serverless
- **Hosting**: Replit autoscale deployment

### Required Environment Variables
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret
REPL_ID=replit-environment-id

# Email
RESEND_API_KEY=resend-api-key

# OAuth - Gmail
GOOGLE_CLIENT_ID=google-client-id
GOOGLE_CLIENT_SECRET=google-client-secret

# OAuth - Outlook
MICROSOFT_CLIENT_ID=microsoft-client-id
MICROSOFT_CLIENT_SECRET=microsoft-client-secret

# Payments
STRIPE_SECRET_KEY=stripe-secret-key
STRIPE_PUBLISHABLE_KEY=stripe-publishable-key
STRIPE_WEBHOOK_SECRET=stripe-webhook-secret

# Infrastructure
CLOUDFLARE_API_KEY=cloudflare-key
CLOUDFLARE_ZONE_ID=zone-id
```

### Build Process
1. Frontend: Vite builds React app to `dist/public`
2. Backend: esbuild compiles TypeScript
3. Assets: Express serves static files
4. Database: Drizzle migrations via `drizzle-kit push`

---

## Recent Development History

### Major Features Implemented

#### Email System (Complete)
- Gmail OAuth integration with full send/receive
- Outlook OAuth integration with Microsoft Graph API
- Email templates with variable substitution
- Shared inbox functionality for teams
- Email assignment and delegation
- Scheduled email sending
- Background sync with Agenda

#### Task Management System
- Notion-inspired database structure
- Custom properties and views
- Kanban, list, and table views
- Task assignments and comments
- File attachments

#### Notes System
- Rich text editing with TipTap
- Folder organization
- Tag-based filtering
- Collaboration and sharing
- Mobile-optimized interface

#### Calendar & Daily Calls
- Full event management
- Daily call sheet generation
- ICS calendar exports
- Personal schedule filtering
- Public calendar sharing
- Schedule templates

#### Billing System
- Complete Stripe integration
- Subscription management
- Payment method storage
- Usage tracking
- Billing history

#### Performance Tracking
- Show contract settings
- Performance logging
- Rehearsal hour tracking
- Contract compliance warnings

#### Advanced Analytics
- User engagement scoring
- Churn risk analysis
- Feature usage metrics
- Error trend analysis
- API cost tracking

---

## Planned Features

### Phase 1: Enhanced Calendar
- Drag-drop scheduling improvements
- Multi-week view
- Resource scheduling
- Room booking system

### Phase 2: Advanced Collaboration
- Real-time co-editing
- Presence indicators
- Activity feeds
- @mentions and notifications

### Phase 3: Mobile App
- Native mobile experience
- Offline capability
- Push notifications
- Quick actions

### Phase 4: Integrations
- Production management software integrations
- Vector database for AI-powered search
- Document generation (contracts, call sheets)
- SSO for theater companies

### Phase 5: Analytics & Reporting
- Production analytics dashboards
- Custom report generation
- Export to PDF/Excel
- Trend analysis

---

## Support & Documentation

### Version Information
- **Current Version**: 27.0.0
- **Release Cycle**: Continuous deployment
- **Changelog**: Accessible via footer version link

### User Support
- **Beta Feedback**: Built-in feedback system
- **Error Reporting**: Automatic error capture
- **Admin Support**: User management and assistance

### Technical Support
- **Error Logs**: Real-time production monitoring
- **Analytics**: Usage and performance tracking
- **Auto-Resolution**: Intelligent error fixing

---

*This documentation represents the complete feature set and architecture of BackstageOS as of January 1, 2026. The platform continues to evolve based on user feedback and theater industry needs.*
