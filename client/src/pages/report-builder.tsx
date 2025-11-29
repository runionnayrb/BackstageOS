import { useState, useEffect, useRef, createRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, Settings, Star, Users, FileText, ArrowLeft, Bold, Italic, Underline, List, ListOrdered } from "lucide-react";
import ReportNotesManager from "@/components/report-notes-manager";
import { NoteStatusPopup } from "@/components/note-status-popup";

const reportSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Template type is required"),
  date: z.string().min(1, "Date is required"),
  content: z.record(z.any()),
  templateId: z.number().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportBuilderParams {
  id: string;
  type: string;
  reportId?: string;
}

export default function ReportBuilder() {
  const [, setLocation] = useLocation();
  const params = useParams<ReportBuilderParams>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customTemplate, setCustomTemplate] = useState<any>(null);
  const focusedEditorRef = useRef<HTMLDivElement | null>(null);
  
  // Extract template ID from query params
  const searchParams = new URLSearchParams(window.location.search);
  const templateQueryParam = searchParams.get('template');
  
  // Guard against missing parameters
  if (!params.id || !params.type) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Report Builder Not Found</h1>
          <p className="text-muted-foreground mb-4">The report builder you're looking for doesn't exist or the URL is invalid.</p>
          <Button onClick={() => setLocation('/shows')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shows
          </Button>
        </div>
      </div>
    );
  }
  
  const projectId = parseInt(params.id);
  const reportType = params.type;
  
  // Determine if we're in edit mode by checking the URL path
  // If URL contains "/builder", we're creating a new report (not editing)
  const urlPath = window.location.pathname;
  const isCreatingNew = urlPath.includes('/builder');
  
  // Only use reportId if we're NOT in the /builder route
  const reportId = !isCreatingNew && params.reportId ? parseInt(params.reportId) : null;
  const isEditMode = !isCreatingNew && !!reportId && !isNaN(reportId as number);

  const { data: project } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: existingReport } = useQuery<any>({
    queryKey: reportId && !isNaN(reportId) ? [`/api/projects/${projectId}/reports/${reportId}`] : ['disabled-query'],
    enabled: isEditMode && !!reportId && !isNaN(reportId as number),
  });

  const { data: templatesV2 = [], isLoading: templatesLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/templates-v2`],
    enabled: !!projectId,
  });

  const { data: projectSettings, isLoading: settingsLoading } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  // Fetch report types to get the current custom names
  const { data: reportTypes } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/report-types`],
    enabled: !!projectId,
  });

  // Fetch team members for note assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/projects', projectId, 'team'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/team`);
      if (!response.ok) return [];
      const members = await response.json();
      return members.map((member: any) => ({
        id: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName
      }));
    },
    enabled: !!projectId,
  });

  // Refs for department fields (for note status popup)
  const departmentFieldRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  // Find the template matching the query param or report type
  let matchingTemplate = null;
  
  // If template ID is provided in query params, use it
  if (templateQueryParam && Array.isArray(templatesV2)) {
    const templateId = parseInt(templateQueryParam);
    matchingTemplate = templatesV2.find((t: any) => t.id === templateId);
    if (matchingTemplate) {
      console.log('✅ Loaded template from query param:', templateId, matchingTemplate);
    } else {
      console.warn('⚠️ Template ID from query param not found:', templateId);
    }
  }
  
  // Otherwise find by report type
  if (!matchingTemplate && Array.isArray(templatesV2) && Array.isArray(reportTypes)) {
    const currentReportTypeObj = reportTypes.find((rt: any) => rt.slug === reportType);
    if (currentReportTypeObj) {
      matchingTemplate = templatesV2.find((t: any) => t.reportTypeId === currentReportTypeObj.id);
      if (matchingTemplate) {
        console.log('✅ Loaded template by report type:', reportType, matchingTemplate);
      }
    }
  }
  
  if (!matchingTemplate && Array.isArray(templatesV2) && templatesV2.length > 0) {
    console.warn('⚠️ No matching template found for report type:', reportType);
  }
  
  const customTemplates = Array.isArray(templatesV2) ? templatesV2 : [];

  // Find the report type to get its current name
  const currentReportType = Array.isArray(reportTypes) 
    ? reportTypes.find((rt: any) => rt.slug === reportType)
    : null;

  // Helper function to generate report title from type
  const generateReportTitle = (type: string): string => {
    const titleMap: Record<string, string> = {
      'rehearsal': 'Rehearsal Report',
      'tech': 'Technical Rehearsal Report',
      'performance': 'Performance Report',
      'meeting': 'Production Meeting Report'
    };
    return titleMap[type] || 'Report';
  };

  const generatePageTitle = (type: string, isEdit: boolean): string => {
    if (isEdit) return "Edit Report";
    
    // Use template name if available, then report type name, then fallback
    if (matchingTemplate?.name) {
      return `New ${matchingTemplate.name}`;
    }
    
    if (currentReportType?.name) {
      return `New ${currentReportType.name}`;
    }
    
    // Fallback to hardcoded map
    const titleMap: Record<string, string> = {
      'rehearsal': 'New Rehearsal Report',
      'tech': 'New Technical Rehearsal Report',
      'performance': 'New Performance Report',
      'meeting': 'New Production Meeting Report',
      'previews': 'New Previews Report'
    };
    return titleMap[type] || 'New Report';
  };

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      projectId: projectId,
      title: generateReportTitle(reportType || ""),
      type: reportType || "",
      date: new Date().toISOString().split('T')[0],
      content: {},
    },
  });

  // Set form values when project and report type are available, or when editing existing report
  useEffect(() => {
    // Wait for settings to load before setting up the template
    if (settingsLoading) {
      return;
    }
    
    if (projectId && reportType) {
      form.setValue("projectId", projectId);
      form.setValue("type", reportType);
      
      if (existingReport && isEditMode) {
        // Populate form with existing report data
        form.setValue("title", existingReport.title);
        form.setValue("date", existingReport.date ? new Date(existingReport.date).toISOString().split('T')[0] : form.getValues("date"));
        form.setValue("content", existingReport.content || {});
        setSelectedTemplate('custom-layout');
      } else {
        // Auto-generate title based on template name (most up-to-date source)
        const reportTitle = matchingTemplate?.name || currentReportType?.name || generateReportTitle(reportType);
        form.setValue("title", reportTitle);
        
        // ALWAYS use custom template from matchingTemplate when available
        if (matchingTemplate) {
          console.log('⚙️ Setting customTemplate from matchingTemplate:', matchingTemplate);
          setSelectedTemplate('custom-layout');
          
          // Parse layoutConfiguration if it's a string
          let parsedLayout = matchingTemplate.layoutConfiguration;
          if (typeof parsedLayout === 'string') {
            try {
              parsedLayout = JSON.parse(parsedLayout);
            } catch (e) {
              console.error('Failed to parse layoutConfiguration:', e);
            }
          }
          
          const newTemplate = {
            ...matchingTemplate,
            layoutConfiguration: parsedLayout,
          };
          
          console.log('⚙️ Parsed template:', newTemplate);
          setCustomTemplate(newTemplate);
        }
      }
    }
  }, [projectId, reportType, existingReport, isEditMode, matchingTemplate, projectSettings, settingsLoading, currentReportType]);

  const mutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      if (isEditMode && reportId) {
        await apiRequest("PUT", `/api/projects/${projectId}/reports/${reportId}`, {
          ...data,
          date: new Date(data.date),
        });
      } else {
        // When creating a new report, link it to the custom template
        const reportData: any = {
          ...data,
          date: new Date(data.date),
        };
        
        if (matchingTemplate?.id) {
          reportData.templateId = matchingTemplate.id;
        }
        
        await apiRequest("POST", `/api/projects/${projectId}/reports`, reportData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/reports`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/reports/${reportId}`] });
      toast({
        title: isEditMode ? "Report Updated" : "Report Created",
        description: isEditMode ? "Your report has been updated successfully!" : "Your report has been created successfully!",
      });
      if (isEditMode && reportId) {
        setLocation(`/shows/${projectId}/reports/${reportType}/${reportId}`);
      } else {
        setLocation(`/shows/${projectId}/reports/${reportType}`);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: isEditMode ? "Failed to update report. Please try again." : "Failed to create report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Only use V2 templates - no built-in fallbacks
  const allCustomTemplates = matchingTemplate ? [{
    id: `custom-${matchingTemplate.id}`,
    name: matchingTemplate.name,
    description: matchingTemplate.description || "Custom template",
    icon: FileText,
    color: "bg-gray-100",
    iconColor: "text-gray-600",
    isCustom: true,
    template: matchingTemplate,
  }] : [];

  // ONLY use v2 templates
  const templates = allCustomTemplates;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      // Check if it's a custom template
      if ('isCustom' in template && template.isCustom && template.template) {
        const customTemplate = template.template;
        setCustomTemplate(customTemplate);
        form.setValue("type", customTemplate.type || "custom");
        form.setValue("title", `${template.name} #1`);
      } else {
        // Built-in template
        setCustomTemplate(null);
        form.setValue("type", templateId);
        form.setValue("title", `${template.name} #1`);
      }
    }
  };

  const onSubmit = (data: ReportFormData) => {
    mutation.mutate(data);
  };



  const applyFormatting = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    
    const editor = focusedEditorRef.current;
    if (!editor) return;
    
    // Ensure the editor is focused
    editor.focus();
    
    // Apply command
    try {
      switch(command) {
        case "bold":
          document.execCommand("bold", false);
          break;
        case "italic":
          document.execCommand("italic", false);
          break;
        case "underline":
          document.execCommand("underline", false);
          break;
        case "ul":
          document.execCommand("insertUnorderedList", false);
          break;
        case "ol":
          document.execCommand("insertOrderedList", false);
          break;
      }
      editor.focus();
    } catch (error) {
      console.error("Formatting error:", error);
    }
  };

  const renderTemplateFields = () => {
    if (!selectedTemplate || !customTemplate) return null;

    const currentContent = form.watch("content") || {};
    const hasRichtextFields = customTemplate?.sections?.some((s: any) => 
      s.fields?.some((f: any) => f.type === "richtext")
    );

    // Render template sections/fields directly
    if (customTemplate?.sections && customTemplate.sections.length > 0) {
      return (
        <div className="space-y-6">
          {/* Formatting toolbar for richtext fields */}
          {hasRichtextFields && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => applyFormatting(e, "bold")}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => applyFormatting(e, "italic")}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => applyFormatting(e, "underline")}
                title="Underline"
              >
                <Underline className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => applyFormatting(e, "ul")}
                title="Bullet list"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={(e) => applyFormatting(e, "ol")}
                title="Numbered list"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </div>
          )}

          {customTemplate.sections.map((section: any) => (
            <div key={section.id} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{section.title}</h3>
                {section.departmentKey && (
                  <p className="text-sm text-muted-foreground">
                    {section.departmentKey}
                  </p>
                )}
              </div>
              
              {section.fields && section.fields.length > 0 ? (
                <div className="space-y-4 pl-4">
                  {section.fields.map((field: any) => (
                    <div key={field.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="font-bold">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.departmentKey && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full" title="Notes in this field are tracked">
                            Tracked
                          </span>
                        )}
                      </div>
                      <div className="pl-4">
                        {field.helperText && (
                          <p className="text-sm text-muted-foreground">{field.helperText}</p>
                        )}
                        {field.type === "richtext" && (
                          <div className="relative">
                            {(() => {
                              if (!departmentFieldRefs.current[field.id]) {
                                departmentFieldRefs.current[field.id] = createRef();
                              }
                              return null;
                            })()}
                            <div
                              ref={(el) => {
                                focusedEditorRef.current = el;
                                if (field.departmentKey && departmentFieldRefs.current[field.id]) {
                                  (departmentFieldRefs.current[field.id] as any).current = el;
                                }
                              }}
                              contentEditable
                              suppressContentEditableWarning
                              onFocus={(e) => {
                                focusedEditorRef.current = e.currentTarget;
                              }}
                              onBlur={(e) => {
                                const newContent = {...currentContent};
                                newContent[field.label] = e.currentTarget.innerHTML;
                                form.setValue("content", newContent);
                              }}
                              onInput={(e) => {
                                const newContent = {...currentContent};
                                newContent[field.label] = e.currentTarget.innerHTML;
                                form.setValue("content", newContent);
                              }}
                              dangerouslySetInnerHTML={{__html: currentContent[field.label] || field.defaultValue || ""}}
                              className="text-sm whitespace-pre-wrap outline-none"
                            />
                            {field.departmentKey && isEditMode && reportId && departmentFieldRefs.current[field.id] && (
                              <NoteStatusPopup
                                reportId={reportId}
                                projectId={projectId}
                                fieldId={field.id}
                                departmentKey={field.departmentKey}
                                containerRef={departmentFieldRefs.current[field.id]}
                                teamMembers={teamMembers}
                              />
                            )}
                          </div>
                        )}
                        {field.type === "text" && (
                          <Input
                            value={currentContent[field.label] || field.defaultValue || ""}
                            onChange={(e) => {
                              const newContent = {...currentContent};
                              newContent[field.label] = e.target.value;
                              form.setValue("content", newContent);
                            }}
                            placeholder={field.placeholder || ""}
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                          />
                        )}
                        {field.type === "number" && (
                          <Input
                            type="number"
                            value={currentContent[field.label] || field.defaultValue || ""}
                            onChange={(e) => {
                              const newContent = {...currentContent};
                              newContent[field.label] = e.target.value;
                              form.setValue("content", newContent);
                            }}
                            placeholder={field.placeholder || ""}
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                          />
                        )}
                        {field.type === "date" && (
                          <Input
                            type="date"
                            value={currentContent[field.label] || field.defaultValue || ""}
                            onChange={(e) => {
                              const newContent = {...currentContent};
                              newContent[field.label] = e.target.value;
                              form.setValue("content", newContent);
                            }}
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                          />
                        )}
                        {field.type === "time" && (
                          <Input
                            type="time"
                            value={currentContent[field.label] || field.defaultValue || ""}
                            onChange={(e) => {
                              const newContent = {...currentContent};
                              newContent[field.label] = e.target.value;
                              form.setValue("content", newContent);
                            }}
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                          />
                        )}
                        {field.type === "checkbox" && (
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              checked={currentContent[field.label] === "true" || field.defaultValue === "true"}
                              onCheckedChange={(checked) => {
                                const newContent = {...currentContent};
                                newContent[field.label] = checked ? "true" : "false";
                                form.setValue("content", newContent);
                              }}
                            />
                            <label className="text-sm text-muted-foreground">
                              {field.placeholder || "Check this option"}
                            </label>
                          </div>
                        )}
                        {field.type === "select" && (
                          <Select value={currentContent[field.label] || field.defaultValue || ""} onValueChange={(value) => {
                            const newContent = {...currentContent};
                            newContent[field.label] = value;
                            form.setValue("content", newContent);
                          }}>
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
      );
    }

    return null;
  };

  const renderLayoutBasedTemplate = (template: any) => {
    const currentContent = form.watch("content") || {};
    const { layoutConfiguration, fieldHeaderFormatting } = template;
    
    if (!layoutConfiguration || !layoutConfiguration.items) {
      return <div>Template configuration error</div>;
    }

    // Render items from layout configuration in order
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
                  <Textarea
                    id={fieldId}
                    rows={3}
                    placeholder={placeholder}
                    value={currentContent[fieldId] || ""}
                    onChange={(e) => form.setValue(`content.${fieldId}`, e.target.value)}
                    className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
                  />
                </div>
              );
            }
            
            if (isDepartment) {
              const department = section.content.department;
              const displayName = template.departmentNames?.[department] || section.content.displayName || department;
              
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
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department={department}
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding {displayName.toLowerCase()} notes...
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            
            return null;
          })}
      </>
    );
  };

  const renderCustomFields = (fields: any[]) => {
    const currentContent = form.watch("content") || {};
    
    return fields.map((field: any) => {
      const fieldId = `custom-${field.id}`;
      
      switch (field.type) {
        case 'text':
          return (
            <div key={field.id} className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {field.label}
                
              </div>
              <Input
                id={fieldId}
                placeholder={field.placeholder || ''}
                required={field.required}
                value={currentContent[field.id] || ""}
                onChange={(e) => form.setValue(`content.${field.id}`, e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                readOnly={field.id === 'day'}
                style={field.id === 'day' ? { backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'not-allowed' } : {}}
              />
            </div>
          );
          
        case 'textarea':
          return (
            <div key={field.id} className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {field.label}
                
              </div>
              <Textarea
                id={fieldId}
                placeholder={field.placeholder || ''}
                rows={4}
                required={field.required}
                value={currentContent[field.id] || ""}
                onChange={(e) => form.setValue(`content.${field.id}`, e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
          );
          
        case 'number':
          return (
            <div key={field.id} className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {field.label}
                
              </div>
              <Input
                id={fieldId}
                type="number"
                placeholder={field.placeholder || '0'}
                required={field.required}
                value={currentContent[field.id] || ""}
                onChange={(e) => form.setValue(`content.${field.id}`, parseInt(e.target.value))}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              />
            </div>
          );
          
        case 'date':
          const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedDate = e.target.value;
            form.setValue(`content.${field.id}`, selectedDate);
            
            // Auto-populate day field if it exists
            if (selectedDate && customTemplate?.fields) {
              const dayField = customTemplate.fields.find((f: any) => f.id === 'day');
              if (dayField) {
                const date = new Date(selectedDate);
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = dayNames[date.getDay()];
                form.setValue(`content.day`, dayName);
              }
            }
          };

          return (
            <div key={field.id} className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {field.label}
                
              </div>
              <Input
                id={fieldId}
                type="date"
                required={field.required}
                value={currentContent[field.id] || ""}
                onChange={handleDateChange}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              />
            </div>
          );
          
        case 'datetime':
          return (
            <div key={field.id} className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {field.label}
                
              </div>
              <Input
                id={fieldId}
                type="datetime-local"
                required={field.required}
                value={currentContent[field.id] || ""}
                onChange={(e) => form.setValue(`content.${field.id}`, e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              />
            </div>
          );
          
        case 'select':
          return (
            <div key={field.id} className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">
                {field.label}
                
              </div>
              <Select value={currentContent[field.id] || ""} onValueChange={(value) => form.setValue(`content.${field.id}`, value)}>
                <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                  <SelectValue placeholder={field.placeholder || 'Select an option'} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option: string, index: number) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
          
        case 'checkbox':
          return (
            <div key={field.id} className="mb-6 flex items-center space-x-2">
              <input
                id={fieldId}
                type="checkbox"
                className="rounded border-gray-300"
                onChange={(e) => form.setValue(`content.${field.id}`, e.target.checked)}
              />
              <div className="text-sm font-semibold text-gray-700">
                {field.label}
                
              </div>
            </div>
          );
          
        default:
          return null;
      }
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{generatePageTitle(reportType || "", isEditMode)}</h2>
        </div>

        {/* Template Selection - Hidden since template is auto-selected based on report type */}

        {/* Report Form - Document Style */}
        <div>
          <div>
            {/* Print-style Document Preview */}
            <div className="bg-white min-h-[500px]" style={{ 
              width: "8.5in", 
              margin: "0 auto",
              padding: "1in",
              fontFamily: "Arial, sans-serif"
            }}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {/* Header from Global Template Settings */}
                {customTemplate?.headerFormatting && (() => {
                  console.log('🎨 HEADER FORMATTING BEING APPLIED:', customTemplate.headerFormatting);
                  return (
                    <div 
                      className="mb-6 pb-4 border-b"
                      style={{
                        textAlign: customTemplate.headerFormatting.textAlign || 'center',
                        color: customTemplate.headerFormatting.color || '#000000',
                        fontSize: customTemplate.headerFormatting.fontSize || '18px',
                        fontFamily: customTemplate.headerFormatting.fontFamily || 'Arial, sans-serif',
                        fontWeight: customTemplate.headerFormatting.fontWeight || '400',
                        fontStyle: customTemplate.headerFormatting.fontStyle || 'normal',
                        textDecoration: customTemplate.headerFormatting.textDecoration || 'none',
                        backgroundColor: customTemplate.headerFormatting.backgroundColor || 'transparent',
                        padding: '8px 0'
                      }}
                    >
                      <div>{form.watch("title") || matchingTemplate?.name || currentReportType?.name || generateReportTitle(reportType)}</div>
                      <div style={{ marginTop: '8px' }}>{project?.name || 'Show Name'}</div>
                      <div style={{ marginTop: '4px' }}>{new Date(form.watch("date") || new Date()).toLocaleDateString()}</div>
                    </div>
                  );
                })()}

                {/* Document Fields */}
                <div className="space-y-4">
                  {renderTemplateFields()}
                </div>

                {/* Footer from Global Template Settings */}
                {customTemplate?.footerFormatting && (
                  <div 
                    className="mt-6 pt-4 border-t"
                    style={{
                      textAlign: customTemplate.footerFormatting.textAlign || 'center',
                      color: customTemplate.footerFormatting.color || '#6b7280',
                      fontSize: customTemplate.footerFormatting.fontSize || '14px',
                      fontFamily: customTemplate.footerFormatting.fontFamily || 'Arial, sans-serif',
                      fontWeight: customTemplate.footerFormatting.fontWeight || '400',
                      fontStyle: customTemplate.footerFormatting.fontStyle || 'normal',
                      textDecoration: customTemplate.footerFormatting.textDecoration || 'none',
                      backgroundColor: customTemplate.footerFormatting.backgroundColor || 'transparent',
                      padding: '8px 0'
                    }}
                  >
                    Page 1
                  </div>
                )}

                {/* Action Buttons - Fixed at bottom */}
                <div className="fixed bottom-6 right-6 flex space-x-2 bg-white shadow-lg rounded-lg p-4 border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}`)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending || (!selectedTemplate && !isEditMode)}
                  >
                    {mutation.isPending ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Report" : "Save Report")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
