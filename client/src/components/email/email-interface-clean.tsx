import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Search, Star, Archive, Reply, ReplyAll, Forward, Trash2 } from 'lucide-react';
import { EmailAccountConfig } from './email-account-config';
import { EmailComposer } from './email-composer';

interface EmailThread {
  id: number;
  subject: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: string;
  isRead: boolean;
  messageCount: number;
  hasAttachments: boolean;
}

const mockThreads: EmailThread[] = [
  {
    id: 1,
    subject: "Tech Rehearsal Notes - Week 3",
    participants: ["Sarah Johnson", "Mike Chen"],
    lastMessage: "The lighting changes for Act II Scene 2 look great. Just need to adjust...",
    lastMessageTime: "2:30 PM",
    isRead: false,
    messageCount: 4,
    hasAttachments: true
  },
  {
    id: 2,
    subject: "Costume Fittings Tomorrow",
    participants: ["Emily Rodriguez"],
    lastMessage: "Reminder that we have costume fittings scheduled for tomorrow at 10 AM...",
    lastMessageTime: "1:15 PM",
    isRead: true,
    messageCount: 1,
    hasAttachments: false
  },
  {
    id: 3,
    subject: "Script Updates - Page 47",
    participants: ["David Kim", "Alex Thompson"],
    lastMessage: "Thanks for the quick turnaround on those line changes. The actors...",
    lastMessageTime: "11:45 AM",
    isRead: false,
    messageCount: 6,
    hasAttachments: false
  }
];

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
  const [modalEmail, setModalEmail] = useState<EmailThread | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);

  const filteredThreads = mockThreads.filter(thread =>
    thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
    thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEmailClick = (email: EmailThread) => {
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
        {/* Full-Width Header */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center gap-6 px-4 z-50">
          <h1 className="text-lg font-semibold text-gray-900 ml-2 flex-shrink-0">Email</h1>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="pt-16 h-full">
          {/* Full-Width Email List */}
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleEmailClick(thread)}
                  className="w-full block text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none group px-4 py-3 border-b border-muted-foreground/10"
                >
                  <div className="flex items-start justify-between">
                    {/* Left side - Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!thread.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`font-medium text-sm truncate ${!thread.isRead ? 'font-semibold' : ''}`}>
                              {thread.subject}
                            </span>
                            {thread.hasAttachments && (
                              <Badge variant="outline" className="h-5 text-xs px-2">
                                📎
                              </Badge>
                            )}
                            {thread.messageCount > 1 && (
                              <Badge variant="secondary" className="h-5 text-xs px-2">
                                {thread.messageCount}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">{thread.participants.join(', ')}</span>
                            <span>•</span>
                            <span className="truncate flex-1">{thread.lastMessage}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side - Time and icons */}
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className="text-xs text-muted-foreground">{thread.lastMessageTime}</span>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10"
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
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10"
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
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col">
          {modalEmail && (
            <>
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="text-xl font-semibold">{modalEmail.subject}</DialogTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>From: {modalEmail.participants.join(', ')}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{modalEmail.lastMessageTime}</span>
                    {modalEmail.hasAttachments && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="flex items-center gap-1">
                          📎 Attachments
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
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
              
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {modalEmail.participants[0]?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{modalEmail.participants[0]}</div>
                          <div className="text-sm text-muted-foreground">{modalEmail.lastMessageTime}</div>
                        </div>
                      </div>
                    </div>
                    <div className="prose max-w-none">
                      <p>
                        {modalEmail.lastMessage}
                      </p>
                      <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                      </p>
                      <p>
                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                      </p>
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