import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  History, 
  Clock, 
  Plus, 
  Calendar,
  Users,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ScheduleVersionHistoryProps {
  projectId: string;
  onClose: () => void;
}

export function ScheduleVersionHistory({ projectId, onClose }: ScheduleVersionHistoryProps) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedVersionType, setSelectedVersionType] = useState<'major' | 'minor'>('minor');
  const [versionTitle, setVersionTitle] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [showPersonalSchedules, setShowPersonalSchedules] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch schedule versions
  const { data: versions = [], isLoading: versionsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-versions`],
  });

  // Fetch personal schedules
  const { data: personalSchedules = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/personal-schedules`],
    enabled: showPersonalSchedules,
  });

  // Fetch project details for context
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Calculate next version number
  const getNextVersion = (type: 'major' | 'minor') => {
    if (versions.length === 0) return '1.0';
    
    const currentVersion = versions.find((v: any) => v.isCurrent)?.version || '1.0';
    const [major, minor] = currentVersion.split('.').map(Number);
    
    if (type === 'major') {
      return `${major + 1}.0`;
    } else {
      return `${major}.${minor + 1}`;
    }
  };

  // Publish new version mutation
  const publishVersionMutation = useMutation({
    mutationFn: (versionData: any) => 
      apiRequest('POST', `/api/projects/${projectId}/schedule-versions`, versionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-versions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/personal-schedules`] });
      setShowPublishDialog(false);
      setVersionTitle('');
      setVersionDescription('');
      toast({
        title: "Schedule Version Published",
        description: "New version created and personal schedules updated for all team members.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Publish Version",
        description: error.message || "Unable to publish schedule version. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePublishVersion = () => {
    const nextVersion = getNextVersion(selectedVersionType);
    
    publishVersionMutation.mutate({
      version: nextVersion,
      versionType: selectedVersionType,
      title: versionTitle || `${selectedVersionType === 'major' ? 'Major' : 'Minor'} Schedule Update - Version ${nextVersion}`,
      description: versionDescription,
    });
  };

  const currentVersion = versions.find((v: any) => v.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold">Schedule Version Control</h2>
            <p className="text-sm text-gray-600">
              Manage schedule versions and team member access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPersonalSchedules(!showPersonalSchedules)}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            {showPersonalSchedules ? 'Hide' : 'Show'} Personal Schedules
          </Button>
          <Button
            onClick={() => setShowPublishDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Publish New Version
          </Button>
        </div>
      </div>

      {/* Current Version Info */}
      {currentVersion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Current Version: {currentVersion.version}</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {currentVersion.versionType}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">{currentVersion.title}</p>
              <p className="text-xs text-gray-500">
                Published {formatDistanceToNow(new Date(currentVersion.publishedAt))} ago
              </p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div>{currentVersion.scheduleData?.totalEvents || 0} events</div>
            </div>
          </div>
        </div>
      )}

      {/* Version History */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Version History</h3>
        
        {versionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16"></div>
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No schedule versions yet</p>
            <p className="text-sm">Create your first version to start tracking changes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version: any) => (
              <div
                key={version.id}
                className={`border rounded-lg p-4 ${
                  version.isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {version.version}</span>
                      <Badge
                        variant={version.versionType === 'major' ? 'default' : 'secondary'}
                        className={version.versionType === 'major' ? 'bg-purple-100 text-purple-800' : ''}
                      >
                        {version.versionType}
                      </Badge>
                      {version.isCurrent && (
                        <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    {formatDistanceToNow(new Date(version.publishedAt))} ago
                  </div>
                </div>
                
                <div className="mt-2 space-y-1">
                  <h4 className="font-medium text-gray-900">{version.title}</h4>
                  {version.description && (
                    <p className="text-sm text-gray-600">{version.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{version.scheduleData?.totalEvents || 0} events</span>
                    <span>Published by {version.publishedBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personal Schedules Section */}
      {showPersonalSchedules && (
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personal Schedules ({personalSchedules.length})
          </h3>
          
          {personalSchedules.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Mail className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No personal schedules created yet</p>
              <p className="text-sm">Personal schedules are created automatically when you add contacts</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {personalSchedules.map((schedule: any) => (
                <div key={schedule.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{schedule.contactName}</p>
                      <p className="text-sm text-gray-600">{schedule.contactEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        v{schedule.currentVersion}
                      </Badge>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>Token: {schedule.accessToken?.slice(0, 12)}...</span>
                    <span>
                      Notifications: {schedule.emailPreferences?.newVersion ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Publish Version Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish New Schedule Version</DialogTitle>
            <DialogDescription>
              Create a new version of your schedule. All team members will be notified and their personal schedules will be updated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="version-type">Version Type</Label>
              <Select
                value={selectedVersionType}
                onValueChange={(value: 'major' | 'minor') => setSelectedVersionType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">
                    Minor Update (v{getNextVersion('minor')}) - Small changes, additions
                  </SelectItem>
                  <SelectItem value="major">
                    Major Update (v{getNextVersion('major')}) - Significant changes, restructuring
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Version Title</Label>
              <Input
                id="title"
                value={versionTitle}
                onChange={(e) => setVersionTitle(e.target.value)}
                placeholder={`${selectedVersionType === 'major' ? 'Major' : 'Minor'} Schedule Update - Version ${getNextVersion(selectedVersionType)}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={3}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">What happens when you publish:</span>
              </div>
              <ul className="text-gray-600 space-y-1 ml-6">
                <li>• Current schedule snapshot will be saved</li>
                <li>• All team members' personal schedules will be updated</li>
                <li>• Email notifications will be sent (if enabled)</li>
                <li>• Previous version will be archived</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublishVersion}
              disabled={publishVersionMutation.isPending}
              className="gap-2"
            >
              {publishVersionMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Publishing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Publish Version
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}