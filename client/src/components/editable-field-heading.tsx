import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import InlineFormattingToolbar from "./inline-formatting-toolbar";

interface EditableFieldHeadingProps {
  content: string;
  onChange: (newContent: string) => void;
  className?: string;
  onApplyToAll?: () => void;
}

export default function EditableFieldHeading({ 
  content, 
  onChange, 
  className = "text-sm font-medium text-gray-700 mb-1",
  onApplyToAll
}: EditableFieldHeadingProps) {
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  const applyFormattingToAllHeaders = () => {
    console.log('🔥 APPLY TO ALL CLICKED!!! 🔥');
    alert('Apply to All function called!');
    
    if (!editingElement) {
      console.log('❌ No editing element');
      alert('No editing element found');
      return;
    }

    console.log('Apply to All: Starting with element:', editingElement);

    // Get all computed styles from the current element
    const computedStyle = window.getComputedStyle(editingElement);
    const styles = {
      fontWeight: computedStyle.fontWeight,
      fontStyle: computedStyle.fontStyle,
      textDecoration: computedStyle.textDecoration,
      textAlign: computedStyle.textAlign,
      fontFamily: computedStyle.fontFamily,
      fontSize: computedStyle.fontSize,
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
    };

    console.log('Apply to All: Extracted styles:', styles);

    // Find only header elements: field headings, department headers, template headers/footers
    const headerSelectors = [
      '[data-field-heading]',           // Field headings
      '[data-department-header]',       // Department headers
      '[data-template-header]',         // Template headers
      '[data-template-footer]',         // Template footers
      '.editable-field-heading',        // Field heading class
      '.editable-department-header'     // Department header class
    ];
    
    let totalUpdated = 0;
    headerSelectors.forEach(selector => {
      const headerElements = document.querySelectorAll(selector);
      console.log(`Apply to All: Found ${headerElements.length} elements for selector "${selector}"`);
      
      headerElements.forEach((element) => {
        if (element !== editingElement) {
          const htmlElement = element as HTMLElement;
          console.log('Apply to All: Updating element:', htmlElement);
          Object.entries(styles).forEach(([property, value]) => {
            const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
            htmlElement.style.setProperty(cssProperty, value);
            console.log(`Apply to All: Set ${cssProperty} = ${value}`);
          });
          totalUpdated++;
        }
      });
    });

    console.log(`Apply to All: Updated ${totalUpdated} header elements`);
    alert(`Updated ${totalUpdated} header elements`);
  };

  return (
    <>
      <div className="relative group">
        <div 
          className={`${className} cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[24px] outline-none editable-field-heading`}
          contentEditable
          suppressContentEditableWarning
          data-field-heading="true"
          onClick={(e) => {
            setEditingElement(e.currentTarget);
            setShowToolbar(true);
            // Set content for editing
            e.currentTarget.innerHTML = content.replace(/\n/g, '<br>');
          }}
          onBlur={(e) => {
            if (!showToolbar) {
              const newContent = e.currentTarget.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
              onChange(newContent);
            }
          }}
          dangerouslySetInnerHTML={{
            __html: content.replace(/\n/g, '<br>')
          }}
        />
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge variant="secondary" className="text-xs">Click to edit</Badge>
        </div>
      </div>

      {/* Inline Formatting Toolbar */}
      <InlineFormattingToolbar
        targetElement={editingElement}
        isVisible={showToolbar}
        onSave={() => {
          if (editingElement) {
            const content = editingElement.innerHTML.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
            onChange(content);
          }
          setShowToolbar(false);
          setEditingElement(null);
        }}
        onCancel={() => {
          setShowToolbar(false);
          setEditingElement(null);
          if (editingElement) {
            editingElement.blur();
          }
        }}
        onApplyToAll={onApplyToAll || applyFormattingToAllHeaders}
      />
    </>
  );
}