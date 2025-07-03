import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Zap, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  BarChart3,
  Target,
  Clock,
  Star,
  AlertCircle
} from 'lucide-react';
import { Link } from 'wouter';

interface AdvancedAnalyticsReport {
  summary: {
    totalErrors: number;
    resolvedErrors: number;
    avgResolutionTime: number;
    systemHealthScore: number;
  };
  trends: ErrorTrendAnalysis[];
  userSatisfaction: UserSatisfactionMetric[];
  featureStability: FeatureStabilityMetric[];
  criticalPatterns: CriticalPattern[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface ErrorTrendAnalysis {
  timeFrame: string;
  errorType: string;
  frequency: number;
  trend: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  businessImpact: string;
  recommendation: string;
}

interface UserSatisfactionMetric {
  userId: number;
  timeFrame: 'daily' | 'weekly' | 'monthly';
  errorFrequency: number;
  satisfactionScore: number;
  totalErrors: number;
  resolvedErrors: number;
  criticalErrors: number;
}

interface FeatureStabilityMetric {
  featureName: string;
  errorCount: number;
  uniqueUsers: number;
  avgResolutionTime: number;
  stabilityScore: number;
  lastErrorAt: Date | null;
}

interface CriticalPattern {
  pattern: string;
  frequency: number;
  impact: string;
  affectedFeatures: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface SystemHealth {
  overall: number;
  categories: {
    stability: number;
    performance: number;
    userSatisfaction: number;
    errorResolution: number;
  };
  trend: 'improving' | 'stable' | 'declining';
}

export default function AdvancedAnalyticsDashboard() {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('30');
  const [satisfactionTimeFrame, setSatisfactionTimeFrame] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const { data: analyticsReport, isLoading: reportLoading } = useQuery<AdvancedAnalyticsReport>({
    queryKey: ['/api/admin/advanced-analytics', selectedTimeFrame],
    enabled: true
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ['/api/admin/system-health'],
    enabled: true
  });

  const { data: userSatisfaction, isLoading: satisfactionLoading } = useQuery<UserSatisfactionMetric[]>({
    queryKey: ['/api/admin/user-satisfaction', satisfactionTimeFrame],
    enabled: true
  });

  const { data: featureStability, isLoading: stabilityLoading } = useQuery<FeatureStabilityMetric[]>({
    queryKey: ['/api/admin/feature-stability'],
    enabled: true
  });

  if (reportLoading || healthLoading || satisfactionLoading || stabilityLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/admin-error-logs">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 w-fit">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Error Logs
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Advanced Analytics Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                Phase 5: Comprehensive error analysis, business impact assessment, and user satisfaction metrics
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={selectedTimeFrame} onValueChange={setSelectedTimeFrame}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Shield className={`h-4 w-4 ${getHealthColor(systemHealth?.overall || 0)}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getHealthColor(systemHealth?.overall || 0)}`}>
                {systemHealth?.overall || 0}/10
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {systemHealth?.trend === 'improving' && '↗️ Improving'}
                {systemHealth?.trend === 'stable' && '→ Stable'}
                {systemHealth?.trend === 'declining' && '↘️ Declining'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsReport?.summary.totalErrors || 0}</div>
              <p className="text-xs text-gray-600 mt-1">Last {selectedTimeFrame} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Errors</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsReport?.summary.resolvedErrors || 0}</div>
              <p className="text-xs text-gray-600 mt-1">
                {analyticsReport?.summary.totalErrors ? 
                  Math.round((analyticsReport.summary.resolvedErrors / analyticsReport.summary.totalErrors) * 100) : 0}% resolution rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsReport?.summary.avgResolutionTime || 0}min</div>
              <p className="text-xs text-gray-600 mt-1">Average time to resolution</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userSatisfaction ? 
                  (userSatisfaction.reduce((sum, metric) => sum + metric.satisfactionScore, 0) / userSatisfaction.length).toFixed(1) : 
                  '0.0'}
              </div>
              <p className="text-xs text-gray-600 mt-1">Average satisfaction score</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
            <TabsTrigger value="trends" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Error </span>Trends
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Critical </span>Patterns
            </TabsTrigger>
            <TabsTrigger value="features" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Feature </span>Stability
            </TabsTrigger>
            <TabsTrigger value="satisfaction" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">User </span>Satisfaction
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs sm:text-sm col-span-2 sm:col-span-1">
              Recommendations
            </TabsTrigger>
          </TabsList>

          {/* Error Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Error Trend Analysis</span>
                </CardTitle>
                <CardDescription>
                  Analyze error patterns and trends over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsReport?.trends.map((trend, index) => (
                    <div key={index} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-sm sm:text-base">{trend.errorType.replace('_', ' ').toUpperCase()}</h4>
                          <Badge className={getSeverityColor(trend.severity)}>
                            {trend.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(trend.trend)}
                          <span className="text-sm font-medium">{Math.abs(trend.trend)}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Frequency:</span>
                          <span className="font-medium ml-2">{trend.frequency} occurrences</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Business Impact:</span>
                          <span className="ml-2">{trend.businessImpact}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Recommendation:</span>
                          <span className="ml-2">{trend.recommendation}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Critical Patterns Tab */}
          <TabsContent value="patterns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Critical Error Patterns</span>
                </CardTitle>
                <CardDescription>
                  Error patterns requiring immediate attention based on frequency and impact
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsReport?.criticalPatterns.map((pattern, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{pattern.pattern}</h4>
                        <Badge className={getSeverityColor(pattern.urgency)}>
                          {pattern.urgency} urgency
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Frequency:</span>
                          <span className="font-medium ml-2">{pattern.frequency} times</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Impact:</span>
                          <span className="ml-2">{pattern.impact}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Affected Features:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {pattern.affectedFeatures.map((feature, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feature Stability Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Feature Stability Metrics</span>
                </CardTitle>
                <CardDescription>
                  Monitor the stability and reliability of key application features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {featureStability?.map((feature, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{feature.featureName}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Stability:</span>
                          <span className={`font-medium ${getHealthColor(feature.stabilityScore)}`}>
                            {feature.stabilityScore}/10
                          </span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <Progress value={feature.stabilityScore * 10} className="h-2" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Error Count:</span>
                          <span className="font-medium ml-2">{feature.errorCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Unique Users:</span>
                          <span className="font-medium ml-2">{feature.uniqueUsers}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Resolution:</span>
                          <span className="font-medium ml-2">{feature.avgResolutionTime}min</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Error:</span>
                          <span className="ml-2">
                            {feature.lastErrorAt ? 
                              new Date(feature.lastErrorAt).toLocaleDateString() : 
                              'No recent errors'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Satisfaction Tab */}
          <TabsContent value="satisfaction" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">User Satisfaction Metrics</h3>
              <Select value={satisfactionTimeFrame} onValueChange={(value) => setSatisfactionTimeFrame(value as 'daily' | 'weekly' | 'monthly')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Experience Analysis</span>
                </CardTitle>
                <CardDescription>
                  Track user satisfaction based on error frequency and resolution effectiveness
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userSatisfaction?.map((metric, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">User {metric.userId}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Satisfaction:</span>
                          <span className={`font-medium ${getHealthColor(metric.satisfactionScore)}`}>
                            {metric.satisfactionScore}/10
                          </span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <Progress value={metric.satisfactionScore * 10} className="h-2" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Error Frequency:</span>
                          <span className="font-medium ml-2">{metric.errorFrequency}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Errors:</span>
                          <span className="font-medium ml-2">{metric.totalErrors}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Resolved:</span>
                          <span className="font-medium ml-2">{metric.resolvedErrors}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Critical:</span>
                          <span className="font-medium ml-2">{metric.criticalErrors}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600">
                    <Zap className="h-5 w-5" />
                    <span>Immediate Actions</span>
                  </CardTitle>
                  <CardDescription>Critical fixes needed now</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analyticsReport?.recommendations.immediate.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-orange-600">
                    <Target className="h-5 w-5" />
                    <span>Short-term Goals</span>
                  </CardTitle>
                  <CardDescription>Improvements for next 2-4 weeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analyticsReport?.recommendations.shortTerm.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Activity className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                    <span>Long-term Strategy</span>
                  </CardTitle>
                  <CardDescription>Strategic improvements for future</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analyticsReport?.recommendations.longTerm.map((item, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}