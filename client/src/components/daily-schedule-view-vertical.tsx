import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Plus, Calendar, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatTimeDisplay, formatTimeFromMinutes } from '@/lib/timeUtils';
import EditEventForm from '@/components/edit-event-form';

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
  parentEventId?: number | null;
  isProductionLevel?: boolean;
  participants: {
    id: number;
    contactId: number;
    contactFirstName: string;
    contactLastName: string;
    isRequired: boolean;
    status: string;
  }[];
  childEvents?: ScheduleEvent[]; // For events with children
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  category: string;
  role?: string;
}

export default function DailyScheduleViewVertical({ projectId, selectedDate, onBackToWeekly, selectedContactIds }: DailyScheduleViewProps) {
  const { toast } = useToast();
  
  // State for event management
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [createEventDialog, setCreateEventDialog] = useState<{ isOpen: boolean; startTime?: string; endTime?: string }>({ isOpen: false });
  const [timeIncrement, setTimeIncrement] = useState(30);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Refs for drag functionality
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<any>(null);

  // Time utilities
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Fetch project settings
  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Extract time format and working hours
  const scheduleSettings = projectSettings?.scheduleSettings ? JSON.parse(projectSettings.scheduleSettings) : {};
  const timeFormat = scheduleSettings.timeFormat || '12-Hour AM/PM';
  const workStartTime = scheduleSettings.workStartTime || '09:00';
  const workEndTime = scheduleSettings.workEndTime || '17:00';

  // Fetch events for the current date
  const { data: events = [], isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule/events`, currentDate.toISOString().split('T')[0]],
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Fetch event types
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  // Filter events for the current day
  const dayEvents = useMemo(() => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return events.filter((event: ScheduleEvent) => event.date === dateStr);
  }, [events, currentDate]);

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

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch(`/api/projects/${projectId}/schedule/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error('Failed to create event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule/events`] });
      setCreateEventDialog({ isOpen: false });
      toast({ title: 'Event created successfully' });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: number; eventData: any }) => {
      const response = await fetch(`/api/projects/${projectId}/schedule/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error('Failed to update event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule/events`] });
      setEditingEvent(null);
      toast({ title: 'Event updated successfully' });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/projects/${projectId}/schedule/events/${eventId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete event');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule/events`] });
      setEditingEvent(null);
      toast({ title: 'Event deleted successfully' });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (eventIds: number[]) => {
      await Promise.all(
        eventIds.map(id =>
          fetch(`/api/projects/${projectId}/schedule/events/${id}`, {
            method: 'DELETE',
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule/events`] });
      setSelectedEvents(new Set());
      setShowBulkDeleteDialog(false);
      toast({ title: 'Events deleted successfully' });
    },
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected events with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEvents.size > 0) {
        e.preventDefault();
        setShowBulkDeleteDialog(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvents]);

  // Handle drag-to-create events
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const startY = e.clientY - rect.top;
    
    // Calculate the time slot based on Y position
    const minutesFromStart = Math.floor((startY / 64) * 60); // 64px per hour
    const startMinutes = START_MINUTES + minutesFromStart;
    const endMinutes = Math.min(startMinutes + timeIncrement, END_MINUTES);
    
    // Open create event dialog with calculated times
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
      // Multi-select mode
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
      // Single selection - clear others and select this one
      setSelectedEvents(new Set([event.id]));
    }
  }, []);

  // Handle event double-click for editing
  const handleEventDoubleClick = useCallback((event: ScheduleEvent) => {
    setEditingEvent(event);
  }, []);

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
              className="border border-gray-300 rounded px-3 py-1 text-sm"
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
            <Button variant="outline" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">
              {formatDateDisplay(currentDate)}
            </h1>
            <Button variant="outline" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
        </div>

        {/* All-day events section */}
        {dayEvents.filter(event => event.isAllDay).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">All Day</h3>
            <div className="space-y-1">
              {dayEvents.filter(event => event.isAllDay).map((event) => {
                const eventTypeColors = {
                  rehearsal: 'bg-blue-100 border-blue-300 text-blue-800',
                  performance: 'bg-red-100 border-red-300 text-red-800',
                  tech: 'bg-orange-100 border-orange-300 text-orange-800',
                  meeting: 'bg-green-100 border-green-300 text-green-800',
                  other: 'bg-gray-100 border-gray-300 text-gray-800',
                };

                return (
                  <div
                    key={event.id}
                    className={`p-2 border rounded-lg cursor-pointer hover:opacity-80 ${
                      eventTypeColors[event.type as keyof typeof eventTypeColors] || eventTypeColors.other
                    } ${selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''}`}
                    onClick={(e) => handleEventClick(e, event)}
                    onDoubleClick={() => handleEventDoubleClick(event)}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      const touchTimer = setTimeout(() => {
                        // Haptic feedback if available
                        if ('vibrate' in navigator) {
                          navigator.vibrate(50);
                        }
                        handleEventDoubleClick(event);
                      }, 500);
                      
                      const currentTarget = e.currentTarget;
                      const handleTouchEnd = () => {
                        clearTimeout(touchTimer);
                        if (currentTarget) {
                          currentTarget.removeEventListener('touchend', handleTouchEnd);
                          currentTarget.removeEventListener('touchmove', handleTouchEnd);
                        }
                      };
                      
                      if (currentTarget) {
                        currentTarget.addEventListener('touchend', handleTouchEnd);
                        currentTarget.addEventListener('touchmove', handleTouchEnd);
                      }
                    }}
                  >
                    <div className="font-medium text-sm">{event.title}</div>
                    {event.description && (
                      <div className="text-xs opacity-75">{event.description}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vertical time grid */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="relative">
            {/* Time slots */}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => {
              const hour = START_HOUR + i;
              const timeString = `${hour.toString().padStart(2, '0')}:00`;
              const formattedTime = formatTimeDisplay(timeString, timeFormat);
              
              return (
                <div key={hour} className="flex border-b border-gray-200 last:border-b-0">
                  {/* Time label */}
                  <div className="w-20 flex-shrink-0 p-3 text-sm text-gray-500 text-right border-r border-gray-200 bg-gray-50">
                    {formattedTime}
                  </div>
                  
                  {/* Event area */}
                  <div 
                    className="flex-1 relative bg-white cursor-crosshair"
                    style={{ minHeight: '64px' }}
                    onMouseDown={handleMouseDown}
                  >
                    {/* Grid lines for time increments */}
                    {timeIncrement < 60 && (
                      <div className="absolute inset-0">
                        {Array.from({ length: 60 / timeIncrement - 1 }, (_, j) => (
                          <div
                            key={j}
                            className="absolute w-full border-t border-gray-100"
                            style={{ top: `${((j + 1) * timeIncrement / 60) * 100}%` }}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Working hours highlight */}
                    {hour >= timeToMinutes(workStartTime) / 60 && hour < timeToMinutes(workEndTime) / 60 && (
                      <div className="absolute inset-0 bg-blue-50 opacity-30 pointer-events-none" />
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Events positioned absolutely over the time grid */}
            <div className="absolute inset-0" style={{ left: '80px' }}>
              {dayEvents
                .filter(event => !event.isAllDay)
                .map((event) => {
                  const startMinutes = timeToMinutes(event.startTime);
                  const endMinutes = timeToMinutes(event.endTime);
                  const durationMinutes = endMinutes - startMinutes;
                  
                  // Calculate vertical position (64px per hour)
                  const topPosition = ((startMinutes - START_MINUTES) / 60) * 64;
                  const height = (durationMinutes / 60) * 64;
                  
                  const eventTypeColors = {
                    rehearsal: 'bg-blue-100 border-blue-300 text-blue-800',
                    performance: 'bg-red-100 border-red-300 text-red-800',
                    tech: 'bg-orange-100 border-orange-300 text-orange-800',
                    meeting: 'bg-green-100 border-green-300 text-green-800',
                    other: 'bg-gray-100 border-gray-300 text-gray-800',
                  };

                  return (
                    <div
                      key={event.id}
                      className={`absolute border-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity shadow-sm ${
                        eventTypeColors[event.type as keyof typeof eventTypeColors] || eventTypeColors.other
                      } ${selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''}`}
                      style={{
                        top: `${topPosition}px`,
                        height: `${Math.max(height, 32)}px`,
                        left: '8px',
                        right: '8px',
                      }}
                      onClick={(e) => handleEventClick(e, event)}
                      onDoubleClick={() => handleEventDoubleClick(event)}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const touchTimer = setTimeout(() => {
                          // Haptic feedback if available
                          if ('vibrate' in navigator) {
                            navigator.vibrate(50);
                          }
                          handleEventDoubleClick(event);
                        }, 500);
                        
                        const currentTarget = e.currentTarget;
                        const handleTouchEnd = () => {
                          clearTimeout(touchTimer);
                          if (currentTarget) {
                            currentTarget.removeEventListener('touchend', handleTouchEnd);
                            currentTarget.removeEventListener('touchmove', handleTouchEnd);
                          }
                        };
                        
                        if (currentTarget) {
                          currentTarget.addEventListener('touchend', handleTouchEnd);
                          currentTarget.addEventListener('touchmove', handleTouchEnd);
                        }
                      }}
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
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          <span className="hidden md:inline">Click in empty time slots to create events • Double-click events to edit • Hold Shift and click events to select multiple • Press Delete to remove selected events</span>
          <span className="md:hidden">Tap empty time slots to create events • Long-press events to edit • Tap events to select</span>
        </div>

        {/* Edit Event Dialog */}
        {editingEvent && (
          <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Event</DialogTitle>
              </DialogHeader>
              <EditEventForm 
                event={editingEvent}
                contacts={contacts}
                eventTypes={eventTypes}
                projectId={projectId}
                onSubmit={(data) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData: data })}
                onDelete={() => deleteEventMutation.mutate(editingEvent.id)}
                onCancel={() => setEditingEvent(null)}
                isDeleting={deleteEventMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}

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
              <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedEvents))}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Events'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}