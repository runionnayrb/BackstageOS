import { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, MoreVertical, Pin, Archive, Share2, Tag, X, Plus, Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { MobileFormattingToolbar } from "./MobileFormattingToolbar";
import type { Note } from "@shared/schema";

interface MobileNoteEditorProps {
  note: Note;
  onClose: () => void;
}

export function MobileNoteEditor({ note, onClose }: MobileNoteEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerSelection, triggerNotification } = useHapticFeedback();
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showFormatting, setShowFormatting] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Swipe gesture for closing editor
  const { attachSwipeListeners } = useSwipeGesture({
    onSwipeRight: () => {
      triggerSelection();
      onClose();
    },
    threshold: 100,
    preventScrollOnSwipe: true
  });

  // Auto-save mutation
  const saveNoteMutation = useMutation({
    mutationFn: (data: { title: string; content: any; tags: string[]; excerpt?: string }) =>
      apiRequest(`/api/notes/${note.id}`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      setLastSaved(new Date());
      setIsSaving(false);
      triggerNotification('success');
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: "Save failed",
        description: "Unable to save changes. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Pin/unpin note mutation
  const pinNoteMutation = useMutation({
    mutationFn: (isPinned: boolean) =>
      apiRequest(`/api/notes/${note.id}`, {
        method: 'PUT',
        body: { isPinned }
      }),
    onSuccess: () => {
      triggerNotification('success');
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
    }
  });

  // TipTap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Typography,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
      CharacterCount,
    ],
    content: note.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave();
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(() => {
      if (!editor) return;
      
      setIsSaving(true);
      const content = editor.getJSON();
      const text = editor.getText();
      const excerpt = text.slice(0, 150);
      
      saveNoteMutation.mutate({
        title,
        content,
        tags,
        excerpt
      });
    }, 1000),
    [editor, title, tags]
  );

  // Debounce utility
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Save when title or tags change
  useEffect(() => {
    if (title !== note.title || JSON.stringify(tags) !== JSON.stringify(note.tags)) {
      debouncedSave();
    }
  }, [title, tags, debouncedSave]);

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    
    if (diff < 60) return 'Saved just now';
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved ${Math.floor(diff / 3600)}h ago`;
  };



  // Mobile header
  const MobileHeader = () => (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-8 w-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Note</span>
            {isSaving ? (
              <span className="text-xs text-blue-600">Saving...</span>
            ) : lastSaved ? (
              <span className="text-xs text-gray-500">{formatLastSaved()}</span>
            ) : null}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFormatting(!showFormatting)}
            className="p-1 h-8 w-8"
          >
            <Type className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => pinNoteMutation.mutate(!note.isPinned)}
              >
                <Pin className="w-4 h-4 mr-2" />
                {note.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="h-screen flex flex-col bg-white"
      ref={(el) => {
        if (el) {
          const cleanup = attachSwipeListeners(el);
          return cleanup;
        }
      }}
    >
      <MobileHeader />
      
      {/* Title input */}
      <div className="px-4 pt-4 pb-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="text-lg font-semibold border-none px-0 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 mobile-text-input"
        />
      </div>

      {/* Tags section */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs px-2 py-1 cursor-pointer"
              onClick={() => removeTag(tag)}
            >
              {tag}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            className="text-sm border-gray-200 h-8 mobile-text-input"
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
          />
          <Button
            onClick={addTag}
            size="sm"
            variant="outline"
            className="h-8 px-3"
            disabled={!newTag.trim()}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <EditorContent 
            editor={editor} 
            className="h-full focus:outline-none"
          />
        </ScrollArea>
      </div>

      {/* Mobile formatting toolbar */}
      <MobileFormattingToolbar 
        editor={editor}
        isOpen={showFormatting}
        onClose={() => setShowFormatting(false)}
      />
      
      {/* Character count */}
      {editor && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
          {editor.storage.characterCount.characters()} characters
        </div>
      )}
    </div>
  );
}