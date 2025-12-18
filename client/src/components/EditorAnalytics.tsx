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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Edit2, Trash2, Save, X, CreditCard, Calendar, Settings } from "lucide-react";

interface EditorProduction {
  projectId: number;
  projectName: string;
  role: string;
  accessLevel: string;
  status: string;
  invitedAt: string | null;
  invitedBy: string;
}

interface EditorInviter {
  id: number;
  name: string;
  email: string;
}

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
  searchMetrics: {
    totalSearches: number;
    dailySearches: number;
    naturalLanguageSearches: number;
    advancedSearches: number;
    averageResponseTime: number;
    searchCost: number;
  };
  invitedBy?: string;
  inviters?: EditorInviter[];
  productions?: EditorProduction[];
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

export default function EditorAnalytics() {
  const { toast } = useToast();
  
  // Get all editors with analytics data
  const { data: editorAnalytics, isLoading: isLoadingAnalytics } = useQuery<UserAnalytics[]>({
    queryKey: ['/api/admin/editor-analytics'],
  });

  const { data: analyticsStats, isLoading: isLoadingStats } = useQuery<UserAnalyticsStats>({
    queryKey: ['/api/admin/editor-analytics-stats'],
  });

  const { data: billingPlans = [] } = useQuery<BillingPlan[]>({
    queryKey: ['/api/billing/plans'],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getActivityBadge = (level: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      low: 'bg-orange-100 text-orange-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={colors[level as keyof typeof colors]}>{level}</Badge>;
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge className="bg-green-100 text-green-800">Active</Badge> :
      <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
  };

  if (isLoadingAnalytics || isLoadingStats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const filteredEditors = editorAnalytics || [];

  return (
    <div className="space-y-6">
      {/* Analytics Overview Cards */}
      {analyticsStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Editors</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{filteredEditors.filter(e => e.isActive).length}</div>
              <p className="text-xs text-gray-500">of {filteredEditors.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">
                {formatCurrency(filteredEditors.reduce((sum, editor) => sum + editor.monthlyCost, 0))}
              </div>
              <p className="text-xs text-gray-500">total API spend</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Top Feature</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{analyticsStats.topFeature}</div>
              <p className="text-xs text-gray-500">most used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Session Time</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{analyticsStats.averageSessionTime} min</div>
              <p className="text-xs text-gray-500">per session</p>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Editor List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Editor Analytics & Management</span>
            <div className="text-sm font-normal text-gray-600">
              {filteredEditors.length} editors
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Editor</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Productions</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEditors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 p-4">
                      No editors found.
                    </TableCell>
                  </TableRow>
                )}
                {filteredEditors.map((editor) => (
                  <TableRow key={editor.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {editor.firstName && editor.lastName 
                                ? `${editor.firstName} ${editor.lastName}` 
                                : editor.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {editor.email}
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-3">
                            <div className="font-medium">{editor.email}</div>
                            <div className="text-sm space-y-1">
                              <div>Profile: {editor.profileType || 'Not set'}</div>
                              <div>Joined: {format(new Date(editor.createdAt), 'MMM d, yyyy')}</div>
                              <div>Sessions: {editor.sessionStats.totalSessions}</div>
                              <div>Avg Session: {editor.sessionStats.averageSession} min</div>
                            </div>

                            {editor.searchMetrics && editor.searchMetrics.totalSearches > 0 && (
                              <div>
                                <div className="text-sm font-medium mb-1">Search Usage (30 days):</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span>Total Searches:</span>
                                    <span>{editor.searchMetrics.totalSearches}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Daily Searches:</span>
                                    <span>{editor.searchMetrics.dailySearches}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Natural Language:</span>
                                    <span>{editor.searchMetrics.naturalLanguageSearches}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Advanced Searches:</span>
                                    <span>{editor.searchMetrics.advancedSearches}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Avg Response Time:</span>
                                    <span>{editor.searchMetrics.averageResponseTime}ms</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Search Cost:</span>
                                    <span>{formatCurrency(editor.searchMetrics.searchCost)}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {editor.costBreakdown.length > 0 && (
                              <div>
                                <div className="text-sm font-medium mb-1">Cost Breakdown:</div>
                                <div className="space-y-1 text-xs">
                                  {editor.costBreakdown.map((item, idx) => (
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
                      <div className="text-sm">
                        {editor.invitedBy || 'Unknown'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer">
                            {editor.productions && editor.productions.length > 0 ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-xs">
                                  {editor.productions.length} production{editor.productions.length !== 1 ? 's' : ''}
                                </Badge>
                                <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                  {editor.productions[0]?.projectName}
                                  {editor.productions.length > 1 && ` +${editor.productions.length - 1} more`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">None</span>
                            )}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-3">
                            <div className="font-medium">Productions</div>
                            {editor.productions && editor.productions.length > 0 ? (
                              <div className="space-y-2">
                                {editor.productions.map((production, idx) => (
                                  <div key={idx} className="p-2 border rounded-lg text-sm">
                                    <div className="font-medium">{production.projectName}</div>
                                    <div className="text-xs text-gray-500 space-y-1 mt-1">
                                      <div className="flex justify-between">
                                        <span>Role:</span>
                                        <span>{production.role}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Access:</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {production.accessLevel}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Status:</span>
                                        <Badge 
                                          variant={production.status === 'accepted' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {production.status}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Invited by:</span>
                                        <span>{production.invitedBy}</span>
                                      </div>
                                      {production.invitedAt && (
                                        <div className="flex justify-between">
                                          <span>Invited:</span>
                                          <span>{format(new Date(production.invitedAt), 'MMM d, yyyy')}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">No productions found</div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </TableCell>

                    <TableCell>
                      <Badge 
                        variant={editor.isActive ? "outline" : "destructive"}
                        className={editor.isActive ? "border-green-500 text-green-700" : ""}
                      >
                        {editor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {getActivityBadge(editor.activityLevel)}
                    </TableCell>

                    <TableCell className="text-sm text-gray-500">
                      {editor.lastSeen 
                        ? format(new Date(editor.lastSeen), 'MMM d, h:mm a')
                        : 'Never'
                      }
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => console.log('Edit editor:', editor.id)}
                          data-testid={`button-edit-editor-${editor.id}`}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}