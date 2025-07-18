import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Send, Folder, Tag, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { apiRequest } from "@/lib/queryClient";
import { insertNoteSchema } from "@shared/schema";
import type { NoteFolder } from "@shared/schema";

interface MobileNoteCreationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  folderId?: number | null;
}

export function MobileNoteCreationSheet({
  isOpen,
  onClose,
  projectId,
  folderId
}: MobileNoteCreationSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerSelection, triggerNotification } = useHapticFeedback();
  const sheetRef = useRef<HTMLDivElement>(null);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(folderId || null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Fetch folders for selection
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/note-folders', projectId],
    queryFn: () => apiRequest(`/api/note-folders?${projectId ? `projectId=${projectId}` : 'isGlobal=true'}`),
    enabled: isOpen
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData: any) => apiRequest('/api/notes', {
      method: 'POST',
      body: noteData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      triggerNotification('success');
      handleClose();
      toast({
        title: "Note created",
        description: "Your new note has been created successfully."
      });
    },
    onError: (error: any) => {
      triggerNotification('error');
      toast({
        title: "Failed to create note",
        description: error.message || "An error occurred while creating the note.",
        variant: "destructive"
      });
    }
  });

  const handleClose = () => {
    triggerSelection();
    setTitle("");
    setContent("");
    setSelectedFolderId(folderId || null);
    setTags([]);
    setNewTag("");
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
      triggerSelection();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    triggerSelection();
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your note.",
        variant: "destructive"
      });
      return;
    }

    try {
      const noteData = insertNoteSchema.parse({
        title: title.trim(),
        content: content ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] } : null,
        excerpt: content.slice(0, 200),
        projectId: projectId || null,
        folderId: selectedFolderId,
        tags,
        isPinned: false,
        isArchived: false,
        sortOrder: 0,
        createdBy: parseInt(user!.id),
        lastEditedBy: parseInt(user!.id)
      });

      createNoteMutation.mutate(noteData);
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation error",
        description: "Please check your input and try again.",
        variant: "destructive"
      });
    }
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle swipe down to close
  useEffect(() => {
    let startY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 150) {
        handleClose();
        isDragging = false;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    if (isOpen && sheetRef.current) {
      const sheet = sheetRef.current;
      sheet.addEventListener('touchstart', handleTouchStart);
      sheet.addEventListener('touchmove', handleTouchMove);
      sheet.addEventListener('touchend', handleTouchEnd);

      return () => {
        sheet.removeEventListener('touchstart', handleTouchStart);
        sheet.removeEventListener('touchmove', handleTouchMove);
        sheet.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />
      
      {/* Mobile bottom sheet */}
      <div 
        ref={sheetRef}
        className="fixed left-0 right-0 z-50 bg-white flex flex-col mobile-note-sheet"
        style={{ 
          top: '60px', // Just below the BackstageOS header
          height: 'calc(100vh - 60px)' // Full height minus header
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <Button 
            variant="ghost" 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-1 h-auto"
          >
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-black">New Note</h1>
          <Button
            variant="ghost"
            onClick={handleCreate}
            disabled={createNoteMutation.isPending || !title.trim()}
            className="text-blue-500 hover:text-blue-600 p-1 h-auto disabled:opacity-50"
          >
            <Send className="h-6 w-6" />
          </Button>
        </div>

        {/* Swipe indicator */}
        <div className="flex justify-center py-2 border-b border-gray-100">
          <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Title */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                className="text-lg font-medium border-0 px-0 focus-visible:ring-0 mobile-note-input"
                style={{ fontSize: '18px' }} // Prevent iOS zoom
              />
            </div>

            {/* Folder selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Folder className="h-4 w-4" />
                <span>Folder</span>
              </div>
              <Select 
                value={selectedFolderId?.toString() || "none"} 
                onValueChange={(value) => {
                  setSelectedFolderId(value === "none" ? null : parseInt(value));
                  triggerSelection();
                }}
              >
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Select a folder or leave unorganized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder (unorganized)</SelectItem>
                  {folders.map((folder: NoteFolder) => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tag className="h-4 w-4" />
                <span>Tags</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer mobile-touch-target">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="border-gray-200"
                  style={{ fontSize: '16px' }} // Prevent iOS zoom
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button 
                  onClick={addTag} 
                  disabled={!newTag.trim()}
                  variant="outline"
                  size="sm"
                  className="mobile-touch-target"
                >
                  <Hash className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Content</span>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing your note..."
                className="min-h-[200px] border-gray-200 resize-none"
                style={{ fontSize: '16px' }} // Prevent iOS zoom
              />
            </div>
          </div>
        </div>

        {/* Sticky footer for mobile nav compatibility */}
        <div 
          className="flex-shrink-0 p-4 border-t border-gray-200 bg-white"
          style={{ marginBottom: '80px' }} // Space for mobile navigation
        >
          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 mobile-touch-target"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createNoteMutation.isPending || !title.trim()}
              className="flex-1 mobile-touch-target"
            >
              {createNoteMutation.isPending ? 'Creating...' : 'Create Note'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}