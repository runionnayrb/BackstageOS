import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

// Simple schema - just basic fields
const simpleTechReportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  summary: z.string().optional(),
  scenicNotes: z.string().optional(),
  lightingNotes: z.string().optional(),
  audioNotes: z.string().optional(),
  videoNotes: z.string().optional(),
  costumesNotes: z.string().optional(),
  propsNotes: z.string().optional(),
  generalNotes: z.string().optional(),
});

type SimpleTechReportData = z.infer<typeof simpleTechReportSchema>;

interface SimpleTechReportParams {
  id: string;
  reportId?: string;
}

export default function SimpleTechReport() {
  const [, setLocation] = useLocation();
  const params = useParams<SimpleTechReportParams>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const projectId = parseInt(params.id!);
  const reportId = params.reportId ? parseInt(params.reportId) : null;
  const isEditMode = !!reportId;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: existingReport } = useQuery({
    queryKey: [`/api/projects/${projectId}/reports/${reportId}`],
    enabled: !!reportId,
  });

  const form = useForm<SimpleTechReportData>({
    resolver: zodResolver(simpleTechReportSchema),
    defaultValues: {
      title: "",
      date: new Date().toISOString().split('T')[0],
      summary: "",
      scenicNotes: "",
      lightingNotes: "",
      audioNotes: "",
      videoNotes: "",
      costumesNotes: "",
      propsNotes: "",
      generalNotes: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingReport && isEditMode) {
      const content = existingReport.content || {};
      form.setValue("title", existingReport.title || "");
      form.setValue("date", existingReport.date ? new Date(existingReport.date).toISOString().split('T')[0] : "");
      form.setValue("summary", content.summary || "");
      form.setValue("scenicNotes", content.scenicNotes || "");
      form.setValue("lightingNotes", content.lightingNotes || "");
      form.setValue("audioNotes", content.audioNotes || "");
      form.setValue("videoNotes", content.videoNotes || "");
      form.setValue("costumesNotes", content.costumesNotes || "");
      form.setValue("propsNotes", content.propsNotes || "");
      form.setValue("generalNotes", content.generalNotes || "");
    } else if (!isEditMode) {
      // Set default title for new reports
      const today = new Date().toLocaleDateString();
      form.setValue("title", `Tech Report - ${today}`);
    }
  }, [existingReport, isEditMode, form]);

  const mutation = useMutation({
    mutationFn: async (data: SimpleTechReportData) => {
      const reportData = {
        title: data.title,
        type: "tech",
        date: new Date(data.date),
        projectId: projectId,
        content: {
          summary: data.summary,
          scenicNotes: data.scenicNotes,
          lightingNotes: data.lightingNotes,
          audioNotes: data.audioNotes,
          videoNotes: data.videoNotes,
          costumesNotes: data.costumesNotes,
          propsNotes: data.propsNotes,
          generalNotes: data.generalNotes,
        },
      };

      if (isEditMode && reportId) {
        await apiRequest("PUT", `/api/projects/${projectId}/reports/${reportId}`, reportData);
        return reportId;
      } else {
        const response = await apiRequest("POST", `/api/projects/${projectId}/reports`, reportData);
        return response.id;
      }
    },
    onSuccess: (savedReportId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/reports`] });
      if (reportId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/reports/${reportId}`] });
      }
      
      toast({
        title: isEditMode ? "Report Updated" : "Report Created",
        description: isEditMode ? "Your tech report has been updated successfully!" : "Your tech report has been created successfully!",
      });
      
      // Navigate back to reports list
      setLocation(`/shows/${projectId}/reports/tech`);
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: isEditMode ? "Failed to update report. Please try again." : "Failed to create report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SimpleTechReportData) => {
    mutation.mutate(data);
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}/reports/tech`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tech Reports
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{isEditMode ? "Edit" : "New"} Tech Report</h1>
              <p className="text-muted-foreground">{(project as any)?.name}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tech Report Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Report Title</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Enter report title..."
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    {...form.register("date")}
                  />
                  {form.formState.errors.date && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.date.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  {...form.register("summary")}
                  placeholder="Brief summary of today's tech session..."
                  rows={3}
                />
              </div>

              {/* Department Notes */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Department Notes</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="scenicNotes">Scenic</Label>
                    <Textarea
                      id="scenicNotes"
                      {...form.register("scenicNotes")}
                      placeholder="Scenic department notes..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lightingNotes">Lighting</Label>
                    <Textarea
                      id="lightingNotes"
                      {...form.register("lightingNotes")}
                      placeholder="Lighting department notes..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="audioNotes">Audio</Label>
                    <Textarea
                      id="audioNotes"
                      {...form.register("audioNotes")}
                      placeholder="Audio department notes..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="videoNotes">Video</Label>
                    <Textarea
                      id="videoNotes"
                      {...form.register("videoNotes")}
                      placeholder="Video department notes..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="costumesNotes">Costumes</Label>
                    <Textarea
                      id="costumesNotes"
                      {...form.register("costumesNotes")}
                      placeholder="Costumes department notes..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="propsNotes">Props</Label>
                    <Textarea
                      id="propsNotes"
                      {...form.register("propsNotes")}
                      placeholder="Props department notes..."
                      rows={4}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="generalNotes">General Notes</Label>
                  <Textarea
                    id="generalNotes"
                    {...form.register("generalNotes")}
                    placeholder="General tech notes and issues..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/shows/${projectId}/reports/tech`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {mutation.isPending ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Report" : "Create Report")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}