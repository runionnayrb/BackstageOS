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

      {/* Debug Formatting Toolbar - positioned relative to footer */}
      {showToolbar && (
        <div className="absolute top-full left-0 mt-2 z-[9999] bg-red-500 text-white border-4 border-yellow-400 rounded-lg shadow-2xl p-4 flex flex-wrap items-center gap-2 min-w-[400px]">
          <div className="text-lg font-bold">{type.charAt(0).toUpperCase() + type.slice(1)} Formatting Toolbar</div>
          <div className="text-lg bg-green-300 text-black px-3 py-2 rounded font-bold">✅ TOOLBAR IS WORKING!</div>
          <button
            onClick={() => {
              console.log(`🎯 ${type.toUpperCase()} TOOLBAR CLOSE CLICKED`);
              setShowToolbar(false);
            }}
            className="ml-2 px-3 py-2 text-lg bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
          >
            CLOSE
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