import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  Check,
  ChevronDown,
  Copy
} from "lucide-react";

interface InlineFormattingToolbarProps {
  targetElement: HTMLElement | null;
  isVisible: boolean;
  onSave: () => void;
  onCancel: () => void;
  onApplyToAll?: () => void;
}

export default function InlineFormattingToolbar({
  targetElement,
  isVisible,
  onSave,
  onCancel,
  onApplyToAll,
}: InlineFormattingToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && targetElement && toolbarRef.current) {
      const rect = targetElement.getBoundingClientRect();
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      
      // Position above the element
      setPosition({
        top: rect.top - toolbarRect.height - 8,
        left: rect.left + (rect.width - toolbarRect.width) / 2,
      });
    }
  }, [isVisible, targetElement]);

  const executeCommand = (command: string, value?: string) => {
    if (targetElement) {
      targetElement.focus();
      document.execCommand(command, false, value);
    }
  };

  const insertVariable = (variable: string) => {
    if (targetElement) {
      targetElement.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(variable));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-1"
      style={{ top: position.top, left: position.left }}
    >
      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => executeCommand('bold')}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => executeCommand('italic')}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => executeCommand('underline')}
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Text Alignment */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => executeCommand('justifyLeft')}
        className="h-8 w-8 p-0"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => executeCommand('justifyCenter')}
        className="h-8 w-8 p-0"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => executeCommand('justifyRight')}
        className="h-8 w-8 p-0"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Font Family */}
      <Select onValueChange={(value) => executeCommand('fontName', value)}>
        <SelectTrigger className="h-8 w-24 text-xs">
          <Type className="h-3 w-3 mr-1" />
          <ChevronDown className="h-3 w-3" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Arial">Arial</SelectItem>
          <SelectItem value="Times New Roman">Times</SelectItem>
          <SelectItem value="Courier New">Courier</SelectItem>
          <SelectItem value="Georgia">Georgia</SelectItem>
          <SelectItem value="Verdana">Verdana</SelectItem>
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select onValueChange={(value) => executeCommand('fontSize', value)}>
        <SelectTrigger className="h-8 w-16 text-xs">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">10px</SelectItem>
          <SelectItem value="2">13px</SelectItem>
          <SelectItem value="3">16px</SelectItem>
          <SelectItem value="4">18px</SelectItem>
          <SelectItem value="5">24px</SelectItem>
          <SelectItem value="6">32px</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Text Color */}
      <input
        type="color"
        onChange={(e) => executeCommand('foreColor', e.target.value)}
        className="h-8 w-8 border border-gray-300 rounded cursor-pointer"
        title="Text Color"
      />

      {/* Background Color */}
      <input
        type="color"
        onChange={(e) => executeCommand('hiliteColor', e.target.value)}
        className="h-8 w-8 border border-gray-300 rounded cursor-pointer"
        title="Background Color"
      />

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Variables */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
            Variables
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="space-y-1">
            {[
              '{{showName}}',
              '{{date}}',
              '{{stageManager}}',
              '{{reportType}}',
              '{{pageNumber}}',
              '{{totalPages}}'
            ].map((variable) => (
              <Button
                key={variable}
                variant="ghost"
                size="sm"
                onClick={() => insertVariable(variable)}
                className="w-full justify-start text-xs"
              >
                {variable}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Apply to All */}
      {onApplyToAll && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onApplyToAll}
            className="h-8 px-2 text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Apply to All
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
        </>
      )}

      {/* Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSave}
        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
      >
        <Check className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="h-8 px-2 text-xs"
      >
        Cancel
      </Button>
    </div>
  );
}