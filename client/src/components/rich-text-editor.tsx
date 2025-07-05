import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, Palette, Hash, List, ListOrdered, Heading1, Heading2, Heading3 } from "lucide-react";

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
      // Safely set content without executing any embedded scripts
      editorRef.current.innerHTML = content || "";
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

  const formatHeading = (level: number) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Get the current block element
      let blockElement = range.startContainer;
      if (blockElement.nodeType === Node.TEXT_NODE) {
        blockElement = blockElement.parentNode as Node;
      }
      
      // Create new heading element
      const heading = document.createElement(`h${level}`);
      heading.style.margin = '16px 0 8px 0';
      heading.style.fontWeight = 'bold';
      heading.style.fontSize = level === 1 ? '24px' : level === 2 ? '20px' : '16px';
      
      // If we're in a block element, replace it
      if (blockElement && blockElement.nodeType === Node.ELEMENT_NODE) {
        const element = blockElement as Element;
        if (element.tagName && ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
          heading.innerHTML = element.innerHTML || '';
          element.parentNode?.replaceChild(heading, element);
        } else {
          heading.innerHTML = selection.toString() || 'Heading';
          range.deleteContents();
          range.insertNode(heading);
        }
      } else {
        heading.innerHTML = selection.toString() || 'Heading';
        range.deleteContents();
        range.insertNode(heading);
      }
      
      // Set cursor at end of heading
      range.selectNodeContents(heading);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }
  };

  const formatBodyText = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Get the current block element
      let blockElement = range.startContainer;
      if (blockElement.nodeType === Node.TEXT_NODE) {
        blockElement = blockElement.parentNode as Node;
      }
      
      // Create new paragraph element
      const paragraph = document.createElement('p');
      paragraph.style.margin = '0';
      paragraph.style.fontWeight = 'normal';
      paragraph.style.fontSize = '14px';
      
      // If we're in a block element, replace it
      if (blockElement && blockElement.nodeType === Node.ELEMENT_NODE) {
        const element = blockElement as Element;
        if (element.tagName && ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
          paragraph.innerHTML = element.innerHTML || '';
          element.parentNode?.replaceChild(paragraph, element);
        } else {
          paragraph.innerHTML = selection.toString() || '';
          range.deleteContents();
          range.insertNode(paragraph);
        }
      } else {
        paragraph.innerHTML = selection.toString() || '';
        range.deleteContents();
        range.insertNode(paragraph);
      }
      
      // Set cursor at end of paragraph
      range.selectNodeContents(paragraph);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }
  };

  const createList = (ordered: boolean = false) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Create list container with explicit bullet styling
      const listElement = document.createElement(ordered ? 'ol' : 'ul');
      listElement.style.margin = '8px 0';
      listElement.style.paddingLeft = '20px';
      listElement.style.marginLeft = '0';
      if (ordered) {
        listElement.style.listStyleType = 'decimal';
      } else {
        listElement.style.listStyleType = 'disc';
        listElement.style.listStylePosition = 'outside';
      }
      listElement.style.display = 'block';
      
      // Create first list item with explicit styling
      const listItem = document.createElement('li');
      listItem.style.margin = '4px 0';
      listItem.style.display = 'list-item';
      listItem.style.listStyleType = 'inherit';
      listItem.style.listStylePosition = 'inherit';
      listItem.innerHTML = selection.toString() || 'List item';
      
      listElement.appendChild(listItem);
      
      // Insert the list
      range.deleteContents();
      range.insertNode(listElement);
      
      // Set cursor at end of first item
      range.selectNodeContents(listItem);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }
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

        {/* Headings */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatHeading(1)}
          className="h-8 w-8 p-0"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatHeading(2)}
          className="h-8 w-8 p-0"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatHeading(3)}
          className="h-8 w-8 p-0"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatBodyText}
          className="h-8 w-8 p-0"
          title="Body Text"
        >
          <Type className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => createList(false)}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => createList(true)}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
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
                <SelectTrigger className="w-auto h-8 text-xs">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="1 of X">1 of X</SelectItem>
                  <SelectItem value="Page 1">Page 1</SelectItem>
                  <SelectItem value="Page 1 of X">Page 1 of X</SelectItem>
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
        suppressContentEditableWarning={true}
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