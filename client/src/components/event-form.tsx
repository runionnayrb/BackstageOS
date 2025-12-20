import { useState } from 'react';
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
  contactGroup?: {
    id: number;
    name: string;
  };
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
    isProductionLevel: initialValues?.isProductionLevel ?? false,
    participantIds: initialValues?.participantIds || [] as number[],
    isFullCompany: (initialValues as any)?.isFullCompany ?? false,
    isFullCast: (initialValues as any)?.isFullCast ?? false,
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
    // Send both participantIds (for create) and participants (for update) to handle backend inconsistency
    const cleanedData = {
      ...formData,
      date: formData.startDate, // Use startDate as the primary date for API compatibility
      location: formData.location?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      participantIds: formData.participantIds, // For create route
      participants: formData.participantIds, // For update route
      isFullCompany: formData.isFullCompany, // Track Full Company selection
      isFullCast: formData.isFullCast, // Track Full Cast selection
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
                        setFormData(prev => ({ ...prev, participantIds: allIds, isFullCompany: true, isFullCast: false }));
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
                        setFormData(prev => ({ ...prev, participantIds: [], isFullCompany: false, isFullCast: false }));
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
                              // If selecting Cast group and ONLY Cast members, set isFullCast
                              const isCastGroup = groupName === 'Cast';
                              setFormData(prev => {
                                const newParticipantIds = [...new Set([...prev.participantIds, ...groupIds])];
                                // Check if this results in exactly the Cast group (for Full Cast detection)
                                const castMembers = contacts.filter(c => c.contactGroup?.name === 'Cast');
                                const castIds = castMembers.map(c => c.id);
                                const isExactlyFullCast = isCastGroup && 
                                  castIds.length > 0 &&
                                  castIds.every(id => newParticipantIds.includes(id)) &&
                                  newParticipantIds.every(id => castIds.includes(id));
                                return {
                                  ...prev,
                                  participantIds: newParticipantIds,
                                  isFullCast: isExactlyFullCast,
                                  isFullCompany: false, // Clear Full Company when selecting individual groups
                                };
                              });
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
                                isFullCompany: false,
                                isFullCast: false,
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
                                    isFullCompany: false, // Clear flags when selecting individual contacts
                                    isFullCast: false,
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    participantIds: prev.participantIds.filter(id => id !== contactId),
                                    isFullCompany: false,
                                    isFullCast: false,
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