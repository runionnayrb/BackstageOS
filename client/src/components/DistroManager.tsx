import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Users, X, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "@shared/schema";

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
  isDailyCallDistro: boolean | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface ReportType {
  id: number;
  name: string;
  projectId: number;
}

interface DistroManagerProps {
  projectId: string;
}

export interface DistroManagerRef {
  openCreate: () => void;
}

export const DistroManager = forwardRef<DistroManagerRef, DistroManagerProps>(({ projectId }, ref) => {
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
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [contactSearch, setContactSearch] = useState({ to: "", cc: "", bcc: "" });
  const [showContactPicker, setShowContactPicker] = useState({ to: false, cc: false, bcc: false });
  const contactPickerRefs = {
    to: useRef<HTMLDivElement>(null),
    cc: useRef<HTMLDivElement>(null),
    bcc: useRef<HTMLDivElement>(null),
  };

  const { data: distros = [], isLoading } = useQuery<DistributionList[]>({
    queryKey: [`/api/projects/${projectId}/distros`],
    enabled: !!projectId,
  });

  const { data: reportTypes = [] } = useQuery<ReportType[]>({
    queryKey: [`/api/projects/${projectId}/report-types`],
    enabled: !!projectId,
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
    enabled: !!projectId,
  });

  const { data: distroMappings = {} } = useQuery<Record<number, number[]>>({
    queryKey: [`/api/projects/${projectId}/distro-report-type-mappings`],
    enabled: !!projectId,
  });

  const { data: assignedReportTypes = [] } = useQuery<number[]>({
    queryKey: ['/api/projects', projectId, 'distros', editingDistro?.id, 'report-types'],
    enabled: !!editingDistro?.id,
  });

  useEffect(() => {
    if (editingDistro) {
      if (editingDistro.isDailyCallDistro) {
        setSelectedAssignment("daily-call");
      } else if (assignedReportTypes && assignedReportTypes.length > 0) {
        setSelectedAssignment(assignedReportTypes[0].toString());
      } else {
        setSelectedAssignment("");
      }
    }
  }, [editingDistro, assignedReportTypes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const types: ("to" | "cc" | "bcc")[] = ["to", "cc", "bcc"];
      types.forEach(type => {
        if (contactPickerRefs[type].current && !contactPickerRefs[type].current.contains(event.target as Node)) {
          setShowContactPicker(prev => ({ ...prev, [type]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  type DistroFormData = typeof formData & { isDailyCallDistro?: boolean };

  const createMutation = useMutation({
    mutationFn: async (data: DistroFormData) => {
      return apiRequest("POST", `/api/projects/${projectId}/distros`, data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DistroFormData }) => {
      return apiRequest("PUT", `/api/projects/${projectId}/distros/${id}`, data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/projects/${projectId}/distros/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distros`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-call-distro`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distro-report-type-mappings`] });
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

  const syncReportTypesMutation = useMutation({
    mutationFn: async ({ distroId, reportTypeIds }: { distroId: number; reportTypeIds: number[] }) => {
      return apiRequest("PUT", `/api/projects/${projectId}/distros/${distroId}/report-types`, { reportTypeIds });
    },
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
    setContactSearch({ to: "", cc: "", bcc: "" });
    setShowContactPicker({ to: false, cc: false, bcc: false });
    setSelectedAssignment("");
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
    setSelectedAssignment("");
    setIsCreateOpen(true);
  };

  useImperativeHandle(ref, () => ({
    openCreate
  }));

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    const isDailyCall = selectedAssignment === "daily-call";
    const reportTypeIds = (!isDailyCall && selectedAssignment) ? [parseInt(selectedAssignment)] : [];

    try {
      if (editingDistro) {
        const distroId = editingDistro.id;
        
        await updateMutation.mutateAsync({ 
          id: distroId, 
          data: { ...formData, isDailyCallDistro: isDailyCall }
        });
        await syncReportTypesMutation.mutateAsync({ distroId, reportTypeIds });
        
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distros`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distro-report-type-mappings`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-call-distro`] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'distros', distroId, 'report-types'] });
        
        toast({ title: "Success", description: "Distribution list updated successfully" });
        setEditingDistro(null);
        resetForm();
      } else {
        const data = await createMutation.mutateAsync({ ...formData, isDailyCallDistro: isDailyCall });
        
        if (data?.id && reportTypeIds.length > 0) {
          await syncReportTypesMutation.mutateAsync({ distroId: data.id, reportTypeIds });
        }
        
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distros`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/distro-report-type-mappings`] });
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-call-distro`] });
        
        toast({ title: "Success", description: "Distribution list created successfully" });
        setIsCreateOpen(false);
        resetForm();
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to save distribution list",
        variant: "destructive"
      });
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

  const getAssignmentLabel = (distro: DistributionList) => {
    if (distro.isDailyCallDistro) {
      return "Daily Call";
    }
    const assignedIds = distroMappings[distro.id] || [];
    if (assignedIds.length === 0) return "Not Assigned";
    const assignedId = assignedIds[0];
    const reportType = reportTypes.find(rt => rt.id === assignedId);
    return reportType?.name || "Unknown Report";
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

  const addContactEmail = (type: "to" | "cc" | "bcc", contact: Contact) => {
    if (!contact.email) {
      toast({ title: "No email", description: "This contact doesn't have an email address", variant: "destructive" });
      return;
    }
    
    const fieldKey = `${type}Recipients` as "toRecipients" | "ccRecipients" | "bccRecipients";
    const displayEmail = `${contact.firstName} ${contact.lastName} <${contact.email}>`;
    
    if (formData[fieldKey].some(e => e.includes(contact.email!))) {
      toast({ title: "Duplicate", description: "This contact is already added", variant: "destructive" });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [fieldKey]: [...prev[fieldKey], displayEmail]
    }));
    setContactSearch(prev => ({ ...prev, [type]: "" }));
    setShowContactPicker(prev => ({ ...prev, [type]: false }));
  };

  const getFilteredContacts = (type: "to" | "cc" | "bcc") => {
    const search = contactSearch[type].toLowerCase();
    const fieldKey = `${type}Recipients` as "toRecipients" | "ccRecipients" | "bccRecipients";
    const existingEmails = formData[fieldKey];
    
    return contacts
      .filter(contact => {
        if (!contact.email) return false;
        const alreadyAdded = existingEmails.some(e => e.includes(contact.email!));
        if (alreadyAdded) return false;
        
        if (!search) return true;
        const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
        return fullName.includes(search) || 
               (contact.email && contact.email.toLowerCase().includes(search)) ||
               (contact.role && contact.role.toLowerCase().includes(search));
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  };

  const renderEmailSection = (type: "to" | "cc" | "bcc", label: string) => {
    const fieldKey = `${type}Recipients` as "toRecipients" | "ccRecipients" | "bccRecipients";
    const emails = formData[fieldKey];
    const filteredContacts = getFilteredContacts(type);
    
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label} Recipients</Label>
        {emails.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
            {emails.map((email, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {email.includes('<') ? email.split('<')[0].trim() : email}
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
          </div>
        )}
        
        <div className="space-y-2">
          <div className="relative" ref={contactPickerRefs[type]}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch[type]}
                  onChange={(e) => {
                    setContactSearch(prev => ({ ...prev, [type]: e.target.value }));
                    setShowContactPicker(prev => ({ ...prev, [type]: true }));
                  }}
                  onFocus={() => setShowContactPicker(prev => ({ ...prev, [type]: true }))}
                  data-testid={`input-search-${type}-contacts`}
                />
                <UserPlus className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            
            {showContactPicker[type] && filteredContacts.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addContactEmail(type, contact);
                    }}
                    data-testid={`contact-option-${type}-${contact.id}`}
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contact.email} {contact.role && `• ${contact.role}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder={`Or type an email manually...`}
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
            placeholder="Enter subject template..."
            data-testid="input-subject-template"
          />
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Report Name", value: "{{Report Name}}" },
              { label: "Show Name", value: "{{Show Name}}" },
              { label: "Report Title", value: "{{Report Title}}" },
              { label: "Report Date", value: "{{Report Date}}" },
            ].map((variable) => (
              <Badge 
                key={variable.value}
                variant="outline" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  subjectTemplate: prev.subjectTemplate + variable.value 
                }))}
                data-testid={`btn-insert-subject-${variable.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {variable.label}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="body-template">Body Template</Label>
          <Textarea
            id="body-template"
            value={formData.bodyTemplate}
            onChange={(e) => setFormData(prev => ({ ...prev, bodyTemplate: e.target.value }))}
            placeholder="Enter body template..."
            className="min-h-[100px]"
            data-testid="input-body-template"
          />
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Report Name", value: "{{Report Name}}" },
              { label: "Show Name", value: "{{Show Name}}" },
              { label: "Report Title", value: "{{Report Title}}" },
              { label: "Report Date", value: "{{Report Date}}" },
            ].map((variable) => (
              <Badge 
                key={variable.value}
                variant="outline" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  bodyTemplate: prev.bodyTemplate + variable.value 
                }))}
                data-testid={`btn-insert-body-${variable.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {variable.label}
              </Badge>
            ))}
          </div>
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

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium">Distro Assignment</h4>
        <p className="text-xs text-muted-foreground">Select which document type will use this distribution list when sending.</p>
        <Select
          value={selectedAssignment}
          onValueChange={setSelectedAssignment}
        >
          <SelectTrigger data-testid="select-distro-assignment">
            <SelectValue placeholder="Select assignment..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily-call" data-testid="select-item-daily-call">
              Daily Call
            </SelectItem>
            {reportTypes.map((rt) => (
              <SelectItem key={rt.id} value={rt.id.toString()} data-testid={`select-item-report-type-${rt.id}`}>
                {rt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {distros.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">No Distribution Lists</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create distribution lists to easily send schedules and reports to groups of people.
            </p>
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
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{distro.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {getTotalRecipients(distro)} recipients | {getAssignmentLabel(distro)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
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
              {createMutation.isPending ? "Creating..." : "Create Distro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDistro} onOpenChange={(open) => !open && setEditingDistro(null)}>
        <DialogContent className="sm:max-w-lg">
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
});
