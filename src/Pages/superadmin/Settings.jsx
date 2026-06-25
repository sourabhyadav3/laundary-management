import React, { useState } from 'react';
import {
  FiBriefcase,
  FiSun,
  FiUser,
  FiSave,
  FiRotateCcw,
  FiLogOut,
  FiLock,
  FiEdit2,
  FiCreditCard,
  FiUpload,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSettings, DEFAULT_SETTINGS } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../../Components/ThemeToggle';
import Modal from '../../Components/Modal';

const SECTIONS = [
  { id: 'business', label: 'Business Profile', icon: FiBriefcase },
  { id: 'theme', label: 'Theme Settings', icon: FiSun },
  { id: 'account', label: 'Account Settings', icon: FiUser },
  { id: 'payment', label: 'Payment Settings', icon: FiCreditCard },
];

const inputClass =
  'mt-2 w-full rounded-lg border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40';
const labelClass = 'block text-sm font-medium text-primary';

const Settings = () => {
  const navigate = useNavigate();
  const { settings, updateSection, resetSection } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('business');

  const [businessForm, setBusinessForm] = useState({ ...settings.business });
  const [paymentForm, setPaymentForm] = useState({ ...(settings.payment || { upiQrCode: '' }) });


  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [accountForm, setAccountForm] = useState({
    name: storedUser.name || 'Dana Lee',
    email: storedUser.email || 'admin@tuhama.com',
    role: storedUser.role || 'Admin',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });

  const handleSaveBusiness = () => {
    updateSection('business', businessForm);
    toast.success('Business profile saved');
  };

  const handleResetBusiness = () => {
    resetSection('business');
    setBusinessForm({ ...DEFAULT_SETTINGS.business });
    toast.info('Business profile reset');
  };

  const handleSavePayment = () => {
    updateSection('payment', paymentForm);
    toast.success('Payment settings saved');
  };

  const handleUpiQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPaymentForm((prev) => ({ ...prev, upiQrCode: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleRemoveUpiQr = () => {
    setPaymentForm((prev) => ({ ...prev, upiQrCode: '' }));
    updateSection('payment', { upiQrCode: '' });
    toast.info('UPI QR removed');
  };



  const handleSaveProfile = () => {
    localStorage.setItem('user', JSON.stringify(accountForm));
    toast.success('Profile updated');
    setShowProfileModal(false);
  };

  const handleChangePassword = () => {
    if (!passwordForm.next || passwordForm.next.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    toast.success('Password changed successfully');
    setShowPasswordModal(false);
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success('Logged out');
    navigate('/');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'business':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Business Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Business Name</label>
                <input className={inputClass} value={businessForm.businessName} onChange={(e) => setBusinessForm({ ...businessForm, businessName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Owner Name</label>
                <input className={inputClass} value={businessForm.ownerName} onChange={(e) => setBusinessForm({ ...businessForm, ownerName: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={businessForm.email} onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input className={inputClass} value={businessForm.phone} onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={businessForm.address} onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>GST Number</label>
                <input className={inputClass} value={businessForm.gstNumber} onChange={(e) => setBusinessForm({ ...businessForm, gstNumber: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input className={inputClass} value={businessForm.website} onChange={(e) => setBusinessForm({ ...businessForm, website: e.target.value })} />
              </div>

            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSaveBusiness} className="dashboard-hero-pill flex items-center gap-2 hover:bg-blue-500/10">
                <FiSave size={18} />
                <span className="font-semibold">Save Changes</span>
              </button>
              <button type="button" onClick={handleResetBusiness} className="action-button flex items-center gap-2">
                <FiRotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>
        );


      case 'theme':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Theme Settings</h2>
            <p className="text-sm text-secondary">Switch between light and dark mode for the entire dashboard.</p>
            <div className="flex items-center gap-6 rounded-2xl border border-border bg-surface-alt p-6">
              <ThemeToggle />
              <div>
                <p className="font-semibold text-primary">Current theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                <p className="mt-1 text-sm text-secondary">Preference is saved automatically.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div 
                className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-blue-400/50'}`}
                onClick={() => { if (theme !== 'light') toggleTheme() }}
              >
                <p className="font-semibold text-primary">Light Mode</p>
                <p className="mt-2 text-sm text-secondary">Bright surfaces for daytime use.</p>
              </div>
              <div 
                className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-blue-400/50'}`}
                onClick={() => { if (theme !== 'dark') toggleTheme() }}
              >
                <p className="font-semibold text-primary">Dark Mode</p>
                <p className="mt-2 text-sm text-secondary">Reduced glare for evening operations.</p>
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Account Settings</h2>
            <div className="rounded-2xl border border-border bg-surface-alt p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-xl font-bold text-blue-600">
                  {(accountForm.name || 'A').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-primary">{accountForm.name}</p>
                  <p className="text-sm text-secondary">{accountForm.email}</p>
                  <span className="mt-2 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600">
                    {accountForm.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setShowProfileModal(true)} className="dashboard-hero-pill flex items-center gap-2 hover:bg-blue-500/10">
                <FiEdit2 size={18} />
                <span className="font-semibold">Edit Profile</span>
              </button>
              <button type="button" onClick={() => setShowPasswordModal(true)} className="action-button flex items-center gap-2">
                <FiLock size={16} />
                Change Password
              </button>
              <button type="button" onClick={handleLogout} className="action-button flex items-center gap-2 text-rose-600">
                <FiLogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-primary">Payment Settings</h2>
            <p className="text-sm text-secondary">Upload your UPI QR code so customers can scan and pay directly at the counter.</p>

            <div className="rounded-2xl border border-border bg-surface-alt p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-semibold text-primary">UPI QR Code</p>
                  <p className="text-xs text-secondary">Displayed when customers choose UPI at checkout</p>
                </div>
              </div>

              {paymentForm.upiQrCode ? (
                <div className="flex flex-col items-center gap-4">
                  <img src={paymentForm.upiQrCode} alt="UPI QR Code" className="h-48 w-48 rounded-2xl border-2 border-violet-400/40 object-contain shadow-lg" />
                  <div className="flex gap-3">
                    <label className="cursor-pointer rounded-xl bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20 transition flex items-center gap-2">
                      <FiUpload size={14} /> Replace QR
                      <input type="file" accept="image/*" className="hidden" onChange={handleUpiQrUpload} />
                    </label>
                    <button type="button" onClick={handleRemoveUpiQr} className="rounded-xl bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/20 transition">Remove</button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-3 cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-violet-400 bg-surface p-10 transition-all duration-200">
                  <span className="text-4xl">📲</span>
                  <p className="font-semibold text-primary">Upload UPI QR Code</p>
                  <p className="text-xs text-secondary">PNG, JPG — Max 2 MB</p>
                  <span className="mt-2 flex items-center gap-2 rounded-xl bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-600">
                    <FiUpload size={14} /> Choose File
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpiQrUpload} />
                </label>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleSavePayment} className="dashboard-hero-pill flex items-center gap-2 hover:bg-blue-500/10">
                <FiSave size={18} />
                <span className="font-semibold">Save Payment Settings</span>
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Admin Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Settings</h1>
          <p className="mt-2 text-sm text-secondary">Manage business and application settings.</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-4">
        <nav className="surface-card h-fit space-y-1 rounded-2xl border border-border p-3 shadow-xl lg:col-span-1">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Settings</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${activeSection === id
                  ? 'settings-nav-active bg-blue-500/10 text-blue-600 font-semibold shadow-sm'
                  : 'text-secondary hover:bg-surface-alt hover:text-primary'
                }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="surface-card rounded-2xl border border-border p-6 shadow-xl lg:col-span-3">
          {renderContent()}
        </div>
      </div>

      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Edit Profile">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Admin Name</label>
            <input className={inputClass} value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <input className={inputClass} value={accountForm.role} disabled />
          </div>
          <button type="button" onClick={handleSaveProfile} className="w-full rounded-xl bg-blue-500/10 py-2 font-semibold text-blue-600">
            Save Profile
          </button>
        </div>
      </Modal>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <input type="password" className={inputClass} value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input type="password" className={inputClass} value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Confirm Password</label>
            <input type="password" className={inputClass} value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
          </div>
          <button type="button" onClick={handleChangePassword} className="w-full rounded-xl bg-blue-500/10 py-2 font-semibold text-blue-600">
            Update Password
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
