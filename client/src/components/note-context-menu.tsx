import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NoteStatus, ReportNote } from "@shared/schema";
import { Circle } from "lucide-react";

interface NoteContextMenuProps {
  reportId: number;
  projectId: number;
  fieldId?: number;
  departmentKey?: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onNoteStatusUpdate?: () => void;
}

interface Position {
  top: number;
  left: number;
}

export function NoteContextMenu({
  reportId,
  projectId,
  fieldId,
  departmentKey,
  containerRef,
  onNoteStatusUpdate,
}: NoteContextMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: noteStatuses = [] } = useQuery<NoteStatus[]>({
    queryKey: ['/api/projects', projectId, 'note-statuses'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/note-statuses`);
      if (!response.ok) throw new Error('Failed to fetch note statuses');
      return response.json();
    },
    enabled: !!projectId,
  });

  const sortedStatuses = [...noteStatuses].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    if (!containerRef.current.contains(e.target as Node)) {
      setIsVisible(false);
      return;
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";
    
    if (!text) {
      return;
    }

    e.preventDefault();
    
    setSelectedText(text);
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    setPosition({
      top: e.clientY - containerRect.top,
      left: e.clientX - containerRect.left,
    });
    setIsVisible(true);
  }, [containerRef]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsVisible(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    setIsVisible(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      container.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [containerRef, handleContextMenu, handleClickOutside, handleScroll]);

  const findMatchingNote = useCallback(async (text: string): Promise<ReportNote | null> => {
    if (!reportId) return null;
    
    let url = `/api/projects/${projectId}/reports/${reportId}/notes`;
    if (departmentKey) {
      url += `?department=${encodeURIComponent(departmentKey)}`;
    }
    
    const notesResponse = await fetch(url);
    if (!notesResponse.ok) return null;
    
    const notes: ReportNote[] = await notesResponse.json();
    
    const stripHtml = (html: string) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || '';
    };
    
    const stripNumberingPrefix = (str: string) => {
      return str.replace(/^\d+\.\s*/, '');
    };
    
    const normalizeText = (str: string) => {
      return stripNumberingPrefix(str).trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    const normalizedText = normalizeText(text);
    
    return notes.find((note) => {
      if (fieldId && (note as any).templateFieldId !== fieldId) return false;
      const noteContent = normalizeText(stripHtml(note.content));
      return noteContent === normalizedText || 
             noteContent.includes(normalizedText) || 
             normalizedText.includes(noteContent);
    }) || null;
  }, [projectId, reportId, departmentKey, fieldId]);

  const invalidateNoteQueries = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (!Array.isArray(key)) return false;
        if (key[0] === '/api/projects' && key[1] === projectId) {
          if (key[2] === 'notes-tracking') return true;
          if (key[2] === 'reports' && key[3] === reportId && key[4] === 'notes') return true;
        }
        return false;
      }
    });
  }, [queryClient, projectId, reportId]);

  const updateNoteStatus = async (statusId: number) => {
    if (!selectedText || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const matchingNote = await findMatchingNote(selectedText);

      if (matchingNote) {
        await apiRequest("PATCH", `/api/projects/${projectId}/reports/${reportId}/notes/${matchingNote.id}`, {
          statusId: statusId,
        });

        const status = sortedStatuses.find(s => s.id === statusId);
        toast({
          title: "Status updated",
          description: `Note status set to "${status?.name || 'Unknown'}"`,
        });

        invalidateNoteQueries();
        onNoteStatusUpdate?.();
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

  const clearNoteStatus = async () => {
    if (!selectedText || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const matchingNote = await findMatchingNote(selectedText);

      if (matchingNote) {
        await apiRequest("PATCH", `/api/projects/${projectId}/reports/${reportId}/notes/${matchingNote.id}`, {
          statusId: null,
        });

        toast({
          title: "Status cleared",
          description: "Note status has been removed",
        });

        invalidateNoteQueries();
        onNoteStatusUpdate?.();
      } else {
        toast({
          title: "Save report first",
          description: "Notes are synced when the report is saved",
        });
      }
    } catch (error) {
      console.error("Error clearing note status:", error);
      toast({
        title: "Error",
        description: "Failed to clear note status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setIsVisible(false);
    }
  };

  if (!isVisible || sortedStatuses.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-[100] bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
      style={{
        top: position.top,
        left: position.left,
      }}
      onMouseDown={(e) => e.preventDefault()}
      data-testid="note-context-menu"
    >
      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
        Set Status
      </div>
      {sortedStatuses.map((status) => (
        <button
          key={status.id}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
          onClick={() => updateNoteStatus(status.id)}
          disabled={isUpdating}
          data-testid={`context-menu-status-${status.id}`}
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: status.color || '#6b7280' }}
          />
          <span className="truncate">{status.name}</span>
        </button>
      ))}
      <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
        <button
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-500 dark:text-gray-400 disabled:opacity-50"
          onClick={clearNoteStatus}
          disabled={isUpdating}
          data-testid="context-menu-clear-status"
        >
          <Circle className="w-3 h-3 flex-shrink-0" />
          <span>Clear status</span>
        </button>
      </div>
    </div>
  );
}
