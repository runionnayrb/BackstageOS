# BackstageOS - Complete Feature List

**Professional Stage Management Software**  
*Version 26.5.0 - January 2025*

---

## Overview

BackstageOS is a comprehensive theater management platform specifically designed for professional stage managers to streamline production workflows. The platform provides show-centric organization with complete data isolation between productions, ensuring no cross-contamination of information.

---

## CURRENT FEATURES (Implemented)

### Core Platform
- **Show-Centric Organization**: Complete data isolation between productions - no cross-contamination
- **Professional Authentication**: Custom email/password system with user profiles (freelance vs full-time)
- **Responsive Design**: Clean, minimal interface optimized for theater professionals
- **Version Tracking**: Complete changelog with release notes accessible from footer

### Production Management
- **Show Overview**: Streamlined show cards with name, venue, date range, and last updated
- **Hierarchical Navigation**: Click-through interface from shows → sections → specific items
- **Team Member Management**: Invite and manage team members with role-based permissions
- **Secure Sharing**: Generate secure shareable links for external collaborators
- **Important Dates**: Track 7 production milestones (Prep, First Rehearsal, Designer Run, First Tech, First Preview, Opening, Closing)

### Report System
- **Four Report Types**: Rehearsal, tech, performance, and meeting reports
- **Custom Templates**: Advanced template builder with drag-drop field reordering
- **Rich Text Editor**: Google Docs-style interface with page numbering controls
- **Template Customization**: Phase-specific templates (prep, rehearsal, tech, previews, performance)
- **Document-Style Interface**: Borderless, clean editing experience
- **Auto-Save**: Automatic saving with visual status indicators

### Script Editor (Advanced)
- **Google Docs-like Interface**: Real-time collaborative editing
- **Theater Script Formatting**: Proper stage play conventions (ACT/SCENE, character names, stage directions)
- **File Import**: Support for .txt, .rtf, .html, .docx, .doc, and .pdf files
- **Version Control**: Complete version history with publish/revert capabilities
- **Page Management**: Smart page system with automatic content flow
- **Professional Layout**: Separate page boxes with proper margins and spacing
- **Headers & Footers**: Rich text editing with variable insertion ({{showName}}, {{date}}, etc.)
- **Page Setup**: Comprehensive margin controls and page numbering options
- **Comments System**: Inline commenting with threaded replies
- **Auto-Format**: Intelligent recognition of play titles, authors, and script elements

### Production Tools
- **Props Tracker**: Scene/character organization with status tracking and sourcing notes
- **Costume Tracker**: Quick-change timing, repair tracking, character-based organization
- **Availability Management**: Visual drag-and-drop scheduling system for contact availability
- **Contact Management**: Complete contact system with team and company organization
- **Contact Sheets**: Professional contact lists with role-based filtering

### Scheduling System
- **Weekly Schedule View**: Drag-and-drop event management
- **Team Availability**: Visual availability tracking with drag-and-drop interface
- **Location Availability**: Venue and space availability management
- **Time Increment Controls**: Flexible time grid options (15, 30, 60 minutes)

### Admin & Management
- **Admin Dashboard**: Complete user management accessible via header dropdown
- **Beta Access Control**: Three-tier system (none, limited, full) with granular feature permissions
- **Feature Rollout**: Controlled deployment of new functionality to beta testers
- **Error Logging System**: Comprehensive error tracking and analysis
- **Auto-Resolution Dashboard**: Intelligent error resolution with pattern detection
- **Advanced Analytics**: Error trends, user satisfaction, and feature stability metrics
- **Feedback System**: Built-in user feedback with categorization and admin management

### SEO & Domain Management
- **SEO Manager**: Comprehensive search engine optimization with 20+ configuration fields
- **Domain Manager**: Complete domain routing and configuration
- **DNS Manager**: Full CRUD operations for DNS records via Cloudflare API
- **Email Alias Management**: Complete email forwarding setup
- **BIMI Configuration**: Email branding with custom logos for supported email clients
- **Page Manager**: Descriptive routing options and page management

### Email System (Partial)
- **Waitlist System**: Complete waitlist with position tracking and auto-conversion
- **Email Templates**: Rich text email templates with variable replacement
- **SendGrid Integration**: Domain authentication and professional email delivery
- **Email Aliases**: Professional BackstageOS email forwarding (sm@backstageos.com)

---

## PLANNED FEATURES (Documented for Implementation)

### Calendar System
- Drag-drop scheduling with daily call sheet generation
- Rehearsal and performance calendar integration
- Advanced scheduling features

### Cast Management
- Character breakdowns with scene appearances and requirements
- Casting requirements and understudy management
- Character-based organization

### Task Management
- List and board views for production tasks
- Assignment and tracking systems
- Deadline management

### Show Documents
- Scene shift plots
- Line set schedules
- Stage plots and ground plans
- Technical documentation

### Advanced Features
- Mobile optimization for backstage use
- Offline capabilities for critical features
- PDF generation for reports and documents
- Integration APIs for industry-standard theater software

### Complete Email System (Planned Implementation)
**Timeline: 7-12 weeks for complete system**

#### Phase 1: Database Schema & Core Architecture (2-3 weeks)
- Email messages storage with threading support
- Email folders/labels management
- Email attachments handling
- Email rules/filters system
- Background job system for email processing

#### Phase 2: Backend Email Processing (2-3 weeks)
- IMAP integration for syncing existing emails (Gmail, Outlook, Yahoo, custom servers)
- Enhanced SMTP system beyond current SendGrid integration
- Two-way email sync (read status, deletions, folder moves)
- Email queue system for reliable delivery
- Bounce and delivery tracking

#### Phase 3: Frontend Email Client (2-3 weeks)
- Complete email interface (Inbox, Sent, Drafts, Folders)
- Email composer using existing rich text editor
- Threaded conversation view
- Advanced search and filtering
- Contact auto-complete integration with existing contacts system

#### Phase 4: Theater-Specific Features (2-4 weeks)
- Show-centric email organization and auto-categorization
- Production email templates (call sheets, rehearsal notes)
- Bulk email to cast/crew by role or category
- Email rules engine for auto-filing by production
- Integration with scheduling system for email reminders

#### Phase 5: Advanced Integration (1-2 weeks)
- Shared inboxes for production teams
- Email delegation and assignment
- Team collaboration on email threads
- Email archiving by show completion

---

## Technical Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing

### Backend
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Custom email/password with bcrypt and Passport.js
- **Session Management**: Express session with PostgreSQL store

### Database
- **Database**: PostgreSQL (Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Data Isolation**: All content tied to specific projects via foreign keys

---

## Key Advantages

1. **Show-Centric Design**: Everything tied to specific shows/projects with no data crossover
2. **Professional Security**: Role-based permissions and secure sharing
3. **Theater-Specific**: Built by stage managers for stage managers
4. **Collaborative**: Real-time editing and team coordination
5. **Comprehensive**: Complete production workflow from prep to closing
6. **Scalable**: Modern architecture supporting growth and new features

---

## Target Users

- **Primary**: Professional Stage Managers
- **Secondary**: Assistant Stage Managers, Production Managers
- **Freelance**: Independent theater professionals
- **Full-time**: Resident theater company staff

---

*This feature list represents the current state and planned roadmap for BackstageOS as of January 2025. The platform continues to evolve based on user feedback and industry needs.*