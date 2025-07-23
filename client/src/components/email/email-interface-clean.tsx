import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Star, Archive, Reply, ReplyAll, Forward, Trash2, Check, X, Mail, MailOpen, FolderOpen, User, Folder, Send, File } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function EmailInterface({ selectedAccount, onBack, showCompose, onShowComposeChange, activeFolder = "inbox", showTheaterFeatures, onShowTheaterFeaturesChange, composeToEmail, selectedMessages: propSelectedMessages, onSelectedMessagesChange, onFilteredMessagesChange }: EmailInterfaceProps) {
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

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressState.timer) {
        clearTimeout(longPressState.timer);
      }
    };
  }, [longPressState.timer]);

  // Mobile swipe handlers with long press detection
  const handleTouchStart = (e: React.TouchEvent, messageId: number) => {
    if (isSelectionMode) return;
    
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
    if (!swipeState.isDragging || isSelectionMode) return;
    
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
    
    if (!swipeState.isDragging || !swipeState.messageId || isSelectionMode) {
      setSwipeState(prev => ({ ...prev, isDragging: false, messageId: null }));
      return;
    }
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const swipeThreshold = 50; // Minimum distance to reveal actions
    
    if (Math.abs(deltaX) >= swipeThreshold) {
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
    mutationFn: async ({ messageId, accountId }: { messageId: number; accountId: number }) => {
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
    mutationFn: async ({ messageIds, action, targetFolder }: { messageIds: number[]; action: string; targetFolder?: string }) => {
      console.log('🗑️ Bulk action requested:', { messageIds, action, targetFolder, accountId: selectedAccount.id });
      
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
      return result;
    },
    onSuccess: () => {
      // Clear selection and exit selection mode
      setSelectedMessages(new Set());
      setIsSelectionMode(false);
      
      // Invalidate and refetch ALL email queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', selectedAccount.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/stats', selectedAccount.id] });
      
      // Force refresh the current view
      queryClient.refetchQueries({ queryKey: ['/api/email/accounts', selectedAccount.id, activeFolder] });
    },
  });

  // Fetch messages for the selected account and folder
  const { data: inboxMessages, isLoading, error } = useQuery<EmailMessage[]>({
    queryKey: ['/api/email/accounts', selectedAccount.id, activeFolder],
    queryFn: async () => {
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
    enabled: selectedAccount?.id > 0,
    staleTime: 0, // Force fresh data on every request
    cacheTime: 0, // Don't cache the results
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
    
    // Set reply message data and compose mode
    setReplyMessage(modalEmail);
    setComposeMode('reply');
    
    // Close modal and open composer
    handleCloseEmailModal();
    
    if (onShowComposeChange) {
      onShowComposeChange(true);
    }
    
    console.log('Reply to:', modalEmail.subject);
  };

  const handleReplyAll = () => {
    if (!modalEmail) return;
    
    // Set reply message data and compose mode for reply all
    setReplyMessage(modalEmail);
    setComposeMode('replyAll');
    
    // Close modal and open composer
    handleCloseEmailModal();
    
    if (onShowComposeChange) {
      onShowComposeChange(true);
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

  return (
    <>
      <div className="relative h-[calc(100vh-120px)] bg-background">


        {/* Mobile Selection Header */}
        <div className="md:hidden">
          {isSelectionMode ? (
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exitSelectionMode}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Checkbox
                    checked={selectedMessages.size === filteredMessages.length && filteredMessages.length > 0}
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <span className="text-sm text-gray-600">
                    Select all
                  </span>
                  <span className="text-lg font-medium">
                    {selectedMessages.size}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBulkAction('mark-unread')}
                    disabled={bulkActionMutation.isPending || selectedMessages.size === 0}
                    className="h-9 w-9 p-0"
                  >
                    <Mail className="h-5 w-5 text-blue-600" />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={bulkActionMutation.isPending || selectedMessages.size === 0}
                        className="h-9 w-9 p-0"
                      >
                        <FolderOpen className="h-5 w-5 text-blue-600" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40" align="end">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBulkAction('move', 'inbox')}
                          disabled={bulkActionMutation.isPending}
                          className="h-8 justify-start text-sm"
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          Inbox
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBulkAction('move', 'archive')}
                          disabled={bulkActionMutation.isPending}
                          className="h-8 justify-start text-sm"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBulkAction('move', 'trash')}
                          disabled={bulkActionMutation.isPending}
                          className="h-8 justify-start text-sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Trash
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBulkAction('archive')}
                    disabled={bulkActionMutation.isPending || selectedMessages.size === 0}
                    className="h-9 w-9 p-0 hover:bg-transparent"
                  >
                    <Archive className="h-5 w-5 text-gray-600 hover:text-blue-600 transition-colors" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBulkAction('delete')}
                    disabled={bulkActionMutation.isPending || selectedMessages.size === 0}
                    className="h-9 w-9 p-0 hover:bg-transparent"
                  >
                    <Trash2 className="h-5 w-5 text-gray-600 hover:text-blue-600 transition-colors" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  checked={selectedMessages.size === filteredMessages.length && filteredMessages.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-blue-600 font-medium">
                  Select all
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Content Area - Mobile Responsive */}
        <div className="pt-0 h-full">
          {/* Full-Width Email List */}
          <ScrollArea className="h-full">
            <div className="space-y-0">
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
                
                // Format date in "Jul 23" format
                const formatDate = (dateString: string | null) => {
                  if (!dateString) return '';
                  const date = new Date(dateString);
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                };
                
                return (
                <div
                  key={message.id}
                  className="relative overflow-hidden"
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
                    className={`w-full block text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none group px-0.5 py-3 border-b border-gray-100 transition-transform duration-75 ease-out ${
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
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {/* Hover Checkbox - Desktop only */}
                      <div className="hidden md:block w-6 h-6 flex-shrink-0">
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

                      {/* Mobile selection checkbox */}
                      {isSelectionMode && (
                        <div className="md:hidden">
                          <Checkbox
                            checked={selectedMessages.has(message.id)}
                            onCheckedChange={() => toggleSelectMessage(message.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </div>
                      )}

                      {/* Unread indicator */}
                      {!message.isRead && !isSelectionMode && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                      )}

                      {/* Sender name - fixed width */}
                      <div className="w-32 md:w-40 flex-shrink-0">
                        <span className={`text-sm font-medium truncate block ${!message.isRead ? 'font-semibold text-black' : 'text-gray-700'}`}>
                          <ContactPreview emailAddress={message.fromAddress || ''}>
                            <span className="hover:text-blue-600 transition-colors cursor-pointer">
                              {getDisplayName(message.fromAddress || '')}
                            </span>
                          </ContactPreview>
                        </span>
                      </div>

                      {/* Subject - flexible width */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${!message.isRead ? 'font-semibold text-black' : 'text-gray-700'}`}>
                            {message.subject || 'No Subject'}
                          </span>
                          {message.hasAttachments && (
                            <span className="text-xs text-gray-500 flex-shrink-0">📎</span>
                          )}
                          {message.isImportant && (
                            <span className="text-xs text-yellow-500 flex-shrink-0">⭐</span>
                          )}
                        </div>
                        {/* Mobile preview text */}
                        <div className="md:hidden mt-1">
                          <span className="text-xs text-gray-500 truncate block">{message.content?.slice(0, 60) || 'No preview'}</span>
                        </div>
                      </div>

                      {/* Date - right aligned */}
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm text-gray-500">
                          {formatDate(message.dateSent)}
                        </span>
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

      {/* Email Modal - Full Screen Style */}
      {showEmailModal && modalEmail && (
        <div className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out ${
          emailModalClosing 
            ? 'animate-out slide-out-to-bottom-full' 
            : 'animate-in slide-in-from-bottom-full'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseEmailModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReply}
                className="h-8 w-8 p-0"
                title="Reply"
              >
                <Reply className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReplyAll}
                className="h-8 w-8 p-0"
                title="Reply All"
              >
                <ReplyAll className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleForward}
                className="h-8 w-8 p-0"
                title="Forward"
              >
                <Forward className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleArchive}
                className="h-8 w-8 p-0"
                title="Archive"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-md">
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