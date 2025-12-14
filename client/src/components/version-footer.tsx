import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Archive } from "lucide-react";
import { Link } from "wouter";

const CURRENT_VERSION = "26.8.0";

const RELEASE_NOTES = [
  {
    version: "26.8.0",
    date: "December 14, 2025",
    features: [
      "<strong><u>COLLABORATE WITH YOUR TEAM:</u></strong>",
      "Invite editors to work on your shows together",
      "Team members can view and manage notes, reports, contacts, and schedules",
      "Share the workload while keeping full control of your productions"
    ]
  },
  {
    version: "26.7.0",
    date: "December 9, 2025",
    features: [
      "<strong><u>EXTENDED SCHEDULE SUPPORT:</u></strong>",
      "Schedules that run past midnight (like 7 AM to 2 AM) now display perfectly",
      "Drag and drop works smoothly for late-night events",
      "Events in the 'after midnight' portion appear exactly where they should"
    ]
  },
  {
    version: "26.6.0",
    date: "December 4, 2025",
    features: [
      "<strong><u>WEEKLY VERSION TRACKING:</u></strong>",
      "Each week now has its own version history, making it easier to track changes week by week",
      "Personal schedules show upcoming events organized by week with clear date headers",
      "New 'Previous Schedules' button lets team members catch up on weeks they missed",
      "<strong><u>IMPROVED CALL LISTS:</u></strong>",
      "Full Company calls now show all participants in a scrollable list",
      "Works across monthly, weekly, and daily schedule views",
      "<strong><u>CLEANER DESIGN:</u></strong>",
      "Simplified project cards for a cleaner, more focused look"
    ]
  },
  {
    version: "26.5.0",
    date: "December 2, 2025",
    features: [
      "<strong><u>SCHEDULE TEMPLATES:</u></strong>",
      "Save any week's schedule as a template and reuse it for other weeks",
      "Full drag-and-drop support when editing templates",
      "Templates look and work just like the main schedule page",
      "<strong><u>IMPROVED SCHEDULE PAGE:</u></strong>",
      "Header stays visible as you scroll through your schedule",
      "Faster publishing with instant updates"
    ]
  },
  {
    version: "26.4.0",
    date: "November 27, 2025",
    features: [
      "<strong><u>BETTER FACE SHEETS:</u></strong>",
      "Larger contact photos with square format for consistency",
      "25 contacts per page with clearer names and roles",
      "Improved readability for printed contact sheets"
    ]
  },
  {
    version: "26.3.0",
    date: "November 23, 2025",
    features: [
      "<strong><u>FLEXIBLE CONTACT GROUPS:</u></strong>",
      "Create your own contact groups to organize your team your way",
      "Add preferred names (great for stage names) and WhatsApp numbers",
      "<strong><u>BETTER MOBILE EXPERIENCE:</u></strong>",
      "Quick-add buttons on Props, Costumes, and Contacts pages",
      "Cleaner mobile navigation throughout the app"
    ]
  },
  {
    version: "26.2.0",
    date: "July 20, 2025",
    features: [
      "<strong><u>STREAMLINED NAVIGATION:</u></strong>",
      "Simpler menus and faster navigation between sections",
      "Better mobile experience across all pages",
      "<strong><u>ENHANCED SCHEDULES:</u></strong>",
      "See who made changes and when with timestamps",
      "Send schedules from your connected email accounts",
      "<strong><u>EMAIL IMPROVEMENTS:</u></strong>",
      "Get your own @backstageos.com email addresses",
      "Automatic cleanup of old emails after 30 days",
      "Professional email templates with show-specific details"
    ]
  },
  {
    version: "26.1.0",
    date: "July 19, 2025",
    features: [
      "<strong><u>SCHEDULE PUBLISHING:</u></strong>",
      "Publish schedules with version tracking",
      "Email notifications keep your team informed of changes",
      "Personal schedule links for each team member",
      "Timezone and time format settings for your production",
      "<strong><u>EMAIL & COMMUNICATION:</u></strong>",
      "Email templates with show-specific variables",
      "Connect multiple email accounts",
      "<strong><u>TEAM MANAGEMENT:</u></strong>",
      "Upload and manage contact photos",
      "Track equity contract performance",
      "<strong><u>PRODUCTION TOOLS:</u></strong>",
      "Task management with boards and lists",
      "Notes with folders and search",
      "Script editor with cue tracking",
      "Props and costume management by scene",
      "Customizable report templates"
    ]
  },
  {
    version: "26.0.0",
    date: "July 3, 2025",
    features: [
      "<strong><u>BACKSTAGEOS LAUNCH:</u></strong>",
      "Drag-and-drop weekly scheduling",
      "Visual availability management for your team",
      "Professional contact sheets with version control",
      "Script editor with formatting and collaboration"
    ]
  }
];


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
                      What's New in BackstageOS
                    </DialogTitle>
                    <DialogDescription>
                      See what we've been working on to make your stage management easier.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      {RELEASE_NOTES.map((release, index) => (
                        <div key={release.version} className="border-b pb-6 last:border-b-0">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">
                              Version {release.version}
                              {index === 0 && (
                                <Badge variant="secondary" className="ml-2">Current</Badge>
                              )}
                            </h3>
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