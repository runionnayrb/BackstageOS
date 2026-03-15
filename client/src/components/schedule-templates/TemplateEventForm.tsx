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
    isProductionLevel?: boolean;
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
    isProductionLevel: initialValues?.isProductionLevel ?? false,
    participantIds: initialValues?.participantIds || [] as number[],
  });

  // Group contacts by contact group ONLY (matching schedule-filter pattern)
  const contactsByGroup = contacts.reduce((acc, contact) => {
    const groupName = contact.contactGroup?.name;
    if (groupName) {
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(contact);
    }
    return acc;
  }, {} as Record<string, Contact[]>);

  // Sort groups with Cast first
  const sortedGroups = Object.keys(contactsByGroup).sort((a, b) => {
    if (a === 'Cast' && b !== 'Cast') return -1;
    if (a !== 'Cast' && b === 'Cast') return 1;
    return a.localeCompare(b);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Send both participantIds and participants to handle backend inconsistency
    const cleanedData = {
      ...formData,
      location: formData.location?.trim() || null,
      description: formData.description?.trim() || null,
      notes: formData.notes?.trim() || null,
      participantIds: formData.participantIds, // For create route
      participants: formData.participantIds, // For update route
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
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isAllDay"
            checked={formData.isAllDay}
            onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: !!checked })}
            data-testid="checkbox-template-all-day"
          />
          <Label htmlFor="isAllDay">All Day Event</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isProductionLevel"
            checked={formData.isProductionLevel}
            onCheckedChange={(checked) => setFormData({ ...formData, isProductionLevel: !!checked })}
            data-testid="checkbox-production-level"
          />
          <Label htmlFor="isProductionLevel" className="flex items-center space-x-2">
            <span>Add to Production Calendar</span>
            <span className="text-xs text-muted-foreground">(When template is applied to a week)</span>
          </Label>
        </div>
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
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notes to display on the schedule"
          rows={2}
          data-testid="input-template-notes"
        />
      </div>
      <div>
        <Label>People</Label>
        <div className="max-h-60 overflow-y-auto">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-500 p-3">No contacts available. Add contacts to your project to assign participants.</p>
          ) : (
            <>
              <div className="px-3 py-2 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">FULL COMPANY</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100 flex items-center justify-center"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const allIds = contacts.filter(c => c.contactGroup?.name).map(c => c.id);
                        setFormData(prev => ({ ...prev, participantIds: allIds }));
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100 flex items-center justify-center"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, participantIds: [] }));
                      }}
                    >
                      None
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2">
                {sortedGroups.map((groupName) => {
                  const groupContacts = contactsByGroup[groupName];

                  return (
                    <div key={groupName} className="mb-4">
                      <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-gray-600 border-b">
                        <span>{groupName.replace(/_/g, ' ').toUpperCase()}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100 flex items-center justify-center"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const groupIds = groupContacts.map(c => c.id);
                              setFormData(prev => ({
                                ...prev,
                                participantIds: [...new Set([...prev.participantIds, ...groupIds])],
                              }));
                            }}
                          >
                            All
                          </button>
                          <button
                            type="button"
                            className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100 flex items-center justify-center"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const groupIds = groupContacts.map(c => c.id);
                              setFormData(prev => ({
                                ...prev,
                                participantIds: prev.participantIds.filter(id => !groupIds.includes(id)),
                              }));
                            }}
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1 mt-2">
                        {groupContacts.map(contact => (
                          <label
                            key={contact.id}
                            className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.participantIds.includes(contact.id)}
                              onChange={(e) => {
                                const contactId = contact.id;
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    participantIds: [...prev.participantIds, contactId],
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    participantIds: prev.participantIds.filter(id => id !== contactId),
                                  }));
                                }
                              }}
                              className="h-4 w-4"
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
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
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
