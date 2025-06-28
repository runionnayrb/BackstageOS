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
  Save,
  Wand2,
  FileText,
  Plus,
  Clipboard
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface CollaborativeEditorProps {
  content: any;
  onChange: (content: any) => void;
  title: string;
  onTitleChange: (title: string) => void;
  collaborators?: any[];
  comments?: any[];
  onAddComment?: (comment: any) => void;
  onSave?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  isLoading?: boolean;
  className?: string;
}

export function CollaborativeEditor({
  content,
  onChange,
  title,
  onTitleChange,
  collaborators = [],
  comments = [],
  onAddComment,
  onSave,
  onExport,
  onImport,
  isLoading = false,
  className = ""
}: CollaborativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const [fontSize, setFontSize] = useState("14");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [margins, setMargins] = useState({
    top: 1,
    bottom: 1,
    left: 1,
    right: 1
  });
  const [pageCount, setPageCount] = useState(1);
  const [pageNumbers, setPageNumbers] = useState<string[]>(['1']);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedPageCount, setPublishedPageCount] = useState(1);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showFooters, setShowFooters] = useState(true);
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [showPageSetup, setShowPageSetup] = useState(false);
  const [pageNumberPosition, setPageNumberPosition] = useState<'header' | 'footer' | 'both'>('header');
  const [pageNumberAlignment, setPageNumberAlignment] = useState<'left' | 'center' | 'right'>('right');
  const [pageNumberFormat, setPageNumberFormat] = useState<'number' | 'page-x' | 'page-x-of-y'>('number');
  const [pageNumberPrefix, setPageNumberPrefix] = useState('');
  const [pageNumberSuffix, setPageNumberSuffix] = useState('');
  const [hasContentChanges, setHasContentChanges] = useState(false);
  const [initialContent, setInitialContent] = useState('');

  // Track content changes
  const handleContentChange = useCallback((newContent: string) => {
    onChange(newContent);
    setHasContentChanges(newContent !== initialContent);
  }, [onChange, initialContent]);

  // Format text selection
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      saveToUndoStack();
      handleContentChange(newContent);
    }
  }, [handleContentChange]);

  // Save current state to undo stack
  const saveToUndoStack = useCallback(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      setUndoStack(prev => [...prev.slice(-19), currentContent]);
      setRedoStack([]);
    }
  }, []);

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousContent = undoStack[undoStack.length - 1];
      const currentContent = editorRef.current?.innerHTML;
      
      if (currentContent) {
        setRedoStack(prev => [...prev, currentContent]);
      }
      
      if (editorRef.current) {
        editorRef.current.innerHTML = previousContent;
        onChange(previousContent);
      }
      
      setUndoStack(prev => prev.slice(0, -1));
    }
  }, [undoStack, onChange]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextContent = redoStack[redoStack.length - 1];
      saveToUndoStack();
      
      if (editorRef.current) {
        editorRef.current.innerHTML = nextContent;
        onChange(nextContent);
      }
      
      setRedoStack(prev => prev.slice(0, -1));
    }
  }, [redoStack, onChange, saveToUndoStack]);

  // Handle text selection for comments
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setCommentPosition({ x: rect.right + 10, y: rect.top });
    }
  }, []);



  // Save and restore cursor position
  const saveCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0);
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(editorRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      return preSelectionRange.toString().length;
    }
    return 0;
  }, []);

  const restoreCursorPosition = useCallback((savedPosition: number) => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    let currentPosition = 0;
    for (const textNode of textNodes) {
      const textLength = textNode.textContent?.length || 0;
      if (currentPosition + textLength >= savedPosition) {
        const range = document.createRange();
        range.setStart(textNode, savedPosition - currentPosition);
        range.setEnd(textNode, savedPosition - currentPosition);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
      }
      currentPosition += textLength;
    }
  }, []);

  // Initialize content when prop changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content || '';
      // Trigger content distribution after content is set
      setTimeout(() => distributeContentAcrossPages(), 100);
    }
  }, [content]);

  // Generate smart page numbers with letter suffixes for new pages
  const generatePageNumbers = useCallback((newPageCount: number) => {
    if (!isPublished) {
      // Before publishing, use simple numbering
      return Array.from({ length: newPageCount }, (_, i) => (i + 1).toString());
    }

    // After publishing, handle insertions with letter suffixes
    const numbers: string[] = [];
    
    if (newPageCount <= publishedPageCount) {
      // No new pages, use existing numbering
      for (let i = 1; i <= newPageCount; i++) {
        numbers.push(i.toString());
      }
    } else {
      // New pages added, use letter suffixes
      const newPagesCount = newPageCount - publishedPageCount;
      
      // Add original published pages
      for (let i = 1; i <= publishedPageCount; i++) {
        numbers.push(i.toString());
      }
      
      // Add new pages with letter suffixes after the last published page
      const lastPage = publishedPageCount;
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      for (let i = 0; i < newPagesCount; i++) {
        const letterIndex = i % letters.length;
        const letter = letters[letterIndex];
        numbers.push(`${lastPage}${letter}`);
      }
    }
    
    return numbers;
  }, [isPublished, publishedPageCount]);

  // Function to format page numbers based on settings
  const formatPageNumber = useCallback((pageNum: string, currentIndex: number, totalPages: number) => {
    let formatted = '';
    
    if (pageNumberPrefix) {
      formatted += pageNumberPrefix + ' ';
    }
    
    switch (pageNumberFormat) {
      case 'number':
        formatted += pageNum;
        break;
      case 'page-x':
        formatted += `Page ${pageNum}`;
        break;
      case 'page-x-of-y':
        formatted += `Page ${pageNum} of ${totalPages}`;
        break;
    }
    
    if (pageNumberSuffix) {
      formatted += ' ' + pageNumberSuffix;
    }
    
    return formatted;
  }, [pageNumberFormat, pageNumberPrefix, pageNumberSuffix]);

  // Function to renumber all pages with fresh numbering
  const renumberScript = useCallback(() => {
    const freshNumbers = Array.from({ length: pageCount }, (_, i) => (i + 1).toString());
    setPageNumbers(freshNumbers);
    setPublishedPageCount(pageCount);
    setIsPublished(true);
    setHasContentChanges(false); // Reset after publishing
  }, [pageCount]);
  
  // Check if renumber should be enabled (new pages added beyond published count)
  const shouldEnableRenumber = useCallback(() => {
    return isPublished && pageCount > publishedPageCount;
  }, [isPublished, pageCount, publishedPageCount]);

  // Function to publish script
  const publishScript = useCallback(() => {
    setIsPublished(true);
    setPublishedPageCount(pageCount);
    setHasContentChanges(false);
    setInitialContent(editorRef.current?.innerHTML || '');
  }, [pageCount]);



  // Function to distribute content across pages
  const distributeContentAcrossPages = useCallback(() => {
    if (!editorRef.current) return;

    const page1 = editorRef.current;
    const allText = page1.innerText || '';
    
    // If no content, show only one page
    if (!allText.trim()) {
      setPageCount(1);
      setPageNumbers(['1']);
      return;
    }

    // Check if page 1 is overflowing
    const page1Height = page1.scrollHeight;
    const page1MaxHeight = page1.clientHeight;

    if (page1Height > page1MaxHeight) {
      const lines = allText.split('\n');
      
      // Estimate how many lines fit per page (rough calculation)
      const lineHeight = 18; // 12pt * 1.5 line height ≈ 18px
      const pageContentHeight = page1MaxHeight - 32; // Account for padding
      const linesPerPage = Math.floor(pageContentHeight / lineHeight);
      
      // Calculate how many pages we need
      const totalPages = Math.ceil(lines.length / linesPerPage);
      const newPageCount = Math.min(totalPages, 10); // Cap at 10 pages for performance
      
      setPageCount(newPageCount);
      setPageNumbers(generatePageNumbers(newPageCount));
      
      // Distribute content to additional pages
      for (let pageNum = 2; pageNum <= newPageCount; pageNum++) {
        const pageContainer = document.getElementById(`page-${pageNum}-content`);
        if (pageContainer) {
          const startLine = (pageNum - 1) * linesPerPage;
          const endLine = pageNum * linesPerPage;
          const pageLines = lines.slice(startLine, endLine);
          pageContainer.innerHTML = pageLines.join('\n');
        }
      }
    } else {
      // Content fits on one page
      setPageCount(1);
      setPageNumbers(['1']);
    }
  }, [generatePageNumbers]);

  // Handle input events specifically to preserve cursor position
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
      // Distribute content across pages after a short delay
      setTimeout(() => distributeContentAcrossPages(), 50);
    }
  }, [onChange, distributeContentAcrossPages]);

  // Parse and format script text automatically
  const parseScriptText = useCallback((text: string) => {
    // Remove page numbers and headers/footers
    let cleanText = text
      // Remove page numbers (various formats)
      .replace(/^\s*\d+\s*$/gm, '')
      .replace(/^\s*Page\s+\d+\s*$/gmi, '')
      .replace(/^\s*-\s*\d+\s*-\s*$/gm, '')
      .replace(/^\s*Pg\.\s*\d+\s*$/gmi, '')
      // Remove author headers with page numbers (like "LORRAINE HANSBERRY Pg. 1")
      .replace(/^[A-Z\s]+Pg\.\s*\d+\s*$/gmi, '')
      // Remove spaced-out title headers (like "A R A I S I N I N T H E S U N")
      .replace(/^[A-Z](\s+[A-Z])+(\s+[A-Z])*\s*$/gm, '')
      // Remove author names that are spaced out (like "L O R R A I N E H A N S B E R R Y")
      .replace(/^[A-Z](\s+[A-Z])+(\s+[A-Z])*(\s+Pg\.\s*\d+)?\s*$/gm, '')
      // Remove common headers/footers
      .replace(/^\s*CONTINUED:\s*$/gmi, '')
      .replace(/^\s*\(CONTINUED\)\s*$/gmi, '')
      .replace(/^\s*MORE\s*$/gmi, '')
      .replace(/^\s*\(MORE\)\s*$/gmi, '')
      .replace(/^\s*CONT'D:\s*$/gmi, '')
      .replace(/^\s*\(CONT'D\)\s*$/gmi, '')
      // Remove excessive whitespace but preserve intentional line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    // Split into lines for processing
    const lines = cleanText.split('\n');
    const formattedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        formattedLines.push('');
        continue;
      }

      // Play titles and scene headings
      if (/^(ACT\s+[IVX\d]+|SCENE\s+[IVX\d]+|PROLOGUE|EPILOGUE)/.test(line.toUpperCase()) ||
          /^(SETTING:|PLACE:|TIME:|AT\s+RISE:|LIGHTS\s+UP:|BLACKOUT)/.test(line.toUpperCase()) ||
          // Play titles (all caps, longer than 10 characters, often centered)
          (line === line.toUpperCase() && line.length > 10 && /^[A-Z\s]+$/.test(line) && 
           !line.includes('(') && !line.includes(')') && !line.includes('.') &&
           !/^(BY\s|THE\s|AND\s|OR\s|OF\s|IN\s|ON\s|AT\s|TO\s|FOR\s|WITH\s|FROM\s)/.test(line))) {
        formattedLines.push(`<div class="script-scene_heading">${line.toUpperCase()}</div>`);
      }
      // Author names and bylines
      else if (/^(BY\s|WRITTEN\s+BY|AUTHOR:|PLAYWRIGHT:)/i.test(line) || 
               /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(line.trim())) {
        formattedLines.push(`<div class="script-author">${line}</div>`);
      }
      // Character names (short, all caps, standalone lines)
      else if (line === line.toUpperCase() && 
               line.length > 1 && 
               line.length < 30 && 
               /^[A-Z\s\(\)\']+$/.test(line) &&
               !line.includes('.') && !line.includes(',') &&
               !/^(LIGHTS|SOUND|MUSIC|END|CURTAIN|BLACKOUT|THE|AND|OR|OF|IN|ON|AT|TO|FOR|WITH|FROM)/.test(line) &&
               // Must be a standalone short line, not part of a sentence
               i > 0 && (i === lines.length - 1 || !lines[i + 1] || lines[i + 1].trim() === '')) {
        formattedLines.push(`<div class="script-character">${line}</div>`);
      }
      // Stage directions (parentheses, brackets, or theater-specific actions)
      else if ((line.startsWith('(') && line.endsWith(')')) ||
               (line.startsWith('[') && line.endsWith(']')) ||
               /^(LIGHTS|SOUND|MUSIC|SFX|ENTER|ENTERS|EXIT|EXITS|EXEUNT)/.test(line.toUpperCase()) ||
               line.toLowerCase().includes('crosses to') ||
               line.toLowerCase().includes('moves to') ||
               line.toLowerCase().includes('turns to') ||
               line.toLowerCase().includes('looks at') ||
               /\b(upstage|downstage|stage left|stage right|center stage|offstage)\b/i.test(line)) {
        formattedLines.push(`<div class="script-stage_direction">${line}</div>`);
      }
      // Song/music cues for musicals
      else if (line.startsWith('♪') || line.startsWith('♫') ||
               /^(SONG:|MUSIC:|MUSICAL\s+NUMBER:)/i.test(line) ||
               (line.includes('♪') || line.includes('♫'))) {
        formattedLines.push(`<div class="script-song">${line}</div>`);
      }
      // Everything else is dialogue
      else {
        formattedLines.push(`<div class="script-dialogue">${line}</div>`);
      }
    }

    return formattedLines.join('\n');
  }, []);

  // Handle file import
  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
  }, [onImport]);

  // Handle paste events to auto-format script text
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    if (pastedText.length > 100) { // Only auto-format large text blocks
      const formattedText = parseScriptText(pastedText);
      
      if (editorRef.current) {
        // Save current state for undo
        saveToUndoStack();
        
        // Simply replace the entire content to avoid cursor issues
        editorRef.current.innerHTML = formattedText;
        
        // Place cursor at the end
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        handleContentChange(editorRef.current?.innerHTML || '');
      }
    } else {
      // For small text, just paste normally
      document.execCommand('insertText', false, pastedText);
      handleContentChange(editorRef.current?.innerHTML || '');
    }
  }, [parseScriptText, saveToUndoStack, handleContentChange]);

  // Apply script-specific formatting
  const applyScriptFormatting = useCallback((type: 'character' | 'dialogue' | 'stage_direction' | 'scene_heading') => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const formatStyles = {
      character: { fontWeight: 'bold', textTransform: 'uppercase', marginLeft: '3rem' },
      dialogue: { marginLeft: '1rem', marginRight: '1rem' },
      stage_direction: { fontStyle: 'italic', marginLeft: '1.5rem', marginRight: '1.5rem' },
      scene_heading: { fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline' }
    };

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = `script-${type}`;
    
    const styles = formatStyles[type];
    Object.assign(span.style, styles);
    
    try {
      range.surroundContents(span);
      saveToUndoStack();
      handleContentChange(editorRef.current?.innerHTML || '');
    } catch (e) {
      // Handle complex selections
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      saveToUndoStack();
      handleContentChange(editorRef.current?.innerHTML || '');
    }
  }, [saveToUndoStack, handleContentChange]);

  // Initialize editor content only once to avoid cursor issues
  useEffect(() => {
    if (editorRef.current && content && typeof content === 'string' && editorRef.current.innerHTML.trim() === '') {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

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
        </div>
        <div className="flex items-center gap-2">
          {/* Collaborators */}
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {collaborators.length + 1}
            </span>
          </div>
          
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-500">Saved</span>
          </div>
          
          {/* Action buttons */}
          <Button variant="outline" size="sm" onClick={onSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import Script
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
      <div className="flex items-center justify-between gap-1 p-3 border-b bg-gray-50 dark:bg-gray-800 flex-wrap">
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
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Page Setup</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4 pr-2">
              {/* Page Margins */}
              <div className="space-y-4">
                <h3 className="font-medium">Margins (inches)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="margin-top">Top</Label>
                    <input
                      id="margin-top"
                      type="number"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={margins.top}
                      onChange={(e) => setMargins(prev => ({ ...prev, top: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-1 border rounded text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margin-bottom">Bottom</Label>
                    <input
                      id="margin-bottom"
                      type="number"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={margins.bottom}
                      onChange={(e) => setMargins(prev => ({ ...prev, bottom: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-1 border rounded text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margin-left">Left</Label>
                    <input
                      id="margin-left"
                      type="number"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={margins.left}
                      onChange={(e) => setMargins(prev => ({ ...prev, left: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-1 border rounded text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margin-right">Right</Label>
                    <input
                      id="margin-right"
                      type="number"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={margins.right}
                      onChange={(e) => setMargins(prev => ({ ...prev, right: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Headers & Footers */}
              <div className="space-y-4">
                <h3 className="font-medium">Headers & Footers</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="modal-show-headers"
                      checked={showHeaders}
                      onChange={(e) => setShowHeaders(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="modal-show-headers">Show headers</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-header-text">Header text</Label>
                    <input 
                      id="modal-header-text"
                      type="text"
                      placeholder="Enter header text (e.g., script title)"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="w-full px-3 py-1 border rounded text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="modal-show-footers"
                      checked={showFooters}
                      onChange={(e) => setShowFooters(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="modal-show-footers">Show footers</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-footer-text">Footer text</Label>
                    <input 
                      id="modal-footer-text"
                      type="text"
                      placeholder="Enter footer text (e.g., production info)"
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="w-full px-3 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Page Numbering */}
              <div className="space-y-4">
                <h3 className="font-medium">Page Numbering</h3>
                <div className="space-y-4">
                  {/* Position */}
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <select 
                      value={pageNumberPosition}
                      onChange={(e) => setPageNumberPosition(e.target.value as any)}
                      className="w-full px-3 py-1 border rounded text-sm"
                    >
                      <option value="header">Header only</option>
                      <option value="footer">Footer only</option>
                      <option value="both">Both header and footer</option>
                    </select>
                  </div>

                  {/* Alignment */}
                  <div className="space-y-2">
                    <Label>Alignment</Label>
                    <select 
                      value={pageNumberAlignment}
                      onChange={(e) => setPageNumberAlignment(e.target.value as any)}
                      className="w-full px-3 py-1 border rounded text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>

                  {/* Format */}
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <select 
                      value={pageNumberFormat}
                      onChange={(e) => setPageNumberFormat(e.target.value as any)}
                      className="w-full px-3 py-1 border rounded text-sm"
                    >
                      <option value="number">1, 2, 3...</option>
                      <option value="page-x">Page 1, Page 2...</option>
                      <option value="page-x-of-y">Page 1 of 5, Page 2 of 5...</option>
                    </select>
                  </div>

                  {/* Prefix and Suffix */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="page-prefix">Prefix</Label>
                      <input 
                        id="page-prefix"
                        type="text"
                        placeholder="e.g. Draft"
                        value={pageNumberPrefix}
                        onChange={(e) => setPageNumberPrefix(e.target.value)}
                        className="w-full px-3 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page-suffix">Suffix</Label>
                      <input 
                        id="page-suffix"
                        type="text"
                        placeholder="e.g. Rev 1"
                        value={pageNumberSuffix}
                        onChange={(e) => setPageNumberSuffix(e.target.value)}
                        className="w-full px-3 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <Label className="text-xs text-gray-600">Preview:</Label>
                    <div className="mt-1 font-mono">
                      {formatPageNumber(pageNumbers[0] || '1', 0, pageCount)}
                    </div>
                  </div>

                  {/* Publishing Controls - Compact */}
                  <div className="pt-3 border-t">
                    <div className="flex gap-2 mb-2">
                      <Button 
                        size="sm" 
                        variant={isPublished ? "default" : "outline"}
                        onClick={publishScript}
                        disabled={isPublished}
                        className="text-xs h-7 px-2"
                      >
                        {isPublished ? "✓ Published" : "Publish Pages"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={renumberScript}
                        className="text-xs h-7 px-2"
                      >
                        Renumber Pages
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">
                      Publishing locks page numbers. New pages get letter suffixes (1A, 1B).
                    </p>
                  </div>

                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowPageSetup(false)}>
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className="h-8 w-8 p-0"
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
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Font size */}
        <Select value={fontSize} onValueChange={(value) => {
          setFontSize(value);
          formatText('fontSize', value);
        }}>
          <SelectTrigger className="w-16 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="14">14</SelectItem>
            <SelectItem value="16">16</SelectItem>
            <SelectItem value="18">18</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="24">24</SelectItem>
          </SelectContent>
        </Select>

        {/* Text color */}
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-8 gap-2">
              {[
                '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
                '#800080', '#008000', '#800000', '#008080', '#000080', '#808000', '#C0C0C0', '#808080'
              ].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setCurrentColor(color);
                    formatText('foreColor', color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('justifyLeft')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('justifyCenter')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('justifyRight')}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('insertUnorderedList')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatText('insertOrderedList')}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Script formatting */}
        <Select onValueChange={(value) => applyScriptFormatting(value as any)}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Script Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="character">CHARACTER</SelectItem>
            <SelectItem value="dialogue">Dialogue</SelectItem>
            <SelectItem value="stage_direction">(Stage Direction)</SelectItem>
            <SelectItem value="scene_heading">SCENE HEADING</SelectItem>
          </SelectContent>
        </Select>

        {/* Auto-format button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editorRef.current) {
              saveToUndoStack();
              // Get plain text content, preserving line breaks
              const currentContent = editorRef.current.innerText || editorRef.current.textContent || '';
              const formattedContent = parseScriptText(currentContent);
              editorRef.current.innerHTML = formattedContent;
              handleContentChange(editorRef.current?.innerHTML || '');
            }
          }}
          className="h-8 px-3"
          title="Auto-format the entire script"
        >
          <Wand2 className="h-4 w-4 mr-1" />
          Auto-Format
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Comments */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCommentDialog(true)}
          className="h-8 px-3"
          disabled={!selectedText}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Comment
        </Button>
        
        {/* Toggle Comments Visibility */}
        <Button
          variant={showComments ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="h-8 px-3"
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          {showComments ? "Hide" : "Show"} Comments
        </Button>
        </div>
        
        {/* Right Side - Script Controls */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={isPublished ? "default" : "outline"}
            onClick={publishScript}
            disabled={!hasContentChanges}
            className="h-8 text-sm px-3"
          >
            {isPublished ? "✓ Published" : "Publish Pages"}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={renumberScript}
            disabled={!hasContentChanges}
            className="h-8 text-sm px-3"
          >
            Renumber Pages
          </Button>
        </div>
      </div>

      {/* Editor Container with Sidebar Layout */}
      <div className="flex">
        {/* Main Editor Area */}
        <div className="flex-1">
          {/* Page container with realistic document styling */}
          <div className="bg-gray-100 dark:bg-gray-800 p-8 space-y-8">
            {/* Dynamic Pages */}
            {Array.from({ length: pageCount }, (_, index) => {
              const pageNum = index + 1;
              const isFirstPage = pageNum === 1;
              
              return (
                <div key={pageNum} className="bg-white mx-auto shadow-lg relative" style={{ 
                  width: '8.5in', 
                  height: '11in',
                  fontFamily: 'Courier, monospace',
                  fontSize: '12pt',
                  lineHeight: '1.5',
                  padding: `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`,
                  boxSizing: 'border-box'
                }}>
                  {/* Header */}
                  {showHeaders && (
                    <div className={`absolute top-2 left-0 right-0 text-${pageNumberAlignment} text-xs text-gray-600 pointer-events-none px-4`}>
                      {headerText && (pageNumberPosition === 'header' || pageNumberPosition === 'both') 
                        ? `${headerText} - ${formatPageNumber(pageNumbers[pageNum - 1] || pageNum.toString(), pageNum - 1, pageCount)}`
                        : pageNumberPosition === 'header' || pageNumberPosition === 'both'
                        ? formatPageNumber(pageNumbers[pageNum - 1] || pageNum.toString(), pageNum - 1, pageCount)
                        : headerText || ''
                      }
                    </div>
                  )}
                  
                  {/* Footer */}
                  {showFooters && (
                    <div className={`absolute bottom-2 left-0 right-0 text-${pageNumberAlignment} text-xs text-gray-600 pointer-events-none px-4`}>
                      {footerText && (pageNumberPosition === 'footer' || pageNumberPosition === 'both') 
                        ? `${footerText} - ${formatPageNumber(pageNumbers[pageNum - 1] || pageNum.toString(), pageNum - 1, pageCount)}`
                        : pageNumberPosition === 'footer' || pageNumberPosition === 'both'
                        ? formatPageNumber(pageNumbers[pageNum - 1] || pageNum.toString(), pageNum - 1, pageCount)
                        : footerText || ''
                      }
                    </div>
                  )}
                  {isFirstPage ? (
                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={handleInput}
                      onPaste={handlePaste}
                      onMouseUp={handleTextSelection}
                      className="focus:outline-none text-black overflow-hidden h-full"
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        paddingTop: '0.2in'
                      }}
                      suppressContentEditableWarning={true}
                    />
                  ) : (
                    <div 
                      className="text-black overflow-hidden h-full"
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        paddingTop: '0.2in'
                      }}
                      id={`page-${pageNum}-content`}
                    >
                      {/* Additional page content will be dynamically populated */}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Comments Sidebar - Fixed on the right */}
        {showComments && (
          <div className="fixed right-0 top-16 w-80 h-[calc(100vh-4rem)] border-l bg-white dark:bg-gray-900 p-4 overflow-y-auto shadow-lg z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Comments</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {comment.author?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium">{comment.author || 'Anonymous'}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {comment.timestamp || 'Now'}
                    </span>
                  </div>
                  {comment.selectedText && (
                    <div className="text-xs bg-yellow-100 dark:bg-yellow-900 p-2 rounded mb-2 italic">
                      "{comment.selectedText}"
                    </div>
                  )}
                  <p className="text-sm">{comment.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      Reply
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Page break indicator */}
      <style dangerouslySetInnerHTML={{__html: `
        .script-character {
          font-weight: bold;
          text-transform: uppercase;
          margin-left: 3rem;
          display: block;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .script-dialogue {
          margin-left: 1rem;
          margin-right: 1rem;
          display: block;
          margin-bottom: 1em;
        }
        .script-stage_direction {
          font-style: italic;
          margin-left: 1.5rem;
          margin-right: 1.5rem;
          display: block;
          margin-bottom: 1em;
        }
        .script-scene_heading {
          font-weight: bold;
          text-transform: uppercase;
          text-decoration: underline;
          display: block;
          margin-top: 2em;
          margin-bottom: 1em;
        }
        
        @media print {
          .bg-gray-100, .bg-gray-800 { background: white !important; }
          .shadow-lg { box-shadow: none !important; }
          .border-l, .absolute.right-0 { display: none !important; }
        }
      `}} />
    </div>
  );
}