import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { insertNoteFolderSchema } from "@shared/schema";

interface MobileFolderCreationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
}

export function MobileFolderCreationSheet({ 
  isOpen, 
  onClose, 
  projectId 
}: MobileFolderCreationSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createFolderMutation = useMutation({
    mutationFn: (folderData: any) => apiRequest('POST', '/api/note-folders', folderData),
    onSuccess: () => {
      // Invalidate all variations of the note-folders query
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === '/api/note-folders'
      });
      onClose();
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

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[500px] max-h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle>Create New Folder</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Folder Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name..."
                required
                autoFocus
                className="focus-visible:ring-0 focus-visible:ring-offset-0 border-gray-200 focus:border-gray-300"
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
                className="focus-visible:ring-0 focus-visible:ring-offset-0 border-gray-200 focus:border-gray-300"
              />
            </div>
          </div>

          <SheetFooter className="pt-4 gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createFolderMutation.isPending}
              className="flex-1"
            >
              {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}