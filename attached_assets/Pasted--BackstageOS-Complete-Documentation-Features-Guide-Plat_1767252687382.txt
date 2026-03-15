# BackstageOS - Complete Documentation & Features Guide

**Platform**: Professional Theater Management Software  
**Version**: 26.5.0  
**Last Updated**: January 5, 2025

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Current Working Features](#current-working-features)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [User Interface Components](#user-interface-components)
6. [Authentication & Security](#authentication--security)
7. [API Endpoints](#api-endpoints)
8. [Deployment Information](#deployment-information)
9. [Recent Development History](#recent-development-history)
10. [Planned Features](#planned-features)

---

## Platform Overview

BackstageOS is a comprehensive theater management platform specifically designed for professional stage managers to streamline production workflows. The platform provides show-centric organization with complete data isolation between productions, ensuring no cross-contamination of information.

**Core Philosophy**: Everything is tied to specific shows/projects with no data crossover between productions.

### Target Users
- Professional Stage Managers (freelance and full-time)
- Theater Production Teams
- Assistant Stage Managers
- Production Managers

---

## Current Working Features

### ✅ Core Platform Features

#### Authentication System
- **Custom Email/Password Authentication** with bcrypt password hashing
- **Profile Types**: Freelance vs Full-time user categorization
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Admin System**: User management with beta access controls

#### Show Management
- **Show-Centric Organization**: All data tied to specific productions
- **Show Creation**: Name, venue, description, important dates (prep, rehearsal, tech, opening, closing)
- **Show Settings**: Comprehensive configuration system
- **Team Member Management**: Invite and manage team members with roles
- **Secure Sharing**: Generate shareable links for external collaborators

### ✅ Report System (Fully Functional)

#### Report Types
1. **Rehearsal Reports**
2. **Tech Reports** 
3. **Performance Reports**
4. **Meeting Reports**

#### Template System
- **Advanced Template Builder**: Drag-drop field reordering
- **Custom Field Types**: Text, number, date, time, dropdown, checkbox
- **Rich Text Editor**: Google Docs-style interface
- **Phase-Specific Templates**: Prep, rehearsal, tech, previews, performance
- **Header/Footer Customization**: Rich text with variables ({{showName}}, {{date}}, etc.)
- **Template Settings**: Per-show template configuration

#### Document Interface
- **Borderless Design**: Clean, document-style editing
- **Auto-Save**: Automatic content and formatting persistence
- **Field Header Formatting**: Bold, italic, colors, alignment, borders
- **Department Headers**: Customizable section headers with rich formatting
- **"Apply to All"**: Batch formatting across all headers

### ✅ Advanced Production Tools

#### Script Editor
- **Theater Script Formatting**: ACT/SCENE headings, character names, stage directions
- **Auto-Format**: Intelligent script parsing and formatting
- **Rich Text Editing**: Font families, sizes, colors, alignment
- **Page Management**: Visual page breaks, margins, headers/footers
- **File Import**: Support for .txt, .rtf, .html, .docx, .pdf files
- **Version Control**: Save, publish, revert functionality
- **Comments System**: Inline comments with threaded replies
- **Auto-Save**: Real-time content preservation

#### Props Tracker
- **Scene/Character Organization**: Track props by scenes and characters
- **Status Tracking**: Acquisition status, sourcing notes
- **Comprehensive Database**: Full CRUD operations

#### Costume Tracker
- **Character-Based Organization**: Track costumes by character
- **Quick-Change Timing**: Track costume change requirements
- **Repair Tracking**: Maintenance and repair notes

#### Availability Management
- **Visual Drag-and-Drop**: Interactive scheduling interface
- **Team Availability**: Manage cast and crew availability
- **Location Availability**: Track venue and space availability
- **Time Increment Controls**: 15, 30, 60-minute views

### ✅ Contact Management
- **Personnel Categories**: Cast, Crew, Creative Team, Producers, Venue, Other
- **Comprehensive Contact Info**: Name, role, email, phone, emergency contacts
- **Allergies & Dietary Restrictions**: Health and dietary tracking
- **Cast Types**: Principal, Ensemble, Understudy, Swing categorization
- **Full CRUD Operations**: Create, read, update, delete contacts

### ✅ Admin & Beta Features

#### Admin Dashboard
- **User Management**: View and manage all users
- **Beta Access Control**: Three-tier system (none, limited, full)
- **Feature Permissions**: Granular control over beta feature access
- **Admin Status Assignment**: Promote/demote admin users

#### Error Logging & Analytics
- **Production Error Tracking**: Real-time error capture from registered users
- **Error Clustering**: Intelligent grouping of similar errors
- **Auto-Resolution**: Automated fix application for common issues
- **Advanced Analytics**: Error trends, user satisfaction metrics
- **Admin Interface**: Error management and resolution tracking

#### Domain & Infrastructure Management
- **DNS Manager**: Complete Cloudflare DNS integration
- **Domain Manager**: Subdomain and routing configuration
- **Email Alias Management**: Email forwarding setup
- **SEO Manager**: Search engine optimization settings

### ✅ Infrastructure Features

#### Email System
- **SendGrid Integration**: Professional email delivery
- **Email Aliases**: hello@backstageos.com, sm@backstageos.com
- **Waitlist Management**: Automated signup and conversion tracking
- **Rich Text Email Templates**: HTML email composition

#### Version Tracking
- **Release Notes**: Comprehensive changelog accessible from any page
- **Version Display**: Current version (26.5.0) in footer
- **Feature History**: Complete development timeline

---

## System Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling and development
- **Shadcn/UI** components (Radix UI primitives)
- **Tailwind CSS** for styling
- **TanStack Query** (React Query) for server state
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation

### Backend Stack
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Drizzle ORM** for database operations
- **Passport.js** with LocalStrategy authentication
- **Express Session** with PostgreSQL store

### Database
- **PostgreSQL** (Neon serverless)
- **Drizzle Kit** for schema management
- **Connection Pooling** via Neon
- **Data Isolation** through foreign key relationships

---

## Database Schema

### Core Tables
- **users**: User profiles, authentication, preferences
- **projects**: Show/production information
- **sessions**: Session management
- **reports**: Show-specific reports
- **report_templates**: Custom report templates
- **contacts**: Production team contact information
- **scripts**: Script content and versions
- **props**: Props tracking and organization
- **costumes**: Costume management
- **availability**: Team and location scheduling

### Settings Tables
- **show_settings**: Per-show configuration
- **report_template_settings**: Template customization
- **seo_settings**: Search engine optimization
- **domains**: Domain and routing management

### Admin Tables
- **error_logs**: Production error tracking
- **error_clusters**: Intelligent error grouping
- **waitlist**: User registration queue
- **feedback**: User feedback and bug reports

---

## User Interface Components

### Design System
- **Shadcn/UI**: "new-york" style variant
- **Responsive Design**: Mobile-first with Tailwind breakpoints
- **Accessibility**: ARIA compliant via Radix UI
- **Dark Mode**: CSS custom properties support

### Navigation
- **Header**: User menu, admin dropdown, version link
- **Hierarchical**: Show → Section → Item navigation
- **Back Buttons**: Context-aware navigation
- **Clean Interface**: Minimal, professional design

### Forms & Inputs
- **React Hook Form**: Consistent form handling
- **Zod Validation**: Type-safe data validation
- **Rich Text Editors**: Google Docs-style interfaces
- **Drag-and-Drop**: Interactive layout management

---

## Authentication & Security

### Authentication Flow
1. Email/password registration and login
2. bcrypt password hashing
3. Passport.js LocalStrategy
4. PostgreSQL session storage
5. Profile type selection (freelance/full-time)

### Authorization
- **Route Protection**: Middleware on all API endpoints
- **Admin Access**: Role-based permissions
- **Beta Features**: Tiered access control
- **Session Security**: Secure session management

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/user` - Current user info

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Reports
- `GET /api/projects/:id/reports` - List reports
- `POST /api/projects/:id/reports` - Create report
- `GET /api/reports/:id` - Get report
- `PUT /api/reports/:id` - Update report

### Templates
- `GET /api/projects/:id/templates` - List templates
- `POST /api/projects/:id/templates` - Create template
- `PUT /api/templates/:id` - Update template

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/errors` - Error logs
- `POST /api/admin/errors/:id/fix` - Apply error fix

---

## Deployment Information

### Environment Configuration
- **Development**: Vite dev server
- **Production**: Express serving built assets
- **Database**: Neon PostgreSQL serverless
- **Hosting**: Replit autoscale deployment

### Required Environment Variables
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret
REPL_ID=replit-environment-id
ISSUER_URL=oauth-issuer-url
SENDGRID_API_KEY=sendgrid-key
CLOUDFLARE_API_KEY=cloudflare-key
CLOUDFLARE_ZONE_ID=zone-id
```

### Build Process
1. Frontend: Vite builds React app
2. Backend: TypeScript compilation
3. Assets: Express serves static files
4. Database: Drizzle migrations

---

## Recent Development History

### Major Milestones (Last 30 Days)

#### Error Resolution System (July 3-4, 2025)
- Comprehensive error logging and tracking
- Intelligent error clustering and auto-resolution
- Advanced analytics dashboard
- Production error fixes and prevention

#### Template System Enhancements (July 4, 2025)
- Flexible drag-and-drop layout planning
- Header formatting consistency
- Apply-to-all functionality improvements
- Auto-save implementation

#### Mobile Optimization (July 3, 2025)
- Responsive admin interfaces
- Mobile-friendly navigation
- Touch-optimized interactions

#### Domain & Infrastructure (June-July 2025)
- Complete domain management system
- DNS and email alias management
- SEO optimization tools
- Beta user management

---

## Planned Features

### Phase 1: Calendar System
- Drag-drop scheduling interface
- Daily call sheet generation
- Rehearsal and performance calendars
- Integration with contact availability

### Phase 2: Cast Management
- Character breakdowns
- Scene appearances tracking
- Casting requirements
- Understudy management

### Phase 3: Task Management
- Production task lists
- Board view organization
- Assignment and tracking
- Deadline management

### Phase 4: Advanced Documents
- Scene shift plots
- Line set schedules
- Stage plots and ground plans
- Technical documentation

### Phase 5: Mobile & Offline
- Enhanced mobile interface
- Offline capability
- Backstage-optimized features
- Progressive Web App (PWA)

### Future: Email System
- Complete email client integration
- IMAP/SMTP support
- Theater-specific email organization
- Production email templates

---

## Support & Documentation

### Version Information
- **Current Version**: 26.5.0
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

*This documentation represents the complete feature set and architecture of BackstageOS as of January 5, 2025. The platform continues to evolve based on user feedback and theater industry needs.*