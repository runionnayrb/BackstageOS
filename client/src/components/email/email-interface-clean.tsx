import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Star, Archive, Reply, ReplyAll, Forward, Trash2, Check, X, Mail, MailOpen, FolderOpen, User, Folder, Send, File, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { EmailAccountConfig } from './email-account-config';
import { GmailEmailComposer } from './gmail-email-composer';
import { EmailMessage } from '@shared/schema';

interface EmailAccount {
  id: number;
  emailAddress: string;
  accountType: string;
  isDefault: boolean;
}

interface EmailInterfaceProps {
  selectedAccount: EmailAccount;
  onBack?: () => void;
  showCompose?: boolean;
  onShowComposeChange?: (show: boolean) => void;
  activeFolder?: string;
  showTheaterFeatures?: boolean;
  onShowTheaterFeaturesChange?: (show: boolean) => void;
  composeToEmail?: string;
  selectedMessages?: Set<number>;
  onSelectedMessagesChange?: (messages: Set<number>) => void;
  onFilteredMessagesChange?: (messages: any[]) => void;
  onReply?: (message: any, mode?: 'reply' | 'replyAll' | 'forward') => void;
  isSidebarCollapsed?: boolean;
}

// Utility function to extract display name from email address
const getDisplayName = (emailAddress: string): string => {
  if (!emailAddress) return 'Unknown';
  
  // Check if email has display name format: "Display Name <email@domain.com>"
  const displayNameMatch = emailAddress.match(/^(.+?)\s*<.*>$/);
  if (displayNameMatch) {
    return displayNameMatch[1].replace(/['"]/g, '').trim();
  }
  
  // Extract name from email address before @ symbol
  const localPart = emailAddress.split('@')[0];
  
  // Handle common name patterns
  const nameParts = localPart.split(/[._-]/);
  if (nameParts.length >= 2) {
    // Capitalize first letter of each part
    return nameParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Single name - capitalize first letter
  return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
};

// Utility function to extract clean email address
const getEmailAddress = (emailAddress: string): string => {
  if (!emailAddress) return '';
  
  // Extract email from "Display Name <email@domain.com>" format
  const emailMatch = emailAddress.match(/<(.+?)>/);
  if (emailMatch) {
    return emailMatch[1];
  }
  
  return emailAddress;
};

// Utility function to clean email snippet/preview content
const cleanEmailPreview = (content: string): string => {
  if (!content) return '';
  
  // Remove HTML tags
  let cleaned = content.replace(/<[^>]*>/g, ' ');
  
  // Remove CSS-like patterns (common in email snippets)
  cleaned = cleaned.replace(/\{[^}]*\}/g, ' ');
  cleaned = cleaned.replace(/[a-zA-Z-]+\s*:\s*[^;]+;/g, ' ');
  cleaned = cleaned.replace(/@(media|import|font-face)[^{]*\{[^}]*\}/gi, ' ');
  cleaned = cleaned.replace(/\.(awl|abml|link)[a-z0-9-]*\s*[a-zA-Z{]/gi, ' ');
  
  // Remove CSS selectors and properties
  cleaned = cleaned.replace(/\*\{[^}]*\}/g, ' ');
  cleaned = cleaned.replace(/\b(color|background|font-family|font-size|margin|padding|border|text-decoration|width|height|max-width):\s*[^;{}]+[;{}]/gi, ' ');
  
  // Remove URLs and email-like patterns in CSS context
  cleaned = cleaned.replace(/url\([^)]*\)/gi, ' ');
  
  // Remove remaining CSS artifacts
  cleaned = cleaned.replace(/![a-z]+;?/gi, ' ');
  cleaned = cleaned.replace(/\d+px|\d+%|\d+em/g, ' ');
  
  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

// Simple name display with tooltip showing email address
interface ContactPreviewProps {
  emailAddress: string;
  children: React.ReactNode;
}

function ContactPreview({ emailAddress, children }: ContactPreviewProps) {
  const cleanEmail = getEmailAddress(emailAddress);
  
  return (
    <span 
      className="hover:text-blue-600 transition-colors cursor-help"
      title={cleanEmail}
    >
      {children}
    </span>
  );
}

export function EmailInterface({ selectedAccount, onBack, showCompose, onShowComposeChange, activeFolder = "inbox", showTheaterFeatures, onShowTheaterFeaturesChange, composeToEmail, selectedMessages: propSelectedMessages, onSelectedMessagesChange, onFilteredMessagesChange, onReply, isSidebarCollapsed = false }: EmailInterfaceProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalEmail, setModalEmail] = useState<EmailMessage | null>(null);
  const [emailModalClosing, setEmailModalClosing] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(false);
  // Use prop selectedMessages or fallback to local state
  const selectedMessages = propSelectedMessages || new Set<number>();
  const setSelectedMessages = onSelectedMessagesChange || (() => {});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{ messageIds: number[]; action: string; targetFolder?: string } | null>(null);

  const [moveDropdownOpen, setMoveDropdownOpen] = useState<number | null>(null);
  const [bulkMoveDropdownOpen, setBulkMoveDropdownOpen] = useState(false);
  
  // Scroll detection state
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile swipe state
  const [swipeState, setSwipeState] = useState<{
    messageId: number | null;
    startX: number;
    currentX: number;
    isDragging: boolean;
    direction: 'left' | 'right' | null;
  }>({
    messageId: null,
    startX: 0,
    currentX: 0,
    isDragging: false,
    direction: null
  });
  
  // Long press state for selection mode
  const [longPressState, setLongPressState] = useState<{
    messageId: number | null;
    timer: NodeJS.Timeout | null;
    startTime: number;
    triggered: boolean;
  }>({
    messageId: null,
    timer: null,
    startTime: 0,
    triggered: false
  });
  
  // Keep track of revealed action states
  const [revealedActions, setRevealedActions] = useState<{
    messageId: number | null;
    type: 'move' | 'archive' | 'both' | null;
  }>({
    messageId: null,
    type: null
  });
  const [forwardMessage, setForwardMessage] = useState<EmailMessage | null>(null);
  const [replyMessage, setReplyMessage] = useState<EmailMessage | null>(null);
  const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'replyAll' | 'forward'>('compose');
  const queryClient = useQueryClient();

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressState.timer) {
        clearTimeout(longPressState.timer);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [longPressState.timer]);

  // Mobile swipe handlers with long press detection
  const handleTouchStart = (e: React.TouchEvent, messageId: number) => {
    if (isSelectionMode || isScrolling) return; // Don't allow swipe during scrolling
    
    const touch = e.touches[0];
    const startTime = Date.now();
    
    // Clear any existing long press timer
    if (longPressState.timer) {
      clearTimeout(longPressState.timer);
    }
    
    // Set up long press timer (500ms for long press)
    const timer = setTimeout(() => {
      // Trigger selection mode and select the current message
      setIsSelectionMode(true);
      setSelectedMessages(new Set([messageId]));
      setLongPressState(prev => ({ ...prev, triggered: true }));
      
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
    
    setLongPressState({
      messageId,
      timer,
      startTime,
      triggered: false
    });
    
    setSwipeState({
      messageId,
      startX: touch.clientX,
      currentX: touch.clientX,
      isDragging: true,
      direction: null
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeState.isDragging || isSelectionMode || isScrolling) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    const direction = deltaX < 0 ? 'left' : 'right';
    
    // Cancel long press if the user moves their finger (indicating swipe gesture)
    if (Math.abs(deltaX) > 10 && longPressState.timer && !longPressState.triggered) {
      clearTimeout(longPressState.timer);
      setLongPressState(prev => ({ ...prev, timer: null }));
    }
    
    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      direction
    }));
    
    // Prevent scrolling during swipe
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clean up long press timer
    if (longPressState.timer) {
      clearTimeout(longPressState.timer);
      setLongPressState(prev => ({ ...prev, timer: null }));
    }
    
    // If long press was triggered, don't process swipe actions
    if (longPressState.triggered) {
      setLongPressState(prev => ({ ...prev, triggered: false, messageId: null }));
      setSwipeState(prev => ({ ...prev, isDragging: false, messageId: null }));
      return;
    }
    
    if (!swipeState.isDragging || !swipeState.messageId || isSelectionMode || isScrolling) {
      setSwipeState(prev => ({ ...prev, isDragging: false, messageId: null }));
      return;
    }
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const absX = Math.abs(deltaX);
    const swipeThreshold = 50; // Minimum distance to reveal actions
    
    if (absX >= swipeThreshold) {
      if (deltaX < -swipeThreshold) {
        // Swipe left - reveal actions for tapping
        if (Math.abs(deltaX) >= 120) {
          // Long swipe left (120px+) - show both move and archive
          setRevealedActions({
            messageId: swipeState.messageId,
            type: 'both'
          });
        } else if (Math.abs(deltaX) >= 50) {
          // Short swipe left (50-120px) - show only archive
          setRevealedActions({
            messageId: swipeState.messageId,
            type: 'archive'
          });
        }
      } else if (deltaX > swipeThreshold) {
        // Swipe right - immediately mark as unread (no need to stay open)
        bulkActionMutation.mutate({
          messageIds: [swipeState.messageId],
          action: 'mark-unread',
          accountId: selectedAccount.id
        });
        // Reset states
        setRevealedActions({ messageId: null, type: null });
      }
    } else {
      // Small swipe - close any revealed actions
      setRevealedActions({ messageId: null, type: null });
    }
    
    // Reset swipe state but keep revealed actions open
    setSwipeState({
      messageId: null,
      startX: 0,
      currentX: 0,
      isDragging: false,
      direction: null
    });
  };

  // Mark email as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async ({ messageId, accountId }: { messageId: number | string; accountId: number }) => {
      // For OAuth connected accounts, use the new provider endpoints
      if (accountId === -1) {
        const response = await fetch(`/api/user/email-provider/emails/${messageId}/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Failed to mark message as read');
        }
        return response.json();
      }
      
      // For BackstageOS accounts, use the old endpoints
      const response = await fetch(`/api/email/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark message as read');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch email queries
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', selectedAccount.id, activeFolder] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/stats', selectedAccount.id] });
    },
  });

  // Bulk actions mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ messageIds, action, targetFolder }: { messageIds: (number | string)[]; action: string; targetFolder?: string }) => {
      console.log('🗑️ Bulk action requested:', { messageIds, action, targetFolder, accountId: selectedAccount.id });
      
      // For OAuth connected accounts, perform actions via the new provider endpoints
      if (selectedAccount.id === -1) {
        const results = await Promise.all(
          messageIds.map(async (messageId) => {
            let endpoint = '';
            let method = 'POST';
            
            switch (action) {
              case 'mark-read':
                endpoint = `/api/user/email-provider/emails/${messageId}/read`;
                break;
              case 'mark-unread':
                endpoint = `/api/user/email-provider/emails/${messageId}/unread`;
                break;
              case 'delete':
                endpoint = `/api/user/email-provider/emails/${messageId}`;
                method = 'DELETE';
                break;
              case 'archive':
                endpoint = `/api/user/email-provider/emails/${messageId}/archive`;
                break;
              default:
                throw new Error(`Unsupported action: ${action}`);
            }
            
            const response = await fetch(endpoint, { method });
            if (!response.ok) {
              throw new Error(`Failed to ${action} message`);
            }
            return response.json();
          })
        );
        return { result: results, action, messageIds, targetFolder };
      }
      
      // For BackstageOS accounts, use the old bulk action endpoint
      const response = await fetch('/api/email/messages/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds,
          action,
          accountId: selectedAccount.id,
          targetFolder,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }
      const result = await response.json();
      console.log('✅ Bulk action completed:', result);
      return { result, action, messageIds, targetFolder };
    },
    onSuccess: ({ result, action, messageIds, targetFolder }) => {
      // Clear selection and exit selection mode
      setSelectedMessages(new Set());
      setIsSelectionMode(false);
      
      // Show specific success message based on action
      const count = messageIds.length;
      const messageText = count === 1 ? 'message' : 'messages';
      
      switch (action) {
        case 'delete':
          toast({
            title: "Messages deleted",
            description: `${count} ${messageText} moved to trash`,
          });
          break;
        case 'archive':
          toast({
            title: "Messages archived",
            description: `${count} ${messageText} moved to archive`,
          });
          break;
        case 'mark-read':
          toast({
            title: "Messages marked as read",
            description: `${count} ${messageText} marked as read`,
          });
          break;
        case 'mark-unread':
          toast({
            title: "Messages marked as unread",
            description: `${count} ${messageText} marked as unread`,
          });
          break;
        case 'move':
          const folderName = targetFolder === 'inbox' ? 'Inbox' : 
                            targetFolder === 'drafts' ? 'Drafts' :
                            targetFolder === 'archive' ? 'Archive' :
                            targetFolder === 'trash' ? 'Trash' : targetFolder;
          toast({
            title: "Messages moved",
            description: `${count} ${messageText} moved to ${folderName}`,
          });
          break;
        default:
          toast({
            title: "Action completed",
            description: `Bulk action completed for ${count} ${messageText}`,
          });
      }
      
      // Invalidate and refetch ALL email queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', selectedAccount.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/stats', selectedAccount.id] });
      
      // Force refresh the current view
      queryClient.refetchQueries({ queryKey: ['/api/email/accounts', selectedAccount.id, activeFolder] });
    },
  });

  // Fetch messages for the selected account and folder
  // For OAuth connected accounts (id === -1), use the new provider endpoints
  // For BackstageOS accounts (id > 0), use the old endpoints
  const { data: inboxMessages, isLoading, error } = useQuery<EmailMessage[]>({
    queryKey: ['/api/email/accounts', selectedAccount.id, activeFolder],
    queryFn: async () => {
      // Check if this is an OAuth connected account (virtual account with id = -1)
      if (selectedAccount.id === -1) {
        // Use the new OAuth provider endpoints
        const response = await fetch(`/api/user/email-provider/emails?folder=${activeFolder}&limit=50`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${activeFolder} messages from connected account`);
        }
        const data = await response.json();
        // Transform the response to match the expected EmailMessage format
        return (data.messages || []).map((msg: any) => {
          const emailDate = msg.date ? new Date(msg.date) : new Date(parseInt(msg.internalDate));
          return {
            id: msg.id,
            accountId: -1,
            fromAddress: msg.from || '',
            toAddresses: msg.to ? [msg.to] : [],
            ccAddresses: msg.cc ? [msg.cc] : [],
            bccAddresses: msg.bcc ? [msg.bcc] : [],
            subject: msg.subject || '(No Subject)',
            content: cleanEmailPreview(msg.snippet || ''),
            htmlContent: msg.isHtml ? msg.body : null,
            folder: activeFolder,
            isRead: !msg.isUnread,
            isStarred: msg.isStarred || false,
            hasAttachments: (msg.attachments && msg.attachments.length > 0) || msg.hasAttachments,
            dateSent: emailDate,
            receivedAt: emailDate,
            sentAt: emailDate,
            createdAt: emailDate,
            threadId: msg.threadId || null,
            attachments: msg.attachments || [],
          };
        });
      }
      
      // Use the old BackstageOS endpoints for non-OAuth accounts
      let endpoint;
      switch (activeFolder) {
        case 'sent':
          endpoint = `/api/email/accounts/${selectedAccount.id}/sent`;
          break;
        case 'drafts':
          endpoint = `/api/email/accounts/${selectedAccount.id}/drafts`;
          break;
        case 'archive':
          endpoint = `/api/email/accounts/${selectedAccount.id}/archive`;
          break;
        case 'trash':
          endpoint = `/api/email/accounts/${selectedAccount.id}/trash`;
          break;
        default:
          endpoint = `/api/email/accounts/${selectedAccount.id}/inbox`;
      }
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${activeFolder} messages`);
      }
      return response.json();
    },
    enabled: !!selectedAccount?.id,
    staleTime: 0, // Force fresh data on every request
    gcTime: 0, // Don't cache the results (renamed from cacheTime in v5)
  });

  const filteredMessages = (inboxMessages || []).filter((message: EmailMessage) =>
    message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.fromAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update parent component with filtered messages
  useEffect(() => {
    if (onFilteredMessagesChange) {
      onFilteredMessagesChange(filteredMessages);
    }
  }, [filteredMessages, onFilteredMessagesChange]);

  // Update selection mode based on selected messages
  useEffect(() => {
    setIsSelectionMode(selectedMessages.size > 0);
  }, [selectedMessages]);

  // Helper functions for bulk actions
  const toggleSelectAll = () => {
    if (selectedMessages.size === filteredMessages.length) {
      setSelectedMessages(new Set());
      setIsSelectionMode(false); // Exit selection mode when unchecking select all
    } else {
      setSelectedMessages(new Set(filteredMessages.map(msg => msg.id)));
    }
  };

  const toggleSelectMessage = (messageId: number) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId);
    } else {
      newSelection.add(messageId);
    }
    setSelectedMessages(newSelection);
    
    // Exit selection mode if no messages are selected
    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const handleBulkAction = (action: string, targetFolder?: string) => {
    const messageIds = Array.from(selectedMessages);
    if (messageIds.length === 0) return;
    
    // Show confirmation dialog for delete operations
    if (action === 'delete') {
      setPendingDeleteAction({ messageIds, action, targetFolder });
      setShowDeleteConfirm(true);
    } else {
      // Execute other actions immediately
      bulkActionMutation.mutate({ messageIds, action, targetFolder });
    }
  };

  const confirmDelete = () => {
    if (pendingDeleteAction) {
      bulkActionMutation.mutate(pendingDeleteAction);
      setShowDeleteConfirm(false);
      setPendingDeleteAction(null);
      // Close email modal after successful delete
      handleCloseEmailModal();
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setPendingDeleteAction(null);
  };

  const exitSelectionMode = () => {
    setSelectedMessages(new Set());
    setIsSelectionMode(false);
  };

  const handleEmailClick = (email: EmailMessage) => {
    setModalEmail(email);
    setShowEmailModal(true);
    setEmailModalClosing(false);
    
    // Mark as read if the email is unread
    if (!email.isRead) {
      markAsReadMutation.mutate({
        messageId: email.id,
        accountId: selectedAccount.id,
      });
    }
  };

  const handleCloseEmailModal = () => {
    setEmailModalClosing(true);
    setTimeout(() => {
      setShowEmailModal(false);
      setModalEmail(null);
      setEmailModalClosing(false);
    }, 300);
  };

  const handleReply = () => {
    if (!modalEmail) return;
    
    // Close modal first
    handleCloseEmailModal();
    
    // Use parent callback to handle reply
    if (onReply) {
      onReply(modalEmail, 'reply');
    }
    
    console.log('Reply to:', modalEmail.subject);
  };

  const handleReplyAll = () => {
    if (!modalEmail) return;
    
    // Close modal first
    handleCloseEmailModal();
    
    // Use parent callback to handle reply all
    if (onReply) {
      onReply(modalEmail, 'replyAll');
    }
    
    console.log('Reply All to:', modalEmail.subject);
  };

  const handleForward = () => {
    if (!modalEmail) return;
    
    // Set forward message data and compose mode
    setForwardMessage(modalEmail);
    setComposeMode('forward');
    
    // Close modal and open composer
    handleCloseEmailModal();
    
    if (onShowComposeChange) {
      onShowComposeChange(true);
    }
  };

  const handleArchive = () => {
    if (!modalEmail) return;
    
    // Archive this specific email
    bulkActionMutation.mutate({
      messageIds: [modalEmail.id],
      action: 'archive',
      targetFolder: 'archive'
    });
    
    handleCloseEmailModal();
  };

  const handleDelete = () => {
    if (!modalEmail) return;
    
    // Show confirmation for delete action
    setPendingDeleteAction({
      messageIds: [modalEmail.id],
      action: 'delete',
      targetFolder: 'trash'
    });
    setShowDeleteConfirm(true);
    // Don't close the email modal - let user return to it if they cancel
  };

  // Navigation functions for previous/next email
  const getCurrentEmailIndex = () => {
    if (!modalEmail || !filteredMessages.length) return -1;
    return filteredMessages.findIndex(msg => msg.id === modalEmail.id);
  };

  const handlePreviousEmail = () => {
    const currentIndex = getCurrentEmailIndex();
    if (currentIndex > 0) {
      const previousEmail = filteredMessages[currentIndex - 1];
      setModalEmail(previousEmail);
      
      // Mark as read if the email is unread
      if (!previousEmail.isRead) {
        markAsReadMutation.mutate({
          messageId: previousEmail.id,
          accountId: selectedAccount.id,
        });
      }
    }
  };

  const handleNextEmail = () => {
    const currentIndex = getCurrentEmailIndex();
    if (currentIndex >= 0 && currentIndex < filteredMessages.length - 1) {
      const nextEmail = filteredMessages[currentIndex + 1];
      setModalEmail(nextEmail);
      
      // Mark as read if the email is unread
      if (!nextEmail.isRead) {
        markAsReadMutation.mutate({
          messageId: nextEmail.id,
          accountId: selectedAccount.id,
        });
      }
    }
  };

  const hasPreviousEmail = () => {
    const currentIndex = getCurrentEmailIndex();
    return currentIndex > 0;
  };

  const hasNextEmail = () => {
    const currentIndex = getCurrentEmailIndex();
    return currentIndex >= 0 && currentIndex < filteredMessages.length - 1;
  };

  return (
    <>
      <div className="relative h-[calc(100vh-120px)] bg-background">




        {/* Content Area - Mobile Responsive */}
        <div className="pt-0 h-full overflow-hidden">
          {/* Full-Width Email List - Force mobile container width */}
          <ScrollArea 
            className="h-full"
            onScroll={() => {
              setIsScrolling(true);
              if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
              }
              scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
              }, 150);
            }}
          >
            <div className="space-y-0 w-full max-w-full overflow-hidden md:max-w-none" style={{maxWidth: '100vw'}}>
              {isLoading && (
                <div className="p-3 md:p-4 text-center text-muted-foreground text-sm">
                  Loading messages...
                </div>
              )}
              {error && (
                <div className="p-3 md:p-4 text-center text-red-600 text-sm">
                  Error loading messages
                </div>
              )}


              
              {filteredMessages.map((message: EmailMessage) => {
                const isCurrentSwipe = swipeState.messageId === message.id;
                const swipeDistance = isCurrentSwipe ? swipeState.currentX - swipeState.startX : 0;
                const showRightAction = isCurrentSwipe && swipeDistance > 50;
                const showMoveAction = isCurrentSwipe && swipeDistance < -50;
                const showArchiveAction = isCurrentSwipe && swipeDistance < -120;
                
                // Check if this message has revealed actions or if dropdown is open for this message
                const isRevealed = revealedActions.messageId === message.id;
                const hasDropdownOpen = moveDropdownOpen === message.id;
                const revealedType = isRevealed ? revealedActions.type : null;
                
                // Format date in "Jul 23" format for desktop, time-only for today on mobile
                const formatDate = (dateString: string | null) => {
                  if (!dateString) return '';
                  const date = new Date(dateString);
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();
                  
                  // For mobile: show time if today, date if not today
                  // For desktop: always show "Jul 23" format
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                };

                const formatMobileDateTime = (dateString: string | null) => {
                  if (!dateString) return '';
                  const date = new Date(dateString);
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();
                  
                  if (isToday) {
                    return date.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    });
                  } else {
                    return date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  }
                };
                
                return (
                <div
                  key={message.id}
                  className="relative overflow-hidden w-full max-w-full"
                >
                  {/* Background actions that appear during swipe, when revealed, or when dropdown is open */}
                  {(isCurrentSwipe || isRevealed || hasDropdownOpen) && (
                    <>
                      {/* Right swipe background - Mark as unread */}
                      {showRightAction && (
                        <div className="absolute inset-y-0 left-0 w-20 bg-blue-500 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                      )}
                      
                      {/* Left swipe backgrounds - Move folder then Archive */}
                      {(showMoveAction || revealedType === 'archive' || revealedType === 'both' || hasDropdownOpen) && (
                        <div className="absolute inset-y-0 right-0 flex">
                          {/* Move folder option - appears with long swipe, when both revealed, or when dropdown is open */}
                          {(showArchiveAction || revealedType === 'both' || hasDropdownOpen) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveDropdownOpen(moveDropdownOpen === message.id ? null : message.id);
                                setRevealedActions({ messageId: null, type: null });
                              }}
                              className="w-20 bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors"
                            >
                              <Folder className="h-5 w-5 text-white" />
                            </button>
                          )}
                          {/* Archive option - always appears on the right */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              bulkActionMutation.mutate({
                                messageIds: [message.id],
                                action: 'archive',
                                accountId: selectedAccount.id,
                                targetFolder: 'archive'
                              });
                              setRevealedActions({ messageId: null, type: null });
                            }}
                            className="w-20 bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                          >
                            <Archive className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      if (isRevealed) {
                        // Close revealed actions if clicking on email content
                        setRevealedActions({ messageId: null, type: null });
                      } else if (isSelectionMode) {
                        toggleSelectMessage(message.id);
                      } else {
                        handleEmailClick(message);
                      }
                    }}
                    onTouchStart={(e) => handleTouchStart(e, message.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`block text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none group pl-1 pr-4 py-2 border-b border-gray-100 transition-transform duration-75 ease-out overflow-hidden select-none ${
                      isSelectionMode && selectedMessages.has(message.id) ? 'bg-blue-50' : ''
                    }`}
                    style={{
                      transform: isCurrentSwipe 
                        ? `translateX(${Math.max(-160, Math.min(100, swipeDistance))}px)` 
                        : isRevealed 
                          ? `translateX(${revealedType === 'both' ? '-160px' : '-80px'})` 
                          : hasDropdownOpen
                            ? 'translateX(-160px)'
                            : 'translateX(0)',
                      width: '100%',
                      maxWidth: '100vw',
                      boxSizing: 'border-box',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none'
                    }}
                  >
                    {/* Desktop Layout - Keep existing horizontal layout */}
                    <div className="hidden md:flex items-center gap-2 w-full" style={{ maxWidth: '100%' }}>
                      {/* Hover Checkbox - Desktop only */}
                      <div className="w-6 h-6 flex-shrink-0">
                        {isSelectionMode ? (
                          <Checkbox
                            checked={selectedMessages.has(message.id)}
                            onCheckedChange={() => toggleSelectMessage(message.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => {
                                setIsSelectionMode(true);
                                toggleSelectMessage(message.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          </div>
                        )}
                      </div>

                      {/* Unread indicator */}
                      {!message.isRead && !isSelectionMode && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                      )}

                      {/* Sender name - fixed width */}
                      <div className="w-40 flex-shrink-0 overflow-hidden">
                        <span className={`text-sm truncate block ${!message.isRead ? 'font-semibold text-black' : 'text-gray-700'}`}>
                          <ContactPreview emailAddress={message.fromAddress || ''}>
                            <span className="hover:text-blue-600 transition-colors cursor-pointer">
                              {getDisplayName(message.fromAddress || '')}
                            </span>
                          </ContactPreview>
                        </span>
                      </div>

                      {/* Subject + Message Preview - limited to 50 chars */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">
                          {message.hasAttachments && <span className="text-gray-500 mr-1">📎</span>}
                          {message.isImportant && <span className="text-yellow-500 mr-1">⭐</span>}
                          <span className={!message.isRead ? 'font-semibold text-black' : 'text-gray-700'}>
                            {(message.subject || 'No Subject').slice(0, 50)}{(message.subject || '').length > 50 ? '...' : ''}
                          </span>
                        </span>
                      </div>

                      {/* Right side: Date always visible, hover actions appear on hover */}
                      <div className="flex-shrink-0 flex items-center gap-2 ml-auto pl-4">
                        {/* Date - always visible, hides on hover when actions show */}
                        <span className="text-xs text-gray-500 whitespace-nowrap group-hover:hidden">
                          {formatDate(message.dateSent)}
                        </span>
                        
                        {/* Hover action icons - shown on row hover, replacing date */}
                        <div className="hidden group-hover:flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onReply) {
                                onReply(message, 'reply');
                              }
                            }}
                            className="h-7 w-7 p-0 hover:bg-gray-100 rounded"
                            title="Reply"
                          >
                            <Reply className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              bulkActionMutation.mutate({
                                messageIds: [message.id],
                                action: 'archive',
                                accountId: selectedAccount.id,
                                targetFolder: 'archive'
                              });
                            }}
                            className="h-7 w-7 p-0 hover:bg-gray-100 rounded"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              bulkActionMutation.mutate({
                                messageIds: [message.id],
                                action: 'delete',
                                accountId: selectedAccount.id,
                                targetFolder: 'trash'
                              });
                            }}
                            className="h-7 w-7 p-0 hover:bg-gray-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Layout - Gmail-style vertical layout */}
                    <div className="md:hidden py-3 px-4" style={{width: '100%', maxWidth: '100vw', boxSizing: 'border-box'}}>
                      {/* Top row: Sender (bold) + Date/Time + Chevron - Fixed within screen width */}
                      <div className="flex items-center mb-2 w-full">
                        <div className="flex items-center gap-2 min-w-0" style={{width: 'calc(100% - 80px)'}}>
                          {/* Mobile selection checkbox */}
                          {isSelectionMode && (
                            <Checkbox
                              checked={selectedMessages.has(message.id)}
                              onCheckedChange={() => toggleSelectMessage(message.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 flex-shrink-0"
                            />
                          )}

                          {/* Unread indicator */}
                          {!message.isRead && !isSelectionMode && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          )}

                          {/* Sender name - Bold with forced truncation */}
                          <span className="font-bold text-black truncate block min-w-0">
                            <ContactPreview emailAddress={message.fromAddress || ''}>
                              <span className="hover:text-blue-600 transition-colors cursor-pointer">
                                {getDisplayName(message.fromAddress || '')}
                              </span>
                            </ContactPreview>
                          </span>
                        </div>

                        {/* Date/Time + Chevron - Fixed 80px width on right */}
                        <div className="flex items-center gap-1 text-gray-600 justify-end" style={{width: '80px', flexShrink: 0}}>
                          <span className="text-sm">
                            {formatMobileDateTime(message.dateSent)}
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Subject line - Medium weight with proper truncation */}
                      <div className="mb-1 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-medium text-black text-sm truncate block min-w-0 ${!message.isRead ? 'font-semibold' : 'font-medium'}`}>
                            {message.subject || 'No Subject'}
                          </span>
                          {message.hasAttachments && (
                            <span className="text-xs text-gray-500 flex-shrink-0">📎</span>
                          )}
                          {message.isImportant && (
                            <span className="text-xs text-yellow-500 flex-shrink-0">⭐</span>
                          )}
                        </div>
                      </div>

                      {/* Message preview - Normal weight with truncation */}
                      <div className="text-sm text-gray-600 truncate block w-full">
                        {message.content?.slice(0, 80) || 'No preview available'}
                      </div>
                    </div>
                  </button>
                  
                  {/* Move folder dropdown */}
                  {moveDropdownOpen === message.id && (
                    <div className="absolute top-full left-0 z-50 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            bulkActionMutation.mutate({
                              messageIds: [message.id],
                              action: 'move',
                              targetFolder: 'inbox',
                              accountId: selectedAccount.id
                            });
                            setMoveDropdownOpen(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          Move to Inbox
                        </button>
                        <button
                          onClick={() => {
                            bulkActionMutation.mutate({
                              messageIds: [message.id],
                              action: 'move',
                              targetFolder: 'trash',
                              accountId: selectedAccount.id
                            });
                            setMoveDropdownOpen(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          Move to Trash
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Email Modal - Full viewport height, positioned after sidebar */}
      {showEmailModal && modalEmail && (
        <div className={`fixed top-16 left-0 ${isSidebarCollapsed ? 'md:left-16' : 'md:left-64'} right-0 bottom-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out ${
          emailModalClosing 
            ? 'animate-out slide-out-to-bottom-full' 
            : 'animate-in slide-in-from-bottom-full'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-white">
            <div className="p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseEmailModal}
                className="h-6 w-6 p-0 hover:bg-transparent group/icon"
                title="Close"
              >
                <X className="h-3 w-3 text-gray-500 group-hover/icon:text-blue-600 transition-colors" />
              </Button>
            </div>
            
            <div className="flex items-center gap-1 p-4">
              {/* Navigation arrows */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousEmail}
                disabled={!hasPreviousEmail()}
                className="h-6 w-6 p-0 hover:bg-transparent group/icon disabled:opacity-40"
                title="Previous email"
              >
                <ChevronLeft className="h-3 w-3 text-gray-500 group-hover/icon:text-blue-600 transition-colors" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextEmail}
                disabled={!hasNextEmail()}
                className="h-6 w-6 p-0 hover:bg-transparent group/icon disabled:opacity-40 mr-2"
                title="Next email"
              >
                <ChevronRight className="h-3 w-3 text-gray-500 group-hover/icon:text-blue-600 transition-colors" />
              </Button>
              
              {/* Email actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReply}
                className="h-6 w-6 p-0 hover:bg-transparent group/icon"
                title="Reply"
              >
                <Reply className="h-3 w-3 text-gray-500 group-hover/icon:text-blue-600 transition-colors" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReplyAll}
                className="h-6 w-6 p-0 hover:bg-transparent group/icon"
                title="Reply All"
              >
                <ReplyAll className="h-3 w-3 text-gray-500 group-hover/icon:text-blue-600 transition-colors" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleForward}
                className="h-6 w-6 p-0 hover:bg-transparent group/icon"
                title="Forward"
              >
                <Forward className="h-3 w-3 text-gray-500 group-hover/icon:text-blue-600 transition-colors" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchive}
                className="h-6 w-6 p-0 hover:bg-transparent group/icon"
                title="Archive"
              >
                <Archive className="h-3 w-3 text-gray-500 group-hover/icon:text-blue-600 transition-colors" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-6 w-6 p-0 hover:bg-transparent group/icon"
                title="Delete"
              >
                <Trash2 className="h-3 w-3 text-gray-500 group-hover/icon:text-blue-600 transition-colors" />
              </Button>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* Subject */}
              <h1 className="text-xl font-medium mb-4 text-gray-900">
                {modalEmail.subject || 'No Subject'}
              </h1>
              
              {/* Sender Info */}
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <ContactPreview emailAddress={modalEmail.fromAddress || ''}>
                    <span className="font-medium text-gray-900">
                      {getDisplayName(modalEmail.fromAddress || '')}
                    </span>
                  </ContactPreview>
                </div>
                <div className="text-sm text-gray-500">
                  {modalEmail.dateSent ? new Date(modalEmail.dateSent).toLocaleString() : ''}
                </div>
              </div>

              {/* Email Content */}
              <div className="prose max-w-none">
                {modalEmail.htmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: modalEmail.htmlContent }} />
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: '1.5' }}>
                    {modalEmail.content || 'No content available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composer is now handled at email manager level as inline panel */}

      {/* Email Account Configuration */}
      {showConfiguration && (
        <EmailAccountConfig
          accountId={selectedAccount.id}
          onClose={() => setShowConfiguration(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md z-[70]" style={{ zIndex: '70' }}>
          <DialogHeader>
            <DialogTitle>Delete Messages</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {pendingDeleteAction?.messageIds.length || 0} message{(pendingDeleteAction?.messageIds.length || 0) !== 1 ? 's' : ''}? 
              They will be moved to the trash folder and can be permanently deleted later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={cancelDelete} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dropdown - positioned absolutely */}
      {moveDropdownOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setMoveDropdownOpen(null);
              setRevealedActions({ messageId: null, type: null });
            }}
          />
          
          {/* Dropdown menu */}
          <div className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px]"
            style={{
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
              Move to:
            </div>
            <div className="py-1">
              {/* Show Inbox option if not already in inbox */}
              {activeFolder !== 'inbox' && (
                <button
                  onClick={() => {
                    if (moveDropdownOpen) {
                      bulkActionMutation.mutate({
                        messageIds: [moveDropdownOpen],
                        action: 'move',
                        accountId: selectedAccount.id,
                        targetFolder: 'inbox'
                      });
                    }
                    setMoveDropdownOpen(null);
                    setRevealedActions({ messageId: null, type: null });
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <Mail className="h-4 w-4" />
                  Inbox
                </button>
              )}
              

              
              {/* Show Drafts option if not already in drafts */}
              {activeFolder !== 'drafts' && (
                <button
                  onClick={() => {
                    if (moveDropdownOpen) {
                      bulkActionMutation.mutate({
                        messageIds: [moveDropdownOpen],
                        action: 'move',
                        accountId: selectedAccount.id,
                        targetFolder: 'drafts'
                      });
                    }
                    setMoveDropdownOpen(null);
                    setRevealedActions({ messageId: null, type: null });
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <File className="h-4 w-4" />
                  Drafts
                </button>
              )}
              
              {/* Show Archive option if not already in archive */}
              {activeFolder !== 'archive' && (
                <button
                  onClick={() => {
                    if (moveDropdownOpen) {
                      bulkActionMutation.mutate({
                        messageIds: [moveDropdownOpen],
                        action: 'archive',
                        accountId: selectedAccount.id,
                        targetFolder: 'archive'
                      });
                    }
                    setMoveDropdownOpen(null);
                    setRevealedActions({ messageId: null, type: null });
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
              )}
              
              {/* Show Trash option if not already in trash */}
              {activeFolder !== 'trash' && (
                <button
                  onClick={() => {
                    if (moveDropdownOpen) {
                      bulkActionMutation.mutate({
                        messageIds: [moveDropdownOpen],
                        action: 'move',
                        accountId: selectedAccount.id,
                        targetFolder: 'trash'
                      });
                    }
                    setMoveDropdownOpen(null);
                    setRevealedActions({ messageId: null, type: null });
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Trash
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bulk Move Dropdown - positioned absolutely */}
      {bulkMoveDropdownOpen && selectedMessages.size > 0 && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setBulkMoveDropdownOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[160px]"
            style={{
              right: '20px',
              bottom: '80px'
            }}
          >
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-sm font-medium text-gray-700">
              Move to:
            </div>
            <div className="py-1">
              {/* Show Inbox option if not already in inbox */}
              {activeFolder !== 'inbox' && (
                <button
                  onClick={() => {
                    handleBulkAction('move', 'inbox');
                    setBulkMoveDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <Mail className="h-4 w-4" />
                  Inbox
                </button>
              )}
              

              
              {/* Show Drafts option if not already in drafts */}
              {activeFolder !== 'drafts' && (
                <button
                  onClick={() => {
                    handleBulkAction('move', 'drafts');
                    setBulkMoveDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <File className="h-4 w-4" />
                  Drafts
                </button>
              )}
              
              {/* Show Archive option if not already in archive */}
              {activeFolder !== 'archive' && (
                <button
                  onClick={() => {
                    handleBulkAction('archive');
                    setBulkMoveDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </button>
              )}
              
              {/* Show Trash option if not already in trash */}
              {activeFolder !== 'trash' && (
                <button
                  onClick={() => {
                    handleBulkAction('move', 'trash');
                    setBulkMoveDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Trash
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}