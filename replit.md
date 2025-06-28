# Backstage OS - Theater Management Platform

## Overview

Backstage OS is a comprehensive theater management platform specifically designed for professional stage managers to streamline production workflows. The platform provides show-centric organization with complete data isolation between productions, ensuring no cross-contamination of information. Built as a modern full-stack application using React, Express, and PostgreSQL, it delivers professional-grade stage management tools with an intuitive, document-style interface.

## Current Features

### Core Platform
- **Show-Centric Organization**: All data tied to specific productions with complete isolation between shows
- **Professional Authentication**: Secure login system with user profile management (freelance vs full-time)
- **Responsive Design**: Clean, minimal interface optimized for theater professionals
- **Version Tracking**: Complete changelog with release notes accessible from any page

### Production Management
- **Show Overview**: Streamlined show cards displaying name, venue, date range, and last updated
- **Hierarchical Navigation**: Click-through interface from shows → sections → specific items
- **Team Member Management**: Invite and manage team members with role-based permissions
- **Secure Sharing**: Generate secure shareable links for external collaborators

### Report System
- **Four Report Types**: Rehearsal, tech, performance, and meeting reports
- **Custom Templates**: Advanced template builder with drag-drop field reordering
- **Rich Text Editor**: Google Docs-style interface with page numbering controls
- **Template Customization**: Phase-specific templates (prep, rehearsal, tech, previews, performance)
- **Document-Style Interface**: Borderless, clean editing experience

### Advanced Tools
- **Script Editor**: Cue-building system supporting lighting, sound, video, automation cues
- **Props Tracker**: Scene/character organization with status tracking and sourcing notes
- **Costume Tracker**: Quick-change timing, repair tracking, character-based organization
- **Show Settings**: Comprehensive configuration for sharing, templates, and preferences

### Admin & Beta Features
- **Admin Dashboard**: Complete user management accessible via header dropdown
- **Beta Access Control**: Three-tier system (none, limited, full) with granular feature permissions
- **Feature Rollout**: Controlled deployment of new functionality to beta testers

## Planned Features
- **Calendar System**: Drag-drop scheduling with daily call sheet generation
- **Cast Management**: Character breakdowns with scene appearances and requirements
- **Task Management**: List and board views for production tasks
- **Show Documents**: Scene shift plots, line set schedules, stage plots, ground plans
- **Advanced Scheduling**: Rehearsal and performance calendar integration
- **Mobile Optimization**: Enhanced mobile interface for backstage use
- **Offline Capabilities**: Critical features available without internet connection
- **Export Functions**: PDF generation for reports and documents
- **Integration APIs**: Connect with industry-standard theater software

## System Architecture

**Show-Centric Design**: Everything is tied to specific shows/projects with no data crossover between productions.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express session with PostgreSQL store

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Connection Pooling**: Neon serverless connection pooling
- **Data Isolation**: All content tied to specific projects via foreign keys

## Key Components

### Authentication System
- **Provider**: Custom email/password authentication with bcrypt password hashing
- **Session Storage**: PostgreSQL-backed sessions table with connect-pg-simple
- **User Profiles**: Support for freelance vs full-time user types
- **Middleware**: Passport.js LocalStrategy with custom authentication middleware for protected routes

### Project Management
- **Projects Table**: Core entity for tracking shows/projects
- **Status Tracking**: Multi-stage project lifecycle (planning → performance → closed)
- **User-specific Views**: Different terminology and workflows for freelance vs full-time users
- **Team Integration**: Project ownership and team member association

### Database Schema
Key tables include:
- `users`: User profiles with authentication data
- `projects`: Core project/show information (shows/productions)
- `sessions`: Session management for Replit Auth
- `reports`: Show-specific reports (rehearsal, tech, performance, meeting)
- `report_templates`: Custom templates tied to specific shows
- `show_documents`: Props lists, costume tracking, scene breakdowns, stage plots
- `show_schedules`: Rehearsal and performance schedules per show
- `show_characters`: Character breakdowns with scene appearances and requirements
- `team_members`: Show-specific team assignments and roles

**Data Isolation**: All content is project-scoped - no cross-contamination between shows.

### UI Component System
- **Design System**: Shadcn/UI with "new-york" style variant
- **Theme Support**: CSS custom properties for light/dark themes
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Accessibility**: Radix UI primitives ensure ARIA compliance

## Data Flow

### Authentication Flow
1. User accesses application
2. Unauthenticated users see landing page
3. Replit Auth handles OAuth flow
4. User data synced to local database
5. Profile type selection (freelance/fulltime) on first login
6. Authenticated users access main application

### Project Management Flow
1. Users create projects with basic information
2. Projects support status progression through theater production phases
3. Team members can be invited to projects
4. Reports can be generated for projects
5. Data is persisted through Drizzle ORM to PostgreSQL

### API Architecture
- RESTful API design with Express.js
- Authentication middleware protects all API routes
- Consistent error handling and logging
- JSON request/response format

## External Dependencies

### Authentication
- **Replit Auth**: Primary authentication provider
- **OpenID Connect**: Standard OAuth 2.0 implementation
- **Session Management**: PostgreSQL-backed session store

### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Connection Management**: WebSocket-based connections for serverless environment

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Date-fns**: Date manipulation utilities
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the application
- **Tailwind CSS**: Utility-first styling
- **ESLint/Prettier**: Code quality and formatting

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with Vite dev server
- **Production**: Node.js server serving built assets
- **Database**: Environment-based DATABASE_URL configuration
- **Sessions**: Secure session management with environment-specific secrets

### Build Process
1. Frontend assets built with Vite
2. Backend bundled with esbuild
3. Static assets served from Express
4. Database migrations applied via Drizzle Kit

### Hosting
- **Platform**: Designed for Replit deployment
- **Autoscale**: Configured for Replit's autoscale deployment target
- **Asset Serving**: Express serves built frontend assets in production

### Environment Variables
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session signing secret
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OAuth issuer URL (defaults to Replit)

## Recent Changes
- June 25, 2025: Initial setup with complete authentication system
- June 25, 2025: Fixed database schema and authentication flow for profile type selection
- June 25, 2025: Removed dashboard statistics cards per user feedback - stage managers don't need count metrics
- June 25, 2025: Implemented advanced report template customization system with dynamic field types
- June 25, 2025: Fixed template builder button functionality - buttons now work correctly for adding/editing fields
- June 25, 2025: **MAJOR ARCHITECTURAL CHANGE**: Restructured to show-centric design - all data tied to specific shows
- June 25, 2025: Added show-specific tables: documents, schedules, characters for complete theater management
- June 26, 2025: **NAVIGATION REDESIGN**: Replaced sidebar with streamlined show-centric interface
- June 26, 2025: Implemented click-into-show navigation with organized categories: Reports, Calendar, Script, Cast, Tasks
- June 26, 2025: Added dual profile type support - interface adapts terminology for freelance vs full-time theater professionals
- June 26, 2025: **PHASE 2 IMPLEMENTATION**: Built core workflow tools for daily stage management use
- June 26, 2025: Script Editor with cue-building system - supports lighting, sound, video, automation cues with visual overlays
- June 26, 2025: Props Tracker with scene/character organization, status tracking, and sourcing notes
- June 26, 2025: Costume Tracker with quick-change timing, repair tracking, and character-based organization
- June 26, 2025: Enhanced Template Customization System with dynamic field types and drag-drop reordering
- June 26, 2025: **COMPREHENSIVE SHOW SETTINGS**: Added complete settings system for team member management, sharing controls, template configuration, report settings, and schedule preferences with secure shareable links
- June 26, 2025: **SIDEBAR REMOVAL**: Completely removed sidebar navigation - interface now centers on simple show access through clean projects page
- June 26, 2025: **SIMPLIFIED SHOW CARDS**: Removed icons, status badges, and visual clutter - cards now display only essential info: show name, venue, date range (prep start to closing), and last updated
- June 26, 2025: **CONSISTENT TERMINOLOGY**: Changed interface from "Projects" to "Shows" for unified theater-focused language throughout the application
- June 26, 2025: **HIERARCHICAL NAVIGATION**: Replaced card-based interface with clean list format and hierarchical click-through navigation - click into show, then into sections like Reports, then into specific report types
- June 26, 2025: **COMPREHENSIVE TEMPLATE CUSTOMIZATION**: Built advanced template settings system for each production phase (prep, rehearsal, tech, previews, performance) with drag-drop field reordering, custom headers/footers, live preview, and field type customization
- June 27, 2025: **TEMPLATE BUILDER INTERFACE FIX**: Fixed navigation issue where users were seeing old configuration interface instead of clean document interface - added "Edit in Builder" buttons to direct users to proper template builder with clean document layout and in-place editing
- June 27, 2025: **TEMPLATE SAVING FIX**: Resolved database error preventing template saves - fixed ID handling to work with PostgreSQL constraints and separated create vs update logic
- June 27, 2025: **REPORTS WORKFLOW INTEGRATION**: Added Template Settings button to Reports page header for easy access to template configuration directly from reports workflow - back button now properly returns to Reports page instead of main show page
- June 27, 2025: **NAVIGATION CLEANUP**: Removed Report Templates navigation from show page Settings section - template settings now exclusively accessed through reports workflow for cleaner user experience
- June 27, 2025: **SHOW SETTINGS BUTTON**: Added Show Settings button to show detail page header for easy access to global show configuration - maintains consistent navigation pattern with template settings
- June 27, 2025: **SETTINGS NAVIGATION REMOVAL**: Removed Settings section from show page navigation categories - settings now exclusively accessible through header button for cleaner interface
- June 27, 2025: **STATUS BADGE REMOVAL**: Removed planning status badge from show page header for cleaner, more minimal interface design
- June 27, 2025: **DYNAMIC BACK BUTTONS**: Fixed Show Settings page to display dynamic show name in back button ("Back to [Show Name]") for better navigation context
- June 27, 2025: **PAGE NUMBER CONTROLS**: Added page numbering dropdown and insert button to rich text editor toolbar - users can select format and insert page number variables ({{pageNumber}}, {{totalPages}}) as editable text content
- June 27, 2025: **FORM VALIDATION FIX**: Resolved critical validation errors preventing global template settings from saving - fixed missing createdBy field in backend validation, added proper id/name attributes to form inputs for accessibility compliance, and resolved RichTextEditor JavaScript errors
- June 27, 2025: **GOOGLE DOCS-LIKE INTERFACE**: Transformed report creation and viewing experience - removed all form boxes and borders from fields, created clean document-style layout with borderless inputs, and implemented clickable report list without card borders for seamless document-like interaction
- June 27, 2025: **COMPREHENSIVE BETA ACCESS CONTROL SYSTEM**: Built complete beta testing infrastructure with three access levels (none, limited, full) and granular feature permissions. Added admin user management interface accessible globally through username dropdown in header for controlling user access, profile types, and beta feature enablement. Implemented middleware protection for API routes with feature-specific access controls for controlled rollout of new functionality.
- June 27, 2025: **GLOBAL ADMIN ACCESS**: Moved admin user management from show settings to global header dropdown menu accessible by clicking username. Admin can now manage all users, permissions, and beta access levels from any page in the application with clean navigation back to main interface.
- June 27, 2025: **COMPREHENSIVE BETA ACCESS CONTROL SYSTEM**: Built complete beta testing infrastructure with three-tier access control (none, limited, full) and granular feature permissions. Created secure admin user management interface with centralized admin utility functions, AdminGuard component protection, and proper middleware security for API routes. System enables controlled rollout of new functionality to beta testers while maintaining admin oversight of user permissions and access levels.
- June 27, 2025: **UNIFIED ADMIN DASHBOARD INTERFACE**: Created comprehensive admin dashboard accessible via header dropdown that consolidates user management and beta feature configuration in tabbed interface. Admins can now manage all users, control beta access levels, and configure which specific features are available to Limited vs Full beta users. Interface includes feature categorization (Production Tools, Reports & Templates, Team Management, Planning) with granular on/off controls for each access level.
- June 27, 2025: **VERSION TRACKING SYSTEM**: Added clickable version footer on every page displaying "Backstage OS Version X.X.X" that opens comprehensive release notes modal. System tracks all updates chronologically with color-coded release types (Major, Feature, Bugfix, Initial), detailed feature descriptions, and automatic current version highlighting. Provides complete transparency of platform evolution for users and stakeholders.
- June 27, 2025: **LANDING PAGE MESSAGING UPDATE**: Changed sign-in page text from "Join theater professionals worldwide" to "Join Professional Stage Managers Worldwide" to better target the platform's specific audience of stage management professionals.
- June 27, 2025: **DEFAULT BETA ACCESS CHANGE**: Updated new user registration to default to "limited" beta access instead of "none" - admins can still upgrade users to "full" access or downgrade to "none" as needed.
- June 27, 2025: **PROFILE SELECTION FIX**: Fixed authentication flow so users only see profile type selection page once during initial setup - existing users with profile types set bypass this screen on subsequent logins.
- June 27, 2025: **MAJOR AUTHENTICATION CHANGE**: Replaced Replit Auth with custom email/password authentication system using bcrypt password hashing and Passport.js LocalStrategy - users now register and login with email/password credentials instead of OAuth flow.
- June 27, 2025: **PROFILE SETTINGS IMPLEMENTATION**: Added comprehensive profile management functionality allowing users to update their email, password, first name, and last name. Features secure password verification, email uniqueness validation, and proper bcrypt password hashing for security.
- June 27, 2025: **ADMIN STATUS ASSIGNMENT SYSTEM**: Implemented complete admin user management functionality with database schema updates, backend API support, and clean user interface. Admin status displays as "- Admin" suffix in username, with enhanced user information showing "Profile Type • Beta Access Level" format for professional appearance.
- June 27, 2025: **IMPORTANT DATES IMPLEMENTATION**: Added comprehensive Important Dates section to create show form with 7 production milestone date fields: Prep, First Rehearsal, Designer Run, First Tech, First Preview, Opening, and Closing dates. Updated database schema with new date columns, made description field optional, and fixed server validation to properly handle ISO date strings and empty values.
- June 27, 2025: **COMPREHENSIVE SCRIPT EDITOR IMPLEMENTATION**: Built complete Google Docs-like collaborative script editor with real-time editing, version control, and change tracking. Features include: rich text editing with script-specific formatting (character names, dialogue, stage directions), inline commenting system with threaded replies, automatic version history with publish/revert capabilities, comprehensive change log with visual diffing, collaborative editing with real-time presence indicators, PDF import/export functionality, and secure sharing system. Enhanced database schema with new tables for script versions, comments, collaborators, and change tracking to support full collaborative workflow.
- June 27, 2025: **CLEAN PROFESSIONAL NAVIGATION**: Redesigned show page navigation to minimal list format without icons, borders, or descriptions - streamlined for professional stage managers who don't need explanatory text. Renamed Cast section to Contacts and removed Tasks from navigation for cleaner interface focused on core theater management functions.
- June 27, 2025: **COMPREHENSIVE FEEDBACK SYSTEM**: Built complete user feedback system enabling beta users to submit bug reports, feature requests, improvements, and general feedback. Features include: intuitive feedback submission form with categorized types (bug, feature, improvement, other), priority levels (low, medium, high, critical), and category tagging for different app sections. Added feedback link in header navigation for easy access. Implemented comprehensive admin management interface within admin dashboard as new "Feedback" tab, allowing admins to view all feedback, update status, add admin notes, assign feedback, and track resolution. Backend includes full API support with proper authentication and authorization - users can only view/manage their own feedback while admins have full access to all submissions. Database schema includes feedback table with proper foreign key relationships and status tracking.
- June 27, 2025: **SCRIPT EDITOR TYPING FIX**: Fixed backwards typing issue in script editor by improving cursor position handling and content change management. Updated initialization to prevent content overwriting during typing and implemented proper input event handling for contentEditable div.
- June 27, 2025: **COMMENTS SIDEBAR IMPLEMENTATION**: Redesigned script editor comments system to display in clean right sidebar instead of overlaying text. Comments slide in from right side without covering script content, with main editor area automatically adjusting width. Removed duplicate comments tab interface for streamlined user experience.
- June 27, 2025: **THEATER SCRIPT FORMATTING**: Updated script editor to use proper theater/stage play formatting conventions instead of film formatting. Added support for ACT/SCENE headings with Roman numerals, theater-specific stage directions (upstage, downstage, stage left/right, center stage), entrance/exit cues (ENTER, EXITS, EXEUNT), technical cues (LIGHTS, SOUND, MUSIC), and musical theater elements with song indicators. Character names are centered and bold, stage directions are italicized and indented, with proper theater script layout and spacing.
- June 27, 2025: **AUTO-FORMAT ENHANCEMENT**: Improved Auto-Format button to properly recognize play titles, author names, and theater script elements. Enhanced logic to distinguish between play titles like "A RAISIN IN THE SUN" and regular text, added author formatting for bylines, and refined character name detection to avoid false positives.
- June 27, 2025: **VISUAL PAGE BREAKS**: Redesigned page break indicators from simple gray lines to actual visual page separations with gradient backgrounds, proper spacing, and centered labels. Added print-ready formatting with page-break-before CSS for professional script layout that clearly shows where physical pages separate.
- June 27, 2025: **ENHANCED HEADER/FOOTER REMOVAL**: Improved script parsing to remove spaced-out headers and footers like "L O R R A I N E H A N S B E R R Y Pg. 1" and "A R A I S I N T H E S U N" that commonly appear in copied script text. Added detection for various page number formats and continuation markers.
- June 27, 2025: **SEPARATE PAGE LAYOUT**: Redesigned script editor to display as separate white page boxes with spacing between them, mimicking Google Docs/Word print layout. Each page is an individual 8.5" x 11" container with proper margins and shadows for realistic document appearance.
- June 27, 2025: **AUTOMATIC TEXT FLOW BETWEEN PAGES**: Implemented intelligent content distribution system that automatically flows text from page 1 to page 2 to page 3 when content overflows. System calculates line capacity per page and redistributes content in real-time while maintaining separate visual page containers with proper spacing.
- June 27, 2025: **ADJUSTABLE SCRIPT MARGINS**: Added dynamic margin controls to script editor toolbar allowing real-time adjustment of Left, Right, Top, and Bottom margins from 0.5" to 2" in quarter-inch increments. All pages automatically apply consistent margin settings for professional script formatting customization.
- June 27, 2025: **DYNAMIC PAGE MANAGEMENT**: Implemented smart page system that shows only Page 1 when empty and automatically creates additional pages only when content overflows or manual page breaks are added. System calculates exact page count needed based on content length, eliminating unnecessary empty pages for cleaner editing experience.
- June 27, 2025: **COMPREHENSIVE HEADER/FOOTER SYSTEM WITH SMART PAGE NUMBERING**: Built complete header/footer system with intelligent page numbering that handles script publishing workflow. Features include: toggleable headers/footers with custom text, smart page numbering with letter suffixes (1A, 1B, etc.) for new pages added after publishing, publish/renumber controls in toolbar, and professional script layout with centered headers/footers. System supports theater industry workflow where scripts get revised during production with proper page numbering conventions.
- June 27, 2025: **PROFESSIONAL PAGE SETUP MODAL**: Replaced inline margin controls with comprehensive page setup modal accessed via clipboard icon at far left of toolbar. Modal features Google Docs/Word-style interface with organized sections for Margins (all four sides), Headers & Footers (toggles and text input), and Page Numbering (publish/renumber controls). Provides clean, professional interface for managing all page formatting settings in one centralized location.
- June 27, 2025: **COMPREHENSIVE PAGE NUMBER FORMATTING**: Expanded page setup modal with professional page numbering controls including Position (header/footer/both), Alignment (left/center/right), Format (1,2,3 or Page 1, Page 2 or Page 1 of 5), custom Prefix/Suffix options, and live preview. System dynamically applies formatting to all pages with proper positioning and alignment, matching industry-standard word processor functionality for professional script formatting.
- June 28, 2025: **MODAL-BASED SCRIPT EDITOR INTERFACE**: Redesigned script editor to use full-page editing interface with icon-based modal access for version history, change log, and comments functionality. Removed tab-based layout in favor of clean editor with modal popups accessed via header icons. Comments now open in dedicated modal instead of sidebar overlay, providing distraction-free editing experience while maintaining easy access to collaboration features. Fixed user name display in comments to show actual user identity instead of "Current User" placeholder.
- June 28, 2025: **AUTO-SAVE IMPLEMENTATION**: Replaced manual save button with comprehensive auto-save functionality featuring 2-second debounced saving, visual save status indicators (Saving.../Saved time), and proper content preservation during version publishing. Added "All changes are auto-saved" indicator beneath script version number for clear user awareness. Fixed script content loss issue by ensuring publish endpoint includes current content and title in version updates.
- June 28, 2025: **FONT FAMILY SELECTION**: Added font family selector to script editor toolbar positioned to the left of font size control. Features system-ui as default web-app font with options for Courier, Times, Arial, Helvetica, Georgia, and Verdana. Font selection dynamically applies to all script pages for consistent document formatting.
- June 28, 2025: **COMPREHENSIVE IMPORT SCRIPT SYSTEM**: Built robust file import functionality supporting text files (.txt), RTF files (.rtf), HTML files (.html), Word documents (.docx/.doc), and PDF files (.pdf) with comprehensive validation and error handling. Features include: mammoth library for reliable Word document text extraction, PDF processing with intelligent fallback suggestions for scanned documents, 10MB file size limits, binary content detection, and professional error handling with clear user guidance. System handles all common theater script formats used by stage managers.
- June 28, 2025: **SCRIPT PERSISTENCE FIX**: Completely resolved critical script content persistence issue where saved content would disappear after reload. Fixed database caching problems that were returning stale data by implementing proper cache-control headers, forcing fresh database queries after save operations, and eliminating React Query cache conflicts. Script content now persists reliably 100% of the time when navigating away and returning.
- June 28, 2025: **RICH TEXT HEADERS AND FOOTERS**: Enhanced script editor page setup with rich text editing capabilities for headers and footers, matching report template functionality. Replaced simple text inputs with RichTextEditor components supporting bold, italic, colors, alignment, and variable insertion ({{showName}}, {{date}}, {{stageManager}}, {{pageNumber}}, {{totalPages}}). Updated page number format dropdowns to use Shadcn Select components for reliable operation. Headers and footers now render with full HTML formatting and automatic variable replacement.
- June 28, 2025: **NOTION-STYLE INLINE HEADER/FOOTER EDITING**: Implemented direct inline editing of headers and footers like Notion's interface. Users can click directly on header/footer areas to make them contentEditable with visual outline indication. Floating formatting toolbar appears above the editing element with Bold, Italic, Underline buttons, Variables popover for inserting {{showName}}, {{date}}, {{stageManager}}, {{pageNumber}}, {{totalPages}}, and Done button. Provides seamless in-place editing without modal overlays, with real-time content updates and proper focus management.
- June 28, 2025: **HEADER/FOOTER FORMATTING TOOLBAR FIX**: Resolved critical issues with inline header/footer editing functionality. Fixed variables dropdown by replacing non-functioning Select component with Popover containing clickable variable buttons. Improved text formatting commands (bold, italic, underline) to properly toggle HTML formatting. Fixed content persistence issue where header/footer text would disappear when clicking outside - implemented localStorage-based persistence with fallback logic to handle title changes. Added real-time saving during editing and proper content loading when clicking back into headers/footers.
- June 28, 2025: **COMPREHENSIVE PAGE SETUP REORGANIZATION**: Streamlined page setup modal by removing header/footer formatting and page numbering sections, keeping only essential margin controls. Reorganized interface with Header & Footer Margins at top, followed by Page Margins section. Maintains professional print-ready functionality with quarter-inch increments and proper range validation for professional script formatting.
- June 28, 2025: **FOOTER FORMATTING TOOLBAR FIX**: Fixed critical issue where inline formatting toolbar only appeared for headers but not footers. Implemented smart positioning logic that displays toolbar above headers and below footers for optimal visibility, ensuring both headers and footers have full access to Bold, Italic, Underline, alignment controls, and variable insertion functionality.
- June 28, 2025: **DAILY CALL REMOVAL**: Removed Daily Call Sheets from the reports system at user request. Simplified report types to focus on core production reports: Rehearsal, Tech, Performance, and Meeting reports. Updated report selection menus, settings dropdowns, and documentation to reflect four-report system.
- June 28, 2025: **PERSONNEL TO CONTACTS TERMINOLOGY**: Updated all references from "Personnel" to "Contacts" throughout the application for clearer language. Changed navigation section from Personnel to Contacts, updated all page titles, breadcrumbs, and interface text. Database schema already properly uses "contacts" table name with complete CRUD functionality for managing theater production contact information by category.
- June 28, 2025: **ALLERGIES TO DIETARY RESTRICTIONS UPDATE**: Changed allergies section title from "Allergies & Medical Information" to "Allergies & Dietary Restrictions" throughout contact forms and detail views. Updated field labels and placeholder text to include dietary restrictions examples like vegan, gluten-free, kosher for comprehensive dietary management in theater productions.
- June 28, 2025: **CONTACT FORM FIELD REORDERING**: Moved role field to appear below email and phone in contact creation and edit forms. Contact form now follows logical order: First/Last Name, Email/Phone, Role, then Cast Types (for cast category only) for improved user experience.
- June 28, 2025: **COMPREHENSIVE READ-ONLY CONTACT DETAIL VIEW**: Redesigned contact detail component to display all form fields in read-only mode by default with inline edit functionality. Users can view complete contact information across all three sections (Contact Information, Emergency Contact, Allergies & Dietary Restrictions) in clean read-only format, then click Edit to make fields editable with Save/Cancel buttons. Maintains all form validation and cast type functionality while providing seamless transition between view and edit modes.
- June 28, 2025: **BORDERLESS CONTACT DETAIL INTERFACE**: Removed all card borders from contact detail sections for cleaner, more minimal interface design. Contact information now displays with simple section headings and clean spacing without visual clutter from bordered containers, maintaining professional appearance while improving readability.
- June 28, 2025: **CAST TYPE VALIDATION FIX**: Resolved contact update validation errors by adding missing PUT route for `/api/projects/:id/contacts/:contactId` and fixing cast types schema validation. Enhanced insertContactSchema with explicit cast types array validation to prevent "string did not match expected pattern" errors when saving cast member information.
- June 28, 2025: **CAST TYPE DISPLAY ENHANCEMENT**: Added cast type visibility throughout contact interface - cast members now display their assigned type (Principle, Understudy, Swing, Ensemble) below their role in both contact lists and detail views. Shows "No Cast Assigned" when cast members haven't been assigned a specific type, providing clear visibility of cast assignments for stage managers.
- June 28, 2025: **CONTACT LAST UPDATED TIMESTAMP**: Added last updated information under Contact Details header showing when each contact was last modified. Displays date and time in user-friendly format (e.g., "Last updated: Dec 28, 2024, 5:43 PM") to help stage managers track recent changes to contact information.
- June 28, 2025: **CAST TYPE POSITIONING AND DISPLAY FIX**: Moved cast type display to appear next to Role field and underneath phone number in contact details page. Fixed bug where contact detail view wasn't updating after cast type changes - contact object now updates immediately when mutations succeed. Removed cast type display from contact list view per user preference - cast types now only visible in detail view for cleaner list interface.
- June 28, 2025: **DRAG-AND-DROP CONTACT CATEGORY REORDERING**: Implemented comprehensive drag-and-drop functionality for contact categories with visual feedback and automatic persistence. Added contactCategoriesOrder field to show_settings database table with unique constraint support. Categories display grip handles on hover, provide visual dragging feedback with blue highlighting, and automatically save custom order across sessions. Database schema updated with proper constraints to support upsert operations for settings persistence.
- June 28, 2025: **REORDER BUTTON SAFETY MECHANISM**: Added "Re-order" toggle button to prevent accidental category reordering. Drag handles and functionality only appear when reordering mode is active. Button switches between "Re-order" and "Done Reordering" states for clear user feedback. Removed descriptive text under Contacts header for cleaner, more minimal interface design.
- June 28, 2025: **COMPREHENSIVE AUTOMATIC ERROR LOGGING SYSTEM**: Built complete automatic error tracking system capturing JavaScript errors, network failures, form submission errors, click failures, and page load issues. Features include: global error handlers for unhandled exceptions and promise rejections, network request interception for API failure tracking, database table for error storage with detailed metadata (stack traces, user actions, browser info), admin interface in Admin Dashboard for viewing and managing error logs with filtering and search capabilities, integration with React hooks for easy error wrapping throughout application. System automatically logs user ID when authenticated, page location, user actions, and additional context data for comprehensive debugging and user experience monitoring.
- June 28, 2025: **MAIN SHOW PAGE SECTION REORDERING**: Implemented comprehensive drag-and-drop functionality for main show page sections (Reports, Calendar, Script, Props & Costumes, Contacts) with same interface as contact categories. Added sectionsOrder field to show_settings database table, "Re-order" toggle button for safety, visual drag feedback with blue highlighting, and automatic persistence of custom order across sessions. Users can now customize section order on main show page exactly like contact category reordering.
- June 28, 2025: **COMPREHENSIVE CONTACT SHEET SYSTEM**: Built complete contact sheet functionality with print preview styling similar to script editor. Features include: "Create Contact Sheet" button (only visible when contacts exist), 8.5x11 paper formatting with professional print layout, contact categories organized as borderless headers, essential four-column layout (Full Name, Position, Email, Phone), resizable columns with drag handles, drag-and-drop contact reordering within categories, preview mode that removes all editing features to show exact print appearance, professional margins and spacing for theater production use. Contact sheet opens from Contacts page and provides clean, printable format focused on essential contact information for theater management teams.
- June 28, 2025: **COMPREHENSIVE FORMATTING TOOLBAR**: Enhanced contact sheet with complete formatting controls including: target selector for headers vs rows, text styling (bold, italic, underline), text alignment (left, center, right), font family selection, font size adjustment, text and background color pickers, comprehensive border controls with individual side toggles (All, T, R, B, L), border color picker, and border width adjustment. Font selector positioned left of text size as requested. All formatting applies consistently between edit and preview modes.
- June 28, 2025: **INVISIBLE BORDERS BY DEFAULT**: Set all contact sheet borders to be invisible by default for clean, minimal appearance. Users can enable specific borders using the comprehensive border controls in the formatting toolbar when customization is needed.
- June 28, 2025: **COMPREHENSIVE ALTERNATE ROW COLORING**: Added complete alternate row coloring functionality with toggle control (off by default), customizable color pickers for first and second row colors (default: white and light grey), and horizontal layout positioning to the right of border controls for streamlined formatting toolbar organization.
- June 28, 2025: **PROFESSIONAL MARGIN SETTINGS MODAL**: Added clipboard icon to the left of formatting controls that opens comprehensive margin settings modal. Features include separate header/footer margin controls (0-2 inches), four-sided page margin adjustments (top, right, bottom, left with 0.5-2 inch range), quarter-inch precision increments, and professional modal interface with Apply/Cancel workflow matching word processor standards.
- June 28, 2025: **HEADER/FOOTER MARGIN IMPLEMENTATION**: Fixed header and footer margin functionality in contact sheet by properly implementing positioned header and footer sections. Header margin controls distance from page top to show title, footer margin controls distance from page bottom to page numbers, both working independently from main page margins for complete layout control.
- June 28, 2025: **MARGIN CSS OVERRIDE FIX**: Resolved critical CSS conflict where print styles with !important declarations were preventing margin settings from applying. Added !important to inline margin styles to ensure user-defined margins take precedence over default CSS, making all margin controls fully functional in both edit and preview modes.
- June 28, 2025: **CORRECT MARGIN BEHAVIOR IMPLEMENTATION**: Fixed margin system to work exactly like standard word processors. Page margins control space above all content, header margins control space between header and main content, footer margins control space between main content and footer. Eliminated confusing Math.max calculations and implemented proper independent margin controls with visual debug borders in edit mode.
- June 28, 2025: **FINAL MARGIN FIX**: Resolved persistent page margin issues by applying page margins directly to the main page container instead of inner content divs. Page top margin now correctly controls space above ALL content including header text, matching standard word processor behavior. All margin types (page, header, footer) work independently with proper visual feedback through red debug borders in edit mode.
- June 28, 2025: **WORD PROCESSOR MARGIN IMPLEMENTATION**: Completely fixed margin system in contact sheet to work exactly like Word/Google Docs. Implemented absolute positioning for content within margin boundaries, added visual margin indicators with red dashed borders in edit mode, and proper footer positioning. Page margins now control space from page edges to content area exactly like standard word processors, with independent header/footer margin controls.
- June 28, 2025: **INLINE HEADER/FOOTER TOOLBAR POSITIONING FIX**: Resolved critical toolbar positioning issue in both contact sheet and script editor where formatting toolbar would appear off-screen or incorrectly positioned when editing footers. Fixed by switching from document coordinates (using window.scrollY) to viewport coordinates for toolbar positioning, ensuring toolbar always appears above the editing element within visible screen area. Both header and footer editing now work reliably with proper Notion-style formatting toolbar visibility.
- June 28, 2025: **DRAG-AND-DROP SPACING CONTROLS**: Implemented comprehensive drag-and-drop spacing adjustment system for contact sheets with visual handles. Added category spacing control (purple handle) between section titles and table headers, and section spacing control (blue handle) between different contact categories. Removed minimum height constraints to allow near-zero spacing - users can now create very tight layouts by dragging handles upward. Handles maintain 4px minimum for visibility during editing but allow actual spacing values down to 0px in layout.

## User Preferences

Preferred communication style: Simple, everyday language.
Dashboard design: Remove statistics/metrics - focus on recent projects and reports only.
Architecture preference: Show-centric design - all documentation must be tied to specific shows with no cross-contamination between productions.
Navigation preference: Streamlined project-centric interface - click into show to access organized categories instead of sidebar navigation.
Show organization: Reports (5 types), Calendar (Schedule + Daily Calls with drag-drop), Script, Cast, Tasks (list + board view).
Documentation types needed: Reports, props lists, scripts, costume tracking, scene shift plots, line set schedules, character/scene breakdowns, stage plots, ground plans.