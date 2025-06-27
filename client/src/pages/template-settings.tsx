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
  ArrowLeft,
  Save,
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
  MapPin
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
  phase: "prep" | "rehearsal" | "tech" | "previews" | "performance";
  name: string;
  description: string;
  header: string;
  footer: string;
  fields: TemplateField[];
}

const defaultTemplates: Record<string, Omit<ProductionTemplate, "id">> = {
  prep: {
    phase: "prep",
    name: "Pre-Production Report",
    description: "Planning and preparation phase documentation",
    header: "{{showName}} - Pre-Production Report\nDate: {{date}}\nStage Manager: {{stageManager}}",
    footer: "Next report due: {{nextReportDate}}\nContact: {{contactInfo}}",
    fields: [
      { id: "date", type: "date", label: "Report Date", required: true, order: 1 },
      { id: "phase", type: "text", label: "Current Phase", placeholder: "e.g., Casting, Design", required: true, order: 2 },
      { id: "progress", type: "textarea", label: "Progress Summary", placeholder: "Key accomplishments this period", required: true, order: 3 },
      { id: "challenges", type: "textarea", label: "Challenges & Issues", placeholder: "Current obstacles and solutions", required: false, order: 4 },
      { id: "nextSteps", type: "textarea", label: "Next Steps", placeholder: "Upcoming priorities", required: true, order: 5 },
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
      { id: "startTime", type: "time", label: "Start Time", required: true, order: 3 },
      { id: "endTime", type: "time", label: "End Time", required: true, order: 4 },
      { id: "location", type: "text", label: "Location", placeholder: "Rehearsal room/venue", required: true, order: 5 },
      { id: "scenes", type: "textarea", label: "Scenes Worked", placeholder: "Act I, Scene 1-3", required: true, order: 6 },
      { id: "notes", type: "textarea", label: "Director's Notes", required: true, order: 7 },
      { id: "technical", type: "textarea", label: "Technical Notes", placeholder: "Props, costumes, set pieces", required: false, order: 8 },
      { id: "attendance", type: "textarea", label: "Attendance Notes", placeholder: "Late arrivals, absences", required: false, order: 9 }
    ]
  },
  tech: {
    phase: "tech",
    name: "Technical Rehearsal Report", 
    description: "Technical rehearsal and cue integration",
    header: "{{showName}} - Tech Rehearsal Report\nDate: {{date}} | Tech Day {{techDay}}\nStage Manager: {{stageManager}}",
    footer: "Next tech: {{nextTech}}\nTechnical Director: {{technicalDirector}}",
    fields: [
      { id: "date", type: "date", label: "Tech Date", required: true, order: 1 },
      { id: "techDay", type: "number", label: "Tech Day #", required: true, order: 2 },
      { id: "startTime", type: "time", label: "Start Time", required: true, order: 3 },
      { id: "endTime", type: "time", label: "End Time", required: true, order: 4 },
      { id: "cuesRun", type: "textarea", label: "Cues Rehearsed", placeholder: "Light cues 1-25, Sound cues A-M", required: true, order: 5 },
      { id: "technical", type: "textarea", label: "Technical Issues", placeholder: "Equipment problems, delays", required: false, order: 6 },
      { id: "notes", type: "textarea", label: "General Notes", required: true, order: 7 }
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
      { id: "startTime", type: "time", label: "Start Time", required: true, order: 4 },
      { id: "runtime", type: "text", label: "Runtime", placeholder: "2h 15min", required: false, order: 5 },
      { id: "technical", type: "textarea", label: "Technical Notes", required: false, order: 6 },
      { id: "performance", type: "textarea", label: "Performance Notes", required: true, order: 7 },
      { id: "audienceResponse", type: "textarea", label: "Audience Response", required: false, order: 8 }
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
      { id: "startTime", type: "time", label: "Actual Start Time", required: true, order: 4 },
      { id: "runtime", type: "text", label: "Total Runtime", placeholder: "2h 18min", required: false, order: 5 },
      { id: "technical", type: "textarea", label: "Technical Issues", placeholder: "Equipment problems, delays", required: false, order: 6 },
      { id: "incidentReport", type: "textarea", label: "Incident Report", placeholder: "Accidents, emergencies, unusual events", required: false, order: 7 },
      { id: "companyNotes", type: "textarea", label: "Company Notes", placeholder: "Cast/crew notes, announcements", required: false, order: 8 }
    ]
  }
};

export default function TemplateSettings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<TemplateSettingsParams>();
  const projectId = params.id;
  
  const [selectedPhase, setSelectedPhase] = useState<string>("prep");
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, ProductionTemplate>>({});

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: settings } = useQuery({
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
      toast({
        title: "Template Saved",
        description: "Template configuration saved successfully",
      });
      setIsEditing(false);
      // Refetch templates to get updated data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/templates`] });
    },
    onError: (error) => {
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
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/settings`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Report Templates</h1>
            <p className="text-muted-foreground mt-2">
              Customize report templates for each production phase
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setLocation(`/shows/${projectId}/templates/new`)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Template
            </Button>
            {isEditing && (
              <Button
                onClick={() => saveTemplate.mutate(currentTemplate)}
                disabled={saveTemplate.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Template
              </Button>
            )}
          </div>
        </div>

        <Tabs value={selectedPhase} onValueChange={setSelectedPhase} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="prep">Prep</TabsTrigger>
            <TabsTrigger value="rehearsal">Rehearsal</TabsTrigger>
            <TabsTrigger value="tech">Tech</TabsTrigger>
            <TabsTrigger value="previews">Previews</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {Object.entries(templates).map(([phase, template]) => (
            <TabsContent key={phase} value={phase} className="space-y-6">
              {!isEditing ? (
                // Preview Mode (Default)
                <Card className="min-h-[600px]">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {template.name}
                        </CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    {/* Document-style Preview */}
                    <div className="bg-white min-h-[500px] shadow-lg border border-gray-200 mx-auto" style={{ 
                      width: "8.5in", 
                      padding: "1in",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      {/* Header */}
                      <div className="text-center mb-6 pb-4 border-b">
                        <div className="whitespace-pre-line text-lg font-semibold">
                          {template.header.replace(/\{\{showName\}\}/g, (project as any)?.name || "Show Name")
                                         .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
                                         .replace(/\{\{reportType\}\}/g, template.name)}
                        </div>
                      </div>

                      {/* Fields Preview */}
                      <div className="space-y-6">
                        {template.fields
                          .sort((a, b) => a.order - b.order)
                          .map((field) => (
                            <div key={field.id} className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <div className="border rounded-md px-3 py-2 bg-white text-sm min-h-[40px]">
                                {field.placeholder || "Sample content..."}
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Footer */}
                      <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
                        <div className="whitespace-pre-line">
                          {template.footer.replace(/\{\{preparedBy\}\}/g, "Stage Manager")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // Edit Mode
                <Card className="min-h-[600px]">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {template.name}
                        </CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Done Editing
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    {/* Document-style Edit Mode */}
                    <div className="bg-white min-h-[500px] shadow-lg border border-gray-200 mx-auto" style={{ 
                      width: "8.5in", 
                      padding: "1in",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      {/* Editable Header */}
                      <div className="text-center mb-6 pb-4 border-b">
                        <Textarea
                          value={template.header}
                          onChange={(e) => setTemplates(prev => ({
                            ...prev,
                            [phase]: { ...prev[phase], header: e.target.value }
                          }))}
                          className="text-center text-lg font-semibold border-0 bg-transparent resize-none whitespace-pre-line p-0 focus:ring-0 focus:outline-none"
                          placeholder="{{showName}} - {{reportType}}&#10;{{date}}"
                        />
                      </div>

                      {/* Editable Fields */}
                      <div className="space-y-6">
                        {template.fields
                          .sort((a, b) => a.order - b.order)
                          .map((field, index) => (
                            <div key={field.id} className="space-y-2 relative group">
                              <div className="flex items-center justify-between">
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                                  className="text-sm font-medium border-0 bg-transparent p-0 focus:ring-0 focus:outline-none h-auto w-auto flex-1"
                                  placeholder="Field label"
                                />
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => moveField(field.id, "up")}
                                    disabled={index === 0}
                                    className="h-6 w-6 p-0"
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => moveField(field.id, "down")}
                                    disabled={index === template.fields.length - 1}
                                    className="h-6 w-6 p-0"
                                  >
                                    ↓
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteField(field.id)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="border rounded-md px-3 py-2 bg-white text-sm min-h-[40px]">
                                <Input
                                  value={field.placeholder || ""}
                                  onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                  className="border-0 p-0 h-auto text-sm bg-transparent focus:ring-0 focus:outline-none"
                                  placeholder="Field placeholder text..."
                                />
                              </div>
                            </div>
                          ))}
                        
                        <div className="text-center pt-4">
                          <Button
                            variant="outline"
                            onClick={addField}
                            className="w-full border-dashed"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Field
                          </Button>
                        </div>
                      </div>

                      {/* Editable Footer */}
                      <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
                        <Textarea
                          value={template.footer}
                          onChange={(e) => setTemplates(prev => ({
                            ...prev,
                            [phase]: { ...prev[phase], footer: e.target.value }
                          }))}
                          className="text-center text-sm text-gray-600 border-0 bg-transparent resize-none whitespace-pre-line p-0 focus:ring-0 focus:outline-none"
                          placeholder="Prepared by: {{preparedBy}}"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}