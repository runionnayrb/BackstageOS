import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Check, X, Clock, User, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ReportNote, InsertReportNote } from '@shared/schema';

interface ReportNotesManagerProps {
  reportId: number;
  projectId?: number;
  reportType: string;
  department?: string;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

const ReportNotesManager: React.FC<ReportNotesManagerProps> = ({ 
  reportId, 
  projectId, 
  reportType,
  department 
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch notes for this report
  const { data: notes = [], isLoading } = useQuery<ReportNote[]>({
    queryKey: ['/api/projects', projectId, 'reports', reportId, 'notes', department],
    queryFn: async () => {
      const url = department 
        ? `/api/projects/${projectId}/reports/${reportId}/notes?department=${encodeURIComponent(department)}`
        : `/api/projects/${projectId}/reports/${reportId}/notes`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    }
  });

  // Query to fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/projects', projectId, 'team'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/team`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      const members = await response.json();
      return members.map((member: any) => ({
        id: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName
      })) as User[];
    }
  });

  // Mutation to create a new note
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: Omit<InsertReportNote, 'createdBy'>) => {
      const response = await fetch(`/api/projects/${projectId}/reports/${reportId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
      if (!response.ok) throw new Error('Failed to create note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'reports', reportId, 'notes', department]
      });
      setNewNoteContent('');
      toast({ title: 'Note added successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error adding note', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  });

  // Mutation to update a note
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, data }: { noteId: number; data: Partial<ReportNote> }) => {
      const response = await fetch(`/api/projects/${projectId}/reports/${reportId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'reports', reportId, 'notes', department]
      });
      setEditingNote(null);
      toast({ title: 'Note updated successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error updating note', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  });

  // Mutation to delete a note
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/projects/${projectId}/reports/${reportId}/notes/${noteId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'reports', reportId, 'notes', department]
      });
      toast({ title: 'Note deleted successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error deleting note', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  });

  // Mutation to reorder notes
  const reorderNotesMutation = useMutation({
    mutationFn: async (reorderedNotes: { id: number; noteOrder: number }[]) => {
      const response = await fetch(`/api/projects/${projectId}/reports/${reportId}/notes/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reorderedNotes })
      });
      if (!response.ok) throw new Error('Failed to reorder notes');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'reports', reportId, 'notes', department]
      });
      toast({ title: 'Notes reordered successfully' });
    },
    onError: () => {
      toast({ 
        title: 'Error reordering notes', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    }
  });

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    
    const nextOrder = Math.max(...notes.map((n: ReportNote) => n.noteOrder || 0), 0) + 1;
    
    createNoteMutation.mutate({
      content: newNoteContent.trim(),
      noteOrder: nextOrder,
      reportId,
      projectId: projectId || 0,
      isCompleted: false,
      priority: 'medium',
      department: department || null
    });
    
    // Clear the input after creating the note
    setNewNoteContent('');
  };

  const handleEditNote = (note: ReportNote) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || editingNote === null) return;
    
    updateNoteMutation.mutate({
      noteId: editingNote,
      data: { content: editContent.trim() }
    });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
  };

  const handleToggleComplete = (note: ReportNote) => {
    updateNoteMutation.mutate({
      noteId: note.id,
      data: { isCompleted: !note.isCompleted }
    });
  };

  const handlePriorityChange = (note: ReportNote, newPriority: string) => {
    updateNoteMutation.mutate({
      noteId: note.id,
      data: { priority: newPriority }
    });
  };

  const handleAssignUser = (note: ReportNote, userId: number | null) => {
    updateNoteMutation.mutate({
      noteId: note.id,
      data: { assignedTo: userId }
    });
  };

  const moveNote = (noteId: number, direction: 'up' | 'down') => {
    const sortedNotes = [...notes].sort((a, b) => (a.noteOrder || 0) - (b.noteOrder || 0));
    const currentIndex = sortedNotes.findIndex(n => n.id === noteId);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sortedNotes.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap the note orders
    const reorderedNotes = [
      { id: sortedNotes[currentIndex].id, noteOrder: sortedNotes[newIndex].noteOrder || 0 },
      { id: sortedNotes[newIndex].id, noteOrder: sortedNotes[currentIndex].noteOrder || 0 }
    ];

    reorderNotesMutation.mutate(reorderedNotes);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getAssignedUserName = (userId: number | null) => {
    if (!userId) return null;
    const user = teamMembers.find(m => m.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  // Sort notes by order
  const sortedNotes = [...notes].sort((a, b) => (a.noteOrder || 0) - (b.noteOrder || 0));

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading notes...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Add new note */}
      <div className="p-4">
        <Textarea
          placeholder="Add a new note..."
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          className="min-h-[24px] max-h-[200px] resize-none border-0 shadow-none focus:ring-0 overflow-y-auto py-1 px-2"
          style={{ height: '24px', lineHeight: '1.2' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = '24px';
            target.style.height = Math.max(24, target.scrollHeight) + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddNote();
            }
          }}
        />

      </div>

      {/* Notes list */}
      <div className="space-y-2">
        {sortedNotes.map((note, index) => (
          <div 
            key={note.id}
            className={`p-4 space-y-2 ${
              note.isCompleted ? 'bg-gray-50 dark:bg-gray-900' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              {/* Note number and content */}
              <div className="flex items-start gap-1 flex-1">
                <span className="text-sm font-medium text-foreground min-w-[20px] mt-0">
                  {index + 1}.
                </span>
                
                <div className="flex-1">
                  {editingNote === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p 
                      className={`text-sm leading-relaxed cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1 -m-1 ${
                        note.isCompleted ? 'line-through text-muted-foreground' : ''
                      }`}
                      onClick={() => handleEditNote(note)}
                    >
                      {note.content}
                    </p>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveNote(note.id, 'up')}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveNote(note.id, 'down')}
                  disabled={index === sortedNotes.length - 1}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteNoteMutation.mutate(note.id)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Note metadata */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {note.assignedTo && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{getAssignedUserName(note.assignedTo)}</span>
                </div>
              )}
              
              {note.dueDate && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(note.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>


          </div>
        ))}


      </div>
    </div>
  );
};

export default ReportNotesManager;