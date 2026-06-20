import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-12 h-12" />
        </div>
        
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Access Denied</h2>
        <p className="text-sm text-slate-400 mt-4 leading-relaxed font-medium">
          You do not have the required role permissions to view this dashboard page.
        </p>
        
        <Link
          to="/"
          className="inline-flex w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all items-center justify-center gap-2 mt-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
