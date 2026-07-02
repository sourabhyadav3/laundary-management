import React, { useState, useEffect, useMemo } from 'react';
import { FiArrowLeft, FiEdit2, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const mockRoles = [
  {
    id: 1,
    name: 'Admin',
    description: 'Full system administrator with complete access.',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/15',
  },
  {
    id: 2,
    name: 'Counter Staff',
    description: 'Counter desk operations, customers, new orders, invoices and payments.',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  },
  {
    id: 3,
    name: 'Delivery Staff',
    description: 'Logistics, route summaries, pickups and deliveries.',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/15',
  },
];

const permissionsList = [
  // Dashboard
  { id: 'view_dashboard', label: 'View Dashboard', category: 'Dashboard' },

  // Customers
  { id: 'view_customers', label: 'View Customers', category: 'Customers' },

  // Orders
  { id: 'view_invoice_status', label: 'View Current Invoice Status', category: 'Orders' },
  { id: 'make_invoice', label: 'Make Invoice', category: 'Orders' },

  // Services
  { id: 'view_services', label: 'Laundry Services (View)', category: 'Services' },

  // Logistics
  { id: 'view_logistics', label: 'Pickup & Delivery (View)', category: 'Logistics' },

  // Payments
  { id: 'view_payments', label: 'View Payments', category: 'Payments' },

  // Reporting
  { id: 'view_reports', label: 'View Reports', category: 'Reporting' },

  // Administration
  { id: 'manage_staff', label: 'Manage Staff', category: 'Administration' },

  // Settings
  { id: 'manage_settings', label: 'Manage Settings', category: 'Settings' },
];

const initialRolePermissions = {
  'Admin': [
    'view_dashboard', 'view_customers', 'view_invoice_status', 'make_invoice', 
    'view_services', 'view_logistics', 'view_payments', 'view_reports', 
    'manage_staff', 'manage_settings'
  ],
  'Counter Staff': [
    'view_dashboard', 'view_customers', 'view_invoice_status', 'make_invoice', 
    'view_services', 'view_payments'
  ],
  'Delivery Staff': [
    'view_dashboard', 'view_logistics', 'view_invoice_status'
  ],
};
const roleAllowedPermissionsWhitelist = {
  'Admin': [
    'view_dashboard', 'view_customers', 'view_invoice_status', 'make_invoice', 
    'view_services', 'view_logistics', 'view_payments', 'view_reports', 
    'manage_staff', 'manage_settings'
  ],
  'Counter Staff': [
    'view_dashboard', 'view_customers', 'view_invoice_status', 'make_invoice', 
    'view_services', 'view_payments'
  ],
  'Delivery Staff': [
    'view_dashboard', 'view_logistics', 'view_invoice_status'
  ],
};

const RolesPermissions = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [expandedCategory, setExpandedCategory] = useState('Dashboard');
  const [isEditing, setIsEditing] = useState(false);
  const [matrixRoleFilter, setMatrixRoleFilter] = useState('Admin');

  const filteredPermissions = useMemo(() => {
    if (matrixRoleFilter === 'All') return permissionsList;
    const allowedList = roleAllowedPermissionsWhitelist[matrixRoleFilter] || [];
    return permissionsList.filter(p => allowedList.includes(p.id));
  }, [matrixRoleFilter]);

  const filteredCategories = useMemo(() => {
    return [...new Set(filteredPermissions.map(p => p.category))];
  }, [filteredPermissions]);

  const [rolePermissions, setRolePermissions] = useState(() => {
    const saved = localStorage.getItem('spinclean_role_permissions_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean up loaded permissions to conform to whitelists
        const cleaned = {};
        Object.keys(parsed).forEach(role => {
          cleaned[role] = parsed[role] || [];
        });
        return cleaned;
      } catch (e) {}
    }
    return initialRolePermissions;
  });

  useEffect(() => {
    localStorage.setItem('spinclean_role_permissions_v3', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  const categories = useMemo(() => {
    const whitelist = roleAllowedPermissionsWhitelist[selectedRole];
    const filtered = whitelist 
      ? permissionsList.filter((p) => whitelist.includes(p.id))
      : permissionsList;
    return [...new Set(filtered.map((p) => p.category))];
  }, [selectedRole]);

  const categoryPermissions = (category) => {
    const list = permissionsList.filter((p) => p.category === category);
    const whitelist = roleAllowedPermissionsWhitelist[selectedRole];
    if (!whitelist) return list;
    return list.filter((p) => whitelist.includes(p.id));
  };

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(expandedCategory)) {
      setExpandedCategory(categories[0]);
    }
  }, [selectedRole, categories, expandedCategory]);

  const hasPermission = (permissionId) => {
    return rolePermissions[selectedRole]?.includes(permissionId) || false;
  };

  const handleEditRole = (roleName) => {
    setIsEditing(!isEditing);
    if (isEditing) {
      toast.success(`${roleName} permissions updated successfully`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/staff')}
          className="rounded-2xl border border-border bg-surface p-2 text-secondary transition hover:text-primary"
        >
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-primary">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-secondary">Manage role definitions and access permissions</p>
        </div>
      </div>

      {/* Roles Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {mockRoles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.name)}
            className={`rounded-3xl border p-6 text-left transition ${
              selectedRole === role.name
                ? `${role.color} border-current`
                : 'surface-card border-border hover:border-current'
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.3em]">{role.name}</p>
            <p className="mt-2 text-xs text-secondary">{role.description}</p>
            <p className="mt-4 text-sm font-semibold">
              {rolePermissions[role.name]?.length || 0} permissions
            </p>
          </button>
        ))}
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Categories Sidebar */}
        <div className="surface-card rounded-3xl border border-border p-6 shadow-xl">
          <h3 className="mb-4 font-semibold text-primary">Categories</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setExpandedCategory(category)}
                className={`w-full rounded-2xl px-4 py-2 text-left text-sm font-semibold transition ${
                  expandedCategory === category
                    ? 'settings-nav-active bg-blue-500/10 text-blue-600 shadow-sm'
                    : 'text-secondary hover:bg-surface-alt hover:text-primary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="surface-card rounded-3xl border border-border p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-primary">
                  {selectedRole} Permissions
                </h2>
                <p className="mt-1 text-sm text-secondary">
                  {rolePermissions[selectedRole]?.length || 0} permissions granted
                </p>
              </div>
              <button
                onClick={() => handleEditRole(selectedRole)}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-2 font-semibold transition ${
                  isEditing 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15'
                    : 'border-blue-500/50 bg-blue-500/10 text-blue-600 hover:bg-blue-500/15'
                }`}
              >
                {isEditing ? <FiCheckCircle size={18} /> : <FiEdit2 size={18} />}
                <span>{isEditing ? 'Save' : 'Edit'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {categoryPermissions(expandedCategory).map((permission) => {
                const isGranted = hasPermission(permission.id);
                return (
                  <div
                    key={permission.id}
                    onClick={() => {
                      if (!isEditing) {
                        toast.info('Please click "Edit" first to modify permissions');
                        return;
                      }
                      setRolePermissions(prev => {
                        const currentList = prev[selectedRole] || [];
                        const newList = currentList.includes(permission.id)
                          ? currentList.filter(id => id !== permission.id)
                          : [...currentList, permission.id];
                        return {
                          ...prev,
                          [selectedRole]: newList
                        };
                      });
                    }}
                    className={`flex items-center gap-3 rounded-2xl border transition-all ${
                      isEditing 
                        ? 'cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 bg-surface border-border select-none'
                        : 'border-border bg-surface'
                    } p-4`}
                  >
                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-sm font-bold ${
                        isGranted ? 'bg-emerald-500 text-white' : 'border border-border bg-surface'
                      }`}
                    >
                      {isGranted ? '✓' : ''}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-primary">{permission.label}</p>
                      <p className="text-xs text-secondary">{permission.id}</p>
                    </div>
                    <div className={`text-sm font-semibold ${isGranted ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isGranted ? 'Allowed' : 'Restricted'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-primary">Permission Matrix</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Show Role:</span>
            <select
              value={matrixRoleFilter}
              onChange={(e) => setMatrixRoleFilter(e.target.value)}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All" style={{ display: 'none' }}>All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Counter Staff">Counter Staff</option>
              <option value="Delivery Staff">Delivery Staff</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-4 text-left font-semibold text-primary">Feature</th>
                {(matrixRoleFilter === 'All' || matrixRoleFilter === 'Admin') && (
                  <th className="px-4 py-4 text-center font-semibold text-primary">Admin</th>
                )}
                {(matrixRoleFilter === 'All' || matrixRoleFilter === 'Counter Staff') && (
                  <th className="px-4 py-4 text-center font-semibold text-primary">Counter Staff</th>
                )}
                {(matrixRoleFilter === 'All' || matrixRoleFilter === 'Delivery Staff') && (
                  <th className="px-4 py-4 text-center font-semibold text-primary">Delivery Staff</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <React.Fragment key={category}>
                  <tr className="border-b border-border bg-surface-alt/40">
                    <td colSpan={matrixRoleFilter === 'All' ? 4 : 2} className="px-4 py-3 font-semibold text-primary">
                      {category}
                    </td>
                  </tr>
                  {filteredPermissions.filter(p => p.category === category).map((permission) => {
                    const hasAdmin = rolePermissions['Admin']?.includes(permission.id);
                    const hasCounter = rolePermissions['Counter Staff']?.includes(permission.id);
                    const hasDelivery = rolePermissions['Delivery Staff']?.includes(permission.id);

                    const togglePermission = (roleName) => {
                      setRolePermissions(prev => {
                        const currentList = prev[roleName] || [];
                        const newList = currentList.includes(permission.id)
                          ? currentList.filter(id => id !== permission.id)
                          : [...currentList, permission.id];
                        return {
                          ...prev,
                          [roleName]: newList
                        };
                      });
                      toast.success(`Updated ${roleName} permission: ${permission.label}`);
                    };

                    return (
                      <tr key={permission.id} className="border-b border-border hover:bg-surface-alt/25 transition-colors">
                        <td className="px-4 py-3 text-secondary">
                          <div>
                            <div className="font-semibold text-primary">{permission.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{permission.id}</div>
                          </div>
                        </td>
                        {(matrixRoleFilter === 'All' || matrixRoleFilter === 'Admin') && (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission('Admin')}
                              className="focus:outline-none transition hover:scale-110 active:scale-95 cursor-pointer"
                            >
                              {hasAdmin ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-white font-bold shadow-sm text-xs">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-200 bg-rose-500/10 text-rose-600 font-bold text-xs">
                                  ✗
                                </span>
                              )}
                            </button>
                          </td>
                        )}
                        {(matrixRoleFilter === 'All' || matrixRoleFilter === 'Counter Staff') && (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission('Counter Staff')}
                              className="focus:outline-none transition hover:scale-110 active:scale-95 cursor-pointer"
                            >
                              {hasCounter ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-white font-bold shadow-sm text-xs">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-200 bg-rose-500/10 text-rose-600 font-bold text-xs">
                                  ✗
                                </span>
                              )}
                            </button>
                          </td>
                        )}
                        {(matrixRoleFilter === 'All' || matrixRoleFilter === 'Delivery Staff') && (
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission('Delivery Staff')}
                              className="focus:outline-none transition hover:scale-110 active:scale-95 cursor-pointer"
                            >
                              {hasDelivery ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-white font-bold shadow-sm text-xs">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-200 bg-rose-500/10 text-rose-600 font-bold text-xs">
                                  ✗
                                </span>
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RolesPermissions;
