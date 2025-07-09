import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, ChevronDown, Paperclip, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  };
}

export function GmailEmailComposer({ 
  isOpen, 
  onClose, 
  fromAccountId, 
  fromEmail,
  replyToMessage
}: GmailEmailComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [toAddresses, setToAddresses] = useState<string>('');
  const [ccAddresses, setCcAddresses] = useState<string>('');
  const [bccAddresses, setBccAddresses] = useState<string>('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
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

  // Handle animation when opening
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50"
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
    </div>
  );
}