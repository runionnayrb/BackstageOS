# Borealis

## Overview
Borealis is a production-ready, full-stack web application designed to streamline theatrical production management. It empowers Stage Managers to efficiently handle daily training reports, show lineup management, comprehensive scheduling, and real-time attendance tracking. The application supports rich text notes, tracking by various criteria (act, department, artist, location), technician lead assignments, and PDF report exports. Key features include visual stage position layouts for lineups, detailed schedule views, and an Attendance System with geofencing and PIN-based artist sign-in/sign-out. The overarching goal is to professionalize and simplify administrative tasks for theatrical productions.

## Recent Changes
### User Management Enhancements (November 2025)
- **Delete User Security Enhancement**: Changed from hardcoded admin credentials to database-verified authentication
  - Backend now validates actual admin email and password from database using secure password hash comparison
  - Only users with admin role can delete other users
  - Frontend dialog updated to show "Admin Email" label (input type: email) instead of "Admin Username"
  - Prevents unauthorized deletions and removes security vulnerability of hardcoded credentials
- **Profile Dropdown Improvements**: Alphabetically sorted profile selection with better display formatting
  - All profile dropdowns (Artist, Artistic Staff, Technical Staff) now sort case-insensitively by preferredName
  - Empty preferredName values fall back to "firstName lastName" for both sorting and display
  - Arrays are copied before sorting to prevent React Query cache mutation
  - Display format: "preferredName (firstName lastName)" when preferredName exists, or just "firstName lastName" when empty
  - Applied to both Create User and Edit User dialogs for consistency
- **Performance Optimization**: Settings page now uses conditional data fetching based on active tab (reduced from 15+ queries to 5-7 per tab)
- **Previous Bug Fix**: Fixed user creation display issue where new users showed "Unnamed User", fixed role visibility and position field handling

## User Preferences
- Administrators use a comprehensive Admin Dashboard to configure permissions, system settings, and features without coding.
- The permission system controls sidebar visibility - users can only access features visible in their sidebar based on database permissions.
- New users start with all permissions unchecked; existing users keep their current access.
- I prefer a linear-inspired professional dark mode UI with Inter/JetBrains Mono fonts and cyan accent.
- I expect mobile-first responsive design.
- I prefer robust XSS protection in rich text editors: Two-layer defense with Tiptap escaping and DOMPurify sanitization.
- I want a chronological sorting of training sessions by start time, then end time (earliest to latest).
- I prefer that training notes use RichTextEditor (Tiptap) with full formatting support including bullet/numbered lists.
- I want toast notifications for all user actions (create, update, delete).
- I prefer that all queries use TanStack Query for data fetching with automatic caching and all mutations invalidate relevant query caches for real-time updates.
- I want artist order to be manually controllable and not change when artists are updated.
- I prefer professional date formatting: Report dates display as "Wednesday, October 25, 2025" instead of raw YYYY-MM-DD format.

## System Architecture

### UI/UX Decisions
- **Design System**: Linear-inspired professional dark mode with Inter/JetBrains Mono fonts and cyan accent.
- **Responsiveness**: Mobile-first responsive design with full mobile support for all components.
- **Rich Text Editor**: Tiptap for rich text notes.
- **Navigation**: Role-based sidebar navigation with hierarchical menus.
- **Component Design**: Grouped displays for entities, hierarchical dropdowns, responsive card layouts, and mobile-optimized dialogs.

### Technical Implementations
- **Frontend**: React + Vite, Wouter for routing, TanStack Query for data management, shadcn/ui for components.
- **Backend**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM. Automatic initialization on server startup ensures admin account (bryan.runion@laperle.com) exists in both development and production with admin role.
- **Authentication**: Passport.js (local strategy, scrypt hashing, session-based).
- **Security**: Two-layer XSS protection (Tiptap + DOMPurify), role-based access control.
- **Real-time**: WebSocket server for live updates (attendance, tick sheets).
- **Geofencing**: Server-side validation using Haversine formula for attendance.
- **Data Handling**: TanStack Query for caching and state management, automatic department assignment creation, timezone-safe date parsing.
- **Email**: Microsoft Graph API integration for sending emails.

### Feature Specifications
- **Authentication & User Management**: Secure login/signup, profile management, CRUD for users and user groups (admin/SM only), password reset, role-based access, artist account linking.
- **Admin Dashboard (Admin-only)**: Comprehensive control panel at `/admin` accessible only to admin role users via profile dropdown. Five-tab interface: (1) Permission Matrix - table view of all users × all features with view/create/edit checkboxes for granular access control, (2) System Configuration - geofence settings, PDF margins/page size, file upload limits, email templates, (3) Performance Settings - pagination limits, default date ranges, cache policies, archive thresholds (configurable instead of hardcoded), (4) Security - secure admin credential management, password policies, (5) Feature Toggles - enable/disable entire features across the application.
- **Permission System**: Database-driven permission enforcement with `user_permissions` table (userId, feature, canView, canCreate, canEdit). Middleware validates permissions on every API route using HTTP method mapping (GET→canView, POST→canCreate, PUT/PATCH/DELETE→canEdit). Frontend sidebar dynamically filters menu items based on user's database permissions - if a feature is not in the sidebar, it's inaccessible. Admin users bypass permission checks but still require proper role validation. All UUID parameters are validated with Zod schema and normalized to lowercase to prevent path traversal attacks.
- **Settings Management**: Full CRUD for all entities (scenes, acts, departments, locations, artists, technicians, report template) including drag-and-drop artist reordering. Artist profile photos support client-side crop adjustment with circular preview, zoom control (1x-3x), and position adjustment before upload. **Staff Management (Artistic & Technical)**: Three-tab People section (Artists, Artistic Staff, Technical Staff) with department type categorization. Staff features include status tracking (active/out/archived), user account linking (one-to-one with duplicate prevention), profile photos with delete capability, per-department assignment with optimistic drag-and-drop reordering, archive/unarchive system with linked user account handling, and "View Archived Staff" functionality. Department validation requires at least one assignment per staff member. Drag-and-drop reordering uses optimistic updates for instant feedback (UI updates immediately, API syncs in background, automatic rollback on failure).
- **Reports & Trainings**: CRUD for reports and trainings, multi-location support, per-training artist/department customization, lead technician assignment, custom training names, rich text sections (Goal, Training Notes, Follow-Up), one report per day enforcement, audit trails.
- **PDF Export**: Customizable header/footer, specific filename formatting.
- **Email Distribution**: Outlook integration, configurable email templates.
- **Lineup Management**: Card-based view, visual drag-and-drop lineup builder with stage positions and artist assignments, EM team management, searchable artist roster, PDF export.
- **Schedule Management**: Timeline-based full schedule view (15-minute increments), per-artist weekly view, activity types with color-coding, PDF export.
- **Attendance System**: Public sign-in page with photo grid and PIN, geofencing, real-time SM dashboard with manual sign-out, Tick Sheets with optimistic UI and WebSocket sync, artist PIN management. **Weekly Attendance View**: Shows Present/Late badges for artists who signed in each day (regardless of sign-out status) - attendance tracks whether artists attended, not current on-site status. **Late Badge Logic**: Server-side calculation using Dubai timezone (Asia/Dubai, UTC+4) with 17:00 cutoff - ensures all admins see consistent late badges regardless of their timezone. **Midnight Auto-Sign-Out**: Node-cron scheduler runs at 00:00 Dubai time to automatically sign out all artists still signed in from the previous day, setting signOutTime to 23:59:59+04:00 for proper timezone tracking.
- **Training Programs & Sign-off System**: Department-based validation workflow where HOD/AHOD/Lead roles can approve training steps for their departments. **Step-level sign-off tracking**: programSteps table includes signedOffByUserId (references users.id) and signedOffAt (timestamp) fields to track validation status. **Authorization rules**: (1) Admin users can sign off any step, (2) For Stage Management department: ANY technician assigned to SM can sign off SM steps (no role requirement), (3) For all other departments: only HOD/AHOD/Lead technicians can sign off. System resolves user ID to technician ID before checking department assignments. UI displays green "Signed Off [date]" badge on validated steps, with "Sign Off" button available on unsigned steps in active programs. Department roles (HOD/AHOD/Lead) are managed in Settings > Technical Staff tab via "Manage Roles" dialog, with role display order: HOD → AHOD → Lead. Only technicians assigned to a department can receive roles, and each technician can only hold one role per department. **Artist Assignment**: Training Programs detail view includes "Assigned Artists" section with add/remove functionality. Artists can be assigned to track progress through programs using the `program_artists` table (id, program_id, artist_id, status, last_activity_at). Competencies page features "Assign Artists" button per competency row, opening dialog to grant/revoke competencies using `artist_competencies` table (id, artist_id, competency_id, program_artist_id, awarded_at, last_performed_at, expires_at, expired). All artist assignments use TanStack Query with cache invalidation for real-time updates and toast notifications for user feedback.

### System Design Choices
- **Database Schema**: Comprehensive PostgreSQL schema for all application entities including `user_permissions` table (unique constraint on userId+feature) and `system_settings` table (key-value pairs for all configurable settings). **Staff Consolidation (November 2025)**: Unified staff table architecture where both artistic and technical staff are stored in `staff_members` table (junction: `staff_departments`). Legacy `artistic_staff` tables consolidated via migration. Backwards compatibility maintained through storage layer wrappers and legacy API endpoints. Column name `technician_id` preserved in junction table to avoid breaking existing references. Frontend filters staff by department.type ('artistic' vs 'technical') for UI separation. **Lineup Foundation Schema (November 2025)**: Competencies table with camelCase columns (sceneId, actId, cueId) linking qualifications to specific show acts/scenes. Program Steps table with "description" field (renamed from "notes") describing skills being validated. Training Programs require competencyId (cannot be null) establishing flow: Competency (defines WHAT for specific act) → Training Program (defines HOW to earn competency) → Program Steps (individual validations with descriptions).
- **Permission Architecture**: Two-level structure - Admin Dashboard (system configuration, admin-only) vs Settings Page (operational data, stage managers). Permission enforcement uses atomic ON CONFLICT operations to prevent race conditions. All permission routes validate UUID parameters to prevent security bypasses.
- **Data Models**: Reusable lineup templates, show-specific lineups, and structured schedule containers.
- **API**: RESTful API for all functionalities with permission enforcement middleware (`requirePermission`, `requirePermissionByMethod`).
- **Session Management**: Session-based authentication using PostgreSQL. **Development Testing**: Admin account bryan.runion@laperle.com with password "password123" (development database only, must_change_password=0).
- **WebSocket**: Dedicated server for real-time communication.

## External Dependencies
- **Database**: PostgreSQL
- **Frontend Libraries**: React, Vite, Wouter, TanStack Query, shadcn/ui, Tiptap, react-easy-crop.
- **Backend Libraries**: Express.js, Drizzle ORM, Passport.js, scrypt.
- **Sanitization**: DOMPurify.
- **Email Integration**: Replit Outlook connector, Microsoft Graph Client.