import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Clock, Plus, Calendar, X } from "lucide-react";
import WeeklyScheduleView from "@/components/weekly-schedule-view";
import MobileWeeklyScheduleView from "@/components/mobile-weekly-schedule-view";
import DailyScheduleView from "@/components/daily-schedule-view";
import MonthlyScheduleView from "@/components/monthly-schedule-view-new";
import ScheduleFilter from "@/components/schedule-filter";
import EventForm from "@/components/event-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedIndividualTypes, setSelectedIndividualTypes] = useState<string[]>([]);
  const [timeIncrement, setTimeIncrement] = useState<15 | 30 | 60>(30);
  const [showAllDayEvents, setShowAllDayEvents] = useState(true);
  const [createEventDialog, setCreateEventDialog] = useState(false);
  const [createEventData, setCreateEventData] = useState<{
    date?: string;
    startTime?: string;
    endTime?: string;
  }>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: settings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Fetch contacts for event creation
  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Fetch event types for event creation
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (eventData: any) => apiRequest('POST', `/api/projects/${projectId}/schedule-events`, {
      ...eventData,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setCreateEventDialog(false);
      setCreateEventData({});
      toast({
        title: "Event created successfully",
        description: "The event has been added to your schedule.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating event",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
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

  // Handle create event
  const handleCreateEvent = (eventData: any) => {
    createEventMutation.mutate(eventData);
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
      {/* Desktop Header */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8 py-4">
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
          
          <div className="flex items-center gap-2">
            <ScheduleFilter
              projectId={parseInt(projectId)}
              selectedContactIds={selectedContactIds}
              onFilterChange={setSelectedContactIds}
              selectedEventTypes={selectedEventTypes}
              onEventTypeFilterChange={setSelectedEventTypes}
              selectedIndividualTypes={selectedIndividualTypes}
              onIndividualTypeFilterChange={setSelectedIndividualTypes}
            />
            
            <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(parseInt(value) as 15 | 30 | 60)}>
              <SelectTrigger className="w-12 border-0 shadow-none [&_svg[data-lucide='chevron-down']]:hidden">
                <SelectValue asChild>
                  <Clock 
                    className={`h-6 w-6 ${
                      timeIncrement === 15 ? 'rotate-90' : 
                      timeIncrement === 30 ? 'rotate-180' : 
                      'rotate-0'
                    }`} 
                  />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 border-none bg-transparent hover:bg-transparent">
                  {viewMode === 'monthly' ? 'Month' : viewMode === 'weekly' ? 'Week' : 'Day'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewMode('monthly')}>
                  Month
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('weekly')}>
                  Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('daily')}>
                  Day
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        {/* Main Mobile Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            {/* Month/Year Display */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/shows/${projectId}/calendar`)}
                className="p-1"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                {getHeaderText()}
              </h1>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <ScheduleFilter
                projectId={parseInt(projectId)}
                selectedContactIds={selectedContactIds}
                onFilterChange={setSelectedContactIds}
                selectedEventTypes={selectedEventTypes}
                onEventTypeFilterChange={setSelectedEventTypes}
                selectedIndividualTypes={selectedIndividualTypes}
                onIndividualTypeFilterChange={setSelectedIndividualTypes}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                className="p-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                className="p-2"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile View Mode Selector */}
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* View Mode Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'monthly' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'weekly' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'daily' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  console.log('Today button clicked, setting date to:', today.toDateString());
                  setCurrentDate(today);
                }}
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Today
              </button>
            </div>

            {/* Buttons and Settings */}
            <div className="flex items-center gap-2">
              {/* Time Increment for weekly/daily views - rightmost */}
              {(viewMode === 'weekly' || viewMode === 'daily') && (
                <div className="no-chevron">
                  <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(parseInt(value) as 15 | 30 | 60)}>
                    <SelectTrigger className="w-12 h-8 border-0 bg-transparent shadow-none p-1 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center">
                      <Clock className="h-4 w-4 text-gray-600" />
                    </SelectTrigger>
                    <SelectContent align="end" className="min-w-[80px] w-auto">
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* All Day Button - middle - show in all views */}
              {(viewMode === 'weekly' || viewMode === 'monthly' || viewMode === 'daily') && (
                <button
                  onClick={() => setShowAllDayEvents(!showAllDayEvents)}
                  className="p-2 h-8 border-0 bg-transparent hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Calendar className={`h-4 w-4 ${showAllDayEvents ? 'text-blue-500' : 'text-gray-600'}`} />
                </button>
              )}
              
              {/* New Event Button - leftmost */}
              <button
                onClick={() => setCreateEventDialog(true)}
                className="p-2 h-8 border-0 bg-transparent hover:bg-gray-100 rounded-md transition-colors"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Content Container - Responsive Padding */}
      <div className="px-0 md:px-4 lg:px-8">
        {viewMode === 'monthly' ? (
          <MonthlyScheduleView 
            projectId={parseInt(projectId)} 
            onDateClick={handleDateClick}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedContactIds={selectedContactIds}
            selectedEventTypes={selectedEventTypes}
            selectedIndividualTypes={selectedIndividualTypes}
            showAllDayEvents={showAllDayEvents}
            setShowAllDayEvents={setShowAllDayEvents}
            createEventDialog={createEventDialog}
            setCreateEventDialog={setCreateEventDialog}
            onEventClick={(event) => {
              // Set the date to the event's date and switch to daily view
              setCurrentDate(new Date(event.date));
              setViewMode('daily');
            }}
          />
        ) : viewMode === 'weekly' ? (
          <>
            {/* Desktop Weekly View */}
            <div className="hidden md:block">
              <WeeklyScheduleView 
                projectId={parseInt(projectId)} 
                onDateClick={handleDateClick}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                selectedContactIds={selectedContactIds}
                selectedEventTypes={selectedEventTypes}
                selectedIndividualTypes={selectedIndividualTypes}
                timeIncrement={timeIncrement}
                showAllDayEvents={showAllDayEvents}
                createEventDialog={createEventDialog}
                setCreateEventDialog={setCreateEventDialog}
                setCreateEventData={setCreateEventData}
              />
            </div>
            {/* Mobile Weekly View - 2 days with continuous scroll */}
            <div className="md:hidden">
              <MobileWeeklyScheduleView 
                projectId={parseInt(projectId)} 
                onDateClick={handleDateClick}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                selectedContactIds={selectedContactIds}
                selectedEventTypes={selectedEventTypes}
                selectedIndividualTypes={selectedIndividualTypes}
                timeIncrement={timeIncrement}
                showAllDayEvents={showAllDayEvents}
                settings={settings}
                createEventDialog={createEventDialog}
                setCreateEventDialog={setCreateEventDialog}
                onEventEdit={(event) => {
                  // Navigate to daily view and let that handle editing
                  setCurrentDate(new Date(event.date));
                  setViewMode('daily');
                }}
              />
            </div>
          </>
        ) : (
          <DailyScheduleView 
            projectId={parseInt(projectId)} 
            selectedDate={currentDate}
            onDateClick={handleDateClick}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedContactIds={selectedContactIds}
            selectedEventTypes={selectedEventTypes}
            selectedIndividualTypes={selectedIndividualTypes}
            createEventDialog={createEventDialog}
            setCreateEventDialog={setCreateEventDialog}
            showAllDayEvents={showAllDayEvents}
            timeIncrement={timeIncrement}
          />
        )}
      </div>

      {/* Unified Mobile Bottom Sheet for Event Creation */}
      {createEventDialog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setCreateEventDialog(false)}
            style={{ touchAction: 'none' }}
          />
          
          {/* Bottom Sheet */}
          <div 
            className="fixed left-0 right-0 z-50 bg-white flex flex-col"
            style={{ 
              top: '60px', // Just below the BackstageOS header
              bottom: '80px', // Above mobile navigation (typically 64-80px)
              height: 'auto',
              maxHeight: 'calc(100vh - 140px)' // Header + mobile nav space
            }}
            onTouchMove={(e) => {
              // Prevent background scrolling when touching the sheet
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <Button 
                variant="ghost" 
                onClick={() => setCreateEventDialog(false)}
                className="text-gray-500 hover:text-gray-700 p-1 h-auto"
              >
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-black">
                New Event
              </h1>
              <div className="w-9" /> {/* Spacer for center alignment */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
              <EventForm
                projectId={parseInt(projectId)}
                contacts={contacts}
                eventTypes={eventTypes}
                initialDate={createEventData.date}
                onSubmit={handleCreateEvent}
                onCancel={() => setCreateEventDialog(false)}
                timeFormat={settings?.scheduleSettings?.timeFormat || '12'}
                showButtons={false}
                initialValues={{
                  startDate: createEventData.date,
                  endDate: createEventData.date,
                  startTime: createEventData.startTime,
                  endTime: createEventData.endTime,
                }}
                key={`${createEventData.date}-${createEventData.startTime}-${createEventData.endTime}`}
              />
            </div>
            
            {/* Sticky Footer with Buttons */}
            <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateEventDialog(false)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="event-form"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2"
                  disabled={createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}