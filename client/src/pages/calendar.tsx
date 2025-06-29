import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import AvailabilityComparison from "@/components/availability-comparison";

interface CalendarParams {
  id: string;
}

export default function Calendar() {
  const [, setLocation] = useLocation();
  const [showAvailabilityComparison, setShowAvailabilityComparison] = useState(false);
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
      href: `/shows/${projectId}/calendar/calls`,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {(project as any)?.name}
          </Button>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-gray-500 mt-2">
              Manage rehearsal schedules and daily call sheets
            </p>
          </div>
          
          <Button
            onClick={() => setShowAvailabilityComparison(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Compare Team Availability
          </Button>
        </div>

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

        {/* Availability Comparison Modal */}
        <AvailabilityComparison
          projectId={parseInt(projectId)}
          isOpen={showAvailabilityComparison}
          onClose={() => setShowAvailabilityComparison(false)}
        />
      </div>
    </div>
  );
}