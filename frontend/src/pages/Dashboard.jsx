import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldAlert } from 'lucide-react';
import AdminDashboard from './Admin/AdminDashboard';
import RecruiterPortal from './Recruiter/RecruiterPortal';
import StudentDashboard from './Student/StudentDashboard';

const Dashboard = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user.role === 'recruiter') {
    return <RecruiterPortal />;
  }

  if (user.role === 'student') {
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
                <p className="text-sm font-semibold text-white">{user.name || 'User'}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              
              <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

              <span className="px-3 py-1 text-xs font-bold uppercase rounded-lg border tracking-wider bg-purple-500/10 border-purple-500/30 text-purple-400">
                student
              </span>

              <button
                onClick={logout}
                className="p-2.5 bg-slate-800 hover:bg-red-950/20 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700/60 hover:border-red-500/30 cursor-pointer transition-all hover:scale-105"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Unverified Email Warning Banner */}
        {!user.is_verified && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-200 py-3.5 px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0 text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Verify Your Email Address</p>
                  <p className="text-xs text-slate-400">Your account is currently unverified. Some actions (like job applications or postings) are restricted.</p>
                </div>
              </div>
              <div className="text-xs bg-slate-950/80 px-4 py-2 border border-slate-800 rounded-xl text-slate-400">
                <span className="text-amber-400 font-bold">Local Test:</span> Get verified link from backend server logs.
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          {/* WELCOME */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white">Hello, {user.name || 'User'}!</h1>
            <p className="text-slate-400 text-sm mt-1">Here is your PlacementPRO workspace overview for today.</p>
          </div>

          <StudentDashboard />
        </main>
      </div>
    );
  }
};

export default Dashboard;
