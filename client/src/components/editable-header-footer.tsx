import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import InlineFormattingToolbar from './inline-formatting-toolbar';

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
      <div className="relative group">
        <div
          ref={headerRef}
          className={className}
          contentEditable={effectiveEditMode}
          suppressContentEditableWarning
          data-template-header={type === 'header' ? "true" : undefined}
          data-template-footer={type === 'footer' ? "true" : undefined}
          onClick={() => {
            if (effectiveEditMode) {
              console.log(`🎯 ${type.toUpperCase()} CLICKED - Setting up for editing`);
              setShowToolbar(true);
            }
          }}
          onFocus={() => {
            if (effectiveEditMode) {
              console.log(`🎯 ${type.toUpperCase()} FOCUSED - Setting up for editing`);
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

      {/* Use the working InlineFormattingToolbar - only show in edit mode */}
      {effectiveEditMode && (
        <InlineFormattingToolbar
          targetElement={showToolbar ? headerRef.current : null}
          isVisible={showToolbar}
          onAutoSave={async () => {
          if (headerRef.current) {
            const newContent = headerRef.current.textContent || '';
            onChange(newContent);
            
            // Capture and save formatting to database
            const computedStyle = window.getComputedStyle(headerRef.current);
            const formatting = {
              color: computedStyle.color,
              fontSize: computedStyle.fontSize,
              fontWeight: computedStyle.fontWeight,
              fontStyle: computedStyle.fontStyle,
              textAlign: computedStyle.textAlign,
              fontFamily: computedStyle.fontFamily,
              textDecoration: computedStyle.textDecoration,
              backgroundColor: computedStyle.backgroundColor,
            };
            
            // Save formatting to database
            try {
              const endpoint = type === 'header' ? 'header-formatting' : 'footer-formatting';
              const response = await fetch(`/api/projects/${projectId}/settings/${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formatting })
              });
              
              if (response.ok) {
                console.log(`${type} formatting saved successfully`);
                // Invalidate cache to reload updated formatting
                queryClient.invalidateQueries({
                  queryKey: ['/api/projects', projectId, 'settings']
                });
              }
            } catch (error) {
              console.error(`Error saving ${type} formatting:`, error);
            }
          }
        }}
          showVariables={true} // Show variables for both headers and footers
          onClose={() => setShowToolbar(false)}
        />
      )}
    </>
  );
}