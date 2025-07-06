import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send, Inbox, SentIcon, FileText, Archive, Search, Plus, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

  // Mock data for now - will be replaced with real API calls in Phase 2
  const mockThreads: EmailThread[] = [
    {
      id: 1,
      subject: "Production Meeting Notes - Macbeth",
      participants: ["director@theater.com", "producer@theater.com"],
      lastMessage: "Thanks for the detailed notes from today's meeting...",
      lastMessageTime: "2h ago",
      isRead: false,
      messageCount: 3,
      hasAttachments: true
    },
    {
      id: 2,
      subject: "Costume Fitting Schedule Updates",
      participants: ["costume.designer@theater.com"],
      lastMessage: "I've updated the fitting schedule for next week...",
      lastMessageTime: "4h ago",
      isRead: true,
      messageCount: 1,
      hasAttachments: false
    },
    {
      id: 3,
      subject: "Tech Rehearsal Call Time Changes",
      participants: ["asst.stage.manager@theater.com", "lighting.designer@theater.com"],
      lastMessage: "Quick update on tomorrow's tech rehearsal timing...",
      lastMessageTime: "1d ago",
      isRead: true,
      messageCount: 5,
      hasAttachments: false
    }
  ];

  const folders = [
    { id: 'inbox', name: 'Inbox', icon: Inbox, count: 2 },
    { id: 'sent', name: 'Sent', icon: Send, count: 0 },
    { id: 'drafts', name: 'Drafts', icon: FileText, count: 1 },
    { id: 'archive', name: 'Archive', icon: Archive, count: 0 },
  ];

  const filteredThreads = mockThreads.filter(thread =>
    thread.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())) ||
    thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Account Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {selectedAccount.emailAddress.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedAccount.emailAddress}</p>
              <p className="text-xs text-muted-foreground capitalize">{selectedAccount.accountType}</p>
            </div>
          </div>
        </div>

        {/* Compose Button */}
        <div className="p-4">
          <Button 
            onClick={() => setShowCompose(true)}
            className="w-full justify-start gap-2"
          >
            <Plus className="h-4 w-4" />
            Compose
          </Button>
        </div>

        {/* Folders */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  selectedFolder === folder.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <folder.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{folder.name}</span>
                {folder.count > 0 && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    {folder.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Thread List */}
      <div className="w-80 border-r flex flex-col">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Thread List Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold capitalize">{selectedFolder}</h2>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Threads */}
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedThread?.id === thread.id ? 'bg-muted' : ''
                } ${!thread.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm line-clamp-1 ${!thread.isRead ? 'font-semibold' : 'font-medium'}`}>
                      {thread.subject}
                    </h3>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {thread.lastMessageTime}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="truncate">
                      {thread.participants.join(', ')}
                    </span>
                    {thread.messageCount > 1 && (
                      <Badge variant="outline" className="h-4 text-xs">
                        {thread.messageCount}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {thread.lastMessage}
                  </p>
                  
                  <div className="flex items-center gap-1">
                    {!thread.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                    {thread.hasAttachments && (
                      <Mail className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Message View */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Thread Header */}
            <div className="p-6 border-b">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold">{selectedThread.subject}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{selectedThread.participants.join(', ')}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{selectedThread.messageCount} messages</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{selectedThread.lastMessageTime}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <Button variant="outline" size="sm">
                  Archive
                </Button>
                <Button variant="outline" size="sm">
                  Delete
                </Button>
                <Button variant="outline" size="sm">
                  Mark as unread
                </Button>
                <div className="flex-1" />
                <Button size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Reply
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted">
                          {selectedThread.participants[0]?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{selectedThread.participants[0]}</span>
                          <span className="text-xs text-muted-foreground">2 hours ago</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          to {selectedAccount.emailAddress}
                        </div>
                      </div>
                    </div>
                    
                    <div className="prose prose-sm max-w-none">
                      <p>Hi Bryan,</p>
                      <p>Thanks for the detailed notes from today's production meeting. I've reviewed the technical requirements and have a few thoughts:</p>
                      <ul>
                        <li>The lighting cues for Act 2 Scene 3 need more precision timing</li>
                        <li>Sound levels during the storm sequence should be tested again</li>
                        <li>We need to coordinate with wardrobe on the quick changes</li>
                      </ul>
                      <p>Let's schedule a follow-up meeting for Friday to go over these items in detail.</p>
                      <p>Best regards,<br />Sarah</p>
                    </div>
                  </div>
                </Card>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Mail className="h-12 w-12 mx-auto opacity-50" />
              <p>Select an email to view</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Dialog would go here when showCompose is true */}
    </div>
  );
}