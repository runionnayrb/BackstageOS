import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings, 
  Type, 
  Calendar, 
  Clock, 
  Hash, 
  ToggleLeft,
  FileText,
  ArrowLeft
} from "lucide-react";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Template type is required"),
  isPublic: z.boolean().default(false),
  fields: z.array(z.any()).default([]),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export default function TemplateBuilder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);
  
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "custom",
      isPublic: false,
      fields: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      await apiRequest("POST", "/api/templates", {
        ...data,
        fields: fields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template Created",
        description: "Your custom template has been created successfully!",
      });
      setLocation("/templates");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addField = () => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      label: "New Field",
      type: "text",
      required: false,
      placeholder: "",
    };
    setEditingField(newField);
  };

  const saveField = () => {
    if (!editingField) return;
    
    const existingIndex = fields.findIndex(f => f.id === editingField.id);
    if (existingIndex >= 0) {
      const updatedFields = [...fields];
      updatedFields[existingIndex] = editingField;
      setFields(updatedFields);
    } else {
      setFields([...fields, editingField]);
    }
    setEditingField(null);
  };

  const editField = (field: TemplateField) => {
    setEditingField({ ...field });
  };

  const deleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setFields(newFields);
    }
  };

  const onSubmit = (data: TemplateFormData) => {
    mutation.mutate({
      ...data,
      fields: fields,
    });
  };

  const fieldTypeOptions = [
    { value: "text", label: "Text", icon: Type },
    { value: "textarea", label: "Long Text", icon: FileText },
    { value: "number", label: "Number", icon: Hash },
    { value: "date", label: "Date", icon: Calendar },
    { value: "datetime", label: "Date & Time", icon: Clock },
    { value: "select", label: "Dropdown", icon: Settings },
    { value: "checkbox", label: "Checkbox", icon: ToggleLeft },
  ];

  const getFieldIcon = (type: string) => {
    const option = fieldTypeOptions.find(opt => opt.value === type);
    return option ? option.icon : Type;
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/templates")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Template Builder</h2>
            <p className="text-gray-600">Create custom report templates for your productions</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Custom Rehearsal Report"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Brief description of when to use this template..."
                  {...form.register("description")}
                />
              </div>

              <div>
                <Label htmlFor="type">Template Category</Label>
                <Select onValueChange={(value) => form.setValue("type", value)} defaultValue="custom">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="rehearsal">Rehearsal</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  {...form.register("isPublic")}
                  className="rounded"
                />
                <Label htmlFor="isPublic">Make this template public (other users can use it)</Label>
              </div>

              {/* Field Builder */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Template Fields</h3>
                  <Button type="button" onClick={addField} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const Icon = getFieldIcon(field.type);
                    return (
                      <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{field.label}</p>
                            <p className="text-sm text-gray-500">
                              {fieldTypeOptions.find(opt => opt.value === field.type)?.label}
                              {field.required && <Badge variant="secondary" className="ml-2">Required</Badge>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {index > 0 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => moveField(index, 'up')}>
                              ↑
                            </Button>
                          )}
                          {index < fields.length - 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => moveField(index, 'down')}>
                              ↓
                            </Button>
                          )}
                          <Button type="button" variant="ghost" size="sm" onClick={() => editField(field)}>
                            Edit
                          </Button>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteField(field.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {fields.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No fields added yet</p>
                      <p className="text-sm">Click "Add Field" to start building your template</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/templates")}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={mutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {mutation.isPending ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Field Editor Modal */}
        {editingField && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <CardHeader>
                <CardTitle>
                  {fields.find(f => f.id === editingField.id) ? "Edit Field" : "Add New Field"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fieldLabel">Field Label *</Label>
                  <Input
                    id="fieldLabel"
                    value={editingField.label}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      label: e.target.value
                    })}
                    placeholder="e.g., Start Time"
                  />
                </div>

                <div>
                  <Label htmlFor="fieldType">Field Type</Label>
                  <Select 
                    value={editingField.type} 
                    onValueChange={(value) => setEditingField({
                      ...editingField,
                      type: value,
                      options: value === 'select' ? ['Option 1', 'Option 2'] : undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fieldPlaceholder">Placeholder Text</Label>
                  <Input
                    id="fieldPlaceholder"
                    value={editingField.placeholder || ""}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      placeholder: e.target.value
                    })}
                    placeholder="e.g., Enter start time..."
                  />
                </div>

                {editingField.type === 'select' && (
                  <div>
                    <Label>Dropdown Options</Label>
                    <div className="space-y-2">
                      {(editingField.options || []).map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(editingField.options || [])];
                              newOptions[index] = e.target.value;
                              setEditingField({
                                ...editingField,
                                options: newOptions
                              });
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newOptions = editingField.options?.filter((_, i) => i !== index);
                              setEditingField({
                                ...editingField,
                                options: newOptions
                              });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newOptions = [...(editingField.options || []), `Option ${(editingField.options?.length || 0) + 1}`];
                          setEditingField({
                            ...editingField,
                            options: newOptions
                          });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="fieldRequired"
                    checked={editingField.required}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      required: e.target.checked
                    })}
                    className="rounded"
                  />
                  <Label htmlFor="fieldRequired">Required field</Label>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingField(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={saveField}>
                    Save Field
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}