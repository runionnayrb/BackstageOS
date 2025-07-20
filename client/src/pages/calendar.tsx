import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Users, MapPin, ChevronDown } from "lucide-react";
import AvailabilityComparison from "@/components/availability-comparison";
import LocationAvailabilityPage from "@/components/location-availability";

interface CalendarParams {
  id: string;
}

export default function Calendar() {
  const [, setLocation] = useLocation();
  const [showAvailabilityComparison, setShowAvailabilityComparison] = useState(false);
  const [showLocationAvailability, setShowLocationAvailability] = useState(false);
  const params = useParams<CalendarParams>();
  const projectId = params.id;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const sections = [
    {
      title: "Schedule",
      description: "Rehearsal and performance calendar with drag-drop scheduling",
      href: `/shows/${projectId}/calendar/schedule`,
    },
    {
      title: "Daily Calls", 
      description: "Daily call sheets and scheduling information",
      href: `/shows/${projectId}/calls`,
    },
  ];

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show availability comparison as full page
  if (showAvailabilityComparison) {
    return (
      <AvailabilityComparison
        projectId={parseInt(projectId)}
        onBack={() => setShowAvailabilityComparison(false)}
      />
    );
  }

  // Show location availability as full page
  if (showLocationAvailability) {
    return (
      <LocationAvailabilityPage
        projectId={parseInt(projectId)}
        onBack={() => setShowLocationAvailability(false)}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {(project as any)?.name}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                Availability
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAvailabilityComparison(true)}>
                Team Availability
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowLocationAvailability(true)}>
                Location Availability
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-1">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setLocation(section.href)}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                <span className="text-gray-400 text-lg">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}