import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, TrendingDown, Shield, Zap, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';

interface ResolutionStats {
  totalResolved: number;
  automaticResolutions: number;
  manualResolutions: number;
  topStrategies: Array<{ strategy: string; count: number; successRate: number }>;
  resolutionTrends: Array<{ date: string; resolved: number; total: number }>;
}

interface ErrorTrends {
  increasingErrors: Array<{ errorType: string; trend: number; recommendation: string }>;
  decreasingErrors: Array<{ errorType: string; improvement: number }>;
  criticalPatterns: Array<{ pattern: string; frequency: number; impact: string }>;
}

export default function AutoResolutionDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  const { data: resolutionStats, isLoading: statsLoading } = useQuery<ResolutionStats>({
    queryKey: ['/api/admin/resolution-stats', selectedTimeRange],
    enabled: true
  });

  const { data: errorTrends, isLoading: trendsLoading } = useQuery<ErrorTrends>({
    queryKey: ['/api/admin/error-trends', selectedTimeRange],
    enabled: true
  });

  if (statsLoading || trendsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const automationRate = resolutionStats ? 
    Math.round((resolutionStats.automaticResolutions / resolutionStats.totalResolved) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/admin?tab=errors">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Error Logs
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Automatic Resolution Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Phase 4: Advanced error analytics and intelligent resolution tracking
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resolutionStats?.totalResolved || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Errors successfully resolved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation Rate</CardTitle>
              <Zap className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automationRate}%</div>
              <Progress value={automationRate} className="mt-2" />
              <p className="text-xs text-gray-600 mt-1">
                {resolutionStats?.automaticResolutions || 0} automatic, {resolutionStats?.manualResolutions || 0} manual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Strategy</CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {resolutionStats?.topStrategies?.[0]?.strategy.replace(/_/g, ' ') || 'N/A'}
              </div>
              <div className="text-2xl font-bold">
                {resolutionStats?.topStrategies?.[0]?.successRate || 0}%
              </div>
              <p className="text-xs text-gray-600 mt-1">Success rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Patterns</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{errorTrends?.criticalPatterns?.length || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Critical error patterns detected</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="strategies" className="space-y-6">
          <TabsList>
            <TabsTrigger value="strategies">Resolution Strategies</TabsTrigger>
            <TabsTrigger value="trends">Error Trends</TabsTrigger>
            <TabsTrigger value="patterns">Critical Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="strategies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Resolution Strategies</CardTitle>
                <CardDescription>
                  Most effective automatic resolution approaches with success rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resolutionStats?.topStrategies.map((strategy, index) => (
                    <div key={strategy.strategy} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {strategy.strategy.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {strategy.count} resolutions
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600 dark:text-green-400">
                          {strategy.successRate}%
                        </div>
                        <Progress value={strategy.successRate} className="w-24 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-red-500" />
                    <span>Increasing Errors</span>
                  </CardTitle>
                  <CardDescription>Error types showing upward trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {errorTrends?.increasingErrors.map((error) => (
                      <div key={error.errorType} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{error.errorType.replace(/_/g, ' ')}</span>
                          <Badge variant="destructive">+{error.trend}%</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {error.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingDown className="h-5 w-5 text-green-500" />
                    <span>Decreasing Errors</span>
                  </CardTitle>
                  <CardDescription>Error types showing improvement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {errorTrends?.decreasingErrors.map((error) => (
                      <div key={error.errorType} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{error.errorType.replace(/_/g, ' ')}</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            -{error.improvement}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span>Critical Error Patterns</span>
                </CardTitle>
                <CardDescription>
                  High-frequency error patterns requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {errorTrends?.criticalPatterns.map((pattern, index) => (
                    <div key={pattern.pattern} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {pattern.pattern}
                        </span>
                        <Badge variant="outline">
                          {pattern.frequency} occurrences
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Impact:</strong> {pattern.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}