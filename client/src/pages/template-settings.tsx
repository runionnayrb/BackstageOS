import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import ReportNotesManager from "@/components/report-notes-manager";
import EditableDepartmentHeader from "@/components/editable-department-header";
import InlineFormattingToolbar from "@/components/inline-formatting-toolbar";
import EditableFieldHeading from "@/components/editable-field-heading";
import EditableHeaderFooter from "@/components/editable-header-footer";
import { getAllDepartmentNames, type DepartmentKey } from "@/utils/departmentUtils";
import { formatTimestamp, parseScheduleSettings } from "@/lib/timeUtils";
import type { ShowSettings } from "@/../../shared/schema";
import {
  ArrowLeft,
  Edit3,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Type,
  Calendar,
  Clock,
  User,
  MapPin,
  Settings,
  X
} from "lucide-react";

interface TemplateSettingsParams {
  id: string;
}

interface TemplateField {
  id: string;
  type: "text" | "textarea" | "number" | "date" | "time" | "select" | "checkbox";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select fields
  order: number;
}

interface ProductionTemplate {
  id: string;
  phase: "meetings" | "rehearsal" | "tech" | "previews" | "performance";
  name: string;
  description: string;
  header: string;
  footer: string;
  fields: TemplateField[];
}

const defaultTemplates: Record<string, Omit<ProductionTemplate, "id">> = {
  meetings: {
    phase: "meetings",
    name: "Production Meeting Report",
    description: "Production meetings and team coordination documentation",
    header: "{{showName}} - Production Meeting Report\nDate: {{date}}\nStage Manager: {{stageManager}}",
    footer: "Next meeting due: {{nextMeetingDate}}\nContact: {{contactInfo}}",
    fields: [
      { id: "date", type: "date", label: "Meeting Date", required: true, order: 1 },
      { id: "meetingType", type: "text", label: "Meeting Type", placeholder: "e.g., Production Meeting, Design Meeting", required: true, order: 2 },
      { id: "attendees", type: "textarea", label: "Attendees", placeholder: "List of meeting attendees", required: true, order: 3 },
      { id: "agendaItems", type: "textarea", label: "Agenda Items", placeholder: "Topics discussed", required: false, order: 4 },
      { id: "actionItems", type: "textarea", label: "Action Items", placeholder: "Tasks and assignments", required: true, order: 5 },
      { id: "notes", type: "textarea", label: "Additional Notes", required: false, order: 6 }
    ]
  },
  rehearsal: {
    phase: "rehearsal",
    name: "Rehearsal Report",
    description: "Daily rehearsal progress and notes",
    header: "{{showName}} - Rehearsal Report\nDate: {{date}} | Day {{rehearsalDay}}\nStage Manager: {{stageManager}}",
    footer: "Next rehearsal: {{nextRehearsal}}\nCompany Manager: {{companyManager}}",
    fields: [
      { id: "date", type: "date", label: "Rehearsal Date", required: true, order: 1 },
      { id: "day", type: "number", label: "Rehearsal Day #", required: true, order: 2 },
      { id: "location", type: "text", label: "Location", placeholder: "Rehearsal room/venue", required: true, order: 3 },
      { id: "scenes", type: "textarea", label: "Scenes Worked", placeholder: "Act I, Scene 1-3", required: true, order: 4 },
      { id: "notes", type: "textarea", label: "Director's Notes", required: true, order: 5 },
      { id: "technical", type: "textarea", label: "Technical Notes", placeholder: "Props, costumes, set pieces", required: false, order: 6 },
      { id: "attendance", type: "textarea", label: "Attendance Notes", placeholder: "Late arrivals, absences", required: false, order: 7 }
    ]
  },
  tech: {
    phase: "tech",
    name: "Technical Rehearsal Report", 
    description: "Technical rehearsal and cue integration with department notes",
    header: "{{showName}} - Tech Rehearsal Report\nDate: {{date}} | Tech Day {{techDay}}\nStage Manager: {{stageManager}}",
    footer: "Next tech: {{nextTech}}\nTechnical Director: {{technicalDirector}}",
    fields: [
      { id: "date", type: "date", label: "Date", required: true, order: 1 },
      { id: "day", type: "text", label: "Day", required: true, order: 2 },
      { id: "techDay", type: "number", label: "Tech Day #", required: true, order: 3 },
      { id: "sessionOverview", type: "textarea", label: "Session Overview", placeholder: "Overall goals and achievements for this tech session", required: true, order: 4 },
      { id: "cuesRun", type: "textarea", label: "Cues Rehearsed", placeholder: "Light cues 1-25, Sound cues A-M", required: true, order: 5 },
      
      // Department Notes Sections
      { id: "scenicNotes", type: "textarea", label: "Scenic Department Notes", placeholder: "Set changes, scenic cues, technical notes for scenic department", required: false, order: 6 },
      { id: "lightingNotes", type: "textarea", label: "Lighting Department Notes", placeholder: "Light cues, equipment issues, lighting notes", required: false, order: 7 },
      { id: "audioNotes", type: "textarea", label: "Audio Department Notes", placeholder: "Sound cues, microphone issues, audio equipment notes", required: false, order: 8 },
      { id: "videoNotes", type: "textarea", label: "Video Department Notes", placeholder: "Video cues, projection issues, media notes", required: false, order: 9 },
      { id: "propsNotes", type: "textarea", label: "Props Department Notes", placeholder: "Prop tracking, quick changes, costume notes", required: false, order: 10 },
      
      { id: "outstandingIssues", type: "textarea", label: "Outstanding Issues", placeholder: "Unresolved problems requiring follow-up", required: false, order: 11 },
      { id: "notes", type: "textarea", label: "General Notes", placeholder: "Additional notes and observations", required: false, order: 12 }
    ]
  },
  previews: {
    phase: "previews",
    name: "Preview Performance Report",
    description: "Preview performance tracking and notes",
    header: "{{showName}} - Preview Report\nDate: {{date}} | Preview {{previewNumber}}\nStage Manager: {{stageManager}}",
    footer: "Next preview: {{nextPreview}}\nAudience: {{audienceCount}}",
    fields: [
      { id: "date", type: "date", label: "Preview Date", required: true, order: 1 },
      { id: "previewNumber", type: "number", label: "Preview #", required: true, order: 2 },
      { id: "audienceCount", type: "number", label: "Audience Count", required: false, order: 3 },
      { id: "runtime", type: "text", label: "Runtime", placeholder: "2h 15min", required: false, order: 4 },
      { id: "technical", type: "textarea", label: "Technical Notes", required: false, order: 5 },
      { id: "performance", type: "textarea", label: "Performance Notes", required: true, order: 6 },
      { id: "audienceResponse", type: "textarea", label: "Audience Response", required: false, order: 7 }
    ]
  },
  performance: {
    phase: "performance",
    name: "Performance Report",
    description: "Official performance documentation",
    header: "{{showName}} - Performance Report\nDate: {{date}} | Performance {{performanceNumber}}\nStage Manager: {{stageManager}}",
    footer: "Next performance: {{nextPerformance}}\nBox Office: {{ticketsSold}}/{{capacity}}",
    fields: [
      { id: "date", type: "date", label: "Performance Date", required: true, order: 1 },
      { id: "performanceNumber", type: "number", label: "Performance #", required: true, order: 2 },
      { id: "ticketsSold", type: "number", label: "Tickets Sold", required: false, order: 3 },
      { id: "runtime", type: "text", label: "Total Runtime", placeholder: "2h 18min", required: false, order: 4 },
      { id: "technical", type: "textarea", label: "Technical Issues", placeholder: "Equipment problems, delays", required: false, order: 5 },
      { id: "incidentReport", type: "textarea", label: "Incident Report", placeholder: "Accidents, emergencies, unusual events", required: false, order: 6 },
      { id: "companyNotes", type: "textarea", label: "Company Notes", placeholder: "Cast/crew notes, announcements", required: false, order: 7 }
    ]
  }
};

export default function TemplateSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<TemplateSettingsParams>();
  const projectId = params.id;
  
  const [selectedPhase, setSelectedPhase] = useState<string>("meetings");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, ProductionTemplate>>({});
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Department reordering state
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Array<{ key: DepartmentKey; displayName: string }>>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  




  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: showSettings } = useQuery<ShowSettings>({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Load user-created templates
  const { data: userTemplates } = useQuery({
    queryKey: [`/api/projects/${projectId}/templates`],
  });

  // Initialize templates with defaults and merge with user templates
  useEffect(() => {
    const initialTemplates: Record<string, ProductionTemplate> = {};
    
    // Start with default templates
    Object.entries(defaultTemplates).forEach(([phase, template]) => {
      initialTemplates[phase] = {
        ...template,
        id: `default-${phase}`, // Use string ID for defaults (will be created as new)
      };
    });

    // Override with user-created templates if they exist
    if (userTemplates && Array.isArray(userTemplates)) {
      userTemplates.forEach((userTemplate: any) => {
        if (userTemplate.phase) {
          initialTemplates[userTemplate.phase] = {
            id: userTemplate.id.toString(), // Keep actual DB ID for existing templates
            phase: userTemplate.phase as any,
            name: userTemplate.name,
            description: userTemplate.description || "",
            header: userTemplate.header || "",
            footer: userTemplate.footer || "",
            fields: userTemplate.fields || []
          };
        }
      });
    }
    
    setTemplates(initialTemplates);
  }, [projectId, userTemplates]);

  // Update departments list when settings change (only if not currently reordering)
  useEffect(() => {
    if (showSettings && !isReordering) {
      const departmentOrder = showSettings.departmentOrder as string[] | undefined;
      const departmentNames = showSettings.departmentNames as Record<string, string> | undefined;
      const newDepartments = getAllDepartmentNames(departmentNames, departmentOrder);
      
      // Only update if the order has actually changed to prevent unnecessary re-renders
      if (JSON.stringify(newDepartments.map(d => d.key)) !== JSON.stringify(departments.map(d => d.key))) {
        setDepartments(newDepartments);
      }
    }
  }, [showSettings, isReordering, departments]);

  // Department order mutation
  const saveDepartmentOrderMutation = useMutation({
    mutationFn: async (departmentOrder: string[]) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}/settings/department-order`, {
        departmentOrder
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update the cache immediately with new data
      queryClient.setQueryData([`/api/projects/${projectId}/settings`], data);
      // Then invalidate to trigger a fresh fetch
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/settings`]
      });
      toast({
        title: "Department order saved",
        description: "Changes will persist across sessions",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save department order",
        variant: "destructive",
      });
      // Revert to the saved order from the server on error
      if (showSettings) {
        const departmentOrder = showSettings.departmentOrder as string[] | undefined;
        const departmentNames = showSettings.departmentNames as Record<string, string> | undefined;
        setDepartments(getAllDepartmentNames(departmentNames, departmentOrder));
      }
    },
  });

  // Add department functionality
  const addDepartment = () => {
    if (newDepartmentName.trim()) {
      const newKey = newDepartmentName.toLowerCase().replace(/\s+/g, '_') as DepartmentKey;
      const newDepartment = {
        key: newKey,
        displayName: newDepartmentName.trim()
      };
      
      // Add to local state immediately
      setDepartments([...departments, newDepartment]);
      
      // Update department names and order in backend
      const newDepartmentNames = {
        ...(showSettings?.departmentNames as Record<string, string> || {}),
        [newKey]: newDepartmentName.trim()
      };
      const newOrder = [...departments.map(d => d.key), newKey];
      
      // Save both department names and order
      Promise.all([
        apiRequest("PUT", `/api/projects/${projectId}/settings`, {
          departmentNames: newDepartmentNames
        }),
        saveDepartmentOrderMutation.mutateAsync(newOrder)
      ]).then(() => {
        toast({
          title: "Department added",
          description: `${newDepartmentName} has been added to the list`,
        });
      }).catch(() => {
        // Revert on error
        setDepartments(departments);
        toast({
          title: "Error",
          description: "Failed to add department",
          variant: "destructive",
        });
      });
      
      setNewDepartmentName("");
      setShowAddDialog(false);
    }
  };

  // Remove department functionality
  const removeDepartment = (keyToRemove: DepartmentKey) => {
    const newDepartments = departments.filter(d => d.key !== keyToRemove);
    setDepartments(newDepartments);
    
    // Update department order in backend
    const newOrder = newDepartments.map(d => d.key);
    saveDepartmentOrderMutation.mutate(newOrder, {
      onSuccess: () => {
        toast({
          title: "Department removed",
          description: "Department has been removed from the list",
        });
      },
      onError: () => {
        // Revert on error
        setDepartments(departments);
        toast({
          title: "Error", 
          description: "Failed to remove department",
          variant: "destructive",
        });
      }
    });
  };

  // Field header formatting "Apply to All" functionality
  const applyFormattingToAllFieldHeaders = () => {
    console.log('🔥 Apply to All Field Headers function called!');
    
    // Get the current formatting from the currently editing element
    const activeElement = document.querySelector('[data-field-header-editing="true"]') as HTMLElement;
    if (!activeElement) {
      console.log('No active editing element found');
      return;
    }

    // Extract current formatting from the active element
    const currentFormatting = {
      fontWeight: activeElement.style.fontWeight || 'normal',
      fontStyle: activeElement.style.fontStyle || 'normal',
      textDecoration: activeElement.style.textDecoration || 'none',
      textAlign: activeElement.style.textAlign || 'left',
      fontSize: activeElement.style.fontSize || '14px',
      fontFamily: activeElement.style.fontFamily || 'Arial',
      color: activeElement.style.color || '#000000',
      backgroundColor: activeElement.style.backgroundColor || 'transparent',
      borderTop: activeElement.style.borderTop || 'none',
      borderRight: activeElement.style.borderRight || 'none',
      borderBottom: activeElement.style.borderBottom || 'none',
      borderLeft: activeElement.style.borderLeft || 'none'
    };

    console.log('Current formatting to apply:', currentFormatting);

    // Apply formatting to all field header elements
    const allFieldHeaders = document.querySelectorAll('[data-field-header="true"]');
    console.log('Found field headers to format:', allFieldHeaders.length);
    
    allFieldHeaders.forEach((element) => {
      const htmlElement = element as HTMLElement;
      Object.entries(currentFormatting).forEach(([property, value]) => {
        if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'none' && value !== 'start' && value !== 'normal') {
          const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
          htmlElement.style.setProperty(cssProperty, value);
        }
      });
    });

    // Save formatting to database
    apiRequest("PUT", `/api/projects/${projectId}/settings/field-header-formatting`, {
      formatting: currentFormatting
    }).then(() => {
      toast({
        title: "Formatting applied",
        description: "Field header formatting applied to all fields",
      });
      
      // Invalidate cache to refresh settings
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/settings`]
      });
    }).catch((error) => {
      console.error('Failed to save field header formatting:', error);
      toast({
        title: "Error",
        description: "Failed to save field header formatting",
        variant: "destructive",
      });
    });
  };

  // Drag and drop handlers for department reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isReordering) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    if (!isReordering || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== targetIndex) {
      const newDepartments = [...departments];
      const draggedItem = newDepartments[draggedIndex];
      newDepartments.splice(draggedIndex, 1);
      newDepartments.splice(targetIndex, 0, draggedItem);
      setDepartments(newDepartments);
      setDraggedIndex(targetIndex);
    }
  };

  const handleDragEnd = () => {
    if (!isReordering) return;
    setDraggedIndex(null);
    
    // Save the new order to the database with optimistic update
    const departmentOrder = departments.map(d => d.key);
    
    // Store the current order before mutation for potential rollback
    const currentOrder = [...departments];
    
    saveDepartmentOrderMutation.mutate(departmentOrder, {
      onError: () => {
        // Revert to previous order on error
        setDepartments(currentOrder);
      }
    });
  };

  const addField = () => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      order: currentTemplate.fields.length + 1
    };
    
    setTemplates(prev => ({
      ...prev,
      [selectedPhase]: {
        ...prev[selectedPhase],
        fields: [...prev[selectedPhase].fields, newField]
      }
    }));
  };

  const updateField = (fieldId: string, updates: Partial<TemplateField>) => {
    setTemplates(prev => ({
      ...prev,
      [selectedPhase]: {
        ...prev[selectedPhase],
        fields: prev[selectedPhase].fields.map(field =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }
    }));
  };

  const deleteField = (fieldId: string) => {
    setTemplates(prev => ({
      ...prev,
      [selectedPhase]: {
        ...prev[selectedPhase],
        fields: prev[selectedPhase].fields.filter(field => field.id !== fieldId)
      }
    }));
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const fields = [...currentTemplate.fields];
    const index = fields.findIndex(f => f.id === fieldId);
    
    if ((direction === "up" && index > 0) || (direction === "down" && index < fields.length - 1)) {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
      
      // Update order numbers
      fields.forEach((field, i) => {
        field.order = i + 1;
      });
      
      setTemplates(prev => ({
        ...prev,
        [selectedPhase]: {
          ...prev[selectedPhase],
          fields
        }
      }));
    }
  };

  const saveTemplate = useMutation({
    mutationFn: async (template: ProductionTemplate) => {
      setIsSaving(true);
      
      // Check if this is an existing template (has numeric ID) or new template
      const isExisting = typeof template.id === 'string' && /^\d+$/.test(template.id);
      
      const templateData = {
        name: template.name,
        description: template.description,
        type: template.phase, // Use phase as type
        phase: template.phase,
        header: template.header,
        footer: template.footer,
        fields: template.fields,
      };

      if (isExisting) {
        // Update existing template
        await apiRequest("PATCH", `/api/projects/${projectId}/templates/${template.id}`, templateData);
      } else {
        // Create new template - don't include ID for auto-generation
        await apiRequest("POST", `/api/projects/${projectId}/templates`, templateData);
      }
    },
    onSuccess: () => {
      setIsSaving(false);
      setLastSaved(new Date());
      // Refetch templates to get updated data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/templates`] });
    },
    onError: (error) => {
      setIsSaving(false);
      console.error("Template save error:", error);
      toast({
        title: "Error", 
        description: "Failed to save template",
        variant: "destructive",
      });
    },
  });

  const currentTemplate = templates[selectedPhase];

  if (!project || !currentTemplate) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/shows/${projectId}/reports`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
            <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/shows/${projectId}/global-template-settings`)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Global Settings
            </Button>
            <Button
              onClick={() => setLocation(`/shows/${projectId}/templates/new`)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Template
            </Button>

            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Report Templates</h1>
        </div>

        <Tabs value={selectedPhase} onValueChange={setSelectedPhase} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="rehearsal">Rehearsal</TabsTrigger>
            <TabsTrigger value="tech">Tech</TabsTrigger>
            <TabsTrigger value="previews">Previews</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          


          {Object.entries(templates).map(([phase, template]) => (
            <TabsContent key={phase} value={phase} className="space-y-6">
              {/* Always show inline editable preview mode */}
              <Card className="min-h-[600px]">
                <CardHeader>
                  <div>
                    <CardTitle>
                      {template.name}
                    </CardTitle>
                    {/* Auto-save indicator */}
                    <div className="text-sm text-gray-500 mt-1">
                      {isSaving ? (
                        <span className="flex items-center gap-1">
                          <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-500 rounded-full"></div>
                          Saving...
                        </span>
                      ) : lastSaved ? (
                        <span>
                          Auto-saved at: {(() => {
                            // Parse user's schedule settings for time format and timezone
                            const scheduleSettings = parseScheduleSettings(showSettings?.scheduleSettings);
                            const timeFormat = scheduleSettings.timeFormat === '24' ? '24' : '12';
                            const timezone = scheduleSettings.timezone;
                            
                            return formatTimestamp(lastSaved, timeFormat, timezone);
                          })()}
                        </span>
                      ) : (
                        <span>Auto-saved</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {/* Document-style Preview */}
                  <div className="bg-white min-h-[500px] shadow-lg border border-gray-200 mx-auto" style={{ 
                    width: "8.5in", 
                    padding: "1in",
                    fontFamily: "Arial, sans-serif"
                  }}>
                    {/* Header - Inline Editable */}
                    <div className="text-center mb-6 pb-4 border-b">
                      <EditableHeaderFooter
                        content={template.header}
                        onChange={(newHeader) => {
                          const updatedTemplate = {
                            ...template,
                            header: newHeader
                          };
                          setTemplates(prev => ({
                            ...prev,
                            [phase]: updatedTemplate
                          }));
                          saveTemplate.mutate(updatedTemplate);
                        }}
                        className="text-lg font-semibold text-center"
                        projectId={projectId}
                        type="header"
                      />
                    </div>

                    {/* Fields Preview */}
                    <div className="space-y-6">
                      {/* Regular fields (non-department notes) */}
                      {template.fields
                        .filter(field => !field.id.includes('Notes') || field.id === 'notes')
                        .sort((a, b) => a.order - b.order)
                        .map((field) => (
                          <div key={field.id} className="space-y-2">
                            <EditableFieldHeading
                              content={field.label}
                              onChange={(newLabel) => {
                                const updatedTemplate = {
                                  ...template,
                                  fields: template.fields.map(f =>
                                    f.id === field.id 
                                      ? { ...f, label: newLabel }
                                      : f
                                  )
                                };
                                setTemplates(prev => ({
                                  ...prev,
                                  [phase]: updatedTemplate
                                }));
                                saveTemplate.mutate(updatedTemplate);
                              }}
                              projectId={projectId}
                              onApplyToAll={applyFormattingToAllFieldHeaders}
                            />
                            <div className="border rounded-md px-3 py-2 bg-white text-sm min-h-[40px]">
                              {field.placeholder || "Sample content..."}
                            </div>
                          </div>
                        ))}
                      
                      {/* Department Notes Section - only for tech template */}
                      {selectedPhase === 'tech' && (
                        <div className="space-y-6 mt-8">
                          <div className="flex items-center justify-between border-b pb-2">
                            <div className="text-lg font-semibold text-gray-800">
                              Department Notes
                            </div>
                            <div className="flex gap-2">
                              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Department</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="department-name">Department Name</Label>
                                      <Input
                                        id="department-name"
                                        value={newDepartmentName}
                                        onChange={(e) => setNewDepartmentName(e.target.value)}
                                        placeholder="Enter department name..."
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setShowAddDialog(false);
                                        setNewDepartmentName("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={addDepartment}
                                      disabled={!newDepartmentName.trim()}
                                    >
                                      Add Department
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsReordering(!isReordering)}
                                disabled={saveDepartmentOrderMutation.isPending}
                                className="text-xs"
                              >
                                {saveDepartmentOrderMutation.isPending 
                                  ? "Saving..." 
                                  : (isReordering ? "Done Reordering" : "Re-order")
                                }
                              </Button>
                            </div>
                          </div>

                          
                          <div className="space-y-6" key={departments.map(d => d.key).join('-')}>
                            {departments.map(({ key, displayName }, index) => (
                              <div 
                                key={`${key}-${index}`}
                                draggable={isReordering}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`
                                  relative group
                                  ${isReordering ? 'cursor-move' : ''}
                                  ${draggedIndex === index ? 'bg-blue-50 border-blue-200' : ''}
                                `}
                              >
                                {isReordering && (
                                  <div className="absolute left-0 top-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                )}
                                <div className={isReordering ? 'pl-6' : ''}>
                                  <div className="relative">
                                    <EditableDepartmentHeader
                                      projectId={parseInt(params.id)}
                                      department={key}
                                      displayName={displayName}
                                      isEditing={true}
                                      onNameChange={(newName) => {
                                        queryClient.invalidateQueries({
                                          queryKey: [`/api/projects/${projectId}/settings`]
                                        });
                                      }}
                                      onFormattingChange={(formatting) => {
                                        queryClient.invalidateQueries({
                                          queryKey: [`/api/projects/${projectId}/settings`]
                                        });
                                      }}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeDepartment(key)}
                                      className="absolute right-0 top-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <ReportNotesManager 
                                    reportId={5} 
                                    projectId={parseInt(params.id)}
                                    reportType="tech"
                                    department={key}
                                    isEditing={true}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer - Inline Editable */}
                    <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
                      <EditableHeaderFooter
                        content={template.footer}
                        onChange={(newFooter) => {
                          const updatedTemplate = {
                            ...template,
                            footer: newFooter
                          };
                          setTemplates(prev => ({
                            ...prev,
                            [phase]: updatedTemplate
                          }));
                          saveTemplate.mutate(updatedTemplate);
                        }}
                        className="text-sm text-gray-600 text-center"
                        projectId={projectId}
                        type="footer"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              

            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}