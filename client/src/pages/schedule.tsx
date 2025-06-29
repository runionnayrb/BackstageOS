import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Eye } from "lucide-react";
import WeeklyScheduleView from "@/components/weekly-schedule-view";
import DailyScheduleView from "@/components/daily-schedule-view";

interface ScheduleParams {
  id: string;
}

export default function Schedule() {
  const [, setLocation] = useLocation();
  const params = useParams<ScheduleParams>();
  const projectId = params.id;
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('daily');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/calendar`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calendar
          </Button>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Schedule</h1>
            <p className="text-gray-500 mt-2">
              Create and manage rehearsal and performance events
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('weekly')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Weekly
            </Button>
            <Button
              variant={viewMode === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('daily')}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Daily
            </Button>
          </div>
        </div>

        {viewMode === 'weekly' ? (
          <WeeklyScheduleView 
            projectId={parseInt(projectId)} 
            onDateClick={handleDateClick}
          />
        ) : (
          <DailyScheduleView 
            projectId={parseInt(projectId)} 
            selectedDate={selectedDate}
            onBackToWeekly={() => setViewMode('weekly')}
          />
        )}
      </div>
    </div>
  );
}