import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bold, Italic, Underline, Type, Palette } from 'lucide-react';

interface EditableHeaderFooterProps {
  content: string;
  onChange: (newContent: string) => void;
  className?: string;
  projectId: string;
  type: 'header' | 'footer';
}

export default function EditableHeaderFooter({ 
  content,
  onChange,
  className = "text-sm font-medium text-gray-700 mb-1",
  projectId,
  type
}: EditableHeaderFooterProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Query to fetch show settings
  const { data: showSettings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId
  });

  // Process content to replace variables
  const processRichContent = (content: string) => {
    if (!content) return '';
    return content
      .replace(/\{\{showName\}\}/g, 'Test Production')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{pageNumber\}\}/g, '1')
      .replace(/\{\{totalPages\}\}/g, '5');
  };

  // Apply formatting from settings
  const applyFormattingToElement = (element: HTMLElement, formatting: any) => {
    if (!element || !formatting) return;
    
    element.style.color = formatting.color || '';
    element.style.fontSize = formatting.fontSize || '';
    element.style.fontWeight = formatting.fontWeight || '';
    element.style.fontStyle = formatting.fontStyle || '';
    element.style.textAlign = formatting.textAlign || '';
    element.style.fontFamily = formatting.fontFamily || '';
    element.style.textDecoration = formatting.textDecoration || '';
    element.style.backgroundColor = formatting.backgroundColor || '';
  };

  return (
    <>
      <div className="relative">
        <div
          ref={headerRef}
          className={className}
          contentEditable
          suppressContentEditableWarning
          data-template-header={type === 'header' ? "true" : undefined}
          data-template-footer={type === 'footer' ? "true" : undefined}
          onClick={() => {
            console.log(`🎯 ${type.toUpperCase()} CLICKED - Setting up for editing`);
            setShowToolbar(true);
          }}
          onFocus={() => {
            console.log(`🎯 ${type.toUpperCase()} FOCUSED - Setting up for editing`);
          }}
          onBlur={() => {
            const newContent = headerRef.current?.textContent || '';
            onChange(newContent);
          }}
          dangerouslySetInnerHTML={{
            __html: processRichContent(content).replace(/\n/g, '<br>')
          }}
          style={{
            minHeight: '24px',
            border: 'none',
            outline: 'none',
            ...(showSettings?.[type === 'header' ? 'headerFormatting' : 'footerFormatting'] && {
              color: showSettings[type === 'header' ? 'headerFormatting' : 'footerFormatting'].color,
              fontSize: showSettings[type === 'header' ? 'headerFormatting' : 'footerFormatting'].fontSize,
              fontWeight: showSettings[type === 'header' ? 'headerFormatting' : 'footerFormatting'].fontWeight,
              fontStyle: showSettings[type === 'header' ? 'headerFormatting' : 'footerFormatting'].fontStyle,
              textAlign: showSettings[type === 'header' ? 'headerFormatting' : 'footerFormatting'].textAlign,
              fontFamily: showSettings[type === 'header' ? 'headerFormatting' : 'footerFormatting'].fontFamily,
              textDecoration: showSettings[type === 'header' ? 'headerFormatting' : 'footerFormatting'].textDecoration,
              backgroundColor: showSettings[type === 'header' ? 'headerFormatting' : 'footerFormatting'].backgroundColor,
            })
          }}
        />
      </div>

      {/* Formatting Toolbar using Popover like department headers */}
      <Popover open={showToolbar} onOpenChange={setShowToolbar}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setShowToolbar(true);
            }}
          >
            <Type className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.execCommand('bold')}
                className="px-2"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.execCommand('italic')}
                className="px-2"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.execCommand('underline')}
                className="px-2"
              >
                <Underline className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                onChange={(e) => document.execCommand('foreColor', false, e.target.value)}
                className="w-8 h-8 border rounded cursor-pointer"
                title="Text Color"
              />
              <Button
                onClick={() => setShowToolbar(false)}
                variant="outline"
                size="sm"
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Debug info */}
      <div className="text-xs text-gray-500 mt-1">
        Debug: showToolbar = {showToolbar.toString()}, type = {type}
      </div>
    </>
  );
}