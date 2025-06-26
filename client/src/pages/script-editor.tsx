import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  Plus, 
  Edit3, 
  Eye, 
  EyeOff,
  Lightbulb,
  Volume2,
  Monitor,
  Settings,
  Palette
} from "lucide-react";

interface ScriptEditorParams {
  id: string;
}

interface Cue {
  id: string;
  type: 'lighting' | 'sound' | 'video' | 'automation' | 'other';
  number: string;
  description: string;
  position: number;
  page: number;
  act?: number;
  scene?: number;
}

const cueTypes = [
  { value: 'lighting', label: 'Lighting', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'sound', label: 'Sound', icon: Volume2, color: 'bg-blue-100 text-blue-800' },
  { value: 'video', label: 'Video', icon: Monitor, color: 'bg-purple-100 text-purple-800' },
  { value: 'automation', label: 'Automation', icon: Settings, color: 'bg-green-100 text-green-800' },
  { value: 'other', label: 'Other', icon: Palette, color: 'bg-gray-100 text-gray-800' },
];

export default function ScriptEditor() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<ScriptEditorParams>();
  const projectId = params.id;
  const queryClient = useQueryClient();

  const [scriptContent, setScriptContent] = useState("");
  const [scriptTitle, setScriptTitle] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cues, setCues] = useState<Cue[]>([]);
  const [visibleCueTypes, setVisibleCueTypes] = useState<string[]>(['lighting', 'sound', 'video', 'automation', 'other']);
  const [isAddingCue, setIsAddingCue] = useState(false);
  const [newCue, setNewCue] = useState({ type: 'lighting', number: '', description: '' });
  const [selectedPosition, setSelectedPosition] = useState(0);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;

  const { data: script, isLoading: scriptLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "script"],
    enabled: !!projectId && isAuthenticated,
  });

  const saveScriptMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; cues: Cue[] }) => {
      await apiRequest("POST", `/api/projects/${projectId}/script`, data);
    },
    onSuccess: () => {
      toast({
        title: "Script saved",
        description: "Your script has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "script"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save script. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (script) {
      setScriptTitle(script.title || "");
      setScriptContent(script.content || "");
      setCues(script.cues || []);
      
      // Calculate pages based on content
      const pages = scriptContent.split(/\n\s*\n/).length || 1;
      setTotalPages(pages);
    }
  }, [script, scriptContent]);

  const handleSave = () => {
    saveScriptMutation.mutate({
      title: scriptTitle,
      content: scriptContent,
      cues: cues,
    });
  };

  const addCue = () => {
    const cue: Cue = {
      id: Date.now().toString(),
      type: newCue.type as any,
      number: newCue.number,
      description: newCue.description,
      position: selectedPosition,
      page: currentPage,
    };
    
    setCues([...cues, cue]);
    setNewCue({ type: 'lighting', number: '', description: '' });
    setIsAddingCue(false);
    
    toast({
      title: "Cue added",
      description: `${newCue.type} cue ${newCue.number} added successfully.`,
    });
  };

  const toggleCueTypeVisibility = (type: string) => {
    setVisibleCueTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getVisibleCues = () => {
    return cues.filter(cue => visibleCueTypes.includes(cue.type) && cue.page === currentPage);
  };

  const getCueTypeInfo = (type: string) => {
    return cueTypes.find(ct => ct.value === type) || cueTypes[0];
  };

  if (isLoading || projectsLoading || scriptLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center">Show not found</div>;
  }

  const isFreelance = user?.profileType === 'freelance';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {project.name}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Script Editor */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  <Input
                    value={scriptTitle}
                    onChange={(e) => setScriptTitle(e.target.value)}
                    placeholder="Script Title"
                    className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0"
                  />
                  <CardDescription className="mt-2">
                    Page {currentPage} of {totalPages}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingCue(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cue
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveScriptMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Textarea
                    value={scriptContent}
                    onChange={(e) => setScriptContent(e.target.value)}
                    placeholder="Paste or type your script here..."
                    className="min-h-[600px] font-mono text-sm leading-relaxed"
                  />
                  
                  {/* Cue Overlays */}
                  <div className="absolute inset-0 pointer-events-none">
                    {getVisibleCues().map((cue) => {
                      const cueTypeInfo = getCueTypeInfo(cue.type);
                      const Icon = cueTypeInfo.icon;
                      
                      return (
                        <div
                          key={cue.id}
                          className="absolute left-2 pointer-events-auto"
                          style={{ top: `${(cue.position / scriptContent.length) * 100}%` }}
                        >
                          <Badge 
                            variant="secondary" 
                            className={`${cueTypeInfo.color} text-xs cursor-pointer hover:scale-105 transition-transform`}
                            title={`${cue.type} ${cue.number}: ${cue.description}`}
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {cue.number}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous Page
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cue Controls */}
          <div className="space-y-6">
            {/* Cue Type Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cue Types</CardTitle>
                <CardDescription>Toggle visibility by type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {cueTypes.map((type) => {
                  const Icon = type.icon;
                  const isVisible = visibleCueTypes.includes(type.value);
                  
                  return (
                    <Button
                      key={type.value}
                      variant={isVisible ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => toggleCueTypeVisibility(type.value)}
                    >
                      {isVisible ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                      <Icon className="h-4 w-4 mr-2" />
                      {type.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Current Page Cues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Page {currentPage} Cues</CardTitle>
                <CardDescription>{getVisibleCues().length} cues on this page</CardDescription>
              </CardHeader>
              <CardContent>
                {getVisibleCues().length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No cues on this page
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getVisibleCues().map((cue) => {
                      const cueTypeInfo = getCueTypeInfo(cue.type);
                      const Icon = cueTypeInfo.icon;
                      
                      return (
                        <div key={cue.id} className="flex items-center gap-2 p-2 rounded border">
                          <Icon className="h-4 w-4" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{cue.type} {cue.number}</div>
                            <div className="text-xs text-muted-foreground">{cue.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Cue Dialog */}
        <Dialog open={isAddingCue} onOpenChange={setIsAddingCue}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Cue</DialogTitle>
              <DialogDescription>
                Add a cue to page {currentPage} of the script.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Cue Type</label>
                <Select value={newCue.type} onValueChange={(value) => setNewCue({...newCue, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cueTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Cue Number</label>
                <Input
                  value={newCue.number}
                  onChange={(e) => setNewCue({...newCue, number: e.target.value})}
                  placeholder="e.g., 1, 1.5, A"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newCue.description}
                  onChange={(e) => setNewCue({...newCue, description: e.target.value})}
                  placeholder="Describe the cue..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingCue(false)}>
                  Cancel
                </Button>
                <Button onClick={addCue} disabled={!newCue.number || !newCue.description}>
                  Add Cue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}