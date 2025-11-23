# BackstageOS - Theater Management Platform

## Overview
BackstageOS is a comprehensive theater management platform designed for professional stage managers. Its primary purpose is to streamline production workflows by offering show-centric organization with complete data isolation, ensuring no information cross-contamination between productions. Built as a modern full-stack application, it provides professional-grade stage management tools within an intuitive, document-style interface. Key capabilities include production and team management, a robust report system, and advanced tools for script editing, props, costume tracking, and notes. The project aims to revolutionize backstage operations by providing a unified, efficient, and intuitive digital environment for theater professionals, enhancing productivity and communication.

## Recent Changes (November 2025)
- **Contact Management Enhancements (November 23, 2025)**:
  - **New Contact Fields**: Added three new fields to contacts table and UI:
    - `preferredName` - optional field for stage name or preferred name (displayed next to Last Name in edit modal)
    - `whatsapp` - optional WhatsApp phone number (displayed next to Mobile/Phone with auto-formatting)
    - `groupId` - foreign key linking contacts to flexible, user-configurable contact groups (replaces hardcoded categories)
  - **Database Migration**: Successfully added missing columns to contacts table using direct SQL. All three columns are nullable VARCHAR for flexibility.
  - **UI Layout Updates**: 
    - Contact Information section redesigned: First row (First/Last/Preferred Name), Second row (Email/Mobile/WhatsApp), Third row (Contact Group), Fourth row (Role)
    - Contact Group field positioned directly underneath Mobile field in read-only view
    - Photo section now only displays when a photo exists or during edit mode (hidden in read-only view if no photo)
  - **Label Changes**: Changed "Phone" label to "Mobile" throughout the interface for clarity
  - **Form Cleanup**: Removed old hardcoded Contact Type field (cast, crew, creative team, etc.) from create contact modal - now uses only flexible Contact Group system
  - **Button Styling**: Updated Edit/Save/Close buttons in contact detail modal to display as clean icon-only buttons with gray text, no background, and blue hover color effect
  - **Mobile Header Redesign**:
    - Removed Plus icon from mobile header
    - Added Groups button (Users icon) between Document icon and Plus icon
    - Implemented floating action button (FAB) at bottom right of page for adding new contacts on mobile only
    - Fixed dropdown alignment for Contact Sheet/Company List dropdown (side="bottom" align="end" sideOffset={8})
  - **Mobile Schedule**: Removed back arrow button from mobile schedule page header for cleaner design
- **Mobile UI Consistency (November 23, 2025)**:
  - **Floating Action Buttons**: Implemented blue circular + FAB at bottom right on mobile-only views for Props, Costumes, and Contacts pages
  - **Header Icon Consolidation**: Removed Plus icon from mobile headers on Props, Costumes, and Contacts pages. Added to floating button instead for consistent mobile UX pattern
  - **Implementation**: All three pages (Props, Costumes, Contacts) now use FloatingActionButton component from `@/components/navigation/floating-action-button` for mobile add functionality
- **Weekly & Daily Schedule View Alignment & Standardization (November 18, 2025)**: 
  - **Weekly View Vertical Alignment Fix**: Resolved critical alignment issue where vertical day separator lines weren't aligning across header, all-day events section, and time grid. Root cause was scrollbar width discrepancy - time grid had scrollbar while header/all-day sections didn't, causing different width calculations. Solution: Hidden scrollbar visually using CSS (`.scrollbar-hide` class with `::-webkit-scrollbar { display: none }` and `scrollbarWidth: 'none'`, `msOverflowStyle: 'none'` for Firefox/IE/Edge) while maintaining scroll functionality. This ensures all sections have identical widths for perfect column alignment.
  - **Weekly View Structure**: Fixed sections now include header row (24px height with date labels) and All Day events section (60px min height), both non-scrolling. Only the time grid (600px max height) scrolls, with scrollbar hidden. All sections use same column calculation formula: `calc(64px + (100% - 64px) * ${dayIndex} / 7)` for precise alignment.
  - **Daily View Standardization**: Updated daily schedule view to match weekly view structure exactly. Changed from showing time labels at every increment (15/30/60 min) to showing only hour labels (every 60 minutes) on the left sidebar, matching weekly view pattern. Added separate increment lines that render at each time increment based on settings, creating visual grid independent of labels. Removed extra padding (5px) that was causing spacing differences. Container height changed from `TOTAL_MINUTES + 15` to `TOTAL_MINUTES` for exact match with weekly view.
  - **Time Label Generation**: Both views now use identical logic - `timeLabels` array contains only hours (8 AM to midnight, every 60 minutes) with formatted display via `formatTimeDisplay()`. Separate `incrementLines` array handles grid line rendering at user-selected intervals (15, 30, or 60 minutes).
  - **Consistent Spacing**: Both views use 1:1 pixel-to-minute ratio with `START_MINUTES = 480` (8 AM) and `END_MINUTES = 1440` (midnight), `TOTAL_MINUTES = 960`. Position calculation via `minutesToPosition(minutes)` returns `Math.max(0, minutes - START_MINUTES)` ensuring consistent vertical positioning across both views.
  - **Result**: Daily view now looks identical to weekly view but displays single day at a time. Both views have perfectly aligned grid lines, consistent spacing, and unified time increment behavior based on user settings.
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
Contact Management: Flexible, user-configurable contact groups that replace hardcoded categories. Groups are project-scoped for multi-project support. Each contact can be assigned to a group and includes extended information fields (preferred name, WhatsApp).

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
- **Data Isolation**: All content is project-scoped via foreign keys. Key tables include `users`, `projects`, `sessions`, `reports`, `report_templates`, `show_documents`, `show_schedules`, `show_characters`, `team_members`, `contacts`, and `contact_groups`.

**Core Architectural Decisions & Features:**
- **Authentication System**: Secure login, user profiles (freelance vs full-time), and role-based permissions.
- **Project Management**: Show-centric organization, multi-stage project lifecycle, team member management, and secure sharing.
- **Report System**: Four report types (rehearsal, tech, performance, meeting) with custom templates, rich text editing, and document-style interface. Tech reports use global header/footer settings.
- **Contact Management**: Flexible contact groups that replace hardcoded categories, with extended contact information fields (preferred name, WhatsApp, group assignment). Groups are project-scoped and user-configurable with drag-to-reorder functionality.
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
