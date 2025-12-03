import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Users, MapPin, ChevronDown, User } from "lucide-react";
import AvailabilityComparison from "@/components/availability-comparison";
import LocationAvailabilityPage from "@/components/location-availability";

interface CalendarParams {
  slug: string;
}

export default function Calendar() {
  const [, setLocation] = useLocation();
  const [showAvailabilityComparison, setShowAvailabilityComparison] = useState(false);
  const [showLocationAvailability, setShowLocationAvailability] = useState(false);
  const [showAvailabilityDropdown, setShowAvailabilityDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const params = useParams<CalendarParams>();
  const projectSlug = params.slug;

  // Listen for header button click
  useEffect(() => {
    const handleAvailabilityDropdown = () => {
      setShowAvailabilityDropdown(!showAvailabilityDropdown);
    };

    window.addEventListener('openAvailabilityDropdown', handleAvailabilityDropdown);
    return () => {
      window.removeEventListener('openAvailabilityDropdown', handleAvailabilityDropdown);
    };
  }, [showAvailabilityDropdown]);

  const { data: project } = useQuery({
    queryKey: ['/api/projects/by-slug', projectSlug],
    enabled: !!projectSlug,
  });
  
  const projectId = project?.id;

  const sections = [
    {
      title: "Schedule",
      description: "Rehearsal and performance calendar with drag-drop scheduling",
      href: `/shows/${projectSlug}/calendar/schedule`,
    },
    {
      title: "Daily Calls", 
      description: "Daily call sheets and scheduling information",
      href: `/shows/${projectSlug}/calls`,
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
        projectId={projectId!}
        onBack={() => setShowAvailabilityComparison(false)}
      />
    );
  }

  // Show location availability as full page
  if (showLocationAvailability) {
    return (
      <LocationAvailabilityPage
        projectId={projectId!}
        onBack={() => setShowLocationAvailability(false)}
      />
    );
  }

  return (
    <div className="w-full">
      {/* Floating Availability Dropdown */}
      {showAvailabilityDropdown && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={() => setShowAvailabilityDropdown(false)} />
          <div className="fixed top-16 right-4 bg-white rounded-lg shadow-lg border min-w-48">
            <div className="py-1">
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                onClick={() => {
                  setShowAvailabilityComparison(true);
                  setShowAvailabilityDropdown(false);
                }}
              >
                <Users className="h-4 w-4 text-gray-700" />
                Team Availability
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                onClick={() => {
                  setShowLocationAvailability(true);
                  setShowAvailabilityDropdown(false);
                }}
              >
                <MapPin className="h-4 w-4 text-gray-700" />
                Location Availability
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8 pt-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAvailabilityComparison(true)}
              data-testid="button-team-availability"
            >
              <Users className="h-4 w-4 mr-2" />
              Team Availability
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLocationAvailability(true)}
              data-testid="button-location-availability"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Location Availability
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden px-4 sm:px-6 pt-4 pb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAvailabilityDropdown(true)}
          data-testid="button-availability-menu"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
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