import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DistributionList {
  id: number;
  userId: number;
  projectId: number;
  name: string;
  description: string | null;
  toRecipients: string[] | null;
  ccRecipients: string[] | null;
  bccRecipients: string[] | null;
  subjectTemplate: string | null;
  bodyTemplate: string | null;
  signature: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface DistroManagerProps {
  projectId: string;
}

export function DistroManager({ projectId }: DistroManagerProps) {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDistro, setEditingDistro] = useState<DistributionList | null>(null);
  const [deleteDistro, setDeleteDistro] = useState<DistributionList | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    toRecipients: [] as string[],
    ccRecipients: [] as string[],
    bccRecipients: [] as string[],
    subjectTemplate: "",
    bodyTemplate: "",
    signature: "",
  });
  
  const [newEmail, setNewEmail] = useState({ to: "", cc: "", bcc: "" });

  const { data: distros = [], isLoading } = useQuery<DistributionList[]>({
    queryKey: [`/api/projects/${projectId}/distros`],
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", `/api/projects/${projectId}/distros`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distros`] });
      toast({ title: "Success", description: "Distribution list created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to create distribution list",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      return apiRequest("PUT", `/api/projects/${projectId}/distros/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distros`] });
      toast({ title: "Success", description: "Distribution list updated successfully" });
      setEditingDistro(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to update distribution list",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/projects/${projectId}/distros/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distros`] });
      toast({ title: "Success", description: "Distribution list deleted successfully" });
      setDeleteDistro(null);
      setEditingDistro(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to delete distribution list",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      toRecipients: [],
      ccRecipients: [],
      bccRecipients: [],
      subjectTemplate: "",
      bodyTemplate: "",
      signature: "",
    });
    setNewEmail({ to: "", cc: "", bcc: "" });
  };

  const openEdit = (distro: DistributionList) => {
    setFormData({
      name: distro.name || "",
      description: distro.description || "",
      toRecipients: distro.toRecipients || [],
      ccRecipients: distro.ccRecipients || [],
      bccRecipients: distro.bccRecipients || [],
      subjectTemplate: distro.subjectTemplate || "",
      bodyTemplate: distro.bodyTemplate || "",
      signature: distro.signature || "",
    });
    setEditingDistro(distro);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    if (editingDistro) {
      updateMutation.mutate({ id: editingDistro.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addEmail = (type: "to" | "cc" | "bcc") => {
    const email = newEmail[type].trim();
    if (!email) return;
    
    const fieldKey = `${type}Recipients` as "toRecipients" | "ccRecipients" | "bccRecipients";
    if (formData[fieldKey].includes(email)) {
      toast({ title: "Duplicate", description: "Email already added", variant: "destructive" });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [fieldKey]: [...prev[fieldKey], email]
    }));
    setNewEmail(prev => ({ ...prev, [type]: "" }));
  };

  const removeEmail = (type: "to" | "cc" | "bcc", index: number) => {
    const fieldKey = `${type}Recipients` as "toRecipients" | "ccRecipients" | "bccRecipients";
    setFormData(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].filter((_, i) => i !== index)
    }));
  };

  const getTotalRecipients = (distro: DistributionList) => {
    return (distro.toRecipients?.length || 0) + 
           (distro.ccRecipients?.length || 0) + 
           (distro.bccRecipients?.length || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const renderEmailSection = (type: "to" | "cc" | "bcc", label: string) => {
    const fieldKey = `${type}Recipients` as "toRecipients" | "ccRecipients" | "bccRecipients";
    const emails = formData[fieldKey];
    
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label} Recipients</Label>
        <div className="flex flex-wrap gap-2 min-h-[32px] p-2 border rounded-md bg-muted/50">
          {emails.map((email, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {email}
              <button
                type="button"
                onClick={() => removeEmail(type, index)}
                className="ml-1 hover:text-destructive"
                data-testid={`btn-remove-${type}-email-${index}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {emails.length === 0 && (
            <span className="text-sm text-muted-foreground">No {label.toLowerCase()} recipients</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={`Add ${label} email...`}
            value={newEmail[type]}
            onChange={(e) => setNewEmail(prev => ({ ...prev, [type]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail(type);
              }
            }}
            data-testid={`input-${type}-email`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addEmail(type)}
            data-testid={`btn-add-${type}-email`}
          >
            Add
          </Button>
        </div>
      </div>
    );
  };

  const formContent = (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label htmlFor="distro-name">Name *</Label>
        <Input
          id="distro-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Full Company, Creative Team"
          data-testid="input-distro-name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="distro-description">Description</Label>
        <Input
          id="distro-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this list..."
          data-testid="input-distro-description"
        />
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium">Email Recipients</h4>
        {renderEmailSection("to", "TO")}
        {renderEmailSection("cc", "CC")}
        {renderEmailSection("bcc", "BCC")}
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium">Email Templates</h4>
        
        <div className="space-y-2">
          <Label htmlFor="subject-template">Subject Template</Label>
          <Input
            id="subject-template"
            value={formData.subjectTemplate}
            onChange={(e) => setFormData(prev => ({ ...prev, subjectTemplate: e.target.value }))}
            placeholder="{{showName}} - {{reportType}} - {{date}}"
            data-testid="input-subject-template"
          />
          <p className="text-xs text-muted-foreground">
            Available variables: {"{{showName}}"}, {"{{reportType}}"}, {"{{date}}"}, {"{{stageManager}}"}
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="body-template">Body Template</Label>
          <Textarea
            id="body-template"
            value={formData.bodyTemplate}
            onChange={(e) => setFormData(prev => ({ ...prev, bodyTemplate: e.target.value }))}
            placeholder="Please find attached the {{reportType}} for {{showName}}..."
            className="min-h-[100px]"
            data-testid="input-body-template"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="signature">Signature</Label>
          <Textarea
            id="signature"
            value={formData.signature}
            onChange={(e) => setFormData(prev => ({ ...prev, signature: e.target.value }))}
            placeholder="Your signature..."
            className="min-h-[80px]"
            data-testid="input-signature"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Distribution Lists</h3>
          <p className="text-sm text-muted-foreground">
            Manage email distribution lists for sending reports
          </p>
        </div>
        <Button onClick={openCreate} data-testid="btn-create-distro">
          <Plus className="h-4 w-4 mr-2" />
          New List
        </Button>
      </div>

      {distros.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">No Distribution Lists</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create distribution lists to easily send reports to groups of people.
            </p>
            <Button onClick={openCreate} data-testid="btn-create-distro-empty">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {distros.map((distro) => (
            <Card
              key={distro.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openEdit(distro)}
              data-testid={`card-distro-${distro.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{distro.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {distro.description || `${getTotalRecipients(distro)} recipients`}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {getTotalRecipients(distro)} recipients
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Distribution List</DialogTitle>
            <DialogDescription>
              Create a new email distribution list for sending reports.
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="btn-cancel-create-distro">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending}
              data-testid="btn-save-distro"
            >
              {createMutation.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDistro} onOpenChange={(open) => !open && setEditingDistro(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Distribution List</DialogTitle>
            <DialogDescription>
              Update the distribution list settings.
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => editingDistro && setDeleteDistro(editingDistro)}
              data-testid="btn-delete-distro"
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingDistro(null)} data-testid="btn-cancel-edit-distro">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={updateMutation.isPending}
                data-testid="btn-update-distro"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDistro} onOpenChange={(open) => !open && setDeleteDistro(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Distribution List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDistro?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete-distro">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDistro && deleteMutation.mutate(deleteDistro.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="btn-confirm-delete-distro"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
