import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Key, GraduationCap, Building2, Briefcase, FileCode, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('student'); // student or recruiter
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    // Student specific
    college: '',
    branch: '',
    graduation_year: '',
    cgpa: '',
    skills: '',
    resume_url: '',
    // Recruiter specific
    company_name: '',
    website: '',
    industry: '',
    logo_url: '',
    description: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    // Validations
    if (!formData.name || !formData.email || !formData.password) {
      setLocalError('Please fill in all core user details.');
      return;
    }
    
    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: role,
        ...(role === 'student' ? {
          college: formData.college || null,
          branch: formData.branch || null,
          graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
          cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
          skills: formData.skills || null,
          resume_url: formData.resume_url || null,
        } : {
          company_name: formData.company_name,
          website: formData.website || null,
          industry: formData.industry || null,
          logo_url: formData.logo_url || null,
          description: formData.description || null,
        })
      };
      
      console.log('Submitting unified registration payload:', payload);
      await register(payload);
      setSuccess(true);
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Check Your Mail!</h2>
          <p className="text-slate-300 mt-4 leading-relaxed font-medium">
            We have generated a verification token for <span className="text-purple-400 font-bold">{formData.email}</span>.
          </p>
          <div className="my-6 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left text-xs text-slate-400">
            <span className="text-purple-400 font-bold block mb-1">Local Testing Note:</span>
            As SMTP is mocked, the activation link was printed directly to the backend FastAPI console/logs. Go grab it to verify your account!
          </div>
          <Link
            to="/login"
            className="inline-flex w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all items-center justify-center gap-2"
          >
            <span>Proceed to Login</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950">
      <div className="w-full max-w-xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

        {/* Title */}
        <div className="text-center mb-6 relative z-10">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="text-sm text-slate-400 mt-2">Join PlacementPRO to kickstart your journey</p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 mb-6 relative z-10">
          <button
            type="button"
            className={`flex-1 py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'student'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setRole('student'); setLocalError(''); }}
          >
            <GraduationCap className="w-5 h-5" />
            <span>Student</span>
          </button>
          <button
            type="button"
            className={`flex-1 py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === 'recruiter'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setRole('recruiter'); setLocalError(''); }}
          >
            <Building2 className="w-5 h-5" />
            <span>Company Recruiter</span>
          </button>
        </div>

        {/* Error Alert */}
        {localError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl flex items-start gap-3 relative z-10">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{localError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10 max-h-[60vh] overflow-y-auto pr-1">
          {/* Core Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                name="password"
                type="password"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Student Specific Fields */}
          {role === 'student' && (
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Student Profile Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">College/University</label>
                  <input
                    name="college"
                    type="text"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                    placeholder="MIT ADT University"
                    value={formData.college}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Branch/Major</label>
                  <input
                    name="branch"
                    type="text"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                    placeholder="Computer Science"
                    value={formData.branch}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Graduation Year</label>
                  <input
                    name="graduation_year"
                    type="number"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                    placeholder="2027"
                    value={formData.graduation_year}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">CGPA</label>
                  <input
                    name="cgpa"
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                    placeholder="9.5"
                    value={formData.cgpa}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Skills (comma-separated)</label>
                <div className="relative">
                  <FileCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    name="skills"
                    type="text"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                    placeholder="Python, React, SQL, FastAPI"
                    value={formData.skills}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Resume URL (Optional)</label>
                <input
                  name="resume_url"
                  type="url"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                  placeholder="https://example.com/resume.pdf"
                  value={formData.resume_url}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          {/* Recruiter Specific Fields */}
          {role === 'recruiter' && (
            <div className="border-t border-slate-800 pt-5 space-y-4">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">Company Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Company Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      name="company_name"
                      type="text"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                      placeholder="Google LLC"
                      value={formData.company_name}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Website URL</label>
                  <input
                    name="website"
                    type="url"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                    placeholder="https://careers.google.com"
                    value={formData.website}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Industry</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      name="industry"
                      type="text"
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                      placeholder="Software & Internet"
                      value={formData.industry}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Logo Image URL</label>
                  <input
                    name="logo_url"
                    type="url"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Company Description</label>
                <textarea
                  name="description"
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Briefly describe the company..."
                  value={formData.description}
                  onChange={handleInputChange}
                ></textarea>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 duration-150 mt-6"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6 relative z-10">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
