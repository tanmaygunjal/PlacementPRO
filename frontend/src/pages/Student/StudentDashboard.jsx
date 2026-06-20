import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  GraduationCap, Briefcase, FileText, CheckCircle2, XCircle, Search, Filter, 
  ArrowRight, RefreshCw, X, Download, ShieldCheck, ShieldAlert, Award,
  Sparkles, Calendar, BookOpen, User, UploadCloud, MapPin, DollarSign, Clock, Globe
} from 'lucide-react';
import ExternalJobsPage from './ExternalJobsPage';
import ResumeAnalyzerPage from './ResumeAnalyzerPage';

const StudentDashboard = () => {
  const { user, refreshUser } = useAuth();
  
  // Tabs: 'dashboard', 'jobs', 'applications', 'profile'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [readiness, setReadiness] = useState(null);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  
  // AI Job Match States
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [matchError, setMatchError] = useState('');

  const handleOpenJobDetails = (job) => {
    setMatchResult(null);
    setMatchLoading(false);
    setMatchError('');
    setSelectedJob(job);
  };

  const handleCheckMatchScore = async () => {
    if (!selectedJob) return;
    setMatchLoading(true);
    setMatchError('');
    try {
      const res = await api.post('/resume-analyzer/match-job', { job_id: selectedJob.id });
      setMatchResult(res.data);
    } catch (err) {
      console.error("Match error:", err);
      setMatchError(err.response?.data?.detail || "AI Match query failed.");
    } finally {
      setMatchLoading(false);
    }
  };
  
  // Loading & Message States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [cgpaEligibleOnly, setCgpaEligibleOnly] = useState(false);
  const [ctcFilter, setCtcFilter] = useState('');
  
  // Form States - Student Profile
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [skills, setSkills] = useState('');

  // Fetch Dashboard Home Data
  const fetchDashboardData = async () => {
    try {
      const readinessRes = await api.get('/students/readiness');
      setReadiness(readinessRes.data);
      
      const recRes = await api.get('/students/recommended-jobs');
      setRecommendedJobs(recRes.data);
      
      const appsRes = await api.get('/applications/my');
      setApplications(appsRes.data);
    } catch (err) {
      console.error("Error loading student dashboard data:", err);
    }
  };

  // Fetch Jobs List
  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs?active_only=true');
      setAllJobs(res.data);
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
  };

  // Load Initial Workspace Data
  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    
    // Seed profile form states from user context
    if (user && user.student_profile) {
      setCollege(user.student_profile.college || '');
      setBranch(user.student_profile.branch || '');
      setGraduationYear(user.student_profile.graduation_year || '');
      setCgpa(user.student_profile.cgpa || '');
      setSkills(user.student_profile.skills || '');
    }
    
    await fetchDashboardData();
    await fetchJobs();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Tab control
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
    if (tab === 'dashboard') {
      fetchDashboardData();
    } else if (tab === 'jobs') {
      fetchJobs();
    } else if (tab === 'applications') {
      api.get('/applications/my').then(res => setApplications(res.data));
    }
  };

  // Update Student Profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.put('/students/profile', {
        college: college || null,
        branch: branch || null,
        graduation_year: graduationYear ? parseInt(graduationYear) : null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        skills: skills || null,
        resume_url: user.student_profile?.resume_url || null
      });
      
      // Update global context profile state
      await refreshUser();
      setSuccessMessage("Your profile information has been successfully updated.");
    } catch (err) {
      console.error("Profile update error:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setActionLoading(false);
    }
  };

  // Upload Resume File
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Client-side validations
    if (file.type !== 'application/pdf') {
      setErrorMessage("Only PDF resumes are allowed.");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File size exceeds the limit of 5MB.");
      return;
    }
    
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await api.post('/students/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await refreshUser();
      setSuccessMessage("Resume file uploaded and parsed successfully!");
    } catch (err) {
      console.error("Resume upload error:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to upload resume file.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Application
  const handleApply = async (jobId) => {
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.post('/applications', { job_id: jobId });
      setSuccessMessage("Application submitted successfully!");
      handleOpenJobDetails(null);
      await fetchDashboardData();
      await fetchJobs();
    } catch (err) {
      console.error("Apply error:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to submit application.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Jobs list
  const filteredJobs = allJobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.company?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.requirements || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesLocation = !locationFilter || 
      (job.location || '').toLowerCase().includes(locationFilter.toLowerCase());
      
    const matchesCgpa = !cgpaEligibleOnly || 
      !job.eligibility_cgpa || 
      (user.student_profile?.cgpa && user.student_profile.cgpa >= job.eligibility_cgpa);
      
    const matchesCtc = !ctcFilter || 
      (job.ctc && job.ctc >= parseFloat(ctcFilter));
      
    return matchesSearch && matchesLocation && matchesCgpa && matchesCtc;
  });

  // Check Application Status
  const getJobApplicationStatus = (jobId) => {
    const app = applications.find(a => a.job_id === jobId);
    return app ? app.status : null;
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Message */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl flex items-center justify-between text-sm">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-red-500/20 rounded-lg text-red-400"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl flex items-center justify-between text-sm">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-green-500/20 rounded-lg text-green-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
        {[
          { id: 'dashboard', label: 'Dashboard Home', icon: Award },
          { id: 'jobs', label: 'Explore Jobs', icon: Briefcase },
          { id: 'external', label: 'External Board', icon: Globe },
          { id: 'analyzer', label: 'AI Analyzer', icon: Sparkles },
          { id: 'applications', label: 'Track Applications', icon: FileText },
          { id: 'profile', label: 'Profile & Resume', icon: User }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 border-b-2 font-bold text-sm tracking-tight transition-all ${
                active 
                  ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 cursor-pointer'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading Spinner */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-10 h-10 animate-spin text-purple-500 mb-4" />
          <p className="text-sm font-semibold animate-pulse">Synchronizing workspace files...</p>
        </div>
      ) : (
        <div className="transition-all duration-300">
          
          {/* TAB 1: DASHBOARD HOME */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Readiness circular score & missing skills */}
              <div className="space-y-8 lg:col-span-1">
                
                {/* Readiness Score Card */}
                {readiness && (
                  <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center text-center">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-1.5 self-start">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Placement Readiness</span>
                    </h3>
                    
                    {/* Ring Chart SVG */}
                    <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                      <svg className="w-full h-full transform -rotate-95" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" stroke="rgba(30, 41, 59, 0.8)" strokeWidth="8" fill="transparent" />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="42" 
                          stroke="url(#purpleGrad)" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray={263.89}
                          strokeDashoffset={263.89 - (263.89 * readiness.readiness_score) / 100}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#c084fc" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-white">{readiness.readiness_score}%</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Score</span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-200">{readiness.interview_readiness} Readiness Status</p>
                    <p className="text-[11px] text-slate-400 mt-2 max-w-[200px] leading-relaxed">
                      {readiness.readiness_score < 70 
                        ? "Upload a resume and list your branch/CGPA to boost placement opportunities." 
                        : "Excellent profile readiness! You are ready to apply for positions."}
                    </p>
                  </div>
                )}

                {/* Missing Core Skills list */}
                {readiness && readiness.missing_skills?.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                      <span>Recommended Core Skills</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">Add these core topics to your skills tag list to match recruiter query filters:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {readiness.missing_skills.map((skill, idx) => (
                        <span key={idx} className="bg-slate-950 text-slate-400 border border-slate-800 text-[10px] px-2.5 py-1 rounded-lg font-bold">
                          + {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Deadlines and Recommended Jobs list */}
              <div className="space-y-8 lg:col-span-2">
                
                {/* Upcoming Deadlines */}
                {readiness && readiness.upcoming_deadlines?.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-5 rounded-3xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                      <h4 className="text-sm font-extrabold">Application Deadlines Expiring Soon</h4>
                    </div>
                    <div className="space-y-2.5">
                      {readiness.upcoming_deadlines.map((deadline, idx) => (
                        <div key={idx} className="bg-slate-950/80 border border-slate-850 p-3.5 rounded-2xl flex items-center justify-between gap-4 text-xs">
                          <div>
                            <p className="font-bold text-slate-100">{deadline.title}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">{deadline.company_name}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-bold text-[10px]">
                              {new Date(deadline.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Jobs */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                  <div className="flex items-center justify-between mb-5 border-b border-slate-800/40 pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Matches For Your Skills</span>
                    </h3>
                    <button 
                      onClick={() => handleTabChange('jobs')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5"
                    >
                      <span>Explore all</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {recommendedJobs.slice(0, 3).map(job => {
                      const isApplied = getJobApplicationStatus(job.id);
                      return (
                        <div key={job.id} className="bg-slate-950 border border-slate-850 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center shrink-0 p-1 text-slate-400 overflow-hidden font-bold">
                              {job.company?.logo_url ? (
                                <img src={job.company.logo_url} alt="Logo" className="w-full h-full object-contain" />
                              ) : (
                                (job.company?.company_name || 'C')[0]
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-100 text-sm">{job.title}</p>
                              <p className="text-slate-500 text-xs mt-0.5">
                                {job.company?.company_name} • {job.location || 'Remote'}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <span className="text-purple-400">{job.salary || `${job.ctc} LPA`}</span>
                                <span>• CGPA: {job.eligibility_cgpa || '0.0'}+</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => { handleOpenJobDetails(job); setActiveTab('jobs'); }}
                              className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-855 text-slate-350 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                              Details
                            </button>
                            {isApplied ? (
                              <span className="px-3.5 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold rounded-xl uppercase">
                                Applied
                              </span>
                            ) : (
                              <button
                                disabled={actionLoading || !user.is_verified || (user.student_profile?.cgpa && job.eligibility_cgpa && user.student_profile.cgpa < job.eligibility_cgpa)}
                                onClick={() => handleApply(job.id)}
                                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-550 disabled:bg-slate-900 disabled:text-slate-600 disabled:border disabled:border-slate-850 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                              >
                                Apply Now
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {recommendedJobs.length === 0 && (
                      <div className="text-center py-6 text-slate-500 italic text-xs">
                        No matches found. Configure your profile skills to populate recommendations!
                      </div>
                    )}
                  </div>
                </div>

                {/* Applied Jobs quick overview list */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/40 pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>Recent Applications</span>
                    </h3>
                    <button 
                      onClick={() => handleTabChange('applications')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5"
                    >
                      <span>Track status</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    {applications.slice(0, 3).map(app => (
                      <div key={app.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{app.job?.title}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">{app.job?.company?.company_name} • Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border tracking-wider ${
                          app.status === 'applied'
                            ? 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                            : app.status === 'shortlisted'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : app.status === 'interviewing'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : app.status === 'offered'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    ))}
                    {applications.length === 0 && (
                      <div className="text-center py-6 text-slate-500 italic">
                        You have not applied for any vacancies yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: EXPLORE JOBS LIST */}
          {activeTab === 'jobs' && (
            <div className="space-y-6">
              
              {/* Search and Filters grid */}
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                
                {/* Search */}
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input 
                    type="text"
                    placeholder="Search by job title, company, skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>

                {/* Location Filter */}
                <div>
                  <input 
                    type="text"
                    placeholder="Location (e.g. Bangalore)"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 px-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>

                {/* Additional Filters dropdown and toggles */}
                <div className="flex gap-2 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="eligibleToggle"
                      checked={cgpaEligibleOnly}
                      onChange={(e) => setCgpaEligibleOnly(e.target.checked)}
                      className="rounded border-slate-800 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-slate-950 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="eligibleToggle" className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer select-none">Eligible Only</label>
                  </div>
                  
                  {/* CTC selector */}
                  <select 
                    value={ctcFilter} 
                    onChange={(e) => setCtcFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-850 text-slate-400 rounded-xl text-xs py-2 px-3 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Any CTC</option>
                    <option value="5">5+ LPA</option>
                    <option value="10">10+ LPA</option>
                    <option value="15">15+ LPA</option>
                    <option value="20">20+ LPA</option>
                  </select>
                </div>

              </div>

              {/* Jobs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map(job => {
                  const isApplied = getJobApplicationStatus(job.id);
                  const isEligible = !job.eligibility_cgpa || (user.student_profile?.cgpa && user.student_profile.cgpa >= job.eligibility_cgpa);
                  
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => handleOpenJobDetails(job)}
                      className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl flex flex-col justify-between gap-4 cursor-pointer transition-all duration-200"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="w-9 h-9 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center shrink-0 p-1 font-bold text-slate-400 overflow-hidden text-sm">
                            {job.company?.logo_url ? (
                              <img src={job.company.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                              (job.company?.company_name || 'C')[0]
                            )}
                          </div>
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border tracking-wider ${
                            isApplied
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                              : isEligible
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {isApplied ? 'Applied' : isEligible ? 'Eligible' : 'Ineligible'}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="font-extrabold text-white text-sm tracking-tight leading-snug">{job.title}</h4>
                          <p className="text-slate-400 text-xs mt-0.5">{job.company?.company_name}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {job.category && (
                            <span className="bg-slate-950 border border-slate-850 text-[10px] text-slate-450 px-2 py-0.5 rounded-md font-semibold">{job.category}</span>
                          )}
                          <span className="bg-slate-950 border border-slate-850 text-[10px] text-slate-450 px-2 py-0.5 rounded-md font-semibold flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            <span>{job.location || 'Remote'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <div>
                          <p className="text-slate-500 text-[10px] font-semibold uppercase">Salary Package</p>
                          <p className="font-extrabold text-purple-400 mt-0.5">{job.salary || `${job.ctc} LPA` || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 text-[10px] font-semibold uppercase">Min CGPA</p>
                          <p className="font-bold text-slate-200 mt-0.5">{job.eligibility_cgpa ? job.eligibility_cgpa.toFixed(1) : '0.0'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredJobs.length === 0 && (
                  <div className="col-span-full text-center py-10 text-slate-500 italic">
                    No active job vacancies match your filter settings.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2.5: EXTERNAL JOBS */}
          {activeTab === 'external' && (
            <ExternalJobsPage />
          )}

          {/* TAB 2.7: AI RESUME ANALYZER */}
          {activeTab === 'analyzer' && (
            <ResumeAnalyzerPage />
          )}

          {/* TAB 3: MY APPLICATIONS */}
          {activeTab === 'applications' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Your Job Applications</h3>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">Keep track of your applied jobs and evaluation statuses in real-time.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4.5 px-6">Applied Job</th>
                      <th className="py-4.5 px-6">Salary Package</th>
                      <th className="py-4.5 px-6">Applied Date</th>
                      <th className="py-4.5 px-6">Eligibility Score</th>
                      <th className="py-4.5 px-6">Evaluation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {applications.map(app => (
                      <tr key={app.id} className="hover:bg-slate-900/40">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-100">{app.job?.title}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">{app.job?.company?.company_name} • {app.job?.location}</p>
                        </td>
                        <td className="py-4 px-6 font-extrabold text-purple-400">
                          {app.job?.salary || `${app.job?.ctc} LPA` || 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-slate-350">
                          {new Date(app.applied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </td>
                        <td className="py-4 px-6 text-slate-350 font-bold">
                          CGPA: {user.student_profile?.cgpa ? user.student_profile.cgpa.toFixed(2) : 'N/A'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border tracking-wider inline-block ${
                            app.status === 'applied'
                              ? 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                              : app.status === 'shortlisted'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              : app.status === 'interviewing'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : app.status === 'offered'
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {applications.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-slate-550 italic font-semibold">
                          You have not submitted any applications yet. Explore openings to apply!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE & RESUME */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Resume Settings Card */}
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl lg:col-span-1 flex flex-col justify-center text-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-1.5 justify-center">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Resume Settings</span>
                </h3>
                
                <div className="bg-slate-950 border-2 border-dashed border-slate-800 hover:border-slate-700 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[160px] cursor-pointer mb-5 group transition-all">
                  <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-purple-450 mb-3 transition-colors" />
                  
                  {user.student_profile?.resume_url ? (
                    <div className="space-y-1.5 text-center">
                      <p className="text-xs font-bold text-purple-400">Resume Uploaded</p>
                      <a 
                        href={user.student_profile.resume_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[10px] text-slate-500 hover:text-slate-300 underline block max-w-[180px] truncate"
                      >
                        {user.student_profile.resume_url.split('/').pop()}
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <p className="text-xs font-bold text-slate-350">Drag file or click</p>
                      <p className="text-[10px] text-slate-500">Supports PDF up to 5MB</p>
                    </div>
                  )}
                  
                  <input 
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeUpload}
                    disabled={actionLoading}
                    className="hidden"
                    id="resumeUploadInput"
                  />
                  <label htmlFor="resumeUploadInput" className="absolute inset-0 cursor-pointer" />
                </div>
                
                {user.student_profile?.resume_url && (
                  <a
                    href={user.student_profile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center px-4 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 text-xs font-extrabold uppercase rounded-xl transition-all"
                  >
                    View Current Resume
                  </a>
                )}
              </div>

              {/* Profile Details Form */}
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl lg:col-span-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Profile Information</span>
                </h3>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Registered Name</label>
                      <input 
                        type="text" 
                        disabled
                        value={user.name || ''}
                        className="w-full bg-slate-950/60 border border-slate-850/60 rounded-xl py-2.5 px-4 text-xs text-slate-500 cursor-not-allowed outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Email Address</label>
                      <input 
                        type="email" 
                        disabled
                        value={user.email || ''}
                        className="w-full bg-slate-950/60 border border-slate-850/60 rounded-xl py-2.5 px-4 text-xs text-slate-500 cursor-not-allowed outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">University / College</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Indian Institute of Technology"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 px-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Branch / Major</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Computer Science"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 px-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Graduation Year</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 2026"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 px-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">CGPA eligibility score</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="10"
                        placeholder="e.g. 9.15"
                        value={cgpa}
                        onChange={(e) => setCgpa(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 px-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Key Skills (Comma-separated)</label>
                    <textarea 
                      rows="3"
                      placeholder="e.g. Python, SQL, React, Docker, Data Structures"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 px-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700 resize-none"
                    />
                    
                    {/* Render current skills badges */}
                    {skills && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {skills.split(',').map((skill, idx) => {
                          const trimS = skill.trim();
                          if (!trimS) return null;
                          return (
                            <span key={idx} className="bg-purple-950/40 text-purple-300 border border-purple-800/40 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                              {trimS}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-800/40">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-550 hover:to-indigo-550 text-white text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-50"
                    >
                      Save Profile details
                    </button>
                  </div>
                </form>

              </div>

            </div>
          )}

        </div>
      )}

      {/* JOB SPECIFICATION DETAIL DRAWER/MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-2xl w-full my-8 relative">
            <button 
              onClick={() => handleOpenJobDetails(null)}
              className="absolute top-6 right-6 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-start gap-4 mb-6 border-b border-slate-800 pb-5">
              <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center shrink-0 p-1 font-bold text-slate-400 overflow-hidden text-lg">
                {selectedJob.company?.logo_url ? (
                  <img src={selectedJob.company.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  (selectedJob.company?.company_name || 'C')[0]
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-black text-white">{selectedJob.title}</h3>
                <p className="text-indigo-400 font-bold text-xs mt-0.5">{selectedJob.company?.company_name}</p>
                {selectedJob.company?.website && (
                  <a href={selectedJob.company.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-slate-350 underline block mt-1">
                    Visit Website
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-xs bg-slate-950/40 p-4 border border-slate-850 rounded-2xl">
              <div>
                <p className="text-slate-550 font-bold uppercase text-[9px] tracking-wider">Salary CTC</p>
                <p className="font-extrabold text-purple-400 mt-1">{selectedJob.salary || `${selectedJob.ctc} LPA` || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-550 font-bold uppercase text-[9px] tracking-wider">Min CGPA</p>
                <p className="font-bold text-slate-200 mt-1">{selectedJob.eligibility_cgpa ? selectedJob.eligibility_cgpa.toFixed(1) : '0.0'}</p>
              </div>
              <div>
                <p className="text-slate-550 font-bold uppercase text-[9px] tracking-wider">Location</p>
                <p className="font-bold text-slate-200 mt-1 flex items-center gap-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedJob.location || 'Remote'}</span>
                </p>
              </div>
              <div>
                <p className="text-slate-550 font-bold uppercase text-[9px] tracking-wider">Deadline</p>
                <p className="font-bold text-slate-200 mt-1 flex items-center gap-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(selectedJob.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </p>
              </div>
            </div>

            {/* Description & Requirements */}
            <div className="space-y-4 mb-6 max-h-[260px] overflow-y-auto pr-1">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1.5">Job Description</h4>
                <p className="text-slate-350 text-xs leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
              </div>
              {selectedJob.requirements && (
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1.5">Key Requirements</h4>
                  <p className="text-slate-350 text-xs leading-relaxed whitespace-pre-line">{selectedJob.requirements}</p>
                </div>
              )}
              {selectedJob.company?.description && (
                <div className="pt-3 border-t border-slate-800/40">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1.5">About the Company</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{selectedJob.company.description}</p>
                </div>
              )}
            </div>

            {/* Job Match Analysis section */}
            {user.student_profile?.resume_url && (
              <div className="mb-6 p-4 bg-slate-950/60 border border-slate-850 rounded-2xl text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    <span>AI Compatibility Match</span>
                  </h4>
                  {!matchResult && !matchLoading && (
                    <button
                      onClick={handleCheckMatchScore}
                      className="text-[10px] bg-purple-650 hover:bg-purple-600 text-white font-black px-3 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Verify Alignment
                    </button>
                  )}
                </div>

                {matchLoading && (
                  <div className="flex items-center gap-2 py-1 text-slate-450 font-semibold">
                    <RefreshCw className="w-3 h-3 animate-spin text-purple-500" />
                    <span className="animate-pulse">Analyzing qualifications...</span>
                  </div>
                )}

                {matchError && (
                  <p className="text-[10px] text-rose-450">{matchError}</p>
                )}

                {matchResult && (
                  <div className="space-y-3 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center shrink-0 text-white font-extrabold text-sm shadow-md shadow-purple-500/5">
                        {matchResult.match_score}%
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">Matching Index</p>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">
                          {matchResult.match_score >= 80 ? 'High Compatibility' : matchResult.match_score >= 50 ? 'Medium Compatibility' : 'Low Compatibility'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-900/60">
                      <div>
                        <p className="text-[9px] text-emerald-450 font-bold uppercase tracking-wider mb-1">Matching Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {matchResult.matching_skills?.map((s, idx) => (
                            <span key={idx} className="bg-emerald-500/5 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded-md text-[9px] font-bold">{s}</span>
                          ))}
                          {(!matchResult.matching_skills || matchResult.matching_skills.length === 0) && <span className="text-slate-550 italic text-[10px]">None identified.</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mb-1">Missing Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {matchResult.missing_skills?.map((s, idx) => (
                            <span key={idx} className="bg-amber-500/5 text-amber-300 border border-amber-500/10 px-2 py-0.5 rounded-md text-[9px] font-bold">{s}</span>
                          ))}
                          {(!matchResult.missing_skills || matchResult.missing_skills.length === 0) && <span className="text-slate-550 italic text-[10px]">None identified.</span>}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-900/60">
                      <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mb-1">Tailoring Advice</p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10px] leading-relaxed">
                        {matchResult.tailoring_suggestions?.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-850 pt-5">
              
              {/* Eligibility indicators */}
              <div className="text-xs shrink-0 self-start sm:self-center">
                {!user.is_verified ? (
                  <p className="text-amber-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Please verify email address first.</span>
                  </p>
                ) : !user.student_profile?.resume_url ? (
                  <p className="text-amber-400 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Upload resume in Profile tab first.</span>
                  </p>
                ) : user.student_profile?.cgpa && selectedJob.eligibility_cgpa && user.student_profile.cgpa < selectedJob.eligibility_cgpa ? (
                  <p className="text-red-400 font-semibold flex items-center gap-1">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Ineligible: CGPA below requirement ({selectedJob.eligibility_cgpa.toFixed(1)}).</span>
                  </p>
                ) : (
                  <p className="text-green-450 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
                    <span className="text-green-400">You are eligible to apply.</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleOpenJobDetails(null)}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close Drawer
                </button>
                {getJobApplicationStatus(selectedJob.id) ? (
                  <span className="px-5 py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/25 text-xs font-black uppercase rounded-xl select-none">
                    Already Applied
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={actionLoading || !user.is_verified || !user.student_profile?.resume_url || (user.student_profile?.cgpa && selectedJob.eligibility_cgpa && user.student_profile.cgpa < selectedJob.eligibility_cgpa)}
                    onClick={() => handleApply(selectedJob.id)}
                    className="px-5 py-2.5 bg-purple-650 hover:bg-purple-600 disabled:bg-slate-950 disabled:text-slate-650 disabled:border disabled:border-slate-850 text-white text-xs font-black uppercase rounded-xl cursor-pointer transition-all"
                  >
                    Submit Application
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
