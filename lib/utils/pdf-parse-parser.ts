export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  console.log('[PDF-PARSE] Starting PDF text extraction, buffer size:', buffer.length);
  
  try {
    // Dynamic import to avoid module loading issues
    const pdfParse = await import('pdf-parse');
    const pdf = pdfParse.default;
    
    const data = await pdf(buffer);
    
    console.log('[PDF-PARSE] PDF parsed successfully');
    console.log('[PDF-PARSE] Pages found:', data.numpages);
    console.log('[PDF-PARSE] Text length:', data.text.length);
    
    if (data.text.length < 10) {
      console.log('[PDF-PARSE] ERROR: No readable text found in PDF');
      throw new Error('No readable text found in PDF');
    }
    
    // Basic cleanup - pdf-parse usually gives cleaner text
    const cleanedText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log('[PDF-PARSE] Text extraction successful, cleaned length:', cleanedText.length);
    console.log('[PDF-PARSE] Text preview (first 200 chars):', cleanedText.substring(0, 200));
    
    return cleanedText;
  } catch (error) {
    console.error('[PDF-PARSE] PDF parsing failed:', error);
    throw new Error('Failed to extract text from PDF using pdf-parse');
  }
}