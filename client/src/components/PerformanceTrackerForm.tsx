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
import { Calendar, Clock, Users, DollarSign, FileText } from "lucide-react";

const performanceFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  audienceCount: z.coerce.number().min(0).optional(),
  actualDuration: z.coerce.number().min(0).optional(),
  revenue: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  weatherConditions: z.string().optional(),
  technicalIssues: z.string().optional(),
  castAbsences: z.string().optional(),
  understudyUsage: z.string().optional(),
  merchandiseSales: z.coerce.number().min(0).optional(),
  concessionSales: z.coerce.number().min(0).optional(),
  crewNotes: z.string().optional()
});

type PerformanceFormData = z.infer<typeof performanceFormSchema>;

interface PerformanceTrackerFormProps {
  projectId: number;
  performance?: any;
  onClose: () => void;
}

export function PerformanceTrackerForm({ projectId, performance, onClose }: PerformanceTrackerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("basic");

  const form = useForm<PerformanceFormData>({
    resolver: zodResolver(performanceFormSchema),
    defaultValues: {
      date: performance?.date ? new Date(performance.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: performance?.startTime || "",
      endTime: performance?.endTime || "",
      status: performance?.status || "scheduled",
      audienceCount: performance?.audienceCount || 0,
      actualDuration: performance?.actualDuration || 0,
      revenue: performance?.revenue || 0,
      notes: performance?.notes || "",
      weatherConditions: performance?.weatherConditions || "",
      technicalIssues: performance?.technicalIssues || "",
      castAbsences: performance?.castAbsences || "",
      understudyUsage: performance?.understudyUsage || "",
      merchandiseSales: performance?.merchandiseSales || 0,
      concessionSales: performance?.concessionSales || 0,
      crewNotes: performance?.crewNotes || ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: PerformanceFormData) => {
      if (performance) {
        return apiRequest(`/api/projects/${projectId}/performance-tracker/${performance.id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        return apiRequest(`/api/projects/${projectId}/performance-tracker`, {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'performance-tracker'] });
      toast({
        title: "Success",
        description: performance ? "Performance updated successfully" : "Performance added successfully"
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save performance data",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: PerformanceFormData) => {
    mutation.mutate(data);
  };

  const sections = [
    {
      id: "basic",
      title: "Basic Information",
      icon: Calendar,
      fields: ["date", "startTime", "endTime", "status"]
    },
    {
      id: "audience",
      title: "Audience & Revenue",
      icon: Users,
      fields: ["audienceCount", "revenue", "merchandiseSales", "concessionSales"]
    },
    {
      id: "production",
      title: "Production Notes",
      icon: FileText,
      fields: ["actualDuration", "weatherConditions", "technicalIssues", "castAbsences", "understudyUsage", "crewNotes"]
    },
    {
      id: "notes",
      title: "Additional Notes",
      icon: FileText,
      fields: ["notes"]
    }
  ];

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {performance ? "Edit Performance" : "Add Performance"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Section Navigation */}
          <div className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const hasErrors = section.fields.some(field => form.formState.errors[field as keyof PerformanceFormData]);
              
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
                      </>
                    )}

                    {/* Audience & Revenue */}
                    {activeSection === "audience" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="audienceCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Audience Count</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="revenue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box Office Revenue ($)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="merchandiseSales"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Merchandise Sales ($)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="concessionSales"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Concession Sales ($)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Production Notes */}
                    {activeSection === "production" && (
                      <>
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
                        <FormField
                          control={form.control}
                          name="weatherConditions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weather Conditions</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Clear, Rainy, Windy" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="technicalIssues"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Technical Issues</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Note any technical problems..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="castAbsences"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cast Absences</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Note any cast member absences..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="understudyUsage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Understudy Usage</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Note any understudy replacements..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crewNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Crew Notes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Additional crew observations..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Additional Notes */}
                    {activeSection === "notes" && (
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>General Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any additional notes about this performance..." 
                                rows={6}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : "Save Performance"}
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