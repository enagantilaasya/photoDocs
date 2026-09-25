import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        if (from) {
          navigate(from, { replace: true });
        } else if (res.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-brand-500/20">
            <Camera className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            Sign In to PhotoDocs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Enter your credentials to access your dashboard and upload documentation.
          </p>
        </div>

        {/* Demo Accounts Quick-Fill Box */}
        <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
            Demo Quick Login Credentials:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@gallery.com', 'Admin@12345')}
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold text-left border border-purple-200 transition-colors"
            >
              <span className="block font-bold">Admin Demo</span>
              <span className="text-[10px] text-purple-500 font-normal">admin@gallery.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('laasya@gallery.com', 'User@12345')}
              className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg font-semibold text-left border border-brand-200 transition-colors"
            >
              <span className="block font-bold">User Demo</span>
              <span className="text-[10px] text-brand-500 font-normal">laasya@gallery.com</span>
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>LOGIN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700">
                REGISTER HERE
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
