import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { insertNoteFolderSchema } from "@shared/schema";

interface CreateFolderDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
}

export function CreateFolderDialog({ 
  children, 
  open, 
  onOpenChange, 
  projectId 
}: CreateFolderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createFolderMutation = useMutation({
    mutationFn: (folderData: any) => apiRequest('/api/note-folders', {
      method: 'POST',
      body: folderData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/note-folders'] });
      onOpenChange(false);
      resetForm();
      toast({
        title: "Folder created",
        description: "Your new folder has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create folder",
        description: error.message || "An error occurred while creating the folder.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your folder.",
        variant: "destructive"
      });
      return;
    }

    try {
      const folderData = insertNoteFolderSchema.parse({
        name: name.trim(),
        description: description.trim() || null,
        projectId: projectId || null,
        color: null,
        sortOrder: 0,
        isGlobal: !projectId, // Set to true when no project is specified
        createdBy: parseInt(user!.id)
      });

      createFolderMutation.mutate(folderData);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder to organize your notes.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter folder description..."
              rows={3}
            />
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
              disabled={createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}