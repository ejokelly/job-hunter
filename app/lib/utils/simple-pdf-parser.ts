// Primary parser using pdfjs-dist
async function primaryPDFParse(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    console.log('[PDF-PARSER] Using primary pdfjs-dist library');
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log('[PDF-PARSER] PDF loaded, pages:', pdf.numPages);
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Extract text items and preserve proper spacing
      let pageText = '';
      let lastY = null;
      let lastX = null;
      
      for (const item of textContent.items) {
        if ('str' in item) {
          const currentY = item.transform[5];
          const currentX = item.transform[4];
          
          // Add line break if we're on a new line (significant Y change)
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n';
          }
          // Add space if we're on the same line but there's a gap (significant X change)
          else if (lastX !== null && lastY !== null && 
                   Math.abs(currentY - lastY) < 5 && 
                   currentX - lastX > 10) {
            pageText += ' ';
          }
          
          pageText += item.str;
          
          lastY = currentY;
          lastX = currentX + item.width;
        }
      }
      
      fullText += pageText + '\n';
    }
    
    console.log('[PDF-PARSER] Primary extraction successful, length:', fullText.length);
    return fullText.trim();
  } catch (error) {
    console.error('[PDF-PARSER] pdfjs-dist failed:', error);
    throw error;
  }
}

// Fallback parser using pdf-parse
async function fallbackPDFParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    console.log('[PDF-PARSER] Using fallback pdf-parse library');
    const data = await pdfParse.default(buffer);
    console.log('[PDF-PARSER] Fallback extraction successful, length:', data.text.length);
    return data.text.trim();
  } catch (error) {
    console.error('[PDF-PARSER] Fallback parser also failed:', error);
    throw new Error('All PDF parsers failed');
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  console.log('[PDF-PARSER] Starting PDF text extraction, buffer size:', buffer.length);
  
  // First try pdfjs-dist (primary parser)
  try {
    return await primaryPDFParse(buffer);
  } catch (primaryError) {
    console.log('[PDF-PARSER] Primary parser failed, trying fallback');
    
    // Fallback to pdf-parse
    try {
      return await fallbackPDFParse(buffer);
    } catch (fallbackError) {
      console.error('[PDF-PARSER] All parsers failed');
      throw new Error('Failed to extract text from PDF');
    }
  }
}