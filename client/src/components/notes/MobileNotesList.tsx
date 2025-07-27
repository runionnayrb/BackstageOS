import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, Plus, FileText, Folder, MoreVertical, Pin, Archive, Tag, 
  ArrowLeft, ChevronRight, X, Edit3, Share2, Eye
} from "lucide-react";
import { FloatingActionButton } from "@/components/navigation/floating-action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { MobileNoteEditor } from "./MobileNoteEditor";
import { MobileNoteCreationSheet } from "./MobileNoteCreationSheet";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { MobileFolderCreationSheet } from "./MobileFolderCreationSheet";
import { MobilePullToRefresh } from "./MobilePullToRefresh";
import type { Note, NoteFolder } from "@shared/schema";

interface MobileNotesListProps {
  projectId?: string | null;
  viewMode: "all" | "project";
}

export function MobileNotesList({ projectId, viewMode }: MobileNotesListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { triggerSelection, triggerNotification } = useHapticFeedback();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [isCreateNoteSheetOpen, setIsCreateNoteSheetOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentView, setCurrentView] = useState<"folders" | "notes" | "editor">("folders");

  // Fetch folders
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
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
      triggerNotification('success');
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
      triggerNotification('success');
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleFolderSelect = (folderId: number) => {
    triggerSelection();
    setSelectedFolder(folderId);
    setCurrentView("notes");
  };

  const handleNoteSelect = (note: Note) => {
    triggerSelection();
    setSelectedNote(note);
    setCurrentView("editor");
  };

  const handleBack = () => {
    if (currentView === "editor") {
      setCurrentView("notes");
      setSelectedNote(null);
    } else if (currentView === "notes") {
      setCurrentView("folders");
      setSelectedFolder(null);
    }
  };

  const getSelectedFolderName = () => {
    const folder = folders.find((f: NoteFolder) => f.id === selectedFolder);
    return folder?.name || "All Notes";
  };

  // Pull to refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/note-folders'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] })
    ]);
  };

  // Mobile header component - simplified, no title or search
  const MobileHeader = () => (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {(currentView === "notes" || currentView === "editor") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="p-1 h-8 w-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* No header icons on mobile - they will be in FAB and header context */}
        <div className="flex items-center gap-2">
          {/* Empty for now - actions will be in FAB */}
        </div>
      </div>
      
      {showSearch && currentView !== "editor" && (
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-10"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Folders view
  const FoldersView = () => (
    <ScrollArea className="flex-1">
      <div className="-mt-4">
        {/* All Notes option */}
        <div 
          className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
          onClick={() => handleFolderSelect(0)}
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-700" />
            <div>
              <h3 className="font-medium">All Notes</h3>
              <p className="text-sm text-gray-500">{notes.length} notes</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>

        {/* Folders list */}
        {folders.map((folder: NoteFolder) => {
          const folderNotes = notes.filter((note: Note) => note.folderId === folder.id);
          return (
            <div
              key={folder.id}
              className="flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
              onClick={() => handleFolderSelect(folder.id)}
            >
              <div className="flex items-center gap-3">
                <Folder className="h-5 w-5 text-gray-700" />
                <div>
                  <h3 className="font-medium">{folder.name}</h3>
                  <p className="text-sm text-gray-500">{folderNotes.length} notes</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          );
        })}

        {foldersLoading && (
          <div className="text-center py-12 px-4">
            <div className="animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-lg mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
            </div>
          </div>
        )}

        {!foldersLoading && folders.length === 0 && (
          <div className="text-center py-12 px-4">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No folders yet</h3>
            <p className="text-gray-500 mb-6">Create your first folder to organize your notes</p>
            <Button onClick={() => setIsCreateFolderOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  // Notes view
  const NotesView = () => (
    <ScrollArea className="flex-1">
      <div className="p-4 -mt-4 pt-0">
        {pinnedNotes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">PINNED</h3>
            {pinnedNotes.map((note: Note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}

        {regularNotes.length > 0 && (
          <div>
            {pinnedNotes.length > 0 && (
              <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">NOTES</h3>
            )}
            {regularNotes.map((note: Note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}

        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
            <p className="text-gray-500 mb-6">Create your first note to get started</p>
            <Button onClick={() => setIsCreateNoteSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  // Note card component
  const NoteCard = ({ note }: { note: Note }) => (
    <div
      className="p-4 rounded-lg border border-gray-100 mb-3 active:bg-gray-50 transition-colors mobile-card-transition mobile-touch-target"
      onClick={() => handleNoteSelect(note)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {note.isPinned && <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
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
      
      {note.excerpt && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{note.excerpt}</p>
      )}
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{formatDate(note.updatedAt)}</span>
        {note.tags && note.tags.length > 0 && (
          <div className="flex gap-1">
            {note.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">
                {tag}
              </Badge>
            ))}
            {note.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{note.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (currentView === "editor" && selectedNote) {
    return (
      <MobileNoteEditor 
        note={selectedNote} 
        onClose={() => {
          setSelectedNote(null);
          setCurrentView("notes");
        }} 
      />
    );
  }

  return (
    <MobilePullToRefresh onRefresh={handleRefresh}>
      <div className="h-screen flex flex-col bg-white mobile-notes-container">
        <MobileHeader />
        
        {currentView === "folders" ? <FoldersView /> : <NotesView />}

        {/* Create note sheet */}
        <MobileNoteCreationSheet 
          isOpen={isCreateNoteSheetOpen}
          onClose={() => setIsCreateNoteSheetOpen(false)}
          projectId={projectId ? parseInt(projectId) : undefined}
          folderId={selectedFolder}
        />
        
        <MobileFolderCreationSheet 
          isOpen={isCreateFolderOpen}
          onClose={() => setIsCreateFolderOpen(false)}
          projectId={projectId ? parseInt(projectId) : undefined}
        />
        
        {/* Floating Action Button */}
        <FloatingActionButton 
          onClick={() => {
            if (currentView === "folders") {
              setIsCreateNoteSheetOpen(true);
            } else if (currentView === "notes") {
              setIsCreateNoteSheetOpen(true);
            }
          }} 
        />
      </div>
    </MobilePullToRefresh>
  );
}