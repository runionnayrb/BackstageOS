import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Download, Share, Trash2, Lock, Unlock, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReportNotesManager from "@/components/report-notes-manager";

const reportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  content: z.record(z.any()),
});

interface ReportViewerParams {
  id: string;
  type: string;
  reportId: string;
}

export default function ReportViewer() {
  const [, setLocation] = useLocation();
  const params = useParams<ReportViewerParams>();
  const projectId = parseInt(params.id!);
  const reportType = params.type!;
  const reportId = parseInt(params.reportId!);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: report } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/reports/${reportId}`],
  });

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: report?.title || "",
      date: report?.date ? new Date(report.date).toISOString().split('T')[0] : "",
      content: report?.content || {},
    },
  });

  // Update form when report data changes
  useEffect(() => {
    if (report) {
      form.reset({
        title: report.title || "",
        date: report.date ? new Date(report.date).toISOString().split('T')[0] : "",
        content: report.content || {},
      });
    }
  }, [report, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof reportSchema>) => {
      await apiRequest("PUT", `/api/projects/${projectId}/reports/${reportId}`, {
        ...data,
        date: new Date(data.date),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/reports/${reportId}`] });
      toast({
        title: "Report Updated",
        description: "Your report has been updated successfully!",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${projectId}/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/reports`] });
      toast({
        title: "Report Deleted",
        description: "The report has been deleted successfully.",
      });
      setLocation(`/shows/${projectId}/reports/${reportType}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: z.infer<typeof reportSchema>) => {
    updateMutation.mutate(data);
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // Cancel editing - reset form to original values
      form.reset({
        title: report.title || "",
        date: report.date ? new Date(report.date).toISOString().split('T')[0] : "",
        content: report.content || {},
      });
    }
    setIsEditing(!isEditing);
  };

  if (!project || !report) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const reportTypeNames: Record<string, string> = {
    rehearsal: "Rehearsal Report",
    tech: "Tech Report",
    performance: "Performance Report",
    meeting: "Meeting Report"
  };

  const reportTypeName = reportTypeNames[reportType] || "Report";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {reportTypeName}s
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
              <p className="text-gray-600">{project.name} - {new Date(report.date).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            
            {/* Lock/Unlock Toggle Button */}
            <Button 
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={handleToggleEdit}
            >
              {isEditing ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock to Edit
                </>
              )}
            </Button>

            {/* Save Button - only show when editing */}
            {isEditing && (
              <Button 
                variant="default"
                size="sm"
                onClick={form.handleSubmit(handleSave)}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isEditing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Report Document */}
        <Card className="min-h-[600px]">
          <CardContent className="p-8">
            {/* Print-style Document View */}
            <div className="bg-white min-h-[500px] shadow-lg border border-gray-200" style={{ 
              width: "8.5in", 
              margin: "0 auto",
              padding: "1in",
              fontFamily: "Arial, sans-serif"
            }}>
              {/* Header */}
              <div className="text-center mb-6 pb-4 border-b">
                <div className="text-lg font-semibold">
                  {report.title}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {project.name} - {new Date(report.date).toLocaleDateString()}
                </div>
              </div>

              {/* Report Content */}
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                {renderReportContent(report, isEditing, form)}
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Report</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{report?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteMutation.mutate();
                  setShowDeleteDialog(false);
                }}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function renderReportContent(report: any, isEditing: boolean, form: any) {
  const content = form.watch("content") || {};
  const projectId = report.projectId;
  const reportId = report.id;
  const reportType = report.type;

  // Get session focus options based on report type
  const getSessionFocusOptions = () => {
    switch (reportType) {
      case 'rehearsal':
        return ['blocking', 'choreography', 'music', 'character-work', 'run-through', 'full-rehearsal'];
      case 'performance':
        return ['matinee', 'evening', 'opening-night', 'closing-night', 'special-event', 'understudy'];
      case 'meeting':
        return ['production', 'design', 'tech', 'cast', 'crew', 'department-heads'];
      case 'tech':
      default:
        return ['lighting', 'sound', 'set-changes', 'costumes', 'props', 'full-technical'];
    }
  };

  return (
    <>
      {/* Summary */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">Summary</div>
        {isEditing ? (
          <Textarea
            rows={3}
            placeholder="Brief summary..."
            value={content.summary || ""}
            onChange={(e) => form.setValue("content.summary", e.target.value)}
            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap">{content.summary || "No summary provided."}</div>
        )}
      </div>

      {/* Session Information - Unified for all report types */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Session Focus</div>
          {isEditing ? (
            <Select value={content.sessionFocus || ""} onValueChange={(value) => form.setValue("content.sessionFocus", value)}>
              <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                <SelectValue placeholder="Select focus area" />
              </SelectTrigger>
              <SelectContent>
                {getSessionFocusOptions().map(option => (
                  <SelectItem key={option} value={option}>
                    {option.replace(/-/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm capitalize">{content.sessionFocus ? content.sessionFocus.replace(/-/g, ' ') : "Not specified"}</div>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Completion Status</div>
          {isEditing ? (
            <Select value={content.completionStatus || ""} onValueChange={(value) => form.setValue("content.completionStatus", value)}>
              <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on-schedule">On Schedule</SelectItem>
                <SelectItem value="behind-schedule">Behind Schedule</SelectItem>
                <SelectItem value="ahead-schedule">Ahead of Schedule</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm capitalize">{content.completionStatus ? content.completionStatus.replace(/-/g, ' ') : "Not specified"}</div>
          )}
        </div>
      </div>

      {/* Session Overview - Unified for all report types */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">Session Overview</div>
        {isEditing ? (
          <Textarea
            rows={3}
            placeholder="Brief overview of what was accomplished..."
            value={content.sessionOverview || ""}
            onChange={(e) => form.setValue("content.sessionOverview", e.target.value)}
            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap">{content.sessionOverview || "No overview provided."}</div>
        )}
      </div>

      {/* Department Notes - Unified for all report types with ReportNotesManager */}
      <div className="mb-6">
        <div className="text-lg font-semibold text-gray-800 mb-4">Department Notes</div>
        
        <div className="space-y-6">
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Scenic</div>
            <ReportNotesManager 
              reportId={reportId} 
              projectId={projectId}
              reportType={reportType}
              department="scenic"
              isEditing={isEditing}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Lighting</div>
            <ReportNotesManager 
              reportId={reportId} 
              projectId={projectId}
              reportType={reportType}
              department="lighting"
              isEditing={isEditing}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Audio</div>
            <ReportNotesManager 
              reportId={reportId} 
              projectId={projectId}
              reportType={reportType}
              department="audio"
              isEditing={isEditing}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Video</div>
            <ReportNotesManager 
              reportId={reportId} 
              projectId={projectId}
              reportType={reportType}
              department="video"
              isEditing={isEditing}
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Props</div>
            <ReportNotesManager 
              reportId={reportId} 
              projectId={projectId}
              reportType={reportType}
              department="props"
              isEditing={isEditing}
            />
          </div>
        </div>
      </div>

      {/* Outstanding Issues - Unified for all report types */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">Outstanding Issues</div>
        {isEditing ? (
          <Textarea
            rows={3}
            placeholder="Issues that need to be resolved..."
            value={content.outstandingIssues || ""}
            onChange={(e) => form.setValue("content.outstandingIssues", e.target.value)}
            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap">{content.outstandingIssues || "No issues reported."}</div>
        )}
      </div>

      {/* Next Session Goals - Unified for all report types */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">Next Session Goals</div>
        {isEditing ? (
          <Textarea
            rows={2}
            placeholder="Goals for the next session..."
            value={content.nextSessionGoals || ""}
            onChange={(e) => form.setValue("content.nextSessionGoals", e.target.value)}
            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap">{content.nextSessionGoals || "No goals set."}</div>
        )}
      </div>
    </>
  );
}