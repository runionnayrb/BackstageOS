import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

interface Section {
  id: string;
  title: string;
  href: string;
}

interface QuickSectionSwitcherProps {
  currentShowId: string;
  currentShowName: string;
  currentSection?: string;
}

export default function QuickSectionSwitcher({ 
  currentShowId, 
  currentShowName, 
  currentSection 
}: QuickSectionSwitcherProps) {
  const [, setLocation] = useLocation();

  const sections: Section[] = [
    {
      id: "reports",
      title: "Reports",
      href: `/shows/${currentShowId}/reports`
    },
    {
      id: "calendar",
      title: "Calendar", 
      href: `/shows/${currentShowId}/calendar`
    },
    {
      id: "script",
      title: "Script",
      href: `/shows/${currentShowId}/script`
    },
    {
      id: "props",
      title: "Props",
      href: `/shows/${currentShowId}/props`
    },
    {
      id: "contacts",
      title: "Contacts",
      href: `/shows/${currentShowId}/contacts`
    },
    {
      id: "performance-tracker",
      title: "Performance Tracker",
      href: `/shows/${currentShowId}/performance-tracker`
    },
    {
      id: "report-notes",
      title: "Report Notes",
      href: `/shows/${currentShowId}/notes-tracking`
    }
  ];

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