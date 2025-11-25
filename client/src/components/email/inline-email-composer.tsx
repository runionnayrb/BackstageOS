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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
import { format, addHours, addDays, addMinutes, setHours, setMinutes, startOfToday, startOfTomorrow, isBefore } from 'date-fns';

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

  // Fetch connected email provider (OAuth account)
  const { data: emailProvider } = useQuery<{
    provider: string;
    emailAddress: string;
    displayName?: string;
  }>({
    queryKey: ['/api/user/email-provider'],
    enabled: isOpen,
  });

  // Fetch email contacts for autocomplete (unified contacts from all shows + personal)
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/email-contacts', projectId],
    enabled: isOpen,
  });

  // Fetch signature for the email account
  const { data: signatureData } = useQuery<{ signature: string }>({
    queryKey: ['/api/email/accounts', fromAccountId, 'signature'],
    enabled: isOpen && fromAccountId > 0,
  });

  // State for showing the full email dropdown
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(fromAccountId);

  // Use the connected email provider as the selected account
  const selectedAccount = emailProvider ? {
    id: -1,
    displayName: emailProvider.displayName || emailProvider.emailAddress?.split('@')[0] || 'Me',
    emailAddress: emailProvider.emailAddress,
  } : null;



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
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(() => new Date());
  const [scheduledTime, setScheduledTime] = useState(() => format(addMinutes(new Date(), 5), 'HH:mm'));
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
  const [signatureInitialized, setSignatureInitialized] = useState(false);

  // Convert HTML signature to plain text for the textarea
  const getPlainTextSignature = () => {
    if (!signatureData?.signature) return '';
    return '\n\n--\n' + htmlToPlainText(signatureData.signature);
  };

  // Update selectedAccountId when fromAccountId prop changes
  useEffect(() => {
    setSelectedAccountId(fromAccountId);
  }, [fromAccountId]);

  // Reset form when modal opens/closes or recipient changes
  useEffect(() => {
    if (isOpen) {
      const recipients = getReplyRecipients();
      setToAddresses(recipients.to || (composeMode === 'compose' && initialRecipient ? [initialRecipient] : []));
      setCcAddresses(recipients.cc);
      setBccAddresses(recipients.bcc);
      setShowCc(recipients.showCc);
      setShowBcc(recipients.showBcc);
      setSignatureInitialized(false);
      
      if (composeMode === 'compose' && !replyToMessage && !forwardMessage) {
        setSubject('');
        setContent('');
      }
    }
  }, [isOpen, replyToMessage, forwardMessage, composeMode, initialRecipient]);

  // Initialize signature when it's loaded
  useEffect(() => {
    if (isOpen && signatureData?.signature && !signatureInitialized) {
      const plainSig = getPlainTextSignature();
      if (plainSig && !content.includes('--\n')) {
        setContent(prev => prev + plainSig);
        setSignatureInitialized(true);
      }
    }
  }, [isOpen, signatureData, signatureInitialized]);

  // Update recipient when initialRecipient changes
  useEffect(() => {
    if (composeMode === 'compose' && initialRecipient && isOpen) {
      setToAddresses([initialRecipient]);
    }
  }, [initialRecipient, composeMode, isOpen]);

  // Helper function to check if there's meaningful content (excluding auto-inserted signature)
  const hasContent = () => {
    const hasToAddresses = toAddresses.length > 0;
    const hasCcAddresses = ccAddresses.length > 0;
    const hasBccAddresses = bccAddresses.length > 0;
    const trimmedSubject = subject.trim();
    // Remove signature from content check
    const contentWithoutSig = content.replace(/\n\n--\n[\s\S]*$/, '').trim();
    
    // Check if any field has content
    return hasToAddresses || hasCcAddresses || hasBccAddresses || trimmedSubject.length > 0 || contentWithoutSig.length > 0;
  };

  // Build full email content with quoted reply for replies
  const buildFullEmailContent = () => {
    let fullContent = content.trim();
    
    // For replies/reply-all, append the quoted original message after the signature
    if ((composeMode === 'reply' || composeMode === 'replyAll') && replyToMessage) {
      const quotedHeader = `\n\nOn ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}, ${replyToMessage.fromAddress} wrote:`;
      const quotedContent = replyToMessage.content.split('\n').map(line => `> ${line}`).join('\n');
      fullContent += quotedHeader + '\n\n' + quotedContent;
    }
    
    // For forwards, append the original message
    if (composeMode === 'forward' && forwardMessage) {
      const forwardHeader = `\n\n---------- Forwarded message ----------\nFrom: ${forwardMessage.fromAddress}\nSubject: ${forwardMessage.subject}\n`;
      fullContent += forwardHeader + '\n' + forwardMessage.content;
    }
    
    return fullContent;
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

      const fullContent = buildFullEmailContent();

      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('fromAccountId', selectedAccountId.toString());
        formData.append('toAddresses', toAddressesStr);
        if (ccAddressesStr) formData.append('ccAddresses', ccAddressesStr);
        if (bccAddressesStr) formData.append('bccAddresses', bccAddressesStr);
        formData.append('subject', subject.trim());
        formData.append('content', fullContent);
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
          content: fullContent,
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

      const fullContent = buildFullEmailContent();

      const emailData = {
        accountId: selectedAccountId,
        toAddresses: toAddresses,
        ccAddresses: ccAddresses.length > 0 ? ccAddresses : undefined,
        bccAddresses: bccAddresses.length > 0 ? bccAddresses : undefined,
        subject: subject.trim(),
        content: fullContent,
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
  const handleQuickSchedule = (option: 'later_today' | 'tomorrow_morning' | 'tomorrow_afternoon') => {
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
    }

    scheduleEmailMutation.mutate(scheduledFor);
  };

  // Handle custom schedule confirmation
  const handleCustomScheduleConfirm = () => {
    if (!scheduledDate) return;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduledFor = setMinutes(setHours(scheduledDate, hours), minutes);
    
    // Validate that scheduled time is in the future
    if (isBefore(scheduledFor, new Date())) {
      toast({
        title: "Invalid time",
        description: "Please select a time in the future.",
        variant: "destructive",
      });
      return;
    }
    
    scheduleEmailMutation.mutate(scheduledFor);
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
      <div className="w-full h-full bg-white flex flex-col" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
            <DropdownMenu modal={false}>
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
                onCloseAutoFocus={(e) => e.preventDefault()}
                onOpenAutoFocus={(e) => e.preventDefault()}
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
                  <span>In 4 hours</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleQuickSchedule('tomorrow_morning')}
                  className="flex items-center gap-2"
                  data-testid="menu-item-schedule-tomorrow-morning"
                >
                  <Clock className="h-4 w-4" />
                  <span>Tomorrow at 9:00 AM</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleQuickSchedule('tomorrow_afternoon')}
                  className="flex items-center gap-2"
                  data-testid="menu-item-schedule-tomorrow-afternoon"
                >
                  <Clock className="h-4 w-4" />
                  <span>Tomorrow at 2:00 PM</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-2" data-testid="menu-item-schedule-custom">
                    <Calendar className="h-4 w-4" />
                    <span>Pick date & time...</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent 
                    className="p-0 w-auto" 
                    sideOffset={8}
                    style={{ zIndex: 10003 }}
                  >
                    {/* Date and Time header */}
                    <div className="flex border-b border-gray-200">
                      <div className="flex-1 px-3 py-2 border-r border-gray-200">
                        <span className="text-sm text-gray-900">
                          {scheduledDate ? format(scheduledDate, 'MMM d, yyyy') : 'Select date'}
                        </span>
                      </div>
                      <div className="px-3 py-2 flex items-center">
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="text-sm text-gray-900 bg-transparent border-none outline-none w-[75px]"
                        />
                      </div>
                    </div>
                    
                    {/* Calendar */}
                    <CalendarComponent
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => isBefore(date, startOfToday())}
                      initialFocus
                    />

                    {/* Footer */}
                    <div className="flex justify-between items-center px-3 py-2 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {scheduledDate && scheduledTime ? 
                          `${format(scheduledDate, 'MMM d')} at ${scheduledTime}` : 
                          'Select date & time'}
                      </span>
                      <Button
                        size="sm"
                        onClick={handleCustomScheduleConfirm}
                        disabled={!scheduledDate}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 h-7 text-xs rounded"
                      >
                        Schedule
                      </Button>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
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
        <div className="flex-1 flex flex-col bg-white overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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

          {/* From field - shows display name, expands to show email on click */}
          <div className="flex items-start px-4 py-3 border-b border-gray-100">
            <span className="text-gray-500 text-sm w-12 flex-shrink-0 leading-5">From:</span>
            <div className="flex-1">
              <div 
                className="cursor-pointer text-sm text-gray-700 hover:text-gray-900"
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              >
                <div className="flex items-start">
                  <div className="flex flex-col items-start">
                    <span className="font-medium leading-5">{selectedAccount?.displayName}</span>
                    {showAccountDropdown && (
                      <span className="text-xs text-gray-500">{selectedAccount?.emailAddress}</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 flex-shrink-0 ml-2 mt-0.5 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
                </div>
              </div>
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
    </>
  );
}