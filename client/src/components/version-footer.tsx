import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Archive } from "lucide-react";
import { Link } from "wouter";

const CURRENT_VERSION = "26.7.0";

const RELEASE_NOTES = [
  {
    version: "26.7.0",
    date: "December 9, 2025",
    type: "Bugfix",
    features: [
      "<strong><u>28-HOUR SCHEDULE FIX:</u></strong>",
      "Fixed events in extended schedules (e.g., 7 AM - 2 AM next day) not displaying correctly - events in the 'after midnight' portion now render at the correct position with proper height",
      "Fixed issue where clicking on events at the bottom of extended schedules caused them to jump to the top",
      "Events can now be properly dragged to the bottom of extended schedules without jumping to the top"
    ]
  },
  {
    version: "26.6.0",
    date: "December 4, 2025",
    type: "Major",
    features: [
      "<strong><u>SCHEDULE IMPROVEMENTS:</u></strong>",
      "Each week now tracks its own version history independently, making it easier to manage schedules week by week",
      "Personal schedules now show upcoming events organized by week with clear date headers",
      "New 'Previous Schedules' button lets team members access historical weeks they may have missed",
      "Schedule publishing is now faster with instant updates after clicking publish",
      "The 'Resend Schedule' option now only appears after a schedule has been published",
      "<strong><u>EASIER TO VIEW LARGE GROUPS:</u></strong>",
      "When viewing who's called for an event, the list now scrolls so you can see everyone - even Full Company calls",
      "This works across all schedule views (monthly, weekly, and daily)",
      "<strong><u>CLEANER PROJECT LIST:</u></strong>",
      "Simplified project cards by removing date ranges for a cleaner look"
    ]
  },
  {
    version: "26.5.0",
    date: "December 2, 2025",
    type: "Major",
    features: [
      "<strong><u>SCHEDULE TEMPLATES:</u></strong>",
      "New Schedule Templates feature allowing users to save a week's schedule as a template and replicate it to any other week",
      "Template editor with identical visual design and functionality to main schedule page for consistency",
      "Full support for template events including click-to-edit, drag-to-move for timed events, and proper overlapping event layout",
      "Optimistic UI updates with automatic rollback on errors for smooth user experience",
      "Template event popover with proper open/close state management preventing flash-close bugs",
      "<strong><u>SCHEDULE PAGE IMPROVEMENTS:</u></strong>",
      "Frozen header with sticky positioning containing controls, dates, publishing features, and personal schedules",
      "Fixed scrollbar behavior maintaining 600px max-height scroll container with proper alignment",
      "Restored original scroll functionality while keeping main page header frozen at top",
      "Removed redundant toast notifications from auto-saving template mutations to reduce UI noise"
    ]
  },
  {
    version: "26.4.0",
    date: "November 27, 2025",
    type: "Major",
    features: [
      "<strong><u>FACE SHEET PDF ENHANCEMENTS:</u></strong>",
      "Updated face sheet layout to 5 columns × 5 rows (25 contacts per page) for larger contact cards",
      "Changed photo format to 1:1 square aspect ratio for consistent visual presentation",
      "Added contact role display below each name (10pt bold name, 9pt role text)",
      "Removed Company List option from document dropdown menu, keeping Contact Sheet and Face Sheet PDFs only",
      "Improved text spacing and sizing for better readability of contact information on printed sheets"
    ]
  },
  {
    version: "26.3.0",
    date: "November 23, 2025",
    type: "Major",
    features: [
      "<strong><u>CONTACT MANAGEMENT ENHANCEMENTS:</u></strong>",
      "New contact fields: Preferred Name for stage names, WhatsApp for alternative contact method, and Contact Group for flexible team organization",
      "Database migration with three new nullable columns (preferredName, whatsapp, groupId) for extended contact information",
      "Redesigned contact information layout: First/Last/Preferred Name in first row, Email/Mobile/WhatsApp in second, Contact Group and Role below",
      "Removed hardcoded contact types in favor of flexible, user-configurable contact groups that replace old category system",
      "Button styling updated to clean icon-only design with gray text and blue hover effects in contact detail modal",
      "<strong><u>MOBILE UI OPTIMIZATION:</u></strong>",
      "Implemented floating action buttons (FAB) at bottom right for primary mobile actions on Props, Costumes, and Contacts pages",
      "Removed Plus icons from mobile headers across all three pages for cleaner, focused mobile interface",
      "Added Groups management button (Users icon) to mobile contacts header between Document and Groups buttons",
      "Fixed dropdown alignment for Contact Sheet/Company List dropdown with proper side and align positioning",
      "Removed back arrow button from mobile schedule page header for streamlined navigation",
      "<strong><u>SCHEDULE FIXES:</u></strong>",
      "Completed weekly and daily schedule view alignment standardization with scrollbar hiding and perfect column alignment",
      "Fixed vertical day separator line alignment across header, all-day events, and time grid sections",
      "Daily view now matches weekly view structure with identical time label and increment line logic",
      "Consistent spacing with 1:1 pixel-to-minute ratio across both calendar views"
    ]
  },
  {
    version: "26.2.0",
    date: "July 20, 2025",
    type: "Major",
    features: [
      "<strong><u>NAVIGATION & USER EXPERIENCE:</u></strong>",
      "Complete navigation streamlining with intuitive project-based workflows and simplified menu structure",
      "Enhanced mobile responsiveness across all admin interfaces with touch-optimized controls",
      "Improved page loading performance and seamless navigation between project sections",
      "<strong><u>SCHEDULE MANAGEMENT ENHANCEMENTS:</u></strong>",
      "Real-time timestamp tracking with user attribution showing who made schedule modifications",
      "Enhanced schedule header with properly positioned update timestamps using production timezone settings",
      "Show-specific team email integration with dynamic filtering and cross-show isolation",
      "Comprehensive Reply-To configuration supporting multiple email account types per production",
      "<strong><u>EMAIL SYSTEM IMPROVEMENTS:</u></strong>",
      "Complete catch-all email routing system providing unlimited @backstageos.com addresses",
      "Automatic email trash cleanup with 30-day retention and permanent deletion scheduling",
      "Dynamic folder names in email interface headers with clear navigation indicators",
      "Enhanced email template system with show-specific variables and professional formatting",
      "<strong><u>CONTACT & TEAM MANAGEMENT:</u></strong>",
      "Fixed contact equity status validation for different team member types",
      "Streamlined contact creation workflow with conditional validation based on role type",
      "Enhanced team member management with proper role-based permissions and settings",
      "<strong><u>EVENT & SCHEDULING FEATURES:</u></strong>",
      "Comprehensive event types dropdown integration across all schedule views",
      "Mobile long-press editing functionality for events with haptic feedback and intuitive controls",
      "Enhanced daily call sheet management with automatic sync to production schedules",
      "Event type management with color coding and real-time updates across all calendar views",
      "<strong><u>ADMIN & PLATFORM:</u></strong>",
      "Full mobile optimization for 5 admin dashboard pages with responsive layouts",
      "Enhanced admin error logging system with desktop-optimized interface",
      "Improved SEO management tools with mobile-responsive controls",
      "Advanced analytics dashboard with intelligent mobile adaptations"
    ]
  },
  {
    version: "26.1.0",
    date: "July 19, 2025",
    type: "Major",
    features: [
      "<strong><u>SCHEDULE MANAGEMENT:</u></strong>",
      "Schedule publishing with version control - track exactly when schedules were last published and updated",
      "Professional email notifications for schedule updates with customizable templates and sender options",
      "Complete schedule change tracking showing what specifically changed between versions",
      "Personal schedule pages for team members with secure token-based access",
      "Advanced schedule settings with timezone control, time format preferences, and event filtering",
      "Royal-themed version publishing options with Queen (Major) and King (Minor) version types",
      "Schedule resending capabilities with organized contact lists and notification preferences",
      "Enhanced calendar views with consistent formatting across monthly, weekly, and daily displays",
      "Advanced availability management with drag-and-drop scheduling and conflict detection",
      "<strong><u>EMAIL & COMMUNICATION:</u></strong>",
      "Comprehensive email template system with variables for contact names, show details, and week dates",
      "Email sidebar with collapsible functionality and multi-account support",
      "<strong><u>TEAM MANAGEMENT:</u></strong>",
      "Professional contact photo management with automatic image optimization",
      "Performance tracking system for equity contracts with rehearsal and show statistics",
      "Complete show settings system with team member management and sharing controls",
      "<strong><u>PRODUCTION TOOLS:</u></strong>",
      "Task management system with modern interface, custom properties, and project-based collaboration",
      "Notes system with advanced features including folders, search, and real-time collaboration",
      "Script editor with cue-building system for lighting, sound, video, and automation cues",
      "Props and costume tracking with scene organization and status management",
      "Advanced report template system with drag-drop field reordering and live preview",
      "<strong><u>MOBILE EXPERIENCE:</u></strong>",
      "Mobile calendar interface with native feel, pull-to-refresh, and swipe gestures",
      "<strong><u>PLATFORM FEATURES:</u></strong>",
      "Show-centric architecture with complete data isolation between productions",
      "Professional authentication system with profile type selection for freelance vs full-time users",
      "Unified admin dashboard with comprehensive user management and beta feature controls",
      "Document-style interface for reports with borderless inputs and clean layout",
      "Version tracking system with clickable footer and comprehensive release notes"
    ]
  },
  {
    version: "26.0.0",
    date: "July 3, 2025",
    type: "Major",
    features: [
      "Comprehensive scheduling system with weekly calendar drag-and-drop functionality",
      "Advanced team availability management with visual timeline interface",
      "Complete contact sheet system with professional formatting and version control",
      "Enhanced script editor with inline formatting and collaboration features"
    ]
  }
];

const getTypeColor = (type: string) => {
  switch (type) {
    case "Major": return "bg-blue-100 text-blue-800";
    case "Feature": return "bg-green-100 text-green-800";
    case "Bugfix": return "bg-yellow-100 text-yellow-800";
    case "Initial": return "bg-purple-100 text-purple-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function VersionFooter() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <footer className="border-t bg-gray-50 mt-auto hidden md:block">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1">
              <span className="text-xs text-muted-foreground">© 2025 BackstageOS. All rights reserved. Created by Bryan Runion</span>
              <span className="text-xs text-muted-foreground">|</span>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
                  >
                    Version {CURRENT_VERSION}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Release Notes
                    </DialogTitle>
                    <DialogDescription>
                      Latest updates and improvements to BackstageOS. Weekly Updates.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      {RELEASE_NOTES.map((release, index) => (
                        <div key={release.version} className="border-b pb-6 last:border-b-0">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">
                                Version {release.version}
                                {index === 0 && (
                                  <Badge variant="secondary" className="ml-2">Current</Badge>
                                )}
                              </h3>
                              <Badge className={getTypeColor(release.type)}>
                                {release.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {release.date}
                            </div>
                          </div>
                          
                          <ul className="space-y-2">
                            {release.features.map((feature, featureIndex) => {
                              // Check if this is a header (contains <strong><u>)
                              const isHeader = feature.includes('<strong><u>') && feature.includes('</u></strong>');
                              
                              if (isHeader) {
                                // Extract the header text
                                const headerText = feature.replace('<strong><u>', '').replace('</u></strong>', '');
                                return (
                                  <li key={featureIndex} className="mt-4 first:mt-0">
                                    <h4 className="font-bold underline text-sm text-gray-900">{headerText}</h4>
                                  </li>
                                );
                              } else {
                                return (
                                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                );
                              }
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <span className="text-xs text-muted-foreground">|</span>
              <a href="/security" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                Security
              </a>
              <span className="text-xs text-muted-foreground">|</span>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                Privacy
              </a>
              <span className="text-xs text-muted-foreground">|</span>
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                Terms
              </a>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              <Link to="/projects/archived" className="flex items-center gap-1">
                <Archive className="h-3 w-3" />
                Archived Shows
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </>
  );
}