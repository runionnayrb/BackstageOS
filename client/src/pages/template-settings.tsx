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
      { id: "lightingNotes", type: "textarea", label: "Lighting Notes", required: false, order: 6 },
      { id: "soundNotes", type: "textarea", label: "Sound Notes", required: false, order: 7 },
      { id: "setChanges", type: "textarea", label: "Set Changes", placeholder: "Scenic shifts, automation", required: false, order: 8 },
      { id: "issues", type: "textarea", label: "Technical Issues", placeholder: "Equipment problems, timing issues", required: false, order: 9 },
      { id: "notes", type: "textarea", label: "General Notes", required: false, order: 10 }
    ]
  },
  previews: {
    phase: "previews",
    name: "Preview Performance Report",
    description: "Preview performance documentation",
    header: "{{showName}} - Preview Report\nDate: {{date}} | Preview {{previewNumber}}\nStage Manager: {{stageManager}}",
    footer: "Opening Night: {{openingNight}}\nProducer: {{producer}}",
    fields: [
      { id: "date", type: "date", label: "Preview Date", required: true, order: 1 },
      { id: "previewNumber", type: "number", label: "Preview #", required: true, order: 2 },
      { id: "startTime", type: "time", label: "Curtain Time", required: true, order: 3 },
      { id: "endTime", type: "time", label: "End Time", required: true, order: 4 },
      { id: "attendance", type: "number", label: "Audience Count", required: false, order: 5 },
      { id: "performanceNotes", type: "textarea", label: "Performance Notes", placeholder: "Acting, timing, audience response", required: true, order: 6 },
      { id: "technicalIssues", type: "textarea", label: "Technical Issues", placeholder: "Equipment failures, cue problems", required: false, order: 7 },
      { id: "audienceResponse", type: "textarea", label: "Audience Response", placeholder: "Reaction, feedback, energy", required: false, order: 8 },
      { id: "changes", type: "textarea", label: "Notes for Changes", placeholder: "Adjustments for next performance", required: false, order: 9 }
    ]
  },
  performance: {
    phase: "performance",
    name: "Performance Report",
    description: "Regular performance documentation",
    header: "{{showName}} - Performance Report\nDate: {{date}} | Performance {{performanceNumber}}\nStage Manager: {{stageManager}}",
    footer: "Next performance: {{nextPerformance}}\nBox Office: {{boxOffice}}",
    fields: [
      { id: "date", type: "date", label: "Performance Date", required: true, order: 1 },
      { id: "performanceNumber", type: "number", label: "Performance #", required: true, order: 2 },
      { id: "curtainTime", type: "time", label: "Curtain Time", required: true, order: 3 },
      { id: "endTime", type: "time", label: "End Time", required: true, order: 4 },
      { id: "attendance", type: "number", label: "Audience Count", required: false, order: 5 },
      { id: "understudies", type: "textarea", label: "Understudy Report", placeholder: "Cast substitutions", required: false, order: 6 },
      { id: "performanceNotes", type: "textarea", label: "Performance Notes", placeholder: "Show quality, timing, energy", required: true, order: 7 },
      { id: "technicalIssues", type: "textarea", label: "Technical Issues", placeholder: "Equipment problems, delays", required: false, order: 8 },
      { id: "incidentReport", type: "textarea", label: "Incident Report", placeholder: "Accidents, emergencies, unusual events", required: false, order: 9 },
      { id: "companyNotes", type: "textarea", label: "Company Notes", placeholder: "Cast/crew notes, announcements", required: false, order: 10 }
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
  const [isPreview, setIsPreview] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Record<string, ProductionTemplate>>({});

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: settings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Initialize templates with defaults
  useEffect(() => {
    const initialTemplates: Record<string, ProductionTemplate> = {};
    Object.entries(defaultTemplates).forEach(([phase, template]) => {
      initialTemplates[phase] = {
        ...template,
        id: `${projectId}-${phase}`,
      };
    });
    setTemplates(initialTemplates);
  }, [projectId]);

  const saveTemplate = useMutation({
    mutationFn: async (template: ProductionTemplate) => {
      await apiRequest("POST", `/api/projects/${projectId}/templates`, template);
    },
    onSuccess: () => {
      toast({
        title: "Template Saved",
        description: "Template configuration saved successfully",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    },
  });

  const currentTemplate = templates[selectedPhase];

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
            <Button
              variant="outline"
              onClick={() => setIsPreview(!isPreview)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {isPreview ? "Edit" : "Preview"}
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
              {isPreview ? (
                // Preview Mode
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {template.name} - Preview
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Header Preview */}
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium mb-2">Report Header:</div>
                      <pre className="whitespace-pre-wrap text-sm">{template.header}</pre>
                    </div>

                    {/* Fields Preview */}
                    <div className="space-y-4">
                      {template.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label className="flex items-center gap-2">
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                            </Label>
                            {field.type === "textarea" ? (
                              <Textarea 
                                placeholder={field.placeholder} 
                                className="min-h-[80px]"
                                disabled 
                              />
                            ) : field.type === "select" ? (
                              <div className="p-2 border rounded-md bg-muted text-muted-foreground">
                                Select option...
                              </div>
                            ) : (
                              <Input 
                                type={field.type} 
                                placeholder={field.placeholder}
                                disabled 
                              />
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Footer Preview */}
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium mb-2">Report Footer:</div>
                      <pre className="whitespace-pre-wrap text-sm">{template.footer}</pre>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // Edit Mode
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {template.name}
                          </CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/shows/${projectId}/templates/new?phase=${selectedPhase}`)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit in Builder
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            {isEditing ? "Stop Editing" : "Quick Edit"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Header & Footer Configuration */}
                      {isEditing && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Report Header</Label>
                            <Textarea
                              value={template.header}
                              onChange={(e) => setTemplates(prev => ({
                                ...prev,
                                [phase]: { ...prev[phase], header: e.target.value }
                              }))}
                              placeholder="Template header with variables like {{showName}}, {{date}}"
                              className="min-h-[100px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Report Footer</Label>
                            <Textarea
                              value={template.footer}
                              onChange={(e) => setTemplates(prev => ({
                                ...prev,
                                [phase]: { ...prev[phase], footer: e.target.value }
                              }))}
                              placeholder="Template footer with variables"
                              className="min-h-[100px]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Fields Configuration */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">Report Fields</h3>
                          {isEditing && (
                            <Button onClick={addField} size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Field
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {template.fields
                            .sort((a, b) => a.order - b.order)
                            .map((field, index) => (
                              <Card key={field.id} className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    {isEditing && (
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => moveField(field.id, "up")}
                                          disabled={index === 0}
                                        >
                                          ↑
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => moveField(field.id, "down")}
                                          disabled={index === template.fields.length - 1}
                                        >
                                          ↓
                                        </Button>
                                      </div>
                                    )}
                                    
                                    <div className="flex-1">
                                      {editingField === field.id ? (
                                        <div className="grid md:grid-cols-3 gap-3">
                                          <Input
                                            value={field.label}
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            placeholder="Field label"
                                          />
                                          <select
                                            value={field.type}
                                            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                                            className="px-3 py-2 border rounded-md"
                                          >
                                            <option value="text">Text</option>
                                            <option value="textarea">Textarea</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                            <option value="time">Time</option>
                                            <option value="select">Select</option>
                                            <option value="checkbox">Checkbox</option>
                                          </select>
                                          <Input
                                            value={field.placeholder || ""}
                                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                            placeholder="Placeholder text"
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium">{field.label}</span>
                                          <Badge variant="outline">{field.type}</Badge>
                                          {field.required && <Badge variant="destructive">Required</Badge>}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {isEditing && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingField(editingField === field.id ? null : field.id)}
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteField(field.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}