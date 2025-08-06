import { NextRequest, NextResponse } from 'next/server';
import { CodewordAuth } from '@/app/lib/auth/codeword-auth';
import { cookies } from 'next/headers';
import dbConnect from '@/app/lib/db/mongodb';
import Resume from '@/app/lib/db/models/Resume';
import { MongoClient, ObjectId } from 'mongodb';

export async function DELETE(request: NextRequest) {
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

    const userId = session.user.id;
    console.log(`[DELETE ACCOUNT] Starting account deletion for user: ${userId}`);

    // Connect to database
    await dbConnect();
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    const userObjectId = new ObjectId(userId);

    try {
      // Delete user's resume data
      console.log(`[DELETE ACCOUNT] Deleting resume data for user: ${userId}`);
      const resumeDeleteResult = await Resume.deleteMany({ userId: userObjectId });
      console.log(`[DELETE ACCOUNT] Deleted ${resumeDeleteResult.deletedCount} resume records`);

      // Delete user record
      console.log(`[DELETE ACCOUNT] Deleting user record: ${userId}`);
      const userDeleteResult = await db.collection('users').deleteOne({ _id: userObjectId });
      console.log(`[DELETE ACCOUNT] Deleted ${userDeleteResult.deletedCount} user record`);

      // Delete user's sessions
      console.log(`[DELETE ACCOUNT] Deleting sessions for user: ${userId}`);
      const sessionDeleteResult = await db.collection('sessions').deleteMany({ userId: userObjectId });
      console.log(`[DELETE ACCOUNT] Deleted ${sessionDeleteResult.deletedCount} session records`);

      // Delete generation sessions (usage tracking)
      console.log(`[DELETE ACCOUNT] Deleting generation sessions for user: ${userId}`);
      const generationDeleteResult = await db.collection('generation_sessions').deleteMany({ userId: userObjectId });
      console.log(`[DELETE ACCOUNT] Deleted ${generationDeleteResult.deletedCount} generation session records`);

      // Delete any debug logs for this user
      console.log(`[DELETE ACCOUNT] Deleting debug logs for user: ${userId}`);
      const logsDeleteResult = await db.collection('debug_logs').deleteMany({ userId });
      console.log(`[DELETE ACCOUNT] Deleted ${logsDeleteResult.deletedCount} debug log records`);

      // Clear the session cookie
      cookieStore.delete('session-token');

      console.log(`[DELETE ACCOUNT] Account deletion completed for user: ${userId}`);

      return NextResponse.json({
        success: true,
        message: 'Account and all associated data have been permanently deleted',
        deleted: {
          user: userDeleteResult.deletedCount,
          resumes: resumeDeleteResult.deletedCount,
          sessions: sessionDeleteResult.deletedCount,
          generationSessions: generationDeleteResult.deletedCount,
          logs: logsDeleteResult.deletedCount
        }
      });

    } finally {
      await client.close();
    }

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    );
  }
}