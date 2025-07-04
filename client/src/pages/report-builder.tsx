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
  
  const projectId = parseInt(params.id!);
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
      
      if (existingReport && isEditMode) {
        // Populate form with existing report data
        form.setValue("title", existingReport.title);
        form.setValue("date", existingReport.date ? new Date(existingReport.date).toISOString().split('T')[0] : form.getValues("date"));
        form.setValue("content", existingReport.content || {});
        setSelectedTemplate(existingReport.type);
      } else {
        // Auto-select the template based on report type for new reports
        setSelectedTemplate(reportType);
      }
    }
  }, [projectId, reportType, existingReport, isEditMode]);

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

  // Combine built-in and custom templates
  const customTemplates = Array.isArray(templateData) ? templateData : [];
  
  const allCustomTemplates = customTemplates.map((template: any) => ({
    id: `custom-${template.id}`,
    name: template.name,
    description: template.description || "Custom template",
    icon: FileText,
    color: "bg-gray-100",
    iconColor: "text-gray-600",
    isCustom: true,
    template: template,
  }));

  const templates = [...builtInTemplates, ...allCustomTemplates];

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
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Start Time</div>
                <Input
                  id="startTime"
                  type="time"
                  value={currentContent.startTime || ""}
                  onChange={(e) => form.setValue("content.startTime", e.target.value)}
                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">End Time</div>
                <Input
                  id="endTime"
                  type="time"
                  value={currentContent.endTime || ""}
                  onChange={(e) => form.setValue("content.endTime", e.target.value)}
                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Scenes Rehearsed</div>
              <Input
                id="scenesRehearsed"
                placeholder="e.g., Act 1 Scenes 1-3"
                value={currentContent.scenesRehearsed || ""}
                onChange={(e) => form.setValue("content.scenesRehearsed", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              />
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Notes</div>
              <Textarea
                id="notes"
                rows={4}
                placeholder="Detailed rehearsal notes..."
                value={currentContent.notes || ""}
                onChange={(e) => form.setValue("content.notes", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Rehearsal</div>
              <Textarea
                id="nextRehearsal"
                rows={2}
                placeholder="Plans for the next rehearsal..."
                value={currentContent.nextRehearsal || ""}
                onChange={(e) => form.setValue("content.nextRehearsal", e.target.value)}
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
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Show Time</div>
                <Input
                  id="showTime"
                  type="time"
                  value={currentContent.showTime || ""}
                  onChange={(e) => form.setValue("content.showTime", e.target.value)}
                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">House Count</div>
                <Input
                  id="houseCount"
                  type="number"
                  placeholder="0"
                  value={currentContent.houseCount || ""}
                  onChange={(e) => form.setValue("content.houseCount", parseInt(e.target.value))}
                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-1">House Capacity</div>
                <Input
                  id="houseCapacity"
                  type="number"
                  placeholder="0"
                  value={currentContent.houseCapacity || ""}
                  onChange={(e) => form.setValue("content.houseCapacity", parseInt(e.target.value))}
                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Performance Notes</div>
              <Textarea
                id="performanceNotes"
                rows={4}
                placeholder="Notes about the performance..."
                value={currentContent.performanceNotes || ""}
                onChange={(e) => form.setValue("content.performanceNotes", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Issues/Incidents</div>
              <Textarea
                id="issues"
                rows={3}
                placeholder="Any issues or incidents during the show..."
                value={currentContent.issues || ""}
                onChange={(e) => form.setValue("content.issues", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            
          </>
        );
      
      case "meeting":
        return (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Meeting Type</div>
                <Select value={currentContent.meetingType || ""} onValueChange={(value) => form.setValue("content.meetingType", value)}>
                  <SelectTrigger className="border-0 bg-transparent p-0 focus:ring-0">
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production Meeting</SelectItem>
                    <SelectItem value="design">Design Meeting</SelectItem>
                    <SelectItem value="tech">Tech Meeting</SelectItem>
                    <SelectItem value="cast">Cast Meeting</SelectItem>
                    <SelectItem value="crew">Crew Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Attendees</div>
                <Input
                  id="attendees"
                  placeholder="Number of attendees"
                  value={currentContent.attendees || ""}
                  onChange={(e) => form.setValue("content.attendees", e.target.value)}
                  className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Agenda Items</div>
              <Textarea
                id="agendaItems"
                rows={3}
                placeholder="Main topics discussed..."
                value={currentContent.agendaItems || ""}
                onChange={(e) => form.setValue("content.agendaItems", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Action Items</div>
              <Textarea
                id="actionItems"
                rows={3}
                placeholder="Tasks assigned and deadlines..."
                value={currentContent.actionItems || ""}
                onChange={(e) => form.setValue("content.actionItems", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none resize-none"
              />
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Next Meeting</div>
              <Input
                id="nextMeeting"
                type="datetime-local"
                value={currentContent.nextMeeting || ""}
                onChange={(e) => form.setValue("content.nextMeeting", e.target.value)}
                className="border-0 bg-transparent p-0 focus:ring-0 focus:outline-none"
              />
            </div>
            
          </>
        );
      
      default:
        // Handle custom templates
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
                onChange={(e) => form.setValue(`content.${field.id}`, e.target.value)}
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

        {/* Template Selection - Only show when creating new report */}
        {!isEditMode && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'border-primary bg-blue-50' 
                          : 'border-gray-200 hover:border-primary'
                      }`}
                    >
                      <div className={`p-2 ${template.color} rounded-lg w-fit mb-3`}>
                        <Icon className={`w-6 h-6 ${template.iconColor}`} />
                      </div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
