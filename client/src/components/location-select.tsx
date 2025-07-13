import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MapPin } from "lucide-react";
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
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface LocationSelectProps {
  projectId: number;
  value?: string;
  onValueChange: (value: string) => void;
  eventDate?: string; // ISO date string
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
}

export default function LocationSelect({ projectId, value, onValueChange, eventDate, startTime, endTime }: LocationSelectProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationDescription, setNewLocationDescription] = useState("");
  const [newLocationCapacity, setNewLocationCapacity] = useState("");
  const [newLocationNotes, setNewLocationNotes] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery<EventLocation[]>({
    queryKey: [`/api/projects/${projectId}/event-locations`],
  });

  // Debug logging
  console.log('LocationSelect Debug:', { 
    locations, 
    isLoading, 
    locationsLength: locations.length,
    firstLocation: locations[0] 
  });

  // Fetch location availability if we have date and time info
  const { data: locationAvailability = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/location-availability`],
    enabled: !!eventDate && !!startTime && !!endTime,
  });

  // Function to check if a location is unavailable at the specified time
  const isLocationUnavailable = (locationId: number): boolean => {
    if (!eventDate || !startTime || !endTime) return false;

    // Convert time to minutes for comparison
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const eventStartMinutes = timeToMinutes(startTime);
    const eventEndMinutes = timeToMinutes(endTime);

    // Check if any availability blocks for this location and date conflict
    return locationAvailability.some((avail: any) => {
      if (avail.locationId !== locationId) return false;
      if (avail.date !== eventDate) return false;
      if (avail.availabilityType !== 'unavailable') return false;

      const availStartMinutes = timeToMinutes(avail.startTime);
      const availEndMinutes = timeToMinutes(avail.endTime);

      // Check for time overlap
      return eventStartMinutes < availEndMinutes && eventEndMinutes > availStartMinutes;
    });
  };

  const createLocationMutation = useMutation({
    mutationFn: async (locationData: {
      name: string;
      address?: string;
      description?: string;
      capacity?: number;
      notes?: string;
    }) => {
      const response = await fetch(`/api/projects/${projectId}/event-locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create location');
      }
      
      return response.json();
    },
    onSuccess: (newLocation: EventLocation) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/event-locations`] });
      onValueChange(newLocation.name);
      setIsCreateOpen(false);
      setNewLocationName("");
      setNewLocationAddress("");
      setNewLocationDescription("");
      setNewLocationCapacity("");
      setNewLocationNotes("");
      toast({
        title: "Location created",
        description: `${newLocation.name} has been added to your locations.`,
      });
    },
    onError: (error: any) => {
      console.error("Error creating location:", error);
      toast({
        title: "Error",
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
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value || ""} onValueChange={onValueChange} disabled={isLoading}>
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
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
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
      </div>
      
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