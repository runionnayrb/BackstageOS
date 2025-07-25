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
    queryKey: ['/api/admin/analytics-stats'],
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

      {/* Editor Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Editor Analytics & Management</CardTitle>
          <div className="text-sm text-gray-600">Comprehensive analytics for all editors with role-based access control</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Editor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Top Features</TableHead>
                  <TableHead>Search Metrics</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEditors.map((editor) => (
                  <TableRow key={editor.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">{editor.firstName} {editor.lastName}</div>
                        <div className="text-sm text-gray-500">{editor.email}</div>
                        <div className="text-xs text-gray-400">
                          Created {format(new Date(editor.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(editor.isActive)}
                        {getActivityBadge(editor.activityLevel)}
                        {editor.lastSeen && (
                          <div className="text-xs text-gray-500">
                            Last seen {format(new Date(editor.lastSeen), 'MMM d')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>Sessions: {editor.sessionStats.totalSessions.toLocaleString()}</div>
                        <div>Avg: {editor.sessionStats.averageSession}min</div>
                        {editor.sessionStats.lastSession && (
                          <div className="text-xs text-gray-500">
                            Last: {format(new Date(editor.sessionStats.lastSession), 'MMM d')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>{formatCurrency(editor.dailyCost)}/day</div>
                        <div className="font-medium">{formatCurrency(editor.monthlyCost)}/mo</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-blue-600">
                              View breakdown
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium">Cost Breakdown</h4>
                              {editor.costBreakdown.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span>{item.service}</span>
                                  <div className="text-right">
                                    <div>{formatCurrency(item.cost)}</div>
                                    <div className="text-xs text-gray-500">{item.requests.toLocaleString()} requests</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {editor.topFeatures.slice(0, 2).map((feature, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate max-w-20">{feature.feature}</span>
                            <span className="text-xs text-gray-500">{formatPercentage(feature.percentage)}</span>
                          </div>
                        ))}
                        {editor.topFeatures.length > 2 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-blue-600">
                                +{editor.topFeatures.length - 2} more
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64">
                              <div className="space-y-2">
                                <h4 className="font-medium">Feature Usage</h4>
                                {editor.topFeatures.map((feature, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span>{feature.feature}</span>
                                    <div className="text-right">
                                      <div>{formatPercentage(feature.percentage)}</div>
                                      <div className="text-xs text-gray-500">{feature.usage.toLocaleString()} uses</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>Total: {editor.searchMetrics.totalSearches.toLocaleString()}</div>
                        <div>Today: {editor.searchMetrics.dailySearches}</div>
                        <div className="text-xs text-gray-500">
                          {editor.searchMetrics.naturalLanguageSearches} NL, {editor.searchMetrics.advancedSearches} advanced
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg: {editor.searchMetrics.averageResponseTime}ms
                        </div>
                        <div className="text-xs text-gray-500">
                          Cost: {formatCurrency(editor.searchMetrics.searchCost)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
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