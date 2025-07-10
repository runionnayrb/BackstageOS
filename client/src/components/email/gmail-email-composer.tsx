import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Send, ChevronDown, Paperclip, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GmailEmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  fromAccountId: number;
  fromEmail: string;
  replyToMessage?: {
    id: string;
    subject: string;
    fromAddress: string;
    content: string;
    toAddresses?: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
  };
  forwardMessage?: {
    id: string;
    subject: string;
    fromAddress: string;
    content: string;
    htmlContent?: string;
  };
  composeMode?: 'compose' | 'reply' | 'replyAll' | 'forward';
}

export function GmailEmailComposer({ 
  isOpen, 
  onClose, 
  fromAccountId, 
  fromEmail,
  replyToMessage,
  forwardMessage,
  composeMode = 'compose'
}: GmailEmailComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all email accounts and find the specific one
  const { data: emailAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/email/accounts'],
    enabled: isOpen && !!fromAccountId,
  });

  // Find the specific account from the accounts list
  const emailAccount = emailAccounts?.find((account: any) => account.id === fromAccountId);

  // Helper function to get reply recipients based on mode
  const getReplyRecipients = () => {
    if (!replyToMessage) return { to: '', cc: '', bcc: '', showCc: false, showBcc: false };
    
    if (composeMode === 'reply') {
      // For reply: send to original sender only
      return {
        to: replyToMessage.fromAddress,
        cc: '',
        bcc: '',
        showCc: false,
        showBcc: false
      };
    } else if (composeMode === 'replyAll') {
      // For reply all: include original sender in To, and include all original recipients in CC
      const originalTo = replyToMessage.toAddresses || [];
      const originalCc = replyToMessage.ccAddresses || [];
      
      // Remove our own email from recipients to avoid self-reply
      const filteredTo = originalTo.filter(addr => addr !== fromEmail);
      const filteredCc = originalCc.filter(addr => addr !== fromEmail);
      
      // Combine all recipients (except sender) for CC
      const allRecipients = [...filteredTo, ...filteredCc].filter(addr => addr !== replyToMessage.fromAddress);
      
      return {
        to: replyToMessage.fromAddress,
        cc: allRecipients.join(', '),
        bcc: '',
        showCc: allRecipients.length > 0,
        showBcc: false
      };
    }
    
    return { to: '', cc: '', bcc: '', showCc: false, showBcc: false };
  };

  const replyRecipients = getReplyRecipients();

  // Form state - initialize with reply recipients if applicable
  const [toAddresses, setToAddresses] = useState<string>(replyRecipients.to);
  const [ccAddresses, setCcAddresses] = useState<string>(replyRecipients.cc);
  const [bccAddresses, setBccAddresses] = useState<string>(replyRecipients.bcc);
  const [showCc, setShowCc] = useState(replyRecipients.showCc);
  const [showBcc, setShowBcc] = useState(replyRecipients.showBcc);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [subject, setSubject] = useState(() => {
    if (replyToMessage) {
      return replyToMessage.subject.startsWith('Re: ') ? replyToMessage.subject : `Re: ${replyToMessage.subject}`;
    }
    if (forwardMessage) {
      return forwardMessage.subject.startsWith('Fwd: ') ? forwardMessage.subject : `Fwd: ${forwardMessage.subject}`;
    }
    return '';
  });
  
  // Helper function to convert HTML signature to plain text
  const htmlToPlainText = (html: string) => {
    // Convert common HTML tags to plain text equivalents
    return html
      .replace(/<b>/g, '')
      .replace(/<\/b>/g, '')
      .replace(/<i>/g, '')
      .replace(/<\/i>/g, '')
      .replace(/<u>/g, '')
      .replace(/<\/u>/g, '')
      .replace(/<div>/g, '\n')
      .replace(/<\/div>/g, '')
      .replace(/<br>/g, '\n')
      .replace(/<br\/>/g, '\n')
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  // Helper function to get content with signature
  const getContentWithSignature = (baseContent: string = '', signature: string = '') => {
    if (!signature) return baseContent;
    
    // Convert HTML signature to plain text for textarea
    const plainTextSignature = htmlToPlainText(signature);
    
    // For compose mode, start with signature
    if (composeMode === 'compose' && !baseContent) {
      return `\n\n${plainTextSignature}`;
    }
    
    // For forwards, replies, and reply-all, put signature above the original content
    if ((composeMode === 'forward' || composeMode === 'reply' || composeMode === 'replyAll') && baseContent) {
      return `\n\n${plainTextSignature}\n\n${baseContent}`;
    }
    
    // For any other content, append signature after
    if (baseContent) {
      return `${baseContent}\n\n${plainTextSignature}`;
    }
    
    return `\n\n${plainTextSignature}`;
  };

  const [content, setContent] = useState(() => {
    // Start with basic content without signature since emailAccount isn't loaded yet
    if (replyToMessage) {
      return `\n\n--- Original Message ---\nFrom: ${replyToMessage.fromAddress}\nSubject: ${replyToMessage.subject}\n\n${replyToMessage.content}`;
    }
    if (forwardMessage) {
      return `\n\n---------- Forwarded message ----------\nFrom: ${forwardMessage.fromAddress}\nSubject: ${forwardMessage.subject}\n\n${forwardMessage.content}`;
    }
    return '';
  });

  // Handle animation when opening
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Update form fields when reply message or compose mode changes
  useEffect(() => {
    const newRecipients = getReplyRecipients();
    setToAddresses(newRecipients.to);
    setCcAddresses(newRecipients.cc);
    setBccAddresses(newRecipients.bcc);
    setShowCc(newRecipients.showCc);
    setShowBcc(newRecipients.showBcc);
  }, [replyToMessage, composeMode, fromEmail]);

  // Update content with signature when email account is loaded
  useEffect(() => {
    console.log('Signature effect triggered:', {
      emailAccount,
      signature: emailAccount?.signature,
      isLoadingAccounts,
      content,
      composeMode,
      fromAccountId
    });
    
    if (isLoadingAccounts) {
      console.log('Still loading accounts...');
      return;
    }
    
    if (!emailAccount) {
      console.log('No email account data received');
      return;
    }
    
    if (!emailAccount.signature) {
      console.log('Email account loaded but no signature found:', emailAccount);
      return;
    }
    
    const signature = emailAccount.signature;
    console.log('Signature loaded:', signature);
    
    // Convert HTML signature to plain text for checking
    const plainTextSignature = htmlToPlainText(signature);
    console.log('Plain text signature:', plainTextSignature);
    console.log('Current content:', content);
    
    // Check if signature is already included (check both HTML and plain text versions)
    if (content.includes(signature) || content.includes(plainTextSignature)) {
      console.log('Signature already included in content (HTML check:', content.includes(signature), 'Plain text check:', content.includes(plainTextSignature), ')');
      return;
    }
    
    // Add signature to content
    console.log('Adding signature to content');
    const newContent = getContentWithSignature(content, signature);
    console.log('New content with signature:', newContent);
    setContent(newContent);
  }, [emailAccount, isLoadingAccounts]);

  // Check if there's any content in the email
  const hasContent = () => {
    return toAddresses.trim() || 
           ccAddresses.trim() || 
           bccAddresses.trim() || 
           subject.trim() || 
           content.trim();
  };

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const draftData = {
        fromAccountId,
        toAddresses: toAddresses.trim() || undefined,
        ccAddresses: ccAddresses.trim() || undefined,
        bccAddresses: bccAddresses.trim() || undefined,
        subject: subject.trim() || undefined,
        content: content.trim() || undefined,
        isDraft: true
      };

      return apiRequest('POST', '/api/email/save-draft', draftData);
    },
    onSuccess: () => {
      toast({
        title: "Draft saved",
        description: "Your email has been saved as a draft.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/email'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save draft",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

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
        threadId: replyToMessage?.id ? parseInt(replyToMessage.id) : null
      };

      return apiRequest('POST', '/api/email/send', emailData);
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully",
        description: "Your message has been delivered.",
      });
      
      // Start slide-down animation
      setIsAnimating(false);
      
      // Wait for animation to complete, then close and clear form
      setTimeout(() => {
        setToAddresses('');
        setCcAddresses('');
        setBccAddresses('');
        setSubject('');
        setContent('');
        setShowCc(false);
        setShowBcc(false);
        onClose();
      }, 300); // Match animation duration
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/email'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    sendEmailMutation.mutate();
  };

  const handleClose = () => {
    // Check if there's any content, show dialog if there is
    if (hasContent()) {
      setShowExitDialog(true);
    } else {
      // No content, close immediately
      closeWithAnimation();
    }
  };

  const closeWithAnimation = () => {
    // Start slide-down animation
    setIsAnimating(false);
    
    // Wait for animation to complete, then close and clear form
    setTimeout(() => {
      setToAddresses('');
      setCcAddresses('');
      setBccAddresses('');
      setSubject('');
      setContent('');
      setShowCc(false);
      setShowBcc(false);
      onClose();
    }, 300); // Match animation duration
  };

  const handleSaveDraft = () => {
    setShowExitDialog(false);
    saveDraftMutation.mutate();
    closeWithAnimation();
  };

  const handleDeleteDraft = () => {
    setShowExitDialog(false);
    closeWithAnimation();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Gmail-style composer */}
      <div 
        className={`fixed left-0 right-0 bg-white flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ 
          top: '0px', // Start from very top (URL bar area)
          height: '100vh'
        }}
      >
        {/* Header with icons matching Gmail */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <Button 
            variant="ghost" 
            onClick={handleClose}
            className="text-gray-600 hover:text-gray-800 p-2 h-auto rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-800 p-2 h-auto rounded-full"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendEmailMutation.isPending || !toAddresses.trim() || !subject.trim()}
              className="text-blue-600 hover:text-blue-700 p-2 h-auto rounded-full disabled:opacity-50"
              variant="ghost"
            >
              <Send className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-800 p-2 h-auto rounded-full"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Email fields - Gmail style with no borders */}
        <div className="flex-1 flex flex-col bg-white">
          {/* To field */}
          <div className="flex items-center px-4 py-4 border-b border-gray-100">
            <span className="text-gray-500 text-base">To:  </span>
            <input
              type="email"
              value={toAddresses}
              onChange={(e) => setToAddresses(e.target.value)}
              className="flex-1 text-base text-gray-900 bg-transparent border-none outline-none placeholder-gray-400 py-1 px-2"
              placeholder=""
              style={{ fontSize: '16px' }}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            <div className="flex items-center space-x-2">
              {!showCc && (
                <Button 
                  variant="ghost" 
                  className="text-blue-500 hover:text-blue-600 text-sm h-auto p-1"
                  onClick={() => setShowCc(true)}
                >
                  Cc
                </Button>
              )}
              {!showBcc && (
                <Button 
                  variant="ghost" 
                  className="text-blue-500 hover:text-blue-600 text-sm h-auto p-1"
                  onClick={() => setShowBcc(true)}
                >
                  Bcc
                </Button>
              )}
            </div>
          </div>

          {/* CC field */}
          {showCc && (
            <div className="flex items-center px-4 py-4 border-b border-gray-100">
              <span className="text-gray-500 text-base">Cc:    </span>
              <input
                type="email"
                value={ccAddresses}
                onChange={(e) => setCcAddresses(e.target.value)}
                className="flex-1 text-base text-gray-900 bg-transparent border-none outline-none placeholder-gray-400 py-1 px-2"
                placeholder=""
                style={{ fontSize: '16px' }}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
              {!showBcc && (
                <Button 
                  variant="ghost" 
                  className="text-blue-500 hover:text-blue-600 text-sm h-auto p-1 ml-2"
                  onClick={() => setShowBcc(true)}
                >
                  Bcc
                </Button>
              )}
            </div>
          )}

          {/* BCC field */}
          {showBcc && (
            <div className="flex items-center px-4 py-4 border-b border-gray-100">
              <span className="text-gray-500 text-base">Bcc:   </span>
              <input
                type="email"
                value={bccAddresses}
                onChange={(e) => setBccAddresses(e.target.value)}
                className="flex-1 text-base text-gray-900 bg-transparent border-none outline-none placeholder-gray-400 py-1 px-2"
                placeholder=""
                style={{ fontSize: '16px' }}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          )}

          {/* From field */}
          <div className="flex items-center px-4 py-4 border-b border-gray-100">
            <span className="text-gray-500 text-base">From:  </span>
            <span className="text-base text-gray-600">{fromEmail}</span>
          </div>

          {/* Subject field */}
          <div className="flex items-center px-4 py-4 border-b border-gray-100">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-base text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
              placeholder="Subject"
              style={{ fontSize: '16px' }}
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck="true"
            />
          </div>

          {/* Message content */}
          <div className="flex-1 px-4 py-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full text-base text-gray-900 bg-transparent border-none outline-none resize-none placeholder-gray-400"
              placeholder="Compose email"
              style={{ 
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck="true"
            />
          </div>
        </div>
      </div>
      
      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Save Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save this email as a draft or delete it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogCancel 
              onClick={handleDeleteDraft}
              className="w-full sm:w-auto"
            >
              Delete
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveDraft}
              className="w-full sm:w-auto"
            >
              Save Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}