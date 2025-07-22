import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Edit2, Trash2, Save, X, CreditCard, Calendar } from "lucide-react";

interface UserAnalytics {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileType: string | null;
  betaAccess: boolean;
  betaFeatures: string[] | null;
  isAdmin: boolean;
  isActive: boolean;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  grandfatheredFree: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  paymentMethodRequired: boolean | null;
  createdAt: Date;
  lastSeen: Date | null;
  activityLevel: 'high' | 'medium' | 'low' | 'inactive';
  dailyCost: number;
  monthlyCost: number;
  topFeatures: Array<{ feature: string; usage: number; percentage: number }>;
  sessionStats: {
    averageSession: number; // minutes
    totalSessions: number;
    lastSession: Date | null;
  };
  costBreakdown: Array<{ service: string; cost: number; requests: number }>;
}

interface BillingPlan {
  id: number;
  planId: string;
  name: string;
  description?: string;
  price: number;
  billingInterval: string;
  isActive: boolean;
}

interface UserAnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  totalMonthlyCost: number;
  averageSessionTime: number;
  topFeature: string;
}

const BETA_FEATURES = [
  { id: "script-editor", label: "Script Editor" },
  { id: "advanced-reports", label: "Advanced Reports" },
  { id: "email-system", label: "Email System" },
  { id: "task-management", label: "Task Management" },
  { id: "performance-tracker", label: "Performance Tracker" },
];

export default function UserAnalyticsSimple() {
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    profileType: '',
    betaAccess: false,
    betaFeatures: [] as string[],
    isAdmin: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch billing plans for subscription management
  const { data: billingPlans = [] } = useQuery<BillingPlan[]>({
    queryKey: ["/api/billing/plans"],
  });

  const { data: users = [], isLoading } = useQuery<UserAnalytics[]>({
    queryKey: ["/api/admin/user-analytics"],
  });

  const { data: stats } = useQuery<UserAnalyticsStats>({
    queryKey: ["/api/admin/analytics-stats"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { userId: number; updates: any }) => {
      return await apiRequest("PATCH", `/api/admin/users/${data.userId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics-stats"] });
      toast({
        title: "User updated successfully",
        description: "User settings have been saved.",
      });
      setEditingUser(null);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update user settings.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics-stats"] });
      toast({
        title: "User deleted",
        description: "User has been permanently deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  // Update user subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: (data: { userId: number; subscriptionData: any }) =>
      apiRequest("PUT", `/api/admin/users/${data.userId}/subscription`, data.subscriptionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics-stats"] });
      toast({
        title: "Success",
        description: "User subscription updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: UserAnalytics) => {
    setEditingUser(user.id);
    setEditData({
      profileType: user.profileType || '',
      betaAccess: user.betaAccess,
      betaFeatures: user.betaFeatures || [],
      isAdmin: user.isAdmin
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
      betaAccess: false,
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

  const getActivityBadge = (level: string) => {
    switch (level) {
      case 'high': return <Badge variant="default" className="bg-green-100 text-green-800">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Low</Badge>;
      case 'inactive': return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getSubscriptionStatusBadge = (status?: string | null) => {
    if (!status) return <Badge variant="secondary">Free</Badge>;
    
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "trialing":
        return <Badge variant="outline">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleUpdateUserSubscription = (userId: number, subscriptionData: any) => {
    updateSubscriptionMutation.mutate({ userId, subscriptionData });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-gray-500">of {stats.totalUsers} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{formatCurrency(stats.totalMonthlyCost)}</div>
              <p className="text-xs text-gray-500">total API spend</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Top Feature</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{stats.topFeature}</div>
              <p className="text-xs text-gray-500">most used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Session</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{formatTime(stats.averageSessionTime)}</div>
              <p className="text-xs text-gray-500">per session</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>User Analytics & Management</span>
            <div className="text-sm font-normal text-gray-600">
              {users.length} users
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Cost/Day</TableHead>
                <TableHead>Cost/Month</TableHead>
                <TableHead>Top Features</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.email}
                            {user.isAdmin && <span className="text-xs text-blue-600 ml-2">Admin</span>}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.profileType && `${user.profileType} • `}
                            {user.betaAccess ? 'Beta Access' : 'No Beta'}
                          </div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-3">
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm space-y-1">
                            <div>Profile: {user.profileType || 'Not set'}</div>
                            <div>Joined: {format(new Date(user.createdAt), 'MMM d, yyyy')}</div>
                            <div>Sessions: {user.sessionStats.totalSessions}</div>
                            <div>Avg Session: {formatTime(user.sessionStats.averageSession)}</div>
                          </div>
                          {user.betaFeatures && user.betaFeatures.length > 0 && (
                            <div>
                              <div className="text-sm font-medium mb-1">Beta Features:</div>
                              <div className="flex flex-wrap gap-1">
                                {user.betaFeatures.map(feature => (
                                  <Badge key={feature} variant="outline" className="text-xs">
                                    {BETA_FEATURES.find(f => f.id === feature)?.label || feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {user.costBreakdown.length > 0 && (
                            <div>
                              <div className="text-sm font-medium mb-1">Cost Breakdown:</div>
                              <div className="space-y-1 text-xs">
                                {user.costBreakdown.map((item, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{item.service}:</span>
                                    <span>{formatCurrency(item.cost)} ({item.requests} calls)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <Separator className="my-3" />
                          
                          {/* Subscription Management Section */}
                          <div>
                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Subscription Management
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Status:</span>
                                <span>{getSubscriptionStatusBadge(user.subscriptionStatus)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Plan:</span>
                                <span>{user.subscriptionPlan || "Free"}</span>
                              </div>
                              {user.trialEndsAt && (
                                <div className="flex justify-between">
                                  <span>Trial Ends:</span>
                                  <span className="text-xs">{new Date(user.trialEndsAt).toLocaleDateString()}</span>
                                </div>
                              )}
                              {user.subscriptionEndsAt && (
                                <div className="flex justify-between">
                                  <span>Subscription Ends:</span>
                                  <span className="text-xs">{new Date(user.subscriptionEndsAt).toLocaleDateString()}</span>
                                </div>
                              )}
                              {user.grandfatheredFree && (
                                <div className="text-xs text-blue-600">Grandfathered Free Account</div>
                              )}
                              
                              <div className="pt-2">
                                <Label className="text-xs">Update Subscription</Label>
                                <Select 
                                  onValueChange={(value) => {
                                    if (value === "cancel") {
                                      handleUpdateUserSubscription(user.id, {
                                        subscriptionStatus: "canceled",
                                        subscriptionEndsAt: new Date()
                                      });
                                    } else if (value === "free") {
                                      handleUpdateUserSubscription(user.id, {
                                        subscriptionStatus: null,
                                        subscriptionPlan: null,
                                        subscriptionEndsAt: null
                                      });
                                    } else {
                                      const plan = billingPlans.find(p => p.planId === value);
                                      if (plan) {
                                        handleUpdateUserSubscription(user.id, {
                                          subscriptionStatus: "active",
                                          subscriptionPlan: plan.planId,
                                          subscriptionEndsAt: null
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select action" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Set to Free</SelectItem>
                                    {billingPlans
                                      .filter(plan => plan.isActive)
                                      .map(plan => (
                                        <SelectItem key={plan.planId} value={plan.planId}>
                                          Upgrade to {plan.name}
                                        </SelectItem>
                                      ))}
                                    <SelectItem value="cancel">Cancel Subscription</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  <TableCell>
                    <Badge 
                      variant={user.isActive ? "outline" : "destructive"}
                      className={user.isActive ? "border-green-500 text-green-700" : ""}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {getSubscriptionStatusBadge(user.subscriptionStatus)}
                      {user.subscriptionPlan && (
                        <div className="text-xs text-gray-500">{user.subscriptionPlan}</div>
                      )}
                      {user.grandfatheredFree && (
                        <Badge variant="secondary" className="text-xs">Grandfathered</Badge>
                      )}
                      {user.trialEndsAt && (
                        <div className="text-xs text-orange-600">
                          Trial ends {new Date(user.trialEndsAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {getActivityBadge(user.activityLevel)}
                  </TableCell>

                  <TableCell className="font-mono text-sm">
                    {formatCurrency(user.dailyCost)}
                  </TableCell>

                  <TableCell className="font-mono text-sm">
                    {formatCurrency(user.monthlyCost)}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1 text-xs">
                      {user.topFeatures.slice(0, 2).map((feature, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span>{feature.feature}</span>
                          <span className="text-gray-500">{feature.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-gray-500">
                    {user.lastSeen 
                      ? format(new Date(user.lastSeen), 'MMM d, h:mm a')
                      : 'Never'
                    }
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      {editingUser === user.id ? (
                        <>
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
                                  This action cannot be undone and will remove all user data.
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
                        </>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {editingUser && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-4">Edit User Settings</h3>
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
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="beta-access"
                      checked={editData.betaAccess}
                      onCheckedChange={(checked) => 
                        setEditData(prev => ({ ...prev, betaAccess: checked as boolean }))
                      }
                    />
                    <label htmlFor="beta-access" className="text-sm font-medium">
                      Beta Access
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4">
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
              </div>

              {editData.betaAccess && (
                <div className="mt-4">
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
        </CardContent>
      </Card>
    </div>
  );
}