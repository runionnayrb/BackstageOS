import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CollaborativeEditor } from "@/components/script-editor/collaborative-editor";
import { VersionHistory } from "@/components/script-editor/version-history";
import { ChangeLog } from "@/components/script-editor/change-log-simple";
import { CommentsPanel } from "@/components/script-editor/comments-panel";
import { 
  ArrowLeft, 
  FileText, 
  Users,
  GitBranch,
  MessageSquare,
  Share,
  History,
  FileClockIcon
} from "lucide-react";

interface ScriptEditorParams {
  id: string;
}

export default function ScriptEditor() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<ScriptEditorParams>();
  const projectId = params.id;
  const queryClient = useQueryClient();

  // Enhanced script state for Google Docs-like functionality
  const [scriptContent, setScriptContent] = useState("");
  const [scriptTitle, setScriptTitle] = useState("Untitled Script");
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!user) {
      toast({
        title: "Unauthorized",
        description: "Please log in to access the script editor.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
  }, [user, toast, setLocation]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !!user,
  });

  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;

  // Enhanced script data fetching
  const { data: script, isLoading: scriptLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "script"],
    enabled: !!projectId && !!user,
  });

  const { data: scriptVersions, isLoading: versionsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "script", "versions"],
    enabled: !!projectId && !!user,
  });

  const { data: scriptComments, isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "script", "comments"],
    enabled: !!projectId && !!user,
  });

  const { data: scriptChanges, isLoading: changesLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "script", "changes"],
    enabled: !!projectId && !!user,
  });

  // Initialize script data
  useEffect(() => {
    if (script) {
      setScriptTitle(script.title || "Untitled Script");
      setScriptContent(script.content || "");
      setCollaborators(script.collaborators || []);
      // Only set comments if they don't exist yet
      if (comments.length === 0) {
        setComments(scriptComments || []);
      }
      setVersions(scriptVersions || []);
      setChanges(scriptChanges || []);
    } else {
      // Create sample version data when no script data exists
      const sampleVersions = [
        {
          id: "v1",
          version: "1.0",
          title: scriptTitle,
          content: scriptContent,
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isPublished: true,
          publishedBy: {
            firstName: user?.firstName || "Current",
            lastName: user?.lastName || "User"
          },
          changes: [
            {
              type: "insert",
              position: 1,
              description: "Initial script creation"
            }
          ]
        }
      ];
      setVersions(sampleVersions);
      
      // Create sample change log data
      const sampleChanges = [
        {
          id: "c1",
          type: "insert",
          timestamp: new Date().toISOString(),
          author: user?.firstName + " " + user?.lastName,
          description: "Added opening scene dialogue",
          position: 150,
          content: "HAMLET: To be, or not to be, that is the question..."
        },
        {
          id: "c2", 
          type: "format",
          timestamp: new Date(Date.now() - 300000).toISOString(),
          author: user?.firstName + " " + user?.lastName,
          description: "Applied theater script formatting",
          position: 1,
          content: "Applied character name centering and stage direction formatting"
        }
      ];
      setChanges(sampleChanges);
      
      // Create sample comment data
      const currentUserName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email?.split('@')[0] || "Current User";
        
      const sampleComments = [
        {
          id: "c1",
          text: "This opening soliloquy needs more dramatic emphasis. Consider adding stage directions for lighting changes.",
          author: currentUserName,
          timestamp: new Date().toISOString(),
          position: 25,
          resolved: false,
          replies: [
            {
              id: "r1",
              text: "Good point. I'll add a spotlight cue here.",
              author: "Director",
              timestamp: new Date(Date.now() - 60000).toISOString(),
              resolved: false
            }
          ]
        },
        {
          id: "c2",
          text: "The stage directions here seem unclear. Should this be stage left or stage right?",
          author: "Stage Manager",
          timestamp: new Date(Date.now() - 180000).toISOString(),
          position: 45,
          resolved: true
        }
      ];
      // Only set sample comments if no comments exist yet
      setComments(prev => prev.length === 0 ? sampleComments : prev);
    }
  }, [script, user]); // Removed dependencies that were causing comments to reset

  // Save script mutation
  const saveScriptMutation = useMutation({
    mutationFn: async (data: { title: string; content: any; version?: string }) => {
      await apiRequest("POST", `/api/projects/${projectId}/script`, data);
    },
    onSuccess: () => {
      toast({
        title: "Script saved",
        description: "Your script has been auto-saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "script"] });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Failed to save script. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Publish script mutation
  const publishScriptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/projects/${projectId}/script/publish`);
    },
    onSuccess: () => {
      toast({
        title: "Script published",
        description: "Your script version has been published.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "script"] });
      setIsPublishing(false);
    },
    onError: () => {
      toast({
        title: "Publish failed",
        description: "Failed to publish script. Please try again.",
        variant: "destructive",
      });
      setIsPublishing(false);
    },
  });

  // Handler functions
  const handleSave = () => {
    const data = {
      title: scriptTitle,
      content: scriptContent,
    };
    saveScriptMutation.mutate(data);
  };

  const handleContentChange = (content: any) => {
    setScriptContent(content);
    // Auto-save after 2 seconds of inactivity
    setTimeout(() => {
      if (content === scriptContent) {
        handleSave();
      }
    }, 2000);
  };

  const handleTitleChange = (title: string) => {
    setScriptTitle(title);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    publishScriptMutation.mutate();
  };

  const handleExport = () => {
    // Export script as PDF
    window.print();
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setScriptContent(content);
      toast({
        title: "Script imported",
        description: "Your script has been imported successfully.",
      });
    };
    reader.readAsText(file);
  };

  const handleAddComment = (comment: any) => {
    const currentUserName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.email?.split('@')[0] || "Current User";
      
    const newComment = {
      ...comment,
      id: `comment-${Date.now()}`,
      author: currentUserName,
      timestamp: new Date().toISOString(),
      resolved: false
    };
    
    // If this is a reply (has parentId), add it to the parent's replies array
    if (comment.parentId) {
      setComments(prev => prev.map(c => {
        if (c.id === comment.parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), newComment]
          };
        }
        return c;
      }));
    } else {
      // This is a new top-level comment
      setComments(prev => [...prev, { ...newComment, replies: [] }]);
    }
    
    toast({
      title: comment.parentId ? "Reply added" : "Comment added",
      description: comment.parentId ? "Your reply has been added." : "Your comment has been added to the script.",
    });
  };

  const handleVersionRevert = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setScriptContent(version.content);
      setScriptTitle(version.title);
      toast({
        title: "Version restored",
        description: `Reverted to version ${version.version}`,
      });
    }
  };

  const handleVersionPreview = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      toast({
        title: "Version preview",
        description: `Previewing version ${version.version}`,
      });
    }
  };

  if (!user || projectsLoading || scriptLoading) {
    return <div className="flex items-center justify-center h-screen">Loading script editor...</div>;
  }

  if (!project) {
    return <div className="flex items-center justify-center h-screen">Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation(`/shows/${projectId}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to {project?.name}
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Script Editor</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVersionHistory(true)}
                title="Version History"
              >
                <History className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangeLog(true)}
                title="Change Log"
              >
                <FileClockIcon className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComments(true)}
                title="Comments"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareDialog(true)}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                {isPublishing ? "Publishing..." : "Publish Version"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Page Editor */}
      <div className="flex-1">
        <CollaborativeEditor
          content={scriptContent}
          onChange={handleContentChange}
          title={scriptTitle}
          onTitleChange={handleTitleChange}
          collaborators={collaborators}
          comments={comments}
          onAddComment={handleAddComment}
          onSave={handleSave}
          onExport={handleExport}
          onImport={handleImport}
          isLoading={saveScriptMutation.isPending}
          className="w-full h-full"
        />
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Script</DialogTitle>
            <DialogDescription>
              Generate a shareable link for this script
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <code className="flex-1 text-sm">
                {`${window.location.origin}/shared/script/${projectId}`}
              </code>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/shared/script/${projectId}`);
                  toast({
                    title: "Link copied",
                    description: "Share link copied to clipboard",
                  });
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Anyone with this link can view the script. Editing permissions are controlled separately.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Modal */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Version History</DialogTitle>
                <DialogDescription>
                  View and manage script versions
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Current: v{script?.version || "1.0"}
              </Badge>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto">
            <VersionHistory
              versions={versions}
              currentVersion={script?.version || "1.0"}
              onRevert={handleVersionRevert}
              onPreview={handleVersionPreview}
              onPublish={handlePublish}
              className="w-full border-0"
              showHeader={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Log Modal */}
      <Dialog open={showChangeLog} onOpenChange={setShowChangeLog}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Change Log</DialogTitle>
            <DialogDescription>
              Track all changes made to the script
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto">
            <ChangeLog
              changes={changes}
              onExport={() => {
                toast({
                  title: "Exporting changes",
                  description: "Change log export is not yet implemented.",
                });
              }}
              className="w-full border-0"
              showHeader={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Script Comments</DialogTitle>
            <DialogDescription>
              View and manage comments on the script
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto">
            <CommentsPanel
              comments={comments}
              onAddComment={handleAddComment}
              onResolveComment={(commentId) => {
                setComments(prev => 
                  prev.map(c => 
                    c.id === commentId ? { ...c, resolved: true } : c
                  )
                );
                toast({
                  title: "Comment resolved",
                  description: "The comment has been marked as resolved.",
                });
              }}
              className="w-full border-0"
              showHeader={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}