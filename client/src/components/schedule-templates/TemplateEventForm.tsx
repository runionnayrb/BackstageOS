import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EventTypeSelect from "@/components/event-type-select";
import LocationSelect from "@/components/location-select";

interface EventType {
  id: number;
  name: string;
  color: string;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  category: string;
  role?: string;
  contactGroup?: {
    id: number;
    name: string;
  };
}

interface TemplateEventFormProps {
  projectId: number;
  eventTypes: EventType[];
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  showButtons?: boolean;
  initialValues?: {
    title?: string;
    description?: string;
    type?: string;
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    location?: string;
    notes?: string;
    isAllDay?: boolean;
    participantIds?: number[];
  };
}

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function TemplateEventForm({
  projectId,
  eventTypes,
  contacts,
  onSubmit,
  onCancel,
  showButtons = true,
  initialValues
}: TemplateEventFormProps) {
  const [formData, setFormData] = useState({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    type: initialValues?.type || '',
    dayOfWeek: initialValues?.dayOfWeek ?? 1,
    startTime: initialValues?.startTime?.slice(0, 5) || '09:00',
    endTime: initialValues?.endTime?.slice(0, 5) || '10:00',
    location: initialValues?.location || '',
    notes: initialValues?.notes || '',
    isAllDay: initialValues?.isAllDay ?? false,
    participantIds: initialValues?.participantIds || [] as number[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedData = {
      ...formData,
      location: formData.location?.trim() || null,
      description: formData.description?.trim() || null,
      notes: formData.notes?.trim() || null,
    };
    onSubmit(cleanedData);
  };

  return (
    <form 
      id="template-event-form" 
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
            placeholder="e.g., Full Company Rehearsal"
            required
            data-testid="input-template-event-title"
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

      <div>
        <Label htmlFor="dayOfWeek">Day of Week</Label>
        <Select
          value={formData.dayOfWeek.toString()}
          onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
        >
          <SelectTrigger data-testid="select-template-day">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((day) => (
              <SelectItem key={day.value} value={day.value.toString()}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            data-testid="input-template-start-time"
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
            data-testid="input-template-end-time"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: !!checked })}
          data-testid="checkbox-template-all-day"
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <div>
        <Label>Location</Label>
        <LocationSelect
          projectId={projectId}
          value={formData.location}
          onValueChange={(value) => setFormData({ ...formData, location: value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the event..."
          rows={2}
          data-testid="input-template-description"
        />
      </div>

      <div>
        <Label>Participants</Label>
        <div className="space-y-3 max-h-60 overflow-y-auto border rounded-md p-3">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-500">No contacts available. Add contacts to your project to assign participants.</p>
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

              const ungroupedContacts = contacts.filter(c => !c.contactGroup?.name);

              return (
                <>
                  {Object.entries(contactsByGroup).map(([groupName, groupContacts]) => {
                    const groupContactIds = groupContacts.map(c => c.id);
                    const allGroupSelected = groupContactIds.every(id => formData.participantIds.includes(id));
                    const someGroupSelected = groupContactIds.some(id => formData.participantIds.includes(id));

                    return (
                      <div key={groupName} className="space-y-2">
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
                                const newParticipants = [
                                  ...formData.participantIds,
                                  ...groupContactIds.filter(id => !formData.participantIds.includes(id))
                                ];
                                setFormData({
                                  ...formData,
                                  participantIds: newParticipants,
                                });
                              } else {
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
                  })}

                  {ungroupedContacts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 font-medium text-gray-700 border-b border-gray-200 pb-1">
                        <Label className="text-sm font-semibold">UNGROUPED</Label>
                      </div>
                      <div className="space-y-1 ml-6">
                        {ungroupedContacts.map(contact => (
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
                  )}
                </>
              );
            })()
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={2}
          data-testid="input-template-notes"
        />
      </div>

      {showButtons && (
        <div className="flex justify-end space-x-2 pb-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" data-testid="button-template-event-submit">
            Create Event
          </Button>
        </div>
      )}
    </form>
  );
}
