import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';

export interface DailyCallPdfOptions {
  projectName: string;
  selectedDate: string;
  elementId?: string;
}

export async function generateDailyCallPdfBlob(options: DailyCallPdfOptions): Promise<Blob> {
  const { projectName, selectedDate, elementId = 'daily-call-content' } = options;
  
  const html2canvas = (await import('html2canvas')).default;
  
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Daily call content not found');
  }
  
  let itemMetrics: Array<{ name: string; top: number; height: number; bottom: number }> = [];
  
  const pdf = new jsPDF('p', 'mm', 'letter');
  pdf.internal.scaleFactor = 2.83;
  
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        clonedElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        (clonedElement.style as any).webkitFontSmoothing = 'antialiased';
        (clonedElement.style as any).mozOsxFontSmoothing = 'grayscale';
        clonedElement.style.textRendering = 'optimizeLegibility';
        
        clonedElement.style.border = 'none';
        clonedElement.style.boxShadow = 'none';
        clonedElement.style.borderRadius = '0';
        clonedElement.style.padding = '0';
        clonedElement.style.margin = '0';
        
        const appFooter = clonedElement.querySelector('.mt-8.pt-6.border-t.border-gray-200.text-center');
        if (appFooter) {
          (appFooter as HTMLElement).style.display = 'none';
        }
        
        const endOfDayRows = clonedElement.querySelectorAll('[data-end-of-day-row="true"]');
        endOfDayRows.forEach(el => {
          (el as HTMLElement).style.backgroundColor = 'transparent';
          (el as HTMLElement).style.background = 'none';
        });
        
        const clonedItems = clonedElement.querySelectorAll('[data-pdf-item]');
        const clonedContainerRect = clonedElement.getBoundingClientRect();
        
        clonedItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const relativeTop = rect.top - clonedContainerRect.top;
          itemMetrics.push({
            name: item.getAttribute('data-pdf-item') || 'event',
            top: relativeTop,
            height: rect.height,
            bottom: relativeTop + rect.height
          });
        });
      }
    }
  });
  
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const marginMm = 12.7;
  const contentWidth = pageWidth - (marginMm * 2);
  const footerHeight = 10;
  const contentHeight = pageHeight - (marginMm * 2) - footerHeight;
  
  const html2canvasScale = 3;
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const scale = html2canvasScale;
  
  const cssPixelsPerMm = canvas.width / (imgWidth * html2canvasScale);
  const contentHeightPx = contentHeight * cssPixelsPerMm * html2canvasScale;
  
  const pageBreaks: Array<{ startPx: number; endPx: number }> = [];
  let currentPageStart = 0;
  
  const itemBoundaries: Array<{ topPx: number; bottomPx: number; name: string }> = [];
  
  itemMetrics.forEach(item => {
    itemBoundaries.push({
      topPx: Math.floor(item.top * scale),
      bottomPx: Math.ceil(item.bottom * scale),
      name: item.name
    });
  });
  
  itemBoundaries.sort((a, b) => a.topPx - b.topPx);
  
  while (currentPageStart < canvas.height) {
    const idealPageEnd = currentPageStart + contentHeightPx;
    
    if (idealPageEnd >= canvas.height) {
      pageBreaks.push({ 
        startPx: Math.floor(currentPageStart), 
        endPx: Math.ceil(canvas.height) 
      });
      break;
    }
    
    let actualPageEnd = Math.floor(idealPageEnd);
    
    for (const item of itemBoundaries) {
      if (item.bottomPx <= currentPageStart) continue;
      if (item.topPx >= idealPageEnd) continue;
      
      const buffer = 20;
      const effectivePageEnd = idealPageEnd - buffer;
      
      if (item.topPx < effectivePageEnd && item.bottomPx > effectivePageEnd) {
        let breakPoint = item.topPx;
        
        const headerAbove = itemBoundaries.find(h => 
          h.name.includes('-header') && 
          h.bottomPx <= item.topPx && 
          h.bottomPx > item.topPx - 200
        );
        if (headerAbove) {
          breakPoint = headerAbove.topPx;
        }
        
        const contentBeforeItem = breakPoint - currentPageStart;
        if (contentBeforeItem > 50) {
          actualPageEnd = breakPoint;
          break;
        }
      }
      else if (item.bottomPx > effectivePageEnd && item.bottomPx <= idealPageEnd) {
        let breakPoint = item.topPx;
        
        const headerAbove = itemBoundaries.find(h => 
          h.name.includes('-header') && 
          h.bottomPx <= item.topPx && 
          h.bottomPx > item.topPx - 200
        );
        if (headerAbove) {
          breakPoint = headerAbove.topPx;
        }
        
        const contentBeforeItem = breakPoint - currentPageStart;
        if (contentBeforeItem > 50) {
          actualPageEnd = breakPoint;
          break;
        }
      }
    }
    
    if (actualPageEnd <= currentPageStart) {
      actualPageEnd = Math.floor(currentPageStart + contentHeightPx);
    }
    
    pageBreaks.push({ 
      startPx: Math.floor(currentPageStart), 
      endPx: actualPageEnd 
    });
    currentPageStart = actualPageEnd;
  }
  
  const totalPages = pageBreaks.length;
  
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) {
      pdf.addPage();
    }
    
    const pageBreak = pageBreaks[pageNum - 1];
    const sourceY = pageBreak.startPx;
    const sourceHeight = pageBreak.endPx - pageBreak.startPx;
    
    const sliceHeightMm = (sourceHeight / canvas.width) * imgWidth;
    
    const sliceCanvas = document.createElement('canvas');
    const sliceCtx = sliceCanvas.getContext('2d');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sourceHeight;
    
    sliceCtx?.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
    
    const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
    
    pdf.addImage(sliceImgData, 'PNG', marginMm, marginMm, imgWidth, sliceHeightMm, '', 'FAST');
    
    const footerStartY = pageHeight - marginMm - footerHeight + 2;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    const subjectText = 'SUBJECT TO CHANGE';
    const subjectTextWidth = pdf.getTextWidth(subjectText);
    pdf.text(subjectText, (pageWidth - subjectTextWidth) / 2, footerStartY);
    
    pdf.setFont('helvetica', 'normal');
    const pageText = `Page ${pageNum} of ${totalPages}`;
    const pageTextWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, (pageWidth - pageTextWidth) / 2, footerStartY + 4);
  }
  
  return pdf.output('blob');
}

export function getDailyCallFilename(projectName: string, selectedDate: string): string {
  const formattedDate = format(parseISO(selectedDate), 'yyyy-MM-dd');
  return `${formattedDate}-${projectName}-Daily Call.pdf`;
}
