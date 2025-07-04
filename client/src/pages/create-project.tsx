import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  venue: z.string().optional(),
  prepStartDate: z.string().optional(),
  firstRehearsalDate: z.string().optional(),
  designerRunDate: z.string().optional(),
  firstTechDate: z.string().optional(),
  firstPreviewDate: z.string().optional(),
  openingNight: z.string().optional(),
  closingDate: z.string().optional(),
  season: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function CreateProject() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isFullTime = (user as any)?.profileType === "fulltime";
  const projectSingle = "Show";

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      venue: "",
      prepStartDate: "",
      firstRehearsalDate: "",
      designerRunDate: "",
      firstTechDate: "",
      firstPreviewDate: "",
      openingNight: "",
      closingDate: "",
      season: "",
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
      await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: `${projectSingle} created successfully!`,
      });
      setLocation("/projects");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create ${projectSingle.toLowerCase()}. Please try again.`,
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
                  <Input
                    id="venue"
                    placeholder="e.g., Lincoln Center Theater"
                    {...form.register("venue")}
                  />
                </div>
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

              {/* Full-Time Specific Fields */}
              {isFullTime && (
                <div>
                  <Label htmlFor="season">Season</Label>
                  <Select onValueChange={(value) => form.setValue("season", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-spring">2024 Spring Season</SelectItem>
                      <SelectItem value="2024-summer">2024 Summer Season</SelectItem>
                      <SelectItem value="2024-fall">2024 Fall Season</SelectItem>
                      <SelectItem value="2025-winter">2025 Winter Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/projects")}
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
