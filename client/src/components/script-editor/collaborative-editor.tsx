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
import { RichTextEditor } from "@/components/rich-text-editor";

interface CollaborativeEditorProps {
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
}

export function CollaborativeEditor({
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
  className = ""
}: CollaborativeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [fontSize, setFontSize] = useState("14");
  const [fontFamily, setFontFamily] = useState("system-ui");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
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
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showRenumberConfirm, setShowRenumberConfirm] = useState(false);
  const [editingElement, setEditingElement] = useState<{ type: 'header' | 'footer'; pageNum: number } | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [showToolbar, setShowToolbar] = useState(false);
  const [showVariablesPopover, setShowVariablesPopover] = useState(false);
  const editingRef = useRef<HTMLInputElement>(null);

  // Track content changes
  const handleContentChange = useCallback((newContent: string) => {
    if (newContent && newContent.trim()) {
      onChange(newContent);
      setHasContentChanges(newContent !== initialContent);
    }
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

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
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



  // Generate smart page numbers with letter suffixes for new pages
  const generatePageNumbers = useCallback((newPageCount: number) => {
    if (!isPublished) {
      // Before publishing, use simple numbering
      return Array.from({ length: newPageCount }, (_, i) => (i + 1).toString());
    }

    // After publishing, handle new pages with letter suffixes
    const numbers = [];
    for (let i = 1; i <= newPageCount; i++) {
      if (i <= publishedPageCount) {
        numbers.push(i.toString());
      } else {
        // Add letter suffix for new pages
        const letterIndex = i - publishedPageCount - 1;
        const letter = String.fromCharCode(65 + (letterIndex % 26)); // A, B, C, etc.
        numbers.push(`${publishedPageCount}${letter}`);
      }
    }
    return numbers;
  }, [isPublished, publishedPageCount]);

  // Function to distribute content across pages
  const distributeContentAcrossPages = useCallback(() => {
    if (!editorRef.current) return;

    const page1 = editorRef.current;
    const allContent = page1.innerHTML || '';
    
    // If no content, show only one page
    if (!allContent.trim()) {
      setPageCount(1);
      setPageNumbers(['1']);
      return;
    }

    // Create a temporary div to measure content
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: 7.5in;
      padding: ${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in;
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      line-height: 1.2;
      white-space: pre-wrap;
    `;
    tempDiv.innerHTML = allContent;
    document.body.appendChild(tempDiv);

    // Calculate how much content fits on one page
    const pageHeight = 9.5 * 96; // 9.5 inches in pixels (96 DPI)
    const usableHeight = pageHeight - ((margins.top + margins.bottom) * 96);
    
    // Split content into div elements
    const allDivs = Array.from(tempDiv.children) as HTMLElement[];
    const pages: HTMLElement[][] = [];
    let currentPage: HTMLElement[] = [];
    let currentHeight = 0;

    for (const div of allDivs) {
      const divHeight = div.offsetHeight;
      
      // If adding this div would exceed page height, start a new page
      if (currentHeight + divHeight > usableHeight && currentPage.length > 0) {
        pages.push([...currentPage]);
        currentPage = [div];
        currentHeight = divHeight;
      } else {
        currentPage.push(div);
        currentHeight += divHeight;
      }
    }
    
    // Add the last page if it has content
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    // Clean up temp div
    document.body.removeChild(tempDiv);

    // Update page count and numbers
    const newPageCount = Math.max(1, pages.length);
    setPageCount(newPageCount);
    setPageNumbers(Array.from({ length: newPageCount }, (_, i) => (i + 1).toString()));

    // Distribute content to pages
    for (let pageNum = 1; pageNum <= newPageCount; pageNum++) {
      const pageContainer = pageNum === 1 ? page1 : document.getElementById(`page-${pageNum}-content`);
      if (pageContainer) {
        const pageContent = pages[pageNum - 1] || [];
        pageContainer.innerHTML = '';
        
        pageContent.forEach(div => {
          const clonedDiv = div.cloneNode(true) as HTMLElement;
          pageContainer.appendChild(clonedDiv);
        });
      }
    }
  }, [margins, fontFamily, fontSize]);

  // Initialize content when it changes from server
  useEffect(() => {
    if (editorRef.current && content) {
      // Always update editor when content prop changes from server
      const currentEditorContent = editorRef.current.innerHTML || '';
      if (currentEditorContent !== content) {
        editorRef.current.innerHTML = content;
        if (!initialContent) {
          setInitialContent(content);
        }
        // Trigger content distribution after content is set
        setTimeout(() => distributeContentAcrossPages(), 100);
      }
    }
  }, [content, distributeContentAcrossPages]);

  // Listen for force distribution events from import
  useEffect(() => {
    const handleForceDistribution = () => {
      setTimeout(() => distributeContentAcrossPages(), 50);
    };

    window.addEventListener('forceDistribution', handleForceDistribution);
    return () => window.removeEventListener('forceDistribution', handleForceDistribution);
  }, [distributeContentAcrossPages]);

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

  // Helper function to process rich text content and replace variables
  const processRichContent = useCallback((content: string, pageNum: number) => {
    if (!content) return '';
    
    // Replace variables with actual values while preserving HTML formatting
    let processedContent = content
      .replace(/\{\{showName\}\}/g, title || 'Untitled Script')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{stageManager\}\}/g, 'Stage Manager') // Could be passed as prop
      .replace(/\{\{pageNumber\}\}/g, formatPageNumber(pageNumbers[pageNum - 1] || pageNum.toString(), pageNum - 1, pageCount))
      .replace(/\{\{totalPages\}\}/g, pageCount.toString());
    
    // Return the content with HTML formatting preserved
    return processedContent;
  }, [title, pageNumbers, pageCount, formatPageNumber]);

  // Handle click on header/footer for inline editing
  const handleHeaderFooterClick = useCallback((type: 'header' | 'footer', pageNum: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    
    // Position toolbar directly above the text being edited
    setToolbarPosition({
      x: rect.left + window.scrollX + (rect.width / 2) - 150, // Center the toolbar above the text
      y: rect.top + window.scrollY - 10 // Position 10px above the text
    });
    
    setEditingElement({ type, pageNum });
    setShowToolbar(true);
    
    // Make the element editable and focus it properly
    setTimeout(() => {
      if (editingRef.current) {
        // Clear any existing content if it's placeholder text
        if (editingRef.current.textContent?.includes('Click to edit')) {
          editingRef.current.innerHTML = '';
        }
        
        editingRef.current.focus();
        
        // Set cursor at the end of content
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(editingRef.current);
          range.collapse(false); // Collapse to end
          selection.addRange(range);
        }
      }
    }, 10);
  }, []);

  // Handle formatting commands for inline editing
  const executeInlineCommand = useCallback((command: string, value?: string) => {
    console.log('executeInlineCommand called:', command, value);
    
    if (!editingRef.current || !editingElement) {
      console.log('No editing ref or element');
      return;
    }
    
    const element = editingRef.current as HTMLDivElement;
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      console.log('No text selection found');
      return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    
    console.log('Selection:', { selectedText });
    
    let formattedElement: HTMLElement;
    
    // Apply formatting based on command
    switch (command) {
      case 'bold':
        formattedElement = document.createElement('b');
        break;
      case 'italic':
        formattedElement = document.createElement('i');
        break;
      case 'underline':
        formattedElement = document.createElement('u');
        break;
      default:
        console.log('Unknown command:', command);
        return;
    }
    
    try {
      // If there's selected text, wrap it
      if (selectedText) {
        range.surroundContents(formattedElement);
      } else {
        // If no selection, insert empty formatted element at cursor
        formattedElement.textContent = '';
        range.insertNode(formattedElement);
        // Place cursor inside the formatted element
        const newRange = document.createRange();
        newRange.setStart(formattedElement, 0);
        newRange.setEnd(formattedElement, 0);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      // Update state with new HTML content
      const newContent = element.innerHTML;
      console.log('New formatted content:', newContent);
      
      if (editingElement.type === 'header') {
        setHeaderText(newContent);
      } else if (editingElement.type === 'footer') {
        setFooterText(newContent);
      }
      
    } catch (error) {
      console.log('Error applying formatting:', error);
      // Fallback: wrap selection in a new element
      const contents = range.extractContents();
      formattedElement.appendChild(contents);
      range.insertNode(formattedElement);
      
      const newContent = element.innerHTML;
      if (editingElement.type === 'header') {
        setHeaderText(newContent);
      } else if (editingElement.type === 'footer') {
        setFooterText(newContent);
      }
    }
    
    element.focus();
  }, [editingElement]);

  // Insert variable into inline editor
  const insertVariableInline = useCallback((variable: string) => {
    console.log('insertVariableInline called with:', variable);
    console.log('editingRef.current:', editingRef.current);
    console.log('editingElement:', editingElement);
    
    if (editingRef.current && editingElement) {
      const element = editingRef.current as HTMLDivElement;
      const variableText = `{{${variable}}}`;
      
      console.log('Variable text to insert:', variableText);
      
      // Get current selection or cursor position
      const selection = window.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create text node with variable
        const textNode = document.createTextNode(variableText);
        
        // Insert the variable at cursor position
        range.deleteContents();
        range.insertNode(textNode);
        
        // Move cursor after the inserted variable
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, append to the end
        element.appendChild(document.createTextNode(variableText));
      }
      
      // Update state with new content
      const newContent = element.innerHTML;
      console.log('New content after variable insertion:', newContent);
      
      if (editingElement.type === 'header') {
        setHeaderText(newContent);
        console.log('Updated header text to:', newContent);
      } else if (editingElement.type === 'footer') {
        setFooterText(newContent);
        console.log('Updated footer text to:', newContent);
      }
      
      element.focus();
    } else {
      console.log('Cannot insert variable - missing ref or editing element');
    }
  }, [editingElement]);

  // Close inline editor
  const closeInlineEditor = useCallback(() => {
    // Save final content before clearing editing state
    if (editingRef.current && editingElement) {
      const content = editingRef.current.value;
      if (editingElement.type === 'header') {
        setHeaderText(content);
      } else if (editingElement.type === 'footer') {
        setFooterText(content);
      }
    }
    
    setEditingElement(null);
    setShowToolbar(false);
    setShowVariablesPopover(false);
  }, [editingElement]);

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

  // Collect all content from all pages
  const collectAllContent = useCallback(() => {
    const allPageContent: string[] = [];
    
    // Get content from page 1 (editorRef)
    if (editorRef.current) {
      allPageContent.push(editorRef.current.innerHTML || '');
    }
    
    // Get content from additional pages
    for (let i = 2; i <= pageCount; i++) {
      const pageElement = document.getElementById(`page-${i}-content`);
      if (pageElement) {
        allPageContent.push(pageElement.innerHTML || '');
      }
    }
    
    return allPageContent.join('');
  }, [pageCount]);

  // Handle input events with immediate auto-save
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    // Immediately collect and save all content, including empty content
    const allContent = collectAllContent();
    onChange(allContent || '');
  }, [onChange, collectAllContent]);

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
        
        // Trigger content distribution after pasting large content
        setTimeout(() => distributeContentAcrossPages(), 100);
      }
    } else {
      // For small text, just paste normally
      document.execCommand('insertText', false, pastedText);
      handleContentChange(editorRef.current?.innerHTML || '');
    }
  }, [parseScriptText, saveToUndoStack, handleContentChange, distributeContentAcrossPages]);

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
          <div className="text-sm text-muted-foreground mt-1">
            Version {version} - All changes are auto-saved
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
                    <Label htmlFor="modal-header-text">Header content</Label>
                    <RichTextEditor
                      content={headerText}
                      onChange={setHeaderText}
                      placeholder="Enter header content with rich formatting..."
                      className="min-h-[100px]"
                      showPageNumbers={true}
                      pageNumberFormat="1"
                      onPageNumberFormatChange={() => {}}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variables: {`{{showName}}, {{date}}, {{stageManager}}`} • Use the page number dropdown and Insert button
                    </p>
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
                    <Label htmlFor="modal-footer-text">Footer content</Label>
                    <RichTextEditor
                      content={footerText}
                      onChange={setFooterText}
                      placeholder="Enter footer content with rich formatting..."
                      className="min-h-[100px]"
                      showPageNumbers={true}
                      pageNumberFormat="1"
                      onPageNumberFormatChange={() => {}}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variables: {`{{showName}}, {{date}}, {{stageManager}}`} • Use the page number dropdown and Insert button
                    </p>
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
                    <Select
                      value={pageNumberPosition}
                      onValueChange={(value) => setPageNumberPosition(value as any)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Header only</SelectItem>
                        <SelectItem value="footer">Footer only</SelectItem>
                        <SelectItem value="both">Both header and footer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Alignment */}
                  <div className="space-y-2">
                    <Label>Alignment</Label>
                    <Select
                      value={pageNumberAlignment}
                      onValueChange={(value) => setPageNumberAlignment(value as any)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select alignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Format */}
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select
                      value={pageNumberFormat}
                      onValueChange={(value) => setPageNumberFormat(value as any)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">1, 2, 3...</SelectItem>
                        <SelectItem value="page-x">Page 1, Page 2...</SelectItem>
                        <SelectItem value="page-x-of-y">Page 1 of 5, Page 2 of 5...</SelectItem>
                      </SelectContent>
                    </Select>
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

        {/* Font family */}
        <Select value={fontFamily} onValueChange={(value) => {
          setFontFamily(value);
          formatText('fontName', value);
        }}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system-ui">Default</SelectItem>
            <SelectItem value="Courier, monospace">Courier</SelectItem>
            <SelectItem value="Times, serif">Times</SelectItem>
            <SelectItem value="Arial, sans-serif">Arial</SelectItem>
            <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
            <SelectItem value="Georgia, serif">Georgia</SelectItem>
            <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
          </SelectContent>
        </Select>

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

        {/* Auto-format and reflow button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (editorRef.current) {
              saveToUndoStack();
              
              // Collect all content from all pages first
              const allPageContent: string[] = [];
              
              // Get content from page 1 (editorRef)
              if (editorRef.current) {
                allPageContent.push(editorRef.current.innerHTML || '');
              }
              
              // Get content from additional pages
              for (let i = 2; i <= pageCount; i++) {
                const pageElement = document.getElementById(`page-${i}-content`);
                if (pageElement) {
                  allPageContent.push(pageElement.innerHTML || '');
                }
              }
              
              // Combine all content and convert HTML to plain text while preserving line breaks
              const combinedContent = allPageContent.join('');
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = combinedContent;
              
              // Convert HTML to plain text while preserving line structure
              const htmlElements = tempDiv.querySelectorAll('*');
              htmlElements.forEach(element => {
                if (element.tagName === 'DIV' || element.tagName === 'P' || element.tagName === 'BR') {
                  element.insertAdjacentText('afterend', '\n');
                }
              });
              
              const plainText = tempDiv.textContent || tempDiv.innerText || '';
              // Clean up multiple newlines but preserve intentional breaks
              const cleanedText = plainText.replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
              
              // Format the content
              const formattedContent = parseScriptText(cleanedText);
              
              // Clear all pages first
              editorRef.current.innerHTML = formattedContent;
              for (let i = 2; i <= pageCount; i++) {
                const pageElement = document.getElementById(`page-${i}-content`);
                if (pageElement) {
                  pageElement.innerHTML = '';
                }
              }
              
              handleContentChange(formattedContent);
              
              // Trigger content distribution after formatting
              setTimeout(() => distributeContentAcrossPages(), 100);
            }
          }}
          className="h-8 w-8 p-0"
          title="Auto-format script and reflow across pages"
        >
          <Wand2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />


        </div>
        
        {/* Right Side - Script Controls */}
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={isPublished ? "default" : "outline"}
            onClick={() => setShowPublishConfirm(true)}
            disabled={!hasContentChanges}
            className="h-8 text-sm px-3"
          >
            {isPublished ? "✓ Published" : "Publish Pages"}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowRenumberConfirm(true)}
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
          <div className="bg-gray-100 dark:bg-gray-800 py-8">
            <div className="container mx-auto px-4 space-y-8">
            {/* Dynamic Pages */}
            {Array.from({ length: pageCount }, (_, index) => {
              const pageNum = index + 1;
              const isFirstPage = pageNum === 1;
              
              return (
                <div key={pageNum} className="bg-white mx-auto shadow-lg relative" style={{ 
                  width: '8.5in', 
                  height: '11in',
                  fontFamily: fontFamily,
                  fontSize: '12pt',
                  lineHeight: '1.5',
                  padding: `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`,
                  boxSizing: 'border-box'
                }}>
                  {/* Header */}
                  {showHeaders && (
                    <>
                      {editingElement?.type === 'header' && editingElement?.pageNum === pageNum ? (
                        <div
                          ref={editingRef}
                          contentEditable
                          className={`absolute top-2 left-0 right-0 text-${pageNumberAlignment} text-xs text-gray-600 px-4 bg-transparent border-none outline-2 outline-blue-500 outline-dashed focus:outline-dashed min-h-[16px]`}
                          style={{ textAlign: pageNumberAlignment as any }}
                          dangerouslySetInnerHTML={{ __html: headerText }}
                          onInput={(e) => {
                            const target = e.target as HTMLDivElement;
                            setHeaderText(target.innerHTML);
                          }}
                          onBlur={(e) => {
                            // Don't close if clicking on toolbar
                            const relatedTarget = e.relatedTarget as HTMLElement;
                            if (relatedTarget && relatedTarget.closest('[data-toolbar="true"]')) {
                              return;
                            }
                            closeInlineEditor();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              closeInlineEditor();
                            }
                          }}
                          suppressContentEditableWarning={true}
                        />
                      ) : (
                        <div 
                          className={`absolute top-2 left-0 right-0 text-${pageNumberAlignment} text-xs text-gray-600 px-4 cursor-pointer hover:bg-gray-100 hover:bg-opacity-50 rounded transition-colors`}
                          style={{ textAlign: pageNumberAlignment as any }}
                          onClick={(e) => handleHeaderFooterClick('header', pageNum, e)}
                          dangerouslySetInnerHTML={{
                            __html: headerText ? processRichContent(headerText, pageNum) : '<span class="text-gray-400 italic">Click to edit header</span>'
                          }}
                          title="Click to edit header"
                        />
                      )}
                    </>
                  )}
                  
                  {/* Footer */}
                  {showFooters && (
                    <>
                      {editingElement?.type === 'footer' && editingElement?.pageNum === pageNum ? (
                        <div
                          ref={editingRef}
                          contentEditable
                          className={`absolute bottom-2 left-0 right-0 text-${pageNumberAlignment} text-xs text-gray-600 px-4 bg-transparent border-none outline-2 outline-blue-500 outline-dashed focus:outline-dashed min-h-[16px]`}
                          style={{ textAlign: pageNumberAlignment as any }}
                          dangerouslySetInnerHTML={{ __html: footerText }}
                          onInput={(e) => {
                            const target = e.target as HTMLDivElement;
                            setFooterText(target.innerHTML);
                          }}
                          onBlur={(e) => {
                            // Don't close if clicking on toolbar
                            const relatedTarget = e.relatedTarget as HTMLElement;
                            if (relatedTarget && relatedTarget.closest('[data-toolbar="true"]')) {
                              return;
                            }
                            closeInlineEditor();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              closeInlineEditor();
                            }
                          }}
                          suppressContentEditableWarning={true}
                        />
                      ) : (
                        <div 
                          className={`absolute bottom-2 left-0 right-0 text-${pageNumberAlignment} text-xs text-gray-600 px-4 cursor-pointer hover:bg-gray-100 hover:bg-opacity-50 rounded transition-colors`}
                          style={{ textAlign: pageNumberAlignment as any }}
                          onClick={(e) => handleHeaderFooterClick('footer', pageNum, e)}
                          dangerouslySetInnerHTML={{
                            __html: footerText ? processRichContent(footerText, pageNum) : '<span class="text-gray-400 italic">Click to edit footer</span>'
                          }}
                          title="Click to edit footer"
                        />
                      )}
                    </>
                  )}
                  <div
                    ref={isFirstPage ? editorRef : undefined}
                    contentEditable
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onMouseUp={handleTextSelection}
                    className="focus:outline-none text-black overflow-hidden h-full"
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      paddingTop: '0.2in'
                    }}
                    id={isFirstPage ? undefined : `page-${pageNum}-content`}
                    suppressContentEditableWarning={true}
                  />
                </div>
              );
            })}
            </div>
          </div>
        </div>


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

      {/* Publish Pages Confirmation Dialog */}
      <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Pages</DialogTitle>
            <DialogDescription>
              This will lock the current page numbering for theater workflow. Once published, new pages will be numbered with letter suffixes (1A, 1B, etc.) to maintain continuity during production.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              publishScript();
              setShowPublishConfirm(false);
            }}>
              Publish Pages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renumber Pages Confirmation Dialog */}
      <Dialog open={showRenumberConfirm} onOpenChange={setShowRenumberConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renumber Pages</DialogTitle>
            <DialogDescription>
              This will reset all page numbers to sequential order (1, 2, 3...) and remove any letter suffixes. This action cannot be undone and may affect production references.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenumberConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => {
              renumberScript();
              setShowRenumberConfirm(false);
            }}>
              Renumber Pages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Formatting Toolbar */}
      {editingElement && (
        <div 
          data-toolbar="true"
          className="fixed z-[9999] bg-white dark:bg-gray-800 border rounded-md shadow-lg px-1 py-1 flex items-center gap-0.5"
          style={{
            left: `${toolbarPosition.x}px`,
            top: `${toolbarPosition.y - 60}px`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Bold */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-xs"
            onClick={() => {
              console.log('Bold button clicked');
              executeInlineCommand('bold');
            }}
            title="Bold"
          >
            <strong>B</strong>
          </Button>
          
          {/* Italic */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-xs"
            onClick={() => executeInlineCommand('italic')}
            title="Italic"
          >
            <em>I</em>
          </Button>
          
          {/* Underline */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-xs"
            onClick={() => executeInlineCommand('underline')}
            title="Underline"
          >
            <u>U</u>
          </Button>
          
          <div className="w-px h-5 bg-border mx-0.5" />
          
          {/* Variables Popover */}
          <Popover 
            open={showVariablesPopover} 
            onOpenChange={(open) => {
              console.log('Variables popover open state:', open);
              setShowVariablesPopover(open);
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Variables button clicked');
                  setShowVariablesPopover(!showVariablesPopover);
                }}
                title="Insert Variables"
              >
                Vars
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-48 p-2 z-[10001]" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                if (editingRef.current) {
                  editingRef.current.focus();
                }
              }}
            >
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-600 mb-2">Insert Variable:</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    insertVariableInline('showName');
                    setShowVariablesPopover(false);
                  }}
                >
                  Show Name
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    insertVariableInline('date');
                    setShowVariablesPopover(false);
                  }}
                >
                  Date
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    insertVariableInline('stageManager');
                    setShowVariablesPopover(false);
                  }}
                >
                  Stage Manager
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    insertVariableInline('pageNumber');
                    setShowVariablesPopover(false);
                  }}
                >
                  Page Number
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    insertVariableInline('totalPages');
                    setShowVariablesPopover(false);
                  }}
                >
                  Total Pages
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="w-px h-5 bg-border mx-0.5" />
          
          {/* Done Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              closeInlineEditor();
            }}
            title="Finish editing"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}