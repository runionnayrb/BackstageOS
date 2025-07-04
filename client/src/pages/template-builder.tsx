// Cache bust - v3
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Eye, Edit3, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TemplateField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "time" | "select" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select fields
  order: number;
}

interface ReportTemplate {
  id?: number;
  name?: string;
  description?: string;
  type?: string;
  phase?: string;
  header?: string;
  footer?: string;
  fields?: TemplateField[];
}

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Report type is required"),
  phase: z.string().min(1, "Production phase is required"),
  header: z.string().optional(),
  footer: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

const REPORT_TYPES = [
  { value: "rehearsal", label: "Rehearsal Report" },
  { value: "tech", label: "Tech Report" },
  { value: "performance", label: "Performance Report" },
  { value: "meeting", label: "Meeting Notes" },
  { value: "daily", label: "Daily Report" },
];

const PRODUCTION_PHASES = [
  { value: "meetings", label: "Meetings" },
  { value: "rehearsal", label: "Rehearsal" },
  { value: "tech", label: "Tech Rehearsals" },
  { value: "previews", label: "Previews" },
  { value: "performance", label: "Performance" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

export default function TemplateBuilder() {
  const { id: projectId, templateId } = useParams<{ id: string; templateId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get phase from URL params if editing an existing template
  const urlParams = new URLSearchParams(window.location.search);
  const phaseParam = urlParams.get('phase');

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, any>>({});

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      phase: phaseParam || "",
      header: "{{showName}} - {{reportType}}\n{{date}}",
      footer: "Prepared by: {{preparedBy}}",
    },
  });

  // Fetch project data
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Fetch template data if editing
  const { data: template, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/templates/${templateId}`],
    enabled: !!templateId,
  });

  // Load template data when available
  useEffect(() => {
    if (template) {
      form.reset({
        name: (template as any).name || "",
        description: (template as any).description || "",
        type: (template as any).type || "",
        phase: (template as any).phase || "",
        header: (template as any).header || "{{showName}} - {{reportType}}\n{{date}}",
        footer: (template as any).footer || "Prepared by: {{preparedBy}}",
      });

      if ((template as any).fields && Array.isArray((template as any).fields)) {
        setFields((template as any).fields);
        
        // Set up sample data
        const newSampleData: Record<string, any> = {};
        (template as any).fields.forEach((field: TemplateField) => {
          newSampleData[field.id] = getSampleValue(field);
        });
        setSampleData(newSampleData);
      }
    }
  }, [template, form]);

  const getSampleValue = (field: TemplateField) => {
    switch (field.type) {
      case "text":
        return "Sample text";
      case "textarea":
        return "This is sample text for a larger text area field.";
      case "number":
        return "42";
      case "date":
        return "2024-01-15";
      case "time":
        return "19:30";
      case "select":
        return field.options?.[0] || "Option 1";
      case "checkbox":
        return true;
      default:
        return "";
    }
  };

  const addField = () => {
    const newField: TemplateField = {
      id: Date.now().toString(),
      label: "New Field",
      type: "text",
      required: false,
      placeholder: "",
      order: fields.length,
    };
    setFields([...fields, newField]);
    setSampleData(prev => ({ ...prev, [newField.id]: getSampleValue(newField) }));
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
    
    if (updates.type) {
      const field = fields.find(f => f.id === id);
      if (field) {
        const newField = { ...field, ...updates };
        setSampleData(prev => ({ ...prev, [id]: getSampleValue(newField) }));
      }
    }
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
    setSampleData(prev => {
      const newData = { ...prev };
      delete newData[id];
      return newData;
    });
  };

  const moveField = (id: string, direction: "up" | "down") => {
    const index = fields.findIndex(field => field.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const renderFieldPreview = (field: TemplateField) => {
    const value = sampleData[field.id];

    switch (field.type) {
      case "text":
      case "number":
        return (
          <div className="border rounded-md px-3 py-2 bg-white text-sm">
            {value || field.placeholder || ""}
          </div>
        );
      case "textarea":
        return (
          <div className="border rounded-md px-3 py-2 bg-white text-sm min-h-[80px]">
            {value || field.placeholder || ""}
          </div>
        );
      case "date":
      case "time":
        return (
          <div className="border rounded-md px-3 py-2 bg-white text-sm w-40">
            {value || ""}
          </div>
        );
      case "select":
        return (
          <div className="border rounded-md px-3 py-2 bg-white text-sm w-48">
            {value || field.options?.[0] || "Select an option"}
          </div>
        );
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 border rounded ${value ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
              {value && <div className="text-white text-xs flex items-center justify-center">✓</div>}
            </div>
            <span className="text-sm">{field.label}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const renderFieldEditable = (field: TemplateField) => {
    const value = sampleData[field.id];

    const handleFieldChange = (newValue: any) => {
      setSampleData(prev => ({ ...prev, [field.id]: newValue }));
    };

    switch (field.type) {
      case "text":
      case "number":
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleFieldChange(e.target.value)}
            placeholder={field.placeholder || field.label}
            className="text-sm"
            type={field.type}
          />
        );
      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleFieldChange(e.target.value)}
            placeholder={field.placeholder || field.label}
            className="text-sm min-h-[80px]"
          />
        );
      case "date":
      case "time":
        return (
          <Input
            value={value || ""}
            onChange={(e) => handleFieldChange(e.target.value)}
            type={field.type}
            className="text-sm w-40"
          />
        );
      case "select":
        return (
          <Select value={value || ""} onValueChange={handleFieldChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value || false}
              onCheckedChange={handleFieldChange}
            />
            <span className="text-sm">{field.label}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const processText = (text: string | undefined) => {
    if (!text) return "";
    
    const variables = {
      showName: (project as any)?.name || "Sample Show",
      reportType: form.watch("type") || "Report",
      date: new Date().toLocaleDateString(),
      preparedBy: "Stage Manager",
    };

    let processed = text;
    Object.entries(variables).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(`{{${key}}}`, "g"), value);
    });

    return processed;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const templateData = {
        ...data,
        fields: fields,
        projectId: Number(projectId),
      };

      if (templateId) {
        return await apiRequest("PATCH", `/api/projects/${projectId}/templates/${templateId}`, templateData);
      } else {
        return await apiRequest("POST", `/api/projects/${projectId}/templates`, templateData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "Your template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/templates`] });
      setLocation(`/shows/${projectId}/templates`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="p-6">Loading template...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/shows/${projectId || ""}/templates`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {templateId ? "Edit Template" : "Create Template"}
                </h1>
                <p className="text-sm text-gray-600">{(project as any)?.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Button
                  variant={isPreviewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPreviewMode(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant={!isPreviewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPreviewMode(false)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          {/* Template Configuration - Only in Edit Mode */}
          {!isPreviewMode && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Template Name</Label>
                    <Input {...form.register("name")} placeholder="Enter template name" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-sm">Report Type</Label>
                    <Select value={form.watch("type")} onValueChange={(value) => form.setValue("type", value)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Production Phase</Label>
                    <Select value={form.watch("phase")} onValueChange={(value) => form.setValue("phase", value)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCTION_PHASES.map(phase => (
                          <SelectItem key={phase.value} value={phase.value}>
                            {phase.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="min-h-[600px]">
            <CardContent className="p-8">
              {/* Print-style Template Preview */}
              <div className="bg-white min-h-[500px] shadow-lg border border-gray-200" style={{ 
                width: "8.5in", 
                margin: "0 auto",
                padding: "1in",
                fontFamily: "Arial, sans-serif"
              }}>
                {/* Header */}
                <div className="text-center mb-6 pb-4 border-b">
                  {isPreviewMode ? (
                    <div className="whitespace-pre-line text-lg font-semibold">
                      {processText(form.watch("header"))}
                    </div>
                  ) : (
                    <Textarea
                      {...form.register("header")}
                      placeholder="{{showName}} - {{reportType}}&#10;{{date}}"
                      className="text-center text-lg font-semibold border-0 bg-transparent resize-none whitespace-pre-line p-0 focus:ring-0 focus:outline-none"
                      style={{ minHeight: "auto" }}
                    />
                  )}
                </div>

                {/* Fields */}
                <div className="space-y-6">
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">
                          {isPreviewMode ? (
                            field.label
                          ) : (
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                              className="text-sm font-medium border-0 bg-transparent p-0 focus:ring-0 focus:outline-none h-auto"
                              placeholder="Field label"
                            />
                          )}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        
                        {!isPreviewMode && (
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveField(field.id, "up")}
                              disabled={index === 0}
                              className="h-6 w-6 p-0"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => moveField(field.id, "down")}
                              disabled={index === fields.length - 1}
                              className="h-6 w-6 p-0"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeField(field.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="mt-1">
                        {isPreviewMode ? renderFieldPreview(field) : renderFieldEditable(field)}
                      </div>
                    </div>
                  ))}
                  
                  {!isPreviewMode && (
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
                  )}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
                  {isPreviewMode ? (
                    <div className="whitespace-pre-line">
                      {processText(form.watch("footer"))}
                    </div>
                  ) : (
                    <Textarea
                      {...form.register("footer")}
                      placeholder="Prepared by: {{preparedBy}}"
                      className="text-center text-sm text-gray-600 border-0 bg-transparent resize-none whitespace-pre-line p-0 focus:ring-0 focus:outline-none"
                      style={{ minHeight: "auto" }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}