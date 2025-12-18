# BackstageOS - Theater Management Platform

## Overview
BackstageOS is a comprehensive theater management platform for professional stage managers, designed to streamline production workflows with show-centric organization and complete data isolation. It offers professional-grade stage management tools within an intuitive, document-style interface. Key capabilities include production and team management, a robust report system, and advanced tools for script editing, props, costume tracking, and notes. The project aims to provide a unified, efficient, and intuitive digital environment for theater professionals, enhancing productivity and communication.

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
- **Build Tool**: Vite
- **UI Library**: Shadcn/UI components on Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **Design System**: "new-york" style variant with CSS custom properties for themes.
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints.
- **UI/UX Decisions**: Clean, minimal interface, borderless/document-style editing, Gmail-style email views, Apple Mail-style mobile experiences, iOS-style pull-to-reveal breadcrumbs, consistent icon-only button designs, and floating action buttons for primary mobile actions.

**Backend Architecture:**
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM
- **Authentication**: Custom email/password authentication using bcrypt and Passport.js
- **Session Management**: Express session with PostgreSQL store

**Database Architecture:**
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Connection Pooling**: Neon serverless connection pooling
- **Data Isolation**: All content is project-scoped via foreign keys.

**Core Architectural Decisions & Features:**
- **Authentication System**: Secure login, user profiles, and role-based permissions.
- **Project Management**: Show-centric organization, multi-stage project lifecycle, team management, and secure sharing.
- **Report System**: Four report types with custom templates, rich text editing, and document-style interface. Features a V2 Report Template System with:
  - Hierarchical structure: Template > Section > Field
  - Field-level department assignment for note tracking
  - Auto-sync: When reports are saved, notes in department-assigned fields are automatically parsed and synced to the report_notes system
  - Content-based matching preserves note status/priority/assignee when notes are edited
  - NoteStatusPopup: Inline popup for setting note status/priority/assignment when text is highlighted in tracked fields
  - Notes are scoped by templateFieldId to prevent interleaving between fields sharing the same department
- **Contact Management**: Flexible, user-configurable contact groups with extended contact information fields, project-scoped.
- **Email Integration**: Per-user OAuth 2.0 integration for Gmail and Outlook. Users connect their personal email accounts via popup-based OAuth flow. Tokens are encrypted with AES-256-GCM and stored per-user. Automatic token refresh ensures seamless email sending from users' own addresses.
- **Advanced Tools**: Script editor, props/costume trackers, notes system, drag-and-drop availability management.
- **Admin & Beta Features**: Admin dashboard, user perspective switching, and a three-tier beta access control. Beta settings are environment-scoped (development vs production) to ensure complete data isolation - toggling features in dev mode never affects production and vice versa.
- **PWA Implementation**: Foundation for offline capabilities, background sync, and native app appearance.
- **Layout Persistence**: Robust global save system for template settings to ensure user customizations persist reliably, preventing data corruption by batching changes into a single transaction.
- **Error Handling**: Comprehensive logging, real-time notifications, and advanced analytics.
- **Subscription System**: Tiered pricing with access control based on subscription status, integrated with Stripe for price synchronization.
- **Schedule Views**: Standardized weekly and daily schedule views with perfectly aligned grids and consistent time increment behavior, featuring visually hidden scrollbars for uniform width.
- **Weekly Versioning**: Each week maintains independent version numbers (major.minor) for granular schedule tracking. Personal schedules show current week forward with "Previous Schedules" access for historical weeks.
- **Scrollable Participant Lists**: Event popovers with large participant counts (e.g., Full Company) use scrollable containers with max-height constraints on PopoverContent.
- **Schedule Template Application**: Templates correctly apply `isProductionLevel` flag to created events without creating duplicates. Template event day offsets are calculated relative to the template's `weekStartDay` setting for accurate day placement.
- **Event Card Display Rules**: Event cards adapt layout based on duration thresholds (≤10 min, ≤30 min, 30-60 min, >60 min). When events overlap or display side-by-side, vertical centering is disabled to ensure titles always start from the top and remain readable. Overlapping short events show title first with start time only (no time range) to maximize title visibility in narrow cards.

## Recent Changes (December 2025)
- **Admin Dashboard Editor Tab Enhancement**: Redesigned the Editors tab in the Admin Dashboard to clearly separate invited editors from regular users. The Editors tab now shows who invited each editor, which productions they have access to, and their role/status in each production. Uses batched queries for optimal performance. Users who create accounts directly appear in the Users tab, while invited editors only appear in the Editors tab.
- **Configurable PDF Export Settings**: Added a new PDF Export tab in Global Template Settings allowing users to customize report PDF generation. Configurable options include font family (Helvetica, Times, Courier), font sizes for titles/sections/content, line height, and page margins. All PDF generation now uses these saved settings instead of hardcoded values.
- **Report Viewer Cursor Fix**: Fixed cursor jumping to beginning when typing in contentEditable rich text fields in report-viewer.tsx. Root cause: TanStack Query returns new array references on every query state change, causing `template.sections.map()` to rebuild the DOM tree and remount contentEditable elements. Solution: Store the template in React state (`stableTemplate`) once it's found, ensuring stable references that prevent React from recreating the rich text DOM nodes during typing. Key pattern: When using query-derived data for contentEditable fields, always copy it to state to prevent re-renders.
- **Report Title Flicker Fix**: Fixed visual flicker when navigating to report types page where title would change from fallback value to actual value. Solution: Added `reportTypesLoading` to the loading check in show-reports.tsx to wait for all data before rendering.
- **Team Member Access Fix (v26.8.0)**: Fixed access control for invited team members (editors). All notes-related endpoints now properly check team membership in addition to ownership. Team members can now create, read, update, delete, and reorder notes in projects they've been invited to. Also fixed access to project contacts, settings, reports, and schedule information for team members.
- **28-Hour Schedule Fix**: Fixed events in extended schedules (e.g., 7 AM - 2 AM next day) not displaying correctly. Events in the "after midnight" portion now render at the correct position with proper height. Fixed clicking on events at the bottom of extended schedules causing them to jump to the top. Events can now be properly dragged to the bottom of extended schedules.
- **Schedule Template Duplicate Fix**: Fixed issue where events marked as "production level" in templates were creating duplicate events. Now the `isProductionLevel` flag is applied to the single created event instead of creating a separate copy.
- **Event Card Title Visibility**: Fixed event cards cutting off titles when events overlap. Disabled vertical centering for overlapping events so titles always start from the beginning (top-aligned). For compact overlapping events, layout now stacks title above time with word-break for narrow cards.
- **Note Status Context Menu**: Added right-click context menu for notes in report edit mode. Users can now select note text and right-click to assign custom statuses from the project's Note Status settings. The context menu displays all configured statuses with their colors and includes a "Clear status" option. Available in both the rich text editor fields and the ReportNotesManager list views.

## External Dependencies
- **OpenID Connect**
- **Neon Database** (serverless PostgreSQL)
- **Radix UI** (accessible component primitives)
- **Lucide React** (icon library)
- **Date-fns** (date manipulation utilities)
- **React Hook Form**
- **Zod** (runtime type validation)
- **Vite** (build tool)
- **TypeScript**
- **Tailwind CSS**
- **ESLint/Prettier**
- **SendGrid** (email delivery fallback)
- **Cloudflare API** (DNS management)
- **Stripe** (payment processing)
- **OpenAI API** (for smart search NLP)
- **jsPDF** and **html2canvas** (for PDF generation)
- **Sharp library** (for image optimization)
- **mamouth library** (for Word document text extraction)
- **React Grid Layout** (for drag-and-drop layouts)
- **Google APIs** (Gmail OAuth 2.0 integration)
- **Microsoft Graph Client** (Outlook OAuth 2.0 integration)