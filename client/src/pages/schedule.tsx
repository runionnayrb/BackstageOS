import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, CalendarDays, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import WeeklyScheduleView from "@/components/weekly-schedule-view";
import DailyScheduleView from "@/components/daily-schedule-view";
import MonthlyScheduleView from "@/components/monthly-schedule-view";
import ScheduleFilter from "@/components/schedule-filter";

interface ScheduleParams {
  id: string;
}

export default function Schedule() {
  const [, setLocation] = useLocation();
  const params = useParams<ScheduleParams>();
  const projectId = params.id;
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('weekly');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);

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
    setCurrentDate(date);
    setViewMode('daily');
  };

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else { // daily
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'monthly') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else { // daily
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format header text based on current view
  const getHeaderText = () => {
    if (viewMode === 'monthly') {
      return currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    } else if (viewMode === 'weekly') {
      // Calculate week range
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'long' })} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
      } else {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${endOfWeek.getFullYear()}`;
      }
    } else { // daily
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      });
    }
  };

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/calendar`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
          
          <div className="flex items-center gap-4">
            <ScheduleFilter
              projectId={parseInt(projectId)}
              selectedContactIds={selectedContactIds}
              onFilterChange={setSelectedContactIds}
            />
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('monthly')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Month
              </Button>
              <Button
                variant={viewMode === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('weekly')}
                className="flex items-center gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Week
              </Button>
              <Button
                variant={viewMode === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('daily')}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Day
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">



        {viewMode === 'monthly' ? (
          <MonthlyScheduleView 
            projectId={parseInt(projectId)} 
            onDateClick={handleDateClick}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedContactIds={selectedContactIds}
          />
        ) : viewMode === 'weekly' ? (
          <WeeklyScheduleView 
            projectId={parseInt(projectId)} 
            onDateClick={handleDateClick}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedContactIds={selectedContactIds}
          />
        ) : (
          <DailyScheduleView 
            projectId={parseInt(projectId)} 
            selectedDate={currentDate}
            onBackToWeekly={() => setViewMode('weekly')}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedContactIds={selectedContactIds}
          />
        )}
      </div>
    </div>
  );
}