import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit, Trash2, Calendar, MapPin } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSeasonSchema, insertVenueSchema, type Season, type Venue } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


const SeasonFormSchema = insertSeasonSchema.omit({ userId: true });
const VenueFormSchema = insertVenueSchema.omit({ userId: true });

type SeasonFormData = z.infer<typeof SeasonFormSchema>;
type VenueFormData = z.infer<typeof VenueFormSchema>;

interface SeasonDialogProps {
  season?: Season;
  onClose: () => void;
}

function SeasonDialog({ season, onClose }: SeasonDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<SeasonFormData>({
    resolver: zodResolver(SeasonFormSchema),
    defaultValues: {
      name: season?.name || "",
      startDate: season?.startDate || null,
      endDate: season?.endDate || null,
      isActive: season?.isActive ?? true,
    },
  });

  const createSeasonMutation = useMutation({
    mutationFn: (data: SeasonFormData) => apiRequest("POST", "/api/seasons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      toast({ title: "Season created successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create season", variant: "destructive" });
    },
  });

  const updateSeasonMutation = useMutation({
    mutationFn: (data: SeasonFormData) => apiRequest("PUT", `/api/seasons/${season?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      toast({ title: "Season updated successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update season", variant: "destructive" });
    },
  });

  const onSubmit = (data: SeasonFormData) => {
    if (season) {
      updateSeasonMutation.mutate(data);
    } else {
      createSeasonMutation.mutate(data);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{season ? "Edit Season" : "Add Season"}</DialogTitle>
        <DialogDescription>
          {season ? "Update season details" : "Create a new season for organizing your shows"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Season Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 2025-2026 Season" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createSeasonMutation.isPending || updateSeasonMutation.isPending}
            >
              {season ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

interface VenueDialogProps {
  venue?: Venue;
  onClose: () => void;
}

function VenueDialog({ venue, onClose }: VenueDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<VenueFormData>({
    resolver: zodResolver(VenueFormSchema),
    defaultValues: {
      name: venue?.name || "",
      address: venue?.address || "",
      capacity: venue?.capacity || null,
      notes: venue?.notes || "",
      isActive: venue?.isActive ?? true,
    },
  });

  const createVenueMutation = useMutation({
    mutationFn: (data: VenueFormData) => apiRequest("POST", "/api/venues", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      toast({ title: "Venue created successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create venue", variant: "destructive" });
    },
  });

  const updateVenueMutation = useMutation({
    mutationFn: (data: VenueFormData) => apiRequest("PUT", `/api/venues/${venue?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      toast({ title: "Venue updated successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update venue", variant: "destructive" });
    },
  });

  const onSubmit = (data: VenueFormData) => {
    if (venue) {
      updateVenueMutation.mutate(data);
    } else {
      createVenueMutation.mutate(data);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{venue ? "Edit Venue" : "Add Venue"}</DialogTitle>
        <DialogDescription>
          {venue ? "Update venue details" : "Create a new venue for your shows"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Lincoln Center Theater" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Full venue address..." 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 1200" 
                    {...field} 
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional venue information..." 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createVenueMutation.isPending || updateVenueMutation.isPending}
            >
              {venue ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

export default function Settings() {
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | undefined>();
  const [editingVenue, setEditingVenue] = useState<Venue | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: seasons = [], isLoading: seasonsLoading } = useQuery<Season[]>({
    queryKey: ["/api/seasons"],
  });

  const { data: venues = [], isLoading: venuesLoading } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/seasons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      toast({ title: "Season deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete season", variant: "destructive" });
    },
  });

  const deleteVenueMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/venues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      toast({ title: "Venue deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete venue", variant: "destructive" });
    },
  });

  const handleEditSeason = (season: Season) => {
    setEditingSeason(season);
    setSeasonDialogOpen(true);
  };

  const handleEditVenue = (venue: Venue) => {
    setEditingVenue(venue);
    setVenueDialogOpen(true);
  };

  const handleCloseSeasonDialog = () => {
    setSeasonDialogOpen(false);
    setEditingSeason(undefined);
  };

  const handleCloseVenueDialog = () => {
    setVenueDialogOpen(false);
    setEditingVenue(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Seasons */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>
                  Seasons
                </CardTitle>
                <CardDescription>
                  Organize your shows by theater season
                </CardDescription>
              </div>
              <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Season
                  </Button>
                </DialogTrigger>
                <SeasonDialog season={editingSeason} onClose={handleCloseSeasonDialog} />
              </Dialog>
            </CardHeader>
            <CardContent>
              {seasonsLoading ? (
                <div className="text-sm text-gray-500">Loading seasons...</div>
              ) : seasons.length === 0 ? (
                <div className="text-sm text-gray-500">No seasons created yet</div>
              ) : (
                <div className="space-y-2">
                  {seasons.map((season) => (
                    <div
                      key={season.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <div className="font-medium">{season.name}</div>
                        {season.startDate && season.endDate && (
                          <div className="text-sm text-gray-500">
                            {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSeason(season)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSeasonMutation.mutate(season.id)}
                          disabled={deleteSeasonMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Venues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>
                  Venues
                </CardTitle>
                <CardDescription>
                  Manage your theater venues and spaces
                </CardDescription>
              </div>
              <Dialog open={venueDialogOpen} onOpenChange={setVenueDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Venue
                  </Button>
                </DialogTrigger>
                <VenueDialog venue={editingVenue} onClose={handleCloseVenueDialog} />
              </Dialog>
            </CardHeader>
            <CardContent>
              {venuesLoading ? (
                <div className="text-sm text-gray-500">Loading venues...</div>
              ) : venues.length === 0 ? (
                <div className="text-sm text-gray-500">No venues created yet</div>
              ) : (
                <div className="space-y-2">
                  {venues.map((venue) => (
                    <div
                      key={venue.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <div className="font-medium">{venue.name}</div>
                        {venue.address && (
                          <div className="text-sm text-gray-500">{venue.address}</div>
                        )}
                        {venue.capacity && (
                          <div className="text-sm text-gray-500">Capacity: {venue.capacity}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVenue(venue)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteVenueMutation.mutate(venue.id)}
                          disabled={deleteVenueMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}