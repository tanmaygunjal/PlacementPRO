import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Sparkles, ShieldCheck, ShieldAlert, Award, FileText, 
  Lightbulb, AlertCircle, RefreshCw, ChevronRight, X, ArrowRight, Building2, MapPin
} from 'lucide-react';

const ResumeAnalyzerPage = () => {
  const { user } = useAuth();
  
  // Data States
  const [analysis, setAnalysis] = useState(null);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  
  // Interface States
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchAnalysisData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get('/resume-analyzer/latest');
      setAnalysis(res.data);
      // Fetch matching jobs based on extracted skills
      if (res.data.extracted_skills?.length > 0) {
        fetchRecommendedJobs(res.data.extracted_skills);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setAnalysis(null);
      } else if (err.response?.status === 425) {
        // Resume changed since last analysis
        setAnalysis(null);
        setErrorMessage("A new resume has been uploaded since your last analysis. Please run a fresh AI scan.");
      } else {
        console.error("Error loading resume analysis:", err);
        setErrorMessage("Failed to load resume analysis. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedJobs = async (skills) => {
    try {
      // Get all active jobs and filter down based on skills overlap
      const res = await api.get('/jobs?active_only=true');
      const jobs = res.data;
      const scoredJobs = jobs.map(job => {
        const reqStr = (job.requirements || '').toLowerCase();
        const titleStr = (job.title || '').toLowerCase();
        let matches = 0;
        skills.forEach(skill => {
          if (reqStr.includes(skill.toLowerCase()) || titleStr.includes(skill.toLowerCase())) {
            matches++;
          }
        });
        return { ...job, matchCount: matches };
      });
      // Sort jobs with higher skill match first
      const matched = scoredJobs
        .filter(j => j.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount);
      setRecommendedJobs(matched);
    } catch (err) {
      console.error("Error loading recommendations:", err);
    }
  };

  useEffect(() => {
    if (user?.student_profile?.resume_url) {
      fetchAnalysisData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleRunAnalysis = async () => {
    setScanning(true);
    setScanStep(1);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Simulate multi-step analysis workflow visually
    const stepInterval = setInterval(() => {
      setScanStep(prev => {
        if (prev < 3) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 1500);

    try {
      const res = await api.post('/resume-analyzer/analyze');
      setAnalysis(res.data);
      setSuccessMessage("AI Resume Scanned successfully!");
      if (res.data.extracted_skills?.length > 0) {
        await fetchRecommendedJobs(res.data.extracted_skills);
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setErrorMessage(err.response?.data?.detail || "AI Scanning execution failed. Please verify your file format.");
    } finally {
      clearInterval(stepInterval);
      setScanning(false);
      setScanStep(0);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', gradient: 'url(#emeraldGrad)', color: '#34d399' };
    if (score >= 60) return { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10', gradient: 'url(#amberGrad)', color: '#fbbf24' };
    return { text: 'text-rose-450', border: 'border-rose-500/20', bg: 'bg-rose-500/10', gradient: 'url(#roseGrad)', color: '#f43f5e' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Loading Analyzer Profile...</p>
      </div>
    );
  }

  const hasResume = !!user?.student_profile?.resume_url;
  const scoreStyle = analysis ? getScoreColor(analysis.ats_score) : null;

  return (
    <div className="space-y-8">
      
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>AI Resume Advisor</span>
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">Optimize your credentials for applicant tracking systems using OpenAI grader intelligence.</p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-350 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl flex items-center justify-between text-xs">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* SCANNING STATE LAYOUT */}
      {scanning && (
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl flex flex-col items-center justify-center text-center backdrop-blur-sm min-h-[300px] transition-all">
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <FileText className="w-8 h-8 text-purple-400 animate-pulse" />
          </div>
          
          <h3 className="font-extrabold text-white text-base">Running AI ATS Scanner</h3>
          <p className="text-slate-500 text-xs mt-1.5 max-w-sm">This takes up to 15 seconds. Please don't close the dashboard page.</p>

          <div className="mt-6 space-y-2.5 max-w-xs w-full text-left bg-slate-950/65 p-4 border border-slate-850 rounded-2xl">
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${scanStep >= 1 ? 'bg-purple-500 animate-ping' : 'bg-slate-800'}`} />
              <span className={scanStep >= 1 ? 'text-slate-200 font-bold' : 'text-slate-500'}>Step 1: Extracting PDF text elements</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${scanStep >= 2 ? 'bg-purple-500 animate-ping' : 'bg-slate-800'}`} />
              <span className={scanStep >= 2 ? 'text-slate-200 font-bold' : 'text-slate-500'}>Step 2: Checking keywords & formatting</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${scanStep >= 3 ? 'bg-purple-500 animate-ping' : 'bg-slate-800'}`} />
              <span className={scanStep >= 3 ? 'text-slate-200 font-bold' : 'text-slate-500'}>Step 3: Generating advice from AI model</span>
            </div>
          </div>
        </div>
      )}

      {/* INITIAL & RESULTS STATE */}
      {!scanning && (
        <div className="space-y-8">
          
          {/* Status Box */}
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center shrink-0 text-slate-400">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Active Resume Status</h3>
                {hasResume ? (
                  <div className="mt-1">
                    <a 
                      href={user.student_profile.resume_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline block max-w-sm truncate"
                    >
                      {user.student_profile.resume_url.split('/').pop()}
                    </a>
                    {analysis && (
                      <p className="text-[10px] text-slate-500 mt-0.5">Scanned on {new Date(analysis.created_at).toLocaleDateString()}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">No resume file uploaded to your profile yet.</p>
                )}
              </div>
            </div>

            <div>
              {hasResume ? (
                <button
                  onClick={handleRunAnalysis}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-550 text-white font-extrabold text-xs uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/10 transition-all w-full md:w-auto justify-center"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{analysis ? 'Rescan Resume' : 'Analyze Now'}</span>
                </button>
              ) : (
                <button
                  disabled
                  className="px-5 py-3 bg-slate-900 border border-slate-850 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed w-full md:w-auto"
                >
                  Upload Resume First
                </button>
              )}
            </div>
          </div>

          {/* ANALYSIS PRESENTATION CARDS */}
          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* ATS SCORE & SUGGESTIONS */}
              <div className="space-y-8 lg:col-span-1">
                
                {/* Circular Score Gauge */}
                <div className={`bg-slate-900/60 border ${scoreStyle.border} p-6 rounded-3xl text-center flex flex-col items-center justify-center relative`}>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest self-start mb-6">ATS Match Rating</h3>
                  
                  <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="rgba(30, 41, 59, 0.8)" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        stroke={scoreStyle.gradient}
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * analysis.ats_score) / 100}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#be123c" />
                        </linearGradient>
                      </defs>
                    </svg>
                    
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-black text-white">{analysis.ats_score}%</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${scoreStyle.text}`}>
                        {analysis.ats_score >= 80 ? 'Optimal' : analysis.ats_score >= 60 ? 'Average' : 'Needs Work'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 mt-2 max-w-[210px] leading-relaxed">
                    {analysis.ats_score >= 80 
                      ? "Excellent alignment with hiring specifications! Recommended to apply."
                      : "Consider tailoring skills or format settings before sending to major employers."}
                  </p>
                </div>

                {/* Extracted & Missing Skills */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-5">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Extracted Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.extracted_skills?.map((s, idx) => (
                        <span key={idx} className="bg-slate-950 text-slate-350 border border-slate-850 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                          {s}
                        </span>
                      ))}
                      {(!analysis.extracted_skills || analysis.extracted_skills.length === 0) && (
                        <span className="text-slate-550 italic text-[11px]">No skills extracted.</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-850">
                    <h4 className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wider mb-3">Missing Industry Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.missing_skills?.map((s, idx) => (
                        <span key={idx} className="bg-amber-500/5 text-amber-300/80 border border-amber-500/10 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                          + {s}
                        </span>
                      ))}
                      {(!analysis.missing_skills || analysis.missing_skills.length === 0) && (
                        <span className="text-slate-550 italic text-[11px]">None identified.</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* STRENGTHS, WEAKNESSES, SUGGESTIONS & RECOMMENDED JOBS */}
              <div className="space-y-8 lg:col-span-2">
                
                {/* Strengths and Weaknesses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Strengths */}
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Key Resume Strengths</span>
                    </h3>
                    <ul className="space-y-2.5 text-xs text-emerald-300/80 leading-relaxed">
                      {analysis.strengths?.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-extrabold select-none">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-3xl">
                    <h3 className="text-xs font-bold text-rose-450 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Identified Gaps</span>
                    </h3>
                    <ul className="space-y-2.5 text-xs text-rose-350/80 leading-relaxed">
                      {analysis.weaknesses?.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-rose-450 font-extrabold select-none">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Suggestions List */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <span>ATS Improvements & Advice</span>
                  </h3>
                  <div className="space-y-3 text-xs leading-relaxed">
                    {analysis.improvement_suggestions?.map((item, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl flex items-start gap-3">
                        <span className="bg-purple-500/10 text-purple-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]">{idx + 1}</span>
                        <p className="text-slate-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Jobs */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span>Recommended Opportunities (Skill Matches)</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {recommendedJobs.slice(0, 3).map(job => (
                      <div key={job.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div>
                          <h4 className="font-extrabold text-white text-sm">{job.title}</h4>
                          <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{job.company?.company_name}</span>
                            <span className="text-slate-650">•</span>
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{job.location || 'Remote'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1.5 rounded-xl font-bold uppercase text-[9px]">
                          <span>{job.matchCount} Skill Matches</span>
                        </div>
                      </div>
                    ))}
                    {recommendedJobs.length === 0 && (
                      <div className="text-center py-6 text-slate-500 italic text-xs">
                        No jobs matched your extracted resume skills list directly yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* INITIAL STATE NO ANALYSIS */}
          {!analysis && (
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl text-center backdrop-blur-sm max-w-lg mx-auto py-12 space-y-4">
              <div className="w-14 h-14 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="font-black text-white text-base">Grade Your Resume Content</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                Upload your resume PDF and analyze it to calculate your match index, identify technical skill deficits, and receive advice tailored for your profile.
              </p>
              
              <div className="pt-2">
                {hasResume ? (
                  <button
                    onClick={handleRunAnalysis}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-xs uppercase rounded-xl flex items-center gap-2 mx-auto cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    <span>Run AI Analysis</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-rose-450 font-bold">Please upload a resume file in the Profile tab first.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default ResumeAnalyzerPage;
