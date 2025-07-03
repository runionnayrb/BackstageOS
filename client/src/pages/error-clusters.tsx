import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, Users, Clock, BarChart3, Activity } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface ErrorCluster {
  id: number;
  signature: string;
  errorPattern: string;
  occurrenceCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastOccurrence: Date;
  createdAt: Date;
  isResolved: boolean;
  affectedUsers: number;
  averageResolutionTime: number | null;
}

interface ErrorTrends {
  totalClusters: number;
  newClustersToday: number;
  criticalClusters: number;
  resolvedToday: number;
  trendData: {
    date: string;
    clusters: number;
    resolved: number;
  }[];
  severityDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export default function ErrorClustersPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch error clusters
  const { data: clusters = [], isLoading: clustersLoading } = useQuery({
    queryKey: ['/api/error-clusters', selectedTimeRange, selectedSeverity],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange: selectedTimeRange,
        ...(selectedSeverity !== 'all' && { severity: selectedSeverity })
      });
      const response = await fetch(`/api/error-clusters?${params}`);
      if (!response.ok) throw new Error('Failed to fetch error clusters');
      return response.json();
    }
  });

  // Fetch error trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/error-trends', selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/error-trends?timeRange=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch error trends');
      return response.json();
    }
  });

  // Resolve cluster mutation
  const resolveClusterMutation = useMutation({
    mutationFn: async (clusterId: number) => {
      return apiRequest(`/api/error-clusters/${clusterId}/resolve`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/error-clusters'] });
      queryClient.invalidateQueries({ queryKey: ['/api/error-trends'] });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (clustersLoading || trendsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Error Clustering Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor and analyze error patterns across your application</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedTimeRange} onValueChange={(value: '24h' | '7d' | '30d') => setSelectedTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Cards */}
        {trends && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clusters</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trends.totalClusters}</div>
                <p className="text-xs text-gray-600">
                  +{trends.newClustersToday} today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{trends.criticalClusters}</div>
                <p className="text-xs text-gray-600">
                  Requiring immediate attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{trends.resolvedToday}</div>
                <p className="text-xs text-gray-600">
                  Issues fixed and verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Affected Users</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {clusters.reduce((sum: number, cluster: ErrorCluster) => sum + (cluster.affectedUsers || 0), 0)}
                </div>
                <p className="text-xs text-gray-600">
                  Across all active clusters
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Severity Distribution */}
        {trends && (
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution</CardTitle>
              <CardDescription>Current error clusters by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-600">Critical</span>
                    <span className="text-sm text-gray-600">{trends.severityDistribution.critical}</span>
                  </div>
                  <Progress 
                    value={(trends.severityDistribution.critical / trends.totalClusters) * 100} 
                    className="h-2 bg-red-100"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-600">High</span>
                    <span className="text-sm text-gray-600">{trends.severityDistribution.high}</span>
                  </div>
                  <Progress 
                    value={(trends.severityDistribution.high / trends.totalClusters) * 100} 
                    className="h-2 bg-orange-100"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-600">Medium</span>
                    <span className="text-sm text-gray-600">{trends.severityDistribution.medium}</span>
                  </div>
                  <Progress 
                    value={(trends.severityDistribution.medium / trends.totalClusters) * 100} 
                    className="h-2 bg-yellow-100"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Low</span>
                    <span className="text-sm text-gray-600">{trends.severityDistribution.low}</span>
                  </div>
                  <Progress 
                    value={(trends.severityDistribution.low / trends.totalClusters) * 100} 
                    className="h-2 bg-green-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Clusters List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Error Clusters</CardTitle>
            <CardDescription>
              Grouped errors showing patterns and frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clusters.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Error Clusters Found</h3>
                  <p className="text-gray-600">
                    {selectedSeverity === 'all' 
                      ? 'No error clusters match the current time range.'
                      : `No ${selectedSeverity} severity clusters found.`}
                  </p>
                </div>
              ) : (
                clusters.map((cluster: ErrorCluster) => (
                  <div key={cluster.id} className="border rounded-lg p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={getSeverityColor(cluster.severity)}>
                            {getSeverityIcon(cluster.severity)}
                            <span className="ml-1 capitalize">{cluster.severity}</span>
                          </Badge>
                          {cluster.isResolved && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900">{cluster.errorPattern}</h3>
                        <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                          {cluster.signature}
                        </p>
                      </div>
                      {!cluster.isResolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveClusterMutation.mutate(cluster.id)}
                          disabled={resolveClusterMutation.isPending}
                        >
                          {resolveClusterMutation.isPending ? 'Resolving...' : 'Mark Resolved'}
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Activity className="h-4 w-4" />
                        <span>{cluster.occurrenceCount} occurrences</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{cluster.affectedUsers || 0} users affected</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Last: {formatDistanceToNow(new Date(cluster.lastOccurrence))} ago</span>
                      </div>
                      {cluster.averageResolutionTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Avg fix: {cluster.averageResolutionTime}h</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}