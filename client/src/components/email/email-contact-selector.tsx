import { useState, useRef, useEffect } from "react";
import { X, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EmailContact } from "@shared/schema";

interface EmailContactSelectorProps {
  contacts: EmailContact[];
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function EmailContactSelector({
  contacts,
  selectedEmails,
  onChange,
  placeholder = "Type name or email...",
  disabled = false,
  label = "To:"
}: EmailContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);



  // Format contact display
  const formatContactDisplay = (contact: EmailContact) => 
    `${contact.firstName} ${contact.lastName}`;

  // Get contact email for display  
  const getContactEmail = (contact: EmailContact) => 
    contact.email || `${contact.firstName.toLowerCase()}.${contact.lastName.toLowerCase()}@example.com`;

  // Filter available contacts (not already selected)
  const availableContacts = contacts.filter(contact => {
    const email = getContactEmail(contact);
    return !selectedEmails.includes(email);
  });

  // Filter by search input
  const filteredContacts = availableContacts.filter(contact => {
    const displayName = formatContactDisplay(contact);
    const email = getContactEmail(contact);
    const searchTerm = inputValue.toLowerCase();
    
    return displayName.toLowerCase().includes(searchTerm) ||
           contact.firstName.toLowerCase().includes(searchTerm) ||
           contact.lastName.toLowerCase().includes(searchTerm) ||
           email.toLowerCase().includes(searchTerm);
  });

  const handleSelectContact = (contact: EmailContact) => {
    const email = getContactEmail(contact);
    if (!selectedEmails.includes(email)) {
      onChange([...selectedEmails, email]);
    }
    setInputValue("");
    setOpen(false);
    // Focus back to input after selection
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveEmail = (email: string) => {
    onChange(selectedEmails.filter(e => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Backspace" && inputValue === "" && selectedEmails.length > 0) {
      // Remove last selected email when backspace on empty input
      const newEmails = [...selectedEmails];
      newEmails.pop();
      onChange(newEmails);
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (filteredContacts.length > 0) {
        // Select first filtered contact on enter
        handleSelectContact(filteredContacts[0]);
      } else if (inputValue.includes('@')) {
        // Add manual email if it looks valid
        const email = inputValue.trim();
        if (email && !selectedEmails.includes(email)) {
          onChange([...selectedEmails, email]);
        }
        setInputValue("");
        setOpen(false);
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      setInputValue("");
    } else if (e.key === "," || e.key === ";") {
      // Handle comma or semicolon separation
      if (inputValue.trim()) {
        const email = inputValue.trim();
        if (email && !selectedEmails.includes(email)) {
          onChange([...selectedEmails, email]);
        }
        setInputValue("");
      }
      e.preventDefault();
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setOpen(value.length > 0);
  };

  const handleBlur = () => {
    // Delay closing to allow click events to process
    setTimeout(() => {
      // Add manual email on blur if it contains @
      if (inputValue.trim() && inputValue.includes('@')) {
        const email = inputValue.trim();
        if (!selectedEmails.includes(email)) {
          onChange([...selectedEmails, email]);
        }
        setInputValue("");
      }
      setOpen(false);
    }, 200);
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
    <div ref={containerRef} className="flex items-center px-4 py-3 border-b border-gray-100">
      <span className="text-gray-500 text-sm w-12 flex-shrink-0">{label}</span>
      <div className="flex-1">
        <div className="relative">
          <div
            className="min-h-[20px] w-full bg-transparent cursor-text flex flex-wrap gap-1 items-center"
            onClick={() => {
              if (!disabled) {
                inputRef.current?.focus();
                setOpen(true);
              }
            }}
          >
            {selectedEmails.map((email, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
              >
                {email}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEmail(email);
                    }}
                    className="ml-1 h-3 w-3 rounded-full outline-none hover:bg-blue-300 dark:hover:bg-blue-700"
                  >
                    <X className="h-2 w-2" />
                  </button>
                )}
              </Badge>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="flex-1 min-w-[120px] text-sm text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
              placeholder={selectedEmails.length === 0 ? placeholder : ""}
              disabled={disabled}
              autoComplete="email"
            />
          </div>
          
          {/* Custom dropdown positioned absolutely */}
          {open && filteredContacts.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-[9999] bg-white border border-gray-200 shadow-lg rounded-md mt-1 max-h-64 overflow-y-auto">
              <div className="py-1">
                {filteredContacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur event
                      handleSelectContact(contact);
                    }}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{formatContactDisplay(contact)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{getContactEmail(contact)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}