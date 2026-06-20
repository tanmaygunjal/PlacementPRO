import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Building2, Briefcase, Users, FileCheck, CheckCircle2, XCircle, Search, Filter, 
  Trash2, Edit3, Plus, ArrowRight, RefreshCw, X, Download, ShieldCheck, ShieldAlert
} from 'lucide-react';

const RecruiterPortal = () => {
  const { logout } = useAuth();
  
  // Tab control
  const [activeTab, setActiveTab] = useState('profile');
  
  // Data States
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  
  // Loading & Message States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form States - Company
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState(null);

  // Form States - Job (Modal)
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null); // null means create mode
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobSalary, setJobSalary] = useState('');
  const [jobExperience, setJobExperience] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobRequirements, setJobRequirements] = useState('');
  const [jobDeadline, setJobDeadline] = useState('');
  const [jobCtc, setJobCtc] = useState('');
  const [jobEligibilityCgpa, setJobEligibilityCgpa] = useState('');

  // Confirmation Delete Modals
  const [confirmDeleteJob, setConfirmDeleteJob] = useState(null);

  // Fetch company details
  const fetchCompanyDetails = async () => {
    try {
      const res = await api.get('/jobs/companies/my');
      setCompany(res.data);
      
      // Seed company form
      setCompanyName(res.data.company_name);
      setWebsite(res.data.website || '');
      setIndustry(res.data.industry || '');
      setDescription(res.data.description || '');
      
      return res.data;
    } catch (err) {
      console.error("Error fetching company details:", err);
      setErrorMessage("Failed to load recruiter company profile.");
      return null;
    }
  };

  // Fetch jobs for this company
  const fetchCompanyJobs = async (companyId) => {
    if (!companyId) return;
    try {
      const res = await api.get(`/jobs?active_only=false&company_id=${companyId}`);
      setJobs(res.data);
    } catch (err) {
      console.error("Error fetching company jobs:", err);
    }
  };

  // Load all dashboard components
  const loadPortalData = async () => {
    setLoading(true);
    setErrorMessage('');
    const co = await fetchCompanyDetails();
    if (co) {
      await fetchCompanyJobs(co.id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Fetch applicants for selected job vacancy
  const handleViewApplicants = async (job) => {
    setSelectedJob(job);
    setActiveTab('applicants');
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get(`/applications/job/${job.id}`);
      setApplicants(res.data);
    } catch (err) {
      console.error("Error fetching applicants:", err);
      setErrorMessage("Could not load candidate list.");
    } finally {
      setLoading(false);
    }
  };

  // Tab switcher
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
    if (tab === 'jobs' && company) {
      fetchCompanyJobs(company.id);
    }
  };

  // Update Company Profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await api.put('/jobs/companies/my', {
        company_name: companyName,
        website: website,
        industry: industry,
        logo_url: company.logo_url,
        description: description
      });
      setCompany(res.data);
      setSuccessMessage("Company profile updated successfully.");
    } catch (err) {
      console.error("Error updating profile:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to update company profile.");
    } finally {
      setActionLoading(false);
    }
  };

  // Upload Company Logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/jobs/companies/my/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setCompany(res.data);
      setSuccessMessage("Company logo uploaded successfully.");
    } catch (err) {
      console.error("Logo upload error:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to upload company logo.");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Job Modal in Create/Edit modes
  const handleOpenJobModal = (job = null) => {
    setEditingJob(job);
    if (job) {
      setJobTitle(job.title);
      setJobCategory(job.category || '');
      setJobLocation(job.location || '');
      setJobSalary(job.salary || '');
      setJobExperience(job.experience || '');
      setJobDescription(job.description);
      setJobRequirements(job.requirements || '');
      // Format datetime-local format from response
      const dt = new Date(job.deadline);
      const formattedDt = dt.toISOString().slice(0, 16);
      setJobDeadline(formattedDt);
      setJobCtc(job.ctc || '');
      setJobEligibilityCgpa(job.eligibility_cgpa || '');
    } else {
      setJobTitle('');
      setJobCategory('');
      setJobLocation('');
      setJobSalary('');
      setJobExperience('');
      setJobDescription('');
      setJobRequirements('');
      setJobDeadline('');
      setJobCtc('');
      setJobEligibilityCgpa('');
    }
    setShowJobModal(true);
  };

  // Submit Job Creation/Modification
  const handleSubmitJob = async (e) => {
    e.preventDefault();
    if (!company) {
      setErrorMessage("Company profile required before posting jobs.");
      return;
    }
    if (!company.is_approved) {
      setErrorMessage("Your company profile must be approved by the platform Administrator before posting jobs.");
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      company_id: company.id,
      title: jobTitle,
      category: jobCategory || null,
      location: jobLocation || null,
      salary: jobSalary || null,
      experience: jobExperience || null,
      description: jobDescription,
      requirements: jobRequirements || null,
      deadline: new Date(jobDeadline).toISOString(),
      ctc: jobCtc ? parseFloat(jobCtc) : null,
      eligibility_cgpa: jobEligibilityCgpa ? parseFloat(jobEligibilityCgpa) : 0.0
    };

    try {
      if (editingJob) {
        await api.put(`/jobs/${editingJob.id}`, payload);
        setSuccessMessage("Job vacancy listing modified successfully.");
      } else {
        await api.post('/jobs', payload);
        setSuccessMessage("New job vacancy posted successfully.");
      }
      setShowJobModal(false);
      await fetchCompanyJobs(company.id);
    } catch (err) {
      console.error("Job submit error:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to submit job listing.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Job posting
  const handleDeleteJob = async () => {
    if (!confirmDeleteJob) return;
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.delete(`/jobs/${confirmDeleteJob.id}`);
      setSuccessMessage("Job vacancy successfully removed.");
      setConfirmDeleteJob(null);
      await fetchCompanyJobs(company.id);
    } catch (err) {
      console.error("Job deletion error:", err);
      setErrorMessage(err.response?.data?.detail || "Failed to delete job listing.");
    } finally {
      setActionLoading(false);
    }
  };

  // Change Application status
  const handleUpdateApplicantStatus = async (appId, newStatus) => {
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await api.put(`/applications/${appId}/status`, { status: newStatus });
      setSuccessMessage(`Candidate application updated to '${newStatus}'.`);
      // Re-fetch applicants list
      if (selectedJob) {
        const res = await api.get(`/applications/job/${selectedJob.id}`);
        setApplicants(res.data);
      }
    } catch (err) {
      console.error("Update status error:", err);
      setErrorMessage("Failed to update candidate application state.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md shadow-purple-500/20">
              P
            </div>
            <div>
              <span className="font-extrabold text-white text-xl tracking-tight">Placement<span className="text-purple-400">PRO</span></span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {company && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">{company.company_name}</p>
                <p className="text-xs text-slate-400">Recruiter Space</p>
              </div>
            )}
            
            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

            <span className="px-3 py-1 text-xs font-bold uppercase rounded-lg border tracking-wider bg-indigo-500/10 border-indigo-500/30 text-indigo-400">
              recruiter
            </span>

            <button
              onClick={logout}
              className="px-4 py-2 bg-slate-800 hover:bg-red-950/20 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700/60 hover:border-red-500/30 cursor-pointer transition-all hover:scale-105 text-xs font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Portal Info & Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Recruiter Management Workspace</h1>
            <p className="text-slate-400 text-sm mt-1">Configure company profiles, post job vacancies, and manage student applications.</p>
          </div>
          
          <button 
            onClick={loadPortalData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:bg-slate-900 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer select-none transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Workspace</span>
          </button>
        </div>

        {/* Company Status alert banner */}
        {company && !company.is_approved && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-4.5 rounded-2xl mb-8 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Verification Pending</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Your recruiter company account is currently pending platform approval by the Administrator. 
                You can configure your details and prepare profile info, but posting new job listings is restricted until approved.
              </p>
            </div>
          </div>
        )}

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl flex items-center justify-between text-sm">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-red-500/20 rounded-lg text-red-400"><X className="w-4 h-4" /></button>
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl flex items-center justify-between text-sm">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-green-500/20 rounded-lg text-green-400"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mb-8 overflow-x-auto gap-2">
          {[
            { id: 'profile', label: 'Company Profile', icon: Building2 },
            { id: 'jobs', label: 'My Job Openings', icon: Briefcase },
            { id: 'applicants', label: 'Candidate Applicants', icon: Users, disabled: !selectedJob }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && handleTabChange(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center gap-2 px-4 py-3.5 border-b-2 font-bold text-sm tracking-tight transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  active 
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
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
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-sm font-semibold animate-pulse">Loading recruiter files...</p>
          </div>
        ) : (
          <div className="transition-all duration-300">
            
            {/* TAB 1: COMPANY PROFILE */}
            {activeTab === 'profile' && company && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Logo Settings */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm lg:col-span-1 flex flex-col items-center justify-center text-center">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Company Branding</h3>
                  
                  <div className="w-28 h-28 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center p-3 overflow-hidden shadow-inner mb-4">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-12 h-12 text-slate-650" />
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-4">Accepts PNG, JPG, JPEG, or WEBP up to 5MB.</p>
                  
                  <label className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-indigo-400 text-xs font-extrabold uppercase rounded-xl cursor-pointer transition-all">
                    <span>Choose Logo File</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      disabled={actionLoading}
                      className="hidden" 
                    />
                  </label>
                </div>

                {/* Company details form */}
                <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm lg:col-span-2">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Profile Settings</h3>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Company Name</label>
                      <input 
                        type="text" 
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-sm focus:outline-none text-slate-100 placeholder-slate-700 focus:ring-1 focus:ring-indigo-500/25"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Website URL</label>
                        <input 
                          type="url" 
                          placeholder="https://example.com"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Industry</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Technology, Finance, Health"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
                      <textarea 
                        rows="4"
                        placeholder="Brief summary of company business model, values, and operations..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-sm focus:outline-none text-slate-100 placeholder-slate-700 resize-none"
                      />
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-slate-800/40">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase rounded-xl cursor-pointer shadow-md shadow-indigo-500/10 disabled:opacity-50 select-none"
                      >
                        Save Company Info
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: JOB VACANCIES */}
            {activeTab === 'jobs' && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Active Job Vacancies</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Post new job openings or modify descriptions for existing job postings.</p>
                  </div>
                  
                  <button
                    disabled={company && !company.is_approved}
                    onClick={() => handleOpenJobModal()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-650 text-white font-extrabold uppercase text-[10px] rounded-xl cursor-pointer disabled:cursor-not-allowed select-none transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Job</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4.5 px-6">Job Vacancy</th>
                        <th className="py-4.5 px-6">CTC & CGPA eligibility</th>
                        <th className="py-4.5 px-6">Location & Exp</th>
                        <th className="py-4.5 px-6">Applications</th>
                        <th className="py-4.5 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {jobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-900/40">
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-100">{job.title}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">{job.category || 'Software Dev'}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-extrabold text-indigo-400">{job.salary || `${job.ctc} LPA` || 'Not specified'}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">Min CGPA: {job.eligibility_cgpa ? job.eligibility_cgpa.toFixed(1) : '0.0'}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-semibold text-slate-200">{job.location || 'Remote'}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">Exp: {job.experience || 'Freshers'}</p>
                          </td>
                          <td className="py-4 px-6">
                            <button
                              onClick={() => handleViewApplicants(job)}
                              className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 font-bold rounded-lg text-[10px] uppercase flex items-center gap-1 hover:text-white cursor-pointer select-none transition-all"
                            >
                              <span>View Candidates</span>
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenJobModal(job)}
                                className="p-2 bg-slate-950 border border-slate-850 text-indigo-400 hover:text-indigo-300 rounded-xl cursor-pointer transition-all hover:scale-105"
                                title="Edit vacancy details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteJob(job)}
                                className="p-2 bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl cursor-pointer transition-all hover:scale-105"
                                title="Remove job vacancy"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {jobs.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-10 text-slate-500 italic">
                            No job vacancies posted yet. Click 'Create Job' to post one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: CANDIDATE APPLICANTS */}
            {activeTab === 'applicants' && selectedJob && (
              <div className="space-y-6">
                
                {/* Back to jobs card */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl flex items-center justify-between backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                      <Briefcase className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Showing candidates for</p>
                      <h3 className="text-sm font-extrabold text-white">{selectedJob.title}</h3>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleTabChange('jobs')}
                    className="px-4 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  >
                    Back to Listings
                  </button>
                </div>

                {/* Table lists */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Application Management</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Evaluate candidates: download resumes and shortlist/reject/select student submissions.</p>
                    </div>
                    <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-xl text-xs font-bold">
                      {applicants.length} Total Applicants
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-4.5 px-6">Student Name</th>
                          <th className="py-4.5 px-6">College / Major</th>
                          <th className="py-4.5 px-6">CGPA & Resume</th>
                          <th className="py-4.5 px-6">Status Badge</th>
                          <th className="py-4.5 px-6 text-center">Action Decisions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {applicants.map(app => {
                          const student = app.student || {};
                          return (
                            <tr key={app.id} className="hover:bg-slate-900/40">
                              <td className="py-4 px-6">
                                <p className="font-bold text-slate-100">{student.name || 'Anonymous'}</p>
                                <p className="text-slate-500 text-[10px] mt-0.5">{student.email}</p>
                              </td>
                              <td className="py-4 px-6">
                                <p className="font-semibold text-slate-200 truncate max-w-[180px]" title={student.college}>{student.college || 'N/A'}</p>
                                <p className="text-slate-500 text-[10px] mt-0.5 truncate max-w-[180px]" title={student.branch}>{student.branch || 'N/A'}</p>
                              </td>
                              <td className="py-4 px-6">
                                <p className="font-black text-slate-100">CGPA: {student.cgpa ? student.cgpa.toFixed(2) : 'N/A'}</p>
                                {student.resume_url ? (
                                  <a 
                                    href={student.resume_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-0.5 mt-0.5"
                                  >
                                    <Download className="w-3 h-3" /> Download Resume
                                  </a>
                                ) : (
                                  <p className="text-slate-600 italic mt-0.5">No resume uploaded</p>
                                )}
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
                              <td className="py-4 px-6 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    disabled={app.status === 'shortlisted'}
                                    onClick={() => handleUpdateApplicantStatus(app.id, 'shortlisted')}
                                    className="px-2.5 py-1.5 bg-blue-950/20 hover:bg-blue-900/40 disabled:bg-slate-900 border border-blue-500/20 disabled:border-slate-800 disabled:text-slate-600 text-blue-400 hover:text-blue-300 rounded-lg text-[10px] font-bold uppercase cursor-pointer disabled:cursor-not-allowed select-none transition-all"
                                  >
                                    Shortlist
                                  </button>
                                  <button
                                    disabled={app.status === 'offered'}
                                    onClick={() => handleUpdateApplicantStatus(app.id, 'offered')}
                                    className="px-2.5 py-1.5 bg-green-950/20 hover:bg-green-900/40 disabled:bg-slate-900 border border-green-500/20 disabled:border-slate-800 disabled:text-slate-600 text-green-400 hover:text-green-300 rounded-lg text-[10px] font-bold uppercase cursor-pointer disabled:cursor-not-allowed select-none transition-all"
                                  >
                                    Select
                                  </button>
                                  <button
                                    disabled={app.status === 'rejected'}
                                    onClick={() => handleUpdateApplicantStatus(app.id, 'rejected')}
                                    className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-900/40 disabled:bg-slate-900 border border-red-500/20 disabled:border-slate-800 disabled:text-slate-600 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-bold uppercase cursor-pointer disabled:cursor-not-allowed select-none transition-all"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {applicants.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-10 text-slate-500 italic">
                              No students have applied for this job listing yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* JOB CREATION / MODIFICATION MODAL */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-2xl w-full my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h4 className="text-lg font-bold text-white">
                {editingJob ? 'Edit Vacancy Listing' : 'Post New Job Vacancy'}
              </h4>
              <button 
                onClick={() => setShowJobModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Job Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Software Development, Cloud & DevOps"
                    value={jobCategory}
                    onChange={(e) => setJobCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bangalore (Hybrid)"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Experience Required</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Freshers, 0-2 Years"
                    value={jobExperience}
                    onChange={(e) => setJobExperience(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Salary Range</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 15 LPA, Competitive"
                    value={jobSalary}
                    onChange={(e) => setJobSalary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">CTC (Numeric, in LPA)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="e.g. 15.0"
                    value={jobCtc}
                    onChange={(e) => setJobCtc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Min Eligibility CGPA</label>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0.0"
                    max="10.0"
                    placeholder="e.g. 7.5"
                    value={jobEligibilityCgpa}
                    onChange={(e) => setJobEligibilityCgpa(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Application Deadline</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={jobDeadline}
                    onChange={(e) => setJobDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-xs focus:outline-none text-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Job Description</label>
                <textarea 
                  rows="3"
                  required
                  placeholder="Key responsibilities and engineering role overview..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Requirements & Skills</label>
                <textarea 
                  rows="3"
                  placeholder="e.g. Python, SQL, Git. Docker knowledge is a plus. Strong DSA skills..."
                  value={jobRequirements}
                  onChange={(e) => setJobRequirements(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-sm focus:outline-none text-slate-100 placeholder-slate-700 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 border border-slate-700 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase rounded-xl text-xs cursor-pointer disabled:opacity-50 select-none shadow-md shadow-indigo-500/10"
                >
                  {editingJob ? 'Modify Job Vacancy' : 'Post Listing'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE JOB MODAL */}
      {confirmDeleteJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5" />
              <span>Delete Job Vacancy?</span>
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Are you sure you want to delete the job vacancy <span className="text-white font-bold">"{confirmDeleteJob.title}"</span>? 
              This will remove the job vacancy listing and delete all associated candidate student applications permanently. This action is irreversible.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteJob(null)}
                className="px-4 py-2 border border-slate-700 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteJob}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-650 hover:bg-red-500 text-white font-bold rounded-xl text-xs cursor-pointer select-none disabled:opacity-50"
              >
                Delete listing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecruiterPortal;
