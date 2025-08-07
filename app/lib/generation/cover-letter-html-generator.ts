import { chromium } from 'playwright-core';
import chromiumExecutable from '@sparticuz/chromium';

interface CoverLetterData {
  personalInfo: {
    name: string;
    phone: string;
    email: string;
    location: string;
  };
  jobDetails: {
    title: string;
    company: string;
  };
  content: {
    opening: string;
    body: string;
    closing: string;
  };
}

function generateCoverLetterHTML(data: CoverLetterData): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <div class="max-w-4xl mx-auto bg-white text-black font-sans text-sm leading-relaxed">
      <div class="p-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-xl font-bold mb-2">${data.personalInfo.name}</h1>
          <div class="text-sm text-gray-700 space-y-1">
            <div>${data.personalInfo.phone}</div>
            <div>${data.personalInfo.email}</div>
            <div>${data.personalInfo.location}</div>
          </div>
        </div>

        <!-- Date -->
        <div class="mb-6 text-sm">
          ${currentDate}
        </div>

        <!-- Company Address -->
        <div class="mb-6 text-sm">
          <div>Hiring Manager</div>
          <div>${data.jobDetails.company}</div>
        </div>

        <!-- Greeting -->
        <div class="mb-6 text-sm">
          Dear Hiring Manager,
        </div>

        <!-- Opening Paragraph -->
        <div class="mb-6 text-sm text-justify leading-relaxed">
          ${data.content.opening}
        </div>

        <!-- Body Paragraph -->
        <div class="mb-6 text-sm text-justify leading-relaxed">
          ${data.content.body}
        </div>

        <!-- Closing Paragraph -->
        <div class="mb-6 text-sm text-justify leading-relaxed">
          ${data.content.closing}
        </div>

        <!-- Sign off -->
        <div class="mt-8">
          <div class="mb-4 text-sm">Sincerely,</div>
          <div class="text-sm font-semibold">${data.personalInfo.name}</div>
        </div>
      </div>
    </div>
  `;
}

export async function generateCoverLetterPDF(data: CoverLetterData): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
    executablePath: await chromiumExecutable.executablePath(),
    args: chromiumExecutable.args
  });

  try {
    const page = await browser.newPage();
    
    // Generate HTML content
    const htmlContent = generateCoverLetterHTML(data);
    
    // Create full HTML document with Tailwind CSS
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cover Letter</title>
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
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    await page.setContent(fullHtml);
    await page.waitForLoadState('networkidle');

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

export { generateCoverLetterHTML };