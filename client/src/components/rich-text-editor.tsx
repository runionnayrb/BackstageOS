import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, Palette, Hash } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  showPageNumbers?: boolean;
  pageNumberFormat?: "1" | "1 of X" | "Page 1" | "Page 1 of X";
  onPageNumberFormatChange?: (format: "1" | "1 of X" | "Page 1" | "Page 1 of X") => void;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder, 
  className = "",
  showPageNumbers = false,
  pageNumberFormat = "1",
  onPageNumberFormatChange
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertVariable = (variable: string) => {
    executeCommand('insertText', `{{${variable}}}`);
  };

  const insertPageNumber = (format: string) => {
    let pageNumberText = "";
    switch (format) {
      case "1":
        pageNumberText = "{{pageNumber}}";
        break;
      case "1 of X":
        pageNumberText = "{{pageNumber}} of {{totalPages}}";
        break;
      case "Page 1":
        pageNumberText = "Page {{pageNumber}}";
        break;
      case "Page 1 of X":
        pageNumberText = "Page {{pageNumber}} of {{totalPages}}";
        break;
    }
    executeCommand('insertText', ` ${pageNumberText}`);
  };

  const formatText = (command: string) => {
    executeCommand(command);
  };

  const alignText = (alignment: string) => {
    executeCommand(`justify${alignment}`);
  };

  const changeFontSize = (size: string) => {
    executeCommand('fontSize', '3'); // Reset to default
    executeCommand('fontSizeDelta', size);
    setShowFontSize(false);
  };

  const changeColor = (color: string) => {
    executeCommand('foreColor', color);
    setShowColorPicker(false);
  };

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50 dark:bg-gray-900 flex-wrap">
        {/* Text formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => alignText('Left')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => alignText('Center')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => alignText('Right')}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Font size */}
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowFontSize(!showFontSize)}
            className="h-8 w-8 p-0"
          >
            <Type className="h-4 w-4" />
          </Button>
          {showFontSize && (
            <div className="absolute top-10 left-0 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-2 z-10">
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeFontSize('-1')}
                  className="text-xs justify-start"
                >
                  Small
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeFontSize('0')}
                  className="text-sm justify-start"
                >
                  Normal
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeFontSize('+1')}
                  className="text-base justify-start"
                >
                  Large
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeFontSize('+2')}
                  className="text-lg justify-start"
                >
                  Extra Large
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Color picker */}
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="h-8 w-8 p-0"
          >
            <Palette className="h-4 w-4" />
          </Button>
          {showColorPicker && (
            <div className="absolute top-10 left-0 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 z-10">
              <div className="grid grid-cols-6 gap-2">
                {[
                  '#000000', '#444444', '#888888', '#CCCCCC', '#FFFFFF', '#FF0000',
                  '#FF8800', '#FFFF00', '#88FF00', '#00FF00', '#00FF88',
                  '#00FFFF', '#0088FF', '#0000FF', '#8800FF', '#FF00FF'
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
                    style={{ backgroundColor: color }}
                    onClick={() => changeColor(color)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Variable insertion */}
        <div className="flex gap-1 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertVariable('showName')}
            className="h-8 text-xs"
          >
            Show Name
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertVariable('date')}
            className="h-8 text-xs"
          >
            Date
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertVariable('reportType')}
            className="h-8 text-xs"
          >
            Report Type
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertVariable('stageManager')}
            className="h-8 text-xs"
          >
            Stage Manager
          </Button>
        </div>

        {/* Spacer to push page numbers to the right */}
        <div className="flex-1" />

        {/* Page numbering controls */}
        {showPageNumbers && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <div className="flex items-center gap-2">
              <Select
                value={pageNumberFormat}
                onValueChange={onPageNumberFormatChange}
              >
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{{pageNumber}}</SelectItem>
                  <SelectItem value="1 of X">{{pageNumber}} of {{totalPages}}</SelectItem>
                  <SelectItem value="Page 1">Page {{pageNumber}}</SelectItem>
                  <SelectItem value="Page 1 of X">Page {{pageNumber}} of {{totalPages}}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertPageNumber(pageNumberFormat)}
                className="h-8 text-xs"
              >
                Insert
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[120px] p-4 focus:outline-none"
        style={{ 
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit'
        }}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Click outside to close dropdowns */}
      {(showColorPicker || showFontSize) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowColorPicker(false);
            setShowFontSize(false);
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}} />
    </div>
  );
}