import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send, Inbox, FileText, Archive, Search, Plus, MoreHorizontal, ArrowLeft, Settings, Reply, Trash2, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface EmailAccount {
  id: number;
  emailAddress: string;
  accountType: string;
  isDefault: boolean;
}

interface EmailInterfaceProps {
  selectedAccount: EmailAccount;
  onBack?: () => void;
}

export function EmailInterface({ selectedAccount, onBack }: EmailInterfaceProps) {
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [modalEmail, setModalEmail] = useState<EmailThread | null>(null);
  const [showReplyComposer, setShowReplyComposer] = useState(false);

  // Mock data for now - will be replaced with real API calls in Phase 2
  const mockThreads: EmailThread[] = [
    {
      id: 1,
      subject: "Production Meeting Notes - Macbeth",
      participants: ["director@theater.com", "producer@theater.com"],
      lastMessage: "Thanks for the detailed notes from today's meeting...",
      lastMessageTime: "2 hours ago",
      isRead: false,
      messageCount: 3,
      hasAttachments: true
    },
    {
      id: 2,
      subject: "Rehearsal Schedule Update",
      participants: ["assistant@theater.com"],
      lastMessage: "The rehearsal schedule for next week has been updated...",
      lastMessageTime: "4 hours ago",
      isRead: true,
      messageCount: 1,
      hasAttachments: false
    },
    {
      id: 3,
      subject: "Props List Review",
      participants: ["props@theater.com", "set@theater.com"],
      lastMessage: "I've reviewed the props list and have a few suggestions...",
      lastMessageTime: "Yesterday",
      isRead: true,
      messageCount: 5,
      hasAttachments: true
    }
  ];

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
    setShowReplyComposer(true);
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
    <div className="flex h-[calc(100vh-120px)] bg-background">
      {/* Main Content - Full Width */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {selectedAccount.emailAddress.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{selectedAccount.emailAddress}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedAccount.accountType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowCompose(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Compose
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowConfiguration(true)}
                title="Account Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Full-Width Email List */}
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {filteredThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleEmailClick(thread)}
                className="w-full p-4 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  {/* Left side - Email details */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${thread.isRead ? 'bg-transparent' : 'bg-blue-500'}`} />
                    
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
              </button>
            ))}
          </div>
        </ScrollArea>
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
                  
                  {/* Action Icons */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleReply} 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 hover:bg-transparent hover:text-blue-600"
                    >
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 hover:bg-transparent hover:text-blue-600"
                    >
                      <Reply className="h-4 w-4 scale-x-[-1]" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 hover:bg-transparent hover:text-blue-600"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={handleArchive} 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 hover:bg-transparent hover:text-blue-600"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={handleDelete} 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 hover:bg-transparent hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-medium">{modalEmail.participants[0]}</span>
                      <span className="text-sm text-muted-foreground">{modalEmail.lastMessageTime}</span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p>{modalEmail.lastMessage}</p>
                      <p>This is a sample email message that would contain the full content of the conversation. In the actual implementation, this would be loaded from the email server and display the complete message thread with proper formatting, attachments, and conversation history.</p>
                      <p>The modal provides a clean, focused reading experience with all the necessary actions available through the toolbar below.</p>
                    </div>
                  </div>
                </div>
              </div>



              {/* Reply Composer */}
              {showReplyComposer && (
                <div className="border-t pt-4 mt-4">
                  <EmailComposer
                    isOpen={true}
                    onClose={() => setShowReplyComposer(false)}
                    fromAccountId={selectedAccount.id}
                    fromEmail={selectedAccount.emailAddress}
                    replyToMessage={{
                      id: modalEmail.id.toString(),
                      subject: modalEmail.subject,
                      fromAddress: modalEmail.participants[0],
                      content: modalEmail.lastMessage
                    }}
                  />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Composer Modal */}
      {showCompose && (
        <EmailComposer
          isOpen={showCompose}
          onClose={() => setShowCompose(false)}
          fromAccountId={selectedAccount.id}
          fromEmail={selectedAccount.emailAddress}
        />
      )}

      {/* Account Configuration Modal */}
      {showConfiguration && (
        <EmailAccountConfig
          accountId={selectedAccount.id}
          onClose={() => setShowConfiguration(false)}
        />
      )}
    </div>
  );
}