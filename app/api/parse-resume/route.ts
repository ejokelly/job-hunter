import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db/mongodb';
import Resume from '@/app/lib/db/models/Resume';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';
import { CodewordAuth } from '@/app/lib/auth/codeword-auth';
import { cookies } from 'next/headers';

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
    console.log(`[RESUME-DEBUG-${requestId}] Step 4: Using Claude to extract personal info directly from PDF`);
    
    // Use Claude to extract personal info directly from PDF
    const { TrackedAnthropic } = await import('@/app/lib/ai/tracked-anthropic');
    
    const personalInfoMessage = await TrackedAnthropic.createMessage(
      `Extract the personal information from this PDF resume. Return ONLY a JSON object with this exact structure:

{
  "name": "Full Name",
  "email": "email@domain.com",
  "phone": "phone number",
  "location": "city, state or full address"
}

Be very careful with the email address - extract it exactly as it appears, no extra characters.`,
      {
        operation: 'extract-personal-info',
        userId: 'anonymous', // Will be updated after user creation
        endpoint: 'parse-resume'
      },
      2000,
      [{
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: buffer.toString('base64')
        }
      }]
    );

    console.log(`[RESUME-DEBUG-${requestId}] Claude personal info response received`);
    
    if (personalInfoMessage.content[0].type !== 'text') {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: Claude returned non-text content`);
      throw new Error('Failed to extract personal info from PDF');
    }
    
    let personalInfo;
    try {
      // Extract JSON from response
      const responseText = personalInfoMessage.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      personalInfo = JSON.parse(jsonMatch[0]);
      console.log(`[RESUME-DEBUG-${requestId}] Extracted personal info:`, personalInfo);
    } catch (parseError) {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: Failed to parse personal info JSON:`, parseError);
      return NextResponse.json(
        { error: 'Could not extract personal information from resume' },
        { status: 400 }
      );
    }
    
    // Validate essential fields
    if (!personalInfo.name || !personalInfo.email) {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: Missing essential fields - name: ${!!personalInfo.name}, email: ${!!personalInfo.email}`);
      return NextResponse.json(
        { error: 'Could not extract essential information (name/email) from resume' },
        { status: 400 }
      );
    }

    // Use email override for development if available
    const userEmail = process.env.DEV_EMAIL_OVERRIDE || personalInfo.email;
    console.log(`[RESUME-DEBUG-${requestId}] Final user email:`, userEmail, process.env.DEV_EMAIL_OVERRIDE ? '(using override)' : '(from resume)');
    
    console.log(`[RESUME-DEBUG-${requestId}] Step 7: Connecting to database`);
    // Connect to database and check if user already exists BEFORE parsing
    await dbConnect();
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
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
      
      // Check if user has existing resume - if they do, require login
      const hasExistingResume = await Resume.findOne({ userId: existingUser._id });
      
      if (hasExistingResume) {
        console.log(`[RESUME-DEBUG-${requestId}] User has existing resume, checking authentication`);
        
        // Check if user is authenticated by looking for session-token cookie
        const cookieHeader = request.headers.get('Cookie');
        const hasSessionToken = cookieHeader?.includes('session-token=');
        
        console.log(`[RESUME-DEBUG-${requestId}] Auth check - cookieHeader present:`, !!cookieHeader, 'has session-token:', hasSessionToken);
        
        // If user exists with resume but no valid session, require login
        if (!hasSessionToken) {
          console.log(`[RESUME-DEBUG-${requestId}] ERROR: User exists with resume but not authenticated`);
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
        console.log(`[RESUME-DEBUG-${requestId}] User exists but no resume - allowing upload as first-time user`);
      }
    } else {
      console.log(`[RESUME-DEBUG-${requestId}] No existing user found for email: ${userEmail} - new user signup`);
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 9: Parsing full resume with Claude`);
    
    // Now do the full parsing with Claude, using the personal info we already extracted
    const fullResumeMessage = await TrackedAnthropic.createMessage(
      `Parse this entire PDF resume and return a complete JSON object with all resume information. Use this exact structure:

{
  "personalInfo": {
    "name": "${personalInfo.name}",
    "email": "${personalInfo.email}",
    "phone": "${personalInfo.phone || ''}",
    "location": "${personalInfo.location || ''}",
    "github": "",
    "linkedin": "",
    "title": "Professional Title"
  },
  "summary": "Professional summary paragraph",
  "skills": {
    "frontend": [
      {"name": "React", "years": 3}
    ],
    "backend": [
      {"name": "Node.js", "years": 2}
    ],
    "languages": [
      {"name": "JavaScript", "years": 5}
    ]
  },
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name", 
      "location": "City, State",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY or Present",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Type",
      "institution": "School Name",
      "location": "City, State", 
      "graduationDate": "MM/YYYY",
      "coursework": ["Course 1", "Course 2"],
      "capstone": "Project name if any"
    }
  ],
  "activities": ["Activity 1", "Activity 2"]
}

IMPORTANT: Skills must be categorized into logical groups (frontend, backend, languages, databases, tools, etc). Each skill has "name" and "years" (estimate years of experience as a number).

Extract all information accurately from the PDF.`,
      {
        operation: 'parse-full-resume',
        userId: userEmail, // Use email as identifier for now
        endpoint: 'parse-resume'
      },
      8000,
      [{
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: buffer.toString('base64')
        }
      }]
    );
    
    let resumeData;
    try {
      const responseText = fullResumeMessage.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      resumeData = JSON.parse(jsonMatch[0]);
      console.log(`[RESUME-DEBUG-${requestId}] Claude full parsing completed. Resume data keys:`, Object.keys(resumeData));
      
      // Handle skills format - convert flat array to categorized object if needed
      if (resumeData.skills && Array.isArray(resumeData.skills)) {
        console.log(`[RESUME-DEBUG-${requestId}] Converting flat skills array to categorized object`);
        const categorizedSkills: any = {};
        
        for (const skill of resumeData.skills) {
          // Categorize skills based on common patterns
          let category = 'general';
          const skillName = skill.name.toLowerCase();
          
          if (skillName.includes('react') || skillName.includes('vue') || skillName.includes('angular') || skillName.includes('html') || skillName.includes('css')) {
            category = 'frontend';
          } else if (skillName.includes('node') || skillName.includes('express') || skillName.includes('django') || skillName.includes('flask') || skillName.includes('rails')) {
            category = 'backend';
          } else if (skillName.includes('python') || skillName.includes('javascript') || skillName.includes('typescript') || skillName.includes('java') || skillName.includes('c++') || skillName.includes('go') || skillName.includes('rust')) {
            category = 'languages';
          } else if (skillName.includes('sql') || skillName.includes('postgres') || skillName.includes('mongodb') || skillName.includes('redis') || skillName.includes('database')) {
            category = 'databases';
          } else if (skillName.includes('aws') || skillName.includes('docker') || skillName.includes('kubernetes') || skillName.includes('git') || skillName.includes('linux')) {
            category = 'tools';
          } else if (skillName.includes('machine learning') || skillName.includes('ai') || skillName.includes('data science') || skillName.includes('tensorflow') || skillName.includes('pytorch')) {
            category = 'ai';
          }
          
          if (!categorizedSkills[category]) {
            categorizedSkills[category] = [];
          }
          
          // Convert level to years estimate
          let years = 2; // default
          if (skill.level === 'beginner') years = 1;
          else if (skill.level === 'intermediate') years = 3;
          else if (skill.level === 'advanced') years = 5;
          else if (typeof skill.years === 'number') years = skill.years;
          
          categorizedSkills[category].push({
            name: skill.name,
            years: years
          });
        }
        
        resumeData.skills = categorizedSkills;
        console.log(`[RESUME-DEBUG-${requestId}] Skills converted to categorized format:`, Object.keys(categorizedSkills));
      }
      
    } catch (parseError) {
      console.log(`[RESUME-DEBUG-${requestId}] ERROR: Failed to parse full resume JSON:`, parseError);
      await client.close();
      return NextResponse.json(
        { error: 'Could not parse resume content' },
        { status: 400 }
      );
    }

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
      // Create new user - use email from Claude parsing, not raw extraction
      const finalEmail = resumeData.personalInfo.email || userEmail;
      console.log(`[RESUME-DEBUG-${requestId}] Creating new user with email: ${finalEmail}`);
      const newUser = {
        email: finalEmail,
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

    // Update usage tracking with actual user ID
    console.log(`[RESUME-DEBUG-${requestId}] Step 11b: Updating usage tracking for user: ${userId}`);
    const { UsageTracker } = await import('@/app/lib/tracking/usage-tracker');
    try {
      // Update the personal info extraction usage
      await UsageTracker.updateUsageUserId(userEmail, userId);
      console.log(`[RESUME-DEBUG-${requestId}] Usage tracking updated for personal info extraction`);
    } catch (usageError) {
      console.error(`[RESUME-DEBUG-${requestId}] Error updating usage tracking:`, usageError);
      // Don't fail the whole process if usage tracking fails
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 12: Managing resume record`);
    const { ObjectId } = await import('mongodb');
    const userObjectId = new ObjectId(userId);
    console.log(`[RESUME-DEBUG-${requestId}] Checking for existing resume for user: ${userId}`);
    
    const existingResume = await Resume.findOne({ userId: userObjectId });
    
    let resume;
    if (existingResume) {
      console.log(`[RESUME-DEBUG-${requestId}] Updating existing resume: ${existingResume._id}`);
      
      // Merge skills instead of overwriting
      const skillsMap = new Map();
      
      // Add existing skills first
      existingResume.skills.forEach((skill: any) => {
        if (skill.name) {
          skillsMap.set(skill.name.toLowerCase(), skill);
        }
      });
      
      // Add/update with new skills
      resumeData.skills.forEach((skill: any) => {
        if (skill.name) {
          const key = skill.name.toLowerCase();
          // If skill already exists, keep the higher proficiency level
          if (skillsMap.has(key)) {
            const existingSkill = skillsMap.get(key);
            const newLevel = skill.level || 'intermediate';
            const existingLevel = existingSkill.level || 'intermediate';
            
            // Priority: advanced > intermediate > basic
            const levelPriority: Record<string, number> = { advanced: 3, intermediate: 2, basic: 1 };
            if ((levelPriority[newLevel] || 2) > (levelPriority[existingLevel] || 2)) {
              skillsMap.set(key, skill);
            }
          } else {
            skillsMap.set(key, skill);
          }
        }
      });
      
      // Convert back to array
      const mergedSkills = Array.from(skillsMap.values());
      
      // Update resume with merged skills and new personal info
      const updateData = {
        ...resumeData,
        skills: mergedSkills
      };
      
      await Resume.findByIdAndUpdate(existingResume._id, updateData, { new: true });
      resume = { _id: existingResume._id };
      console.log(`[RESUME-DEBUG-${requestId}] Resume updated successfully with ${mergedSkills.length} skills`);
    } else {
      console.log(`[RESUME-DEBUG-${requestId}] Creating new resume record`);
      // Create new resume
      const newResume = new Resume({ ...resumeData, userId: userObjectId });
      await newResume.save();
      resume = newResume;
      console.log(`[RESUME-DEBUG-${requestId}] New resume created: ${resume._id}`);
    }

    console.log(`[RESUME-DEBUG-${requestId}] Step 13: Creating session for user`);
    
    let sessionResult;
    if (existingUser) {
      // For existing users, just create a session - DON'T call signIn which creates users
      console.log(`[RESUME-DEBUG-${requestId}] Creating session for existing user: ${existingUser._id}`);
      const { sessionToken, expires: sessionExpires } = await CodewordAuth.createSession(existingUser._id);
      sessionResult = {
        user: {
          id: existingUser._id.toString(),
          email: existingUser.email,
          name: existingUser.name,
          emailVerified: existingUser.emailVerified
        },
        sessionToken,
        expires: sessionExpires
      };
    } else {
      // For new users, use signIn which will create the user
      console.log(`[RESUME-DEBUG-${requestId}] Creating new user and session`);
      sessionResult = await CodewordAuth.signIn(userEmail, resumeData.personalInfo.name);
    }
    console.log(`[RESUME-DEBUG-${requestId}] Session created: ${sessionResult.sessionToken}`);
    
    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set('session-token', sessionResult.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    
    console.log(`[RESUME-DEBUG-${requestId}] Step 14: Finalizing response`);
    
    await client.close();
    console.log(`[RESUME-DEBUG-${requestId}] Database connection closed`);

    const responseData = {
      success: true,
      userId,
      resumeId: resume._id,
      email: userEmail,
      name: resumeData.personalInfo.name,
      message: 'Resume uploaded successfully!',
      emailVerified: true,
      sessionToken: sessionResult.sessionToken,
      jwtToken: sessionResult.sessionToken
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