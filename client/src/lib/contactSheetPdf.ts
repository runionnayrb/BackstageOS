import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  notes?: string;
  category?: string;
  groupId?: number;
}

interface ContactGroup {
  id: number;
  name: string;
  sortOrder: number;
}

const formatPhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

export async function generateContactSheetPDF(
  contacts: Contact[],
  contactGroups: ContactGroup[],
  projectName: string
): Promise<void> {
  // PDF dimensions: 8.5x11 inches with 0.5" margins
  const pageWidth = 8.5;
  const pageHeight = 11;
  const marginInches = 0.5;
  const marginPts = marginInches * 72; // Convert inches to points
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  const usableWidth = pageWidth - marginInches * 2;
  const usableHeight = pageHeight - marginInches * 2;
  const footerHeight = 0.3;
  const contentHeight = usableHeight - footerHeight;

  let currentPage = 1;
  let yPosition = marginInches;
  const lineHeight = 0.2;
  const fontSize = 10;

  // Sort groups by sort order
  const sortedGroups = [...contactGroups].sort((a, b) => a.sortOrder - b.sortOrder);

  const addFooter = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);

    // Left: Published date
    pdf.text(`Published: ${formattedDate}`, marginInches, pageHeight - marginInches + 0.15);

    // Right: Page X of X (we'll update this at the end)
    const pageText = `Page ${currentPage} of [TOTAL]`;
    const textWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - marginInches - textWidth, pageHeight - marginInches + 0.15);
  };

  // Process each group
  for (const group of sortedGroups) {
    const groupContacts = contacts.filter(c => c.groupId === group.id);
    
    if (groupContacts.length === 0) continue;

    // Check if we need a new page for the group heading
    if (yPosition + lineHeight * 2 > marginInches + contentHeight) {
      addFooter();
      pdf.addPage();
      currentPage++;
      yPosition = marginInches;
    }

    // Group heading
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(group.name, marginInches, yPosition);
    yPosition += lineHeight * 2;

    // Table header
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(fontSize);
    
    const colWidths = {
      name: usableWidth * 0.25,
      role: usableWidth * 0.2,
      email: usableWidth * 0.3,
      phone: usableWidth * 0.25
    };

    const startX = marginInches;
    pdf.text('Name', startX, yPosition);
    pdf.text('Position', startX + colWidths.name, yPosition);
    pdf.text('Email', startX + colWidths.name + colWidths.role, yPosition);
    pdf.text('Phone', startX + colWidths.name + colWidths.role + colWidths.email, yPosition);
    
    yPosition += lineHeight;
    
    // Underline header
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.line(marginInches, yPosition, pageWidth - marginInches, yPosition);
    yPosition += lineHeight;

    // Contact rows
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(fontSize - 1);

    for (const contact of groupContacts) {
      const rowHeight = lineHeight;
      
      // Check if we need a new page
      if (yPosition + rowHeight > marginInches + contentHeight) {
        addFooter();
        pdf.addPage();
        currentPage++;
        yPosition = marginInches;

        // Re-add header on new page
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(fontSize);
        pdf.text('Name', startX, yPosition);
        pdf.text('Position', startX + colWidths.name, yPosition);
        pdf.text('Email', startX + colWidths.name + colWidths.role, yPosition);
        pdf.text('Phone', startX + colWidths.name + colWidths.role + colWidths.email, yPosition);
        
        yPosition += lineHeight;
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.5);
        pdf.line(marginInches, yPosition, pageWidth - marginInches, yPosition);
        yPosition += lineHeight;

        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(fontSize - 1);
      }

      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
      const role = contact.role || '';
      const email = contact.email || '';
      const phone = formatPhoneNumber(contact.phone);

      // Text wrapping for long content
      const wrapText = (text: string, maxWidth: number): string[] => {
        if (!text) return [''];
        const lines: string[] = [];
        let currentLine = '';
        
        for (let i = 0; i < text.length; i++) {
          const testLine = currentLine + text[i];
          const width = pdf.getTextWidth(testLine);
          
          if (width > maxWidth) {
            lines.push(currentLine);
            currentLine = text[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
        return lines;
      };

      pdf.text(fullName, startX, yPosition);
      pdf.text(role, startX + colWidths.name, yPosition);
      pdf.text(email, startX + colWidths.name + colWidths.role, yPosition);
      pdf.text(phone, startX + colWidths.name + colWidths.role + colWidths.email, yPosition);

      yPosition += rowHeight;
    }

    yPosition += lineHeight; // Space between groups
  }

  // Add footer to last page
  addFooter();

  // Fix page numbers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8);
    
    const pageText = `Page ${i} of ${pageCount}`;
    const textWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - marginInches - textWidth, pageHeight - marginInches + 0.15);
  }

  // Download the PDF
  const filename = `${projectName}-contact-sheet-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
