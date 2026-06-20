import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Search, Filter, Globe, ExternalLink, RefreshCw, X, AlertCircle, Building2, MapPin, DollarSign, Sparkles
} from 'lucide-react';

const ExternalJobsPage = () => {
  const { user } = useAuth();
  
  // Data States
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('');
  
  // Interface states
  const [loading, setLoading] = useState(true);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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
      const res = await api.post('/resume-analyzer/match-job', { external_job_id: selectedJob.external_id });
      setMatchResult(res.data);
    } catch (err) {
      console.error("Match error:", err);
      setMatchError(err.response?.data?.detail || "AI Match query failed.");
    } finally {
      setMatchLoading(false);
    }
  };

  const fetchJobsData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // Build query params
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (location) params.append('location', location);
      if (source) params.append('source', source);
      
      const res = await api.get(`/external-jobs?${params.toString()}`);
      setJobs(res.data);
      
      const catRes = await api.get('/external-jobs/categories');
      setCategories(catRes.data);
    } catch (err) {
      console.error("Error loading external jobs:", err);
      setErrorMessage("Could not load external jobs from scraper database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsData();
  }, [search, category, location, source]);

  // Admin trigger scrape on demand
  const handleTriggerScraper = async () => {
    setFetchLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await api.post('/external-jobs/fetch');
      setSuccessMessage(`Scraping completed! ${res.data.new_jobs_added} new vacancies added.`);
      await fetchJobsData();
    } catch (err) {
      console.error("Failed to run scraper:", err);
      setErrorMessage(err.response?.data?.detail || "Admin scraper execute request failed.");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setLocation('');
    setSource('');
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <span>Global Opportunities Board</span>
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Explore active vacancies aggregated across Adzuna, JSearch, and Arbeitnow.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Admin scraper trigger */}
          {user && user.role === 'admin' && (
            <button
              onClick={handleTriggerScraper}
              disabled={fetchLoading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-indigo-500/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchLoading ? 'animate-spin' : ''}`} />
              <span>{fetchLoading ? 'Scraping Live...' : 'Trigger Sync'}</span>
            </button>
          )}
          
          <button
            onClick={fetchJobsData}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl border border-slate-800"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 hover:bg-red-500/20 rounded-lg text-red-400"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl flex items-center justify-between text-xs">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-green-500/20 rounded-lg text-green-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search and Filters panel */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center backdrop-blur-sm">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          <input 
            type="text"
            placeholder="Search titles, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 pl-9 pr-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700"
          />
        </div>

        {/* Category Filter */}
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-950 border border-slate-850 text-slate-400 rounded-xl text-xs py-3 px-3.5 focus:outline-none focus:border-purple-500 cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Location Filter */}
        <input 
          type="text"
          placeholder="Location (e.g. Remote)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl py-2.5 px-4 text-xs focus:outline-none text-slate-100 placeholder-slate-700"
        />

        {/* Source API Filter */}
        <div className="flex gap-2 items-center justify-between">
          <select 
            value={source} 
            onChange={(e) => setSource(e.target.value)}
            className="bg-slate-950 border border-slate-850 text-slate-400 rounded-xl text-xs py-3 px-3.5 focus:outline-none focus:border-purple-500 cursor-pointer flex-1"
          >
            <option value="">All Sources</option>
            <option value="Arbeitnow">Arbeitnow</option>
            <option value="Adzuna">Adzuna</option>
            <option value="JSearch">JSearch</option>
          </select>
          
          {(search || category || location || source) && (
            <button
              onClick={handleClearFilters}
              className="p-3 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-850 cursor-pointer"
              title="Clear all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-3" />
          <p className="text-xs font-semibold animate-pulse">Syncing external records...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <div 
              key={job.id} 
              onClick={() => handleOpenJobDetails(job)}
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-3xl flex flex-col justify-between gap-4 cursor-pointer transition-all duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border tracking-wider ${
                    job.source_api === 'Arbeitnow' 
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : job.source_api === 'Adzuna'
                      ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      : 'bg-green-500/10 border-green-500/20 text-green-400'
                  }`}>
                    {job.source_api}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Scraped</span>
                </div>
                
                <div>
                  <h4 className="font-extrabold text-white text-sm tracking-tight leading-snug line-clamp-1">{job.title}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">{job.company_name}</p>
                </div>
                
                <div className="flex flex-wrap gap-1.5 py-1">
                  {job.category && (
                    <span className="bg-slate-950 border border-slate-850 text-[10px] text-slate-450 px-2 py-0.5 rounded-md font-semibold">{job.category}</span>
                  )}
                  <span className="bg-slate-950 border border-slate-850 text-[10px] text-slate-450 px-2 py-0.5 rounded-md font-semibold flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5 text-slate-500" />
                    <span className="truncate max-w-[120px]">{job.location || 'Remote'}</span>
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-500 text-[10px] font-semibold uppercase">Estimated Salary</p>
                  <p className="font-bold text-slate-200 mt-0.5">{job.salary || 'Not specified'}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(job.apply_url, "_blank", "noopener,noreferrer");
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                >
                  <span>Apply Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 italic text-xs">
              No scraped opportunities matched your search criteria.
            </div>
          )}
        </div>
      )}

      {/* JOB SPECIFICATION MODAL */}
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
              <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center shrink-0 text-slate-500 font-extrabold text-sm uppercase">
                <Building2 className="w-6 h-6 text-slate-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-black text-white">{selectedJob.title}</h3>
                <p className="text-indigo-400 font-bold text-xs mt-0.5">{selectedJob.company_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-lg border tracking-wider ${
                    selectedJob.source_api === 'Arbeitnow' 
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : selectedJob.source_api === 'Adzuna'
                      ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      : 'bg-green-500/10 border-green-500/20 text-green-400'
                  }`}>
                    Source: {selectedJob.source_api}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-xs bg-slate-950/40 p-4 border border-slate-850 rounded-2xl">
              <div>
                <p className="text-slate-550 font-bold uppercase text-[9px] tracking-wider">Salary CTC Estimate</p>
                <p className="font-extrabold text-purple-400 mt-1">{selectedJob.salary || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-slate-550 font-bold uppercase text-[9px] tracking-wider">Location</p>
                <p className="font-bold text-slate-200 mt-1 flex items-center gap-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedJob.location || 'Remote'}</span>
                </p>
              </div>
              <div>
                <p className="text-slate-550 font-bold uppercase text-[9px] tracking-wider">Job Category</p>
                <p className="font-bold text-slate-200 mt-1">{selectedJob.category || 'Software'}</p>
              </div>
            </div>

            {/* Description & Requirements */}
            <div className="space-y-4 mb-6 max-h-[280px] overflow-y-auto pr-1">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1.5">Job Overview / Description</h4>
                <div 
                  className="text-slate-350 text-xs leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: selectedJob.description }}
                />
              </div>
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
            <div className="flex items-center justify-between border-t border-slate-850 pt-5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">
                Added {new Date(selectedJob.created_at).toLocaleDateString()}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenJobDetails(null)}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close Detail
                </button>
                <a
                  href={selectedJob.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>Apply on Source Platform</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ExternalJobsPage;
