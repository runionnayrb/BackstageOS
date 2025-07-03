import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle } from "lucide-react";

const CURRENT_VERSION = "26.5.0";

const RELEASE_NOTES = [
  {
    version: "26.5.0",
    date: "July 3, 2025",
    type: "Major",
    features: [
      "Updated version numbering to 26.5.0 for fall release cycle",
      "Comprehensive scheduling system with weekly calendar drag-and-drop functionality",
      "Advanced team availability management with visual timeline interface",
      "Complete contact sheet system with professional formatting and version control",
      "Enhanced script editor with inline formatting and collaboration features"
    ]
  },
  {
    version: "1.5.0",
    date: "June 27, 2025",
    type: "Feature",
    features: [
      "Version tracking system with clickable footer displaying current version on every page",
      "Comprehensive release notes modal with chronological update history",
      "Color-coded release types (Major, Feature, Bugfix, Initial) with badges",
      "Scrollable release notes interface with detailed feature descriptions",
      "Automatic version display with 'Current' badge for latest release"
    ]
  },
  {
    version: "1.4.2",
    date: "June 27, 2025",
    type: "Major",
    features: [
      "Unified Admin Dashboard with tabbed interface for user management and beta features",
      "Comprehensive beta access control system with three-tier permissions (None, Limited, Full)",
      "Feature categorization system for Production Tools, Reports & Templates, Team Management, and Planning",
      "Granular beta feature controls for controlled rollout of new functionality",
      "Enhanced admin security with proper authentication guards and middleware protection"
    ]
  },
  {
    version: "1.4.1",
    date: "June 27, 2025",
    type: "Feature",
    features: [
      "Google Docs-like interface for reports with borderless inputs and clean document layout",
      "Page numbering controls in rich text editor with customizable formats",
      "Dynamic back buttons with show-specific navigation context",
      "Form validation improvements for template settings",
      "Removed status badges for cleaner, minimal interface design"
    ]
  },
  {
    version: "1.4.0",
    date: "June 26, 2025",
    type: "Major",
    features: [
      "Complete show settings system with team member management and sharing controls",
      "Advanced template customization with drag-drop field reordering and live preview",
      "Hierarchical navigation with clean list format and click-through workflow",
      "Script Editor with cue-building system supporting lighting, sound, video, and automation cues",
      "Props Tracker with scene/character organization and status tracking",
      "Costume Tracker with quick-change timing and repair tracking"
    ]
  },
  {
    version: "1.3.0",
    date: "June 25, 2025",
    type: "Major",
    features: [
      "Show-centric architecture with complete data isolation between productions",
      "Dual profile type support for freelance vs full-time theater professionals",
      "Advanced report template system with dynamic field types",
      "Show-specific tables for documents, schedules, and character management",
      "Streamlined navigation with organized categories for Reports, Calendar, Script, Cast, and Tasks"
    ]
  },
  {
    version: "1.2.0",
    date: "June 25, 2025",
    type: "Feature",
    features: [
      "Complete authentication system with Replit Auth integration",
      "Profile type selection workflow for user onboarding",
      "Database schema optimization and authentication flow improvements",
      "Removed dashboard statistics per user feedback",
      "Template builder functionality with working add/edit field buttons"
    ]
  },
  {
    version: "1.1.0",
    date: "June 25, 2025",
    type: "Initial",
    features: [
      "Initial platform setup with React, Express, and PostgreSQL",
      "Basic project management and team collaboration features",
      "Report creation and template system foundation",
      "User authentication and session management",
      "Responsive design with Tailwind CSS and Shadcn/UI components"
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