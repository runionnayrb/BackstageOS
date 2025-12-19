import { useState, useRef, useEffect, type FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';

interface AutoNumberingTextareaProps {
  projectId: number;
  reportId?: number;
  department?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  isEditing?: boolean;
  template?: any; // Access to template data for content management
}

interface ParsedNote {
  number: number;
  content: string;
  fullLine: string;
}

const AutoNumberingTextarea: React.FC<AutoNumberingTextareaProps> = ({
  projectId,
  reportId,
  department,
  value = '',
  onChange,
  placeholder = "1. No notes. Thank you.",
  className = '',
  isEditing = true,
  template
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  
  // Get content from template for this department
  const getTemplateContent = () => {
    if (!template || !department) return '';
    return template.departments?.[department] || template[department] || '';
  };
  
  // Use template content if no value is provided
  const currentValue = value || getTemplateContent();

  // Parse the textarea content to extract numbered notes
  const parseNotes = (text: string): ParsedNote[] => {
    const lines = text.split('\n');
    const notes: ParsedNote[] = [];
    
    lines.forEach((line) => {
      const match = line.match(/^(\d+)\.\s*(.*)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        const content = match[2].trim();
        if (content) { // Only include lines with actual content
          notes.push({
            number,
            content,
            fullLine: line
          });
        }
      }
    });
    
    return notes;
  };

  // Save individual notes to the database for tracking
  const saveNotesToDatabase = useMutation({
    mutationFn: async (notes: ParsedNote[]) => {
      if (!reportId) return;

      // Delete existing notes for this department and report
      await apiRequest('DELETE', `/api/projects/${projectId}/reports/${reportId}/notes/department/${department}`);

      // Create new notes
      const promises = notes.map((note, index) => 
        apiRequest('POST', `/api/projects/${projectId}/reports/${reportId}/notes`, {
          content: note.content,
          noteOrder: note.number,
          reportId,
          projectId,
          isCompleted: false,
          priority: 'medium',
          department: department || null
        })
      );

      return Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate notes queries to refresh any note tracking views
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'reports', reportId, 'notes']
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'notes-tracking']
      });
    }
  });

  // Handle key down events for auto-numbering
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const textBefore = value.substring(0, selectionStart);
      const textAfter = value.substring(selectionEnd);
      
      // Find the current line
      const lines = textBefore.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Check if current line has a number
      const match = currentLine.match(/^(\d+)\.\s*(.*)$/);
      
      if (match) {
        const currentNumber = parseInt(match[1], 10);
        const currentContent = match[2].trim();
        
        // If current line is empty (just the number), don't create a new line
        if (!currentContent) {
          // Remove the empty numbered line
          const newLines = [...lines];
          newLines[newLines.length - 1] = '';
          const newValue = newLines.join('\n') + textAfter;
          onChange?.(newValue);
          
          setTimeout(() => {
            if (textarea) {
              const newCursorPos = newLines.join('\n').length;
              textarea.setSelectionRange(newCursorPos, newCursorPos);
            }
          }, 0);
          return;
        }
        
        // Create next numbered line
        const nextNumber = currentNumber + 1;
        const newLine = `\n${nextNumber}. `;
        const newValue = textBefore + newLine + textAfter;
        
        onChange?.(newValue);
        
        // Set cursor position after the new number
        setTimeout(() => {
          if (textarea) {
            const newCursorPos = selectionStart + newLine.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      } else {
        // If no number detected, start with "1. "
        const newLine = '\n1. ';
        const newValue = textBefore + newLine + textAfter;
        onChange?.(newValue);
        
        setTimeout(() => {
          if (textarea) {
            const newCursorPos = selectionStart + newLine.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
    }
  };

  // Handle content changes and save to database
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    
    // Parse and save notes to database (debounced)
    if (reportId && department) {
      const notes = parseNotes(newValue);
      if (notes.length > 0) {
        // Debounce the save operation
        setTimeout(() => {
          saveNotesToDatabase.mutate(notes);
        }, 1000);
      }
    }
  };

  // Auto-resize functionality - but not draggable
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const resizeTextarea = () => {
        textarea.style.height = 'auto';
        // Add extra padding to prevent text cutoff - minimum 24px height
        textarea.style.height = Math.max(24, textarea.scrollHeight) + 'px';
      };
      
      resizeTextarea();
      textarea.addEventListener('input', resizeTextarea);
      
      return () => {
        textarea.removeEventListener('input', resizeTextarea);
      };
    }
  }, [value]);

  if (!isEditing) {
    // Display mode - show formatted content with same styling as edit mode
    return (
      <div 
        className={`px-1 py-2 min-h-[24px] whitespace-pre-line text-black text-sm ${className}`}
        style={{ 
          minHeight: '24px', 
          lineHeight: '1.4',
          fontFamily: 'inherit',
          fontSize: '0.875rem', // 14px - same as text-sm
          verticalAlign: 'top'
        }}
      >
        {currentValue || '1. No notes. Thank you.'}
      </div>
    );
  }

  return (
    <Textarea
      ref={textareaRef}
      value={currentValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`auto-numbering-textarea min-h-[24px] resize-none border-0 shadow-none focus:ring-0 px-1 py-2 text-sm placeholder:text-gray-500 ${className}`}
      style={{ 
        minHeight: '24px',
        lineHeight: '1.4',
        fontFamily: 'inherit',
        fontSize: '0.875rem', // 14px - same as text-sm
        verticalAlign: 'top'
      }}
      rows={1}
    />
  );
};

export default AutoNumberingTextarea;