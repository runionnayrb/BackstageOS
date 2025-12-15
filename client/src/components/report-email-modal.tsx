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

  const { data: allDistros = [], isLoading: distrosLoading } = useQuery<DistributionList[]>({
    queryKey: [`/api/projects/${projectId}/distros`],
    enabled: isOpen && !!projectId,
  });

  const { data: distroMappings = {}, isLoading: mappingsLoading } = useQuery<Record<string, number[]>>({
    queryKey: [`/api/projects/${projectId}/distro-report-type-mappings`],
    enabled: isOpen && !!projectId,
  });

  const distroDataReady = !distrosLoading && !mappingsLoading;

  const assignedDistros = allDistros.filter(distro => {
    const assignedReportTypeIds = distroMappings[distro.id.toString()] || [];
    return assignedReportTypeIds.includes(reportTypeId);
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

  const normalizeListHtml = (html: string): string => {
    if (!html) return "";
    const listStyle = "list-style-type: decimal; padding-left: 20px; margin: 0 0 0 16px;";
    const listItemStyle = "margin: 0; padding: 0;";
    let result = html
      .replace(/<ol[^>]*>/gi, `<ol style="${listStyle}">`)
      .replace(/<ul[^>]*>/gi, `<ul style="${listStyle}">`)
      .replace(/<li[^>]*>/gi, `<li style="${listItemStyle}">`);
    return result;
  };

  const generateReportContentHtml = (): string => {
    if (!template?.sections) return "";
    
    let html = "<hr><div style=\"font-family: Arial, sans-serif; max-width: 800px;\">";
    
    for (const section of template.sections) {
      html += `<h3 style="margin-top: 16px; margin-bottom: 4px; color: #333;">${section.title}</h3>`;
      
      if (section.fields?.length > 0) {
        for (const field of section.fields) {
          const fieldContent = contentRef.current[field.label] || field.defaultValue || "";
          const fieldHtml = typeof fieldContent === 'string' ? fieldContent : '';
          const plainContent = stripHtml(fieldHtml);
          
          if (plainContent.trim()) {
            html += `<div style="margin-bottom: 8px;">`;
            html += `<strong style="display: block; margin-bottom: 2px;">${field.label}</strong>`;
            html += `<div style="padding-left: 16px;">${normalizeListHtml(fieldHtml)}</div>`;
            html += `</div>`;
          }
        }
      }
    }
    
    if (reportNotes.length > 0) {
      html += `<h3 style="margin-top: 16px; margin-bottom: 4px; color: #333;">Notes</h3>`;
      html += `<ol style="margin: 0; padding-left: 36px;">`;
      for (const note of reportNotes) {
        const statusLabel = note.status !== "open" ? ` [${note.status}]` : "";
        const priorityLabel = note.priority === "high" ? " ⚠️" : note.priority === "urgent" ? " 🔴" : "";
        html += `<li style="margin: 0; padding: 0;">${note.content}${statusLabel}${priorityLabel}</li>`;
      }
      html += `</ol>`;
    }
    
    html += "</div>";
    return html;
  };

  // Track if we've already initialized with distros to avoid re-initialization
  const initializedWithDistrosRef = useRef(false);

  // Initialize form when modal opens and data is ready
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      initializedWithDistrosRef.current = false;
      return;
    }
    
    if (!editor || !distroDataReady) return;
    
    // If we haven't initialized at all, or we previously initialized without distros but now have them
    const shouldInitialize = !hasInitializedRef.current || 
      (!initializedWithDistrosRef.current && assignedDistros.length > 0);
    
    if (!shouldInitialize) return;
    
    hasInitializedRef.current = true;
    
    const defaultSubject = replaceTemplateVariables("{{Report Title}} - {{Show Name}}");
    const reportContentHtml = generateReportContentHtml();
    
    if (assignedDistros.length > 0) {
      initializedWithDistrosRef.current = true;
      
      const allToEmails = new Set<string>();
      const allCcEmails = new Set<string>();
      const allBccEmails = new Set<string>();
      
      for (const distro of assignedDistros) {
        (distro.toRecipients || []).forEach(email => allToEmails.add(email));
        (distro.ccRecipients || []).forEach(email => allCcEmails.add(email));
        (distro.bccRecipients || []).forEach(email => allBccEmails.add(email));
      }
      
      const toEmailsStr = Array.from(allToEmails).join(', ');
      const ccEmailsStr = Array.from(allCcEmails).join(', ');
      const bccEmailsStr = Array.from(allBccEmails).join(', ');
      
      setShowCCField(ccEmailsStr.length > 0);
      setShowBCCField(bccEmailsStr.length > 0);
      
      const firstDistro = assignedDistros[0];
      const subjectText = replaceTemplateVariables(firstDistro.subjectTemplate || "{{Report Title}} - {{Show Name}}");
      let bodyText = replaceTemplateVariables(firstDistro.bodyTemplate || "");
      if (firstDistro.signature) {
        bodyText += "\n\n" + firstDistro.signature;
      }
      
      setEmailForm({
        to: toEmailsStr,
        cc: ccEmailsStr,
        bcc: bccEmailsStr,
        subject: subjectText,
        body: bodyText,
      });
      
      // Include both the message and the report content in the editor
      const fullContent = bodyText.replace(/\n/g, "<br>") + "<br><br>" + reportContentHtml;
      editor.commands.setContent(fullContent);
    } else {
      setEmailForm({
        to: '',
        cc: '',
        bcc: '',
        subject: defaultSubject,
        body: '',
      });
      // Show report content even without a distro
      editor.commands.setContent(reportContentHtml);
    }
  }, [isOpen, assignedDistros, editor, distroDataReady, allDistros, distroMappings, reportTypeId]);

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

      // Get email body from editor - report content is already included
      const htmlContent = editor?.getHTML() || emailForm.body.replace(/\n/g, "<br>");

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
                  className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:p-3 [&_.ProseMirror]:min-h-[300px] max-h-[400px] overflow-y-auto"
                />
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-900 dark:text-blue-100">
            📎 Report PDF will also be attached to this email.
          </div>

          {assignedDistros.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Pre-populated from distribution {assignedDistros.length === 1 ? 'list' : 'lists'}: <strong>{assignedDistros.map(d => d.name).join(', ')}</strong>
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
