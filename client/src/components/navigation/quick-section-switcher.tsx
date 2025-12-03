import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useBetaFeatures } from "@/hooks/useBetaFeatures";

interface Section {
  id: string;
  title: string;
  href: string;
}

interface QuickSectionSwitcherProps {
  currentShowSlug: string;
  currentShowName: string;
  currentSection?: string;
}

export default function QuickSectionSwitcher({ 
  currentShowSlug, 
  currentShowName, 
  currentSection 
}: QuickSectionSwitcherProps) {
  const [, setLocation] = useLocation();
  const { canAccessFeature } = useBetaFeatures();

  const allSections: Section[] = [
    {
      id: "reports",
      title: "Reports",
      href: `/shows/${currentShowSlug}/reports`
    },
    {
      id: "calendar",
      title: "Calendar", 
      href: `/shows/${currentShowSlug}/calendar`
    },
    {
      id: "script",
      title: "Script",
      href: `/shows/${currentShowSlug}/script`
    },
    {
      id: "props",
      title: "Props",
      href: `/shows/${currentShowSlug}/props`
    },
    {
      id: "contacts",
      title: "Contacts",
      href: `/shows/${currentShowSlug}/contacts`
    },
    {
      id: "performance-tracker",
      title: "Performance Tracker",
      href: `/shows/${currentShowSlug}/performance-tracker`
    },
    {
      id: "schedule-mapping",
      title: "Schedule Mapping",
      href: `/shows/${currentShowSlug}/schedule-mapping`
    },
    {
      id: "report-notes",
      title: "Report Notes",
      href: `/shows/${currentShowSlug}/notes-tracking`
    }
  ];

  // Filter sections based on beta feature access
  const sections = allSections.filter(section => {
    if (section.id === 'performance-tracker') {
      return canAccessFeature('performance-tracker');
    }
    return true;
  });

  const currentSectionData = sections.find(s => s.id === currentSection);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <span className="font-medium">{currentSectionData?.title || "Navigate"}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {sections.map((section) => {
          const isActive = section.id === currentSection;
          
          return (
            <DropdownMenuItem 
              key={section.id}
              onClick={() => setLocation(section.href)}
              className={`cursor-pointer px-3 py-2 ${
                isActive ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              {section.title}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}