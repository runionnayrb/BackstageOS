import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, FileText, ChevronDown, Mail, Phone, GripVertical, Calendar, Plus, Settings, X, Users, Edit, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ContactDetailModal } from "@/components/contact-detail-modal";
import { WeeklyAvailabilityEditor } from "@/components/weekly-availability-editor";
import { ContactForm } from "@/components/contact-form";
import { ImportContactsModal } from "@/components/import-contacts-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { setPageHeaderIcons, clearPageHeaderIcons } from "@/hooks/useHeaderIcons";
import { FloatingActionButton } from "@/components/navigation/floating-action-button";
import { generateContactSheetPDF } from "@/lib/contactSheetPdf";
import { generateFacesheetPDF } from "@/lib/facesheetPdf";
import type { ContactGroup } from "@shared/schema";


interface PersonnelParams {
  id: string;
}

interface Contact {
  id: number;
  projectId: number;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  category: string;
  groupId?: number;
  role?: string;
  notes?: string;
}

export default function Personnel() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<PersonnelParams>();
  const projectId = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Guard against missing projectId
  if (!projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Personnel Not Found</h1>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist or the URL is invalid.</p>
          <Button onClick={() => setLocation('/shows')}>
            Go to Shows
          </Button>
        </div>
      </div>
    );
  }

  // Categories are loaded from database contact groups only
  const [categories, setCategories] = useState<{ id: string; title: string }[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [availabilityContact, setAvailabilityContact] = useState<Contact | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Contact groups management
  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [draggedGroupId, setDraggedGroupId] = useState<number | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);
  const [deletingGroupName, setDeletingGroupName] = useState('');

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Load saved category order from project settings
  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  // Query all contacts
  const { data: allContacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
    enabled: !!projectId,
  });

  // Fetch contact groups
  const { data: contactGroups = [] } = useQuery<ContactGroup[]>({
    queryKey: [`/api/projects/${projectId}/contact-groups`],
    enabled: !!projectId,
  });

  // Check for custom document template for contacts
  const { data: customTemplateInfo } = useQuery<{ hasTemplate: boolean; template: { id: number; name: string; fileType: string } | null }>({
    queryKey: ['/api/projects', projectId, 'has-custom-template', 'contacts'],
    enabled: !!projectId,
  });

  // Load groups from API on mount
  useEffect(() => {
    if (contactGroups.length > 0) {
      const groupMap = contactGroups.map(g => ({
        id: g.id.toString(),
        title: g.name,
      }));
      setCategories(groupMap);
    } else {
      setCategories([]);
    }
  }, [contactGroups]);


  // Set header icons for mobile header 
  useEffect(() => {
    if (isMobile) {
      setPageHeaderIcons([
        {
          icon: Users,
          onClick: () => setGroupsModalOpen(true),
          title: 'Manage groups'
        }
      ]);
    } else {
      clearPageHeaderIcons();
    }

    return () => clearPageHeaderIcons();
  }, [isMobile, projectId]);

  // Contact group mutations
  const createGroupMutation = useMutation({
    mutationFn: (name: string) => apiRequest('POST', `/api/projects/${projectId}/contact-groups`, { name }),
    onMutate: (name: string) => {
      // Optimistic update - add group immediately
      const previousGroups = queryClient.getQueryData<ContactGroup[]>([`/api/projects/${projectId}/contact-groups`]);
      if (previousGroups) {
        const newGroup: ContactGroup = {
          id: Math.random(), // Temporary ID
          projectId: parseInt(projectId),
          name,
          sortOrder: previousGroups.length + 1,
        };
        const updatedGroups = [...previousGroups, newGroup];
        queryClient.setQueryData([`/api/projects/${projectId}/contact-groups`], updatedGroups);
      }
      return previousGroups;
    },
    onError: (error, variables, context) => {
      // Revert to previous data on error
      if (context) {
        queryClient.setQueryData([`/api/projects/${projectId}/contact-groups`], context);
      }
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contact-groups`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
      setNewGroupName('');
      toast({ title: "Group created successfully" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number) => apiRequest('DELETE', `/api/contact-groups/${groupId}`),
    onMutate: (groupId: number) => {
      // Optimistic update - remove group immediately
      const previousGroups = queryClient.getQueryData<ContactGroup[]>([`/api/projects/${projectId}/contact-groups`]);
      if (previousGroups) {
        const updatedGroups = previousGroups.filter(g => g.id !== groupId);
        queryClient.setQueryData([`/api/projects/${projectId}/contact-groups`], updatedGroups);
      }
      return previousGroups;
    },
    onError: (error, variables, context) => {
      // Revert to previous data on error
      if (context) {
        queryClient.setQueryData([`/api/projects/${projectId}/contact-groups`], context);
      }
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
      toast({ title: "Group deleted successfully" });
    },
  });

  const reorderGroupsMutation = useMutation({
    mutationFn: (groupIds: number[]) => apiRequest('PUT', `/api/projects/${projectId}/contact-groups/reorder`, { groupIds }),
    onMutate: (groupIds: number[]) => {
      // Optimistic update - reorder groups immediately
      const previousGroups = queryClient.getQueryData<ContactGroup[]>([`/api/projects/${projectId}/contact-groups`]);
      if (previousGroups) {
        const reorderedGroups = groupIds.map((id, index) => {
          const group = previousGroups.find(g => g.id === id);
          return group ? { ...group, sortOrder: index + 1 } : group;
        }).filter((g): g is ContactGroup => g !== undefined);
        
        queryClient.setQueryData([`/api/projects/${projectId}/contact-groups`], reorderedGroups);
      }
      return previousGroups;
    },
    onError: (error, variables, context) => {
      // Revert to previous data on error
      if (context) {
        queryClient.setQueryData([`/api/projects/${projectId}/contact-groups`], context);
      }
      toast({
        title: "Error",
        description: "Failed to reorder groups",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Refetch to make sure we're in sync with server
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contact-groups`] });
    },
  });

  const renameGroupMutation = useMutation({
    mutationFn: (data: { groupId: number; name: string }) => apiRequest('PATCH', `/api/contact-groups/${data.groupId}`, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contact-groups`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
      setEditingGroupId(null);
      setEditingGroupName('');
      toast({ title: "Group renamed successfully" });
    },
  });

  const handleDragStartGroup = (e: React.DragEvent, groupId: number) => {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverGroup = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropGroup = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (!draggedGroupId || draggedGroupId === targetId) return;

    const sortedGroups = [...contactGroups].sort((a, b) => a.sortOrder - b.sortOrder);
    const draggedIdx = sortedGroups.findIndex(g => g.id === draggedGroupId);
    const targetIdx = sortedGroups.findIndex(g => g.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    [sortedGroups[draggedIdx], sortedGroups[targetIdx]] = [sortedGroups[targetIdx], sortedGroups[draggedIdx]];
    reorderGroupsMutation.mutate(sortedGroups.map(g => g.id));
    setDraggedGroupId(null);
  };

  // Group contacts by group ID, using contact groups from database
  const contactsByCategory = contactGroups.reduce((acc, group) => {
    acc[group.id] = allContacts.filter(contact => contact.groupId === group.id);
    return acc;
  }, {} as Record<number, Contact[]>);

  // Get unassigned contacts (contacts without a groupId)
  const unassignedContacts = allContacts.filter(contact => !contact.groupId);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactModal(true);
  };

  const handleContactModalClose = () => {
    setShowContactModal(false);
    setSelectedContact(null);
  };

  const handleEditContact = (contact: Contact) => {
    // Navigate to the group page for editing (use group ID or "unassigned")
    const groupSlug = contact.groupId ? `group-${contact.groupId}` : 'unassigned';
    setLocation(`/shows/${projectId}/contacts/${groupSlug}`);
  };

  const handleAvailabilityClick = (contact: Contact) => {
    setAvailabilityContact(contact);
    setShowAvailabilityModal(true);
  };

  const handleAvailabilityModalClose = () => {
    setShowAvailabilityModal(false);
    setAvailabilityContact(null);
  };

  const handleNewContactClick = () => {
    setShowNewContactModal(true);
  };

  const handleNewContactModalClose = () => {
    setShowNewContactModal(false);
  };

  const handleNewContactSuccess = () => {
    setShowNewContactModal(false);
    // Refresh the contacts list
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
  };

  const handleEmailContact = (email: string) => {
    setLocation(`/shows/${projectId}/compose?to=${encodeURIComponent(email)}`);
  };

  const handleDownloadContactSheet = async () => {
    try {
      await generateContactSheetPDF(allContacts, contactGroups, project?.name || 'Contact Sheet');
      toast({ title: "Contact sheet downloaded successfully" });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error generating PDF",
        description: "Failed to create contact sheet PDF",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFacesheet = async () => {
    try {
      await generateFacesheetPDF(allContacts, project?.name || 'Company Face Sheet');
      toast({ title: "Face sheet downloaded successfully" });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error generating PDF",
        description: "Failed to create face sheet PDF",
        variant: "destructive",
      });
    }
  };

  const handleDownloadWithTemplate = async () => {
    try {
      if (!customTemplateInfo?.hasTemplate) {
        toast({
          title: "No Custom Template",
          description: "No custom template is configured for contacts. Please upload one in Show Settings > Documents.",
          variant: "destructive",
        });
        return;
      }

      const templateData = {
        show: {
          title: (project as any)?.name || "",
        },
        contacts: allContacts.map((contact: Contact) => ({
          name: `${contact.firstName} ${contact.lastName}`.trim(),
          preferredName: contact.preferredName || "",
          email: contact.email || "",
          phone: contact.phone || "",
          role: contact.role || "",
          department: contactGroups.find(g => g.id === contact.groupId)?.name || "",
          notes: contact.notes || "",
        })),
      };

      const response = await fetch(`/api/projects/${projectId}/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'contacts',
          data: templateData,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.useDefault) {
          toast({
            title: "No Custom Template",
            description: "No active custom template found. Using default PDF export instead.",
          });
          handleDownloadContactSheet();
          return;
        }
        throw new Error(error.message || 'Failed to generate document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(project as any)?.name || 'Show'}_Contacts_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Contacts downloaded using your custom template",
      });
    } catch (error: any) {
      console.error('Template document generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate document from template",
        variant: "destructive",
      });
    }
  };

  const formatPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return '';
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as (xxx) xxx-xxxx
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    // Return original if not 10 digits
    return phone;
  };



  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* Desktop Header */}
      <div className="hidden md:block px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          
          <div className="flex items-center gap-4">
            {/* Upload / Import Button */}
            <button 
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Import contacts"
            >
              <Upload className="h-5 w-5" />
              <span className="text-sm">Import</span>
            </button>

            {/* Download Button */}
            {allContacts.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm">Download</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleDownloadContactSheet}>
                    Download Contact Sheet (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadFacesheet}>
                    Download Face Sheet (PDF)
                  </DropdownMenuItem>
                  {customTemplateInfo?.hasTemplate && (
                    <DropdownMenuItem onClick={handleDownloadWithTemplate}>
                      Download with Template
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Groups Button */}
            <Dialog open={groupsModalOpen} onOpenChange={setGroupsModalOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <Users className="h-5 w-5" />
                  <span className="text-sm">Groups</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Manage Contact Groups</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newGroup">Add New Group</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="newGroup"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g., Cast, Crew, Creative Team"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newGroupName) {
                            createGroupMutation.mutate(newGroupName);
                          }
                        }}
                      />
                      <Button
                        onClick={() => createGroupMutation.mutate(newGroupName)}
                        disabled={!newGroupName || createGroupMutation.isPending}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Your Groups (drag to reorder)</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {contactGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No groups yet</p>
                      ) : (
                        contactGroups.map((group) => (
                          <div
                            key={group.id}
                            draggable={editingGroupId !== group.id}
                            onDragStart={(e) => handleDragStartGroup(e, group.id)}
                            onDragOver={handleDragOverGroup}
                            onDrop={(e) => handleDropGroup(e, group.id)}
                            className="flex items-center justify-between p-2 border rounded bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                          >
                            {editingGroupId === group.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  placeholder="Group name"
                                  className="flex-1 h-8"
                                  autoFocus
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && editingGroupName) {
                                      renameGroupMutation.mutate({ groupId: group.id, name: editingGroupName });
                                    }
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => renameGroupMutation.mutate({ groupId: group.id, name: editingGroupName })}
                                  disabled={!editingGroupName || renameGroupMutation.isPending}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingGroupId(null);
                                    setEditingGroupName('');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">{group.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingGroupId(group.id);
                                      setEditingGroupName(group.name);
                                    }}
                                    title="Rename group"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDeletingGroupId(group.id);
                                      setDeletingGroupName(group.name);
                                    }}
                                    disabled={deleteGroupMutation.isPending}
                                    title="Delete group"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Button */}
            <button 
              onClick={handleNewContactClick}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!isLoading && categories.length === 0 && (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-2xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">No contacts yet.</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create Group Section */}
              <div className="text-left bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Create Group</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-gray-400">•</span>
                    <span>Use "Manage groups" to create new groups</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">•</span>
                    <span>Groups are required before adding contacts</span>
                  </li>
                </ul>
              </div>
              
              {/* Create Contact Section */}
              <div className="text-left bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Create Contact</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-gray-400">•</span>
                    <span>Import contacts from CSV using the import button</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">•</span>
                    <span>Add individual contacts manually</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Contact List */}
      {categories.length > 0 && (
      <div className="md:hidden px-4 pt-4 pb-4">
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryContacts = contactsByCategory[category.id] || [];
            
            return (
              <div
                key={category.id}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">{category.title}</h2>
                  <span className="text-gray-500 text-sm">({categoryContacts.length})</span>
                </div>
                
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-3 bg-gray-100 border border-gray-200 rounded-lg animate-pulse">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : categoryContacts.length === 0 ? (
                  <div className="text-gray-500 italic py-3 px-2 text-sm">
                    No contacts in this group yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleContactClick(contact)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </h3>
                            {contact.role && (
                              <p className="text-sm text-gray-600 mt-0.5">{contact.role}</p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Calendar 
                              className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAvailabilityClick(contact);
                              }}
                            />
                            {contact.email && (
                              <Mail 
                                className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmailContact(contact.email!);
                                }}
                              />
                            )}
                            {contact.phone && (
                              <Phone 
                                className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${contact.phone}`;
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {contact.email && (
                            <p className="text-sm text-gray-600 truncate">{contact.email}</p>
                          )}
                          {contact.phone && (
                            <p className="text-sm text-gray-600">{formatPhoneNumber(contact.phone)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Mobile Unassigned Section */}
          {unassignedContacts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold text-gray-500">Unassigned</h2>
                <span className="text-gray-400 text-sm">({unassignedContacts.length})</span>
              </div>
              <div className="space-y-2">
                {unassignedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleContactClick(contact)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {contact.firstName} {contact.lastName}
                        </h3>
                        {contact.role && (
                          <p className="text-sm text-gray-600 mt-0.5">{contact.role}</p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Calendar 
                          className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAvailabilityClick(contact);
                          }}
                        />
                        {contact.email && (
                          <Mail 
                            className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailContact(contact.email!);
                            }}
                          />
                        )}
                        {contact.phone && (
                          <Phone 
                            className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${contact.phone}`;
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {contact.email && (
                        <p className="text-sm text-gray-600 truncate">{contact.email}</p>
                      )}
                      {contact.phone && (
                        <p className="text-sm text-gray-600">{formatPhoneNumber(contact.phone)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Desktop Contact List */}
      {categories.length > 0 && (
      <div className="hidden md:block px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryContacts = contactsByCategory[category.id] || [];
            
            return (
              <div
                key={category.id}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
                  <span className="text-gray-500 text-sm">({categoryContacts.length})</span>
                </div>
                
                {isLoading ? (
                  <div className="space-y-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="p-2 bg-gray-100 animate-pulse rounded">
                        <div className="grid items-center gap-6" style={{ gridTemplateColumns: "2fr 1.5fr 3fr 1.5fr auto" }}>
                          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-300 rounded w-4/5"></div>
                          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : categoryContacts.length === 0 ? (
                  <div className="text-gray-500 italic py-4 px-2">
                    No contacts in this group yet.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {categoryContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleContactClick(contact)}
                      >
                        <div className="grid items-center gap-6" style={{ gridTemplateColumns: "2fr 1.5fr 3fr 1.5fr auto" }}>
                          <div className="text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-gray-900">
                            {contact.role || ''}
                          </div>
                          <div className="text-gray-900">
                            {contact.email || ''}
                          </div>
                          <div className="text-gray-900">
                            {formatPhoneNumber(contact.phone)}
                          </div>
                          
                          <div className="flex gap-2">
                            <Calendar 
                              className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAvailabilityClick(contact);
                              }}
                            />
                            {contact.email && (
                              <Mail 
                                className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmailContact(contact.email!);
                                }}
                              />
                            )}
                            {contact.phone && (
                              <Phone 
                                className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${contact.phone}`;
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Desktop Unassigned Section */}
          {unassignedContacts.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold text-gray-500">Unassigned</h2>
                <span className="text-gray-400 text-sm">({unassignedContacts.length})</span>
              </div>
              <div className="space-y-1">
                {unassignedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer transition-colors bg-gray-50 rounded"
                    onClick={() => handleContactClick(contact)}
                  >
                    <div className="grid items-center gap-6" style={{ gridTemplateColumns: "2fr 1.5fr 3fr 1.5fr auto" }}>
                      <div className="text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-gray-900">
                        {contact.role || ''}
                      </div>
                      <div className="text-gray-900">
                        {contact.email || ''}
                      </div>
                      <div className="text-gray-600">
                        {formatPhoneNumber(contact.phone)}
                      </div>
                      
                      <div className="flex gap-2">
                        <Calendar 
                          className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAvailabilityClick(contact);
                          }}
                        />
                        {contact.email && (
                          <Mail 
                            className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailContact(contact.email!);
                            }}
                          />
                        )}
                        {contact.phone && (
                          <Phone 
                            className="h-4 w-4 text-gray-600 hover:text-gray-800 cursor-pointer" 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${contact.phone}`;
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          isOpen={showContactModal}
          onClose={handleContactModalClose}
          onEdit={handleEditContact}
        />
      )}

      {/* Weekly Availability Modal */}
      {availabilityContact && (
        <WeeklyAvailabilityEditor
          contact={availabilityContact}
          isOpen={showAvailabilityModal}
          onOpenChange={setShowAvailabilityModal}
        />
      )}

      {/* Delete Group Confirmation Dialog */}
      <AlertDialog open={deletingGroupId !== null} onOpenChange={(open) => {
        if (!open) {
          setDeletingGroupId(null);
          setDeletingGroupName('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{deletingGroupName}" group? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingGroupId) {
                  deleteGroupMutation.mutate(deletingGroupId);
                  setDeletingGroupId(null);
                  setDeletingGroupName('');
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Contact Modal */}
      <Dialog open={showNewContactModal} onOpenChange={setShowNewContactModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            projectId={projectId}
            category="cast" // Default to cast, user can change it in the form
            onClose={handleNewContactModalClose}
            onSuccess={handleNewContactSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Import Contacts Modal */}
      <ImportContactsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        projectId={projectId}
        contactGroups={contactGroups}
        onImportSuccess={(importedData) => {
          // Find group IDs for imported groups
          const groupNameToId: Record<string, number> = {};
          importedData.groups.forEach(groupName => {
            const found = contactGroups.find(g => g.name === groupName);
            if (found) groupNameToId[groupName] = found.id;
          });
          
          // Optimistically add imported contacts
          const existingContacts = queryClient.getQueryData<Contact[]>([`/api/projects/${projectId}/contacts`]) || [];
          const newContacts = importedData.contacts.map((contact: any) => ({
            id: Math.random(),
            projectId: parseInt(projectId),
            firstName: contact.firstName || "Unknown",
            lastName: contact.lastName || "",
            preferredName: contact.preferredName || undefined,
            email: contact.email || undefined,
            phone: contact.phone || undefined,
            whatsapp: contact.whatsapp || undefined,
            category: 'cast',
            groupId: contact.group ? groupNameToId[contact.group] : undefined,
            role: contact.role || undefined,
          }));
          queryClient.setQueryData([`/api/projects/${projectId}/contacts`], [...existingContacts, ...newContacts]);
          
          // Refetch to get real data with actual IDs
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contacts`] });
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/contact-groups`] });
        }}
      />

      {isMobile && (
        <FloatingActionButton
          onClick={() => handleNewContactClick()}
          title="Add contact"
        />
      )}
    </div>
  );
}