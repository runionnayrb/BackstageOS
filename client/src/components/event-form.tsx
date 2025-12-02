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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <Label>Participants</Label>
        <div className="space-y-3 max-h-80 overflow-y-auto border rounded-md p-3">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-500">No contacts available</p>
          ) : (
            (() => {
              // Group contacts by contact group ONLY (don't fall back to category)
              const contactsByGroup = contacts.reduce((acc, contact) => {
                // Only include contacts that have a contact group assigned
                if (contact.contactGroup?.name) {
                  const groupName = contact.contactGroup.name;
                  if (!acc[groupName]) {
                    acc[groupName] = [];
                  }
                  acc[groupName].push(contact);
                }
                return acc;
              }, {} as Record<string, typeof contacts>);

              return Object.entries(contactsByGroup).map(([groupName, groupContacts]) => {
                const groupContactIds = groupContacts.map(c => c.id);
                const allGroupSelected = groupContactIds.every(id => formData.participantIds.includes(id));
                const someGroupSelected = groupContactIds.some(id => formData.participantIds.includes(id));

                return (
                  <div key={groupName} className="space-y-2">
                    {/* Group header with select all checkbox */}
                    <div className="flex items-center space-x-2 font-medium text-gray-700 border-b border-gray-200 pb-1">
                      <Checkbox
                        id={`group-${groupName}`}
                        checked={allGroupSelected}
                        ref={(el) => {
                          if (el) {
                            const input = el.querySelector('input');
                            if (input) {
                              input.indeterminate = someGroupSelected && !allGroupSelected;
                            }
                          }
                        }}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            // Add all group contacts that aren't already selected
                            const newParticipants = [
                              ...formData.participantIds,
                              ...groupContactIds.filter(id => !formData.participantIds.includes(id))
                            ];
                            setFormData({
                              ...formData,
                              participantIds: newParticipants,
                            });
                          } else {
                            // Remove all group contacts
                            setFormData({
                              ...formData,
                              participantIds: formData.participantIds.filter(id => !groupContactIds.includes(id)),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`group-${groupName}`} className="text-sm font-semibold">
                        {groupName.replace(/_/g, ' ').toUpperCase()}
                      </Label>
                    </div>

                    {/* Individual contacts in group */}
                    <div className="space-y-1 ml-6">
                      {groupContacts.map(contact => (
                        <div key={contact.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`contact-${contact.id}`}
                            checked={formData.participantIds.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  participantIds: [...formData.participantIds, contact.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  participantIds: formData.participantIds.filter(id => id !== contact.id),
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                            {contact.firstName} {contact.lastName}
                            {contact.role && (
                              <span className="text-gray-500 ml-1">({contact.role})</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
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