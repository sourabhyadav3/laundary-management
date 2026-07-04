import React, { useContext, useState, useMemo } from 'react';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiChevronDown, FiDownload } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import { useLanguage } from '../../context/LanguageContext';
import ReusableTable from '../../Components/ReusableTable';
import Modal from '../../Components/Modal';
import { toast } from 'react-toastify';
import { exportToCSV, formatCurrency, formatDate } from '../../utils/exportUtils';

const Customers = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, selectedBranch, areas } = useContext(AdminStateContext);
  const { tr } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

  const filteredCustomers = useMemo(() => {
    const sorted = [...customers].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      const numA = Number(a.id);
      const numB = Number(b.id);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numB - numA;
      }
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
    return sorted.filter((customer) => {
      const matchesBranch = !selectedBranch || selectedBranch === 'All' || String(customer.branchId) === String(selectedBranch) || String(customer.branch) === String(selectedBranch);
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const status = customer.status || 'Active';
      const matchesStatus = statusFilter === 'All' || status === statusFilter;

      return matchesBranch && matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter, selectedBranch]);

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleAddCustomer = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      totalOrders: 0,
      balance: 0,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      notes: '',
      // New form fields
      customerLevel: '',
      customerNo: '',
      arabicName: '',
      englishName: '',
      customDiscountRate: '',
      phones: ['', '', '', ''],
      partNo: '',
      areaName: '',
      jadda: '',
      street: '',
      levelNo: '',
      houseNo: '',
      flatNo: '',
      paciNo: '',
      addressNotes: '',
      automaticAddressNo: '0',
      date: new Date().toISOString().split('T')[0],
      insuranceAmount: '20.000',
      invoicesCount: '0',
      lastInvoiceDate: '',
      freeBalance: '0',
      freeTotal: '0',
    });
    setIsEditing(false);
    setShowFormModal(true);
  };

  const handleEdit = (customer) => {
    setFormData({
      customerLevel: '',
      customerNo: '',
      arabicName: '',
      customDiscountRate: '',
      partNo: '',
      areaName: '',
      jadda: '',
      street: '',
      levelNo: '',
      houseNo: '',
      flatNo: '',
      paciNo: '',
      addressNotes: '',
      automaticAddressNo: '0',
      date: new Date().toISOString().split('T')[0],
      insuranceAmount: '20.000',
      invoicesCount: '0',
      lastInvoiceDate: '',
      freeBalance: '0',
      freeTotal: '0',
      ...customer,
      englishName: customer.englishName || customer.name || '',
      phones: (() => {
        const p = customer.phones || [];
        return [p[0] || customer.phone || '', p[1] || '', p[2] || '', p[3] || ''];
      })(),
    });
    setIsEditing(true);
    setShowFormModal(true);
    setShowModal(false);
  };

  const handleDelete = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id || customerToDelete._id);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      setShowModal(false);
    }
  };

  const handleSaveCustomer = () => {
    const updatedName = formData.englishName || formData.name || formData.arabicName || 'Unnamed';
    const updatedPhone = formData.phones[0] || formData.phone || '';

    // Check for duplicate phone numbers
    const newNumbers = (formData.phones || [])
      .map(p => p.trim())
      .filter(p => p !== '');

    if (newNumbers.length > 0) {
      const duplicateCustomer = customers.find(c => {
        if (isEditing && String(c.id) === String(formData.id)) {
          return false;
        }
        const cPhone = (c.phone || '').trim();
        if (cPhone && newNumbers.includes(cPhone)) {
          return true;
        }
        const cPhones = (c.phones || []).map(p => p.trim()).filter(p => p !== '');
        if (cPhones.some(p => newNumbers.includes(p))) {
          return true;
        }
        return false;
      });

      if (duplicateCustomer) {
        toast.error(`A customer with this phone number already exists: ${duplicateCustomer.name}`);
        return;
      }
    }

    // Construct address representation
    const addressParts = [
      formData.areaName ? `Area: ${formData.areaName}` : '',
      formData.street ? `Street: ${formData.street}` : '',
      formData.houseNo ? `House: ${formData.houseNo}` : '',
      formData.flatNo ? `Flat: ${formData.flatNo}` : '',
    ].filter(Boolean).join(', ');

    // Determine ID and Customer No
    let customerId = formData.id;
    let customerNo = formData.customerNo;

    if (!isEditing) {
      if (customerNo) {
        // Check if this ID already exists
        const exists = customers.some(c => String(c.id || c._id) === String(customerNo) || String(c.customerNo) === String(customerNo));
        if (exists) {
          toast.error('Customer ID already exists. Please use a different ID.');
          return;
        }
        customerId = customerNo;
      } else {
        // Auto-generate next numeric ID if left empty
        const maxId = customers.length ? Math.max(...customers.map(c => Number(c.customerNo) || 0)) : 0;
        customerId = maxId + 1;
        customerNo = String(customerId);
      }
    } else {
      if (customerNo) {
        // Find the original customer being edited
        const originalCustomer = customers.find(c => String(c.id || c._id) === String(formData.id));
        const originalNo = originalCustomer ? String(originalCustomer.customerNo || '') : '';
        
        if (String(customerNo) !== originalNo) {
          // Check if another customer already has this ID
          const exists = customers.some(c => String(c.id || c._id) !== String(formData.id) && (String(c.id || c._id) === String(customerNo) || String(c.customerNo) === String(customerNo)));
          if (exists) {
            toast.error('Customer ID already exists. Please use a different ID.');
            return;
          }
        }
        customerId = customerNo;
      }
    }

    const finalCustomer = {
      ...formData,
      id: customerId,
      customerNo: customerNo,
      name: updatedName,
      phone: updatedPhone,
      address: addressParts || formData.address || 'N/A',
      branchId: (selectedBranch !== 'All' ? selectedBranch : null) || storedUser.branchId || storedUser.branch || null,
      branch: (selectedBranch !== 'All' ? selectedBranch : null) || storedUser.branchId || storedUser.branch || null
    };

    if (!finalCustomer.englishName) {
      toast.error('English Name is required');
      return;
    }
    if (!finalCustomer.phone) {
      toast.error('At least one Phone Number is required');
      return;
    }

    if (isEditing) {
      updateCustomer(formData.id, finalCustomer);
    } else {
      addCustomer(finalCustomer);
    }

    setShowFormModal(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'lastInvoiceDate' && value) {
      toast.info(`Please note: Subscription will end on ${value}`);
    }
    if (name === 'freeBalance' && (value === '0' || Number(value) <= 0)) {
      toast.warning('Free balance has ended. Please renew the subscription.');
    }
  };

  const tableColumns = [
    { header: 'Customer ID', accessor: 'displayId' },
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Email', accessor: 'email', format: (val) => val || tr('N/A') },
    { header: 'Total Orders', accessor: 'totalOrders' },
    { header: 'Outstanding Balance', accessor: 'balance', format: (val) => formatCurrency(val) },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const statusClass = row.status === 'Active'
          ? 'status-pill bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
          : 'status-pill bg-red-500/10 text-red-600 border-red-500/15';
        return <span className={statusClass}>{tr(row.status)}</span>;
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            className="icon-button-small"
            onClick={() => handleViewCustomer(row)}
            aria-label={tr('View')}
            title={tr('View Details')}
          >
            <FiEye size={16} />
          </button>
          <button
            className="icon-button-small"
            onClick={() => handleEdit(row)}
            aria-label={tr('Edit')}
            title={tr('Edit')}
          >
            <FiEdit2 size={16} />
          </button>
          <button
            className="icon-button-small text-rose-600"
            onClick={() => handleDelete(row)}
            aria-label={tr('Delete')}
            title={tr('Delete')}
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="surface-card overflow-hidden border border-border shadow-xl rounded-2xl">
        <div className="dashboard-hero p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">{tr('Customer Management')}</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">{tr('All Customers')}</h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">{tr('Manage all customer records and their activity.')}</p>
            </div>
            <button
              onClick={handleAddCustomer}
              className="dashboard-hero-pill btn-solid-primary flex w-full items-center justify-center gap-2 md:w-auto"
            >
              <FiPlus size={18} />
              <span className="font-semibold">{tr('Add Customer')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder={tr('Search by name, phone, or email...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">{tr('All Status')}</option>
            <option value="Active">{tr('Active')}</option>
            <option value="Inactive">{tr('Inactive')}</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      {/* Export and Stats */}
      <div className="flex flex-wrap items-center justify-between md:justify-start gap-4 md:gap-8">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-primary">{tr('Customers List')}</h2>
          <p className="text-sm text-secondary">{tr('Total')}: {filteredCustomers.length} {tr('customers')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportToCSV(filteredCustomers, 'customers.csv')}
            className="action-button flex items-center justify-center gap-2 !w-auto !py-2 !px-4 text-center"
            title={tr('Export to CSV')}
          >
            <FiDownload size={16} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <section className="surface-card border border-border rounded-2xl overflow-hidden">
        <ReusableTable columns={tableColumns} data={filteredCustomers} />
      </section>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={tr('Customer Profile')}
        size="2xl"
      >
        {selectedCustomer && (() => {
          const renderField = (label, val, formatFn, key) => {
            if (val === undefined || val === null) return null;
            const sVal = String(val).trim();
            if (sVal === '' || sVal === 'N/A' || sVal === '0' || sVal === '0.000') return null;
            
            let display = sVal;
            if (formatFn) {
              display = formatFn(val);
            }
            return (
              <div key={key || label}>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">{label}</p>
                <p className="mt-1 font-semibold text-primary">{display}</p>
              </div>
            );
          };

          const hasAddress = selectedCustomer.areaName || selectedCustomer.street || selectedCustomer.partNo || selectedCustomer.jadda || selectedCustomer.levelNo || selectedCustomer.houseNo || selectedCustomer.flatNo || selectedCustomer.paciNo || selectedCustomer.addressNotes;
          const hasBilling = selectedCustomer.registrationDate || selectedCustomer.insuranceAmount || selectedCustomer.invoicesCount || selectedCustomer.lastInvoiceDate || selectedCustomer.freeBalance || selectedCustomer.freeTotal || selectedCustomer.email || selectedCustomer.notes;

          return (
            <div className="space-y-6">
              {/* Customer Identity */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3 border-b border-border pb-1">Customer Identity</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderField("Customer ID", selectedCustomer.displayId)}
                  {renderField("Customer No", selectedCustomer.customerNo)}
                  {renderField("English Name", selectedCustomer.englishName || selectedCustomer.name)}
                  {renderField("Arabic Name", selectedCustomer.arabicName)}
                  {selectedCustomer.customDiscountRate && Number(selectedCustomer.customDiscountRate) > 0 ? (
                    <div key="discount">
                      <p className="text-xs uppercase tracking-[0.3em] text-secondary">Discount</p>
                      <p className="mt-1 font-semibold text-rose-500">
                        Custom Discount ({selectedCustomer.customDiscountRate}%)
                      </p>
                    </div>
                  ) : null}
                  {renderField("Status", selectedCustomer.status)}
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="bg-blue-500/5 rounded-2xl p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">Phone Numbers</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {renderField("Primary Phone No.", selectedCustomer.phone)}
                  {selectedCustomer.phones && selectedCustomer.phones.slice(1).map((phone, idx) => {
                    return renderField(`Alternate No. ${idx + 1}`, phone, null, `alt-phone-${idx}`);
                  })}
                </div>
              </div>

              {/* Address & Location */}
              {hasAddress ? (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3 border-b border-border pb-1">Address & Location</h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    {renderField("Area Name", selectedCustomer.areaName)}
                    {renderField("Street", selectedCustomer.street)}
                    {renderField("Part No", selectedCustomer.partNo)}
                    {renderField("Jadda", selectedCustomer.jadda)}
                    {renderField("Level No", selectedCustomer.levelNo)}
                    {renderField("House No", selectedCustomer.houseNo)}
                    {renderField("Flat No", selectedCustomer.flatNo)}
                    {renderField("Paci No.", selectedCustomer.paciNo)}
                    {renderField("Address Notes", selectedCustomer.addressNotes)}
                  </div>
                </div>
              ) : null}

              {/* Billing & Financial Details */}
              {hasBilling ? (
                <div className="bg-slate-500/5 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Billing & Financial Details</h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {renderField("Registration Date", selectedCustomer.registrationDate, (val) => formatDate(val))}
                    {renderField("Insurance Paid", selectedCustomer.insuranceAmount, (val) => formatCurrency(val))}
                    {renderField("Invoices Count", selectedCustomer.invoicesCount)}
                    {renderField("Last Invoice Date", selectedCustomer.lastInvoiceDate, (val) => formatDate(val))}
                    {renderField("Free Balance", selectedCustomer.freeBalance, (val) => formatCurrency(val))}
                    {renderField("Free Total", selectedCustomer.freeTotal, (val) => formatCurrency(val))}
                    {renderField("Email", selectedCustomer.email)}
                    {renderField("General Notes", selectedCustomer.notes)}
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="border-t border-border pt-6 flex gap-3">
                <button
                  onClick={() => {
                    handleEdit(selectedCustomer);
                  }}
                  className="btn-solid-primary flex-1 rounded-xl py-2 font-semibold transition"
                >
                  Edit Customer
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-border bg-surface py-2 font-semibold text-primary transition hover:bg-surface-alt"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={isEditing ? tr('Edit Customer') : tr('Add New Customer')}
        size="2xl"
      >
        {formData && (
          <form className="space-y-6">
            {/* Section 1: Customer Identity */}
            <div className="border-b border-border pb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Customer Identity</h4>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold text-secondary uppercase">Discount Value (%)</label>
                    <input
                      type="number"
                      name="customDiscountRate"
                      value={formData.customDiscountRate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          customDiscountRate: val,
                          customerLevel: val ? 'Custom Discount' : ''
                        }));
                      }}
                      placeholder="e.g. 25"
                      min="0"
                      max="100"
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                    />
                  </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Customer ID</label>
                  <input
                    type="text"
                    name="customerNo"
                    value={formData.customerNo || ''}
                    readOnly
                    placeholder="Auto-generated"
                    className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-secondary cursor-not-allowed text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Arabic Name</label>
                  <input
                    type="text"
                    name="arabicName"
                    value={formData.arabicName || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">English Name *</label>
                  <input
                    type="text"
                    name="englishName"
                    value={formData.englishName || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact Phone Numbers */}
            <div className="border-b border-border pb-4 bg-blue-500/5 rounded-2xl p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-600 mb-3">Phone Numbers</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {formData.phones.map((phone, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-medium text-secondary">
                      {idx === 0 ? 'Phone No. *' : `Alternate No. ${idx}`}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const newPhones = [...formData.phones];
                        newPhones[idx] = e.target.value;
                        setFormData(prev => ({ ...prev, phones: newPhones }));
                      }}
                      className="mt-1 w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                      required={idx === 0}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Address Details */}
            <div className="border-b border-border pb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Address & Location</h4>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Area Name</label>
                  <select
                    name="areaName"
                    value={formData.areaName || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  >
                    <option value="">Select Area</option>
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Street</label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Part No</label>
                  <input
                    type="text"
                    name="partNo"
                    value={formData.partNo || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Jadda</label>
                  <input
                    type="text"
                    name="jadda"
                    value={formData.jadda || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Level No</label>
                  <input
                    type="text"
                    name="levelNo"
                    value={formData.levelNo || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">House No</label>
                  <input
                    type="text"
                    name="houseNo"
                    value={formData.houseNo || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Flat No</label>
                  <input
                    type="text"
                    name="flatNo"
                    value={formData.flatNo || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Paci No.</label>
                  <input
                    type="text"
                    name="paciNo"
                    value={formData.paciNo || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-xs font-semibold text-secondary uppercase">Address Notes</label>
                  <textarea
                    name="addressNotes"
                    value={formData.addressNotes || ''}
                    onChange={handleFormChange}
                    rows="2"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Billing & Financials */}
            <div className="border-b border-border pb-4 bg-slate-500/5 rounded-2xl p-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Billing & Financial Details</h4>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Insurance Paid</label>
                  <input
                    type="number"
                    name="insuranceAmount"
                    value={formData.insuranceAmount || '20.000'}
                    onChange={handleFormChange}
                    step="0.001"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Invoices Count</label>
                  <input
                    type="number"
                    name="invoicesCount"
                    value={formData.invoicesCount || '0'}
                    readOnly
                    className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-secondary cursor-not-allowed text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Last Invoice Date</label>
                  <input
                    type="date"
                    name="lastInvoiceDate"
                    value={formData.lastInvoiceDate || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Free Balance</label>
                  <input
                    type="number"
                    name="freeBalance"
                    value={formData.freeBalance || '0'}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary uppercase">Free Total</label>
                  <input
                    type="number"
                    name="freeTotal"
                    value={formData.freeTotal || '0'}
                    readOnly
                    className="mt-1 w-full rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-secondary cursor-not-allowed text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-secondary uppercase">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-secondary uppercase">Status</label>
                  <select
                    name="status"
                    value={formData.status || 'Active'}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-secondary uppercase">General Notes</label>
                  <input
                    type="text"
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={handleSaveCustomer}
                className="btn-solid-primary flex-1 rounded-lg py-2.5 font-semibold transition text-sm"
              >
                {isEditing ? tr('Save / Update') : tr('Save Customer')}
              </button>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="flex-1 rounded-lg border border-border bg-surface py-2.5 font-semibold text-primary transition hover:bg-surface-alt text-sm"
              >
                {tr('Cancel / Exit')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setCustomerToDelete(null); }}
        title={tr('Delete Customer')}
        size="sm"
      >
        <div className="space-y-6 text-center">
          <p className="text-secondary text-sm">
            {tr('Are you sure you want to delete')} <span className="font-semibold text-primary">{customerToDelete?.name}</span>? {tr('This action cannot be undone.')}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setCustomerToDelete(null); }}
              className="flex-1 rounded-xl border border-border bg-surface py-2 font-semibold text-primary transition hover:bg-surface-alt"
            >
              {tr('Cancel')}
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="flex-1 rounded-xl bg-rose-600 py-2 font-semibold text-white transition hover:bg-rose-700 font-medium"
            >
              {tr('Delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
