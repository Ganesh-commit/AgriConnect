import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, Mail, Lock, Phone, User, MapPin, ArrowRight, Check } from 'lucide-react';

const RegisterPage = () => {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'farmer',
    village: '',
    district: '',
    state: 'Andhra Pradesh'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
        location: {
          village: formData.village,
          district: formData.district,
          state: formData.state
        }
      };

      const newUser = await register(payload);
      if (newUser.role === 'farmer') {
        navigate('/farmer/dashboard');
      } else {
        navigate('/buyer/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-700 text-white items-center justify-center shadow-md shadow-emerald-700/20 mb-2">
            <Sprout size={26} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Join AgriConnect
          </h2>
          <p className="text-sm text-slate-500">
            Create an account to start direct agricultural trading
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-600 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'farmer' })}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  formData.role === 'farmer'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-slate-900">I am a Farmer</span>
                  {formData.role === 'farmer' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  List crops, set prices, and sell direct with no middlemen.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'buyer' })}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  formData.role === 'buyer'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-slate-900">I am a Buyer</span>
                  {formData.role === 'buyer' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Procure fresh produce directly from verified farmers.
                </p>
              </button>
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Phone Number *
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Email & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@domain.com"
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Password (min 6 chars) *
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
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Location Fields */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
              Location Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Village / Town
                </label>
                <input
                  type="text"
                  name="village"
                  value={formData.village}
                  onChange={handleChange}
                  placeholder="e.g. Tenali"
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  District
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="e.g. Guntur"
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Andhra Pradesh"
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Creating Account...' : t('register')}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald-700 hover:text-emerald-800">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
