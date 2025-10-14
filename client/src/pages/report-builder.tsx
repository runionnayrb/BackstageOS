import { useState, useEffect } from "react";
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
import { Clock, Settings, Star, Users, FileText, ArrowLeft } from "lucide-react";
import ReportNotesManager from "@/components/report-notes-manager";

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
  
  console.log('🔍 REPORT BUILDER MODE:', {
    params,
    urlPath,
    isCreatingNew,
    reportId,
    isEditMode
  });

  const { data: project } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: existingReport } = useQuery<any>({
    queryKey: reportId && !isNaN(reportId) ? [`/api/projects/${projectId}/reports/${reportId}`] : ['disabled-query'],
    enabled: isEditMode && !!reportId && !isNaN(reportId as number),
  });

  const { data: templateData, isLoading: templatesLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/templates`],
    enabled: !!projectId,
  });

  const { data: projectSettings, isLoading: settingsLoading } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });
  
  console.log('⏳ Loading States:', { templatesLoading, settingsLoading });
  console.log('📦 Data:', { templateData, projectSettings: !!projectSettings });

  // Filter templates to only show the one matching the current report type
  const customTemplates = Array.isArray(templateData) ? templateData : [];
  
  // Debug logging
  console.log('🔍 REPORT BUILDER DEBUG:');
  console.log('  - Report Type:', reportType);
  console.log('  - Template Data:', templateData);
  console.log('  - Custom Templates:', customTemplates);
  
  // Find the custom template that matches the report type
  // Templates use 'phase' field which corresponds to report type
  const matchingTemplate = customTemplates.find((template: any) => 
    template.type === reportType || template.phase === reportType
  );
  
  console.log('  - Matching Template:', matchingTemplate);
  console.log('  - Has Layout Config:', !!matchingTemplate?.layoutConfiguration);

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
    
    const titleMap: Record<string, string> = {
      'rehearsal': 'New Rehearsal Report',
      'tech': 'New Technical Rehearsal Report',
      'performance': 'New Performance Report',
      'meeting': 'New Production Meeting Report'
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
      console.log('⏳ Still loading settings, waiting...');
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
        // Auto-generate title based on report type
        form.setValue("title", generateReportTitle(reportType));
        
        // ALWAYS use custom template from projectSettings
        if (projectSettings?.layoutConfiguration) {
          console.log('✅ LOADING CUSTOM TEMPLATE from projectSettings');
          setSelectedTemplate('custom-layout');
          
          // Parse layoutConfiguration if it's a string
          let parsedLayout = projectSettings.layoutConfiguration;
          if (typeof parsedLayout === 'string') {
            try {
              parsedLayout = JSON.parse(parsedLayout);
            } catch (e) {
              console.error('Failed to parse layoutConfiguration:', e);
            }
          }
          
          const newTemplate = {
            id: matchingTemplate?.id,
            name: matchingTemplate?.name || `${reportType} Report`,
            type: reportType,
            layoutConfiguration: parsedLayout,
            departmentNames: projectSettings?.departmentNames || {},
            headerFormatting: projectSettings?.headerFormatting,
            footerFormatting: projectSettings?.footerFormatting,
            fieldHeaderFormatting: projectSettings?.fieldHeaderFormatting,
            globalPageMargins: projectSettings?.globalPageMargins,
            defaultHeader: projectSettings?.defaultHeader || '',
            defaultFooter: projectSettings?.defaultFooter || '',
          };
          
          console.log('✅ Custom template loaded:', {
            hasLayout: !!newTemplate.layoutConfiguration,
            layoutItems: newTemplate.layoutConfiguration?.items?.length || 0,
            departmentCount: Object.keys(newTemplate.departmentNames || {}).length,
            headerFormatting: newTemplate.headerFormatting,
            footerFormatting: newTemplate.footerFormatting
          });
          
          setCustomTemplate(newTemplate);
        } else {
          console.error('❌ NO layoutConfiguration found in projectSettings!');
        }
      }
    }
  }, [projectId, reportType, existingReport, isEditMode, matchingTemplate, projectSettings, settingsLoading]);

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
          console.log('📋 Creating report with templateId:', {
            templateId: matchingTemplate.id,
            templateName: matchingTemplate.name,
            hasLayout: !!matchingTemplate.layoutConfiguration
          });
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

  const builtInTemplates = [
    {
      id: "rehearsal",
      name: "Rehearsal Report",
      description: "Daily rehearsal notes and updates",
      icon: Clock,
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "tech",
      name: "Tech Report",
      description: "Technical rehearsal progress",
      icon: Settings,
      color: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      id: "performance",
      name: "Performance Report",
      description: "Show performance notes",
      icon: Star,
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "meeting",
      name: "Production Meeting",
      description: "Meeting minutes and action items",
      icon: Users,
      color: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

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

  // Use custom template if available, otherwise fall back to built-in
  const templates = allCustomTemplates.length > 0 ? allCustomTemplates : builtInTemplates.filter(t => t.id === reportType);

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



  const renderTemplateFields = () => {
    if (!selectedTemplate) return null;

    const currentContent = form.watch("content") || {};

    // Check for custom layout template FIRST before checking built-in templates
    console.log('🖼️ RENDER CHECK:', {
      hasCustomTemplate: !!customTemplate,
      hasLayoutConfig: !!customTemplate?.layoutConfiguration,
      selectedTemplate,
      customTemplateKeys: customTemplate ? Object.keys(customTemplate) : []
    });
    
    // ALWAYS render custom layout template
    if (customTemplate && customTemplate.layoutConfiguration) {
      console.log('✅ RENDERING CUSTOM LAYOUT TEMPLATE');
      return renderLayoutBasedTemplate(customTemplate);
    }

    // If no custom template, show error message
    return (
      <div className="border rounded-lg p-6 bg-yellow-50">
        <div className="text-sm text-gray-600">
          No custom template configuration found. Please set up your template in Template Settings.
        </div>
      </div>
    );
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
        <Card className="min-h-[600px]">
          <CardContent className="p-8">
            {/* Print-style Document Preview */}
            <div className="bg-white min-h-[500px] shadow-lg border border-gray-200" style={{ 
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
                      <div>{form.watch("title") || generateReportTitle(reportType)}</div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
