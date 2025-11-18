import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Edit, Trash2, FileText } from "lucide-react";

interface TemplateSettingsV2Params {
  id: string;
}

interface ReportType {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
}

interface ReportTemplateV2 {
  id: number;
  projectId: number;
  reportTypeId: number | null;
  name: string;
  description: string | null;
  displayOrder: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateSettingsV2() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<TemplateSettingsV2Params>();
  const projectId = params.id;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateV2 | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateReportTypeId, setNewTemplateReportTypeId] = useState<string>("");
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateDescription, setEditTemplateDescription] = useState("");

  // Fetch report types
  const { data: reportTypes = [] } = useQuery<ReportType[]>({
    queryKey: ["/api/projects", parseInt(projectId!), "report-types"],
  });

  // Fetch templates with full data
  const { data: templates = [], isLoading } = useQuery<ReportTemplateV2[]>({
    queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; reportTypeId: number | null }) => {
      // Optimistic update
      const optimisticTemplate: ReportTemplateV2 = {
        id: Date.now(), // Temporary ID
        projectId: parseInt(projectId!),
        reportTypeId: data.reportTypeId,
        name: data.name,
        description: data.description,
        displayOrder: templates.length,
        createdBy: 0, // Will be set by server
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ReportTemplateV2[]>(
        ["/api/projects", parseInt(projectId!), "templates-v2"],
        (old) => [...(old || []), optimisticTemplate]
      );

      return apiRequest(`/api/projects/${projectId}/templates-v2`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Template created",
        description: "Your template has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewTemplateName("");
      setNewTemplateDescription("");
      setNewTemplateReportTypeId("");
    },
    onError: () => {
      // Revert optimistic update
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; description?: string } }) => {
      // Optimistic update
      queryClient.setQueryData<ReportTemplateV2[]>(
        ["/api/projects", parseInt(projectId!), "templates-v2"],
        (old) =>
          old?.map((t) =>
            t.id === id
              ? { ...t, ...data, updatedAt: new Date().toISOString() }
              : t
          ) || []
      );

      return apiRequest(`/api/projects/${projectId}/templates-v2/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Template updated",
        description: "Your template has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: () => {
      // Revert optimistic update
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      // Optimistic update
      queryClient.setQueryData<ReportTemplateV2[]>(
        ["/api/projects", parseInt(projectId!), "templates-v2"],
        (old) => old?.filter((t) => t.id !== id) || []
      );

      return apiRequest(`/api/projects/${projectId}/templates-v2/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Template deleted",
        description: "Your template has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: () => {
      // Revert optimistic update
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", parseInt(projectId!), "templates-v2"],
      });
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate({
      name: newTemplateName,
      description: newTemplateDescription,
      reportTypeId: newTemplateReportTypeId ? parseInt(newTemplateReportTypeId) : null,
    });
  };

  const handleEditTemplate = (template: ReportTemplateV2) => {
    setSelectedTemplate(template);
    setEditTemplateName(template.name);
    setEditTemplateDescription(template.description || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateTemplate = () => {
    if (!selectedTemplate || !editTemplateName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      data: {
        name: editTemplateName,
        description: editTemplateDescription,
      },
    });
  };

  const handleDeleteTemplate = (template: ReportTemplateV2) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = () => {
    if (selectedTemplate) {
      deleteTemplateMutation.mutate(selectedTemplate.id);
    }
  };

  const getReportTypeName = (reportTypeId: number | null) => {
    if (!reportTypeId) return "Unassigned";
    const reportType = reportTypes.find((rt) => rt.id === reportTypeId);
    return reportType?.name || "Unknown";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/shows/${projectId}`)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Report Templates</h1>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-template">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
                <DialogDescription>
                  Create a new report template for your show.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Tech Rehearsal Report"
                    data-testid="input-template-name"
                  />
                </div>
                <div>
                  <Label htmlFor="template-description">Description (Optional)</Label>
                  <Input
                    id="template-description"
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Brief description of this template"
                    data-testid="input-template-description"
                  />
                </div>
                <div>
                  <Label htmlFor="report-type">Report Type (Optional)</Label>
                  <Select
                    value={newTemplateReportTypeId}
                    onValueChange={setNewTemplateReportTypeId}
                  >
                    <SelectTrigger data-testid="select-report-type">
                      <SelectValue placeholder="Select a report type (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={createTemplateMutation.isPending}
                  data-testid="button-confirm-create"
                >
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first report template to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-template">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/shows/${projectId}/templates-v2/${template.id}/edit`)}
                data-testid={`card-template-${template.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">{template.description}</CardDescription>
                      )}
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">
                          {getReportTypeName(template.reportTypeId)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTemplate(template)}
                        data-testid={`button-edit-template-${template.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(template)}
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update the template name and description.
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
                <Label htmlFor="edit-template-description">Description (Optional)</Label>
                <Input
                  id="edit-template-description"
                  value={editTemplateDescription}
                  onChange={(e) => setEditTemplateDescription(e.target.value)}
                  data-testid="input-edit-template-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTemplate}
                disabled={updateTemplateMutation.isPending}
                data-testid="button-confirm-edit"
              >
                {updateTemplateMutation.isPending ? "Updating..." : "Update Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be
                undone. All sections and fields in this template will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteTemplate}
                disabled={deleteTemplateMutation.isPending}
                data-testid="button-confirm-delete"
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
