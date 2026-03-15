import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Season, Venue } from "@shared/schema";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  director: z.string().optional(),
  description: z.string().optional(),
  venue: z.string().optional(),
  venueId: z.string().optional(),
  prepStartDate: z.string().optional(),
  firstRehearsalDate: z.string().optional(),
  designerRunDate: z.string().optional(),
  firstTechDate: z.string().optional(),
  firstPreviewDate: z.string().optional(),
  openingNight: z.string().optional(),
  closingDate: z.string().optional(),
  season: z.string().optional(),
  seasonId: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function CreateProject() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has seasons enabled in their feature preferences or legacy profileType
  const userFeatures = (user as any)?.defaultFeaturePreferences as Record<string, boolean> | undefined;
  const isLegacyFullTime = (user as any)?.profileType === "fulltime";
  const hasSeasons = userFeatures?.seasons ?? isLegacyFullTime;
  const projectSingle = "Show";

  // Fetch seasons and venues for users with seasons enabled
  const { data: seasons = [] } = useQuery<Season[]>({
    queryKey: ["/api/seasons"],
    enabled: hasSeasons,
  });

  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
    enabled: hasSeasons,
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      director: "",
      description: "",
      venue: "",
      venueId: "",
      prepStartDate: "",
      firstRehearsalDate: "",
      designerRunDate: "",
      firstTechDate: "",
      firstPreviewDate: "",
      openingNight: "",
      closingDate: "",
      season: "",
      seasonId: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const projectData = {
        ...data,
        prepStartDate: data.prepStartDate ? new Date(data.prepStartDate) : null,
        firstRehearsalDate: data.firstRehearsalDate ? new Date(data.firstRehearsalDate) : null,
        designerRunDate: data.designerRunDate ? new Date(data.designerRunDate) : null,
        firstTechDate: data.firstTechDate ? new Date(data.firstTechDate) : null,
        firstPreviewDate: data.firstPreviewDate ? new Date(data.firstPreviewDate) : null,
        openingNight: data.openingNight ? new Date(data.openingNight) : null,
        closingDate: data.closingDate ? new Date(data.closingDate) : null,
      };
      const result = await apiRequest("POST", "/api/projects", projectData);
      return result;
    },
    onSuccess: (project: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: `${projectSingle} created successfully!`,
      });
      // Redirect to onboarding wizard for new shows
      setLocation(`/shows/${project.id}/onboarding`);
    },
    onError: (error: any) => {
      const errorData = error?.response || error;
      const message = errorData?.betaLimitReached 
        ? "Beta users are limited to 1 active show. Please archive your current show to create a new one."
        : `Failed to create ${projectSingle.toLowerCase()}. Please try again.`;
      toast({
        title: errorData?.betaLimitReached ? "Show Limit Reached" : "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New {projectSingle}</h2>
          <p className="text-gray-600">Set up a new production {projectSingle.toLowerCase()}</p>
        </div>

        <Card>
          <CardContent className="p-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">{projectSingle} Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Hamlet, Spring Awakening"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="venue">Venue/Company</Label>
                  {hasSeasons ? (
                    <Select onValueChange={(value) => {
                      const selectedVenue = venues.find(v => v.id.toString() === value);
                      form.setValue("venueId", value);
                      form.setValue("venue", selectedVenue?.name || "");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                      <SelectContent>
                        {venues.map((venue) => (
                          <SelectItem key={venue.id} value={venue.id.toString()}>
                            {venue.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="venue"
                      placeholder="e.g., Lincoln Center Theater"
                      {...form.register("venue")}
                    />
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="director">Director</Label>
                <Input
                  id="director"
                  placeholder="e.g., Jane Smith"
                  {...form.register("director")}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Brief description of the production..."
                  {...form.register("description")}
                />
              </div>

              {/* Important Dates Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Dates</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="prepStartDate">Prep</Label>
                    <Input
                      id="prepStartDate"
                      type="date"
                      {...form.register("prepStartDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstRehearsalDate">First Rehearsal</Label>
                    <Input
                      id="firstRehearsalDate"
                      type="date"
                      {...form.register("firstRehearsalDate")}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <Label htmlFor="designerRunDate">Designer Run</Label>
                    <Input
                      id="designerRunDate"
                      type="date"
                      {...form.register("designerRunDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstTechDate">First Tech</Label>
                    <Input
                      id="firstTechDate"
                      type="date"
                      {...form.register("firstTechDate")}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <Label htmlFor="firstPreviewDate">First Preview</Label>
                    <Input
                      id="firstPreviewDate"
                      type="date"
                      {...form.register("firstPreviewDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="openingNight">Opening</Label>
                    <Input
                      id="openingNight"
                      type="date"
                      {...form.register("openingNight")}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <Label htmlFor="closingDate">Closing</Label>
                    <Input
                      id="closingDate"
                      type="date"
                      {...form.register("closingDate")}
                    />
                  </div>
                </div>
              </div>

              {/* Season field - only shown when seasons feature is enabled */}
              {hasSeasons && (
                <div>
                  <Label htmlFor="season">Season</Label>
                  <Select onValueChange={(value) => {
                    const selectedSeason = seasons.find(s => s.id.toString() === value);
                    form.setValue("seasonId", value);
                    form.setValue("season", selectedSeason?.name || "");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id.toString()}>
                          {season.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Creating..." : `Create ${projectSingle}`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
