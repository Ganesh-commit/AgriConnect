import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { notificationService } from '../services/api';
import { User, Mail, Phone, MapPin, Lock, Save, ShieldCheck, Bell, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { t } = useLanguage();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    village: user?.location?.village || '',
    district: user?.location?.district || '',
    state: user?.location?.state || '',
    avatar: user?.avatar || '',
    upiId: user?.upiId || ''
  });

  // Integration 7: Notification channel preferences
  const [notifPrefs, setNotifPrefs] = useState({
    inapp: true,
    email: user?.notificationPreferences?.email ?? true,
    sms: user?.notificationPreferences?.sms ?? false,
    whatsapp: user?.notificationPreferences?.whatsapp ?? false
  });
  const [channelStatus, setChannelStatus] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    notificationService
      .getChannels()
      .then((res) => {
        if (res.data?.data?.channels) setChannelStatus(res.data.data.channels);
        if (res.data?.data?.preferences) setNotifPrefs(res.data.data.preferences);
      })
      .catch(() => {});
  }, []);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        avatar: profileData.avatar,
        upiId: profileData.upiId,
        location: {
          village: profileData.village,
          district: profileData.district,
          state: profileData.state
        }
      });
    } catch (err) {
      // toast shown in context
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      // toast shown in context
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal information, contact numbers, and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* User Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <img
              src={
                user?.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.name || 'User'
                )}&background=2E7D32&color=fff&bold=true`
              }
              alt=""
              className="w-full h-full rounded-3xl object-cover ring-4 ring-emerald-500/20 shadow-md"
            />
          </div>

          <div>
            <h3 className="font-extrabold text-lg text-slate-900">{user?.name}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              <ShieldCheck size={14} />
              <span>{user?.role}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-left text-xs space-y-2 text-slate-600">
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-emerald-700" />
              <span>{user?.phone || 'No phone set'}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={14} className="text-emerald-700" />
              <span>
                {[user?.location?.village, user?.location?.district, user?.location?.state]
                  .filter(Boolean)
                  .join(', ') || 'India'}
              </span>
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 space-y-8">
          {/* Personal Info Form */}
          <form
            onSubmit={handleProfileSubmit}
            className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5"
          >
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User size={18} className="text-emerald-700" />
              <span>Personal Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={profileData.name}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  required
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Location fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Village / Town
                </label>
                <input
                  type="text"
                  name="village"
                  value={profileData.village}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  District
                </label>
                <input
                  type="text"
                  name="district"
                  value={profileData.district}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={profileData.state}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Avatar URL & Farmer UPI ID (Integration 9) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Avatar Image URL (Optional)
                </label>
                <input
                  type="url"
                  name="avatar"
                  value={profileData.avatar}
                  onChange={handleProfileChange}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1 mb-1">
                  <QrCode size={13} />
                  <span>Direct UPI ID (for Order QR)</span>
                </label>
                <input
                  type="text"
                  name="upiId"
                  value={profileData.upiId}
                  onChange={handleProfileChange}
                  placeholder="e.g. ramesh.farmer@okaxis or 9876511001@ybl"
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-emerald-50/50 border border-emerald-200 focus:outline-none focus:border-emerald-600 focus:bg-white font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{savingProfile ? 'Saving...' : 'Update Profile'}</span>
            </button>
          </form>

          {/* Integration 7: Pluggable Notification Channels Preferences */}
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell size={18} className="text-emerald-700" />
                <span>Notification Channels</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose how you want to receive order, quote, and weather alerts. Unconfigured channels automatically log to console in development mode.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 opacity-80">
                <div>
                  <span className="font-bold text-slate-800 block">In-App Bell & Real-Time</span>
                  <span className="text-[11px] text-emerald-700">Always Enabled</span>
                </div>
                <input type="checkbox" checked disabled className="w-4 h-4 accent-emerald-700" />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Email (SMTP / Nodemailer)</span>
                  <span className="text-[11px] text-slate-500">
                    {channelStatus?.email?.enabled ? 'Live SMTP Configured' : 'Dev Console Fallback'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.email}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, email: e.target.checked })}
                  className="w-4 h-4 accent-emerald-700"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">SMS (Twilio / MSG91)</span>
                  <span className="text-[11px] text-slate-500">
                    {channelStatus?.sms?.enabled
                      ? `Live (${channelStatus.sms.provider})`
                      : 'Dev Console Fallback'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.sms}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, sms: e.target.checked })}
                  className="w-4 h-4 accent-emerald-700"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">WhatsApp Cloud API</span>
                  <span className="text-[11px] text-slate-500">
                    {channelStatus?.whatsapp?.enabled ? 'Live Cloud API' : 'Dev Console Fallback'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.whatsapp}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, whatsapp: e.target.checked })}
                  className="w-4 h-4 accent-emerald-700"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={savingPrefs}
              onClick={async () => {
                try {
                  setSavingPrefs(true);
                  await notificationService.updatePreferences(notifPrefs);
                  toast.success('Notification channel preferences saved!');
                } catch {
                  toast.error('Failed to save notification preferences');
                } finally {
                  setSavingPrefs(false);
                }
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{savingPrefs ? 'Saving...' : 'Save Channel Preferences'}</span>
            </button>
          </div>

          {/* Change Password Form */}
          <form
            onSubmit={handlePasswordSubmit}
            className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5"
          >
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Lock size={18} className="text-emerald-700" />
              <span>Change Security Password</span>
            </h3>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                required
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  New Password (min 6)
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Lock size={14} />
              <span>{savingPassword ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
