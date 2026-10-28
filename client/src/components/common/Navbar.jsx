import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Sprout, Menu, X, User, LogOut, ShoppingBag, PlusCircle,
  LayoutDashboard, ShieldCheck, ChevronDown, Globe, MessageCircle, MapPin
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <Sprout size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {t('brandName')}
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-emerald-700">
                Farmer Direct Marketplace
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/crops"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive('/crops')
                  ? 'text-emerald-800 bg-emerald-50'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
              }`}
            >
              {t('marketplace')}
            </Link>
            <Link
              to="/requirements"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive('/requirements')
                  ? 'text-emerald-800 bg-emerald-50'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
              }`}
            >
              Requirements
            </Link>
            <Link
              to="/schemes"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive('/schemes')
                  ? 'text-emerald-800 bg-emerald-50'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
              }`}
            >
              Schemes
            </Link>
            <Link
              to="/assistant"
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive('/assistant')
                  ? 'text-emerald-800 bg-emerald-50'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
              }`}
            >
              AI Sahayak
            </Link>

            {/* Farmer Specific Links */}
            {user?.role === 'farmer' && (
              <>
                <Link
                  to="/farmer/dashboard"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/farmer/dashboard')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  {t('dashboard')}
                </Link>
                <Link
                  to="/farmer/disease-check"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/farmer/disease-check')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  Disease Check
                </Link>
                <Link
                  to="/farmer/my-crops"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/farmer/my-crops')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  {t('myCrops')}
                </Link>
                <Link
                  to="/farmer/orders"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/farmer/orders')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  {t('farmerOrders')}
                </Link>
                <Link
                  to="/farmer/add-crop"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200/80 transition-colors"
                >
                  <PlusCircle size={16} />
                  <span>{t('addCrop')}</span>
                </Link>
              </>
            )}

            {/* Buyer Specific Links */}
            {user?.role === 'buyer' && (
              <>
                <Link
                  to="/buyer/dashboard"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/buyer/dashboard')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  {t('dashboard')}
                </Link>
                <Link
                  to="/buyer/orders"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/buyer/orders')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  {t('buyerOrders')}
                </Link>
              </>
            )}

            {/* Admin Links */}
            {user?.role === 'admin' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/admin/dashboard')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  {t('adminDashboard')}
                </Link>
                <Link
                  to="/admin/users"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/admin/users')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  Users
                </Link>
                <Link
                  to="/admin/crops"
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/admin/crops')
                      ? 'text-emerald-800 bg-emerald-50'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                  }`}
                >
                  Crops
                </Link>
              </>
            )}
          </nav>

          {/* Right Actions: Language + Notifications + Auth State */}
          <div className="hidden md:flex items-center gap-2">
            {/* Map & Chat quick links */}
            {isAuthenticated && (
              <>
                <Link
                  to="/map"
                  className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold
                    ${isActive('/map') ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'}`}
                  title="Map Search"
                >
                  <MapPin size={18} /> <span className="hidden lg:inline">Map</span>
                </Link>
                <Link
                  to="/chat"
                  className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold
                    ${isActive('/chat') ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'}`}
                  title="Chat"
                >
                  <MessageCircle size={18} /> <span className="hidden lg:inline">Chat</span>
                </Link>
                <NotificationBell />
              </>
            )}

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  language === 'en'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('te')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  language === 'te'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                తెలుగు
              </button>
            </div>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                >
                  <img
                    src={
                      user?.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user?.name || 'User'
                      )}&background=2E7D32&color=fff&bold=true`
                    }
                    alt={user?.name}
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/20"
                  />
                  <div className="text-left leading-tight hidden lg:block">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1 max-w-[120px]">
                      {user?.name}
                    </p>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                      {user?.role}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">{t('welcome')}</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                    >
                      <User size={16} />
                      {t('profile')}
                    </Link>

                    {user?.role === 'farmer' && (
                      <Link
                        to="/farmer/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                      >
                        <LayoutDashboard size={16} />
                        {t('dashboard')}
                      </Link>
                    )}

                    {user?.role === 'buyer' && (
                      <Link
                        to="/buyer/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                      >
                        <LayoutDashboard size={16} />
                        {t('dashboard')}
                      </Link>
                    )}

                    {user?.role === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                      >
                        <ShieldCheck size={16} />
                        {t('adminDashboard')}
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-emerald-800 hover:bg-slate-100 transition-colors"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {/* Language toggle for mobile */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
              className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200"
            >
              {language === 'en' ? 'తెలుగు' : 'EN'}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            <Link
              to="/crops"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
            >
              {t('marketplace')}
            </Link>
            <Link
              to="/requirements"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Requirements
            </Link>
            <Link
              to="/schemes"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Schemes
            </Link>
            <Link
              to="/assistant"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
            >
              AI Sahayak
            </Link>

            {user?.role === 'farmer' && (
              <>
                <Link
                  to="/farmer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {t('dashboard')}
                </Link>
                <Link
                  to="/farmer/disease-check"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Disease Check
                </Link>
                <Link
                  to="/farmer/my-crops"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {t('myCrops')}
                </Link>
                <Link
                  to="/farmer/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {t('farmerOrders')}
                </Link>
                <Link
                  to="/farmer/add-crop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-emerald-800 bg-emerald-50"
                >
                  + {t('addCrop')}
                </Link>
              </>
            )}

            {user?.role === 'buyer' && (
              <>
                <Link
                  to="/buyer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {t('dashboard')}
                </Link>
                <Link
                  to="/buyer/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {t('buyerOrders')}
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {t('adminDashboard')}
                </Link>
                <Link
                  to="/admin/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Users
                </Link>
                <Link
                  to="/admin/crops"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Crops
                </Link>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl">
                  <img
                    src={
                      user?.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user?.name || 'User'
                      )}&background=2E7D32&color=fff&bold=true`
                    }
                    alt={user?.name}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                  </div>
                </div>

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {t('profile')}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100"
                >
                  {t('login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-700"
                >
                  {t('register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
