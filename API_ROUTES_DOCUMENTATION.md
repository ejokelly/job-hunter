# API Routes Documentation

This document justifies all remaining API routes in the application and describes how they are used.

## Authentication Routes

### `/api/auth/session`
**Purpose**: Get current user session data
**Used in**: 
- `app/account/page.tsx:37` - Load user session on account page
- `app/page.tsx:71` - Check if user is logged in on home page
- `app/resume/new/page.tsx:53` - Verify user session before allowing resume creation
- `app/verify/[resumeId]/page.tsx:49` - Check user session on verification page
- `components/header.tsx:23,40` - Display user info and handle auth state

### `/api/auth/send-code`
**Purpose**: Send authentication code to user's email
**Used in**: 
- `app/page.tsx:430` - Send verification code during sign-in process

### `/api/auth/verify-code`
**Purpose**: Verify the authentication code entered by user
**Used in**: 
- `app/page.tsx:459` - Verify the code user entered to complete sign-in

### `/api/auth/signout`
**Purpose**: Sign out the current user
**Used in**: 
- `components/header.tsx:60` - Sign out functionality in header

## Resume Generation Routes

### `/api/analyze-skills`
**Purpose**: Analyze job description and extract required skills
**Used in**: 
- `app/page.tsx:90` - Analyze skills from job description on home page
- `app/resume/new/page.tsx:166` - Analyze skills on new resume page
- `app/verify/[resumeId]/page.tsx:139` - Analyze skills on verification page

### `/api/add-skill`
**Purpose**: Add a skill to user's profile
**Used in**: 
- `app/page.tsx:135` - Add skill from home page
- `app/resume/new/page.tsx:204` - Add skill from new resume page
- `app/verify/[resumeId]/page.tsx:170` - Add skill from verification page

### `/api/generate-resume`
**Purpose**: Generate a complete resume based on user data and job description
**Used in**: 
- `app/page.tsx:237` - Generate resume on home page
- `app/resume/new/page.tsx:277` - Generate resume on new resume page

### `/api/generate-cover-letter`
**Purpose**: Generate a cover letter based on resume and job description
**Used in**: 
- `app/page.tsx:281` - Generate cover letter on home page
- `app/resume/new/page.tsx:308` - Generate cover letter on new resume page

### `/api/preview-resume`
**Purpose**: Generate a preview of the resume without saving
**Used in**: 
- `app/page.tsx:173,325` - Preview resume functionality on home page
- `app/resume/new/page.tsx:242,339` - Preview resume on new resume page
- `app/verify/[resumeId]/page.tsx:208` - Preview resume on verification page

### `/api/preview-cover-letter`
**Purpose**: Generate a preview of the cover letter without saving
**Used in**: 
- `app/page.tsx:180,349` - Preview cover letter functionality on home page
- `app/resume/new/page.tsx:249,363` - Preview cover letter on new resume page
- `app/verify/[resumeId]/page.tsx:215` - Preview cover letter on verification page

## Session Management Routes

### `/api/create-session`
**Purpose**: Create a new user session after email verification
**Used in**: 
- `app/page.tsx:392` - Create session after successful email verification

## Subscription & Payment Routes

### `/api/subscription/status`
**Purpose**: Get user's current subscription status and usage limits
**Used in**: 
- `app/account/page.tsx:67` - Display subscription info on account page
- `app/resume/new/page.tsx:136` - Check subscription limits before allowing resume creation
- `app/page.tsx:706` - Check subscription status on home page
- `components/subscription-limit-warning.tsx:29` - Display subscription warnings

### `/api/stripe/create-checkout`
**Purpose**: Create Stripe checkout session for subscription upgrades
**Used in**: 
- `app/account/page.tsx:102` - Upgrade subscription from account page
- `components/subscription-limit-warning.tsx:112,252` - Upgrade from limit warning component

## Admin & Stats Routes

### `/api/admin/stats`
**Purpose**: Get admin statistics and usage data
**Used in**: 
- `app/stats/page.tsx:56` - Display admin statistics page

## Utility Routes

### `/api/verify-email-token`
**Purpose**: Verify email verification token
**Used in**: 
- `app/verify-email/page.tsx:26` - Verify email when user clicks verification link

### `/api/save-terms-agreement`
**Purpose**: Save user's acceptance of terms and conditions
**Used in**: 
- `app/resume/new/page.tsx:553` - Save terms agreement when user accepts

## Summary

All remaining 19 API routes are actively used in the application:
- **7 routes** for authentication and session management
- **6 routes** for resume and cover letter generation/preview
- **2 routes** for subscription management and payments
- **2 routes** for skill analysis and management
- **1 route** for admin statistics
- **1 route** for email verification
- **1 route** for terms agreement

Each route serves a specific purpose and has clear usage patterns throughout the frontend application.