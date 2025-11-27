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
  photo?: string;
}

export async function generateFacesheetPDF(
  contacts: Contact[],
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
  const maxContentY = footerY - 0.25;

  let currentPage = 1;
  let contactIndex = 0;
  const contactsPerPage = 30;
  const colsPerRow = 6;
  const rowsPerPage = 5;

  // Function to add page header
  const addPageHeader = () => {
    pdf.setFont('Helvetica', 'bold');
    const centerX = pageWidth / 2;
    
    // Show name - 20pt
    pdf.setFontSize(20);
    pdf.text(projectName, centerX, marginInches + 0.3, { align: 'center' });
    
    // Company Face Sheet - 18pt
    pdf.setFontSize(18);
    pdf.text('Company Face Sheet', centerX, marginInches + 0.52, { align: 'center' });
    
    return marginInches + 0.92;
  };

  // Function to add footer
  const addFooter = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(11);
    
    // Left: Published date
    pdf.text(`Published: ${formattedDate}`, marginInches, footerY);
    
    // Right: Page X of Y (will be fixed at the end)
    const pageText = `Page ${currentPage} of [TOTAL]`;
    const textWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - marginInches - textWidth, footerY);
  };

  // Calculate layout
  const colWidth = usableWidth / colsPerRow;
  const rowHeight = (maxContentY - addPageHeader()) / rowsPerPage;
  const photoSize = colWidth * 0.75; // Square photos: 1:1 aspect ratio, leaving room for name and position

  let yPosition = addPageHeader();
  let currentRow = 0;
  let currentCol = 0;

  // Process contacts
  while (contactIndex < contacts.length) {
    const contact = contacts[contactIndex];

    // Check if we need a new page
    if (contactIndex > 0 && contactIndex % contactsPerPage === 0) {
      addFooter();
      pdf.addPage();
      currentPage++;
      yPosition = addPageHeader();
      currentRow = 0;
      currentCol = 0;
    }

    // Calculate position
    const xPos = marginInches + currentCol * colWidth + (colWidth - photoSize) / 2;
    const yPos = yPosition + currentRow * rowHeight;

    // Add placeholder for photo (light gray rectangle)
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.01);
    pdf.rect(xPos, yPos, photoSize, photoSize);

    // If contact has photo, draw it
    if (contact.photo) {
      try {
        pdf.addImage(
          contact.photo,
          'JPEG',
          xPos,
          yPos,
          photoSize,
          photoSize
        );
      } catch (error) {
        // Photo couldn't be loaded, placeholder remains
      }
    }

    // Add contact name below photo (bold)
    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(9);
    
    const nameY = yPos + photoSize + 0.03;
    pdf.text(fullName, xPos + photoSize / 2, nameY, { 
      align: 'center',
      maxWidth: photoSize
    });

    // Add position below name
    if (contact.position) {
      pdf.setFont('Helvetica', 'normal');
      pdf.setFontSize(8);
      const positionY = nameY + 0.12;
      pdf.text(contact.position, xPos + photoSize / 2, positionY, { 
        align: 'center',
        maxWidth: photoSize
      });
    }

    // Move to next position
    currentCol++;
    if (currentCol >= colsPerRow) {
      currentCol = 0;
      currentRow++;
    }

    contactIndex++;
  }

  // Add footer to last page
  addFooter();

  // Fix page numbers
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
    pdf.setFontSize(11);
    
    pdf.text(`Published: ${formattedDate}`, marginInches, footerY);
    
    const pageText = `Page ${i} of ${pageCount}`;
    const textWidth = pdf.getTextWidth(pageText);
    pdf.text(pageText, pageWidth - marginInches - textWidth, footerY);
  }

  // Download the PDF
  const downloadDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const filename = `${projectName} Company Face Sheet - ${downloadDate}.pdf`;
  pdf.save(filename);
}
