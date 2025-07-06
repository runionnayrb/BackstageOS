import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit2, Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import AdminGuard from "@/components/admin-guard";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileType?: string;
  betaAccess: string;
  betaFeatures?: string[];
  createdAt: string;
  updatedAt: string;
}

const BETA_FEATURES = [
  { id: 'advanced-reports', label: 'Advanced Reports' },
  { id: 'script-automation', label: 'Script Automation' },
  { id: 'cast-management', label: 'Cast Management' },
  { id: 'task-boards', label: 'Task Boards' }
];

function AdminUsersContent() {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    profileType: string;
    betaAccess: string;
    betaFeatures: string[];
  }>({ profileType: '', betaAccess: '', betaFeatures: [] });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users']
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${userId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User updated successfully" });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update user", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete user", 
        description: error.message || "Could not delete user. They may have existing data or be the last admin.",
        variant: "destructive" 
      });
    }
  });

  const startEdit = (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      profileType: user.profileType || '',
      betaAccess: user.betaAccess,
      betaFeatures: user.betaFeatures || []
    });
  };

  const saveEdit = () => {
    if (!editingUser) return;
    
    updateUserMutation.mutate({
      userId: editingUser,
      updates: editForm
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ profileType: '', betaAccess: '', betaFeatures: [] });
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const toggleBetaFeature = (featureId: string) => {
    setEditForm(prev => ({
      ...prev,
      betaFeatures: prev.betaFeatures.includes(featureId)
        ? prev.betaFeatures.filter(f => f !== featureId)
        : [...prev.betaFeatures, featureId]
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!users) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Shows
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>No Users Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Unable to load user data.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shows
          </Button>
          <h1 className="text-2xl font-semibold">User Management</h1>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {user.betaAccess.charAt(0).toUpperCase() + user.betaAccess.slice(1)}
                    </span>
                    {editingUser === user.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={updateUserMutation.isPending}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={deleteUserMutation.isPending}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to permanently delete user "{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}"? 
                                This action cannot be undone and will remove all user data including their shows, reports, and settings.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteUserMutation.isPending}
                              >
                                {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Email: {user.email}</p>
                    <p className="text-sm text-muted-foreground">User ID: {user.id}</p>
                  </div>

                  {editingUser === user.id ? (
                    <div className="grid gap-4">
                      <div>
                        <label className="text-sm font-medium">Profile Type</label>
                        <Select value={editForm.profileType} onValueChange={(value) => setEditForm(prev => ({ ...prev, profileType: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select profile type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="freelance">Freelance</SelectItem>
                            <SelectItem value="fulltime">Full-time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Beta Access</label>
                        <Select value={editForm.betaAccess} onValueChange={(value) => setEditForm(prev => ({ ...prev, betaAccess: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="limited">Limited</SelectItem>
                            <SelectItem value="full">Full</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editForm.betaAccess !== 'none' && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">Beta Features</label>
                          <div className="grid gap-2">
                            {BETA_FEATURES.map((feature) => (
                              <div key={feature.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={feature.id}
                                  checked={editForm.betaFeatures.includes(feature.id)}
                                  onCheckedChange={() => toggleBetaFeature(feature.id)}
                                />
                                <label htmlFor={feature.id} className="text-sm">
                                  {feature.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <p className="text-sm">
                        <strong>Profile:</strong> {user.profileType || 'Not set'}
                      </p>
                      <p className="text-sm">
                        <strong>Beta Access:</strong> {user.betaAccess}
                      </p>
                      {user.betaFeatures && user.betaFeatures.length > 0 && (
                        <div>
                          <p className="text-sm font-medium">Beta Features:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.betaFeatures.map((feature) => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {BETA_FEATURES.find(f => f.id === feature)?.label || feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  return (
    <AdminGuard>
      <AdminUsersContent />
    </AdminGuard>
  );
}