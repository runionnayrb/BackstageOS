import { useRef, useState, useEffect, KeyboardEvent, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Variable {
  label: string;
  value: string;
}

type Segment = 
  | { type: "text"; content: string }
  | { type: "token"; label: string; value: string };

interface TokenizedInputProps {
  value: string;
  onChange: (value: string) => void;
  variables: Variable[];
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  "data-testid"?: string;
}

function parseValueToSegments(value: string, variables: Variable[]): Segment[] {
  if (!value) return [];
  
  const segments: Segment[] = [];
  const variablePattern = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;
  
  while ((match = variablePattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: value.slice(lastIndex, match.index) });
    }
    
    const variableName = match[1];
    const variable = variables.find(v => v.label === variableName);
    segments.push({ 
      type: "token", 
      label: variableName, 
      value: match[0] 
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < value.length) {
    segments.push({ type: "text", content: value.slice(lastIndex) });
  }
  
  return segments;
}

function segmentsToValue(segments: Segment[]): string {
  return segments.map(seg => seg.type === "text" ? seg.content : seg.value).join("");
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
  const [segments, setSegments] = useState<Segment[]>(() => parseValueToSegments(value, variables));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const inputRefs = useRef<Map<number, HTMLInputElement | HTMLTextAreaElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      lastValueRef.current = value;
      return;
    }
    if (value !== lastValueRef.current) {
      const newSegments = parseValueToSegments(value, variables);
      setSegments(newSegments);
      lastValueRef.current = value;
    }
  }, [value, variables]);

  const updateValue = useCallback((newSegments: Segment[]) => {
    const consolidated: Segment[] = [];
    for (const seg of newSegments) {
      if (seg.type === "text" && consolidated.length > 0 && consolidated[consolidated.length - 1].type === "text") {
        (consolidated[consolidated.length - 1] as { type: "text"; content: string }).content += seg.content;
      } else if (seg.type === "text" && seg.content === "") {
        continue;
      } else {
        consolidated.push(seg);
      }
    }
    setSegments(consolidated.length === 0 ? [] : consolidated);
    isInternalChange.current = true;
    onChange(segmentsToValue(consolidated));
  }, [onChange]);

  const handleTextChange = (index: number, newContent: string) => {
    const newSegments = [...segments];
    if (newSegments[index]?.type === "text") {
      (newSegments[index] as { type: "text"; content: string }).content = newContent;
      updateValue(newSegments);
    }
  };

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    const segment = segments[index];
    
    if (segment?.type === "text") {
      const input = inputRefs.current.get(index);
      const cursorPos = (input as HTMLInputElement)?.selectionStart ?? 0;
      const content = segment.content;
      
      if (e.key === "Backspace" && cursorPos === 0 && index > 0) {
        const prevSeg = segments[index - 1];
        if (prevSeg?.type === "token") {
          e.preventDefault();
          const newSegments = segments.filter((_, i) => i !== index - 1);
          updateValue(newSegments);
          setTimeout(() => {
            const newIndex = index - 1;
            const input = inputRefs.current.get(newIndex);
            if (input) {
              input.focus();
              (input as HTMLInputElement).setSelectionRange(0, 0);
            }
          }, 0);
        }
      }
      
      if (e.key === "Delete" && cursorPos === content.length && index < segments.length - 1) {
        const nextSeg = segments[index + 1];
        if (nextSeg?.type === "token") {
          e.preventDefault();
          const newSegments = segments.filter((_, i) => i !== index + 1);
          updateValue(newSegments);
        }
      }
    }
  };

  const removeToken = (index: number) => {
    const newSegments = segments.filter((_, i) => i !== index);
    updateValue(newSegments);
  };

  const insertVariable = (variable: Variable) => {
    const newToken: Segment = { type: "token", label: variable.label, value: variable.value };
    
    if (segments.length === 0) {
      updateValue([newToken, { type: "text", content: "" }]);
      setTimeout(() => {
        const input = inputRefs.current.get(1);
        if (input) input.focus();
      }, 0);
      return;
    }
    
    if (focusedIndex !== null && segments[focusedIndex]?.type === "text") {
      const textSeg = segments[focusedIndex] as { type: "text"; content: string };
      const beforeCursor = textSeg.content.slice(0, cursorPosition);
      const afterCursor = textSeg.content.slice(cursorPosition);
      
      const newSegments: Segment[] = [
        ...segments.slice(0, focusedIndex),
        { type: "text", content: beforeCursor },
        newToken,
        { type: "text", content: afterCursor },
        ...segments.slice(focusedIndex + 1),
      ];
      
      updateValue(newSegments);
      
      setTimeout(() => {
        const newTextIndex = focusedIndex + 2;
        const input = inputRefs.current.get(newTextIndex);
        if (input) {
          input.focus();
          (input as HTMLInputElement).setSelectionRange(0, 0);
        }
      }, 0);
    } else {
      const newSegments = [...segments, newToken, { type: "text", content: "" }];
      updateValue(newSegments);
      
      setTimeout(() => {
        const lastIndex = newSegments.length - 1;
        const input = inputRefs.current.get(lastIndex);
        if (input) input.focus();
      }, 0);
    }
  };

  const trackCursorPosition = (index: number) => {
    const input = inputRefs.current.get(index);
    if (input) {
      setCursorPosition((input as HTMLInputElement).selectionStart ?? 0);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      if (segments.length === 0) {
        updateValue([{ type: "text", content: "" }]);
        setTimeout(() => {
          const input = inputRefs.current.get(0);
          if (input) input.focus();
        }, 0);
      } else {
        const lastIndex = segments.length - 1;
        const lastSeg = segments[lastIndex];
        if (lastSeg.type === "text") {
          const input = inputRefs.current.get(lastIndex);
          if (input) input.focus();
        } else {
          const newSegments = [...segments, { type: "text", content: "" }];
          updateValue(newSegments);
          setTimeout(() => {
            const input = inputRefs.current.get(segments.length);
            if (input) input.focus();
          }, 0);
        }
      }
    }
  };

  const isEmpty = segments.length === 0 || (segments.length === 1 && segments[0].type === "text" && segments[0].content === "");

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        data-testid={testId}
        className={cn(
          "flex flex-wrap items-center gap-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-text",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          multiline ? "min-h-[100px] items-start" : "min-h-[40px]",
          className
        )}
      >
        {isEmpty && !focusedIndex && focusedIndex !== 0 && (
          <span className="text-muted-foreground pointer-events-none">{placeholder}</span>
        )}
        {segments.map((segment, index) => {
          if (segment.type === "token") {
            return (
              <Badge
                key={`token-${index}`}
                variant="outline"
                className="flex items-center gap-1 text-xs py-0.5 px-2"
              >
                {segment.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToken(index);
                  }}
                  className="ml-0.5 hover:text-destructive focus:outline-none"
                  data-testid={`btn-remove-token-${index}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          } else {
            const InputComponent = multiline ? "textarea" : "input";
            return (
              <InputComponent
                key={`text-${index}`}
                ref={(el) => {
                  if (el) inputRefs.current.set(index, el);
                  else inputRefs.current.delete(index);
                }}
                type={multiline ? undefined : "text"}
                value={segment.content}
                onChange={(e) => handleTextChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onKeyUp={() => trackCursorPosition(index)}
                onClick={() => trackCursorPosition(index)}
                onSelect={() => trackCursorPosition(index)}
                onFocus={() => {
                  setFocusedIndex(index);
                  trackCursorPosition(index);
                }}
                onBlur={() => setFocusedIndex(null)}
                className={cn(
                  "flex-1 min-w-[20px] bg-transparent border-none outline-none text-sm p-0 focus:ring-0",
                  multiline && "resize-none"
                )}
                style={{ 
                  width: Math.max(20, (segment.content.length + 1) * 8) + "px",
                }}
                data-testid={`input-text-segment-${index}`}
              />
            );
          }
        })}
        {segments.length === 0 && (
          <input
            ref={(el) => {
              if (el) inputRefs.current.set(0, el);
              else inputRefs.current.delete(0);
            }}
            type="text"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                updateValue([{ type: "text", content: e.target.value }]);
              }
            }}
            onFocus={() => {
              setFocusedIndex(0);
              setCursorPosition(0);
            }}
            onBlur={() => setFocusedIndex(null)}
            className="flex-1 min-w-[20px] bg-transparent border-none outline-none text-sm p-0 focus:ring-0"
            data-testid="input-text-segment-empty"
          />
        )}
      </div>
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
    </div>
  );
}
