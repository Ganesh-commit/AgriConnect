import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authService } from '../services/api';
import { Sprout, Mail, Lock, ArrowRight, UserCheck, Shield, ShoppingBag, Phone, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const LoginPage = () => {
  const { login, setSession } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Optional auth providers (hidden automatically when env keys are missing)
  const [providers, setProviders] = useState({
    firebasePhoneOtp: Boolean(FIREBASE_API_KEY),
    googleOAuth: Boolean(GOOGLE_CLIENT_ID)
  });
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneForm, setPhoneForm] = useState({
    phone: '',
    idToken: '',
    role: 'farmer',
    name: ''
  });

  useEffect(() => {
    authService
      .getAuthProviders()
      .then((res) => {
        const srv = res.data?.data || {};
        setProviders({
          firebasePhoneOtp: Boolean(FIREBASE_API_KEY || srv.firebasePhoneOtp),
          googleOAuth: Boolean(GOOGLE_CLIENT_ID || srv.googleOAuth)
        });
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleLoginSuccess = (loggedUser) => {
    // If user was redirected from a protected page, send them there
    const from = location.state?.from?.pathname;
    if (from) {
      navigate(from, { replace: true });
      return;
    }

    // Otherwise redirect based on role
    if (loggedUser.role === 'farmer') {
      navigate('/farmer/dashboard');
    } else if (loggedUser.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/buyer/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const loggedUser = await login(formData.email, formData.password);
      handleLoginSuccess(loggedUser);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail, demoRole) => {
    try {
      setSubmitting(true);
      setError('');
      setFormData({ email: demoEmail, password: 'Password123!' });
      const loggedUser = await login(demoEmail, 'Password123!');
      handleLoginSuccess(loggedUser);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-700 text-white items-center justify-center shadow-md shadow-emerald-700/20 mb-2">
            <Sprout size={26} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Welcome to AgriConnect
          </h2>
          <p className="text-sm text-slate-500">
            Sign in to access your direct marketplace account
          </p>
        </div>

        {/* Demo Quick Logins */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 text-center">
            One-Click Demo Credentials:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickDemoLogin('ramesh.farmer@agriconnect.com', 'farmer')}
              className="px-2 py-2 text-xs font-bold bg-white text-emerald-800 rounded-xl border border-emerald-200 hover:bg-emerald-100/60 shadow-xs transition-colors flex flex-col items-center gap-1"
            >
              <UserCheck size={16} />
              <span>Farmer</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickDemoLogin('priya.buyer@agriconnect.com', 'buyer')}
              className="px-2 py-2 text-xs font-bold bg-white text-emerald-800 rounded-xl border border-emerald-200 hover:bg-emerald-100/60 shadow-xs transition-colors flex flex-col items-center gap-1"
            >
              <ShoppingBag size={16} />
              <span>Buyer</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickDemoLogin('admin@agriconnect.com', 'admin')}
              className="px-2 py-2 text-xs font-bold bg-white text-emerald-800 rounded-xl border border-emerald-200 hover:bg-emerald-100/60 shadow-xs transition-colors flex flex-col items-center gap-1"
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@domain.com"
                className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Authenticating...' : t('login')}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Optional Phone OTP & Google OAuth buttons (rendered only when env keys exist) */}
        {(providers.firebasePhoneOtp || providers.googleOAuth) && (
          <div className="pt-2 space-y-2.5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Or continue with
            </p>
            <div className="grid grid-cols-1 gap-2">
              {providers.firebasePhoneOtp && (
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone size={15} className="text-emerald-700" />
                  <span>Sign in with Phone OTP (Firebase)</span>
                </button>
              )}
              {providers.googleOAuth && (
                <button
                  type="button"
                  onClick={() =>
                    toast('Provide Google ID token from Google Identity Services SDK', {
                      icon: '🔐'
                    })
                  }
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <Globe size={15} className="text-blue-600" />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>
        )}

        {showPhoneModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
              <h3 className="text-base font-extrabold text-slate-900">Phone OTP Login</h3>
              <p className="text-xs text-slate-500">
                Verify your phone via Firebase Authentication and exchange the Firebase ID Token for an AgriConnect session.
              </p>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={phoneForm.phone}
                onChange={(e) => setPhoneForm({ ...phoneForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
              />
              <input
                type="text"
                placeholder="Firebase ID Token"
                value={phoneForm.idToken}
                onChange={(e) => setPhoneForm({ ...phoneForm, idToken: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await authService.firebasePhoneLogin(phoneForm);
                      const { token, user: loggedUser } = res.data.data;
                      setSession(token, loggedUser);
                      setShowPhoneModal(false);
                      handleLoginSuccess(loggedUser);
                    } catch (err) {
                      toast.error(err.message || 'OTP verification failed');
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700"
                >
                  Verify & Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-emerald-700 hover:text-emerald-800">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
