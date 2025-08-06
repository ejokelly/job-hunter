'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, User, Mail, Phone, MapPin, Github, Linkedin, Briefcase, GraduationCap, Award, Calendar, Building, FileText, Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
import Header from '@/pc/auth/header';
import PageContainer from '@/pc/layout/page-container';
import Footer from '@/pc/layout/footer';
import ConfirmModal from '@/pc/modals/confirm-modal';

interface ISkill {
  name: string;
  years: string | number;
}

interface IPersonalInfo {
  name: string;
  phone: string;
  email: string;
  location: string;
  github: string;
  linkedin: string;
  title: string;
}

interface IExperience {
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  achievements: string[];
}

interface IEducation {
  degree: string;
  institution: string;
  location: string;
  graduationDate: string;
  coursework: string[];
  capstone?: string;
}

interface IResumeData {
  _id: string;
  userId: string;
  personalInfo: IPersonalInfo;
  summary: string;
  skills: { [category: string]: ISkill[] };
  pendingSkills: ISkill[];
  experience: IExperience[];
  education: IEducation[];
  activities: string[];
  termsAgreedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resumeData, setResumeData] = useState<IResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'free' | 'starter' | 'unlimited' | 'canceled' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadProfileData() {
      try {
        const [profileResponse, subscriptionResponse] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/subscription/status')
        ]);

        const profileResult = await profileResponse.json();
        const subscriptionResult = await subscriptionResponse.json();

        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            router.push('/auth/signin');
            return;
          }
          throw new Error(profileResult.error || 'Failed to load profile');
        }

        setResumeData(profileResult.data);
        setSubscriptionStatus(subscriptionResult.subscriptionStatus || 'free');
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfileData();
  }, [router]);

  const startEditing = (section: string, data: any) => {
    if (subscriptionStatus === 'free') {
      showUpgradePrompt();
      return;
    }
    setEditingSection(section);
    setEditData(JSON.parse(JSON.stringify(data))); // Deep clone
  };

  const showUpgradePrompt = () => {
    if (confirm('Profile editing requires a subscription. Would you like to upgrade now?')) {
      router.push('/account');
    }
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditData({});
  };

  const saveSection = async (section: string, data: any) => {
    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.requiresUpgrade) {
          showUpgradePrompt();
          return;
        }
        throw new Error(errorData.error || 'Failed to save changes');
      }

      // Update local state
      if (resumeData) {
        setResumeData(prev => prev ? { ...prev, [section]: data, updatedAt: new Date().toISOString() } : null);
      }

      setEditingSection(null);
      setEditData({});
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      const result = await response.json();
      console.log('Account deleted:', result);
      
      // Clear any local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to home page
      router.push('/');
    } catch (err) {
      console.error('Delete account error:', err);
      alert('Failed to delete account. Please try again or contact support.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const downloadData = () => {
    if (!resumeData) return;
    
    const dataStr = JSON.stringify(resumeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `resume-data-${resumeData.personalInfo.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <>
        <Header />
        <PageContainer>
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-pulse text-gray-500">Loading profile...</div>
          </div>
        </PageContainer>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <PageContainer>
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </PageContainer>
        <Footer />
      </>
    );
  }

  if (!resumeData) {
    return (
      <>
        <Header />
        <PageContainer>
          <div className="text-center py-12">
            <div className="text-gray-500">No profile data found</div>
          </div>
        </PageContainer>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <PageContainer>
        <div className="max-w-4xl mx-auto py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold theme-text-primary">My Profile</h1>
              <p className="theme-text-secondary mt-2">Your extracted resume data</p>
            </div>
            <div className="flex items-center gap-4">
              {subscriptionStatus === 'free' && (
                <button
                  onClick={() => router.push('/account')}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Edit3 size={16} />
                  Upgrade to Edit Profile
                </button>
              )}
              <button
                onClick={downloadData}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={16} />
                Download Data
              </button>
            </div>
          </div>

          {/* Resume-style layout */}
          <div className="max-w-4xl mx-auto theme-bg-primary theme-text-primary p-8 border border-gray-200 dark:border-gray-700">
            
            {/* Header */}
            <header className="text-center border-b border-gray-300 dark:border-gray-600 pb-6 mb-8 relative">
              {subscriptionStatus !== 'free' && (
                <button
                  onClick={() => startEditing('personalInfo', resumeData.personalInfo)}
                  className="absolute top-0 right-0 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={editingSection !== null}
                  title="Edit this section"
                >
                  <Edit3 size={16} />
                </button>
              )}

              {editingSection === 'personalInfo' ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="text-3xl font-bold mb-2 text-center w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                    placeholder="Full Name"
                  />
                  <input
                    type="text"
                    value={editData.title || ''}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    className="text-lg mb-4 text-center w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                    placeholder="Job Title"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({...editData, email: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Email"
                    />
                    <input
                      type="text"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Phone"
                    />
                    <input
                      type="text"
                      value={editData.location || ''}
                      onChange={(e) => setEditData({...editData, location: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Location"
                    />
                    <input
                      type="text"
                      value={editData.github || ''}
                      onChange={(e) => setEditData({...editData, github: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="GitHub (optional)"
                    />
                    <input
                      type="text"
                      value={editData.linkedin || ''}
                      onChange={(e) => setEditData({...editData, linkedin: e.target.value})}
                      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 md:col-span-2"
                      placeholder="LinkedIn (optional)"
                    />
                  </div>
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => saveSection('personalInfo', editData)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold mb-2">{resumeData.personalInfo.name}</h1>
                  <p className="text-lg mb-4">{resumeData.personalInfo.title}</p>
                  <div className="flex flex-wrap justify-center gap-4 text-sm">
                    <span>{resumeData.personalInfo.email}</span>
                    <span>{resumeData.personalInfo.phone}</span>
                    <span>{resumeData.personalInfo.location}</span>
                    {resumeData.personalInfo.github && <span>{resumeData.personalInfo.github}</span>}
                    {resumeData.personalInfo.linkedin && <span>{resumeData.personalInfo.linkedin}</span>}
                  </div>
                </>
              )}
            </header>

            {/* Professional Summary */}
            <section className="mb-8 relative">
              <h2 className="text-xl font-bold border-b border-gray-300 dark:border-gray-600 pb-1 mb-4">
                PROFESSIONAL SUMMARY
                {subscriptionStatus !== 'free' && (
                  <button
                    onClick={() => startEditing('summary', { summary: resumeData.summary })}
                    className="ml-4 p-1 rounded float-right hover:bg-gray-100 dark:hover:bg-gray-700"
                    disabled={editingSection !== null}
                    title="Edit this section"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
              </h2>

              {editingSection === 'summary' ? (
                <div className="space-y-4">
                  <textarea
                    value={editData.summary || ''}
                    onChange={(e) => setEditData({...editData, summary: e.target.value})}
                    className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                    rows={4}
                    placeholder="Professional summary..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveSection('summary', editData)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      <Save size={16} />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="leading-relaxed">{resumeData.summary}</p>
              )}
            </section>

            {/* Skills */}
            <section className="mb-8">
              <h2 className="text-xl font-bold border-b border-gray-300 dark:border-gray-600 pb-1 mb-4">SKILLS</h2>
              {(() => {
                if (!resumeData.skills) return <p>No skills data</p>;
                
                const isGarbageData = (data: any) => {
                  if (typeof data === 'string') {
                    return data.match(/^[0-9a-f]{24}$/i) || data.startsWith('_id') || data.length > 50;
                  }
                  return false;
                };
                
                if (Array.isArray(resumeData.skills)) {
                  const cleanSkills = resumeData.skills.filter(skill => {
                    if (typeof skill === 'string') return !isGarbageData(skill);
                    if (skill && typeof skill === 'object') return skill.name && !isGarbageData(skill.name);
                    return false;
                  });
                  
                  if (cleanSkills.length === 0) return <p>No valid skills found</p>;
                  
                  return <p>{cleanSkills.map(skill => typeof skill === 'string' ? skill : skill.name).join(' • ')}</p>;
                }
                
                const skillCategories = Object.entries(resumeData.skills)
                  .filter(([category, skillList]) => !isGarbageData(category) && skillList)
                  .map(([category, skillList]) => {
                    let skills: any[] = [];
                    if (Array.isArray(skillList)) {
                      skills = skillList.filter(skill => {
                        if (typeof skill === 'string') return !isGarbageData(skill);
                        return skill && skill.name && !isGarbageData(skill.name);
                      });
                    }
                    return { category, skills };
                  })
                  .filter(({ skills }) => skills.length > 0);
                
                if (skillCategories.length === 0) return <p>No valid skills found</p>;
                
                return (
                  <div className="space-y-2">
                    {skillCategories.map(({ category, skills }) => (
                      <div key={category}>
                        <strong>{category}:</strong> {skills.map(skill => typeof skill === 'string' ? skill : skill.name).join(' • ')}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>

            {/* Work Experience */}
            <section className="mb-8">
              <h2 className="text-xl font-bold border-b border-gray-300 dark:border-gray-600 pb-1 mb-4">WORK EXPERIENCE</h2>
              <div className="space-y-6">
                {Array.isArray(resumeData.experience) && resumeData.experience.map((exp, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-bold">{exp.role}</h3>
                        <p className="font-semibold">{exp.company}</p>
                      </div>
                      <div className="text-right text-sm">
                        <div>{exp.startDate} - {exp.endDate}</div>
                        {exp.location && <div>{exp.location}</div>}
                      </div>
                    </div>
                    {Array.isArray(exp.achievements) && exp.achievements.length > 0 && (
                      <ul className="list-disc ml-5 space-y-1">
                        {exp.achievements.map((achievement, achievementIndex) => (
                          <li key={achievementIndex}>{achievement}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Education */}
            {Array.isArray(resumeData.education) && resumeData.education.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold border-b border-gray-300 dark:border-gray-600 pb-1 mb-4">EDUCATION</h2>
                <div className="space-y-4">
                  {resumeData.education.map((edu, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">{edu.degree}</h3>
                          <p className="font-semibold">{edu.institution}</p>
                        </div>
                        <div className="text-right text-sm">
                          <div>{edu.graduationDate}</div>
                          <div>{edu.location}</div>
                        </div>
                      </div>
                      {Array.isArray(edu.coursework) && edu.coursework.length > 0 && (
                        <p className="text-sm mt-1">
                          <strong>Relevant Coursework:</strong> {edu.coursework.join(', ')}
                        </p>
                      )}
                      {edu.capstone && (
                        <p className="text-sm">
                          <strong>Capstone:</strong> {edu.capstone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activities */}
            {Array.isArray(resumeData.activities) && resumeData.activities.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold border-b border-gray-300 dark:border-gray-600 pb-1 mb-4">ACTIVITIES</h2>
                <ul className="list-disc ml-5 space-y-1">
                  {resumeData.activities.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Metadata */}
            <footer className="text-xs text-gray-500 border-t border-gray-300 dark:border-gray-600 pt-4 mt-8">
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div>Created: {new Date(resumeData.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(resumeData.updatedAt).toLocaleDateString()}</div>
              </div>
              
              {/* Delete Account Button */}
              <div className="border-t border-gray-300 dark:border-gray-600 pt-6">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} />
                  Delete My Data and Close My Account
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  This action is permanent and cannot be undone. All your data will be deleted.
                </p>
              </div>
            </footer>
          </div>
        </div>
      </PageContainer>
      <Footer />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account and all associated data? This action cannot be undone. All your resume data, personal information, and account history will be permanently removed from our servers."
        confirmText="Yes, Delete My Account"
        cancelText="Cancel"
        danger={true}
        isLoading={deleting}
      />
    </>
  );
}