import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface EditableHeaderFooterProps {
  content: string;
  onChange: (newContent: string) => void;
  className?: string;
  projectId: string;
  type: 'header' | 'footer';
  effectiveEditMode: boolean;
}

export default function EditableHeaderFooter({ 
  content,
  onChange,
  className = "text-sm font-medium text-gray-700 mb-1",
  projectId,
  type,
  effectiveEditMode
}: EditableHeaderFooterProps) {
  const headerRef = useRef<HTMLDivElement>(null);

  // Query to fetch show settings
  const { data: showSettings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
    enabled: !!projectId
  });

  // Process content to replace variables
  const processRichContent = (content: string) => {
    if (!content) return '';
    
    // Calculate actual page count based on content height
    // For template editing, assume 1 page unless content is very long
    const estimatedPages = 1;
    
    return content
      .replace(/\{\{showName\}\}/g, 'Test Production')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{pageNumber\}\}/g, '1')
      .replace(/\{\{totalPages\}\}/g, String(estimatedPages));
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
      <div className="relative group">
        <div
          ref={headerRef}
          className={className}
          contentEditable={effectiveEditMode}
          suppressContentEditableWarning
          data-template-header={type === 'header' ? "true" : undefined}
          data-template-footer={type === 'footer' ? "true" : undefined}

          onInput={(e) => {
            if (effectiveEditMode) {
              const newContent = e.currentTarget.textContent || '';
              onChange(newContent);
            }
          }}
          onBlur={() => {
            if (effectiveEditMode) {
              const newContent = headerRef.current?.textContent || '';
              onChange(newContent);
            }
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

      {/* No inline formatting toolbar - all formatting handled by global settings */}
    </>
  );
}