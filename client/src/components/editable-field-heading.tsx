import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import InlineFormattingToolbar from "./inline-formatting-toolbar";

interface EditableFieldHeadingProps {
  content: string;
  onChange: (newContent: string) => void;
  className?: string;
}

export default function EditableFieldHeading({ 
  content, 
  onChange, 
  className = "text-sm font-medium text-gray-700 mb-1" 
}: EditableFieldHeadingProps) {
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  return (
    <>
      <div className="relative group">
        <div 
          className={`${className} cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[24px] outline-none`}
          contentEditable
          suppressContentEditableWarning
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
      />
    </>
  );
}