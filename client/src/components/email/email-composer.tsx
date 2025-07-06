import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, Save, Paperclip, Bold, Italic, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
}

export function EmailComposer({ 
  isOpen, 
  onClose, 
  fromAccountId, 
  fromEmail,
  replyToMessage 
}: EmailComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [toAddresses, setToAddresses] = useState<string>('');
  const [ccAddresses, setCcAddresses] = useState<string>('');
  const [bccAddresses, setBccAddresses] = useState<string>('');
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

  // Editor state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Send email mutation
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
      return await apiRequest('/api/email/send', {
        method: 'POST',
        body: JSON.stringify(emailData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully.",
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
      return await apiRequest('/api/email/drafts', {
        method: 'POST',
        body: JSON.stringify(draftData),
        headers: { 'Content-Type': 'application/json' }
      });
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
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
  };

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
    if (toAddresses || subject || content) {
      if (confirm('You have unsaved changes. Do you want to save as draft before closing?')) {
        handleSaveDraft();
      }
    }
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>{replyToMessage ? 'Reply' : 'New Message'}</span>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* From field */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-12">From:</label>
            <span className="text-sm text-muted-foreground">{fromEmail}</span>
          </div>

          {/* To field */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-12">To:</label>
            <Input
              placeholder="Enter email addresses separated by commas"
              value={toAddresses}
              onChange={(e) => setToAddresses(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* CC field */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-12">CC:</label>
            <Input
              placeholder="Optional"
              value={ccAddresses}
              onChange={(e) => setCcAddresses(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* BCC field */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-12">BCC:</label>
            <Input
              placeholder="Optional"
              value={bccAddresses}
              onChange={(e) => setBccAddresses(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Subject field */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-12">Subject:</label>
            <Input
              placeholder="Enter subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Formatting toolbar */}
          <div className="flex items-center gap-1 border-b pb-2">
            <Button
              variant={isBold ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsBold(!isBold)}
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={isItalic ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsItalic(!isItalic)}
              className="h-8 w-8 p-0"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={isUnderline ? "default" : "ghost"}
              size="sm"
              onClick={() => setIsUnderline(!isUnderline)}
              className="h-8 w-8 p-0"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          {/* Content field */}
          <div className="flex-1 min-h-0">
            <Textarea
              placeholder="Write your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] resize-none border-0 focus-visible:ring-0 p-4"
              style={{
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none'
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Tip: Use @backstageos.com addresses for internal messaging
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saveDraftMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saveDraftMutation.isPending ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendEmailMutation.isPending}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}