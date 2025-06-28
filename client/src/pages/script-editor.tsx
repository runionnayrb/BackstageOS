import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CollaborativeEditor } from "@/components/script-editor/collaborative-editor";
import { VersionHistory } from "@/components/script-editor/version-history";
import { ChangeLog } from "@/components/script-editor/change-log-simple";
import { CommentsPanel } from "@/components/script-editor/comments-panel";
import { 
  ArrowLeft, 
  FileText, 
  Users,
  Check,
  MessageSquare,
  History,
  FileClockIcon,
  ChevronDown
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
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showPublishVersionConfirm, setShowPublishVersionConfirm] = useState(false);
  const [selectedVersionType, setSelectedVersionType] = useState<'major' | 'minor'>('minor');
  const [currentVersion, setCurrentVersion] = useState("1.0");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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

  // Placeholder data for now - will be connected to backend later
  const scriptVersions: any[] = [];
  const scriptComments: any[] = [];
  const scriptChanges: any[] = [];

  // Initialize script data only once to prevent overwriting user changes
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (script && typeof script === 'object' && !hasInitialized) {
      setScriptTitle((script as any).name || "Untitled Script");
      setScriptContent((script as any).content || "");
      setCurrentVersion((script as any).version || "1.0");
      setCollaborators([]);
      setComments([]);
      setVersions([]);
      setChanges([]);
      setHasInitialized(true);
    } else if (!script && !hasInitialized) {
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

  // Auto-save effect with debounce
  useEffect(() => {
    if (!hasInitialized) return; // Don't auto-save until after initial load
    
    const timeoutId = setTimeout(() => {
      const data = {
        title: scriptTitle,
        content: scriptContent,
      };
      saveScriptMutation.mutate(data);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [scriptContent, scriptTitle, hasInitialized]); // Trigger on content or title change

  // Auto-save script mutation
  const saveScriptMutation = useMutation({
    mutationFn: async (data: { title: string; content: any; version?: string }) => {
      const response = await fetch(`/api/projects/${projectId}/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save script');
      return await response.json();
    },
    onMutate: () => {
      setIsAutoSaving(true);
    },
    onSuccess: () => {
      setIsAutoSaving(false);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "script"] });
    },
    onError: () => {
      setIsAutoSaving(false);
      toast({
        title: "Auto-save failed",
        description: "Failed to auto-save script. Your changes may be lost.",
        variant: "destructive",
      });
    },
  });

  // Publish script mutation
  const publishScriptMutation = useMutation({
    mutationFn: async (data: { versionType: 'major' | 'minor' }) => {
      const response = await fetch(`/api/projects/${projectId}/script/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          content: scriptContent,
          title: scriptTitle
        }),
      });
      if (!response.ok) throw new Error('Failed to publish');
      const result = await response.json();
      return { ...result, versionType: data.versionType };
    },
    onSuccess: (data: any) => {
      const versionTypeText = data.versionType === 'major' ? 'Major' : 'Minor';
      // Update the version number immediately
      if (data.version) {
        setCurrentVersion(data.version);
      }
      toast({
        title: `${versionTypeText} Version Published!`,
        description: `Your ${versionTypeText.toLowerCase()} version has been successfully published.`,
      });
      // Force refresh the script data to show updated version
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "script"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects", projectId, "script"] });
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
  const handleContentChange = (content: any) => {
    setScriptContent(content);
  };

  const handleTitleChange = (title: string) => {
    setScriptTitle(title);
  };

  const handlePublish = (versionType: 'major' | 'minor' = 'minor') => {
    setIsPublishing(true);
    publishScriptMutation.mutate({ versionType });
  };

  const handleExport = () => {
    // Export script as PDF
    window.print();
  };

  const handleImport = async (file: File) => {
    // Validate file type and extensions
    const allowedTypes = [
      'text/plain',
      'text/html',
      'application/rtf',
      'text/rtf',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    const allowedExtensions = ['.txt', '.rtf', '.html', '.htm', '.pdf', '.docx', '.doc'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a text file (.txt), RTF file (.rtf), HTML file (.html), PDF file (.pdf), or Word document (.docx, .doc).",
        variant: "destructive"
      });
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    try {
      let content = '';

      if (file.type === 'application/pdf' || fileExtension === '.pdf') {
        // Handle PDF files
        toast({
          title: "Processing PDF",
          description: "Extracting text from PDF file...",
        });

        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/extract-pdf-text', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          toast({
            title: "PDF processing issue",
            description: result.message || "Could not extract text from PDF. Try copying text directly from your PDF viewer instead.",
            variant: "destructive"
          });
          return;
        }

        content = result.text || '';

      } else if (file.type.includes('word') || fileExtension === '.docx' || fileExtension === '.doc') {
        // Handle Word documents
        toast({
          title: "Processing Word document",
          description: "Extracting text from Word document...",
        });

        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/extract-word-text', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          toast({
            title: "Word document error",
            description: result.message || "Could not extract text from Word document.",
            variant: "destructive"
          });
          return;
        }

        content = result.text || '';

      } else {
        // Handle text-based files
        const reader = new FileReader();
        content = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve(result || '');
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file, 'UTF-8');
        });

        // Check for binary content indicators in text files
        const binaryIndicators = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/g;
        const binaryMatches = content.match(binaryIndicators);
        if (binaryMatches && binaryMatches.length > content.length * 0.1) {
          toast({
            title: "Invalid file format",
            description: "This file appears to contain binary data. Please upload a valid text file.",
            variant: "destructive"
          });
          return;
        }
      }

      // Basic validation to ensure we have content
      if (!content || content.trim().length === 0) {
        toast({
          title: "Empty file",
          description: "The uploaded file appears to be empty or contains no extractable text.",
          variant: "destructive"
        });
        return;
      }

      // Set content and trigger auto-format
      const formattedContent = content.split('\n').map(line => 
        line.trim() ? `<div class="script-dialogue">${line}</div>` : '<div><br></div>'
      ).join('');
      
      setScriptContent(formattedContent);
      
      // Force content redistribution after a brief delay
      setTimeout(() => {
        const event = new CustomEvent('forceDistribution');
        window.dispatchEvent(event);
      }, 500);
      
      toast({
        title: "Script imported",
        description: "Your script has been imported successfully.",
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: "There was an error processing the file. Please try again or use a different format.",
        variant: "destructive"
      });
    }
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
                {isAutoSaving && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="animate-spin h-3 w-3 border border-gray-300 border-t-gray-600 rounded-full"></div>
                    Saving...
                  </div>
                )}
                {lastSaved && !isAutoSaving && (
                  <div className="text-xs text-muted-foreground">
                    Saved {lastSaved.toLocaleTimeString()}
                  </div>
                )}
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
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPublishing}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Publish Version
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setSelectedVersionType('major');
                    setShowPublishVersionConfirm(true);
                  }}>
                    Major Version
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setSelectedVersionType('minor');
                    setShowPublishVersionConfirm(true);
                  }}>
                    Minor Version
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
          version={currentVersion}
          collaborators={collaborators}
          comments={comments}
          onAddComment={handleAddComment}
          onExport={handleExport}
          onImport={handleImport}
          isLoading={saveScriptMutation.isPending}
          className="w-full h-full"
        />
      </div>



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
                Current: v{currentVersion}
              </Badge>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto">
            <VersionHistory
              versions={versions}
              currentVersion={currentVersion}
              onRevert={handleVersionRevert}
              onPreview={handleVersionPreview}
              onPublish={() => {}}
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

      {/* Publish Version Confirmation Dialog */}
      <Dialog open={showPublishVersionConfirm} onOpenChange={setShowPublishVersionConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish {selectedVersionType === 'major' ? 'Major' : 'Minor'} Version</DialogTitle>
            <DialogDescription>
              {selectedVersionType === 'major' 
                ? 'This will create a new major version (1, 2, 3...) representing significant changes or milestones in the script.'
                : 'This will create a new minor version (.1, .2, .3...) for incremental updates and revisions.'
              }
              <br /><br />
              This action will save the current state as a published version that can be shared with the production team.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowPublishVersionConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handlePublish(selectedVersionType);
              setShowPublishVersionConfirm(false);
            }}>
              Publish {selectedVersionType === 'major' ? 'Major' : 'Minor'} Version
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}