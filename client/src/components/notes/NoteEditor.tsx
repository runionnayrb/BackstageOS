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
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Code2, Undo, Redo, Link2, Image as ImageIcon,
  Type, AlignLeft, AlignCenter, AlignRight, Save, X, Users, MessageSquare,
  Paperclip, Tag, Pin, Archive, MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Note } from "@shared/schema";

interface NoteEditorProps {
  note: Note;
  onClose: () => void;
}

export function NoteEditor({ note, onClose }: NoteEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
    }
  });

  // Archive note mutation
  const archiveNoteMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/notes/${note.id}`, {
        method: 'PUT',
        body: { isArchived: true }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      onClose();
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Typography,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800'
        }
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
      CharacterCount
    ],
    content: note.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // Debounced auto-save
      debouncedSave();
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(() => {
      if (editor) {
        setIsSaving(true);
        const content = editor.getJSON();
        const textContent = editor.getText();
        const excerpt = textContent.slice(0, 200);
        
        saveNoteMutation.mutate({
          title,
          content,
          tags,
          excerpt
        });
      }
    }, 2000),
    [editor, title, tags]
  );

  // Save on title or tags change
  useEffect(() => {
    debouncedSave();
  }, [title, tags, debouncedSave]);

  // Toolbar button component
  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    title 
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addLink = () => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkDialog(false);
    }
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSaving && <span>Saving...</span>}
              {lastSaved && !isSaving && (
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              )}
              {editor.storage.characterCount && (
                <span>{editor.storage.characterCount.characters()} characters</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pinNoteMutation.mutate(!note.isPinned)}
            >
              <Pin className={`w-4 h-4 ${note.isPinned ? 'text-yellow-500' : ''}`} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => archiveNoteMutation.mutate()}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Note
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="w-4 h-4 mr-2" />
                  Share & Collaborate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Comments
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attachments
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="text-2xl font-bold border-none shadow-none p-0 h-auto bg-transparent focus-visible:ring-0"
        />

        {/* Tags */}
        <div className="flex items-center gap-2 mt-4">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="cursor-pointer">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  + Add tag
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tag name"
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    className="h-8"
                  />
                  <Button size="sm" onClick={addTag}>Add</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b p-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-2 h-6" />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-2 h-6" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Task List"
          >
            <input type="checkbox" className="w-4 h-4 pointer-events-none" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-2 h-6" />

          {/* Other formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code2 className="w-4 h-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-2 h-6" />

          {/* Insert elements */}
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogTrigger asChild>
              <ToolbarButton
                onClick={() => setShowLinkDialog(true)}
                isActive={editor.isActive('link')}
                title="Add Link"
              >
                <Link2 className="w-4 h-4" />
              </ToolbarButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Link</DialogTitle>
                <DialogDescription>
                  Enter the URL you want to link to
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => e.key === 'Enter' && addLink()}
                />
                <Button onClick={addLink}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <ToolbarButton
            onClick={addImage}
            title="Add Image"
          >
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-2 h-6" />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent 
          editor={editor} 
          className="h-full focus-within:outline-none"
        />
      </div>
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}