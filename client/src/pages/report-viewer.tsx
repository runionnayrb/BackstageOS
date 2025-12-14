import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

// Rich text field component that properly handles contentEditable without cursor issues
function RichTextField({ 
  initialValue, 
  onSave, 
  className 
}: { 
  initialValue: string; 
  onSave: (value: string) => void; 
  className?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Use callback ref to set initial content only once when mounted
  const setRef = (el: HTMLDivElement | null) => {
    if (el && !editorRef.current) {
      el.innerHTML = initialValue || "";
      editorRef.current = el;
    }
  };

  return (
    <div
      ref={setRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        onSave(e.currentTarget.innerHTML);
      }}
      className={className}
    />
  );
}
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Upload, Trash2, Save, Mail, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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

  const { data: templatesV2 = [] } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/templates-v2`],
  });

  // Get the V2 template for this report
  const template = templatesV2.find((t: any) => t.id === report?.templateId);

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

  const handleDownloadPDF = async () => {
    try {
      const element = document.querySelector('[data-pdf-content]');
      if (!element) {
        toast({
          title: "Error",
          description: "Could not find report content to download",
          variant: "destructive",
        });
        return;
      }

      // Capture the HTML element as canvas
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      // Create PDF with letter size (8.5 x 11 inches)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Available content area with 1 inch margins
      const marginLeft = 1;
      const marginTop = 1;
      const contentWidth = pageWidth - 2; // 1 inch margins on each side
      const contentHeight = pageHeight - 2; // 1 inch margins on top and bottom

      // Calculate image dimensions to fit within margins
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = marginTop;
      let remainingHeight = imgHeight;

      // Add image to PDF, handling multiple pages if needed
      const imgData = canvas.toDataURL('image/png');
      
      while (remainingHeight > 0) {
        if (yPosition + remainingHeight > pageHeight - marginTop) {
          // Need a new page
          const heightThatFits = pageHeight - marginTop - yPosition;
          pdf.addImage(imgData, 'PNG', marginLeft, yPosition, imgWidth, (heightThatFits * imgHeight) / remainingHeight);
          remainingHeight -= heightThatFits;
          yPosition = marginTop;
          if (remainingHeight > 0) {
            pdf.addPage();
          }
        } else {
          pdf.addImage(imgData, 'PNG', marginLeft, yPosition, imgWidth, remainingHeight);
          remainingHeight = 0;
        }
      }

      // Download the PDF
      const fileName = `${report.title || 'Report'}-${new Date().toLocaleDateString()}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Success",
        description: "Report downloaded as PDF",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEmail = () => {
    toast({
      title: "Coming Soon",
      description: "Email functionality will be available soon",
    });
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-gray-600">{project.name} - {new Date(report.date).toLocaleDateString()}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-transparent">
                  <Upload className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
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

        {/* Report Content */}
        <div data-pdf-content>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {renderReportContent(report, template, true, form)}
          </form>
        </div>

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

function renderReportContent(report: any, template: any, isEditing: boolean, form: any) {
  const content = form.watch("content") || {};

  if (!template?.sections) {
    return <div className="text-center py-8 text-muted-foreground">Template not found</div>;
  }

  return (
    <div className="space-y-6">
      {template.sections.map((section: any) => (
        <div key={section.id} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{section.title}</h3>
            {section.departmentKey && (
              <p className="text-sm text-muted-foreground">{section.departmentKey}</p>
            )}
          </div>

          {section.fields && section.fields.length > 0 ? (
            <div className="space-y-4 pl-4">
              {section.fields.map((field: any) => (
                <div key={field.id} className="space-y-2">
                  <Label className="font-bold">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <div className="pl-4">
                    {field.helperText && (
                      <p className="text-sm text-muted-foreground">{field.helperText}</p>
                    )}
                    
                    {field.type === "richtext" && isEditing && (
                      <RichTextField
                        key={field.id}
                        initialValue={content[field.label] || field.defaultValue || ""}
                        onSave={(value) => {
                          const newContent = {...content};
                          newContent[field.label] = value;
                          form.setValue("content", newContent);
                        }}
                        className="text-sm whitespace-pre-wrap outline-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                      />
                    )}
                    {field.type === "richtext" && !isEditing && (
                      <div 
                        dangerouslySetInnerHTML={{__html: content[field.label] || field.defaultValue || ""}}
                        className="text-sm whitespace-pre-wrap [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                      />
                    )}
                    {field.type === "text" && (
                      <Input
                        value={content[field.label] || field.defaultValue || ""}
                        onChange={(e) => {
                          const newContent = {...content};
                          newContent[field.label] = e.target.value;
                          form.setValue("content", newContent);
                        }}
                        disabled={!isEditing}
                        placeholder={field.placeholder || ""}
                        className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                      />
                    )}
                    {field.type === "number" && (
                      <Input
                        type="number"
                        value={content[field.label] || field.defaultValue || ""}
                        onChange={(e) => {
                          const newContent = {...content};
                          newContent[field.label] = e.target.value;
                          form.setValue("content", newContent);
                        }}
                        disabled={!isEditing}
                        placeholder={field.placeholder || ""}
                        className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                      />
                    )}
                    {field.type === "date" && (
                      <Input
                        type="date"
                        value={content[field.label] || field.defaultValue || ""}
                        onChange={(e) => {
                          const newContent = {...content};
                          newContent[field.label] = e.target.value;
                          form.setValue("content", newContent);
                        }}
                        disabled={!isEditing}
                        className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                      />
                    )}
                    {field.type === "checkbox" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={content[field.label] === "true" || field.defaultValue === "true"}
                          onCheckedChange={(checked) => {
                            const newContent = {...content};
                            newContent[field.label] = checked ? "true" : "false";
                            form.setValue("content", newContent);
                          }}
                          disabled={!isEditing}
                        />
                        <label className="text-sm text-muted-foreground">
                          {field.placeholder || "Check this option"}
                        </label>
                      </div>
                    )}
                    {field.type === "select" && (
                      <Select 
                        value={content[field.label] || field.defaultValue || ""} 
                        onValueChange={(value) => {
                          const newContent = {...content};
                          newContent[field.label] = value;
                          form.setValue("content", newContent);
                        }}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                          <SelectValue placeholder={field.placeholder || "Select an option"} />
                        </SelectTrigger>
                        {isEditing && (
                          <SelectContent>
                            {field.options?.values && field.options.values.map((option: string) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        )}
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic pl-4">No fields in this section</p>
          )}
        </div>
      ))}
    </div>
  );
}