import React, { useContext, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  FiSearch, 
  FiPlus, 
  FiEye, 
  FiEdit2,
  FiLock, 
  FiUnlock, 
  FiTrash2, 
  FiChevronDown, 
  FiUsers, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiCalendar
} from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import ReusableTable from '../../Components/ReusableTable';
import { toast } from 'react-toastify';

const statusColors = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  Inactive: 'bg-slate-500/10 text-slate-600 border-slate-500/15',
  Suspended: 'bg-rose-500/10 text-rose-600 border-rose-500/15',
};

const Users = () => {
  const { staff, addStaff, updateStaff, deleteStaff, lockStaff, branches } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewedUser, setViewedUser] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const totalUsers = staff.length;
  const activeUsers = staff.filter(u => u.status === 'Active' && !u.isLocked).length;
  const lockedUsers = staff.filter(u => u.isLocked).length;

  const filteredUsers = useMemo(() => {
    return staff
      .filter((user) => {
        const matchesSearch =
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.phone && user.phone.includes(searchTerm));

        const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
        const matchesRole = roleFilter === 'All' || user.role === roleFilter;

        return matchesSearch && matchesStatus && matchesRole;
      })
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        const numA = Number(a.id);
        const numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
  }, [staff, searchTerm, statusFilter, roleFilter]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentUser({
      name: '',
      email: '',
      phone: '',
      branch: branches[0]?.name || 'All Branches',
      branchId: branches[0]?.id || branches[0]?._id || '',
      status: 'Active',
      password: '',
      role: 'Admin',
      isLocked: false
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setIsEditing(true);
    setCurrentUser({
      ...user,
      password: ''
    });
    setShowModal(true);
  };

  const handleOpenView = (user) => {
    setViewedUser(user);
    setShowViewModal(true);
  };

  const handleToggleLock = (user) => {
    lockStaff(user.id || user._id, !user.isLocked);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteStaff(userToDelete.id || userToDelete._id);
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!currentUser.name || !currentUser.email) {
      toast.error('Please fill required fields.');
      return;
    }
    if (!isEditing && !currentUser.password) {
      toast.error('Password is required.');
      return;
    }

    if (isEditing) {
      const updatedFields = {
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        role: currentUser.role,
        branchId: currentUser.branchId,
        status: currentUser.status
      };
      if (currentUser.password) {
        updatedFields.password = currentUser.password;
      }
      updateStaff(currentUser.id || currentUser._id, updatedFields);
    } else {
      addStaff(currentUser);
    }
    setShowModal(false);
  };

  const tableColumns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-sm font-semibold text-purple-600">
            {row.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <p className="font-semibold text-primary">{row.name}</p>
            <p className="text-xs text-secondary">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: 'role',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          {row.role}
        </span>
      )
    },
    { header: 'Phone', accessor: 'phone' },
    {
      header: 'Branch',
      accessor: 'branch',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          {row.branch || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const statusClass = `status-pill ${statusColors[row.status] || statusColors.Active}`;
        return (
          <div className="flex items-center gap-2">
            <span className={statusClass}>{row.status}</span>
            {row.isLocked && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20"
                title="Account is locked"
              >
                <FiLock size={12} className="inline mr-0.5" />
                Locked
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {/* View details */}
          <button 
            className="icon-button-small text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20" 
            onClick={() => handleOpenView(row)} 
            aria-label="View Details"
            title="View Details"
          >
            <FiEye size={16} />
          </button>

          {/* Edit User details */}
          <button 
            className="icon-button-small text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20" 
            onClick={() => handleOpenEdit(row)} 
            aria-label="Edit User"
            title="Edit User"
          >
            <FiEdit2 size={16} />
          </button>

          {/* Toggle Lock / Unlock */}
          <button 
            className={`icon-button-small ${row.isLocked ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'}`} 
            onClick={() => handleToggleLock(row)} 
            aria-label={row.isLocked ? "Unlock User" : "Lock User"}
            title={row.isLocked ? "Unlock User" : "Lock User"}
          >
            {row.isLocked ? <FiLock size={16} /> : <FiUnlock size={16} />}
          </button>

          {/* Delete */}
          <button 
            className="icon-button-small text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" 
            onClick={() => handleDeleteClick(row)} 
            aria-label="Delete"
            title="Delete User"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-3xl border border-border shadow-xl">
        <div className="dashboard-hero rounded-3xl p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Super Admin Portal</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">User & Role Management</h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">Manage system users, managers, and staff across all laundry branches.</p>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <button
                onClick={handleOpenAdd}
                className="dashboard-hero-pill btn-solid-primary flex items-center justify-center gap-2"
              >
                <FiPlus size={18} />
                <span className="font-semibold">Add User</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard accent="violet" icon={FiUsers} label="Total Users" value={totalUsers} />
        <StatsCard accent="emerald" icon={FiUnlock} label="Active & Unlocked" value={activeUsers} />
        <StatsCard accent="rose" icon={FiLock} label="Locked Accounts" value={lockedUsers} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
          />
        </div>

        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Counter Staff">Counter Staff</option>
            <option value="Delivery Staff">Delivery Staff</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">User Directory</h2>
            <p className="text-sm text-secondary">Total: {filteredUsers.length} users found</p>
          </div>
        </div>
        <div className="mt-5">
          <ReusableTable columns={tableColumns} data={filteredUsers} />
        </div>
      </section>

      {/* Add Modal */}
      {showModal && currentUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-lg rounded-3xl border border-border p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex-none flex items-center justify-between gap-4 pb-6 border-b border-border mb-6">
              <h2 className="text-2xl font-semibold text-primary">{isEditing ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={() => setShowModal(false)} className="text-secondary hover:text-primary">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={currentUser.name}
                  onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={currentUser.email}
                  onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Phone</label>
                <input
                  type="text"
                  value={currentUser.phone || ''}
                  onChange={(e) => setCurrentUser({...currentUser, phone: e.target.value})}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Role *</label>
                <select
                  required
                  value={currentUser.role}
                  onChange={(e) => setCurrentUser({...currentUser, role: e.target.value})}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                >
                  <option value="Admin">Admin</option>
                  <option value="Counter Staff">Counter Staff</option>
                  <option value="Delivery Staff">Delivery Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Branch *</label>
                <select
                  required
                  value={currentUser.branchId || ''}
                  onChange={(e) => {
                    const selectedBranch = branches.find(b => (b.id || b._id) === e.target.value);
                    setCurrentUser({
                      ...currentUser,
                      branchId: selectedBranch ? (selectedBranch.id || selectedBranch._id) : null,
                      branch: selectedBranch ? selectedBranch.name : ''
                    });
                  }}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                >
                  <option value="">Select a branch...</option>
                  {branches.map(b => {
                    const bId = b.id || b._id;
                    return (
                      <option key={bId} value={bId}>{b.name}</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">Status</label>
                <select
                  value={currentUser.status}
                  onChange={(e) => setCurrentUser({...currentUser, status: e.target.value})}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary mb-1">
                  Password {isEditing ? '(Leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  required={!isEditing}
                  value={currentUser.password || ''}
                  onChange={(e) => setCurrentUser({...currentUser, password: e.target.value})}
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                />
              </div>
              
              <div className="mt-8 flex gap-4 pt-4 border-t border-border">
                <button
                  type="submit"
                  className="btn-solid-primary flex-1 rounded-3xl py-3 font-semibold transition"
                >
                  {isEditing ? 'Save Changes' : 'Save User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Read-Only View Details Modal */}
      {showViewModal && viewedUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-lg rounded-3xl border border-border p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex-none flex items-center justify-between gap-4 pb-6 border-b border-border mb-6">
              <h2 className="text-2xl font-semibold text-primary">User Profile Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-secondary hover:text-primary">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="flex flex-col items-center mb-6 pb-6 border-b border-border">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20 text-3xl font-bold text-purple-600 mb-3">
                {viewedUser.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <h3 className="text-xl font-bold text-primary">{viewedUser.name}</h3>
              <p className="text-sm text-secondary font-medium mt-1">{viewedUser.role}</p>
              
              {viewedUser.isLocked ? (
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  <FiLock size={12} /> Account Blocked
                </span>
              ) : (
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <FiUnlock size={12} /> Login Allowed
                </span>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold text-secondary tracking-wider">Account Credentials & Info</h4>
              <div className="grid grid-cols-2 gap-4 bg-surface-alt p-4 rounded-2xl border border-border text-sm">
                <div className="flex items-center gap-2.5">
                  <FiMail className="text-purple-500" />
                  <div>
                    <p className="text-xs text-secondary font-medium">Email</p>
                    <p className="text-primary font-semibold truncate max-w-[170px]" title={viewedUser.email}>{viewedUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <FiPhone className="text-purple-500" />
                  <div>
                    <p className="text-xs text-secondary font-medium">Phone</p>
                    <p className="text-primary font-semibold">{viewedUser.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mt-2">
                  <FiMapPin className="text-purple-500" />
                  <div>
                    <p className="text-xs text-secondary font-medium">Branch Location</p>
                    <p className="text-primary font-semibold">{viewedUser.branch || 'Unassigned'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mt-2">
                  <FiCalendar className="text-purple-500" />
                  <div>
                    <p className="text-xs text-secondary font-medium">Date Joined</p>
                    <p className="text-primary font-semibold">{viewedUser.joiningDate || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="w-full md:w-auto rounded-3xl border border-border bg-surface-alt px-8 py-3 font-semibold text-primary transition hover:bg-surface text-center"
              >
                Close Details
              </button>
            </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Modal */}
      {showDeleteModal && userToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md rounded-3xl border border-border p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 pb-6">
              <h2 className="text-2xl font-semibold text-primary">Remove User</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-secondary hover:text-primary">✕</button>
            </div>
            <p className="mb-2 text-sm text-secondary">Are you sure you want to remove this User?</p>
            <p className="mb-6 text-base font-semibold text-primary">{userToDelete.name}</p>
            <p className="mb-6 text-xs text-rose-500">This action cannot be undone.</p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-3xl border border-rose-500/50 bg-rose-500/10 py-3 font-semibold text-rose-600 transition hover:bg-rose-500/15"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Users;
