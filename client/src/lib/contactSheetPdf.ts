import jsPDF from 'jspdf';

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
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  const usableWidth = pageWidth - marginInches * 2;
  const footerY = pageHeight - marginInches + 0.1;
  const maxContentY = footerY - 0.25; // Leave space for footer

  let currentPage = 1;
  let yPosition = marginInches;
  const lineHeight = 0.2;

  // Sort groups by sort order
  const sortedGroups = [...contactGroups].sort((a, b) => a.sortOrder - b.sortOrder);

  // Process each group
  for (const group of sortedGroups) {
    const groupContacts = contacts.filter(c => c.groupId === group.id);
    
    if (groupContacts.length === 0) continue;

    // Check if we need a new page for the group heading
    if (yPosition + lineHeight * 2.5 > maxContentY) {
      pdf.addPage();
      currentPage++;
      yPosition = marginInches;
    }

    // Group heading - 15pt
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text(group.name, marginInches, yPosition);
    yPosition += lineHeight * 2;

    // Table header - 12pt
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    
    const colWidths = {
      name: 1.5,
      role: 2.0,
      email: 2.5,
      phone: 1.5
    };

    const startX = marginInches;
    const headerY = yPosition;
    
    pdf.text('Name', startX, headerY);
    pdf.text('Position', startX + colWidths.name, headerY);
    pdf.text('Email', startX + colWidths.name + colWidths.role, headerY);
    pdf.text('Phone', startX + colWidths.name + colWidths.role + colWidths.email, headerY);
    
    yPosition += lineHeight * 1.5;

    // Contact rows - 11pt
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(11);

    for (const contact of groupContacts) {
      const rowHeight = lineHeight;
      
      // Check if we need a new page (account for footer space)
      if (yPosition + rowHeight > maxContentY) {
        pdf.addPage();
        currentPage++;
        yPosition = marginInches;

        // Re-add header on new page
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Name', startX, yPosition);
        pdf.text('Position', startX + colWidths.name, yPosition);
        pdf.text('Email', startX + colWidths.name + colWidths.role, yPosition);
        pdf.text('Phone', startX + colWidths.name + colWidths.role + colWidths.email, yPosition);
        
        yPosition += lineHeight * 1.5;

        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(11);
      }

      const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
      const role = contact.role || '';
      const email = contact.email || '';
      const phone = formatPhoneNumber(contact.phone);

      pdf.text(fullName, startX, yPosition);
      pdf.text(role, startX + colWidths.name, yPosition);
      pdf.text(email, startX + colWidths.name + colWidths.role, yPosition);
      pdf.text(phone, startX + colWidths.name + colWidths.role + colWidths.email, yPosition);

      yPosition += rowHeight;
    }

    yPosition += lineHeight; // Space between groups
  }

  // Add footers to all pages
  const pageCount = pdf.getNumberOfPages();
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7);
    
    // Left: Published date
    pdf.text(`Published: ${formattedDate}`, marginInches, footerY);
    
    // Right: Page X of Y
    const pageText = `Page ${i} of ${pageCount}`;
    const textWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - marginInches - textWidth, footerY);
  }

  // Download the PDF
  const filename = `${projectName}-contact-sheet-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
