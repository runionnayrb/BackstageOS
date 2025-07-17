import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, FileText, Target } from "lucide-react";

const rehearsalFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  rehearsalType: z.string().min(1, "Rehearsal type is required"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  attendeeCount: z.coerce.number().min(0).optional(),
  actualDuration: z.coerce.number().min(0).optional(),
  scenesWorked: z.string().optional(),
  objectivesCompleted: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  directorNotes: z.string().optional(),
  castNotes: z.string().optional(),
  techNotes: z.string().optional(),
  nextSessionGoals: z.string().optional(),
  equipmentUsed: z.string().optional(),
  safetyIncidents: z.string().optional()
});

type RehearsalFormData = z.infer<typeof rehearsalFormSchema>;

interface RehearsalTrackerFormProps {
  projectId: number;
  rehearsal?: any;
  onClose: () => void;
}

export function RehearsalTrackerForm({ projectId, rehearsal, onClose }: RehearsalTrackerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("basic");

  const form = useForm<RehearsalFormData>({
    resolver: zodResolver(rehearsalFormSchema),
    defaultValues: {
      date: rehearsal?.date ? new Date(rehearsal.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: rehearsal?.startTime || "",
      endTime: rehearsal?.endTime || "",
      rehearsalType: rehearsal?.rehearsalType || "",
      status: rehearsal?.status || "scheduled",
      attendeeCount: rehearsal?.attendeeCount || 0,
      actualDuration: rehearsal?.actualDuration || 0,
      scenesWorked: rehearsal?.scenesWorked || "",
      objectivesCompleted: rehearsal?.objectivesCompleted || "",
      notes: rehearsal?.notes || "",
      location: rehearsal?.location || "",
      directorNotes: rehearsal?.directorNotes || "",
      castNotes: rehearsal?.castNotes || "",
      techNotes: rehearsal?.techNotes || "",
      nextSessionGoals: rehearsal?.nextSessionGoals || "",
      equipmentUsed: rehearsal?.equipmentUsed || "",
      safetyIncidents: rehearsal?.safetyIncidents || ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: RehearsalFormData) => {
      if (rehearsal) {
        return apiRequest(`/api/projects/${projectId}/rehearsal-tracker/${rehearsal.id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        return apiRequest(`/api/projects/${projectId}/rehearsal-tracker`, {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'rehearsal-tracker'] });
      toast({
        title: "Success",
        description: rehearsal ? "Rehearsal updated successfully" : "Rehearsal added successfully"
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save rehearsal data",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: RehearsalFormData) => {
    mutation.mutate(data);
  };

  const sections = [
    {
      id: "basic",
      title: "Basic Information",
      icon: Calendar,
      fields: ["date", "startTime", "endTime", "rehearsalType", "status", "location"]
    },
    {
      id: "attendance",
      title: "Attendance & Duration",
      icon: Users,
      fields: ["attendeeCount", "actualDuration"]
    },
    {
      id: "content",
      title: "Rehearsal Content",
      icon: Target,
      fields: ["scenesWorked", "objectivesCompleted", "equipmentUsed"]
    },
    {
      id: "notes",
      title: "Notes & Feedback",
      icon: FileText,
      fields: ["notes", "directorNotes", "castNotes", "techNotes", "nextSessionGoals", "safetyIncidents"]
    }
  ];

  const currentSection = sections.find(s => s.id === activeSection);

  const rehearsalTypes = [
    "Table Read",
    "Blocking",
    "Working",
    "Run-Through",
    "Stumble-Through",
    "Dress Rehearsal",
    "Technical Rehearsal",
    "Cue-to-Cue",
    "Fight Call",
    "Dance Call",
    "Music Rehearsal",
    "Designer Run",
    "Photo Call",
    "Preview",
    "Other"
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rehearsal ? "Edit Rehearsal" : "Add Rehearsal"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Section Navigation */}
          <div className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const hasErrors = section.fields.some(field => form.formState.errors[field as keyof RehearsalFormData]);
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-card-foreground border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{section.title}</span>
                    {hasErrors && (
                      <Badge variant="destructive" className="ml-auto">
                        !
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Form Content */}
          <div className="md:col-span-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {currentSection && <currentSection.icon className="h-5 w-5" />}
                      {currentSection?.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic Information */}
                    {activeSection === "basic" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="rehearsalType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rehearsal Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select rehearsal type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {rehearsalTypes.map(type => (
                                      <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="Rehearsal location" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    {/* Attendance & Duration */}
                    {activeSection === "attendance" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="attendeeCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Attendee Count</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="actualDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Actual Duration (minutes)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Rehearsal Content */}
                    {activeSection === "content" && (
                      <>
                        <FormField
                          control={form.control}
                          name="scenesWorked"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scenes Worked</FormLabel>
                              <FormControl>
                                <Textarea placeholder="e.g., Act 1 Scene 1, Act 2 Scene 3" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="objectivesCompleted"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Objectives Completed</FormLabel>
                              <FormControl>
                                <Textarea placeholder="What goals were achieved in this rehearsal?" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="equipmentUsed"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Equipment Used</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Props, costumes, sets, technical equipment..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Notes & Feedback */}
                    {activeSection === "notes" && (
                      <>
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>General Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Overall rehearsal notes..." 
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="directorNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Director Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Director's feedback and notes..." 
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="castNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cast Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Cast performance and feedback..." 
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="techNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Technical Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Technical issues, equipment notes..." 
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="nextSessionGoals"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Next Session Goals</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="What to focus on next rehearsal..." 
                                  rows={3}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="safetyIncidents"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Safety Incidents</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Any safety concerns or incidents..." 
                                  rows={2}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : "Save Rehearsal"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}