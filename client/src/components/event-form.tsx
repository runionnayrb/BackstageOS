import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import EventTypeSelect from "@/components/event-type-select";
import LocationSelect from "@/components/location-select";

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  category: string;
  role?: string;
}

interface EventFormProps {
  projectId: number;
  contacts: Contact[];
  eventTypes: any[];
  initialDate?: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  timeFormat?: string;
  showButtons?: boolean;
  initialValues?: {
    title?: string;
    description?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    notes?: string;
    isAllDay?: boolean;
    isProductionLevel?: boolean;
    participantIds?: number[];
  };
}

export default function EventForm({
  projectId,
  contacts,
  eventTypes,
  initialDate,
  onSubmit,
  onCancel,
  timeFormat = '12',
  showButtons = true,
  initialValues
}: EventFormProps) {
  console.log('🎭 EventForm component initializing with initialValues:', JSON.stringify(initialValues, null, 2));
  console.log('🎭 EventForm - isProductionLevel value:', initialValues?.isProductionLevel);
  console.log('🎭 EventForm - isProductionLevel type:', typeof initialValues?.isProductionLevel);
  console.log('📅 EventForm - startDate from initialValues:', initialValues?.startDate);
  console.log('📅 EventForm - initialDate prop:', initialDate);
  
  // Helper to format date as YYYY-MM-DD without UTC conversion
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    type: initialValues?.type || '',
    startDate: initialValues?.startDate || initialDate || formatLocalDate(new Date()),
    endDate: initialValues?.endDate || initialDate || formatLocalDate(new Date()),
    startTime: initialValues?.startTime || '09:00',
    endTime: initialValues?.endTime || '10:00',
    location: initialValues?.location || '',
    notes: initialValues?.notes || '',
    isAllDay: initialValues?.isAllDay ?? false,
    isProductionLevel: (() => {
      const value = initialValues?.isProductionLevel ?? false;
      console.log('🎭 EventForm - setting isProductionLevel to:', value);
      return value;
    })(),
    participantIds: initialValues?.participantIds || [] as number[],
  });
  
  console.log('🎭 EventForm - final formData.isProductionLevel:', formData.isProductionLevel);

  // Auto-populate end date when start date changes
  const handleStartDateChange = (newStartDate: string) => {
    setFormData(prev => ({
      ...prev,
      startDate: newStartDate,
      // Auto-update end date to match start date if it's currently empty or the same as the previous start date
      endDate: prev.endDate === prev.startDate || !prev.endDate ? newStartDate : prev.endDate
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up the form data before submission and map to API format
    const cleanedData = {
      ...formData,
      date: formData.startDate, // Use startDate as the primary date for API compatibility
      location: formData.location?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      participants: formData.participantIds, // Map participantIds to participants for backend
    };
    onSubmit(cleanedData);
  };

  return (
    <form 
      id="event-form" 
      onSubmit={handleSubmit} 
      className="space-y-4 p-4 max-w-full"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <EventTypeSelect
            value={formData.type ? formData.type.toLowerCase().replace(/\s+/g, '_') : ''}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            projectId={projectId}
            eventTypes={eventTypes}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            required
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
            className="w-full"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            disabled={formData.isAllDay}
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            disabled={formData.isAllDay}
            className="w-full"
          />
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isAllDay"
            checked={formData.isAllDay}
            onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: !!checked })}
          />
          <Label htmlFor="isAllDay">All Day Event</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isProductionLevel"
            checked={formData.isProductionLevel}
            onCheckedChange={(checked) => setFormData({ ...formData, isProductionLevel: !!checked })}
          />
          <Label htmlFor="isProductionLevel" className="flex items-center space-x-2">
            <span>Add to Production Calendar</span>
            <span className="text-xs text-muted-foreground">(Master production schedule)</span>
          </Label>
        </div>
      </div>
      <div>
        <Label>Location</Label>
        <LocationSelect
          projectId={projectId}
          value={formData.location}
          onValueChange={(value) => setFormData({ ...formData, location: value })}
          date={formData.startDate}
          startTime={formData.startTime}
          endTime={formData.endTime}
        />
      </div>
      <div>
        <Label>People</Label>
        <div className="max-h-80 overflow-y-auto">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-500 p-3">No contacts available</p>
          ) : (
            (() => {
              const contactsByGroup = contacts.reduce((acc, contact) => {
                if (contact.contactGroup?.name) {
                  const groupName = contact.contactGroup.name;
                  if (!acc[groupName]) {
                    acc[groupName] = [];
                  }
                  acc[groupName].push(contact);
                }
                return acc;
              }, {} as Record<string, typeof contacts>);

              const allContactIds = contacts.filter(c => c.contactGroup?.name).map(c => c.id);
              const allSelected = allContactIds.length > 0 && allContactIds.every(id => formData.participantIds.includes(id));

              const handleSelectAll = () => {
                setFormData({
                  ...formData,
                  participantIds: [...new Set([...formData.participantIds, ...allContactIds])],
                });
              };

              const handleClearAll = () => {
                setFormData({
                  ...formData,
                  participantIds: formData.participantIds.filter(id => !allContactIds.includes(id)),
                });
              };

              const handleSelectGroupAll = (groupContacts: typeof contacts) => {
                const groupContactIds = groupContacts.map(c => c.id);
                setFormData({
                  ...formData,
                  participantIds: [...new Set([...formData.participantIds, ...groupContactIds])],
                });
              };

              const handleSelectGroupNone = (groupContacts: typeof contacts) => {
                const groupContactIds = groupContacts.map(c => c.id);
                setFormData({
                  ...formData,
                  participantIds: formData.participantIds.filter(id => !groupContactIds.includes(id)),
                });
              };

              const sortedGroups = Object.keys(contactsByGroup).sort((a, b) => {
                if (a === 'Cast' && b !== 'Cast') return -1;
                if (a !== 'Cast' && b === 'Cast') return 1;
                return a.localeCompare(b);
              });

              return (
                <>
                  <div className="px-3 py-2 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">FULL COMPANY</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          className="text-xs px-2 py-1 h-5"
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleClearAll}
                          className="text-xs px-2 py-1 h-5"
                        >
                          None
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    {sortedGroups.map((groupName) => {
                      const groupContacts = contactsByGroup[groupName];
                      const groupContactIds = groupContacts.map(c => c.id);
                      const allGroupSelected = groupContactIds.every(id => formData.participantIds.includes(id));
                      const someGroupSelected = groupContactIds.some(id => formData.participantIds.includes(id));

                      return (
                        <div key={groupName} className="mb-4">
                          <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-gray-600 border-b">
                            <span>{groupName.replace(/_/g, ' ').toUpperCase()}</span>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectGroupAll(groupContacts)}
                                className="text-xs px-2 py-1 h-5"
                              >
                                All
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectGroupNone(groupContacts)}
                                className="text-xs px-2 py-1 h-5"
                              >
                                None
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 mt-2">
                            {groupContacts.map(contact => (
                              <div
                                key={contact.id}
                                className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  if (formData.participantIds.includes(contact.id)) {
                                    setFormData({
                                      ...formData,
                                      participantIds: formData.participantIds.filter(id => id !== contact.id),
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      participantIds: [...formData.participantIds, contact.id],
                                    });
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={formData.participantIds.includes(contact.id)}
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
                      );
                    })}
                  </div>
                </>
              );
            })()
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      {showButtons && (
        <div className="flex justify-end space-x-2 pb-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Create Event
          </Button>
        </div>
      )}
    </form>
  );
}