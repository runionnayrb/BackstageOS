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

const PRODUCTION_PHASES = [
  { value: "prep", label: "Prep" },
  { value: "rehearsal", label: "Rehearsal" },
  { value: "tech", label: "Tech" },
  { value: "previews", label: "Previews" },
  { value: "performance", label: "Performance" },
];

const REPORT_TYPES = [
  { value: "rehearsal", label: "Rehearsal Report" },
  { value: "tech", label: "Tech Report" },
  { value: "performance", label: "Performance Report" },
  { value: "meeting", label: "Meeting Notes" },
  { value: "daily", label: "Daily Report" },
  { value: "custom", label: "Custom Report" },
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
  const { id: projectId, templateId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, any>>({});

  const { data: template, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/templates/${templateId}`],
    enabled: !!templateId,
  });

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  const form = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "rehearsal",
      phase: "rehearsal",
      header: "{{showName}} - {{reportType}}\n{{date}}",
      footer: "Page {{pageNumber}} of {{totalPages}}\nPrepared by: {{preparedBy}}",
    },
  });

  useEffect(() => {
    if (template) {
      const templateData = template as any;
      form.reset({
        name: templateData.name || "",
        description: templateData.description || "",
        type: templateData.type || "rehearsal",
        phase: templateData.phase || "rehearsal",
        header: templateData.header || "{{showName}} - {{reportType}}\n{{date}}",
        footer: templateData.footer || "Page {{pageNumber}} of {{totalPages}}\nPrepared by: {{preparedBy}}",
      });
      setFields(templateData.fields || []);
    }
  }, [template, form]);

  // Generate sample data for preview
  useEffect(() => {
    const sample: Record<string, any> = {};
    fields.forEach(field => {
      switch (field.type) {
        case "text":
          sample[field.id] = "Sample text";
          break;
        case "textarea":
          sample[field.id] = "This is sample content for the text area field.";
          break;
        case "number":
          sample[field.id] = "42";
          break;
        case "date":
          sample[field.id] = new Date().toISOString().split('T')[0];
          break;
        case "time":
          sample[field.id] = "19:30";
          break;
        case "select":
          sample[field.id] = field.options?.[0] || "Option 1";
          break;
        case "checkbox":
          sample[field.id] = true;
          break;
      }
    });
    setSampleData(sample);
  }, [fields]);

  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateSchema>) => {
      const templateData = {
        ...data,
        fields: fields.map((field, index) => ({ ...field, order: index })),
      };

      if (templateId) {
        return await apiRequest(`/api/projects/${projectId}/templates/${templateId}`, "PATCH", templateData);
      } else {
        return await apiRequest(`/api/projects/${projectId}/templates`, "POST", templateData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "Your report template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/templates`] });
      setLocation(`/shows/${projectId || ""}/templates`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof templateSchema>) => {
    saveMutation.mutate(data);
  };

  const addField = () => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
    setEditingField(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const removeField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
    setEditingField(null);
  };

  const moveField = (fieldId: string, direction: "up" | "down") => {
    const index = fields.findIndex(field => field.id === fieldId);
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

  const renderFieldEditor = (field: TemplateField) => {
    return (
      <Card className="border-2 border-blue-200">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Input
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              className="font-medium"
              placeholder="Field label"
            />
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveField(field.id, "up")}
                disabled={fields.findIndex(f => f.id === field.id) === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveField(field.id, "down")}
                disabled={fields.findIndex(f => f.id === field.id) === fields.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeField(field.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Field Type</Label>
              <Select
                value={field.type}
                onValueChange={(value) => updateField(field.id, { type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => updateField(field.id, { required: checked })}
              />
              <Label>Required</Label>
            </div>
          </div>

          <div>
            <Label>Placeholder Text</Label>
            <Input
              value={field.placeholder || ""}
              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
              placeholder="Enter placeholder text..."
            />
          </div>

          {field.type === "select" && (
            <div>
              <Label>Options (one per line)</Label>
              <Textarea
                value={field.options?.join("\n") || ""}
                onChange={(e) => updateField(field.id, { 
                  options: e.target.value.split("\n").filter(Boolean) 
                })}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingField(null)}
            >
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const processText = (text: string | undefined) => {
    if (!text) return "";
    
    const variables = {
      showName: (project as any)?.name || "Show Name",
      reportType: form.watch("type") || "Report",
      date: new Date().toLocaleDateString(),
      pageNumber: "1",
      totalPages: "1",
      preparedBy: "Stage Manager",
    };

    let processed = text;
    Object.entries(variables).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(`{{${key}}}`, "g"), value);
    });

    return processed;
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

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Settings Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Template Name</Label>
                  <Input {...form.register("name")} placeholder="Enter template name" />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea {...form.register("description")} placeholder="Optional description" />
                </div>

                <div>
                  <Label>Report Type</Label>
                  <Select value={form.watch("type")} onValueChange={(value) => form.setValue("type", value)}>
                    <SelectTrigger>
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
                  <Label>Production Phase</Label>
                  <Select value={form.watch("phase")} onValueChange={(value) => form.setValue("phase", value)}>
                    <SelectTrigger>
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

                <div>
                  <Label>Header Template</Label>
                  <Textarea 
                    {...form.register("header")} 
                    placeholder="{{showName}} - {{reportType}}&#10;{{date}}"
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use variables: showName, date, reportType
                  </p>
                </div>

                <div>
                  <Label>Footer Template</Label>
                  <Textarea 
                    {...form.register("footer")} 
                    placeholder="Prepared by: {{preparedBy}}"
                    className="text-sm"
                  />
                </div>

                {!isPreviewMode && (
                  <div className="pt-4">
                    <Button onClick={addField} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Template Preview/Editor */}
          <div className="lg:col-span-2">
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
                  {form.watch("header") && (
                    <div className="text-center mb-6 pb-4 border-b">
                      <div className="whitespace-pre-line text-lg font-semibold">
                        {processText(form.watch("header"))}
                      </div>
                    </div>
                  )}

                  {/* Fields */}
                  <div className="space-y-6">
                    {fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        {editingField === field.id && !isPreviewMode ? (
                          renderFieldEditor(field)
                        ) : (
                          <div 
                            className={`${!isPreviewMode ? "cursor-pointer hover:bg-gray-50 p-2 rounded border-2 border-transparent hover:border-gray-200" : ""}`}
                            onClick={() => !isPreviewMode && setEditingField(field.id)}
                          >
                            <div className="flex items-start justify-between">
                              <Label className="text-sm font-medium text-gray-700">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {!isPreviewMode && (
                                <div className="flex items-center space-x-1">
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                  <Badge variant="secondary" className="text-xs">
                                    {field.type}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="mt-1">
                              {renderFieldPreview(field)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  {form.watch("footer") && (
                    <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
                      <div className="whitespace-pre-line">
                        {processText(form.watch("footer"))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}