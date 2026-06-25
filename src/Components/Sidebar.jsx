import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiUsers, FiFileText, FiTool, FiTruck, FiCreditCard, FiUserCheck, FiBarChart2, FiSettings, FiMapPin } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useLanguage } from '../context/LanguageContext';
import { FiPlusCircle } from 'react-icons/fi'

const menuItems = [
  { label: 'Dashboard', icon: <FiHome />, to: '/admin/dashboard', permission: 'view_dashboard' },
  {
    label: 'Customers',
    icon: <FiUsers />,
    to: '/admin/customers',
    permission: 'view_customers',
  },
  /* Hide for now - will restore if client asks
  {
    label: 'Orders',
    icon: <FiShoppingBag />,
    to: '/admin/orders',
    permission: 'view_orders',
  },
  */
  {
    label: 'Invoices',
    icon: <FiFileText />,
    to: '/admin/invoices',
    permission: 'view_invoice_status',
  },
  {
    label: 'Branches',
    icon: <FiMapPin />,
    to: '/admin/branches',
    permission: 'manage_settings',
  },
  {
    label: 'Make Invoices',
    icon: <FiPlusCircle />,
    to: '/admin/make-invoice',
    permission: 'make_invoice',
  },
  {
    label: 'Laundry Services',
    icon: <FiTool />,
    to: '/admin/services',
    permission: 'view_services',
  },
  {
    label: 'Home Service',
    icon: <FiTruck />,
    to: '/admin/pickups',
    permission: 'view_logistics',
  },
  {
    label: 'Drivers',
    icon: <FiUsers />,
    to: '/admin/drivers',
    permission: 'view_logistics',
  },
  {
    label: 'Payments',
    icon: <FiCreditCard />,
    to: '/admin/payments',
    permission: 'view_payments',
  },
  {
    label: 'Staff Management',
    icon: <FiUserCheck />,
    to: '/admin/staff',
    permission: 'manage_staff',
  },
  {
    label: 'Reports',
    icon: <FiBarChart2 />,
    to: '/admin/reports',
    permission: 'view_reports',
  },
  {
    label: 'Settings',
    icon: <FiSettings />,
    to: '/admin/settings',
    permission: 'manage_settings',
  },
];

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  const { t } = useLanguage();

  const getTranslatedLabel = (label) => {
    switch (label) {
      case 'Dashboard': return t('sidebar.dashboard');
      case 'Customers': return t('sidebar.customers');
      case 'Orders': return t('sidebar.orders');
      case 'Invoices': return t('sidebar.invoices') || 'Invoices';
      case 'Branches': return t('sidebar.branches');
      case 'Laundry Services': return t('sidebar.services');
      case 'Home Service': return t('sidebar.pickups');
      case 'Drivers': return t('sidebar.drivers');
      case 'Payments': return t('sidebar.payments');
      case 'Staff Management': return t('sidebar.staff');
      case 'Reports': return t('sidebar.reports');
      case 'Settings': return t('sidebar.settings');
      case 'Make Invoice':
      case 'Make Invoices': return t('sidebar.makeInvoice');
      case 'LCD Display': return t('sidebar.lcdDisplay') || 'LCD Display';
      default: return label;
    }
  };

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = storedUser.role || 'Admin';

  const getPermissionsForRole = (role) => {
    const defaultPermissions = {
      'Admin': [
        'view_dashboard', 'view_customers', 'manage_customers', 'view_orders', 'manage_orders', 
        'view_invoice_status', 'change_invoice_status', 'make_invoice', 'view_invoice_details', 
        'view_services', 'manage_services', 'view_logistics', 'manage_logistics', 
        'view_payments', 'manage_payments', 'view_reports', 'manage_staff', 'assign_roles', 
        'manage_permissions', 'manage_settings', 'full_access', 'create_records', 
        'edit_records', 'delete_records', 'view_all_data', 'access_all_modules'
      ]
    };
    const saved = localStorage.getItem('spinclean_role_permissions_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed[role]) {
          return parsed[role];
        }
      } catch (e) {
        console.error("Failed to parse role permissions", e);
      }
    }
    return defaultPermissions[role] || [];
  };

  const allowedPermissions = getPermissionsForRole(userRole);

  //logout handler
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success(t('nav.logoutSuccess') || 'Logged out successfully');
    navigate('/');
  };
  return (
    <>
      {/* Mobile toggle button */}
      {!open && (
        <button
          className="fixed top-[9px] ltr:left-3 rtl:right-3 z-[40] icon-button lg:!hidden shadow-sm"
          onClick={toggle}
          aria-label={t('common.toggleMenu') || 'Toggle menu'}
        >
          <FiMenu size={20} />
        </button>
      )}

      {/* Overlay for mobile */}
      {open && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={toggle}></div>}

      <aside
        className={`admin-sidebar z-50 surface-card text-primary transition-transform duration-300 ease-in-out max-lg:fixed max-lg:inset-y-0 ltr:max-lg:left-0 rtl:max-lg:right-0 max-lg:transform ${open ? 'max-lg:translate-x-0' : 'ltr:max-lg:-translate-x-full rtl:max-lg:translate-x-full'
          }`}
      >
        <div className="h-full flex flex-col p-4 pt-6 relative">
          {/* Mobile exit/close button at top right of sidebar */}
          <button
            type="button"
            className="absolute top-4 ltr:right-4 rtl:left-4 lg:!hidden icon-button-small"
            onClick={toggle}
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>

          <div className="mb-6 flex items-center justify-center p-2 transition-all duration-300">
            <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl shadow-md transition-all duration-300 hover:scale-105">
              {/* //border bg-surface-alt */}


              <svg
                className="w-6 h-6 md:w-8 md:h-8 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Washing Machine Outer Frame */}
                <rect x="3" y="3" width="18" height="18" rx="4" />
                {/* Tub glass door */}
                <circle cx="12" cy="13" r="5" />
                {/* Controls */}
                <line x1="7" y1="7" x2="7" y2="7" strokeWidth="3" />
                <line x1="11" y1="7" x2="11" y2="7" strokeWidth="3" />
                <line x1="15" y1="7" x2="17" y2="7" strokeWidth="2" />
                {/* Spin spiral wave */}
                <path d="M11 11.5c.5-.5 1-.5 1.5 0s1 .5 1.5 0" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems
              .filter((item) => !item.permission || allowedPermissions.includes(item.permission))
              .map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-3xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${isActive
                    ? 'sidebar-nav-active bg-blue-500/10 text-blue-600 shadow-sm'
                    : 'text-secondary hover:bg-surface-alt hover:text-primary'
                  }`
                }
                onClick={() => setOpen(false)}
              >
                <span className="sidebar-nav-icon text-lg text-blue-500">{item.icon}</span>
                {getTranslatedLabel(item.label)}
              </NavLink>
            ))}
          </nav>

          {/* <div className="sidebar-dispatch-card mt-6 rounded-3xl border border-border bg-surface-alt p-4 text-sm text-secondary shadow-sm">
            <p className="font-semibold text-primary">Today&apos;s dispatch</p>
            <p className="mt-2">7 orders are ready for delivery and 3 pickups are scheduled.</p>
          </div> */}
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-3xl border border-red-200 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
          >
            <FiLogOut />
            {t('nav.logout') || 'Logout'}
          </button>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;


