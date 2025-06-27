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
  FileText,
  Plus
} from "lucide-react";

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

  // Format text selection
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      saveToUndoStack();
      onChange(newContent);
    }
  }, [onChange]);

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

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
    }
  }, [onChange]);

  // Handle file import
  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
  }, [onImport]);

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
      handleContentChange();
    } catch (e) {
      // Handle complex selections
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      saveToUndoStack();
      handleContentChange();
    }
  }, [saveToUndoStack, handleContentChange]);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && content && typeof content === 'string') {
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
      <div className="flex items-center gap-1 p-3 border-b bg-gray-50 dark:bg-gray-800 flex-wrap">
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
        {comments.length > 0 && (
          <Button
            variant={showComments ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="h-8 px-3"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {showComments ? "Hide" : "Show"} Comments ({comments.length})
          </Button>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        {/* Page container with realistic document styling */}
        <div className="bg-gray-100 dark:bg-gray-800 p-8">
          <div className="bg-white dark:bg-white mx-auto shadow-lg" style={{ 
            width: '8.5in', 
            minHeight: '11in',
            padding: '1in',
            fontFamily: 'Courier, monospace',
            fontSize: '12pt',
            lineHeight: '1.5'
          }}>
            <div
              ref={editorRef}
              contentEditable
              onInput={handleContentChange}
              onMouseUp={handleTextSelection}
              className="min-h-full focus:outline-none text-black"
              style={{ 
                whiteSpace: 'pre-wrap',
              }}
              suppressContentEditableWarning={true}
            />
          </div>
        </div>

        {/* Comments sidebar - only shown when toggle is enabled */}
        {comments.length > 0 && showComments && (
          <div className="absolute right-0 top-0 w-80 h-full border-l bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
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