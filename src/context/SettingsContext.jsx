import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'spinclean-settings';

const DEFAULT_SETTINGS = {
  business: {
    businessName: 'Tuhama PRO',
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
    dateFormat: 'MM/DD/YYYY',
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
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.system) {
          if (parsed.system.currency !== 'KWD') {
            parsed.system.currency = 'KWD';
          }
          if (parsed.system.timezone !== 'Asia/Kuwait') {
            parsed.system.timezone = 'Asia/Kuwait';
          }
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      /* use defaults */
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSection = (section, data) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        [section]: { ...prev[section], ...data },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetSection = (section) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        [section]: { ...DEFAULT_SETTINGS[section] },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSection, resetSection, resetAll }}>
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
