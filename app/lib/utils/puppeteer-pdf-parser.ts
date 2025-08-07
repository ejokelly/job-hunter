import { chromium } from 'playwright-core';
import chromiumExecutable from '@sparticuz/chromium';

export async function extractTextFromPDFWithPuppeteer(buffer: Buffer): Promise<string> {
  let browser;

  try {
    // Launch Playwright
    browser = await chromium.launch({
      headless: true,
      executablePath: await chromiumExecutable.executablePath(),
      args: chromiumExecutable.args
    });

    const page = await browser.newPage();
    
    // Convert buffer to base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;
    
    // Navigate to the PDF data URL
    await page.goto(dataUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for PDF to load using newer syntax
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract text from the page
    const text = await page.evaluate(() => {
      // Try multiple selectors for PDF content
      const selectors = [
        'body',
        '[data-page-number]',
        '.textLayer',
        'embed',
        'object'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          return element.textContent;
        }
      }

      return document.body.innerText || document.textContent || '';
    });

    if (!text || text.trim().length < 10) {
      throw new Error('No text content found in PDF');
    }

    return text.trim();

  } catch (error) {
    console.error('Playwright PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF using Playwright');
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
    }
  }
}