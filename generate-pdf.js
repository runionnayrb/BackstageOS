import puppeteer from 'puppeteer';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';

async function generatePDF() {
  try {
    // Read the markdown file
    const markdownContent = fs.readFileSync('BackstageOS-Features-List.md', 'utf8');
    
    // Convert markdown to HTML
    const htmlContent = marked.parse(markdownContent);
    
    // Create full HTML document with styling
    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>BackstageOS Features List</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
            }
            h1 {
                color: #1a365d;
                border-bottom: 3px solid #3182ce;
                padding-bottom: 10px;
                font-size: 2.5em;
            }
            h2 {
                color: #2d3748;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 8px;
                margin-top: 2em;
                font-size: 1.8em;
            }
            h3 {
                color: #4a5568;
                margin-top: 1.5em;
                font-size: 1.3em;
            }
            h4 {
                color: #718096;
                margin-top: 1.2em;
            }
            p {
                margin-bottom: 1em;
            }
            ul, ol {
                margin-bottom: 1em;
                padding-left: 1.5em;
            }
            li {
                margin-bottom: 0.5em;
            }
            strong {
                color: #2d3748;
                font-weight: 600;
            }
            code {
                background-color: #f7fafc;
                padding: 2px 4px;
                border-radius: 3px;
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 0.9em;
            }
            hr {
                border: none;
                border-top: 2px solid #e2e8f0;
                margin: 2em 0;
            }
            .header-info {
                font-style: italic;
                color: #718096;
                margin-bottom: 2em;
            }
            @media print {
                body {
                    padding: 20px;
                }
                h1, h2, h3 {
                    page-break-after: avoid;
                }
            }
        </style>
    </head>
    <body>
        ${htmlContent}
    </body>
    </html>
    `;
    
    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set content and generate PDF
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      }
    });
    
    // Save PDF
    fs.writeFileSync('BackstageOS-Features-List.pdf', pdf);
    
    await browser.close();
    
    console.log('✅ PDF generated successfully: BackstageOS-Features-List.pdf');
    
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
  }
}

generatePDF();