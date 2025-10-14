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
import { ArrowLeft, Download, Share, Trash2, Save } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Always-editable report viewer - no lock/unlock functionality

  const { data: project } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: report } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/reports/${reportId}`],
  });

  const { data: projectSettings } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/settings`],
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
            
            <Button 
              variant="default"
              size="sm"
              onClick={form.handleSubmit(handleSave)}
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
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
              {report?.template?.headerFormatting ? (
                <div 
                  className="mb-6 pb-4 border-b"
                  style={{
                    textAlign: report.template.headerFormatting.textAlign || 'center',
                    color: report.template.headerFormatting.color || '#000000',
                    fontSize: report.template.headerFormatting.fontSize || '18px',
                    fontFamily: report.template.headerFormatting.fontFamily || 'Arial, sans-serif',
                    fontWeight: report.template.headerFormatting.fontWeight || '400',
                    fontStyle: report.template.headerFormatting.fontStyle || 'normal',
                    textDecoration: report.template.headerFormatting.textDecoration || 'none',
                    backgroundColor: report.template.headerFormatting.backgroundColor || 'transparent',
                    padding: '8px 0'
                  }}
                >
                  <div>{report.title}</div>
                  <div style={{ marginTop: '8px' }}>{project.name}</div>
                  <div style={{ marginTop: '4px' }}>{new Date(report.date).toLocaleDateString()}</div>
                </div>
              ) : (
                <div className="text-center mb-6 pb-4 border-b">
                  <div className="text-lg font-semibold">
                    {report.title}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {project.name} - {new Date(report.date).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Report Content */}
              <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                {renderReportContent(report, true, form, projectSettings)}
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

function renderReportContent(report: any, isEditing: boolean, form: any, projectSettings: any) {
  const content = form.watch("content") || {};
  const projectId = report.projectId;
  const reportId = report.id;
  const reportType = report.type;

  // Use ONLY custom template from report.template.layoutConfiguration (included from template by backend)
  if (!report?.template?.layoutConfiguration) {
    return <div>Loading template...</div>;
  }

  const { layoutConfiguration, fieldHeaderFormatting, departmentNames } = report.template;

  return (
    <>
      {layoutConfiguration.items
        .filter((item: any) => item.type === 'grouped-section')
        .map((section: any) => {
          const isField = !!section.content?.fieldId;
          const isDepartment = !!section.content?.department;
          
          if (isField) {
            const fieldId = section.content.fieldId;
            const label = section.content.label || fieldId;
            const placeholder = section.children?.find((c: any) => c.type === 'notes')?.content?.placeholder || `Enter ${label.toLowerCase()}...`;
            
            return (
              <div key={section.id} className="mb-6">
                <div 
                  className="text-sm font-bold px-2 py-1 mb-2"
                  style={{
                    backgroundColor: fieldHeaderFormatting?.backgroundColor || '#000000',
                    color: fieldHeaderFormatting?.color || '#ffffff',
                    fontFamily: fieldHeaderFormatting?.fontFamily || 'Arial',
                    fontSize: fieldHeaderFormatting?.fontSize || '14px'
                  }}
                >
                  {label}
                </div>
                {isEditing ? (
                  <div 
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={placeholder}
                    onBlur={(e) => {
                      form.setValue(`content.${fieldId}`, e.currentTarget.textContent || "");
                    }}
                    onInput={(e) => {
                      form.setValue(`content.${fieldId}`, e.currentTarget.textContent || "");
                    }}
                    className={`text-sm whitespace-pre-wrap px-4 py-2 outline-none ${(!content[fieldId] || (typeof content[fieldId] === 'string' && content[fieldId].trim() === '')) ? 'empty-field' : ''}`}
                  >
                    {content[fieldId] || ''}
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap px-4 py-2" style={{ color: '#000000' }}>
                    {content[fieldId] || placeholder}
                  </div>
                )}
              </div>
            );
          }
          
          if (isDepartment) {
            const department = section.content.department;
            const displayName = departmentNames?.[department] || section.content.displayName || department;
            
            return (
              <div key={section.id} className="mb-6">
                <div 
                  className="text-sm font-bold px-2 py-1 mb-2"
                  style={{
                    backgroundColor: fieldHeaderFormatting?.backgroundColor || '#000000',
                    color: fieldHeaderFormatting?.color || '#ffffff',
                    fontFamily: fieldHeaderFormatting?.fontFamily || 'Arial',
                    fontSize: fieldHeaderFormatting?.fontSize || '14px'
                  }}
                >
                  {displayName}
                </div>
                <ReportNotesManager 
                  reportId={reportId} 
                  projectId={projectId}
                  reportType={reportType}
                  department={department}
                  isEditing={isEditing}
                />
              </div>
            );
          }
          
          return null;
        })}
    </>
  );
}