import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, Edit3, Trash2, LayoutTemplate, ArrowLeft, Settings, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { TemplateWeeklyScheduleView } from "./TemplateWeeklyScheduleView";

interface ScheduleTemplate {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  weekStartDay: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  events?: ScheduleTemplateEvent[];
}

interface ScheduleTemplateEvent {
  id: number;
  templateId: number;
  dayOfWeek: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  type: string;
  eventTypeId: number | null;
  location: string | null;
  notes: string | null;
  isAllDay: boolean;
  participants?: any[];
}

interface ScheduleTemplatesSectionProps {
  projectId: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ScheduleTemplatesSection({ projectId }: ScheduleTemplatesSectionProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const { data: templates = [], isLoading } = useQuery<ScheduleTemplate[]>({
    queryKey: [`/api/projects/${projectId}/schedule-templates`],
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiRequest("POST", `/api/projects/${projectId}/schedule-templates`, data),
    onSuccess: (newTemplate: ScheduleTemplate) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-templates`] });
      toast({ title: "Template created successfully" });
      handleCloseCreateDialog();
      setSelectedTemplate(newTemplate);
      setTemplateName(newTemplate.name);
      setTemplateDescription(newTemplate.description || "");
      setEditSheetOpen(true);
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description: string }) =>
      apiRequest("PATCH", `/api/schedule-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-templates`] });
      toast({ title: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/schedule-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-templates`] });
      toast({ title: "Template deleted successfully" });
      setDeleteDialogOpen(false);
      setEditSheetOpen(false);
      setSelectedTemplate(null);
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setTemplateName("");
    setTemplateDescription("");
    setCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setEditSheetOpen(true);
  };

  const handleOpenDetailsDialog = () => {
    if (selectedTemplate) {
      setTemplateName(selectedTemplate.name);
      setTemplateDescription(selectedTemplate.description || "");
      setDetailsDialogOpen(true);
    }
  };

  const handleDeleteTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setTemplateName("");
    setTemplateDescription("");
  };

  const handleCloseEditSheet = () => {
    setEditSheetOpen(false);
    setSelectedTemplate(null);
    setTemplateName("");
    setTemplateDescription("");
  };

  const handleSaveTemplateDetails = () => {
    if (!templateName.trim()) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }

    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        id: selectedTemplate.id,
        name: templateName.trim(),
        description: templateDescription.trim(),
      });
    }
  };

  const handleCreateNewTemplate = () => {
    if (!templateName.trim()) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }

    createTemplateMutation.mutate({
      name: templateName.trim(),
      description: templateDescription.trim(),
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <LayoutTemplate className="h-5 w-5" />
                      Weekly Templates
                    </CardTitle>
                  </div>
                  <Button onClick={(e) => { e.stopPropagation(); handleCreateTemplate(); }} size="sm" variant="ghost" className="h-8 w-8 p-0 md:hidden">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="hidden md:block">
                  <Button onClick={(e) => { e.stopPropagation(); handleCreateTemplate(); }} size="sm" data-testid="button-create-template">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
                <CardDescription className="md:hidden">
                  Save and reuse weekly schedule patterns
                </CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ml-4 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription className="hidden md:block">
              Save and reuse weekly schedule patterns. Create templates from existing weeks and apply them to new weeks.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No templates created yet.</p>
            <p className="text-sm">Create your first template to save and reuse weekly schedules.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => handleEditTemplate(template)}
                data-testid={`template-card-${template.id}`}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate" data-testid={`template-name-${template.id}`}>
                    {template.name}
                  </h4>
                  {template.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {template.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {formatDate(template.createdAt)} • Starts on {DAY_NAMES[template.weekStartDay]}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTemplate(template);
                    }}
                    data-testid={`button-edit-template-${template.id}`}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
          </CardContent>
        </CollapsibleContent>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>
              Create a new weekly schedule template. You can add events after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Tech Week Schedule"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description (optional)</Label>
              <Textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
                data-testid="input-template-description"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCloseCreateDialog}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewTemplate}
              disabled={createTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Modal - Full Screen */}
      <Dialog open={editSheetOpen} onOpenChange={(open) => !open && handleCloseEditSheet()}>
        <DialogContent className="fixed inset-0 left-0 top-0 w-screen h-screen max-w-none max-h-none p-0 gap-0 rounded-none border-0 shadow-none flex flex-col translate-x-0 translate-y-0 [&>button]:hidden">
          <div className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={handleCloseEditSheet}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle className="text-lg">{selectedTemplate?.name ? `${selectedTemplate.name} - Weekly Schedule Template` : "Edit Template"}</DialogTitle>
                  <DialogDescription className="text-sm">
                    Edit template schedule
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenDetailsDialog}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-open-details"
              >
                <Settings className="h-4 w-4 mr-2" />
                Details
              </Button>
            </div>
          </div>

          {selectedTemplate && (
            <div className="flex-1 min-h-0 overflow-hidden px-6 py-4">
              <TemplateWeeklyScheduleView
                templateId={selectedTemplate.id}
                projectId={projectId}
                weekStartDay={selectedTemplate.weekStartDay}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Template Details</DialogTitle>
            <DialogDescription>
              Update the template name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTemplateName">Template Name</Label>
              <Input
                id="editTemplateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Tech Week Schedule"
                data-testid="input-edit-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTemplateDescription">Description (optional)</Label>
              <Textarea
                id="editTemplateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
                data-testid="input-edit-template-description"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => {
                setDetailsDialogOpen(false);
                if (selectedTemplate) handleDeleteTemplate(selectedTemplate);
              }}
              data-testid="button-delete-template"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDetailsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleSaveTemplateDetails();
                  setDetailsDialogOpen(false);
                }}
                disabled={updateTemplateMutation.isPending}
                data-testid="button-save-template-details"
              >
                {updateTemplateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && deleteTemplateMutation.mutate(selectedTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </Card>
    </Collapsible>
  );
}
