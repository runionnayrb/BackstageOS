import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Loader2 } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { format, parseISO } from "date-fns";
import { generateDailyCallPdfBlob, getDailyCallFilename } from "@/lib/dailyCallPdf";

interface DailyCallEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  project: {
    id: number;
    name: string;
  };
  selectedDate: string;
  callData: {
    locations: any[];
    announcements: string;
    sectionContents: Record<string, string>;
    fittingsEvents?: any[];
    appointmentsEvents?: any[];
  };
  scheduleSettings: any;
  getFormattedCast: (event: any) => string[];
}

export function DailyCallEmailModal({
  isOpen,
  onClose,
  projectId,
  project,
  selectedDate,
  callData,
  scheduleSettings,
  getFormattedCast,
}: DailyCallEmailModalProps) {
  const { toast } = useToast();
  const [emailForm, setEmailForm] = useState({ to: '', cc: '', bcc: '', subject: '', body: '' });
  const [showCCField, setShowCCField] = useState(false);
  const [showBCCField, setShowBCCField] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const hasInitializedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
        strike: false,
      }),
      Underline,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setEmailForm(prev => ({ ...prev, body: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3 [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:ml-0 [&_ol]:my-1 [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:ml-0 [&_ul]:my-1 [&_li]:my-0 [&_li]:pl-0 [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:my-1',
      },
    },
  });

  const { data: globalTemplateSettings } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/global-template-settings`],
    enabled: isOpen && !!projectId,
  });

  const { data: dailyCallDistro } = useQuery<{
    id: number;
    toRecipients: string[] | null;
    ccRecipients: string[] | null;
    bccRecipients: string[] | null;
    subjectTemplate: string | null;
    bodyTemplate: string | null;
    signature: string | null;
  } | null>({
    queryKey: [`/api/projects/${projectId}/daily-call-distro`],
    enabled: isOpen && !!projectId,
  });

  const stripHtml = (html: string): string => {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const normalizeListHtml = (html: string): string => {
    if (!html) return "";
    const olStyle = "list-style-type: decimal; list-style-position: inside; padding-left: 0; margin: 0;";
    const ulStyle = "list-style-type: disc; list-style-position: inside; padding-left: 0; margin: 0;";
    const listItemStyle = "margin: 0; padding: 0;";
    let result = html
      .replace(/<p><\/p>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<ol[^>]*>/gi, `<div style="padding-left: 20px;"><ol style="${olStyle}">`)
      .replace(/<\/ol>/gi, '</ol></div>')
      .replace(/<ul[^>]*>/gi, `<div style="padding-left: 20px;"><ul style="${ulStyle}">`)
      .replace(/<\/ul>/gi, '</ul></div>')
      .replace(/<li[^>]*>/gi, `<li style="${listItemStyle}">`)
      .replace(/<p[^>]*>/gi, '<span>')
      .replace(/<\/p>/gi, '</span>');
    return result;
  };

  // Format plain text section content (with numbered/bullet lists) to HTML for email
  const formatSectionContentForEmail = (content: string): string => {
    if (!content) return "";
    const lines = content.split('\n');
    let html = '';
    for (const line of lines) {
      if (!line.trim()) {
        html += '<br>';
        continue;
      }
      // Check for numbered list (e.g., "1. Item")
      const numberedMatch = line.match(/^(\d+\.)\s(.*)$/);
      if (numberedMatch) {
        html += `<div style="display: flex; margin-bottom: 2px;"><span style="width: 24px; flex-shrink: 0; text-align: right; padding-right: 8px;">${numberedMatch[1]}</span><span>${numberedMatch[2]}</span></div>`;
        continue;
      }
      // Check for bullet (•)
      const bulletMatch = line.match(/^(•)\s(.*)$/);
      if (bulletMatch) {
        html += `<div style="display: flex; margin-bottom: 2px;"><span style="width: 16px; flex-shrink: 0;">${bulletMatch[1]}</span><span>${bulletMatch[2]}</span></div>`;
        continue;
      }
      // Check for dash (-)
      const dashMatch = line.match(/^(-)\s(.*)$/);
      if (dashMatch) {
        html += `<div style="display: flex; margin-bottom: 2px;"><span style="width: 16px; flex-shrink: 0;">${dashMatch[1]}</span><span>${dashMatch[2]}</span></div>`;
        continue;
      }
      // Plain text line
      html += `<div>${line}</div>`;
    }
    return html;
  };

  const generateDailyCallContentHtml = (): string => {
    let html =
      `<hr>` +
      `<div style="font-family: Arial, sans-serif; max-width: 800px;">` +
      `<style>
        table { border-collapse: collapse; width: 100%; }
        td { vertical-align: top; }
        .col-time { width: 165px; padding: 6px 10px 6px 0; line-height: 1.3; white-space: normal; }
        .col-details { padding: 6px 0; line-height: 1.3; white-space: normal; word-break: break-word; }
        @media screen and (max-width: 480px) {
          .col-time, .col-details { display: block !important; width: 100% !important; padding-right: 0 !important; }
          .col-time { padding-bottom: 2px !important; }
        }
      </style>`;

    html += `<h2 style="text-align: center; margin: 0 0 1px 0;">${project.name}</h2>`;
    html += `<h3 style="text-align: center; margin: 0 0 1px 0;">DAILY SCHEDULE</h3>`;
    html += `<p style="text-align: center; margin: 0 0 16px 0;">${format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}</p>`;

    const customSections = scheduleSettings?.customSections || [];
    const topSections = customSections.filter((s: any) => s.position === "top");
    topSections.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    for (const section of topSections) {
      const content =
        callData.sectionContents[section.id] ||
        (section.id === "announcements" ? callData.announcements : "");
      const hasContent = content && content.trim().length > 0;
      const displayContent = hasContent
        ? formatSectionContentForEmail(content)
        : `<span style="color: #888; font-style: italic;">No ${section.name.toLowerCase()} for today</span>`;

      html += `<h3 style="margin-top: 16px; margin-bottom: 4px; color: #333;">${section.name}</h3>`;
      html += `<div style="border: 2px solid #000; padding: 8px; min-height: 40px;">${displayContent}</div>`;
    }

    for (const location of callData.locations || []) {
      const realEvents = (location.events || []).filter((e: any) => e.title !== "END-OF-DAY");
      if (realEvents.length === 0) continue;

      html += `<h3 style="margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 4px;">${location.name}</h3>`;

      for (const event of realEvents) {
        const castDisplay = getFormattedCast(event).join(", ");

        html += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 8px;">`;
        html += `<tr>`;

        html += `<td class="col-time" style="width: 165px; padding: 6px 10px 6px 0; vertical-align: top; line-height: 1.3; white-space: normal;"><strong>${event.startTime} - ${event.endTime}</strong></td>`;

        html += `<td class="col-details" style="padding: 6px 0; vertical-align: top; line-height: 1.3; white-space: normal; word-break: break-word;">`;
        html += `<div style="font-weight: 700;">${event.title}</div>`;

        if (castDisplay) {
          html += `<div style="font-size: 12px; color: #333;">${castDisplay}</div>`;
        }
        if (event.notes) {
          html += `<div style="font-size: 12px; color: #666;">${event.notes}</div>`;
        }

        html += `</td>`;

        html += `</tr>`;
        html += `</table>`;
      }
    }

    if (callData.fittingsEvents && callData.fittingsEvents.length > 0) {
      html += `<h3 style="margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 4px;">Fittings</h3>`;
      for (const event of callData.fittingsEvents) {
        const castDisplay = getFormattedCast(event).join(", ");
        html += `<div style="margin-bottom: 8px;">`;
        html += `${event.startTime} - ${event.title}`;
        if (castDisplay) {
          html += ` (${castDisplay})`;
        }
        html += `</div>`;
      }
    }

    if (callData.appointmentsEvents && callData.appointmentsEvents.length > 0) {
      html += `<h3 style="margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 4px;">Appointments & Meetings</h3>`;
      for (const event of callData.appointmentsEvents) {
        const castDisplay = getFormattedCast(event).join(", ");
        html += `<div style="margin-bottom: 8px;">`;
        html += `${event.startTime} - ${event.title}`;
        if (castDisplay) {
          html += ` (${castDisplay})`;
        }
        html += `</div>`;
      }
    }

    const bottomSections = customSections.filter((s: any) => s.position === "bottom");
    bottomSections.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    for (const section of bottomSections) {
      const content = callData.sectionContents[section.id] || "";
      const hasContent = content && content.trim().length > 0;
      const displayContent = hasContent
        ? formatSectionContentForEmail(content)
        : `<span style="color: #888; font-style: italic;">No ${section.name.toLowerCase()} for today</span>`;

      html += `<h3 style="margin-top: 16px; margin-bottom: 4px; color: #333;">${section.name}</h3>`;
      html += `<div style="border: 2px solid #000; padding: 8px; min-height: 40px;">${displayContent}</div>`;
    }

    html += `</div>`;
    return html;
  };

  const distroLoadedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      distroLoadedRef.current = null;
      return;
    }
    
    if (!editor) return;
    
    const distroId = dailyCallDistro?.id || null;
    const distroChanged = distroId !== distroLoadedRef.current && distroId !== null;
    
    if (hasInitializedRef.current && !distroChanged) return;
    
    hasInitializedRef.current = true;
    distroLoadedRef.current = distroId;
    
    const dateFormatted = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');
    const defaultSubject = `${project.name} | Daily Call | ${dateFormatted}`;
    const defaultBody = `Hi Everyone,\n\nAttached is the Daily Call for ${project.name} for ${dateFormatted}.\n\nBest,`;
    
    const toRecipients = dailyCallDistro?.toRecipients?.join(', ') || '';
    const ccRecipients = dailyCallDistro?.ccRecipients?.join(', ') || '';
    const bccRecipients = dailyCallDistro?.bccRecipients?.join(', ') || '';
    
    if (ccRecipients) setShowCCField(true);
    if (bccRecipients) setShowBCCField(true);
    
    setEmailForm({
      to: toRecipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject: defaultSubject,
      body: defaultBody,
    });
    
    // Only set the user's message in the editor - daily call is shown separately below
    editor.commands.setContent(defaultBody.replace(/\n/g, "<br>"));
    editor.commands.focus('start');
  }, [isOpen, editor, selectedDate, project.name, dailyCallDistro]);

  const handleSend = async () => {
    if (!emailForm.to.trim()) {
      toast({ title: "Missing recipient", description: "Please enter at least one email address in the 'To' field.", variant: "destructive" });
      return;
    }
    if (!emailForm.subject.trim()) {
      toast({ title: "Missing subject", description: "Please enter a subject for the email.", variant: "destructive" });
      return;
    }

    setIsSending(true);

    try {
      const pdfBlob = await generateDailyCallPdfBlob({
        projectName: project.name,
        selectedDate: selectedDate,
      });
      const pdfFileName = getDailyCallFilename(project.name, selectedDate);

      // Get user message from editor and combine with daily call HTML
      const userMessage = editor?.getHTML() || emailForm.body.replace(/\n/g, "<br>");
      const dailyCallHtml = generateDailyCallContentHtml();
      const htmlContent = `<div style="font-family: Arial, sans-serif;">${userMessage}</div>${dailyCallHtml}`;

      // Ensure we strip any contenteditable attributes before sending
      const cleanedHtmlContent = htmlContent.replace(/contenteditable="true"/gi, '').replace(/contenteditable="false"/gi, '');

      const formData = new FormData();
      formData.append("toAddresses", emailForm.to.trim());
      if (emailForm.cc) {
        formData.append("ccAddresses", emailForm.cc.trim());
      }
      if (emailForm.bcc) {
        formData.append("bccAddresses", emailForm.bcc.trim());
      }
      formData.append("subject", emailForm.subject);
      formData.append("content", stripHtml(cleanedHtmlContent));
      formData.append("htmlContent", cleanedHtmlContent);
      formData.append("attachments", new File([pdfBlob], pdfFileName, { type: "application/pdf" }));
      formData.append("projectId", projectId.toString());
      formData.append("emailType", "daily-call");

      const response = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      toast({ title: "Success", description: "Daily call sent successfully with PDF attached" });
      onClose();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setEmailForm({ to: '', cc: '', bcc: '', subject: '', body: '' });
    setShowCCField(false);
    setShowBCCField(false);
    hasInitializedRef.current = false;
    if (editor) {
      editor.commands.setContent('');
    }
    onClose();
  };

  const setIsOpenInternal = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpenInternal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Daily Call</DialogTitle>
          <DialogDescription>
            Send the daily call PDF via email
          </DialogDescription>
        </DialogHeader>
        
        {/* Hidden container for PDF generation */}
        <div id="daily-call-content" className="hidden">
          <div dangerouslySetInnerHTML={{ __html: generateDailyCallContentHtml() }} />
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email-to">To *</Label>
            <Input
              id="email-to"
              placeholder="recipient@example.com"
              value={emailForm.to}
              onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
              data-testid="input-daily-call-email-to"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex gap-6">
              <button
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={() => setShowCCField(!showCCField)}
                type="button"
              >
                {showCCField ? '▼' : '▶'} CC
              </button>
              {!showCCField && (
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => setShowBCCField(!showBCCField)}
                  type="button"
                >
                  {showBCCField ? '▼' : '▶'} BCC
                </button>
              )}
            </div>
            {showCCField && (
              <>
                <Input
                  placeholder="cc@example.com"
                  value={emailForm.cc}
                  onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                  data-testid="input-daily-call-email-cc"
                />
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => setShowBCCField(!showBCCField)}
                  type="button"
                >
                  {showBCCField ? '▼' : '▶'} BCC
                </button>
              </>
            )}
            {showBCCField && (
              <Input
                placeholder="bcc@example.com"
                value={emailForm.bcc}
                onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })}
                data-testid="input-daily-call-email-bcc"
              />
            )}
          </div>

          <div>
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Email subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              data-testid="input-daily-call-email-subject"
            />
          </div>

          <div>
            <Label htmlFor="email-body">Email Body</Label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-950">
              {/* Formatting Toolbar */}
              {editor && (
                <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex gap-1 bg-gray-50 dark:bg-gray-900 rounded-t-md">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                    title="Bold"
                    data-testid="button-daily-call-email-bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                    title="Italic"
                    data-testid="button-daily-call-email-italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                    title="Underline"
                    data-testid="button-daily-call-email-underline"
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </Button>
                  
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                    title="Bullet List"
                    data-testid="button-daily-call-email-bullet-list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                    title="Numbered List"
                    data-testid="button-daily-call-email-ordered-list"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Editable Message */}
              {editor && (
                <EditorContent 
                  editor={editor} 
                  className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:p-3 [&_.ProseMirror]:min-h-[80px] border-b border-gray-200 dark:border-gray-700" 
                />
              )}
              
              {/* Daily Call Content - Styled to match BSOS */}
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <hr className="border-t-2 border-gray-300 mb-4" />
                
                {/* Header */}
                <h2 className="text-center text-xl font-bold mb-px">{project.name}</h2>
                <h3 className="text-center text-lg font-semibold mb-px">DAILY SCHEDULE</h3>
                <p className="text-center text-sm mb-4">{format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
                
                {/* Top Sections */}
                {(scheduleSettings?.customSections || [])
                  .filter((s: any) => s.position === 'top')
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  .map((section: any) => {
                    const content = callData.sectionContents[section.id] || 
                      (section.id === 'announcements' ? callData.announcements : '');
                    const hasContent = content && content.trim().length > 0;
                    // Always show section (even if empty) to match BSOS display
                    return (
                      <div key={section.id} className="mb-4">
                        <h4 className="font-semibold text-sm mb-1">{section.name}</h4>
                        <div className="text-sm border-2 border-black p-2 whitespace-pre-wrap min-h-[40px]">
                          {hasContent 
                            ? content 
                            : <span className="text-gray-400 italic">No {section.name.toLowerCase()} for today</span>}
                        </div>
                      </div>
                    );
                  })}
                
                {/* Schedule by Location */}
                {(callData.locations || [])
                  .filter((location: any) => {
                    // Only show locations that have actual events (not just END-OF-DAY)
                    const realEvents = (location.events || []).filter((e: any) => e.title !== 'END-OF-DAY');
                    return realEvents.length > 0;
                  })
                  .map((location: any, locIdx: number) => (
                  <div key={locIdx} className="mb-4">
                    <h4 className="text-lg font-semibold border-b-2 border-black pb-1 mb-2">{location.name}</h4>
                    <div className="space-y-2">
                      {(location.events || []).filter((e: any) => e.title !== 'END-OF-DAY').map((event: any, evtIdx: number) => (
                        <div key={evtIdx} className="flex gap-2 py-1">
                          <div className="w-[165px] flex-shrink-0 text-sm whitespace-nowrap">
                            {event.startTime} - {event.endTime}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-bold">{event.title}</div>
                            {getFormattedCast(event).length > 0 && (
                              <div className="text-xs text-gray-700">{getFormattedCast(event).join(', ')}</div>
                            )}
                            {event.notes && (
                              <div className="text-xs text-gray-500 italic">{event.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Fittings */}
                {callData.fittingsEvents && callData.fittingsEvents.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold border-b-2 border-black pb-1 mb-2">Fittings</h4>
                    <div className="space-y-1">
                      {callData.fittingsEvents.map((event: any, idx: number) => (
                        <div key={idx} className="flex gap-4 py-1 text-sm">
                          <span className="w-28 flex-shrink-0">{event.startTime}</span>
                          <span>{event.title} {getFormattedCast(event).length > 0 && `(${getFormattedCast(event).join(', ')})`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Appointments */}
                {callData.appointmentsEvents && callData.appointmentsEvents.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold border-b-2 border-black pb-1 mb-2">Appointments & Meetings</h4>
                    <div className="space-y-1">
                      {callData.appointmentsEvents.map((event: any, idx: number) => (
                        <div key={idx} className="flex gap-4 py-1 text-sm">
                          <span className="w-28 flex-shrink-0">{event.startTime}</span>
                          <span>{event.title} {getFormattedCast(event).length > 0 && `(${getFormattedCast(event).join(', ')})`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Bottom Sections */}
                {(scheduleSettings?.customSections || [])
                  .filter((s: any) => s.position === 'bottom')
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  .map((section: any) => {
                    const content = callData.sectionContents[section.id] || '';
                    const hasContent = content && content.trim().length > 0;
                    // Always show section (even if empty) to match BSOS display
                    return (
                      <div key={section.id} className="mb-4">
                        <h4 className="font-semibold text-sm mb-1">{section.name}</h4>
                        <div className="text-sm border-2 border-black p-2 whitespace-pre-wrap min-h-[40px]">
                          {hasContent 
                            ? content 
                            : <span className="text-gray-400 italic">No {section.name.toLowerCase()} for today</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-900 dark:text-blue-100">
            📎 Daily Call PDF will also be attached to this email
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending} data-testid="button-daily-call-email-cancel">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending} data-testid="button-daily-call-email-send">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Email'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
