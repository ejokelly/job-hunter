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

    // Extract text from PDF using pdf2json
    const rawText = await extractTextFromPDF(buffer);
    const cleanedText = cleanResumeText(rawText);

    // Validate extracted text
    if (cleanedText.length < 100) {
      return NextResponse.json(
        { error: 'Resume appears to be empty or unreadable' },
        { status: 400 }
      );
    }

    // Parse with Claude
    const resumeData = await parseResumeWithClaude(cleanedText);

    // Validate essential fields
    if (!resumeData.personalInfo?.name || !resumeData.personalInfo?.email) {
      return NextResponse.json(
        { error: 'Could not extract essential information (name/email) from resume' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    // Use email override for development if available
    const userEmail = process.env.DEV_EMAIL_OVERRIDE || resumeData.personalInfo.email;
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ 
      email: userEmail 
    });

    let userId;
    
    if (existingUser) {
      console.log('🔍 Found existing user:', existingUser.email);
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


    // If it's a new user, send verification email
    if (!existingUser) {
      console.log('🔍 Sending verification email to new user');
      
      try {
        // Delete any existing verification tokens for this email
        await db.collection('verification_tokens').deleteMany({
          identifier: userEmail
        });
        
        // Create new verification token
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await db.collection('verification_tokens').insertOne({
          identifier: userEmail,
          token,
          expires
        });
        
        // Send email using Postmark
        const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}&email=${encodeURIComponent(userEmail)}`;
        
        const emailClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY!);
        await emailClient.sendEmail({
          From: process.env.EMAIL_FROM!,
          To: process.env.DEV_EMAIL_OVERRIDE || userEmail,
          Subject: 'Verify your resume❤️ account',
          HtmlBody: `
            <h2>Welcome to resume❤️, ${resumeData.personalInfo.name}!</h2>
            <p>Your resume has been successfully uploaded and parsed. To start customizing your resume for job applications, please verify your email address:</p>
            <p><a href="${verificationUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email & Get Started</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, you can safely ignore this email.</p>
          `,
          TextBody: `Welcome to resume❤️, ${resumeData.personalInfo.name}!\n\nYour resume has been successfully uploaded and parsed. To start customizing your resume for job applications, please verify your email address:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create this account, you can safely ignore this email.`,
          MessageStream: "outbound"
        });
        
        console.log('🔍 Verification email sent to:', userEmail);
        
      } catch (error) {
        console.error('🔍 Error sending verification email:', error);
      }
    }
    
    console.log('🔍 User and resume created successfully');

    await client.close();

    const responseData = {
      success: true,
      userId,
      resumeId: resume._id,
      email: userEmail,
      name: resumeData.personalInfo.name,
      message: 'Resume uploaded successfully!',
      emailVerified: existingUser ? !!existingUser.emailVerified : false
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