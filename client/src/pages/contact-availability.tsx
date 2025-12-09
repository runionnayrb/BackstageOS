import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, User, ChevronDown, ChevronLeft, ChevronRight, Clock, Trash2 } from "lucide-react";
import { WeeklyAvailabilityEditor } from "@/components/weekly-availability-editor";
import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatTimeFromMinutes, parseScheduleSettings, getTimezoneAbbreviation } from "@/lib/timeUtils";

interface ContactAvailabilityParams {
  id: string;
  contactId: string;
}

export default function ContactAvailability() {
  const [, setLocation] = useLocation();
  const params = useParams<ContactAvailabilityParams>();
  const projectId = parseInt(params.id!);
  const contactId = parseInt(params.contactId!);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [timeIncrement, setTimeIncrement] = useState<15 | 30 | 60>(30);

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: contact, isLoading: isLoadingContact } = useQuery({
    queryKey: [`/api/contacts/${contactId}`],
  });

  // Navigation functions
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format week range display
  const formatWeekRange = () => {
    // Calculate week range similar to schedule page
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
  };



  if (isLoadingContact || !project || !contact) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Unified Schedule Style */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/contacts`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Button>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          {/* Left side - Contact name and date range */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <h1 className="text-2xl font-bold text-gray-900">
                {contact.firstName} {contact.lastName}
              </h1>
            </div>
            <div className="text-lg text-gray-600">
              {formatWeekRange()}
            </div>
          </div>

          {/* Right side - Controls matching schedule view */}
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
                  {timeIncrement} Min
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTimeIncrement(15)}>
                  15 Min
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeIncrement(30)}>
                  30 Min
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeIncrement(60)}>
                  60 Min
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={goToToday} size="sm" className="text-xs px-2 py-1 h-auto">
              Today
            </Button>
            <div className="flex items-center">
              <button onClick={goToPreviousWeek} className="p-1 hover:bg-gray-100 rounded-l transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToNextWeek} className="p-1 hover:bg-gray-100 rounded-r transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Weekly Availability Editor - Modified to not use Dialog */}
          <div className="bg-white rounded-lg border">
            <WeeklyAvailabilityEditorPage 
              contact={contact} 
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              timeIncrement={timeIncrement}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Weekly Availability Calendar component for the page (without dialog wrapper)
function WeeklyAvailabilityEditorPage({ 
  contact, 
  currentDate, 
  setCurrentDate, 
  timeIncrement 
}: { 
  contact: any; 
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  timeIncrement: 15 | 30 | 60;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  const [currentWeek, setCurrentWeek] = useState<Date>(currentDate);
  const [isDragCreating, setIsDragCreating] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [isResizing, setIsResizing] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Sync with parent currentDate
  useEffect(() => {
    setCurrentWeek(currentDate);
  }, [currentDate]);

  // Fetch project settings for time format and timezone
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/settings`],
  });

  // Fetch availability for this contact
  const { data: availability = [] } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`],
  });

  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const timeFormat = scheduleSettings.timeFormat || '12';
  const timeZone = scheduleSettings.timezone || 'America/New_York';
  const weekStartDay = scheduleSettings.weekStartDay || 'sunday';

  // Use configurable time range from project settings
  const START_HOUR = scheduleSettings.dayStartHour;
  const END_HOUR = scheduleSettings.dayEndHour;
  const START_MINUTES = START_HOUR * 60;
  const END_MINUTES = END_HOUR * 60;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  // Calculate week dates
  const getWeekDates = useCallback((weekStart: Date) => {
    const week = [];
    const startOfWeek = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    const currentDay = startOfWeek.getDay();
    
    const weekStartMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
      thursday: 4, friday: 5, saturday: 6
    };
    
    const configuredStartDay = weekStartMap[weekStartDay] || 0;
    let daysToSubtract = currentDay - configuredStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
      week.push(weekDate);
    }
    return week;
  }, [weekStartDay]);

  const weekDates = getWeekDates(currentWeek);
  const baseDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekStartMap: { [key: string]: number } = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
    thursday: 4, friday: 5, saturday: 6
  };
  const startDayIndex = weekStartMap[weekStartDay] || 0;
  const dayNames = [...baseDayNames.slice(startDayIndex), ...baseDayNames.slice(0, startDayIndex)];

  // Filter availability for current week
  const weekAvailability = availability.filter((item: any) => {
    return weekDates.some((weekDate: Date) => 
      weekDate.toISOString().split('T')[0] === item.date
    );
  });

  // Time utilities
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    return formatTimeFromMinutes(minutes, timeFormat);
  };

  const minutesToPosition = (minutes: number): number => {
    return Math.max(0, minutes - START_MINUTES);
  };

  const positionToMinutes = (position: number): number => {
    const minutes = Math.max(START_MINUTES, Math.min(END_MINUTES - 1, Math.round(position + START_MINUTES)));
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  const getAvailabilityColor = (type: string) => {
    switch (type) {
      case 'unavailable': return 'bg-red-500 hover:bg-red-600 border-red-600';
      case 'preferred': return 'bg-blue-500 hover:bg-blue-600 border-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600 border-gray-600';
    }
  };

  // Generate time labels and grid lines
  const timeLabels = [];
  for (let hour = START_HOUR; hour < END_HOUR; hour += 2) {
    timeLabels.push({
      hour,
      label: minutesToTime(hour * 60),
      position: (hour * 60 / 1440) * 1440
    });
  }

  const gridLines = [];
  for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
    const min = minutes % 60;
    gridLines.push({
      minutes,
      label: minutesToTime(minutes),
      isHour: min === 0
    });
  }

  return (
    <div className="space-y-4">
      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-8 bg-gray-50 border-b">
          <div className="p-3 text-xs font-medium text-gray-500 border-r">Time</div>
          {weekDates.map((date: Date, index: number) => (
            <div key={index} className="p-3 text-center border-r last:border-r-0">
              <div className="text-xs font-medium text-gray-500">
                {dayNames[index]}
              </div>
              <div className="text-lg font-semibold">
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar body */}
        <div 
          ref={scrollContainerRef}
          className="border-t"
          style={{ 
            height: '500px',
            overflowY: 'scroll',
            position: 'relative'
          }}
        >
          <div style={{ height: `${TOTAL_HOURS * 60}px`, position: 'relative' }}>
            <div className="grid grid-cols-8 h-full">
              {/* Time column */}
              <div className="border-r bg-gray-50">
                <div className="relative h-full">
                  {timeLabels.map(({ hour, label }) => (
                    <div
                      key={hour}
                      className={`absolute text-xs text-gray-600 px-2 ${hour === START_HOUR ? 'translate-y-0' : '-translate-y-1/2'}`}
                      style={{ top: `${minutesToPosition(hour * 60)}px` }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day columns */}
              <div className="col-span-7 relative" ref={calendarRef}>
                {/* Grid lines */}
                {gridLines.map(({ minutes, isHour }) => (
                  <div
                    key={minutes}
                    className={`absolute w-full ${isHour ? 'border-gray-200' : 'border-gray-100'} border-t`}
                    style={{ top: `${minutesToPosition(minutes)}px` }}
                  />
                ))}

                {/* Day columns background */}
                <div className="grid grid-cols-7 h-full">
                  {weekDates.map((date, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="border-r border-gray-100 last:border-r-0 relative"
                    >
                      {/* Today indicator */}
                      {date.toDateString() === new Date().toDateString() && (
                        <div className="absolute inset-0 bg-blue-50 opacity-30 pointer-events-none" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Availability blocks */}
                {weekAvailability.map((item: any) => {
                  const dayIndex = weekDates.findIndex((date: Date) => 
                    date.toISOString().split('T')[0] === item.date
                  );
                  if (dayIndex === -1) return null;

                  const startMinutes = timeToMinutes(item.startTime);
                  const endMinutes = timeToMinutes(item.endTime);
                  const top = minutesToPosition(startMinutes);
                  const height = endMinutes - startMinutes;
                  const left = (dayIndex / 7) * 100;
                  const width = (1 / 7) * 100;

                  return (
                    <div
                      key={item.id}
                      className={`absolute cursor-pointer rounded border-2 text-white text-xs p-1 ${getAvailabilityColor(item.availabilityType)}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `${left}%`,
                        width: `${width}%`,
                        zIndex: 10
                      }}
                      onClick={() => setEditingItem(item)}
                    >
                      <div className="font-medium">
                        {item.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}
                      </div>
                      <div className="text-xs opacity-90">
                        {minutesToTime(startMinutes)} - {minutesToTime(endMinutes)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}