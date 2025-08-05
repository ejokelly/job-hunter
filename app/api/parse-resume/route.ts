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
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No resume file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Try to extract text from PDF - if that fails, use Anthropic to read it directly
    console.log('🔍 About to extract text from PDF...');
    let cleanedText = '';
    
    try {
      const rawText = await extractTextFromPDF(buffer);
      console.log('🔍 Raw text extracted, length:', rawText.length);
      cleanedText = cleanResumeText(rawText);
      console.log('🔍 Cleaned text length:', cleanedText.length);
    } catch (pdfError) {
      console.log('🔍 PDF extraction failed, trying Anthropic direct read...');
      // Fallback: use Anthropic to read the PDF directly
      const anthropic = new (await import('@anthropic-ai/sdk')).default({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });
      
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

      if (message.content[0].type !== 'text') {
        throw new Error('Failed to read PDF with Anthropic');
      }
      
      cleanedText = message.content[0].text.trim();
      console.log('🔍 Anthropic extracted text length:', cleanedText.length);
    }

    // Validate extracted text
    if (cleanedText.length < 100) {
      return NextResponse.json(
        { error: 'Resume appears to be empty or unreadable' },
        { status: 400 }
      );
    }

    // First, do a quick email extraction to check if user exists
    const emailMatch = cleanedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const extractedEmail = emailMatch ? emailMatch[0] : null;
    
    if (!extractedEmail) {
      return NextResponse.json(
        { error: 'Could not find email address in resume' },
        { status: 400 }
      );
    }

    // Use email override for development if available
    const userEmail = process.env.DEV_EMAIL_OVERRIDE || extractedEmail;
    
    // Connect to database and check if user already exists BEFORE parsing
    await dbConnect();
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();
    
    const existingUser = await db.collection('users').findOne({ 
      email: userEmail 
    });
    
    if (existingUser) {
      console.log('🔍 Found existing user:', existingUser.email);
      
      // Check if user is authenticated by looking for session
      const sessionHeader = request.headers.get('Authorization');
      const sessionCookie = request.headers.get('Cookie');
      
      // If user exists but no valid session, require login
      if (!sessionHeader && !sessionCookie?.includes('session=')) {
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
    }

    // Now do the full parsing with Claude
    const resumeData = await parseResumeWithClaude(cleanedText);

    // Validate essential fields
    if (!resumeData.personalInfo?.name || !resumeData.personalInfo?.email) {
      await client.close();
      return NextResponse.json(
        { error: 'Could not extract essential information (name/email) from resume' },
        { status: 400 }
      );
    }

    let userId;
    
    if (existingUser) {
      userId = existingUser._id.toString();
    } else {
      // Create new user
      console.log('🔍 Creating new user with email:', userEmail);
      const newUser = {
        email: userEmail,
        name: resumeData.personalInfo.name,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log('🔍 User data to insert:', newUser);
      const userResult = await db.collection('users').insertOne(newUser);
      console.log('🔍 User creation result:', userResult);
      userId = userResult.insertedId.toString();
      console.log('🔍 New user ID:', userId);
    }

    // Check if user already has a resume - if so, update it instead of creating new
    const { ObjectId } = await import('mongodb');
    const userObjectId = new ObjectId(userId);
    const existingResume = await Resume.findOne({ userId: userObjectId });
    
    let resume;
    if (existingResume) {
      // Update existing resume
      await Resume.findByIdAndUpdate(existingResume._id, resumeData, { new: true });
      resume = { _id: existingResume._id };
    } else {
      // Create new resume
      const newResume = new Resume({ ...resumeData, userId: userObjectId });
      await newResume.save();
      resume = newResume;
    }


    // No email verification needed - users are auto-logged in
    
    console.log('🔍 User and resume created successfully');

    await client.close();

    const responseData = {
      success: true,
      userId,
      resumeId: resume._id,
      email: userEmail,
      name: resumeData.personalInfo.name,
      message: 'Resume uploaded successfully!',
      emailVerified: true
    };

    console.log('🚀 Sending response:', responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error parsing resume:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('PDF') || error.message.includes('Puppeteer')) {
        return NextResponse.json(
          { error: 'Failed to read PDF file. Please ensure the file is a valid PDF.' },
          { status: 400 }
        );
      }
      if (error.message.includes('AI') || error.message.includes('Claude')) {
        return NextResponse.json(
          { error: 'Failed to process resume content. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your resume' },
      { status: 500 }
    );
  }
}