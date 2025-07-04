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
  Copy,
  Square,
  X
} from "lucide-react";

interface InlineFormattingToolbarProps {
  targetElement: HTMLElement | null;
  isVisible: boolean;
  onSave: () => void;
  onCancel: () => void;
  onApplyToAll?: () => void;
  applyToAllText?: string;
  showVariables?: boolean;
}

export default function InlineFormattingToolbar({
  targetElement,
  isVisible,
  onSave,
  onCancel,
  onApplyToAll,
  applyToAllText = "Apply to All",
  showVariables = true,
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isVisible &&
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node) &&
        targetElement &&
        !targetElement.contains(event.target as Node)
      ) {
        onCancel();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isVisible, onCancel, targetElement]);

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
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap items-center gap-1 min-w-max"
      style={{ top: position.top, left: position.left }}
    >
      {/* Text Style Controls */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => executeCommand('bold')}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => executeCommand('italic')}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => executeCommand('underline')}
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Text Alignment */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => executeCommand('justifyLeft')}
        className="h-8 w-8 p-0"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => executeCommand('justifyCenter')}
        className="h-8 w-8 p-0"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => executeCommand('justifyRight')}
        className="h-8 w-8 p-0"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Font Family */}
      <Select onValueChange={(value) => executeCommand('fontName', value)}>
        <SelectTrigger className="h-8 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Arial">Arial</SelectItem>
          <SelectItem value="Times New Roman">Times</SelectItem>
          <SelectItem value="Helvetica">Helvetica</SelectItem>
          <SelectItem value="Georgia">Georgia</SelectItem>
          <SelectItem value="Verdana">Verdana</SelectItem>
          <SelectItem value="Courier New">Courier</SelectItem>
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select onValueChange={(value) => executeCommand('fontSize', value)}>
        <SelectTrigger className="h-8 w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">10</SelectItem>
          <SelectItem value="2">12</SelectItem>
          <SelectItem value="3">14</SelectItem>
          <SelectItem value="4">16</SelectItem>
          <SelectItem value="5">18</SelectItem>
          <SelectItem value="6">20</SelectItem>
          <SelectItem value="7">24</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Text Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Type className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="text-sm font-medium mb-2">Text Color</div>
          <input
            type="color"
            onChange={(e) => executeCommand('foreColor', e.target.value)}
            className="w-full h-8 rounded border"
          />
        </PopoverContent>
      </Popover>

      {/* Background Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="text-sm font-medium mb-2">Background Color</div>
          <input
            type="color"
            onChange={(e) => executeCommand('hiliteColor', e.target.value)}
            className="w-full h-8 rounded border"
          />
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => executeCommand('hiliteColor', 'transparent')}
            className="w-full mt-2"
          >
            Transparent
          </Button>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Border Controls */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Square className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="text-sm font-medium mb-3">Borders</div>
          
          {/* Individual Border Toggles */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                onChange={(e) => executeCommand('underline', e.target.checked ? 'true' : 'false')}
                className="rounded"
              />
              <span className="text-xs">Top</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded"
              />
              <span className="text-xs">Right</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded"
              />
              <span className="text-xs">Bottom</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded"
              />
              <span className="text-xs">Left</span>
            </label>
          </div>

          {/* Border Weight */}
          <div className="mb-3">
            <div className="text-xs mb-1">Border Weight</div>
            <Select>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1px">1px</SelectItem>
                <SelectItem value="2px">2px</SelectItem>
                <SelectItem value="3px">3px</SelectItem>
                <SelectItem value="4px">4px</SelectItem>
                <SelectItem value="5px">5px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Border Color */}
          <div>
            <div className="text-xs mb-1">Border Color</div>
            <input
              type="color"
              className="w-full h-8 rounded border"
            />
          </div>
        </PopoverContent>
      </Popover>

      {showVariables && (
        <>
          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Variables */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-3">
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
        </>
      )}

      {/* Apply to All */}
      {onApplyToAll && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={onApplyToAll}
            className="h-8 px-3"
          >
            <Copy className="h-4 w-4 mr-1" />
            {applyToAllText}
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
        </>
      )}

      {/* Save/Cancel */}
      <Button
        size="sm"
        onClick={onSave}
        className="h-8 w-8 p-0"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}