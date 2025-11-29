import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Clock, AlertCircle, Circle, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NoteStatusPopupProps {
  reportId: number;
  projectId: number;
  fieldId: number;
  departmentKey: string;
  containerRef: React.RefObject<HTMLDivElement>;
  teamMembers?: { id: number; email: string; firstName: string; lastName: string }[];
}

interface Position {
  top: number;
  left: number;
}

export function NoteStatusPopup({
  reportId,
  projectId,
  fieldId,
  departmentKey,
  containerRef,
  teamMembers = [],
}: NoteStatusPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const handleSelectionChange = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) {
        setIsVisible(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const container = containerRef.current;
      
      if (!container.contains(range.commonAncestorContainer)) {
        setIsVisible(false);
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < 3) {
        setIsVisible(false);
        return;
      }

      setSelectedText(text);

      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      setPosition({
        top: rect.top - containerRect.top - 45,
        left: rect.left - containerRect.left + (rect.width / 2),
      });
      setIsVisible(true);
    }, 300);
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [handleSelectionChange]);

  const findMatchingNote = useCallback(async (text: string) => {
    const notesResponse = await fetch(
      `/api/projects/${projectId}/reports/${reportId}/notes?department=${encodeURIComponent(departmentKey)}`
    );
    const notes = await notesResponse.json();
    
    const normalizedText = text.trim().toLowerCase();
    return notes.find((note: any) => {
      if ((note as any).templateFieldId !== fieldId) return false;
      const normalizedNote = note.content.trim().toLowerCase();
      return normalizedNote === normalizedText || 
             normalizedNote.includes(normalizedText) || 
             normalizedText.includes(normalizedNote);
    });
  }, [projectId, reportId, departmentKey, fieldId]);

  const updateNoteStatus = async (status: string) => {
    if (!selectedText || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const matchingNote = await findMatchingNote(selectedText);

      if (matchingNote) {
        const updateData: any = {};
        if (status === "completed") {
          updateData.isCompleted = true;
        } else if (["high", "medium", "low"].includes(status)) {
          updateData.priority = status;
        }
        
        await apiRequest("PATCH", `/api/projects/${projectId}/reports/${reportId}/notes/${matchingNote.id}`, updateData);

        toast({
          title: "Note updated",
          description: status === "completed" ? "Marked as completed" : `Priority set to ${status}`,
        });
      } else {
        toast({
          title: "Save report first",
          description: "Notes are synced when the report is saved",
        });
      }
    } catch (error) {
      console.error("Error updating note status:", error);
      toast({
        title: "Error",
        description: "Failed to update note status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setIsVisible(false);
    }
  };

  const assignNote = async (userId: number) => {
    if (!selectedText || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const matchingNote = await findMatchingNote(selectedText);

      if (matchingNote) {
        await apiRequest("PATCH", `/api/projects/${projectId}/reports/${reportId}/notes/${matchingNote.id}`, {
          assignedTo: userId,
        });

        toast({
          title: "Note assigned",
          description: "Team member assigned to this note",
        });
      } else {
        toast({
          title: "Save report first",
          description: "Notes are synced when the report is saved",
        });
      }
    } catch (error) {
      console.error("Error assigning note:", error);
      toast({
        title: "Error",
        description: "Failed to assign note",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={popupRef}
      className="absolute z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg border p-1 flex items-center gap-1"
      style={{
        top: Math.max(0, position.top),
        left: position.left,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => updateNoteStatus("completed")}
        disabled={isUpdating}
        title="Mark as completed"
        data-testid="button-note-completed"
      >
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => updateNoteStatus("high")}
        disabled={isUpdating}
        title="High priority"
        data-testid="button-note-high"
      >
        <AlertCircle className="h-3 w-3 text-red-600" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => updateNoteStatus("medium")}
        disabled={isUpdating}
        title="Medium priority"
        data-testid="button-note-medium"
      >
        <Clock className="h-3 w-3 text-yellow-600" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => updateNoteStatus("low")}
        disabled={isUpdating}
        title="Low priority"
        data-testid="button-note-low"
      >
        <Circle className="h-3 w-3 text-gray-400" />
      </Button>
      {teamMembers.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              disabled={isUpdating}
              title="Assign to team member"
              data-testid="button-note-assign"
            >
              <User className="h-3 w-3 text-blue-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1">
            <div className="space-y-1">
              {teamMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => assignNote(member.id)}
                  data-testid={`button-assign-${member.id}`}
                >
                  {member.firstName} {member.lastName}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
