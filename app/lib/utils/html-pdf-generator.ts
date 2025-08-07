import { chromium } from 'playwright';
import { ApplicantData } from '../data/data-loader';
import { generateResumeHTML } from '../generation/resume-html-generator';

export async function generateResumePDF(data: ApplicantData, jobDescription: string): Promise<Buffer> {
  const pdfStartTime = Date.now();
  console.log('🖨️  PDF GENERATION: Starting browser launch...');
  
  const browser = await chromium.launch({
    headless: true
  });
  
  console.log('🖨️  PDF GENERATION: Browser launched in', Date.now() - pdfStartTime, 'ms');

  try {
    const pageStartTime = Date.now();
    const page = await browser.newPage();
    console.log('🖨️  PDF GENERATION: New page created in', Date.now() - pageStartTime, 'ms');
    
    const htmlStartTime = Date.now();
    // Generate HTML content using shared utility
    const htmlContent = generateResumeHTML(data, jobDescription);
    console.log('🖨️  PDF GENERATION: HTML generated in', Date.now() - htmlStartTime, 'ms');
    
    // Create full HTML document with Tailwind CSS
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Resume</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 0;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            @media print {
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    const contentStartTime = Date.now();
    await page.setContent(fullHtml);
    console.log('🖨️  PDF GENERATION: Content set in', Date.now() - contentStartTime, 'ms');
    
    const loadStartTime = Date.now();
    await page.waitForLoadState('networkidle');
    console.log('🖨️  PDF GENERATION: Page loaded in', Date.now() - loadStartTime, 'ms');

    // Generate PDF with proper settings
    const pdfGenerationStartTime = Date.now();
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    });
    console.log('🖨️  PDF GENERATION: PDF created in', Date.now() - pdfGenerationStartTime, 'ms');

    const bufferStartTime = Date.now();
    const result = Buffer.from(pdfBuffer);
    console.log('🖨️  PDF GENERATION: Buffer conversion in', Date.now() - bufferStartTime, 'ms');
    console.log('🖨️  PDF GENERATION: TOTAL PDF process took', Date.now() - pdfStartTime, 'ms');
    
    return result;
  } finally {
    const closeStartTime = Date.now();
    await browser.close();
    console.log('🖨️  PDF GENERATION: Browser closed in', Date.now() - closeStartTime, 'ms');
  }
}