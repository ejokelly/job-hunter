export interface JobDetails {
  title: string;
  company: string;
}

export function sanitizeFilename(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

export function generatePDFFilename(
  type: 'resume' | 'cover-letter',
  jobDetails: JobDetails
): string {
  const sanitizedTitle = sanitizeFilename(jobDetails.title);
  const sanitizedCompany = sanitizeFilename(jobDetails.company);
  
  return `ej-okelly-${sanitizedTitle}-${sanitizedCompany}-${type}.pdf`;
}