# BackstageOS - Theater Management Platform

## Overview
BackstageOS is a comprehensive theater management platform designed for professional stage managers to streamline production workflows. It offers a show-centric organization with complete data isolation, providing professional-grade tools within an intuitive, document-style interface. Key capabilities include production and team management, a robust report system, and advanced tools for script editing, props, costume tracking, and notes. The project aims to create a unified, efficient, and intuitive digital environment for theater professionals, enhancing productivity and communication.

## User Preferences
Preferred communication style: Simple, everyday language.
Dashboard design: Remove statistics/metrics - focus on recent projects and reports only.
Architecture preference: Show-centric design - all documentation must be tied to specific shows with no cross-contamination between productions.
Navigation preference: Streamlined project-centric interface - click into show to access organized categories instead of sidebar navigation.
Show organization: Reports (5 types), Calendar (Schedule + Daily Calls with drag-drop), Script, Cast, Tasks (list + board view).
Documentation types needed: Reports, props lists, scripts, costume tracking, scene shift plots, line set schedules, character/scene breakdowns, stage plots, ground plans.
UI Pattern Standard: List format (not gallery/grid) for all list-based views, entire cards clickable to open edit modal, no inline edit/delete icons on cards, delete button in modal footer with confirmation dialog. This pattern ensures consistency across the entire application.
Contact Management: Flexible, user-configurable contact groups that replace hardcoded categories. Groups are project-scoped for multi-project support. Each contact can be assigned to a group and includes extended information fields (preferred name, WhatsApp).

## System Architecture
BackstageOS is built with a show-centric design, ensuring complete data isolation per production.

**Frontend Architecture:**
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/UI components on Radix UI primitives, styled with Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Clean, minimal interface, borderless/document-style editing, mobile-first responsive design, Gmail/Apple Mail-style interaction patterns, consistent icon-only buttons, and floating action buttons.

**Backend Architecture:**
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM
- **Authentication**: Custom email/password using bcrypt and Passport.js
- **Session Management**: Express session with PostgreSQL store (connect-pg-simple)
- **CRITICAL Cookie/Session Rules** (DO NOT CHANGE):
  - Cookies MUST use `secure: true` and `sameSite: 'none'` on Replit and production (HTTPS environments) — required for Replit webview iframe compatibility and cross-site cookie handling.
  - Only use `secure: false` / `sameSite: 'lax'` for plain localhost HTTP development.
  - Detection: `const isReplit = !!(process.env.REPL_ID || process.env.REPL_SLUG)` — if true, always use secure cookies.
  - Passport 0.7+ requires a custom `req.session.regenerate` wrapper to work with connect-pg-simple (see middleware in `server/auth.ts`).
  - Service worker (`client/public/sw.js`) must NEVER intercept `/api/*` requests — they bypass the SW entirely to avoid cookie/credential issues.
  - Login/register mutations must NOT call `queryClient.clear()` — this causes race conditions with the `/api/user` refetch.

**Database Architecture:**
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Data Isolation**: All content is project-scoped via foreign keys.

**Core Architectural Decisions & Features:**
- **Authentication System**: Secure login, user profiles, and role-based permissions.
- **Project Management**: Show-centric organization, multi-stage project lifecycle, team management, and secure sharing.
- **Report System**: Four report types with custom templates, rich text editing, and a document-style interface. Features a V2 Report Template System with hierarchical structure, field-level department assignment, auto-syncing of notes, and inline status/priority assignment.
- **Contact Management**: Flexible, project-scoped, user-configurable contact groups with extended information fields.
- **Email Integration**: Per-user OAuth 2.0 integration for Gmail and Outlook, allowing sending emails from users' own addresses.
- **Advanced Tools**: Script editor, props/costume trackers, notes system, drag-and-drop availability management.
- **Admin & Beta Features**: Admin dashboard, user perspective switching, and three-tier beta access control with environment-scoped settings.
- **PWA Implementation**: Foundation for offline capabilities and native app appearance.
- **Layout Persistence**: Robust global save system for template settings to ensure user customizations persist.
- **Per-Show Billing System**: A per-show billing model with `limited_run` and `long_running` classifications, including a 14-day free trial, Stripe integration for activation and monthly subscriptions, and access control for unpaid shows.
- **Stripe-First Billing Architecture**: Products and prices are managed directly in Stripe Dashboard (source of truth). Admin billing tab is read-only, displaying Stripe data. User billing management uses Stripe Customer Portal for payment methods, invoices, and subscription changes.
- **Feature Toggle System**: Replaces legacy profile types (Freelance/Full-Time) with per-show feature settings. Users configure default feature preferences during onboarding, and each show can override these settings. Features include: reports, calendar, script, props, costumes, contacts, chat, and seasons. The seasons feature enables venue and season management for theater-based work. Feature settings are stored in showSettings.featureSettings (JSONB) and user defaults in users.defaultFeaturePreferences.
- **Schedule Views**: Standardized weekly and daily schedule views with aligned grids, consistent time increments, and visually hidden scrollbars. Supports weekly versioning for granular tracking.
- **Document Templating System**: Allows users to upload custom Word (.docx) templates with placeholders for exporting reports and contacts.
- **Configurable PDF Export Settings**: Users can customize report PDF generation settings including font family, sizes, line height, and page margins.
- **Daily Call Field Type**: Template editor supports a `dailycall` field type that auto-imports the next scheduled daily call data (locations, events, announcements) into reports. Stored as JSON in report content.
- **Multi-Performance Linking**: Reports support linking to multiple performances via `linkedEventIds` (jsonb array) in the reports table. UI uses checkbox-based multi-select. Backward compatible with legacy single `scheduleEventId`.
- **Batch Send Reports**: "Send Reports" button on report list pages opens a two-step modal: (1) select reports with today's pre-selected, (2) compose email with combined content and individual PDF attachments. Uses distribution lists when assigned.

## External Dependencies
- **Neon Database** (serverless PostgreSQL)
- **Radix UI** (accessible component primitives)
- **Lucide React** (icon library)
- **Date-fns** (date manipulation)
- **Zod** (runtime type validation)
- **Tailwind CSS**
- **SendGrid** (email delivery fallback)
- **Stripe** (payment processing)
- **OpenAI API** (for smart search NLP)
- **jsPDF** and **html2canvas** (for PDF generation)
- **Sharp library** (for image optimization)
- **Google APIs** (Gmail OAuth 2.0)
- **Microsoft Graph Client** (Outlook OAuth 2.0)
- **docxtemplater** and **pizzip** (for Word document template processing)