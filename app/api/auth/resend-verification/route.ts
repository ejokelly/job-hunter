import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { email } = await request.json();
    
    if (email !== session.user.email) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 400 }
      );
    }

    // Send verification email using Postmark
    try {
      const { MongoClient } = await import('mongodb');
      const postmark = await import('postmark');
      
      const client = new MongoClient(process.env.MONGODB_URI!);
      await client.connect();
      const db = client.db();
      
      // Delete any existing verification tokens for this email
      await db.collection('verification_tokens').deleteMany({
        identifier: email
      });
      
      // Create new verification token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      const verificationToken = {
        identifier: email,
        token,
        expires
      };
      
      await db.collection('verification_tokens').insertOne(verificationToken);
      
      // Get user name for email
      const user = await db.collection('users').findOne({ email });
      const userName = user?.name || 'User';
      
      // Send email using Postmark
      const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      
      const emailClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY!);
      await emailClient.sendEmail({
        From: process.env.EMAIL_FROM!,
        To: process.env.DEV_EMAIL_OVERRIDE || email,
        Subject: 'Verify your resume❤️ account',
        HtmlBody: `
          <h2>Welcome to resume❤️, ${userName}!</h2>
          <p>Your resume has been successfully uploaded and parsed. To start customizing your resume for job applications, please verify your email address:</p>
          <p><a href="${verificationUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email & Get Started</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create this account, you can safely ignore this email.</p>
        `,
        TextBody: `Welcome to resume❤️, ${userName}!\n\nYour resume has been successfully uploaded and parsed. To start customizing your resume for job applications, please verify your email address:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create this account, you can safely ignore this email.`,
        MessageStream: "outbound"
      });
      
      await client.close();
      
      console.log('Verification email resent to:', email);
      
      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully'
      });
      
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}