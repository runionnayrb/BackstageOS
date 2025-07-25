import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface SimplePaginatedEditorProps {
  content: string;
  onChange: (content: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  isLoading?: boolean;
  isSaving?: boolean;
  lastSaved?: Date;
}

export function SimplePaginatedEditor({
  content,
  onChange,
  title,
  onTitleChange,
  isLoading = false,
  isSaving = false,
  lastSaved
}: SimplePaginatedEditorProps) {
  const [pages, setPages] = useState<string[]>(['']);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const paginationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Constants for page dimensions
  const PAGE_HEIGHT_PX = 864; // 9 inches at 96 DPI (11" - 1" top - 1" bottom margins)
  const PAGE_WIDTH_PX = 576; // 6 inches at 96 DPI (8.5" - 1.25" left - 1.25" right margins)
  const LINE_HEIGHT = 24; // Approximate line height in pixels
  const CHARS_PER_LINE = 80; // Approximate characters per line
  const LINES_PER_PAGE = Math.floor(PAGE_HEIGHT_PX / LINE_HEIGHT);
  const CHARS_PER_PAGE = CHARS_PER_LINE * LINES_PER_PAGE;

  // Initialize content
  useEffect(() => {
    if (!isInitialized && content) {
      const contentStr = typeof content === 'string' ? content : '';
      if (contentStr.trim()) {
        // Simple pagination by character count
        const pageContents = [];
        let remainingContent = contentStr;
        
        while (remainingContent.length > 0) {
          const pageContent = remainingContent.substring(0, CHARS_PER_PAGE);
          pageContents.push(pageContent);
          remainingContent = remainingContent.substring(CHARS_PER_PAGE);
        }
        
        setPages(pageContents.length > 0 ? pageContents : ['']);
      }
      setIsInitialized(true);
    }
  }, [content, isInitialized]);

  // Handle content changes
  const handlePageChange = useCallback((pageIndex: number, newContent: string) => {
    const newPages = [...pages];
    newPages[pageIndex] = newContent;
    
    // Repaginate if needed
    if (paginationTimeoutRef.current) {
      clearTimeout(paginationTimeoutRef.current);
    }
    
    paginationTimeoutRef.current = setTimeout(() => {
      // Combine all pages
      const fullContent = newPages.join('');
      
      // Repaginate
      const repaginatedPages = [];
      let remainingContent = fullContent;
      
      while (remainingContent.length > 0) {
        const pageContent = remainingContent.substring(0, CHARS_PER_PAGE);
        repaginatedPages.push(pageContent);
        remainingContent = remainingContent.substring(CHARS_PER_PAGE);
      }
      
      // Ensure at least one page
      if (repaginatedPages.length === 0) {
        repaginatedPages.push('');
      }
      
      setPages(repaginatedPages);
      onChange(fullContent);
    }, 500);
  }, [pages, onChange]);

  // Handle key navigation between pages
  const handleKeyDown = useCallback((e: React.KeyboardEvent, pageIndex: number) => {
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    const content = textarea.value;
    
    // Handle moving to previous page
    if (e.key === 'ArrowUp' && cursorPos === 0 && pageIndex > 0) {
      e.preventDefault();
      const prevTextarea = document.getElementById(`page-textarea-${pageIndex - 1}`) as HTMLTextAreaElement;
      if (prevTextarea) {
        prevTextarea.focus();
        prevTextarea.setSelectionRange(prevTextarea.value.length, prevTextarea.value.length);
      }
    }
    
    // Handle moving to next page
    if (e.key === 'ArrowDown' && cursorPos === content.length && pageIndex < pages.length - 1) {
      e.preventDefault();
      const nextTextarea = document.getElementById(`page-textarea-${pageIndex + 1}`) as HTMLTextAreaElement;
      if (nextTextarea) {
        nextTextarea.focus();
        nextTextarea.setSelectionRange(0, 0);
      }
    }
    
    // Handle backspace at beginning
    if (e.key === 'Backspace' && cursorPos === 0 && pageIndex > 0) {
      e.preventDefault();
      // Move to end of previous page
      const prevTextarea = document.getElementById(`page-textarea-${pageIndex - 1}`) as HTMLTextAreaElement;
      if (prevTextarea) {
        prevTextarea.focus();
        const pos = prevTextarea.value.length;
        prevTextarea.setSelectionRange(pos, pos);
        
        // Delete last character of previous page
        if (prevTextarea.value.length > 0) {
          const newContent = prevTextarea.value.slice(0, -1);
          handlePageChange(pageIndex - 1, newContent);
        }
      }
    }
  }, [pages.length, handlePageChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-2xl font-bold border-none outline-none bg-transparent"
            placeholder="Script Title"
          />
          <div className="flex items-center gap-4">
            {isSaving && (
              <span className="text-sm text-gray-500">Saving...</span>
            )}
            {!isSaving && lastSaved && (
              <span className="text-sm text-gray-500">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pages */}
      <div className="p-8">
        {pages.map((pageContent, index) => (
          <Card key={index} className="mx-auto mb-8 shadow-lg" style={{ width: '8.5in' }}>
            <div className="bg-white" style={{ minHeight: '11in', padding: '1in 1.25in' }}>
              <textarea
                id={`page-textarea-${index}`}
                value={pageContent}
                onChange={(e) => handlePageChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-full h-full resize-none border-none outline-none font-serif text-black"
                style={{
                  minHeight: `${PAGE_HEIGHT_PX}px`,
                  lineHeight: `${LINE_HEIGHT}px`,
                  fontSize: '12pt'
                }}
                placeholder={index === 0 ? "Start typing your script..." : ""}
              />
              <div className="text-center text-gray-400 text-sm mt-4">
                Page {index + 1}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}