import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { insertNoteSchema } from "@shared/schema";

interface MobileNoteCreationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  folderId?: number | null;
}

export function MobileNoteCreationSheet({ isOpen, onClose, projectId, folderId }: MobileNoteCreationSheetProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { triggerSelection, triggerNotification } = useHapticFeedback();
  const { toast } = useToast();

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
    onClose();
  };

  const handleSubmit = () => {
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
        folderId: folderId || null,
        tags: [],
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

  // Prevent viewport movement on iOS when focusing inputs
  useEffect(() => {
    if (isOpen) {
      // Store original viewport meta tag
      const viewport = document.querySelector('meta[name="viewport"]');
      const originalContent = viewport?.getAttribute('content') || '';
      
      // Set viewport to prevent zoom and movement
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
      
      return () => {
        // Restore original settings
        if (viewport) {
          viewport.setAttribute('content', originalContent);
        }
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-white mobile-note-sheet"
      style={{ 
        top: 'var(--header-height, 64px)',
        height: 'calc(100vh - var(--header-height, 64px))'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="p-2 h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Button
          onClick={handleSubmit}
          size="sm"
          className="px-4 h-10 bg-blue-600 hover:bg-blue-700"
          disabled={createNoteMutation.isPending || !title.trim()}
        >
          {createNoteMutation.isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creating...
            </div>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Done
            </>
          )}
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title */}
        <div>
          <Input
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mobile-note-input border-0 shadow-none text-xl font-medium placeholder:text-gray-400 px-0 focus-visible:ring-0"
            autoFocus
            onFocus={(e) => {
              // Prevent iOS viewport jump
              e.preventDefault();
              e.target.scrollIntoView = () => {};
            }}
          />
        </div>

        {/* Content */}
        <div>
          <Textarea
            placeholder="Start writing..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mobile-note-input border-0 shadow-none text-base resize-none min-h-[400px] placeholder:text-gray-400 px-0 focus-visible:ring-0"
            onFocus={(e) => {
              // Prevent iOS viewport jump
              e.preventDefault();
              e.target.scrollIntoView = () => {};
            }}
          />
        </div>
      </div>
    </div>
  );
}