import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send, Inbox, FileText, Archive, Search, Plus, MoreHorizontal, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

        <div className="flex flex-1">
          {/* Thread List */}
          <div className="w-80 border-r flex flex-col">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Thread List */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedThread?.id === thread.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${thread.isRead ? 'bg-transparent' : 'bg-blue-500'}`} />
                        <span className="font-medium text-sm truncate">{thread.subject}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{thread.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {thread.participants.join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {thread.lastMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {thread.messageCount > 1 && (
                        <Badge variant="secondary" className="h-4 text-xs">
                          {thread.messageCount}
                        </Badge>
                      )}
                      {thread.hasAttachments && (
                        <Badge variant="outline" className="h-4 text-xs">
                          📎
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Message Content */}
          <div className="flex-1 flex flex-col">
            {selectedThread ? (
              <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <h1 className="text-2xl font-semibold mb-2">{selectedThread.subject}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>From: {selectedThread.participants.join(', ')}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{selectedThread.lastMessageTime}</span>
                    </div>
                  </div>
                  
                  <Card className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {selectedThread.participants[0]?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{selectedThread.participants[0]}</span>
                            <span className="text-sm text-muted-foreground">{selectedThread.lastMessageTime}</span>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <p>{selectedThread.lastMessage}</p>
                            <p>This is a sample email message that would contain the full content of the conversation. In the actual implementation, this would be loaded from the email server and display the complete message thread.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <div className="mt-6 flex gap-2">
                    <Button variant="outline" size="sm">
                      Reply
                    </Button>
                    <Button variant="outline" size="sm">
                      Reply All
                    </Button>
                    <Button variant="outline" size="sm">
                      Forward
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">Choose a conversation from the list to read messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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