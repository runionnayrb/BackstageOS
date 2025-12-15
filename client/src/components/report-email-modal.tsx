import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

interface DistributionList {
  id: number;
  name: string;
  toRecipients: string[] | null;
  ccRecipients: string[] | null;
  bccRecipients: string[] | null;
  subjectTemplate: string | null;
  bodyTemplate: string | null;
  signature: string | null;
}

interface EmailAccount {
  id: number;
  email: string;
  provider: string;
  isPrimary: boolean;
}

interface ReportNote {
  id: number;
  content: string;
  status: string;
  priority: string;
  department: string;
  assignee: string | null;
}

interface ReportEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  reportTypeId: number;
  report: {
    id: number;
    title: string;
    date: string;
    content: Record<string, any>;
  };
  project: {
    id: number;
    name: string;
  };
  template: {
    id: number;
    name: string;
    sections: Array<{
      id: number;
      title: string;
      fields: Array<{
        id: number;
        label: string;
        type: string;
        defaultValue?: string;
      }>;
    }>;
  } | null;
  contentRef: React.MutableRefObject<Record<string, any>>;
  globalTemplateSettings: any;
}

export function ReportEmailModal({
  isOpen,
  onClose,
  projectId,
  reportTypeId,
  report,
  project,
  template,
  contentRef,
  globalTemplateSettings,
}: ReportEmailModalProps) {
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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-3',
      },
    },
  });

  const { data: assignedDistro } = useQuery<DistributionList>({
    queryKey: [`/api/projects/${projectId}/report-types/${reportTypeId}/distro`],
    enabled: isOpen && !!reportTypeId && reportTypeId > 0,
  });

  const { data: reportNotes = [] } = useQuery<ReportNote[]>({
    queryKey: [`/api/projects/${projectId}/reports/${report.id}/notes`],
    enabled: isOpen && !!report.id,
  });

  const replaceTemplateVariables = (text: string): string => {
    if (!text) return "";
    const reportDate = new Date(report.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const shortDate = new Date(report.date).toLocaleDateString();
    const reportTypeName = template?.name || "Report";
    
    const replacements: Record<string, string> = {
      "Report Name": reportTypeName,
      "report name": reportTypeName,
      "reportName": reportTypeName,
      "Show Name": project.name,
      "show name": project.name,
      "showName": project.name,
      "Report Title": report.title,
      "report title": report.title,
      "reportTitle": report.title,
      "Report Date": reportDate,
      "report date": reportDate,
      "reportDate": reportDate,
      "Date": reportDate,
      "date": reportDate,
      "Short Date": shortDate,
      "shortDate": shortDate,
      "Report Type": reportTypeName,
      "report type": reportTypeName,
      "reportType": reportTypeName,
      "Project Name": project.name,
      "project name": project.name,
      "projectName": project.name,
    };
    
    let result = text;
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(regex, value);
    }
    return result;
  };

  const stripHtml = (html: string): string => {
    if (!html) return "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };

  const generateReportContentHtml = (): string => {
    if (!template?.sections) return "";
    
    let html = "<div style=\"font-family: Arial, sans-serif; max-width: 800px;\">";
    html += `<h2 style="margin-bottom: 8px;">${report.title}</h2>`;
    html += `<p style="color: #666; margin-bottom: 16px;">${project.name} - ${new Date(report.date).toLocaleDateString()}</p>`;
    html += "<hr style=\"border: 0; border-top: 1px solid #ddd; margin: 16px 0;\" />";
    
    for (const section of template.sections) {
      html += `<h3 style="margin-top: 24px; margin-bottom: 12px; color: #333;">${section.title}</h3>`;
      
      if (section.fields?.length > 0) {
        for (const field of section.fields) {
          const fieldContent = contentRef.current[field.label] || field.defaultValue || "";
          const plainContent = stripHtml(fieldContent);
          
          if (plainContent.trim()) {
            html += `<div style="margin-bottom: 16px;">`;
            html += `<strong style="display: block; margin-bottom: 4px;">${field.label}</strong>`;
            html += `<div style="padding-left: 16px; white-space: pre-wrap;">${plainContent}</div>`;
            html += `</div>`;
          }
        }
      }
    }
    
    if (reportNotes.length > 0) {
      html += `<h3 style="margin-top: 24px; margin-bottom: 12px; color: #333;">Notes</h3>`;
      html += `<ul style="margin: 0; padding-left: 20px;">`;
      for (const note of reportNotes) {
        const statusLabel = note.status !== "open" ? ` [${note.status}]` : "";
        const priorityLabel = note.priority === "high" ? " ⚠️" : note.priority === "urgent" ? " 🔴" : "";
        html += `<li style="margin-bottom: 8px;">${note.content}${statusLabel}${priorityLabel}</li>`;
      }
      html += `</ul>`;
    }
    
    html += "</div>";
    return html;
  };

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && editor && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      const defaultSubject = replaceTemplateVariables("{{Report Title}} - {{Show Name}}");
      
      if (assignedDistro) {
        const toEmails = (assignedDistro.toRecipients || []).join(', ');
        const ccEmails = (assignedDistro.ccRecipients || []).join(', ');
        const bccEmails = (assignedDistro.bccRecipients || []).join(', ');
        
        setShowCCField(ccEmails.length > 0);
        setShowBCCField(bccEmails.length > 0);
        
        const subjectText = replaceTemplateVariables(assignedDistro.subjectTemplate || "{{Report Title}} - {{Show Name}}");
        let bodyText = replaceTemplateVariables(assignedDistro.bodyTemplate || "");
        if (assignedDistro.signature) {
          bodyText += "\n\n" + assignedDistro.signature;
        }
        
        setEmailForm({
          to: toEmails,
          cc: ccEmails,
          bcc: bccEmails,
          subject: subjectText,
          body: bodyText,
        });
        
        editor.commands.setContent(bodyText.replace(/\n/g, "<br>"));
      } else {
        setEmailForm({
          to: '',
          cc: '',
          bcc: '',
          subject: defaultSubject,
          body: '',
        });
        editor.commands.setContent('');
      }
    }
    
    if (!isOpen) {
      hasInitializedRef.current = false;
    }
  }, [isOpen, assignedDistro, editor]);

  const generatePdfBlob = async (): Promise<Blob> => {
    const pdfSettings = globalTemplateSettings?.pdfExport || {
      fontFamily: "helvetica",
      titleSize: 18,
      showNameSize: 16,
      sectionTitleSize: 13,
      fieldTitleSize: 12,
      contentSize: 11,
      lineHeight: 1.4,
      marginTop: 0.5,
      marginBottom: 0.5,
      marginLeft: 1,
      marginRight: 1,
    };

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "letter",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = pdfSettings.marginLeft * 72;
    const marginRight = pdfSettings.marginRight * 72;
    const marginTop = pdfSettings.marginTop * 72;
    const marginBottom = pdfSettings.marginBottom * 72;
    const contentWidth = pageWidth - marginLeft - marginRight;

    const titleSize = pdfSettings.titleSize;
    const showNameSize = pdfSettings.showNameSize;
    const sectionTitleSize = pdfSettings.sectionTitleSize;
    const fieldTitleSize = pdfSettings.fieldTitleSize;
    const contentSize = pdfSettings.contentSize;
    const lineHeight = pdfSettings.lineHeight;
    const fontFamily = pdfSettings.fontFamily;

    let yPosition = marginTop;

    const checkNewPage = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - marginBottom) {
        pdf.addPage();
        yPosition = marginTop;
        return true;
      }
      return false;
    };

    const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
      pdf.setFontSize(fontSize);
      return pdf.splitTextToSize(text, maxWidth);
    };

    const centerX = pageWidth / 2;

    pdf.setFontSize(titleSize);
    pdf.setFont(fontFamily, "bold");
    const titleLines = wrapText(report.title || "Report", contentWidth, titleSize);
    titleLines.forEach((line: string) => {
      checkNewPage(titleSize * lineHeight);
      pdf.text(line, centerX, yPosition, { align: "center" });
      yPosition += titleSize * lineHeight;
    });

    pdf.setFontSize(showNameSize);
    pdf.setFont(fontFamily, "normal");
    if (project.name) {
      const projectLines = wrapText(project.name, contentWidth, showNameSize);
      projectLines.forEach((line: string) => {
        checkNewPage(showNameSize * lineHeight);
        pdf.text(line, centerX, yPosition, { align: "center" });
        yPosition += showNameSize * lineHeight;
      });
    }

    const dateStr = new Date(report.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    pdf.text(dateStr, centerX, yPosition, { align: "center" });
    yPosition += showNameSize * lineHeight;

    pdf.setLineWidth(0.5);
    pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
    yPosition += contentSize * lineHeight;

    if (template?.sections) {
      for (const section of template.sections) {
        checkNewPage(sectionTitleSize * lineHeight + 20);

        pdf.setFontSize(sectionTitleSize);
        pdf.setFont(fontFamily, "bold");
        const sectionLines = wrapText(section.title || "", contentWidth, sectionTitleSize);
        sectionLines.forEach((line: string) => {
          checkNewPage(sectionTitleSize * lineHeight);
          pdf.text(line, marginLeft, yPosition);
          yPosition += sectionTitleSize * lineHeight;
        });
        yPosition += 6;

        if (section.fields?.length > 0) {
          for (const field of section.fields) {
            checkNewPage(fieldTitleSize * lineHeight + 10);
            pdf.setFontSize(fieldTitleSize);
            pdf.setFont(fontFamily, "bold");
            const fieldLines = wrapText(field.label || "", contentWidth - 20, fieldTitleSize);
            fieldLines.forEach((line: string) => {
              checkNewPage(fieldTitleSize * lineHeight);
              pdf.text(line, marginLeft + 10, yPosition);
              yPosition += fieldTitleSize * lineHeight;
            });
            yPosition += 2;

            const fieldContent = contentRef.current[field.label] || field.defaultValue || "";
            const plainContent = stripHtml(fieldContent);

            if (plainContent.trim()) {
              pdf.setFontSize(contentSize);
              pdf.setFont(fontFamily, "normal");
              const contentLines = wrapText(plainContent, contentWidth - 30, contentSize);
              contentLines.forEach((line: string) => {
                checkNewPage(contentSize * lineHeight);
                pdf.text(line, marginLeft + 20, yPosition);
                yPosition += contentSize * lineHeight;
              });
            }
            yPosition += 8;
          }
        }
        yPosition += 12;
      }
    }

    return pdf.output("blob");
  };

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
      const pdfBlob = await generatePdfBlob();
      const pdfFileName = `${report.title || "Report"}-${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`;

      // Get email body from editor and append report content
      let htmlContent = editor?.getHTML() || emailForm.body.replace(/\n/g, "<br>");
      htmlContent += "<br><br>" + generateReportContentHtml();

      // Parse email addresses (handle comma-separated values)
      const parseEmails = (str: string) => str.split(',').map(e => e.trim()).filter(e => e);

      const formData = new FormData();
      formData.append("toAddresses", JSON.stringify(parseEmails(emailForm.to)));
      if (emailForm.cc) {
        formData.append("ccAddresses", JSON.stringify(parseEmails(emailForm.cc)));
      }
      if (emailForm.bcc) {
        formData.append("bccAddresses", JSON.stringify(parseEmails(emailForm.bcc)));
      }
      formData.append("subject", emailForm.subject);
      formData.append("content", stripHtml(htmlContent));
      formData.append("htmlContent", htmlContent);
      formData.append("attachments", new File([pdfBlob], pdfFileName, { type: "application/pdf" }));

      const response = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      toast({ title: "Success", description: "Email sent successfully with PDF attached" });
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Report</DialogTitle>
          <DialogDescription>
            Send the report PDF via email
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email-to">To *</Label>
            <Input
              id="email-to"
              placeholder="recipient@example.com"
              value={emailForm.to}
              onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
              data-testid="input-email-to"
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
                  data-testid="input-email-cc"
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
                data-testid="input-email-bcc"
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
              data-testid="input-email-subject"
            />
          </div>

          <div>
            <Label htmlFor="email-body">Message</Label>
            {editor && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
                <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex gap-1 bg-gray-50 dark:bg-gray-900">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-blue-200 dark:bg-blue-900' : ''}`}
                    title="Bold"
                    data-testid="button-email-bold"
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
                    data-testid="button-email-italic"
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
                    data-testid="button-email-underline"
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
                    data-testid="button-email-bullet-list"
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
                    data-testid="button-email-ordered-list"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </div>
                
                <EditorContent 
                  editor={editor}
                  data-testid="editor-email-body"
                  className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:p-3 [&_.ProseMirror]:min-h-[120px]"
                />
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-900 dark:text-blue-100">
            📎 Report PDF will be attached to this email. Report content will be included in the email body.
          </div>

          {assignedDistro && (
            <p className="text-xs text-muted-foreground">
              Pre-populated from distribution list: <strong>{assignedDistro.name}</strong>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending} data-testid="btn-cancel-email">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending} data-testid="btn-send-email">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Email"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
