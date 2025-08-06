export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid Next.js build issues
    const pdf = (await import('pdf-parse')).default;
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export function cleanResumeText(text: string): string {
  // Remove excessive whitespace and normalize line breaks
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Remove common PDF artifacts
  cleaned = cleaned
    .replace(/\u00A0/g, ' ') // Non-breaking spaces
    .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters except newlines
    .replace(/\s*\|\s*/g, ' ') // Remove table separators
    .replace(/_{3,}/g, '') // Remove underline artifacts
    .replace(/-{3,}/g, '') // Remove dash artifacts
    .trim();

  return cleaned;
}