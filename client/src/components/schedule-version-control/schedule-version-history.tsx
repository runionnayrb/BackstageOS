import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  Eye,
  ChevronDown,
  Megaphone,
  Bell
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
    <div className="space-y-4 sm:space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Schedule Version Control</h2>
            <p className="text-sm text-gray-600 hidden sm:block">
              Manage schedule versions and team member access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPersonalSchedules(!showPersonalSchedules)}
            className="gap-2 text-xs sm:text-sm"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{showPersonalSchedules ? 'Hide' : 'Show'} Personal Schedules</span>
            <span className="sm:hidden">Schedules</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                Publish
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedVersionType('major');
                  setShowPublishDialog(true);
                }}
                className="gap-2"
              >
                <Megaphone className="h-4 w-4" />
                Major Version
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedVersionType('minor');
                  setShowPublishDialog(true);
                }}
                className="gap-2"
              >
                <Bell className="h-4 w-4" />
                Minor Version
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Current Version Info */}
      {currentVersion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Current Version: {currentVersion.version}</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs w-fit">
                  {currentVersion.versionType}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{currentVersion.title}</p>
              <p className="text-xs text-gray-500">
                Published {formatDistanceToNow(new Date(currentVersion.publishedAt))} ago
              </p>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
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
                className={`border rounded-lg p-3 sm:p-4 ${
                  version.isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="font-medium text-sm sm:text-base">Version {version.version}</span>
                    <Badge
                      variant={version.versionType === 'major' ? 'default' : 'secondary'}
                      className={`text-xs ${version.versionType === 'major' ? 'bg-purple-100 text-purple-800' : ''}`}
                    >
                      {version.versionType}
                    </Badge>
                    {version.isCurrent && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">{formatDistanceToNow(new Date(version.publishedAt))} ago</span>
                  </div>
                </div>
                
                <div className="mt-2 space-y-1">
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2">{version.title}</h4>
                  {version.description && (
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-3">{version.description}</p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                    <span>{version.scheduleData?.totalEvents || 0} events</span>
                    <span className="truncate">Published by {version.publishedBy}</span>
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{schedule.contactName}</p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{schedule.contactEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        v{schedule.currentVersion}
                      </Badge>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs px-2 py-1">
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                    <span className="truncate">Token: {schedule.accessToken?.slice(0, 8)}...</span>
                    <span className="flex-shrink-0">
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
        <DialogContent className="sm:max-w-md w-full mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Publish New Schedule Version</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
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