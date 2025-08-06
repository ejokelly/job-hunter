import { NextRequest, NextResponse } from 'next/server';
import { CodewordAuth } from '@/lib/auth/codeword-auth';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db/mongodb';
import Resume from '@/lib/db/models/Resume';
import { ObjectId } from 'mongodb';
import { SubscriptionManager } from '@/lib/subscription/subscription-manager';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const session = await CodewordAuth.getSession(sessionToken);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user's resume data
    const userObjectId = new ObjectId(session.user.id);
    const resume = await Resume.findOne({ userId: userObjectId }).lean();

    if (!resume) {
      return NextResponse.json(
        { error: 'No resume data found' },
        { status: 404 }
      );
    }

    // Return all resume data
    const resumeData = Array.isArray(resume) ? resume[0] : resume;
    
    return NextResponse.json({
      success: true,
      data: {
        ...resumeData,
        _id: resumeData._id?.toString(),
        userId: resumeData.userId?.toString()
      }
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get user from session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const session = await CodewordAuth.getSession(sessionToken);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check subscription status
    const subscriptionStatus = await SubscriptionManager.getSubscriptionStatus(session.user.id);
    
    if (subscriptionStatus.subscriptionStatus === 'free') {
      return NextResponse.json(
        { 
          error: 'Profile editing requires a subscription',
          requiresUpgrade: true,
          subscriptionStatus: 'free' 
        },
        { status: 403 }
      );
    }

    // Get update data
    const updateData = await request.json();
    const { section, data } = updateData;

    if (!section || !data) {
      return NextResponse.json(
        { error: 'Section and data are required' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find and update user's resume data
    const userObjectId = new ObjectId(session.user.id);
    const updateFields: any = {};
    
    switch (section) {
      case 'personalInfo':
        updateFields.personalInfo = data;
        break;
      case 'summary':
        updateFields.summary = data.summary;
        break;
      case 'skills':
        updateFields.skills = data;
        break;
      case 'experience':
        updateFields.experience = data;
        break;
      case 'education':
        updateFields.education = data;
        break;
      case 'activities':
        updateFields.activities = data;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid section' },
          { status: 400 }
        );
    }

    updateFields.updatedAt = new Date();

    const updatedResume = await Resume.findOneAndUpdate(
      { userId: userObjectId },
      { $set: updateFields },
      { new: true, upsert: false }
    );

    if (!updatedResume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}