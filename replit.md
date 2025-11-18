# BackstageOS - Theater Management Platform

## Overview
BackstageOS is a comprehensive theater management platform designed for professional stage managers. Its primary purpose is to streamline production workflows by offering show-centric organization with complete data isolation, ensuring no information cross-contamination between productions. Built as a modern full-stack application, it provides professional-grade stage management tools within an intuitive, document-style interface. Key capabilities include production and team management, a robust report system, and advanced tools for script editing, props, costume tracking, and notes. The project aims to revolutionize backstage operations by providing a unified, efficient, and intuitive digital environment for theater professionals, enhancing productivity and communication.

## Recent Changes (November 2025)
- **Standardized List-Card UI Pattern**: Established consistent UI pattern across the entire application for list-based views. Pattern features: single-column list layout (space-y-3), entire cards clickable to open edit modal, no inline edit/delete icons on cards, delete button in modal footer (left side) with AlertDialog confirmation, and "Edit Template Fields" button in modal to navigate to advanced editor. Applied to Report Templates V2 and Departments; will be used throughout app for consistency.
- **V2 Report Template System - Production Ready**: Complete form-based template system replacing WYSIWYG approach with normalized data model (report_templates_v2 → template_sections → template_fields). 
  - **Backend**: Composite indexes for optimal query performance, single parallel data loading endpoint (`/api/projects/:id/templates-v2/:templateId` returns template + sections + fields in one request), transactional operations, comprehensive Zod validation, and dedicated section/field CRUD endpoints.
  - **Frontend**: Template list page at `/shows/:id/templates-v2` uses standardized list-card pattern with clickable cards and full optimistic CRUD updates (create/rename/delete feel instant). Form-based template editor with parallel loading of all dependencies, optimistic updates on all mutations (sections and fields create/update/delete with automatic rollback on error), department assignment per section, and real-time preview dialog showing template structure.
  - **Departments**: Integrated department management in Show Settings (Departments tab) with standardized list-card pattern: alphabetically sorted list format, clickable cards for editing, and delete confirmation in modal footer.
  - **Performance**: All mutations use TanStack Query optimistic updates with proper query cancellation to prevent race conditions, snapshots for rollback on failure, and cache invalidation strategies. Client-side state updates happen instantly while server sync happens in background.
  - **Preview**: Template preview dialog renders read-only form showing sections, fields, and their configurations exactly as they'll appear when filling out reports.
- **Stripe Price Synchronization System**: Implemented comprehensive admin-controlled pricing system where BackstageOS is the single source of truth for subscription pricing. When admins create or update billing plans in the admin dashboard, the system automatically creates/updates Stripe Products and Prices, stores the Stripe IDs in the database, and displays them on the subscription page. Subscription checkout dynamically fetches Price IDs from billing plans instead of using hardcoded environment variables. Includes price history audit table for tracking changes, Phase 1 compensation logic with cleanup on failures, and admin UI displaying Stripe integration status with warnings for unsynced plans.

## Recent Changes (August 2025)
- **Global Save System for Template Settings**: Implemented comprehensive global save system for template settings page where users unlock to edit the entire template, make changes (department headers, field headers, formatting, layout), and lock to save ALL changes as one database transaction. Individual components no longer auto-save during editing - all changes are local until global save is triggered.
- **Layout Drag-and-Drop Persistence Fix**: Resolved critical layout collapse issue in FlexibleLayoutEditor where drag operations were corrupting layout data. Fixed race condition in initialization logic, prevented auto-save during drag operations (save only occurs on Lock button), and ensured proper data integrity preservation during position updates. Layout positions now persist correctly across navigation.
- **Complete Auto-Save Elimination**: Successfully eliminated ALL auto-save triggers from template editing system. Fixed the final auto-save corruption that was occurring during field header text editing by removing the onConfigurationChange callback from EditableFieldHeading onChange events in FlexibleLayoutEditor. Users can now safely add properties, rename headers, apply formatting, and drag items without any layout corruption. Database updates only occur when Lock button is clicked, ensuring reliable template persistence and user control over when changes are committed.
- **Global Template Margin Synchronization**: Completed implementation of adjustable margin controls in Global Template Settings that synchronize with all report templates. Margins now use dynamic values from global settings instead of hardcoded "1in" padding, with proper cache invalidation ensuring real-time updates across all template interfaces.
- **Mobile UI Optimization**: Completed mobile header optimization by removing redundant page titles from mobile views and implementing clean icon-only mobile headers. Applied to Personnel, Reports, and all show-specific pages with proper mobile detection using useIsMobile hook.
- **Global Reports Page Removal**: Removed the unnecessary global reports page (reports.tsx) to eliminate confusion and maintain strict show-centric architecture. All reports functionality now exists only within specific show contexts, ensuring complete data isolation between productions.

## User Preferences
Preferred communication style: Simple, everyday language.
Dashboard design: Remove statistics/metrics - focus on recent projects and reports only.
Architecture preference: Show-centric design - all documentation must be tied to specific shows with no cross-contamination between productions.
Navigation preference: Streamlined project-centric interface - click into show to access organized categories instead of sidebar navigation.
Show organization: Reports (5 types), Calendar (Schedule + Daily Calls with drag-drop), Script, Cast, Tasks (list + board view).
Documentation types needed: Reports, props lists, scripts, costume tracking, scene shift plots, line set schedules, character/scene breakdowns, stage plots, ground plans.
UI Pattern Standard: List format (not gallery/grid) for all list-based views, entire cards clickable to open edit modal, no inline edit/delete icons on cards, delete button in modal footer with confirmation dialog. This pattern ensures consistency across the entire application.

## System Architecture
BackstageOS is built with a show-centric design, ensuring complete data isolation per production.

**Frontend Architecture:**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn/UI components on Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **Design System**: "new-york" style variant with CSS custom properties for themes.
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints.
- **UI/UX Decisions**: Clean, minimal interface, borderless/document-style editing, Gmail-style email views, Apple Mail-style mobile experiences, iOS-style pull-to-reveal breadcrumbs, and consistent icon-only button designs.

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
- **Data Isolation**: All content is project-scoped via foreign keys. Key tables include `users`, `projects`, `sessions`, `reports`, `report_templates`, `show_documents`, `show_schedules`, `show_characters`, and `team_members`.

**Core Architectural Decisions & Features:**
- **Authentication System**: Secure login, user profiles (freelance vs full-time), and role-based permissions.
- **Project Management**: Show-centric organization, multi-stage project lifecycle, team member management, and secure sharing.
- **Report System**: Four report types (rehearsal, tech, performance, meeting) with custom templates, rich text editing, and document-style interface. Tech reports use global header/footer settings.
- **Advanced Tools**: Script editor with cue-building, props/costume trackers, Apple Notes/Notion-style notes system, drag-and-drop availability management.
- **Admin & Beta Features**: Admin dashboard for user management, user perspective switching, and a three-tier beta access control system for phased feature rollout.
- **PWA Implementation**: Foundation for offline capabilities, background sync, native app appearance, and smart install banners.
- **Email System (Planned)**: Comprehensive email client with IMAP integration, two-way sync, threaded views, and theater-specific features.
- **Calendar System (Planned)**: Drag-and-drop scheduling with daily call sheet generation and integration with team availability.
- **Smart Search System**: Natural language processing, contextual queries, and result ranking across all production data.
- **Layout Persistence**: Robust saving mechanisms with global save system ensure user customizations (template layouts, department configurations, field headers, formatting) persist reliably across sessions. Global save prevents corruption by batching all changes into single database transaction on Lock button click rather than individual auto-saves during editing.
- **Error Handling**: Comprehensive error logging, real-time notifications, automated resolution strategies, and advanced analytics for proactive issue management.
- **Subscription System**: Tiered pricing with access control based on subscription status.

## External Dependencies
- **Replit Auth** (primary authentication provider, deprecated in favor of custom auth system)
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
- **SendGrid** (email delivery)
- **Cloudflare API** (DNS management, email routing, BIMI)
- **Stripe** (payment processing)
- **OpenAI API** (for smart search natural language processing)
- **jsPDF** and **html2canvas** (for PDF generation)
- **Sharp library** (for image optimization)
- **mamouth library** (for Word document text extraction)
- **React Grid Layout** (for drag-and-drop layouts)