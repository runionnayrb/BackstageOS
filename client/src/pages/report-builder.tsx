import { useState, useEffect, useRef, createRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, Settings, Star, Users, FileText, ArrowLeft, Bold, Italic, Underline, List, ListOrdered } from "lucide-react";
import ReportNotesManager from "@/components/report-notes-manager";
import ReportNotesFilter from "@/components/report-notes-filter";
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
  const focusedFieldLabelRef = useRef<string | null>(null);
  const initializedFieldsRef = useRef<Set<number>>(new Set());
  const defaultValuesRef = useRef<Record<number, string>>({}); // Track default values per field
  const contentRef = useRef<Record<string, any>>({}); // Track content without re-rendering
  
  // Extract template ID from query params
  const searchParams = new URLSearchParams(window.location.search);
  const templateQueryParam = searchParams.get('template');
  
  // Parse params early (use 0 as fallback for hooks, will guard later)
  const projectId = params.id ? parseInt(params.id) : 0;
  const reportType = params.type || "";
  
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

  // Report notes filter state
  const [noteFilters, setNoteFilters] = useState<Record<string, { priorities: string[]; statuses: string[]; assignees: number[] }>>({});

  // Find the template matching the query param, report's templateId, or report type
  let matchingTemplate = null;
  
  // If editing an existing report, use its templateId first
  if (isEditMode && existingReport?.templateId && Array.isArray(templatesV2)) {
    matchingTemplate = templatesV2.find((t: any) => t.id === existingReport.templateId);
    if (matchingTemplate) {
      console.log('✅ Loaded template from existing report:', existingReport.templateId, matchingTemplate);
    } else {
      console.warn('⚠️ Template ID from report not found:', existingReport.templateId);
    }
  }
  
  // If template ID is provided in query params, use it
  if (!matchingTemplate && templateQueryParam && Array.isArray(templatesV2)) {
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
        const content = existingReport.content || {};
        
        // Hydrate content with template rich-text formatting
        // If stored content is plain text that matches an untouched default, use template's rich-text version
        if (matchingTemplate?.sections) {
          const hydratedContent = { ...content };
          
          for (const section of matchingTemplate.sections) {
            if (section.fields) {
              for (const field of section.fields) {
                const storedValue = hydratedContent[field.label];
                const templateDefault = field.defaultValue || "";
                
                // Extract plain text from template default (strip HTML tags)
                const plainTemplateDefault = templateDefault.replace(/<[^>]*>/g, '').trim();
                
                // Check if stored value is plain text that matches the template default
                // or if it's empty/undefined - in these cases, use the template's rich-text version
                if (storedValue !== undefined && storedValue !== null) {
                  const storedPlainText = String(storedValue).replace(/<[^>]*>/g, '').trim();
                  
                  // If stored plain text matches template default but lacks HTML formatting, use template version
                  if (storedPlainText === plainTemplateDefault && !String(storedValue).includes('<ol') && !String(storedValue).includes('<ul')) {
                    console.log(`🔄 Hydrating field "${field.label}" with template rich-text formatting`);
                    hydratedContent[field.label] = templateDefault;
                  }
                }
              }
            }
          }
          
          form.setValue("content", hydratedContent);
          contentRef.current = hydratedContent;
        } else {
          form.setValue("content", content);
          contentRef.current = { ...content };
        }
        
        setSelectedTemplate('custom-layout');
        
        // Load the template so fields have access to defaultValues
        if (matchingTemplate) {
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
          
          initializedFieldsRef.current.clear();
          setCustomTemplate(newTemplate);
        }
      } else {
        // Auto-generate title based on template name (most up-to-date source)
        const reportTitle = matchingTemplate?.name || currentReportType?.name || generateReportTitle(reportType);
        form.setValue("title", reportTitle);
        
        // ALWAYS use custom template from matchingTemplate when available
        if (matchingTemplate) {
          console.log('⚙️ Setting customTemplate from matchingTemplate:', matchingTemplate);
          setSelectedTemplate('custom-layout');
          
          // Reset initialized fields when template changes
          initializedFieldsRef.current.clear();
          
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
      // Sync contentRef to data before sending
      data.content = { ...contentRef.current };
      
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
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes/all`] });
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

  // Guard against missing parameters (AFTER all hooks to respect React rules)
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
    
    try {
      editor.focus();
      const selection = window.getSelection();
      if (!selection) return;
      
      // For list commands, manually create the list structure
      if (command === "ul" || command === "ol") {
        const listTag = command === "ul" ? "ul" : "ol";
        
        // Get current selection or position
        if (selection.rangeCount === 0) {
          // No selection, insert at end
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString() || "Item";
        
        // Create list element
        const listEl = document.createElement(listTag);
        listEl.style.listStyleType = command === "ul" ? "disc" : "decimal";
        listEl.style.paddingLeft = "20px";
        listEl.style.marginLeft = "0";
        
        // Create list item
        const itemEl = document.createElement("li");
        itemEl.textContent = selectedText;
        itemEl.style.marginLeft = "0";
        
        listEl.appendChild(itemEl);
        
        // Insert the list
        range.deleteContents();
        range.insertNode(listEl);
        
        // Position cursor after the list
        const newRange = document.createRange();
        newRange.setStartAfter(listEl);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // For other formatting commands
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
        }
      }
      
      // Ensure editor stays focused after command
      editor.focus();
      
      // Update contentRef with new content
      if (focusedFieldLabelRef.current) {
        contentRef.current[focusedFieldLabelRef.current] = editor.innerHTML;
      }
    } catch (error) {
      console.error("Formatting error:", error);
      editor.focus();
    }
  };

  const renderTemplateFields = () => {
    if (!selectedTemplate || !customTemplate) return null;

    const currentContent = contentRef.current;
    console.log('🎯 renderTemplateFields called with customTemplate:', customTemplate);
    console.log('🎯 customTemplate.sections:', customTemplate?.sections);
    
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
                                if (!el) return;
                                console.log('🔄 Ref callback for field:', field.label, 'already initialized:', initializedFieldsRef.current.has(field.id));
                                // Only update departmentFieldRefs, not focusedEditorRef
                                // focusedEditorRef should only be updated in onFocus
                                if (field.departmentKey && departmentFieldRefs.current[field.id]) {
                                  (departmentFieldRefs.current[field.id] as any).current = el;
                                }
                                // Initialize only once with default value or existing content
                                if (!initializedFieldsRef.current.has(field.id)) {
                                  console.log('📝 Initializing field:', field.label, 'defaultValue:', field.defaultValue);
                                  initializedFieldsRef.current.add(field.id);
                                  let defaultValue = field.defaultValue || "";
                                  
                                  // Wrap in list if not already a list structure
                                  if (defaultValue && !defaultValue.includes("<ol") && !defaultValue.includes("<ul")) {
                                    defaultValue = `<ol style="list-style-type: decimal; padding-left: 20px; margin-left: 0;"><li style="margin-left: 0;">${defaultValue}</li></ol>`;
                                  } else {
                                    // Ensure existing list HTML has inline styles to display numbers/bullets
                                    if (defaultValue.includes("<ol")) {
                                      defaultValue = defaultValue.replace(/<ol/g, '<ol style="list-style-type: decimal; padding-left: 20px; margin-left: 0;"');
                                      defaultValue = defaultValue.replace(/<li/g, '<li style="margin-left: 0;"');
                                    }
                                    if (defaultValue.includes("<ul")) {
                                      defaultValue = defaultValue.replace(/<ul/g, '<ul style="list-style-type: disc; padding-left: 20px; margin-left: 0;"');
                                      defaultValue = defaultValue.replace(/<li/g, '<li style="margin-left: 0;"');
                                    }
                                  }
                                  
                                  defaultValuesRef.current[field.id] = defaultValue;
                                  // Use content if it exists and is not empty, otherwise use default
                                  let content = contentRef.current[field.label];
                                  
                                  // Apply list structure to content too
                                  if (content && content.trim()) {
                                    if (!content.includes("<ol") && !content.includes("<ul")) {
                                      content = `<ol style="list-style-type: decimal; padding-left: 20px; margin-left: 0;"><li style="margin-left: 0;">${content}</li></ol>`;
                                    } else {
                                      if (content.includes("<ol")) {
                                        content = content.replace(/<ol/g, '<ol style="list-style-type: decimal; padding-left: 20px; margin-left: 0;"');
                                        content = content.replace(/<li/g, '<li style="margin-left: 0;"');
                                      }
                                      if (content.includes("<ul")) {
                                        content = content.replace(/<ul/g, '<ul style="list-style-type: disc; padding-left: 20px; margin-left: 0;"');
                                        content = content.replace(/<li/g, '<li style="margin-left: 0;"');
                                      }
                                    }
                                  }
                                  
                                  el.innerHTML = (content && content.trim()) ? content : defaultValue;
                                }
                              }}
                              contentEditable
                              suppressContentEditableWarning
                              onFocus={(e) => {
                                focusedEditorRef.current = e.currentTarget;
                                focusedFieldLabelRef.current = field.label;
                                
                                // For HTML lists (proper numbered/bullet lists)
                                const currentHTML = e.currentTarget.innerHTML;
                                if (currentHTML.includes("<ol") || currentHTML.includes("<ul")) {
                                  // Check if this is the default "Nothing today." text
                                  const defaultValue = defaultValuesRef.current[field.id] || "";
                                  if (currentHTML === defaultValue && defaultValue.includes("Nothing today")) {
                                    // Clear the default text but keep the list structure
                                    const listType = currentHTML.includes("<ol") ? "ol" : "ul";
                                    const newHTML = currentHTML.replace(/Nothing today\.?/g, "");
                                    e.currentTarget.innerHTML = newHTML;
                                  }
                                  
                                  // Move cursor to end of first list item for editing
                                  const firstLi = e.currentTarget.querySelector("li");
                                  if (firstLi) {
                                    const range = document.createRange();
                                    const sel = window.getSelection();
                                    range.setStart(firstLi, firstLi.childNodes.length);
                                    range.collapse(true);
                                    sel?.removeAllRanges();
                                    sel?.addRange(range);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const content = e.currentTarget.innerHTML.trim();
                                const defaultValue = defaultValuesRef.current[field.id] || "";
                                
                                // Get the actual text content without HTML tags
                                const textContent = e.currentTarget.textContent?.trim() || "";
                                
                                // Check if content is empty or just the default value
                                const isDefaultListStructure = content === defaultValue || 
                                  (content.includes("<li></li>") || 
                                   content.match(/<ol[^>]*>\s*<li[^>]*>\s*<\/li>\s*<\/ol>/) ||
                                   content.match(/<ul[^>]*>\s*<li[^>]*>\s*<\/li>\s*<\/ul>/));
                                
                                // If field is empty (no text content) or matches default, restore default
                                if (!content || !textContent || isDefaultListStructure) {
                                  e.currentTarget.innerHTML = defaultValue;
                                  contentRef.current[field.label] = defaultValue;
                                } else {
                                  // User has entered content, track it
                                  contentRef.current[field.label] = e.currentTarget.innerHTML;
                                }
                              }}
                              className="text-sm outline-none whitespace-normal [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:ml-0"
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
                              contentRef.current[field.label] = e.target.value;
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
                              contentRef.current[field.label] = e.target.value;
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
                              contentRef.current[field.label] = e.target.value;
                            }}
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                          />
                        )}
                        {field.type === "time" && (
                          <Input
                            type="time"
                            value={currentContent[field.label] || field.defaultValue || ""}
                            onChange={(e) => {
                              contentRef.current[field.label] = e.target.value;
                            }}
                            className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                          />
                        )}
                        {field.type === "checkbox" && (
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              checked={currentContent[field.label] === "true" || field.defaultValue === "true"}
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
                          <Select value={currentContent[field.label] || field.defaultValue || ""} onValueChange={(value) => {
                            contentRef.current[field.label] = value;
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
    const currentContent = contentRef.current;
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
                    onChange={(e) => {
                      contentRef.current[fieldId] = e.target.value;
                    }}
                    className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
                  />
                </div>
              );
            }
            
            if (isDepartment) {
              const department = section.content.department;
              const displayName = template.departmentNames?.[department] || section.content.displayName || department;
              const departmentFilters = noteFilters[department] || { priorities: [], statuses: [], assignees: [] };
              
              return (
                <div key={section.id} className="mb-6">
                  <div 
                    className="flex items-center justify-between gap-2 mb-2"
                    style={{
                      backgroundColor: fieldHeaderFormatting?.backgroundColor || '#000000'
                    }}
                  >
                    <div 
                      className="text-sm font-bold px-2 py-1 flex-1"
                      style={{
                        color: fieldHeaderFormatting?.color || '#ffffff',
                        fontFamily: fieldHeaderFormatting?.fontFamily || 'Arial',
                        fontSize: fieldHeaderFormatting?.fontSize || '14px'
                      }}
                    >
                      {displayName}
                    </div>
                    {reportId && (
                      <div className="pr-2">
                        <ReportNotesFilter
                          selectedPriorities={departmentFilters.priorities}
                          onPriorityFilterChange={(priorities) => {
                            setNoteFilters(prev => ({
                              ...prev,
                              [department]: { ...prev[department], priorities }
                            }));
                          }}
                          selectedStatuses={departmentFilters.statuses}
                          onStatusFilterChange={(statuses) => {
                            setNoteFilters(prev => ({
                              ...prev,
                              [department]: { ...prev[department], statuses }
                            }));
                          }}
                          selectedAssignees={departmentFilters.assignees}
                          onAssigneeFilterChange={(assignees) => {
                            setNoteFilters(prev => ({
                              ...prev,
                              [department]: { ...prev[department], assignees }
                            }));
                          }}
                          teamMembers={teamMembers}
                        />
                      </div>
                    )}
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department={department}
                      selectedPriorities={departmentFilters.priorities}
                      selectedStatuses={departmentFilters.statuses}
                      selectedAssignees={departmentFilters.assignees}
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
    const currentContent = contentRef.current;
    
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
                onChange={(e) => {
                  contentRef.current[field.id] = e.target.value;
                }}
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
                onChange={(e) => {
                  contentRef.current[field.id] = e.target.value;
                }}
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
                onChange={(e) => {
                  contentRef.current[field.id] = parseInt(e.target.value);
                }}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              />
            </div>
          );
          
        case 'date':
          const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedDate = e.target.value;
            contentRef.current[field.id] = selectedDate;
            
            // Auto-populate day field if it exists
            if (selectedDate && customTemplate?.fields) {
              const dayField = customTemplate.fields.find((f: any) => f.id === 'day');
              if (dayField) {
                const date = new Date(selectedDate);
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = dayNames[date.getDay()];
                contentRef.current['day'] = dayName;
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
                onChange={(e) => {
                  contentRef.current[field.id] = e.target.value;
                }}
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
              <Select value={currentContent[field.id] || ""} onValueChange={(value) => {
                contentRef.current[field.id] = value;
              }}>
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
                onChange={(e) => {
                  contentRef.current[field.id] = e.target.checked;
                }}
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{generatePageTitle(reportType || "", isEditMode)}</h1>
            <p className="text-gray-600">{project?.name}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}/reports/${reportType}`)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              variant="default"
              size="sm"
              onClick={form.handleSubmit(onSubmit)}
              disabled={mutation.isPending || (!selectedTemplate && !isEditMode)}
            >
              {mutation.isPending ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Save" : "Save Report")}
            </Button>
          </div>
        </div>

      {/* Template Selection - Hidden since template is auto-selected based on report type */}

      {/* Report Form */}
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
              <div>{form.getValues("title") || matchingTemplate?.name || currentReportType?.name || generateReportTitle(reportType)}</div>
              <div style={{ marginTop: '8px' }}>{project?.name || 'Show Name'}</div>
              <div style={{ marginTop: '4px' }}>{new Date(form.getValues("date") || new Date()).toLocaleDateString()}</div>
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

      </form>
      </div>
    </div>
  );
}
