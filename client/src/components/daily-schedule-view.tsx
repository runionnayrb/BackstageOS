import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatTimeDisplay, formatTimeFromMinutes } from '@/lib/timeUtils';

// Constants for time grid (8 AM to midnight = 16 hours)
const START_HOUR = 8;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

interface DailyScheduleViewProps {
  projectId: number;
  selectedDate: Date;
  onBackToWeekly: () => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  selectedContactIds: number[];
}

interface ScheduleEvent {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  location?: string;
  notes?: string;
  isAllDay: boolean;
  participants: {
    id: number;
    contactId: number;
    contactFirstName: string;
    contactLastName: string;
    isRequired: boolean;
    status: string;
  }[];
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  category: string;
  role?: string;
}

interface ProjectSettings {
  id?: number;
  projectId?: number;
  scheduleSettings?: string | {
    timeFormat?: string;
    workStartTime?: string;
    workEndTime?: string;
    timeZone?: string;
    weekStartDay?: string;
  };
}

export default function DailyScheduleView({ projectId, selectedDate, onBackToWeekly, selectedContactIds }: DailyScheduleViewProps) {
  const { toast } = useToast();
  
  // State for event management
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [createEventDialog, setCreateEventDialog] = useState<{ isOpen: boolean; startTime?: string; endTime?: string }>({ isOpen: false });
  const [timeIncrement, setTimeIncrement] = useState(30);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Refs for interaction
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Time utilities - same as availability editor
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    return formatTimeFromMinutes(minutes, '24-Hour');
  };

  const minutesToPosition = (minutes: number): number => {
    return Math.max(0, minutes - START_MINUTES);
  };

  const minutesToHeight = (durationMinutes: number): number => {
    return durationMinutes;
  };

  const positionToMinutes = (position: number): number => {
    const minutes = Math.max(START_MINUTES, Math.min(END_MINUTES - 1, Math.round(position + START_MINUTES)));
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  // Fetch project settings
  const { data: projectSettings } = useQuery<ProjectSettings>({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Extract time format and working hours
  const scheduleSettings = projectSettings?.scheduleSettings 
    ? (typeof projectSettings.scheduleSettings === 'string' 
        ? JSON.parse(projectSettings.scheduleSettings) 
        : projectSettings.scheduleSettings)
    : {};
  const timeFormat = scheduleSettings.timeFormat || '12-Hour AM/PM';
  const workStartTime = scheduleSettings.workStartTime || '09:00';
  const workEndTime = scheduleSettings.workEndTime || '17:00';

  // Fetch events for the current date
  const { data: events = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Filter events for the current day
  const dayEvents = useMemo(() => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return events.filter((event: ScheduleEvent) => event.date === dateStr);
  }, [events, currentDate]);

  // Generate time labels - same as availability editor
  const timeLabels = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
      const hour = START_HOUR + i;
      const minutes = hour * 60;
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      const label = formatTimeDisplay(timeString, timeFormat);
      return { hour, label, position: minutesToPosition(minutes) };
    });
  }, [timeFormat]);

  // Generate grid lines - same as availability editor
  const gridLines = useMemo(() => {
    const lines = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      const hourMinutes = hour * 60;
      lines.push({ minutes: hourMinutes, isHour: true });
      
      if (timeIncrement < 60 && hour < END_HOUR) {
        for (let increment = timeIncrement; increment < 60; increment += timeIncrement) {
          lines.push({ minutes: hourMinutes + increment, isHour: false });
        }
      }
    }
    return lines;
  }, [timeIncrement]);

  // Format date display
  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Navigation functions
  const goToPreviousDay = () => {
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setCurrentDate(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle mouse down for creating events - same pattern as availability editor
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    
    if (!calendarRef.current || !scrollContainerRef.current) return;
    
    const calendarRect = calendarRef.current.getBoundingClientRect();
    const scrollTop = scrollContainerRef.current.scrollTop;
    const mouseY = e.clientY - calendarRect.top + scrollTop;
    
    const startMinutes = positionToMinutes(mouseY);
    const endMinutes = Math.min(startMinutes + timeIncrement, END_MINUTES);
    
    setCreateEventDialog({
      isOpen: true,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
    });
  }, [timeIncrement]);

  // Handle event selection
  const handleEventClick = useCallback((e: React.MouseEvent, event: ScheduleEvent) => {
    e.stopPropagation();
    
    if (e.shiftKey) {
      setSelectedEvents(prev => {
        const newSet = new Set(prev);
        if (newSet.has(event.id)) {
          newSet.delete(event.id);
        } else {
          newSet.add(event.id);
        }
        return newSet;
      });
    } else {
      setSelectedEvents(new Set([event.id]));
    }
  }, []);

  // Handle event double-click for editing
  const handleEventDoubleClick = useCallback((event: ScheduleEvent) => {
    setEditingEvent(event);
  }, []);

  // Event type colors
  const getEventTypeColor = (type: string) => {
    const colors = {
      rehearsal: 'bg-blue-100 border-blue-300 text-blue-800',
      performance: 'bg-red-100 border-red-300 text-red-800',
      tech: 'bg-orange-100 border-orange-300 text-orange-800',
      meeting: 'bg-green-100 border-green-300 text-green-800',
      other: 'bg-gray-100 border-gray-300 text-gray-800',
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEvents.size > 0) {
        e.preventDefault();
        setShowBulkDeleteDialog(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvents]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading schedule...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBackToWeekly}
              className="text-gray-600 hover:text-gray-900 h-10"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Weekly View
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Time increment selector */}
            <select
              value={timeIncrement}
              onChange={(e) => setTimeIncrement(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1 text-sm h-10"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
            
            {/* Selection info */}
            {selectedEvents.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedEvents.size} selected
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  className="h-10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={goToPreviousDay} className="h-10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              {formatDateDisplay(currentDate)}
            </h1>
            <Button variant="outline" onClick={goToNextDay} className="h-10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" onClick={goToToday} className="h-10">
            Today
          </Button>
        </div>

        {/* All-day events section */}
        {dayEvents.filter((event: any) => event.isAllDay).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">All Day</h3>
            <div className="space-y-1">
              {dayEvents.filter((event: any) => event.isAllDay).map((event: any) => (
                <div
                  key={event.id}
                  className={`p-2 border rounded-lg cursor-pointer hover:opacity-80 ${getEventTypeColor(event.type)} ${selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''}`}
                  onClick={(e) => handleEventClick(e, event)}
                  onDoubleClick={() => handleEventDoubleClick(event)}
                >
                  <div className="font-medium text-sm">{event.title}</div>
                  {event.description && (
                    <div className="text-xs opacity-75">{event.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar grid - exactly like availability editor layout */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="overflow-auto"
            style={{ height: '600px' }}
          >
            <div style={{ height: '960px', position: 'relative' }}>
              <div className="grid grid-cols-5 h-full">
                {/* Time column - matches availability editor */}
                <div className="border-r bg-gray-50">
                  <div className="relative h-full">
                    {timeLabels.map(({ hour, label, position }) => (
                      <div
                        key={hour}
                        className={`absolute text-xs text-gray-600 px-2 ${hour === START_HOUR ? 'translate-y-0' : '-translate-y-1/2'}`}
                        style={{ top: `${position}px` }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event area - spans 4 columns like availability editor spans 7 */}
                <div className="col-span-4 relative" ref={calendarRef}>
                  {/* Working hours background highlight */}
                  <div
                    className="absolute w-full bg-blue-50 opacity-30"
                    style={{
                      top: `${minutesToPosition(timeToMinutes(workStartTime))}px`,
                      height: `${minutesToPosition(timeToMinutes(workEndTime) - timeToMinutes(workStartTime))}px`
                    }}
                  />

                  {/* Grid lines based on time increment */}
                  {gridLines.map(({ minutes, isHour }) => (
                    <div
                      key={minutes}
                      className={`absolute w-full border-t ${isHour ? 'border-gray-300' : 'border-gray-100'}`}
                      style={{ top: `${minutesToPosition(minutes)}px` }}
                    />
                  ))}

                  {/* Event area background - clickable for creating events */}
                  <div
                    className="absolute h-full w-full cursor-crosshair"
                    onMouseDown={handleMouseDown}
                  />

                  {/* Events - positioned like availability blocks */}
                  {dayEvents
                    .filter((event: any) => !event.isAllDay)
                    .map((event: any) => {
                      const startMinutes = timeToMinutes(event.startTime);
                      const endMinutes = timeToMinutes(event.endTime);
                      const duration = endMinutes - startMinutes;
                      
                      return (
                        <div
                          key={event.id}
                          className={`absolute rounded cursor-pointer border-2 transition-opacity hover:opacity-90 ${getEventTypeColor(event.type)} ${selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''}`}
                          style={{
                            left: '0.5%',
                            width: '99%',
                            top: `${minutesToPosition(startMinutes)}px`,
                            height: `${minutesToHeight(duration)}px`,
                            minHeight: '24px'
                          }}
                          onClick={(e) => handleEventClick(e, event)}
                          onDoubleClick={() => handleEventDoubleClick(event)}
                        >
                          <div className="p-2 overflow-hidden h-full">
                            <div className="font-medium text-sm truncate">{event.title}</div>
                            {event.description && (
                              <div className="text-xs opacity-75 truncate">{event.description}</div>
                            )}
                            <div className="text-xs opacity-75">
                              {formatTimeDisplay(event.startTime, timeFormat)} - {formatTimeDisplay(event.endTime, timeFormat)}
                            </div>
                            {event.location && (
                              <div className="text-xs opacity-75 truncate">📍 {event.location}</div>
                            )}
                            {event.participants.length > 0 && (
                              <div className="text-xs opacity-75 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {event.participants.length}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Click in empty time slots to create events • Hold Shift and click events to select multiple • Press Delete to remove selected events
        </div>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Selected Events</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete {selectedEvents.size} selected event{selectedEvents.size === 1 ? '' : 's'}?</p>
              <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)} className="h-10">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setSelectedEvents(new Set());
                  setShowBulkDeleteDialog(false);
                  toast({ title: 'Events deleted successfully' });
                }}
                className="h-10"
              >
                Delete Events
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}