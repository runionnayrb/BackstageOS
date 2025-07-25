import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { insertNoteSchema } from "@shared/schema";
import type { NoteFolder } from "@shared/schema";

interface CreateNoteDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
  folderId?: number | null;
}

export function CreateNoteDialog({ 
  children, 
  open, 
  onOpenChange, 
  projectId,
  folderId 
}: CreateNoteDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(folderId || null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Fetch folders for selection
  const { data: folders = [] } = useQuery({
    queryKey: ['/api/note-folders', projectId],
    queryFn: () => apiRequest(`/api/note-folders?${projectId ? `projectId=${projectId}` : 'isGlobal=true'}`),
    enabled: open
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData: any) => apiRequest('/api/notes', {
      method: 'POST',
      body: noteData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      onOpenChange(false);
      resetForm();
      toast({
        title: "Note created",
        description: "Your new note has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create note",
        description: error.message || "An error occurred while creating the note.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedFolderId(folderId || null);
    setTags([]);
    setNewTag("");
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
          <DialogDescription>
            Create a new note to start organizing your thoughts and ideas.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder">Folder (optional)</Label>
            <Select value={selectedFolderId?.toString() || "none"} onValueChange={(value) => setSelectedFolderId(value === "none" ? null : parseInt(value))}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="content">Initial Content (optional)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your note content..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer">
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createNoteMutation.isPending}
            >
              {createNoteMutation.isPending ? "Creating..." : "Create Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}