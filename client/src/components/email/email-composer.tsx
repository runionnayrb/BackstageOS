import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, X, Send, Users, FileText, Theater, Edit, Trash2, Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  showId?: number; // For theater-specific features
}

export function EmailComposer({ 
  isOpen, 
  onClose, 
  fromAccountId, 
  fromEmail,
  replyToMessage,
  existingDraftId,
  showId
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

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isMobile, isOpen]);

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

  // Mobile swipe state
  const [sheetPosition, setSheetPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  // Theater email features - always show if showId is available
  const [showTheaterFeatures, setShowTheaterFeatures] = useState(true);
  const [selectedRecipientGroup, setSelectedRecipientGroup] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [theaterTab, setTheaterTab] = useState('compose'); // compose, groups, templates
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // Theater data queries
  const { data: shows = [] } = useQuery({
    queryKey: ['/api/projects'],
    enabled: showTheaterFeatures
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['/api/email/templates'],
    queryFn: () => apiRequest(`/api/email/templates?showId=${showId || ''}`),
    enabled: showTheaterFeatures
  });
  const [isClosing, setIsClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

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

  // Native DOM touch handlers for better mobile support
  useEffect(() => {
    if (!isMobile || !isOpen || isClosing) return;
    
    console.log('🔍 Setting up touch events, isMobile:', isMobile, 'isOpen:', isOpen, 'isClosing:', isClosing);
    console.log('🔍 sheetRef.current exists:', !!sheetRef.current);

    const handleElement = sheetRef.current?.querySelector('.handle-area');
    console.log('🔍 Looking for handle element:', !!handleElement);
    if (!handleElement) {
      console.log('❌ Handle element not found!');
      return;
    }
    console.log('✅ Handle element found, attaching touch events');

    let startYPos = 0;
    let currentDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      console.log('🟡 Touch start - Y position:', e.touches[0].clientY);
      e.preventDefault();
      e.stopPropagation();
      currentDragging = true;
      startYPos = e.touches[0].clientY;
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!currentDragging) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYPos;
      
      console.log('🔵 Touch move - Direction:', deltaY > 0 ? 'DOWN ⬇️' : 'UP ⬆️', 'Delta:', deltaY, 'Current Y:', currentY, 'Start Y:', startYPos);
      
      // Allow full downward dragging to hide sheet completely
      if (deltaY > 0 && !isClosing) {
        // Ultra aggressive amplification - 20x for maximum sensitivity, no cap
        const amplifiedDelta = deltaY * 20;
        setSheetPosition(amplifiedDelta);
        console.log('🚀 SUPER AMPLIFIED:', amplifiedDelta, 'from finger movement:', deltaY);
        
        // Trigger immediate close when threshold reached
        if (amplifiedDelta > 150) {
          console.log('📱 IMMEDIATE CLOSE TRIGGERED - POSITION:', amplifiedDelta);
          setIsClosing(true);
          setSheetPosition(window.innerHeight);
          setTimeout(() => {
            handleExitClick();
          }, 200);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      console.log('Native touch end', { sheetPosition });
      e.preventDefault();
      e.stopPropagation();
      currentDragging = false;
      setIsDragging(false);
      
      // If dragged down more than 100px, animate it completely off-screen then close
      if (sheetPosition > 100) {
        console.log('Closing sheet due to swipe - animating off screen');
        // Animate to completely off-screen (full height of viewport)
        setSheetPosition(window.innerHeight);
        // Close after animation completes
        setTimeout(() => {
          handleExitClick();
        }, 300);
      } else {
        console.log('Snapping back to position 0');
        // Snap back to original position
        setSheetPosition(0);
      }
    };

    // Add native event listeners
    handleElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    handleElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    handleElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      handleElement.removeEventListener('touchstart', handleTouchStart);
      handleElement.removeEventListener('touchmove', handleTouchMove);
      handleElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isOpen, sheetPosition, isClosing]);

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
    setSheetPosition(0);
    
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

  // iOS-style mobile bottom sheet content
  const MobileContent = () => (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleExitClick}
      />
      
      {/* Bottom sheet - extends to just below header */}
      <div 
        ref={sheetRef}
        className="fixed left-0 right-0 z-50 bg-white rounded-t-[20px] flex flex-col"
        style={{ 
          top: '60px', // Just below the BackstageOS header
          height: 'calc(100vh - 60px)', // Full height minus header
          transform: `translateY(${sheetPosition}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
        }}
      >
        {/* Handle bar for swipe gesture - much larger touch area */}
        <div 
          className="handle-area flex justify-center py-8 px-8 cursor-grab active:cursor-grabbing touch-none"
          style={{ touchAction: 'none' }}
        >
          <div className="w-16 h-2 bg-gray-400 rounded-full"></div>
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
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

        {/* Email form content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Fields */}
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
      </div>
    </>
  );

  // Desktop modal content (existing structure)
  const DesktopContent = () => (
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

          {/* Theater Features Toggle */}
          <div className="px-4 py-2 border-b border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTheaterFeatures(!showTheaterFeatures)}
              className="text-blue-500 hover:text-blue-600 p-1 h-auto"
            >
              <Theater className="h-4 w-4 mr-2" />
              Theater Features
            </Button>
          </div>

          {/* Theater Features Panel */}
          {showTheaterFeatures && (
            <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
              <Tabs value={theaterTab} onValueChange={setTheaterTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="compose">Compose</TabsTrigger>
                  <TabsTrigger value="groups">Groups</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>
                
                <TabsContent value="compose" className="space-y-3 mt-3">
                  {/* Bulk Recipients */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Send to Group</Label>
                    <Select value={selectedRecipientGroup} onValueChange={(value) => {
                      setSelectedRecipientGroup(value);
                      const groupEmails = {
                        'all': 'cast@show.com, crew@show.com, creative@show.com',
                        'cast': 'actor1@show.com, actor2@show.com, actor3@show.com',
                        'crew': 'technician1@show.com, technician2@show.com',
                        'creative': 'director@show.com, designer@show.com'
                      };
                      if (groupEmails[value]) {
                        setToAddresses(groupEmails[value]);
                      }
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select recipient group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            All Team Members
                            <Badge variant="secondary" className="ml-2">6 people</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="cast">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Cast Only
                            <Badge variant="secondary" className="ml-2">3 people</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="crew">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Crew Only
                            <Badge variant="secondary" className="ml-2">2 people</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="creative">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Creative Team
                            <Badge variant="secondary" className="ml-2">2 people</Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Email Templates */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Use Template</Label>
                    <Select value={selectedTemplate} onValueChange={(value) => {
                      setSelectedTemplate(value);
                      const template = templates.find(t => t.id.toString() === value);
                      if (template) {
                        setSubject(template.subject);
                        setContent(template.content);
                      }
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose email template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              {template.name}
                              <Badge variant="outline" className="ml-2 text-xs">
                                {template.templateType.replace('_', ' ')}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick Actions */}
                  {selectedRecipientGroup && (
                    <div className="flex gap-2 pt-2">
                      <Badge variant="default" className="bg-blue-100 text-blue-800">
                        Sending to {selectedRecipientGroup} group
                      </Badge>
                      {selectedTemplate && (
                        <Badge variant="outline" className="text-green-700 border-green-200">
                          Using {templates.find(t => t.id.toString() === selectedTemplate)?.name} template
                        </Badge>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="groups" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Manage Groups</Label>
                    <Button size="sm" variant="outline" onClick={() => setEditingGroup({ name: '', emails: [], description: '' })}>
                      <Plus className="h-4 w-4 mr-1" />
                      New Group
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Group list with edit/delete options */}
                    {[
                      { name: 'All Team', count: 6, description: 'Cast, crew, and creative team' },
                      { name: 'Cast Only', count: 3, description: 'Actors and performers' },
                      { name: 'Crew Only', count: 2, description: 'Technical crew members' },
                      { name: 'Creative Team', count: 2, description: 'Director and designers' }
                    ].map((group, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-sm">{group.name}</span>
                              <Badge variant="secondary">{group.count} people</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingGroup(group)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Group Editor */}
                  {editingGroup && (
                    <Card className="p-4 border-blue-200 bg-blue-50">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {editingGroup.name ? 'Edit Group' : 'Create New Group'}
                          </Label>
                          <Button size="sm" variant="ghost" onClick={() => setEditingGroup(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Input 
                            placeholder="Group name" 
                            value={editingGroup.name} 
                            onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                          />
                          <Input 
                            placeholder="Description" 
                            value={editingGroup.description} 
                            onChange={(e) => setEditingGroup({...editingGroup, description: e.target.value})}
                          />
                          <Textarea 
                            placeholder="Email addresses (one per line)" 
                            value={editingGroup.emails?.join('\n') || ''} 
                            onChange={(e) => setEditingGroup({...editingGroup, emails: e.target.value.split('\n')})}
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingGroup(null)}>
                            Cancel
                          </Button>
                          <Button size="sm">
                            <Save className="h-4 w-4 mr-1" />
                            Save Group
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="templates" className="space-y-3 mt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Manage Templates</Label>
                    <Button size="sm" variant="outline" onClick={() => setEditingTemplate({ name: '', subject: '', content: '', templateType: 'call_sheet' })}>
                      <Plus className="h-4 w-4 mr-1" />
                      New Template
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Template list with edit/delete options */}
                    {templates.map((template) => (
                      <Card key={template.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-sm">{template.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {template.templateType.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{template.subject}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(template)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Template Editor */}
                  {editingTemplate && (
                    <Card className="p-4 border-blue-200 bg-blue-50">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            {editingTemplate.id ? 'Edit Template' : 'Create New Template'}
                          </Label>
                          <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Input 
                            placeholder="Template name" 
                            value={editingTemplate.name} 
                            onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                          />
                          <Select 
                            value={editingTemplate.templateType} 
                            onValueChange={(value) => setEditingTemplate({...editingTemplate, templateType: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Template type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call_sheet">Call Sheet</SelectItem>
                              <SelectItem value="rehearsal_report">Rehearsal Report</SelectItem>
                              <SelectItem value="tech_notes">Tech Notes</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input 
                            placeholder="Subject line" 
                            value={editingTemplate.subject} 
                            onChange={(e) => setEditingTemplate({...editingTemplate, subject: e.target.value})}
                          />
                          <Textarea 
                            placeholder="Email content" 
                            value={editingTemplate.content} 
                            onChange={(e) => setEditingTemplate({...editingTemplate, content: e.target.value})}
                            rows={4}
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)}>
                            Cancel
                          </Button>
                          <Button size="sm">
                            <Save className="h-4 w-4 mr-1" />
                            Save Template
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
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
  );

  return (
    <>
      {/* Mobile: iOS-style bottom sheet */}
      {isMobile && isOpen && <MobileContent />}
      
      {/* Desktop: Regular modal */}
      {!isMobile && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DesktopContent />
        </Dialog>
      )}
      
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