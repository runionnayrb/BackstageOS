import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  Copy,
  Eye,
  GripVertical,
  Type,
  Calendar,
  CheckSquare,
  Hash,
  Clock,
  FileText
} from "lucide-react";

interface TemplateCustomizerParams {
  id: string;
  templateId?: string;
}

interface TemplateField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time' | 'number';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  defaultValue?: string;
  order: number;
}

interface ReportTemplate {
  id?: number;
  name: string;
  description: string;
  category: 'rehearsal' | 'tech' | 'performance' | 'meeting' | 'custom';
  fields: TemplateField[];
  distributionList: string[];
  isGlobal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const fieldTypes = [
  { value: 'text', label: 'Text Input', icon: Type },
  { value: 'textarea', label: 'Text Area', icon: FileText },
  { value: 'select', label: 'Dropdown', icon: CheckSquare },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'time', label: 'Time', icon: Clock },
  { value: 'number', label: 'Number', icon: Hash },
];

const templateCategories = [
  { value: 'rehearsal', label: 'Rehearsal Report' },
  { value: 'tech', label: 'Tech Report' },
  { value: 'performance', label: 'Performance Report' },
  { value: 'meeting', label: 'Meeting Report' },
  { value: 'custom', label: 'Custom Report' },
];

export default function TemplateCustomizer() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<TemplateCustomizerParams>();
  const projectId = params.id;
  const templateId = params.templateId;
  const queryClient = useQueryClient();

  const [template, setTemplate] = useState<ReportTemplate>({
    name: "",
    description: "",
    category: "custom",
    fields: [],
    distributionList: [],
    isGlobal: false,
  });

  const [isAddingField, setIsAddingField] = useState(false);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [newField, setNewField] = useState<TemplateField>({
    id: "",
    type: "text",
    label: "",
    placeholder: "",
    required: false,
    options: [],
    defaultValue: "",
    order: 0,
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;

  const { data: existingTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "templates", templateId],
    enabled: !!templateId && !!projectId && isAuthenticated,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: ReportTemplate) => {
      const endpoint = templateId 
        ? `/api/projects/${projectId}/templates/${templateId}`
        : `/api/projects/${projectId}/templates`;
      const method = templateId ? "PATCH" : "POST";
      
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "Your template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "templates"] });
      setLocation(`/shows/${projectId}/templates`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (existingTemplate) {
      setTemplate(existingTemplate);
    }
  }, [existingTemplate]);

  const addField = () => {
    const field: TemplateField = {
      ...newField,
      id: Date.now().toString(),
      order: template.fields.length,
    };
    
    setTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, field],
    }));
    
    setNewField({
      id: "",
      type: "text",
      label: "",
      placeholder: "",
      required: false,
      options: [],
      defaultValue: "",
      order: 0,
    });
    
    setIsAddingField(false);
    toast({
      title: "Field added",
      description: "The field has been added to your template.",
    });
  };

  const updateField = (updatedField: TemplateField) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === updatedField.id ? updatedField : field
      ),
    }));
    
    setEditingField(null);
    toast({
      title: "Field updated",
      description: "The field has been updated successfully.",
    });
  };

  const deleteField = (fieldId: string) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId),
    }));
    
    toast({
      title: "Field deleted",
      description: "The field has been removed from your template.",
    });
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const fields = [...template.fields];
    const index = fields.findIndex(f => f.id === fieldId);
    
    if (direction === 'up' && index > 0) {
      [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
    }
    
    // Update order values
    fields.forEach((field, idx) => {
      field.order = idx;
    });
    
    setTemplate(prev => ({ ...prev, fields }));
  };

  const duplicateTemplate = () => {
    setTemplate(prev => ({
      ...prev,
      name: `${prev.name} (Copy)`,
    }));
    
    toast({
      title: "Template duplicated",
      description: "You can now modify and save this copy.",
    });
  };

  const getFieldTypeInfo = (type: string) => {
    return fieldTypes.find(ft => ft.value === type) || fieldTypes[0];
  };

  const renderFieldPreview = (field: TemplateField) => {
    const commonProps = {
      placeholder: field.placeholder,
      required: field.required,
    };

    switch (field.type) {
      case 'text':
        return <Input {...commonProps} defaultValue={field.defaultValue} />;
      case 'textarea':
        return <Textarea {...commonProps} defaultValue={field.defaultValue} rows={3} />;
      case 'select':
        return (
          <Select defaultValue={field.defaultValue}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              defaultChecked={field.defaultValue === 'true'}
              className="rounded"
            />
            <span className="text-sm">{field.placeholder || field.label}</span>
          </div>
        );
      case 'date':
        return <Input type="date" defaultValue={field.defaultValue} />;
      case 'time':
        return <Input type="time" defaultValue={field.defaultValue} />;
      case 'number':
        return <Input type="number" {...commonProps} defaultValue={field.defaultValue} />;
      default:
        return <Input {...commonProps} defaultValue={field.defaultValue} />;
    }
  };

  if (isLoading || projectsLoading || templateLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center">Show not found</div>;
  }

  const isFreelance = user?.profileType === 'freelance';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/templates`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {templateId ? "Edit Template" : "Create Template"}
            </h1>
            <p className="text-muted-foreground">{project.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {templateId && (
              <Button variant="outline" onClick={duplicateTemplate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <Button
              onClick={() => saveTemplateMutation.mutate(template)}
              disabled={!template.name || saveTemplateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>

        {previewMode ? (
          /* Preview Mode */
          <Card>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {template.fields.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No fields added yet</p>
                </div>
              ) : (
                template.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {renderFieldPreview(field)}
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        ) : (
          /* Edit Mode */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Settings */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Template Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Template Name *</label>
                    <Input
                      value={template.name}
                      onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Daily Rehearsal Report"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={template.description}
                      onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this template is for..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select 
                      value={template.category} 
                      onValueChange={(value: any) => setTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templateCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isGlobal"
                      checked={template.isGlobal}
                      onChange={(e) => setTemplate(prev => ({ ...prev, isGlobal: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isGlobal" className="text-sm">
                      Make this template available for all my {isFreelance ? "projects" : "shows"}
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Add Field</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setIsAddingField(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Template Fields */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Template Fields</CardTitle>
                  <CardDescription>
                    {template.fields.length} fields configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {template.fields.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No fields added yet</p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => setIsAddingField(true)}
                      >
                        Add your first field
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {template.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field, index) => {
                          const fieldTypeInfo = getFieldTypeInfo(field.type);
                          const Icon = fieldTypeInfo.icon;
                          
                          return (
                            <div
                              key={field.id}
                              className="flex items-center gap-3 p-3 border rounded-lg"
                            >
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveField(field.id, 'up')}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0"
                                >
                                  ▲
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveField(field.id, 'down')}
                                  disabled={index === template.fields.length - 1}
                                  className="h-6 w-6 p-0"
                                >
                                  ▼
                                </Button>
                              </div>
                              
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{field.label}</span>
                                  {field.required && (
                                    <Badge variant="secondary" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                {field.placeholder && (
                                  <div className="text-sm text-muted-foreground">
                                    {field.placeholder}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingField(field)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteField(field.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Add/Edit Field Dialog */}
        <Dialog open={isAddingField || !!editingField} onOpenChange={(open) => {
          if (!open) {
            setIsAddingField(false);
            setEditingField(null);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingField ? "Edit Field" : "Add New Field"}
              </DialogTitle>
              <DialogDescription>
                Configure the field properties and behavior.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Field Type</label>
                <Select 
                  value={editingField ? editingField.type : newField.type} 
                  onValueChange={(value: any) => {
                    if (editingField) {
                      setEditingField(prev => prev ? { ...prev, type: value } : null);
                    } else {
                      setNewField(prev => ({ ...prev, type: value }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Field Label *</label>
                <Input
                  value={editingField ? editingField.label : newField.label}
                  onChange={(e) => {
                    if (editingField) {
                      setEditingField(prev => prev ? { ...prev, label: e.target.value } : null);
                    } else {
                      setNewField(prev => ({ ...prev, label: e.target.value }));
                    }
                  }}
                  placeholder="e.g., Notes from today"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Placeholder</label>
                <Input
                  value={editingField ? editingField.placeholder : newField.placeholder}
                  onChange={(e) => {
                    if (editingField) {
                      setEditingField(prev => prev ? { ...prev, placeholder: e.target.value } : null);
                    } else {
                      setNewField(prev => ({ ...prev, placeholder: e.target.value }));
                    }
                  }}
                  placeholder="Help text for users"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Default Value</label>
                <Input
                  value={editingField ? editingField.defaultValue : newField.defaultValue}
                  onChange={(e) => {
                    if (editingField) {
                      setEditingField(prev => prev ? { ...prev, defaultValue: e.target.value } : null);
                    } else {
                      setNewField(prev => ({ ...prev, defaultValue: e.target.value }));
                    }
                  }}
                  placeholder="Optional default value"
                />
              </div>
              
              {((editingField && editingField.type === 'select') || (!editingField && newField.type === 'select')) && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Options (one per line)</label>
                  <Textarea
                    value={editingField ? editingField.options?.join('\n') : newField.options?.join('\n')}
                    onChange={(e) => {
                      const options = e.target.value.split('\n').filter(Boolean);
                      if (editingField) {
                        setEditingField(prev => prev ? { ...prev, options } : null);
                      } else {
                        setNewField(prev => ({ ...prev, options }));
                      }
                    }}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={4}
                  />
                </div>
              )}
              
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={editingField ? editingField.required : newField.required}
                    onChange={(e) => {
                      if (editingField) {
                        setEditingField(prev => prev ? { ...prev, required: e.target.checked } : null);
                      } else {
                        setNewField(prev => ({ ...prev, required: e.target.checked }));
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor="required" className="text-sm">
                    This field is required
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsAddingField(false);
                setEditingField(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingField) {
                    updateField(editingField);
                  } else {
                    addField();
                  }
                }}
                disabled={!(editingField ? editingField.label : newField.label)}
              >
                {editingField ? "Update Field" : "Add Field"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}