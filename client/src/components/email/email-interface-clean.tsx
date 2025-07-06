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
        {/* Mobile-First Header */}
        <div className="absolute top-0 left-0 right-0 h-12 md:h-16 bg-white border-b border-gray-200 flex items-center gap-2 md:gap-6 px-2 md:px-4 z-50">
          <h1 className="text-sm md:text-lg font-semibold text-gray-900 flex-shrink-0">Email</h1>
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

        {/* Content Area - Mobile Responsive */}
        <div className="pt-12 md:pt-16 h-full">
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
                  onClick={() => handleEmailClick(message)}
                  className="w-full block text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none group px-3 md:px-4 py-2 md:py-3 border-b border-gray-100"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-1 md:gap-0">
                    {/* Left side - Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        {!message.isRead && (
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
                      className="h-8 px-2 md:px-3 text-xs md:text-sm"
                    >
                      <Reply className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      Reply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReplyAll}
                      className="h-8 px-2 md:px-3 text-xs md:text-sm"
                    >
                      <ReplyAll className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      All
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