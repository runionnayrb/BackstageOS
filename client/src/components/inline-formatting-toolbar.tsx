import { useState, useRef, useEffect, useCallback } from "react";
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
  onApplyToAll?: () => void;
  applyToAllText?: string;
  showVariables?: boolean;
  onAutoSave?: () => void;
  onClose?: () => void;
}

export default function InlineFormattingToolbar({
  targetElement,
  isVisible,
  onApplyToAll,
  applyToAllText = "Apply to All",
  showVariables = true,
  onAutoSave,
  onClose,
}: InlineFormattingToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false
  });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(`🔧 Toolbar visibility changed - isVisible: ${isVisible}, targetElement:`, targetElement);
    if (isVisible && targetElement) {
      // Simple positioning without complex calculations
      const rect = targetElement.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      
      setPosition({ 
        top: rect.top + scrollY - 64, // Simple offset above element
        left: rect.left + scrollX 
      });

      // Update active states when toolbar becomes visible
      updateActiveStates();
    }
  }, [isVisible, targetElement]);

  // Add event listeners to track formatting changes only
  useEffect(() => {
    if (!targetElement || !isVisible) return;

    const handleSelectionChange = () => {
      updateActiveStates();
    };

    const handleKeyUp = () => {
      updateActiveStates();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    targetElement.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      targetElement.removeEventListener('keyup', handleKeyUp);
    };
  }, [targetElement, isVisible]);

  // Removed auto-save to prevent infinite loops

  // Handle click outside to close toolbar
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on the toolbar itself
      if (toolbarRef.current && toolbarRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on the target element
      if (targetElement && targetElement.contains(target)) {
        return;
      }
      
      // Don't close if clicking on popover content or select dropdowns
      if (target.closest('[role="dialog"]') || 
          target.closest('.popover-content') ||
          target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }
      
      // Close the toolbar
      if (onClose) {
        onClose();
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, targetElement, onClose]);

  const updateActiveStates = () => {
    if (!targetElement) return;
    
    try {
      setActiveStates({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight')
      });
    } catch {
      // Fallback: check computed styles if queryCommandState fails
      if (targetElement) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
          
          if (element) {
            const computedStyle = window.getComputedStyle(element);
            setActiveStates({
              bold: computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 700,
              italic: computedStyle.fontStyle === 'italic',
              underline: computedStyle.textDecoration.includes('underline'),
              justifyLeft: computedStyle.textAlign === 'left' || computedStyle.textAlign === 'start',
              justifyCenter: computedStyle.textAlign === 'center',
              justifyRight: computedStyle.textAlign === 'right' || computedStyle.textAlign === 'end'
            });
          }
        }
      }
    }
  };

  const executeCommand = (command: string, value?: string) => {
    if (targetElement) {
      targetElement.focus();
      document.execCommand(command, false, value);
      // Update active states after command execution
      setTimeout(updateActiveStates, 10);
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
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        maxWidth: 'calc(100vw - 16px)'
      }}
    >
      {/* Text Style Controls */}
      <Button
        size="sm"
        variant={activeStates.bold ? "default" : "ghost"}
        onClick={() => executeCommand('bold')}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={activeStates.italic ? "default" : "ghost"}
        onClick={() => executeCommand('italic')}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={activeStates.underline ? "default" : "ghost"}
        onClick={() => executeCommand('underline')}
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Text Alignment */}
      <Button
        size="sm"
        variant={activeStates.justifyLeft ? "default" : "ghost"}
        onClick={() => executeCommand('justifyLeft')}
        className="h-8 w-8 p-0"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={activeStates.justifyCenter ? "default" : "ghost"}
        onClick={() => executeCommand('justifyCenter')}
        className="h-8 w-8 p-0"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={activeStates.justifyRight ? "default" : "ghost"}
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
    </div>
  );
}