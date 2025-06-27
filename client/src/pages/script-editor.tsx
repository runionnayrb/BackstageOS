import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CollaborativeEditor } from "@/components/script-editor/collaborative-editor";
import { VersionHistory } from "@/components/script-editor/version-history";
import { ChangeLog } from "@/components/script-editor/change-log";
import { 
  ArrowLeft, 
  FileText, 
  Users,
  GitBranch,
  MessageSquare,
  Share
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
  const [activeTab, setActiveTab] = useState("editor");
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

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
      setComments(scriptComments || []);
      setVersions(scriptVersions || []);
      setChanges(scriptChanges || []);
    }
  }, [script, scriptComments, scriptVersions, scriptChanges]);

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
    setComments(prev => [...prev, comment]);
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation(`/projects/${projectId}`)}
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

      {/* Main Content */}
      <div className="container mx-auto p-6 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="versions">Version History</TabsTrigger>
            <TabsTrigger value="changes">Change Log</TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments ({comments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-6">
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
              className="w-full"
            />
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <VersionHistory
              versions={versions}
              currentVersion={script?.version || "1.0"}
              onRevert={handleVersionRevert}
              onPreview={handleVersionPreview}
              onPublish={handlePublish}
              className="w-full"
            />
          </TabsContent>

          <TabsContent value="changes" className="mt-6">
            <ChangeLog
              changes={changes}
              onExport={() => {
                toast({
                  title: "Exporting changes",
                  description: "Change log export is not yet implemented.",
                });
              }}
              className="w-full"
            />
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Comments</h3>
                {comments.filter(c => c.status !== 'resolved').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active comments</p>
                    <p className="text-sm">Select text in the editor to add a comment</p>
                  </div>
                ) : (
                  comments.filter(c => c.status !== 'resolved').map((comment, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                          {comment.author?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <span className="font-medium">{comment.author || 'Anonymous'}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {comment.timestamp || 'Now'}
                          </span>
                        </div>
                      </div>
                      {comment.selectedText && (
                        <div className="text-sm bg-yellow-100 dark:bg-yellow-900 p-2 rounded mb-2 italic">
                          "{comment.selectedText}"
                        </div>
                      )}
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Resolved Comments</h3>
                {comments.filter(c => c.status === 'resolved').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No resolved comments yet</p>
                  </div>
                ) : (
                  comments.filter(c => c.status === 'resolved').map((comment, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border opacity-75">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                          ✓
                        </div>
                        <div>
                          <span className="font-medium">{comment.author || 'Anonymous'}</span>
                          <span className="text-xs text-muted-foreground ml-2">Resolved</span>
                        </div>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
    </div>
  );
}