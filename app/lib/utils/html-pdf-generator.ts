import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { ApplicantData } from '../data/data-loader';
import { generateResumeHTML } from '../generation/resume-html-generator';

export async function generateResumePDF(data: ApplicantData, jobDescription: string): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  } catch (error) {
    console.error('Failed to launch browser for PDF generation:', error);
    
    // Try to install Chrome if it's not found
    if (error instanceof Error && error.message.includes('Could not find Chrome')) {
      console.log('Attempting to install Chrome...');
      try {
        execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
        
        // Try launching again after installation
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
      } catch (installError) {
        console.error('Failed to install Chrome:', installError);
        throw new Error('PDF generation service is temporarily unavailable. Please try again later.');
      }
    } else {
      throw new Error('PDF generation service is temporarily unavailable. Please try again later.');
    }
  }

  try {
    const page = await browser.newPage();
    
    // Generate HTML content using shared utility
    const htmlContent = generateResumeHTML(data, jobDescription);
    
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

    await page.setContent(fullHtml, { 
      waitUntil: 'networkidle0' 
    });

    // Generate PDF with proper settings
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

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}