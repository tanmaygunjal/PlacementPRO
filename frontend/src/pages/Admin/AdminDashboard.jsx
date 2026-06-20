import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Users, Building2, Briefcase, FileCheck, CheckCircle, XCircle, Search, Filter, 
  ShieldAlert, ShieldCheck, Trash2, Award, Server, Check, ArrowRight, RefreshCw, X
} from 'lucide-react';

const AdminDashboard = () => {
  const { logout } = useAuth();
  
  // Tab control
  const [activeTab, setActiveTab] = useState('stats');
  
  // Data States
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [students, setStudents] = useState([]);
  const [jobs, setJobs] = useState([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBranch, setStudentBranch] = useState('');
  const [studentMinCgpa, setStudentMinCgpa] = useState('');
  
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatus, setJobStatus] = useState('');

  // Confirmation Modals
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(null);
  const [confirmDeleteJob, setConfirmDeleteJob] = useState(null);

  // Fetch Dashboard Stats & Analytics
  const fetchStatsAndAnalytics = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);
      
      const analyticsRes = await api.get('/admin/analytics');
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setErrorMessage("Failed to load dashboard metrics.");
    }
  };

  // Fetch Companies
  const fetchCompanies = async () => {
    try {
      const res = await api.get('/admin/companies');
      setCompanies(res.data);
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  // Fetch Students
  const fetchStudents = async () => {
    try {
      const params = {};
      if (studentBranch) params.branch = studentBranch;
      if (studentMinCgpa) params.min_cgpa = parseFloat(studentMinCgpa);
      if (studentSearch) params.search = studentSearch;
      
      const res = await api.get('/admin/students', { params });
      setStudents(res.data);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  // Fetch Jobs
  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs?active_only=false');
      setJobs(res.data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    await Promise.all([
      fetchStatsAndAnalytics(),
      fetchCompanies(),
      fetchStudents(),
      fetchJobs()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Tab Changing
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Trigger search when student filters change
  useEffect(() => {
    if (!loading && activeTab === 'students') {
      fetchStudents();
    }
  }, [studentBranch, studentMinCgpa, studentSearch]);

  // Company Approval Handler
  const handleApproveCompany = async (companyId, isApproved) => {
    setActionLoading(true);
    setErrorMessage('');
    try {
      await api.patch(`/admin/companies/${companyId}/approve`, { is_approved: isApproved });
      setSuccessMessage(`Company approval status updated successfully.`);
      await Promise.all([fetchCompanies(), fetchStatsAndAnalytics()]);
    } catch (err) {
      console.error("Approval error:", err);
      setErrorMessage("Failed to update company approval status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Student Delete Handler
  const handleDeleteStudent = async () => {
    if (!confirmDeleteStudent) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/students/${confirmDeleteStudent.id}`);
      setSuccessMessage("Student profile and associated account deleted successfully.");
      setConfirmDeleteStudent(null);
      await Promise.all([fetchStudents(), fetchStatsAndAnalytics()]);
    } catch (err) {
      console.error("Delete student error:", err);
      setErrorMessage("Failed to delete student profile.");
    } finally {
      setActionLoading(false);
    }
  };

  // Job Delete Handler (Fake Job Removal)
  const handleDeleteJob = async () => {
    if (!confirmDeleteJob) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/jobs/${confirmDeleteJob.id}`);
      setSuccessMessage("Job posting removed successfully.");
      setConfirmDeleteJob(null);
      await Promise.all([fetchJobs(), fetchStatsAndAnalytics()]);
    } catch (err) {
      console.error("Delete job error:", err);
      setErrorMessage("Failed to delete job listing.");
    } finally {
      setActionLoading(false);
    }
  };

  // Get distinct branches from student data for filters
  const getBranchOptions = () => {
    const branches = new Set(students.map(s => s.branch).filter(Boolean));
    return Array.from(branches);
  };

  // Filter Jobs in Frontend
  const getFilteredJobs = () => {
    return jobs.filter(job => {
      const matchSearch = jobSearch === '' || 
        job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
        (job.company?.company_name && job.company.company_name.toLowerCase().includes(jobSearch.toLowerCase())) ||
        (job.location && job.location.toLowerCase().includes(jobSearch.toLowerCase()));
      
      const matchStatus = jobStatus === '' || job.status === jobStatus;
      
      return matchSearch && matchStatus;
    });
  };

  // Render Visual Analytics (SVG Charts)
  const renderAnalyticsCharts = () => {
    if (!analytics) return <div className="text-slate-500 py-10 text-center">No analytics data available.</div>;

    const { application_statuses, branch_registrations } = analytics;
    
    // Circumference for Donut Chart (Radius = 40)
    const radius = 40;
    const circ = 2 * Math.PI * radius;
    
    const totalApps = application_statuses.reduce((sum, item) => sum + item.count, 0);
    
    // Status colors
    const colors = {
      applied: '#e2e8f0', // slate-200
      shortlisted: '#60a5fa', // blue-400
      interviewing: '#fbbf24', // amber-400
      offered: '#34d399', // emerald-400
      rejected: '#f87171', // red-400
      unknown: '#94a3b8'
    };

    // Calculate segments for application status donut chart
    let currentOffset = 0;
    const donutSegments = application_statuses.map(item => {
      const percent = totalApps > 0 ? item.count / totalApps : 0;
      const strokeDasharray = `${percent * circ} ${circ}`;
      const strokeDashoffset = -currentOffset * circ;
      currentOffset += percent;
      return {
        ...item,
        color: colors[item.status] || colors.unknown,
        strokeDasharray,
        strokeDashoffset
      };
    });

    // Calculate details for Branch Registrations vertical bar chart
    const maxBranchCount = branch_registrations.length > 0 
      ? Math.max(...branch_registrations.map(b => b.count)) 
      : 1;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donut Chart Card */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Application Status Breakdown</h3>
            <p className="text-slate-400 text-xs mb-6">Distribution of total student job applications by current state.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
            <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Circle */}
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#1e293b" strokeWidth="8" />
                {/* Segments */}
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="10"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out hover:stroke-[12px] cursor-pointer"
                  />
                ))}
              </svg>
              {/* Central Label */}
              <div className="absolute text-center">
                <p className="text-3xl font-extrabold text-white">{totalApps}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Apps</p>
              </div>
            </div>
            
            <div className="space-y-3 w-full max-w-[200px]">
              {donutSegments.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: seg.color }}></span>
                    <span className="capitalize text-slate-300 font-medium">{seg.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white">{seg.count}</span>
                    <span className="text-[10px] text-slate-500 ml-1">
                      ({totalApps > 0 ? Math.round((seg.count / totalApps) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
              {totalApps === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">No applications registered yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Bar Chart Card */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Student Branch Registrations</h3>
            <p className="text-slate-400 text-xs mb-6">Overview of registered students categorized by engineering discipline.</p>
          </div>
          
          <div className="space-y-4">
            {branch_registrations.map((b, idx) => {
              const percentage = Math.round((b.count / maxBranchCount) * 100);
              const branchGradients = [
                'from-purple-500 to-indigo-500',
                'from-blue-500 to-cyan-500',
                'from-emerald-500 to-teal-500',
                'from-pink-500 to-rose-500',
                'from-amber-500 to-orange-500'
              ];
              const gradient = branchGradients[idx % branchGradients.length];
              
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 truncate pr-4" title={b.branch}>{b.branch}</span>
                    <span className="font-black text-white shrink-0">{b.count} student(s)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {branch_registrations.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-10">No students registered with branches yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Header */}
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
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">System Administrator</p>
              <p className="text-xs text-slate-400">admin@placementpro.com</p>
            </div>
            
            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

            <span className="px-3 py-1 text-xs font-bold uppercase rounded-lg border tracking-wider bg-red-500/10 border-red-500/30 text-red-400">
              admin
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
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Admin Control Center</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Monitor site statistics, verify recruiter profiles, and moderate placement lists.</p>
          </div>
          
          <button 
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:bg-slate-900 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer select-none transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Dashboard</span>
          </button>
        </div>

        {/* Global Notifications */}
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

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-800 mb-8 overflow-x-auto gap-2">
          {[
            { id: 'stats', label: 'Platform Stats', icon: Server },
            { id: 'companies', label: 'Approve Companies', icon: Building2 },
            { id: 'students', label: 'Manage Students', icon: Users },
            { id: 'jobs', label: 'Manage Jobs', icon: Briefcase },
            { id: 'analytics', label: 'View Analytics', icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 border-b-2 font-bold text-sm tracking-tight cursor-pointer whitespace-nowrap transition-all ${
                  active 
                    ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* LOADING SHIMMER */}
        {loading ? (
          <div className="space-y-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 bg-slate-900/40 rounded-3xl animate-pulse border border-slate-800"></div>
              ))}
            </div>
            <div className="h-64 bg-slate-900/40 rounded-3xl animate-pulse border border-slate-800"></div>
          </div>
        ) : (
          <div className="transition-all duration-300">
            
            {/* TABS 1: METRICS OVERVIEW */}
            {activeTab === 'stats' && stats && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { title: 'Total Students', value: stats.total_students, icon: Users, color: 'text-purple-400', bg: 'from-purple-500/10 to-indigo-500/10' },
                    { title: 'Registered Companies', value: stats.total_companies, icon: Building2, color: 'text-indigo-400', bg: 'from-indigo-500/10 to-blue-500/10' },
                    { title: 'Created Jobs', value: stats.total_jobs, icon: Briefcase, color: 'text-pink-400', bg: 'from-pink-500/10 to-rose-500/10' },
                    { title: 'Total Applications', value: stats.total_applications, icon: FileCheck, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-teal-500/10' }
                  ].map((card, idx) => {
                    const Icon = card.icon;
                    return (
                      <div key={idx} className={`bg-gradient-to-tr ${card.bg} border border-slate-800/80 p-6 rounded-3xl relative overflow-hidden backdrop-blur-sm`}>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl"></div>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{card.title}</p>
                          <Icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <p className="text-4xl font-black text-white">{card.value}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Infrastructure Details */}
                <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">System Infrastructure Overview</h3>
                      <p className="text-slate-400 text-xs">Live status report of PlacementPRO application layers.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { layer: 'FastAPI Backend Core', status: 'Online', detail: 'Serving on GCP Cloud Run', health: 'Healthy' },
                      { layer: 'PostgreSQL Database', status: 'Online', detail: 'Supabase Server Pooler', health: 'Connected' },
                      { layer: 'Vercel Frontend Server', status: 'Online', detail: 'React Router Production CDN', health: 'Active' }
                    ].map((sys, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800/80 p-4.5 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase">{sys.layer}</p>
                          <p className="text-sm font-semibold text-slate-200 mt-1">{sys.detail}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/30 text-[10px] font-black uppercase rounded-lg">
                          {sys.health}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TABS 2: APPROVE COMPANIES */}
            {activeTab === 'companies' && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Approve Recruiters</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Toggle approval status for company profiles. Approved recruiters can post job vacancies.</p>
                  </div>
                  <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-xl text-xs font-bold">
                    {companies.length} Registered
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4.5 px-6">Company</th>
                        <th className="py-4.5 px-6">Recruiter Info</th>
                        <th className="py-4.5 px-6">Industry & Web</th>
                        <th className="py-4.5 px-6">Status</th>
                        <th className="py-4.5 px-6 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {companies.map(co => (
                        <tr key={co.id} className="hover:bg-slate-900/40">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {co.logo_url ? (
                                <img src={co.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-slate-950 border border-slate-850 p-0.5" />
                              ) : (
                                <div className="w-10 h-10 bg-slate-800 text-slate-400 rounded-lg flex items-center justify-center font-bold text-lg">
                                  {co.company_name[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-100">{co.company_name}</p>
                                <p className="text-slate-500 text-[10px] mt-0.5 truncate max-w-[200px]" title={co.description}>{co.description || 'No description added'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-semibold text-slate-200">{co.recruiter_name || 'N/A'}</p>
                            <p className="text-slate-500 text-[10px] mt-0.5">{co.recruiter_email || 'N/A'}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-medium text-slate-300">{co.industry || 'Not specified'}</p>
                            {co.website ? (
                              <a href={co.website} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline text-[10px] block mt-0.5">
                                Visit Website
                              </a>
                            ) : (
                              <p className="text-slate-500 text-[10px]">No website</p>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {co.is_approved ? (
                              <span className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 font-extrabold uppercase rounded-lg text-[10px] tracking-wider inline-flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Approved
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold uppercase rounded-lg text-[10px] tracking-wider inline-flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleApproveCompany(co.id, !co.is_approved)}
                              disabled={actionLoading}
                              className={`px-3 py-1.5 font-bold rounded-lg cursor-pointer transition-all border text-[10px] uppercase select-none ${
                                co.is_approved
                                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-transparent text-white shadow-sm shadow-purple-500/10'
                              }`}
                            >
                              {co.is_approved ? 'Revoke Approval' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {companies.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-10 text-slate-500 italic">
                            No companies registered on the platform.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TABS 3: MANAGE STUDENTS */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                {/* Search & Filter bar */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl flex flex-col md:flex-row items-center gap-4 backdrop-blur-sm">
                  <div className="relative w-full md:flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-4.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search students by name, college, major, skills..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-purple-500 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Branch filter */}
                    <div className="relative flex-1 md:flex-none">
                      <select
                        value={studentBranch}
                        onChange={(e) => setStudentBranch(e.target.value)}
                        className="w-full md:w-48 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-2xl py-3 px-4 text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="">All Branches</option>
                        {getBranchOptions().map((b, idx) => (
                          <option key={idx} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* CGPA filter */}
                    <div className="relative flex-1 md:flex-none">
                      <select
                        value={studentMinCgpa}
                        onChange={(e) => setStudentMinCgpa(e.target.value)}
                        className="w-full md:w-36 bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-2xl py-3 px-4 text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="">Min CGPA: All</option>
                        <option value="9.0">CGPA &gt;= 9.0</option>
                        <option value="8.0">CGPA &gt;= 8.0</option>
                        <option value="7.0">CGPA &gt;= 7.0</option>
                        <option value="6.0">CGPA &gt;= 6.0</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table list */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Student Registration Database</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Filter, review resume URLs, and delete accounts from database.</p>
                    </div>
                    <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-xl text-xs font-bold">
                      {students.length} Filtered Students
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-4.5 px-6">Student Name</th>
                          <th className="py-4.5 px-6">College / branch</th>
                          <th className="py-4.5 px-6">CGPA & Grad</th>
                          <th className="py-4.5 px-6">Resume</th>
                          <th className="py-4.5 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {students.map(s => (
                          <tr key={s.id} className="hover:bg-slate-900/40">
                            <td className="py-4 px-6">
                              <p className="font-bold text-slate-100">{s.name || 'Anonymous'}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5">{s.email}</p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-semibold text-slate-200 truncate max-w-[180px]" title={s.college}>{s.college || 'N/A'}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5 truncate max-w-[180px]" title={s.branch}>{s.branch || 'N/A'}</p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-extrabold text-purple-400">{s.cgpa ? s.cgpa.toFixed(2) : 'N/A'}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5">Year: {s.graduation_year || 'N/A'}</p>
                            </td>
                            <td className="py-4 px-6">
                              {s.resume_url ? (
                                <a 
                                  href={s.resume_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-indigo-400 hover:text-indigo-300 font-bold underline truncate max-w-[120px] block"
                                >
                                  View Resume
                                </a>
                              ) : (
                                <span className="text-slate-600 italic">No Resume</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setConfirmDeleteStudent(s)}
                                className="p-2 bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl cursor-pointer select-none transition-all hover:scale-105"
                                title="Delete account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-10 text-slate-500 italic">
                              No student profiles found matching the filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 4: MANAGE JOBS */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                {/* Search & Filter bar */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl flex flex-col md:flex-row items-center gap-4 backdrop-blur-sm">
                  <div className="relative w-full md:flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-4.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search jobs by title, company, location..."
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-purple-500 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                  
                  <div className="relative w-full md:w-48">
                    <select
                      value={jobStatus}
                      onChange={(e) => setJobStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-2xl py-3 px-4 text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Table list */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Job Listings Database</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Moderate job listings. Delete spam or fake job postings.</p>
                    </div>
                    <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-xl text-xs font-bold">
                      {getFilteredJobs().length} Listings
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-4.5 px-6">Job Title</th>
                          <th className="py-4.5 px-6">Company</th>
                          <th className="py-4.5 px-6">CTC & CGPA req.</th>
                          <th className="py-4.5 px-6">Deadline & Status</th>
                          <th className="py-4.5 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {getFilteredJobs().map(job => (
                          <tr key={job.id} className="hover:bg-slate-900/40">
                            <td className="py-4 px-6">
                              <p className="font-bold text-slate-100">{job.title}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5">{job.location || 'Remote'}</p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-semibold text-slate-200">{job.company?.company_name || 'N/A'}</p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-extrabold text-pink-400">{job.salary || `${job.ctc} LPA` || 'Not specified'}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5">Min CGPA: {job.eligibility_cgpa ? job.eligibility_cgpa.toFixed(1) : '0.0'}</p>
                            </td>
                            <td className="py-4 px-6">
                              <p className="font-medium text-slate-300">{new Date(job.deadline).toLocaleDateString()}</p>
                              <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded mt-1.5 inline-block ${
                                job.status === 'open' 
                                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setConfirmDeleteJob(job)}
                                className="p-2 bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl cursor-pointer select-none transition-all hover:scale-105"
                                title="Delete job posting"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {getFilteredJobs().length === 0 && (
                          <tr>
                            <td colSpan="5" className="text-center py-10 text-slate-500 italic">
                              No job postings found matching the filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 5: ANALYTICS (SVG CHARTS) */}
            {activeTab === 'analytics' && renderAnalyticsCharts()}

          </div>
        )}

      </main>

      {/* CONFIRM DELETE STUDENT MODAL */}
      {confirmDeleteStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full relative">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5" />
              <span>Delete Student Account?</span>
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Are you sure you want to delete the student profile for <span className="text-white font-bold">{confirmDeleteStudent.name}</span> (<span className="text-slate-300 font-semibold">{confirmDeleteStudent.email}</span>)?
              This will permanently delete their student profile, job applications, and security credentials. This action is irreversible.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteStudent(null)}
                className="px-4 py-2 border border-slate-700 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs cursor-pointer select-none disabled:opacity-50"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE JOB MODAL */}
      {confirmDeleteJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full relative">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5" />
              <span>Delete Job Posting?</span>
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Are you sure you want to delete the job posting <span className="text-white font-bold">"{confirmDeleteJob.title}"</span> posted by <span className="text-slate-300 font-semibold">{confirmDeleteJob.company?.company_name}</span>?
              All student applications associated with this job will be deleted automatically.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteJob(null)}
                className="px-4 py-2 border border-slate-700 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJob}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs cursor-pointer select-none disabled:opacity-50"
              >
                Delete Job Listing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
