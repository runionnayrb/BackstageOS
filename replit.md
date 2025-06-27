# Backstage OS - Theater Management Platform

## Overview

Backstage OS is a modern web application designed for theater professionals to manage projects, teams, and reports. The platform supports two user types: freelance theater professionals and full-time theater employees, each with tailored workflows. Built as a full-stack application using React, Express, and PostgreSQL, it provides comprehensive stage management capabilities.

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
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions table
- **User Profiles**: Support for freelance vs full-time user types
- **Middleware**: Custom authentication middleware for protected routes

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

## User Preferences

Preferred communication style: Simple, everyday language.
Dashboard design: Remove statistics/metrics - focus on recent projects and reports only.
Architecture preference: Show-centric design - all documentation must be tied to specific shows with no cross-contamination between productions.
Navigation preference: Streamlined project-centric interface - click into show to access organized categories instead of sidebar navigation.
Show organization: Reports (5 types), Calendar (Schedule + Daily Calls with drag-drop), Script, Cast, Tasks (list + board view).
Documentation types needed: Reports, props lists, scripts, costume tracking, scene shift plots, line set schedules, character/scene breakdowns, stage plots, ground plans.