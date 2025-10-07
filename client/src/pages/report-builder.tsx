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
  const reportId = params.reportId ? parseInt(params.reportId) : null;
  const isEditMode = !!reportId;

  const { data: project } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: existingReport } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/reports/${reportId}`],
    enabled: !!reportId,
  });

  const { data: templateData } = useQuery({
    queryKey: [`/api/projects/${projectId}/templates`],
    enabled: !!projectId,
  });

  const { data: projectSettings } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  // Filter templates to only show the one matching the current report type
  const customTemplates = Array.isArray(templateData) ? templateData : [];
  
  // Find the custom template that matches the report type
  const matchingTemplate = customTemplates.find((template: any) => template.type === reportType);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      projectId: projectId,
      title: "",
      type: reportType || "",
      date: new Date().toISOString().split('T')[0],
      content: {},
    },
  });

  // Set form values when project and report type are available, or when editing existing report
  useEffect(() => {
    if (projectId && reportType) {
      form.setValue("projectId", projectId);
      form.setValue("type", reportType);
      
      console.log('🔍 Report Builder - Loading template for:', reportType);
      console.log('🔍 Matching Template:', matchingTemplate);
      
      if (existingReport && isEditMode) {
        // Populate form with existing report data
        form.setValue("title", existingReport.title);
        form.setValue("date", existingReport.date ? new Date(existingReport.date).toISOString().split('T')[0] : form.getValues("date"));
        form.setValue("content", existingReport.content || {});
        setSelectedTemplate(existingReport.type);
        console.log('📝 Loading existing report');
      } else if (matchingTemplate && matchingTemplate.layoutConfiguration) {
        // Use the template's own layout configuration and data
        const customTemplateId = `custom-layout-${reportType}`;
        setSelectedTemplate(customTemplateId);
        setCustomTemplate({
          ...matchingTemplate,
          departmentNames: projectSettings?.departmentNames || {},
        });
        // Set the title from the template
        form.setValue("title", matchingTemplate.name || "");
        console.log('✅ Using template layout configuration!', customTemplateId);
        console.log('✅ Template name/title:', matchingTemplate.name);
      } else if (matchingTemplate) {
        // Use template without layout configuration
        const customTemplateId = `custom-${matchingTemplate.id}`;
        setSelectedTemplate(customTemplateId);
        setCustomTemplate(matchingTemplate);
        form.setValue("title", matchingTemplate.name || "");
        console.log('📋 Using matching template:', customTemplateId);
      } else {
        // Auto-select the built-in template based on report type
        setSelectedTemplate(reportType);
        console.log('🏗️ Using built-in template:', reportType);
      }
    }
  }, [projectId, reportType, existingReport, isEditMode, matchingTemplate, projectSettings]);

  const mutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      if (isEditMode && reportId) {
        await apiRequest("PUT", `/api/projects/${projectId}/reports/${reportId}`, {
          ...data,
          date: new Date(data.date),
        });
      } else {
        await apiRequest("POST", `/api/projects/${projectId}/reports`, {
          ...data,
          date: new Date(data.date),
        });
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
    
    console.log('🎨 Rendering template fields for:', selectedTemplate);
    console.log('🎨 Custom template:', customTemplate);

    // Check for custom layout template FIRST before checking built-in templates
    if (customTemplate && customTemplate.layoutConfiguration) {
      console.log('✅ Using custom layout template!');
      return renderLayoutBasedTemplate(customTemplate);
    }

    const commonFields = (
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">Summary</div>
        <Textarea
          id="summary"
          rows={3}
          placeholder="Brief summary of today's activities..."
          value={currentContent.summary || ""}
          onChange={(e) => form.setValue("content.summary", e.target.value)}
          className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
        />
      </div>
    );

    switch (selectedTemplate) {
      case "rehearsal":
        return (
          <>
            {commonFields}
            
            {/* Session Information */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Session Focus</div>
                <Select value={currentContent.sessionFocus || ""} onValueChange={(value) => form.setValue("content.sessionFocus", value)}>
                  <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                    <SelectValue placeholder="Select focus area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blocking">Blocking</SelectItem>
                    <SelectItem value="choreography">Choreography</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="character-work">Character Work</SelectItem>
                    <SelectItem value="run-through">Run Through</SelectItem>
                    <SelectItem value="full-rehearsal">Full Rehearsal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Completion Status</div>
                <Select value={currentContent.completionStatus || ""} onValueChange={(value) => form.setValue("content.completionStatus", value)}>
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
              </div>
            </div>

            {/* Session Overview */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Session Overview</div>
              <Textarea
                id="sessionOverview"
                rows={3}
                placeholder="Brief overview of what was accomplished in this rehearsal session..."
                value={currentContent.sessionOverview || ""}
                onChange={(e) => form.setValue("content.sessionOverview", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>

            {/* Department Notes - Enhanced with visual indicators */}
            <div className="mb-6">
              <div className="text-lg font-semibold text-gray-800 mb-2">Department Notes</div>
              <div className="text-sm text-gray-600 mb-4">Add numbered notes for each department. These will appear as organized lists in your report.</div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Scenic
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="scenic"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding scenic department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Lighting
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="lighting"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding lighting department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Audio
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="audio"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding audio department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Video
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="video"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding video department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Props
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="props"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding props department notes...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Outstanding Issues</div>
              <Textarea
                id="outstandingIssues"
                rows={3}
                placeholder="Issues that need to be resolved before next session..."
                value={currentContent.outstandingIssues || ""}
                onChange={(e) => form.setValue("content.outstandingIssues", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Session Goals</div>
              <Textarea
                id="nextSessionGoals"
                rows={2}
                placeholder="Goals for the next rehearsal session..."
                value={currentContent.nextSessionGoals || ""}
                onChange={(e) => form.setValue("content.nextSessionGoals", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
          </>
        );
      
      case "tech":
        return (
          <>
            {commonFields}
            
            {/* Session Information */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Session Focus</div>
                <Select value={currentContent.sessionFocus || ""} onValueChange={(value) => form.setValue("content.sessionFocus", value)}>
                  <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                    <SelectValue placeholder="Select focus area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lighting">Lighting</SelectItem>
                    <SelectItem value="sound">Sound</SelectItem>
                    <SelectItem value="set-changes">Set Changes</SelectItem>
                    <SelectItem value="costumes">Costumes</SelectItem>
                    <SelectItem value="props">Props</SelectItem>
                    <SelectItem value="full-technical">Full Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Completion Status</div>
                <Select value={currentContent.completionStatus || ""} onValueChange={(value) => form.setValue("content.completionStatus", value)}>
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
              </div>
            </div>

            {/* Session Overview */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Session Overview</div>
              <Textarea
                id="sessionOverview"
                rows={3}
                placeholder="Brief overview of what was accomplished in this tech session..."
                value={currentContent.sessionOverview || ""}
                onChange={(e) => form.setValue("content.sessionOverview", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>

            {/* Department Notes - Enhanced with visual indicators */}
            <div className="mb-6">
              <div className="text-lg font-semibold text-gray-800 mb-2">Department Notes</div>
              <div className="text-sm text-gray-600 mb-4">Add numbered notes for each department. These will appear as organized lists in your report.</div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Scenic
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="scenic"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding scenic department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Lighting
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="lighting"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding lighting department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Audio
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="audio"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding audio department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Video
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="video"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding video department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Props
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="props"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding props department notes...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Outstanding Issues</div>
              <Textarea
                id="outstandingIssues"
                rows={3}
                placeholder="Issues that need to be resolved before next session..."
                value={currentContent.outstandingIssues || ""}
                onChange={(e) => form.setValue("content.outstandingIssues", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Session Goals</div>
              <Textarea
                id="nextSessionGoals"
                rows={2}
                placeholder="Goals for the next tech session..."
                value={currentContent.nextSessionGoals || ""}
                onChange={(e) => form.setValue("content.nextSessionGoals", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
          </>
        );
      
      case "performance":
        return (
          <>
            {commonFields}
            
            {/* Session Information */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Session Focus</div>
                <Select value={currentContent.sessionFocus || ""} onValueChange={(value) => form.setValue("content.sessionFocus", value)}>
                  <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                    <SelectValue placeholder="Select focus area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matinee">Matinee</SelectItem>
                    <SelectItem value="evening">Evening Performance</SelectItem>
                    <SelectItem value="opening-night">Opening Night</SelectItem>
                    <SelectItem value="closing-night">Closing Night</SelectItem>
                    <SelectItem value="special-event">Special Event</SelectItem>
                    <SelectItem value="understudy">Understudy Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Completion Status</div>
                <Select value={currentContent.completionStatus || ""} onValueChange={(value) => form.setValue("content.completionStatus", value)}>
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
              </div>
            </div>

            {/* Session Overview */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Session Overview</div>
              <Textarea
                id="sessionOverview"
                rows={3}
                placeholder="Brief overview of the performance..."
                value={currentContent.sessionOverview || ""}
                onChange={(e) => form.setValue("content.sessionOverview", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>

            {/* Department Notes - Enhanced with visual indicators */}
            <div className="mb-6">
              <div className="text-lg font-semibold text-gray-800 mb-2">Department Notes</div>
              <div className="text-sm text-gray-600 mb-4">Add numbered notes for each department. These will appear as organized lists in your report.</div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Scenic
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="scenic"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding scenic department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Lighting
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="lighting"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding lighting department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Audio
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="audio"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding audio department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Video
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="video"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding video department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Props
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="props"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding props department notes...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Outstanding Issues</div>
              <Textarea
                id="outstandingIssues"
                rows={3}
                placeholder="Issues that need to be resolved before next session..."
                value={currentContent.outstandingIssues || ""}
                onChange={(e) => form.setValue("content.outstandingIssues", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Session Goals</div>
              <Textarea
                id="nextSessionGoals"
                rows={2}
                placeholder="Goals for the next performance..."
                value={currentContent.nextSessionGoals || ""}
                onChange={(e) => form.setValue("content.nextSessionGoals", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
          </>
        );
      
      case "meeting":
        return (
          <>
            {commonFields}
            
            {/* Session Information */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Session Focus</div>
                <Select value={currentContent.sessionFocus || ""} onValueChange={(value) => form.setValue("content.sessionFocus", value)}>
                  <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                    <SelectValue placeholder="Select focus area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production Meeting</SelectItem>
                    <SelectItem value="design">Design Meeting</SelectItem>
                    <SelectItem value="tech">Tech Meeting</SelectItem>
                    <SelectItem value="cast">Cast Meeting</SelectItem>
                    <SelectItem value="crew">Crew Meeting</SelectItem>
                    <SelectItem value="department-heads">Department Heads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Completion Status</div>
                <Select value={currentContent.completionStatus || ""} onValueChange={(value) => form.setValue("content.completionStatus", value)}>
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
              </div>
            </div>

            {/* Session Overview */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Session Overview</div>
              <Textarea
                id="sessionOverview"
                rows={3}
                placeholder="Brief overview of what was discussed in this meeting..."
                value={currentContent.sessionOverview || ""}
                onChange={(e) => form.setValue("content.sessionOverview", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>

            {/* Department Notes - Enhanced with visual indicators */}
            <div className="mb-6">
              <div className="text-lg font-semibold text-gray-800 mb-2">Department Notes</div>
              <div className="text-sm text-gray-600 mb-4">Add numbered notes for each department. These will appear as organized lists in your report.</div>
              
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Scenic
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="scenic"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding scenic department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Lighting
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="lighting"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding lighting department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Audio
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="audio"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding audio department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Video
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="video"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding video department notes...
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    Props
                  </div>
                  {reportId ? (
                    <ReportNotesManager 
                      reportId={reportId} 
                      projectId={projectId}
                      reportType={reportType || ""}
                      department="props"
                    />
                  ) : (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-sm text-gray-600 italic">
                        Save this report to start adding props department notes...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Outstanding Issues</div>
              <Textarea
                id="outstandingIssues"
                rows={3}
                placeholder="Issues that need to be resolved before next session..."
                value={currentContent.outstandingIssues || ""}
                onChange={(e) => form.setValue("content.outstandingIssues", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Session Goals</div>
              <Textarea
                id="nextSessionGoals"
                rows={2}
                placeholder="Goals for the next meeting..."
                value={currentContent.nextSessionGoals || ""}
                onChange={(e) => form.setValue("content.nextSessionGoals", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
          </>
        );
      
      default:
        // Handle custom templates with layoutConfiguration
        if (customTemplate && customTemplate.layoutConfiguration) {
          return renderLayoutBasedTemplate(customTemplate);
        }
        // Handle old-style custom templates with fields
        if (customTemplate && customTemplate.fields) {
          return (
            <>
              {commonFields}
              {renderCustomFields(customTemplate.fields)}
            </>
          );
        }
        return (
          <>
            {commonFields}
          </>
        );
    }
  };

  const renderLayoutBasedTemplate = (template: any) => {
    const currentContent = form.watch("content") || {};
    const { layoutConfiguration } = template;
    
    if (!layoutConfiguration || !layoutConfiguration.items) {
      return <div>Template configuration error</div>;
    }

    // Extract unique departments and custom fields from layout
    const departments = new Set<string>();
    const customFields: any[] = [];
    
    layoutConfiguration.items.forEach((item: any) => {
      if (item.type === 'grouped-section' && item.content?.department) {
        departments.add(item.content.department);
      } else if (item.type === 'grouped-section' && item.content?.fieldId) {
        customFields.push({
          id: item.content.fieldId,
          label: item.content.label || item.content.fieldId,
        });
      } else if (item.type === 'field-section' && item.content?.fieldId) {
        customFields.push({
          id: item.content.fieldId,
          label: item.content.label || item.content.fieldId,
        });
      }
    });

    return (
      <>
        {/* Render custom fields first */}
        {customFields.map((field) => (
          <div key={field.id} className="mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-2">{field.label}</div>
            <Textarea
              id={field.id}
              rows={3}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              value={currentContent[field.id] || ""}
              onChange={(e) => form.setValue(`content.${field.id}`, e.target.value)}
              className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
            />
          </div>
        ))}

        {/* Render department sections */}
        {Array.from(departments).length > 0 && (
          <div className="mb-6">
            <div className="text-lg font-semibold text-gray-800 mb-4">Department Notes</div>
            <div className="space-y-6">
              {Array.from(departments).map((department) => {
                const deptDisplayName = template.departmentNames?.[department] || department;
                return (
                  <div key={department}>
                    <div className="text-sm font-semibold text-gray-700 mb-2">{deptDisplayName}</div>
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
                          Save this report to start adding {deptDisplayName.toLowerCase()} department notes...
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{isEditMode ? "Edit Report" : "Report Builder"}</h2>
          <p className="text-gray-600">{isEditMode ? "Modify your production report" : "Create and customize production reports"}</p>
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
                {/* Header */}
                <div className="text-center mb-6 pb-4 border-b">
                  <Input
                    {...form.register("title")}
                    placeholder="Report Title"
                    className="text-center text-lg font-semibold border-0 bg-transparent resize-none p-0 focus:ring-0 focus:outline-none"
                  />
                  <div className="text-sm text-gray-600 mt-2">
                    {project?.name || 'Loading...'} - {new Date(form.watch("date") || new Date()).toLocaleDateString()}
                  </div>
                  <Input
                    type="date"
                    {...form.register("date")}
                    className="text-center text-sm border-0 bg-transparent p-0 focus:ring-0 focus:outline-none mt-1"
                  />
                </div>

                {/* Document Fields */}
                <div className="space-y-4">
                  {renderTemplateFields()}
                </div>

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
