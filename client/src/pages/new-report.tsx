import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";

const reportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.record(z.any()),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface NewReportParams {
  id: string;
  type: string;
}

export default function NewReport() {
  const [, setLocation] = useLocation();
  const params = useParams<NewReportParams>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const projectId = parseInt(params.id!);
  const reportType = params.type!;

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: "",
      content: {},
    },
  });

  // Set default title based on report type
  useEffect(() => {
    if (reportType) {
      const typeNames = {
        rehearsal: "Rehearsal Report",
        tech: "Tech Report", 
        performance: "Performance Report",
        meeting: "Meeting Report",
        daily: "Daily Call Sheet"
      };
      const typeName = typeNames[reportType as keyof typeof typeNames] || "Report";
      const today = new Date().toLocaleDateString();
      form.setValue("title", `${typeName} - ${today}`);
    }
  }, [reportType, form]);

  const mutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      await apiRequest("POST", `/api/projects/${projectId}/reports`, {
        ...data,
        projectId: projectId,
        type: reportType,
        date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/reports`] });
      toast({
        title: "Report Created",
        description: "Your report has been created successfully!",
      });
      setLocation(`/shows/${projectId}/reports/${reportType}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    mutation.mutate(data);
  };

  const renderReportFields = () => {
    switch (reportType) {
      case "rehearsal":
        return (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  onChange={(e) => form.setValue("content.startTime", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  onChange={(e) => form.setValue("content.endTime", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="scenes">Scenes Rehearsed</Label>
              <Textarea
                id="scenes"
                placeholder="List scenes worked on today..."
                onChange={(e) => form.setValue("content.scenes", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Director's Notes</Label>
              <Textarea
                id="notes"
                placeholder="Director's notes and feedback..."
                onChange={(e) => form.setValue("content.notes", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nextSession">Next Session Goals</Label>
              <Textarea
                id="nextSession"
                placeholder="Goals for the next rehearsal..."
                onChange={(e) => form.setValue("content.nextSession", e.target.value)}
              />
            </div>
          </>
        );
      
      case "tech":
        return (
          <>
            <div>
              <Label htmlFor="lighting">Lighting Notes</Label>
              <Textarea
                id="lighting"
                placeholder="Lighting setup and changes..."
                onChange={(e) => form.setValue("content.lighting", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sound">Sound Notes</Label>
              <Textarea
                id="sound"
                placeholder="Sound equipment and cues..."
                onChange={(e) => form.setValue("content.sound", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="props">Props and Set</Label>
              <Textarea
                id="props"
                placeholder="Props and set piece status..."
                onChange={(e) => form.setValue("content.props", e.target.value)}
              />
            </div>
          </>
        );

      case "performance":
        return (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="attendance">Attendance</Label>
                <Input
                  id="attendance"
                  placeholder="Number of audience members"
                  onChange={(e) => form.setValue("content.attendance", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="curtain">Curtain Time</Label>
                <Input
                  id="curtain"
                  type="time"
                  onChange={(e) => form.setValue("content.curtain", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="issues">Issues/Notes</Label>
              <Textarea
                id="issues"
                placeholder="Any issues during the performance..."
                onChange={(e) => form.setValue("content.issues", e.target.value)}
              />
            </div>
          </>
        );

      default:
        return (
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              rows={8}
              placeholder="Enter your report content here..."
              onChange={(e) => form.setValue("content.body", e.target.value)}
            />
          </div>
        );
    }
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

  const reportTypeNames = {
    rehearsal: "Rehearsal Report",
    tech: "Tech Report",
    performance: "Performance Report", 
    meeting: "Meeting Report",
    daily: "Daily Call Sheet"
  };

  const reportTypeName = reportTypeNames[reportType as keyof typeof reportTypeNames] || "Report";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">New {reportTypeName}</h1>
            <p className="text-muted-foreground">{(project as any)?.name}</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          {renderReportFields()}

          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Creating..." : "Create Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}