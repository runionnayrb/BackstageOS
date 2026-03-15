import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, GripVertical, Edit, Eye, Settings } from "lucide-react";
import { ChangeSummaryEditor } from "@/components/ChangeSummaryEditor";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TemplateEditorV2Params {
  id: string;
  templateId: string;
}

interface TemplateSection {
  id: number;
  templateId: number;
  title: string;
  departmentKey: string | null;
  displayOrder: number;
  fields: TemplateField[];
}

interface TemplateField {
  id: number;
  sectionId: number;
  type: string;
  label: string;
  helperText: string | null;
  placeholder: string | null;
  required: boolean;
  options: any;
  defaultValue: string | null;
  departmentKey: string | null;
  hideLabel: boolean;
  displayOrder: number;
}

interface TemplateWithData {
  id: number;
  projectId: number;
  reportTypeId: number | null;
  name: string;
  description: string | null;
  displayOrder: number;
  sections: TemplateSection[];
}

interface ReportType {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
}

const FIELD_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "richtext", label: "Rich Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Dropdown" },
  { value: "dailycall", label: "Daily Call" },
];

interface SortableFieldProps {
  field: TemplateField;
  isLast: boolean;
  onEdit: (field: TemplateField) => void;
}

function SortableField({ field, isLast, onEdit }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden ${!isLast ? 'border-b' : ''}`}
      data-testid={`field-${field.id}`}
    >
      <div className="flex items-center gap-3 py-3 hover:bg-muted transition-colors">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
        <div
          className="flex-1 cursor-pointer"
          onClick={() => onEdit(field)}
        >
          <div className="font-medium">
            {field.hideLabel ? <span className="text-muted-foreground line-through">{field.label}</span> : field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </div>
          {field.helperText && (
            <div className="text-sm text-muted-foreground">{field.helperText}</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableSectionProps {
  section: TemplateSection;
  departments: Record<string, string>;
  onAddField: (section: TemplateSection) => void;
  onEditSection: (section: TemplateSection) => void;
  onDeleteSection: (section: TemplateSection) => void;
  onEditField: (field: TemplateField) => void;
  onFieldDragEnd: (sectionId: number, event: DragEndEvent) => void;
}

function SortableSection({
  section,
  departments,
  onAddField,
  onEditSection,
  onDeleteSection,
  onEditField,
  onFieldDragEnd,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldIds = section.fields.map((f) => f.id);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-testid={`card-section-${section.id}`}
      className="border-0 p-0"
    >
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>{section.title}</CardTitle>
            {section.departmentKey && (
              <span className="text-sm text-muted-foreground">
                ({departments[section.departmentKey] || section.departmentKey})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddField(section)}
              data-testid={`button-add-field-${section.id}`}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditSection(section)}
              data-testid={`button-edit-section-${section.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteSection(section)}
              data-testid={`button-delete-section-${section.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {section.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fields yet. Add your first field to get started.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => onFieldDragEnd(section.id, event)}
          >
            <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-0">
                {section.fields.map((field, index) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    isLast={index === section.fields.length - 1}
                    onEdit={onEditField}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

export default function TemplateEditorV2() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<TemplateEditorV2Params>();
  const projectId = params.id;
  const templateId = params.templateId;

  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [isEditSectionDialogOpen, setIsEditSectionDialogOpen] = useState(false);
  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] = useState(false);
  const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);
  const [isEditFieldDialogOpen, setIsEditFieldDialogOpen] = useState(false);
  const [isDeleteFieldDialogOpen, setIsDeleteFieldDialogOpen] = useState(false);

  const [selectedSection, setSelectedSection] = useState<TemplateSection | null>(null);
  const [selectedField, setSelectedField] = useState<TemplateField | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDepartmentKey, setNewSectionDepartmentKey] = useState("none");
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [editSectionDepartmentKey, setEditSectionDepartmentKey] = useState("none");

  const [newFieldType, setNewFieldType] = useState("richtext");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldHelperText, setNewFieldHelperText] = useState("");
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newFieldDefaultValue, setNewFieldDefaultValue] = useState("");
  const [newFieldDefaultValueRichText, setNewFieldDefaultValueRichText] = useState("");
  const [newFieldDepartmentKey, setNewFieldDepartmentKey] = useState("none");
  const [newFieldHideLabel, setNewFieldHideLabel] = useState(false);

  const [editFieldType, setEditFieldType] = useState("richtext");
  const [editFieldLabel, setEditFieldLabel] = useState("");
  const [editFieldHelperText, setEditFieldHelperText] = useState("");
  const [editFieldPlaceholder, setEditFieldPlaceholder] = useState("");
  const [editFieldRequired, setEditFieldRequired] = useState(false);
  const [editFieldOptions, setEditFieldOptions] = useState("");
  const [editFieldDefaultValue, setEditFieldDefaultValue] = useState("");
  const [editFieldDefaultValueRichText, setEditFieldDefaultValueRichText] = useState("");
  const [editFieldDepartmentKey, setEditFieldDepartmentKey] = useState("none");
  const [editFieldHideLabel, setEditFieldHideLabel] = useState(false);

  // Template metadata editing
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] = useState(false);
  const [isDeleteTemplateDialogOpen, setIsDeleteTemplateDialogOpen] = useState(false);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateDescription, setEditTemplateDescription] = useState("");
  const [editTemplateReportTypeId, setEditTemplateReportTypeId] = useState<string>("");

  // Fetch template with full data
  const { data: template, isLoading } = useQuery<TemplateWithData>({
    queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
  });

  // Fetch show settings for departments
  const { data: showSettings } = useQuery({
    queryKey: ["/api/projects", parseInt(projectId!), "settings"],
  });

  // Fetch report types
  const { data: reportTypes = [] } = useQuery<ReportType[]>({
    queryKey: ["/api/projects", parseInt(projectId!), "report-types"],
  });

  const departments = showSettings?.departmentNames || {};

  // Create section mutation
  const createSectionMutation = useMutation({
    mutationFn: async (data: { title: string; departmentKey: string | null }) => {
      return apiRequest("POST", `/api/templates-v2/${templateId}/sections`, {
        ...data,
        displayOrder: template?.sections.length || 0,
      });
    },
    onMutate: async (newSection) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      // Snapshot previous value
      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      // Optimistically update
      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sections: [
            ...old.sections,
            {
              id: Date.now(),
              templateId: parseInt(templateId!),
              title: newSection.title,
              departmentKey: newSection.departmentKey,
              displayOrder: old.sections.length,
              fields: [],
            },
          ],
        };
      });

      return { previousTemplate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Section added",
        description: "Your section has been added successfully.",
      });
      setIsAddSectionDialogOpen(false);
      setNewSectionTitle("");
      setNewSectionDepartmentKey("none");
    },
    onError: (error, variables, context) => {
      // Revert on error
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to add section. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update section mutation
  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; departmentKey?: string | null } }) => {
      return apiRequest("PATCH", `/api/templates-v2/sections/${id}`, data);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections.map((section: any) =>
            section.id === id ? { ...section, ...data } : section
          ),
        };
      });

      return { previousTemplate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Section updated",
        description: "Your section has been updated successfully.",
      });
      setIsEditSectionDialogOpen(false);
      setSelectedSection(null);
    },
    onError: (error, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to update section. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/templates-v2/sections/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections.filter((section: any) => section.id !== id),
        };
      });

      return { previousTemplate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Section deleted",
        description: "Your section has been deleted successfully.",
      });
      setIsDeleteSectionDialogOpen(false);
      setSelectedSection(null);
    },
    onError: (error, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to delete section. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create field mutation
  const createFieldMutation = useMutation({
    mutationFn: async (data: {
      sectionId: number;
      type: string;
      label: string;
      helperText?: string;
      placeholder?: string;
      required: boolean;
      options?: any;
      defaultValue?: string;
    }) => {
      const section = template?.sections.find(s => s.id === data.sectionId);
      return apiRequest("POST", `/api/templates-v2/sections/${data.sectionId}/fields`, {
        ...data,
        displayOrder: section?.fields.length || 0,
      });
    },
    onMutate: async (newField) => {
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections.map((section: any) =>
            section.id === newField.sectionId
              ? {
                  ...section,
                  fields: [
                    ...section.fields,
                    {
                      id: Date.now(),
                      sectionId: newField.sectionId,
                      type: newField.type,
                      label: newField.label,
                      helperText: newField.helperText || null,
                      placeholder: newField.placeholder || null,
                      required: newField.required,
                      options: newField.options || null,
                      defaultValue: newField.defaultValue || null,
                      displayOrder: section.fields.length,
                    },
                  ],
                }
              : section
          ),
        };
      });

      return { previousTemplate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Field added",
        description: "Your field has been added successfully.",
      });
      setIsAddFieldDialogOpen(false);
      resetFieldForm();
    },
    onError: (error, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to add field. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update field mutation
  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/templates-v2/fields/${id}`, data);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections.map((section: any) => ({
            ...section,
            fields: section.fields.map((field: any) =>
              field.id === id ? { ...field, ...data } : field
            ),
          })),
        };
      });

      return { previousTemplate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Field updated",
        description: "Your field has been updated successfully.",
      });
      setIsEditFieldDialogOpen(false);
      setSelectedField(null);
    },
    onError: (error, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to update field. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete field mutation
  const deleteFieldMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/templates-v2/fields/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections.map((section: any) => ({
            ...section,
            fields: section.fields.filter((field: any) => field.id !== id),
          })),
        };
      });

      return { previousTemplate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Field deleted",
        description: "Your field has been deleted successfully.",
      });
      setIsDeleteFieldDialogOpen(false);
      setSelectedField(null);
    },
    onError: (error, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to delete field. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reorder sections mutation
  const reorderSectionsMutation = useMutation({
    mutationFn: async (sectionIds: number[]) => {
      return apiRequest("PATCH", `/api/templates-v2/${templateId}/sections/reorder`, { sectionIds });
    },
    onMutate: async (sectionIds) => {
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        const sectionMap = new Map(old.sections.map((s: TemplateSection) => [s.id, s]));
        const reorderedSections = sectionIds
          .map((id) => sectionMap.get(id))
          .filter(Boolean)
          .map((section, index) => ({ ...section, displayOrder: index }));
        return { ...old, sections: reorderedSections };
      });

      return { previousTemplate };
    },
    onError: (error, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to reorder sections. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
    },
  });

  // Reorder fields mutation
  const reorderFieldsMutation = useMutation({
    mutationFn: async ({ sectionId, fieldIds }: { sectionId: number; fieldIds: number[] }) => {
      return apiRequest("PATCH", `/api/templates-v2/sections/${sectionId}/fields/reorder`, { fieldIds });
    },
    onMutate: async ({ sectionId, fieldIds }) => {
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sections: old.sections.map((section: any) => {
            if (section.id !== sectionId) return section;
            const fieldMap = new Map(section.fields.map((f: TemplateField) => [f.id, f]));
            const reorderedFields = fieldIds
              .map((id) => fieldMap.get(id))
              .filter(Boolean)
              .map((field, index) => ({ ...field, displayOrder: index }));
            return { ...section, fields: reorderedFields };
          }),
        };
      });

      return { previousTemplate };
    },
    onError: (error, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to reorder fields. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
    },
  });

  // DnD sensors for sections
  const sectionSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle section drag end
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !template) return;

    const oldIndex = template.sections.findIndex((s) => s.id === active.id);
    const newIndex = template.sections.findIndex((s) => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newSections = arrayMove(template.sections, oldIndex, newIndex);
      const sectionIds = newSections.map((s) => s.id);
      reorderSectionsMutation.mutate(sectionIds);
    }
  };

  // Handle field drag end within a section
  const handleFieldDragEnd = (sectionId: number, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !template) return;

    const section = template.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const oldIndex = section.fields.findIndex((f) => f.id === active.id);
    const newIndex = section.fields.findIndex((f) => f.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newFields = arrayMove(section.fields, oldIndex, newIndex);
      const fieldIds = newFields.map((f) => f.id);
      reorderFieldsMutation.mutate({ sectionId, fieldIds });
    }
  };

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { name?: string; description?: string; reportTypeId?: number | null }) => {
      return apiRequest("PATCH", `/api/projects/${projectId}/templates-v2/${templateId}`, data);
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });

      // Snapshot previous value
      const previousTemplate = queryClient.getQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)]);

      // Optimistic update
      queryClient.setQueryData(["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)], (old: any) => {
        if (!old) return old;
        return { ...old, ...data };
      });

      return { previousTemplate };
    },
    onSuccess: () => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });
      toast({
        title: "Template updated",
        description: "Your template has been updated successfully.",
      });
      setIsEditTemplateDialogOpen(false);
    },
    onError: (error, variables, context) => {
      // Revert optimistic update
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
          context.previousTemplate
        );
      }
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/projects/${projectId}/templates-v2/${templateId}`);
    },
    onSuccess: () => {
      // Remove the detail cache entry for the deleted template
      queryClient.removeQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2", parseInt(templateId!)],
      });
      // Invalidate the templates list
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Template deleted",
        description: "Your template has been deleted successfully.",
      });
      // Navigate after cache cleanup
      setLocation(`/shows/${projectId}/templates-v2`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetFieldForm = () => {
    setNewFieldType("richtext");
    setNewFieldLabel("");
    setNewFieldHelperText("");
    setNewFieldPlaceholder("");
    setNewFieldRequired(false);
    setNewFieldOptions("");
    setNewFieldDefaultValue("");
    setNewFieldDefaultValueRichText("");
    setNewFieldDepartmentKey("none");
    setNewFieldHideLabel(false);
  };

  const handleEditTemplateClick = () => {
    if (template) {
      setEditTemplateName(template.name);
      setEditTemplateDescription(template.description || "");
      setEditTemplateReportTypeId(template.reportTypeId ? template.reportTypeId.toString() : "none");
      setIsEditTemplateDialogOpen(true);
    }
  };

  const handleUpdateTemplate = () => {
    if (!editTemplateName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    updateTemplateMutation.mutate({
      name: editTemplateName,
      description: editTemplateDescription,
      reportTypeId: editTemplateReportTypeId && editTemplateReportTypeId !== "none" ? parseInt(editTemplateReportTypeId) : null,
    });
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a section title.",
        variant: "destructive",
      });
      return;
    }

    createSectionMutation.mutate({
      title: newSectionTitle,
      departmentKey: newSectionDepartmentKey === "none" ? null : newSectionDepartmentKey || null,
    });
  };

  const handleEditSection = (section: TemplateSection) => {
    setSelectedSection(section);
    setEditSectionTitle(section.title);
    setEditSectionDepartmentKey(section.departmentKey || "none");
    setIsEditSectionDialogOpen(true);
  };

  const handleUpdateSection = () => {
    if (!selectedSection || !editSectionTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a section title.",
        variant: "destructive",
      });
      return;
    }

    updateSectionMutation.mutate({
      id: selectedSection.id,
      data: {
        title: editSectionTitle,
        departmentKey: editSectionDepartmentKey === "none" ? null : editSectionDepartmentKey || null,
      },
    });
  };

  const handleDeleteSection = (section: TemplateSection) => {
    setSelectedSection(section);
    setIsDeleteSectionDialogOpen(true);
  };

  const confirmDeleteSection = () => {
    if (selectedSection) {
      deleteSectionMutation.mutate(selectedSection.id);
    }
  };

  const handleAddField = (section: TemplateSection) => {
    setSelectedSection(section);
    resetFieldForm();
    setIsAddFieldDialogOpen(true);
  };

  const handleCreateField = () => {
    const effectiveLabel = newFieldLabel.trim() || (newFieldType === "dailycall" ? "Daily Call" : "");
    if (!selectedSection || !effectiveLabel) {
      toast({
        title: "Label required",
        description: "Please enter a field label.",
        variant: "destructive",
      });
      return;
    }

    let options = null;
    if (newFieldType === "select" && newFieldOptions.trim()) {
      options = { values: newFieldOptions.split("\n").filter(o => o.trim()) };
    }

    const defaultValue = newFieldType === "richtext" ? newFieldDefaultValueRichText : newFieldDefaultValue;
    createFieldMutation.mutate({
      sectionId: selectedSection.id,
      type: newFieldType,
      label: effectiveLabel,
      helperText: newFieldHelperText || undefined,
      placeholder: newFieldPlaceholder || undefined,
      required: newFieldRequired,
      options,
      defaultValue: defaultValue || undefined,
      departmentKey: newFieldDepartmentKey === "none" ? null : newFieldDepartmentKey,
      hideLabel: newFieldHideLabel,
    });
  };

  const handleEditField = (field: TemplateField) => {
    setSelectedField(field);
    setEditFieldType(field.type);
    setEditFieldLabel(field.label);
    setEditFieldHelperText(field.helperText || "");
    setEditFieldPlaceholder(field.placeholder || "");
    setEditFieldRequired(field.required);
    setEditFieldOptions(field.options?.values?.join("\n") || "");
    setEditFieldDefaultValue(field.type === "richtext" ? "" : (field.defaultValue || ""));
    setEditFieldDefaultValueRichText(field.type === "richtext" ? (field.defaultValue || "") : "");
    setEditFieldDepartmentKey(field.departmentKey || "none");
    setEditFieldHideLabel(field.hideLabel || false);
    setIsEditFieldDialogOpen(true);
  };

  const handleUpdateField = () => {
    if (!selectedField || !editFieldLabel.trim()) {
      toast({
        title: "Label required",
        description: "Please enter a field label.",
        variant: "destructive",
      });
      return;
    }

    let options = null;
    if (editFieldType === "select" && editFieldOptions.trim()) {
      options = { values: editFieldOptions.split("\n").filter(o => o.trim()) };
    }

    const defaultValue = editFieldType === "richtext" ? editFieldDefaultValueRichText : editFieldDefaultValue;
    updateFieldMutation.mutate({
      id: selectedField.id,
      data: {
        type: editFieldType,
        label: editFieldLabel,
        helperText: editFieldHelperText || null,
        placeholder: editFieldPlaceholder || null,
        required: editFieldRequired,
        options,
        defaultValue: defaultValue || null,
        departmentKey: editFieldDepartmentKey === "none" ? null : editFieldDepartmentKey,
        hideLabel: editFieldHideLabel,
      },
    });
  };

  const handleDeleteField = (field: TemplateField) => {
    setSelectedField(field);
    setIsDeleteFieldDialogOpen(true);
  };

  const confirmDeleteField = () => {
    if (selectedField) {
      deleteFieldMutation.mutate(selectedField.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading template...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">{template.name}</h1>
              {template.description && (
                <p className="text-muted-foreground">{template.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleEditTemplateClick}
              data-testid="button-template-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(true)}
              data-testid="button-preview"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={() => setIsAddSectionDialogOpen(true)} data-testid="button-add-section">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
        </div>

        {/* Sections */}
        {template.sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first section to start building your template.
              </p>
              <Button onClick={() => setIsAddSectionDialogOpen(true)} data-testid="button-add-first-section">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sectionSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={template.sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {template.sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    departments={departments}
                    onAddField={handleAddField}
                    onEditSection={handleEditSection}
                    onDeleteSection={handleDeleteSection}
                    onEditField={handleEditField}
                    onFieldDragEnd={handleFieldDragEnd}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Add Section Dialog */}
        <Dialog open={isAddSectionDialogOpen} onOpenChange={setIsAddSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
              <DialogDescription>
                Add a new section to your report template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="section-title">Section Title</Label>
                <Input
                  id="section-title"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g., General Notes"
                  data-testid="input-section-title"
                />
              </div>
              <div>
                <Label htmlFor="section-department">Department (Optional)</Label>
                <Select value={newSectionDepartmentKey} onValueChange={setNewSectionDepartmentKey}>
                  <SelectTrigger data-testid="select-section-department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {Object.entries(departments)
                      .sort(([, a], [, b]) => (a as string).localeCompare(b as string))
                      .map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name as string}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddSectionDialogOpen(false)}
                data-testid="button-cancel-add-section"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSection}
                disabled={createSectionMutation.isPending}
                data-testid="button-confirm-add-section"
              >
                {createSectionMutation.isPending ? "Adding..." : "Add Section"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Section Dialog */}
        <Dialog open={isEditSectionDialogOpen} onOpenChange={setIsEditSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
              <DialogDescription>
                Update the section title and department.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-section-title">Section Title</Label>
                <Input
                  id="edit-section-title"
                  value={editSectionTitle}
                  onChange={(e) => setEditSectionTitle(e.target.value)}
                  data-testid="input-edit-section-title"
                />
              </div>
              <div>
                <Label htmlFor="edit-section-department">Department (Optional)</Label>
                <Select value={editSectionDepartmentKey} onValueChange={setEditSectionDepartmentKey}>
                  <SelectTrigger data-testid="select-edit-section-department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {Object.entries(departments)
                      .sort(([, a], [, b]) => (a as string).localeCompare(b as string))
                      .map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name as string}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditSectionDialogOpen(false)}
                data-testid="button-cancel-edit-section"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateSection}
                disabled={updateSectionMutation.isPending}
                data-testid="button-confirm-edit-section"
              >
                {updateSectionMutation.isPending ? "Updating..." : "Update Section"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Section Dialog */}
        <AlertDialog open={isDeleteSectionDialogOpen} onOpenChange={setIsDeleteSectionDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedSection?.title}"? All fields in this section will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-section">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteSection}
                disabled={deleteSectionMutation.isPending}
                data-testid="button-confirm-delete-section"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteSectionMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Field Dialog */}
        <Dialog open={isAddFieldDialogOpen} onOpenChange={setIsAddFieldDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Field</DialogTitle>
              <DialogDescription>
                Add a new field to the "{selectedSection?.title}" section.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label htmlFor="field-label">Field Label</Label>
                <Input
                  id="field-label"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="e.g., Location"
                  data-testid="input-field-label"
                />
              </div>
              <div>
                <Label htmlFor="field-department">Department (for Notes Tracking)</Label>
                <Select value={newFieldDepartmentKey} onValueChange={setNewFieldDepartmentKey}>
                  <SelectTrigger data-testid="select-field-department">
                    <SelectValue placeholder="No department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {Object.entries(departments)
                      .sort(([, a], [, b]) => (a as string).localeCompare(b as string))
                      .map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name as string}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Notes in this field will be tracked in the report notes system
                </p>
              </div>
              <div>
                <Label htmlFor="field-type">Field Type</Label>
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger data-testid="select-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newFieldType !== "dailycall" && (
                <div>
                  <Label htmlFor="field-default">Default Value (Optional)</Label>
                  {newFieldType === "richtext" ? (
                    <ChangeSummaryEditor
                      content={newFieldDefaultValueRichText}
                      onChange={setNewFieldDefaultValueRichText}
                      placeholder="Default value with formatting"
                    />
                  ) : (
                    <Input
                      id="field-default"
                      value={newFieldDefaultValue}
                      onChange={(e) => setNewFieldDefaultValue(e.target.value)}
                      placeholder="Default value"
                      data-testid="input-field-default"
                    />
                  )}
                </div>
              )}
              {newFieldType !== "dailycall" && (
                <div>
                  <Label htmlFor="field-placeholder">Placeholder (Optional)</Label>
                  <Input
                    id="field-placeholder"
                    value={newFieldPlaceholder}
                    onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    placeholder="Placeholder text"
                    data-testid="input-field-placeholder"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="field-helper">Helper Text (Optional)</Label>
                <Input
                  id="field-helper"
                  value={newFieldHelperText}
                  onChange={(e) => setNewFieldHelperText(e.target.value)}
                  placeholder="Additional information about this field"
                  data-testid="input-field-helper"
                />
              </div>
              {newFieldType !== "dailycall" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-required"
                    checked={newFieldRequired}
                    onCheckedChange={(checked) => setNewFieldRequired(checked as boolean)}
                    data-testid="checkbox-field-required"
                  />
                  <Label htmlFor="field-required" className="cursor-pointer">
                    Required field
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="field-hide-label"
                  checked={newFieldHideLabel}
                  onCheckedChange={(checked) => setNewFieldHideLabel(checked as boolean)}
                  data-testid="checkbox-field-hide-label"
                />
                <Label htmlFor="field-hide-label" className="cursor-pointer">
                  Hide field name
                </Label>
              </div>
              {newFieldType === "select" && (
                <div>
                  <Label htmlFor="field-options">Options (one per line)</Label>
                  <Textarea
                    id="field-options"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={4}
                    data-testid="textarea-field-options"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddFieldDialogOpen(false)}
                data-testid="button-cancel-add-field"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateField}
                disabled={createFieldMutation.isPending}
                data-testid="button-confirm-add-field"
              >
                {createFieldMutation.isPending ? "Adding..." : "Add Field"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Field Dialog */}
        <Dialog open={isEditFieldDialogOpen} onOpenChange={setIsEditFieldDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Field</DialogTitle>
              <DialogDescription>
                Update the field properties.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label htmlFor="edit-field-label">Field Label</Label>
                <Input
                  id="edit-field-label"
                  value={editFieldLabel}
                  onChange={(e) => setEditFieldLabel(e.target.value)}
                  data-testid="input-edit-field-label"
                />
              </div>
              <div>
                <Label htmlFor="edit-field-department">Department (for Notes Tracking)</Label>
                <Select value={editFieldDepartmentKey} onValueChange={setEditFieldDepartmentKey}>
                  <SelectTrigger data-testid="select-edit-field-department">
                    <SelectValue placeholder="No department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {Object.entries(departments)
                      .sort(([, a], [, b]) => (a as string).localeCompare(b as string))
                      .map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name as string}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Notes in this field will be tracked in the report notes system
                </p>
              </div>
              <div>
                <Label htmlFor="edit-field-type">Field Type</Label>
                <Select value={editFieldType} onValueChange={setEditFieldType}>
                  <SelectTrigger data-testid="select-edit-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editFieldType !== "dailycall" && (
                <div>
                  <Label htmlFor="edit-field-default">Default Value (Optional)</Label>
                  {editFieldType === "richtext" ? (
                    <ChangeSummaryEditor
                      content={editFieldDefaultValueRichText}
                      onChange={setEditFieldDefaultValueRichText}
                      placeholder="Default value with formatting"
                    />
                  ) : (
                    <Input
                      id="edit-field-default"
                      value={editFieldDefaultValue}
                      onChange={(e) => setEditFieldDefaultValue(e.target.value)}
                      data-testid="input-edit-field-default"
                    />
                  )}
                </div>
              )}
              {editFieldType !== "dailycall" && (
                <div>
                  <Label htmlFor="edit-field-placeholder">Placeholder (Optional)</Label>
                  <Input
                    id="edit-field-placeholder"
                    value={editFieldPlaceholder}
                    onChange={(e) => setEditFieldPlaceholder(e.target.value)}
                    data-testid="input-edit-field-placeholder"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="edit-field-helper">Helper Text (Optional)</Label>
                <Input
                  id="edit-field-helper"
                  value={editFieldHelperText}
                  onChange={(e) => setEditFieldHelperText(e.target.value)}
                  data-testid="input-edit-field-helper"
                />
              </div>
              {editFieldType !== "dailycall" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-field-required"
                    checked={editFieldRequired}
                    onCheckedChange={(checked) => setEditFieldRequired(checked as boolean)}
                    data-testid="checkbox-edit-field-required"
                  />
                  <Label htmlFor="edit-field-required" className="cursor-pointer">
                    Required field
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-field-hide-label"
                  checked={editFieldHideLabel}
                  onCheckedChange={(checked) => setEditFieldHideLabel(checked as boolean)}
                  data-testid="checkbox-edit-field-hide-label"
                />
                <Label htmlFor="edit-field-hide-label" className="cursor-pointer">
                  Hide field name
                </Label>
              </div>
              {editFieldType === "select" && (
                <div>
                  <Label htmlFor="edit-field-options">Options (one per line)</Label>
                  <Textarea
                    id="edit-field-options"
                    value={editFieldOptions}
                    onChange={(e) => setEditFieldOptions(e.target.value)}
                    rows={4}
                    data-testid="textarea-edit-field-options"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="flex items-center">
              <Button
                variant="destructive"
                onClick={() => handleDeleteField(selectedField)}
                data-testid="button-delete-field-modal"
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditFieldDialogOpen(false)}
                  data-testid="button-cancel-edit-field"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateField}
                  disabled={updateFieldMutation.isPending}
                  data-testid="button-confirm-edit-field"
                >
                  {updateFieldMutation.isPending ? "Updating..." : "Update Field"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Field Dialog */}
        <AlertDialog open={isDeleteFieldDialogOpen} onOpenChange={setIsDeleteFieldDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Field</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedField?.label}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-field">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteField}
                disabled={deleteFieldMutation.isPending}
                data-testid="button-confirm-delete-field"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteFieldMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                This is how your template will appear when filling out a report.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {template.sections.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No sections in this template yet.
                </p>
              ) : (
                template.sections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">{section.title}</h3>
                      {section.departmentKey && (
                        <p className="text-sm text-muted-foreground">
                          {departments[section.departmentKey] || section.departmentKey}
                        </p>
                      )}
                    </div>
                    {section.fields.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic pl-4">
                        No fields in this section
                      </p>
                    ) : (
                      <div className="space-y-4 pl-4">
                        {section.fields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label>
                              {field.hideLabel ? <span className="text-muted-foreground line-through">{field.label}</span> : field.label}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            <div className="pl-4">
                              {field.helperText && (
                                <p className="text-sm text-muted-foreground">{field.helperText}</p>
                              )}
                              {field.type === "text" && (
                              <Input
                                value={field.defaultValue || ""}
                                placeholder={field.placeholder || ""}
                                disabled
                                className="border-0 bg-transparent"
                              />
                            )}
                            {field.type === "richtext" && (
                              <div className="text-sm whitespace-pre-wrap [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: field.defaultValue || field.placeholder || "" }} />
                            )}
                            {field.type === "number" && (
                              <Input
                                type="number"
                                value={field.defaultValue || ""}
                                placeholder={field.placeholder || ""}
                                disabled
                                className="border-0 bg-transparent"
                              />
                            )}
                            {field.type === "date" && (
                              <Input
                                type="date"
                                value={field.defaultValue || ""}
                                disabled
                                className="border-0 bg-transparent"
                              />
                            )}
                            {field.type === "time" && (
                              <Input
                                type="time"
                                value={field.defaultValue || ""}
                                disabled
                                className="border-0 bg-transparent"
                              />
                            )}
                            {field.type === "checkbox" && (
                              <div className="flex items-center space-x-2">
                                <Checkbox disabled checked={field.defaultValue === "true"} />
                                <label className="text-sm text-muted-foreground">
                                  {field.placeholder || "Check this option"}
                                </label>
                              </div>
                            )}
                            {field.type === "select" && (
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">
                                  {field.defaultValue || field.placeholder || "Select an option"}
                                </div>
                                {field.options?.values && field.options.values.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Options: {field.options.values.join(", ")}
                                  </p>
                                )}
                              </div>
                            )}
                            {field.type === "dailycall" && (
                              <span className="text-xs text-muted-foreground italic">Auto-imports the daily call for the report date</span>
                            )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={isEditTemplateDialogOpen} onOpenChange={setIsEditTemplateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Template Settings</DialogTitle>
              <DialogDescription>
                Update the template name, type, and description.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-template-name">Template Name</Label>
                <Input
                  id="edit-template-name"
                  value={editTemplateName}
                  onChange={(e) => setEditTemplateName(e.target.value)}
                  data-testid="input-edit-template-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-report-type">Report Type</Label>
                <Select value={editTemplateReportTypeId} onValueChange={setEditTemplateReportTypeId}>
                  <SelectTrigger id="edit-report-type" data-testid="select-edit-report-type">
                    <SelectValue placeholder="Select a report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {reportTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-template-description">Description (Optional)</Label>
                <Input
                  id="edit-template-description"
                  value={editTemplateDescription}
                  onChange={(e) => setEditTemplateDescription(e.target.value)}
                  data-testid="input-edit-template-description"
                />
              </div>
            </div>
            <DialogFooter className="flex flex-row justify-between items-center sm:justify-between">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setIsEditTemplateDialogOpen(false);
                  setIsDeleteTemplateDialogOpen(true);
                }}
                data-testid="button-delete-template"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                onClick={handleUpdateTemplate}
                disabled={updateTemplateMutation.isPending}
                data-testid="button-update-template"
              >
                {updateTemplateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Template Confirmation */}
        <AlertDialog open={isDeleteTemplateDialogOpen} onOpenChange={setIsDeleteTemplateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{template.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-template">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTemplateMutation.mutate()}
                disabled={deleteTemplateMutation.isPending}
                data-testid="button-confirm-delete-template"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
