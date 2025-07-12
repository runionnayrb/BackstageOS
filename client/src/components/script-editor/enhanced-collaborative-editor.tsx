import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Palette,
  Type,
  Download,
  Upload,
  MessageCircle,
  Users,
  Clock,
  Wand2,
  FileText,
  Plus,
  Clipboard,
  Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EnhancedCollaborativeEditorProps {
  content: any;
  onChange: (content: any) => void;
  title: string;
  onTitleChange: (title: string) => void;
  version?: string;
  collaborators?: any[];
  comments?: any[];
  onAddComment?: (comment: any) => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  isLoading?: boolean;
  className?: string;
  isSaving?: boolean;
  lastSaved?: Date;
}

export function EnhancedCollaborativeEditor({
  content,
  onChange,
  title,
  onTitleChange,
  version = "1.0",
  collaborators = [],
  comments = [],
  onAddComment,
  onExport,
  onImport,
  isLoading = false,
  className = "",
  isSaving = false,
  lastSaved
}: EnhancedCollaborativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Times, serif");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [margins, setMargins] = useState({
    top: 1,
    bottom: 1,
    left: 1.25,
    right: 1
  });
  const [pages, setPages] = useState<string[]>(['']);
  const [currentPage, setCurrentPage] = useState(0);
  const [showPageSetup, setShowPageSetup] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [pageBreakMode, setPageBreakMode] = useState<'auto' | 'manual'>('auto');
  const paginationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Page dimensions (8.5" x 11" standard)
  const pageWidth = 8.5;
  const pageHeight = 11;
  const pageWidthPx = pageWidth * 96; // 96 DPI
  const pageHeightPx = pageHeight * 96;
  
  // Calculate usable content area
  const contentWidth = pageWidthPx - (margins.left + margins.right) * 96;
  const contentHeight = pageHeightPx - (margins.top + margins.bottom) * 96;

  // Initialize content
  useEffect(() => {
    if (!isInitialized && content) {
      const contentStr = typeof content === 'string' ? content : '';
      if (contentStr.trim()) {
        // Split content into pages if it contains page breaks
        if (contentStr.includes('<!-- PAGE_BREAK -->')) {
          const pageContent = contentStr.split('<!-- PAGE_BREAK -->');
          // Clean up pages that only contain empty dialogue elements
          const cleanedPages = pageContent.map(page => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page;
            
            // Remove empty dialogue elements
            const dialogues = tempDiv.querySelectorAll('.script-dialogue');
            dialogues.forEach(dialogue => {
              if (!dialogue.textContent?.trim()) {
                dialogue.remove();
              }
            });
            
            return tempDiv.innerHTML;
          }).filter(page => page.trim() !== '');
          
          setPages(cleanedPages.length > 0 ? cleanedPages : ['']);
        } else {
          // For initial load, simply put all content on first page
          // Auto-pagination will happen through the reflow system
          setPages([contentStr]);
        }
      }
      setIsInitialized(true);
    }
  }, [content, isInitialized]);

  // Save current state to undo stack
  const saveToUndoStack = useCallback(() => {
    const currentState = JSON.stringify(pages);
    setUndoStack(prev => [...prev.slice(-19), currentState]);
    setRedoStack([]);
  }, [pages]);

  // Helper function to get all text nodes from an element
  const getTextNodes = (element: HTMLElement): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }
    return textNodes;
  };

  // Reflow content across pages for continuous text flow
  const reflowContent = useCallback((currentPages: string[], startFromPage: number = 0) => {
    if (pageBreakMode !== 'auto') return;

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: ${contentWidth}px;
      font-family: ${fontFamily};
      font-size: ${fontSize}pt;
      line-height: ${lineHeight};
      white-space: pre-wrap;
      word-wrap: break-word;
      padding: 0;
      margin: 0;
    `;
    document.body.appendChild(tempDiv);

    try {
      const newPages: string[] = [];
      let allContent = currentPages.join(' ');
      
      // Remove existing page breaks for reflowing
      allContent = allContent.replace(/<!-- PAGE_BREAK -->/g, ' ');
      
      // If content contains HTML (script elements), preserve it during reflow
      if (allContent.includes('<div') || allContent.includes('<p') || allContent.includes('<br')) {
        // For HTML content, split by dialogue and stage direction elements
        const htmlParser = new DOMParser();
        const doc = htmlParser.parseFromString(`<div>${allContent}</div>`, 'text/html');
        // Get only direct children to avoid nested div issues
        const directChildren = Array.from(doc.body.firstElementChild!.children);
        
        let currentPageContent = '';
        let currentPageLineCount = 0;
        const maxLinesPerPage = 35; // Typical script page capacity
        
        for (const element of directChildren) {
          // Only process script-related elements
          if (!element.className.includes('script-')) continue;
          
          // Skip empty dialogue elements
          const textContent = element.textContent?.trim() || '';
          if (element.className.includes('script-dialogue') && textContent === '') {
            continue;
          }
          
          const elementHTML = element.outerHTML;
          const isDialogue = element.className.includes('script-dialogue');
          const isStageDirection = element.className.includes('script-stage_direction');
          
          // Estimate lines for this element
          const estimatedLines = isStageDirection ? 1 : Math.ceil((element.textContent || '').length / 60);
          
          // Check if adding this element would exceed page capacity
          if (currentPageLineCount + estimatedLines > maxLinesPerPage && currentPageContent.trim()) {
            // Start a new page
            newPages.push(currentPageContent.trim());
            currentPageContent = elementHTML;
            currentPageLineCount = estimatedLines;
          } else {
            currentPageContent += elementHTML;
            currentPageLineCount += estimatedLines;
          }
        }
        
        // Add the last page if it has content
        if (currentPageContent.trim()) {
          newPages.push(currentPageContent.trim());
        }
      } else {
        // For plain text, split by paragraphs and sentences
        const paragraphs = allContent.split(/\n\s*\n/);
        let currentPageContent = '';
        
        for (const paragraph of paragraphs) {
          if (!paragraph.trim()) continue;
          
          // Test if adding this paragraph would exceed page height
          tempDiv.innerHTML = currentPageContent + '\n\n' + paragraph;
          const testHeight = tempDiv.offsetHeight;
          
          if (testHeight > contentHeight && currentPageContent.trim()) {
            // Start a new page
            newPages.push(currentPageContent.trim());
            currentPageContent = paragraph;
          } else {
            currentPageContent += (currentPageContent ? '\n\n' : '') + paragraph;
          }
        }
        
        // Add the last page if it has content
        if (currentPageContent.trim()) {
          newPages.push(currentPageContent.trim());
        }
      }
      
      // Ensure we have at least one page
      if (newPages.length === 0) {
        newPages.push('');
      }
      
      setPages(newPages);
      
      // Update parent component
      const combinedContent = newPages.join('<!-- PAGE_BREAK -->');
      onChange(combinedContent);
      
    } finally {
      document.body.removeChild(tempDiv);
    }
  }, [contentWidth, contentHeight, fontFamily, fontSize, lineHeight, pageBreakMode, onChange]);

  // Auto-pagination function
  const autoPaginate = useCallback((content: string) => {
    if (!content || content.length < 1000) return [content]; // Don't paginate short content
    
    console.log('Auto-paginating content...');
    
    // Create a temporary element to measure actual content height
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = `${contentWidth}px`;
    tempDiv.style.fontFamily = fontFamily;
    tempDiv.style.fontSize = `${fontSize}pt`;
    tempDiv.style.lineHeight = `${lineHeight}`;
    tempDiv.style.padding = '0';
    tempDiv.style.margin = '0';
    document.body.appendChild(tempDiv);
    
    const newPages: string[] = [];
    
    try {
      // Parse the content to work with individual elements
      tempDiv.innerHTML = content;
      const allElements = Array.from(tempDiv.children);
      
      let currentPageElements: Element[] = [];
      let currentPageHeight = 0;
      const maxPageHeight = contentHeight; // Use actual content height in pixels
      
      for (const element of allElements) {
        // Measure the height of this element
        const elementClone = element.cloneNode(true) as HTMLElement;
        tempDiv.innerHTML = '';
        tempDiv.appendChild(elementClone);
        const elementHeight = tempDiv.offsetHeight;
        
        // Check if adding this element would exceed page height
        if (currentPageHeight + elementHeight > maxPageHeight && currentPageElements.length > 0) {
          // Save current page
          const pageHtml = currentPageElements.map(el => el.outerHTML).join('');
          newPages.push(pageHtml);
          console.log(`Page ${newPages.length}: ${currentPageElements.length} elements, height: ${currentPageHeight}px (max: ${maxPageHeight}px)`);
          
          // Start new page
          currentPageElements = [element];
          currentPageHeight = elementHeight;
        } else {
          // Add to current page
          currentPageElements.push(element);
          currentPageHeight += elementHeight;
        }
      }
      
      // Add the last page if it has content
      if (currentPageElements.length > 0) {
        const pageHtml = currentPageElements.map(el => el.outerHTML).join('');
        newPages.push(pageHtml);
        console.log(`Page ${newPages.length}: ${currentPageElements.length} elements, height: ${currentPageHeight}px`);
      }
      
    } finally {
      document.body.removeChild(tempDiv);
    }
    
    console.log(`Created ${newPages.length} pages from ${content.length} characters`);
    return newPages.length > 1 ? newPages : [content];
  }, [contentWidth, contentHeight, fontFamily, fontSize, lineHeight]);

  // Auto-pagination when content changes and in auto mode
  useEffect(() => {
    if (isInitialized && pageBreakMode === 'auto' && pages.length > 0) {
      // Check for uneven page distribution
      let needsRepagination = false;
      
      // Check if any page is significantly longer than others or too long overall
      const pageLengths = pages.map(page => page.length);
      const maxLength = Math.max(...pageLengths);
      const avgLength = pageLengths.reduce((a, b) => a + b, 0) / pageLengths.length;
      
      // Repaginate if any page is too long or if there's significant size imbalance
      if (maxLength > 3500 || (maxLength > avgLength * 1.8 && pages.length > 1)) {
        needsRepagination = true;
      }
      
      if (needsRepagination) {
        // Combine all pages and re-paginate
        const allContent = pages.join('<!-- PAGE_BREAK -->').replace(/<!-- PAGE_BREAK -->/g, '');
        const paginatedPages = autoPaginate(allContent);
        
        if (paginatedPages.length !== pages.length || JSON.stringify(paginatedPages) !== JSON.stringify(pages)) {
          setPages(paginatedPages);
          // Update parent component
          const combinedContent = paginatedPages.join('<!-- PAGE_BREAK -->');
          onChange(combinedContent);
        }
      }
    }
  }, [isInitialized, pageBreakMode, pages, autoPaginate, onChange]);

  // Set initial content in the page elements
  useEffect(() => {
    pages.forEach((pageContent, index) => {
      const pageEl = document.getElementById(`page-${index}`);
      if (pageEl && !pageEl.textContent) {
        pageEl.innerHTML = pageContent;
      }
    });
  }, [pages]);

  // Handle text input and content changes
  const handleInput = useCallback((pageIndex: number, event: React.FormEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const newContent = target.innerHTML || '';
    
    // Update pages state
    const newPages = [...pages];
    newPages[pageIndex] = newContent;
    setPages(newPages);
    
    // Update parent component immediately
    const combinedContent = newPages.join('<!-- PAGE_BREAK -->');
    onChange(combinedContent);
    
    // Check if auto-pagination is needed after content change
    if (pageBreakMode === 'auto') {
      const pageElement = target;
      const pageHeight = pageElement.scrollHeight;
      
      // Only trigger pagination if significantly over the limit
      if (pageHeight > contentHeight * 1.15) {
        // Debounce pagination to avoid disrupting typing
        if (paginationTimeoutRef.current) {
          clearTimeout(paginationTimeoutRef.current);
        }
        
        paginationTimeoutRef.current = setTimeout(() => {
          // Get current pages state at time of timeout
          const currentPages = [...pages];
          currentPages[pageIndex] = document.getElementById(`page-${pageIndex}`)?.innerHTML || '';
          
          // Check height again after debounce
          const currentPageEl = document.getElementById(`page-${pageIndex}`);
          if (currentPageEl && currentPageEl.scrollHeight > contentHeight * 1.15) {
            // Get all content from current page onward
            const allContentFromCurrentPage = currentPages.slice(pageIndex).join(' ');
            
            // Re-paginate from current page onward
            const paginatedPages = autoPaginate(allContentFromCurrentPage);
            
            if (paginatedPages.length > 1) {
              // Keep pages before current page unchanged
              const updatedPages = [...currentPages.slice(0, pageIndex), ...paginatedPages];
              
              setPages(updatedPages);
              // Update parent component
              const updatedContent = updatedPages.join('<!-- PAGE_BREAK -->');
              onChange(updatedContent);
            }
          }
        }, 1000); // Wait 1 second after user stops typing
      }
    }
  }, [pages, pageBreakMode, onChange, autoPaginate, contentHeight]);

  // Handle paste events
  const handlePaste = useCallback((e: React.ClipboardEvent, pageIndex: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Get current cursor position
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Insert pasted text at cursor position
    const textNode = document.createTextNode(pastedText);
    range.deleteContents();
    range.insertNode(textNode);
    
    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Update page content - trigger a synthetic input event
    const pageElement = document.getElementById(`page-${pageIndex}`);
    if (pageElement) {
      const syntheticEvent = {
        target: pageElement,
        currentTarget: pageElement,
        preventDefault: () => {},
        stopPropagation: () => {}
      } as React.FormEvent<HTMLDivElement>;
      
      handleInput(pageIndex, syntheticEvent);
    }
  }, [handleInput]);

  // Get cursor position in element
  const getCursorPosition = (element: HTMLElement): number => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.endContainer, range.endOffset);
    
    return preRange.toString().length;
  };

  // Handle key events for navigation between pages
  const handleKeyDown = useCallback((e: React.KeyboardEvent, pageIndex: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const pageElement = document.getElementById(`page-${pageIndex}`);
    if (!pageElement) return;
    
    // Better detection of cursor position at start
    let isAtStart = false;
    if (range.startOffset === 0) {
      const container = range.startContainer;
      // Check if we're at the very beginning of the page
      if (container === pageElement || 
          container === pageElement.firstChild ||
          (container.nodeType === Node.TEXT_NODE && container.parentNode === pageElement.firstChild)) {
        // Get the cursor position within the page
        const cursorPos = getCursorPosition(pageElement);
        isAtStart = cursorPos === 0;
      }
    }
    
    // Check if cursor is at the end of the page
    const textContent = pageElement.textContent || '';
    const cursorPos = getCursorPosition(pageElement);
    const isAtEnd = cursorPos >= textContent.length - 1; // -1 for better detection
    
    // Handle backspace at beginning of page
    if (e.key === 'Backspace' && isAtStart && pageIndex > 0) {
      console.log('Backspace at beginning of page', pageIndex);
      e.preventDefault();
      
      // Move to end of previous page
      const prevPageElement = document.getElementById(`page-${pageIndex - 1}`);
      if (prevPageElement) {
        prevPageElement.focus();
        
        // Place cursor at the very end of the previous page
        const range = document.createRange();
        const sel = window.getSelection();
        
        // Find the last text node in the previous page
        const walker = document.createTreeWalker(
          prevPageElement,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let lastTextNode = null;
        let node;
        while (node = walker.nextNode()) {
          lastTextNode = node;
        }
        
        if (lastTextNode) {
          range.setStart(lastTextNode, lastTextNode.textContent?.length || 0);
          range.setEnd(lastTextNode, lastTextNode.textContent?.length || 0);
        } else {
          range.selectNodeContents(prevPageElement);
          range.collapse(false);
        }
        
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    
    // Handle Enter key at end of page
    if (e.key === 'Enter' && pageBreakMode === 'auto') {
      // Check if we're really at the end of the page
      const pageHeight = pageElement.offsetHeight;
      if (pageHeight >= contentHeight * 0.95 && pageIndex < pages.length - 1) {
        // Let the enter key work normally - auto-pagination will handle overflow
        // The handleInput function will detect overflow and move content to next page
      }
    }
    
    // Handle arrow key navigation between pages
    if (e.key === 'ArrowUp' && isAtStart && pageIndex > 0) {
      e.preventDefault();
      const prevPageElement = document.getElementById(`page-${pageIndex - 1}`);
      if (prevPageElement) {
        prevPageElement.focus();
        const newRange = document.createRange();
        newRange.selectNodeContents(prevPageElement);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    if (e.key === 'ArrowDown' && isAtEnd && pageIndex < pages.length - 1) {
      e.preventDefault();
      const nextPageElement = document.getElementById(`page-${pageIndex + 1}`);
      if (nextPageElement) {
        nextPageElement.focus();
        const newRange = document.createRange();
        newRange.selectNodeContents(nextPageElement);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    // Handle right arrow at end of page
    if (e.key === 'ArrowRight' && isAtEnd && pageIndex < pages.length - 1) {
      e.preventDefault();
      const nextPageElement = document.getElementById(`page-${pageIndex + 1}`);
      if (nextPageElement) {
        nextPageElement.focus();
        const newRange = document.createRange();
        if (nextPageElement.firstChild) {
          newRange.setStart(nextPageElement.firstChild, 0);
          newRange.setEnd(nextPageElement.firstChild, 0);
        } else {
          newRange.selectNodeContents(nextPageElement);
          newRange.collapse(true);
        }
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    
    // Handle left arrow at beginning of page
    if (e.key === 'ArrowLeft' && isAtStart && pageIndex > 0) {
      e.preventDefault();
      const prevPageElement = document.getElementById(`page-${pageIndex - 1}`);
      if (prevPageElement) {
        prevPageElement.focus();
        const newRange = document.createRange();
        newRange.selectNodeContents(prevPageElement);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  }, [pages, onChange, pageBreakMode, contentHeight]);

  // Format text selection
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    saveToUndoStack();
  }, [saveToUndoStack]);

  // Handle undo/redo
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      const currentState = JSON.stringify(pages);
      
      setRedoStack(prev => [...prev, currentState]);
      setPages(JSON.parse(previousState));
      setUndoStack(prev => prev.slice(0, -1));
    }
  }, [undoStack, pages]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      const currentState = JSON.stringify(pages);
      
      setUndoStack(prev => [...prev, currentState]);
      setPages(JSON.parse(nextState));
      setRedoStack(prev => prev.slice(0, -1));
    }
  }, [redoStack, pages]);

  // Handle file import
  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
  }, [onImport]);

  // Add/remove pages
  const addPage = useCallback(() => {
    setPages(prev => [...prev, '']);
  }, []);

  const removePage = useCallback((pageIndex: number) => {
    if (pages.length > 1) {
      setPages(prev => prev.filter((_, index) => index !== pageIndex));
    }
  }, [pages.length]);

  // Auto-format script text
  const parseScriptText = useCallback((text: string) => {
    // Basic script parsing - can be enhanced based on needs
    const lines = text.split('\n');
    const formattedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        formattedLines.push('');
        continue;
      }

      // Character names (all caps, often centered)
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 1 && trimmed.length < 50) {
        formattedLines.push(`<div class="script-character">${trimmed}</div>`);
      }
      // Stage directions (often in parentheses or brackets)
      else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        formattedLines.push(`<div class="script-stage-direction">${trimmed}</div>`);
      }
      // Scene headings (often start with INT./EXT. or SCENE)
      else if (trimmed.toUpperCase().startsWith('INT.') || trimmed.toUpperCase().startsWith('EXT.') || trimmed.toUpperCase().startsWith('SCENE')) {
        formattedLines.push(`<div class="script-scene-heading">${trimmed}</div>`);
      }
      // Regular dialogue
      else {
        formattedLines.push(`<div class="script-dialogue">${trimmed}</div>`);
      }
    }

    return formattedLines.join('');
  }, []);

  return (
    <div className={`border rounded-lg bg-white dark:bg-gray-900 ${className}`}>
      {/* Title Bar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex-1 mr-4">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Script Title"
            className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Version {version}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {pages.length} page{pages.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {isSaving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "All changes are auto-saved"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Collaborators */}
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {collaborators.length + 1}
            </span>
          </div>
          
          {/* Action buttons */}
          <Button variant="outline" size="sm" onClick={onExport} title="Export PDF">
            <Download className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Import Script">
            <Upload className="h-4 w-4" />
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx"
            onChange={handleFileImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-1 p-3 border-b bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-1">
          {/* Page Setup */}
          <Dialog open={showPageSetup} onOpenChange={setShowPageSetup}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Page Setup"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Page Setup</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Page Break Mode */}
                <div className="space-y-2">
                  <Label>Page Break Mode</Label>
                  <Select value={pageBreakMode} onValueChange={(value: 'auto' | 'manual') => setPageBreakMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Google Docs style)</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Margins */}
                <div className="space-y-2">
                  <Label>Margins (inches)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Top</Label>
                      <input
                        type="number"
                        min="0.5"
                        max="3"
                        step="0.25"
                        value={margins.top}
                        onChange={(e) => setMargins(prev => ({ ...prev, top: parseFloat(e.target.value) }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Bottom</Label>
                      <input
                        type="number"
                        min="0.5"
                        max="3"
                        step="0.25"
                        value={margins.bottom}
                        onChange={(e) => setMargins(prev => ({ ...prev, bottom: parseFloat(e.target.value) }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Left</Label>
                      <input
                        type="number"
                        min="0.5"
                        max="3"
                        step="0.25"
                        value={margins.left}
                        onChange={(e) => setMargins(prev => ({ ...prev, left: parseFloat(e.target.value) }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Right</Label>
                      <input
                        type="number"
                        min="0.5"
                        max="3"
                        step="0.25"
                        value={margins.right}
                        onChange={(e) => setMargins(prev => ({ ...prev, right: parseFloat(e.target.value) }))}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                  <Label>Line Height</Label>
                  <Select value={lineHeight.toString()} onValueChange={(value) => setLineHeight(parseFloat(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.0">Single</SelectItem>
                      <SelectItem value="1.15">1.15</SelectItem>
                      <SelectItem value="1.5">1.5</SelectItem>
                      <SelectItem value="2.0">Double</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowPageSetup(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="h-8 w-8 p-0"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="h-8 w-8 p-0"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Text formatting */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('bold')}
            className="h-8 w-8 p-0"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('italic')}
            className="h-8 w-8 p-0"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('underline')}
            className="h-8 w-8 p-0"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Font family */}
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Times, serif">Times</SelectItem>
              <SelectItem value="Courier, monospace">Courier</SelectItem>
              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
              <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
              <SelectItem value="Georgia, serif">Georgia</SelectItem>
            </SelectContent>
          </Select>

          {/* Font size */}
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="11">11</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="16">16</SelectItem>
              <SelectItem value="18">18</SelectItem>
            </SelectContent>
          </Select>

          {/* Auto-format script */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const allContent = pages.join('\n\n');
              const formattedContent = parseScriptText(allContent);
              setPages([formattedContent]);
              saveToUndoStack();
            }}
            className="h-8 w-8 p-0"
            title="Auto-format script"
          >
            <Wand2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addPage}
            className="h-8 text-sm px-3"
            title="Add Page"
          >
            <Plus className="h-4 w-4 mr-1" />
            Page
          </Button>
          {pageBreakMode === 'auto' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Reformat pagination for clean script layout
                const allContent = pages.join('<!-- PAGE_BREAK -->').replace(/<!-- PAGE_BREAK -->/g, '');
                const paginatedPages = autoPaginate(allContent);
                if (paginatedPages.length > 0) {
                  setPages(paginatedPages);
                  const combinedContent = paginatedPages.join('<!-- PAGE_BREAK -->');
                  onChange(combinedContent);
                }
              }}
              className="h-8 text-sm px-3"
              title="Reformat pagination for printing"
            >
              Reformat
            </Button>
          )}
          <Badge variant="secondary" className="text-xs">
            {pageBreakMode === 'auto' ? 'Auto Flow' : 'Manual Pages'}
          </Badge>
        </div>
      </div>

      {/* Editor Container */}
      <div className="bg-gray-100 dark:bg-gray-800 p-6 min-h-[600px]">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Pages */}
          {pages.map((pageContent, pageIndex) => (
            <div
              key={pageIndex}
              className="bg-white shadow-lg mx-auto relative"
              style={{
                width: `${pageWidth}in`,
                height: `${pageHeight}in`,
                padding: `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`,
                fontFamily: fontFamily,
                fontSize: `${fontSize}pt`,
                lineHeight: lineHeight,
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              {/* Page number */}
              <div className="absolute top-2 right-4 text-xs text-gray-500">
                {pageIndex + 1}
              </div>

              {/* Page content */}
              <div
                id={`page-${pageIndex}`}
                contentEditable
                onInput={(e) => handleInput(pageIndex, e)}
                onPaste={(e) => handlePaste(e, pageIndex)}
                onKeyDown={(e) => handleKeyDown(e, pageIndex)}
                className="focus:outline-none"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  height: `${contentHeight}px`,
                  maxHeight: `${contentHeight}px`,
                  overflow: 'hidden'
                }}
                suppressContentEditableWarning={true}
              />

              {/* Remove page button for manual mode */}
              {pageBreakMode === 'manual' && pages.length > 1 && (
                <button
                  onClick={() => removePage(pageIndex)}
                  className="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 opacity-70 hover:opacity-100"
                  title="Remove page"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Script-specific styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .script-character {
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            margin: 1em 0 0.5em 0;
            display: block;
          }
          
          .script-dialogue {
            margin: 0.5em 0;
            text-align: left;
            display: block;
          }
          
          .script-stage-direction {
            font-style: italic;
            margin: 0.5em 2em;
            text-align: left;
            display: block;
          }
          
          .script-scene-heading {
            font-weight: bold;
            text-transform: uppercase;
            text-align: left;
            margin: 2em 0 1em 0;
            display: block;
          }
          
          @media print {
            .bg-gray-100 { background: white !important; }
            .shadow-lg { box-shadow: none !important; }
          }
        `
      }} />
    </div>
  );
}