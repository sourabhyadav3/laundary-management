import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useLanguage } from '../context/LanguageContext';

const RoleSidebar = ({ menuItems, roleLabel, footerText }) => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  const { t } = useLanguage();

  // Get active role and dynamic permissions from localStorage
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = storedUser.role || '';

  const getPermissionsForRole = (role) => {
    const defaultPermissions = {
      'Admin': [
        'view_dashboard', 'view_customers', 'manage_customers', 'view_orders', 'manage_orders', 
        'view_invoice_status', 'change_invoice_status', 'make_invoice', 'view_invoice_details', 
        'view_services', 'manage_services', 'view_logistics', 'manage_logistics', 
        'view_payments', 'manage_payments', 'view_reports', 'manage_staff', 'assign_roles', 
        'manage_permissions', 'manage_settings', 'full_access', 'create_records', 
        'edit_records', 'delete_records', 'view_all_data', 'access_all_modules'
      ],
      'Counter Staff': [
        'view_dashboard', 'view_customers', 'manage_customers', 'view_orders', 'make_invoice',
        'view_invoice_status', 'change_invoice_status', 'view_invoice_details', 'view_payments',
        'manage_payments', 'view_services'
      ],
      'Delivery Staff': [
        'view_dashboard', 'view_logistics', 'view_invoice_status', 'change_invoice_status'
      ],
    };

    const saved = localStorage.getItem('spinclean_role_permissions_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed[role]) {
          // Filter to only allow default/whitelist permissions to avoid dirty localStorage state
          const allowed = defaultPermissions[role] || [];
          return parsed[role].filter(p => allowed.includes(p));
        }
      } catch (e) {
        console.error("Failed to parse role permissions", e);
      }
    }
    return defaultPermissions[role] || [];
  };

  const allowedPermissions = getPermissionsForRole(userRole);

  const getTranslatedLabel = (label) => {
    switch (label) {
      case 'Dashboard': return t('sidebar.dashboard');
      case 'Customers': return t('sidebar.customers');
      case 'New Order': return t('sidebar.makeInvoice') || t('sidebar.newOrder');
      case 'Make Invoice':
      case 'Make Invoices': return t('sidebar.makeInvoice');
      case 'Order List': return t('sidebar.orderList');
      case 'Invoices': return t('sidebar.invoices') || 'Invoices';
      case 'Payments': return t('sidebar.payments');
      case 'Order Tracking': return t('sidebar.orderTracking');
      case 'Assigned Pickups': return t('sidebar.assignedPickups');
      case 'Assigned Deliveries': return t('sidebar.assignedDeliveries');
      case 'Completed Jobs': return t('sidebar.completedJobs');
      case 'Home Services': return t('sidebar.pickups') || 'Home Services';
      case 'Order': return t('sidebar.orders') || 'Order';
      case 'Driver': return t('sidebar.drivers') || 'Driver';
      case 'Orders tracking': return t('sidebar.orderTracking') || 'Orders tracking';
      default: return label;
    }
  };

  //logout handler
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success(t('nav.logoutSuccess') || 'Logged out successfully');
    navigate('/');
  };

  return (
    <>
      {!open && (
        <button
          className="fixed top-[9px] ltr:left-3 rtl:right-3 z-[40] icon-button lg:!hidden shadow-sm"
          onClick={toggle}
          aria-label={t('common.toggleMenu') || 'Toggle menu'}
          type="button"
        >
          <FiMenu size={20} />
        </button>
      )}

      {open && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={toggle} aria-hidden="true" />}

      <aside
        className={`admin-sidebar z-50 surface-card text-primary transition-transform duration-300 ease-in-out max-lg:fixed max-lg:inset-y-0 ltr:max-lg:left-0 rtl:max-lg:right-0 max-lg:transform ${open ? 'max-lg:translate-x-0' : 'ltr:max-lg:-translate-x-full rtl:max-lg:translate-x-full'
          }`}
      >
        <div className="h-full flex flex-col p-6 pt-8 relative">
          {/* Mobile exit/close button at top right of sidebar */}
          <button
            type="button"
            className="absolute top-4 ltr:right-4 rtl:left-4 lg:!hidden icon-button-small"
            onClick={toggle}
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>

          <div className="mb-6 flex items-center justify-center p-4 transition-all duration-300">
            <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl shadow-md transition-all duration-300 hover:scale-105">
              {/* border-> bg-surface-alt */}
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
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-3xl px-4 py-3 text-sm transition-all duration-200 ${isActive
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

          {/* {footerText && (
            <div className="sidebar-dispatch-card mt-6 rounded-3xl border border-border bg-surface-alt p-4 text-sm text-secondary shadow-sm">
              {footerText}
            </div>
          )} */}
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

export default RoleSidebar;
