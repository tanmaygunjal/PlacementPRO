import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, XCircle, ShieldAlert, ShieldCheck } from 'lucide-react';

const VerifyEmailPage = () => {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const triggerVerification = async () => {
      if (!token) {
        setStatus('error');
        setErrorMsg('Verification token is missing.');
        return;
      }

      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.message || 'Verification failed. The token may be invalid or expired.');
      }
    };

    triggerVerification();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

        {status === 'verifying' && (
          <div className="py-6">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Verifying Email...</h2>
            <p className="text-sm text-slate-400 mt-3 font-medium">Validating security token with PlacementPRO servers</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 animate-fadeIn">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Email Verified</h2>
            <p className="text-sm text-slate-300 mt-4 leading-relaxed font-medium">
              Your account has been verified successfully. You can now access all features.
            </p>
            <Link
              to="/login"
              className="inline-flex w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all items-center justify-center gap-2 mt-8"
            >
              <span>Login to Dashboard</span>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 animate-fadeIn">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Verification Failed</h2>
            <p className="text-sm text-red-200 mt-4 leading-relaxed bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
              {errorMsg}
            </p>
            <Link
              to="/login"
              className="inline-flex w-full py-4 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-200 font-bold rounded-xl shadow-lg transition-all items-center justify-center gap-2 mt-8"
            >
              <span>Back to Login</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
