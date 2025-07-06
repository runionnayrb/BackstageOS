import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
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
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

const BETA_FEATURES = [
  { id: 'advanced-reports', label: 'Advanced Reports' },
  { id: 'script-automation', label: 'Script Automation' },
  { id: 'cast-management', label: 'Cast Management' },
  { id: 'task-boards', label: 'Task Boards' }
];

export default function AdminUsersComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    profileType: string;
    betaAccess: string;
    betaFeatures: string[];
    isAdmin: boolean;
  }>({
    profileType: '',
    betaAccess: '',
    betaFeatures: [],
    isAdmin: false
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    select: (data: User[]) => data,
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: any }) => 
      apiRequest('PATCH', `/api/admin/users/${userId}`, updates),
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest('DELETE', `/api/admin/users/${userId}`),
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user.id);
    setEditData({
      profileType: user.profileType || '',
      betaAccess: user.betaAccess,
      betaFeatures: user.betaFeatures || [],
      isAdmin: user.isAdmin || false
    });
  };

  const handleSave = () => {
    if (!editingUser) return;
    
    updateMutation.mutate({
      userId: editingUser,
      updates: editData
    });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditData({
      profileType: '',
      betaAccess: '',
      betaFeatures: [],
      isAdmin: false
    });
  };

  const handleFeatureToggle = (featureId: string, checked: boolean) => {
    setEditData(prev => ({
      ...prev,
      betaFeatures: checked 
        ? [...prev.betaFeatures, featureId]
        : prev.betaFeatures.filter(f => f !== featureId)
    }));
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {users.length} total users
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}${user.isAdmin ? ' - Admin' : ''}` 
                    : `${user.email}${user.isAdmin ? ' - Admin' : ''}`}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {user.profileType ? 
                      `${user.profileType.charAt(0).toUpperCase() + user.profileType.slice(1)} • ` : 
                      ''
                    }
                    {user.betaAccess === 'none' ? 'No Beta Access' :
                     user.betaAccess === 'limited' ? 'Limited Beta Access' :
                     user.betaAccess === 'full' ? 'Full Beta Access' :
                     user.betaAccess}
                  </span>
                  {editingUser === user.id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
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
                              onClick={() => deleteMutation.mutate(user.id)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(user)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {editingUser === user.id && (
              <div className="mt-4 space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Profile Type</label>
                    <Select
                      value={editData.profileType}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, profileType: value }))}
                    >
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
                    <Select
                      value={editData.betaAccess}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, betaAccess: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select beta access" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="admin-status"
                      checked={editData.isAdmin}
                      onCheckedChange={(checked) => 
                        setEditData(prev => ({ ...prev, isAdmin: checked as boolean }))
                      }
                    />
                    <label htmlFor="admin-status" className="text-sm font-medium">
                      Administrator Access
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Grants access to user management and system administration features
                  </p>
                </div>

                {editData.betaAccess === 'limited' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Beta Features</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BETA_FEATURES.map(feature => (
                        <div key={feature.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={feature.id}
                            checked={editData.betaFeatures.includes(feature.id)}
                            onCheckedChange={(checked) => 
                              handleFeatureToggle(feature.id, checked as boolean)
                            }
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}