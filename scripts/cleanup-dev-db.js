// Script to clean up development database
const { MongoClient } = require('mongodb');

async function cleanupDevDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable not set');
    process.exit(1);
  }

  // Safety check - only run on development databases
  if (!uri.includes('localhost') && !uri.includes('127.0.0.1') && !uri.includes('dev')) {
    console.error('❌ Safety check failed - this script only runs on development databases');
    console.error('   Database URI must contain "localhost", "127.0.0.1", or "dev"');
    process.exit(1);
  }

  console.log('🗑️  Starting database cleanup...');
  console.log('   Database URI:', uri.replace(/\/\/[^@]+@/, '//***:***@')); // Hide credentials

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const db = client.db();
    
    // Count documents before deletion
    const userCount = await db.collection('users').countDocuments();
    const resumeCount = await db.collection('resumes').countDocuments();
    const sessionCount = await db.collection('sessions').countDocuments();
    const authCodeCount = await db.collection('auth_codes').countDocuments();
    
    console.log('📊 Current document counts:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Resumes: ${resumeCount}`);
    console.log(`   Sessions: ${sessionCount}`);
    console.log(`   Auth codes: ${authCodeCount}`);
    
    if (userCount === 0 && resumeCount === 0 && sessionCount === 0 && authCodeCount === 0) {
      console.log('✅ Database is already clean - no documents to delete');
      return;
    }
    
    // Delete all documents
    console.log('🗑️  Deleting all documents...');
    
    const deleteUsers = await db.collection('users').deleteMany({});
    console.log(`   Deleted ${deleteUsers.deletedCount} users`);
    
    const deleteResumes = await db.collection('resumes').deleteMany({});
    console.log(`   Deleted ${deleteResumes.deletedCount} resumes`);
    
    const deleteSessions = await db.collection('sessions').deleteMany({});
    console.log(`   Deleted ${deleteSessions.deletedCount} sessions`);
    
    const deleteAuthCodes = await db.collection('auth_codes').deleteMany({});
    console.log(`   Deleted ${deleteAuthCodes.deletedCount} auth codes`);
    
    // Verify deletion
    const finalUserCount = await db.collection('users').countDocuments();
    const finalResumeCount = await db.collection('resumes').countDocuments();
    const finalSessionCount = await db.collection('sessions').countDocuments();
    const finalAuthCodeCount = await db.collection('auth_codes').countDocuments();
    
    console.log('📊 Final document counts:');
    console.log(`   Users: ${finalUserCount}`);
    console.log(`   Resumes: ${finalResumeCount}`);
    console.log(`   Sessions: ${finalSessionCount}`);
    console.log(`   Auth codes: ${finalAuthCodeCount}`);
    
    if (finalUserCount === 0 && finalResumeCount === 0 && finalSessionCount === 0 && finalAuthCodeCount === 0) {
      console.log('✅ Database cleanup completed successfully!');
    } else {
      console.log('⚠️  Some documents may not have been deleted');
    }
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the cleanup
cleanupDevDatabase().catch(console.error);