import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  fromAccountId: number;
  fromEmail: string;
  replyToMessage?: {
    id: string;
    subject: string;
    fromAddress: string;
    content: string;
  };
  existingDraftId?: number;
}

export function EmailComposer({ 
  isOpen, 
  onClose, 
  fromAccountId, 
  fromEmail,
  replyToMessage,
  existingDraftId 
}: EmailComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [toAddresses, setToAddresses] = useState<string>('');
  const [ccAddresses, setCcAddresses] = useState<string>('');
  const [bccAddresses, setBccAddresses] = useState<string>('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [subject, setSubject] = useState(
    replyToMessage ? 
      (replyToMessage.subject.startsWith('Re: ') ? replyToMessage.subject : `Re: ${replyToMessage.subject}`) : 
      ''
  );
  const [content, setContent] = useState(
    replyToMessage ? 
      `\n\n--- Original Message ---\nFrom: ${replyToMessage.fromAddress}\nSubject: ${replyToMessage.subject}\n\n${replyToMessage.content}` : 
      ''
  );

  // Draft state
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(existingDraftId || null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Remove unused editor state for Apple Mail simplicity

  // Send email mutation with queue integration
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: {
      fromAccountId: number;
      toAddresses: string[];
      subject: string;
      content: string;
      ccAddresses?: string[];
      bccAddresses?: string[];
      replyToMessageId?: string;
    }) => {
      // Use the enhanced queue-based sending endpoint
      return await apiRequest('POST', '/api/email/send-with-queue', {
        accountId: emailData.fromAccountId,
        to: emailData.toAddresses,
        cc: emailData.ccAddresses,
        bcc: emailData.bccAddresses,
        subject: emailData.subject,
        message: emailData.content,
        replyTo: undefined, // Could be enhanced later
        threadId: undefined, // Auto-created if not provided
        priority: 5, // Normal priority
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Email queued",
        description: "Your email has been queued for delivery and will be sent shortly.",
      });
      
      // Invalidate email queries to refresh the inbox
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', fromAccountId, 'inbox'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', fromAccountId, 'sent'] });
      
      // Reset form and close
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "There was an error sending your email.",
        variant: "destructive",
      });
    }
  });

  // Auto-save draft mutation
  const autoSaveDraftMutation = useMutation({
    mutationFn: async (draftData: {
      id?: number;
      accountId: number;
      toAddresses: string[];
      subject: string;
      content: string;
      ccAddresses?: string[];
      bccAddresses?: string[];
    }) => {
      if (draftData.id) {
        // Update existing draft
        return await apiRequest('PUT', `/api/email/drafts/${draftData.id}`, draftData);
      } else {
        // Create new draft
        return await apiRequest('POST', '/api/email/drafts', draftData);
      }
    },
    onSuccess: async (response) => {
      const data = await response.json();
      if (!currentDraftId && data?.id) {
        setCurrentDraftId(data.id);
      }
      setLastSaved(new Date());
      setIsAutoSaving(false);
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', fromAccountId, 'drafts'] });
    },
    onError: (error) => {
      console.error('Error auto-saving draft:', error);
      setIsAutoSaving(false);
    }
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (draftData: {
      accountId: number;
      toAddresses: string[];
      subject: string;
      content: string;
      ccAddresses?: string[];
      bccAddresses?: string[];
    }) => {
      return await apiRequest('POST', '/api/email/drafts', draftData);
    },
    onSuccess: () => {
      toast({
        title: "Draft saved",
        description: "Your draft has been saved.",
      });
      
      // Invalidate drafts query
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', fromAccountId, 'drafts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save draft",
        description: error.message || "There was an error saving your draft.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setToAddresses('');
    setCcAddresses('');
    setBccAddresses('');
    setSubject('');
    setContent('');
    setCurrentDraftId(null);
    setLastSaved(null);
  };

  // Auto-save function
  const triggerAutoSave = () => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only auto-save if there's content
    if (!toAddresses.trim() && !subject.trim() && !content.trim()) {
      return;
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      setIsAutoSaving(true);
      
      const toArray = toAddresses.split(',').map(email => email.trim()).filter(Boolean);
      const ccArray = ccAddresses.split(',').map(email => email.trim()).filter(Boolean);
      const bccArray = bccAddresses.split(',').map(email => email.trim()).filter(Boolean);

      autoSaveDraftMutation.mutate({
        id: currentDraftId || undefined,
        accountId: fromAccountId,
        toAddresses: toArray,
        ccAddresses: ccArray.length > 0 ? ccArray : undefined,
        bccAddresses: bccArray.length > 0 ? bccArray : undefined,
        subject,
        content,
      });
    }, 2000); // Auto-save after 2 seconds of inactivity
  };

  // Auto-save effects
  useEffect(() => {
    triggerAutoSave();
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [toAddresses, ccAddresses, bccAddresses, subject, content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = () => {
    if (!toAddresses.trim()) {
      toast({
        title: "Recipients required",
        description: "Please enter at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a subject for your email.",
        variant: "destructive",
      });
      return;
    }

    const emailData = {
      fromAccountId,
      toAddresses: toAddresses.split(',').map(addr => addr.trim()).filter(Boolean),
      subject: subject.trim(),
      content: content.trim(),
      ccAddresses: ccAddresses ? ccAddresses.split(',').map(addr => addr.trim()).filter(Boolean) : undefined,
      bccAddresses: bccAddresses ? bccAddresses.split(',').map(addr => addr.trim()).filter(Boolean) : undefined,
      replyToMessageId: replyToMessage?.id
    };

    sendEmailMutation.mutate(emailData);
  };

  const handleSaveDraft = () => {
    const draftData = {
      accountId: fromAccountId,
      toAddresses: toAddresses ? toAddresses.split(',').map(addr => addr.trim()).filter(Boolean) : [],
      subject: subject || 'Draft',
      content: content || '',
      ccAddresses: ccAddresses ? ccAddresses.split(',').map(addr => addr.trim()).filter(Boolean) : undefined,
      bccAddresses: bccAddresses ? bccAddresses.split(',').map(addr => addr.trim()).filter(Boolean) : undefined,
    };

    saveDraftMutation.mutate(draftData);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleExitClick = () => {
    // Check if there's any content to save
    if (toAddresses.trim() || subject.trim() || content.trim() || ccAddresses.trim() || bccAddresses.trim()) {
      setShowExitDialog(true);
    } else {
      handleClose();
    }
  };

  const handleDeleteDraft = () => {
    setShowExitDialog(false);
    handleClose();
  };

  const handleSaveDraftAndExit = async () => {
    try {
      await saveDraftMutation.mutateAsync();
      setShowExitDialog(false);
      handleClose();
    } catch (error) {
      // If save fails, still close
      setShowExitDialog(false);
      handleClose();
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[100vw] h-[100vh] md:w-[95vw] md:max-w-4xl md:h-[95vh] md:max-h-[90vh] flex flex-col p-0 md:p-6 border-0 md:border bg-white [&>button]:hidden">
        {/* Apple Mail Style Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <Button 
            variant="ghost" 
            onClick={handleExitClick}
            className="text-gray-500 hover:text-gray-700 p-1 h-auto"
          >
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-black">
            {replyToMessage ? 'Reply' : 'New Message'}
          </h1>
          <Button
            variant="ghost"
            onClick={handleSend}
            disabled={sendEmailMutation.isPending || !toAddresses.trim() || !subject.trim()}
            className="text-blue-500 hover:text-blue-600 p-1 h-auto disabled:opacity-50"
          >
            <Send className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col bg-white overflow-y-auto">
          {/* Apple Mail Style Fields */}
          <div className="px-4">
            {/* To field */}
            <div className="flex items-center py-3 border-b border-gray-200">
              <span className="text-gray-500 w-12 text-sm">To:</span>
              <input
                type="text"
                placeholder=""
                value={toAddresses}
                onChange={(e) => setToAddresses(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-base focus:ring-0 focus:outline-none p-0"
                style={{ fontSize: '16px', boxShadow: 'none' }}
              />
              <Button variant="ghost" size="sm" className="text-blue-500 p-0 h-auto ml-2">
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* CC field (conditionally shown) */}
            {showCc && (
              <div className="flex items-center py-3 border-b border-gray-200">
                <span className="text-gray-500 w-12 text-sm">Cc:</span>
                <input
                  type="text"
                  placeholder=""
                  value={ccAddresses}
                  onChange={(e) => setCcAddresses(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-base focus:ring-0 focus:outline-none p-0"
                  style={{ fontSize: '16px', boxShadow: 'none' }}
                />
              </div>
            )}

            {/* BCC field (conditionally shown) */}
            {showBcc && (
              <div className="flex items-center py-3 border-b border-gray-200">
                <span className="text-gray-500 w-12 text-sm">Bcc:</span>
                <input
                  type="text"
                  placeholder=""
                  value={bccAddresses}
                  onChange={(e) => setBccAddresses(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-base focus:ring-0 focus:outline-none p-0"
                  style={{ fontSize: '16px', boxShadow: 'none' }}
                />
              </div>
            )}

            {/* CC/BCC/From field */}
            <div className="flex items-center py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-blue-500 text-sm hover:text-blue-600"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    className="text-blue-500 text-sm hover:text-blue-600"
                  >
                    Bcc
                  </button>
                )}
                <span className="text-gray-500 text-sm">From:</span>
              </div>
              <span className="flex-1 text-gray-500 text-sm ml-2">{fromEmail}</span>
            </div>

            {/* Subject field */}
            <div className="flex items-center py-3 border-b border-gray-200">
              <span className="text-gray-500 w-12 text-sm">Subject:</span>
              <input
                type="text"
                placeholder=""
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-base focus:ring-0 focus:outline-none p-0"
                style={{ fontSize: '16px', boxShadow: 'none' }}
              />
            </div>
          </div>

          {/* Apple Mail Style Message Area */}
          <div className="flex-1 px-4 pt-4">
            <textarea
              placeholder=""
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[300px] resize-none border-0 outline-none bg-transparent text-base focus:ring-0 focus:outline-none p-0"
              style={{ 
                fontSize: '16px',
                lineHeight: '1.5',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                boxShadow: 'none'
              }}
            />
          </div>

          {/* Status and Auto-save indicator */}
          {(isAutoSaving || lastSaved) && (
            <div className="px-4 pb-4">
              <div className="text-xs text-gray-500">
                {isAutoSaving ? (
                  "Auto-saving draft..."
                ) : lastSaved ? (
                  `Auto-saved ${lastSaved.toLocaleTimeString()}`
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Exit Confirmation Dialog - Separate from main dialog */}
    <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
      <DialogContent className="w-[90vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Save Draft?</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Do you want to save this message as a draft before exiting?
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleDeleteDraft}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Delete
          </Button>
          <Button
            onClick={handleSaveDraftAndExit}
            disabled={saveDraftMutation.isPending}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}