import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Send, ChevronDown, Paperclip, MoreHorizontal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { EmailContactSelector } from './email-contact-selector';
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
  initialRecipient?: string;
  projectId?: number;
}

export function GmailEmailComposer({ 
  isOpen, 
  onClose, 
  fromAccountId, 
  fromEmail,
  replyToMessage,
  forwardMessage,
  composeMode = 'compose',
  initialRecipient,
  projectId
}: GmailEmailComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all email accounts and find the specific one
  const { data: emailAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/email/accounts'],
    enabled: isOpen && !!fromAccountId,
  });

  // Fetch email contacts for the contact selector (unified contacts from all shows + personal)
  const { data: contacts = [], isLoading: isLoadingContacts, error: contactsError } = useQuery({
    queryKey: ['/api/email-contacts', projectId],
    enabled: isOpen,
  });

  console.log('🔍 Contacts Query Debug:', { 
    isOpen,
    projectId,
    projectIdType: typeof projectId,
    queryKey: projectId ? ['/api/projects', projectId, 'contacts'] : ['/api/contacts'],
    isLoadingContacts,
    contactsError,
    contactsLength: contacts.length,
    contacts: contacts.slice(0, 2)
  });

  // Find the specific account from the accounts list
  const emailAccount = emailAccounts?.find((account: any) => account.id === fromAccountId);

  // Helper function to get reply recipients based on mode
  const getReplyRecipients = () => {
    if (!replyToMessage) return { to: [], cc: [], bcc: [], showCc: false, showBcc: false };
    
    if (composeMode === 'reply') {
      // For reply: send to original sender only
      return {
        to: [replyToMessage.fromAddress],
        cc: [],
        bcc: [],
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
        to: [replyToMessage.fromAddress],
        cc: allRecipients,
        bcc: [],
        showCc: allRecipients.length > 0,
        showBcc: false
      };
    }
    
    return { to: [], cc: [], bcc: [], showCc: false, showBcc: false };
  };

  const replyRecipients = getReplyRecipients();

  // Form state - initialize with reply recipients if applicable, or initial recipient for compose mode
  const [toAddresses, setToAddresses] = useState<string[]>(replyRecipients.to.length > 0 ? replyRecipients.to : (composeMode === 'compose' && initialRecipient ? [initialRecipient] : []));
  const [ccAddresses, setCcAddresses] = useState<string[]>(replyRecipients.cc);
  const [bccAddresses, setBccAddresses] = useState<string[]>(replyRecipients.bcc);
  const [showCc, setShowCc] = useState(replyRecipients.showCc);
  const [showBcc, setShowBcc] = useState(replyRecipients.showBcc);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
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
      // Prevent body scroll on mobile to reduce jitter
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      setIsAnimating(true);
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    // Cleanup function to restore scroll if component unmounts
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Update form fields when reply message or compose mode changes
  useEffect(() => {
    const newRecipients = getReplyRecipients();
    setToAddresses(newRecipients.to.length > 0 ? newRecipients.to : (composeMode === 'compose' && initialRecipient ? [initialRecipient] : []));
    setCcAddresses(newRecipients.cc);
    setBccAddresses(newRecipients.bcc);
    setShowCc(newRecipients.showCc);
    setShowBcc(newRecipients.showBcc);
  }, [replyToMessage, composeMode, fromEmail, initialRecipient]);

  console.log('🔍 Mobile Gmail Composer Debug:', { 
    isOpen,
    projectId,
    projectIdPassed: !!projectId,
    contactsLength: contacts.length, 
    contacts: contacts.slice(0, 3),
    toAddressesType: typeof toAddresses,
    toAddresses 
  });

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

  // Check if there's any content in the email (excluding signature-only content)
  const hasContent = () => {
    // Check basic fields first
    if (toAddresses.length > 0 || ccAddresses.length > 0 || bccAddresses.length > 0 || subject.trim() || attachments.length > 0) {
      return true;
    }
    
    // For content, check if it's more than just the signature
    const trimmedContent = content.trim();
    if (!trimmedContent) return false;
    
    // If we have email account data, check if content is only signature
    if (emailAccount?.signature) {
      const plainTextSignature = htmlToPlainText(emailAccount.signature);
      
      // Remove signature from content to see if there's anything else
      const contentWithoutSignature = trimmedContent
        .replace(plainTextSignature, '')
        .replace(/^\s*\n+/, '') // Remove leading newlines
        .replace(/\n+\s*$/, '') // Remove trailing newlines
        .trim();
      
      return contentWithoutSignature.length > 0;
    }
    
    // If no signature data, any content counts
    return trimmedContent.length > 0;
  };

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const draftData = {
        fromAccountId,
        toAddresses: toAddresses.length > 0 ? toAddresses : undefined,
        ccAddresses: ccAddresses.length > 0 ? ccAddresses : undefined,
        bccAddresses: bccAddresses.length > 0 ? bccAddresses : undefined,
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
      if (toAddresses.length === 0 || !subject.trim()) {
        throw new Error('To address and subject are required');
      }

      // If there are attachments, use FormData
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('fromAccountId', fromAccountId.toString());
        formData.append('toAddresses', JSON.stringify(toAddresses));
        if (ccAddresses.length > 0) formData.append('ccAddresses', JSON.stringify(ccAddresses));
        if (bccAddresses.length > 0) formData.append('bccAddresses', JSON.stringify(bccAddresses));
        formData.append('subject', subject.trim());
        formData.append('content', content.trim());
        if (replyToMessage?.id) formData.append('threadId', replyToMessage.id);
        
        // Add each attachment
        attachments.forEach((file, index) => {
          formData.append(`attachments`, file);
        });

        return fetch('/api/email/send', {
          method: 'POST',
          body: formData,
        }).then(response => {
          if (!response.ok) {
            throw new Error('Failed to send email');
          }
          return response.json();
        });
      } else {
        // No attachments, use regular JSON
        const emailData = {
          fromAccountId,
          toAddresses,
          ccAddresses: ccAddresses.length > 0 ? ccAddresses : undefined,
          bccAddresses: bccAddresses.length > 0 ? bccAddresses : undefined,
          subject: subject.trim(),
          content: content.trim(),
          threadId: replyToMessage?.id ? parseInt(replyToMessage.id) : null
        };

        return apiRequest('POST', '/api/email/send', emailData);
      }
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
        setToAddresses([]);
        setCcAddresses([]);
        setBccAddresses([]);
        setSubject('');
        setContent('');
        setAttachments([]);
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
    console.log('🚪 Close button clicked - checking content...');
    const contentExists = hasContent();
    console.log('🚪 Has content:', contentExists, { 
      toCount: toAddresses.length, 
      ccCount: ccAddresses.length, 
      bccCount: bccAddresses.length, 
      subject: subject.trim(), 
      attachments: attachments.length 
    });
    
    // Check if there's any content, show dialog if there is
    if (contentExists) {
      console.log('🚪 Showing exit dialog...');
      setShowExitDialog(true);
    } else {
      console.log('🚪 No content, closing immediately...');
      // No content, close immediately
      closeWithAnimation();
    }
  };

  const closeWithAnimation = () => {
    // Start slide-down animation immediately
    setIsAnimating(false);
    
    // Use requestAnimationFrame to ensure smooth animation
    requestAnimationFrame(() => {
      // Wait for animation to complete, then close and clear form
      setTimeout(() => {
        setToAddresses([]);
        setCcAddresses([]);
        setBccAddresses([]);
        setSubject('');
        setContent('');
        setAttachments([]);
        setShowCc(false);
        setShowBcc(false);
        onClose();
      }, 300); // Match animation duration
    });
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

  // File attachment handler
  const handleAttachmentClick = () => {
    // Create invisible file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '*/*'; // Accept all file types
    
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files) {
        const newFiles = Array.from(files);
        setAttachments(prev => [...prev, ...newFiles]);
      }
    };
    
    fileInput.click();
  };

  // Remove attachment handler
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            console.log('🎯 Backdrop clicked');
            handleClose();
          }
        }}
      />
      
      {/* Gmail-style composer */}
      <div 
        className={`fixed left-0 right-0 bg-white flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ 
          top: '0px',
          height: '100vh',
          // Prevent viewport changes from affecting layout
          position: 'fixed',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icons matching Gmail */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button 
            type="button"
            onClick={(e) => {
              console.log('🔥 CLOSE BUTTON CLICKED!', e);
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            className="text-gray-600 hover:text-gray-800 p-2 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            style={{ zIndex: 10001 }}
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              onClick={handleAttachmentClick}
              className="text-gray-600 hover:text-gray-800 p-2 h-auto rounded-full"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendEmailMutation.isPending || toAddresses.length === 0 || !subject.trim()}
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
            <div className="flex-1">
              <EmailContactSelector
                contacts={contacts}
                selectedEmails={toAddresses}
                onChange={setToAddresses}
                placeholder=""
              />
            </div>
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
              <div className="flex-1">
                <EmailContactSelector
                  contacts={contacts}
                  selectedEmails={ccAddresses}
                  onChange={setCcAddresses}
                  placeholder=""
                />
              </div>
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
              <div className="flex-1">
                <EmailContactSelector
                  contacts={contacts}
                  selectedEmails={bccAddresses}
                  onChange={setBccAddresses}
                  placeholder=""
                />
              </div>
            </div>
          )}

          {/* From field */}
          <div className="flex items-center px-4 py-4 border-b border-gray-100">
            <span className="text-gray-500 text-base">From:  </span>
            <span className="text-base text-gray-600">{fromEmail}</span>
          </div>

          {/* Attachments display */}
          {attachments.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center bg-gray-100 rounded-lg px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-700 mr-2">{file.name}</span>
                    <span className="text-gray-500 text-xs mr-2">({formatFileSize(file.size)})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          <div className="flex-1 px-4 py-4" style={{ overflow: 'hidden' }}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full text-base text-gray-900 bg-transparent border-none outline-none resize-none placeholder-gray-400"
              placeholder="Compose email"
              style={{ 
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                // Mobile optimization to prevent jitter
                minHeight: '200px',
                transform: 'translateZ(0)', // Hardware acceleration
                backfaceVisibility: 'hidden' // Prevent flicker
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
        <AlertDialogContent className="max-w-sm" style={{ zIndex: 10002 }}>
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