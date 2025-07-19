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
          </div>
        </div>
      </footer>
    </>
  );
}