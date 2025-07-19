import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle } from "lucide-react";

const CURRENT_VERSION = "26.1.0";

const RELEASE_NOTES = [
  {
    version: "26.1.0",
    date: "July 19, 2025",
    type: "Major",
    features: [
      "📅 SCHEDULE MANAGEMENT:",
      "• Schedule publishing with version control - track exactly when schedules were last published and updated (July 19, 2025)",
      "• Professional email notifications for schedule updates with customizable templates and sender options (July 19, 2025)",
      "• Complete schedule change tracking showing what specifically changed between versions (July 19, 2025)",
      "• Personal schedule pages for team members with secure token-based access (July 18, 2025)",
      "• Advanced schedule settings with timezone control, time format preferences, and event filtering (July 18, 2025)",
      "• Royal-themed version publishing options with Queen (Major) and King (Minor) version types (July 18, 2025)",
      "• Schedule resending capabilities with organized contact lists and notification preferences (July 18, 2025)",
      "• Enhanced calendar views with consistent formatting across monthly, weekly, and daily displays (July 15-16, 2025)",
      "• Advanced availability management with drag-and-drop scheduling and conflict detection (July 14-16, 2025)",
      "",
      "📧 EMAIL & COMMUNICATION:",
      "• Comprehensive email template system with variables for contact names, show details, and week dates (July 19, 2025)",
      "• Email sidebar with collapsible functionality and multi-account support (July 18, 2025)",
      "",
      "👥 TEAM MANAGEMENT:",
      "• Professional contact photo management with automatic image optimization (July 17, 2025)",
      "• Performance tracking system for equity contracts with rehearsal and show statistics (July 17, 2025)",
      "• Complete show settings system with team member management and sharing controls (June 26, 2025)",
      "",
      "📝 PRODUCTION TOOLS:",
      "• Task management system with modern interface, custom properties, and project-based collaboration (July 17-18, 2025)",
      "• Notes system with advanced features including folders, search, and real-time collaboration (July 18, 2025)",
      "• Script editor with cue-building system for lighting, sound, video, and automation cues (June 26, 2025)",
      "• Props and costume tracking with scene organization and status management (June 26, 2025)",
      "• Advanced report template system with drag-drop field reordering and live preview (June 26, 2025)",
      "",
      "📱 MOBILE EXPERIENCE:",
      "• Mobile calendar interface with native feel, pull-to-refresh, and swipe gestures (July 18, 2025)",
      "",
      "🔧 PLATFORM FEATURES:",
      "• Show-centric architecture with complete data isolation between productions (June 25, 2025)",
      "• Professional authentication system with profile type selection for freelance vs full-time users (June 25, 2025)",
      "• Unified admin dashboard with comprehensive user management and beta feature controls (June 27, 2025)",
      "• Document-style interface for reports with borderless inputs and clean layout (June 27, 2025)",
      "• Version tracking system with clickable footer and comprehensive release notes (June 27, 2025)"
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
      <footer className="border-t bg-gray-50 mt-auto">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-center">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  BackstageOS Version {CURRENT_VERSION}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Release Notes
                  </DialogTitle>
                  <DialogDescription>
                    Latest updates and improvements to BackstageOS
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
                          {release.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </footer>
    </>
  );
}