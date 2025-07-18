import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, FileText, Folder, MoreVertical, Pin, Archive, Tag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { NoteEditor } from "../components/notes/NoteEditor";
import { CreateNoteDialog } from "../components/notes/CreateNoteDialog";
import { CreateFolderDialog } from "../components/notes/CreateFolderDialog";
import { MobileNotesList } from "../components/notes/MobileNotesList";
import type { Note, NoteFolder } from "@shared/schema";

export default function Notes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "project">("all");
  const [isMobile, setIsMobile] = useState(false);

  // Get current project from URL or context
  const projectId = new URLSearchParams(window.location.search).get('projectId');

  // Mobile detection
  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileUA || isSmallScreen);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Set view mode based on projectId
  useEffect(() => {
    setViewMode(projectId ? "project" : "all");
  }, [projectId]);

  // If mobile, render mobile-optimized version
  if (isMobile) {
    return (
      <MobileNotesList 
        projectId={projectId}
        viewMode={viewMode}
      />
    );
  }

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/note-folders', projectId, viewMode === "all"],
    queryFn: () => apiRequest(`/api/note-folders?${projectId ? `projectId=${projectId}` : 'isGlobal=true'}`)
  });

  // Fetch notes
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['/api/notes', projectId, selectedFolder, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectId && viewMode === "project") params.append('projectId', projectId);
      if (selectedFolder) params.append('folderId', selectedFolder.toString());
      if (searchQuery) params.append('searchQuery', searchQuery);
      return apiRequest(`/api/notes?${params.toString()}`);
    }
  });

  // Pin/unpin note mutation
  const pinNoteMutation = useMutation({
    mutationFn: (data: { noteId: number; isPinned: boolean }) =>
      apiRequest(`/api/notes/${data.noteId}`, {
        method: 'PUT',
        body: { isPinned: data.isPinned }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
    }
  });

  // Archive note mutation
  const archiveNoteMutation = useMutation({
    mutationFn: (data: { noteId: number; isArchived: boolean }) =>
      apiRequest(`/api/notes/${data.noteId}`, {
        method: 'PUT',
        body: { isArchived: data.isArchived }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
    }
  });

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note: Note) => {
      if (searchQuery) {
        return note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               note.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return true;
    });
  }, [notes, searchQuery]);

  // Group notes by pinned status
  const { pinnedNotes, regularNotes } = useMemo(() => {
    const pinned = filteredNotes.filter((note: Note) => note.isPinned);
    const regular = filteredNotes.filter((note: Note) => !note.isPinned);
    return { pinnedNotes: pinned, regularNotes: regular };
  }, [filteredNotes]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderNoteCard = (note: Note) => (
    <Card
      key={note.id}
      className={`cursor-pointer transition-all hover:shadow-md ${
        selectedNote?.id === note.id ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => setSelectedNote(note)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {note.isPinned && <Pin className="w-4 h-4 text-yellow-500" />}
            <CardTitle className="text-sm font-medium truncate">{note.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  pinNoteMutation.mutate({ noteId: note.id, isPinned: !note.isPinned });
                }}
              >
                <Pin className="w-4 h-4 mr-2" />
                {note.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  archiveNoteMutation.mutate({ noteId: note.id, isArchived: true });
                }}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {note.excerpt && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {note.excerpt}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            {formatDate(note.updatedAt)}
          </div>
          {note.tags && note.tags.length > 0 && (
            <div className="flex gap-1">
              {note.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 2 && (
                <span className="text-xs">+{note.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Notes</h1>
            <div className="flex gap-2">
              <CreateFolderDialog
                open={isCreateFolderOpen}
                onOpenChange={setIsCreateFolderOpen}
                projectId={projectId ? parseInt(projectId) : undefined}
              >
                <Button variant="ghost" size="sm">
                  <Folder className="w-4 h-4" />
                </Button>
              </CreateFolderDialog>
              <CreateNoteDialog
                open={isCreateNoteOpen}
                onOpenChange={setIsCreateNoteOpen}
                projectId={projectId ? parseInt(projectId) : undefined}
                folderId={selectedFolder}
              >
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </CreateNoteDialog>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "all" | "project")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All Notes</TabsTrigger>
              <TabsTrigger value="project" disabled={!projectId}>
                {projectId ? 'Project Notes' : 'Project'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-4">
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Folders</h3>
                <div className="space-y-1">
                  {folders.map((folder: NoteFolder) => (
                    <Button
                      key={folder.id}
                      variant={selectedFolder === folder.id ? "secondary" : "ghost"}
                      className="w-full justify-start h-8"
                      onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                    >
                      <Folder className="w-4 h-4 mr-2" />
                      {folder.name}
                    </Button>
                  ))}
                </div>
                <Separator className="my-4" />
              </div>
            )}

            {/* Notes List */}
            {notesLoading ? (
              <div className="text-sm text-muted-foreground">Loading notes...</div>
            ) : (
              <div className="space-y-4">
                {pinnedNotes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 text-muted-foreground">Pinned</h3>
                    <div className="space-y-2">
                      {pinnedNotes.map(renderNoteCard)}
                    </div>
                    {regularNotes.length > 0 && <Separator className="my-4" />}
                  </div>
                )}

                {regularNotes.length > 0 && (
                  <div>
                    {pinnedNotes.length > 0 && (
                      <h3 className="text-sm font-medium mb-2 text-muted-foreground">Notes</h3>
                    )}
                    <div className="space-y-2">
                      {regularNotes.map(renderNoteCard)}
                    </div>
                  </div>
                )}

                {filteredNotes.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {searchQuery ? 'No notes found' : 'No notes yet'}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreateNoteOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create your first note
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onClose={() => setSelectedNote(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Select a note to start editing</h3>
              <p className="text-muted-foreground mb-4">
                Choose a note from the sidebar or create a new one
              </p>
              <Button onClick={() => setIsCreateNoteOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Note
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}