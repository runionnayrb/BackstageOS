import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, RefreshCw, Plus, Mail, Building2, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmailContact, Project } from "@shared/schema";

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

  // Sync contacts mutation
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

  const handleSyncContacts = () => {
    if (projectId) {
      syncContactsMutation.mutate();
    }
  };

  const handleAddContact = () => {
    addContactMutation.mutate(newContact);
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
      </div>
    </div>
  );
}