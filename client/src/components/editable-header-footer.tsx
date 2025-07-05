import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

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

      {/* Formatting Toolbar with actual formatting controls */}
      {showToolbar && (
        <div className="absolute top-full left-0 mt-2 z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex flex-wrap items-center gap-2 min-w-[500px]">
          {/* Bold Button */}
          <button
            onClick={() => {
              document.execCommand('bold');
              console.log(`🎯 ${type.toUpperCase()} BOLD APPLIED`);
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border rounded font-bold"
          >
            B
          </button>
          
          {/* Italic Button */}
          <button
            onClick={() => {
              document.execCommand('italic');
              console.log(`🎯 ${type.toUpperCase()} ITALIC APPLIED`);
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border rounded italic"
          >
            I
          </button>
          
          {/* Underline Button */}
          <button
            onClick={() => {
              document.execCommand('underline');
              console.log(`🎯 ${type.toUpperCase()} UNDERLINE APPLIED`);
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 border rounded underline"
          >
            U
          </button>
          
          <div className="h-4 w-px bg-gray-300 mx-2"></div>
          
          {/* Font Size */}
          <select 
            onChange={(e) => {
              document.execCommand('fontSize', false, e.target.value);
              console.log(`🎯 ${type.toUpperCase()} FONT SIZE ${e.target.value} APPLIED`);
            }}
            className="px-2 py-1 text-sm border rounded"
          >
            <option value="1">Small</option>
            <option value="3" selected>Normal</option>
            <option value="5">Large</option>
            <option value="7">X-Large</option>
          </select>
          
          {/* Text Color */}
          <input
            type="color"
            onChange={(e) => {
              document.execCommand('foreColor', false, e.target.value);
              console.log(`🎯 ${type.toUpperCase()} COLOR ${e.target.value} APPLIED`);
            }}
            className="w-8 h-8 border rounded cursor-pointer"
            title="Text Color"
          />
          
          <div className="h-4 w-px bg-gray-300 mx-2"></div>
          
          {/* Close Button */}
          <button
            onClick={() => {
              console.log(`🎯 ${type.toUpperCase()} TOOLBAR CLOSED`);
              setShowToolbar(false);
            }}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Done
          </button>
        </div>
      )}
      
      {/* Debug info */}
      <div className="text-xs text-gray-500 mt-1">
        Debug: showToolbar = {showToolbar.toString()}, type = {type}
      </div>
    </>
  );
}