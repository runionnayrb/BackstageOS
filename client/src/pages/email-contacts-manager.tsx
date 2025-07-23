import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, RefreshCw, Plus, Mail, Building2, User, List, X, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import type { EmailContact, Project, DistributionList, DistributionListMember } from "@shared/schema";

interface EmailContactsManagerParams {
  id: string;
}

export default function EmailContactsManager() {
  const params = useParams<EmailContactsManagerParams>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = params.id ? parseInt(params.id) : null;

  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactCategory: 'vendor' as 'vendor' | 'producer' | 'other',
    projectId: projectId
  });

  // Distribution list state
  const [createListOpen, setCreateListOpen] = useState(false);
  const [editingList, setEditingList] = useState<DistributionList | null>(null);
  const [newList, setNewList] = useState({
    name: '',
    description: '',
    listType: 'to' as 'to' | 'cc' | 'bcc',
    projectId: projectId
  });

  // Fetch project data
  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  // Fetch email contacts
  const { data: emailContacts = [], isLoading } = useQuery<EmailContact[]>({
    queryKey: ['/api/email-contacts', projectId],
    enabled: true,
  });

  // Fetch distribution lists
  const { data: distributionLists = [] } = useQuery<DistributionList[]>({
    queryKey: ['/api/distribution-lists', projectId],
    enabled: true,
  });

  // Sync contacts mutation (project-specific)
  const syncContactsMutation = useMutation({
    mutationFn: () => apiRequest(`/api/projects/${projectId}/sync-contacts-to-email`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-contacts'] });
      toast({
        title: "Contacts synced successfully",
        description: "All show contacts have been added to your email contacts.",
      });
    },
    onError: () => {
      toast({
        title: "Sync failed",
        description: "There was an error syncing your contacts.",
        variant: "destructive",
      });
    },
  });

  // Bulk sync all contacts mutation
  const bulkSyncContactsMutation = useMutation({
    mutationFn: () => apiRequest('/api/sync-all-contacts-to-email', {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-contacts'] });
      toast({
        title: "All contacts synced successfully",
        description: "All contacts from all your shows have been added to your email contacts.",
      });
    },
    onError: () => {
      toast({
        title: "Bulk sync failed",
        description: "There was an error syncing all your contacts.",
        variant: "destructive",
      });
    },
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: (contactData: typeof newContact) => apiRequest('/api/email-contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-contacts'] });
      setAddContactOpen(false);
      setNewContact({
        firstName: '',
        lastName: '',
        email: '',
        contactCategory: 'vendor',
        projectId: projectId
      });
      toast({
        title: "Contact added",
        description: "New contact has been added to your email contacts.",
      });
    },
    onError: () => {
      toast({
        title: "Error adding contact",
        description: "There was an error adding the contact.",
        variant: "destructive",
      });
    },
  });

  // Distribution list mutations
  const createDistributionListMutation = useMutation({
    mutationFn: (listData: typeof newList) => apiRequest('/api/distribution-lists', {
      method: 'POST',
      body: JSON.stringify(listData),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution-lists'] });
      toast({
        title: "Distribution list created",
        description: "Your distribution list has been created successfully.",
      });
      setNewList({
        name: '',
        description: '',
        listType: 'to',
        projectId: projectId
      });
      setCreateListOpen(false);
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "There was an error creating the distribution list.",
        variant: "destructive",
      });
    },
  });

  const updateDistributionListMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof newList> }) => 
      apiRequest(`/api/distribution-lists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution-lists'] });
      toast({
        title: "Distribution list updated",
        description: "Your distribution list has been updated successfully.",
      });
      setEditingList(null);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "There was an error updating the distribution list.",
        variant: "destructive",
      });
    },
  });

  const deleteDistributionListMutation = useMutation({
    mutationFn: (listId: number) => apiRequest(`/api/distribution-lists/${listId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution-lists'] });
      toast({
        title: "Distribution list deleted",
        description: "Your distribution list has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the distribution list.",
        variant: "destructive",
      });
    },
  });

  const handleSyncContacts = () => {
    if (projectId) {
      syncContactsMutation.mutate();
    }
  };

  const handleBulkSyncContacts = () => {
    bulkSyncContactsMutation.mutate();
  };

  const handleAddContact = () => {
    addContactMutation.mutate(newContact);
  };

  const handleCreateList = () => {
    createDistributionListMutation.mutate(newList);
  };

  const handleUpdateList = (list: DistributionList, updates: Partial<typeof newList>) => {
    updateDistributionListMutation.mutate({ id: list.id, data: updates });
  };

  const handleDeleteList = (listId: number) => {
    deleteDistributionListMutation.mutate(listId);
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'cast': return <User className="h-4 w-4" />;
      case 'crew': return <Users className="h-4 w-4" />;
      case 'vendor': return <Building2 className="h-4 w-4" />;
      case 'producer': return <Mail className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'cast': return 'bg-blue-100 text-blue-800';
      case 'crew': return 'bg-green-100 text-green-800';
      case 'vendor': return 'bg-purple-100 text-purple-800';
      case 'producer': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const showContacts = emailContacts.filter(contact => contact.projectId === projectId);
  const generalContacts = emailContacts.filter(contact => !contact.projectId);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Email Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your unified email contact list for {project?.name || 'all shows'}
          </p>
        </div>
        <div className="flex gap-2">
          {projectId && (
            <Button 
              onClick={handleSyncContacts}
              disabled={syncContactsMutation.isPending}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {syncContactsMutation.isPending ? 'Syncing...' : 'Sync Show Contacts'}
            </Button>
          )}
          
          <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={newContact.firstName}
                      onChange={(e) => setNewContact({...newContact, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={newContact.lastName}
                      onChange={(e) => setNewContact({...newContact, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newContact.contactCategory}
                    onValueChange={(value: 'vendor' | 'producer' | 'other') => 
                      setNewContact({...newContact, contactCategory: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="producer">Producer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAddContact} 
                  disabled={addContactMutation.isPending || !newContact.firstName || !newContact.lastName || !newContact.email}
                  className="w-full"
                >
                  {addContactMutation.isPending ? 'Adding...' : 'Add Contact'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        {projectId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {project?.name} Contacts ({showContacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No show contacts yet.</p>
                  <p className="text-sm">Click "Sync Show Contacts" to import from your show's contact list.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {showContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(contact.contactCategory)}
                        <div>
                          <div className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {contact.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.contactCategory && (
                          <Badge className={getCategoryColor(contact.contactCategory)}>
                            {contact.contactCategory}
                          </Badge>
                        )}
                        {contact.isManuallyAdded && (
                          <Badge variant="outline">Manual</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              General Contacts ({generalContacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generalContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No general contacts yet.</p>
                <p className="text-sm">Add vendors, producers, and other contacts not tied to specific shows.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {generalContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(contact.contactCategory)}
                      <div>
                        <div className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contact.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {contact.contactCategory && (
                        <Badge className={getCategoryColor(contact.contactCategory)}>
                          {contact.contactCategory}
                        </Badge>
                      )}
                      <Badge variant="outline">General</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Distribution Lists ({distributionLists.length})
              </div>
              <Dialog open={createListOpen} onOpenChange={setCreateListOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create List
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Distribution List</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="listName">List Name</Label>
                      <Input
                        id="listName"
                        value={newList.name}
                        onChange={(e) => setNewList({...newList, name: e.target.value})}
                        placeholder="e.g., Creative Team, Production Staff"
                      />
                    </div>
                    <div>
                      <Label htmlFor="listDescription">Description (Optional)</Label>
                      <Input
                        id="listDescription"
                        value={newList.description}
                        onChange={(e) => setNewList({...newList, description: e.target.value})}
                        placeholder="Brief description of this list"
                      />
                    </div>
                    <div>
                      <Label htmlFor="listType">Default Email Field</Label>
                      <Select
                        value={newList.listType}
                        onValueChange={(value: 'to' | 'cc' | 'bcc') => 
                          setNewList({...newList, listType: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="to">To</SelectItem>
                          <SelectItem value="cc">CC</SelectItem>
                          <SelectItem value="bcc">BCC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleCreateList} 
                      disabled={createDistributionListMutation.isPending || !newList.name}
                      className="w-full"
                    >
                      {createDistributionListMutation.isPending ? 'Creating...' : 'Create List'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distributionLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No distribution lists yet.</p>
                <p className="text-sm">Create lists to organize contacts for email campaigns.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {distributionLists.map((list) => (
                  <DistributionListCard
                    key={list.id}
                    list={list}
                    emailContacts={emailContacts}
                    onUpdate={handleUpdateList}
                    onDelete={handleDeleteList}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface DistributionListCardProps {
  list: DistributionList;
  emailContacts: EmailContact[];
  onUpdate: (list: DistributionList, updates: Partial<{name: string; description: string; listType: 'to' | 'cc' | 'bcc'}>) => void;
  onDelete: (listId: number) => void;
}

function DistributionListCard({ list, emailContacts, onUpdate, onDelete }: DistributionListCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [editDescription, setEditDescription] = useState(list.description || '');
  const [editListType, setEditListType] = useState(list.listType);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for list members
  const { data: members = [] } = useQuery<(DistributionListMember & { emailContact: EmailContact })[]>({
    queryKey: ['/api/distribution-lists', list.id, 'members'],
    enabled: isExpanded,
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ emailContactId, listType }: { emailContactId: number; listType: string }) => 
      apiRequest(`/api/distribution-lists/${list.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ emailContactId, listType }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution-lists', list.id, 'members'] });
      toast({ title: "Contact added to list" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: number) => 
      apiRequest(`/api/distribution-lists/${list.id}/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution-lists', list.id, 'members'] });
      toast({ title: "Contact removed from list" });
    },
  });

  const handleSaveEdit = () => {
    onUpdate(list, {
      name: editName,
      description: editDescription,
      listType: editListType as 'to' | 'cc' | 'bcc'
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(list.name);
    setEditDescription(list.description || '');
    setEditListType(list.listType);
    setIsEditing(false);
  };

  const handleToggleMember = (emailContact: EmailContact, checked: boolean) => {
    const existingMember = members.find(m => m.emailContact.id === emailContact.id);
    
    if (checked && !existingMember) {
      addMemberMutation.mutate({ emailContactId: emailContact.id, listType: list.listType });
    } else if (!checked && existingMember) {
      removeMemberMutation.mutate(existingMember.id);
    }
  };

  const getListTypeColor = (type: string) => {
    switch (type) {
      case 'to': return 'bg-blue-100 text-blue-800';
      case 'cc': return 'bg-green-100 text-green-800';
      case 'bcc': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 h-auto"
          >
            <List className="h-4 w-4" />
          </Button>
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="font-medium h-8"
            />
          ) : (
            <h3 className="font-medium">{list.name}</h3>
          )}
          <Badge className={getListTypeColor(list.listType)}>
            {list.listType.toUpperCase()}
          </Badge>
          <Badge variant="outline">
            {members.length} members
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(list.id)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mb-4 space-y-2">
          <Input
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <Select
            value={editListType}
            onValueChange={(value: 'to' | 'cc' | 'bcc') => setEditListType(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="to">To</SelectItem>
              <SelectItem value="cc">CC</SelectItem>
              <SelectItem value="bcc">BCC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {list.description && !isEditing && (
        <p className="text-sm text-muted-foreground mb-2">{list.description}</p>
      )}

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <h4 className="font-medium text-sm">Manage Members</h4>
          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {emailContacts.map((contact) => {
              const isMember = members.some(m => m.emailContact.id === contact.id);
              return (
                <div key={contact.id} className="flex items-center space-x-2 p-2 border rounded">
                  <Checkbox
                    checked={isMember}
                    onCheckedChange={(checked) => handleToggleMember(contact, checked as boolean)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {contact.email}
                    </div>
                  </div>
                  {contact.contactCategory && (
                    <Badge variant="outline" className="text-xs">
                      {contact.contactCategory}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}