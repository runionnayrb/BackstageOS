import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Send, ChevronDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer } from "vaul";
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
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [draftId, setDraftId] = useState<number | null>(existingDraftId || null);

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!toAddresses.trim() || !subject.trim()) {
        throw new Error('To address and subject are required');
      }

      const emailData = {
        fromAccountId,
        toAddresses: toAddresses.trim(),
        ccAddresses: ccAddresses.trim() || undefined,
        bccAddresses: bccAddresses.trim() || undefined,
        subject: subject.trim(),
        content: content.trim(),
        isReply: !!replyToMessage,
        originalMessageId: replyToMessage?.id
      };

      return apiRequest('/api/email/send', {
        method: 'POST',
        body: JSON.stringify(emailData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully",
        description: "Your message has been delivered.",
      });
      
      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Delete the draft if it exists
      if (draftId) {
        apiRequest(`/api/email/drafts/${draftId}`, {
          method: 'DELETE'
        }).catch(() => {}); // Silent fail for draft deletion
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/email/inbox'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/sent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/drafts'] });
      
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const draftData = {
        fromAccountId,
        toAddresses: toAddresses.trim(),
        ccAddresses: ccAddresses.trim() || undefined,
        bccAddresses: bccAddresses.trim() || undefined,
        subject: subject.trim(),
        content: content.trim(),
        threadId: null
      };

      if (draftId) {
        // Update existing draft
        return apiRequest(`/api/email/drafts/${draftId}`, {
          method: 'PUT',
          body: JSON.stringify(draftData)
        });
      } else {
        // Create new draft
        const result = await apiRequest('/api/email/drafts', {
          method: 'POST',
          body: JSON.stringify(draftData)
        });
        setDraftId(result.id);
        return result;
      }
    },
    onSuccess: () => {
      const now = new Date();
      setLastSaved(now);
      setAutoSaveStatus(`Auto-saved ${now.toLocaleTimeString()}`);
      
      // Invalidate drafts query
      queryClient.invalidateQueries({ queryKey: ['/api/email/drafts'] });
    },
    onError: () => {
      setAutoSaveStatus('Failed to save draft');
    },
  });

  // Auto-save logic
  useEffect(() => {
    const hasContent = toAddresses.trim() || subject.trim() || content.trim() || ccAddresses.trim() || bccAddresses.trim();
    
    if (hasContent && isOpen) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      setAutoSaveStatus('Auto-saving draft...');
      
      // Set new timer for 2 seconds
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraftMutation.mutate();
      }, 2000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [toAddresses, subject, content, ccAddresses, bccAddresses, isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleSend = () => {
    sendEmailMutation.mutate();
  };

  const handleClose = () => {
    setToAddresses('');
    setCcAddresses('');
    setBccAddresses('');
    setSubject('');
    setContent('');
    setShowCc(false);
    setShowBcc(false);
    setAutoSaveStatus('');
    setLastSaved(null);
    setDraftId(null);
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
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

  // Mobile composer component
  const MobileComposer = () => (
    <Drawer.Root open={isOpen} onOpenChange={handleClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <Button 
              variant="ghost" 
              onClick={handleExitClick}
              className="text-gray-500 hover:text-gray-700 p-1 h-auto"
            >
              <X className="h-5 w-5" />
            </Button>
            <Drawer.Title className="text-lg font-semibold text-black">
              {replyToMessage ? 'Reply' : 'New Message'}
            </Drawer.Title>
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

            {/* CC field */}
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

            {/* BCC field */}
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

            {/* From field */}
            <div className="flex items-center py-3 border-b border-gray-200">
              <span className="text-gray-500 w-12 text-sm">From:</span>
              <span className="text-black text-base">{fromEmail}</span>
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

          {/* Message content */}
          <div className="flex-1 p-4">
            <textarea
              placeholder="Compose your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full bg-transparent border-0 outline-none resize-none text-base focus:ring-0 focus:outline-none"
              style={{ fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            />
          </div>

          {/* Auto-save status */}
          <div className="px-4 pb-4">
            {autoSaveStatus && (
              <p className="text-xs text-gray-500 text-center">
                {autoSaveStatus}
              </p>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );

  // Desktop composer component  
  const DesktopComposer = () => (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[95vh] max-h-[90vh] flex flex-col p-0 border bg-white [&>button]:hidden">
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

            {/* CC field */}
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

            {/* BCC field */}
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

            {/* From field */}
            <div className="flex items-center py-3 border-b border-gray-200">
              <span className="text-gray-500 w-12 text-sm">From:</span>
              <span className="text-black text-base">{fromEmail}</span>
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

          {/* Message content */}
          <div className="flex-1 p-4">
            <textarea
              placeholder="Compose your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full bg-transparent border-0 outline-none resize-none text-base focus:ring-0 focus:outline-none"
              style={{ fontSize: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            />
          </div>

          {/* Auto-save status */}
          <div className="px-4 pb-4">
            {autoSaveStatus && (
              <p className="text-xs text-gray-500 text-center">
                {autoSaveStatus}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {isMobile ? <MobileComposer /> : <DesktopComposer />}
      
      {/* Exit confirmation dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="max-w-md">
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