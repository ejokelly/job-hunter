import PDFParser from 'pdf2json';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  console.log('[PDF-PARSER] Starting PDF text extraction, buffer size:', buffer.length);
  
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('[PDF-PARSER] PDF parsing error:', errData);
      reject(new Error('Failed to parse PDF file'));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      console.log('[PDF-PARSER] PDF data ready, pages found:', pdfData.Pages?.length || 0);
      try {
        let text = '';
        
        // Extract text from all pages
        if (pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const textItem of page.Texts) {
                if (textItem.R) {
                  for (const run of textItem.R) {
                    if (run.T) {
                      // Decode URI component to handle special characters
                      const decodedText = decodeURIComponent(run.T);
                      text += decodedText + ' ';
                    }
                  }
                }
              }
              // Add line break between text blocks to maintain structure
              text += '\n';
            }
          }
        }

        console.log('[PDF-PARSER] Raw text extracted, length:', text.length);
        
        const cleanedText = text
          .replace(/\s+/g, ' ')
          .trim();

        console.log('[PDF-PARSER] Text cleaned, final length:', cleanedText.length);

        if (cleanedText.length < 10) {
          console.log('[PDF-PARSER] ERROR: No readable text found in PDF');
          reject(new Error('No readable text found in PDF'));
          return;
        }

        console.log('[PDF-PARSER] Text extraction successful');
        resolve(cleanedText);
      } catch (error) {
        console.error('Error processing PDF data:', error);
        reject(new Error('Failed to extract text from PDF'));
      }
    });

    // Parse the buffer
    pdfParser.parseBuffer(buffer);
  });
}