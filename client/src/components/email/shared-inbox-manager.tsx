import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Settings, Mail, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { SharedInbox, SharedInboxMember } from '@shared/schema';

interface SharedInboxManagerProps {
  projectId: number;
  projectName: string;
}

export function SharedInboxManager({ projectId, projectName }: SharedInboxManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInbox, setEditingInbox] = useState<SharedInbox | null>(null);
  const [selectedInbox, setSelectedInbox] = useState<SharedInbox | null>(null);
  const [managingMembers, setManagingMembers] = useState<SharedInbox | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch shared inboxes for the project
  const { data: sharedInboxes = [], isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'shared-inboxes'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/shared-inboxes`);
      if (!response.ok) throw new Error('Failed to fetch shared inboxes');
      return response.json();
    }
  });

  // Create shared inbox mutation
  const createInboxMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/projects/${projectId}/shared-inboxes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'shared-inboxes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shared-inboxes'] }); // Also invalidate global shared inboxes
      setIsCreateOpen(false);
      toast({ title: 'Shared inbox created successfully' });
    },
    onError: (error: any) => {
      console.error('Shared inbox creation error:', error);
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      toast({ 
        title: 'Error creating shared inbox', 
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });

  // Update shared inbox mutation
  const updateInboxMutation = useMutation({
    mutationFn: async ({ inboxId, data }: { inboxId: number; data: any }) => {
      const response = await fetch(`/api/shared-inboxes/${inboxId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'shared-inboxes'] });
      setEditingInbox(null);
      toast({ title: 'Shared inbox updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating shared inbox', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete shared inbox mutation
  const deleteInboxMutation = useMutation({
    mutationFn: async (inboxId: number) => {
      const response = await fetch(`/api/shared-inboxes/${inboxId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'shared-inboxes'] });
      toast({ title: 'Shared inbox deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting shared inbox', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleCreateInbox = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const customEmailPrefix = formData.get('customEmailPrefix') as string;
    const emailAddress = customEmailPrefix ? `${customEmailPrefix.toLowerCase().replace(/[^a-z0-9-]/g, '')}@backstageos.com` : undefined;
    
    const data = {
      name: formData.get('name'),
      emailAddress,
      isActive: true // Add default value
    };

    console.log('Creating shared inbox with data:', data);
    createInboxMutation.mutate(data);
  };

  const handleUpdateInbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInbox) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    const data = {
      name: formData.get('name'),
      isActive: formData.get('isActive') === 'true'
    };

    updateInboxMutation.mutate({ inboxId: editingInbox.id, data });
  };

  const handleDeleteInbox = (inbox: SharedInbox) => {
    if (confirm(`Are you sure you want to delete the shared inbox "${inbox.name}"? This action cannot be undone.`)) {
      deleteInboxMutation.mutate(inbox.id);
    }
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shared Inboxes</h2>
          <p className="text-gray-600">Team collaboration email inboxes for {projectName}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Shared Inbox
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Shared Inbox</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInbox} className="space-y-4">
              <div>
                <Label htmlFor="name">Inbox Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Stage Management Team" 
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="customEmailPrefix">Custom Email Address</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="customEmailPrefix" 
                    name="customEmailPrefix" 
                    placeholder="macbeth-sm" 
                    required
                    className="flex-1"
                  />
                  <span className="text-gray-500">@backstageos.com</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Choose a unique email address for this show's team inbox
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInboxMutation.isPending}>
                  {createInboxMutation.isPending ? 'Creating...' : 'Create Inbox'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shared Inboxes List */}
      {sharedInboxes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shared inboxes yet</h3>
            <p className="text-gray-500 text-center mb-4">
              Create shared inboxes to enable team collaboration on emails
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Shared Inbox
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sharedInboxes.map((inbox: SharedInbox) => (
            <Card key={inbox.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <div>
                      <CardTitle className="text-lg">{inbox.name}</CardTitle>
                      <CardDescription>{inbox.emailAddress}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={inbox.isActive ? "default" : "secondary"}>
                      {inbox.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">
                      Stage Management
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {inbox.description && (
                  <p className="text-gray-600 mb-4">{inbox.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      0 members
                    </span>
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      0 emails
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManagingMembers(inbox)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Manage Members
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingInbox(inbox)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteInbox(inbox)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Shared Inbox Dialog */}
      <Dialog open={!!editingInbox} onOpenChange={(open) => !open && setEditingInbox(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shared Inbox</DialogTitle>
          </DialogHeader>
          {editingInbox && (
            <form onSubmit={handleUpdateInbox} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Inbox Name</Label>
                <Input 
                  id="edit-name" 
                  name="name" 
                  defaultValue={editingInbox.name}
                  required 
                />
              </div>
              

              
              <div>
                <Label htmlFor="edit-isActive">Status</Label>
                <Select name="isActive" defaultValue={editingInbox.isActive.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingInbox(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateInboxMutation.isPending}>
                  {updateInboxMutation.isPending ? 'Updating...' : 'Update Inbox'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Member Management Dialog */}
      <Dialog open={!!managingMembers} onOpenChange={(open) => !open && setManagingMembers(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Team Members - {managingMembers?.name}</DialogTitle>
          </DialogHeader>
          {managingMembers && (
            <div className="space-y-6">
              {/* Add Member Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Add Team Member</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="member-email">Email Address</Label>
                    <Input 
                      id="member-email" 
                      placeholder="team.member@example.com" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="member-role">Theater Role</Label>
                    <Select defaultValue="viewer">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="stage_manager">Stage Manager</SelectItem>
                        <SelectItem value="production_assistant">Production Assistant</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                </div>
              </div>

              {/* Current Members List */}
              <div>
                <h3 className="font-medium mb-3">Current Members (0)</h3>
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No team members added yet</p>
                  <p className="text-sm">Add your first team member above</p>
                </div>
              </div>

              {/* Role Descriptions */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-2">Theater Role Permissions</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Admin:</strong> Full inbox management, can assign emails, add/remove members</div>
                  <div><strong>Stage Manager:</strong> Can assign emails, manage responses, and view all conversations</div>
                  <div><strong>Production Assistant:</strong> Can respond to assigned emails and collaborate on threads</div>
                  <div><strong>Viewer:</strong> Read-only access to shared communications</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}