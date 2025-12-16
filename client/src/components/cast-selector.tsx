import { useState, useRef, useEffect } from "react";
import { X, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Contact, ContactGroup } from "@shared/schema";

// Extended contact type with contactGroup included (from storage layer join)
type ContactWithGroup = Contact & {
  contactGroup?: ContactGroup | null;
};

interface CastSelectorProps {
  contacts: ContactWithGroup[];
  selectedCast: string[];
  onChange: (cast: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CastSelector({
  contacts,
  selectedCast,
  onChange,
  placeholder = "Type to search cast members...",
  disabled = false
}: CastSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter contacts to only cast members (contacts in "Cast" group)
  const castMembers = contacts.filter(contact => contact.contactGroup?.name === 'Cast');
  
  // Format contact name consistently with daily calls display
  const formatContactName = (contact: ContactWithGroup) => 
    `${contact.firstName.charAt(0)}. ${contact.lastName}`;

  // Filter available cast members (not already selected)
  const availableCastMembers = castMembers.filter(contact => {
    const displayName = formatContactName(contact);
    return !selectedCast.includes(displayName);
  });

  // Filter by search input
  const filteredCastMembers = availableCastMembers.filter(contact => {
    const displayName = formatContactName(contact);
    return displayName.toLowerCase().includes(inputValue.toLowerCase()) ||
           contact.firstName.toLowerCase().includes(inputValue.toLowerCase()) ||
           contact.lastName.toLowerCase().includes(inputValue.toLowerCase());
  });

  const handleSelectCast = (contact: ContactWithGroup) => {
    const displayName = formatContactName(contact);
    if (!selectedCast.includes(displayName)) {
      onChange([...selectedCast, displayName]);
    }
    setInputValue("");
    setOpen(false);
    // Focus back to input after selection
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveCast = (castName: string) => {
    onChange(selectedCast.filter(name => name !== castName));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Backspace" && inputValue === "" && selectedCast.length > 0) {
      // Remove last selected cast member when backspace on empty input
      const newCast = [...selectedCast];
      newCast.pop();
      onChange(newCast);
      e.preventDefault();
    } else if (e.key === "Enter" && filteredCastMembers.length > 0) {
      // Select first filtered cast member on enter
      handleSelectCast(filteredCastMembers[0]);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      setInputValue("");
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setOpen(value.length > 0 && filteredCastMembers.length > 0);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={`min-h-[38px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => {
              if (!disabled) {
                inputRef.current?.focus();
                setOpen(true);
              }
            }}
          >
            <div className="flex flex-wrap gap-1 items-center">
              {selectedCast.map((castName, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                >
                  {castName}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCast(castName);
                      }}
                      className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedCast.length === 0 ? placeholder : ""}
                disabled={disabled}
                className="flex-1 min-w-[120px] border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ boxShadow: 'none' }}
              />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandList>
              {filteredCastMembers.length === 0 ? (
                <CommandEmpty>
                  {inputValue ? "No cast members found." : "No available cast members."}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredCastMembers.map((contact) => {
                    const fullName = `${contact.firstName} ${contact.lastName}`;
                    return (
                      <CommandItem
                        key={contact.id}
                        onSelect={() => handleSelectCast(contact)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{fullName}</span>
                          {contact.role && (
                            <span className="text-xs text-muted-foreground">
                              {contact.role.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Helper text */}
      <div className="text-xs text-muted-foreground mt-1">
        {selectedCast.length > 0 && (
          <span>{selectedCast.length} cast member{selectedCast.length !== 1 ? 's' : ''} selected</span>
        )}
        {!disabled && (
          <span className="ml-2">
            Type to search • Enter to select • Backspace to remove
          </span>
        )}
      </div>
    </div>
  );
}