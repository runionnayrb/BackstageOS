import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Plus, Trash2, List } from "lucide-react";
import { insertReportTypeSchema, type ReportType } from "@shared/schema";

interface ReportTypesDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
}

// Form schema with extended validation
const formSchema = insertReportTypeSchema
  .omit({ projectId: true, createdBy: true, displayOrder: true, isDefault: true, icon: true, color: true })
  .extend({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .max(50, "Slug too long")
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
    description: z.string().optional(),
  });

type FormValues = z.infer<typeof formSchema>;

export default function ReportTypesDialog({ projectId, trigger }: ReportTypesDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ReportType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ReportType | null>(null);
  const [draggedItem, setDraggedItem] = useState<ReportType | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  // Fetch report types
  const { data: reportTypes = [] } = useQuery<ReportType[]>({
    queryKey: ["/api/projects", projectId, "report-types"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("POST", `/api/projects/${projectId}/report-types`, {
        ...data,
        displayOrder: reportTypes.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "report-types"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/report-types`] });
      toast({ title: "Report type created successfully" });
      form.reset();
      setEditingType(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create report type", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FormValues> }) => {
      return apiRequest("PATCH", `/api/projects/${projectId}/report-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "report-types"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/report-types`] });
      toast({ title: "Report type updated successfully" });
      form.reset();
      setEditingType(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update report type",
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/projects/${projectId}/report-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "report-types"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/report-types`] });
      toast({ title: "Report type deleted successfully" });
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete report type",
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  // Reorder mutation with optimistic updates
  const reorderMutation = useMutation({
    mutationFn: async (newOrder: { id: number; displayOrder: number }[]) => {
      return apiRequest("POST", `/api/projects/${projectId}/report-types/reorder`, { order: newOrder });
    },
    onMutate: async (newOrder) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/projects", projectId, "report-types"] });

      // Snapshot the previous value
      const previousTypes = queryClient.getQueryData<ReportType[]>(["/api/projects", projectId, "report-types"]);

      // Optimistically update to the new value with properly reordered array
      if (previousTypes) {
        const orderMap = new Map(newOrder.map(item => [item.id, item.displayOrder]));
        const optimisticTypes = previousTypes
          .map(type => ({
            ...type,
            displayOrder: orderMap.get(type.id) ?? type.displayOrder,
          }))
          // Re-sort the array by the new displayOrder so subsequent drags use correct positions
          .sort((a, b) => a.displayOrder - b.displayOrder);
        
        queryClient.setQueryData(["/api/projects", projectId, "report-types"], optimisticTypes);
      }

      // Return context with the snapshot
      return { previousTypes };
    },
    onError: (error: any, newOrder, context) => {
      // Rollback on error
      if (context?.previousTypes) {
        queryClient.setQueryData(["/api/projects", projectId, "report-types"], context.previousTypes);
      }
      toast({ 
        title: "Failed to reorder report types",
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
    onSettled: () => {
      // Always refetch after error or success - invalidate all variations of the query key
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "report-types"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/report-types`] });
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: values });
      setIsEditModalOpen(false);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (type: ReportType) => {
    setEditingType(type);
    form.reset({
      name: type.name,
      slug: type.slug,
      description: type.description || "",
    });
    setIsEditModalOpen(true);
  };

  const handleCancel = () => {
    form.reset();
    setEditingType(null);
    setIsEditModalOpen(false);
  };

  const handleDeleteClick = (type: ReportType) => {
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (typeToDelete) {
      deleteMutation.mutate(typeToDelete.id);
    }
  };

  const handleDragStart = (type: ReportType) => {
    setDraggedItem(type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetType: ReportType) => {
    if (!draggedItem || draggedItem.id === targetType.id) {
      setDraggedItem(null);
      return;
    }

    const sortedTypes = [...reportTypes].sort((a, b) => a.displayOrder - b.displayOrder);
    const draggedIndex = sortedTypes.findIndex((t) => t.id === draggedItem.id);
    const targetIndex = sortedTypes.findIndex((t) => t.id === targetType.id);

    // Reorder the array
    const reordered = [...sortedTypes];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Create new order mapping
    const newOrder = reordered.map((type, index) => ({
      id: type.id,
      displayOrder: index,
    }));

    reorderMutation.mutate(newOrder);
    setDraggedItem(null);
  };

  const sortedTypes = [...reportTypes].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Report Types
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Report Types</DialogTitle>
            <DialogDescription>
              Add, edit, or reorder report types for your production
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Existing Report Types */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Report Types</h3>
              <div className="space-y-2">
                {sortedTypes.map((type) => (
                  <div
                    key={type.id}
                    draggable
                    onDragStart={() => handleDragStart(type)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(type)}
                    onClick={() => handleEdit(type)}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-card hover:bg-accent/50 cursor-pointer"
                    data-testid={`report-type-item-${type.id}`}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{type.name}</div>
                      {type.description && (
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground">Slug: {type.slug}</div>
                    </div>
                    {type.isDefault && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Form */}
            {!editingType && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-medium">Add New Report Type</h3>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Performance Reports"
                            onChange={(e) => {
                              field.onChange(e);
                              const slug = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/(^-|-$)/g, "");
                              form.setValue("slug", slug, { shouldDirty: false });
                            }}
                            data-testid="input-report-type-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., performance"
                            data-testid="input-report-type-slug"
                          />
                        </FormControl>
                        <FormDescription>
                          URL-friendly identifier (lowercase, no spaces)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Optional description"
                            rows={2}
                            data-testid="input-report-type-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-save-report-type"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Report Type
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report Type</DialogTitle>
            <DialogDescription>
              Update the report type details
            </DialogDescription>
          </DialogHeader>
          
          {editingType && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Performance Reports"
                          data-testid="input-edit-report-type-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., performance"
                          data-testid="input-edit-report-type-slug"
                        />
                      </FormControl>
                      <FormDescription>
                        URL-friendly identifier (lowercase, no spaces)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Optional description"
                          rows={2}
                          data-testid="input-edit-report-type-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-between pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      if (editingType) {
                        handleDeleteClick(editingType);
                      }
                    }}
                    data-testid="button-delete-from-modal"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      data-testid="button-update-report-type"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report Type?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{typeToDelete?.name}"? This action cannot be undone.
              All templates and reports using this type will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
