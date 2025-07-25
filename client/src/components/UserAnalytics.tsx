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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Edit2, Trash2, Save, X, Brain, Target, DollarSign, TrendingUp, Users, BarChart3, Zap } from "lucide-react";
import HierarchicalUserManagement from "@/components/HierarchicalUserManagement";

interface UserAnalytics {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileType: string | null;
  betaAccess: boolean;
  betaFeatures: string[] | null;
  isAdmin: boolean;
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

interface UserAnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  totalMonthlyCost: number;
  averageSessionTime: number;
  topFeature: string;
}

interface EngagementAnalytics {
  totalUsers: number;
  averageEngagementScore: number;
  averageChurnRisk: number;
  engagementLevels: {
    champion: number;
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
  churnRiskLevels: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  usageTrends: {
    improving: number;
    stable: number;
    declining: number;
  };
  lastCalculated: string | null;
}

interface CostRecommendation {
  type: 'cost_optimization' | 'churn_prevention' | 'service_optimization';
  priority: 'high' | 'medium' | 'low';
  userId: number;
  userName: string;
  title: string;
  description: string;
  estimatedSavings: number;
  actionItems: string[];
}

interface UserBehaviorInsight {
  type: 'usage_pattern' | 'feature_adoption' | 'session_analysis' | 'growth_analysis';
  title: string;
  description: string;
  impact: 'infrastructure_planning' | 'product_development' | 'user_experience' | 'business_metrics';
  recommendation: string;
  data?: any[];
}

const BETA_FEATURES = [
  { id: "script-editor", label: "Script Editor" },
  { id: "advanced-reports", label: "Advanced Reports" },
  { id: "email-system", label: "Email System" },
  { id: "task-management", label: "Task Management" },
  { id: "performance-tracker", label: "Performance Tracker" },
];

export default function UserAnalytics() {
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    profileType: '',
    betaAccess: false,
    betaFeatures: [] as string[],
    isAdmin: false
  });
  const [selectedUser, setSelectedUser] = useState<UserAnalytics | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<UserAnalytics[]>({
    queryKey: ["/api/admin/user-analytics"],
  });

  const { data: stats } = useQuery<UserAnalyticsStats>({
    queryKey: ["/api/admin/analytics-stats"],
  });

  // Advanced Analytics Queries
  const { data: engagementAnalytics } = useQuery<EngagementAnalytics>({
    queryKey: ["/api/admin/engagement-analytics"],
  });

  const { data: costRecommendations = [] } = useQuery<CostRecommendation[]>({
    queryKey: ["/api/admin/cost-optimization-recommendations"],
  });

  const { data: behaviorInsights = [] } = useQuery<UserBehaviorInsight[]>({
    queryKey: ["/api/admin/user-behavior-insights"],
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

  const calculateEngagementMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/calculate-engagement-scores");
    },
    onSuccess: () => {
      toast({
        title: "Engagement Scores Updated",
        description: "User engagement scores have been recalculated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/engagement-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-analytics"] });
    },
    onError: () => {
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate engagement scores.",
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

  const getEngagementBadge = (level: string) => {
    switch (level) {
      case 'champion': return <Badge className="bg-purple-100 text-purple-800">Champion</Badge>;
      case 'high': return <Badge className="bg-green-100 text-green-800">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low': return <Badge className="bg-orange-100 text-orange-800">Low</Badge>;
      case 'inactive': return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getChurnRiskBadge = (level: string) => {
    switch (level) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case 'low': return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low': return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
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
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost Analysis
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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

      {/* Hierarchical User Management */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">User Management with Invited Editors</h3>
          <p className="text-sm text-gray-600">Users with "user" role and their invited editors organized by production</p>
        </div>
        <HierarchicalUserManagement />
      </div>
      
      {/* Full User Analytics (All Users) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Complete User Analytics</span>
            <div className="text-sm font-normal text-gray-600">
              {users.length} users (all roles)
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
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
                        </div>
                      </PopoverContent>
                    </Popover>
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
                            </div>
                          </PopoverContent>
                        </Popover>
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
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">User Engagement Analytics</h3>
              <p className="text-sm text-gray-600">Advanced engagement scoring and churn risk analysis</p>
            </div>
            <Button 
              onClick={() => calculateEngagementMutation.mutate()}
              disabled={calculateEngagementMutation.isPending}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {calculateEngagementMutation.isPending ? "Calculating..." : "Recalculate Scores"}
            </Button>
          </div>

          {engagementAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Engagement Score</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold">{engagementAnalytics.averageEngagementScore.toFixed(1)}</div>
                  <Progress value={engagementAnalytics.averageEngagementScore} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Churn Risk</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-red-600">{engagementAnalytics.averageChurnRisk.toFixed(1)}%</div>
                  <p className="text-xs text-gray-500">average risk</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Last Calculated</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg font-medium">
                    {engagementAnalytics.lastCalculated 
                      ? format(new Date(engagementAnalytics.lastCalculated), 'MMM d, h:mm a')
                      : 'Never'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {engagementAnalytics && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Levels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(engagementAnalytics.engagementLevels).map(([level, count]) => (
                        <div key={level} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getEngagementBadge(level)}
                            <span className="text-sm capitalize">{level}</span>
                          </div>
                          <span className="font-medium">{count} users</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Churn Risk Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(engagementAnalytics.churnRiskLevels).map(([level, count]) => (
                        <div key={level} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getChurnRiskBadge(level)}
                            <span className="text-sm capitalize">{level}</span>
                          </div>
                          <span className="font-medium">{count} users</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <h3 className="text-lg font-semibold">Cost Analysis & Optimization</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>High-Priority Cost Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costRecommendations.filter(r => r.priority === 'high').map((rec, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{rec.title}</h4>
                        <p className="text-sm text-gray-600">{rec.userName}</p>
                      </div>
                      <div className="text-right">
                        {getPriorityBadge(rec.priority)}
                        <div className="text-sm font-medium text-green-600 mt-1">
                          Save {formatCurrency(rec.estimatedSavings)}/month
                        </div>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{rec.description}</p>
                    <div className="text-xs">
                      <strong>Action items:</strong>
                      <ul className="mt-1 space-y-1">
                        {rec.actionItems.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <h3 className="text-lg font-semibold">User Behavior Insights</h3>
          
          <div className="space-y-4">
            {behaviorInsights.map((insight, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Type: {insight.type.replace('_', ' ')}</span>
                        <span>Impact: {insight.impact.replace('_', ' ')}</span>
                      </div>
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <h3 className="text-lg font-semibold">All Recommendations</h3>
          
          <div className="space-y-4">
            {costRecommendations.map((rec, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{rec.title}</h4>
                      <p className="text-sm text-gray-600">User: {rec.userName}</p>
                    </div>
                    <div className="text-right">
                      {getPriorityBadge(rec.priority)}
                      <div className="text-sm font-medium text-green-600 mt-1">
                        {formatCurrency(rec.estimatedSavings)}/month
                      </div>
                    </div>
                  </div>
                  <p className="text-sm mb-3">{rec.description}</p>
                  <div className="bg-gray-50 p-3 rounded text-xs">
                    <strong>Action Plan:</strong>
                    <ul className="mt-1 space-y-1">
                      {rec.actionItems.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}