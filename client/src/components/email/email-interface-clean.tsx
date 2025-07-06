import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Search, Star, Archive, Reply, ReplyAll, Forward, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { EmailAccountConfig } from './email-account-config';
import { EmailComposer } from './email-composer';
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
}

export function EmailInterface({ selectedAccount, onBack, showCompose, onShowComposeChange }: EmailInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalEmail, setModalEmail] = useState<EmailMessage | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);

  // Fetch inbox messages for the selected account
  const { data: inboxMessages, isLoading, error } = useQuery<EmailMessage[]>({
    queryKey: ['/api/email/accounts', selectedAccount.id, 'inbox'],
    enabled: selectedAccount?.id > 0,
  });

  const filteredMessages = (inboxMessages || []).filter((message: EmailMessage) =>
    message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.fromAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEmailClick = (email: EmailMessage) => {
    setModalEmail(email);
    setShowEmailModal(true);
  };

  const handleReply = () => {
    // Reply logic here
    setShowEmailModal(false);
  };

  const handleReplyAll = () => {
    // Reply all logic here
    setShowEmailModal(false);
  };

  const handleForward = () => {
    // Forward logic here
    setShowEmailModal(false);
  };

  const handleArchive = () => {
    // Archive logic here
    setShowEmailModal(false);
  };

  const handleDelete = () => {
    // Delete logic here  
    setShowEmailModal(false);
  };

  return (
    <>
      <div className="relative h-[calc(100vh-120px)] bg-background">
        {/* Full-Width Header - Mobile Optimized */}
        <div className="absolute top-0 left-0 right-0 h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center gap-2 sm:gap-6 px-2 sm:px-4 z-50">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 ml-1 sm:ml-2 flex-shrink-0">Email</h1>
          <div className="relative flex-1 max-w-md sm:max-w-none">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 sm:pl-10 w-full text-sm sm:text-base h-8 sm:h-10"
            />
          </div>
        </div>

        {/* Content Area - Mobile Responsive */}
        <div className="pt-14 sm:pt-16 h-full">
          {/* Full-Width Email List */}
          <ScrollArea className="h-full">
            <div className="space-y-0 sm:space-y-1">
              {isLoading && (
                <div className="p-4 text-center text-muted-foreground">
                  Loading messages...
                </div>
              )}
              {error && (
                <div className="p-4 text-center text-red-600">
                  Error loading messages
                </div>
              )}
              {filteredMessages.map((message: EmailMessage) => (
                <button
                  key={message.id}
                  onClick={() => handleEmailClick(message)}
                  className="w-full block text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none group px-3 sm:px-4 py-2 sm:py-3 border-b border-muted-foreground/10"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                    {/* Left side - Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!message.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 mb-1">
                            <span className={`font-medium text-xs sm:text-sm truncate ${!message.isRead ? 'font-semibold' : ''}`}>
                              {message.subject || 'No Subject'}
                            </span>
                            {message.hasAttachments && (
                              <Badge variant="outline" className="h-4 sm:h-5 text-xs px-1 sm:px-2">
                                📎
                              </Badge>
                            )}
                            {message.isImportant && (
                              <Badge variant="secondary" className="h-4 sm:h-5 text-xs px-1 sm:px-2">
                                ⭐
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                            <span className="truncate font-medium">{message.fromAddress}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate flex-1 text-xs opacity-75">{message.content?.slice(0, 80) || 'No content preview'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side - Time and icons - Mobile Optimized */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0 sm:ml-4">
                        <span className="text-xs text-muted-foreground">
                          {message.dateSent ? new Date(message.dateSent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 w-5 sm:h-6 sm:w-6 p-0 opacity-60 sm:opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle star
                            }}
                          >
                            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 w-5 sm:h-6 sm:w-6 p-0 opacity-60 sm:opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive();
                            }}
                          >
                            <Archive className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </Button>
                        </div>
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
        <DialogContent className="w-[95vw] sm:max-w-6xl h-[95vh] max-w-[95vw] sm:max-w-6xl flex flex-col">
          {modalEmail && (
            <>
              <DialogHeader className="border-b pb-3 sm:pb-4">
                <DialogTitle className="text-base sm:text-xl font-semibold">{modalEmail.subject || 'No Subject'}</DialogTitle>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span>From: {modalEmail.fromAddress}</span>
                    <Separator orientation="vertical" className="hidden sm:block h-4" />
                    <span>{modalEmail.dateSent ? new Date(modalEmail.dateSent).toLocaleString() : ''}</span>
                    {modalEmail.hasAttachments && (
                      <>
                        <Separator orientation="vertical" className="hidden sm:block h-4" />
                        <span className="flex items-center gap-1">
                          📎 Attachments
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReply}
                      className="h-8 px-3"
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReplyAll}
                      className="h-8 px-3"
                    >
                      <ReplyAll className="h-4 w-4 mr-1" />
                      Reply All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleForward}
                      className="h-8 px-3"
                    >
                      <Forward className="h-4 w-4 mr-1" />
                      Forward
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleArchive}
                      className="h-8 px-3"
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="h-8 px-3 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
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

      {/* Email Composer */}
      {showCompose && (
        <EmailComposer
          isOpen={showCompose}
          onClose={() => onShowComposeChange?.(false)}
          fromAccountId={selectedAccount.id}
          fromEmail={selectedAccount.emailAddress}
        />
      )}

      {/* Email Account Configuration */}
      {showConfiguration && (
        <EmailAccountConfig
          accountId={selectedAccount.id}
          onClose={() => setShowConfiguration(false)}
        />
      )}
    </>
  );
}