import { useRef, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Variable {
  label: string;
  value: string;
}

interface TokenizedInputProps {
  value: string;
  onChange: (value: string) => void;
  variables: Variable[];
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function TokenizedInput({
  value,
  onChange,
  variables,
  placeholder,
  multiline = false,
  className,
  "data-testid": testId,
}: TokenizedInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  const parseContentToHTML = useCallback((text: string): string => {
    if (!text) return "";
    
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let result = text;
    let match;
    
    while ((match = variablePattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const variableName = match[1];
      const badgeHTML = `<span class="variable-badge" contenteditable="false" data-variable="${fullMatch}">${variableName}</span>`;
      result = result.replace(fullMatch, badgeHTML);
    }
    
    return result;
  }, []);

  const parseHTMLToContent = useCallback((element: HTMLElement): string => {
    let result = "";
    
    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.classList.contains("variable-badge")) {
          result += el.getAttribute("data-variable") || "";
        } else if (el.tagName === "BR") {
          result += "\n";
        } else if (el.tagName === "DIV" || el.tagName === "P") {
          if (result.length > 0 && !result.endsWith("\n")) {
            result += "\n";
          }
          result += parseHTMLToContent(el);
        } else {
          result += parseHTMLToContent(el);
        }
      }
    });
    
    return result;
  }, []);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const html = parseContentToHTML(value);
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
    isInternalChange.current = false;
  }, [value, parseContentToHTML]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const newValue = parseHTMLToContent(editorRef.current);
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      
      if (range.collapsed) {
        const container = range.startContainer;
        const offset = range.startOffset;

        if (e.key === "Backspace") {
          if (container.nodeType === Node.TEXT_NODE && offset === 0) {
            const prevSibling = container.previousSibling;
            if (prevSibling && (prevSibling as HTMLElement).classList?.contains("variable-badge")) {
              e.preventDefault();
              prevSibling.remove();
              handleInput();
              return;
            }
          }
          
          if (container.nodeType === Node.ELEMENT_NODE) {
            const element = container as HTMLElement;
            const childNodes = Array.from(element.childNodes);
            if (offset > 0 && childNodes[offset - 1]) {
              const prevNode = childNodes[offset - 1] as HTMLElement;
              if (prevNode.classList?.contains("variable-badge")) {
                e.preventDefault();
                prevNode.remove();
                handleInput();
                return;
              }
            }
          }
        }

        if (e.key === "Delete") {
          if (container.nodeType === Node.TEXT_NODE && offset === (container.textContent?.length || 0)) {
            const nextSibling = container.nextSibling;
            if (nextSibling && (nextSibling as HTMLElement).classList?.contains("variable-badge")) {
              e.preventDefault();
              nextSibling.remove();
              handleInput();
              return;
            }
          }
          
          if (container.nodeType === Node.ELEMENT_NODE) {
            const element = container as HTMLElement;
            const childNodes = Array.from(element.childNodes);
            if (childNodes[offset]) {
              const nextNode = childNodes[offset] as HTMLElement;
              if (nextNode.classList?.contains("variable-badge")) {
                e.preventDefault();
                nextNode.remove();
                handleInput();
                return;
              }
            }
          }
        }
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const insertVariable = (variable: Variable) => {
    if (editorRef.current) {
      editorRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const badge = document.createElement("span");
        badge.className = "variable-badge";
        badge.contentEditable = "false";
        badge.setAttribute("data-variable", variable.value);
        badge.textContent = variable.label;
        
        range.insertNode(badge);
        
        range.setStartAfter(badge);
        range.setEndAfter(badge);
        selection.removeAllRanges();
        selection.addRange(range);
        
        isInternalChange.current = true;
        const newValue = parseHTMLToContent(editorRef.current);
        onChange(newValue);
      } else {
        onChange(value + variable.value);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-testid={testId}
        data-placeholder={placeholder}
        className={cn(
          "tokenized-input",
          "flex flex-wrap items-center gap-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          multiline ? "min-h-[100px] whitespace-pre-wrap" : "min-h-[40px]",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
          className
        )}
      />
      <div className="flex flex-wrap gap-1.5">
        {variables.map((variable) => (
          <Badge
            key={variable.value}
            variant="outline"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
            onClick={() => insertVariable(variable)}
            data-testid={`btn-insert-${variable.label.toLowerCase().replace(/\s/g, "-")}`}
          >
            {variable.label}
          </Badge>
        ))}
      </div>
      <style>{`
        .tokenized-input .variable-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 9999px;
          border: 1px solid hsl(var(--input));
          background-color: transparent;
          color: hsl(var(--foreground));
          cursor: default;
          user-select: none;
          margin: 0 0.125rem;
          vertical-align: middle;
        }
        .tokenized-input:empty:before {
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
