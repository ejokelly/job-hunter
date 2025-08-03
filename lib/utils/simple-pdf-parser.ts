import PDFParser from 'pdf2json';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('PDF parsing error:', errData);
      reject(new Error('Failed to parse PDF file'));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
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

        const cleanedText = text
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanedText.length < 10) {
          reject(new Error('No readable text found in PDF'));
          return;
        }

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