import { useQuery } from '@tanstack/react-query';
import { SystemStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function SystemStatusPage() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/system-status'],
    queryFn: async () => {
      const response = await fetch('/api/system-status');
      if (!response.ok) throw new Error('Failed to fetch system status');
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'outage':
      case 'major_outage':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'outage':
      case 'major_outage':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(status?.overallStatus || 'operational')}
              <span>Overall System Status</span>
            </CardTitle>
            <CardDescription>
              Current status of BackstageOS platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(status?.overallStatus || 'operational')}>
              {status?.overallStatus?.replace('_', ' ').toUpperCase() || 'OPERATIONAL'}
            </Badge>
          </CardContent>
        </Card>

        {/* Component Status */}
        <Card>
          <CardHeader>
            <CardTitle>Component Status</CardTitle>
            <CardDescription>
              Status of individual system components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status?.components?.map((component: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(component.status)}
                    <span className="font-medium">{component.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(component.status)}>
                      {component.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Last checked: {new Date(component.lastChecked).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No component data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Incidents */}
        <Card>
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
            <CardDescription>
              Current issues and their resolution status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status?.activeIncidents?.length > 0 ? (
                status.activeIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{incident.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {incident.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>Started: {new Date(incident.createdAt).toLocaleString()}</p>
                      <p>Last update: {new Date(incident.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p>No active incidents</p>
                  <p className="text-sm">All systems are operating normally</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
            <CardDescription>
              Latest system updates and maintenance notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border-l-4 border-green-500 bg-green-50">
                <p className="font-medium text-green-800">System Upgrade Complete</p>
                <p className="text-sm text-green-600">Enhanced error monitoring and user experience improvements deployed successfully.</p>
                <p className="text-xs text-green-500 mt-1">Today at 2:00 PM</p>
              </div>
              <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                <p className="font-medium text-blue-800">Scheduled Maintenance</p>
                <p className="text-sm text-blue-600">Database optimization scheduled for tonight at 11:00 PM - 12:00 AM.</p>
                <p className="text-xs text-blue-500 mt-1">Scheduled for tonight</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}