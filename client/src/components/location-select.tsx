import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EventLocation {
  id: number;
  projectId: number;
  name: string;
  address?: string;
  description?: string;
  capacity?: number;
  notes?: string;
}

interface LocationSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  projectId: number;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export default function LocationSelect({ 
  value, 
  onValueChange, 
  projectId, 
  date, 
  startTime, 
  endTime 
}: LocationSelectProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationDescription, setNewLocationDescription] = useState("");
  const [newLocationCapacity, setNewLocationCapacity] = useState("");
  const [newLocationNotes, setNewLocationNotes] = useState("");

  // Fetch locations for this project
  const { data: locations = [], isLoading } = useQuery<EventLocation[]>({
    queryKey: [`/api/projects/${projectId}/event-locations`],
  });

  // Fetch location availability if we have date and time info
  const { data: locationAvailability = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/location-availability`],
    enabled: !!(date && startTime && endTime),
  });

  const isLocationUnavailable = (locationId: number) => {
    if (!date || !startTime || !endTime) return false;
    return locationAvailability.some((avail: any) => 
      avail.locationId === locationId && 
      avail.date === date &&
      // Check if time ranges overlap
      ((startTime >= avail.startTime && startTime < avail.endTime) ||
       (endTime > avail.startTime && endTime <= avail.endTime) ||
       (startTime <= avail.startTime && endTime >= avail.endTime))
    );
  };

  const createLocationMutation = useMutation({
    mutationFn: async (locationData: {
      name: string;
      address?: string;
      description?: string;
      capacity?: number;
      notes?: string;
    }) => {
      return apiRequest('POST', `/api/projects/${projectId}/event-locations`, locationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/event-locations`] });
      setIsCreateOpen(false);
      setNewLocationName("");
      setNewLocationAddress("");
      setNewLocationDescription("");
      setNewLocationCapacity("");
      setNewLocationNotes("");
      toast({
        title: "Location created",
        description: "The new location has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error creating location",
        description: "Failed to create location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateLocation = () => {
    if (!newLocationName.trim()) {
      toast({
        title: "Location name required",
        description: "Please enter a name for the location.",
        variant: "destructive",
      });
      return;
    }

    createLocationMutation.mutate({
      name: newLocationName.trim(),
      address: newLocationAddress.trim() || undefined,
      description: newLocationDescription.trim() || undefined,
      capacity: newLocationCapacity ? parseInt(newLocationCapacity) : undefined,
      notes: newLocationNotes.trim() || undefined,
    });
  };

  const selectedLocation = locations.find((loc: EventLocation) => loc.name === value);

  return (
    <div className="space-y-2">
      <div>
        <Select 
          value={value || ""} 
          onValueChange={(newValue) => {
            if (newValue === "__new_location__") {
              setIsCreateOpen(true);
            } else {
              onValueChange(newValue);
            }
          }} 
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "Loading locations..." : "Select a location"} />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location: EventLocation) => {
              const unavailable = isLocationUnavailable(location.id);
              return (
                <SelectItem 
                  key={location.id} 
                  value={location.name}
                  disabled={unavailable}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    opacity: unavailable ? 0.5 : 1
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ 
                        color: '#000000', 
                        fontWeight: '500',
                        fontSize: '14px',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}>{location.name}</div>
                      {unavailable && (
                        <div style={{ 
                          color: '#ef4444', 
                          fontSize: '12px',
                          fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}>Space unavailable at this time</div>
                      )}
                      {location.address && !unavailable && (
                        <div style={{ 
                          color: '#666666', 
                          fontSize: '12px',
                          fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}>({location.address})</div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              );
            })}
            {locations.length === 0 && !isLoading && (
              <SelectItem value="no-locations" disabled>
                <div style={{ color: '#666666', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  No locations available
                </div>
              </SelectItem>
            )}
            <SelectItem value="__new_location__">
              <div className="flex items-center gap-2" style={{ 
                color: '#2563eb', 
                fontWeight: '500',
                fontSize: '14px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                <Plus className="h-4 w-4" />
                <span>New Location</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
        
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location-name">Location Name *</Label>
              <Input
                id="location-name"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g., Main Theater, Studio A, Rehearsal Room"
              />
            </div>
            
            <div>
              <Label htmlFor="location-address">Address</Label>
              <Input
                id="location-address"
                value={newLocationAddress}
                onChange={(e) => setNewLocationAddress(e.target.value)}
                placeholder="Street address or building name"
              />
            </div>
            
            <div>
              <Label htmlFor="location-description">Description</Label>
              <Input
                id="location-description"
                value={newLocationDescription}
                onChange={(e) => setNewLocationDescription(e.target.value)}
                placeholder="Brief description of the space"
              />
            </div>
            
            <div>
              <Label htmlFor="location-capacity">Capacity</Label>
              <Input
                id="location-capacity"
                type="number"
                value={newLocationCapacity}
                onChange={(e) => setNewLocationCapacity(e.target.value)}
                placeholder="Maximum number of people"
              />
            </div>
            
            <div>
              <Label htmlFor="location-notes">Notes</Label>
              <Textarea
                id="location-notes"
                value={newLocationNotes}
                onChange={(e) => setNewLocationNotes(e.target.value)}
                placeholder="Any additional notes about this location"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateLocation}
                disabled={createLocationMutation.isPending || !newLocationName.trim()}
              >
                {createLocationMutation.isPending ? "Creating..." : "Create Location"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {selectedLocation && (
        <div className="text-sm text-gray-600 space-y-1">
          {selectedLocation.address && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{selectedLocation.address}</span>
            </div>
          )}
          {selectedLocation.description && (
            <div>{selectedLocation.description}</div>
          )}
          {selectedLocation.capacity && (
            <div>Capacity: {selectedLocation.capacity} people</div>
          )}
        </div>
      )}
    </div>
  );
}