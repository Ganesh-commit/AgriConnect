import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Phone, Mail, MapPin, Heart, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <Sprout size={22} />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                {t('brandName')}
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Empowering Indian farmers with direct access to wholesale and retail buyers.
              Zero middlemen commissions, real farm pricing, transparent trades.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl w-fit">
              <ShieldCheck size={16} />
              <span>100% Verified Farmer Network</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/crops" className="hover:text-emerald-400 transition-colors">
                  {t('marketplace')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-emerald-400 transition-colors">
                  Join as Farmer
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-emerald-400 transition-colors">
                  Register as Buyer
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-emerald-400 transition-colors">
                  Sign In to Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Crop Categories */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              {t('allCategories')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/crops?category=Vegetables" className="hover:text-emerald-400 transition-colors">
                  {t('Vegetables')}
                </Link>
              </li>
              <li>
                <Link to="/crops?category=Fruits" className="hover:text-emerald-400 transition-colors">
                  {t('Fruits')}
                </Link>
              </li>
              <li>
                <Link to="/crops?category=Grains" className="hover:text-emerald-400 transition-colors">
                  {t('Grains')}
                </Link>
              </li>
              <li>
                <Link to="/crops?category=Pulses" className="hover:text-emerald-400 transition-colors">
                  {t('Pulses')}
                </Link>
              </li>
              <li>
                <Link to="/crops?category=Spices" className="hover:text-emerald-400 transition-colors">
                  {t('Spices')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              Direct Farmer Support
            </h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-emerald-400 shrink-0" />
                <span>+91 1800 425 1555 (Toll-Free)</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-emerald-400 shrink-0" />
                <span>kisan-support@agriconnect.org</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>Agricultural Trade Center, Hyderabad, Telangana, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} AgriConnect. Dedicated to Indian Farmers & Direct Trade.</p>
          <p className="flex items-center gap-1">
            Built with <Heart size={14} className="text-red-500 fill-red-500" /> for Kisan Empowerment
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
