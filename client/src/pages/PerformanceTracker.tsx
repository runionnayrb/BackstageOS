import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Plus,
  Eye,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { PerformanceTrackerForm } from "@/components/PerformanceTrackerForm";
import { RehearsalTrackerForm } from "@/components/RehearsalTrackerForm";
import { ShowContractSettingsForm } from "@/components/ShowContractSettingsForm";

export default function PerformanceTracker() {
  const { id } = useParams<{ id: string }>();
  const projectSlug = id;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showPerformanceForm, setShowPerformanceForm] = useState(false);
  const [showRehearsalForm, setShowRehearsalForm] = useState(false);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<any>(null);
  const [editingRehearsal, setEditingRehearsal] = useState<any>(null);

  // Check if this project has equity cast members
  const { data: equityCheck } = useQuery({
    queryKey: ['/api/projects', projectSlug, 'has-equity-cast-members'],
    enabled: !!projectSlug && !!user
  });

  // Get contract settings
  const { data: contractSettings } = useQuery({
    queryKey: ['/api/projects', projectSlug, 'show-contract-settings'],
    enabled: !!projectSlug && !!user && equityCheck?.hasEquityMembers
  });

  // Get performance data
  const { data: performances, isLoading: performancesLoading } = useQuery({
    queryKey: ['/api/projects', projectSlug, 'performance-tracker'],
    enabled: !!projectSlug && !!user && equityCheck?.hasEquityMembers
  });

  // Get rehearsal data
  const { data: rehearsals, isLoading: rehearsalsLoading } = useQuery({
    queryKey: ['/api/projects', projectSlug, 'rehearsal-tracker'],
    enabled: !!projectSlug && !!user && equityCheck?.hasEquityMembers
  });

  // Get equity cast members
  const { data: equityMembers } = useQuery({
    queryKey: ['/api/projects', projectSlug, 'equity-cast-members'],
    enabled: !!projectSlug && !!user && equityCheck?.hasEquityMembers
  });

  // Delete performance mutation
  const deletePerformanceMutation = useMutation({
    mutationFn: (performanceId: number) => 
      apiRequest(`/api/projects/${projectSlug}/performance-tracker/${performanceId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectSlug, 'performance-tracker'] });
    }
  });

  // Delete rehearsal mutation
  const deleteRehearsalMutation = useMutation({
    mutationFn: (rehearsalId: number) => 
      apiRequest(`/api/projects/${projectSlug}/rehearsal-tracker/${rehearsalId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectSlug, 'rehearsal-tracker'] });
    }
  });

  if (!equityCheck?.hasEquityMembers) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Performance and rehearsal tracking is only available for productions with equity cast members.
            Add cast members with equity status to enable this feature.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const calculateStats = () => {
    if (!performances || !rehearsals) return null;

    const totalPerformances = performances.length;
    const totalRehearsals = rehearsals.length;
    const completedPerformances = performances.filter(p => p.status === 'completed').length;
    const completedRehearsals = rehearsals.filter(r => r.status === 'completed').length;

    const avgPerformanceDuration = performances.length > 0 
      ? performances.reduce((sum, p) => sum + (p.actualDuration || 0), 0) / performances.length
      : 0;

    const avgRehearsalDuration = rehearsals.length > 0
      ? rehearsals.reduce((sum, r) => sum + (r.actualDuration || 0), 0) / rehearsals.length
      : 0;

    return {
      totalPerformances,
      totalRehearsals,
      completedPerformances,
      completedRehearsals,
      avgPerformanceDuration,
      avgRehearsalDuration
    };
  };

  const stats = calculateStats();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Performance & Rehearsal Tracker</h1>
        <Button
          onClick={() => setShowSettingsForm(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Performances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPerformances}</div>
              <div className="text-sm text-muted-foreground">
                {stats.completedPerformances} completed
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Rehearsals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRehearsals}</div>
              <div className="text-sm text-muted-foreground">
                {stats.completedRehearsals} completed
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgPerformanceDuration)}min</div>
              <div className="text-sm text-muted-foreground">
                performances
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performances">Performances</TabsTrigger>
          <TabsTrigger value="rehearsals">Rehearsals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Equity Cast Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {equityMembers?.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>{member.name}</span>
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...(performances || []), ...(rehearsals || [])]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((activity: any) => (
                      <div key={`${activity.id}-${activity.type || 'performance'}`} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {activity.type === 'rehearsal' ? 'Rehearsal' : 'Performance'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(activity.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performances" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Performance Tracking</h2>
            <Button
              onClick={() => setShowPerformanceForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Performance
            </Button>
          </div>

          {performancesLoading ? (
            <div>Loading performances...</div>
          ) : (
            <div className="grid gap-4">
              {performances?.map((performance: any) => (
                <Card key={performance.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {format(new Date(performance.date), 'MMMM d, yyyy')}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {performance.startTime} - {performance.endTime}
                          </div>
                          <Badge variant={performance.status === 'completed' ? 'default' : 'secondary'}>
                            {performance.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPerformance(performance)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePerformanceMutation.mutate(performance.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium">Audience Count</div>
                        <div className="text-lg">{performance.audienceCount || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Duration</div>
                        <div className="text-lg">{performance.actualDuration || 'N/A'} min</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Revenue</div>
                        <div className="text-lg">${performance.revenue || 0}</div>
                      </div>
                    </div>
                    {performance.notes && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Notes</div>
                        <div className="text-sm text-muted-foreground">{performance.notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rehearsals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Rehearsal Tracking</h2>
            <Button
              onClick={() => setShowRehearsalForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Rehearsal
            </Button>
          </div>

          {rehearsalsLoading ? (
            <div>Loading rehearsals...</div>
          ) : (
            <div className="grid gap-4">
              {rehearsals?.map((rehearsal: any) => (
                <Card key={rehearsal.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {format(new Date(rehearsal.date), 'MMMM d, yyyy')}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {rehearsal.startTime} - {rehearsal.endTime}
                          </div>
                          <Badge variant={rehearsal.status === 'completed' ? 'default' : 'secondary'}>
                            {rehearsal.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRehearsal(rehearsal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRehearsalMutation.mutate(rehearsal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium">Rehearsal Type</div>
                        <div className="text-lg">{rehearsal.rehearsalType || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Duration</div>
                        <div className="text-lg">{rehearsal.actualDuration || 'N/A'} min</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Attendees</div>
                        <div className="text-lg">{rehearsal.attendeeCount || 'N/A'}</div>
                      </div>
                    </div>
                    {rehearsal.notes && (
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Notes</div>
                        <div className="text-sm text-muted-foreground">{rehearsal.notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Forms */}
      {showPerformanceForm && (
        <PerformanceTrackerForm
          projectId={projectId}
          onClose={() => setShowPerformanceForm(false)}
        />
      )}

      {showRehearsalForm && (
        <RehearsalTrackerForm
          projectId={projectId}
          onClose={() => setShowRehearsalForm(false)}
        />
      )}

      {showSettingsForm && (
        <ShowContractSettingsForm
          projectId={projectId}
          settings={contractSettings}
          onClose={() => setShowSettingsForm(false)}
          hasEquityMembers={equityCheck?.hasEquityMembers || false}
        />
      )}

      {editingPerformance && (
        <PerformanceTrackerForm
          projectId={projectId}
          performance={editingPerformance}
          onClose={() => setEditingPerformance(null)}
        />
      )}

      {editingRehearsal && (
        <RehearsalTrackerForm
          projectId={projectId}
          rehearsal={editingRehearsal}
          onClose={() => setEditingRehearsal(null)}
        />
      )}
    </div>
  );
}