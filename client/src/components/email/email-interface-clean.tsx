import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Star, Archive, Reply, ReplyAll, Forward, Trash2, Check, X, Mail, MailOpen, FolderOpen } from 'lucide-react';
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
}

export function EmailInterface({ selectedAccount, onBack, showCompose, onShowComposeChange, activeFolder = "inbox", showTheaterFeatures, onShowTheaterFeaturesChange }: EmailInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalEmail, setModalEmail] = useState<EmailMessage | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{ messageIds: number[]; action: string; targetFolder?: string } | null>(null);
  const [forwardMessage, setForwardMessage] = useState<EmailMessage | null>(null);
  const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'replyAll' | 'forward'>('compose');
  const queryClient = useQueryClient();

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

  // Helper functions for bulk actions
  const toggleSelectAll = () => {
    if (selectedMessages.size === filteredMessages.length) {
      setSelectedMessages(new Set());
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
    
    // Mark as read if the email is unread
    if (!email.isRead) {
      markAsReadMutation.mutate({
        messageId: email.id,
        accountId: selectedAccount.id,
      });
    }
  };

  const handleReply = () => {
    if (!modalEmail) return;
    
    // Close modal and open composer with reply data
    setShowEmailModal(false);
    
    if (onShowComposeChange) {
      onShowComposeChange(true);
    }
    
    // TODO: Pass reply data to composer (subject with Re:, original message, etc.)
    console.log('Reply to:', modalEmail.subject);
  };

  const handleReplyAll = () => {
    if (!modalEmail) return;
    
    // Close modal and open composer with reply all data
    setShowEmailModal(false);
    
    if (onShowComposeChange) {
      onShowComposeChange(true);
    }
    
    // TODO: Pass reply all data to composer (include all recipients)
    console.log('Reply All to:', modalEmail.subject);
  };

  const handleForward = () => {
    if (!modalEmail) return;
    
    // Set forward message data and compose mode
    setForwardMessage(modalEmail);
    setComposeMode('forward');
    
    // Close modal and open composer
    setShowEmailModal(false);
    
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
    
    setShowEmailModal(false);
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
    setShowEmailModal(false);
  };

  return (
    <>
      <div className="relative h-[calc(100vh-120px)] bg-background">
        {/* Desktop-Only Search Header */}
        <div className="hidden md:block absolute top-0 left-0 right-0 h-12 md:h-16 bg-white border-b border-gray-200 px-2 md:px-4 z-50">
          <div className="flex items-center gap-2 md:gap-6 h-full">
            {isSelectionMode ? (
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
                />
                <span className="text-sm font-medium">
                  {selectedMessages.size} of {filteredMessages.length} selected
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="h-8 px-3 text-sm"
                >
                  Select
                </Button>
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 md:pl-10 w-full text-sm h-7 md:h-10 border-gray-300"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {isSelectionMode && selectedMessages.size > 0 && (
          <div className="hidden md:block absolute top-16 left-0 right-0 h-12 bg-blue-50 border-b border-blue-200 px-4 z-40">
            <div className="flex items-center gap-2 h-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('mark-read')}
                disabled={bulkActionMutation.isPending}
                className="h-8 px-3 text-sm"
              >
                <MailOpen className="h-4 w-4 mr-1" />
                Mark Read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('mark-unread')}
                disabled={bulkActionMutation.isPending}
                className="h-8 px-3 text-sm"
              >
                <Mail className="h-4 w-4 mr-1" />
                Mark Unread
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('archive')}
                disabled={bulkActionMutation.isPending}
                className="h-8 px-3 text-sm"
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionMutation.isPending}
                className="h-8 px-3 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('move', 'trash')}
                disabled={bulkActionMutation.isPending}
                className="h-8 px-3 text-sm"
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                Move to Trash
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Bulk Actions Bar - Fixed at bottom when in selection mode */}
        {isSelectionMode && selectedMessages.size > 0 && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-blue-50 border-t border-blue-200 p-4 z-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedMessages.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBulkAction('mark-read')}
                  disabled={bulkActionMutation.isPending}
                  className="h-8 px-2 text-xs"
                >
                  <MailOpen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBulkAction('archive')}
                  disabled={bulkActionMutation.isPending}
                  className="h-8 px-2 text-xs"
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkActionMutation.isPending}
                  className="h-8 px-2 text-xs text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Selection Header */}
        <div className="md:hidden">
          {isSelectionMode ? (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
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
                  />
                  <span className="text-sm font-medium">
                    {selectedMessages.size} of {filteredMessages.length}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="h-8 px-3 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Select
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area - Mobile Responsive */}
        <div className={`pt-0 h-full ${isSelectionMode && selectedMessages.size > 0 ? 'md:pt-28 pb-20' : 'md:pt-16'}`}>
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
              {filteredMessages.map((message: EmailMessage) => (
                <button
                  key={message.id}
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelectMessage(message.id);
                    } else {
                      handleEmailClick(message);
                    }
                  }}
                  className={`w-full block text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none group px-3 md:px-4 py-2 md:py-3 border-b border-gray-100 ${
                    isSelectionMode && selectedMessages.has(message.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-1 md:gap-0">
                    {/* Left side - Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        {isSelectionMode && (
                          <div className="mt-1">
                            <Checkbox
                              checked={selectedMessages.has(message.id)}
                              onCheckedChange={() => toggleSelectMessage(message.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        {!message.isRead && !isSelectionMode && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-medium text-sm md:text-base truncate ${!message.isRead ? 'font-semibold text-black' : 'text-gray-700'}`}>
                              {message.subject || 'No Subject'}
                            </span>
                            {message.hasAttachments && (
                              <span className="text-xs text-gray-500">📎</span>
                            )}
                            {message.isImportant && (
                              <span className="text-xs text-yellow-500">⭐</span>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-0.5 text-xs md:text-sm text-gray-500">
                            <span className="truncate font-medium">{message.fromAddress}</span>
                            <span className="truncate text-xs opacity-75 md:hidden">{message.content?.slice(0, 50) || 'No preview'}</span>
                            <span className="truncate text-sm opacity-75 hidden md:block">{message.content?.slice(0, 80) || 'No content preview'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side - Time - Mobile Optimized */}
                      <div className="flex items-center justify-end gap-1 flex-shrink-0 md:ml-4 text-right">
                        <span className="text-xs text-gray-400">
                          {message.dateSent ? new Date(message.dateSent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {!isSelectionMode && (
                          <div className="hidden md:flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle star
                              }}
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive();
                              }}
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="w-[95vw] md:max-w-4xl h-[95vh] flex flex-col">
          {modalEmail && (
            <>
              <DialogHeader className="border-b pb-3 md:pb-4">
                <DialogTitle className="text-lg md:text-xl font-semibold pr-6">{modalEmail.subject || 'No Subject'}</DialogTitle>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-sm text-gray-600">
                    <span>From: {modalEmail.fromAddress}</span>
                    <Separator orientation="vertical" className="hidden md:block h-4" />
                    <span>{modalEmail.dateSent ? new Date(modalEmail.dateSent).toLocaleString() : ''}</span>
                    {modalEmail.hasAttachments && (
                      <>
                        <Separator orientation="vertical" className="hidden md:block h-4" />
                        <span className="flex items-center gap-1">
                          📎 Attachments
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 flex-wrap">
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
                    <Separator orientation="vertical" className="h-6" />
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
              </DialogHeader>
              
              <ScrollArea className="flex-1 p-3 sm:p-6">
                <div className="space-y-4 sm:space-y-6">
                  <div className="border rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium">
                          {modalEmail.fromAddress?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-sm sm:text-base">{modalEmail.fromAddress}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {modalEmail.dateSent ? new Date(modalEmail.dateSent).toLocaleString() : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="prose max-w-none">
                      {modalEmail.htmlContent ? (
                        <div dangerouslySetInnerHTML={{ __html: modalEmail.htmlContent }} />
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {modalEmail.content || 'No content available'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Gmail-style Email Composer */}
      {showCompose && (
        <GmailEmailComposer
          isOpen={showCompose}
          onClose={() => {
            onShowComposeChange?.(false);
            onShowTheaterFeaturesChange?.(false);
            // Reset forward message and compose mode when closing
            setForwardMessage(null);
            setComposeMode('compose');
          }}
          fromAccountId={selectedAccount.id}
          fromEmail={selectedAccount.emailAddress}
          forwardMessage={forwardMessage ? {
            id: String(forwardMessage.id),
            subject: forwardMessage.subject || '',
            fromAddress: forwardMessage.fromAddress,
            content: forwardMessage.content || '',
            htmlContent: forwardMessage.htmlContent
          } : undefined}
          composeMode={composeMode}
        />
      )}

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
    </>
  );
}