import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/utils/simple-pdf-parser';
import { parseResumeWithClaude } from '@/lib/ai/resume-parser';
import dbConnect from '@/lib/db/mongodb';
import Resume from '@/lib/db/models/Resume';
import { MongoClient } from 'mongodb';
import * as postmark from 'postmark';
import { randomUUID } from 'crypto';

function cleanResumeText(text: string): string {
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

  // Remove duplicate sentences/phrases (simple deduplication)
  const sentences = cleaned.split(/[.!?]\s+/);
  const uniqueSentences = [...new Set(sentences)];
  cleaned = uniqueSentences.join('. ');

  return cleaned;
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID().substring(0, 8);
  console.log(`[RESUME-DEBUG-${requestId}] === Starting resume upload process ===`);
  
  try {
    console.log(`[RESUME-DEBUG-${requestId}] Step 1: Parsing form data`);
    const formData = await request.formData();
    const file = formData.get('resume') as File;
    
    console.log(`[RESUME-DEBUG-${requestId}] Form data keys:`, Array.from(formData.keys()));

    if (!file) {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: No resume file provided`);
      return NextResponse.json(
        { error: 'No resume file provided' },
        { status: 400 }
      );
    }

    console.log(`[RESUME-DEBUG-${requestId}] File details:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validate file type
    if (file.type !== 'application/pdf') {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: Invalid file type: ${file.type}`);
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: File too large: ${file.size} bytes`);
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 2: File validation passed`);

    console.log(`[RESUME-DEBUG-${requestId}] Step 3: Converting file to buffer`);
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`[RESUME-DEBUG-${requestId}] Buffer created, size: ${buffer.length} bytes`);

    // Try to extract text from PDF - if that fails, use Anthropic to read it directly
    console.log(`[RESUME-DEBUG-${requestId}] Step 4: Extracting text from PDF`);
    let cleanedText = '';
    
    try {
      const rawText = await extractTextFromPDF(buffer);
      console.log(`[RESUME-DEBUG-${requestId}] Raw text extracted successfully, length: ${rawText.length}`);
      console.log(`[RESUME-DEBUG-${requestId}] Raw text preview (first 200 chars):`, rawText.substring(0, 200));
      
      cleanedText = cleanResumeText(rawText);
      console.log(`[RESUME-DEBUG-${requestId}] Text cleaned, final length: ${cleanedText.length}`);
      console.log(`[RESUME-DEBUG-${requestId}] Cleaned text preview (first 200 chars):`, cleanedText.substring(0, 200));
    } catch (pdfError) {
      console.log(`[RESUME-DEBUG-${requestId}] PDF extraction failed:`, pdfError);
      console.log(`[RESUME-DEBUG-${requestId}] Step 4b: Trying Anthropic direct PDF read`);
      // Fallback: use Anthropic to read the PDF directly
      const anthropic = new (await import('@anthropic-ai/sdk')).default({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });
      
      console.log(`[RESUME-DEBUG-${requestId}] Creating Anthropic message for PDF extraction`);
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text content from this PDF resume. Return the raw text exactly as it appears.'
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: buffer.toString('base64')
              }
            }
          ]
        }]
      });

      console.log(`[RESUME-DEBUG-${requestId}] Anthropic response received, content type:`, message.content[0].type);
      
      if (message.content[0].type !== 'text') {
        console.log(`[RESUME-DEBUG-${requestId}] ERROR: Anthropic returned non-text content`);
        throw new Error('Failed to read PDF with Anthropic');
      }
      
      cleanedText = message.content[0].text.trim();
      console.log(`[RESUME-DEBUG-${requestId}] Anthropic extracted text length: ${cleanedText.length}`);
      console.log(`[RESUME-DEBUG-${requestId}] Anthropic text preview (first 200 chars):`, cleanedText.substring(0, 200));
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 5: Validating extracted text`);
    
    // Validate extracted text
    if (cleanedText.length < 100) {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: Text too short: ${cleanedText.length} characters`);
      return NextResponse.json(
        { error: 'Resume appears to be empty or unreadable' },
        { status: 400 }
      );
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 6: Extracting email address`);
    // First, do a quick email extraction to check if user exists
    // Handle cases where PDF extraction might add spaces in email addresses
    const emailMatch = cleanedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    let extractedEmail = emailMatch ? emailMatch[0] : null;
    
    // If no email found, try to find email with spaces (common PDF extraction issue)
    if (!extractedEmail) {
      console.log(`[RESUME-DEBUG-${requestId}] No email found with standard regex, trying space-tolerant extraction`);
      const spaceEmailMatch = cleanedText.match(/([a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (spaceEmailMatch) {
        extractedEmail = spaceEmailMatch[0].replace(/\s+/g, ''); // Remove all spaces
        console.log(`[RESUME-DEBUG-${requestId}] Found email with spaces, cleaned to:`, extractedEmail);
      }
    }
    
    console.log(`[RESUME-DEBUG-${requestId}] Email extraction result:`, extractedEmail);
    
    if (!extractedEmail) {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: No email found in text`);
      return NextResponse.json(
        { error: 'Could not find email address in resume' },
        { status: 400 }
      );
    }

    // Use email override for development if available
    const userEmail = process.env.DEV_EMAIL_OVERRIDE || extractedEmail;
    console.log(`[RESUME-DEBUG-${requestId}] Final user email:`, userEmail, process.env.DEV_EMAIL_OVERRIDE ? '(using override)' : '(from resume)');
    
    console.log(`[RESUME-DEBUG-${requestId}] Step 7: Connecting to database`);
    // Connect to database and check if user already exists BEFORE parsing
    await dbConnect();
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();
    console.log(`[RESUME-DEBUG-${requestId}] Database connected successfully`);
    
    console.log(`[RESUME-DEBUG-${requestId}] Step 8: Checking for existing user`);
    const existingUser = await db.collection('users').findOne({ 
      email: userEmail 
    });
    
    if (existingUser) {
      console.log(`[RESUME-DEBUG-${requestId}] Found existing user:`, {
        id: existingUser._id,
        email: existingUser.email,
        name: existingUser.name
      });
      
      // Check if user is authenticated by looking for session
      const sessionHeader = request.headers.get('Authorization');
      const sessionCookie = request.headers.get('Cookie');
      
      console.log(`[RESUME-DEBUG-${requestId}] Auth check - sessionHeader:`, !!sessionHeader, 'sessionCookie:', !!sessionCookie?.includes('session='));
      
      // If user exists but no valid session, require login
      if (!sessionHeader && !sessionCookie?.includes('session=')) {
        console.log(`[RESUME-DEBUG-${requestId}] ERROR: User exists but not authenticated`);
        await client.close();
        return NextResponse.json(
          { 
            error: 'An account with this email already exists. Please log in first.',
            requiresLogin: true,
            email: userEmail
          },
          { status: 401 }
        );
      }
    } else {
      console.log(`[RESUME-DEBUG-${requestId}] No existing user found for email: ${userEmail}`);
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 9: Parsing resume with Claude`);
    // Now do the full parsing with Claude
    const resumeData = await parseResumeWithClaude(cleanedText);
    console.log(`[RESUME-DEBUG-${requestId}] Claude parsing completed. Resume data keys:`, Object.keys(resumeData));

    console.log(`[RESUME-DEBUG-${requestId}] Step 10: Validating parsed data`);
    console.log(`[RESUME-DEBUG-${requestId}] Personal info:`, resumeData.personalInfo);
    
    // Validate essential fields
    if (!resumeData.personalInfo?.name || !resumeData.personalInfo?.email) {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: Missing essential fields - name: ${!!resumeData.personalInfo?.name}, email: ${!!resumeData.personalInfo?.email}`);
      await client.close();
      return NextResponse.json(
        { error: 'Could not extract essential information (name/email) from resume' },
        { status: 400 }
      );
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 11: Managing user account`);
    let userId;
    
    if (existingUser) {
      userId = existingUser._id.toString();
      console.log(`[RESUME-DEBUG-${requestId}] Using existing user ID: ${userId}`);
    } else {
      // Create new user
      console.log(`[RESUME-DEBUG-${requestId}] Creating new user with email: ${userEmail}`);
      const newUser = {
        email: userEmail,
        name: resumeData.personalInfo.name,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log(`[RESUME-DEBUG-${requestId}] User data to insert:`, newUser);
      const userResult = await db.collection('users').insertOne(newUser);
      console.log(`[RESUME-DEBUG-${requestId}] User creation result:`, {
        insertedId: userResult.insertedId,
        acknowledged: userResult.acknowledged
      });
      userId = userResult.insertedId.toString();
      console.log(`[RESUME-DEBUG-${requestId}] New user ID: ${userId}`);
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 12: Managing resume record`);
    // Check if user already has a resume - if so, update it instead of creating new
    const { ObjectId } = await import('mongodb');
    const userObjectId = new ObjectId(userId);
    console.log(`[RESUME-DEBUG-${requestId}] Checking for existing resume for user: ${userId}`);
    
    const existingResume = await Resume.findOne({ userId: userObjectId });
    
    let resume;
    if (existingResume) {
      console.log(`[RESUME-DEBUG-${requestId}] Updating existing resume: ${existingResume._id}`);
      // Update existing resume
      await Resume.findByIdAndUpdate(existingResume._id, resumeData, { new: true });
      resume = { _id: existingResume._id };
      console.log(`[RESUME-DEBUG-${requestId}] Resume updated successfully`);
    } else {
      console.log(`[RESUME-DEBUG-${requestId}] Creating new resume record`);
      // Create new resume
      const newResume = new Resume({ ...resumeData, userId: userObjectId });
      await newResume.save();
      resume = newResume;
      console.log(`[RESUME-DEBUG-${requestId}] New resume created: ${resume._id}`);
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 13: Finalizing response`);
    
    await client.close();
    console.log(`[RESUME-DEBUG-${requestId}] Database connection closed`);

    const responseData = {
      success: true,
      userId,
      resumeId: resume._id,
      email: userEmail,
      name: resumeData.personalInfo.name,
      message: 'Resume uploaded successfully!',
      emailVerified: true
    };

    console.log(`[RESUME-DEBUG-${requestId}] === Resume upload process completed successfully ===`);
    console.log(`[RESUME-DEBUG-${requestId}] Response data:`, responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    const requestId = 'ERROR'; // In case requestId is not available
    console.log(`[RESUME-DEBUG-${requestId}] === ERROR OCCURRED ===`);
    console.error(`[RESUME-DEBUG-${requestId}] Full error:`, error);
    console.error(`[RESUME-DEBUG-${requestId}] Error message:`, error instanceof Error ? error.message : 'Unknown error');
    console.error(`[RESUME-DEBUG-${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof Error) {
      if (error.message.includes('PDF') || error.message.includes('Puppeteer')) {
        console.log(`[RESUME-DEBUG-${requestId}] Returning PDF error response`);
        return NextResponse.json(
          { error: 'Failed to read PDF file. Please ensure the file is a valid PDF.' },
          { status: 400 }
        );
      }
      if (error.message.includes('AI') || error.message.includes('Claude')) {
        console.log(`[RESUME-DEBUG-${requestId}] Returning AI processing error response`);
        return NextResponse.json(
          { error: 'Failed to process resume content. Please try again.' },
          { status: 500 }
        );
      }
    }

    console.log(`[RESUME-DEBUG-${requestId}] Returning generic error response`);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your resume' },
      { status: 500 }
    );
  }
}