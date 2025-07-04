import { useState } from "react";
import { ChevronDown, FileText, Calendar, BookOpen, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

interface Section {
  id: string;
  title: string;
  href: string;
  icon: any;
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
      href: `/shows/${currentShowId}/reports`,
      icon: FileText
    },
    {
      id: "calendar",
      title: "Calendar", 
      href: `/shows/${currentShowId}/calendar`,
      icon: Calendar
    },
    {
      id: "script",
      title: "Script",
      href: `/shows/${currentShowId}/script`,
      icon: BookOpen
    },
    {
      id: "props",
      title: "Props",
      href: `/shows/${currentShowId}/props`,
      icon: Package
    },
    {
      id: "contacts",
      title: "Contacts",
      href: `/shows/${currentShowId}/contacts`,
      icon: Users
    }
  ];

  const currentSectionData = sections.find(s => s.id === currentSection);
  const CurrentIcon = currentSectionData?.icon || FileText;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <CurrentIcon className="h-4 w-4" />
          <span className="font-medium">{currentSectionData?.title || "Navigate"}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = section.id === currentSection;
          
          return (
            <DropdownMenuItem 
              key={section.id}
              onClick={() => setLocation(section.href)}
              className={`flex items-center gap-2 cursor-pointer ${
                isActive ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{section.title}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}