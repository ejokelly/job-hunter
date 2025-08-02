'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import ActionButton from '@/components/ActionButton';

interface SkillGapReport {
  missingSkills: string[];
  matchingSkills: string[];
}

interface PreviewData {
  html: string;
  data: any;
  jobDetails: {
    title: string;
    company: string;
  };
}

export default function Home() {
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isRegeneratingResume, setIsRegeneratingResume] = useState(false);
  const [isRegeneratingCoverLetter, setIsRegeneratingCoverLetter] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [coverLetterData, setCoverLetterData] = useState<PreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [skillGapReport, setSkillGapReport] = useState<SkillGapReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const report = await response.json();
        setSkillGapReport(report);
      }
    } catch (error) {
      console.error('Error analyzing skills:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSkill = async (skill: string) => {
    // Optimistically update the UI immediately
    if (skillGapReport) {
      setSkillGapReport({
        ...skillGapReport,
        missingSkills: skillGapReport.missingSkills.filter(s => s !== skill),
        matchingSkills: [...(skillGapReport.matchingSkills || []), skill]
      });
    }

    // Make API call in background
    try {
      const response = await fetch('/api/add-skill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skill }),
      });

      if (!response.ok) {
        // Revert on error
        if (skillGapReport) {
          setSkillGapReport({
            ...skillGapReport,
            missingSkills: [...skillGapReport.missingSkills, skill],
            matchingSkills: skillGapReport.matchingSkills.filter(s => s !== skill)
          });
        }
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      // Revert on error
      if (skillGapReport) {
        setSkillGapReport({
          ...skillGapReport,
          missingSkills: [...skillGapReport.missingSkills, skill],
          matchingSkills: skillGapReport.matchingSkills.filter(s => s !== skill)
        });
      }
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) return;
    
    setIsGenerating(true);
    try {
      // Generate both resume and cover letter previews in parallel
      const [resumeResponse, coverLetterResponse] = await Promise.all([
        fetch('/api/preview-resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobDescription }),
        }),
        fetch('/api/preview-cover-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobDescription }),
        })
      ]);

      if (resumeResponse.ok && coverLetterResponse.ok) {
        const resumeResult = await resumeResponse.json();
        const coverLetterResult = await coverLetterResponse.json();
        setPreviewData(resumeResult);
        setCoverLetterData(coverLetterResult);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!jobDescription.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating resume:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCoverLetter = async () => {
    if (!jobDescription.trim()) return;
    
    setIsGeneratingCoverLetter(true);
    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'cover-letter.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleRegenerateResume = async () => {
    if (!jobDescription.trim()) return;
    
    setIsRegeneratingResume(true);
    try {
      const response = await fetch('/api/preview-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewData(result);
      }
    } catch (error) {
      console.error('Error regenerating resume:', error);
    } finally {
      setIsRegeneratingResume(false);
    }
  };

  const handleRegenerateCoverLetter = async () => {
    if (!jobDescription.trim()) return;
    
    setIsRegeneratingCoverLetter(true);
    try {
      const response = await fetch('/api/preview-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobDescription }),
      });

      if (response.ok) {
        const result = await response.json();
        setCoverLetterData(result);
      }
    } catch (error) {
      console.error('Error regenerating cover letter:', error);
    } finally {
      setIsRegeneratingCoverLetter(false);
    }
  };

  const handleBack = () => {
    setShowPreview(false);
    setPreviewData(null);
    setCoverLetterData(null);
    setShowForm(false);
    setJobDescription('');
    setSkillGapReport(null);
    setIsAnalyzing(false);
    setIsGenerating(false);
    setIsGeneratingCoverLetter(false);
    setIsRegeneratingResume(false);
    setIsRegeneratingCoverLetter(false);
  };

  if (!showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <FileText className="w-16 h-16 mx-auto mb-6 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Job Hunter</h1>
            <p className="text-gray-600 mb-8">
              Create tailored resumes and cover letters using AI that match job descriptions perfectly.
            </p>
            <ActionButton
              onClick={() => setShowForm(true)}
              variant="primary"
              className="w-full py-3 px-6 justify-center"
            >
              Start New Application
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  // Show preview if generating or preview is available
  if (showPreview || isGenerating) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <ActionButton 
                onClick={handleBack}
                variant="ghost"
                className="gap-2"
              >
                ← Back
              </ActionButton>
              <h1 className="text-xl font-semibold text-gray-900">Document Preview</h1>
            </div>
            <div className="flex gap-4">
              <ActionButton
                onClick={handleGenerate}
                variant="ghost"
                busy={isGenerating}
              >
                Regenerate
              </ActionButton>
              <div className="border-l border-gray-300 mx-2" />
              <ActionButton
                onClick={handleDownloadResume}
                variant="primary"
                busy={isGenerating}
                disabled={!previewData}
              >
                Download Resume
              </ActionButton>
              <ActionButton
                onClick={handleDownloadCoverLetter}
                variant="secondary"
                busy={isGeneratingCoverLetter || (isGenerating && !coverLetterData)}
                disabled={!coverLetterData}
              >
                Download Cover Letter
              </ActionButton>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="max-w-7xl mx-auto p-6">
          {isGenerating && (!previewData || !coverLetterData) ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Resume Loading Pane */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="text-sm font-semibold text-gray-700">Resume</h3>
                </div>
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Generating resume...</p>
                  </div>
                </div>
              </div>
              
              {/* Cover Letter Loading Pane */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="text-sm font-semibold text-gray-700">Cover Letter</h3>
                </div>
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Generating cover letter...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : previewData && coverLetterData ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Resume Preview */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Resume</h3>
                  <ActionButton
                    onClick={handleRegenerateResume}
                    variant="ghost"
                    busy={isRegeneratingResume}
                    className="text-xs py-1 px-2"
                  >
                    Regenerate
                  </ActionButton>
                </div>
                <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <title>Resume Preview</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            body { 
                              font-family: 'Inter', sans-serif; 
                              margin: 0; 
                              padding: 20px;
                              background: white;
                            }
                          </style>
                        </head>
                        <body>
                          ${previewData.html}
                        </body>
                      </html>
                    `}
                    className="w-full h-screen border-0"
                    title="Resume Preview"
                  />
                </div>
              </div>
              
              {/* Cover Letter Preview */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Cover Letter</h3>
                  <ActionButton
                    onClick={handleRegenerateCoverLetter}
                    variant="ghost"
                    busy={isRegeneratingCoverLetter}
                    className="text-xs py-1 px-2"
                  >
                    Regenerate
                  </ActionButton>
                </div>
                <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <title>Cover Letter Preview</title>
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            body { 
                              font-family: 'Inter', sans-serif; 
                              margin: 0; 
                              padding: 20px;
                              background: white;
                            }
                          </style>
                        </head>
                        <body>
                          ${coverLetterData.html}
                        </body>
                      </html>
                    `}
                    className="w-full h-screen border-0"
                    title="Cover Letter Preview"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create Tailored Resume</h1>
            <ActionButton
              onClick={() => setShowForm(false)}
              variant="ghost"
            >
              ← Back
            </ActionButton>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Job Description
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={skillGapReport !== null}
                className={`w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-900 ${
                  skillGapReport ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                }`}
                placeholder="Paste the job description here..."
                spellCheck="false"
              />
            </div>

            {skillGapReport && (
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Skill Gap Analysis</h3>
                
                {skillGapReport.missingSkills && skillGapReport.missingSkills.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-red-600 mb-2">Missing Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGapReport.missingSkills.map((skill, index) => (
                        <ActionButton
                          key={index}
                          onClick={() => handleAddSkill(skill)}
                          variant="skill"
                        >
                          + {skill}
                        </ActionButton>
                      ))}
                    </div>
                  </div>
                )}

                {skillGapReport.matchingSkills && skillGapReport.matchingSkills.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-green-600 mb-2">Matching Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {skillGapReport.matchingSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {!skillGapReport ? (
                <ActionButton
                  onClick={handleAnalyze}
                  disabled={!jobDescription.trim()}
                  busy={isAnalyzing}
                  className="w-full py-3 px-6 justify-center"
                >
                  {isAnalyzing ? 'Analyzing Skills...' : 'Analyze Skill Gaps'}
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleGenerate}
                  busy={isGenerating}
                  className="w-full py-3 px-6 justify-center"
                >
                  {isGenerating ? 'Generating Preview...' : 'Generate'}
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
