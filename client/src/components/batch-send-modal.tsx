import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Loader2, Send, FileText } from "lucide-react";
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

interface BatchSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  reportTypeId: number;
  reportTypeSlug: string;
  reports: Array<{
    id: number;
    title: string;
    date: string;
    content: Record<string, any>;
    templateId?: number;
  }>;
  project: any;
  templates: any[];
  globalTemplateSettings: any;
}

export function BatchSendModal({
  isOpen,
  onClose,
  projectId,
  reportTypeId,
  reportTypeSlug,
  reports,
  project,
  templates,
  globalTemplateSettings,
}: BatchSendModalProps) {
  const { toast } = useToast();
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [step, setStep] = useState<'select' | 'compose'>('select');
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

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysReports = reports.filter(r => {
    const reportDate = new Date(r.date).toISOString().split('T')[0];
    return reportDate === todayStr;
  });

  useEffect(() => {
    if (isOpen && step === 'select') {
      if (todaysReports.length > 0) {
        setSelectedReportIds(todaysReports.map(r => r.id));
      } else {
        setSelectedReportIds([]);
      }
    }
  }, [isOpen, step]);

  const sortedSelectedReports = reports
    .filter(r => selectedReportIds.includes(r.id))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const replaceTemplateVariables = (text: string): string => {
    if (!text) return "";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const shortDate = now.toLocaleDateString();
    
    const replacements: Record<string, string> = {
      "Show Name": project.name,
      "show name": project.name,
      "showName": project.name,
      "Date": dateStr,
      "date": dateStr,
      "Short Date": shortDate,
      "shortDate": shortDate,
      "Project Name": project.name,
      "project name": project.name,
      "projectName": project.name,
      "Report Name": reportTypeSlug,
      "report name": reportTypeSlug,
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
    const olStyle = "list-style-type: decimal; list-style-position: inside; padding-left: 0; margin: 0;";
    const ulStyle = "list-style-type: disc; list-style-position: inside; padding-left: 0; margin: 0;";
    const listItemStyle = "margin: 0; padding: 0;";
    const paragraphStyle = "margin: 0; padding: 0;";
    return html
      .replace(/<p><\/p>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<ol[^>]*>/gi, `<div style="padding-left: 20px;"><ol style="${olStyle}">`)
      .replace(/<\/ol>/gi, '</ol></div>')
      .replace(/<ul[^>]*>/gi, `<div style="padding-left: 20px;"><ul style="${ulStyle}">`)
      .replace(/<\/ul>/gi, '</ul></div>')
      .replace(/<li[^>]*>/gi, `<li style="${listItemStyle}">`)
      .replace(/<p[^>]*>/gi, `<p style="${paragraphStyle}">`)
      .replace(/<\/p>/gi, '</p>');
  };

  const generateReportContentHtml = (report: any, template: any): string => {
    if (!template?.sections) return "";
    const content = report.content || {};
    
    let html = `<h3 style="margin: 12px 0 4px 0; font-size: 16px; color: #333; border-bottom: 2px solid #333; padding-bottom: 4px;">${report.title} — ${new Date(report.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>`;
    
    for (const section of template.sections) {
      html += `<h4 style="margin: 10px 0 4px 0; font-size: 14px; color: #555;">${section.title}</h4>`;
      
      if (section.fields?.length > 0) {
        for (const field of section.fields) {
          const fieldContent = content[field.label] || field.defaultValue || "";
          const fieldHtml = typeof fieldContent === 'string' ? fieldContent : '';
          const plainContent = stripHtml(fieldHtml);
          
          if (plainContent.trim()) {
            html += `<div style="margin: 0 0 4px 0;">`;
            if (!field.hideLabel) {
              html += `<strong style="display: block; margin: 0;">${field.label}</strong>`;
            }
            html += `<div style="margin: 0;">${normalizeListHtml(fieldHtml)}</div>`;
            html += `</div>`;
          }
        }
      }
    }
    
    return html;
  };

  const generateCombinedEmailHtml = (): string => {
    let html = '<div style="font-family: Arial, sans-serif; font-size: 14px; max-width: 800px;">';
    
    for (const report of sortedSelectedReports) {
      const template = templates.find((t: any) => t.id === report.templateId);
      html += generateReportContentHtml(report, template);
      html += '<hr style="margin: 16px 0; border: none; border-top: 1px solid #ddd;">';
    }
    
    html += '</div>';
    return html;
  };

  useEffect(() => {
    if (step !== 'compose' || !editor || !distroDataReady) return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const reportContentHtml = generateCombinedEmailHtml();
    const reportCount = sortedSelectedReports.length;
    const defaultSubject = `${project.name} — ${reportCount} Report${reportCount !== 1 ? 's' : ''} — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`;

    if (assignedDistros.length > 0) {
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
      const subjectText = firstDistro.subjectTemplate 
        ? replaceTemplateVariables(firstDistro.subjectTemplate)
        : defaultSubject;
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
      editor.commands.setContent(reportContentHtml);
    }
  }, [step, editor, distroDataReady]);

  type TextSegment = { text: string; indent: number; isListItem: boolean };
  const parseHtmlWithLists = (html: string): TextSegment[] => {
    if (!html) return [];
    const segments: TextSegment[] = [];
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const processNode = (node: Node, listCounter: number[] = [], listType: string[] = []) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          segments.push({ text, indent: listCounter.length, isListItem: false });
        }
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'ol') {
          listCounter.push(0);
          listType.push('ol');
          el.childNodes.forEach(child => processNode(child, listCounter, listType));
          listCounter.pop();
          listType.pop();
        } else if (tagName === 'ul') {
          listCounter.push(0);
          listType.push('ul');
          el.childNodes.forEach(child => processNode(child, listCounter, listType));
          listCounter.pop();
          listType.pop();
        } else if (tagName === 'li') {
          if (listCounter.length > 0) {
            listCounter[listCounter.length - 1]++;
            const currentType = listType[listType.length - 1];
            const num = listCounter[listCounter.length - 1];
            const prefix = currentType === 'ol' ? `${num}. ` : '• ';
            const text = el.textContent?.trim() || '';
            if (text) {
              segments.push({ text: prefix + text, indent: listCounter.length, isListItem: true });
            }
          }
        } else if (tagName === 'p' || tagName === 'div' || tagName === 'br') {
          const hasListChild = Array.from(el.children).some(
            child => ['ol', 'ul'].includes(child.tagName.toLowerCase())
          );
          if (hasListChild) {
            el.childNodes.forEach(child => processNode(child, listCounter, listType));
          } else if (listCounter.length === 0) {
            const text = el.textContent?.trim();
            if (text) segments.push({ text, indent: 0, isListItem: false });
          }
        } else {
          el.childNodes.forEach(child => processNode(child, listCounter, listType));
        }
      }
    };

    temp.childNodes.forEach(child => processNode(child));
    return segments;
  };

  const generatePdfForReport = async (report: any): Promise<Blob> => {
    const template = templates.find((t: any) => t.id === report.templateId);
    const content = report.content || {};
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
      marginLeft: 0.5,
      marginRight: 0.5,
    };

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = pdfSettings.marginLeft * 72;
    const marginRight = pdfSettings.marginRight * 72;
    const marginTop = pdfSettings.marginTop * 72;
    const marginBottom = pdfSettings.marginBottom * 72;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const { sectionTitleSize, fieldTitleSize, contentSize, lineHeight } = pdfSettings;
    let yPosition = marginTop;
    const centerX = pageWidth / 2;

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

    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    if (project.name) {
      const projectLines = wrapText(project.name, contentWidth, 24);
      projectLines.forEach((line: string) => {
        checkNewPage(24 * 0.8);
        pdf.text(line, centerX, yPosition, { align: 'center' });
        yPosition += 24 * 0.8;
      });
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    const reportTitle = (report.title || 'Report').toUpperCase();
    const titleLines = wrapText(reportTitle, contentWidth, 16);
    titleLines.forEach((line: string) => {
      checkNewPage(16 * 1.2);
      pdf.text(line, centerX, yPosition, { align: 'center' });
      yPosition += 16 * 1.2;
    });

    pdf.setFontSize(14);
    const dateStr = new Date(report.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    pdf.text(dateStr, centerX, yPosition, { align: "center" });
    yPosition += 14 * 1.2 + 8;
    yPosition += 10;

    if (template?.sections) {
      for (const section of template.sections) {
        checkNewPage(sectionTitleSize * lineHeight + 20);
        pdf.setFontSize(sectionTitleSize);
        pdf.setFont('helvetica', 'bold');
        const sectionTitle = (section.title || '').toUpperCase();
        const sectionLines = wrapText(sectionTitle, contentWidth, sectionTitleSize);
        sectionLines.forEach((line: string) => {
          checkNewPage(sectionTitleSize * 1.0);
          pdf.text(line, marginLeft, yPosition);
          yPosition += sectionTitleSize * 1.0;
        });
        pdf.setLineWidth(1.5);
        pdf.line(marginLeft, yPosition - 4, pageWidth - marginRight, yPosition - 4);
        yPosition += 16;

        if (section.fields?.length > 0) {
          for (const field of section.fields) {
            if (!field.hideLabel) {
              checkNewPage(fieldTitleSize * lineHeight + 10);
              pdf.setFontSize(fieldTitleSize);
              pdf.setFont('helvetica', 'bold');
              const fieldLines = wrapText(field.label || "", contentWidth - 20, fieldTitleSize);
              fieldLines.forEach((line: string) => {
                checkNewPage(fieldTitleSize * lineHeight);
                pdf.text(line, marginLeft + 10, yPosition);
                yPosition += fieldTitleSize * lineHeight;
              });
              yPosition += 2;
            }

            if (field.type === "dailycall") {
              let callData: any = null;
              try {
                const stored = content[field.label];
                callData = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : null;
              } catch { callData = null; }

              if (callData) {
                pdf.setFontSize(contentSize);
                pdf.setFont('helvetica', 'italic');
                const callDate = new Date(callData.date + 'T00:00:00');
                const callDateStr = callDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                pdf.text(`Daily Call — ${callDateStr}`, marginLeft + 20, yPosition);
                yPosition += contentSize * lineHeight + 4;
                pdf.setFont('helvetica', 'normal');

                const locations = Array.isArray(callData.locations) ? callData.locations : [];
                for (const loc of locations) {
                  checkNewPage(contentSize * lineHeight + 8);
                  pdf.setFont('helvetica', 'bold');
                  pdf.text(loc.name || 'Location', marginLeft + 20, yPosition);
                  yPosition += contentSize * lineHeight;
                  pdf.setFont('helvetica', 'normal');
                  if (Array.isArray(loc.events)) {
                    for (const evt of loc.events) {
                      checkNewPage(contentSize * lineHeight);
                      const time = evt.startTime || '';
                      const title = evt.title || '';
                      const cast = evt.cast?.length ? ` (${evt.cast.join(', ')})` : '';
                      pdf.text(`${time}  ${title}${cast}`, marginLeft + 30, yPosition);
                      yPosition += contentSize * lineHeight;
                    }
                  }
                  yPosition += 4;
                }
              }
            } else {
              const fieldContent = content[field.label] || field.defaultValue || "";
              const segments = parseHtmlWithLists(fieldContent);
              if (segments.length > 0) {
                pdf.setFontSize(contentSize);
                pdf.setFont('helvetica', 'normal');
                for (const segment of segments) {
                  const indentOffset = segment.indent * 15;
                  const baseIndent = marginLeft + 20;
                  const segmentLines = wrapText(segment.text, contentWidth - 30 - indentOffset, contentSize);
                  segmentLines.forEach((line: string, lineIndex: number) => {
                    checkNewPage(contentSize * lineHeight);
                    const xPos = baseIndent + indentOffset + (segment.isListItem && lineIndex > 0 ? 15 : 0);
                    pdf.text(line, xPos, yPosition);
                    yPosition += contentSize * lineHeight;
                  });
                }
              }
            }
            yPosition += 8;
          }
        }
        yPosition += 12;
      }
    }

    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Page ${i} of ${totalPages}`, centerX, pageHeight - marginBottom + 20, { align: 'center' });
    }

    return pdf.output("blob");
  };

  const handleSend = async () => {
    if (!emailForm.to.trim()) {
      toast({ title: "Missing recipient", description: "Please enter at least one email address.", variant: "destructive" });
      return;
    }
    if (!emailForm.subject.trim()) {
      toast({ title: "Missing subject", description: "Please enter a subject.", variant: "destructive" });
      return;
    }
    if (sortedSelectedReports.length === 0) {
      toast({ title: "No reports selected", description: "Please select at least one report.", variant: "destructive" });
      return;
    }

    setIsSending(true);

    try {
      const htmlContent = editor?.getHTML() || emailForm.body.replace(/\n/g, "<br>");

      const formData = new FormData();
      formData.append("toAddresses", emailForm.to.trim());
      if (emailForm.cc) formData.append("ccAddresses", emailForm.cc.trim());
      if (emailForm.bcc) formData.append("bccAddresses", emailForm.bcc.trim());
      formData.append("subject", emailForm.subject);
      formData.append("content", stripHtml(htmlContent));
      formData.append("htmlContent", htmlContent);
      formData.append("projectId", projectId.toString());
      formData.append("emailType", "report");

      for (const report of sortedSelectedReports) {
        const pdfBlob = await generatePdfForReport(report);
        const dateStr = new Date(report.date).toLocaleDateString().replace(/\//g, "-");
        const pdfFileName = `${report.title || "Report"}-${dateStr}.pdf`;
        formData.append("attachments", new File([pdfBlob], pdfFileName, { type: "application/pdf" }));
      }

      const response = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      toast({ title: "Success", description: `${sortedSelectedReports.length} report${sortedSelectedReports.length !== 1 ? 's' : ''} sent successfully` });
      handleClose();
    } catch (error: any) {
      console.error("Error sending batch email:", error);
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
    setStep('select');
    setSelectedReportIds([]);
    setEmailForm({ to: '', cc: '', bcc: '', subject: '', body: '' });
    setShowCCField(false);
    setShowBCCField(false);
    hasInitializedRef.current = false;
    if (editor) editor.commands.setContent('');
    onClose();
  };

  const handleNext = () => {
    if (selectedReportIds.length === 0) {
      toast({ title: "No reports selected", description: "Please select at least one report to send.", variant: "destructive" });
      return;
    }
    hasInitializedRef.current = false;
    setStep('compose');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Send Reports</DialogTitle>
              <DialogDescription>
                Select reports to include in the email. Today's reports are pre-selected.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">No reports available</p>
              ) : (
                reports
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(report => {
                    const isSelected = selectedReportIds.includes(report.id);
                    const reportDate = new Date(report.date);
                    const isToday = reportDate.toISOString().split('T')[0] === todayStr;
                    return (
                      <div
                        key={report.id}
                        className={`flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'}`}
                        onClick={() => {
                          setSelectedReportIds(prev =>
                            prev.includes(report.id)
                              ? prev.filter(id => id !== report.id)
                              : [...prev, report.id]
                          );
                        }}
                      >
                        <Checkbox checked={isSelected} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{report.title}</span>
                            {isToday && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Today</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {reportDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <DialogFooter>
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleNext} disabled={selectedReportIds.length === 0}>
                  <Send className="h-4 w-4 mr-2" />
                  Continue with {selectedReportIds.length} report{selectedReportIds.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Compose Email</DialogTitle>
              <DialogDescription>
                Sending {sortedSelectedReports.length} report{sortedSelectedReports.length !== 1 ? 's' : ''} with individual PDF attachments
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="batch-email-to">To *</Label>
                <Input
                  id="batch-email-to"
                  placeholder="recipient@example.com"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex gap-6">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium" onClick={() => setShowCCField(!showCCField)} type="button">
                    {showCCField ? '▼' : '▶'} CC
                  </button>
                  {!showCCField && (
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium" onClick={() => setShowBCCField(!showBCCField)} type="button">
                      {showBCCField ? '▼' : '▶'} BCC
                    </button>
                  )}
                </div>
                {showCCField && (
                  <>
                    <Input placeholder="cc@example.com" value={emailForm.cc} onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })} />
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium" onClick={() => setShowBCCField(!showBCCField)} type="button">
                      {showBCCField ? '▼' : '▶'} BCC
                    </button>
                  </>
                )}
                {showBCCField && (
                  <Input placeholder="bcc@example.com" value={emailForm.bcc} onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })} />
                )}
              </div>

              <div>
                <Label htmlFor="batch-email-subject">Subject *</Label>
                <Input
                  id="batch-email-subject"
                  placeholder="Email subject"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                />
              </div>

              <div>
                <Label>Message & Report Content</Label>
                <div className="flex items-center gap-1 mb-1 border rounded-t-md p-1 bg-muted/30">
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editor?.chain().focus().toggleBold().run()} data-active={editor?.isActive('bold')}>
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editor?.chain().focus().toggleItalic().run()} data-active={editor?.isActive('italic')}>
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editor?.chain().focus().toggleUnderline().run()} data-active={editor?.isActive('underline')}>
                    <UnderlineIcon className="h-3.5 w-3.5" />
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editor?.chain().focus().toggleBulletList().run()} data-active={editor?.isActive('bulletList')}>
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editor?.chain().focus().toggleOrderedList().run()} data-active={editor?.isActive('orderedList')}>
                    <ListOrdered className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="border border-t-0 rounded-b-md">
                  <EditorContent editor={editor} />
                </div>
              </div>

              <div className="bg-muted/30 rounded-md p-3">
                <p className="text-sm font-medium mb-1">PDF Attachments ({sortedSelectedReports.length})</p>
                <div className="space-y-1">
                  {sortedSelectedReports.map(report => (
                    <div key={report.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{report.title} — {new Date(report.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={() => { setStep('select'); hasInitializedRef.current = false; }}>
                  Back
                </Button>
                <Button onClick={handleSend} disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
