import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, X, Users, Calendar } from "lucide-react";

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  category: string;
}

interface EventType {
  id: number;
  name: string;
  description: string;
  color: string;
  isDefault: boolean;
  projectId: number;
}

interface ScheduleFilterProps {
  projectId: number;
  selectedContactIds: number[];
  onFilterChange: (contactIds: number[]) => void;
  selectedEventTypes: string[];
  onEventTypeFilterChange: (eventTypes: string[]) => void;
  selectedIndividualTypes: string[];
  onIndividualTypeFilterChange: (individualTypes: string[]) => void;
}

export default function ScheduleFilter({ 
  projectId, 
  selectedContactIds, 
  onFilterChange, 
  selectedEventTypes, 
  onEventTypeFilterChange,
  selectedIndividualTypes,
  onIndividualTypeFilterChange
}: ScheduleFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showScheduleEnabled, setShowScheduleEnabled] = useState(true);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  const { data: eventTypes = [] } = useQuery<EventType[]>({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });



  // Get enabled event types from show settings
  const enabledEventTypes = showSettings?.scheduleSettings?.enabledEventTypes || [];

  // Use only database event types - no legacy detection
  const allEventTypes = eventTypes;

  // Initialize Show Schedule state when settings load
  useEffect(() => {
    if (enabledEventTypes.length > 0 && showScheduleEnabled) {
      // Automatically apply enabled event types when show schedule is enabled
      onEventTypeFilterChange(enabledEventTypes);
    }
  }, [enabledEventTypes, showScheduleEnabled, onEventTypeFilterChange]);

  // Group contacts by category for better organization
  const contactsByCategory = contacts.reduce((acc, contact) => {
    const category = contact.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  const handleContactToggle = (contactId: number) => {
    const newSelection = selectedContactIds.includes(contactId)
      ? selectedContactIds.filter(id => id !== contactId)
      : [...selectedContactIds, contactId];
    
    onFilterChange(newSelection);
  };

  const handleSelectAll = () => {
    const allContactIds = contacts.map(contact => contact.id);
    onFilterChange(allContactIds);
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  // Event type filtering functions
  const handleEventTypeToggle = (eventTypeName: string) => {
    const currentSelection = selectedEventTypes || [];
    const newSelection = currentSelection.includes(eventTypeName)
      ? currentSelection.filter(name => name !== eventTypeName)
      : [...currentSelection, eventTypeName];
    
    onEventTypeFilterChange(newSelection);
  };

  const handleSelectAllEventTypes = () => {
    const allEventTypeNames = allEventTypes.map(eventType => eventType.name);
    onEventTypeFilterChange(allEventTypeNames);
  };

  const handleClearAllEventTypes = () => {
    onEventTypeFilterChange([]);
  };

  // Individual event type filtering functions
  const handleIndividualTypeToggle = (eventTypeName: string) => {
    const currentSelection = selectedIndividualTypes || [];
    const newSelection = currentSelection.includes(eventTypeName)
      ? currentSelection.filter(name => name !== eventTypeName)
      : [...currentSelection, eventTypeName];
    
    onIndividualTypeFilterChange(newSelection);
  };

  const handleSelectAllIndividualTypes = () => {
    // Select all event types that are NOT enabled in show schedule
    const individualEventTypes = allEventTypes
      .filter(eventType => !enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id))
      .map(eventType => eventType.name);
    onIndividualTypeFilterChange(individualEventTypes);
  };

  const handleClearAllIndividualTypes = () => {
    onIndividualTypeFilterChange([]);
  };

  const handleShowScheduleToggle = () => {
    setShowScheduleEnabled(!showScheduleEnabled);
    if (!showScheduleEnabled) {
      // When enabling show schedule, set selected event types to enabled ones from settings
      onEventTypeFilterChange(enabledEventTypes);
    } else {
      // When disabling show schedule, clear all event type filters
      onEventTypeFilterChange([]);
    }
  };

  const getFilterStatusText = () => {
    if (selectedContactIds.length === 0) {
      return "Show Schedule";
    } else if (selectedContactIds.length === 1) {
      const contact = contacts.find(c => c.id === selectedContactIds[0]);
      return contact ? `${contact.firstName} ${contact.lastName}` : "1 Person";
    } else {
      return `${selectedContactIds.length} People`;
    }
  };

  const getFilterStatusColor = () => {
    if (selectedContactIds.length === 0) {
      return "bg-gray-100 text-gray-600 hover:bg-gray-200";
    } else if (selectedContactIds.length === 1) {
      return "bg-blue-100 text-blue-700 hover:bg-blue-200";
    } else {
      return "bg-green-100 text-green-700 hover:bg-green-200";
    }
  };

  // Sort categories with Cast first, then alphabetically
  const sortedCategories = Object.keys(contactsByCategory).sort((a, b) => {
    if (a === 'Cast' && b !== 'Cast') return -1;
    if (a !== 'Cast' && b === 'Cast') return 1;
    return a.localeCompare(b);
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 bg-transparent hover:bg-transparent border-none ${
            (selectedIndividualTypes && selectedIndividualTypes.length > 0) 
              ? 'text-blue-600 hover:text-blue-700' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Schedule Filters
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="people" className="w-full">
          <div className="flex gap-2 mx-4 mb-4">
            <TabsList className="grid grid-cols-2 h-9 flex-1">
              <TabsTrigger value="people" className="h-8 text-sm">
                People
              </TabsTrigger>
              <TabsTrigger value="events" className="h-8 text-sm">
                Event Types
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="people" className="m-0">
            <div className="px-4 pb-4">
              <div className="flex justify-end gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs px-2 py-1 h-6"
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs px-2 py-1 h-6"
                >
                  None
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No team members found</p>
              <p className="text-sm">Add contacts to filter by assignments</p>
            </div>
          ) : (
            <div className="p-2">
              {sortedCategories.map((category) => (
                <div key={category} className="mb-4">
                  <div className="px-2 py-1 text-sm font-medium text-gray-600 border-b">
                    {category.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="space-y-1 mt-2">
                    {contactsByCategory[category].map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleContactToggle(contact.id)}
                      >
                        <Checkbox
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={() => handleContactToggle(contact.id)}
                          className="pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.role && (
                            <p className="text-xs text-gray-500 truncate">
                              {contact.role}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>

            <div className="p-3 border-t bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {selectedContactIds.length === 0 
                    ? "Showing show schedule (production events only)"
                    : `Filtering by ${selectedContactIds.length} ${selectedContactIds.length === 1 ? 'person' : 'people'}`
                  }
                </span>
                {selectedContactIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="m-0">
            {/* Show Schedule Section */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-700">Show Schedule</h5>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllEventTypes}
                    className="h-6 px-2 text-xs"
                    disabled={allEventTypes.filter(eventType => enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id)).length === 0}
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllEventTypes}
                    className="h-6 px-2 text-xs"
                  >
                    None
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {allEventTypes
                  .filter(eventType => enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id))
                  .map((eventType) => (
                    <div
                      key={eventType.id}
                      className="flex items-center space-x-3 p-2 rounded bg-white cursor-pointer hover:bg-gray-50"
                      onClick={() => handleEventTypeToggle(eventType.name)}
                    >
                      <Checkbox
                        checked={selectedEventTypes?.includes(eventType.name) || false}
                        onChange={() => handleEventTypeToggle(eventType.name)}
                        className="pointer-events-none"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {eventType.name}
                        </p>
                        {eventType.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {eventType.description}
                          </p>
                        )}
                      </div>
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: eventType.color }}
                      />
                    </div>
                  ))}
                {allEventTypes.filter(eventType => enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id)).length === 0 && (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    No event types enabled in Show Schedule
                  </div>
                )}
              </div>
            </div>

            {/* Individual Events Section */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-gray-700">Individual Events</h5>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllIndividualTypes}
                    className="h-6 px-2 text-xs"
                    disabled={allEventTypes.filter(eventType => !enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id)).length === 0}
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllIndividualTypes}
                    className="h-6 px-2 text-xs"
                  >
                    None
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {allEventTypes
                  .filter(eventType => !enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id))
                  .map((eventType) => (
                    <div
                      key={eventType.id}
                      className="flex items-center space-x-3 p-2 rounded bg-white cursor-pointer hover:bg-gray-50"
                      onClick={() => handleIndividualTypeToggle(eventType.name)}
                    >
                      <Checkbox
                        checked={selectedIndividualTypes?.includes(eventType.name) || false}
                        onChange={() => handleIndividualTypeToggle(eventType.name)}
                        className="pointer-events-none"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {eventType.name}
                        </p>
                        {eventType.description && (
                          <p className="text-xs text-gray-500 truncate">
                            {eventType.description}
                          </p>
                        )}
                      </div>
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: eventType.color }}
                      />
                    </div>
                  ))}
                {allEventTypes.filter(eventType => !enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id)).length === 0 && (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    All event types are enabled in Show Schedule
                  </div>
                )}
              </div>
            </div>



            <div className="p-3 border-t bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {((selectedEventTypes?.length || 0) + (selectedIndividualTypes?.length || 0)) === 0 
                    ? "Showing all event types"
                    : `Filtering by ${(selectedEventTypes?.length || 0) + (selectedIndividualTypes?.length || 0)} ${((selectedEventTypes?.length || 0) + (selectedIndividualTypes?.length || 0)) === 1 ? 'type' : 'types'}`
                  }
                </span>
                {((selectedEventTypes?.length || 0) + (selectedIndividualTypes?.length || 0)) > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleClearAllEventTypes();
                      handleClearAllIndividualTypes();
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}