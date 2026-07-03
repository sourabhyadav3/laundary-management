import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';

const STORAGE_KEY = 'spinclean-settings';

const DEFAULT_SETTINGS = {
  business: {
    businessName: 'Tuhama laundry co.',
    ownerName: 'Dana Lee',
    email: 'admin@tuhama.com',
    phone: '555-0001',
    address: '100 Executive Blvd, New York, NY 10001',
    gstNumber: 'GST-29ABCDE1234F1Z5',
    website: 'https://tuhama.com',
    logo: '',
  },
  system: {
    currency: 'KWD',
    timezone: 'Asia/Kuwait',
    dateFormat: 'DD/MM/YYYY',
    defaultDeliveryTime: '48 hours',
  },
  notifications: {
    emailAlerts: true,
    smsAlerts: false,
    orderUpdates: true,
    paymentReminders: true,
    pickupDeliveryAlerts: true,
    marketingEmails: false,
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: '30',
    loginAlerts: true,
  },
  payment: {
    upiQrCode: '',
  },
};

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Fetch settings from database on mount
  const loadSettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.get('/settings');
      if (res.data) {
        setSettings(res.data);
      }
    } catch (e) {
      console.error('Failed to load store settings from API:', e);
    }
  };

  useEffect(() => {
    loadSettings();
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && settings.business.businessName === 'Tuhama laundry co.' && settings.system.currency === 'KWD') {
        loadSettings();
      }
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSection = async (section, data) => {
    const updatedSection = { ...settings[section], ...data };
    const nextSettings = {
      ...settings,
      [section]: updatedSection,
    };

    setSettings(nextSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));

    try {
      await api.put('/settings', nextSettings);
      toast.success('Settings updated successfully');
    } catch (e) {
      toast.error('Failed to save settings to server');
    }
  };

  const resetSection = async (section) => {
    const nextSettings = {
      ...settings,
      [section]: { ...DEFAULT_SETTINGS[section] },
    };

    setSettings(nextSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));

    try {
      await api.put('/settings', nextSettings);
      toast.success('Section settings reset');
    } catch (e) {
      toast.error('Failed to reset settings on server');
    }
  };

  const resetAll = async () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));

    try {
      await api.put('/settings', DEFAULT_SETTINGS);
      toast.success('All settings reset to defaults');
    } catch (e) {
      toast.error('Failed to reset store settings');
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    toast.success('Logged out successfully');
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSection, resetSection, resetAll, changePassword, logout }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export { DEFAULT_SETTINGS };
