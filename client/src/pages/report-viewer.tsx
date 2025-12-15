import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import jsPDF from "jspdf";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReportNotesManager from "@/components/report-notes-manager";
import { ReportEmailModal } from "@/components/report-email-modal";

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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Refs for content tracking without re-rendering (prevents cursor jumping)
  const contentRef = useRef<Record<string, any>>({});
  const initializedFieldsRef = useRef<Set<number>>(new Set());
  
  // Store template in state to prevent re-renders from causing contentEditable remounts
  const [stableTemplate, setStableTemplate] = useState<any>(null);
  
  // Always-editable report viewer - no lock/unlock functionality

  const { data: project } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: report } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/reports/${reportId}`],
    refetchOnWindowFocus: false, // Prevent refetch while editing to avoid cursor jumps
  });

  const { data: projectSettings } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  const { data: templatesV2 = [] } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/templates-v2`],
  });

  const { data: globalTemplateSettings, isLoading: isSettingsLoading } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/global-template-settings`],
  });

  const { data: reportTypes = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/report-types`],
  });

  // Find the V2 template for this report (used only to initialize stableTemplate)
  const foundTemplate = templatesV2.find((t: any) => t.id === report?.templateId);
  
  // Set stableTemplate once when template is found (prevents re-renders from remounting contentEditable)
  useEffect(() => {
    if (foundTemplate && !stableTemplate) {
      setStableTemplate(foundTemplate);
    }
  }, [foundTemplate, stableTemplate]);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: report?.title || "",
      date: report?.date ? new Date(report.date).toISOString().split('T')[0] : "",
      content: report?.content || {},
    },
  });

  // Track stable report identity to prevent mid-typing resets
  const lastReportIdRef = useRef<number | null>(null);
  const lastReportContentRef = useRef<string | null>(null);

  // Update form when report data actually changes (not on every cache refresh)
  useEffect(() => {
    if (report) {
      const reportContentSignature = JSON.stringify(report.content || {});
      
      // Only reset if this is a different report or initial load
      if (lastReportIdRef.current !== report.id) {
        form.reset({
          title: report.title || "",
          date: report.date ? new Date(report.date).toISOString().split('T')[0] : "",
          content: report.content || {},
        });
        // Initialize contentRef and reset initialized fields for new report
        contentRef.current = { ...(report.content || {}) };
        initializedFieldsRef.current.clear();
        lastReportIdRef.current = report.id;
        lastReportContentRef.current = reportContentSignature;
      }
    }
  }, [report?.id, form]);


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
    // Merge contentRef into form data (preserves non-richtext field values while adding richtext values)
    data.content = { ...data.content, ...contentRef.current };
    updateMutation.mutate(data);
  };

  const handleDownloadPDF = async () => {
    // Wait for settings to load before proceeding
    if (isSettingsLoading) {
      toast({
        title: "Loading",
        description: "Please wait for settings to load before downloading.",
      });
      return;
    }
    
    try {
      // Get PDF settings from global template settings or use defaults
      const pdfSettings = globalTemplateSettings?.pdfExport || {
        fontFamily: "helvetica",
        titleSize: 18,
        showNameSize: 16,
        sectionTitleSize: 13,
        fieldTitleSize: 12,
        contentSize: 11,
        lineHeight: 1.4,
        marginTop: 0.5,
        marginBottom: 0.5,
        marginLeft: 1,
        marginRight: 1
      };

      // Create PDF with letter size (8.5 x 11 inches)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 612pt
      const pageHeight = pdf.internal.pageSize.getHeight(); // 792pt
      
      // Convert margins from inches to points (1 inch = 72pt)
      const marginLeft = pdfSettings.marginLeft * 72;
      const marginRight = pdfSettings.marginRight * 72;
      const marginTop = pdfSettings.marginTop * 72;
      const marginBottom = pdfSettings.marginBottom * 72;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Font sizes from settings
      const titleSize = pdfSettings.titleSize;
      const showNameSize = pdfSettings.showNameSize;
      const sectionTitleSize = pdfSettings.sectionTitleSize;
      const fieldTitleSize = pdfSettings.fieldTitleSize;
      const contentSize = pdfSettings.contentSize;
      const lineHeight = pdfSettings.lineHeight;
      const fontFamily = pdfSettings.fontFamily;

      let yPosition = marginTop;

      // Helper to add new page if needed
      const checkNewPage = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - marginBottom) {
          pdf.addPage();
          yPosition = marginTop;
          return true;
        }
        return false;
      };

      // Helper to strip HTML tags and decode entities
      const stripHtml = (html: string): string => {
        if (!html) return '';
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
      };

      // Helper to parse HTML and preserve list formatting
      type TextSegment = { text: string; indent: number; isListItem: boolean };
      const parseHtmlWithLists = (html: string): TextSegment[] => {
        if (!html) return [];
        const segments: TextSegment[] = [];
        const temp = document.createElement('div');
        temp.innerHTML = html;

        const processNode = (node: Node, listCounter: number[] = [], listType: string[] = []) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              segments.push({ text, indent: listCounter.length, isListItem: false });
            }
            return;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tagName = el.tagName.toLowerCase();

            if (tagName === 'ol') {
              listCounter.push(0);
              listType.push('ol');
              el.childNodes.forEach(child => processNode(child, listCounter, listType));
              listCounter.pop();
              listType.pop();
            } else if (tagName === 'ul') {
              listCounter.push(0);
              listType.push('ul');
              el.childNodes.forEach(child => processNode(child, listCounter, listType));
              listCounter.pop();
              listType.pop();
            } else if (tagName === 'li') {
              if (listCounter.length > 0) {
                listCounter[listCounter.length - 1]++;
                const currentType = listType[listType.length - 1];
                const num = listCounter[listCounter.length - 1];
                const prefix = currentType === 'ol' ? `${num}. ` : '• ';
                const text = el.textContent?.trim() || '';
                if (text) {
                  segments.push({ 
                    text: prefix + text, 
                    indent: listCounter.length, 
                    isListItem: true 
                  });
                }
              }
            } else if (tagName === 'p' || tagName === 'div' || tagName === 'br') {
              // Check if this element contains list children
              const hasListChild = Array.from(el.children).some(
                child => ['ol', 'ul'].includes(child.tagName.toLowerCase())
              );
              if (hasListChild) {
                el.childNodes.forEach(child => processNode(child, listCounter, listType));
              } else if (listCounter.length === 0) {
                // Only add as plain text if not inside a list (list items handle their own text)
                const text = el.textContent?.trim();
                if (text) {
                  segments.push({ text, indent: 0, isListItem: false });
                }
              }
            } else {
              el.childNodes.forEach(child => processNode(child, listCounter, listType));
            }
          }
        };

        temp.childNodes.forEach(child => processNode(child));
        return segments;
      };

      // Helper to wrap text and return lines
      const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        return lines;
      };

      const centerX = pageWidth / 2;

      // Add report title (bold, centered)
      pdf.setFontSize(titleSize);
      pdf.setFont(fontFamily, 'bold');
      const titleLines = wrapText(report.title || 'Report', contentWidth, titleSize);
      titleLines.forEach((line: string) => {
        checkNewPage(titleSize * lineHeight);
        pdf.text(line, centerX, yPosition, { align: 'center' });
        yPosition += titleSize * lineHeight;
      });

      // Add show name (regular, centered)
      pdf.setFontSize(showNameSize);
      pdf.setFont(fontFamily, 'normal');
      const projectName = project?.name || '';
      if (projectName) {
        const projectLines = wrapText(projectName, contentWidth, showNameSize);
        projectLines.forEach((line: string) => {
          checkNewPage(showNameSize * lineHeight);
          pdf.text(line, centerX, yPosition, { align: 'center' });
          yPosition += showNameSize * lineHeight;
        });
      }

      // Add date (regular, centered)
      pdf.setFontSize(showNameSize);
      pdf.setFont(fontFamily, 'normal');
      const dateStr = new Date(report.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(dateStr, centerX, yPosition, { align: 'center' });
      yPosition += showNameSize * lineHeight;

      // Add horizontal line from left margin to right margin
      pdf.setLineWidth(0.5);
      pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
      yPosition += contentSize * lineHeight + 12; // Extra padding under the line

      // Process each section from the template
      if (stableTemplate?.sections) {
        for (const section of stableTemplate.sections) {
          // Check if we need a new page for section header
          checkNewPage(sectionTitleSize * lineHeight + 20);

          // Section title (bold)
          pdf.setFontSize(sectionTitleSize);
          pdf.setFont(fontFamily, 'bold');
          const sectionLines = wrapText(section.title || '', contentWidth, sectionTitleSize);
          sectionLines.forEach((line: string) => {
            checkNewPage(sectionTitleSize * lineHeight);
            pdf.text(line, marginLeft, yPosition);
            yPosition += sectionTitleSize * lineHeight;
          });
          yPosition += 6;

          // Process fields in this section
          if (section.fields && section.fields.length > 0) {
            for (const field of section.fields) {
              // Field title (bold)
              checkNewPage(fieldTitleSize * lineHeight + 10);
              pdf.setFontSize(fieldTitleSize);
              pdf.setFont(fontFamily, 'bold');
              const fieldLines = wrapText(field.label || '', contentWidth - 20, fieldTitleSize);
              fieldLines.forEach((line: string) => {
                checkNewPage(fieldTitleSize * lineHeight);
                pdf.text(line, marginLeft + 10, yPosition);
                yPosition += fieldTitleSize * lineHeight;
              });
              yPosition += 2;

              // Field content (normal) - with list support
              const fieldContent = contentRef.current[field.label] || field.defaultValue || '';
              const segments = parseHtmlWithLists(fieldContent);
              
              if (segments.length > 0) {
                pdf.setFontSize(contentSize);
                pdf.setFont(fontFamily, 'normal');
                
                for (const segment of segments) {
                  const indentOffset = segment.indent * 15;
                  const baseIndent = marginLeft + 20;
                  const segmentLines = wrapText(segment.text, contentWidth - 30 - indentOffset, contentSize);
                  
                  segmentLines.forEach((line: string, lineIndex: number) => {
                    checkNewPage(contentSize * lineHeight);
                    // For wrapped lines of list items, add extra indent to align with text after number
                    const xPos = baseIndent + indentOffset + (segment.isListItem && lineIndex > 0 ? 15 : 0);
                    pdf.text(line, xPos, yPosition);
                    yPosition += contentSize * lineHeight;
                  });
                }
              }
              yPosition += 8;
            }
          }
          yPosition += 12;
        }
      }

      // Add page numbers to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(11);
        pdf.setFont(fontFamily, 'normal');
        const pageText = `Page ${i} of ${totalPages}`;
        pdf.text(pageText, centerX, pageHeight - marginBottom + 20, { align: 'center' });
      }

      // Download the PDF
      const fileName = `${report.title || 'Report'}-${new Date(report.date).toLocaleDateString().replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Success",
        description: "Report downloaded as PDF",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEmail = () => {
    setShowEmailModal(true);
  };

  // Find the report type ID for this report based on template
  // The template has a reportTypeId field that points to the report type
  const currentReportTypeId = foundTemplate?.reportTypeId || 0;

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
                <DropdownMenuItem onClick={handleDownloadPDF} disabled={isSettingsLoading}>
                  <Download className="h-4 w-4 mr-2" />
                  {isSettingsLoading ? "Loading..." : "Download PDF"}
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

        {/* Report Content - rendered inline to prevent cursor jumping */}
        <div data-pdf-content>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {stableTemplate?.sections ? (
              <div className="space-y-6">
                {stableTemplate.sections.map((section: any) => (
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
                            </Label>
                            <div className="pl-4">
                              {field.helperText && (
                                <p className="text-sm text-muted-foreground">{field.helperText}</p>
                              )}
                              
                              {field.type === "richtext" && (
                                <div
                                  ref={(el) => {
                                    if (!el) return;
                                    // Initialize only once with content or default value
                                    if (!initializedFieldsRef.current.has(field.id)) {
                                      initializedFieldsRef.current.add(field.id);
                                      const content = contentRef.current[field.label];
                                      el.innerHTML = (content && content.trim()) ? content : (field.defaultValue || "");
                                    }
                                  }}
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    contentRef.current[field.label] = e.currentTarget.innerHTML;
                                  }}
                                  className="text-sm whitespace-pre-wrap outline-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
                                />
                              )}
                              {field.type === "text" && (
                                <Input
                                  defaultValue={contentRef.current[field.label] || field.defaultValue || ""}
                                  onChange={(e) => {
                                    contentRef.current[field.label] = e.target.value;
                                  }}
                                  placeholder={field.placeholder || ""}
                                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                                />
                              )}
                              {field.type === "number" && (
                                <Input
                                  type="number"
                                  defaultValue={contentRef.current[field.label] || field.defaultValue || ""}
                                  onChange={(e) => {
                                    contentRef.current[field.label] = e.target.value;
                                  }}
                                  placeholder={field.placeholder || ""}
                                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                                />
                              )}
                              {field.type === "date" && (
                                <Input
                                  type="date"
                                  defaultValue={contentRef.current[field.label] || field.defaultValue || ""}
                                  onChange={(e) => {
                                    contentRef.current[field.label] = e.target.value;
                                  }}
                                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                                />
                              )}
                              {field.type === "checkbox" && (
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    defaultChecked={contentRef.current[field.label] === "true" || field.defaultValue === "true"}
                                    onCheckedChange={(checked) => {
                                      contentRef.current[field.label] = checked ? "true" : "false";
                                    }}
                                  />
                                  <label className="text-sm text-muted-foreground">
                                    {field.placeholder || "Check this option"}
                                  </label>
                                </div>
                              )}
                              {field.type === "select" && (
                                <Select 
                                  defaultValue={contentRef.current[field.label] || field.defaultValue || ""} 
                                  onValueChange={(value) => {
                                    contentRef.current[field.label] = value;
                                  }}
                                >
                                  <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                                    <SelectValue placeholder={field.placeholder || "Select an option"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field.options?.values && field.options.values.map((option: string) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">Template not found</div>
            )}
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

        {/* Email Modal */}
        <ReportEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          projectId={projectId}
          reportTypeId={report.reportTypeId || currentReportTypeId}
          report={report}
          project={project}
          template={stableTemplate}
          contentRef={contentRef}
          globalTemplateSettings={globalTemplateSettings}
        />
      </div>
    </div>
  );
}