import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EventType {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  color: string;
  isDefault?: boolean;
}

interface EventTypeSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  projectId: number;
  eventTypes: EventType[];
}

export default function EventTypeSelect({ 
  value, 
  onValueChange, 
  projectId,
  eventTypes 
}: EventTypeSelectProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEventTypeName, setNewEventTypeName] = useState("");
  const [newEventTypeDescription, setNewEventTypeDescription] = useState("");
  const [newEventTypeColor, setNewEventTypeColor] = useState("#3b82f6");

  const createEventTypeMutation = useMutation({
    mutationFn: async (eventTypeData: {
      name: string;
      description?: string;
      color: string;
    }) => {
      return apiRequest('POST', `/api/projects/${projectId}/event-types`, eventTypeData);
    },
    onSuccess: (newEventType) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/event-types`] });
      setIsCreateOpen(false);
      setNewEventTypeName("");
      setNewEventTypeDescription("");
      setNewEventTypeColor("#3b82f6");
      
      // Automatically select the new event type
      const normalizedValue = newEventType.name.toLowerCase().replace(/\s+/g, '_');
      onValueChange(normalizedValue);
      
      toast({
        title: "Event type created",
        description: "The new event type has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error creating event type",
        description: "Failed to create event type. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateEventType = () => {
    if (!newEventTypeName.trim()) {
      toast({
        title: "Event type name required",
        description: "Please enter a name for the event type.",
        variant: "destructive",
      });
      return;
    }

    createEventTypeMutation.mutate({
      name: newEventTypeName.trim(),
      description: newEventTypeDescription.trim() || undefined,
      color: newEventTypeColor,
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <Select 
          value={value || ""} 
          onValueChange={(newValue) => {
            if (newValue === "__new_event_type__") {
              setIsCreateOpen(true);
            } else {
              onValueChange(newValue);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((eventType: EventType) => {
              const normalizedValue = eventType.name.toLowerCase().replace(/\s+/g, '_');
              return (
                <SelectItem 
                  key={eventType.id} 
                  value={normalizedValue}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px'
                  }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: eventType.color,
                        flexShrink: 0
                      }}
                    />
                    <div style={{ 
                      color: '#000000', 
                      fontWeight: '500',
                      fontSize: '14px',
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}>
                      {eventType.name}
                      {eventType.isDefault && (
                        <span style={{ 
                          marginLeft: '6px',
                          fontSize: '11px',
                          color: '#2563eb',
                          fontWeight: '600'
                        }}>
                          SYSTEM
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              );
            })}
            {eventTypes.length === 0 && (
              <SelectItem value="no-event-types" disabled>
                <div style={{ color: '#666666', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  No event types available
                </div>
              </SelectItem>
            )}
            <SelectItem value="__new_event_type__">
              <div className="flex items-center gap-2" style={{ 
                color: '#2563eb', 
                fontWeight: '500',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                <Plus className="h-4 w-4" />
                <span>New Event Type</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
        
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Event Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-type-name">Event Type Name *</Label>
              <Input
                id="event-type-name"
                value={newEventTypeName}
                onChange={(e) => setNewEventTypeName(e.target.value)}
                placeholder="e.g., Rehearsal, Meeting, Workshop"
              />
            </div>
            
            <div>
              <Label htmlFor="event-type-description">Description</Label>
              <Textarea
                id="event-type-description"
                value={newEventTypeDescription}
                onChange={(e) => setNewEventTypeDescription(e.target.value)}
                placeholder="Brief description of this event type"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="event-type-color">Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="event-type-color"
                  type="color"
                  value={newEventTypeColor}
                  onChange={(e) => setNewEventTypeColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={newEventTypeColor}
                  onChange={(e) => setNewEventTypeColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateEventType}
                disabled={createEventTypeMutation.isPending || !newEventTypeName.trim()}
              >
                {createEventTypeMutation.isPending ? "Creating..." : "Create Event Type"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}