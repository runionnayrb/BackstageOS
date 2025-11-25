import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Send, ChevronDown, Paperclip, MoreHorizontal, FileText, Minus, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { EmailContactSelector } from './email-contact-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
import { format, addHours, addDays, setHours, setMinutes, startOfTomorrow } from 'date-fns';

interface InlineEmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: (composerData: any) => void;
  fromAccountId: number;
  fromEmail: string;
  projectId?: number;
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
}

export function InlineEmailComposer({ 
  isOpen, 
  onClose, 
  onMinimize,
  fromAccountId, 
  fromEmail,
  projectId,
  replyToMessage,
  forwardMessage,
  composeMode = 'compose',
  initialRecipient
}: InlineEmailComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all email accounts and find the specific one
  const { data: emailAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/email/accounts'],
    enabled: isOpen,
  });

  // Fetch email contacts for autocomplete (unified contacts from all shows + personal)
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/email-contacts', projectId],
    enabled: isOpen,
  });

  // State for selected account (initialize with the passed fromAccountId)
  const [selectedAccountId, setSelectedAccountId] = useState<number>(fromAccountId);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Find the specific account from the accounts list
  const emailAccount = (emailAccounts as any[])?.find((account: any) => account.id === selectedAccountId);
  const selectedAccount = emailAccount;



  // Helper function to get reply recipients based on mode
  const getReplyRecipients = () => {
    if (!replyToMessage) return { to: [], cc: [], bcc: [], showCc: false, showBcc: false };
    
    if (composeMode === 'reply') {
      return {
        to: [replyToMessage.fromAddress],
        cc: [],
        bcc: [],
        showCc: false,
        showBcc: false
      };
    } else if (composeMode === 'replyAll') {
      const originalTo = replyToMessage.toAddresses || [];
      const originalCc = replyToMessage.ccAddresses || [];
      
      const filteredTo = originalTo.filter(addr => addr !== fromEmail);
      const filteredCc = originalCc.filter(addr => addr !== fromEmail);
      
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

  // Form state
  const [toAddresses, setToAddresses] = useState<string[]>(replyRecipients.to || (composeMode === 'compose' && initialRecipient ? [initialRecipient] : []));
  const [ccAddresses, setCcAddresses] = useState<string[]>(replyRecipients.cc);
  const [bccAddresses, setBccAddresses] = useState<string[]>(replyRecipients.bcc);
  const [showCc, setShowCc] = useState(replyRecipients.showCc);
  const [showBcc, setShowBcc] = useState(replyRecipients.showBcc);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCustomScheduleDialog, setShowCustomScheduleDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');
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
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  };

  const [content, setContent] = useState('');

  // Update selectedAccountId when fromAccountId prop changes
  useEffect(() => {
    setSelectedAccountId(fromAccountId);
  }, [fromAccountId]);

  // Load signature when email account is available
  useEffect(() => {
    if (emailAccount?.signature && composeMode === 'compose' && content === '') {
      console.log('Signature effect triggered:', { emailAccount, signature: emailAccount.signature, isLoadingAccounts, content, composeMode, selectedAccountId });
      
      console.log('Signature loaded:', emailAccount.signature);
      const plainTextSignature = htmlToPlainText(emailAccount.signature);
      console.log('Plain text signature:', plainTextSignature);
      console.log('Current content:', content);
      
      if (plainTextSignature) {
        console.log('Adding signature to content');
        const newContent = `\n\n${plainTextSignature}`;
        console.log('New content with signature:', newContent);
        setContent(newContent);
      }
    }
  }, [emailAccount, composeMode, selectedAccountId]);

  // Reset form when modal opens/closes or recipient changes
  useEffect(() => {
    if (isOpen) {
      const recipients = getReplyRecipients();
      setToAddresses(recipients.to || (composeMode === 'compose' && initialRecipient ? [initialRecipient] : []));
      setCcAddresses(recipients.cc);
      setBccAddresses(recipients.bcc);
      setShowCc(recipients.showCc);
      setShowBcc(recipients.showBcc);
      
      if (composeMode === 'compose' && !replyToMessage && !forwardMessage) {
        setSubject('');
        setContent('');
      }
    }
  }, [isOpen, replyToMessage, forwardMessage, composeMode, initialRecipient]);

  // Update recipient when initialRecipient changes
  useEffect(() => {
    if (composeMode === 'compose' && initialRecipient && isOpen) {
      setToAddresses([initialRecipient]);
    }
  }, [initialRecipient, composeMode, isOpen]);

  // Helper function to check if there's meaningful content (excluding signature)
  const hasContent = () => {
    const hasToAddresses = toAddresses.length > 0;
    const hasCcAddresses = ccAddresses.length > 0;
    const hasBccAddresses = bccAddresses.length > 0;
    const trimmedSubject = subject.trim();
    const trimmedContent = content.trim();
    
    // Check if any field has content
    if (hasToAddresses || hasCcAddresses || hasBccAddresses || trimmedSubject) {
      return true;
    }
    
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
    
    return trimmedContent.length > 0;
  };

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (toAddresses.length === 0 || !subject.trim()) {
        throw new Error('To address and subject are required');
      }

      const toAddressesStr = toAddresses.join(', ');
      const ccAddressesStr = ccAddresses.length > 0 ? ccAddresses.join(', ') : '';
      const bccAddressesStr = bccAddresses.length > 0 ? bccAddresses.join(', ') : '';

      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('fromAccountId', selectedAccountId.toString());
        formData.append('toAddresses', toAddressesStr);
        if (ccAddressesStr) formData.append('ccAddresses', ccAddressesStr);
        if (bccAddressesStr) formData.append('bccAddresses', bccAddressesStr);
        formData.append('subject', subject.trim());
        formData.append('content', content.trim());
        if (replyToMessage?.id) formData.append('threadId', replyToMessage.id);
        
        attachments.forEach((file) => {
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
        const emailData = {
          fromAccountId: selectedAccountId,
          toAddresses: toAddressesStr,
          ccAddresses: ccAddressesStr || undefined,
          bccAddresses: bccAddressesStr || undefined,
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
      
      // Clear form and close
      setToAddresses([]);
      setCcAddresses([]);
      setBccAddresses([]);
      setSubject('');
      setContent('');
      setAttachments([]);
      setShowCc(false);
      setShowBcc(false);
      onClose();
      
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

  // Schedule email mutation
  const scheduleEmailMutation = useMutation({
    mutationFn: async (scheduledFor: Date) => {
      if (toAddresses.length === 0 || !subject.trim()) {
        throw new Error('To address and subject are required');
      }

      const toAddressesStr = toAddresses.join(', ');
      const ccAddressesStr = ccAddresses.length > 0 ? ccAddresses.join(', ') : '';
      const bccAddressesStr = bccAddresses.length > 0 ? bccAddresses.join(', ') : '';

      const emailData = {
        fromAccountId: selectedAccountId,
        toAddresses: toAddressesStr,
        ccAddresses: ccAddressesStr || undefined,
        bccAddresses: bccAddressesStr || undefined,
        subject: subject.trim(),
        content: content.trim(),
        scheduledFor: scheduledFor.toISOString(),
      };

      return apiRequest('POST', '/api/email/schedule', emailData);
    },
    onSuccess: () => {
      toast({
        title: "Email scheduled",
        description: "Your message has been scheduled for delivery.",
      });
      
      // Clear form and close
      setToAddresses([]);
      setCcAddresses([]);
      setBccAddresses([]);
      setSubject('');
      setContent('');
      setAttachments([]);
      setShowCc(false);
      setShowBcc(false);
      onClose();
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/email/scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/scheduled/count'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to schedule email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle quick schedule options
  const handleQuickSchedule = (option: 'later_today' | 'tomorrow_morning' | 'tomorrow_afternoon' | 'custom') => {
    const now = new Date();
    let scheduledFor: Date;

    switch (option) {
      case 'later_today':
        scheduledFor = addHours(now, 4);
        break;
      case 'tomorrow_morning':
        scheduledFor = setMinutes(setHours(startOfTomorrow(), 9), 0);
        break;
      case 'tomorrow_afternoon':
        scheduledFor = setMinutes(setHours(startOfTomorrow(), 14), 0);
        break;
      case 'custom':
        setScheduledDate(addDays(now, 1));
        setScheduledTime('09:00');
        setShowCustomScheduleDialog(true);
        return;
    }

    scheduleEmailMutation.mutate(scheduledFor);
  };

  // Handle custom schedule confirmation
  const handleCustomScheduleConfirm = () => {
    if (!scheduledDate) return;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduledFor = setMinutes(setHours(scheduledDate, hours), minutes);
    
    scheduleEmailMutation.mutate(scheduledFor);
    setShowCustomScheduleDialog(false);
  };

  const handleClose = () => {
    if (hasContent()) {
      setShowExitDialog(true);
    } else {
      onClose();
    }
  };

  const handleSaveDraft = () => {
    setShowExitDialog(false);
    // TODO: Implement save draft
    onClose();
  };

  const handleDeleteDraft = () => {
    setShowExitDialog(false);
    onClose();
  };

  const handleMinimize = () => {
    if (onMinimize) {
      const composerData = {
        subject,
        toAddresses,
        ccAddresses,
        bccAddresses,
        content,
        fromAccountId: selectedAccountId,
        attachments,
        showCc,
        showBcc
      };
      onMinimize(composerData);
    }
  };

  // File attachment handler
  const handleAttachmentClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '*/*';
    
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

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Inline composer panel */}
      <div className="w-full h-full bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {replyToMessage ? 'Reply' : 'New Message'}
          </h2>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              onClick={handleAttachmentClick}
              className="text-gray-600 hover:text-gray-800 p-2 h-auto rounded-full"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            {/* Send dropdown with schedule options */}
            <DropdownMenu>
              <DropdownMenuTrigger 
                disabled={(sendEmailMutation.isPending || scheduleEmailMutation.isPending) || toAddresses.length === 0 || !subject.trim()}
                className="text-blue-600 hover:text-blue-700 p-2 rounded-full disabled:opacity-50 focus:outline-none"
                data-testid="button-send-dropdown"
              >
                <Send className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                sideOffset={5} 
                className="w-56"
                style={{ zIndex: 10002 }}
              >
                <DropdownMenuItem 
                  onClick={handleSend}
                  className="flex items-center gap-2"
                  data-testid="menu-item-send-now"
                >
                  <Send className="h-4 w-4" />
                  <span>Send now</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleQuickSchedule('later_today')}
                  className="flex items-center gap-2"
                  data-testid="menu-item-schedule-later-today"
                >
                  <Clock className="h-4 w-4" />
                  <span>Later today</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleQuickSchedule('tomorrow_morning')}
                  className="flex items-center gap-2"
                  data-testid="menu-item-schedule-tomorrow-morning"
                >
                  <Clock className="h-4 w-4" />
                  <span>Tomorrow morning (9:00 AM)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleQuickSchedule('tomorrow_afternoon')}
                  className="flex items-center gap-2"
                  data-testid="menu-item-schedule-tomorrow-afternoon"
                >
                  <Clock className="h-4 w-4" />
                  <span>Tomorrow afternoon (2:00 PM)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleQuickSchedule('custom')}
                  className="flex items-center gap-2"
                  data-testid="menu-item-schedule-custom"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Pick date & time...</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {onMinimize && (
              <Button 
                variant="ghost" 
                onClick={handleMinimize}
                className="text-gray-600 hover:text-gray-800 p-2 h-auto rounded-full"
                title="Minimize"
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-800 p-2 h-auto rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Email fields */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">
          {/* To field */}
          <div className="relative">
            <EmailContactSelector
              contacts={contacts}
              selectedEmails={toAddresses}
              onChange={setToAddresses}
              placeholder="Recipients"
              label="To:"
              projectId={projectId}
            />
            <div className="absolute top-3 right-4 flex items-center space-x-2">
              {!showCc && (
                <Button 
                  variant="ghost" 
                  className="text-blue-500 hover:text-blue-600 text-xs h-auto p-1"
                  onClick={() => setShowCc(true)}
                >
                  Cc
                </Button>
              )}
              {!showBcc && (
                <Button 
                  variant="ghost" 
                  className="text-blue-500 hover:text-blue-600 text-xs h-auto p-1"
                  onClick={() => setShowBcc(true)}
                >
                  Bcc
                </Button>
              )}
            </div>
          </div>

          {/* CC field */}
          {showCc && (
            <EmailContactSelector
              contacts={contacts}
              selectedEmails={ccAddresses}
              onChange={setCcAddresses}
              placeholder="CC recipients"
              label="Cc:"
              projectId={projectId}
            />
          )}

          {/* BCC field */}
          {showBcc && (
            <EmailContactSelector
              contacts={contacts}
              selectedEmails={bccAddresses}
              onChange={setBccAddresses}
              placeholder="BCC recipients"
              label="Bcc:"
              projectId={projectId}
            />
          )}

          {/* From field with account selector */}
          <div className="flex items-center px-4 py-3 border-b border-gray-100">
            <span className="text-gray-500 text-sm w-12 flex-shrink-0">From:</span>
            <div className="flex-1">
              {emailAccounts && (emailAccounts as any[]).length > 1 ? (
                <div className="relative">
                  <div 
                    className="w-full cursor-pointer text-sm text-gray-600 hover:text-gray-900"
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col items-start text-left">
                        <div className="font-medium">{selectedAccount?.displayName}</div>
                        <div className="text-xs text-gray-500">{selectedAccount?.emailAddress}</div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  
                  {showAccountDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] max-h-60 overflow-auto">
                      {(emailAccounts as any[]).map((account: any) => (
                        <div
                          key={account.id}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setShowAccountDropdown(false);
                          }}
                        >
                          <div className="flex flex-col items-start">
                            <div className="font-medium text-sm">{account.displayName}</div>
                            <div className="text-xs text-gray-500">{account.emailAddress}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-600">
                  {selectedAccount?.displayName} ({selectedAccount?.emailAddress})
                </span>
              )}
            </div>
          </div>

          {/* Attachments display */}
          {attachments.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center bg-gray-50 rounded px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 truncate">{file.name}</p>
                      <p className="text-gray-500 text-xs">({formatFileSize(file.size)})</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject field */}
          <div className="flex items-center px-4 py-3 border-b border-gray-100">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-sm text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
              placeholder="Subject"
              autoComplete="off"
            />
          </div>

          {/* Message content */}
          <div className="flex-1 p-4 flex flex-col">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-sm text-gray-900 bg-transparent border-none outline-none placeholder-gray-400 resize-none"
              placeholder="Write your message..."
              style={{ 
                minHeight: '200px',
                maxHeight: composeMode === 'reply' && replyToMessage ? '200px' : '400px',
                flex: composeMode === 'reply' && replyToMessage ? 'none' : '1'
              }}
            />
            
            {/* Original email thread for replies */}
            {composeMode === 'reply' && replyToMessage && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex-1 overflow-y-auto">
                <div className="text-sm text-gray-600 mb-2">
                  On {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}, <span className="font-medium">{replyToMessage.fromAddress}</span> wrote:
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {replyToMessage.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="z-[70]" style={{ zIndex: '70' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Save Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save this email as a draft?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteDraft}>
              Delete
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveDraft}>
              Save Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom schedule dialog */}
      <AlertDialog open={showCustomScheduleDialog} onOpenChange={setShowCustomScheduleDialog}>
        <AlertDialogContent className="z-[10003]" style={{ zIndex: 10003 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule Email</AlertDialogTitle>
            <AlertDialogDescription>
              Choose when you want this email to be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[10004]" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCustomScheduleConfirm}
              disabled={!scheduledDate}
            >
              Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}