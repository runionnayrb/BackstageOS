import { useState } from "react";
import { 
  Bold, Italic, Strikethrough, List, ListOrdered, Quote, 
  Type, Hash, Minus, Check, Link2, Image, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface MobileFormattingToolbarProps {
  editor: any;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileFormattingToolbar({ editor, isOpen, onClose }: MobileFormattingToolbarProps) {
  const [activeCategory, setActiveCategory] = useState<"text" | "lists" | "structure">("text");

  if (!editor) return null;

  const categories = {
    text: {
      title: "Text Formatting",
      icon: Type,
      tools: [
        {
          icon: Bold,
          label: "Bold",
          isActive: () => editor.isActive('bold'),
          action: () => editor.chain().focus().toggleBold().run(),
        },
        {
          icon: Italic,
          label: "Italic",
          isActive: () => editor.isActive('italic'),
          action: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          icon: Strikethrough,
          label: "Strike",
          isActive: () => editor.isActive('strike'),
          action: () => editor.chain().focus().toggleStrike().run(),
        },
      ]
    },
    lists: {
      title: "Lists & Tasks",
      icon: List,
      tools: [
        {
          icon: List,
          label: "Bullet List",
          isActive: () => editor.isActive('bulletList'),
          action: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          icon: ListOrdered,
          label: "Numbered List",
          isActive: () => editor.isActive('orderedList'),
          action: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          icon: Check,
          label: "Task List",
          isActive: () => editor.isActive('taskList'),
          action: () => editor.chain().focus().toggleTaskList().run(),
        },
      ]
    },
    structure: {
      title: "Structure",
      icon: Hash,
      tools: [
        {
          icon: Hash,
          label: "Heading 1",
          isActive: () => editor.isActive('heading', { level: 1 }),
          action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          icon: Hash,
          label: "Heading 2",
          isActive: () => editor.isActive('heading', { level: 2 }),
          action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          icon: Quote,
          label: "Quote",
          isActive: () => editor.isActive('blockquote'),
          action: () => editor.chain().focus().toggleBlockquote().run(),
        },
        {
          icon: Minus,
          label: "Divider",
          isActive: () => false,
          action: () => editor.chain().focus().setHorizontalRule().run(),
        },
      ]
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[60vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            Formatting
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        {/* Category tabs */}
        <div className="flex border-b mb-4">
          {Object.entries(categories).map(([key, category]) => {
            const IconComponent = category.icon;
            return (
              <Button
                key={key}
                variant={activeCategory === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveCategory(key as any)}
                className="flex-1 flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{category.title}</span>
              </Button>
            );
          })}
        </div>

        {/* Tools grid */}
        <div className="grid grid-cols-3 gap-3">
          {categories[activeCategory].tools.map((tool, index) => {
            const IconComponent = tool.icon;
            return (
              <Button
                key={index}
                variant={tool.isActive() ? "default" : "outline"}
                size="lg"
                onClick={() => {
                  tool.action();
                  // Don't close immediately, let user make multiple changes
                }}
                className="h-16 flex flex-col items-center gap-2 text-xs"
              >
                <IconComponent className="h-5 w-5" />
                <span>{tool.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Quick actions at bottom */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="flex-1"
            >
              Redo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}